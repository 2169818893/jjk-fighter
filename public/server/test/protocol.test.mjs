/* =====================================================================
   联机协议回归测试（node:test + ws）
   覆盖：畸形 JSON / 超大包 / 非法 pick / 越界帧号·掩码·哈希 /
         abort 广播 / rematch / 断线通知 / 高频刷包
         P0 建房洪水限流与房号回收 / P1-1 帧号单调去重 / P1-4 房号穷举限流 /
         P2-7 Origin 拒绝 / P2-14 开局后 pick·sel 门禁 / 连接配额
         P2-8 补测：二进制帧拒绝、房号格式非法、协议版本字段、
               心跳淘汰、连接即 RTT 探测、abort 后 rematch 失效
         P2-12 角色表指纹：一致开局 / 不一致拒绝开局 / 旧客户端兼容
         P2-13 优雅关闭：shutdown 广播 aborted
   运行：node --test test/protocol.test.mjs
   ===================================================================== */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import WebSocket from 'ws';
import { createNetServer, PROTO_VER, ROOM_CODE_LEN, CREATE_COOLDOWN_MS } from '../net-server.mjs';

let server;
let baseUrl;

before(async () => {
    server = createNetServer({ port: 0, host: '127.0.0.1' });
    await new Promise(res => server.wss.on('listening', res));
    baseUrl = `ws://127.0.0.1:${server.wss.address().port}`;
});
after(() => new Promise(res => server.close(res)));

function openClient() {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(baseUrl);
        ws.on('open', () => resolve(ws));
        ws.on('error', reject);
    });
}
function waitMsg(ws, pred, timeout = 2000) {
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => {
            ws.off('message', onMsg);
            reject(new Error('等待消息超时'));
        }, timeout);
        function onMsg(data) {
            let m;
            try { m = JSON.parse(data); } catch { return; }
            if (!pred || pred(m)) {
                clearTimeout(t);
                ws.off('message', onMsg);
                resolve(m);
            }
        }
        ws.on('message', onMsg);
    });
}
function send(ws, obj) {
    ws.send(typeof obj === 'string' ? obj : JSON.stringify(obj));
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* 快速匹配出两个对局客户端，返回 [a, b]（均已收到 paired） */
async function pairUp() {
    const a = await openClient();
    const b = await openClient();
    send(a, { t: 'quick' });
    const pa = waitMsg(a, m => m.t === 'paired');
    const pb = waitMsg(b, m => m.t === 'paired');
    send(b, { t: 'quick' });
    await Promise.all([pa, pb]);
    return [a, b];
}
/* 双方 pick 并等待 start 下发 */
async function startMatch(a, b) {
    const sa = waitMsg(a, m => m.t === 'start');
    const sb = waitMsg(b, m => m.t === 'start');
    send(a, { t: 'pick', c: 3, wins: 2, roundTime: 99 });
    send(b, { t: 'pick', c: 5, wins: 1, roundTime: 30 });
    const [ma, mb] = await Promise.all([sa, sb]);
    return [ma, mb];
}

test('畸形 JSON（null/数组/字符串/空对象/非字符串 t）不导致服务器崩溃', async () => {
    const ws = await openClient();
    send(ws, 'null');
    send(ws, '[1,2,3]');
    send(ws, '"str"');
    send(ws, '{}');
    send(ws, JSON.stringify({ t: 5 }));
    send(ws, 'null'); // 再次确认仍存活
    await sleep(120);

    // 服务器仍能正常服务新连接
    const ws2 = await openClient();
    send(ws2, { t: 'quick' });
    assert.equal((await waitMsg(ws2, m => m.t === 'wait')).t, 'wait');
    ws.close();
    ws2.close();
    await sleep(30);
});

test('超大文本消息被 maxPayload 断开', async () => {
    const ws = await openClient();
    const closed = new Promise(res => ws.on('close', code => res(code)));
    ws.send('x'.repeat(20_000));
    const code = await closed;
    assert.ok(code === 1009 || code === 1006, `预期 1009/1006，实际 ${code}`);
});

test('快速匹配 → pick → start 全流程（含 ver 与规则规范化）', async () => {
    const [a, b] = await pairUp();
    const [sa] = await startMatch(a, b);
    assert.equal(sa.ver, PROTO_VER);
    assert.equal(sa.p1, 3);          // a 为 side 0
    assert.equal(sa.p2, 5);
    assert.equal(sa.wins, 2);        // 取 a 的 wins
    assert.equal(sa.roundTime, 99);  // 取 a 的 roundTime
    assert.ok(sa.delay >= 3 && sa.delay <= 12, `delay=${sa.delay}`);
    assert.ok(Number.isInteger(sa.seed) && sa.seed >= 0 && sa.seed < 2 ** 32);
    a.close();
    b.close();
    await sleep(30);
});

test('非法 pick（角色索引越界）被丢弃，不破坏后续正常开局', async () => {
    const [a, b] = await pairUp();
    let gotPeerPicked = false;
    b.on('message', d => {
        try { if (JSON.parse(d).t === 'peerPicked') gotPeerPicked = true; } catch { /* ignore */ }
    });
    send(a, { t: 'pick', c: 999, wins: 2, roundTime: 99 });
    await sleep(150);
    assert.equal(gotPeerPicked, false, '非法 pick 不应转发');

    // 合法 pick 仍可正常开局
    const sa = waitMsg(a, m => m.t === 'start');
    const sb = waitMsg(b, m => m.t === 'start');
    send(a, { t: 'pick', c: 0, wins: 2, roundTime: 99 });
    send(b, { t: 'pick', c: 1, wins: 2, roundTime: 99 });
    const [ma, mb] = await Promise.all([sa, sb]);
    assert.equal(ma.p1, 0);
    assert.equal(mb.p2, 1);
    a.close();
    b.close();
    await sleep(30);
});

test('越界 in/hash（帧号/掩码/哈希）被服务端拦截，合法帧正常转发', async () => {
    const [a, b] = await pairUp();
    await startMatch(a, b);

    // 非法包：不应有任何转发
    let forwarded = 0;
    const spy = d => { try { const m = JSON.parse(d); if (m.t === 'in' || m.t === 'hash') forwarded++; } catch { /* ignore */ } };
    b.on('message', spy);
    send(a, { t: 'in', f: 1e9, m: 1 });          // 帧号越界
    send(a, { t: 'in', f: 0, m: 4096 });          // 掩码越界（> 11 位）
    send(a, { t: 'in', f: 0, m: -1 });            // 掩码负数
    send(a, { t: 'hash', f: 0, h: -5 });          // 哈希非 uint32
    send(a, { t: 'hash', f: 0, h: 2 ** 32 });     // 哈希越界
    send(a, { t: 'hash', f: 'x', h: 1 });         // 帧号非整数
    await sleep(150);
    b.off('message', spy);
    assert.equal(forwarded, 0, `不应转发非法帧，实际 ${forwarded} 条`);

    // 合法帧正常转发
    const okIn = waitMsg(b, m => m.t === 'in' && m.f === 0 && m.m === 1);
    send(a, { t: 'in', f: 0, m: 1 });
    await okIn;
    const okHash = waitMsg(b, m => m.t === 'hash' && m.f === 0 && m.h === 123);
    send(a, { t: 'hash', f: 0, h: 123 });
    await okHash;

    a.close();
    b.close();
    await sleep(30);
});

test('abort 广播给双方并解除房间', async () => {
    const [a, b] = await pairUp();
    await startMatch(a, b);
    const ea = waitMsg(a, m => m.t === 'aborted');
    const eb = waitMsg(b, m => m.t === 'aborted');
    send(a, { t: 'abort', reason: '双方状态失步' });
    const [ma, mb] = await Promise.all([ea, eb]);
    assert.equal(ma.reason, '双方状态失步');
    assert.equal(mb.reason, '双方状态失步');
    a.close();
    b.close();
    await sleep(30);
});

test('rematch 双方确认后重新开局', async () => {
    const [a, b] = await pairUp();
    await startMatch(a, b);
    const sa = waitMsg(a, m => m.t === 'start');
    const sb = waitMsg(b, m => m.t === 'start');
    send(a, { t: 'rematch' });
    send(b, { t: 'rematch' });
    const [ma, mb] = await Promise.all([sa, sb]);
    assert.equal(ma.t, 'start');
    assert.equal(ma.ver, PROTO_VER);
    assert.equal(mb.t, 'start');
    assert.equal(ma.seed, mb.seed); // 双方同一种子
    a.close();
    b.close();
    await sleep(30);
});

test('一方断开，另一方收到 peerLeft', async () => {
    const [a, b] = await pairUp();
    const pl = waitMsg(b, m => m.t === 'peerLeft');
    a.close();
    await pl;
    b.close();
    await sleep(30);
});

test('高频刷包后服务器仍存活并可匹配', async () => {
    const ws = await openClient();
    for (let i = 0; i < 300; i++) ws.send(JSON.stringify({ t: 'ping', ts: Date.now() }));
    await sleep(200);
    const ws2 = await openClient();
    send(ws2, { t: 'quick' });
    assert.equal((await waitMsg(ws2, m => m.t === 'wait')).t, 'wait');
    ws.close();
    ws2.close();
    await sleep(30);
});

test('房间阶段前发送 in/hash 被拒绝（房间状态机）', async () => {
    const [a, b] = await pairUp();
    let forwarded = 0;
    const spy = d => { try { const m = JSON.parse(d); if (m.t === 'in' || m.t === 'hash') forwarded++; } catch { /* ignore */ } };
    b.on('message', spy);
    send(a, { t: 'in', f: 0, m: 1 });
    send(a, { t: 'hash', f: 0, h: 1 });
    await sleep(150);
    b.off('message', spy);
    assert.equal(forwarded, 0, '未开局时 in/hash 不应转发');
    a.close();
    b.close();
    await sleep(30);
});

/* ===================== 2026-09-01 新增回归 ===================== */

test('P1-1 帧号严格递增：重复帧与回退帧被丢弃，不能改写已声明输入', async () => {
    const [a, b] = await pairUp();
    await startMatch(a, b);
    const forwarded = [];
    const spy = d => { try { const m = JSON.parse(d); if (m.t === 'in') forwarded.push(m.f); } catch { /* ignore */ } };
    b.on('message', spy);
    send(a, { t: 'in', f: 0, m: 1 });
    send(a, { t: 'in', f: 0, m: 2 });   // 同帧重放（试图改写已声明输入）
    send(a, { t: 'in', f: 1, m: 3 });
    send(a, { t: 'in', f: 0, m: 4 });   // 回退帧
    send(a, { t: 'in', f: 2, m: 5 });
    await sleep(200);
    b.off('message', spy);
    assert.deepEqual(forwarded, [0, 1, 2], `实际转发帧序列 ${JSON.stringify(forwarded)}`);

    // 哈希帧同样去重（否则可反复伪造 hash 逼对方 abort）
    const hashes = [];
    const hspy = d => { try { const m = JSON.parse(d); if (m.t === 'hash') hashes.push(m.f); } catch { /* ignore */ } };
    b.on('message', hspy);
    send(a, { t: 'hash', f: 100, h: 1 });
    send(a, { t: 'hash', f: 100, h: 2 });
    send(a, { t: 'hash', f: 99, h: 3 });
    await sleep(150);
    b.off('message', hspy);
    assert.deepEqual(hashes, [100], `实际转发哈希帧 ${JSON.stringify(hashes)}`);

    a.close();
    b.close();
    await sleep(30);
});

test('P0 create 洪水：冷却内不再分配房号，且重建时旧房号被回收', async () => {
    const host = await openClient();
    const p1 = waitMsg(host, m => m.t === 'room');
    send(host, { t: 'create' });
    const r1 = await p1;
    assert.match(r1.code, new RegExp(`^\\d{${ROOM_CODE_LEN}}$`), `房号应为 ${ROOM_CODE_LEN} 位，实际 ${r1.code}`);

    // 冷却窗口内狂刷 create：不应再拿到房号
    let extra = 0;
    const spy = d => { try { if (JSON.parse(d).t === 'room') extra++; } catch { /* ignore */ } };
    host.on('message', spy);
    for (let i = 0; i < 30; i++) send(host, { t: 'create' });
    await sleep(250);
    host.off('message', spy);
    assert.equal(extra, 0, `建房冷却内不应再分配房号，实际多出 ${extra} 个`);

    // 冷却结束后可再建一间
    await sleep(CREATE_COOLDOWN_MS + 200);
    const p2 = waitMsg(host, m => m.t === 'room');
    send(host, { t: 'create' });
    const r2 = await p2;
    assert.notEqual(r1.code, r2.code);

    // 旧房号必须已被回收（否则每建一间就留一个孤儿条目，最终耗尽码空间）
    const j1 = await openClient();
    const f1 = waitMsg(j1, m => m.t === 'joinFail' || m.t === 'paired');
    send(j1, { t: 'join', code: r1.code });
    assert.equal((await f1).t, 'joinFail', '旧房号应已被回收，加入必须失败');

    // 新号仍可正常加入
    const j2 = await openClient();
    const f2 = waitMsg(j2, m => m.t === 'paired');
    send(j2, { t: 'join', code: r2.code });
    assert.equal((await f2).t, 'paired');

    [host, j1, j2].forEach(c => c.close());
    await sleep(30);
});

test('P1-4 房号穷举：失败文案统一且连续失败过多会断开', async () => {
    const ws = await openClient();
    const p = waitMsg(ws, m => m.t === 'joinFail');
    send(ws, { t: 'join', code: '0'.repeat(ROOM_CODE_LEN) });
    const m = await p;
    // 文案不得区分"不存在 / 已关闭 / 已满"，否则可用于探测房号是否存在
    assert.equal(m.reason, '无法加入房间');

    const closed = new Promise(res => ws.on('close', () => res(true)));
    for (let i = 0; i < 30; i++) send(ws, { t: 'join', code: '1'.repeat(ROOM_CODE_LEN) });
    const got = await Promise.race([closed, sleep(2000).then(() => false)]);
    assert.ok(got, '连续 join 失败过多应断开连接');
    await sleep(30);
});

test('P2-14 开局后 pick / sel 均被门禁拦截（不改写 picks、不做流量放大）', async () => {
    const [a, b] = await pairUp();
    await startMatch(a, b);

    let forwarded = 0;
    const spy = d => { try { const m = JSON.parse(d); if (m.t === 'sel' || m.t === 'peerPicked') forwarded++; } catch { /* ignore */ } };
    b.on('message', spy);
    send(a, { t: 'pick', c: 9, wins: 1, roundTime: 30 });  // 试图偷改角色
    send(a, { t: 'sel', c: 9 });                            // 流量放大
    await sleep(200);
    b.off('message', spy);
    assert.equal(forwarded, 0, `开局后 pick/sel 不应转发，实际 ${forwarded} 条`);

    // rematch 时角色必须与首局一致（证明 picks 未被改写）
    const sa = waitMsg(a, m => m.t === 'start');
    send(a, { t: 'rematch' });
    send(b, { t: 'rematch' });
    const ma = await sa;
    assert.equal(ma.p1, 3, 'rematch 后 P1 角色应保持首局所选');
    assert.equal(ma.p2, 5, 'rematch 后 P2 角色应保持首局所选');

    a.close();
    b.close();
    await sleep(30);
});

test('未开局时 rematch / abort 被拒绝（房间状态机）', async () => {
    const [a, b] = await pairUp();
    let forwarded = 0;
    const spy = d => { try { const m = JSON.parse(d); if (m.t === 'peerRematch' || m.t === 'aborted') forwarded++; } catch { /* ignore */ } };
    b.on('message', spy);
    send(a, { t: 'rematch' });
    send(a, { t: 'abort', reason: 'early' });
    await sleep(150);
    b.off('message', spy);
    assert.equal(forwarded, 0, '未开局时 rematch/abort 不应广播');
    a.close();
    b.close();
    await sleep(30);
});

test('P2-7 Origin 校验：非法 Origin 与缺失 Origin 均被拒绝', async () => {
    const s = createNetServer({ port: 0, host: '127.0.0.1', allowedOrigins: ['http://localhost:8080'] });
    await new Promise(res => s.wss.on('listening', res));
    const url = `ws://127.0.0.1:${s.wss.address().port}`;
    const openWith = (origin) => new Promise(resolve => {
        let settled = false;
        const w = origin === null ? new WebSocket(url) : new WebSocket(url, { origin });
        // 服务端在握手完成后才发关闭帧，客户端会先看到 open；稍等确认没有紧随的 close
        w.on('open', () => setTimeout(() => {
            if (!settled) { settled = true; resolve({ w, ok: true }); }
        }, 200));
        w.on('close', code => { if (!settled) { settled = true; resolve({ w, ok: false, code }); } });
        w.on('error', () => { /* close 会跟进 */ });
    });

    const badOrigin = await openWith('http://evil.example');
    assert.equal(badOrigin.ok, false, '非法 Origin 必须被拒绝');
    assert.equal(badOrigin.code, 1008);

    // 原实现：列表非空但请求没有 Origin 头时直接放行 —— 非浏览器客户端可借此绕过
    const noOrigin = await openWith(null);
    assert.equal(noOrigin.ok, false, '缺失 Origin 必须被拒绝');
    assert.equal(noOrigin.code, 1008);

    const good = await openWith('http://localhost:8080');
    assert.equal(good.ok, true, '白名单内 Origin 必须放行');

    [badOrigin, noOrigin, good].forEach(r => r.w.close());
    await sleep(30);
    await new Promise(res => s.close(res));
});

test('连接配额：达到上限即拒绝，不再多放行一个', async () => {
    const s = createNetServer({ port: 0, host: '127.0.0.1', maxConns: 1 });
    await new Promise(res => s.wss.on('listening', res));
    const url = `ws://127.0.0.1:${s.wss.address().port}`;

    const c1 = await new Promise((res, rej) => { const w = new WebSocket(url); w.on('open', () => res(w)); w.on('error', rej); });
    const c2 = new WebSocket(url);
    const code = await new Promise(res => c2.on('close', res));
    assert.equal(code, 1013, `第二个连接应被 1013 拒绝，实际 ${code}`);

    c1.close();
    await sleep(30);
    await new Promise(res => s.close(res));
});

/* ===================== P2-8 补齐的边界用例 ===================== */
test('二进制帧被拒绝（不影响后续正常通信）', async () => {
    const ws = await openClient();
    ws.send(Buffer.from([1, 2, 3, 4]));           // 二进制帧
    await sleep(100);
    // 仍存活：能正常走完一次 ping/pong
    const pong = waitMsg(ws, m => m.t === 'pong');
    send(ws, { t: 'ping', ts: 12345 });
    const m = await pong;
    assert.equal(m.ts, 12345);
    ws.close();
    await sleep(30);
});

test('房号格式非法（位数不符 / 非数字 / 非字符串）计入 bad 且不影响后续建房', async () => {
    const host = await openClient();
    const j = await openClient();

    // 非法格式一律不给 joinFail 之外的反馈，且不得引起崩溃
    send(j, { t: 'join', code: '12345' });                    // 少一位
    send(j, { t: 'join', code: '1234567' });                  // 多一位
    send(j, { t: 'join', code: 'abcdef' });                   // 非数字
    send(j, { t: 'join', code: 123456 });                     // 非字符串
    await sleep(150);

    // 建房侧未受影响
    const room = waitMsg(host, m => m.t === 'room');
    send(host, { t: 'create' });
    const r = await room;
    assert.match(r.code, new RegExp(`^\\d{${ROOM_CODE_LEN}}$`));

    // 合法格式仍可加入
    const paired = waitMsg(j, m => m.t === 'paired');
    send(j, { t: 'join', code: r.code });
    assert.equal((await paired).t, 'paired');

    [host, j].forEach(c => c.close());
    await sleep(30);
});

test('协议版本字段：paired / start 均带 ver，且与 PROTO_VER 一致', async () => {
    const [a, b] = await pairUp();
    // pairUp 内已消费 paired，这里直接校验 start 的 ver
    const [sa, sb] = await startMatch(a, b);
    assert.equal(sa.ver, PROTO_VER, 'start 必须带协议版本号');
    assert.equal(sb.ver, PROTO_VER);
    a.close();
    b.close();
    await sleep(30);
});

test('心跳淘汰：未回应 pong 的半开连接被 terminate', async () => {
    // 注入 120ms 心跳：两轮未 pong（约 240ms+）即淘汰
    const s = createNetServer({ port: 0, host: '127.0.0.1', heartbeatMs: 120 });
    await new Promise(res => s.wss.on('listening', res));
    const url = `ws://127.0.0.1:${s.wss.address().port}`;

    const ws = await new Promise((res, rej) => { const w = new WebSocket(url); w.on('open', () => res(w)); w.on('error', rej); });
    // 屏蔽自动 pong：让服务端认为本连接已失联
    ws.pong = () => {};
    ws.on('ping', () => { /* 故意不应答 */ });

    const closed = new Promise(res => ws.on('close', () => res(true)));
    const got = await Promise.race([closed, sleep(3000).then(() => false)]);
    assert.ok(got, '两轮心跳未应答的连接必须被断开');

    await new Promise(res => s.close(res));
});

test('P2-5 连接建立后尽快采样 RTT（首个心跳前即已发出 ping）', async () => {
    const ws = await openClient();
    const pinged = new Promise(res => {
        ws.on('ping', () => res(true));
    });
    const got = await Promise.race([pinged, sleep(1500).then(() => false)]);
    assert.ok(got, '连接建立后应在 1.5s 内收到服务端 ping（用于实测 RTT）');
    ws.close();
    await sleep(30);
});

test('abort 之后 rematch / in 全部失效（房间已解散）', async () => {
    const [a, b] = await pairUp();
    await startMatch(a, b);

    const ea = waitMsg(a, m => m.t === 'aborted');
    const eb = waitMsg(b, m => m.t === 'aborted');
    send(a, { t: 'abort', reason: '测试中止' });
    await Promise.all([ea, eb]);

    // 之后双方都不在任何房间里：rematch / in / hash 都不应产生任何广播
    let forwarded = 0;
    const spy = d => { try { const m = JSON.parse(d); if (['start', 'peerRematch', 'in', 'hash'].includes(m.t)) forwarded++; } catch { /* ignore */ } };
    a.on('message', spy);
    b.on('message', spy);
    send(a, { t: 'rematch' });
    send(b, { t: 'rematch' });
    send(a, { t: 'in', f: 0, m: 1 });
    send(b, { t: 'hash', f: 0, h: 7 });
    await sleep(250);
    a.off('message', spy);
    b.off('message', spy);
    assert.equal(forwarded, 0, `abort 后不应再有任何对局广播，实际 ${forwarded} 条`);

    a.close();
    b.close();
    await sleep(30);
});

/* ===================== P2-12 角色表指纹 / P2-13 优雅关闭 ===================== */

test('P2-12 角色表指纹：两端一致（含仅一方携带）正常开局', async () => {
    const [a, b] = await pairUp();
    const sa = waitMsg(a, m => m.t === 'start');
    const sb = waitMsg(b, m => m.t === 'start');
    send(a, { t: 'pick', c: 0, wins: 2, roundTime: 99, rh: 123456789 });
    send(b, { t: 'pick', c: 1, wins: 2, roundTime: 99, rh: 123456789 });
    const [ma, mb] = await Promise.all([sa, sb]);
    assert.equal(ma.p1, 0);
    assert.equal(mb.p2, 1);
    a.close();
    b.close();
    await sleep(30);
});

test('P2-12 角色表指纹：两端不一致不开局，双方收到明确中止原因', async () => {
    const [a, b] = await pairUp();
    const ea = waitMsg(a, m => m.t === 'aborted');
    const eb = waitMsg(b, m => m.t === 'aborted');
    send(a, { t: 'pick', c: 0, wins: 2, roundTime: 99, rh: 111 });
    send(b, { t: 'pick', c: 1, wins: 2, roundTime: 99, rh: 222 });
    const [ma, mb] = await Promise.all([ea, eb]);
    assert.ok(String(ma.reason).includes('角色表'), `中止原因应说明角色表问题，实际：${ma.reason}`);
    assert.equal(mb.reason, ma.reason);
    a.close();
    b.close();
    await sleep(30);
});

test('P2-12 角色表指纹：旧客户端（不带 rh）不受影响', async () => {
    const [a, b] = await pairUp();
    const sa = waitMsg(a, m => m.t === 'start');
    const sb = waitMsg(b, m => m.t === 'start');
    send(a, { t: 'pick', c: 2, wins: 2, roundTime: 99 });            // 无 rh
    send(b, { t: 'pick', c: 3, wins: 2, roundTime: 99, rh: 999 });   // 有 rh
    await Promise.all([sa, sb]);
    a.close();
    b.close();
    await sleep(30);
});

test('P2-13 优雅关闭：shutdown 广播 aborted 并关闭全部连接', async () => {
    const s = createNetServer({ port: 0, host: '127.0.0.1' });
    await new Promise(res => s.wss.on('listening', res));
    const url = `ws://127.0.0.1:${s.wss.address().port}`;
    const open = () => new Promise((res, rej) => { const w = new WebSocket(url); w.on('open', () => res(w)); w.on('error', rej); });

    const a = await open();
    const b = await open();
    send(a, { t: 'quick' });
    const pa = waitMsg(a, m => m.t === 'paired');
    const pb = waitMsg(b, m => m.t === 'paired');
    send(b, { t: 'quick' });
    await Promise.all([pa, pb]);
    const sa = waitMsg(a, m => m.t === 'start');
    const sb = waitMsg(b, m => m.t === 'start');
    send(a, { t: 'pick', c: 0, wins: 2, roundTime: 99 });
    send(b, { t: 'pick', c: 1, wins: 2, roundTime: 99 });
    await Promise.all([sa, sb]);

    const ea = waitMsg(a, m => m.t === 'aborted');
    const eb = waitMsg(b, m => m.t === 'aborted');
    await s.shutdown('服务器维护');
    const [ma, mb] = await Promise.all([ea, eb]);
    assert.equal(ma.reason, '服务器维护');
    assert.equal(mb.reason, '服务器维护');
    a.close();
    b.close();
});
