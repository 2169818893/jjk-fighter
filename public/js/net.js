/* =====================================================================
   联机客户端（帧锁同步 lockstep MVP）
   原理：双方每逻辑帧交换"动作位掩码"，本地输入延迟 DELAY 帧生效，
        两端在同一帧号上注入完全相同的双方输入 → 确定性模拟保持一致
   ===================================================================== */
import { KEYMAP, ROSTER, Settings } from './config.js';
import { RNG } from './utils.js';

/* 动作位序（与 KEYMAP 的动作名一一对应，两端必须一致） */
const ACTIONS = ['left', 'right', 'jump', 'block', 'light', 'heavy', 'skill1', 'skill2', 'skill3', 'ult', 'dodge'];
const SIDE_KEYS = ['p1', 'p2'];   // KEYMAP 以 p1/p2 为键
const PROTO_VER = 2;              // 与 server/net-server.mjs 的 PROTO_VER 保持一致（v2：+rh 角色表指纹）
const MASK_MAX = 0x7FF;           // 11 位动作掩码上界
const BUF_WINDOW = 1024;          // 输入缓存滑动窗口：帧号落后超过该值即清理
const BUF_CAP = 2048;             // 输入缓存总量上限（防止恶意对端刷爆内存）
export const ROOM_CODE_LEN = 6;   // 房号位数（须与服务端 ROOM_CODE_LEN 一致）
const STALL_ABORT_FRAMES = 300;   // 连续等待对端输入超过约 5 秒即中止对局

/* FNV-1a：把双方关键状态压成一个 uint32，用于联机失步检测（不消耗 RNG） */
function stateHash(a, b) {
    let h = 2166136261 >>> 0;
    const mix = v => { h = Math.imul(h ^ (v >>> 0), 16777619) >>> 0; };
    const push = f => {
        mix(Math.round(f.hp));
        mix(Math.round(f.x));
        mix(Math.round(f.y));
        mix(Math.round(f.energy));
        mix(f.st);
        mix(f.dead ? 1 : 0);
        if (f.cd) { mix(f.cd.skill1); mix(f.cd.skill2); mix(f.cd.skill3); }
        const s = String(f.state || '');
        mix(s.length);
        for (let i = 0; i < s.length; i++) mix(s.charCodeAt(i));
    };
    mix(RNG.getState());   // 最能定位分流点：RNG 消耗次数/状态一旦错位必然在此暴露
    push(a); push(b);
    return h >>> 0;
}

/* P2-12：角色表指纹（FNV-1a uint32）。选人阶段随 pick 上报，服务端比对两端
   指纹，不一致即拒绝开局——防止角色表不同的客户端版本之间静默错位 */
function rosterHash() {
    let h = 2166136261 >>> 0;
    for (const id of ROSTER) {
        for (let i = 0; i < id.length; i++) {
            h = Math.imul(h ^ id.charCodeAt(i), 16777619) >>> 0;
        }
        h = Math.imul(h ^ 0x1F, 16777619) >>> 0;   // 条目分隔符
    }
    return h >>> 0;
}

export const Net = {
    active: false,
    ws: null,
    side: 0,               // 本机执方：0=P1 / 1=P2
    status: 'off',         // off|connecting|lobby|waiting|hosting|paired|picked|playing|error
    errMsg: '',
    failMsg: '',           // 加入房间失败提示（大厅内展示，不算致命错误）
    roomCode: '',          // 创建房间后服务器分配的 6 位房号
    rematchLocal: false,   // 本方已请求再战
    rematchPeer: false,    // 对方已请求再战
    rtt: null,             // 最近一次 ping 往返延迟（ms）
    _pingTimer: null,
    delay: 4,              // 输入延迟帧数（服务器按双方 RTT 自适应下发，两端一致）
    stall: 0,              // 连续等待对端输入的帧数（UI 提示网络波动用）
    picked: false,
    peerPickIdx: null,
    frame: 0,
    lastSent: -1,
    localBuf: {}, remoteBuf: {},
    prevMask: [0, 0],
    hashLocal: {}, hashRemote: {},
    desync: false,
    onEvent: null,         // game.js 注册的事件回调 (type, msg)

    /* ---- 物理键盘原始状态（独立于 Input，不受注入污染） ---- */
    raw: { down: {}, tap: {} },
    _rawInit: false,
    initRaw() {
        if (this._rawInit) return;
        this._rawInit = true;
        addEventListener('keydown', e => {
            if (!this.raw.down[e.code]) this.raw.tap[e.code] = true;
            this.raw.down[e.code] = true;
        });
        addEventListener('keyup', e => { this.raw.down[e.code] = false; });
    },

    /* ---- 解析联机服务器地址 ----
       优先级：URL 参数 ?server= 显式指定 > 按页面协议推导
       • 局域网（http 页面）：默认 ws://当前主机:8736，与旧行为一致
       • 公网（https 页面）：默认 wss://当前主机（不拼端口，交由反代/隧道统一 443）
         —— 浏览器禁止 https 页面连明文 ws://（混合内容拦截），故必须 wss
       手动指定例：?server=wss://xxx.trycloudflare.com
                 ?server=my-host:9000（省略协议时按页面协议补全）
                 ?host=1.2.3.4&port=8736 */
    wsUrl() {
        const q = new URLSearchParams(location.search);
        const explicit = q.get('server') || q.get('ws');
        const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
        if (explicit) {
            return /^wss?:\/\//i.test(explicit) ? explicit : `${scheme}://${explicit}`;
        }
        const host = q.get('host') || location.hostname || 'localhost';
        // https 默认不显式带端口（走 443）；http 默认本机 8736；均可用 ?port= 覆盖
        const port = q.get('port') || (scheme === 'wss' ? '' : '8736');
        return `${scheme}://${host}${port ? ':' + port : ''}`;
    },

    /* ---- 连接 / 断开 ---- */
    connect() {
        this.initRaw();
        this.resetSession();
        this.active = true;
        this.status = 'connecting';
        try {
            this.ws = new WebSocket(this.wsUrl());
        } catch {
            this.status = 'error'; this.errMsg = '无法创建连接';
            return;
        }
        this.ws.onopen = () => {
            /* 连接成功进入大厅：由玩家选择快速匹配/创建/加入房间 */
            this.status = 'lobby';
            this.startPing();
        };
        this.ws.onmessage = ev => {
            let msg;
            try { msg = JSON.parse(ev.data); } catch { return; }
            this.handle(msg);
        };
        this.ws.onclose = () => {
            if (!this.active) return;
            this.status = 'error';
            this.errMsg = '连接已断开（服务器未启动？）';
            if (this.onEvent) this.onEvent('closed');
        };
        this.ws.onerror = () => { /* onclose 会跟进 */ };
    },
    disconnect() {
        this.active = false;
        this.stopPing();
        if (this.ws) { try { this.ws.close(); } catch { /* 连接可能已断开 */ } this.ws = null; }
        this.resetSession();
        this.status = 'off';
    },
    resetSession() {
        this.side = 0; this.picked = false; this.peerPickIdx = null;
        this.frame = 0; this.lastSent = -1;
        this.localBuf = new Map(); this.remoteBuf = new Map();
        this.prevMask = [0, 0];
        this.hashLocal = new Map(); this.hashRemote = new Map();
        this.desync = false; this.errMsg = '';
        this.failMsg = ''; this.roomCode = '';
        this.rematchLocal = false; this.rematchPeer = false;
        this.rtt = null; this.stall = 0; this.stallAborted = false;
    },

    /* ---- RTT 探测：每 2 秒发一次 ping ---- */
    startPing() {
        this.stopPing();
        this._pingTimer = setInterval(() => this.send({ t: 'ping', ts: Date.now() }), 2000);
    },
    stopPing() {
        if (this._pingTimer) { clearInterval(this._pingTimer); this._pingTimer = null; }
    },

    /* ---- 大厅：三种进房方式 ---- */
    quick() {
        this.failMsg = '';
        this.status = 'waiting';
        this.send({ t: 'quick' });
    },
    create() {
        this.failMsg = '';
        this.send({ t: 'create' });
    },
    joinRoom(code) {
        const s = String(code == null ? '' : code);
        if (!new RegExp('^\\d{' + ROOM_CODE_LEN + '}$').test(s)) {
            this.failMsg = `请输入 ${ROOM_CODE_LEN} 位房号`;
            return;
        }
        this.failMsg = '';
        this.status = 'waiting';
        this.send({ t: 'join', code: s });
    },
    /* P1-12：页面切到后台时浏览器把 setInterval 节流到 ≥1000ms（Chrome 5 分钟后更低），
       stepLogic 的 dt 截断使逻辑只剩约 6 帧/秒，而帧锁每帧都要等对端输入 →
       必然失步/断线。与其硬撑，不如在隐藏瞬间主动中止对局。 */
    onPageHidden(hidden) {
        if (hidden && this.active && this.status === 'playing') {
            this.abort('页面切至后台，已中止对局');
        }
    },

    /* ---- 原地再战：双方都请求后服务器下发新 start ---- */
    requestRematch() {
        if (this.rematchLocal || this.status !== 'playing') return;
        this.rematchLocal = true;
        this.send({ t: 'rematch' });
    },
    /* ---- 主动中止：失步/协议异常时通知服务器广播双方 ---- */
    abort(reason) {
        if (!this.active) return;
        this.send({ t: 'abort', reason: String(reason || 'unknown').slice(0, 80) });
    },
    send(obj) {
        if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(obj));
    },

    /* ---- 服务器消息 ---- */
    handle(msg) {
        if (msg.t === 'wait') { this.status = 'waiting'; }
        else if (msg.t === 'pong') {
            if (typeof msg.ts === 'number') this.rtt = Math.max(0, Date.now() - msg.ts);
        } else if (msg.t === 'room') {
            this.roomCode = msg.code;
            this.status = 'hosting';
        } else if (msg.t === 'joinFail') {
            /* 回到大厅输入界面，展示失败原因 */
            this.status = 'lobby';
            this.failMsg = msg.reason || '加入失败';
        } else if (msg.t === 'peerRematch') {
            this.rematchPeer = true;
        } else if (msg.t === 'paired') {
            if (msg.ver !== undefined && msg.ver !== PROTO_VER) { this.fatal('协议版本不兼容，请刷新页面'); return; }
            this.side = (msg.side === 0 || msg.side === 1) ? msg.side : 0;
            this.status = 'paired';
            if (this.onEvent) this.onEvent('paired', msg);
        } else if (msg.t === 'sel') {
            if (this.onEvent) this.onEvent('sel', msg);
        } else if (msg.t === 'peerPicked') {
            if (Number.isSafeInteger(msg.c) && msg.c >= 0) this.peerPickIdx = msg.c;
        } else if (msg.t === 'start') {
            if (msg.ver !== undefined && msg.ver !== PROTO_VER) { this.fatal('协议版本不兼容，请刷新页面'); return; }
            this.status = 'playing';
            this.rematchLocal = false; this.rematchPeer = false;
            this.delay = Number.isSafeInteger(msg.delay) ? Math.min(30, Math.max(1, msg.delay)) : 4;
            this.beginLockstep();
            if (this.onEvent) this.onEvent('start', msg);
        } else if (msg.t === 'in') {
            /* 防御性校验（服务端已拦截，客户端再加一道边界） */
            if (!Number.isSafeInteger(msg.f) || msg.f < 0 || msg.f < this.frame - 64 || msg.f > this.frame + BUF_WINDOW) return;
            if (!Number.isSafeInteger(msg.m) || msg.m < 0 || msg.m > MASK_MAX) return;
            this.remoteBuf.set(msg.f, msg.m);
            if (this.remoteBuf.size > BUF_CAP) this.remoteBuf.delete(this.remoteBuf.keys().next().value);
        } else if (msg.t === 'hash') {
            /* P1-2：补上与 in 分支同级的窗口校验与容量上限。
               原实现只查非负，checkHash 仅在双方都有同帧值时才删除，
               对端以 200/s 刷 hash 可让 hashRemote 无上限膨胀（约 72 万条/小时） */
            if (!Number.isSafeInteger(msg.f) || msg.f < 0 || msg.f > this.frame + BUF_WINDOW) return;
            if (!Number.isSafeInteger(msg.h) || (msg.h >>> 0) !== msg.h) return;
            this.hashRemote.set(msg.f, msg.h);
            if (this.hashRemote.size > BUF_CAP) this.hashRemote.delete(this.hashRemote.keys().next().value);
            this.checkHash(msg.f);
        } else if (msg.t === 'aborted') {
            this.status = 'error';
            this.errMsg = msg.reason || '对局已中止';
            if (this.onEvent) this.onEvent('aborted', msg);
        } else if (msg.t === 'peerLeft') {
            this.status = 'error';
            this.errMsg = '对方已离开';
            if (this.onEvent) this.onEvent('peerLeft');
        }
    },
    /* 致命错误：提示并断开连接 */
    fatal(msg) {
        this.status = 'error';
        this.errMsg = msg;
        if (this.onEvent) this.onEvent('closed');
        if (this.ws) { try { this.ws.close(); } catch { /* 连接可能已断开 */ } }
    },

    /* ---- 角色选择阶段 ---- */
    sendCursor(c) {
        if (!Number.isSafeInteger(c) || c < 0) return;
        this.send({ t: 'sel', c });
    },
    sendPick(c) {
        if (this.picked) return;
        if (!Number.isSafeInteger(c) || c < 0) return;
        this.picked = true;
        this.status = 'picked';
        /* 规范化后发送：wins 仅 1/2；roundTime 仅 30/60/99/120（'∞' 视为 99）；
           rh = 角色表指纹，服务端校验两端一致（P2-12） */
        const wins = Settings.targetWins === 1 ? 1 : 2;
        const roundTime = Settings.roundTime === '∞' ? 99
            : ([30, 60, 99, 120].includes(Settings.roundTime) ? Settings.roundTime : 99);
        this.send({
            t: 'pick', c,
            wins,
            roundTime,
            rh: rosterHash()
        });
    },

    /* ---- 帧锁核心 ---- */
    beginLockstep() {
        this.frame = 0; this.lastSent = -1;
        this.localBuf = new Map(); this.remoteBuf = new Map();
        this.prevMask = [0, 0];
        this.hashLocal = new Map(); this.hashRemote = new Map();
        this.desync = false; this.stall = 0; this.stallAborted = false;
        // 前 delay 帧双方输入固定为空，保证起步同步
        for (let f = 0; f < this.delay; f++) { this.localBuf.set(f, 0); this.remoteBuf.set(f, 0); }
        this.raw.tap = {};
    },
    lockstepScene(scene) {
        return this.active && this.status === 'playing' && (scene === 'versus' || scene === 'fight');
    },
    /* 用本地 P1 键位采样物理键盘 → 动作掩码（tap 累积保证极短点按不丢帧） */
    sampleMask() {
        const km = KEYMAP.p1;
        let m = 0;
        for (let i = 0; i < ACTIONS.length; i++) {
            const ks = km[ACTIONS[i]];
            if (ks && ks.some(k => this.raw.down[k] || this.raw.tap[k])) m |= (1 << i);
        }
        this.raw.tap = {};
        return m;
    },
    /* 每逻辑帧调用：采样发送 + 等待双方输入 + 注入。返回 false 表示等待对端、本帧暂停 */
    tick(game, Input) {
        const sendF = this.frame + this.delay;
        if (this.lastSent !== sendF) {
            const m = this.sampleMask();
            this.localBuf.set(sendF, m);
            this.send({ t: 'in', f: sendF, m });
            this.lastSent = sendF;
        }
        const lm = this.localBuf.get(this.frame), rm = this.remoteBuf.get(this.frame);
        if (lm === undefined || rm === undefined) {
            this.stall++;
            /* P1-3：stall 原只用于 UI 提示，无上限。对端只要保住 ws 心跳却停止发输入，
               本端就会永久停在"等待对方数据"。超过约 5 秒主动中止并广播，让双方都能回到大厅。 */
            if (this.stall >= STALL_ABORT_FRAMES && !this.stallAborted) {
                this.stallAborted = true;
                console.warn(`[net] 连续 ${this.stall} 帧收不到对端输入，中止对局`);
                this.abort('等待对端数据超时');
            }
            return false;
        }
        this.stall = 0;

        // 按执方注入：两端在同一帧看到完全一致的双方按键状态
        const masks = [];
        masks[this.side] = lm;
        masks[1 - this.side] = rm;
        for (let s = 0; s < 2; s++) {
            const km = KEYMAP[SIDE_KEYS[s]], prev = this.prevMask[s], cur = masks[s];
            for (let i = 0; i < ACTIONS.length; i++) {
                const ks = km[ACTIONS[i]];
                if (!ks) continue;
                const d = !!(cur & (1 << i)), pd = !!(prev & (1 << i));
                for (const k of ks) {
                    Input.down[k] = d;
                    if (d && !pd) { Input.press[k] = true; Input.buf[k] = true; Input.bufT[k] = 10; }
                    else { Input.press[k] = false; if (!d) Input.buf[k] = false; }
                }
            }
            this.prevMask[s] = cur;
        }
        this.localBuf.delete(this.frame - 2);
        this.remoteBuf.delete(this.frame - 2);
        /* 滑动窗口清理：只保留最近 BUF_WINDOW 帧（防御对端延迟/重发包导致的缓存膨胀） */
        if (this.frame % 120 === 0) {
            const cutoff = this.frame - BUF_WINDOW;
            for (const k of this.localBuf.keys()) if (k < cutoff) this.localBuf.delete(k);
            for (const k of this.remoteBuf.keys()) if (k < cutoff) this.remoteBuf.delete(k);
        }

        // 每 120 帧交换一次状态哈希，检测不同步
        if (this.frame > 0 && this.frame % 120 === 0 && game.fighters && game.fighters.length === 2) {
            const f = game.fighters;
            /* P2-17：改用 stateHash()（覆盖 RNG 状态/HP/坐标/能量/state/st/冷却）。
               原内联哈希只看 HP 与 x，哪怕 RNG 已经分流也检测不出来，往往要等到
               画面明显不同才暴露。stateHash 早已写好却从未被调用，此处接上。 */
            const h = stateHash(f[0], f[1]);
            this.hashLocal.set(this.frame, h);
            this.send({ t: 'hash', f: this.frame, h });
            this.checkHash(this.frame);
        }
        this.frame++;
        return true;
    },
    checkHash(f) {
        const l = this.hashLocal.get(f), r = this.hashRemote.get(f);
        if (l === undefined || r === undefined) return;
        if (l !== r && !this.desync) {
            this.desync = true;
            console.warn(`[net] 帧 ${f} 状态哈希不一致，两端已失步！`);
            /* 失步后通知服务器中止对局，避免双方继续漂移 */
            this.abort('双方状态失步');
        }
        this.hashLocal.delete(f); this.hashRemote.delete(f);
    }
};
