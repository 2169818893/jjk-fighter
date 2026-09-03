/* =====================================================================
   联机中转服务器（帧锁同步）
   职责：快速匹配 / 房号建房加入、协商种子与规则、原地再战协调、
        转发输入帧与同步校验包、RTT 应答、心跳治理
   启动：node server/net-server.mjs   （默认端口 8736，可用 PORT/HOST 覆盖）
   加固：消息 schema 校验、maxPayload、速率限制、连接配额、Origin 校验、
        心跳淘汰、房间状态机、abort 广播、错误隔离与审计日志（见审查报告）
   2026-09-01 修复：P0 房号耗尽（建房冷却 + 旧房号回收 + 全局上限）、
        帧号严格递增去重（防输入重放/哈希伪造）、房号升 6 位并统一失败文案、
        开局后 pick/sel 门禁、连接即采样 RTT + EMA 平滑、Origin 缺失拒绝
   2026-09-03 修复：P0-4 未配置 ALLOWED_ORIGINS 时打印安全告警；
        P2-11 大厅状态（快速匹配队列/房间表/房号序号）收进 createNetServer
        闭包——多实例不再共享状态，测试可并行；P2-12 pick 握手上报角色表
        指纹，两端不一致拒绝开局（防静默角色错位）；P2-13 SIGINT/SIGTERM
        优雅关闭（广播 aborted）+ LOG_LEVEL 日志分级。
   ===================================================================== */
import { WebSocketServer } from 'ws';
import { pathToFileURL } from 'node:url';

const _p = Number(process.env.PORT);
const PORT = Number.isFinite(_p) && _p >= 0 ? _p : 8736;   // 支持 PORT=0 随机端口（测试用）
const HOST = process.env.HOST || '';                    // 留空 = 监听所有接口
const MAX_CONNS = Number(process.env.MAX_CONNS) || 64;  // 最大同时连接数
const MAX_PAYLOAD = 8192;                               // WebSocket 单帧最大字节（协议消息通常 < 2KB）
const MAX_MSG = 4096;                                   // 单条文本消息最大字符数
const MSG_RATE = 200;                                   // 每连接每秒允许消息数（令牌桶）
const MSG_BURST = 400;                                  // 令牌桶容量
const MAX_BAD = 200;                                    // 连续/累计无效消息达到该值即断开
const HEARTBEAT_MS = 10000;                             // 心跳间隔：两轮未 pong 即 terminate
const RTT_PROBE_DELAY_MS = 50;                          // 连接后首探 RTT 的延迟（避开握手突发）
const FRAME_WINDOW = 240;                               // 输入/哈希帧号允许超前当前水位窗口
const MAX_ABS_FRAME = 60 * 60 * 60 * 4;                 // 帧号绝对上界（4 小时 @60fps）
const MAX_CHARS = 32;                                   // 角色索引上界（客户端 ROSTER 目前 21 名；增长到 32 时同步上调，
                                                        // 越界部分由角色表指纹校验兜底，见 pick 处理）
const MAX_ROOMS = 4096;                                 // 等待中房间数上限（防房号空间耗尽）
export const CREATE_COOLDOWN_MS = 1000;                 // 单连接建房最小间隔（防 create 洪水）
const MAX_JOIN_FAILS = 20;                              // 单连接加入失败次数上限（防房号穷举）
const DELAY_MIN = 3, DELAY_MAX = 12;                    // 输入延迟帧数钳制区间
const ALLOWED_WINS = new Set([1, 2]);                   // BO1 / BO3（与客户端设置一致）
const ALLOWED_ROUND_TIME = new Set([30, 60, 99, 120]);  // 与客户端设置面板一致（'∞' 在客户端已规范化为 99）
export const PROTO_VER = 2;                             // 联机协议版本，客户端必须匹配（v2：+rh 角色表指纹）
export const ROOM_CODE_LEN = 6;                         // 房号位数（6 位 = 90 万码空间，配合限流防穷举）
const ROOM_CODE_RE = new RegExp(`^\\d{${ROOM_CODE_LEN}}$`);
const ALLOW_ORIGIN_EMPTY = process.env.ALLOW_ORIGIN_EMPTY === '1';  // 放行无 Origin 的非浏览器客户端

/* ---- 日志分级（P2-13）：LOG_LEVEL=debug|info|warn|error，默认 info ---- */
const LOG_LEVEL = String(process.env.LOG_LEVEL || 'info').toLowerCase();
const LOG_RANK = { debug: 10, info: 20, warn: 30, error: 40 };
function log(level, msg) {
    if ((LOG_RANK[level] ?? LOG_RANK.info) < (LOG_RANK[LOG_LEVEL] ?? LOG_RANK.info)) return;
    if (level === 'warn') console.warn(msg);
    else if (level === 'error') console.error(msg);
    else console.log(msg);   // debug / info
}

function send(ws, obj) {
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj));
}

/* ---- 大厅状态（P2-11）：原为模块级全局，createNetServer 可多次调用却共享同一份
   房间表/队列，多实例互相污染且无法并行测试。改为每次调用独立创建。 ---- */
function createLobby() {
    return {
        quickQueue: null,      // 快速匹配等待者
        hostedRooms: new Map(),// 房号 -> 等待中的房主连接
        rooms: new Set(),      // 全部活跃房间（优雅关闭时广播 aborted 用）
        roomSeq: 0
    };
}

/* 生成不重复的房号（6 位 = 90 万码空间；MAX_ROOMS 与建房冷却共同防止被耗尽） */
function genCode(rooms) {
    if (rooms.size >= MAX_ROOMS) return null;
    const lo = 10 ** (ROOM_CODE_LEN - 1), span = 9 * lo;
    for (let i = 0; i < 50; i++) {
        const code = String(lo + Math.floor(Math.random() * span));
        if (!rooms.has(code)) return code;
    }
    return null;
}

/* 将两个连接配成一个对战房 */
function pair(lobby, p0, p1) {
    const room = {
        id: ++lobby.roomSeq,
        peers: [p0, p1],
        picks: [null, null],
        rematch: [false, false],
        started: false,
        closed: false,
        maxF: 0                  // 已见到的最大合法帧号（初始 0：首帧也必须落在窗口内）
    };
    lobby.rooms.add(room);
    p0.room = room; p0.side = 0;
    p1.room = room; p1.side = 1;
    for (const p of room.peers) { p.lastInF = -1; p.lastHashF = -1; }
    room.peers.forEach(p => send(p, { t: 'paired', side: p.side, ver: PROTO_VER }));
    log('info', `[room ${room.id}] 配对成功`);
}

/* 双方均就绪时下发开战包（首战：双方已 pick；再战：双方已 rematch）
   输入延迟按服务端实测 RTT 自适应（ws ping/pong，非客户端上报）：
   单程耗时折算成帧数 +1 帧余量，夹紧 3~10 帧 */
function calcDelay(room) {
    const maxRtt = Math.max(room.peers[0].srvRtt || 0, room.peers[1].srvRtt || 0);
    return Math.min(DELAY_MAX, Math.max(DELAY_MIN, Math.ceil((maxRtt / 2) / 16.66) + 1));
}
function sendStart(room) {
    const start = {
        t: 'start',
        ver: PROTO_VER,
        seed: (Math.random() * 0xFFFFFFFF) >>> 0,
        p1: room.picks[0].c,
        p2: room.picks[1].c,
        wins: room.picks[0].wins,
        roundTime: room.picks[0].roundTime,
        delay: calcDelay(room)
    };
    room.rematch = [false, false];
    /* 开局水位重置为 0（原 -1 会让首帧取到 MAX_ABS_FRAME 内任意值，一次性顶穿滑动窗口）。
       帧号计数器与单调去重游标同步复位，再战时帧号从 0 重新递增。 */
    room.maxF = 0;
    for (const p of room.peers) { p.lastInF = -1; p.lastHashF = -1; }
    room.peers.forEach(p => send(p, start));
    log('info', `[room ${room.id}] 开战 seed=${start.seed} delay=${start.delay}`);
}

/* 解散房间：置 closed、移出活跃表、清空双方房间引用 */
function dissolveRoom(lobby, room) {
    room.closed = true;
    lobby.rooms.delete(room);
    for (const p of room.peers) { p.room = null; p.side = -1; }
}

/* 无效消息记账：超过阈值断开；附带审计日志 */
function bad(ws, kind, err) {
    ws.badCount++;
    if (ws.badCount <= 3) log('warn', `[ws] 无效消息(${kind}) bad=${ws.badCount} addr=${addrOf(ws)}${err ? ' err=' + err.message : ''}`);
    if (ws.badCount >= MAX_BAD) {
        log('warn', `[ws] 无效消息过多，断开 ${addrOf(ws)}`);
        try { ws.terminate(); } catch { /* ignore */ }
    }
}

function addrOf(ws) {
    const a = ws._socket;
    return a && a.remoteAddress ? `${a.remoteAddress}:${a.remotePort}` : 'unknown';
}

/* 每连接令牌桶速率限制 */
function rateLimit(ws) {
    const now = Date.now();
    const dt = Math.min(10, (now - ws.bucketT) / 1000);
    ws.bucketT = now;
    ws.bucket = Math.min(ws.bucket + dt * MSG_RATE, MSG_BURST);
    if (ws.bucket < 1) return false;
    ws.bucket -= 1;
    return true;
}

/* 帧号：非负安全整数、不超过绝对上界、且在有限窗口内
   （room.maxF 恒 >= 0：pair/sendStart 均初始化为 0，故首帧也必须落在窗口内） */
function frameOk(room, f) {
    return Number.isSafeInteger(f) && f >= 0 && f <= MAX_ABS_FRAME
        && f <= room.maxF + FRAME_WINDOW;
}

/* ---- 单个消息处理器（已通过 schema / 速率校验） ---- */
function handleMessage(lobby, ws, msg) {
    /* ---- RTT 应答（任何阶段可用） ---- */
    if (msg.t === 'ping') {
        if (typeof msg.ts !== 'number') { bad(ws, 'ping-ts'); return; }
        send(ws, { t: 'pong', ts: msg.ts });
        return;
    }

    /* ---- 大厅阶段：三种进房方式 ---- */
    if (!ws.room) {
        if (msg.t === 'quick') {
            if (lobby.quickQueue && lobby.quickQueue !== ws && lobby.quickQueue.readyState === 1) {
                const peer = lobby.quickQueue; lobby.quickQueue = null;
                pair(lobby, peer, ws);
            } else {
                lobby.quickQueue = ws;
                send(ws, { t: 'wait' });
                log('info', '[lobby] 快速匹配等待中');
            }
        } else if (msg.t === 'create') {
            /* P0 房号耗尽防护（三重）：
               ① 建房冷却——同一连接两次 create 间隔不足 CREATE_COOLDOWN_MS 计入 bad，
                  单连接最快也只能 1 次/秒（原实现仅受 200/s 令牌桶限制，45 秒即可耗尽码空间）；
               ② 重建前先回收本连接占用的旧房号，杜绝"旧 code 永不删除"的孤儿条目；
               ③ genCode 在 hostedRooms 达到 MAX_ROOMS 时返回 null，全局兜底。 */
            const now = Date.now();
            if (ws.lastCreateAt && now - ws.lastCreateAt < CREATE_COOLDOWN_MS) { bad(ws, 'create-flood'); return; }
            if (ws.hostCode) lobby.hostedRooms.delete(ws.hostCode);   // 回收旧房号
            const code = genCode(lobby.hostedRooms);
            if (!code) {
                ws.hostCode = null;
                send(ws, { t: 'joinFail', reason: '房间已满，请稍后再试' });
                return;
            }
            ws.lastCreateAt = now;
            ws.hostCode = code;
            lobby.hostedRooms.set(code, ws);
            send(ws, { t: 'room', code });
            log('info', `[lobby] 创建房间 ${code}（当前等待房间 ${lobby.hostedRooms.size}）`);
        } else if (msg.t === 'join') {
            const code = msg.code;
            if (typeof code !== 'string' || !ROOM_CODE_RE.test(code)) { bad(ws, 'join-code'); return; }
            const host = lobby.hostedRooms.get(code);
            /* P1-4：失败文案统一为"无法加入房间"——原"不存在或已关闭"与"房间已满"措辞不同，
               配合成功/失败本身即可探测房号是否存在；并对单连接失败次数限流，防穷举撞房。 */
            if (!host || host.readyState !== 1) {
                ws.joinFails = (ws.joinFails || 0) + 1;
                send(ws, { t: 'joinFail', reason: '无法加入房间' });
                if (ws.joinFails > MAX_JOIN_FAILS) {
                    log('warn', `[audit] join 连续失败过多，断开 ${addrOf(ws)}`);
                    try { ws.terminate(); } catch { /* ignore */ }
                }
                return;
            }
            lobby.hostedRooms.delete(code);
            host.hostCode = null;
            pair(lobby, host, ws);
        } else {
            bad(ws, 'lobby-unknown');
        }
        return;
    }

    /* ---- 房间内阶段 ---- */
    const room = ws.room;
    if (room.closed) return;
    const peer = room.peers[1 - ws.side];

    if (msg.t === 'sel') {
        /* P2-14：开局后光标同步既无意义又会被用作流量放大 → 加房间状态门禁 */
        if (room.started) return;
        if (!Number.isSafeInteger(msg.c) || msg.c < 0 || msg.c >= MAX_CHARS) { bad(ws, 'sel-c'); return; }
        send(peer, { t: 'sel', c: msg.c });
    } else if (msg.t === 'pick') {
        /* P2-14：开局后禁止改写 picks[side]（sendStart 复用它，rematch 时角色会在对端
           无感知下突变；同时也可被反复触发做流量放大） */
        if (room.started) return;
        /* 服务端规范化角色/规则：只接受合法值，拒绝时丢弃且不置位 */
        if (!Number.isSafeInteger(msg.c) || msg.c < 0 || msg.c >= MAX_CHARS) { bad(ws, 'pick-c'); return; }
        const wins = ALLOWED_WINS.has(msg.wins) ? msg.wins : 2;
        const roundTime = ALLOWED_ROUND_TIME.has(msg.roundTime) ? msg.roundTime : 99;
        /* P2-12：rh = 客户端角色表指纹（uint32，FNV-1a）。旧客户端不携带该字段 → null；
           两端都携带且不相等时拒绝开局——否则角色表不同的两端会静默错位，
           直到哈希校验失败才 abort，玩家根本不知道原因。 */
        const rh = (Number.isSafeInteger(msg.rh) && msg.rh >= 0 && msg.rh <= 0xFFFFFFFF)
            ? (msg.rh >>> 0) : null;
        room.picks[ws.side] = { c: msg.c, wins, roundTime, rh };
        send(peer, { t: 'peerPicked', c: msg.c });
        if (room.picks[0] && room.picks[1] && !room.started) {
            const r0 = room.picks[0].rh, r1 = room.picks[1].rh;
            if (r0 !== null && r1 !== null && r0 !== r1) {
                const reason = '双方客户端版本不一致（角色表不同），请更新游戏后重试';
                log('warn', `[room ${room.id}] 角色表指纹不一致(${r0}/${r1})，拒绝开局`);
                room.peers.forEach(p => { if (p.readyState === 1) send(p, { t: 'aborted', reason }); });
                dissolveRoom(lobby, room);
                return;
            }
            room.started = true;
            sendStart(room);
        }
    } else if (msg.t === 'rematch') {
        if (!room.started) { bad(ws, 'rematch-not-started'); return; }
        room.rematch[ws.side] = true;
        send(peer, { t: 'peerRematch' });
        if (room.rematch[0] && room.rematch[1]) sendStart(room);
    } else if (msg.t === 'abort') {
        if (!room.started) { bad(ws, 'abort-not-started'); return; }
        const reason = (typeof msg.reason === 'string' && msg.reason.length > 0 && msg.reason.length <= 80)
            ? msg.reason : 'unknown';
        room.peers.forEach(p => { if (p.readyState === 1) send(p, { t: 'aborted', reason }); });
        dissolveRoom(lobby, room);
        log('info', `[room ${room.id}] 对局中止: ${reason}`);
    } else if (msg.t === 'in' || msg.t === 'hash') {
        /* 输入/校验帧：仅已开局房间可收发；帧号、掩码、哈希均有边界校验 */
        if (!room.started) { bad(ws, 'frame-not-started'); return; }
        const f = msg.f;
        if (!frameOk(room, f)) { bad(ws, 'frame'); return; }
        if (msg.t === 'in') {
            if (!Number.isSafeInteger(msg.m) || msg.m < 0 || msg.m > 0x7FF) { bad(ws, 'mask'); return; }
            /* P1-1：帧号必须严格递增。原实现只做范围校验，对端可在 delay 窗口内反复重发
               同一帧的不同掩码改写已声明输入（确定性作弊），也能用旧帧回灌。 */
            if (f <= ws.lastInF) { bad(ws, 'in-replay'); return; }
            ws.lastInF = f;
            send(peer, { t: 'in', f, m: msg.m });
        } else {
            if (!Number.isSafeInteger(msg.h) || (msg.h >>> 0) !== msg.h) { bad(ws, 'hash'); return; }
            /* 同上：哈希帧去重，防止伪造 hash 反复触发对方 abort */
            if (f <= ws.lastHashF) { bad(ws, 'hash-replay'); return; }
            ws.lastHashF = f;
            send(peer, { t: 'hash', f, h: msg.h });
        }
        if (f > room.maxF) room.maxF = f;
    } else {
        bad(ws, 'room-unknown');
    }
}

/* 创建服务器实例（供测试在随机端口启动） */
/* heartbeatMs 可注入：生产用 HEARTBEAT_MS，测试可传小值快速验证心跳淘汰 */
export function createNetServer({ port = PORT, host = HOST, maxConns = MAX_CONNS, allowedOrigins = null, heartbeatMs = HEARTBEAT_MS } = {}) {
    const originList = allowedOrigins
        ? allowedOrigins
        : (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const lobby = createLobby();

    /* P0-4：默认配置 = 不校验 Origin + 监听所有网卡。功能上没错（局域网即插即用），
       但暴露公网等于开放无鉴权中继。给出醒目告警，文档同步要求公网部署配置白名单。 */
    if (originList.length === 0 && !ALLOW_ORIGIN_EMPTY) {
        console.warn('[security] 未配置 ALLOWED_ORIGINS：当前不校验 Origin，且监听 '
            + (host || '0.0.0.0') + '。局域网使用没问题；公网部署请务必设置 ALLOWED_ORIGINS'
            + '（或用 HOST=127.0.0.1 限制本机），详见 README「联机对战」。');
    }

    const server = new WebSocketServer({ port, host, maxPayload: MAX_PAYLOAD });
    server.on('error', err => log('error', `[net] 服务器错误: ${err.message}`));

    server.on('connection', (ws, req) => {
        /* 连接配额（P3-5：原为 `> maxConns`，实际放行 maxConns+1 个连接） */
        if (maxConns > 0 && server.clients.size >= maxConns) {
            log('warn', `[audit] 连接数达上限 ${maxConns}，拒绝 ${addrOf(ws)}`);
            try { ws.close(1013, 'server full'); } catch { /* ignore */ }
            return;
        }

        /* Origin 校验（P2-7）：配置了允许列表时强制校验，并拒绝缺失 Origin 的连接。
           原实现"列表非空但请求无 Origin 头"直接放行，非浏览器客户端省略该头即可绕过。
           确有非浏览器客户端时可用 ALLOW_ORIGIN_EMPTY=1 显式放行。 */
        const origin = req && req.headers ? req.headers.origin : null;
        if (originList.length > 0) {
            if (!origin && !ALLOW_ORIGIN_EMPTY) {
                log('warn', `[audit] 拒绝缺少 Origin 的连接 ${addrOf(ws)}`);
                try { ws.close(1008, 'origin required'); } catch { /* ignore */ }
                return;
            }
            if (origin && !originList.includes(origin)) {
                log('warn', `[audit] 拒绝非法 Origin: ${origin}`);
                try { ws.close(1008, 'origin not allowed'); } catch { /* ignore */ }
                return;
            }
        }

        /* 每连接状态 */
        ws.room = null;
        ws.side = -1;
        ws.hostCode = null;
        ws.srvRtt = 0;            // 服务端实测 RTT（ms，EMA 平滑）
        ws._pingAt = 0;
        ws.isAlive = true;
        ws.bucket = MSG_BURST;
        ws.bucketT = Date.now();
        ws.badCount = 0;
        ws.lastCreateAt = 0;      // 上次建房时间（create 洪水限流）
        ws.joinFails = 0;         // 加入失败计数（房号穷举限流）
        ws.lastInF = -1;          // 已接受的最后一个输入帧号（严格递增校验）
        ws.lastHashF = -1;        // 已接受的最后一个哈希帧号

        ws.on('pong', () => {
            ws.isAlive = true;
            if (ws._pingAt) {
                const rtt = Math.min(2000, Date.now() - ws._pingAt);
                ws._pingAt = 0;
                /* P2-5：首次直接用实测值，之后取 EMA（0.7/0.3）平滑，避免抖动导致 delay 跳变 */
                ws.srvRtt = ws.srvRtt > 0 ? Math.round(ws.srvRtt * 0.7 + rtt * 0.3) : rtt;
            }
        });

        /* P2-5：连接建立后尽快采样一次 RTT。原实现要等首个 10 秒心跳才有样本，
           此前 srvRtt=0 → calcDelay 恒得下限 3 帧，跨区高延迟对手开局必然卡顿。
           注意：探测必须延后一个短定时再发。实测在 connection 回调里同步写 ping 帧
           会打乱服务端读取各连接首条业务消息的顺序（后连的客户端反而先被处理），
           延后 50ms 即可规避，且远早于玩家完成建房/选人的时间。 */
        setTimeout(() => {
            if (ws.readyState === 1) { ws._pingAt = Date.now(); try { ws.ping(); } catch { /* ignore */ } }
        }, RTT_PROBE_DELAY_MS).unref();

        ws.on('message', (data, isBinary) => {
            try {
                /* P0：拒绝二进制帧与超长文本；解析后必须是普通对象且 t 为字符串
                   （注意：ws 8.x 文本帧也以 Buffer 交付，需按 isBinary 区分并显式解码） */
                if (isBinary) { bad(ws, 'binary'); return; }
                const text = typeof data === 'string' ? data : data.toString('utf8');
                if (text.length > MAX_MSG) { bad(ws, 'size'); return; }
                let msg;
                try { msg = JSON.parse(text); } catch { bad(ws, 'json'); return; }
                if (!msg || typeof msg !== 'object' || Array.isArray(msg) || typeof msg.t !== 'string') {
                    bad(ws, 'shape'); return;
                }
                if (!rateLimit(ws)) { bad(ws, 'rate'); return; }
                handleMessage(lobby, ws, msg);
            } catch (err) {
                /* P0：单消息处理器异常隔离，绝不因一条消息退出进程 */
                bad(ws, 'handler', err);
            }
        });

        ws.on('error', err => {
            log('error', `[ws] 连接错误 ${addrOf(ws)}: ${err.message}`);
        });

        ws.on('close', () => {
            if (lobby.quickQueue === ws) lobby.quickQueue = null;
            if (ws.hostCode) lobby.hostedRooms.delete(ws.hostCode);
            const room = ws.room;
            if (room && !room.closed) {
                const peer = room.peers[1 - ws.side];
                if (peer && peer.readyState === 1) { send(peer, { t: 'peerLeft' }); }
                dissolveRoom(lobby, room);
                log('info', `[room ${room.id}] 玩家离开，房间解散`);
            }
            ws.room = null;
            ws.side = -1;
            log('debug', `[audit] 连接关闭 addr=${addrOf(ws)}`);
        });
    });

    /* 心跳治理：两轮未 pong 的半开连接直接 terminate */
    const heartbeat = setInterval(() => {
        for (const ws of server.clients) {
            if (ws.isAlive === false) {
                log('warn', `[ws] 心跳超时，断开 ${addrOf(ws)}`);
                try { ws.terminate(); } catch { /* ignore */ }
                continue;
            }
            ws.isAlive = false;
            ws._pingAt = Date.now();
            try { ws.ping(); } catch { /* ignore */ }
        }
    }, heartbeatMs);
    heartbeat.unref();

    return {
        wss: server,
        port,
        close(cb) {
            clearInterval(heartbeat);
            for (const c of server.clients) { try { c.terminate(); } catch { /* ignore */ } }
            server.close(cb);
        },
        /* 优雅关闭（P2-13）：先向所有活跃对局广播 aborted，再温和关闭连接并停机。
           原 Ctrl+C 直接切断所有 socket，对端要等最长 20 秒心跳超时才知道对局没了。 */
        shutdown(reason = '服务器已关闭，对局中止') {
            clearInterval(heartbeat);
            const msg = { t: 'aborted', reason: String(reason).slice(0, 80) };
            for (const room of lobby.rooms) {
                if (room.closed) continue;
                room.closed = true;
                for (const p of room.peers) {
                    if (p.readyState === 1) { try { send(p, msg); } catch { /* ignore */ } }
                }
            }
            lobby.rooms.clear();
            lobby.quickQueue = null;
            lobby.hostedRooms.clear();
            for (const c of server.clients) { try { c.close(1001, 'server shutdown'); } catch { /* ignore */ } }
            return new Promise(res => server.close(() => res()));
        }
    };
}

/* 直接运行时启动（被测试 import 时不自动监听） */
let isMain = false;
try { isMain = !!process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url; } catch { /* ignore */ }
if (isMain) {
    const server = createNetServer();
    server.wss.on('listening', () => {
        log('info', `[net] 联机服务器已启动 ws://${HOST || '0.0.0.0'}:${server.wss.address().port}`
            + ` (maxConn=${MAX_CONNS}, payload≤${MAX_PAYLOAD}B, rate=${MSG_RATE}/s)`);
    });
    /* P2-13：Ctrl+C / kill 时广播 aborted 再退出，对端立即回大厅而不是等心跳超时 */
    let closing = false;
    const graceful = sig => {
        if (closing) return;
        closing = true;
        log('info', `[net] 收到 ${sig}，广播对局中止并关闭…`);
        const done = () => process.exit(0);
        server.shutdown().then(done, done);
        setTimeout(done, 3000).unref();   // 兜底：3 秒内强制退出
    };
    process.on('SIGINT', () => graceful('SIGINT'));
    process.on('SIGTERM', () => graceful('SIGTERM'));
}
