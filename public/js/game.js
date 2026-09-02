/* =====================================================================
   游戏主控：状态管理、场景切换、战斗更新、输入路由
   ===================================================================== */
import {
    VW,
    VH,
    GROUND,
    ROUND_TIME,
    ARCADE_STAGES,
    ROSTER,
    DIFFICULTY,
    STAGES,
    Settings,
    SET_C,
    KEYMAP,
    DEFAULT_KEYMAP,
    ACTION_ORDER,
    hasDomainUlt
} from './config.js';
import { BG } from './render/background.js';
import { Fighter } from './entities/fighter-core.js';
import './entities/fighter-combat.js?v=ai-duel-20260810'; // 扩展 Fighter 技能/必杀副作用
import { Input } from './input.js';
import { Net } from './net.js';
import { RNG, tickGameIntervals, clearAllGameIntervals } from './utils.js';
import { AudioSys, BGM } from './audio.js';
import { FX } from './fx.js';
import { MenuRenderer } from './render/menu.js?v=ai-duel-20260810';
import { FightRenderer } from './render/fight.js';

export const Game = {
    scene: 'title',
    fighters: [null, null],
    projs: [],
    delayed: [],
    allies: [],
    cutin: null,
    domain: null,
    domainClash: null,
    round: 1,
    wins: [0, 0],
    timer: ROUND_TIME * 60,
    timerActive: false,
    roundState: 'intro',
    roundStateT: 0,
    sel: { p1: 0, p2: 1, stage: 0 },
    mode: 'pvai',
    difficulty: 'normal',
    stageId: 'shibuya',
    stageCursor: 0,
    result: null,
    resultT: 0,
    versusT: 0,
    titleT: 0,
    slowmo: 0,
    /* 闯关模式状态 */
    arcade: null, // { opponents:[], stage:0, total:ARCADE_STAGES, playerChar:'' }
    /* 场景过渡状态 */
    transitionAlpha: 0,
    transitioning: false,
    transitionPhase: 'none',
    transitionTarget: null,
    transitionSpeed: 0.08,
    /* UI反馈 */
    uiFeedback: null, // {type: 'confirm'|'cancel', timer: 0}

    reset(p1id, p2id) {
        /* 逻辑种子：联机时用服务器下发的握手种子；单机支持 URL ?seed=数字 指定，否则取时间戳 */
        if (this.netSeed != null) {
            this.matchSeed = this.netSeed >>> 0;
        } else {
            const urlSeed = parseInt(new URLSearchParams(location.search).get('seed'), 10);
            this.matchSeed = Number.isFinite(urlSeed) ? (urlSeed >>> 0) : (Date.now() >>> 0);
        }
        RNG.seed(this.matchSeed);
        console.log('[RNG] 本场逻辑种子:', this.matchSeed);
        const ai1 = this.mode === 'aivsai';
        const ai2 = this.mode === 'pvai' || this.mode === 'arcade' || this.mode === 'aivsai';
        this.fighters = [new Fighter(p1id, 0, ai1), new Fighter(p2id, 1, ai2)];
        if (ai1) this.fighters[0].diff = DIFFICULTY[Settings.difficulty];
        if (ai2) this.fighters[1].diff = DIFFICULTY[Settings.difficulty];
        this.bgmTrack = this.pickFightBGM();
        BG.setStage(this.stageId);
        this.projs = [];
        this.delayed = [];
        clearAllGameIntervals();
        this.allies = [];
        this.cutin = null;
        this.domain = null;
        this.domainClash = null;
        FX.reset();
        this.round = 1;
        this.wins = [0, 0];
        this.pendingResult = null;
        this.startRound();
    },
    startRound() {
        const f = this.fighters;
        for (const p of f) {
            /* P1-5：交由 Fighter#resetRound() 全量归零（与构造共用同一份清单），
               原先逐字段重置漏掉了变身/禁术/冷却/无敌等，会造成跨回合状态残留 */
            p.resetRound();
            p.energy = Math.min(p.energy, 50);   // 能量跨回合继承是既有设计，钳到 50
        }
        this.projs = [];
        this.delayed = [];
        clearAllGameIntervals();
        this.allies = [];
        this.domain = null;
        this.domainClash = null;
        this.timer = Settings.roundTime === '∞' ? Infinity : Settings.roundTime * 60;
        this.timerActive = false;
        this.roundState = 'intro';
        this.roundStateT = 0;
        FX.reset();
    },

    /* ------ 领域对抗 ------ */
    startDomainClash(fa, fb) {
        // 双方均须具备领域展开能力（domain>0 且 ult 为领域展开）才能进入领域对冲
        if (!hasDomainUlt(fa.c) || !hasDomainUlt(fb.c)) return;
        // 拥有领域的角色领域强度从 1 开始，按键比拼决定胜负
        this.domainClash = { fa, fb, t: 0, dur: 600, da: 1, db: 1, clashValueA: 0, clashValueB: 0, winner: null, resolved: false };
        fa.setState('clashing');
        fb.setState('clashing');
        FX.addHitstop(30);
        AudioSys.play('ult');
    },
    resolveDomainClash() {
        const dc = this.domainClash;
        if (!dc || dc.resolved) return;
        dc.resolved = true;
        // 按键次数高者胜，平局时随机（种子随机，保证联机确定性）
        let w = dc.clashValueA > dc.clashValueB ? dc.fa : (dc.clashValueA < dc.clashValueB ? dc.fb : (RNG.chance(0.5) ? dc.fa : dc.fb));
        let l = w === dc.fa ? dc.fb : dc.fa;
        dc.winner = w;
        dc.loser = l;
        w.setState('idle');
        if (!l.dead) {
            l.setState('hurt');
            l.hurtLen = 70;
            l.skillDisabled = 600; // 10 秒术士禁用 debuff
            FX.text(l.x, l.cy - 90, '术式禁用 10s', '#ff5c5c', 26);
        }
        // 胜者释放自身领域效果（对冲双方必定都是领域展开角色）
        if (hasDomainUlt(w.c)) w.ultEffectDomainOnly(this);
        FX.flash(w.c.color, 0.5, 20);
        FX.text(VW / 2, 260, `${w.c.name} 领域压制！`, w.c.color, 40);
        this.domainClash = null;
    },
    endRound(winnerSide) {
        if (this.roundState !== 'fight') return;
        this.timerActive = false;
        if (winnerSide >= 0) this.wins[winnerSide]++;
        this.roundState = 'end';
        this.roundStateT = 0;
        this.pendingResult = (winnerSide >= 0 && this.wins[winnerSide] >= Settings.targetWins) ? winnerSide : null;
    },

    // 根据对战角色挑选战斗 BGM（真实歌曲与合成曲目混合曲池，避免与上一首重复）
    pickFightBGM() {
        const bossIds = new Set(['sukuna', 'sukunaMegumi', 'mahito', 'kenjaku', 'hanami', 'jogo', 'dagon']);
        const rawA = this.fighters[0] && this.fighters[0].c.id,
            rawB = this.fighters[1] && this.fighters[1].c.id;
        const a = this.fighters[0] && (this.fighters[0].c.base || this.fighters[0].c.id),
            b = this.fighters[1] && (this.fighters[1].c.base || this.fighters[1].c.id);
        // 宿命对决专属曲：觉醒五条悟 vs 受肉伏黑惠宿傩（双向）固定播 yuai
        if ((rawA === 'gojo2' && rawB === 'sukunaMegumi') || (rawA === 'sukunaMegumi' && rawB === 'gojo2')) return 'yuai';
        let pool = (bossIds.has(a) || bossIds.has(b))
            ? ['boss', 'specialz', 'aizo']
            : ['specialz', 'aizo', 'fight1', 'fight2'];
        // 去重：不重复上一首（含主界面刚放过的 SPECIALZ）
        const filtered = pool.filter(n => n !== BGM.lastSong);
        if (filtered.length) pool = filtered;
        /* P3-9：选曲由对局种子推导，而不是 Math.random。
           原实现两端各摇一次，联机时同一场对局会播不同的 BGM。matchSeed 由服务器
           统一下发（单机时为时间戳），对它取模即可保证两端选到同一首。
           刻意不调用 RNG：那会消耗共享的战斗随机序列，改动冷却/暴击等判定的推进节奏。 */
        const seed = this.matchSeed != null ? (this.matchSeed >>> 0) : (Date.now() >>> 0);
        return pool[seed % pool.length];
    },

    /* ------ 场景过渡 ------ */
    startTransition(targetScene) {
        if (this.transitioning) return;
        this.transitioning = true;
        this.transitionPhase = 'fadeOut';
        this.transitionTarget = targetScene;
        this.transitionAlpha = 0;
    },
    updateTransition() {
        if (!this.transitioning) return;
        if (this.transitionPhase === 'fadeOut') {
            this.transitionAlpha += this.transitionSpeed;
            if (this.transitionAlpha >= 1) {
                this.transitionAlpha = 1;
                this.scene = this.transitionTarget;
                this.transitionPhase = 'fadeIn';
            }
        } else if (this.transitionPhase === 'fadeIn') {
            this.transitionAlpha -= this.transitionSpeed;
            if (this.transitionAlpha <= 0) {
                this.transitionAlpha = 0;
                this.transitioning = false;
                this.transitionPhase = 'none';
                this.transitionTarget = null;
            }
        }
    },
    triggerFeedback(type) {
        this.uiFeedback = { type: type, timer: 0 };
    },

    update() {
        this.titleT++;
        /* P2-12：netNoticeT 与 uiFeedback.timer 原写在 draw() 里，页面隐藏不渲染时
           它们不衰减，回到前台才继续，表现为提示框/白闪突然残留数帧。移入 update() 随逻辑帧推进。 */
        if (this.netNoticeT > 0) this.netNoticeT--;
        if (this.uiFeedback) {
            this.uiFeedback.timer++;
            if (this.uiFeedback.timer >= 4) this.uiFeedback = null;
        }
        // 过渡期间冻结输入处理
        if (this.transitioning) {
            this.updateTransition();
            return;
        }
        // P 键已改为玩家1必杀技，暂停仅保留 Esc（联机时禁用暂停，避免两端失步）
        if (this.mode !== 'net' && (this.scene === 'fight' || this.scene === 'pause') && Input.press['Escape']) {
            if (this.scene === 'fight') {
                this.scene = 'pause';
                this.pauseIdx = 0;
                AudioSys.play('select');
            } else {
                this.scene = 'fight';
                AudioSys.play('confirm');
                BGM.restoreVol();
            }
        }
        if (this.scene === 'pause') { this.handlePause(); return; }
        FX.update();
        /* P1-7：顿帧期间不得结算受控计时器，否则五条悟领域、宿傩捌之六连斩这类
           多段技会在画面定格时继续掉血。原实现把 tickGameIntervals() 放在 hitstop
           判断之前。注意 FX.update() 会自减 hitstop，须先跑它再判断。 */
        if (FX.hitstop > 0 && this.scene === 'fight') { return; }
        // 帧驱动受控计时器（技能多段伤害/领域持续效果）：随逻辑帧推进，联机两端同帧触发
        tickGameIntervals();

        switch (this.scene) {
            case 'versus':
                this.versusT++;
                if (this.versusT > 150) { this.scene = 'fight'; }
                break;
            case 'fight':
                this.updateFight();
                break;
            case 'result':
                this.resultT++;
                BGM.stop();
                break;
            case 'arcadeTransition':
                this.arcadeTransT++;
                BGM.stop();
                break;
            case 'arcadeResult':
                BGM.stop();
                break;
        }

        // 场景化 BGM 切换
        if (!Settings.music) { if (BGM.playing) BGM.stop(); } else if (this.scene === 'title' || this.scene === 'help') BGM.playTrack('specialz');
        else if (this.scene === 'select' || this.scene === 'settings' || this.scene === 'stageSelect') BGM.playTrack('select');
        else if (this.scene === 'arcadeTransition' || this.scene === 'arcadeResult') { /* 闯关过渡/结算不播放BGM */ }
        else if (this.scene === 'versus') {
            // 用开局定好的 bgmTrack，避免每帧重新随机导致 BGM 反复重启
            const wanted = this.bgmTrack || (this.bgmTrack = this.pickFightBGM());
            if (!BGM.playing || BGM.current !== wanted) BGM.playTrack(wanted);
        } else if (this.scene === 'fight') BGM.playTrack(this.bgmTrack || this.pickFightBGM());
        else if (this.scene !== 'pause' && BGM.playing) BGM.stop();
    },

    handlePause() {
        const confirm = Input.press['KeyJ'] || Input.press['Enter'] || Input.press['Numpad1'];
        const up = Input.press['KeyW'] || Input.press['ArrowUp'];
        const down = Input.press['KeyS'] || Input.press['ArrowDown'];
        if (up) {
            this.pauseIdx = (this.pauseIdx + 1) % 2;
            AudioSys.play('select');
        }
        if (down) {
            this.pauseIdx = (this.pauseIdx + 1) % 2;
            AudioSys.play('select');
        }
        if (confirm) {
            AudioSys.play('confirm');
            if (this.pauseIdx === 0) { this.scene = 'fight'; } else {
                if (this.mode === 'arcade') {
                    this.arcade = null;
                    this.mode = 'pvai';
                    this.scene = 'title';
                } else {
                    this.scene = 'select';
                    this.sel.stage = 0;
                }
                BGM.stop();
            }
        }
        if (BGM.master) { if (this.scene === 'pause') BGM.master.gain.value = 0.06; else BGM.restoreVol(); }
    },

    updateFight() {
        const [a, b] = this.fighters;
        for (let i = this.delayed.length - 1; i >= 0; i--) {
            const d = this.delayed[i];
            d.t--;
            if (d.t <= 0) {
                d.fn();
                this.delayed.splice(i, 1);
            }
        }

        if (this.domainClash) {
            this.domainClash.t++;
            const dc = this.domainClash;
            // 对抗期间双方处于 clashing 状态，禁止移动/攻击/技能，仅接收攻击键输入
            const mapA = KEYMAP[this.fighters[0].side === 0 ? 'p1' : 'p2'];
            const mapB = KEYMAP[this.fighters[1].side === 0 ? 'p1' : 'p2'];
            if (Input.pressed(mapA, 'light') || Input.pressed(mapA, 'heavy')) {
                dc.clashValueA++;
                Input.consume(mapA, 'light');
                Input.consume(mapA, 'heavy');
            }
            if (Input.pressed(mapB, 'light') || Input.pressed(mapB, 'heavy')) {
                dc.clashValueB++;
                Input.consume(mapB, 'light');
                Input.consume(mapB, 'heavy');
            }
            // AI 自动按键：按难度名直接设定每秒次数（2 / 3.5 / 5.5）
            const aiClashP = (f) => {
                const name = f.diff.name;
                if (name === '简单') return 2 / 60;
                if (name === '普通') return 3.5 / 60;
                if (name === '困难') return 5.5 / 60;
                return 3.5 / 60;
            };
            if (this.fighters[0].isAI && RNG.chance(aiClashP(this.fighters[0]))) dc.clashValueA++;
            if (this.fighters[1].isAI && RNG.chance(aiClashP(this.fighters[1]))) dc.clashValueB++;
            if (dc.t >= dc.dur) this.resolveDomainClash();
            return; // 跳过正常战斗更新
        }
        if (this.domain) { this.domain.t++; if (this.domain.t >= this.domain.dur) this.domain = null; }
        if (this.cutin) { this.cutin.t++; if (this.cutin.t >= this.cutin.dur) this.cutin = null; }

        if (this.roundState === 'intro') {
            this.roundStateT++;
            if (this.roundStateT > 110) {
                this.roundState = 'fight';
                this.timerActive = true;
            }
            return;
        }
        if (this.roundState === 'end') {
            this.roundStateT++;
            a.update(this);
            b.update(this);
            if (this.pendingResult !== null && this.pendingResult !== undefined && this.roundStateT > 130) {
                this.result = this.pendingResult;
                this.pendingResult = null;
                this.scene = 'result';
                this.resultT = 0;
                this.resultIdx = 0;
                return;
            }
            if (this.roundStateT > 140 && this.pendingResult === null) {
                this.round++;
                this.startRound();
            }
            return;
        }

        if (this.timerActive && this.timer > 0 && this.timer !== Infinity) {
            this.timer--;
            if (this.timer === 0) {
                const w = a.hp === b.hp ? -1 : (a.hp > b.hp ? 0 : 1);
                this.endRound(w);
            }
        }
        a.update(this);
        b.update(this);
        for (let i = this.allies.length - 1; i >= 0; i--) {
            const al = this.allies[i];
            al.update(this);
            if (al.dead) this.allies.splice(i, 1);
        }
        for (let i = this.projs.length - 1; i >= 0; i--) {
            const p = this.projs[i];
            p.update(this);
            for (const al of this.allies) {
                // 召唤者发出的投射物也不能命中自己的魔虚罗；其他角色的投射物仍可正常击破它。
                if (!al.dead && al.owner !== p.owner && !p.hitSet.has(al) && Math.abs(al.x - p.x) < p.w / 2 + 40 && Math.abs(al.cy - p.y) < p.h / 2 + 70) {
                    p.hitSet.add(al);
                    if (p.onHit) p.onHit(al, this);
                    else al.takeHit(p.owner, { dmg: p.dmg || 12 });
                    if (p.consume !== false) p.dead = true;
                }
            }
            if (p.dead) this.projs.splice(i, 1);
        }
        if (a.dead && this.roundState === 'fight') this.endRound(1);
        else if (b.dead && this.roundState === 'fight') this.endRound(0);
    },

    /* ============ 绘制（调用独立渲染器） ============ */
    draw(ctx, t) {
        ctx.clearRect(0, 0, VW, VH);
        ctx.save();
        /* P1-8：原实现全程无异常保护，draw 内任一帧抛错，栈上的 zoom/shake 变换就
           得不到配对的 restore()，未还原的变换逐帧叠加，约 1 秒内画面漂移/缩放失控
           且不可恢复。用 finally 保证变换栈一定被还原，错误交由调用方熔断。 */
        try {
        const z = 1 + FX.zoom * 0.12;
        ctx.translate(VW / 2, VH / 2);
        ctx.scale(z, z);
        ctx.translate(-VW / 2, -VH / 2);
        ctx.translate(FX.shakeX, FX.shakeY);

        if (this.scene === 'title') MenuRenderer.drawTitle(this, ctx, t);
        else if (this.scene === 'netLobby') MenuRenderer.drawNetLobby(this, ctx, t);
        else if (this.scene === 'help') MenuRenderer.drawHelp(this, ctx, t);
        else if (this.scene === 'settings') MenuRenderer.drawSettings(this, ctx, t);
        else if (this.scene === 'select') {
            MenuRenderer.drawSelect(this, ctx, t);
            if (this.mode === 'net') MenuRenderer.drawNetSelectStatus(this, ctx, t);
        }
        else if (this.scene === 'stageSelect') MenuRenderer.drawStageSelect(this, ctx, t);
        else if (this.scene === 'versus') {
            FightRenderer.draw(this, ctx, t);
            MenuRenderer.drawVersus(this, ctx, t);
        } else if (this.scene === 'fight') FightRenderer.draw(this, ctx, t);
        else if (this.scene === 'pause') {
            FightRenderer.draw(this, ctx, t);
            MenuRenderer.drawPause(this, ctx, t);
        } else if (this.scene === 'result') {
            FightRenderer.draw(this, ctx, t);
            MenuRenderer.drawResult(this, ctx, t);
        } else if (this.scene === 'arcadeTransition') {
            MenuRenderer.drawArcadeTransition(this, ctx, t);
        } else if (this.scene === 'arcadeResult') {
            MenuRenderer.drawArcadeResult(this, ctx, t);
        }

        FX.drawFlashes(ctx);
        // 场景过渡遮罩
        if (this.transitionAlpha > 0) {
            ctx.save();
            ctx.fillStyle = 'rgba(5,6,13,' + this.transitionAlpha + ')';
            ctx.fillRect(0, 0, VW, VH);
            ctx.restore();
        }
        // 联机提示（对方离开/断线）——计时器衰减已移入 update()（P2-12）
        if (this.netNoticeT > 0) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.font = 'bold 20px sans-serif';
            ctx.fillStyle = 'rgba(255,120,120,' + Math.min(1, this.netNoticeT / 60).toFixed(2) + ')';
            ctx.fillText(this.netNotice, VW / 2, 84);
            ctx.restore();
        }
        // 联机延迟显示（右上角）
        if (this.mode === 'net' && Net.active && Net.rtt !== null &&
            (this.scene === 'fight' || this.scene === 'versus' || this.scene === 'result')) {
            ctx.save();
            ctx.textAlign = 'right';
            ctx.font = '12px sans-serif';
            ctx.fillStyle = Net.rtt < 80 ? 'rgba(140,230,140,0.75)' : (Net.rtt < 160 ? 'rgba(255,210,106,0.85)' : 'rgba(255,120,120,0.9)');
            ctx.fillText('延迟 ' + Net.rtt + ' ms' + (Net.desync ? ' · 失步!' : ''), VW - 10, 16);
            ctx.restore();
        }
        // 联机：帧锁卡等待提示（连续半秒收不到对端输入）
        if (this.mode === 'net' && Net.stall > 30 && Net.lockstepScene(this.scene)) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(VW / 2 - 190, VH / 2 - 26, 380, 52);
            ctx.font = 'bold 19px sans-serif';
            ctx.fillStyle = 'rgba(255,210,106,' + (0.7 + Math.sin(t * 0.008) * 0.3).toFixed(2) + ')';
            ctx.fillText('网络波动，等待对方数据…', VW / 2, VH / 2 + 7);
            ctx.restore();
        }
        // 联机：失步警告横幅（两端状态已不一致，建议重开）
        if (this.mode === 'net' && Net.desync &&
            (this.scene === 'fight' || this.scene === 'result')) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(120,20,20,0.75)';
            ctx.fillRect(0, 44, VW, 30);
            ctx.font = 'bold 16px sans-serif';
            ctx.fillStyle = '#ffd0d0';
            ctx.fillText('⚠ 检测到两端画面失步，本局结果可能不一致，建议结算后再战重开', VW / 2, 64);
            ctx.restore();
        }
        // UI反馈渲染——计时器衰减已移入 update()（P2-12）
        if (this.uiFeedback) {
            if (this.uiFeedback.type === 'confirm') {
                var fa = Math.max(0, 1 - this.uiFeedback.timer / 4);
                if (fa > 0) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(255,255,255,' + (fa * 0.18).toFixed(3) + ')';
                    ctx.fillRect(0, 0, VW, VH);
                    ctx.restore();
                }
            } else if (this.uiFeedback.type === 'cancel') {
                var shakeX = (this.uiFeedback.timer % 2 === 0) ? 3 : -3;
                var ca = Math.max(0, 1 - this.uiFeedback.timer / 4);
                if (ca > 0) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(255,60,60,' + (ca * 0.12).toFixed(3) + ')';
                    ctx.fillRect(shakeX, 0, VW, VH);
                    ctx.restore();
                }
            }
        }
        } catch (err) {
            this.drawErrors = (this.drawErrors || 0) + 1;
            if (this.drawErrors <= 3) console.error('[draw] 渲染异常（变换栈已还原）:', err);
            throw err;
        } finally {
            ctx.restore();
        }
    },

    /* ------ 场景输入 ------ */
    handleMenus() {
        const confirm = Input.press['KeyJ'] || Input.press['Enter'] || Input.press['Numpad1'];
        const back = Input.press['KeyK'] || Input.press['Escape'] || Input.press['Numpad2'];
        const up = Input.press['KeyW'] || Input.press['ArrowUp'];
        const down = Input.press['KeyS'] || Input.press['ArrowDown'];
        const left = Input.press['KeyA'] || Input.press['ArrowLeft'];
        const right = Input.press['KeyD'] || Input.press['ArrowRight'];

        if (this.scene === 'title') {
            if (this.menuIdx === undefined) this.menuIdx = 0;
            if (up) {
                this.menuIdx = (this.menuIdx + 6) % 7;
                AudioSys.play('select');
            }
            if (down) {
                this.menuIdx = (this.menuIdx + 1) % 7;
                AudioSys.play('select');
            }
            if (confirm) {
                AudioSys.play('confirm');
                if (this.menuIdx === 0) {
                    this.mode = 'pvai';
                    this.sel = { p1: 0, p2: 1, stage: 0 };
                    this.triggerFeedback('confirm');
                    this.startTransition('select');
                } else if (this.menuIdx === 1) {
                    this.mode = 'pvp';
                    this.sel = { p1: 0, p2: 1, stage: 0 };
                    this.triggerFeedback('confirm');
                    this.startTransition('select');
                } else if (this.menuIdx === 2) {
                    this.mode = 'arcade';
                    this.sel = { p1: 0, p2: 1, stage: 0 };
                    this.triggerFeedback('confirm');
                    this.startTransition('select');
                } else if (this.menuIdx === 3) {
                    /* AI对决：先后选择两个角色，由 AI 自动互相对战 */
                    this.mode = 'aivsai';
                    this.sel = { p1: 0, p2: 1, stage: 0 };
                    this.triggerFeedback('confirm');
                    this.startTransition('select');
                } else if (this.menuIdx === 4) {
                    /* 联机对战：连接服务器后进入大厅选择配对方式 */
                    this.mode = 'net';
                    this.sel = { p1: 0, p2: 1, stage: 0 };
                    this.netLobbyIdx = 0;
                    this.netLobbyStage = 'menu';
                    this.netCodeInput = '';
                    Net.connect();
                    this.triggerFeedback('confirm');
                    this.startTransition('netLobby');
                } else if (this.menuIdx === 5) {
                    this.triggerFeedback('confirm');
                    this.startTransition('help');
                } else {
                    this.scene = 'settings';
                    this.setTab = 0;
                    this.setCursor = 0;
                    this.keySide = 'p1';
                    this.triggerFeedback('confirm');
                }
            }
        } else if (this.scene === 'netLobby') {
            /* 联机大厅：连接后选配对方式；配对成功自动进入选人 */
            if (Net.status === 'paired') {
                this.sel = { p1: 0, p2: 1, stage: 0 };
                this.startTransition('select');
            } else if (Net.status === 'error') {
                if (confirm || back) {
                    Net.disconnect();
                    this.mode = 'pvai';
                    this.triggerFeedback('cancel');
                    this.startTransition('title');
                }
            } else if (Net.status === 'lobby' && this.netLobbyStage === 'input') {
                /* 房号输入：数字键录入 / 退格删除 / J 加入 / K 返回菜单 */
                for (let d = 0; d <= 9; d++) {
                    if ((Input.press['Digit' + d] || Input.press['Numpad' + d]) && this.netCodeInput.length < 4) {
                        this.netCodeInput += d;
                        AudioSys.play('select');
                    }
                }
                if (Input.press['Backspace'] && this.netCodeInput.length > 0) {
                    this.netCodeInput = this.netCodeInput.slice(0, -1);
                }
                /* 数字小键盘与 Numpad1/2 的确认/返回冲突，输入态只认 J/Enter/K/Esc */
                const confirmK = Input.press['KeyJ'] || Input.press['Enter'];
                const backK = Input.press['KeyK'] || Input.press['Escape'];
                if (confirmK && this.netCodeInput.length === 4) {
                    AudioSys.play('confirm');
                    Net.joinRoom(this.netCodeInput);
                }
                if (backK) {
                    this.netLobbyStage = 'menu';
                    this.netCodeInput = '';
                    Net.failMsg = '';
                    this.triggerFeedback('cancel');
                }
            } else if (Net.status === 'lobby') {
                /* 大厅菜单：快速匹配 / 创建房间 / 加入房间 */
                if (this.netLobbyIdx === undefined) this.netLobbyIdx = 0;
                if (up) { this.netLobbyIdx = (this.netLobbyIdx + 2) % 3; AudioSys.play('select'); }
                if (down) { this.netLobbyIdx = (this.netLobbyIdx + 1) % 3; AudioSys.play('select'); }
                if (confirm) {
                    AudioSys.play('confirm');
                    if (this.netLobbyIdx === 0) Net.quick();
                    else if (this.netLobbyIdx === 1) Net.create();
                    else { this.netLobbyStage = 'input'; this.netCodeInput = ''; Net.failMsg = ''; }
                }
                if (back) {
                    Net.disconnect();
                    this.mode = 'pvai';
                    this.triggerFeedback('cancel');
                    this.startTransition('title');
                }
            } else if (back) {
                /* connecting / waiting / hosting：Esc 取消联机回主菜单 */
                Net.disconnect();
                this.mode = 'pvai';
                this.triggerFeedback('cancel');
                this.startTransition('title');
            }
        } else if (this.scene === 'settings') { this.handleSettings(confirm, back, up, down, left, right); } else if (this.scene === 'help') { if (confirm || back) { this.triggerFeedback('cancel'); this.startTransition('title'); } } else if (this.scene === 'select') {
            if (this.mode === 'net') { this.handleNetSelect(confirm, back, up, down, left, right); return; }
            const key = this.sel.stage === 0 ? 'p1' : 'p2';
            const cols = ROSTER.length > 18 ? 7 : 6,
                n = ROSTER.length;
            let cur = this.sel[key];
            /* P2-9：边界判断原写成 `cur % n`（n=21），而每行是 cols=7 列：
               索引 7 按左会退到上一行末列、索引 13 按右会跳到下一行行首。
               stageSelect 分支用的是正确的 `cur % cols`，可确证为笔误。 */
            if (left) {
                cur = (cur % cols === 0) ? cur : cur - 1;
                AudioSys.play('select');
            }
            if (right) {
                cur = (cur % cols === cols - 1 || cur + 1 >= n) ? cur : cur + 1;
                AudioSys.play('select');
            }
            if (up) {
                cur = cur - cols >= 0 ? cur - cols : cur;
                AudioSys.play('select');
            }
            if (down) {
                if (cur + cols < n) cur = cur + cols;
                else if (cur < n - 1) cur = n - 1;
                AudioSys.play('select');
            }
            this.sel[key] = cur;
            if (back) {
                if (this.mode === 'arcade') {
                    this.triggerFeedback('cancel');
                    this.startTransition('title');
                } else if (this.sel.stage === 1) { this.sel.stage = 0; } else {
                    this.triggerFeedback('cancel');
                    this.startTransition('title');
                }
            }
            if (confirm) {
                AudioSys.play('confirm');
                if (this.mode === 'arcade') {
                    /* 闯关模式：只选P1角色，确认后直接开始闯关 */
                    this.startArcade(ROSTER[this.sel.p1]);
                } else if (this.sel.stage === 0) { this.sel.stage = 1; } else {
                    this.stageCursor = 0;
                    this.scene = 'stageSelect';
                }
            }
        } else if (this.scene === 'stageSelect') {
            if (this.stageCursor === undefined) this.stageCursor = 0;
            const cols = 4,
                total = STAGES.length + 1;
            let cur = this.stageCursor;
            if (left) {
                cur = cur % cols === 0 ? cur : cur - 1;
                AudioSys.play('select');
            }
            if (right) {
                cur = (cur % cols === cols - 1 || cur + 1 >= total) ? cur : cur + 1;
                AudioSys.play('select');
            }
            if (up) {
                cur = cur - cols >= 0 ? cur - cols : cur;
                AudioSys.play('select');
            }
            if (down) {
                if (cur + cols < total) cur = cur + cols;
                else if (cur < total - 1) cur = total - 1;
                AudioSys.play('select');
            }
            this.stageCursor = cur;
            if (back) {
                this.triggerFeedback('cancel');
                this.startTransition('select');
            }
            if (confirm) {
                AudioSys.play('confirm');
                if (this.stageCursor === STAGES.length) {
                    this.stageId = STAGES[RNG.irand(0, STAGES.length - 1)].id;
                } else {
                    this.stageId = STAGES[this.stageCursor].id;
                }
                this.reset(ROSTER[this.sel.p1], ROSTER[this.sel.p2]);
                this.scene = 'versus';
                this.versusT = 0;
            }
        } else if (this.scene === 'result') {
            /* 联机模式：再战一局（双方确认后同角色新种子重开）/ 返回主菜单 */
            if (this.mode === 'net') {
                if (this.resultT <= 60) return;
                if (this.netResultIdx === undefined) this.netResultIdx = 0;
                if (up || down) {
                    this.netResultIdx = (this.netResultIdx + 1) % 2;
                    AudioSys.play('select');
                }
                if (confirm) {
                    if (this.netResultIdx === 0) {
                        if (!Net.rematchLocal) {
                            AudioSys.play('confirm');
                            Net.requestRematch();
                        }
                    } else {
                        Net.disconnect();
                        this.mode = 'pvai';
                        this.triggerFeedback('confirm');
                        this.startTransition('title');
                    }
                }
                if (back) {
                    Net.disconnect();
                    this.mode = 'pvai';
                    this.triggerFeedback('cancel');
                    this.startTransition('title');
                }
                return;
            }
            /* 闯关模式下，战斗结果由闯关逻辑接管 */
            if (this.mode === 'arcade') {
                if (this.resultT > 60 && (confirm || back)) {
                    this.handleArcadeResult();
                }
                return;
            }
            if (this.resultIdx === undefined) this.resultIdx = 0;
            if (up) {
                this.resultIdx = (this.resultIdx + 2) % 3;
                AudioSys.play('select');
            }
            if (down) {
                this.resultIdx = (this.resultIdx + 1) % 3;
                AudioSys.play('select');
            }
            if (confirm) {
                AudioSys.play('confirm');
                if (this.resultIdx === 0) {
                    this.reset(ROSTER[this.sel.p1], ROSTER[this.sel.p2]);
                    this.scene = 'versus';
                    this.versusT = 0;
                } else if (this.resultIdx === 1) {
                    this.sel.stage = 0;
                    this.triggerFeedback('confirm');
                    this.startTransition('select');
                } else {
                    this.triggerFeedback('confirm');
                    this.startTransition('title');
                }
                this.resultIdx = 0;
            }
        } else if (this.scene === 'arcadeTransition') {
            /* 闯关过渡：等待自动进入下一关，或按确认加速 */
            if (this.arcadeTransT > 90 || confirm) {
                AudioSys.play('confirm');
                this.arcadeStartStage();
            }
        } else if (this.scene === 'arcadeResult') {
            /* 闯关结算：重新挑战 / 返回主菜单 */
            if (this.arcadeResultIdx === undefined) this.arcadeResultIdx = 0;
            if (up || down) {
                this.arcadeResultIdx = (this.arcadeResultIdx + 1) % 2;
                AudioSys.play('select');
            }
            if (confirm) {
                AudioSys.play('confirm');
                if (this.arcadeResultIdx === 0) {
                    /* 重新挑战 */
                    this.startArcade(this.arcade.playerChar);
                } else {
                    /* 返回主菜单 */
                    this.arcade = null;
                    this.mode = 'pvai';
                    this.triggerFeedback('confirm');
                    this.startTransition('title');
                }
            }
        }
    },

    handleSettings(confirm, back, up, down, left, right) {
        if (this.setTab === undefined) this.setTab = 0;
        if (this.setCursor === undefined) this.setCursor = 0;
        if (this.keySide === undefined) this.keySide = 'p1';

        const tabL = Input.press['KeyQ'];
        const tabR = Input.press['KeyE'];
        if (tabL) {
            this.setTab = (this.setTab + 4) % 5;
            this.setCursor = 0;
            AudioSys.play('select');
            return;
        }
        if (tabR) {
            this.setTab = (this.setTab + 1) % 5;
            this.setCursor = 0;
            AudioSys.play('select');
            return;
        }
        if (back) {
            if (Settings.rebind) { Settings.rebind = null; } else {
                BGM.stop();
                this.triggerFeedback('cancel');
                this.startTransition('title');
            }
            return;
        }

        const tab = this.setTab;
        if (tab === 0) {
            /* 难度设置：←→↑↓ 切换难度并立即生效，Enter 仅作确认音反馈
               P3-3：原实现改写只落在 Settings.diffIdx 上，要再按一次确认才写
               Settings.difficulty。中途按 Esc 返回的话，菜单高亮（menu.js 读 diffIdx）
               与实际生效的难度会永久不一致——界面显示"困难"，打起来却是"普通"。
               这里让两者在每次切换时就同步，confirm 分支保留以维持原有确认反馈。 */
            const DIFF_KEYS = ['easy', 'normal', 'hard'];
            if (left || up) {
                Settings.diffIdx = (Settings.diffIdx + 2) % 3;
                Settings.difficulty = DIFF_KEYS[Settings.diffIdx];
                AudioSys.play('select');
            } else if (right || down) {
                Settings.diffIdx = (Settings.diffIdx + 1) % 3;
                Settings.difficulty = DIFF_KEYS[Settings.diffIdx];
                AudioSys.play('select');
            } else if (confirm) {
                Settings.difficulty = DIFF_KEYS[Settings.diffIdx];
                AudioSys.play('confirm');
            }
        } else if (tab === 1) {
            /* 时间设置：←→ 切换时间，Enter 确认 */
            const opts = [30, 60, 99, 120, '∞'];
            let i = opts.indexOf(Settings.roundTime);
            if (i < 0) i = 2;
            if (left) {
                Settings.roundTime = opts[(i + opts.length - 1) % opts.length];
                AudioSys.play('select');
            } else if (right || confirm) {
                Settings.roundTime = opts[(i + 1) % opts.length];
                AudioSys.play('confirm');
            }
        } else if (tab === 2) {
            /* 回合设置：←→ 切换 BO1/BO3 */
            if (left || up) {
                Settings.roundMode = 1;
                Settings.targetWins = 1;
                AudioSys.play('select');
            } else if (right || down) {
                Settings.roundMode = 3;
                Settings.targetWins = 2;
                AudioSys.play('select');
            } else if (confirm) {
                AudioSys.play('confirm');
            }
        } else if (tab === 3) {
            /* 音频设置 */
            const total = 2;
            const cursor = this.setCursor;
            if (up) {
                this.setCursor = (this.setCursor + total - 1) % total;
                AudioSys.play('select');
            } else if (down) {
                this.setCursor = (this.setCursor + 1) % total;
                AudioSys.play('select');
            }
            if (cursor === SET_C.AUDIO_MUSIC) {
                if (left || right || confirm) {
                    Settings.music = !Settings.music;
                    BGM.setEnabled(Settings.music);
                    AudioSys.play('confirm');
                }
            } else if (cursor === SET_C.AUDIO_PREVIEW) {
                const previewTrigger = confirm || Input.press['Enter'] || Input.press['KeyJ'] || Input.press['Numpad1'] || left || right;
                if (previewTrigger) {
                    if (BGM.playing) { BGM.stop(); } else {
                        BGM.setEnabled(true);
                        BGM.start();
                    }
                    AudioSys.play('confirm');
                }
            }
        } else {
            /* 键位设置 */
            const total = ACTION_ORDER.length + 2;
            if (up && !Settings.rebind) {
                this.setCursor = (this.setCursor + total - 1) % total;
                AudioSys.play('select');
            } else if (down && !Settings.rebind) {
                this.setCursor = (this.setCursor + 1) % total;
                AudioSys.play('select');
            }
            if (this.setCursor === 0) {
                if (left || right || confirm) {
                    this.keySide = this.keySide === 'p1' ? 'p2' : 'p1';
                    AudioSys.play('select');
                }
            } else if (this.setCursor === ACTION_ORDER.length + 1) {
                if (confirm) {
                    KEYMAP[this.keySide] = JSON.parse(JSON.stringify(DEFAULT_KEYMAP[this.keySide]));
                    AudioSys.play('confirm');
                }
            } else {
                const act = ACTION_ORDER[this.setCursor - 1];
                if (confirm && !Settings.rebind) {
                    Settings.rebind = { side: this.keySide, action: act };
                    AudioSys.play('select');
                }
            }
        }
    },

    keyMapForSide(side) {
        return KEYMAP[side];
    },

    /* ============ 闯关模式 ============ */
    startArcade(playerChar) {
        /* 从 ROSTER 中排除玩家角色，无重复随机抽取 ARCADE_STAGES 个对手 */
        const pool = ROSTER.filter(id => id !== playerChar);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = RNG.irand(0, i);
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const opponents = pool.slice(0, ARCADE_STAGES);
        this.arcade = { opponents, stage: 0, total: ARCADE_STAGES, playerChar };
        this.mode = 'arcade';
        this.arcadeStartStage();
    },

    arcadeStartStage() {
        const arc = this.arcade;
        const p1 = arc.playerChar;
        const p2 = arc.opponents[arc.stage];
        /* 随机选取战斗场景（种子随机） */
        this.stageId = STAGES[RNG.irand(0, STAGES.length - 1)].id;
        this.reset(p1, p2);
        /* 闯关模式每关开始满血满能量、冷却重置 */
        this.fighters[0].energy = 100;
        this.fighters[0].cd = { skill1: 0, skill2: 0, skill3: 0 };
        this.scene = 'versus';
        this.versusT = 0;
    },

    handleArcadeResult() {
        /* 闯关模式下的战斗结果处理（在 result 场景中调用） */
        const arc = this.arcade;
        const playerWon = this.result === 0;
        if (playerWon) {
            arc.stage++;
            if (arc.stage >= arc.total) {
                /* 全部通关 */
                this.scene = 'arcadeResult';
                this.arcadeWin = true;
                this.arcadeResultIdx = 0;
            } else {
                /* 进入过渡画面 */
                this.scene = 'arcadeTransition';
                this.arcadeTransT = 0;
            }
        } else {
            /* 闯关失败 */
            this.scene = 'arcadeResult';
            this.arcadeWin = false;
            this.arcadeResultIdx = 0;
        }
    },

    /* ============ 联机（帧锁同步） ============ */
    /* 联机选人：只能移动/锁定己方光标，对方光标由网络同步 */
    handleNetSelect(confirm, back, up, down, left, right) {
        const key = Net.side === 0 ? 'p1' : 'p2';
        const cols = ROSTER.length > 18 ? 7 : 6,
            n = ROSTER.length;
        if (!Net.picked) {
            let cur = this.sel[key];
            /* P2-9：同上，联机选人网格的左右边界也应为 `cur % cols` */
            if (left) cur = (cur % cols === 0) ? cur : cur - 1;
            if (right) cur = (cur % cols === cols - 1 || cur + 1 >= n) ? cur : cur + 1;
            if (up) cur = cur - cols >= 0 ? cur - cols : cur;
            if (down) {
                if (cur + cols < n) cur = cur + cols;
                else if (cur < n - 1) cur = n - 1;
            }
            if (cur !== this.sel[key]) {
                this.sel[key] = cur;
                Net.sendCursor(cur);
                AudioSys.play('select');
            }
            if (confirm) {
                AudioSys.play('confirm');
                Net.sendPick(cur);
            }
        }
        if (back) {
            Net.disconnect();
            this.mode = 'pvai';
            this.triggerFeedback('cancel');
            this.startTransition('title');
        }
    },
    /* 联机事件（由 net.js 回调） */
    handleNetEvent(type, msg) {
        if (type === 'sel') {
            /* 对方光标同步（仅 UI 展示，防御非法索引） */
            const otherKey = Net.side === 0 ? 'p2' : 'p1';
            if (this.scene === 'select' && this.mode === 'net'
                && Number.isSafeInteger(msg.c) && msg.c >= 0 && msg.c < ROSTER.length) {
                this.sel[otherKey] = msg.c;
            }
        } else if (type === 'start') {
            /* 双方选定/再战确认：应用服务器握手的种子/角色/规则，场地由种子推导（两端一致）
               防御：角色索引/规则值必须合法，否则中止对局 */
            if (!Number.isSafeInteger(msg.p1) || !Number.isSafeInteger(msg.p2)
                || !ROSTER[msg.p1] || !ROSTER[msg.p2]) {
                this.netNotice = '服务器下发角色无效，对局中止';
                this.netNoticeT = 240;
                Net.abort('invalid-roster');
                Net.disconnect();
                this.mode = 'pvai';
                if (this.scene !== 'title') { this.scene = 'title'; this.transitionAlpha = 0; this.transitioning = false; }
                return;
            }
            this.sel.p1 = msg.p1;
            this.sel.p2 = msg.p2;
            Settings.targetWins = (msg.wins === 1 || msg.wins === 2) ? msg.wins : 2;
            Settings.roundTime = [30, 60, 99, 120].includes(msg.roundTime) ? msg.roundTime : 99;
            this.stageId = STAGES[msg.seed % STAGES.length].id;
            this.netSeed = (msg.seed >>> 0);
            this.reset(ROSTER[msg.p1], ROSTER[msg.p2]);
            this.netSeed = null;
            this.netResultIdx = 0;
            this.scene = 'versus';
            this.versusT = 0;
            /* P1-9：paired→select 有约 26 帧过渡，若对端抢先选人，start 会在过渡期间到达。
               原实现只改 scene，不清过渡状态，updateTransition 在 fadeOut 完成时又把场景
               改回 transitionTarget（select），已 reset() 的对局作废并卡在选人界面。
               aborted / peerLeft 分支早就清了，start 分支漏了。 */
            this.transitioning = false;
            this.transitionAlpha = 0;
            this.transitionPhase = 'none';
            this.transitionTarget = null;
        } else if (type === 'aborted') {
            if (this.mode !== 'net') return;
            Net.disconnect();
            this.mode = 'pvai';
            this.netNotice = msg && msg.reason ? '对局中止：' + msg.reason : '对局已中止，已返回主菜单';
            this.netNoticeT = 240;
            if (this.scene !== 'title') { this.scene = 'title'; this.transitionAlpha = 0; this.transitioning = false; }
        } else if (type === 'peerLeft' || type === 'closed') {
            if (this.mode !== 'net') return;
            Net.disconnect();
            this.mode = 'pvai';
            this.netNotice = type === 'peerLeft' ? '对方已离开，已返回主菜单' : '连接断开，已返回主菜单';
            this.netNoticeT = 240;
            if (this.scene !== 'title') { this.scene = 'title'; this.transitionAlpha = 0; this.transitioning = false; }
        }
    }
};

/* 联机事件回调注册 */
Net.onEvent = (type, msg) => Game.handleNetEvent(type, msg);
