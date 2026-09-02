/* =====================================================================
   Fighter 战斗技能：skillFrame、ultEffect、ultEffectDomainOnly
   ===================================================================== */
import { Fighter } from './fighter-core.js';
import { Projectile } from './projectile.js';
// 视觉版本号：避免浏览器继续复用旧的魔虚罗模块缓存
import { Mahoraga } from './mahoraga.js?v=ai-duel-20260810';
import { Agito } from './agito.js';
import { TransfiguredHuman } from './transfigured-human.js';
import { VW, GROUND, hasDomainUlt, BLACK_FLASH, KEYMAP } from '../config.js';
import { Input } from '../input.js';
import { rand, irand, gameInterval, clearGameInterval } from '../utils.js';
import { FX } from '../fx.js';
import { AudioSys } from '../audio.js';

/* 五条悟：咒力收束粒子——从四周向指定点汇聚（无下限收束演出） */
function gatherFX(x, y, color, n, r0, life) {
    for (let i = 0; i < n; i++) {
        const a = rand(0, Math.PI * 2),
            r = rand(r0 * 0.45, r0);
        const px = x + Math.cos(a) * r,
            py = y + Math.sin(a) * r;
        const sp = r / (25 * (1 - Math.pow(0.96, life)));
        FX.parts.push({
            x: px,
            y: py,
            vx: (x - px) / r * sp,
            vy: (y - py) / r * sp,
            life: rand(life * 0.7, life),
            maxLife: life,
            color,
            size: rand(1.5, 3.5),
            grav: 0
        });
    }
}

/* gojo2 组合技：悬停苍核 × 赫核相撞 → 无限制·茈
   先凝聚成一颗巨大紫球（同普通茈外观、放大数倍），约八十帧后轰然爆开；
   爆炸无视距离：双方均受固定114伤害，释放者享50%减伤（57） */
function gojo2Mugen(owner, game, ex, ey) {
    AudioSys.play('ult');
    FX.flash('#d8c8ff', 0.4, 12);
    FX.addShake(12);
    FX.addHitstop(6);
    FX.ring(ex, ey, '#7fd4ff', 140, 8);
    FX.ring(ex, ey, '#ff6a4a', 140, 8);
    FX.text(ex, ey - 150, '无限制 · 茈', '#e8d8ff', 44);
    game.projs.push(new Projectile({
        owner,
        x: ex,
        y: Math.min(ey, 430),
        vx: 0,
        vy: 0,
        w: 0,
        h: 0, /* 凝聚阶段不判定命中，伤害统一在爆炸时结算 */
        life: 78,
        anim: 0,
        color: '#c8a8ff',
        type: 'murasaki',
        scale: 0.5,
        consume: false,
        onHit() {},
        update2(game2) {
            /* 膨胀为巨大紫球（最终约普通茈的3.2倍） */
            this.scale = Math.min(3.2, this.scale + 0.055);
            gatherFX(this.x, this.y, '#c8a8ff', 4, 200 + this.scale * 60, 14);
            if (this.anim % 7 === 0) FX.ring(this.x, this.y, '#b89aff', 80 * this.scale, 4);
            if (this.anim % 9 === 0) FX.burst(this.x, this.y, '#d8c8ff', 4, 5, 20, 4);
            if (this.anim % 10 === 0) FX.addShake(4);
            if (this.life <= 0) {
                /* 爆开：全屏湮灭 */
                AudioSys.play('mugen');
                FX.flash('#ffffff', 0.9, 12);
                FX.flash('#d8c8ff', 0.55, 30);
                FX.addShake(26);
                FX.addHitstop(10);
                FX.addZoom(0.12, this.x, this.y);
                FX.pillar(this.x, '#e0d0ff', 160, 720);
                FX.crack(this.x, this.y, '#e8d8ff', 8, 260);
                for (let i = 0; i < 8; i++) FX.ring(this.x, this.y, i % 3 === 0 ? '#b89aff' : (i % 3 === 1 ? '#7fd4ff' : '#ff6a4a'), 200 + i * 110, 12 - i);
                FX.burst(this.x, this.y, '#d8c8ff', 50, 15, 44, 6);
                FX.burst(this.x, this.y, '#7fd4ff', 24, 12, 34, 5);
                FX.burst(this.x, this.y, '#ff6a4a', 24, 12, 34, 5);
                /* 无视距离：双方均受固定伤害，释放者 50% 减伤 */
                for (const f of game2.fighters) {
                    if (!f || f.dead || !f.hittable()) continue;
                    let dmg = 114;
                    if (f === owner) dmg = Math.round(dmg * 0.5);
                    const from = f === owner ? (owner.foe || owner) : owner;
                    f.takeHit(from, { dmg, stun: 46, kb: 18, launch: 12, shake: 16, hitstop: 10, spark: '#d8c8ff', sound: 'hit3', unblockable: true });
                }
                for (const al of game2.allies) {
                    if (!al.dead) al.takeHit(owner, { dmg: 114, stun: 46, kb: 18, launch: 12, shake: 16, hitstop: 10, spark: '#d8c8ff', sound: 'hit3' });
                }
            }
        }
    }));
}

Fighter.prototype.skillFrame = function(game) {
    const id = this.c.base || this.c.id,
        k = this.skillKind,
        // 必杀连放使用独立局部时间轴；普通技能仍然使用 this.st。
        t = this.ultSequenceActive ? this.ultSequenceLocal : this.st;
    const S1 = t === this.castAt;
    if (id === 'gojo') {
        const hx = this.x + this.facing * 55,
            hy = this.cy - 15;
        /* ---- gojo2（新宿决战）三技能通用蓄力：释放帧前按住技能键蓄力（苍/赫75帧=1.25秒，茈90帧=1.5秒），
           特效随蓄力增大；苍/赫蓄满后按↑上抛咒力核（苍核空中悬停20秒），赫蓄满不按↑则向前射出，
           上抛/前射的赫核都会被悬停苍核吸引，相撞触发组合技"无限制·茈" ---- */
        if (this.c.id === 'gojo2') {
            const chMax = k === 'skill3' ? 90 : 75;
            if (t === 1) {
                this.charge = 0;
                this.chargeT = 0;
                this.chargeMax = chMax;
                this.chargeDone = false;
                this.chargeThrow = false;
            }
            if (t === this.castAt - 1 && !this.chargeDone) {
                const map = KEYMAP[this.side === 0 ? 'p1' : 'p2'];
                if (!this.isAI && Input.held(map, k) && this.chargeT < chMax * 2) {
                    this.chargeT++;
                    this.charge = Math.min(chMax, this.chargeT);
                    this.st--; /* 冻结在释放前一帧，持续蓄力 */
                    const chC = k === 'skill1' ? '#7fd4ff' : (k === 'skill2' ? '#ff6a4a' : '#b89aff');
                    const cp = this.charge / chMax;
                    if (this.chargeT % 3 === 0) gatherFX(hx, hy, chC, 2 + Math.round(cp * 3), 90 + cp * 70, 14);
                    if (this.chargeT % 18 === 0) FX.ring(hx, hy, chC, 40 + cp * 60, 3);
                    if (this.chargeT === chMax) {
                        AudioSys.play('ult');
                        FX.ring(hx, hy, '#ffffff', 96, 6);
                        FX.flash(chC, 0.16, 8);
                        FX.text(this.x, this.cy - 148, '蓄力完成', chC, 24);
                        if (k === 'skill1') FX.text(this.x, this.cy - 120, '↑ 可上抛', '#ffffff', 16);
                        if (k === 'skill2') FX.text(this.x, this.cy - 120, '↑上抛 / 松开射出', '#ffffff', 16);
                    }
                    if (this.charge >= chMax && k !== 'skill3' && Input.pressed(map, 'jump')) {
                        Input.consume(map, 'jump');
                        this.chargeThrow = true;
                        this.chargeDone = true;
                        this.st++; /* 解除冻结，下一帧进入释放帧 */
                    }
                    return;
                }
                this.chargeDone = true;
            }
        }
        const chP = this.c.id === 'gojo2' ? Math.min(1, (this.charge || 0) / (this.chargeMax || 90)) : 0;
        /* ---- 术式顺转 · 苍：蓄力收束 → 引力核弹道（引力场持续拉拽） ---- */
        if (k === 'skill1') {
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(hx, hy, t % 4 === 0 ? '#7fd4ff' : '#d8f2ff', 3, 90, 16);
                if (t === 8 || t === 16) FX.ring(hx, hy, '#59c8ff', 44, 3);
                if (t === this.castAt - 4) FX.ring(hx, hy, '#bfe8ff', 60, 5);
            }
            if (S1) {
                AudioSys.play('beam');
                if (this.chargeThrow) {
                    /* 蓄满上抛：引力核升空后悬停20秒，期间持续引力场，等待赫核相撞 */
                    game.projs.push(new Projectile({
                        owner: this,
                        x: hx,
                        y: hy - 10,
                        vx: this.facing * 1.2,
                        vy: -15,
                        w: 70,
                        h: 70,
                        life: 160,
                        anim: 0,
                        color: '#7fd4ff',
                        type: 'ao',
                        scale: 1.35,
                        aoHover: true,
                        consume: false,
                        update2(game2) {
                            /* 升空减速 → 高空定点悬停 */
                            if (!this.hovering) {
                                this.vy *= 0.94;
                                this.vx *= 0.95;
                                if (this.vy > -0.25) {
                                    this.hovering = true;
                                    this.vx = 0;
                                    this.vy = 0;
                                    this.life = 1200; /* 悬停20秒 */
                                    FX.ring(this.x, this.y, '#bfe8ff', 80, 4);
                                }
                            } else {
                                this.y += Math.sin(this.anim * 0.12) * 0.35;
                            }
                            gatherFX(this.x, this.y, '#9fe0ff', 2, 130, 12);
                            const tg2 = this.owner.foe;
                            if (tg2 && tg2.hittable() && !this.hitSet.has(tg2)) {
                                const dx = this.x - tg2.x;
                                if (Math.abs(dx) < 260 && Math.abs(tg2.cy - this.y) < 360) {
                                    tg2.x += Math.sign(dx) * Math.min(2.6, Math.abs(dx) * 0.025);
                                }
                            }
                        },
                        onHit: (tg) => {
                            tg.takeHit(this, { dmg: 16, stun: 24, kb: 2, shake: 6, hitstop: 6, spark: '#7fd4ff', sound: 'hit2' });
                            FX.ring(tg.x, tg.cy, '#7fd4ff', 100, 5);
                        }
                    }));
                    FX.ring(hx, hy, '#7fd4ff', 90, 6);
                    FX.text(this.x, this.cy - 130, '苍 · 上抛', '#7fd4ff', 30);
                } else {
                game.projs.push(new Projectile({
                    owner: this,
                    x: hx + this.facing * 15,
                    y: hy,
                    vx: this.facing * 9.5,
                    w: 70 * (1 + 0.4 * chP),
                    h: 70 * (1 + 0.4 * chP),
                    life: 60,
                    anim: 0,
                    color: '#7fd4ff',
                    type: 'ao',
                    scale: 1 + 0.45 * chP,
                    update2(game2) {
                        /* 负无穷引力场：持续吸拽范围内的对手与咒力粒子 */
                        gatherFX(this.x, this.y, '#9fe0ff', 2, 110, 12);
                        const tg2 = this.owner.foe;
                        if (tg2 && tg2.hittable() && !this.hitSet.has(tg2)) {
                            const dx = this.x - tg2.x;
                            if (Math.abs(dx) < 240 && Math.abs(tg2.cy - this.y) < 150) {
                                tg2.x += Math.sign(dx) * Math.min(3.2, Math.abs(dx) * 0.03);
                            }
                        }
                    },
                    onHit: (tg) => {
                        tg.takeHit(this, { dmg: 20 + Math.round(12 * chP), stun: 30, kb: 2, shake: 7, hitstop: 8, spark: '#7fd4ff', sound: 'hit2' });
                        tg.x = Math.max(70, Math.min(VW - 70, this.x + this.facing * 120));
                        tg.vx = -this.facing * 2;
                        FX.ring(tg.x, tg.cy, '#7fd4ff', 110, 6);
                        gatherFX(tg.x, tg.cy, '#bfe8ff', 14, 120, 14);
                        FX.text(tg.x, tg.cy - 90, '引力牵引', '#7fd4ff', 22);
                    }
                }));
                FX.ring(hx, hy, '#7fd4ff', 80 + chP * 40, 6);
                FX.burst(hx, hy, '#d8f2ff', 10, 5, 20, 3);
                FX.text(this.x, this.cy - 130, '苍', '#7fd4ff', 32);
                }
            }
        }
        /* ---- 术式反转 · 赫：反转咒力蓄爆 → 正无穷斥力轰飞 ---- */
        if (k === 'skill2') {
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(hx, hy, t % 4 === 0 ? '#ff6a4a' : '#ffd2c0', 3, 95, 15);
                if (t === 10 || t === 20) FX.ring(hx, hy, '#ff8a5c', 46, 3);
                if (t === this.castAt - 6) { FX.ring(hx, hy, '#ffe0d0', 64, 5);
                    FX.addShake(3); }
            }
            if (S1) {
                if (this.chargeThrow || chP >= 1) {
                    /* 蓄满发射：按↑上抛 / 直接释放则向前射出；赫核会被悬停苍核引力吸引，相撞触发无限制·茈 */
                    AudioSys.play('beam');
                    FX.addShake(6);
                    const self = this;
                    const up = !!this.chargeThrow;
                    game.projs.push(new Projectile({
                        owner: this,
                        x: up ? hx : hx + this.facing * 15,
                        y: hy - 10,
                        vx: up ? this.facing * 1.2 : this.facing * 11,
                        vy: up ? -10 : -0.4,
                        w: 60,
                        h: 60,
                        life: up ? 150 : 90,
                        anim: 0,
                        color: '#ff6a4a',
                        type: 'aka',
                        consume: up ? false : true,
                        update2(game2) {
                            FX.burst(this.x, this.y + 16, '#ff8a5c', 1, 2, 12, 3);
                            /* 寻的：被悬停苍核的引力吸引（上抛/前射均可组合） */
                            const ao = game2.projs.find(q => !q.dead && q.aoHover && q.owner === self);
                            if (ao) {
                                /* 有苍核时：赫核被引力吸引转向，但仍可被对手拦截 */
                                this.life = Math.max(this.life, 150); /* 延长寿命确保到达 */
                                const dx = ao.x - this.x,
                                    dy = ao.y - this.y,
                                    d = Math.hypot(dx, dy) || 1;
                                this.vx += dx / d * 0.9;
                                this.vy += dy / d * 0.9;
                                const sp = Math.hypot(this.vx, this.vy);
                                if (sp > 13) { this.vx *= 13 / sp; this.vy *= 13 / sp; }
                                if (d < 60) {
                                    /* 苍×赫相撞：湮灭 → 无限制·茈 */
                                    this.dead = true;
                                    ao.dead = true;
                                    gojo2Mugen(self, game2, (this.x + ao.x) / 2, (this.y + ao.y) / 2);
                                }
                            } else if (up && this.vy < 0) {
                                this.vy *= 0.94; /* 无苍核时升空减速后自然坠落 */
                                if (this.vy > -0.3) this.gravP = 0.35;
                            }
                        },
                        onHit: (tg) => {
                            tg.takeHit(this, { dmg: up ? 22 : 42, stun: up ? 26 : 32, kb: up ? 12 : 20, launch: up ? 6 : 9, shake: up ? 9 : 12, hitstop: 8, spark: '#ff8a5c', sound: 'hit3' });
                            FX.ring(tg.x, tg.cy, '#ff6a4a', 110, 6);
                            FX.burst(tg.x, tg.cy, '#ff8a5c', 16, 9, 26, 4);
                            FX.text(tg.x, tg.cy - 100, '斥力爆发', '#ff8a5c', 26);
                        }
                    }));
                    FX.ring(hx, hy, '#ff6a4a', 90, 6);
                    FX.text(this.x, this.cy - 130, up ? '赫 · 上抛' : '赫 · 射出', '#ff5c3a', 30);
                } else {
                FX.flash('#ffb4a0', 0.32, 10);
                FX.addShake(11 + chP * 5);
                FX.addZoom(0.06, this.x + this.facing * 120, this.cy);
                AudioSys.play('slam');
                for (let i = 0; i < 3; i++) FX.ring(this.x + this.facing * (60 + i * 60), this.cy, i % 2 ? '#ffd2c0' : '#ff6a4a', (150 + i * 60) * (1 + 0.4 * chP), 9 - i * 2);
                FX.burst(this.x + this.facing * 70, this.cy, '#ff8a5c', 26, 12, 34, 5);
                FX.burst(this.x + this.facing * 70, this.cy, '#ffe8e0', 14, 15, 26, 4);
                this.vx = -this.facing * 3.5; /* 斥力反冲（不改判定，仅演出位移） */
                const tg = this.foe;
                if (tg && tg.hittable() && Math.abs(tg.x - this.x) < 300 + 80 * chP && Math.abs(tg.cy - this.cy) < 130 && (tg.x - this.x) * this.facing > -20) {
                    tg.takeHit(this, { dmg: 38 + Math.round(16 * chP), stun: 34, kb: 20 + 8 * chP, launch: 10, shake: 13, hitstop: 12, spark: '#ff8a5c', sound: 'hit3' });
                    FX.text(tg.x, tg.cy - 100, '斥力爆发', '#ff8a5c', 26);
                }
                FX.text(this.x, this.cy - 130, '赫', '#ff5c3a', 36);
                }
            }
        }
        /* ---- 虚式 · 茈：苍×赫双核汇聚 → 假想质量湮灭波 ---- */
        if (k === 'skill3') {
            if (t < this.castAt) {
                const bx = hx + this.facing * 16,
                    rx = hx - this.facing * 16;
                if (t % 2 === 0) {
                    gatherFX(bx, hy - 6, '#7fd4ff', 2, 80, 14);
                    gatherFX(rx, hy + 6, '#ff6a4a', 2, 80, 14);
                }
                if (t === 12) { FX.ring(bx, hy - 6, '#7fd4ff', 40, 3);
                    FX.ring(rx, hy + 6, '#ff6a4a', 40, 3); }
                if (t === 22) { FX.ring(hx, hy, '#e8d8ff', 56, 5);
                    FX.addShake(4); }
                if (t === this.castAt - 3) FX.flash('#f0e8ff', 0.25, 6);
            }
            if (S1) {
                FX.flash('#c8b8ff', 0.45, 14);
                FX.addShake(14 + chP * 6);
                FX.addZoom(0.08, this.x + this.facing * 160, this.cy - 10);
                AudioSys.play('beam');
                const pj = new Projectile({
                    owner: this,
                    x: this.x + this.facing * 80,
                    y: this.cy - 10,
                    vx: this.facing * 16,
                    w: 150 * (1 + 0.35 * chP),
                    h: 110 * (1 + 0.35 * chP),
                    life: 60,
                    anim: 0,
                    color: '#b89aff',
                    type: 'murasaki',
                    consume: false,
                    dmg: 12 + Math.round(8 * chP),
                    scale: 1 + 0.4 * chP,
                    update2() {
                        /* 湮灭尾迹：红蓝残粒子 + 紫色核心辉光 */
                        FX.burst(this.x - this.facing() * 40, this.y + rand(-30, 30), '#7fd4ff', 1, 2, 14, 3);
                        FX.burst(this.x - this.facing() * 40, this.y + rand(-30, 30), '#ff6a4a', 1, 2, 14, 3);
                        FX.burst(this.x, this.y, '#d8c8ff', 2, 3, 12, 4);
                        if (this.anim % 8 === 0) FX.ring(this.x, this.y, '#b89aff', 90, 4);
                    },
                    /* 仅命中敌方本体（owner.foe）才触发：直击 + 延迟起爆二段伤害；小怪/抛射物不会引爆 */
                    onHit: (tg, game) => {
                        /* 第一段：弹体直击，短硬直锁住对手 */
                        tg.takeHit(this, { dmg: 14 + Math.round(8 * chP), stun: 34, kb: 3, shake: 8, hitstop: 8, spark: '#d8c8ff', sound: 'hit2' });
                        /* 命中真人后弹体止于此处，开始湮灭起爆 */
                        pj.dead = true;
                        const ex = tg.x, ey = tg.cy - 10;
                        FX.ring(ex, ey, '#e8d8ff', 70, 4);
                        FX.burst(ex, ey, '#b89aff', 10, 5, 18, 4);
                        game.delayed.push({
                            t: 8,
                            fn: () => {
                                /* 第二段：假想质量湮灭爆炸（以命中点为中心） */
                                AudioSys.play('slam');
                                FX.flash('#f0e8ff', 0.35, 10);
                                FX.addShake(16);
                                FX.addZoom(0.09, ex, ey);
                                FX.pillar(ex, '#c8b8ff', 70, 320);
                                for (let i = 0; i < 3; i++) FX.ring(ex, ey, i === 1 ? '#ff6a4a' : (i === 2 ? '#7fd4ff' : '#b89aff'), 130 + i * 40, 6);
                                FX.burst(ex, ey, '#d8c8ff', 26, 9, 30, 5);
                                FX.burst(ex, ey, '#ff6a4a', 12, 7, 24, 4);
                                FX.burst(ex, ey, '#7fd4ff', 12, 7, 24, 4);
                                FX.text(ex, ey - 90, '湮灭', '#e8d8ff', 30);
                                if (!tg.dead && tg.hittable()) {
                                    tg.takeHit(this, { dmg: 24 + Math.round(14 * chP), stun: 30, kb: 16, launch: 9, shake: 14, hitstop: 12, spark: '#b89aff', sound: 'hit3' });
                                }
                                /* 爆炸波及近身小怪（仅附带波及，不是引爆条件） */
                                for (const al of game.allies) {
                                    if (!al.dead && al.owner !== this && al.side !== this.side && Math.abs(al.x - ex) < 140 && Math.abs(al.cy - ey) < 130) al.takeHit(this, { dmg: 18 });
                                }
                            }
                        });
                    }
                });
                game.projs.push(pj);
                FX.text(this.x, this.cy - 140, '虚式 · 茈', '#b89aff', 36);
                for (let i = 0; i < 4; i++) FX.ring(this.x + this.facing * (40 + i * 30), this.cy - 10, i % 2 ? '#ff6a4a' : '#7fd4ff', 90, 5);
                FX.pillar(this.x + this.facing * 80, '#c8b8ff', 60, 300);
            }
        }
    }
    if (id === 'megumi') {
        /* ---- 玉犬：影池凝聚 → 白犬先行、黑犬随后交错扑咬 ---- */
        if (k === 'skill1') {
            const px = this.x + this.facing * 42;
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(px, GROUND - 14, t % 4 === 0 ? '#8f7bff' : '#3a3050', 3, 90, 14);
                if (t === 6 || t === 12) FX.ring(px, GROUND - 12, '#8f7bff', 40, 3);
            }
            if (S1) {
                AudioSys.play('howl');
                FX.text(this.x, this.cy - 130, '玉犬', '#b9a8ff', 28);
                FX.burst(px, GROUND - 16, '#171226', 12, 5, 20, 4);
                const mk = (white, delay, opt) => game.delayed.push({
                    t: delay,
                    fn: () => {
                        if (this.dead) return;
                        FX.burst(this.x + this.facing * 50, GROUND - 20, white ? '#e8ecff' : '#171226', 8, 4, 16, 3);
                        game.projs.push(new Projectile({
                            owner: this,
                            x: this.x + this.facing * 60,
                            y: GROUND - 26,
                            vx: this.facing * (white ? 10.5 : 9),
                            w: 96,
                            h: 52,
                            life: 70,
                            color: white ? '#e8ecff' : '#8f7bff',
                            type: 'gyokuken',
                            white,
                            anim: white ? 0 : 7,
                            onHit: (tg) => {
                                tg.takeHit(this, opt);
                                FX.burst(tg.x, tg.cy, white ? '#e8ecff' : '#b9a8ff', 14, 6, 26, 4);
                            }
                        }));
                    }
                });
                mk(true, 0, { dmg: 12, stun: 22, kb: 5, shake: 6, hitstop: 7, spark: '#e8ecff', sound: 'hit2' });
                mk(false, 7, { dmg: 12, stun: 24, kb: 8, launch: 7, shake: 8, hitstop: 8, spark: '#b9a8ff', sound: 'hit2' });
            }
        }
        /* ---- 鵺：雷云凝聚 → 雷鸟俯冲麻痹 ---- */
        if (k === 'skill2') {
            const cx = this.x + this.facing * 30;
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(cx, 90, t % 4 === 0 ? '#ffe45c' : '#fff8d8', 2, 110, 14);
                if (t === 8 || t === 16) FX.ring(cx, 90, '#ffe45c', 44, 3);
            }
            if (S1) {
                const tg = this.foe;
                const tx = tg ? tg.x : this.x + this.facing * 300;
                FX.flash('#fff8d8', 0.18, 8);
                game.projs.push(new Projectile({
                    owner: this,
                    x: this.x + this.facing * 40,
                    y: 80,
                    vx: this.facing * 4,
                    vy: 2,
                    w: 110,
                    h: 60,
                    life: 80,
                    color: '#ffe45c',
                    trail: true,
                    type: 'nue',
                    anim: 0,
                    tx: tx,
                    update2(game2) {
                        if (this.y < GROUND - 60) {
                            this.vy += 0.35;
                            this.vx = Math.sign(this.tx - this.x) * 6;
                        } else {
                            this.vy = 2;
                            this.vx = Math.sign(this.tx - this.x) * 10;
                        }
                    },
                    onHit: (tg2) => {
                        tg2.takeHit(this, { dmg: 22, stun: 34, kb: 5, shake: 7, hitstop: 8, spark: '#ffe45c', sound: 'hit2' });
                        FX.text(tg2.x, tg2.cy - 100, '麻痹', '#ffe45c', 22);
                        FX.burst(tg2.x, tg2.cy, '#ffe45c', 16, 6, 24, 3);
                        FX.ring(tg2.x, tg2.cy, '#fff8d8', 70, 4);
                    }
                }));
                FX.text(this.x, this.cy - 130, '鵺', '#ffe45c', 30);
                AudioSys.play('howl');
            }
        }
        /* ---- 脱兔：白兔潮扰乱 + 影遁突进 ---- */
        if (k === 'skill3') {
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(this.x, GROUND - 10, '#e8ecff', 3, 80, 12);
                if (t === 8) FX.ring(this.x, GROUND - 10, '#e8ecff', 36, 3);
            }
            if (S1) {
                AudioSys.play('dash');
                FX.flash('#ffffff', 0.12, 6);
                FX.text(this.x, this.cy - 130, '脱兔', '#e8ecff', 28);
                FX.burst(this.x, GROUND - 14, '#e8ecff', 16, 6, 22, 3);
                this.invuln = Math.max(this.invuln, 24);
                this.vx = this.facing * 17;
                for (let i = 0; i < 5; i++) {
                    game.projs.push(new Projectile({
                        owner: this,
                        x: this.x + this.facing * (20 + i * 14),
                        y: GROUND - 12,
                        vx: this.facing * (6.5 + i * 1.3),
                        vy: -4 - (i % 3),
                        gravP: 0.5,
                        w: 40,
                        h: 30,
                        life: 55,
                        color: '#e8ecff',
                        type: 'rabbit',
                        anim: i * 4,
                        update2() {
                            if (this.y >= GROUND - 8) {
                                this.y = GROUND - 8;
                                this.vy = -(3.5 + (this.anim % 3));
                            }
                        },
                        onHit: (tg) => {
                            tg.takeHit(this, { dmg: 4, stun: 14, kb: 2, shake: 3, hitstop: 3, spark: '#e8ecff', sound: 'hit1' });
                        }
                    }));
                }
            }
        }
    }
    if (id === 'megumi2') {
        /* ---- 玉犬·浑：继承白犬之力的漆黑神犬 ---- */
        if (k === 'skill1') {
            const px = this.x + this.facing * 44;
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(px, GROUND - 14, t % 4 === 0 ? '#6a5cff' : '#120c22', 3, 100, 15);
                if (t === 8 || t === 16) FX.ring(px, GROUND - 12, '#6a5cff', 46, 3);
            }
            if (S1) {
                AudioSys.play('howl');
                FX.text(this.x, this.cy - 130, '玉犬 · 浑', '#8f7bff', 30);
                FX.burst(px, GROUND - 16, '#120c22', 16, 6, 24, 5);
                game.projs.push(new Projectile({
                    owner: this,
                    x: this.x + this.facing * 60,
                    y: GROUND - 26,
                    vx: this.facing * 11,
                    w: 100,
                    h: 54,
                    life: 70,
                    color: '#8f7bff',
                    type: 'gyokuken',
                    kon: true,
                    anim: 0,
                    update2() {
                        if (this.anim % 5 === 0) FX.burst(this.x - this.facing() * 30, this.y + 6, '#3a2f8f', 1, 2, 12, 3);
                    },
                    onHit: (tg) => {
                        tg.takeHit(this, { dmg: 24, stun: 26, kb: 8, launch: 7, shake: 8, hitstop: 8, spark: '#8f7bff', sound: 'hit3' });
                        FX.burst(tg.x, tg.cy, '#8f7bff', 18, 7, 30, 4);
                        FX.slash(tg.x, tg.cy, -0.5, '#b9a8ff', 130);
                    }
                }));
            }
        }
        /* ---- 大蛇：影中巨蛇窜出吞咬 ---- */
        if (k === 'skill2') {
            const ox = this.x + this.facing * 190;
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(ox, GROUND - 8, t % 4 === 0 ? '#6a5cff' : '#2a5a44', 3, 110, 14);
                if (t === 10 || t === 18) FX.ring(ox, GROUND - 8, '#6a5cff', 50, 4);
            }
            if (S1) {
                AudioSys.play('slam');
                FX.text(this.x, this.cy - 130, '大蛇', '#7be8a8', 32);
                FX.addShake(7);
                FX.burst(ox, GROUND - 10, '#120c22', 20, 8, 30, 5);
                FX.ring(ox, GROUND - 10, '#7be8a8', 80, 5);
                game.projs.push(new Projectile({
                    owner: this,
                    x: ox,
                    y: GROUND + 30,
                    vx: 0,
                    vy: -11,
                    w: 130,
                    h: 170,
                    life: 42,
                    color: '#7be8a8',
                    type: 'orochi',
                    anim: 0,
                    consume: false,
                    update2() {
                        if (this.y <= GROUND - 120) {
                            this.y = GROUND - 120;
                            this.vy = 0;
                        }
                    },
                    onHit: (tg) => {
                        tg.takeHit(this, { dmg: 32, stun: 32, kb: 9, launch: 8, shake: 12, hitstop: 11, spark: '#7be8a8', sound: 'hit3' });
                        FX.text(tg.x, tg.cy - 110, '吞咬', '#7be8a8', 26);
                        FX.burst(tg.x, tg.cy, '#7be8a8', 22, 9, 34, 5);
                    }
                }));
            }
        }
        /* ---- 不知井底：鵺×虾蟆嵌合式神，自天空振翅俯冲缠缚 ---- */
        if (k === 'skill3') {
            const cx = this.x + this.facing * 40;
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(cx, 110, t % 4 === 0 ? '#8f7bff' : '#9ab8ff', 2, 120, 14);
                if (t === 10 || t === 20) FX.ring(cx, 110, '#8f7bff', 46, 3);
            }
            if (S1) {
                const tg = this.foe;
                const tx = tg ? tg.x : this.x + this.facing * 260;
                const dir = tx >= this.x ? 1 : -1;
                const sx = Math.max(-130, Math.min(VW + 130, tx - dir * 320));
                AudioSys.play('howl');
                FX.text(this.x, this.cy - 130, '不知井底', '#9ab8ff', 30);
                FX.ring(sx, 70, '#8f7bff', 60, 5);
                gatherFX(sx, 70, '#9ab8ff', 10, 90, 12);
                game.projs.push(new Projectile({
                    owner: this,
                    x: sx,
                    y: 60,
                    vx: dir * 9,
                    vy: 2.2,
                    w: 120,
                    h: 90,
                    life: 110,
                    color: '#9ab8ff',
                    type: 'ido',
                    anim: 0,
                    ph: 0,
                    update2() {
                        const tgt = this.owner.foe;
                        if (this.ph === 0) {
                            /* 巡航索敌：滑翔中持续横向修正，逼近目标上空 */
                            if (tgt && !tgt.dead) {
                                const dx = tgt.x - this.x;
                                this.vx = Math.max(-12, Math.min(12, this.vx + Math.sign(dx) * 0.9));
                                this.vy = 2.2;
                                if (Math.abs(dx) < 180) this.ph = 1;
                            } else this.ph = 1;
                        } else if (this.ph === 1) {
                            /* 俯冲锁定：追踪目标当前位置扑击 */
                            let ty = GROUND - 80;
                            if (tgt && !tgt.dead) {
                                ty = Math.min(GROUND - 46, tgt.cy);
                                this.vx = Math.max(-13, Math.min(13, this.vx + Math.max(-1.2, Math.min(1.2, (tgt.x - this.x) * 0.05))));
                            }
                            this.vy = Math.min(this.vy + 0.9, 12);
                            if (this.y >= ty) {
                                this.ph = 2;
                                this.vy = -6.8;
                                FX.ring(this.x, this.y + 24, '#8f7bff', 66, 4);
                            }
                        } else {
                            /* 振翅拉升离场 */
                            this.vy = Math.max(this.vy - 0.45, -13);
                        }
                    },
                    onHit: (tg2) => {
                        tg2.takeHit(this, { dmg: 14, stun: 52, kb: 0, shake: 8, hitstop: 9, spark: '#9ab8ff', sound: 'hit2' });
                        FX.text(tg2.x, tg2.cy - 110, '蛙舌缠缚', '#9ab8ff', 26);
                        gatherFX(tg2.x, tg2.cy, '#9ab8ff', 14, 100, 16);
                        FX.ring(tg2.x, tg2.cy, '#9ab8ff', 90, 5);
                    }
                }));
            }
        }
    }
    if (id === 'yuji') {
        /* ---- 径庭拳：突进重拳 → 咒力延迟0.5秒后爆发二次冲击 ---- */
        if (k === 'skill1' && S1) {
            /* 第一击：突进直拳命中 */
            this.makeBox(104, 82, 88, -100, { dmg: 14, stun: 22, kb: 5, shake: 6, hitstop: 7, sound: 'hit2', spark: '#ffb38a' });
            FX.burst(this.x + this.facing * 80, this.cy, '#ffb38a', 10, 5, 18, 3);
            FX.text(this.x, this.cy - 120, '径庭拳！', '#ffb38a', 28);
            /* 第二击：咒力延迟爆发（0.5秒 ≈ 30帧） */
            game.delayed.push({
                t: 30,
                fn: () => {
                    if (this.dead) return;
                    const tg = this.foe;
                    const hx = this.x + this.facing * 92;
                    FX.flash('#ffb38a', 0.22, 10);
                    FX.addShake(10);
                    FX.ring(hx, this.cy, '#ff7a5c', 100, 7);
                    FX.burst(hx, this.cy, '#ffb38a', 18, 8, 28, 4);
                    AudioSys.play('hit3');
                    if (tg && tg.hittable() && Math.abs(tg.x - hx) < 120 && Math.abs(tg.cy - this.cy) < 95) {
                        /* 黑闪机制：二次冲击独立 10% 判定 */
                        const hit = { dmg: 24, stun: 30, kb: 13, launch: 8, shake: 11, hitstop: 11, spark: '#ff7a5c', sound: 'hit3' };
                        if (!this.tryBlackFlash(tg, hit)) tg.takeHit(this, hit);
                        FX.text(tg.x, tg.cy - 95, '二次冲击！', '#ff7a5c', 28);
                    }
                }
            });
        }
        /* ---- 体道之卍字踢：全身轴心旋转回旋踢，咒力缠绕足尖 ---- */
        if (k === 'skill2') {
            /* 第一段：起身旋转（t=16 castAt） */
            if (t === this.castAt) {
                this.vy = -7;
                this.vx = this.facing * 7;
                FX.burst(this.x, this.cy, '#ffb38a', 12, 6, 20, 3);
                FX.text(this.x, this.cy - 130, '卍字踢！', '#ffb38a', 28);
                AudioSys.play('dash');
            }
            /* 第二段：旋转下踢命中（t=28） */
            if (t === 28) {
                this.vx = this.facing * 9;
                this.makeBox(110, 90, 82, -90, { dmg: 20, stun: 26, kb: 10, shake: 8, hitstop: 9, sound: 'hit2', spark: '#ffb38a' });
                FX.burst(this.x + this.facing * 70, this.cy, '#ffb38a', 14, 7, 24, 4);
                FX.ring(this.x + this.facing * 60, this.cy, '#ff7a5c', 70, 5);
            }
            /* 第三段：落地重踏终结（t=40） */
            if (t === 40) {
                FX.addShake(9);
                AudioSys.play('slam');
                FX.ring(this.x + this.facing * 50, GROUND - 16, '#ffb38a', 90, 6);
                FX.burst(this.x + this.facing * 50, GROUND - 14, '#ff7a5c', 16, 7, 26, 4);
                const tg = this.foe;
                if (tg && tg.hittable() && Math.abs(tg.x - (this.x + this.facing * 50)) < 115 && Math.abs(tg.cy - this.cy) < 100) {
                    /* 黑闪机制：落地重踏独立 10% 判定 */
                    const hit = { dmg: 16, stun: 28, kb: 12, launch: 7, shake: 10, hitstop: 10, spark: '#ff7a5c', sound: 'hit3' };
                    if (!this.tryBlackFlash(tg, hit)) tg.takeHit(this, hit);
                    FX.text(tg.x, tg.cy - 90, '贯穿！', '#ff7a5c', 24);
                }
            }
        }
    }
    if (id === 'yuji2') {
        /* ---- 黑闪：单拳空间扭曲暴击，黑色闪电爆发 ---- */
        if (k === 'skill1') {
            if (t < this.castAt) {
                if (t % 3 === 0) gatherFX(this.x + this.facing * 40, this.cy, t % 6 === 0 ? '#1a1a2e' : '#ff2b2b', 3, 70, 12);
            }
            if (S1) {
                AudioSys.play('blackflash');
                FX.flash('#000000', 0.5, 12);
                FX.flash('#ff2b2b', 0.3, 8);
                FX.addShake(14);
                FX.addHitstop(14);
                FX.addZoom(0.05, this.x + this.facing * 80, this.cy);
                this.makeBox(110, 90, 88, -100, { dmg: 32, stun: 30, kb: 14, launch: 6, shake: 14, hitstop: 14, spark: '#ff2b2b', sound: 'blackflash', dmgColor: '#ff2b2b' });
                /* 黑色闪电弧线 */
                for (let i = 0; i < 5; i++) FX.slash(this.x + this.facing * (60 + rand(0, 60)), this.cy + rand(-50, 50), rand(0, Math.PI * 2), '#1a1a2e', rand(60, 120));
                FX.ring(this.x + this.facing * 80, this.cy, '#ff2b2b', 110, 7);
                FX.ring(this.x + this.facing * 80, this.cy, '#1a1a2e', 80, 5);
                FX.burst(this.x + this.facing * 80, this.cy, '#ff2b2b', 20, 9, 32, 5);
                FX.text(this.x, this.cy - 130, '黑闪！', '#ff2b2b', 34);
            }
        }
        /* ---- 穿血：压缩血液化作高速血矢贯穿敌人 ---- */
        if (k === 'skill2') {
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(this.x + this.facing * 50, this.cy - 10, t % 4 === 0 ? '#8a0012' : '#ff2b4a', 2, 80, 12);
            }
            if (S1) {
                AudioSys.play('beam');
                FX.text(this.x, this.cy - 130, '穿血', '#ff2b4a', 30);
                game.projs.push(new Projectile({
                    owner: this,
                    x: this.x + this.facing * 60,
                    y: this.cy - 10,
                    vx: this.facing * 18,
                    w: 110,
                    h: 22,
                    life: 50,
                    color: '#8a0012',
                    trail: true,
                    type: 'blood',
                    consume: false,
                    update2() {
                        /* 血液拖尾粒子 */
                        FX.burst(this.x - this.facing() * 30, this.y + rand(-6, 6), '#8a0012', 2, 3, 12, 2);
                    },
                    onHit: (tg) => {
                        tg.takeHit(this, { dmg: 22, stun: 24, kb: 10, shake: 8, hitstop: 8, spark: '#ff2b4a', sound: 'hit2' });
                        /* 血液飞溅 */
                        FX.burst(tg.x, tg.cy, '#8a0012', 18, 8, 28, 4);
                        FX.burst(tg.x, tg.cy, '#ff2b4a', 10, 5, 20, 3);
                        FX.text(tg.x, tg.cy - 90, '贯穿！', '#ff2b4a', 24);
                    }
                }));
                /* 发射后坐力 */
                this.vx = -this.facing * 3;
                FX.burst(this.x + this.facing * 55, this.cy - 10, '#8a0012', 10, 5, 18, 3);
            }
        }
        /* ---- 灵魂解：御厨子刻印发动，沿灵魂裁剪线连续斩切 ---- */
        if (k === 'skill3') {
            if (S1) {
                AudioSys.play('dash');
                FX.text(this.x, this.cy - 130, '灵魂解', '#c8e8ff', 30);
                /* 突进 */
                this.vx = this.facing * 12;
                /* 第一段斩击 */
                game.delayed.push({
                    t: 8,
                    fn: () => {
                        if (this.dead) return;
                        const t2 = this.foe;
                        FX.slash(this.x + this.facing * 70, this.cy - 20, 0.3, '#c8e8ff', 130);
                        AudioSys.play('hit1');
                        if (t2 && t2.hittable() && Math.abs(t2.x - this.x) < 160) {
                            t2.takeHit(this, { dmg: 10, stun: 14, kb: 2, shake: 4, hitstop: 4, spark: '#c8e8ff', sound: 'hit1' });
                        }
                    }
                });
                /* 第二段斩击 */
                game.delayed.push({
                    t: 16,
                    fn: () => {
                        if (this.dead) return;
                        const t2 = this.foe;
                        FX.slash(this.x + this.facing * 70, this.cy + 10, -0.4, '#c8e8ff', 130);
                        FX.slash(this.x + this.facing * 60, this.cy - 10, 1.2, '#ffffff', 90);
                        AudioSys.play('hit1');
                        if (t2 && t2.hittable() && Math.abs(t2.x - this.x) < 160) {
                            t2.takeHit(this, { dmg: 10, stun: 14, kb: 2, shake: 4, hitstop: 4, spark: '#c8e8ff', sound: 'hit1' });
                        }
                    }
                });
                /* 第三段终结斩：击飞 + 灵魂碎片飞散 */
                game.delayed.push({
                    t: 26,
                    fn: () => {
                        if (this.dead) return;
                        const t2 = this.foe;
                        FX.flash('#c8e8ff', 0.2, 8);
                        FX.addShake(10);
                        FX.slash(this.x + this.facing * 70, this.cy, 0, '#c8e8ff', 180);
                        FX.slash(this.x + this.facing * 70, this.cy, Math.PI / 2, '#ffffff', 140);
                        FX.ring(this.x + this.facing * 70, this.cy, '#c8e8ff', 90, 6);
                        /* 灵魂碎片粒子 */
                        for (let i = 0; i < 8; i++) {
                            FX.parts.push({
                                x: this.x + this.facing * 70 + rand(-30, 30),
                                y: this.cy + rand(-40, 40),
                                vx: rand(-3, 3), vy: rand(-4, -1),
                                life: rand(16, 30), maxLife: 30,
                                color: i % 2 ? '#c8e8ff' : '#ffffff',
                                size: rand(2, 4), grav: 0.05
                            });
                        }
                        AudioSys.play('hit3');
                        if (t2 && t2.hittable() && Math.abs(t2.x - this.x) < 170) {
                            t2.takeHit(this, { dmg: 16, stun: 28, kb: 12, launch: 9, shake: 10, hitstop: 10, spark: '#c8e8ff', sound: 'hit3' });
                            FX.text(t2.x, t2.cy - 100, '裁剪线', '#c8e8ff', 24);
                        }
                    }
                });
            }
        }
    }
    if (id === 'sukuna') {
        const hx = this.x + this.facing * 48,
            hy = this.cy - 22;
        /* ---- 解：指尖凝咒力刃 → 三连无形斩波隔空裂敌 ---- */
        if (k === 'skill1') {
            if (t < this.castAt) {
                if (t % 3 === 0) gatherFX(hx, hy, t % 6 === 0 ? '#ff6d8d' : '#ffd2dc', 3, 80, 14);
                if (t % 5 === 2) FX.slash(this.x + rand(-45, 45), this.cy + rand(-55, 30), rand(0, Math.PI * 2), 'rgba(255,109,141,0.5)', rand(30, 60));
                if (t === this.castAt - 4) FX.ring(hx, hy, '#ff8ca6', 50, 4);
            }
            if (S1) {
                AudioSys.play('dash');
                FX.text(this.x, this.cy - 120, '解', '#ff6d8d', 30);
                for (let i = 0; i < 3; i++) {
                    game.delayed.push({
                        t: i * 3,
                        fn: () => {
                            if (this.dead) return;
                            AudioSys.play('hit1');
                            FX.slash(this.x + this.facing * 60, this.cy - 30 + i * 28, this.facing > 0 ? rand(-0.35, 0.35) : Math.PI + rand(-0.35, 0.35), '#ff6d8d', 85);
                            game.projs.push(new Projectile({
                                owner: this,
                                x: this.x + this.facing * (50 + i * 10),
                                y: this.cy - 30 + i * 28,
                                vx: this.facing * (13 + i * 2),
                                w: 80,
                                h: 26,
                                life: 48,
                                anim: i * 5,
                                color: '#ff6d8d',
                                type: 'slashP',
                                ang: rand(-0.5, 0.5),
                                consume: true,
                                onHit: (tg) => { tg.takeHit(this, { dmg: 11, stun: 14, kb: 3, shake: 4, hitstop: 4, spark: '#ff6d8d', sound: 'hit1' }); }
                            }));
                        }
                    });
                }
            }
        }
        /* ---- 捌：双臂后引蓄势 → 高频十字乱斩（依咒力差斩碎对手） ---- */
        if (k === 'skill2') {
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(this.x, this.cy - 10, t % 4 === 0 ? '#ff4d6d' : '#ffd2dc', 2, 70, 12);
                if (t === 8) FX.ring(this.x, this.cy - 10, '#ff8ca6', 40, 4);
            }
            if (S1) {
                FX.text(this.x, this.cy - 130, '捌', '#ff6d8d', 34);
                AudioSys.play('dash');
                FX.flash('#ff4d6d', 0.16, 8);
                game.delayed.push({
                    t: 8,
                    fn: () => {
                        if (this.dead) return;
                        const t2 = this.foe;
                        if (t2 && !t2.dead && Math.abs(t2.x - this.x) < 170 && Math.abs(t2.cy - this.cy) < 110) {
                            let n = 0;
                            const iv = gameInterval(() => {
                                if (this.dead || t2.dead || n >= 6) { clearGameInterval(iv); return; }
                                n++;
                                // 十字交错斩：主斩赤红 + 副斩白刃垂直交叉
                                const sa = rand(0, Math.PI);
                                FX.slash(t2.x + rand(-30, 30), t2.cy + rand(-30, 30), sa, '#ff6d8d', 110);
                                FX.slash(t2.x + rand(-20, 20), t2.cy + rand(-20, 20), sa + Math.PI / 2, '#ffd9e2', 80);
                                FX.addShake(5);
                                AudioSys.play('hit1');
                                if (t2.hittable()) t2.takeHit(this, { dmg: 8, stun: 16, kb: 2, shake: 4, hitstop: 3, spark: '#ff6d8d', sound: 'hit1' });
                                if (n === 6 && t2.hittable()) {
                                    FX.addZoom(0.06);
                                    FX.ring(t2.x, t2.cy, '#ff8ca6', 100, 7);
                                    FX.text(t2.x, t2.cy - 120, '斩碎', '#ffd9e2', 24);
                                    t2.takeHit(this, { dmg: 14, stun: 24, kb: 12, launch: 9, shake: 9, hitstop: 8, spark: '#ff6d8d', sound: 'hit3' });
                                }
                            }, 110);
                        }
                    }
                });
            }
        }
        /* ---- 灶 · 开：引火拉弓蓄势（长按可蓄力1.5秒）→ 火矢破空飞出，命中/射程尽头/触地时粉尘爆炸 ---- */
        if (k === 'skill3') {
            const chMax = 90;
            if (t === 1) {
                this.charge = 0;
                this.chargeT = 0;
                this.chargeMax = chMax;
                this.chargeDone = false;
            }
            if (t === this.castAt - 1 && !this.chargeDone) {
                const map = KEYMAP[this.side === 0 ? 'p1' : 'p2'];
                if (!this.isAI && Input.held(map, k) && this.chargeT < chMax * 2) {
                    this.chargeT++;
                    this.charge = Math.min(chMax, this.chargeT);
                    this.st--; /* 冻结在释放前一帧，拉弓持续蓄力 */
                    const cp2 = this.charge / chMax;
                    if (this.chargeT % 3 === 0) gatherFX(hx - this.facing * 16, hy, this.chargeT % 6 === 0 ? '#ff9a3c' : '#ffe45c', 2 + Math.round(cp2 * 3), 90 + cp2 * 60, 14);
                    if (this.chargeT % 18 === 0) FX.ring(hx, hy, '#ffb35c', 36 + cp2 * 50, 3);
                    if (this.chargeT === chMax) {
                        AudioSys.play('ult');
                        FX.ring(hx, hy, '#ffffff', 90, 6);
                        FX.flash('#ff9a3c', 0.14, 8);
                        FX.text(this.x, this.cy - 148, '蓄力完成', '#ff9a3c', 24);
                        FX.text(this.x, this.cy - 120, '松开射出', '#ffffff', 16);
                    }
                    return;
                }
                this.chargeDone = true;
            }
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(hx - this.facing * 16, hy, t % 4 === 0 ? '#ff9a3c' : '#ffe45c', 3, 100, 14);
                if (t === 10) FX.ring(hx, hy, '#ffb35c', 46, 4);
                if (t === this.castAt - 4) FX.ring(hx, hy, '#ffe45c', 62, 5);
            }
            if (S1) {
                const cp = Math.min(1, (this.charge || 0) / chMax);
                FX.text(this.x, this.cy - 140, '灶 · 开', '#ffab3c', 34);
                AudioSys.play('beam');
                FX.ring(hx, hy, '#ffe45c', 50 + cp * 30, 5);
                const self = this;
                const boomR = 170 + cp * 110; /* 爆炸半径随蓄力增大 */
                const dmg = Math.round(42 + cp * 26); /* 42 → 蓄满 68 */
                const boom = (bx, by) => {
                    FX.flash('#ff9a3c', 0.45 + cp * 0.2, 18);
                    FX.addShake(14 + cp * 8);
                    FX.addZoom(0.08 + cp * 0.05);
                    AudioSys.play('slam');
                    FX.burst(bx, by, '#ff9a3c', 40 + Math.round(cp * 20), 12 + cp * 4, 46 + cp * 14, 6, true);
                    FX.burst(bx, by, '#ffe45c', 22 + Math.round(cp * 10), 9, 34 + cp * 10, 4);
                    FX.burst(bx, by, '#7a1010', 14 + Math.round(cp * 8), 6, 40 + cp * 14, 7);
                    FX.ring(bx, by, '#ffd2a0', 120 + cp * 80, 8);
                    for (let i = 0; i < 5 + Math.round(cp * 3); i++) FX.pillar(bx + rand(-boomR * 0.45, boomR * 0.45), 'rgba(255,150,60,0.9)', rand(28, 60), rand(180, 340));
                    const tg = self.foe;
                    if (tg && tg.hittable() && Math.abs(tg.x - bx) < boomR + 30 && Math.abs(tg.cy - by) < 170) {
                        tg.takeHit(self, { dmg, stun: 34, kb: 16 + cp * 6, launch: 10 + cp * 4, shake: 15, hitstop: 14, spark: '#ff9a3c', sound: 'hit3', dmgColor: '#ff9a3c' });
                        FX.text(tg.x, tg.cy - 110, '粉尘爆炸', '#ff9a3c', 26);
                    }
                    for (const al of game.allies) {
                        if (!al.dead && al.owner !== self && Math.abs(al.x - bx) < boomR + 30) al.takeHit(self, { dmg });
                    }
                    /* 余烬升腾 */
                    game.delayed.push({
                        t: 6,
                        fn: () => {
                            for (let i = 0; i < 10; i++) {
                                FX.parts.push({
                                    x: bx + rand(-90, 90),
                                    y: by + rand(-20, 40),
                                    vx: rand(-0.5, 0.5),
                                    vy: rand(-2.5, -1),
                                    life: rand(20, 40),
                                    maxLife: 40,
                                    color: i % 2 ? '#ff9a3c' : '#ffe45c',
                                    size: rand(1.5, 3),
                                    grav: -0.02
                                });
                            }
                        }
                    });
                };
                /* 火矢：破空直飞，命中敌人 / 射程尽头 / 触地 / 出界前均引爆 */
                game.projs.push(new Projectile({
                    owner: this,
                    x: hx + this.facing * 10,
                    y: hy,
                    vx: this.facing * (15 + cp * 6),
                    vy: -0.6,
                    w: 46,
                    h: 14,
                    life: 42 + Math.round(cp * 20),
                    anim: 0,
                    color: '#ff9a3c',
                    type: 'fireArrow',
                    consume: true,
                    update2() {
                        this.vy += 0.05; /* 箭矢轻微坠感 */
                        if (this.anim % 2 === 0) {
                            FX.parts.push({
                                x: this.x - Math.sign(this.vx) * rand(10, 40),
                                y: this.y + rand(-5, 5),
                                vx: -Math.sign(this.vx) * rand(1, 3),
                                vy: rand(-0.8, 0.8),
                                life: rand(8, 16),
                                maxLife: 16,
                                color: this.anim % 4 === 0 ? '#ffe45c' : '#ff9a3c',
                                size: rand(2, 4),
                                grav: 0
                            });
                        }
                        if (!this.boomed && (this.life <= 0 || this.y > GROUND - 15 || this.x < 30 || this.x > VW - 30)) {
                            this.boomed = true;
                            this.life = 0;
                            boom(this.x, Math.min(this.y, GROUND - 25));
                        }
                    },
                    onHit: (tg) => {
                        boom(tg.x, tg.cy);
                    }
                }));
            }
        }
    }
    if (id === 'sukunaMegumi') {
        const hx = this.x + this.facing * 48,
            hy = this.cy - 22;
        if (k === 'skill1') {
            if (t < this.castAt) {
                if (t % 3 === 0) gatherFX(hx, hy, t % 6 === 0 ? '#d83c55' : '#f2ccd4', 3, 78, 14);
                if (t === this.castAt - 4) FX.ring(hx, hy, '#e7687a', 48, 4);
            }
            if (S1) {
                FX.text(this.x, this.cy - 122, '解', '#e7687a', 30);
                AudioSys.play('dash');
                for (let i = 0; i < 3; i++) {
                    game.delayed.push({
                        t: i * 4,
                        fn: () => {
                            if (this.dead) return;
                            FX.slash(this.x + this.facing * 62, this.cy - 32 + i * 30, this.facing > 0 ? -0.2 + i * 0.2 : Math.PI - 0.2 + i * 0.2, '#d83c55', 82);
                            game.projs.push(new Projectile({
                                owner: this,
                                x: this.x + this.facing * (52 + i * 8),
                                y: this.cy - 32 + i * 30,
                                vx: this.facing * (12.5 + i),
                                w: 76,
                                h: 24,
                                life: 48,
                                anim: i * 5,
                                color: '#d83c55',
                                type: 'slashP',
                                ang: -0.35 + i * 0.35,
                                consume: true,
                                onHit: target => target.takeHit(this, { dmg: 9, stun: 12, kb: 3, shake: 4, hitstop: 4, spark: '#d83c55', sound: 'hit1' })
                            }));
                        }
                    });
                }
            }
        }
        if (k === 'skill2') {
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(hx, hy, '#d83c55', 2, 62, 12);
                if (t > this.castAt - 10) this.vx = this.facing * 2.8;
            }
            if (S1) {
                const target = this.foe;
                FX.text(this.x, this.cy - 126, '捌', '#e7687a', 32);
                FX.slash(hx, hy, 0, '#f4dbe0', 70);
                if (target && target.hittable() && Math.abs(target.x - this.x) < 112 && Math.abs(target.cy - this.cy) < 100) {
                    let n = 0;
                    const iv = gameInterval(() => {
                        if (this.dead || target.dead || n >= 5) { clearGameInterval(iv); return; }
                        n++;
                        const angle = n % 2 ? -0.65 : 0.65;
                        FX.slash(target.x, target.cy + rand(-24, 24), angle, n % 2 ? '#d83c55' : '#f4dbe0', 105);
                        if (target.hittable()) target.takeHit(this, { dmg: n === 5 ? 13 : 7, stun: n === 5 ? 22 : 13, kb: n === 5 ? 10 : 2, launch: n === 5 ? 6 : 0, shake: 5, hitstop: 4, spark: '#d83c55', sound: n === 5 ? 'hit3' : 'hit1' });
                    }, 115);
                }
            }
        }
        if (k === 'skill3') {
            if (!this.summonsDeployed) {
                if (t < this.castAt && t % 3 === 0) gatherFX(this.x, GROUND - 18, t % 6 === 0 ? '#b7a8d8' : '#8fc8ff', 4, 112, 16);
                if (S1) {
                    FX.flash('#15101f', 0.42, 14);
                    FX.ring(this.x, GROUND - 12, '#c8bee8', 150, 7);
                    FX.ring(this.x, GROUND - 12, '#8fc8ff', 110, 5);
                    FX.text(this.x, this.cy - 140, '魔虚罗 · 嵌合兽颚吐', '#e8e4ff', 24);
                    const m = new Mahoraga(this, { maxHp: 270, damage: 15, moveSpeed: 3, attackCooldown: 88, maxReduction: 0.28, adaptReduction: 0.04, attackOwner: false });
                    const agito = new Agito(this);
                    this.mahoraga = m;
                    this.agito = agito;
                    this.summonsDeployed = true;
                    game.allies.push(m, agito);
                }
            } else {
                if (t < this.castAt) {
                    if (t % 2 === 0) gatherFX(hx, hy, t % 4 === 0 ? '#d83c55' : '#f4e4e8', 4, 120, 18);
                    if (t === this.castAt - 6) FX.ring(hx, hy, '#f4e4e8', 85, 6);
                }
                if (S1) {
                    const target = this.foe;
                    const ty = target && !target.dead ? target.cy : this.cy;
                    FX.flash('#f4e4e8', 0.28, 10);
                    FX.text(this.x, this.cy - 142, '斩断世界', '#f4e4e8', 30);
                    FX.slash(this.x + this.facing * 105, ty, 0, '#ffffff', 250);
                    FX.slash(this.x + this.facing * 105, ty, 0.08, '#d83c55', 220);
                    AudioSys.play('beam');
                    game.projs.push(new Projectile({
                        owner: this,
                        x: this.x + this.facing * 72,
                        y: ty,
                        vx: this.facing * 18,
                        w: 190,
                        h: 42,
                        life: 58,
                        color: '#f4e4e8',
                        type: 'slashP',
                        ang: 0,
                        consume: true,
                        onHit: victim => {
                            FX.flash('#ffffff', 0.18, 8);
                            FX.slash(victim.x, victim.cy, 0, '#ffffff', 260);
                            FX.crack(victim.x, victim.cy, '#d83c55', 7, 150);
                            victim.takeHit(this, { dmg: 45, stun: 30, kb: 14, launch: 8, shake: 12, hitstop: 11, spark: '#d83c55', sound: 'hit3', unblockable: true });
                        }
                    }));
                }
            }
        }
    }
    if (id === 'okkotsu') {
        /* ---- 里香·铁拳：黑紫怨灵巨臂从裂隙探出横扫 ---- */
        if (k === 'skill1') {
            if (t < this.castAt) {
                if (t % 3 === 0) gatherFX(this.x - this.facing * 20, this.cy - 40, t % 6 === 0 ? '#b89aff' : '#7be8d8', 3, 90, 14);
                /* 背后裂隙挣开的紫环 */
                if (t === Math.floor(this.castAt * 0.5)) FX.ring(this.x - this.facing * 30, this.cy - 30, '#b89aff', 70, 6);
            }
            if (S1) {
                AudioSys.play('slam');
                FX.addShake(10);
                FX.addHitstop(10);
                /* 里香巨腕显现：黑紫拳压 + 惨白爪光 */
                FX.ring(this.x + this.facing * 100, this.cy - 10, '#b89aff', 130, 8);
                FX.ring(this.x + this.facing * 100, this.cy - 10, '#7be8d8', 90, 5);
                FX.burst(this.x + this.facing * 100, this.cy - 10, '#b89aff', 18, 8, 28, 5);
                FX.burst(this.x + this.facing * 80, this.cy, '#2a1a4a', 12, 6, 24, 5);
                FX.burst(this.x + this.facing * 110, this.cy - 20, '#f0ecf8', 8, 7, 20, 3);
                /* 巨腕横扫斩击线（紫黑主斩 + 白爪副痕） */
                FX.slash(this.x + this.facing * 100, this.cy - 20, 0.2, '#b89aff', 160);
                FX.slash(this.x + this.facing * 90, this.cy + 10, -0.3, '#f0ecf8', 130);
                FX.slash(this.x + this.facing * 105, this.cy - 5, 0.5, '#2a1a4a', 110);
                this.makeBox(160, 120, 110, -110, { dmg: 28, stun: 28, kb: 14, shake: 10, hitstop: 10, spark: '#b89aff', sound: 'hit3' });
                FX.text(this.x, this.cy - 140, '里香！', '#b89aff', 30);
            }
        }
        /* ---- 术式模仿·咒言：“爆炸吧”声波控制 ---- */
        if (k === 'skill2') {
            if (t < this.castAt) {
                if (t % 4 === 0) gatherFX(this.x + this.facing * 10, this.cy - 44, '#7be8d8', 2, 60, 12);
                /* 喉部聚音微环 */
                if (t === Math.floor(this.castAt * 0.7)) FX.ring(this.x + this.facing * 14, this.cy - 44, '#7be8d8', 34, 4);
            }
            if (S1) {
                FX.text(this.x, this.cy - 150, '「爆炸吧」', '#7be8d8', 36);
                AudioSys.play('cast');
                game.delayed.push({
                    t: 10,
                    fn: () => {
                        if (this.dead) return;
                        const tg = this.foe;
                        /* 声波锥形扩散：三层递进环 */
                        FX.ring(this.x + this.facing * 100, this.cy - 10, '#7be8d8', 120, 6);
                        FX.ring(this.x + this.facing * 180, this.cy, '#7be8d8', 260, 9);
                        FX.ring(this.x + this.facing * 120, this.cy, '#b89aff', 180, 6);
                        FX.flash('#7be8d8', 0.2, 10);
                        /* 咒言波纹粒子（声波行进方向） */
                        for (let i = 0; i < 9; i++) {
                            FX.parts.push({
                                x: this.x + this.facing * (60 + i * 40), y: this.cy + rand(-34, 34),
                                vx: this.facing * rand(4, 7), vy: rand(-1, 1),
                                life: rand(14, 26), maxLife: 26,
                                color: i % 3 === 0 ? '#e8d8ff' : (i % 2 ? '#7be8d8' : '#b89aff'),
                                size: rand(2, 4), grav: 0
                            });
                        }
                        if (tg && tg.hittable() && (tg.x - this.x) * this.facing > 0 && Math.abs(tg.x - this.x) < 460) {
                            tg.takeHit(this, { dmg: 16, stun: 56, kb: 2, shake: 8, hitstop: 10, spark: '#7be8d8', sound: 'hit2' });
                            FX.ring(tg.x, tg.cy, '#e8d8ff', 70, 5);
                            FX.text(tg.x, tg.cy - 110, '咒言僵直', '#7be8d8', 26);
                        }
                    }
                });
            }
        }
        /* ---- 里香·冲击波：里香裂口凝聚发射贯穿冲击 ---- */
        if (k === 'skill3') {
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(this.x - this.facing * 10, this.cy - 60, t % 4 === 0 ? '#b89aff' : '#e8d8ff', 3, 100, 14);
                if (t === this.castAt - 8) FX.ring(this.x - this.facing * 10, this.cy - 60, '#b89aff', 60, 5);
                if (t === this.castAt - 4) FX.ring(this.x - this.facing * 10, this.cy - 60, '#e8d8ff', 40, 4);
            }
            if (S1) {
                AudioSys.play('beam');
                FX.addShake(9);
                FX.flash('#b89aff', 0.2, 8);
                game.projs.push(new Projectile({
                    owner: this,
                    x: this.x + this.facing * 70,
                    y: this.cy - 16,
                    vx: this.facing * 15,
                    w: 140,
                    h: 85,
                    life: 55,
                    color: '#b89aff',
                    trail: true,
                    type: 'rikaBeam',
                    consume: false,
                    update2() {
                        FX.burst(this.x - this.facing() * 35, this.y + rand(-20, 20), '#b89aff', 2, 3, 12, 3);
                        /* 冲击波外缘白紫电弧 */
                        if (Math.random() < 0.5) FX.burst(this.x + rand(-30, 30), this.y + rand(-30, 30), '#e8d8ff', 1, 2, 8, 2);
                    },
                    onHit: (tg) => {
                        tg.takeHit(this, { dmg: 26, stun: 26, kb: 13, shake: 11, hitstop: 10, spark: '#b89aff', sound: 'hit3' });
                        FX.burst(tg.x, tg.cy, '#b89aff', 20, 9, 30, 5);
                        FX.burst(tg.x, tg.cy, '#2a1a4a', 10, 6, 22, 4);
                        FX.ring(tg.x, tg.cy, '#e8d8ff', 100, 6);
                        FX.ring(tg.x, tg.cy, '#b89aff', 60, 4);
                        FX.text(tg.x, tg.cy - 90, '冲击！', '#b89aff', 24);
                    }
                }));
                FX.text(this.x, this.cy - 140, '里香 · 冲击波', '#b89aff', 30);
                /* 发射后坐力 */
                this.vx = -this.facing * 3;
            }
        }
    }
    if (id === 'mahito') {
        if (k === 'skill1' && S1) {
            /* 无为转变·腕刃：手臂变形为巨刃横扫 */
            this.makeBox(170, 75, 105, -100, { dmg: 26, stun: 28, kb: 10, shake: 9, hitstop: 9, spark: '#a8d8ff', sound: 'hit2' });
            FX.slash(this.x + this.facing * 110, this.cy - 10, rand(-0.5, 0.5), '#a8d8ff', 180);
            FX.slash(this.x + this.facing * 80, this.cy + 10, rand(-0.3, 0.3), '#7aaad0', 140);
            FX.text(this.x, this.cy - 130, '无为转变', '#a8d8ff', 26);
        }
        if (k === 'skill2' && S1) {
            /* 多重魂·拨体：召唤独立改造人实体 */
            const th = new TransfiguredHuman(this);
            game.allies.push(th);
            FX.burst(this.x + this.facing * 50, this.cy - 20, '#d8a8c8', 16, 7, 26, 4);
            FX.text(this.x, this.cy - 140, '多重魂 · 拨体', '#d8a8c8', 28);
            AudioSys.play('cast');
        }
        if (k === 'skill3' && t === this.castAt) {
            /* 遍杀即灵体：状态型变身，无直接伤害 */
            if (!this.hensetsuActive) {
                this.hensetsuActive = true;
                const cfg = this.c.hensetsu || { duration: 480, atkMul: 1.2, defMul: 1.2, spdMul: 1.25 };
                this.hensetsu = cfg.duration;
                this.d.atkMul *= cfg.atkMul;
                this.d.dmgTaken *= (1 / cfg.defMul);
                this.d.speed *= (cfg.spdMul || 1.25);
                /* 变身演出特效 */
                FX.flash('#a8d8ff', 0.4, 16);
                FX.addShake(12);
                FX.addHitstop(10);
                AudioSys.play('ult');
                FX.burst(this.x, this.cy, '#a8d8ff', 30, 10, 40, 5);
                FX.burst(this.x, this.cy, '#4a6a8f', 20, 8, 35, 4);
                for (let i = 0; i < 6; i++) {
                    const a = i * Math.PI / 3;
                    FX.slash(this.x + Math.cos(a) * 60, this.cy + Math.sin(a) * 50, a, '#a8d8ff', 120);
                }
                FX.text(this.x, this.cy - 150, '遍杀即灵体', '#a8d8ff', 34);
                FX.text(this.x, this.cy - 120, '攻防+20%', '#7aaad0', 20);
            }
        }
    }
    if (id === 'nanami') {
        if (k === 'skill1' && S1) {
            /* 十划咒法·闷斩：单次精准斩击，7:3弱点暴击 */
            this.makeBox(120, 80, 95, -100, { dmg: 16, stun: 22, kb: 6, shake: 6, sound: 'hit2', spark: '#e8c86a' });
            FX.slash(this.x + this.facing * 95, this.cy - 10, -0.7, '#e8c86a', 150);
            game.delayed.push({
                t: 10,
                fn: () => {
                    if (this.dead) return;
                    const t2 = this.foe;
                    if (t2 && t2.hittable() && Math.abs(t2.x - (this.x + this.facing * 90)) < 130 && Math.abs(t2.cy - this.cy) < 100) {
                        const critY = t2.y - 78 * 0.7;
                        FX.ring(t2.x, critY, '#e8c86a', 70, 6);
                        FX.slash(t2.x, critY, -0.5, '#ffffff', 100);
                        FX.text(t2.x, critY - 50, '7:3 暴击！', '#e8c86a', 28);
                        t2.takeHit(this, { dmg: 28, stun: 28, kb: 10, shake: 10, hitstop: 10, spark: '#e8c86a', sound: 'hit3', dmgColor: '#e8c86a' });
                    }
                }
            });
            FX.text(this.x, this.cy - 130, '十划咒法', '#e8c86a', 26);
        }
        if (k === 'skill2' && (t === 12 || t === 22 || t === 32 || t === 42)) {
            /* 十划咒法·连劈：4段连续斩击，末段击退 */
            const isLast = t === 42;
            this.vx = this.facing * (isLast ? 9 : 6);
            this.makeBox(100, 74, 85, -98, {
                dmg: isLast ? 16 : 10,
                stun: isLast ? 26 : 16,
                kb: isLast ? 12 : 5,
                launch: isLast ? 6 : 0,
                shake: isLast ? 9 : 5,
                hitstop: isLast ? 9 : 5,
                sound: isLast ? 'hit3' : 'hit2',
                spark: '#e8c86a'
            });
            FX.slash(this.x + this.facing * 85, this.cy, rand(-0.8, 0.2), '#e8c86a', 120);
            if (isLast) FX.text(this.x, this.cy - 130, '连劈', '#e8c86a', 24);
        }
        if (k === 'skill3' && t === this.castAt) {
            /* 十划咒法·崩落：蓄力下劈，范围崩裂+僵直 */
            FX.addShake(10);
            FX.addHitstop(8);
            AudioSys.play('hit3');
            FX.slash(this.x + this.facing * 60, this.cy + 20, 1.2, '#e8c86a', 200);
            FX.burst(this.x + this.facing * 60, GROUND - 10, '#c8a86a', 20, 8, 30, 4);
            FX.ring(this.x + this.facing * 60, GROUND - 10, '#e8c86a', 100, 6);
            const tg = this.foe;
            if (tg && tg.hittable() && Math.abs(tg.x - (this.x + this.facing * 60)) < 160 && Math.abs(tg.cy - this.cy) < 120) {
                tg.takeHit(this, { dmg: 30, stun: 34, kb: 8, shake: 11, hitstop: 11, spark: '#e8c86a', sound: 'hit3', dmgColor: '#e8c86a' });
            }
            FX.text(this.x, this.cy - 140, '崩落', '#e8c86a', 30);
        }
    }
    if (id === 'kenjaku') {
        const hx = this.x + this.facing * 58,
            hy = this.cy - 26;
        /* ---- 术式：咒灵操术——结印解放收服的咒灵群 ---- */
        if (k === 'skill1') {
            if (t < this.castAt) {
                /* 蓄力：咒力自四周汇入手心，黑紫双色交替 */
                if (t % 3 === 0) gatherFX(hx, hy, t % 6 === 0 ? '#b88fd8' : '#4a2a6e', 3, 80, 14);
                if (t === 8) FX.ring(hx, hy, '#b88fd8', 40, 3);
                if (t === this.castAt - 4) FX.ring(hx, hy, '#e0ccf2', 56, 5);
            }
            if (S1) {
                AudioSys.play('beam');
                FX.burst(hx, hy, '#b88fd8', 14, 6, 22, 3);
                FX.ring(hx, hy, '#b88fd8', 80, 5);
                /* 5 只咒灵呈扇面鱼贯而出，各自蠕行扬翼 */
                for (let i = 0; i < 5; i++) {
                    const lane = i - 2;
                    game.projs.push(new Projectile({
                        owner: this,
                        x: hx - this.facing * 10,
                        y: hy + lane * 18,
                        vx: this.facing * (8.5 + Math.abs(lane) * 0.8),
                        vy: lane * 0.4,
                        w: 46,
                        h: 46,
                        life: 66,
                        color: '#b88fd8',
                        trail: true,
                        type: 'curse',
                        anim: i * 7,
                        variant: i % 3,
                        update2() {
                            /* 咒灵蠕行：上下蚕动 + 微弱寻敌修正 */
                            this.y += Math.sin((this.anim + this.life) * 0.3) * 1.6;
                            const tg2 = this.owner.foe;
                            if (tg2 && tg2.hittable()) this.vy += Math.sign(tg2.cy - this.y) * 0.05;
                        },
                        onHit: (tg) => {
                            tg.takeHit(this, { dmg: 7, stun: 13, kb: 3, shake: 3, hitstop: 3, spark: '#b88fd8', sound: 'hit1' });
                            FX.burst(tg.x, tg.cy, '#4a2a6e', 8, 5, 18, 3);
                        }
                    }));
                }
                FX.text(this.x, this.cy - 132, '咒灵操术', '#b88fd8', 26);
            }
        }
        /* ---- 术式：反重力机构——反转体感重力，掀飞后砸回地面 ---- */
        if (k === 'skill2') {
            if (t < this.castAt) {
                /* 蓄力：周身倒浮粒子上升（重力开始失控的兆候） */
                if (t % 3 === 0) {
                    FX.parts.push({
                        x: this.x + rand(-60, 60), y: GROUND - rand(0, 20),
                        vx: 0, vy: -rand(1.5, 3.5),
                        life: 22, maxLife: 22, color: t % 6 === 0 ? '#b88fd8' : '#6e5a9e', size: rand(1.5, 3), grav: 0
                    });
                }
                if (t === 10) FX.ring(this.x, this.cy, '#6e5a9e', 90, 4);
                if (t === this.castAt - 4) FX.ring(this.x, this.cy, '#b88fd8', 150, 6);
            }
            if (S1) {
                AudioSys.play('cast');
                FX.text(this.x, this.cy - 142, '反重力机构', '#b88fd8', 28);
                FX.ring(this.x, this.cy, '#b88fd8', 280, 8);
                FX.flash('#c8b0e8', 0.18, 8);
                const tg = this.foe;
                if (tg && tg.hittable() && Math.abs(tg.x - this.x) < 360) {
                    /* 第一段：重力反转，无重飘浮上半空 */
                    tg.takeHit(this, { dmg: 10, stun: 30, kb: 1, launch: 17, shake: 8, hitstop: 8, spark: '#b88fd8', sound: 'hit2', unblockable: true });
                    FX.text(tg.x, tg.cy - 110, '重力反转', '#b88fd8', 24);
                    for (let i = 0; i < 10; i++) {
                        FX.parts.push({
                            x: tg.x + rand(-40, 40), y: tg.cy + rand(-20, 40),
                            vx: 0, vy: -rand(2, 5),
                            life: 26, maxLife: 26, color: '#b88fd8', size: rand(1.5, 3.5), grav: -0.02
                        });
                    }
                    /* 第二段：重力骤增，狠狠砸回地面 */
                    game.delayed.push({
                        t: 26,
                        fn: () => {
                            if (this.dead) return;
                            const t2 = this.foe;
                            if (t2 && !t2.dead && !t2.onGround) {
                                t2.vy = 22;
                                t2.vx = 0;
                                FX.text(t2.x, t2.cy - 90, '重力崩落', '#8a6ab8', 22);
                                game.delayed.push({
                                    t: 10,
                                    fn: () => {
                                        const t3 = this.foe;
                                        if (t3 && !t3.dead && t3.onGround) {
                                            FX.addShake(11);
                                            AudioSys.play('slam');
                                            FX.burst(t3.x, GROUND - 10, '#6e5a9e', 22, 8, 30, 4, true);
                                            FX.ring(t3.x, GROUND - 10, '#b88fd8', 120, 6);
                                            if (t3.hittable()) t3.takeHit(this, { dmg: 14, stun: 26, kb: 4, shake: 9, hitstop: 9, spark: '#b88fd8', sound: 'hit3', unblockable: true });
                                        }
                                    }
                                });
                            }
                        }
                    });
                }
            }
        }
        /* ---- 极之番「漩涡」——千咒压缩，轰出超高纯度咒力漩涡 ---- */
        if (k === 'skill3') {
            if (t < this.castAt) {
                /* 长蓄力：咒灵自四面八方被强行拉入手心压缩 */
                if (t % 2 === 0) gatherFX(hx, hy, t % 6 === 0 ? '#e0ccf2' : (t % 4 === 0 ? '#b88fd8' : '#4a2a6e'), 4, 150, 16);
                if (t === 8 || t === 18) FX.ring(hx, hy, '#6e4a8f', 60, 4);
                if (t === 26) { FX.ring(hx, hy, '#b88fd8', 90, 5); FX.addShake(3); }
                if (t === this.castAt - 3) { FX.flash('#e8dcf8', 0.30, 7); FX.addShake(6); }
            }
            if (S1) {
                AudioSys.play('ult');
                FX.addShake(12);
                FX.addZoom(0.06, hx, hy);
                FX.burst(hx, hy, '#b88fd8', 26, 9, 34, 5);
                FX.ring(hx, hy, '#e0ccf2', 140, 8);
                this.vx = -this.facing * 5; // 反吐后座力
                game.projs.push(new Projectile({
                    owner: this,
                    x: hx + this.facing * 30,
                    y: hy,
                    vx: this.facing * 11,
                    w: 190,
                    h: 190,
                    life: 76,
                    color: '#b88fd8',
                    trail: true,
                    type: 'uzumaki',
                    consume: false,
                    anim: 0,
                    update2() {
                        /* 漩涡推进：沿途撞碎咒力飞沫 */
                        if (this.life % 3 === 0) FX.burst(this.x + rand(-60, 60), this.y + rand(-60, 60), '#b88fd8', 3, 3, 12, 2);
                    },
                    onHit: (tg2) => {
                        tg2.takeHit(this, { dmg: 30, stun: 30, kb: 15, launch: 7, shake: 12, hitstop: 11, spark: '#b88fd8', sound: 'hit3', unblockable: true });
                        FX.ring(tg2.x, tg2.cy, '#e0ccf2', 130, 7);
                        FX.crack(tg2.x, tg2.cy, '#b88fd8', 5, 120);
                    }
                }));
                FX.text(this.x, this.cy - 148, '极之番「漩涡」', '#e0ccf2', 34);
            }
        }
    }
    if (id === 'hanami') {
        if (k === 'skill1' && S1) {
            /* 树根：咒力具现化树根从近及远接连贯穿地面，末段巨根追踪敌人挑空 */
            AudioSys.play('slam');
            FX.addShake(4);
            for (let i = 0; i < 5; i++) {
                game.delayed.push({
                    t: 4 + i * 5,
                    fn: () => {
                        if (this.dead) return;
                        const rx = this.x + this.facing * (64 + i * 66);
                        FX.crack(rx, GROUND, '#5a7a3a', 3, 40);
                        FX.burst(rx, GROUND - 10, '#8fe87b', 8, 4, 16, 3, true);
                        AudioSys.play('hit1');
                        game.projs.push(new Projectile({
                            owner: this,
                            x: rx,
                            y: GROUND - 62,
                            vx: 0,
                            vy: 0,
                            w: 44,
                            h: 130,
                            life: 26,
                            color: '#8fe87b',
                            type: 'root',
                            anim: 0,
                            onHit: (t2) => {
                                t2.takeHit(this, { dmg: 7, stun: 14, kb: 3, launch: 2, shake: 4, hitstop: 4, spark: '#8fe87b', sound: 'hit1' });
                            }
                        }));
                    }
                });
            }
            /* 末段：减少射程换取强度——巨根锁定敌人脚下破地挑空 */
            game.delayed.push({
                t: 32,
                fn: () => {
                    if (this.dead) return;
                    const t2 = this.foe;
                    const rx = t2 ? t2.x : this.x + this.facing * 320;
                    FX.crack(rx, GROUND, '#8fe87b', 5, 70);
                    FX.pillar(rx, 'rgba(140,230,120,0.55)', 40, 150);
                    FX.burst(rx, GROUND - 20, '#b8e88c', 16, 7, 24, 4, true);
                    FX.addShake(7);
                    AudioSys.play('hit2');
                    game.projs.push(new Projectile({
                        owner: this,
                        x: rx,
                        y: GROUND - 100,
                        vx: 0,
                        vy: 0,
                        w: 60,
                        h: 210,
                        life: 30,
                        color: '#8fe87b',
                        type: 'root',
                        anim: 0,
                        big: true,
                        onHit: (t3) => {
                            t3.takeHit(this, { dmg: 12, stun: 22, kb: 5, launch: 11, shake: 8, hitstop: 8, spark: '#8fe87b', sound: 'hit3' });
                        }
                    }));
                }
            });
            FX.text(this.x, this.cy - 130, '树根', '#8fe87b', 28);
        }
        if (k === 'skill2' && S1) {
            /* 咒种：命中扎根后持续吸食咒力生长——目标防御/施术时侵蚀反而加剧 */
            game.projs.push(new Projectile({
                owner: this,
                x: this.x + this.facing * 56,
                y: this.cy - 26,
                vx: this.facing * 10,
                vy: -1.2,
                gravP: 0.05,
                w: 40,
                h: 40,
                life: 66,
                color: '#b8e85c',
                type: 'seed',
                anim: 0,
                onHit: (tg2) => {
                    tg2.takeHit(this, { dmg: 9, stun: 18, kb: 3, shake: 5, hitstop: 5, spark: '#b8e85c', sound: 'hit2' });
                    FX.text(tg2.x, tg2.cy - 100, '咒种扎根', '#b8e85c', 22);
                    FX.ring(tg2.x, tg2.cy, '#b8e85c', 50, 4);
                    let n = 0;
                    const iv = gameInterval(() => {
                        if (tg2.dead || n >= 6) { clearGameInterval(iv); return; }
                        n++;
                        /* 动用咒力（拖式/必杀/防御）时咒种吸食更多 */
                        const casting = tg2.state === 'skill' || tg2.state === 'ult';
                        const guarding = tg2.state === 'block' || tg2.blockHeld;
                        let d = 4;
                        if (casting) { d = 9; FX.text(tg2.x, tg2.cy - 96, '咒力被吸食！', '#e8ff8c', 20); }
                        else if (guarding) { d = 7; FX.text(tg2.x, tg2.cy - 96, '咒种吸食防御咒力', '#b8e85c', 18); }
                        if (casting || guarding) tg2.energy = Math.max(0, tg2.energy - 6);
                        if (!tg2.dead) {
                            tg2.hp -= d;
                            FX.burst(tg2.x, tg2.cy, '#b8e85c', 7, 3, 16, 2);
                            FX.crack(tg2.x, GROUND, '#5a7a3a', 2, 26);
                            if (tg2.hp <= 0) {
                                tg2.hp = 0;
                                tg2.die();
                            }
                        }
                    }, 640);
                }
            }));
            AudioSys.play('dash');
            FX.text(this.x, this.cy - 140, '咒种', '#b8e85c', 28);
        }
        if (k === 'skill3' && S1) {
            /* 树鞠：具现化漂浮木球，伸出两根树根连续突刺后消失 */
            const kem = new Projectile({
                owner: this,
                x: this.x + this.facing * 70,
                y: this.cy - 92,
                vx: this.facing * 3.2,
                vy: -0.6,
                w: 46,
                h: 46,
                life: 74,
                color: '#8fe87b',
                type: 'kemari',
                anim: 0,
                consume: false,
                update2: () => {
                    kem.vx *= 0.93;
                    kem.vy = Math.sin(kem.anim * 0.16) * 0.65;
                },
                onHit: (tg2) => {
                    tg2.takeHit(this, { dmg: 8, stun: 12, kb: 4, shake: 4, hitstop: 4, spark: '#8fe87b', sound: 'hit1' });
                }
            });
            game.projs.push(kem);
            AudioSys.play('cast');
            /* 两段根刺：从树鞠射向敌人当前位置 */
            for (let s = 0; s < 2; s++) {
                game.delayed.push({
                    t: 12 + s * 20,
                    fn: () => {
                        if (this.dead || kem.dead) return;
                        const t2 = this.foe;
                        const tx2 = t2 ? t2.x : kem.x + this.facing * 260;
                        const ty2 = t2 ? t2.cy - 10 : kem.y;
                        const ang = Math.atan2(ty2 - kem.y, tx2 - kem.x);
                        const sp = 17;
                        FX.burst(kem.x, kem.y, '#b8e88c', 8, 4, 14, 3);
                        AudioSys.play('dash');
                        game.projs.push(new Projectile({
                            owner: this,
                            x: kem.x,
                            y: kem.y,
                            vx: Math.cos(ang) * sp,
                            vy: Math.sin(ang) * sp,
                            w: 110,
                            h: 26,
                            life: 24,
                            color: '#a8d87c',
                            type: 'rootlance',
                            anim: 0,
                            onHit: (t3) => {
                                t3.takeHit(this, { dmg: s === 1 ? 16 : 12, stun: 20, kb: 6, launch: s === 1 ? 8 : 0, shake: 7, hitstop: 7, spark: '#8fe87b', sound: s === 1 ? 'hit3' : 'hit2' });
                            }
                        }));
                        /* 第二根刺出后树鞠完成使命，碎成光点消失 */
                        if (s === 1) {
                            game.delayed.push({
                                t: 6,
                                fn: () => {
                                    if (kem.dead) return;
                                    kem.dead = true;
                                    FX.burst(kem.x, kem.y, '#8fe87b', 14, 5, 20, 3);
                                    FX.ring(kem.x, kem.y, '#b8e88c', 46, 4);
                                }
                            });
                        }
                    }
                });
            }
            FX.text(this.x, this.cy - 140, '树鞠', '#8fe87b', 28);
        }
    }
    if (id === 'jogo') {
        if (k === 'skill1' && S1) {
            /* 火焰术式：肆意操控火焰——任意处召唤三座丘状小火山，依次破土喷出烈焰 */
            FX.text(this.x, this.cy - 140, '火焰术式', '#ff9a3c', 28);
            AudioSys.play('cast');
            const foe = this.foe;
            const xs = [
                this.x + this.facing * 100,
                this.x + this.facing * 205,
                foe ? foe.x : this.x + this.facing * 310
            ];
            xs.forEach((rx, i) => {
                game.delayed.push({
                    t: 2 + i * 7,
                    fn: () => {
                        if (this.dead) return;
                        FX.burst(rx, GROUND - 8, '#6e4a2a', 8, 4, 18, 3); /* 破土碎岩 */
                        game.projs.push(new Projectile({
                            owner: this,
                            x: rx,
                            y: GROUND - 30,
                            vx: 0,
                            vy: 0,
                            w: 60,
                            h: 96,
                            life: 44,
                            color: '#ff9a3c',
                            type: 'mound',
                            anim: 0,
                            consume: false,
                            onHit: () => {},
                            update2(game) {
                                if (this.anim === 12) {
                                    /* 火山口喷发瞬间 */
                                    FX.pillar(this.x, 'rgba(255,120,40,0.95)', 48, 250);
                                    FX.burst(this.x, GROUND - 60, '#ff6a2a', 16, 8, 28, 4, true);
                                    FX.addShake(6);
                                    AudioSys.play('slam');
                                    const t2 = game.fighters[1 - this.owner.side];
                                    if (t2 && t2.hittable() && Math.abs(t2.x - this.x) < 62 && t2.cy > GROUND - 260) {
                                        t2.takeHit(this.owner, { dmg: 12, stun: 18, kb: 4, launch: 8, shake: 6, hitstop: 6, spark: '#ff6a2a', sound: 'hit2' });
                                    }
                                }
                            }
                        }));
                    }
                });
            });
        }
        if (k === 'skill2' && S1) {
            /* 火烁虫：头顶火山养育的蚊形咒虫——一段声波震惑，二段俯冲爆炸（很灵巧） */
            FX.text(this.x, this.cy - 140, '火烁虫', '#ffb060', 28);
            FX.burst(this.x, this.cy - 96, '#ff9a3c', 10, 5, 20, 3, true); /* 火山口喷焰放虫 */
            AudioSys.play('cast');
            game.projs.push(new Projectile({
                owner: this,
                x: this.x + this.facing * 18,
                y: this.cy - 96,
                vx: this.facing * 7,
                vy: -1.8,
                w: 44,
                h: 40,
                life: 110,
                color: '#ff9a3c',
                type: 'firebug',
                anim: 0,
                consume: false,
                phase: 0,
                onHit: () => {},
                update2(game) {
                    const t2 = game.fighters[1 - this.owner.side];
                    if (!t2 || t2.dead) { if (this.anim > 80) this.dead = true; return; }
                    const dx = t2.x - this.x,
                        dy = (t2.cy - 24) - this.y,
                        d = Math.abs(dx);
                    if (this.phase === 0) {
                        /* 巡飞逼近：波浪飞行 + 微追踪 */
                        this.vy += dy * 0.006 + Math.sin(this.anim * 0.3) * 0.12;
                        this.vy = Math.max(-2.6, Math.min(2.6, this.vy));
                        if (d < 120) {
                            /* 一段：悬停，锈利口器前指释放声波 */
                            this.phase = 1;
                            this.phaseT = this.anim;
                            this.vx *= 0.12;
                            this.vy *= 0.2;
                            FX.ring(this.x, this.y, '#ffd8a0', 96, 9);
                            FX.ring(this.x, this.y, '#ffb060', 62, 7);
                            AudioSys.play('howl');
                            if (t2.hittable() && d < 150) {
                                t2.takeHit(this.owner, { dmg: 7, stun: 20, kb: 2, shake: 5, hitstop: 5, spark: '#ffd8a0', sound: 'hit1' });
                            }
                        }
                    } else if (this.phase === 1 && this.anim > this.phaseT + 16) {
                        /* 二段：锁定俯冲 */
                        this.phase = 2;
                        const a = Math.atan2((t2.cy - 10) - this.y, dx || this.owner.facing);
                        this.vx = Math.cos(a) * 12;
                        this.vy = Math.sin(a) * 12;
                        AudioSys.play('dash');
                    } else if (this.phase === 2) {
                        if ((d < 46 && Math.abs(t2.cy - this.y) < 70) || this.anim > this.phaseT + 46) {
                            /* 自爆 */
                            this.dead = true;
                            FX.flash('#ffb060', 0.28, 10);
                            FX.burst(this.x, this.y, '#ff6a2a', 26, 10, 34, 5, true);
                            FX.ring(this.x, this.y, '#ff9a3c', 130, 9);
                            FX.addShake(9);
                            AudioSys.play('slam');
                            if (t2.hittable() && Math.abs(t2.x - this.x) < 96 && Math.abs(t2.cy - this.y) < 110) {
                                t2.takeHit(this.owner, { dmg: 15, stun: 24, kb: 7, launch: 6, shake: 8, hitstop: 8, spark: '#ff6a2a', sound: 'hit2', dmgColor: '#ff9a3c' });
                            }
                        }
                    }
                }
            }));
        }
        if (k === 'skill3' && S1) {
            /* 极之番·陨：仅次于领域展开的大招——巨大炽热陨石，锁定施放瞬间落点（命中率不佳，可预判躲避） */
            const tg = this.foe;
            const tx = tg ? tg.x + tg.vx * 6 : this.x + this.facing * 260;
            FX.text(this.x, this.cy - 150, '极之番 · 陨', '#ff9a3c', 32);
            FX.flash('#ff9a3c', 0.22, 14);
            AudioSys.play('ult');
            /* 落点预警：地面灼热光环 */
            for (let i = 0; i < 3; i++) FX.ring(tx, GROUND - 20, 'rgba(255,120,40,0.8)', 200 - i * 50, 26);
            game.projs.push(new Projectile({
                owner: this,
                x: tx,
                y: -140,
                vx: 0,
                vy: 4.6,
                w: 170,
                h: 170,
                life: 160,
                color: '#ff6a2a',
                trail: true,
                type: 'meteor',
                anim: 0,
                onHit: () => {},
                consume: false,
                update2(game) {
                    this.vy = Math.min(this.vy + 0.12, 9);   /* 越坠越快 */
                    if (this.anim % 5 === 0) FX.addShake(2); /* 坠落轰鸣 */
                    if (this.y >= GROUND - 60) {
                        this.dead = true;
                        FX.flash('#ffb060', 0.6, 20);
                        FX.addShake(20);
                        AudioSys.play('slam');
                        AudioSys.play('ult');
                        FX.burst(this.x, GROUND - 40, '#ff6a2a', 60, 15, 60, 8, true);
                        FX.burst(this.x, GROUND - 40, '#ffd23c', 30, 11, 44, 5, true);
                        FX.ring(this.x, GROUND - 40, '#ff9a3c', 280, 12);
                        FX.pillar(this.x, 'rgba(255,150,60,0.9)', 120, 320);
                        const t2 = game.fighters[1 - this.owner.side];
                        if (t2 && t2.hittable() && Math.abs(t2.x - this.x) < 230) {
                            t2.takeHit(this.owner, { dmg: 46, stun: 38, kb: 15, launch: 12, shake: 18, hitstop: 15, spark: '#ff6a2a', sound: 'hit3', dmgColor: '#ff9a3c' });
                        }
                        /* 撞击后熔岩迸溅余波 */
                        const ix = this.x,
                            ow = this.owner;
                        for (let i = 0; i < 2; i++) {
                            game.delayed.push({
                                t: 10 + i * 12,
                                fn: () => {
                                    const lx = ix + (i === 0 ? -110 : 110);
                                    FX.pillar(lx, 'rgba(255,120,40,0.8)', 36, 150);
                                    FX.burst(lx, GROUND - 20, '#ff6a2a', 10, 6, 22, 3, true);
                                    const t3 = game.fighters[1 - ow.side];
                                    if (t3 && t3.hittable() && Math.abs(t3.x - lx) < 50 && t3.onGround) {
                                        t3.takeHit(ow, { dmg: 8, stun: 14, kb: 3, shake: 4, hitstop: 4, spark: '#ff6a2a', sound: 'hit1' });
                                    }
                                }
                            });
                        }
                    }
                }
            }));
        }
    }
    if (id === 'dagon') {
        if (k === 'skill1' && S1) {
            /* 激流·水铁炮：压缩海水凝成高压水弹，三连射贯穿冲击 */
            FX.text(this.x, this.cy - 140, '激流 · 水铁炮', '#59c8e8', 28);
            AudioSys.play('cast');
            for (let i = 0; i < 3; i++) {
                game.delayed.push({
                    t: i * 6,
                    fn: () => {
                        if (this.dead) return;
                        const last = i === 2;
                        FX.burst(this.x + this.facing * 40, this.cy - 14, '#d8f4ff', 6, 4, 14, 3);
                        AudioSys.play('beam');
                        game.projs.push(new Projectile({
                            owner: this,
                            x: this.x + this.facing * 44,
                            y: this.cy - 14 + (i - 1) * 8,
                            vx: this.facing * (11 + i),
                            vy: 0,
                            w: last ? 56 : 40,
                            h: last ? 30 : 22,
                            life: 70,
                            color: '#59c8e8',
                            type: 'waterjet',
                            anim: 0,
                            big: last,
                            onHit: (t2) => {
                                t2.takeHit(this, last
                                    ? { dmg: 13, stun: 22, kb: 8, launch: 4, shake: 7, hitstop: 7, spark: '#59c8e8', sound: 'hit2', dmgColor: '#7adcd4' }
                                    : { dmg: 7, stun: 16, kb: 4, shake: 4, hitstop: 4, spark: '#59c8e8', sound: 'hit1' });
                                FX.burst(t2.x, t2.cy, '#d8f4ff', 12, 6, 20, 3);
                            }
                        }));
                    }
                });
            }
        }
        if (k === 'skill2' && S1) {
            /* 水阵壁：环身水屏障护体减伤，屏障随后化为激流奔涌淹没对手 */
            FX.text(this.x, this.cy - 140, '水阵壁', '#59c8e8', 30);
            FX.ring(this.x, this.cy, '#59c8e8', 110, 8);
            FX.ring(this.x, this.cy, '#d8f4ff', 70, 6);
            AudioSys.play('cast');
            /* 展开瞬间：近身水压推开对手 */
            const foe0 = this.foe;
            if (foe0 && foe0.hittable() && Math.abs(foe0.x - this.x) < 100) {
                foe0.takeHit(this, { dmg: 6, stun: 14, kb: 8, shake: 4, hitstop: 4, spark: '#59c8e8', sound: 'hit1' });
            }
            /* 护体减伤45%，持续90帧 */
            this.d.dmgTaken *= 0.55;
            game.delayed.push({ t: 90, fn: () => { this.d.dmgTaken /= 0.55; } });
            /* 环身水幕视觉：跟随本体的无伤害水屏障 */
            const self = this;
            game.projs.push(new Projectile({
                owner: this,
                x: this.x,
                y: this.cy,
                vx: 0,
                vy: 0,
                w: 0,
                h: 0,
                life: 90,
                color: '#59c8e8',
                type: 'waterwall',
                anim: 0,
                consume: false,
                onHit: () => {},
                update2() { this.x = self.x; this.y = self.cy; }
            }));
            /* 屏障化激流：延时56帧向前奔涌的宽幅水墙 */
            game.delayed.push({
                t: 56,
                fn: () => {
                    if (this.dead) return;
                    FX.burst(this.x + this.facing * 50, this.cy, '#59c8e8', 18, 8, 26, 4);
                    AudioSys.play('slam');
                    game.projs.push(new Projectile({
                        owner: this,
                        x: this.x + this.facing * 60,
                        y: this.cy,
                        vx: this.facing * 6.5,
                        vy: 0,
                        w: 100,
                        h: 140,
                        life: 80,
                        color: '#59c8e8',
                        type: 'torrent',
                        anim: 0,
                        onHit: (t2) => {
                            t2.takeHit(this, { dmg: 16, stun: 26, kb: 12, launch: 6, shake: 8, hitstop: 8, spark: '#59c8e8', sound: 'hit2', dmgColor: '#7adcd4' });
                            FX.burst(t2.x, t2.cy, '#d8f4ff', 20, 8, 28, 4);
                        }
                    }));
                }
            });
        }
        if (k === 'skill3' && S1) {
            /* 死累累涌军：食肉鱼式神自水中跃出，三连撕咬 */
            FX.text(this.x, this.cy - 150, '术式解放 · 死累累涌军', '#3ec8c0', 30);
            FX.flash('#59c8e8', 0.2, 10);
            AudioSys.play('ult');
            for (let i = 0; i < 3; i++) {
                game.delayed.push({
                    t: i * 10,
                    fn: () => {
                        if (this.dead) return;
                        const foe = this.foe;
                        const dir = foe ? (foe.x >= this.x ? 1 : -1) : this.facing;
                        /* 瞄准对手：自其身前水面跃出，抛物线掠过躯干高度确保命中 */
                        const tx = foe ? foe.x : this.x + dir * 260;
                        const sx = tx - dir * (110 + i * 26);
                        const T = 16; /* 预计 T 帧后穿过对手所在横位 */
                        const last = i === 2;
                        /* 入水溅起 */
                        FX.burst(sx, GROUND - 10, '#d8f4ff', 12, 6, 20, 3);
                        FX.ring(sx, GROUND - 12, 'rgba(89,200,232,0.7)', 50, 5);
                        AudioSys.play('dash');
                        game.projs.push(new Projectile({
                            owner: this,
                            x: sx,
                            y: GROUND - 24,
                            vx: (tx - sx) / T + dir * 1.5,
                            vy: -7.2 - i * 0.6,
                            gravP: 0.32,
                            w: last ? 84 : 66,
                            h: last ? 54 : 44,
                            life: 90,
                            color: '#3ec8c0',
                            type: 'shark',
                            anim: 0,
                            big: last,
                            onHit: (t2) => {
                                t2.takeHit(this, last
                                    ? { dmg: 17, stun: 26, kb: 8, launch: 7, shake: 9, hitstop: 9, spark: '#3ec8c0', sound: 'hit3', dmgColor: '#7adcd4' }
                                    : { dmg: 11, stun: 20, kb: 5, shake: 6, hitstop: 6, spark: '#3ec8c0', sound: 'hit2' });
                                FX.burst(t2.x, t2.cy, '#59c8e8', 16, 7, 24, 4);
                            }
                        }));
                    }
                });
            }
        }
    }
    if (id === 'naoya') {
        if (k === 'skill1') {
            // 脑内预演：将一秒分为24帧预设动作
            if (t === 4) FX.text(this.x, this.cy - 148, '一秒二十四分割——', '#e8f0b0', 20);
            // 三段帧格瞬发突进：每段瞬间加速，段间刷帧静止（帧与帧之间没有过程）
            if (t === this.castAt || t === this.castAt + 7 || t === this.castAt + 14) {
                const seg = Math.round((t - this.castAt) / 7); // 0/1/2 段
                this.vx = this.facing * (15 + seg * 3);
                AudioSys.play('dash');
                FX.burst(this.x - this.facing * 26, this.cy, '#d8e84a', 6, 4, 12, 2);
                FX.ring(this.x, this.cy, 'rgba(225,240,110,0.5)', 46, 3);
                const last = seg === 2;
                this.makeBox(96, 76, 74, -98, last
                    ? { dmg: 13, stun: 26, kb: 11, launch: 5, shake: 8, hitstop: 9, spark: '#d8e84a', sound: 'hit3' }
                    : { dmg: 7, stun: 18, kb: 2, shake: 4, hitstop: 4, spark: '#d8e84a', sound: 'hit1' });
                if (seg === 0) FX.text(this.x, this.cy - 130, '投射咒法 · 24帧突进', '#d8e84a', 26);
                if (last) FX.slash(this.x + this.facing * 70, this.cy, this.facing > 0 ? -0.2 : Math.PI + 0.2, '#e8f0b0', 130);
            }
            // 段间刷帧瞬停：帧格之间的凝滞感
            if (t === this.castAt + 3 || t === this.castAt + 10) this.vx = 0;
        }
        if (k === 'skill2' && S1) {
            // 探掌触碰：被触碰者必须以1/24秒为单位行动，失败则定帧冻结
            this.makeBox(96, 88, 76, -100, { dmg: 8, stun: 12, kb: 0, shake: 3, hitstop: 6, sound: 'hit1', spark: '#d8e84a' });
            FX.text(this.x, this.cy - 140, '投射咒法 · 定帧掌', '#d8e84a', 26);
            game.delayed.push({
                t: 3,
                fn: () => {
                    if (this.dead) return;
                    const tg = this.foe;
                    if (tg && tg.hittable() && Math.abs(tg.x - (this.x + this.facing * 76)) < 105 && Math.abs(tg.cy - this.cy) < 95) {
                        // 强制同步失败：1秒内的行动被冻结（60帧）
                        tg.setState('hurt');
                        tg.hurtLen = 60;
                        tg.vx = 0;
                        tg.vy = 0;
                        AudioSys.play('block');
                        FX.flash('#e8f0b0', 0.22, 8);
                        FX.text(tg.x, tg.cy - 118, '定帧冻结 · 1/24秒', '#e8f0b0', 24);
                        FX.ring(tg.x, tg.cy, '#d8e84a', 90, 5);
                        // 冻结期间帧格刻度环逐次闪现
                        for (let i = 0; i < 4; i++) game.delayed.push({
                            t: 10 + i * 13,
                            fn: () => {
                                if (tg.dead || tg.state !== 'hurt') return;
                                FX.ring(tg.x, tg.cy - 16, 'rgba(225,240,110,0.45)', 54 + i * 9, 3);
                            }
                        });
                    }
                }
            });
        }
        if (k === 'skill3') {
            // 蓄力期：向前方空域逐层冻结空气（凝滞环逐次收束）
            if (t === 6) FX.text(this.x, this.cy - 148, '冻结空气——', '#c8d8e8', 22);
            if (t === 10 || t === 16 || t === 22) {
                const fx2 = this.x + this.facing * 150;
                FX.ring(fx2, this.cy - 10, 'rgba(200,220,235,0.55)', 74 - (t - 10) * 1.5, 3);
                AudioSys.play('block');
            }
            if (S1) FX.text(this.x, this.cy - 142, '空气爆炸', '#e8f0b0', 30);
            // 一拳击碎冻结的空气 → 大规模爆炸
            if (t === this.castAt + 4) {
                const tx = this.x + this.facing * 150;
                FX.flash('#e8f0b0', 0.45, 14);
                FX.addShake(13);
                AudioSys.play('slam');
                FX.crack(tx, this.cy - 10, 'rgba(220,235,245,0.8)', 7, 90);
                FX.burst(tx, this.cy, '#d8e84a', 34, 12, 40, 5);
                FX.burst(tx, this.cy - 16, '#e8f0d0', 16, 8, 28, 3);
                FX.ring(tx, this.cy, '#e8f0b0', 190, 8);
                FX.ring(tx, this.cy, 'rgba(200,220,235,0.6)', 130, 5);
                const tg = this.foe;
                if (tg && tg.hittable() && Math.abs(tg.x - tx) < 190 && Math.abs(tg.cy - this.cy) < 140) {
                    tg.takeHit(this, { dmg: 30, stun: 30, kb: 14, launch: 8, shake: 12, hitstop: 11, spark: '#d8e84a', sound: 'hit3' });
                }
            }
        }
    }
    if (id === 'toji') {
        if (k === 'skill1') {
            /* 释魂刀·斩魂：拔刀低身 → 无视硬度的二连斩（无法格挡，直斩魂魄） */
            if (t === 6) AudioSys.play('dash');
            if (t === this.castAt || t === this.castAt + 10) {
                const seg = t === this.castAt ? 0 : 1;
                this.vx = this.facing * 7;
                AudioSys.play(seg ? 'hit3' : 'hit2');
                this.makeBox(120, 86, 92, -100, seg === 0 ?
                    { dmg: 11, stun: 20, kb: 5, shake: 6, hitstop: 6, spark: '#cfe0f8', sound: 'hit2', unblockable: true, dmgColor: '#dce8ff' } :
                    { dmg: 14, stun: 26, kb: 9, launch: 4, shake: 9, hitstop: 9, spark: '#cfe0f8', sound: 'hit3', unblockable: true, dmgColor: '#dce8ff' });
                /* 魂斩刃痕：青白主弧 + 幽蓝魂痕反向副弧 */
                FX.slash(this.x + this.facing * 92, this.cy - 6, seg ? 0.5 : -0.5, '#e8f0ff', 140);
                FX.slash(this.x + this.facing * 96, this.cy - 2, seg ? -0.9 : 0.9, '#8fb8f0', 100);
                if (seg === 0) FX.text(this.x + this.facing * 60, this.cy - 120, '斩魂', '#cfe0f8', 24);
            }
        }
        if (k === 'skill2') {
            /* 天逆鉾：换持十手短刃 → 突刺；消解周身咒术弹幕，命中封禁术式3秒 */
            if (t === 8) AudioSys.play('cast');
            if (S1) {
                this.vx = this.facing * 10;
                AudioSys.play('hit3');
                this.makeBox(130, 60, 96, -96, { dmg: 18, stun: 26, kb: 9, shake: 8, hitstop: 9, spark: '#7be8d8', sound: 'hit3' });
                FX.text(this.x, this.cy - 134, '天逆鉾', '#c8d4e8', 26);
                /* 术式解除：消去周身敌方咒术弹幕 */
                for (const p of game.projs) {
                    if (p.owner && p.owner.side !== this.side && Math.abs(p.x - this.x) < 240 && Math.abs(p.y - this.cy) < 160) {
                        p.dead = true;
                        FX.burst(p.x, p.y, '#7be8d8', 10, 5, 18, 3);
                        FX.ring(p.x, p.y, '#7be8d8', 40, 3);
                        FX.text(p.x, p.y - 30, '术式解除', '#7be8d8', 16);
                    }
                }
                /* 命中判定：接触即强制解除发动中的术式 */
                game.delayed.push({
                    t: 3,
                    fn: () => {
                        const tg = this.foe;
                        if (tg && !tg.dead && Math.abs(tg.x - (this.x + this.facing * 96)) < 105 && Math.abs(tg.cy - this.cy) < 100) {
                            tg.skillDisabled = Math.max(tg.skillDisabled, 180);
                            AudioSys.play('block');
                            FX.flash('#7be8d8', 0.2, 8);
                            FX.ring(tg.x, tg.cy, '#7be8d8', 90, 5);
                            FX.text(tg.x, tg.cy - 120, '术式封禁！3秒', '#7be8d8', 24);
                        }
                    }
                });
            }
        }
        if (k === 'skill3') {
            /* 游云：无术式的纯粹物理乱舞，威力随剩余体力提升 */
            const vig = 0.75 + 0.5 * Math.max(0, Math.min(1, this.hp / this.d.maxHp));
            if (t === 8) AudioSys.play('dash');
            if (t === this.castAt || t === this.castAt + 8 || t === this.castAt + 16) {
                /* 前三段：三节棍连打 */
                const seg = (t - this.castAt) / 8;
                this.vx = this.facing * 4;
                this.makeBox(140, 96, 90, -100, { dmg: 6 * vig, stun: 18, kb: 4, shake: 6, hitstop: 5, spark: '#c8d4e8', sound: 'hit2' });
                FX.slash(this.x + this.facing * (80 + seg * 20), this.cy + (seg % 2 ? 20 : -24), rand(0, Math.PI * 2), '#dce8f8', 110);
                AudioSys.play('hit1');
                if (seg === 0) FX.text(this.x, this.cy - 140, '游云', '#c8d4e8', 30);
            }
            if (t === this.castAt + 26) {
                /* 终段：全力抡碎，大范围横扫击飞 */
                this.vx = this.facing * 6;
                AudioSys.play('slam');
                FX.addShake(10);
                FX.ring(this.x + this.facing * 90, this.cy, '#9aa8b8', 150, 7);
                this.makeBox(180, 110, 100, -100, { dmg: 15 * vig, stun: 30, kb: 14, launch: 8, shake: 12, hitstop: 11, spark: '#c8d4e8', sound: 'hit3' });
                FX.slash(this.x + this.facing * 100, this.cy, -0.3, '#ffffff', 170);
            }
        }
    }
    if (id === 'ryu') {
        /* 飞机头炮口位置（发型即炮管，炮口朝前） */
        const mx = this.x + this.facing * 34,
            my = this.cy - 104;
        if (k === 'skill1') {
            /* 咒力放出·冰沙冲击波：炮口聚束咒力 → 轰出贯穿战场的直射冲击波 */
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(mx, my, t % 4 === 0 ? '#5aa8ff' : '#d8e8ff', 3, 96, 15);
                if (t === 8 || t === 15) FX.ring(mx, my, '#5aa8ff', 40, 3);
            }
            if (S1) {
                AudioSys.play('beam');
                FX.addShake(7);
                FX.burst(mx, my, '#5aa8ff', 14, 8, 22, 4, true); /* 炮口冲击 */
                FX.ring(mx, my, '#d8e8ff', 70, 5);
                this.vx = -this.facing * 3; /* 后座力 */
                FX.text(this.x, this.cy - 150, '冰沙冲击波', '#5aa8ff', 28);
                /* 自炮口斜射向目标胸口高度（限幅倾角），命中不同垂直位置的对手 */
                const foe1 = this.foe;
                const aimY1 = foe1 && !foe1.dead ? foe1.cy - 12 : this.cy - 24;
                const ang1 = Math.max(-0.62, Math.min(0.62, Math.atan2(aimY1 - my, Math.max(60, foe1 ? Math.abs(foe1.x - mx) : 200))));
                game.projs.push(new Projectile({
                    owner: this,
                    x: mx + this.facing * 20,
                    y: my,
                    vx: this.facing * 14 * Math.cos(ang1),
                    vy: 14 * Math.sin(ang1),
                    aimY: aimY1,
                    w: 100,
                    h: 76,
                    life: 60,
                    color: '#5aa8ff',
                    type: 'granite',
                    anim: 0,
                    consume: true,
                    update2() {
                        /* 到达瞄准高度后拉平，避免斜插地面或越顶 */
                        if (this.vy !== 0 && ((this.vy > 0 && this.y >= this.aimY) || (this.vy < 0 && this.y <= this.aimY))) { this.y = this.aimY; this.vy = 0; }
                    },
                    onHit: (t2) => {
                        FX.burst(t2.x, t2.cy, '#5aa8ff', 22, 9, 30, 5, true);
                        FX.ring(t2.x, t2.cy, '#d8e8ff', 110, 7);
                        t2.takeHit(this, { dmg: 16, stun: 24, kb: 10, launch: 3, shake: 9, hitstop: 9, spark: '#5aa8ff', sound: 'hit3', dmgColor: '#9ad0ff' });
                    }
                }));
            }
        }
        if (k === 'skill2') {
            /* 追迹冲击波：仰天轰向空中，冲击波在空中转向弧线追踪目标（原作：冲击波可空中变向） */
            if (t < this.castAt && t % 3 === 0) gatherFX(mx, my - 6, '#5aa8ff', 2, 80, 13);
            if (S1) {
                AudioSys.play('beam');
                FX.addShake(5);
                FX.burst(mx, my - 10, '#5aa8ff', 10, 6, 20, 3, true);
                FX.text(this.x, this.cy - 150, '追迹冲击波', '#5aa8ff', 26);
                game.projs.push(new Projectile({
                    owner: this,
                    x: mx,
                    y: my - 14,
                    vx: this.facing * 4,
                    vy: -11,
                    w: 78,
                    h: 48,
                    life: 150,
                    color: '#5aa8ff',
                    type: 'granite',
                    anim: 0,
                    consume: true,
                    homing: true,
                    onHit: (t2) => {
                        FX.burst(t2.x, t2.cy, '#5aa8ff', 20, 9, 28, 5, true);
                        FX.ring(t2.x, t2.cy, '#d8e8ff', 100, 7);
                        t2.takeHit(this, { dmg: 15, stun: 24, kb: 7, launch: 7, shake: 8, hitstop: 8, spark: '#5aa8ff', sound: 'hit3', dmgColor: '#9ad0ff' });
                    },
                    update2(game) {
                        const t2 = game.fighters[1 - this.owner.side];
                        if (!t2 || t2.dead) return;
                        if (this.anim > 14) {
                            /* 空中转向：逐帧向目标方向偏转，弧线追踪 */
                            const ta = Math.atan2((t2.cy - 16) - this.y, t2.x - this.x);
                            const ca = Math.atan2(this.vy, this.vx);
                            let da = ta - ca;
                            while (da > Math.PI) da -= Math.PI * 2;
                            while (da < -Math.PI) da += Math.PI * 2;
                            const na = ca + Math.max(-0.09, Math.min(0.09, da));
                            const sp = Math.min(13, Math.hypot(this.vx, this.vy) + 0.35);
                            this.vx = Math.cos(na) * sp;
                            this.vy = Math.sin(na) * sp;
                        }
                        if (this.anim % 3 === 0) FX.burst(this.x, this.y, '#5aa8ff', 2, 2, 12, 2); /* 咒力尾焰 */
                    }
                }));
            }
        }
        if (k === 'skill3') {
            /* 咒力放出·连珠炮：史上最强咒力输出全开，扎马蓄力后连轰五发冲击波 */
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(mx, my, '#5aa8ff', 3, 110, 14);
                if (t === 6) FX.text(this.x, this.cy - 150, '咒力放出——全开！', '#9ad0ff', 24);
                if (t === this.castAt - 4) FX.ring(mx, my, '#d8e8ff', 60, 5);
            }
            if (t >= this.castAt && t < this.castAt + 40 && (t - this.castAt) % 8 === 0) {
                const seg = (t - this.castAt) / 8; /* 0..4 五连发 */
                AudioSys.play('beam');
                FX.addShake(5);
                FX.burst(mx, my, '#5aa8ff', 9, 6, 18, 3, true);
                this.vx = -this.facing * 1.6; /* 逐发后座 */
                if (seg === 0) FX.text(this.x, this.cy - 150, '连珠炮', '#5aa8ff', 30);
                /* 每发瞄准目标当前高度（齐射微散布），弹幕追随不同垂直位置的对手 */
                const foe3 = this.foe;
                const aimY3 = (foe3 && !foe3.dead ? foe3.cy - 12 : this.cy - 24) + (seg % 2 ? 8 : -6);
                const ang3 = Math.max(-0.62, Math.min(0.62, Math.atan2(aimY3 - my, Math.max(60, foe3 ? Math.abs(foe3.x - mx) : 200))));
                const sp3 = 12 + seg * 0.6;
                game.projs.push(new Projectile({
                    owner: this,
                    x: mx + this.facing * 16,
                    y: my,
                    vx: this.facing * sp3 * Math.cos(ang3),
                    vy: sp3 * Math.sin(ang3),
                    aimY: aimY3,
                    w: 72,
                    h: 58,
                    life: 56,
                    color: '#5aa8ff',
                    type: 'granite',
                    anim: 0,
                    consume: true,
                    small: true,
                    update2() {
                        /* 到达瞄准高度后拉平 */
                        if (this.vy !== 0 && ((this.vy > 0 && this.y >= this.aimY) || (this.vy < 0 && this.y <= this.aimY))) { this.y = this.aimY; this.vy = 0; }
                    },
                    onHit: (t2) => {
                        FX.burst(t2.x, t2.cy, '#5aa8ff', 12, 7, 22, 4, true);
                        t2.takeHit(this, { dmg: 7, stun: 16, kb: 4, shake: 5, hitstop: 4, spark: '#5aa8ff', sound: 'hit2', dmgColor: '#9ad0ff' });
                    }
                }));
            }
        }
    }
    if (id === 'uro') {
        /* 握住天空平面的手位（胸前推掌处） */
        const ux = this.x + this.facing * 30,
            uy = this.cy - 30;
        if (k === 'skill1') {
            /* 宇守罗弹：抓住「天空平面」后一掌击出，如切割薄冰般轰出空之碎片 */
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(ux, uy, t % 4 === 0 ? '#9adcff' : '#e8f6ff', 3, 90, 14);
                if (t === 6 || t === 13) FX.ring(ux, uy, 'rgba(154,220,255,0.7)', 36, 3);
            }
            if (S1) {
                AudioSys.play('beam');
                FX.addShake(6);
                FX.burst(ux, uy, '#9adcff', 12, 7, 20, 4, true);
                FX.ring(ux, uy, '#e8f6ff', 64, 5);
                FX.slash(ux, uy, this.facing > 0 ? -0.35 : Math.PI + 0.35, '#d8f2ff', 90); /* 平面开裂痕 */
                FX.text(this.x, this.cy - 150, '宇守罗弹', '#9adcff', 28);
                /* 自掌心斜射向目标胸口高度（限幅倾角） */
                const foeU = this.foe;
                const aimYU = foeU && !foeU.dead ? foeU.cy - 12 : this.cy - 24;
                const angU = Math.max(-0.62, Math.min(0.62, Math.atan2(aimYU - uy, Math.max(60, foeU ? Math.abs(foeU.x - ux) : 200))));
                game.projs.push(new Projectile({
                    owner: this,
                    x: ux + this.facing * 14,
                    y: uy,
                    vx: this.facing * 13 * Math.cos(angU),
                    vy: 13 * Math.sin(angU),
                    aimY: aimYU,
                    w: 84,
                    h: 72,
                    life: 62,
                    color: '#9adcff',
                    type: 'skyplane',
                    anim: 0,
                    consume: true,
                    update2() {
                        /* 到达瞄准高度后拉平 */
                        if (this.vy !== 0 && ((this.vy > 0 && this.y >= this.aimY) || (this.vy < 0 && this.y <= this.aimY))) { this.y = this.aimY; this.vy = 0; }
                    },
                    onHit: (t2) => {
                        FX.burst(t2.x, t2.cy, '#9adcff', 18, 8, 26, 4, true);
                        FX.ring(t2.x, t2.cy, '#e8f6ff', 96, 6);
                        FX.slash(t2.x, t2.cy, rand(0, Math.PI * 2), '#d8f2ff', 100);
                        t2.takeHit(this, { dmg: 15, stun: 22, kb: 9, launch: 3, shake: 8, hitstop: 8, spark: '#9adcff', sound: 'hit3', dmgColor: '#c8ecff' });
                    }
                }));
            }
        }
        if (k === 'skill2') {
            /* 天空·反拨：抓住身前天空翻掌反拨——弹返敌方弹幕并震开近身之敌（原作：可用天空平面弹开对手攻击） */
            if (t < this.castAt && t % 3 === 0) gatherFX(ux, uy, '#9adcff', 2, 70, 12);
            if (S1) {
                AudioSys.play('block');
                FX.addShake(5);
                FX.ring(ux, uy, '#9adcff', 90, 6);
                FX.text(this.x, this.cy - 150, '天空 · 反拨', '#9adcff', 26);
                /* 震开近身之敌 */
                const tgU = this.foe;
                if (tgU && !tgU.dead && Math.abs(tgU.x - this.x) < 150 && tgU.hittable()) {
                    tgU.takeHit(this, { dmg: 8, stun: 18, kb: 14, launch: 5, shake: 7, hitstop: 6, spark: '#9adcff', sound: 'hit2', dmgColor: '#c8ecff' });
                }
            }
            /* 弹反窗口：castAt 后 22 帧内，反转飞抵身前的敌方弹幕 */
            if (t >= this.castAt && t < this.castAt + 22) {
                if (t % 3 === 0) FX.ring(ux, uy - 6, 'rgba(154,220,255,' + (0.5 - (t - this.castAt) * 0.015).toFixed(3) + ')', 66 + (t - this.castAt) * 2, 2);
                for (const p of game.projs) {
                    if (p.dead || p.owner === this || p.reflected) continue;
                    if (Math.abs(p.x - this.x) < 190 && Math.abs(p.y - this.cy) < 170) {
                        /* 拨转归属与方向，如拍碎薄冰般弹回 */
                        p.reflected = true;
                        p.owner = this;
                        p.vx = -p.vx * 1.1;
                        p.vy = -Math.abs(p.vy) * 0.4;
                        p.hitSet = new Set();
                        AudioSys.play('block');
                        FX.burst(p.x, p.y, '#9adcff', 10, 6, 18, 3, true);
                        FX.slash(p.x, p.y, rand(0, Math.PI * 2), '#e8f6ff', 70);
                        FX.addShake(4);
                    }
                }
            }
        }
        if (k === 'skill3') {
            /* 空之断层：连续撕裂头顶天空，三道断层剪切自天而降 */
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(this.x, this.cy - 120, '#9adcff', 3, 120, 13);
                if (t === 6) FX.text(this.x, this.cy - 150, '天空，是我的掌中之物。', '#c8ecff', 20);
                if (t === this.castAt - 4) FX.ring(this.x, this.cy - 130, '#e8f6ff', 56, 4);
            }
            if (t >= this.castAt && t < this.castAt + 27 && (t - this.castAt) % 9 === 0) {
                const segU = (t - this.castAt) / 9; /* 0..2 三连断层 */
                AudioSys.play('beam');
                FX.addShake(5);
                if (segU === 0) FX.text(this.x, this.cy - 150, '空之断层', '#9adcff', 30);
                const foeS = this.foe;
                /* 断层落点：追随目标当前位置，三道左中右微散布 */
                const dxU = foeS && !foeS.dead ? foeS.x : this.x + this.facing * 220;
                const bxU = dxU + (segU - 1) * 46;
                FX.slash(bxU, this.cy - 200, Math.PI / 2 + (segU - 1) * 0.12, '#d8f2ff', 150); /* 天空裂痕预兆 */
                game.projs.push(new Projectile({
                    owner: this,
                    x: bxU,
                    y: this.cy - 250,
                    vx: 0,
                    vy: 15,
                    w: 54,
                    h: 130,
                    life: 40,
                    color: '#9adcff',
                    type: 'skyshear',
                    anim: 0,
                    consume: true,
                    onHit: (t2) => {
                        FX.burst(t2.x, t2.cy, '#9adcff', 14, 7, 24, 4, true);
                        FX.slash(t2.x, t2.cy, Math.PI / 2, '#e8f6ff', 130);
                        t2.takeHit(this, { dmg: 9, stun: 18, kb: 3, launch: segU === 2 ? 7 : 0, shake: 6, hitstop: 5, spark: '#9adcff', sound: 'hit2', dmgColor: '#c8ecff' });
                    },
                    update2() {
                        if (this.anim % 2 === 0) FX.burst(this.x, this.y, 'rgba(216,242,255,0.8)', 2, 2, 10, 2);
                    }
                }));
            }
        }
    }
    if (id === 'druv') {
        /* 差遣式神的手位（扬臂下令处） */
        const dxh = this.x + this.facing * 26,
            dyh = this.cy - 46;
        if (k === 'skill1') {
            /* 赤空噬咬：赤鳍式神破空突进撕咬，掠过轨迹燃起赤红领域残光 */
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(dxh, dyh, t % 4 === 0 ? '#ff6a52' : '#ffb09a', 3, 90, 14);
                if (t === 6 || t === 13) FX.ring(dxh, dyh, 'rgba(255,116,88,0.7)', 36, 3);
            }
            if (S1) {
                AudioSys.play('beam');
                FX.addShake(6);
                FX.burst(dxh, dyh, '#ff6a52', 12, 7, 20, 4, true);
                FX.ring(dxh, dyh, '#ffd6c8', 60, 5);
                FX.text(this.x, this.cy - 150, '赤空噬咬', '#ff8a6a', 28);
                /* 自扬臂处斜射向目标胸口高度（限幅倾角） */
                const foeD = this.foe;
                const aimYD = foeD && !foeD.dead ? foeD.cy - 10 : this.cy - 20;
                const angD = Math.max(-0.5, Math.min(0.5, Math.atan2(aimYD - dyh, Math.max(60, foeD ? Math.abs(foeD.x - dxh) : 200))));
                game.projs.push(new Projectile({
                    owner: this,
                    x: dxh + this.facing * 12,
                    y: dyh,
                    vx: this.facing * 12 * Math.cos(angD),
                    vy: 12 * Math.sin(angD),
                    aimY: aimYD,
                    w: 92,
                    h: 60,
                    life: 66,
                    color: '#ff6a52',
                    type: 'redfish',
                    anim: 0,
                    consume: true,
                    update2() {
                        /* 到达瞄准高度后拉平 */
                        if (this.vy !== 0 && ((this.vy > 0 && this.y >= this.aimY) || (this.vy < 0 && this.y <= this.aimY))) { this.y = this.aimY; this.vy = 0; }
                        /* 掠过之处燃起赤红领域残光 */
                        if (this.anim % 3 === 0) FX.burst(this.x - Math.sign(this.vx || 1) * 22, this.y, 'rgba(255,90,60,0.55)', 2, 2, 14, 2);
                    },
                    onHit: (t2) => {
                        FX.burst(t2.x, t2.cy, '#ff6a52', 18, 8, 26, 4, true);
                        FX.ring(t2.x, t2.cy, '#ffd6c8', 92, 6);
                        FX.slash(t2.x, t2.cy, rand(0, Math.PI * 2), '#ffb09a', 96);
                        t2.takeHit(this, { dmg: 15, stun: 22, kb: 9, launch: 3, shake: 8, hitstop: 8, spark: '#ff6a52', sound: 'hit3', dmgColor: '#ffc4b0' });
                    }
                }));
            }
        }
        if (k === 'skill2') {
            /* 赤轨护领：式神绕身回游结成赤红轨迹环——撞开近敌并咬碎来弹 */
            if (t < this.castAt && t % 3 === 0) gatherFX(this.x, this.cy - 40, '#ff6a52', 2, 70, 12);
            if (S1) {
                AudioSys.play('block');
                FX.addShake(5);
                FX.ring(this.x, this.cy - 40, '#ff6a52', 90, 6);
                FX.text(this.x, this.cy - 150, '赤轨护领', '#ff8a6a', 26);
                /* 式神出环瞬间撞开近身之敌 */
                const tgD = this.foe;
                if (tgD && !tgD.dead && Math.abs(tgD.x - this.x) < 150 && tgD.hittable()) {
                    tgD.takeHit(this, { dmg: 9, stun: 18, kb: 14, launch: 5, shake: 7, hitstop: 6, spark: '#ff6a52', sound: 'hit2', dmgColor: '#ffc4b0' });
                }
            }
            /* 回游窗口：castAt 后 34 帧内式神绕身，咬碎飞抵近身的敌方弹幕 */
            if (t >= this.castAt && t < this.castAt + 34) {
                const od = t - this.castAt;
                const oa = od * 0.28;
                const ox = this.x + Math.cos(oa) * 84,
                    oy = this.cy - 36 + Math.sin(oa) * 40;
                if (t % 2 === 0) FX.burst(ox, oy, od % 4 < 2 ? '#ff6a52' : '#ffb09a', 2, 3, 12, 2); /* 式神回游残光 */
                if (t % 6 === 0) FX.ring(this.x, this.cy - 36, 'rgba(255,116,88,' + (0.45 - od * 0.008).toFixed(3) + ')', 70 + od * 1.6, 2);
                for (const p of game.projs) {
                    if (p.dead || p.owner === this) continue;
                    if (Math.abs(p.x - this.x) < 130 && Math.abs(p.y - this.cy) < 150) {
                        /* 式神一口咬碎弹幕 */
                        p.dead = true;
                        AudioSys.play('block');
                        FX.burst(p.x, p.y, '#ff6a52', 10, 6, 18, 3, true);
                        FX.slash(p.x, p.y, rand(0, Math.PI * 2), '#ffd6c8', 60);
                        FX.addShake(4);
                    }
                }
            }
        }
        if (k === 'skill3') {
            /* 合围狩猎：两只式神自目标两侧相向差遣夹击 */
            if (t < this.castAt) {
                if (t % 2 === 0) { gatherFX(this.x - 40, this.cy - 50, '#ff6a52', 2, 90, 13); gatherFX(this.x + 40, this.cy - 50, '#ffb09a', 2, 90, 13); }
                if (t === 6) FX.text(this.x, this.cy - 150, '式神啊——狩猎开始了。', '#ffc4b0', 19);
                if (t === this.castAt - 4) FX.ring(this.x, this.cy - 50, '#ffd6c8', 56, 4);
            }
            if (S1) {
                AudioSys.play('beam');
                FX.addShake(6);
                FX.text(this.x, this.cy - 150, '双式神 · 合围狩猎', '#ff8a6a', 28);
                const foeP = this.foe;
                const cxP = foeP && !foeP.dead ? foeP.x : this.x + this.facing * 240;
                const cyP = foeP && !foeP.dead ? foeP.cy - 8 : this.cy - 24;
                /* 两只式神自目标两侧 260px 处相向而行，错开高度交错合围 */
                for (let s = 0; s < 2; s++) {
                    const sideD = s === 0 ? -1 : 1;
                    FX.slash(cxP + sideD * 190, cyP, sideD > 0 ? Math.PI : 0, 'rgba(255,116,88,0.6)', 90); /* 入场轨迹预兆 */
                    game.projs.push(new Projectile({
                        owner: this,
                        x: cxP + sideD * 260,
                        y: s === 0 ? cyP - 24 : cyP + 10,
                        vx: -sideD * 11,
                        vy: 0,
                        w: 92,
                        h: 56,
                        life: 52,
                        color: '#ff6a52',
                        type: 'redfish',
                        anim: 0,
                        consume: true,
                        update2() {
                            if (this.anim % 3 === 0) FX.burst(this.x - Math.sign(this.vx || 1) * 22, this.y, 'rgba(255,90,60,0.5)', 2, 2, 12, 2);
                        },
                        onHit: (t2) => {
                            FX.burst(t2.x, t2.cy, '#ff6a52', 14, 7, 24, 4, true);
                            FX.slash(t2.x, t2.cy, rand(0, Math.PI * 2), '#ffd6c8', 110);
                            t2.takeHit(this, { dmg: 10, stun: 18, kb: 4, launch: s === 1 ? 7 : 0, shake: 6, hitstop: 5, spark: '#ff6a52', sound: 'hit2', dmgColor: '#ffc4b0' });
                        }
                    }));
                }
            }
        }
    }
    if (id === 'kuro') {
        /* 驱虫发号的口器位（俯身低鸣处） */
        const kxh = this.x + this.facing * 22,
            kyh = this.cy - 40;
        if (k === 'skill1') {
            /* 噬铁潮：咒力强化的蟑螂大军结成奔流扑咬 */
            if (t < this.castAt) {
                if (t % 2 === 0) gatherFX(kxh, kyh, t % 4 === 0 ? '#e0862e' : '#4a1a2e', 3, 88, 14);
                if (t === 6 || t === 13) FX.ring(kxh, kyh, 'rgba(224,134,70,0.65)', 34, 3);
            }
            if (S1) {
                AudioSys.play('beam');
                FX.addShake(6);
                FX.burst(kxh, kyh, '#e0862e', 16, 8, 22, 4, true);
                FX.burst(kxh, kyh, '#2c1812', 12, 6, 18, 3, true);
                FX.ring(kxh, kyh, '#f0b060', 58, 5);
                FX.text(this.x, this.cy - 150, '咒蟑奔流 · 噬铁潮', '#f0a050', 26);
                /* 蟑螂奔流斜扑向目标胸口高度 */
                const foeK = this.foe;
                const aimYK = foeK && !foeK.dead ? foeK.cy - 8 : this.cy - 18;
                const distK = Math.max(60, foeK ? Math.abs(foeK.x - kxh) : 200);
                /* 差遣一支蟑螂大军：多股奔流分批涌出、纵向铺开，逐波连环咬噬 */
                const spawnRoachWave = (offY, spd, wpx, hpx, dmg, stun, kb, lead) => {
                    if (this.dead) return;
                    const ay = aimYK + offY;
                    const ang = Math.max(-0.5, Math.min(0.5, Math.atan2(ay - (kyh + offY), distK)));
                    game.projs.push(new Projectile({
                        owner: this,
                        x: kxh + this.facing * 10,
                        y: kyh + offY,
                        vx: this.facing * spd * Math.cos(ang),
                        vy: spd * Math.sin(ang),
                        aimY: ay,
                        w: wpx,
                        h: hpx,
                        life: 78,
                        color: '#e0862e',
                        type: 'roachtide',
                        anim: irand(0, 20),
                        consume: true,
                        update2() {
                            /* 到达目标高度后拉平 */
                            if (this.vy !== 0 && ((this.vy > 0 && this.y >= this.aimY) || (this.vy < 0 && this.y <= this.aimY))) { this.y = this.aimY; this.vy = 0; }
                            /* 奔流后方零散逃窜的虫群碎影 */
                            if (this.anim % 3 === 0) FX.burst(this.x - Math.sign(this.vx || 1) * 30, this.y + (this.anim % 6 - 3) * 4, 'rgba(44,24,18,0.6)', 2, 2, 12, 2);
                        },
                        onHit: (t2) => {
                            if (lead) {
                                FX.burst(t2.x, t2.cy, '#e0862e', 16, 8, 26, 4, true);
                                FX.burst(t2.x, t2.cy, '#2c1812', 10, 6, 20, 3, true);
                                FX.ring(t2.x, t2.cy, '#f0b060', 86, 6);
                            } else {
                                FX.burst(t2.x, t2.cy + rand(-14, 14), '#2c1812', 6, 5, 16, 3, true);
                                FX.burst(t2.x, t2.cy, '#e0862e', 4, 4, 14, 2, true);
                            }
                            t2.takeHit(this, { dmg, stun, kb, launch: lead ? 2 : 0, shake: lead ? 8 : 3, hitstop: lead ? 8 : 3, spark: '#e0862e', sound: lead ? 'hit3' : 'hit2', dmgColor: '#f0c090' });
                        }
                    }));
                };
                /* 头波：大股主奔流（前锋咬噬） */
                spawnRoachWave(0, 10, 104, 54, 6, 20, 6, true);
                /* 随后四波：错落分层的蟑螂副流连环追咬（各波稍作延迟、纵向散开） */
                const roachWaves = [
                    { d: 3, off: -20, spd: 11, w: 84, h: 40 },
                    { d: 6, off: 16, spd: 9.5, w: 90, h: 44 },
                    { d: 9, off: -8, spd: 10.5, w: 80, h: 38 },
                    { d: 12, off: 24, spd: 9, w: 86, h: 42 }
                ];
                for (const wv of roachWaves) {
                    game.delayed.push({ t: wv.d, fn: () => spawnRoachWave(wv.off, wv.spd, wv.w, wv.h, 2, 8, 2, false) });
                }
            }
        }
        if (k === 'skill2') {
            /* 烂生刀：拖刀蓄势 → 横斩 + 刀刃空洞射出虫卵 */
            if (t === 8) AudioSys.play('cast');
            if (t < this.castAt && t % 3 === 0) gatherFX(this.x + this.facing * 30, this.cy - 30, '#4a1a2e', 2, 66, 12);
            if (S1) {
                AudioSys.play('hit3');
                FX.addShake(7);
                /* 刀身横斩：钝刀宽刃的近身打击判定 */
                this.makeBox(120, 76, 92, -98, { dmg: 12, stun: 20, kb: 7, shake: 7, hitstop: 7, spark: '#e0862e', sound: 'hit3', dmgColor: '#f0c090' });
                FX.slash(this.x + this.facing * 90, this.cy - 10, this.facing > 0 ? 0.4 : Math.PI - 0.4, '#c8a878', 130);
                FX.slash(this.x + this.facing * 94, this.cy - 6, this.facing > 0 ? -0.7 : Math.PI + 0.7, '#8a5a3a', 96);
                /* 钝刀拖曳的锈蚀残影弧 + 金属钝鸣环 */
                FX.slash(this.x + this.facing * 78, this.cy - 22, this.facing > 0 ? 0.15 : Math.PI - 0.15, '#8a8072', 110);
                FX.ring(this.x + this.facing * 92, this.cy - 12, '#c8b8a0', 46, 4);
                FX.text(this.x, this.cy - 150, '咒具 · 烂生刀', '#d8a868', 26);
                /* 刀刃空洞中泵出两枚虫卵（抛物线） */
                for (let e = 0; e < 2; e++) {
                    game.projs.push(new Projectile({
                        owner: this,
                        x: this.x + this.facing * 46,
                        y: this.cy - 46 - e * 8,
                        vx: this.facing * (7.5 + e * 2.5),
                        vy: -3.5 - e * 1.5,
                        w: 26,
                        h: 26,
                        life: 64,
                        color: '#c8a878',
                        type: 'curseegg',
                        anim: 0,
                        consume: true,
                        update2() {
                            this.vy += 0.32; /* 卵体沿弧线坠落 */
                            if (this.anim % 4 === 0) FX.burst(this.x, this.y, 'rgba(200,168,120,0.5)', 1, 1.5, 10, 2);
                        },
                        onHit: (t2) => {
                            /* 卵碎孵化：幼虫钻附体表，首段撞击后连续咬噬（持续伤害） */
                            FX.burst(t2.x, t2.cy, '#c8a878', 12, 6, 20, 3, true);
                            FX.burst(t2.x, t2.cy - 20, '#2c1812', 8, 5, 16, 3, true);
                            FX.text(t2.x, t2.cy - 90, '幼虫孵化！', '#d8a868', 16);
                            t2.takeHit(this, { dmg: 4, stun: 16, kb: 3, shake: 5, hitstop: 5, spark: '#c8a878', sound: 'hit2', dmgColor: '#f0c090' });
                            /* 幼虫咬噬：附体后每隔片刻咬一口，共四段 */
                            let n = 0;
                            const iv = gameInterval(() => {
                                if (t2.dead || n >= 4) { clearGameInterval(iv); return; }
                                n++;
                                if (!t2.dead) {
                                    t2.hp -= 3;
                                    FX.burst(t2.x + rand(-14, 14), t2.cy + rand(-22, 8), '#2c1812', 4, 3, 12, 2);
                                    FX.burst(t2.x, t2.cy - 8, '#c8a878', 3, 2, 10, 1.5);
                                    FX.text(t2.x + rand(-16, 16), t2.cy - 66, '-3', '#d8a868', 13);
                                    if (n === 4) FX.text(t2.x, t2.cy - 84, '幼虫噬尽', '#8a6a4a', 14);
                                    if (t2.hp <= 0) {
                                        t2.hp = 0;
                                        t2.die();
                                    }
                                }
                            }, 520);
                        }
                    }));
                }
            }
        }
        if (k === 'skill3') {
            /* 土虫蠕定：两只携巨囊的有翅式神自两侧夹击 */
            if (t < this.castAt) {
                if (t % 2 === 0) { gatherFX(this.x - 40, this.cy - 50, '#e0862e', 2, 88, 13); gatherFX(this.x + 40, this.cy - 50, '#b8d44a', 2, 88, 13); }
                if (t === 6) FX.text(this.x, this.cy - 150, '土虫，蠕定——', '#d8c878', 19);
                if (t === this.castAt - 4) FX.ring(this.x, this.cy - 50, '#f0b060', 54, 4);
            }
            if (S1) {
                AudioSys.play('beam');
                FX.addShake(6);
                FX.text(this.x, this.cy - 150, '土虫蠕定', '#f0a050', 28);
                const foeW = this.foe;
                const cxW = foeW && !foeW.dead ? foeW.x : this.x + this.facing * 240;
                const cyW = foeW && !foeW.dead ? foeW.cy - 10 : this.cy - 26;
                /* 两只携囊式神自目标两侧 250px 处振翅相向而行 */
                for (let s = 0; s < 2; s++) {
                    const sideW = s === 0 ? -1 : 1;
                    FX.slash(cxW + sideW * 180, cyW, sideW > 0 ? Math.PI : 0, 'rgba(224,134,70,0.5)', 84);
                    game.projs.push(new Projectile({
                        owner: this,
                        x: cxW + sideW * 250,
                        y: s === 0 ? cyW - 22 : cyW + 8,
                        vx: -sideW * 9,
                        vy: 0,
                        w: 86,
                        h: 58,
                        life: 56,
                        color: '#e0862e',
                        type: 'sacshiki',
                        anim: 0,
                        consume: true,
                        update2() {
                            if (this.anim % 3 === 0) FX.burst(this.x - Math.sign(this.vx || 1) * 20, this.y - 10, 'rgba(224,134,70,0.4)', 2, 2, 12, 2);
                        },
                        onHit: (t2) => {
                            /* 破囊：毒液喷溅侵蚀目光（长硬直） */
                            FX.burst(t2.x, t2.cy, '#b8d44a', 16, 7, 26, 4, true);
                            FX.burst(t2.x, t2.cy - 30, '#e0862e', 10, 6, 20, 3, true);
                            FX.ring(t2.x, t2.cy, 'rgba(184,212,74,0.7)', 92, 6);
                            FX.text(t2.x, t2.cy - 100, '毒液侵目！', '#c8e05a', 17);
                            t2.takeHit(this, { dmg: 10, stun: 30, kb: 4, launch: s === 1 ? 6 : 0, shake: 6, hitstop: 6, spark: '#b8d44a', sound: 'hit2', dmgColor: '#d8e8a0' });
                        }
                    }));
                }
            }
        }
    }
};

/* 前期伏黑惠必杀专用连放：召唤魔虚罗后依次释放 skill1 → skill2 → skill3。
   这是独立时间轴，不调用 startSkill，所以不会触碰普通技能 CD。 */
Fighter.prototype.startMegumiUltSequence = function(game) {
    this.ultSequenceActive = true;
    this.ultSequenceFrame = (game2) => {
        const local = this.st - this.ultSequenceStart;
        if (local < 0) {
            this.ultSequenceLocal = -1;
            return; // 先留出魔虚罗降临的短演出
        }
        const stages = [
            { kind: 'skill1', start: 0, dur: 40, cast: 18 },
            { kind: 'skill2', start: 44, dur: 40, cast: 20 },
            { kind: 'skill3', start: 88, dur: 40, cast: 14 }
        ];
        let stage = stages[stages.length - 1];
        for (const item of stages) {
            if (local >= item.start) stage = item;
        }
        if (this.ultSequenceKind !== stage.kind) {
            this.ultSequenceKind = stage.kind;
            this.skillKind = stage.kind;
            this.skillDur = stage.dur;
            this.castAt = stage.cast;
            this.attackHasHit = false;
            FX.text(this.x, this.cy - 138, stage.kind === 'skill1' ? '玉犬' : (stage.kind === 'skill2' ? '鵺' : '脱兔'), '#b9a8ff', 26);
        }
        this.ultSequenceLocal = local - stage.start;
        if (this.ultSequenceLocal <= stage.dur) this.skillFrame(game2);
        if (local >= 132) {
            this.ultSequenceActive = false;
            this.ultSequenceFrame = null;
            this.ultSequenceKind = null;
            this.ultSequenceLocal = -1;
            this.setState('idle');
        }
    };
    this.ultSequenceStart = this.st + 18;
    this.ultSequenceLocal = -18;
    this.ultSequenceKind = null;
    this.ultDur = this.ultSequenceStart + 134;
};

/* 领域必中伤害：领域直接伤害除了敌方术师，也要检查场上的式神。
   召唤者自己的领域跳过 owner===attacker 的式神；敌方领域则可正常击破魔虚罗。 */
function domainHit(game, attacker, primary, opt) {
    const targets = [];
    if (primary && !primary.dead) targets.push(primary);
    for (const al of game.allies || []) {
        if (!al.dead && al.owner !== attacker) targets.push(al);
    }
    for (const target of targets) {
        if (!target || target.dead) continue;
        target.takeHit(attacker, opt);
    }
}

Fighter.prototype.ultEffect = function(game) {
    const id = this.c.base || this.c.id,
        tg = this.foe;
    // 只有真正拥有领域展开必杀的角色才能参与领域对冲（domain>0 且 ult 为领域展开）
    const hasDomain = hasDomainUlt(this.c);
    if (hasDomain && tg && !tg.dead && tg.state === 'ult' && hasDomainUlt(tg.c) && !game.domainClash) {
        game.startDomainClash(this, tg);
        return;
    }
    this.ultEffectDomainOnly(game);
};

Fighter.prototype.ultEffectDomainOnly = function(game) {
    const id = this.c.base || this.c.id,
        tg = this.foe;
    if (id === 'gojo') {
        game.domain = { owner: this, type: 'muryo', t: 0, dur: 200 };
        /* 领域展开演出：结印 → 白闪 → 无限情报空间 */
        FX.flash('#ffffff', 0.85, 18);
        FX.flash('#bfe8ff', 0.5, 34);
        FX.addZoom(0.1, this.x, this.cy - 20);
        FX.ring(this.x, this.cy - 20, '#bfe8ff', 400, 10);
        FX.ring(this.x, this.cy - 20, '#ffffff', 260, 6);
        gatherFX(this.x, this.cy - 20, '#9fe0ff', 24, 260, 18);
        FX.text(this.x, this.cy - 160, '领域展开', '#e8f4ff', 30);
        if (tg && !tg.dead) {
            tg.setState('hurt');
            tg.hurtLen = 150;
            tg.vx = 0;
            FX.text(tg.x, tg.cy - 120, '情报过多…', '#bfe8ff', 26);
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 5) { clearGameInterval(iv); return; }
                n++;
                /* 无限情报灌入：每段伴随收束粒子与脆弱铃声般的白环 */
                gatherFX(tg.x, tg.cy - 10, '#d8f2ff', 10, 140, 14);
                FX.ring(tg.x, tg.cy - 10, '#ffffff', 70, 3);
                if (!tg.dead) {
                    domainHit(game, this, tg, { dmg: 14, stun: 44, kb: 0.5, launch: 0, shake: 6, hitstop: 6, spark: '#bfe8ff', sound: 'hit2', isDomain: true });
                    /* 无量空处：目标呆滞原地，强制清除位移 */
                    tg.vx = 0;
                    tg.vy = 0;
                }
            }, 620);
        }
    }
    if (id === 'megumi') {
        /* 召唤仪式：影之柱 → 手影结印 → 魔虚罗降临 */
        FX.flash('#0c0818', 0.55, 16);
        FX.flash('#e8e4ff', 0.5, 26);
        FX.addZoom(0.08, this.x, this.cy - 20);
        FX.pillar(this.x - this.facing * 140, 'rgba(150,130,255,0.55)', 110, 420);
        FX.ring(this.x, this.cy, '#8f7bff', 200, 9);
        gatherFX(this.x - this.facing * 140, GROUND - 80, '#8f7bff', 24, 220, 20);
        gatherFX(this.x - this.facing * 140, GROUND - 80, '#171226', 12, 180, 18);
        FX.text(this.x, this.cy - 160, '布瑠部由良由良', '#b9a8ff', 26);
        if (this.mahoraga && !this.mahoraga.dead) {
            this.mahoraga.hp = this.mahoraga.maxHp;
            this.mahoraga.permanent = true;
            this.mahoraga.life = Infinity;
            FX.text(this.x, this.cy - 120, '魔虚罗 · 再适应', '#e8e4ff', 30);
        } else {
            this.mahoraga = new Mahoraga(this);
            game.allies.push(this.mahoraga);
        }
        this.startMegumiUltSequence(game);
        game.delayed.push({
            t: 22,
            fn: () => {
                if (this.dead) return;
                FX.text(this.x, this.cy - 150, '八握剑异戒神将', '#e8e4ff', 30);
                FX.text(this.x, this.cy - 110, '魔虚罗', '#ffffff', 44);
                FX.addShake(10);
                AudioSys.play('slam');
            }
        });
        AudioSys.play('ult');
    }
    if (id === 'megumi2') {
        game.domain = { owner: this, type: 'chimera', t: 0, dur: 210 };
        /* 领域展开演出：影水漫延 → 暗翳吞没 */
        FX.flash('#08041a', 0.75, 16);
        FX.flash('#8f7bff', 0.4, 30);
        FX.addZoom(0.1, this.x, this.cy - 20);
        FX.ring(this.x, this.cy, '#6a5cff', 320, 10);
        FX.ring(this.x, this.cy, '#b9a8ff', 180, 6);
        gatherFX(this.x, this.cy - 10, '#8f7bff', 26, 240, 20);
        gatherFX(this.x, GROUND - 20, '#120c22', 16, 200, 18);
        FX.text(this.x, this.cy - 160, '领域展开', '#d8d2ff', 30);
        game.delayed.push({ t: 26, fn: () => { if (!this.dead) FX.text(this.x, this.cy - 150, '嵌合暗翳庭', '#8f7bff', 34); } });
        /* 战术型领域：让全场充斥影子并赋予四重优势
           ① 影中式神无穷：技能冷却飞速回复，可连续召唤多个式神围攻
           ② 潜影偷袭：闪避时没入影中，自敌人影子背后盲点现身
           ③ 影子替身：受击时由影替身代承（每次领域 2 次）
           ④ 影海式神潮：领域期间影中不断生成式神轮番袭击敌人（不含魔虚罗） */
        this.shadowSub = 2;
        this._ambushed = false;
        game.delayed.push({ t: 44, fn: () => { if (!this.dead) { FX.text(this.x, this.cy - 150, '影海漫延·式神无穷', '#b9a8ff', 24); FX.text(this.x, this.cy - 118, '闪避＝潜影偷袭', '#9a8fd8', 20); } } });
        if (!this._shadowWrapped) {
            this._shadowWrapped = true;
            const origHit = this.takeHit.bind(this);
            this.takeHit = (foe2, opt) => {
                const act = game.domain && game.domain.type === 'chimera' && game.domain.owner === this;
                const blocking = (this.state === 'block' || this.blockHeld) && this.onGround;
                if (act && this.shadowSub > 0 && !this.dead && !blocking && this.invuln <= 0 && this.state !== 'dodge') {
                    this.shadowSub--;
                    /* 影子替身代承攻击：本体自暗翳中脱出 */
                    FX.burst(this.x, this.cy, '#171226', 18, 8, 30, 5);
                    FX.ring(this.x, this.cy, '#8f7bff', 70, 5);
                    FX.text(this.x, this.cy - 110, '影子替身！', '#b9a8ff', 26);
                    AudioSys.play('cast');
                    this.x = Math.max(70, Math.min(VW - 70, this.x - this.facing * 92));
                    this.invuln = Math.max(this.invuln, 16);
                    FX.burst(this.x, this.cy, '#8f7bff', 10, 5, 20, 4);
                    return;
                }
                origHit(foe2, opt);
            };
        }
        const iv = gameInterval(() => {
            const act = game.domain && game.domain.type === 'chimera' && game.domain.owner === this && !this.dead;
            if (!act) { clearGameInterval(iv); this.shadowSub = 0; return; }
            /* ① 影中式神无穷：额外冷却回复 */
            if (this.cd.skill1 > 0) this.cd.skill1 = Math.max(0, this.cd.skill1 - 9);
            if (this.cd.skill2 > 0) this.cd.skill2 = Math.max(0, this.cd.skill2 - 9);
            if (this.cd.skill3 > 0) this.cd.skill3 = Math.max(0, this.cd.skill3 - 9);
            /* ② 潜影偷袭：闪避时没入影中，瞬移至敌人影子背后 */
            const tg2 = this.foe;
            if (this.state === 'dodge' && !this._ambushed && tg2 && !tg2.dead) {
                this._ambushed = true;
                FX.burst(this.x, this.cy, '#171226', 14, 7, 24, 4);
                FX.ring(this.x, GROUND - 8, '#241a4e', 50, 4);
                this.x = Math.max(70, Math.min(VW - 70, tg2.x - tg2.facing * 78));
                this.y = GROUND;
                this.vy = 0;
                this.vx = 0;
                this.facing = tg2.x >= this.x ? 1 : -1;
                this.invuln = Math.max(this.invuln, 20);
                FX.ring(this.x, GROUND - 10, '#6a5cff', 64, 4);
                FX.burst(this.x, this.cy, '#8f7bff', 12, 6, 22, 4);
                FX.text(this.x, this.cy - 110, '影中偷袭！', '#b9a8ff', 24);
                AudioSys.play('dash');
            } else if (this.state !== 'dodge') this._ambushed = false;
        }, 50);
        /* ④ 影海式神潮：影玉犬→影鵺→影兔潮→影大蛇 四相循环袭击 */
        let wv = 0;
        const ivS = gameInterval(() => {
            const act2 = game.domain && game.domain.type === 'chimera' && game.domain.owner === this && !this.dead;
            if (!act2) { clearGameInterval(ivS); return; }
            const tg3 = this.foe;
            if (!tg3 || tg3.dead) return;
            wv++;
            const dir2 = tg3.x >= this.x ? 1 : -1;
            const ph2 = wv % 4;
            if (ph2 === 1) {
                /* 影玉犬双犬：白·浑一前一后自影中窜出扑咬 */
                AudioSys.play('howl');
                for (let i = 0; i < 2; i++) {
                    const sx2 = this.x + dir2 * (50 - i * 34);
                    FX.burst(sx2, GROUND - 18, i === 0 ? '#e8ecff' : '#120c22', 8, 4, 16, 3);
                    game.projs.push(new Projectile({
                        owner: this, x: sx2, y: GROUND - 26,
                        vx: dir2 * (10 + i * 1.5), w: 96, h: 52, life: 60,
                        color: i === 0 ? '#e8ecff' : '#8f7bff',
                        type: 'gyokuken', white: i === 0, kon: i === 1, anim: i * 7,
                        onHit: (h2) => {
                            h2.takeHit(this, { dmg: 6, stun: 20, kb: 4, shake: 5, hitstop: 5, spark: '#b9a8ff', sound: 'hit1', isDomain: true });
                            FX.burst(h2.x, h2.cy, '#b9a8ff', 10, 5, 20, 3);
                        }
                    }));
                }
            } else if (ph2 === 2) {
                /* 影鵺：自领域上空俯冲雷击（动态追踪） */
                AudioSys.play('howl');
                game.projs.push(new Projectile({
                    owner: this, x: this.x + dir2 * 60, y: 70, vx: dir2 * 5, vy: 2,
                    w: 110, h: 60, life: 70, color: '#ffe45c', trail: true, type: 'nue', anim: 0,
                    update2() {
                        const f2 = this.owner.foe;
                        const tx2 = f2 && !f2.dead ? f2.x : this.x + this.vx * 10;
                        if (this.y < GROUND - 60) { this.vy += 0.35; this.vx = Math.sign(tx2 - this.x) * 6; }
                        else { this.vy = 2; this.vx = Math.sign(tx2 - this.x) * 10; }
                    },
                    onHit: (h2) => {
                        h2.takeHit(this, { dmg: 7, stun: 22, kb: 3, shake: 5, hitstop: 5, spark: '#ffe45c', sound: 'hit1', isDomain: true });
                        FX.burst(h2.x, h2.cy, '#ffe45c', 12, 5, 20, 3);
                    }
                }));
            } else if (ph2 === 3) {
                /* 影兔潮：三只影兔弹跳冲撞 */
                for (let i = 0; i < 3; i++) {
                    game.projs.push(new Projectile({
                        owner: this, x: this.x + dir2 * (24 + i * 16), y: GROUND - 12,
                        vx: dir2 * (7 + i * 1.4), vy: -4 - (i % 3), gravP: 0.5,
                        w: 40, h: 30, life: 50, color: '#cfc6ff', type: 'rabbit', anim: i * 4,
                        update2() {
                            if (this.y >= GROUND - 8) {
                                this.y = GROUND - 8;
                                this.vy = -(3.5 + (this.anim % 3));
                            }
                        },
                        onHit: (h2) => {
                            h2.takeHit(this, { dmg: 2, stun: 12, kb: 2, shake: 3, hitstop: 3, spark: '#cfc6ff', sound: 'hit1', isDomain: true });
                        }
                    }));
                }
            } else {
                /* 影大蛇：自敌人脚下影中窜出吞咬 */
                AudioSys.play('slam');
                FX.burst(tg3.x, GROUND - 10, '#120c22', 14, 6, 24, 4);
                FX.ring(tg3.x, GROUND - 10, '#7be8a8', 66, 4);
                game.projs.push(new Projectile({
                    owner: this, x: tg3.x, y: GROUND + 30, vx: 0, vy: -10,
                    w: 120, h: 160, life: 40, color: '#7be8a8', type: 'orochi', anim: 0, consume: false,
                    update2() {
                        if (this.y <= GROUND - 115) {
                            this.y = GROUND - 115;
                            this.vy = 0;
                        }
                    },
                    onHit: (h2) => {
                        h2.takeHit(this, { dmg: 9, stun: 24, kb: 6, launch: 6, shake: 8, hitstop: 7, spark: '#7be8a8', sound: 'hit2', isDomain: true });
                        FX.burst(h2.x, h2.cy, '#7be8a8', 14, 6, 24, 4);
                    }
                }));
            }
        }, 420);
    }
    if (id === 'yuji') {
        /* 黑闪五连击：连续五次黑闪暴击，每拳都触发空间扭曲
           判定与动画同步：ultT0 记录连击起点帧，渲染层用同一时间轴驱动出拳；
           五拳判定帧 = ultT0+12+i*14，终结判定帧 = ultT0+88，与出拳全伸展帧一致 */
        FX.flash('#000000', 0.85, 20);
        FX.text(this.x, this.cy - 150, '黑闪五连击', '#ff2b2b', 38);
        this.vx = this.facing * 10;
        this.ultT0 = this.st;
        this.ultDur = this.st + 112; /* 延长 ult 状态覆盖完整连击（默认 90 帧会提前收招，导致后半段判定无动作） */
        for (let i = 0; i < 5; i++) {
            game.delayed.push({
                t: 12 + i * 14,
                fn: () => {
                    /* 被打断（非 ult 状态）即终止后续拳，避免无动作的隔空判定 */
                    if (this.dead || this.state !== 'ult') return;
                    const tg2 = this.foe;
                    this.vx = this.facing * 9;
                    FX.flash('#000000', 0.45, 8);
                    FX.flash('#ff2b2b', 0.28, 8);
                    FX.addShake(12);
                    FX.addHitstop(10);
                    AudioSys.play('blackflash');
                    FX.ring(this.x + this.facing * 70, this.cy, '#ff2b2b', 90 + i * 12, 6);
                    FX.burst(this.x + this.facing * 70, this.cy, '#ff2b2b', 14, 7, 28, 4);
                    if (tg2 && tg2.hittable() && Math.abs(tg2.x - (this.x + this.facing * 80)) < 140 && Math.abs(tg2.cy - this.cy) < 110) {
                        /* 黑闪机制：五连击每拳独立 10% 判定真·黑闪暴击 */
                        const hit = { dmg: 18, stun: 20, kb: 4, shake: 10, hitstop: 8, spark: '#ff2b2b', sound: 'blackflash', dmgColor: '#ff2b2b' };
                        if (!this.tryBlackFlash(tg2, hit)) tg2.takeHit(this, hit);
                    }
                }
            });
        }
        /* 终结一击：第五拳后大爆发 */
        game.delayed.push({
            t: 12 + 5 * 14 + 6,
            fn: () => {
                if (this.dead || this.state !== 'ult') return;
                const tg2 = this.foe;
                FX.flash('#ff2b2b', 0.5, 16);
                FX.addShake(20);
                FX.addHitstop(22);
                FX.addZoom(0.08, this.x + this.facing * 80, this.cy);
                AudioSys.play('blackflash');
                for (let i = 0; i < 6; i++) FX.ring(this.x + this.facing * (50 + i * 28), this.cy, '#ff2b2b', 110 + i * 16, 7);
                FX.burst(this.x + this.facing * 80, this.cy, '#ff2b2b', 40, 14, 48, 6);
                if (tg2 && tg2.hittable() && Math.abs(tg2.x - (this.x + this.facing * 90)) < 160 && Math.abs(tg2.cy - this.cy) < 120) {
                    /* 黑闪机制：终结一击独立 10% 判定 */
                    const hit = { dmg: 34, stun: 40, kb: 18, launch: 12, shake: 20, hitstop: 20, spark: '#ff2b2b', sound: 'blackflash', dmgColor: '#ff2b2b' };
                    if (!this.tryBlackFlash(tg2, hit)) tg2.takeHit(this, hit);
                    FX.text(tg2.x, tg2.cy - 120, '空间扭曲!!', '#ff2b2b', 32);
                }
                /* 黑闪回血 */
                const heal = Math.max(BLACK_FLASH.healAmount, this.d.maxHp * BLACK_FLASH.healRatio) * 2;
                this.hp = Math.min(this.d.maxHp, this.hp + heal);
                FX.text(this.x, this.cy - 60, '+' + Math.round(heal), '#5cff8a', 22);
            }
        });
    }
    if (id === 'yuji2') {
        game.domain = { owner: this, type: 'sendai', t: 0, dur: 240 };
        /* === 领域展开·仙台 精致演出 === */
        /* 第一阶段：空间崩裂前兆 */
        FX.flash('#050008', 0.8, 18);
        FX.addZoom(0.12, this.x, this.cy - 20);
        FX.addHitstop(12);
        /* 空间裂纹从虎杖身体向四周扩散 */
        FX.crack(this.x, this.cy - 20, '#ff2b2b', 7, 160);
        FX.crack(this.x, this.cy - 20, '#c8e8ff', 5, 130);
        FX.ring(this.x, this.cy, '#ff2b2b', 240, 10);
        FX.ring(this.x, this.cy, '#c8e8ff', 160, 7);
        gatherFX(this.x, this.cy - 10, '#ff2b2b', 24, 220, 22);
        gatherFX(this.x, this.cy - 10, '#c8e8ff', 16, 180, 20);
        /* 黑红闪电从虎杖体内爆发 */
        for (let i = 0; i < 4; i++) {
            FX.lightning(this.x, this.cy - 40, this.x + rand(-160, 160), this.cy + rand(-120, 60), '#ff2b2b', 7);
        }
        FX.text(this.x, this.cy - 170, '领域展开', '#c8e8ff', 32);
        /* 第二阶段：领域名称显现 */
        game.delayed.push({ t: 22, fn: () => {
            if (this.dead) return;
            FX.flash('#c8e8ff', 0.35, 12);
            FX.crack(this.x, this.cy - 60, '#c8e8ff', 4, 100);
            FX.text(this.x, this.cy - 150, '仙台', '#ff2b2b', 38);
            FX.soulFragments(this.x, this.cy - 40, 12, '#c8e8ff');
        }});
        /* 第三阶段：连续斩击 + 灵魂裁剪 */
        if (tg && !tg.dead) {
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 8) { clearGameInterval(iv); return; }
                n++;
                /* 蓝白斩击线交叉 */
                FX.slash(tg.x + rand(-55, 55), tg.cy + rand(-55, 55), rand(0, Math.PI), '#c8e8ff', 160);
                FX.slash(tg.x + rand(-35, 35), tg.cy + rand(-35, 35), rand(0, Math.PI * 2), '#ff2b2b', 130);
                /* 黑红闪电贯穿 */
                FX.lightning(tg.x + rand(-80, 80), tg.cy - 80, tg.x + rand(-40, 40), tg.cy + 40, '#ff2b2b', 5);
                /* 灵魂碎片飞散 */
                FX.soulFragments(tg.x, tg.cy, 4, '#c8e8ff');
                FX.addShake(7);
                AudioSys.play('hit2');
                if (tg.hittable()) domainHit(game, this, tg, { dmg: 10, stun: 20, kb: 3, shake: 6, hitstop: 5, spark: '#c8e8ff', sound: 'hit2', isDomain: true });
                /* 终结：灵魂剥离大斩 */
                if (n === 8 && !tg.dead) {
                    FX.flash('#0a0010', 0.5, 10);
                    FX.flash('#c8e8ff', 0.45, 16);
                    FX.addShake(16);
                    FX.addHitstop(16);
                    FX.addZoom(0.08, tg.x, tg.cy);
                    /* 巨大十字斩 */
                    FX.slash(tg.x, tg.cy, 0, '#ffffff', 240);
                    FX.slash(tg.x, tg.cy, Math.PI / 2, '#c8e8ff', 220);
                    FX.slash(tg.x, tg.cy, Math.PI / 4, '#ff2b2b', 180);
                    FX.slash(tg.x, tg.cy, -Math.PI / 4, '#ff2b2b', 180);
                    /* 空间崩裂 */
                    FX.crack(tg.x, tg.cy, '#c8e8ff', 8, 180);
                    FX.crack(tg.x, tg.cy, '#ff2b2b', 6, 140);
                    /* 灵魂大量剥离飞散 */
                    FX.soulFragments(tg.x, tg.cy, 20, '#c8e8ff');
                    FX.ring(tg.x, tg.cy, '#c8e8ff', 160, 9);
                    FX.ring(tg.x, tg.cy, '#ff2b2b', 120, 7);
                    /* 闪电爆发 */
                    for (let i = 0; i < 5; i++) {
                        FX.lightning(tg.x, tg.cy, tg.x + rand(-140, 140), tg.cy + rand(-100, 80), i % 2 ? '#c8e8ff' : '#ff2b2b', 6);
                    }
                    FX.text(tg.x, tg.cy - 130, '灵魂剥离', '#c8e8ff', 32);
                    AudioSys.play('blackflash');
                    domainHit(game, this, tg, { dmg: 20, stun: 32, kb: 12, launch: 8, shake: 12, hitstop: 12, spark: '#c8e8ff', sound: 'hit3', isDomain: true });
                }
            }, 380);
        }
    }
    if (id === 'sukunaMegumi') {
        game.domain = { owner: this, type: 'shrine', t: 0, dur: 220 };
        FX.flash('#080006', 0.74, 16);
        FX.flash('#f0d4da', 0.5, 28);
        FX.addZoom(0.1, this.x, this.cy - 30);
        FX.ring(this.x, this.cy, '#d83c55', 210, 10);
        FX.ring(this.x, this.cy, '#f4e4e8', 105, 6);
        gatherFX(this.x, this.cy - 10, '#d83c55', 28, 210, 22);
        FX.text(this.x, this.cy - 158, '领域展开', '#f4e4e8', 32);
        game.delayed.push({ t: 24, fn: () => { if (!this.dead) FX.text(this.x, this.cy - 150, '伏魔御厨子', '#e7687a', 36); } });
        if (tg && !tg.dead) {
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 10) { clearGameInterval(iv); return; }
                n++;
                const angle = rand(0, Math.PI);
                FX.slash(tg.x + rand(-58, 58), tg.cy + rand(-58, 58), angle, '#d83c55', 136);
                FX.slash(tg.x + rand(-38, 38), tg.cy + rand(-38, 38), angle + Math.PI / 2, '#f4dbe0', 102);
                FX.crack(tg.x + rand(-35, 35), GROUND - 5, '#5a1e2e', 3, 55);
                FX.addShake(6);
                if (tg.hittable()) domainHit(game, this, tg, { dmg: 9, stun: 14, kb: 2, shake: 5, hitstop: 3, spark: '#d83c55', sound: 'hit1', isDomain: true });
                if (n === 10 && !tg.dead) {
                    FX.flash('#f4e4e8', 0.34, 12);
                    FX.slash(tg.x, tg.cy, 0, '#ffffff', 230);
                    FX.slash(tg.x, tg.cy, Math.PI / 2, '#d83c55', 210);
                    FX.ring(tg.x, tg.cy, '#e7687a', 155, 9);
                    FX.text(tg.x, tg.cy - 132, '解 · 捌', '#f4e4e8', 30);
                    domainHit(game, this, tg, { dmg: 24, stun: 30, kb: 13, launch: 9, shake: 13, hitstop: 11, spark: '#d83c55', sound: 'hit3', isDomain: true });
                }
            }, 250);
        }
    }
    if (id === 'sukuna') {
        game.domain = { owner: this, type: 'shrine', t: 0, dur: 220 };
        FX.flash('#0a0004', 0.7, 14);
        FX.flash('#ffd9e2', 0.55, 30);
        FX.addZoom(0.1);
        FX.ring(this.x, this.cy, '#ff4d6d', 180, 10);
        FX.ring(this.x, this.cy, '#ffffff', 90, 6);
        gatherFX(this.x, this.cy - 10, '#ff4d6d', 26, 200, 22);
        FX.text(this.x, this.cy - 150, '领域展开', '#ffd9e2', 30);
        game.delayed.push({ t: 26, fn: () => { if (!this.dead) FX.text(this.x, this.cy - 150, '伏魔御厨子', '#ff6d8d', 34); } });
        if (tg && !tg.dead) {
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 12) { clearGameInterval(iv); return; }
                n++;
                // 解×捌无休无止：十字交错斩雨
                const sa = rand(0, Math.PI);
                FX.slash(tg.x + rand(-60, 60), tg.cy + rand(-60, 60), sa, '#ff6d8d', 140);
                FX.slash(tg.x + rand(-40, 40), tg.cy + rand(-40, 40), sa + Math.PI / 2, '#ffd9e2', 105);
                FX.addShake(6);
                if (tg.hittable()) domainHit(game, this, tg, { dmg: 9, stun: 14, kb: 2, shake: 5, hitstop: 3, spark: '#ff6d8d', sound: 'hit1', isDomain: true });
                if (n === 12 && !tg.dead) {
                    // 终结：灶之烈焰同时吞噬
                    FX.flash('#ff9a3c', 0.4, 14);
                    FX.burst(tg.x, tg.cy, '#ff9a3c', 28, 10, 40, 5, true);
                    FX.text(tg.x, tg.cy - 130, '解体', '#ffd9e2', 30);
                    domainHit(game, this, tg, { dmg: 26, stun: 30, kb: 14, launch: 10, shake: 14, hitstop: 12, spark: '#ff6d8d', sound: 'hit3', isDomain: true });
                }
            }, 230);
        }
    }
    if (id === 'okkotsu') {
        game.domain = { owner: this, type: 'swords', t: 0, dur: 240 };
        /* === 领域展开·真赝相爱 精致演出 === */
        /* 第一阶段：拔刀插入地面，里香完全显现，领域展开 */
        FX.flash('#d8fff4', 0.65, 20);
        FX.flash('#b89aff', 0.35, 30);
        FX.addZoom(0.1, this.x, this.cy - 20);
        FX.addHitstop(10);
        FX.ring(this.x, this.cy, '#7be8d8', 220, 10);
        FX.ring(this.x, this.cy, '#b89aff', 140, 7);
        FX.ring(this.x, this.cy - 60, '#e8d8ff', 90, 5);
        gatherFX(this.x, this.cy - 10, '#7be8d8', 22, 200, 20);
        gatherFX(this.x, this.cy - 10, '#b89aff', 14, 160, 18);
        /* 里香显现的黑紫咒力喷发 */
        FX.burst(this.x, this.cy - 60, '#2a1a4a', 16, 8, 30, 6);
        FX.burst(this.x, this.cy - 80, '#b89aff', 12, 6, 26, 4);
        /* 刀剑插满空间的视觉：多根光柱（双色交错 + 白刃点缀） */
        for (let i = 0; i < 8; i++) {
            const cols = ['rgba(123,232,216,0.7)', 'rgba(184,154,255,0.7)', 'rgba(232,240,255,0.6)'];
            FX.pillar(this.x + rand(-320, 320), cols[i % 3], rand(12, 26), rand(200, 380));
        }
        FX.text(this.x, this.cy - 170, '领域展开', '#e8f4ff', 32);
        game.delayed.push({ t: 24, fn: () => {
            if (!this.dead) {
                FX.text(this.x, this.cy - 150, '真赝相爱', '#b89aff', 36);
                FX.crack(this.x, this.cy - 40, '#7be8d8', 5, 120);
                FX.ring(this.x, this.cy - 20, '#ffd764', 60, 4);
            }
        }});
        /* 第二阶段：多段必中斩击 + 里香协助 */
        if (tg && !tg.dead) {
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 8) { clearGameInterval(iv); return; }
                n++;
                const cols = ['#7be8d8', '#b89aff', '#c8e8ff', '#e8d8ff'];
                const col = cols[irand(0, 3)];
                /* 刀剑领域：随机术式斩击（刀光柱 + 交叉斩线） */
                FX.pillar(tg.x + rand(-50, 50), col, 18, rand(180, 320));
                FX.slash(tg.x + rand(-30, 30), tg.cy + rand(-40, 40), rand(0, Math.PI * 2), col, 130);
                FX.slash(tg.x, tg.cy, rand(0, Math.PI), '#ffffff', 90);
                /* 奇数段：里香黑紫爪影副击 */
                if (n % 2 === 1) {
                    FX.slash(tg.x + rand(-20, 20), tg.cy + rand(-20, 20), rand(-0.6, 0.6), '#2a1a4a', 110);
                    FX.burst(tg.x, tg.cy - 20, '#b89aff', 5, 5, 16, 3);
                }
                FX.addShake(5);
                AudioSys.play('hit2');
                if (tg.hittable()) domainHit(game, this, tg, { dmg: 10, stun: 18, kb: 3, shake: 5, hitstop: 4, spark: col, sound: 'hit2', isDomain: true });
                /* 终结：里香与乙骨共同斩杀 */
                if (n === 8 && !tg.dead) {
                    FX.flash('#b89aff', 0.45, 14);
                    FX.flash('#7be8d8', 0.3, 10);
                    FX.addShake(14);
                    FX.addHitstop(14);
                    FX.addZoom(0.07, tg.x, tg.cy);
                    /* 里香巨腕 + 乙骨刀斩同时命中 */
                    FX.slash(tg.x, tg.cy, 0.3, '#b89aff', 200);
                    FX.slash(tg.x, tg.cy, -0.4, '#7be8d8', 180);
                    FX.slash(tg.x, tg.cy, Math.PI / 2, '#ffffff', 160);
                    FX.slash(tg.x, tg.cy, 0.9, '#2a1a4a', 150);
                    FX.ring(tg.x, tg.cy, '#b89aff', 140, 8);
                    FX.ring(tg.x, tg.cy, '#7be8d8', 100, 6);
                    FX.ring(tg.x, tg.cy, '#ffd764', 70, 4);
                    FX.burst(tg.x, tg.cy, '#b89aff', 22, 10, 32, 5);
                    FX.burst(tg.x, tg.cy, '#7be8d8', 14, 7, 24, 4);
                    FX.burst(tg.x, tg.cy, '#f0ecf8', 10, 8, 22, 3);
                    FX.crack(tg.x, tg.cy, '#b89aff', 6, 140);
                    FX.text(tg.x, tg.cy - 130, '纯爱斩杀', '#b89aff', 30);
                    AudioSys.play('hit3');
                    domainHit(game, this, tg, { dmg: 22, stun: 32, kb: 12, launch: 8, shake: 12, hitstop: 12, spark: '#b89aff', sound: 'hit3', isDomain: true });
                }
            }, 380);
        }
    }
    if (id === 'mahito') {
        game.domain = { owner: this, type: 'jitaku', t: 0, dur: 200 };
        FX.flash('#c8d8ff', 0.55, 22);
        if (tg && !tg.dead) {
            tg.setState('hurt');
            tg.hurtLen = 120;
            tg.vx = 0;
            FX.text(tg.x, tg.cy - 120, '肉体改造…', '#a8d8ff', 26);
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 4) { clearGameInterval(iv); return; }
                n++;
                FX.burst(tg.x, tg.cy, '#a8d8ff', 16, 7, 26, 4);
                FX.addShake(7);
                if (!tg.dead) domainHit(game, this, tg, { dmg: 16, stun: 34, kb: 4, shake: 7, hitstop: 7, spark: '#a8d8ff', sound: 'hit2', isDomain: true });
            }, 600);
        }
    }
    if (id === 'nanami') {
        /* Overtime·加班时间：激活加班形态（非领域展开） */
        if (!this.overtimeActive) {
            this.overtimeActive = true;
            const cfg = this.c.overtime || { duration: 720, critChance: 0.3, critMul: 2.0 };
            this.overtime = cfg.duration;
        } else {
            // 已激活时刷新持续时间
            const cfg = this.c.overtime || { duration: 720 };
            this.overtime = cfg.duration;
        }
        /* 激活演出特效 */
        FX.flash('#e8c86a', 0.45, 18);
        FX.addShake(12);
        FX.addHitstop(12);
        AudioSys.play('ult');
        FX.burst(this.x, this.cy, '#e8c86a', 30, 10, 40, 5);
        FX.burst(this.x, this.cy, '#ffffff', 15, 6, 30, 4);
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            FX.slash(this.x + Math.cos(a) * 60, this.cy + Math.sin(a) * 50, a, '#e8c86a', 130);
        }
        FX.text(this.x, this.cy - 150, 'Overtime', '#e8c86a', 38);
        FX.text(this.x, this.cy - 120, '加班时间——30%暴击', '#c8a83a', 20);
    }
    if (id === 'kenjaku') {
        /* 领域展开「胎藏遍野」：胎藏曼荼罗展开，亿万咒灵自胎界涌出 */
        game.domain = { owner: this, type: 'taizo', t: 0, dur: 230 };
        FX.flash('#1a0a24', 0.7, 16);
        FX.flash('#b88fd8', 0.4, 30);
        FX.addZoom(0.1, this.x, this.cy - 20);
        FX.ring(this.x, this.cy - 20, '#b88fd8', 420, 10);
        FX.ring(this.x, this.cy - 20, '#e0ccf2', 260, 6);
        gatherFX(this.x, this.cy - 20, '#b88fd8', 26, 280, 18);
        gatherFX(this.x, this.cy - 20, '#4a2a6e', 14, 220, 16);
        FX.text(this.x, this.cy - 168, '领域展开', '#e8dcf8', 30);
        game.delayed.push({
            t: 18,
            fn: () => {
                if (this.dead) return;
                FX.text(this.x, this.cy - 150, '胎藏遍野', '#e0ccf2', 42);
                FX.addShake(9);
                AudioSys.play('slam');
            }
        });
        if (tg && !tg.dead) {
            tg.setState('hurt');
            tg.hurtLen = 140;
            tg.vx = 0;
            FX.text(tg.x, tg.cy - 120, '咒灵之海…', '#b88fd8', 26);
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 6) { clearGameInterval(iv); return; }
                n++;
                /* 每波：咒灵群自四面八方扑咬而至 */
                const side = n % 2 === 0 ? 1 : -1;
                gatherFX(tg.x, tg.cy - 10, '#b88fd8', 12, 170, 14);
                gatherFX(tg.x, tg.cy - 10, '#2a1a3e', 8, 140, 12);
                FX.slash(tg.x + side * rand(10, 40), tg.cy + rand(-30, 30), rand(0, Math.PI * 2), '#b88fd8', 120);
                FX.burst(tg.x, tg.cy, '#6e4a8f', 14, 7, 24, 4);
                FX.ring(tg.x, tg.cy - 10, '#8a6ab8', 70, 4);
                FX.addShake(6);
                if (!tg.dead && tg.hittable()) {
                    domainHit(game, this, tg, { dmg: 13, stun: 30, kb: 2, launch: 0, shake: 6, hitstop: 6, spark: '#b88fd8', sound: 'hit2', isDomain: true });
                }
            }, 520);
        }
    }
    if (id === 'hanami') {
        /* 领域展开「朵颐光海」：花田沉入光海，植物狂暴生长尽食生机 */
        game.domain = { owner: this, type: 'flower', t: 0, dur: 230 };
        FX.flash('#eaffd0', 0.55, 24);
        FX.addShake(8);
        if (tg && !tg.dead) {
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 6) { clearGameInterval(iv); return; }
                n++;
                const last = n === 6;
                const rx = last ? tg.x : tg.x + rand(-130, 130);
                /* 巨根破土 + 花瓣飞舞 + 生机被吸取的收束粒子 */
                FX.crack(rx, GROUND, '#5a7a3a', 3, 50);
                FX.pillar(rx, 'rgba(140,230,120,0.85)', last ? 52 : 34, last ? 300 : rand(150, 250));
                FX.burst(rx, GROUND - 30, '#8fe87b', last ? 20 : 12, 6, 22, 3, true);
                FX.burst(rx, GROUND - 60, '#ef9ab8', last ? 14 : 8, 5, 26, 3);
                gatherFX(tg.x, tg.cy, '#d8ffb0', 8, 110, 14);
                FX.addShake(last ? 8 : 5);
                AudioSys.play(last ? 'slam' : 'hit1');
                /* 花田令人松懈：每波同时吸取目标咒力 */
                tg.energy = Math.max(0, tg.energy - 5);
                if (tg.hittable() && Math.abs(tg.x - rx) < (last ? 110 : 74)) {
                    if (last) domainHit(game, this, tg, { dmg: 18, stun: 26, kb: 6, launch: 9, shake: 9, hitstop: 9, spark: '#ef9ab8', sound: 'hit3', isDomain: true });
                    else domainHit(game, this, tg, { dmg: 13, stun: 20, kb: 4, shake: 5, hitstop: 5, spark: '#8fe87b', sound: 'hit2', isDomain: true });
                }
            }, 440);
        }
    }
    if (id === 'jogo') {
        /* 盖棺铁围山：生得领域——入内者被地狱之火从四面八方点燃，持续灼烧 */
        game.domain = { owner: this, type: 'volcano', t: 0, dur: 230 };
        FX.flash('#ffb060', 0.7, 26);
        FX.addShake(14);
        AudioSys.play('ult');
        if (tg && !tg.dead) {
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 8) { clearGameInterval(iv); return; }
                n++;
                /* 四面八方火柱围灼 */
                for (let s = -1; s <= 1; s++) FX.pillar(tg.x + s * rand(30, 70), 'rgba(255,120,40,0.95)', 54, rand(220, 320));
                FX.burst(tg.x, tg.cy, '#ff6a2a', 22, 10, 32, 5, true);
                FX.burst(tg.x, tg.cy - 20, '#ffd23c', 12, 7, 24, 4, true);
                FX.ring(tg.x, tg.cy, 'rgba(255,150,60,0.6)', 120, 8);
                FX.addShake(9);
                AudioSys.play('slam');
                if (tg.hittable()) domainHit(game, this, tg, { dmg: 15, stun: 22, kb: 4, shake: 7, hitstop: 6, spark: '#ff6a2a', sound: 'hit2', isDomain: true, dmgColor: '#ffb060' });
            }, 360);
        }
    }
    if (id === 'dagon') {
        /* 荡蕴平线：生得领域具现热带海滨——无限鲨鱼式神成群扑咬 */
        game.domain = { owner: this, type: 'ocean', t: 0, dur: 230 };
        FX.flash('#59c8e8', 0.7, 26);
        FX.addShake(14);
        AudioSys.play('ult');
        if (tg && !tg.dead) {
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 8) { clearGameInterval(iv); return; }
                n++;
                /* 每波两头鲨鱼式神自领域海水中现身，交替从两侧扑向对手躯干 */
                for (let s = 0; s < 2; s++) {
                    const dir2 = (s === 0 ? 1 : -1) * (n % 2 ? 1 : -1);
                    const sx = tg.x - dir2 * (150 + s * 46);
                    const sy = tg.cy + rand(-26, 26);
                    FX.burst(sx, sy, '#d8f4ff', 8, 5, 16, 3);
                    game.projs.push(new Projectile({
                        owner: this,
                        x: sx,
                        y: sy,
                        vx: dir2 * (10 + s * 1.5),
                        vy: (tg.cy - sy) / 14,
                        w: 66,
                        h: 44,
                        life: 46,
                        color: '#3ec8c0',
                        type: 'shark',
                        anim: 0,
                        onHit: (t2) => {
                            t2.takeHit(this, { dmg: 8, stun: 18, kb: 2, shake: 6, hitstop: 5, spark: '#3ec8c0', sound: n % 2 ? 'hit2' : 'hit3', isDomain: true, dmgColor: '#7adcd4' });
                            FX.burst(t2.x, t2.cy, '#59c8e8', 12, 6, 20, 3);
                        }
                    }));
                }
                FX.ring(tg.x, tg.cy, 'rgba(89,200,232,0.5)', 90, 6);
                FX.addShake(6);
                AudioSys.play('dash');
            }, 340);
        }
    }
    if (id === 'naoya') {
        game.domain = { owner: this, type: 'palace', t: 0, dur: 200 };
        /* 领域展开演出：白金闪 → 月宫表盘罩下，细胞被细分为术式对象 */
        FX.flash('#f0f8b0', 0.6, 20);
        FX.flash('#ffffff', 0.3, 10);
        FX.addZoom(0.08, this.x, this.cy - 20);
        FX.ring(this.x, this.cy - 20, '#e8f0b0', 320, 8);
        FX.ring(this.x, this.cy - 20, 'rgba(225,240,110,0.5)', 200, 5);
        FX.text(this.x, this.cy - 160, '领域展开', '#f0f8d0', 30);
        if (tg && !tg.dead) {
            tg.setState('hurt');
            tg.hurtLen = 140;
            tg.vx = 0;
            FX.text(tg.x, tg.cy - 120, '每个细胞都是术式对象…', '#d8e84a', 22);
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 6) { clearGameInterval(iv); return; }
                n++;
                // 细胞错位：全身多点微错位斩痕 + 细胞格环
                for (let j = 0; j < 3; j++) FX.slash(tg.x + rand(-36, 36), tg.cy + rand(-46, 40), rand(0, Math.PI * 2), '#d8e84a', 90);
                FX.ring(tg.x + rand(-16, 16), tg.cy + rand(-24, 16), 'rgba(225,240,110,0.5)', 44, 3);
                FX.addShake(6);
                if (!tg.dead) domainHit(game, this, tg, { dmg: 12, stun: 28, kb: 2, shake: 6, hitstop: 5, spark: '#d8e84a', sound: 'hit2', isDomain: true, dmgColor: '#e8f0b0' });
            }, 400);
        }
    }
    if (id === 'toji') {
        /* 天与咒缚·杀戮本能：肉体极限解放11秒——攻防+25%，全程霸体不可打断 */
        if (!this.slaughterActive) {
            this.slaughterActive = true;
            this.slaughter = 660;
            this.d.atkMul *= 1.25;
            this.d.dmgTaken *= 0.8;
        } else {
            this.slaughter = 660; // 重复释放仅刷新持续时间
        }
        /* 解放演出：暗闪转白闪 + 冲击波 + 狂气斩痕 */
        AudioSys.play('howl');
        FX.flash('#0a0c10', 0.5, 12);
        FX.flash('#dce8f8', 0.35, 20);
        FX.addShake(12);
        FX.addZoom(0.08, this.x, this.cy);
        FX.ring(this.x, this.cy, '#9aa8b8', 190, 8);
        FX.ring(this.x, this.cy, '#ffffff', 120, 5);
        FX.burst(this.x, this.cy, '#c8d4e8', 26, 9, 40, 4);
        for (let i = 0; i < 4; i++) FX.slash(this.x + rand(-70, 70), this.cy + rand(-60, 50), rand(0, Math.PI * 2), '#e8f0ff', 120);
        FX.text(this.x, this.cy - 150, '天与咒缚 · 杀戮本能', '#c8d4e8', 32);
        FX.text(this.x, this.cy - 118, '攻防+25% 霸体 11s', '#ff8a8a', 18);
    }
    if (id === 'ryu') {
        /* 领域展开·漫天花火：花火升空绽放之领域，咒力烟花连环炸裂吞没敌人 */
        game.domain = { owner: this, type: 'hanabi', t: 0, dur: 230 };
        FX.flash('#9ad0ff', 0.6, 22);
        FX.flash('#ffffff', 0.3, 10);
        FX.addShake(12);
        FX.addZoom(0.08, this.x, this.cy - 20);
        FX.ring(this.x, this.cy - 20, '#5aa8ff', 340, 9);
        FX.ring(this.x, this.cy - 20, 'rgba(90,168,255,0.5)', 210, 5);
        FX.text(this.x, this.cy - 160, '领域展开', '#d8e8ff', 30);
        AudioSys.play('ult');
        if (tg && !tg.dead) {
            FX.text(tg.x, tg.cy - 120, '也太甜了吧——！！', '#5aa8ff', 22);
            const hues = ['#5aa8ff', '#9ad0ff', '#d8e8ff', '#7fd4ff', '#c8e8ff'];
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 8) { clearGameInterval(iv); return; }
                n++;
                const last = n === 8;
                /* 花火升空：目标周围升起光迹后在头顶炸裂 */
                const c1 = hues[n % hues.length],
                    c2 = hues[(n + 2) % hues.length];
                const bx = tg.x + (last ? 0 : rand(-90, 90)),
                    by = tg.cy - rand(30, 110);
                FX.pillar(bx, 'rgba(90,168,255,0.55)', 10, 200); /* 升空光迹 */
                FX.burst(bx, by, c1, last ? 34 : 20, last ? 12 : 9, last ? 40 : 30, 5, true);
                FX.burst(bx, by, c2, last ? 20 : 12, 7, 24, 4, true);
                FX.ring(bx, by, c1, last ? 170 : 110, 8);
                FX.addShake(last ? 12 : 7);
                AudioSys.play(last ? 'slam' : 'hit2');
                if (tg.hittable()) {
                    if (last) domainHit(game, this, tg, { dmg: 20, stun: 30, kb: 8, launch: 10, shake: 12, hitstop: 10, spark: c1, sound: 'hit3', isDomain: true, dmgColor: '#9ad0ff' });
                    else domainHit(game, this, tg, { dmg: 13, stun: 20, kb: 3, shake: 6, hitstop: 5, spark: c1, sound: 'hit2', isDomain: true, dmgColor: '#9ad0ff' });
                }
            }, 360);
        }
    }
    if (id === 'uro') {
        /* 领域展开·葬空白纱：丧葬白纱与鬼火笼罩之领域，被掌握的整片天空崩落斩击 */
        game.domain = { owner: this, type: 'sora', t: 0, dur: 230 };
        FX.flash('#dceeff', 0.55, 22);
        FX.flash('#ffffff', 0.3, 10);
        FX.addShake(11);
        FX.addZoom(0.08, this.x, this.cy - 20);
        FX.ring(this.x, this.cy - 20, '#9adcff', 330, 9);
        FX.ring(this.x, this.cy - 20, 'rgba(220,238,255,0.6)', 200, 5);
        FX.text(this.x, this.cy - 160, '领域展开', '#e8f4ff', 30);
        AudioSys.play('ult');
        if (tg && !tg.dead) {
            FX.text(tg.x, tg.cy - 120, '你们就这么怕我出人头地吗？！', '#9adcff', 20);
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 8) { clearGameInterval(iv); return; }
                n++;
                const last = n === 8;
                /* 天空崩落：白纱飘卷中断层剪切自头顶砍下 + 鬼火爆裂 */
                const bxD = tg.x + (last ? 0 : rand(-70, 70));
                FX.pillar(bxD, 'rgba(220,238,255,0.5)', last ? 46 : 26, last ? 300 : rand(170, 240));
                FX.slash(bxD, tg.cy - rand(20, 90), Math.PI / 2 + rand(-0.25, 0.25), '#e8f4ff', last ? 190 : 130);
                FX.slash(bxD + rand(-30, 30), tg.cy + rand(-40, 20), rand(0, Math.PI * 2), '#9adcff', 100);
                FX.burst(bxD, tg.cy - 30, '#9adcff', last ? 26 : 14, last ? 11 : 8, last ? 36 : 26, 4, true);
                FX.burst(bxD + rand(-50, 50), tg.cy - rand(40, 110), '#b8e8e0', 8, 5, 20, 3, true); /* 鬼火 */
                FX.ring(bxD, tg.cy - 40, 'rgba(154,220,255,0.7)', last ? 160 : 100, 7);
                FX.addShake(last ? 12 : 7);
                AudioSys.play(last ? 'slam' : 'hit2');
                if (tg.hittable()) {
                    if (last) domainHit(game, this, tg, { dmg: 19, stun: 30, kb: 7, launch: 10, shake: 12, hitstop: 10, spark: '#9adcff', sound: 'hit3', isDomain: true, dmgColor: '#c8ecff' });
                    else domainHit(game, this, tg, { dmg: 13, stun: 20, kb: 3, shake: 6, hitstop: 5, spark: '#9adcff', sound: 'hit2', isDomain: true, dmgColor: '#c8ecff' });
                }
            }, 360);
        }
    }
    if (id === 'druv') {
        /* 领域展开·赤空回游：双式神回游之轨迹染红整片空间，无差别吞噬领域内的一切 */
        game.domain = { owner: this, type: 'akaku', t: 0, dur: 230 };
        FX.flash('#ffd0c0', 0.55, 22);
        FX.flash('#ffffff', 0.3, 10);
        FX.addShake(12);
        FX.addZoom(0.08, this.x, this.cy - 20);
        FX.ring(this.x, this.cy - 20, '#ff6a52', 330, 9);
        FX.ring(this.x, this.cy - 20, 'rgba(255,116,88,0.55)', 200, 5);
        FX.text(this.x, this.cy - 160, '领域展开', '#ffe0d4', 30);
        AudioSys.play('ult');
        if (tg && !tg.dead) {
            FX.text(tg.x, tg.cy - 120, '式神啊——把这片天地染成赤红。', '#ff8a6a', 19);
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 8) { clearGameInterval(iv); return; }
                n++;
                const last = n === 8;
                /* 双式神交错掠咬：左右两侧轮番突进撕咬 + 赤红轨迹残光 */
                const sideA = n % 2 === 0 ? -1 : 1;
                const bxA = tg.x + (last ? 0 : rand(-60, 60));
                const byA = tg.cy - rand(10, 80);
                FX.slash(bxA - sideA * 90, byA, sideA > 0 ? 0 : Math.PI, 'rgba(255,116,88,0.7)', last ? 180 : 120); /* 掠咬轨迹 */
                FX.slash(bxA, byA, rand(0, Math.PI * 2), '#ffd6c8', last ? 150 : 100);
                FX.burst(bxA, byA, '#ff6a52', last ? 26 : 14, last ? 11 : 8, last ? 36 : 26, 4, true);
                FX.burst(bxA + rand(-40, 40), byA - rand(0, 40), '#8a1c10', 8, 5, 20, 3, true); /* 浓赤染空碎光 */
                FX.ring(bxA, byA, 'rgba(255,116,88,0.7)', last ? 160 : 100, 7);
                FX.addShake(last ? 12 : 7);
                AudioSys.play(last ? 'slam' : 'hit2');
                if (tg.hittable()) {
                    if (last) domainHit(game, this, tg, { dmg: 20, stun: 30, kb: 8, launch: 10, shake: 12, hitstop: 10, spark: '#ff6a52', sound: 'hit3', isDomain: true, dmgColor: '#ffc4b0' });
                    else domainHit(game, this, tg, { dmg: 13, stun: 20, kb: 3, shake: 6, hitstop: 5, spark: '#ff6a52', sound: 'hit2', isDomain: true, dmgColor: '#ffc4b0' });
                }
            }, 360);
        }
    }
    if (id === 'kuro') {
        /* 单性生殖·地狱归还：母体咒力全解放——蟑螂海啸吞没对手，孕育新生修复己身 */
        AudioSys.play('howl');
        FX.flash('#0e0b09', 0.5, 14);
        FX.flash('#f0b060', 0.35, 18);
        FX.addShake(12);
        FX.addZoom(0.08, this.x, this.cy - 20);
        FX.ring(this.x, this.cy - 20, '#e0862e', 320, 9);
        FX.ring(this.x, this.cy - 20, 'rgba(224,134,70,0.5)', 190, 5);
        FX.text(this.x, this.cy - 160, '单性生殖 · 地狱归还', '#f0b060', 30);
        AudioSys.play('ult');
        if (tg && !tg.dead) {
            FX.text(tg.x, tg.cy - 120, '乙骨，我从地狱回来了——', '#f0a050', 20);
            let n = 0;
            const iv = gameInterval(() => {
                if (tg.dead || n >= 8) { clearGameInterval(iv); return; }
                n++;
                const last = n === 8;
                /* 蟑螂海啸：两侧轮番涌来的浓密虫浪吞没目标 */
                const sideK = n % 2 === 0 ? -1 : 1;
                const bxK = tg.x + (last ? 0 : rand(-60, 60));
                const byK = tg.cy - rand(6, 70);
                FX.slash(bxK - sideK * 88, byK, sideK > 0 ? 0 : Math.PI, 'rgba(44,24,18,0.75)', last ? 170 : 116); /* 虫浪掠过的暗影 */
                FX.burst(bxK, byK, '#2c1812', last ? 22 : 12, last ? 10 : 7, last ? 32 : 24, 4, true);
                FX.burst(bxK, byK, '#e0862e', last ? 20 : 12, last ? 9 : 7, last ? 30 : 22, 4, true);
                FX.burst(bxK + rand(-40, 40), byK - rand(0, 36), '#4a1a2e', 8, 5, 18, 3, true);
                FX.ring(bxK, byK, 'rgba(224,134,70,0.65)', last ? 150 : 96, 7);
                FX.addShake(last ? 12 : 7);
                AudioSys.play(last ? 'slam' : 'hit2');
                /* 单性生殖：每波虫浪同步孕育新生修复己身 */
                if (!this.dead) {
                    const healK = 6;
                    this.hp = Math.min(this.d.maxHp, this.hp + healK);
                    if (n % 2 === 1) FX.text(this.x, this.cy - 70, '+' + healK, '#8ae05a', 15);
                }
                if (tg.hittable()) {
                    if (last) domainHit(game, this, tg, { dmg: 18, stun: 30, kb: 8, launch: 9, shake: 12, hitstop: 10, spark: '#e0862e', sound: 'hit3', dmgColor: '#f0c090' });
                    else domainHit(game, this, tg, { dmg: 12, stun: 20, kb: 3, shake: 6, hitstop: 5, spark: '#e0862e', sound: 'hit2', dmgColor: '#f0c090' });
                }
            }, 360);
        }
    }
};
