/* =====================================================================
   战斗场景渲染：背景、角色、特效、HUD、CUT-IN、领域对抗
   ===================================================================== */
import { VW, VH, GROUND, hasDomainUlt } from '../config.js';
import { roundRect, easeOut, rand, lerp } from '../utils.js';
import { FX } from '../fx.js';
import { BG, drawDomain } from './background.js';
import { HUD } from './hud.js?v=ai-duel-20260810';
import { drawProjectile } from './projectile.js';
import { drawPortrait } from './portrait.js';

export const FightRenderer = {
    draw(game, ctx, t) {
        BG.draw(ctx, t);
        if (game.domain) drawDomain(ctx, game.domain);
        // 飞行道具（角色下层）
        for (const p of game.projs) drawProjectile(ctx, p, t);
        // 魔虚罗等友军
        for (const al of game.allies) al.draw(ctx);
        // 角色
        const [a, b] = game.fighters;
        if (a) a.draw(ctx);
        if (b) b.draw(ctx);
        FX.draw(ctx);
        HUD.draw(game, ctx, t);
        if (game.cutin) this.drawCutin(game, ctx, t);
        if (game.domainClash) this.drawDomainClash(game, ctx, t);
        // 回合文字
        if (game.roundState === 'intro') {
            const rt = game.roundStateT;
            ctx.textAlign = 'center';
            if (rt < 60) {
                ctx.globalAlpha = Math.min(1, rt / 15);
                ctx.font = '900 64px "Microsoft YaHei"';
                ctx.fillStyle = '#fff';
                ctx.strokeStyle = '#3a2f8f';
                ctx.lineWidth = 8;
                ctx.strokeText(`ROUND ${game.round}`, VW / 2, 300);
                ctx.fillText(`ROUND ${game.round}`, VW / 2, 300);
            } else {
                const k = (rt - 60) / 20;
                ctx.globalAlpha = 1 - Math.max(0, k - 0.5) * 2;
                ctx.font = '900 88px "Microsoft YaHei"';
                ctx.fillStyle = `rgba(255,${80+Math.sin(t*0.5)*40},60)`;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 10;
                ctx.strokeText('FIGHT!', VW / 2, 320);
                ctx.fillText('FIGHT!', VW / 2, 320);
            }
            ctx.globalAlpha = 1;
        }
        if (game.roundState === 'end' && game.roundStateT < 120) {
            const [a, b] = game.fighters;
            const w = a.dead ? b : (b.dead ? a : (a.hp > b.hp ? a : b));
            ctx.textAlign = 'center';
            ctx.font = '900 92px "Microsoft YaHei"';
            const s = easeOut(Math.min(1, game.roundStateT / 20));
            ctx.save();
            ctx.translate(VW / 2, 320);
            ctx.scale(s, s);
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 12;
            ctx.strokeText('K.O.', 0, 0);
            const grd = ctx.createLinearGradient(0, -60, 0, 30);
            grd.addColorStop(0, '#fff');
            grd.addColorStop(0.5, '#ffd76a');
            grd.addColorStop(1, '#ff5c3a');
            ctx.fillStyle = grd;
            ctx.fillText('K.O.', 0, 0);
            ctx.restore();
            ctx.font = '700 34px "Microsoft YaHei"';
            ctx.fillStyle = w.c.color;
            ctx.fillText(`${w.c.name} 拿下本回合`, VW / 2, 380);
        }
    },

    drawCutin(game, ctx, t) {
        const ci = game.cutin,
            f = ci.f,
            ct = ci.t;
        const k = ct < 10 ? ct / 10 : (ct > ci.dur - 10 ? (ci.dur - ct) / 10 : 1);
        ctx.save();
        ctx.globalAlpha = 0.92 * k;
        ctx.fillStyle = '#05050c';
        ctx.beginPath();
        ctx.moveTo(0, 190);
        ctx.lineTo(VW, 120);
        ctx.lineTo(VW, 540);
        ctx.lineTo(0, 610);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = f.c.aura + '0.5)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 26; i++) {
            const y = rand(140, 600);
            ctx.beginPath();
            ctx.moveTo(rand(-100, 300), y);
            ctx.lineTo(rand(600, VW + 100), y - rand(-30, 30));
            ctx.stroke();
        }
        ctx.globalAlpha = k;
        const slide = easeOut(Math.min(1, ct / 16));
        ctx.textAlign = 'center';
        ctx.font = '900 84px "Microsoft YaHei"';
        ctx.fillStyle = f.c.color;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 10;
        const name = ci.name.replace(/\s/g, '');
        ctx.save();
        ctx.translate(VW / 2 + (1 - slide) * 160, 330);
        ctx.strokeText(name, 0, 0);
        ctx.fillText(name, 0, 0);
        ctx.restore();
        ctx.font = '700 30px "Microsoft YaHei"';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.save();
        ctx.translate(VW / 2, 430);
        ctx.strokeText(`「${ci.quote}」`, 0, 0);
        ctx.fillText(`「${ci.quote}」`, 0, 0);
        ctx.restore();
        ctx.save();
        ctx.translate(f.side === 0 ? 200 : VW - 200, 470);
        ctx.scale(f.side === 0 ? 1.9 : -1.9, 1.9);
        ctx.globalAlpha = k * 0.96;
        drawPortrait(ctx, f.c, t);
        ctx.restore();
        ctx.restore();
    },

    drawDomainClash(game, ctx, t) {
        const dc = game.domainClash,
            ct = dc.t;
        // 防御性校验：仅当双方都具备领域展开能力时才绘制领域对冲界面
        if (!hasDomainUlt(dc.fa.c) || !hasDomainUlt(dc.fb.c)) return;
        const k = Math.min(1, ct / 20);
        ctx.save();
        ctx.globalAlpha = 0.85 * k;
        const grdL = ctx.createLinearGradient(0, 0, VW / 2, 0);
        grdL.addColorStop(0, dc.fa.c.color2);
        grdL.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = grdL;
        ctx.fillRect(0, 0, VW / 2, VH);
        const grdR = ctx.createLinearGradient(VW, 0, VW / 2, 0);
        grdR.addColorStop(0, dc.fb.c.color2);
        grdR.addColorStop(1, 'rgba(0,0,0,0.8)');
        ctx.fillStyle = grdR;
        ctx.fillRect(VW / 2, 0, VW / 2, VH);
        const cx = VW / 2 + Math.sin(ct * 0.3) * 8;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 4 + Math.sin(ct * 0.5) * 2;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.moveTo(cx, 60);
        for (let y = 60; y < VH - 60; y += 20) ctx.lineTo(cx + rand(-12, 12), y);
        ctx.lineTo(cx, VH - 60);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.textAlign = 'center';
        ctx.font = '900 58px "Microsoft YaHei"';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 8;
        ctx.strokeText('领 域 对 抗', VW / 2, 120);
        ctx.fillText('领 域 对 抗', VW / 2, 120);
        ctx.font = '800 30px "Microsoft YaHei"';
        ctx.textAlign = 'right';
        ctx.fillStyle = dc.fa.c.color;
        ctx.fillText(dc.fa.c.moves.ult.name, VW / 2 - 40, 185);
        ctx.textAlign = 'left';
        ctx.fillStyle = dc.fb.c.color;
        ctx.fillText(dc.fb.c.moves.ult.name, VW / 2 + 40, 185);
        // 倒计时
        const timeLeft = Math.max(0, 10 - Math.floor(ct / 60));
        ctx.font = '900 48px monospace';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.strokeText(`${timeLeft}s`, VW / 2, 245);
        ctx.fillText(`${timeLeft}s`, VW / 2, 245);
        // 按键次数
        ctx.font = '700 22px "Microsoft YaHei"';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#fff';
        ctx.fillText(`按键次数: ${dc.clashValueA}`, VW / 2 - 60, 290);
        ctx.textAlign = 'left';
        ctx.fillText(`按键次数: ${dc.clashValueB}`, VW / 2 + 60, 290);
        // 比拼进度条（基于 clashValue）
        const total = Math.max(1, dc.clashValueA + dc.clashValueB);
        const wA = 300 * (dc.clashValueA / total),
            wB = 300 * (dc.clashValueB / total);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(ctx, VW / 2 - 320, 320, 640, 26, 13);
        ctx.fill();
        ctx.fillStyle = dc.fa.c.color;
        roundRect(ctx, VW / 2 - 318, 322, wA, 22, 11);
        ctx.fill();
        ctx.fillStyle = dc.fb.c.color;
        roundRect(ctx, VW / 2 + 318 - wB, 322, wB, 22, 11);
        ctx.fill();
        ctx.font = '700 18px "Microsoft YaHei"';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fff';
        ctx.fillText('领域压制进度', VW / 2, 312);
        // 胜负提示
        if (dc.winner) {
            ctx.font = '900 46px "Microsoft YaHei"';
            ctx.fillStyle = dc.winner.c.color;
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 7;
            ctx.strokeText(`${dc.winner.c.name} 领域压制！`, VW / 2, 400);
            ctx.fillText(`${dc.winner.c.name} 领域压制！`, VW / 2, 400);
        }
        ctx.restore();
    }
};