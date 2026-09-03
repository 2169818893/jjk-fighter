/* =====================================================================
   飞行道具 / 式神投射物视觉渲染
   ===================================================================== */
import { g_ellipse } from '../utils.js';

export function drawProjectile(ctx, p, t) {
    ctx.save();
    // 蓄力弹体统一缩放（以弹体中心为基准，蓄力越满特效越大）
    if (p.scale && p.scale !== 1) {
        ctx.translate(p.x, p.y);
        ctx.scale(p.scale, p.scale);
        ctx.translate(-p.x, -p.y);
    }
    if (p.type === 'ao') { // 苍：负无穷引力核（旋涡收束 + 透镜环 + 内吸粒子）
        const an = (p.anim || 0);
        // 外围空间扭曲暗环（引力透镜暗示）
        ctx.strokeStyle = 'rgba(30,80,160,0.35)';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 52 + Math.sin(an * 0.25) * 3, 0, Math.PI * 2);
        ctx.stroke();
        // 核心：白芯蓝晕
        const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 38);
        grd.addColorStop(0, '#fff');
        grd.addColorStop(0.35, '#7fd4ff');
        grd.addColorStop(1, 'rgba(60,140,255,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 38, 0, Math.PI * 2);
        ctx.fill();
        // 旋转吸入螺旋弧（3条，逆时针旋入）
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const a0 = -an * 0.22 + i * Math.PI * 2 / 3;
            ctx.strokeStyle = `rgba(160,220,255,${0.75-i*0.15})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            for (let s = 0; s <= 8; s++) {
                const tt = s / 8,
                    r = 46 - tt * 34,
                    a = a0 + tt * 1.8;
                const px2 = p.x + Math.cos(a) * r,
                    py2 = p.y + Math.sin(a) * r;
                if (s === 0) ctx.moveTo(px2, py2);
                else ctx.lineTo(px2, py2);
            }
            ctx.stroke();
        }
        // 内吸粒子（确定性相位，从外圈向核心坠落）
        ctx.fillStyle = '#d8f2ff';
        for (let i = 0; i < 6; i++) {
            const ph = ((an * 0.045 + i * 0.37) % 1),
                a = i * 2.4 + an * 0.05;
            const r = 56 * (1 - ph);
            ctx.globalAlpha = 0.3 + ph * 0.6;
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 1.4 + ph * 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (p.type === 'aka') { // 赫上抛核：正无穷斥力核（外喷炎环 + 白芯红晕）
        const an = (p.anim || 0);
        // 外围斥力波环（向外扩散相位）
        for (let i = 0; i < 3; i++) {
            const ph = ((an * 0.04 + i * 0.33) % 1);
            ctx.strokeStyle = `rgba(255,120,80,${0.55*(1-ph)})`;
            ctx.lineWidth = 3 - ph * 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 18 + ph * 34, 0, Math.PI * 2);
            ctx.stroke();
        }
        // 核心：白芯红晕
        const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, 34);
        grd.addColorStop(0, '#fff');
        grd.addColorStop(0.35, '#ff8a5c');
        grd.addColorStop(1, 'rgba(220,50,20,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 34, 0, Math.PI * 2);
        ctx.fill();
        // 外喷炎舌（确定性相位放射）
        ctx.strokeStyle = 'rgba(255,200,170,0.8)';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
            const a = an * 0.18 + i * Math.PI / 3;
            const r1 = 14, r2 = 26 + Math.sin(an * 0.3 + i) * 6;
            ctx.beginPath();
            ctx.moveTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1);
            ctx.lineTo(p.x + Math.cos(a) * r2, p.y + Math.sin(a) * r2);
            ctx.stroke();
        }
    } else if (p.type === 'murasaki') { // 茈：假想质量湮灭波（紫核 + 红蓝缘 + 电弧 + 尾迹）
        const an = (p.anim || 0),
            dir = p.vx > 0 ? 1 : -1;
        // 拉长能量尾迹
        const gt = ctx.createLinearGradient(p.x - dir * 130, p.y, p.x, p.y);
        gt.addColorStop(0, 'rgba(120,60,220,0)');
        gt.addColorStop(1, 'rgba(160,110,255,0.4)');
        ctx.fillStyle = gt;
        ctx.beginPath();
        ctx.ellipse(p.x - dir * 60, p.y, 80, 34, 0, 0, Math.PI * 2);
        ctx.fill();
        // 紫色主核
        const g2 = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 70);
        g2.addColorStop(0, '#fff');
        g2.addColorStop(0.3, '#c8a8ff');
        g2.addColorStop(1, 'rgba(120,60,220,0)');
        ctx.fillStyle = g2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 70, 0, Math.PI * 2);
        ctx.fill();
        // 苍赫残缘：前缘蓝弧 / 后缘红弧（湮灭未尽的双色）
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(127,212,255,0.85)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 52 + Math.sin(an * 0.4) * 4, dir > 0 ? -0.9 : Math.PI - 0.9, dir > 0 ? 0.9 : Math.PI + 0.9);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,106,74,0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 54 + Math.sin(an * 0.4 + 2) * 4, dir > 0 ? Math.PI - 0.8 : -0.8, dir > 0 ? Math.PI + 0.8 : 0.8);
        ctx.stroke();
        // 紫色能量环
        ctx.strokeStyle = 'rgba(200,160,255,0.9)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 44 + i * 13 + Math.sin(an * 0.4 + i) * 5, Math.PI * 0.3, Math.PI * 1.7);
            ctx.stroke();
        }
        // 确定性电弧（基于 anim 相位，不闪烁）
        ctx.strokeStyle = 'rgba(232,216,255,0.85)';
        ctx.lineWidth = 1.8;
        for (let i = 0; i < 3; i++) {
            const a0 = an * 0.3 + i * 2.1;
            ctx.beginPath();
            let ax = p.x + Math.cos(a0) * 20,
                ay = p.y + Math.sin(a0) * 20;
            ctx.moveTo(ax, ay);
            for (let s = 1; s <= 3; s++) {
                const rr = 20 + s * 13;
                ax = p.x + Math.cos(a0 + Math.sin(an * 0.5 + s + i) * 0.7) * rr;
                ay = p.y + Math.sin(a0 + Math.cos(an * 0.5 + s * 2 + i) * 0.7) * rr;
                ctx.lineTo(ax, ay);
            }
            ctx.stroke();
        }
        // 中心白炽线
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x - 64, p.y);
        ctx.lineTo(p.x + 64, p.y);
        ctx.stroke();
    } else if (p.type === 'nue') { // 鵺：雷鸟（确定性电光 + 尾羽 + 雷光尾迹）
        const an = p.anim || 0;
        ctx.translate(p.x, p.y);
        ctx.scale(p.vx > 0 ? 1 : -1, 1);
        const flap = Math.sin(an * 0.6) * 14;
        // 雷光氛围辉
        const gn = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
        gn.addColorStop(0, 'rgba(255,244,180,0.35)');
        gn.addColorStop(1, 'rgba(255,228,92,0)');
        ctx.fillStyle = gn;
        ctx.beginPath();
        ctx.arc(0, 0, 52, 0, Math.PI * 2);
        ctx.fill();
        // 尾羽（三羽后拖，随振翅相位摆动）
        ctx.strokeStyle = '#4a4a72';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(-22, i * 4);
            ctx.quadraticCurveTo(-36, i * 8 + Math.sin(an * 0.3 + i) * 3, -46, i * 12 + Math.sin(an * 0.3 + i + 1) * 4);
            ctx.stroke();
        }
        ctx.fillStyle = '#3a3a5a';
        ctx.beginPath();
        g_ellipse(ctx, 0, 0, 26, 13);
        ctx.fill();
        ctx.beginPath();
        g_ellipse(ctx, 18, -8, 10, 8);
        ctx.fill(); // 头
        // 翅膀（双层羽）
        ctx.fillStyle = '#5a5a8a';
        ctx.beginPath();
        g_ellipse(ctx, -4, -10 - flap, 24, 8);
        ctx.fill();
        ctx.beginPath();
        g_ellipse(ctx, -4, -10 + flap, 24, 8);
        ctx.fill();
        ctx.fillStyle = '#6e6ea6';
        ctx.beginPath();
        g_ellipse(ctx, -12, -12 - flap * 1.2, 14, 5);
        ctx.fill();
        ctx.beginPath();
        g_ellipse(ctx, -12, -12 + flap * 1.2, 14, 5);
        ctx.fill();
        // 鸟喙
        ctx.fillStyle = '#ffe45c';
        ctx.beginPath();
        ctx.moveTo(26, -10);
        ctx.lineTo(36, -7);
        ctx.lineTo(26, -5);
        ctx.fill();
        // 电光（确定性相位折线，不闪烁）
        ctx.strokeStyle = 'rgba(255,228,92,0.85)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const ph = an * 0.45 + i * 2.1;
            const lx = -20 + i * 13,
                ly = Math.sin(ph) * 7;
            ctx.beginPath();
            ctx.moveTo(lx, ly);
            ctx.lineTo(lx + 6, ly + Math.sin(ph * 1.7) * 9 - 4);
            ctx.lineTo(lx + 12, ly + Math.sin(ph * 2.3) * 7);
            ctx.stroke();
        }
        // 环绕雷环
        ctx.strokeStyle = 'rgba(255,228,92,' + (0.30 + Math.sin(an * 0.3) * 0.12).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        g_ellipse(ctx, 0, 0, 36, 18);
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(21, -9, 2, 0, Math.PI * 2);
        ctx.fill();
    } else if (p.type === 'blood') { // 穿血：血矢
        ctx.translate(p.x, p.y);
        ctx.rotate(p.vx > 0 ? 0 : Math.PI);
        const g3 = ctx.createLinearGradient(-50, 0, 20, 0);
        g3.addColorStop(0, 'rgba(255,43,74,0)');
        g3.addColorStop(0.7, '#ff2b4a');
        g3.addColorStop(1, '#ff8095');
        ctx.fillStyle = g3;
        ctx.beginPath();
        ctx.moveTo(-50, -6);
        ctx.lineTo(20, 0);
        ctx.lineTo(-50, 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,128,149,0.9)';
        ctx.beginPath();
        ctx.moveTo(-20, -3);
        ctx.lineTo(24, 0);
        ctx.lineTo(-20, 3);
        ctx.closePath();
        ctx.fill();
    } else if (p.type === 'fireArrow') { // 灶·开：烈焰火矢（焰羽尾流 + 灼白箭镞）
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        const gfa = ctx.createLinearGradient(-56, 0, 26, 0);
        gfa.addColorStop(0, 'rgba(255,154,60,0)');
        gfa.addColorStop(0.6, '#ff9a3c');
        gfa.addColorStop(1, '#ffe45c');
        ctx.fillStyle = gfa;
        ctx.beginPath();
        ctx.moveTo(-56, -7);
        ctx.lineTo(18, 0);
        ctx.lineTo(-56, 7);
        ctx.closePath();
        ctx.fill();
        // 外焰闪烁
        ctx.fillStyle = `rgba(255,228,92,${0.3 + Math.sin(t * 0.8 + p.anim) * 0.18})`;
        ctx.beginPath();
        ctx.ellipse(-10, 0, 26, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        // 箭杆
        ctx.strokeStyle = '#7a2a10';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(14, 0);
        ctx.stroke();
        // 灼白箭镞
        ctx.fillStyle = '#fff2d0';
        ctx.beginPath();
        ctx.moveTo(26, 0);
        ctx.lineTo(10, -4.5);
        ctx.lineTo(10, 4.5);
        ctx.closePath();
        ctx.fill();
    } else if (p.type === 'rikaBeam') { // 里香冲击波
        const g4 = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 56);
        g4.addColorStop(0, '#fff');
        g4.addColorStop(0.35, '#c8a8ff');
        g4.addColorStop(1, 'rgba(140,80,255,0)');
        ctx.fillStyle = g4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 56, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(190,140,255,0.8)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 40 + Math.sin(t * 0.5) * 6, 0, Math.PI * 2);
        ctx.stroke();
    } else if (p.type === 'granite') { // 石流龙·冰沙冲击波（蓝白能量弹头 + 拉长咒力尾流 + 震荡环）
        const an = (p.anim || 0),
            dir = Math.atan2(p.vy || 0, p.vx || 1),
            sc = p.small ? 0.72 : 1;
        ctx.translate(p.x, p.y);
        ctx.rotate(dir);
        // 拉长咒力尾流（蓝色三角拖尾）
        const gt = ctx.createLinearGradient(-96 * sc, 0, 18 * sc, 0);
        gt.addColorStop(0, 'rgba(90,168,255,0)');
        gt.addColorStop(0.7, 'rgba(90,168,255,0.55)');
        gt.addColorStop(1, 'rgba(200,230,255,0.9)');
        ctx.fillStyle = gt;
        ctx.beginPath();
        ctx.moveTo(-96 * sc, -10 * sc);
        ctx.lineTo(14 * sc, 0);
        ctx.lineTo(-96 * sc, 10 * sc);
        ctx.closePath();
        ctx.fill();
        // 白芯蓝晕弹头
        const gc = ctx.createRadialGradient(0, 0, 3, 0, 0, 40 * sc);
        gc.addColorStop(0, '#fff');
        gc.addColorStop(0.35, '#9ad0ff');
        gc.addColorStop(1, 'rgba(90,168,255,0)');
        ctx.fillStyle = gc;
        ctx.beginPath();
        ctx.arc(0, 0, 40 * sc, 0, Math.PI * 2);
        ctx.fill();
        // 前缘压缩冲击弧（音爆意象）
        ctx.strokeStyle = 'rgba(216,232,255,0.9)';
        ctx.lineWidth = 3 * sc;
        ctx.beginPath();
        ctx.arc(6 * sc, 0, 22 * sc + Math.sin(an * 0.5) * 3, -1.05, 1.05);
        ctx.stroke();
        // 后方震荡能量环（确定相位）
        ctx.strokeStyle = 'rgba(90,168,255,0.7)';
        ctx.lineWidth = 2 * sc;
        for (let i = 0; i < 3; i++) {
            const ph = (an * 0.09 + i * 0.34) % 1;
            ctx.globalAlpha = (1 - ph) * 0.7;
            ctx.beginPath();
            ctx.ellipse(-6 * sc - ph * 34 * sc, 0, 6 * sc, (14 + ph * 14) * sc, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
        // 中心白炽贯穿线
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 2 * sc;
        ctx.beginPath();
        ctx.moveTo(-70 * sc, 0);
        ctx.lineTo(16 * sc, 0);
        ctx.stroke();
    } else if (p.type === 'skyplane') { // 乌鹭亨子·宇守罗弹：天空平面碎片（青蓝薄冰棱面 + 切割光幕 + 碎屑尾迹）
        const an = (p.anim || 0),
            dir = Math.atan2(p.vy || 0, p.vx || 1);
        ctx.translate(p.x, p.y);
        ctx.rotate(dir);
        // 后拖切割光幕（天青三角尾流）
        const gt = ctx.createLinearGradient(-84, 0, 16, 0);
        gt.addColorStop(0, 'rgba(154,220,255,0)');
        gt.addColorStop(0.7, 'rgba(154,220,255,0.45)');
        gt.addColorStop(1, 'rgba(232,246,255,0.85)');
        ctx.fillStyle = gt;
        ctx.beginPath();
        ctx.moveTo(-84, -8);
        ctx.lineTo(12, 0);
        ctx.lineTo(-84, 8);
        ctx.closePath();
        ctx.fill();
        // 白芯青晕光团
        const gc = ctx.createRadialGradient(0, 0, 3, 0, 0, 36);
        gc.addColorStop(0, '#fff');
        gc.addColorStop(0.35, '#c8ecff');
        gc.addColorStop(1, 'rgba(120,190,240,0)');
        ctx.fillStyle = gc;
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fill();
        // 旋转薄冰棱面（切割薄冰般的多角碎片）
        ctx.rotate(an * 0.18);
        ctx.fillStyle = 'rgba(190,232,255,0.55)';
        ctx.strokeStyle = 'rgba(240,250,255,0.95)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(6, -13);
        ctx.lineTo(-12, -9);
        ctx.lineTo(-16, 4);
        ctx.lineTo(-4, 14);
        ctx.lineTo(11, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // 棱面内裂纹
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-12, -9);
        ctx.lineTo(2, 0);
        ctx.lineTo(18, 0);
        ctx.moveTo(2, 0);
        ctx.lineTo(-4, 14);
        ctx.stroke();
        ctx.rotate(-an * 0.18);
        // 飞散碎屑（确定相位）
        ctx.fillStyle = '#d8f2ff';
        for (let i = 0; i < 4; i++) {
            const ph = (an * 0.08 + i * 0.25) % 1;
            ctx.globalAlpha = (1 - ph) * 0.8;
            ctx.beginPath();
            ctx.arc(-10 - ph * 40, Math.sin(an * 0.3 + i * 1.7) * 12, 1.8 - ph, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (p.type === 'skyshear') { // 乌鹭亨子·空之断层：自天而降的天空剪切断层（竖长光刃 + 断层错位纹）
        const an = (p.anim || 0);
        ctx.translate(p.x, p.y);
        // 上拖天光尾迹（断层自天垂落）
        const gs = ctx.createLinearGradient(0, -p.h * 0.9, 0, p.h * 0.5);
        gs.addColorStop(0, 'rgba(154,220,255,0)');
        gs.addColorStop(0.6, 'rgba(154,220,255,0.4)');
        gs.addColorStop(1, 'rgba(232,246,255,0.9)');
        ctx.fillStyle = gs;
        ctx.beginPath();
        ctx.moveTo(-9, -p.h * 0.9);
        ctx.lineTo(9, -p.h * 0.9);
        ctx.lineTo(4, p.h * 0.5);
        ctx.lineTo(-4, p.h * 0.5);
        ctx.closePath();
        ctx.fill();
        // 断层主刃（白芯青缘的竖长光刃）
        ctx.strokeStyle = 'rgba(154,220,255,0.85)';
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -p.h * 0.45);
        ctx.lineTo(0, p.h * 0.5);
        ctx.stroke();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(0, -p.h * 0.4);
        ctx.lineTo(0, p.h * 0.46);
        ctx.stroke();
        // 断层错位纹（左右错开的短横线，切割薄冰意象）
        ctx.strokeStyle = 'rgba(216,242,255,0.8)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 4; i++) {
            const yy = -p.h * 0.3 + i * p.h * 0.22;
            const off = (i % 2 ? 1 : -1) * (4 + Math.sin(an * 0.4 + i) * 2);
            ctx.beginPath();
            ctx.moveTo(off - 7, yy);
            ctx.lineTo(off + 7, yy);
            ctx.stroke();
        }
        // 刃尖碎冰光点
        ctx.fillStyle = '#e8f6ff';
        for (let i = 0; i < 3; i++) {
            const ph = (an * 0.1 + i * 0.33) % 1;
            ctx.globalAlpha = (1 - ph) * 0.85;
            ctx.beginPath();
            ctx.arc((i - 1) * 8, p.h * 0.5 - ph * 20, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (p.type === 'redfish') { // 杜鲁夫·式神差遣：赤红鱼形式神（轨迹染红空间）
        const an = (p.anim || 0);
        ctx.translate(p.x, p.y);
        ctx.scale(p.vx >= 0 ? 1 : -1, 1);
        const wob = Math.sin(an * 0.35) * 3;
        // 后拖染红轨迹光幕（式神游过之处化为赤红领域）
        const gt = ctx.createLinearGradient(-88, 0, 14, 0);
        gt.addColorStop(0, 'rgba(255,106,82,0)');
        gt.addColorStop(0.65, 'rgba(255,106,82,0.4)');
        gt.addColorStop(1, 'rgba(255,176,154,0.8)');
        ctx.fillStyle = gt;
        ctx.beginPath();
        ctx.moveTo(-88, wob - 9);
        ctx.lineTo(10, wob);
        ctx.lineTo(-88, wob + 9);
        ctx.closePath();
        ctx.fill();
        // 赤红光晕
        const gc = ctx.createRadialGradient(0, wob, 3, 0, wob, 34);
        gc.addColorStop(0, 'rgba(255,214,200,0.9)');
        gc.addColorStop(0.4, 'rgba(255,116,88,0.5)');
        gc.addColorStop(1, 'rgba(138,28,16,0)');
        ctx.fillStyle = gc;
        ctx.beginPath();
        ctx.arc(0, wob, 34, 0, Math.PI * 2);
        ctx.fill();
        // 鱼形躯体（赤红主色）
        ctx.fillStyle = '#ff6a52';
        ctx.beginPath();
        g_ellipse(ctx, 0, wob, 20, 8.5);
        ctx.fill();
        // 尾鳍（摆动）
        const tw = Math.sin(an * 0.5) * 4;
        ctx.beginPath();
        ctx.moveTo(-17, wob);
        ctx.lineTo(-30, wob - 8 + tw);
        ctx.lineTo(-30, wob + 8 + tw);
        ctx.closePath();
        ctx.fill();
        // 背鳍（浓赤）
        ctx.fillStyle = '#8a1c10';
        ctx.beginPath();
        ctx.moveTo(-6, wob - 7);
        ctx.lineTo(2, wob - 14);
        ctx.lineTo(7, wob - 7);
        ctx.closePath();
        ctx.fill();
        // 白独眼 + 深瞳
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(11, wob - 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a1c10';
        ctx.beginPath();
        ctx.arc(11.8, wob - 2, 1.4, 0, Math.PI * 2);
        ctx.fill();
        // 利齿口（张口噬咬）
        ctx.strokeStyle = '#ffd6c8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(19, wob - 3);
        ctx.lineTo(13, wob + 1);
        ctx.lineTo(19, wob + 4);
        ctx.stroke();
        // 飞散赤红碎光（确定相位）
        ctx.fillStyle = '#ffb09a';
        for (let i = 0; i < 4; i++) {
            const ph = (an * 0.08 + i * 0.25) % 1;
            ctx.globalAlpha = (1 - ph) * 0.8;
            ctx.beginPath();
            ctx.arc(-12 - ph * 44, wob + Math.sin(an * 0.3 + i * 1.7) * 11, 1.8 - ph, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (p.type === 'roachtide') { // 咒蟑奔流·噬铁潮：蟑螂大军结成的横向奔流
        ctx.translate(p.x, p.y);
        ctx.scale(p.vx >= 0 ? 1 : -1, 1);
        const an = p.anim || 0;
        // 腐蚀橙流光带（奔流主体氛围）
        const gt = ctx.createLinearGradient(-60, 0, 44, 0);
        gt.addColorStop(0, 'rgba(44,24,18,0)');
        gt.addColorStop(0.55, 'rgba(90,50,26,0.35)');
        gt.addColorStop(1, 'rgba(224,134,46,0.5)');
        ctx.fillStyle = gt;
        ctx.beginPath();
        g_ellipse(ctx, -8, 0, 52, 24);
        ctx.fill();
        // 前锋腐橙光晕
        const gc = ctx.createRadialGradient(36, 0, 2, 36, 0, 26);
        gc.addColorStop(0, 'rgba(240,176,96,0.85)');
        gc.addColorStop(0.5, 'rgba(224,134,46,0.4)');
        gc.addColorStop(1, 'rgba(224,134,46,0)');
        ctx.fillStyle = gc;
        ctx.beginPath();
        ctx.arc(36, 0, 26, 0, Math.PI * 2);
        ctx.fill();
        // 蟑螂群体（三波浪形排列的虫体，抗相位蠕动）
        for (let i = 0; i < 14; i++) {
            const lane = i % 3;
            const bx = 34 - (i * 6.5) - lane * 2;
            const by = Math.sin(an * 0.35 + i * 1.3) * (7 + lane * 4);
            const big = i % 4 === 0;
            ctx.fillStyle = big ? '#e0862e' : (i % 3 === 0 ? '#4a2a16' : '#2c1812');
            ctx.beginPath();
            g_ellipse(ctx, bx, by, big ? 4.2 : 3.2, big ? 2.2 : 1.7);
            ctx.fill();
            // 虫背鞘亮线
            if (big) {
                ctx.strokeStyle = 'rgba(240,176,96,0.7)';
                ctx.lineWidth = 0.8;
                ctx.beginPath();
                ctx.moveTo(bx - 3, by);
                ctx.lineTo(bx + 3, by);
                ctx.stroke();
            }
        }
        // 领头大蟑螂（张开颚钳）
        ctx.fillStyle = '#e0862e';
        ctx.beginPath();
        g_ellipse(ctx, 40, Math.sin(an * 0.35) * 3, 6, 3.2);
        ctx.fill();
        ctx.strokeStyle = '#f0b060';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(45, Math.sin(an * 0.35) * 3 - 3);
        ctx.lineTo(49, Math.sin(an * 0.35) * 3);
        ctx.lineTo(45, Math.sin(an * 0.35) * 3 + 3);
        ctx.stroke();
        // 后方零散逃窜碎影
        ctx.fillStyle = '#2c1812';
        for (let i = 0; i < 4; i++) {
            const ph = (an * 0.07 + i * 0.25) % 1;
            ctx.globalAlpha = (1 - ph) * 0.7;
            ctx.beginPath();
            g_ellipse(ctx, -46 - ph * 36, Math.sin(an * 0.3 + i * 1.9) * 14, 2.2 - ph, 1.2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (p.type === 'curseegg') { // 烂生刀·虫卵：弧线坠落的卵体
        ctx.translate(p.x, p.y);
        const an = p.anim || 0;
        ctx.rotate(an * 0.18);
        // 卵壳微晕
        const ge = ctx.createRadialGradient(0, 0, 1, 0, 0, 14);
        ge.addColorStop(0, 'rgba(232,208,168,0.7)');
        ge.addColorStop(1, 'rgba(200,168,120,0)');
        ctx.fillStyle = ge;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        // 卵体（壳色椭圆）
        ctx.fillStyle = '#c8a878';
        ctx.beginPath();
        g_ellipse(ctx, 0, 0, 6.5, 8);
        ctx.fill();
        // 壳面暗裂纹
        ctx.strokeStyle = 'rgba(90,58,32,0.8)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-3, -4);
        ctx.quadraticCurveTo(1, 0, -2, 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(3, -3);
        ctx.quadraticCurveTo(0, 1, 3, 4);
        ctx.stroke();
        // 裂缝内蠕动的幼虫微光
        ctx.fillStyle = '#e0862e';
        ctx.globalAlpha = 0.6 + Math.sin(an * 0.6) * 0.4;
        ctx.beginPath();
        ctx.arc(0, 0.5, 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    } else if (p.type === 'sacshiki') { // 土虫蠕定：携巨囊有翅式神
        ctx.translate(p.x, p.y);
        ctx.scale(p.vx >= 0 ? 1 : -1, 1);
        const an = p.anim || 0;
        const wob = Math.sin(an * 0.3) * 3;
        const flap = Math.sin(an * 0.7); // 振翅相位
        // 腹下巨囊（半透毒液绿囊体，鼓胀脉动）
        const sacR = 15 + Math.sin(an * 0.25) * 1.5;
        const gs = ctx.createRadialGradient(-2, wob + 16, 2, -2, wob + 16, sacR + 6);
        gs.addColorStop(0, 'rgba(216,236,120,0.85)');
        gs.addColorStop(0.6, 'rgba(184,212,74,0.55)');
        gs.addColorStop(1, 'rgba(120,150,40,0.15)');
        ctx.fillStyle = gs;
        ctx.beginPath();
        g_ellipse(ctx, -2, wob + 16, sacR, sacR * 0.85);
        ctx.fill();
        // 囊面浓绿脉络
        ctx.strokeStyle = 'rgba(110,140,30,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-10, wob + 12);
        ctx.quadraticCurveTo(-2, wob + 20, 8, wob + 13);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-7, wob + 22);
        ctx.quadraticCurveTo(0, wob + 25, 6, wob + 21);
        ctx.stroke();
        // 双翅（半透膜翅，上下拍打）
        ctx.fillStyle = 'rgba(200,180,150,0.4)';
        ctx.beginPath();
        ctx.moveTo(-4, wob - 4);
        ctx.quadraticCurveTo(-24, wob - 18 - flap * 10, -34, wob - 8 - flap * 12);
        ctx.quadraticCurveTo(-20, wob - 2 - flap * 4, -4, wob - 1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2, wob - 4);
        ctx.quadraticCurveTo(-12, wob - 22 + flap * 10, -20, wob - 14 + flap * 12);
        ctx.quadraticCurveTo(-8, wob - 4 + flap * 4, 2, wob - 1);
        ctx.closePath();
        ctx.fill();
        // 虫体躯干（暗紫褐节肢躯体）
        ctx.fillStyle = '#4a1a2e';
        ctx.beginPath();
        g_ellipse(ctx, 0, wob, 14, 6);
        ctx.fill();
        // 节肢分节线
        ctx.strokeStyle = 'rgba(224,134,46,0.5)';
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(i * 5, wob - 5);
            ctx.lineTo(i * 5, wob + 5);
            ctx.stroke();
        }
        // 头部橙甲与暗红复眼
        ctx.fillStyle = '#e0862e';
        ctx.beginPath();
        ctx.arc(13, wob - 1, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a1420';
        ctx.beginPath();
        ctx.arc(14.5, wob - 2, 1.6, 0, Math.PI * 2);
        ctx.fill();
        // 垂摆细足（三对）
        ctx.strokeStyle = '#3c1828';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) {
            const lx = -8 + i * 7;
            const sway = Math.sin(an * 0.5 + i * 1.4) * 2;
            ctx.beginPath();
            ctx.moveTo(lx, wob + 4);
            ctx.lineTo(lx - 3 + sway, wob + 12);
            ctx.stroke();
        }
        // 飞行尾迹（腐橙碎光）
        ctx.fillStyle = '#e0862e';
        for (let i = 0; i < 3; i++) {
            const ph = (an * 0.09 + i * 0.33) % 1;
            ctx.globalAlpha = (1 - ph) * 0.6;
            ctx.beginPath();
            ctx.arc(-18 - ph * 30, wob + Math.sin(an * 0.3 + i * 2.1) * 8, 1.6 - ph, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (p.type === 'soul') { // 多重魂·拨体
        const g5 = ctx.createRadialGradient(p.x, p.y, 4, p.x, p.y, 44);
        g5.addColorStop(0, '#fff');
        g5.addColorStop(0.4, '#e8a8d8');
        g5.addColorStop(1, 'rgba(200,100,180,0)');
        ctx.fillStyle = g5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 44, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(230,170,215,0.8)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const a = (p.anim || 0) * 0.1 + i * Math.PI / 2;
            ctx.beginPath();
            ctx.arc(p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 26, 7, 0, Math.PI * 2);
            ctx.stroke();
        }
    } else if (p.type === 'curse') { // 咒灵操术：小型咒灵（三种形态变体）
        ctx.translate(p.x, p.y);
        ctx.scale(p.vx >= 0 ? 1 : -1, 1);
        const an = p.anim || 0;
        const wob = Math.sin(an * 0.4) * 4;
        const vr = p.variant || 0;
        // 咒力紫晕
        const gc = ctx.createRadialGradient(0, wob, 2, 0, wob, 30);
        gc.addColorStop(0, 'rgba(184,143,216,0.35)');
        gc.addColorStop(1, 'rgba(74,42,110,0)');
        ctx.fillStyle = gc;
        ctx.beginPath();
        ctx.arc(0, wob, 30, 0, Math.PI * 2);
        ctx.fill();
        // 后拖咒力尾羽（渐隐双尾）
        ctx.strokeStyle = 'rgba(110,90,158,0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-12, wob - 3);
        ctx.quadraticCurveTo(-26, wob - 8 + Math.sin(an * 0.5) * 5, -38, wob - 2);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-12, wob + 4);
        ctx.quadraticCurveTo(-24, wob + 10 - Math.sin(an * 0.5) * 5, -34, wob + 6);
        ctx.stroke();
        // 躯体（按变体分形）
        ctx.fillStyle = '#3a2456';
        if (vr === 0) {
            // 蠕行型：长椭躯体 + 背脊鳍突
            ctx.beginPath();
            g_ellipse(ctx, 0, wob, 17, 11);
            ctx.fill();
            ctx.fillStyle = '#4a2a6e';
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-8 + i * 7, wob - 9);
                ctx.lineTo(-4 + i * 7, wob - 16 - Math.sin(an * 0.4 + i) * 2);
                ctx.lineTo(0 + i * 7, wob - 9);
                ctx.closePath();
                ctx.fill();
            }
        } else if (vr === 1) {
            // 球状多触型：圆躯 + 下垂触须
            ctx.beginPath();
            ctx.arc(0, wob, 13, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#3a2456';
            ctx.lineWidth = 2.5;
            for (let i = 0; i < 4; i++) {
                const tx = -9 + i * 6;
                ctx.beginPath();
                ctx.moveTo(tx, wob + 9);
                ctx.quadraticCurveTo(tx - 3, wob + 17 + Math.sin(an * 0.45 + i * 1.3) * 3, tx + 2, wob + 21);
                ctx.stroke();
            }
        } else {
            // 扭曲人面型：歪斜团块 + 森然人面轮廓
            ctx.beginPath();
            ctx.moveTo(-14, wob + 4);
            ctx.quadraticCurveTo(-12, wob - 12, 2, wob - 11);
            ctx.quadraticCurveTo(15, wob - 12, 15, wob + 1);
            ctx.quadraticCurveTo(16, wob + 10, 3, wob + 10);
            ctx.quadraticCurveTo(-10, wob + 12, -14, wob + 4);
            ctx.closePath();
            ctx.fill();
        }
        // 发光眼（变体差异：单目/双目/三目）
        ctx.fillStyle = '#e8d8ff';
        if (vr === 1) {
            ctx.beginPath();
            ctx.arc(4, wob - 2, 3.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4a2a6e';
            ctx.beginPath();
            ctx.arc(5, wob - 2, 1.4, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(-3, wob - 3, 2.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(7, wob - 2, 2.8, 0, Math.PI * 2);
            ctx.fill();
            if (vr === 2) {
                ctx.beginPath();
                ctx.arc(2, wob - 7, 1.6, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        // 参差牙口（前端）
        ctx.strokeStyle = '#e8d8ff';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(9, wob + 4);
        ctx.lineTo(12, wob + 6);
        ctx.lineTo(14, wob + 3);
        ctx.stroke();
    } else if (p.type === 'seed') { // 咒种：以咒力为食的暗红种核 + 缠绕咒力丝 + 飞行尾藤
        const an = p.anim || 0;
        ctx.translate(p.x, p.y);
        // 咒力食欲氛围辉（绿中透红）
        const g6 = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
        g6.addColorStop(0, '#ffd8c0');
        g6.addColorStop(0.4, '#d86a5a');
        g6.addColorStop(1, 'rgba(140,200,60,0)');
        ctx.fillStyle = g6;
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fill();
        // 种核（泪滴形木质种子，随飞行旋转）
        ctx.rotate(an * 0.12 * (p.vx >= 0 ? 1 : -1));
        ctx.fillStyle = '#7a3428';
        ctx.beginPath();
        ctx.moveTo(-10, 0);
        ctx.quadraticCurveTo(-4, -9, 8, -3);
        ctx.quadraticCurveTo(12, 0, 8, 3);
        ctx.quadraticCurveTo(-4, 9, -10, 0);
        ctx.closePath();
        ctx.fill();
        // 种皮裂纹与芽点
        ctx.strokeStyle = '#3a1810';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-7, 0);
        ctx.quadraticCurveTo(0, -2, 7, 0);
        ctx.stroke();
        ctx.fillStyle = '#b8e85c';
        ctx.beginPath();
        ctx.arc(8, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate(-an * 0.12 * (p.vx >= 0 ? 1 : -1));
        // 缠绕咒力丝（双弧反向旋转）
        ctx.strokeStyle = 'rgba(184,232,92,0.85)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(0, 0, 13 + Math.sin(an * 0.3) * 2, an * 0.2, an * 0.2 + Math.PI * 1.3);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(143,232,123,0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(0, 0, 17, -an * 0.16, -an * 0.16 + Math.PI);
        ctx.stroke();
        // 飞行尾藤（后拖藤蔓摆尾）
        const dir6 = p.vx >= 0 ? 1 : -1;
        ctx.strokeStyle = 'rgba(122,200,96,0.55)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-dir6 * 8, 0);
        ctx.quadraticCurveTo(-dir6 * 22, Math.sin(an * 0.4) * 6, -dir6 * 36, Math.sin(an * 0.4 + 1.5) * 9);
        ctx.stroke();
    } else if (p.type === 'root') { // 树根：咒力具现化树根破土而出（生长→逐消）
        const an = p.anim || 0;
        const grow = Math.min(1, an / 6);                       // 破土生长
        const fade = Math.min(1, (p.life || 0) / 7);            // 随花御意志消散
        const baseY = p.y + p.h / 2,
            tipY = baseY - p.h * grow * (0.4 + fade * 0.6);
        const hw = p.w * 0.5 * (p.big ? 1 : 0.85);
        ctx.translate(p.x, 0);
        ctx.globalAlpha = Math.min(1, fade + 0.15);
        // 根周生机咒力辉
        const gr = ctx.createRadialGradient(0, baseY - p.h * 0.4, 6, 0, baseY - p.h * 0.4, p.h * 0.6);
        gr.addColorStop(0, 'rgba(143,232,123,' + (0.28 * fade).toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(143,232,123,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(0, baseY - p.h * 0.4, p.h * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // 主根：锥形尖刺 + 树皮锯齿边
        const seg = 5;
        ctx.fillStyle = p.big ? '#5e4a2c' : '#6e5a38';
        ctx.beginPath();
        ctx.moveTo(-hw, baseY);
        for (let i = 1; i <= seg; i++) {
            const tt = i / seg;
            const yy = baseY + (tipY - baseY) * tt;
            const xx = -hw * (1 - tt) - Math.sin(an * 0.1 + i * 2.4) * 3 * (1 - tt);
            ctx.lineTo(xx - (i % 2 ? 4 : 0) * (1 - tt), yy);
        }
        for (let i = seg; i >= 1; i--) {
            const tt = i / seg;
            const yy = baseY + (tipY - baseY) * tt;
            const xx = hw * (1 - tt) + Math.sin(an * 0.1 + i * 1.8) * 3 * (1 - tt);
            ctx.lineTo(xx + (i % 2 ? 0 : 4) * (1 - tt), yy);
        }
        ctx.lineTo(hw, baseY);
        ctx.closePath();
        ctx.fill();
        // 木纹中线与侧纹
        ctx.strokeStyle = '#141c10';
        ctx.lineWidth = p.big ? 2.2 : 1.6;
        ctx.beginPath();
        ctx.moveTo(0, baseY - 4);
        ctx.quadraticCurveTo(Math.sin(an * 0.08) * 4, (baseY + tipY) / 2, 0, tipY + 8);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-hw * 0.5, baseY - 6);
        ctx.quadraticCurveTo(-hw * 0.3, (baseY + tipY) / 2, -2, tipY + p.h * 0.3);
        ctx.stroke();
        // 侧生小根刺（左右各一）
        ctx.fillStyle = p.big ? '#6e5a38' : '#7a6440';
        ctx.beginPath();
        ctx.moveTo(-hw * 0.7, baseY - p.h * 0.24 * grow);
        ctx.lineTo(-hw * 1.5, baseY - p.h * 0.42 * grow);
        ctx.lineTo(-hw * 0.4, baseY - p.h * 0.36 * grow);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(hw * 0.7, baseY - p.h * 0.5 * grow);
        ctx.lineTo(hw * 1.4, baseY - p.h * 0.68 * grow);
        ctx.lineTo(hw * 0.35, baseY - p.h * 0.6 * grow);
        ctx.closePath();
        ctx.fill();
        // 尖端生机光芽 + 崩土碎块
        ctx.fillStyle = 'rgba(184,232,140,' + (0.9 * fade).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(0, tipY + 3, p.big ? 5 : 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(90,74,50,' + (0.8 * fade).toFixed(3) + ')';
        for (let i = 0; i < 4; i++) {
            const ph = ((an * 0.06 + i * 0.27) % 1);
            ctx.beginPath();
            ctx.arc((i - 1.5) * hw * 0.8, baseY - 4 - ph * 26, 2.4 - ph, 0, Math.PI * 2);
            ctx.fill();
        }
        // 巨根额外：粉花点缀
        if (p.big) {
            ctx.fillStyle = 'rgba(239,154,184,' + (0.9 * fade).toFixed(3) + ')';
            ctx.beginPath();
            ctx.ellipse(-hw * 1.1, baseY - p.h * 0.45, 4, 2.2, -0.7, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(hw * 1.0, baseY - p.h * 0.7, 4, 2.2, 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (p.type === 'kemari') { // 树鞠：漂浮木球（藤纹缠束 + 嫩叶粉花 + 悬浮光晕）
        const an = p.anim || 0;
        ctx.translate(p.x, p.y);
        // 悬浮生机光晕
        const gk = ctx.createRadialGradient(0, 0, 4, 0, 0, 40);
        gk.addColorStop(0, 'rgba(184,232,140,0.30)');
        gk.addColorStop(1, 'rgba(143,232,123,0)');
        ctx.fillStyle = gk;
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();
        // 木球主体（缓慢自转）
        ctx.rotate(an * 0.04);
        ctx.fillStyle = '#6e5a38';
        ctx.beginPath();
        ctx.arc(0, 0, 21, 0, Math.PI * 2);
        ctx.fill();
        // 藤纹缠束（树鞠编织纹：三向弧带）
        ctx.strokeStyle = '#4a3820';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(0, 0, 21, 8.5, 0.5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(0, 0, 21, 8.5, -0.6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = '#8a7248';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(0, 0, 21, 13, 1.55, 0, Math.PI * 2);
        ctx.stroke();
        // 球面高光
        ctx.fillStyle = 'rgba(200,180,140,0.35)';
        ctx.beginPath();
        ctx.arc(-7, -8, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.rotate(-an * 0.04);
        // 顶部嫩叶与粉花（不随球体自转）
        ctx.fillStyle = '#7ac860';
        ctx.beginPath();
        ctx.ellipse(6, -22, 4.4, 2.2, -0.5 + Math.sin(an * 0.08) * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef9ab8';
        for (let i = 0; i < 5; i++) {
            const a = i * Math.PI * 2 / 5 + an * 0.02;
            ctx.beginPath();
            ctx.ellipse(-8 + Math.cos(a) * 3, -22 + Math.sin(a) * 3, 2.2, 1.2, a, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = '#ffe45c';
        ctx.beginPath();
        ctx.arc(-8, -22, 1.3, 0, Math.PI * 2);
        ctx.fill();
        // 环绕咒力弧（漂浮感）
        ctx.strokeStyle = 'rgba(143,232,123,' + (0.35 + Math.sin(an * 0.2) * 0.15).toFixed(3) + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(0, 6, 28, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else if (p.type === 'rootlance') { // 树鞠根刺：自树鞠射出的穿刺根枪
        const an = p.anim || 0;
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy || 0, p.vx || 1));
        const L = p.w * 0.5;
        // 后拖生机尾迹
        const gl = ctx.createLinearGradient(-L - 30, 0, L, 0);
        gl.addColorStop(0, 'rgba(143,232,123,0)');
        gl.addColorStop(1, 'rgba(168,216,124,0.35)');
        ctx.fillStyle = gl;
        ctx.beginPath();
        ctx.ellipse(-L * 0.4, 0, L * 0.9, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        // 根枪主体：尖锥木矛 + 螺旋树皮纹
        ctx.fillStyle = '#6e5a38';
        ctx.beginPath();
        ctx.moveTo(-L, -7);
        ctx.quadraticCurveTo(L * 0.3, -9, L, 0);
        ctx.quadraticCurveTo(L * 0.3, 9, -L, 7);
        ctx.quadraticCurveTo(-L + 10, 0, -L, -7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#141c10';
        ctx.lineWidth = 1.3;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-L + 14 + i * 4, i % 2 ? 5 : -5);
            ctx.quadraticCurveTo(0, (i - 1) * 5, L - 10 - i * 6, (i % 2 ? -2 : 2));
            ctx.stroke();
        }
        // 枪尖白炽穿透光
        ctx.fillStyle = 'rgba(232,255,200,0.9)';
        ctx.beginPath();
        ctx.moveTo(L + 8, 0);
        ctx.lineTo(L - 12, -4);
        ctx.lineTo(L - 12, 4);
        ctx.closePath();
        ctx.fill();
        // 旋绕咒力丝（确定性相位）
        ctx.strokeStyle = 'rgba(184,232,92,0.7)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let s = 0; s <= 10; s++) {
            const tt = s / 10;
            const px2 = -L + tt * L * 1.8,
                py2 = Math.sin(tt * Math.PI * 3 + an * 0.5) * 9 * (1 - tt * 0.6);
            if (s === 0) ctx.moveTo(px2, py2);
            else ctx.lineTo(px2, py2);
        }
        ctx.stroke();
    } else if (p.type === 'firebug') { // 火烁虫：蚊形咒虫（锋利口器 + 高频双翼 + 灼热腹节 + 声波/俯冲两态）
        const an = p.anim || 0;
        const dir = p.vx >= 0 ? 1 : -1;
        ctx.translate(p.x, p.y);
        ctx.scale(dir, 1);
        if (p.phase === 2) {
            // 俯冲阶段：身后炽焰尾流
            ctx.rotate(Math.atan2(p.vy, Math.abs(p.vx) || 1));
            const tg = ctx.createLinearGradient(-36, 0, 0, 0);
            tg.addColorStop(0, 'rgba(255,90,30,0)');
            tg.addColorStop(1, 'rgba(255,150,60,0.7)');
            ctx.fillStyle = tg;
            ctx.beginPath();
            g_ellipse(ctx, -19, 0, 19, 5.5);
            ctx.fill();
        }
        // 腹部：三节灼热腹节（末端最亮，呼吸明灭）
        for (let i = 0; i < 3; i++) {
            const gl = 0.55 + Math.sin(an * 0.3 + i) * 0.2;
            ctx.fillStyle = i === 2 ? 'rgba(255,210,60,' + gl.toFixed(3) + ')' : 'rgba(255,120,40,' + gl.toFixed(3) + ')';
            ctx.beginPath();
            g_ellipse(ctx, -8 - i * 5, 1 + i * 0.8, 4.5 - i * 0.8, 3.4 - i * 0.5);
            ctx.fill();
        }
        // 胸部与头
        ctx.fillStyle = '#3a2416';
        ctx.beginPath();
        g_ellipse(ctx, -1, 0, 5, 4);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(5, -1, 3.2, 0, Math.PI * 2);
        ctx.fill();
        // 复眼
        ctx.fillStyle = '#ff6a2a';
        ctx.beginPath();
        ctx.arc(6.4, -2, 1.3, 0, Math.PI * 2);
        ctx.fill();
        // 锋利口器（前伸长针）
        ctx.strokeStyle = '#e8ddd0';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(7, 0);
        ctx.lineTo(18, 2.4);
        ctx.stroke();
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(14, 1.6);
        ctx.lineTo(18, 2.4);
        ctx.stroke();
        // 细足（三对，微摆）
        ctx.strokeStyle = 'rgba(58,36,22,0.9)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-2 + i * 3, 3);
            ctx.lineTo(-6 + i * 4, 9 + Math.sin(an * 0.5 + i) * 1.5);
            ctx.stroke();
        }
        // 双翼高频振翅（模糊残影）
        const fl = Math.sin(an * 0.9) * 7;
        ctx.strokeStyle = 'rgba(255,200,150,0.55)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        g_ellipse(ctx, -5, -6 - fl * 0.4, 10, 3.4);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255,200,150,0.3)';
        ctx.beginPath();
        g_ellipse(ctx, -5, -6 + fl * 0.4, 10, 3.4);
        ctx.stroke();
        if (p.phase === 1) {
            // 一段：口器尖端扩散的同心声波弧
            const st = an - (p.phaseT || 0);
            ctx.strokeStyle = 'rgba(255,216,160,0.75)';
            for (let i = 0; i < 4; i++) {
                const rr = 8 + ((st * 3 + i * 12) % 48);
                ctx.lineWidth = Math.max(0.6, 2 - rr * 0.025);
                ctx.globalAlpha = Math.max(0, 1 - rr / 52);
                ctx.beginPath();
                ctx.arc(18, 2, rr, -0.9, 0.9);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    } else if (p.type === 'mound') { // 火焰术式：丘状小火山（肖似漏瑚头部，破土隆起 → 山口喷焰）
        const an = p.anim || 0;
        const grow = Math.min(1, an / 8);      // 破土隆起
        const fade = Math.min(1, p.life / 8);  // 将消散时淡出
        const erupt = an >= 12;                // 喷发中
        const baseY = p.y + p.h / 2;           // 地面线
        ctx.translate(p.x, baseY);
        ctx.globalAlpha = fade;
        const mh = 52 * grow;                  // 山体高度
        // 山体（上窄下宽的丘状轮廓）
        ctx.fillStyle = '#4a3020';
        ctx.beginPath();
        ctx.moveTo(-30, 0);
        ctx.lineTo(-20, -mh * 0.55);
        ctx.lineTo(-9, -mh);
        ctx.lineTo(9, -mh);
        ctx.lineTo(20, -mh * 0.55);
        ctx.lineTo(30, 0);
        ctx.closePath();
        ctx.fill();
        // 山体暗面
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.moveTo(9, -mh);
        ctx.lineTo(20, -mh * 0.55);
        ctx.lineTo(30, 0);
        ctx.lineTo(12, 0);
        ctx.closePath();
        ctx.fill();
        // 山口
        ctx.fillStyle = '#241008';
        ctx.beginPath();
        g_ellipse(ctx, 0, -mh, 8, 3);
        ctx.fill();
        // 独眼纹（肖似漏瑚独眼，蓄力时亮起）
        ctx.fillStyle = 'rgba(255,138,60,' + (0.4 + grow * 0.5).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(0, -mh * 0.45, 3.2 * grow + 0.01, 0, Math.PI * 2);
        ctx.fill();
        // 熔岩裂纹
        ctx.strokeStyle = 'rgba(255,106,42,' + ((0.4 + Math.sin(an * 0.25) * 0.2) * fade).toFixed(3) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-14, -mh * 0.3);
        ctx.lineTo(-8, -mh * 0.55);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(13, -mh * 0.35);
        ctx.lineTo(7, -mh * 0.6);
        ctx.stroke();
        if (!erupt) {
            // 蓄势：山口熔光渐盛
            ctx.fillStyle = 'rgba(255,150,60,' + (0.3 + grow * 0.5).toFixed(3) + ')';
            ctx.beginPath();
            g_ellipse(ctx, 0, -mh, 5 * grow + 0.01, 2 * grow + 0.01);
            ctx.fill();
        } else {
            // 喷发：冲天烈焰柱（内白外橙） + 迸溅火星
            const jh = 150 + Math.sin(an * 0.5) * 14; // 焰柱高度脉动
            const jw = 13 + Math.sin(an * 0.7) * 2;
            const flame = ctx.createLinearGradient(0, -mh, 0, -mh - jh);
            flame.addColorStop(0, 'rgba(255,210,60,0.95)');
            flame.addColorStop(0.5, 'rgba(255,120,40,0.8)');
            flame.addColorStop(1, 'rgba(255,80,20,0)');
            ctx.fillStyle = flame;
            ctx.beginPath();
            ctx.moveTo(-jw, -mh);
            ctx.quadraticCurveTo(-jw * 1.6, -mh - jh * 0.5, -3, -mh - jh);
            ctx.lineTo(3, -mh - jh);
            ctx.quadraticCurveTo(jw * 1.6, -mh - jh * 0.5, jw, -mh);
            ctx.closePath();
            ctx.fill();
            // 焰芯
            ctx.fillStyle = 'rgba(255,244,200,0.85)';
            ctx.beginPath();
            ctx.moveTo(-4, -mh);
            ctx.quadraticCurveTo(-5, -mh - jh * 0.4, 0, -mh - jh * 0.62);
            ctx.quadraticCurveTo(5, -mh - jh * 0.4, 4, -mh);
            ctx.closePath();
            ctx.fill();
            // 迸溅火星（确定相位防闪烁）
            ctx.fillStyle = '#ffd23c';
            for (let i = 0; i < 6; i++) {
                const ph = an * 0.4 + i * 1.9;
                const px = Math.sin(ph) * (14 + i * 3);
                const py = -mh - ((an * 4 + i * 26) % (jh * 0.9));
                ctx.beginPath();
                ctx.arc(px, py, 1.6 - (i % 3) * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;
    } else if (p.type === 'meteor') { // 极之番·陨：巨大炽热陨石（熔岩裂纹巨岩 + 冲天焰尾 + 灼热光晕）
        const an = p.anim || 0;
        ctx.translate(p.x, p.y);
        // 上扬焰尾（坠落反方向拖出的火幕）
        const tail = ctx.createLinearGradient(0, -170, 0, 0);
        tail.addColorStop(0, 'rgba(255,90,20,0)');
        tail.addColorStop(0.6, 'rgba(255,120,40,0.35)');
        tail.addColorStop(1, 'rgba(255,180,80,0.7)');
        ctx.fillStyle = tail;
        ctx.beginPath();
        ctx.moveTo(-52, -20);
        ctx.quadraticCurveTo(-30, -120, -8, -168);
        ctx.lineTo(14, -160);
        ctx.quadraticCurveTo(36, -100, 54, -16);
        ctx.closePath();
        ctx.fill();
        // 外围炽热光晕
        const g7 = ctx.createRadialGradient(0, 0, 16, 0, 0, 100);
        g7.addColorStop(0, '#fff');
        g7.addColorStop(0.28, '#ffd23c');
        g7.addColorStop(0.55, '#ff8a3c');
        g7.addColorStop(0.8, 'rgba(255,106,42,0.5)');
        g7.addColorStop(1, 'rgba(255,80,20,0)');
        ctx.fillStyle = g7;
        ctx.beginPath();
        ctx.arc(0, 0, 100, 0, Math.PI * 2);
        ctx.fill();
        // 岩石本体（缓转的多边形巨岩）
        ctx.rotate(an * 0.02);
        ctx.fillStyle = '#5a3018';
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
            const a = i * Math.PI * 2 / 9;
            const rr = 48 + (i % 3) * 7;
            if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
            else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        // 表面熔岩裂纹（灼热网状裂隙）
        ctx.strokeStyle = 'rgba(255,150,60,' + (0.7 + Math.sin(an * 0.2) * 0.2).toFixed(3) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-40, -8);
        ctx.lineTo(-14, 2);
        ctx.lineTo(6, -16);
        ctx.lineTo(32, -6);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-20, 30);
        ctx.lineTo(-2, 14);
        ctx.lineTo(10, 32);
        ctx.stroke();
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-14, 2);
        ctx.lineTo(-18, 22);
        ctx.stroke();
        // 灼热岩窝
        ctx.fillStyle = 'rgba(255,180,80,0.75)';
        ctx.beginPath();
        ctx.arc(-16, -14, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(18, 16, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,244,200,0.8)';
        ctx.beginPath();
        ctx.arc(-16, -14, 4, 0, Math.PI * 2);
        ctx.fill();
    } else if (p.type === 'waterjet') { // 激流·水铁炮：高压水弹（拉长水滴弹体 + 白沫弹头 + 尾部波纹）
        const an = p.anim || 0;
        const dir = p.vx >= 0 ? 1 : -1;
        const sc = p.big ? 1.35 : 1;
        ctx.translate(p.x, p.y);
        ctx.scale(dir * sc, sc);
        // 外围水雾光晕
        const gw = ctx.createRadialGradient(0, 0, 4, 0, 0, 30);
        gw.addColorStop(0, 'rgba(216,244,255,0.75)');
        gw.addColorStop(0.5, 'rgba(89,200,232,0.4)');
        gw.addColorStop(1, 'rgba(62,160,200,0)');
        ctx.fillStyle = gw;
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fill();
        // 弹体：前锐后拖的水滴形
        ctx.fillStyle = 'rgba(89,200,232,0.85)';
        ctx.beginPath();
        ctx.moveTo(22, 0);
        ctx.quadraticCurveTo(10, -10, -12, -7 + Math.sin(an * 0.6) * 1.5);
        ctx.quadraticCurveTo(-26, 0, -12, 7 - Math.sin(an * 0.6) * 1.5);
        ctx.quadraticCurveTo(10, 10, 22, 0);
        ctx.closePath();
        ctx.fill();
        // 弹头白沫高光
        ctx.fillStyle = 'rgba(232,250,255,0.9)';
        ctx.beginPath();
        g_ellipse(ctx, 13, -1.5, 7, 4.5);
        ctx.fill();
        // 尾部波纹拖流（确定相位）
        ctx.strokeStyle = 'rgba(216,244,255,0.6)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(-8, (i - 1) * 5);
            ctx.quadraticCurveTo(-20, (i - 1) * 5 + Math.sin(an * 0.5 + i * 2) * 3, -32 - i * 4, (i - 1) * 3);
            ctx.stroke();
        }
    } else if (p.type === 'waterwall') { // 水阵壁：环身水幕（旋流水环 + 浮沫气泡，跟随施术者）
        const an = p.anim || 0;
        const fade = Math.min(1, (p.life || 0) / 14) * Math.min(1, an / 8);
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = fade;
        // 三层旋流水环（异速旋转的断弧）
        for (let l = 0; l < 3; l++) {
            const rr = 46 + l * 11;
            const rot = an * (0.06 + l * 0.03) * (l % 2 ? -1 : 1);
            ctx.strokeStyle = l === 2 ? 'rgba(216,244,255,0.75)' : `rgba(89,200,232,${0.7 - l * 0.15})`;
            ctx.lineWidth = 7 - l * 2;
            ctx.lineCap = 'round';
            for (let s = 0; s < 3; s++) {
                const a0 = rot + s * Math.PI * 2 / 3;
                ctx.beginPath();
                ctx.arc(0, 0, rr, a0, a0 + Math.PI * 0.5);
                ctx.stroke();
            }
        }
        // 内层水光澉渡
        const gwl = ctx.createRadialGradient(0, 0, 20, 0, 0, 58);
        gwl.addColorStop(0, 'rgba(89,200,232,0)');
        gwl.addColorStop(0.8, 'rgba(89,200,232,0.16)');
        gwl.addColorStop(1, 'rgba(216,244,255,0.28)');
        ctx.fillStyle = gwl;
        ctx.beginPath();
        ctx.arc(0, 0, 58, 0, Math.PI * 2);
        ctx.fill();
        // 上浮水泡（确定相位循环）
        ctx.fillStyle = 'rgba(216,244,255,0.7)';
        for (let i = 0; i < 7; i++) {
            const ba = i * Math.PI * 2 / 7 + an * 0.04;
            const br = 40 + (i % 3) * 9;
            const by = -((an * 1.4 + i * 22) % 70) + 30;
            ctx.beginPath();
            ctx.arc(Math.cos(ba) * br, by, 1.4 + (i % 3) * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    } else if (p.type === 'torrent') { // 水阵壁·激流：奔涌水墙（卷浪浪头 + 分层水体 + 飞溅浪花）
        const an = p.anim || 0;
        const dir = p.vx >= 0 ? 1 : -1;
        const grow = Math.min(1, an / 6);
        ctx.translate(p.x, p.y + p.h / 2);
        ctx.scale(dir, grow);
        const H = p.h;
        // 水墙主体：前倾卷浪轮廓
        const gt = ctx.createLinearGradient(0, -H, 0, 0);
        gt.addColorStop(0, 'rgba(216,244,255,0.85)');
        gt.addColorStop(0.35, 'rgba(89,200,232,0.8)');
        gt.addColorStop(1, 'rgba(26,90,110,0.85)');
        ctx.fillStyle = gt;
        ctx.beginPath();
        ctx.moveTo(-p.w / 2, 0);
        ctx.lineTo(-p.w / 2 + 8, -H * 0.55);
        ctx.quadraticCurveTo(-p.w * 0.2, -H * 1.02, p.w * 0.3, -H * 0.92);
        // 卷曲浪头（前端内勾）
        ctx.quadraticCurveTo(p.w * 0.62, -H * 0.86, p.w * 0.5, -H * 0.62);
        ctx.quadraticCurveTo(p.w * 0.44, -H * 0.48, p.w * 0.56, -H * 0.4);
        ctx.quadraticCurveTo(p.w * 0.6, -H * 0.2, p.w / 2, 0);
        ctx.closePath();
        ctx.fill();
        // 分层水流线（随时间涌动）
        ctx.strokeStyle = 'rgba(216,244,255,0.55)';
        ctx.lineWidth = 2.4;
        for (let i = 0; i < 4; i++) {
            const ly = -H * (0.22 + i * 0.18);
            ctx.beginPath();
            ctx.moveTo(-p.w / 2 + 10, ly);
            ctx.quadraticCurveTo(0, ly - 10 + Math.sin(an * 0.4 + i * 1.8) * 5, p.w * 0.42, ly - H * 0.06);
            ctx.stroke();
        }
        // 浪头白沫
        ctx.fillStyle = 'rgba(232,250,255,0.9)';
        ctx.beginPath();
        g_ellipse(ctx, p.w * 0.42, -H * 0.9, 16, 8);
        ctx.fill();
        // 飞溅浪花（确定相位）
        ctx.fillStyle = 'rgba(216,244,255,0.75)';
        for (let i = 0; i < 6; i++) {
            const sx = p.w * 0.3 + ((an * 3 + i * 17) % 30);
            const sy = -H * 0.95 - ((an * 2 + i * 13) % 26) + (i % 2) * 8;
            ctx.beginPath();
            ctx.arc(sx, sy, 1.6 + (i % 3) * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        // 墙脚拖沫
        ctx.fillStyle = 'rgba(232,250,255,0.5)';
        ctx.beginPath();
        g_ellipse(ctx, -p.w * 0.1, -3, p.w * 0.55, 6);
        ctx.fill();
    } else if (p.type === 'shark') { // 死累累涌军：食肉鱼式神（张口利齿 + 背鳍尾鳍 + 水幕拖流）
        const an = p.anim || 0;
        const dir = p.vx >= 0 ? 1 : -1;
        const sc = (p.big ? 1.25 : 1) * (p.w / 66);
        ctx.translate(p.x, p.y);
        ctx.scale(dir * sc, sc);
        ctx.rotate(Math.atan2(p.vy || 0, Math.abs(p.vx) || 1) * 0.7);
        // 拖行水幕
        const gs = ctx.createLinearGradient(-56, 0, -10, 0);
        gs.addColorStop(0, 'rgba(89,200,232,0)');
        gs.addColorStop(1, 'rgba(89,200,232,0.5)');
        ctx.fillStyle = gs;
        ctx.beginPath();
        g_ellipse(ctx, -34, 0, 26, 10);
        ctx.fill();
        // 鱼躯：前宽后收的梭形
        ctx.fillStyle = '#2e5a68';
        ctx.beginPath();
        ctx.moveTo(26, 0);
        ctx.quadraticCurveTo(12, -15, -14, -9);
        ctx.quadraticCurveTo(-26, -4, -30, 0);
        ctx.quadraticCurveTo(-26, 4, -14, 10);
        ctx.quadraticCurveTo(12, 16, 26, 0);
        ctx.closePath();
        ctx.fill();
        // 腹部亮色
        ctx.fillStyle = '#7adcd4';
        ctx.beginPath();
        ctx.moveTo(24, 2);
        ctx.quadraticCurveTo(8, 13, -12, 9);
        ctx.quadraticCurveTo(4, 8, 24, 2);
        ctx.closePath();
        ctx.fill();
        // 背鳍
        ctx.fillStyle = '#173a4a';
        ctx.beginPath();
        ctx.moveTo(-2, -11);
        ctx.lineTo(4, -24);
        ctx.lineTo(10, -10);
        ctx.closePath();
        ctx.fill();
        // 尾鳍（摆动）
        const tw = Math.sin(an * 0.7) * 6;
        ctx.beginPath();
        ctx.moveTo(-28, 0);
        ctx.lineTo(-42, -10 + tw);
        ctx.lineTo(-38, 0 + tw * 0.3);
        ctx.lineTo(-42, 10 + tw);
        ctx.closePath();
        ctx.fill();
        // 张开的口：上下颌夹角 + 三角利齿
        ctx.fillStyle = '#0e2430';
        ctx.beginPath();
        ctx.moveTo(26, 0);
        ctx.lineTo(8, -7);
        ctx.lineTo(8, 8);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e8f6ff';
        for (let i = 0; i < 3; i++) {
            // 上颌齿
            ctx.beginPath();
            ctx.moveTo(11 + i * 5, -5 + i * 1.2);
            ctx.lineTo(13.5 + i * 5, -0.5 + i * 0.8);
            ctx.lineTo(15 + i * 5, -4 + i * 1.2);
            ctx.closePath();
            ctx.fill();
            // 下颌齿
            ctx.beginPath();
            ctx.moveTo(10 + i * 5, 6 - i * 0.8);
            ctx.lineTo(12.5 + i * 5, 1.5 - i * 0.5);
            ctx.lineTo(14 + i * 5, 5.5 - i * 0.8);
            ctx.closePath();
            ctx.fill();
        }
        // 白碍小眼（凶狠无神）
        ctx.fillStyle = '#d8f4ff';
        ctx.beginPath();
        ctx.arc(9, -5.5, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0e1a20';
        ctx.beginPath();
        ctx.arc(9.8, -5.5, 1.2, 0, Math.PI * 2);
        ctx.fill();
        // 飞溅水珠（确定相位）
        ctx.fillStyle = 'rgba(216,244,255,0.7)';
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(-14 - ((an * 2 + i * 15) % 26), -12 + (i % 2) * 22, 1.5 + (i % 2) * 0.8, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (p.type === 'uzumaki') { // 极之番「漩涡」：千咒压缩螺旋弹
        const rot = (p.anim || 0) * 0.15;
        ctx.translate(p.x, p.y);
        // 外围空间扭曲环（不随螺旋旋转，呼吸明灭）
        ctx.strokeStyle = 'rgba(184,143,216,' + (0.22 + Math.sin((p.anim || 0) * 0.3) * 0.10).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 96, 0, Math.PI * 2);
        ctx.stroke();
        ctx.rotate(rot);
        // 五重螺旋臂（紫→白逐层提亮）
        for (let i = 0; i < 5; i++) {
            const a = i * Math.PI * 2 / 5;
            ctx.strokeStyle = `rgba(${184+i*14},${143+i*22},${216+i*8},${0.75-i*0.09})`;
            ctx.lineWidth = 13 - i * 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, 0, 82 - i * 12, a, a + Math.PI * 1.25);
            ctx.stroke();
        }
        // 反向内螺旋（双层叠转增密度）
        ctx.rotate(-rot * 2.2);
        ctx.strokeStyle = 'rgba(224,204,242,0.5)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 3; i++) {
            const a = i * Math.PI * 2 / 3;
            ctx.beginPath();
            ctx.arc(0, 0, 44 - i * 10, a, a + Math.PI * 1.5);
            ctx.stroke();
        }
        ctx.rotate(rot * 2.2);
        // 被卷入的咒灵碎影（随螺旋公转的暗色团块）
        ctx.fillStyle = 'rgba(42,26,62,0.85)';
        for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3 + rot * 0.5;
            const rr = 56 + (i % 3) * 12;
            ctx.beginPath();
            g_ellipse(ctx, Math.cos(a) * rr, Math.sin(a) * rr, 7 - (i % 3), 4.5);
            ctx.fill();
        }
        // 炽白压缩核（双层径向渐变）
        const g8 = ctx.createRadialGradient(0, 0, 4, 0, 0, 52);
        g8.addColorStop(0, '#fff');
        g8.addColorStop(0.45, '#d8bcf2');
        g8.addColorStop(0.8, 'rgba(140,80,200,0.5)');
        g8.addColorStop(1, 'rgba(100,50,160,0)');
        ctx.fillStyle = g8;
        ctx.beginPath();
        ctx.arc(0, 0, 52, 0, Math.PI * 2);
        ctx.fill();
        const g8b = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);
        g8b.addColorStop(0, '#ffffff');
        g8b.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g8b;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
    } else if (p.type === 'gyokuken') { // 玉犬：白犬/黑犬双形态，「浑」为强化黑犬
        ctx.translate(p.x, p.y);
        ctx.scale(p.vx > 0 ? 1 : -1, 1);
        const an = p.anim || 0;
        const run = Math.sin(an * 0.55) * 5;          // 奔跑相位
        const lunge = Math.sin(an * 0.55 + 1.2) * 4;  // 前躯起伏
        const white = !!p.white;
        const kon = !!p.kon;
        const body = white ? '#e8ecff' : '#141020';
        const shade = white ? '#b8c0e0' : '#2a2244';
        const glow = kon ? 'rgba(106,92,255,' : (white ? 'rgba(232,236,255,' : 'rgba(143,123,255,');
        // 奔行影迹/咒力辉
        const ga = ctx.createRadialGradient(0, -10, 4, 0, -10, kon ? 60 : 48);
        ga.addColorStop(0, glow + (kon ? 0.30 : 0.18) + ')');
        ga.addColorStop(1, glow + '0)');
        ctx.fillStyle = ga;
        ctx.beginPath();
        ctx.arc(0, -10, kon ? 60 : 48, 0, Math.PI * 2);
        ctx.fill();
        // 后拖残影（确定性相位）
        for (let i = 1; i <= 2; i++) {
            ctx.globalAlpha = 0.16 / i;
            ctx.fillStyle = body;
            ctx.beginPath();
            g_ellipse(ctx, -i * 16, -8 + run * 0.2, 30, 14);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        // 躯体（前低后高的冲刺姿）
        ctx.fillStyle = body;
        ctx.beginPath();
        g_ellipse(ctx, 0, -8 + run * 0.3, 34, 16);
        ctx.fill();
        // 胸腹阴影分层
        ctx.fillStyle = shade;
        ctx.beginPath();
        g_ellipse(ctx, -6, -2 + run * 0.3, 22, 8);
        ctx.fill();
        // 头（低伏前探）+ 张口下颌
        ctx.fillStyle = body;
        ctx.beginPath();
        g_ellipse(ctx, 27, -18 + lunge * 0.4, 14, 11);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(34, -14 + lunge * 0.4);
        ctx.lineTo(44, -10 + lunge * 0.4);
        ctx.lineTo(34, -8 + lunge * 0.4);
        ctx.closePath();
        ctx.fill(); // 上颌吻
        ctx.beginPath();
        ctx.moveTo(33, -8 + lunge * 0.4);
        ctx.lineTo(40, -4 + lunge * 0.4);
        ctx.lineTo(32, -4 + lunge * 0.4);
        ctx.closePath();
        ctx.fill(); // 下颌
        // 牙（白犬用暗色衬）
        ctx.fillStyle = white ? '#8a92b8' : '#e9e4ff';
        ctx.beginPath();
        ctx.moveTo(36, -10 + lunge * 0.4);
        ctx.lineTo(38, -7 + lunge * 0.4);
        ctx.lineTo(34, -8 + lunge * 0.4);
        ctx.closePath();
        ctx.fill();
        // 双耳
        ctx.fillStyle = body;
        ctx.beginPath();
        ctx.moveTo(20, -27 + lunge * 0.4);
        ctx.lineTo(25, -41 + lunge * 0.4);
        ctx.lineTo(31, -26 + lunge * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(30, -26 + lunge * 0.4);
        ctx.lineTo(36, -38 + lunge * 0.4);
        ctx.lineTo(38, -24 + lunge * 0.4);
        ctx.closePath();
        ctx.fill();
        // 四肢奔跑（前后交替）
        ctx.strokeStyle = body;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(20 + run, 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(8, 2);
        ctx.lineTo(4 - run, 13);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(-10 - run, 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.lineTo(-26 + run, 11);
        ctx.stroke();
        // 尾（上扬咒力尾）
        ctx.strokeStyle = kon ? '#6a5cff' : (white ? '#cdd6f4' : '#b9a8ff');
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-30, -12);
        ctx.quadraticCurveTo(-44, -20 + Math.sin(an * 0.3) * 3, -40, -32 + Math.sin(an * 0.3 + 1) * 3);
        ctx.stroke();
        // 额心咒印（浑：双纹）
        ctx.strokeStyle = kon ? '#8f7bff' : (white ? '#8a92b8' : '#5a4a8e');
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(23, -25 + lunge * 0.4);
        ctx.lineTo(29, -23 + lunge * 0.4);
        ctx.stroke();
        if (kon) {
            ctx.beginPath();
            ctx.moveTo(22, -22 + lunge * 0.4);
            ctx.lineTo(28, -20 + lunge * 0.4);
            ctx.stroke();
        }
        // 眼
        ctx.fillStyle = kon ? '#b9a8ff' : (white ? '#4a5478' : '#e9e4ff');
        ctx.beginPath();
        ctx.arc(31, -19 + lunge * 0.4, 2.4, 0, Math.PI * 2);
        ctx.fill();
        // 咒力环
        ctx.strokeStyle = glow + '0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -8, (kon ? 46 : 42) + Math.sin(an * 0.4) * 4, 0, Math.PI * 2);
        ctx.stroke();
        // 浑：额外速度线
        if (kon) {
            ctx.strokeStyle = 'rgba(185,168,255,0.55)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const ly = -26 + i * 12 + Math.sin(an * 0.4 + i) * 2;
                ctx.beginPath();
                ctx.moveTo(-40, ly);
                ctx.lineTo(-62 - i * 5, ly);
                ctx.stroke();
            }
        }
    } else if (p.type === 'rabbit') { // 脱兔：弹跳影兔群
        ctx.translate(p.x, p.y);
        ctx.scale(p.vx > 0 ? 1 : -1, 1);
        const an = p.anim || 0;
        const hop = Math.abs(Math.sin(an * 0.4)); // 蹬伸相位
        // 影辉
        const gr2 = ctx.createRadialGradient(0, -6, 2, 0, -6, 26);
        gr2.addColorStop(0, 'rgba(232,236,255,0.30)');
        gr2.addColorStop(1, 'rgba(232,236,255,0)');
        ctx.fillStyle = gr2;
        ctx.beginPath();
        ctx.arc(0, -6, 26, 0, Math.PI * 2);
        ctx.fill();
        // 躯体（跳跃时拉长）
        ctx.fillStyle = '#e8ecff';
        ctx.beginPath();
        g_ellipse(ctx, 0, -6, 12 + hop * 4, 9 - hop * 2);
        ctx.fill();
        // 头
        ctx.beginPath();
        ctx.arc(10, -11, 6, 0, Math.PI * 2);
        ctx.fill();
        // 长耳（后招）
        ctx.strokeStyle = '#e8ecff';
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(8, -16);
        ctx.quadraticCurveTo(2, -28, -4, -30 + hop * 3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(11, -16);
        ctx.quadraticCurveTo(7, -30, 2, -34 + hop * 3);
        ctx.stroke();
        // 后腿蹬伸
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-8, -2);
        ctx.lineTo(-14 - hop * 5, 2 - hop * 3);
        ctx.stroke();
        // 短尾
        ctx.fillStyle = '#cdd6f4';
        ctx.beginPath();
        ctx.arc(-12, -8, 2.4, 0, Math.PI * 2);
        ctx.fill();
        // 影瞳
        ctx.fillStyle = '#4a5478';
        ctx.beginPath();
        ctx.arc(12, -12, 1.4, 0, Math.PI * 2);
        ctx.fill();
        // 尾迹速度线
        ctx.strokeStyle = 'rgba(232,236,255,0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-16, -8);
        ctx.lineTo(-30, -8);
        ctx.stroke();
    } else if (p.type === 'orochi') { // 大蛇：自地暴起的巨蟒
        const an = p.anim || 0;
        const dir = (p.owner && p.owner.facing) || 1;
        ctx.translate(p.x, p.y);
        ctx.scale(dir, 1);
        // 地面影气基座
        const go = ctx.createRadialGradient(0, p.h / 2, 8, 0, p.h / 2, 90);
        go.addColorStop(0, 'rgba(8,5,20,0.55)');
        go.addColorStop(1, 'rgba(8,5,20,0)');
        ctx.fillStyle = go;
        ctx.beginPath();
        g_ellipse(ctx, 0, p.h / 2, 90, 22);
        ctx.fill();
        // 蛇躯：S 形盘旋上升（确定性摆相）
        const sway = Math.sin(an * 0.16) * 10;
        ctx.strokeStyle = '#1a2430';
        ctx.lineWidth = 34;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-14, p.h / 2);
        ctx.bezierCurveTo(-38 + sway, p.h * 0.2, 30 + sway, -p.h * 0.05, 6 + sway * 0.5, -p.h / 2 + 34);
        ctx.stroke();
        // 腹部亮鳞
        ctx.strokeStyle = '#3a5a4e';
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.moveTo(-14, p.h / 2 - 4);
        ctx.bezierCurveTo(-36 + sway, p.h * 0.2, 28 + sway, -p.h * 0.05, 6 + sway * 0.5, -p.h / 2 + 36);
        ctx.stroke();
        // 鳞纹（沿躯确定性排列）
        ctx.strokeStyle = 'rgba(95,200,140,0.40)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const tt = 0.15 + i * 0.13;
            const sx = -14 + (6 + sway * 0.5 + 14) * tt + Math.sin(tt * 5 + an * 0.1) * 16;
            const sy = p.h / 2 - p.h * tt;
            ctx.beginPath();
            ctx.arc(sx, sy, 9, -0.8, 0.8);
            ctx.stroke();
        }
        // 蛇头（顶端前探，张口）
        const hx2 = 6 + sway * 0.5,
            hy2 = -p.h / 2 + 30;
        ctx.fillStyle = '#1a2430';
        ctx.beginPath();
        g_ellipse(ctx, hx2 + 12, hy2 - 6, 24, 15);
        ctx.fill();
        // 上下颌张合
        const jaw = 0.5 + Math.sin(an * 0.2) * 0.2;
        ctx.beginPath();
        ctx.moveTo(hx2 + 28, hy2 - 12);
        ctx.lineTo(hx2 + 52, hy2 - 14 - jaw * 10);
        ctx.lineTo(hx2 + 30, hy2 - 4);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(hx2 + 28, hy2 - 2);
        ctx.lineTo(hx2 + 48, hy2 + 4 + jaw * 8);
        ctx.lineTo(hx2 + 26, hy2 + 6);
        ctx.closePath();
        ctx.fill();
        // 犬牙
        ctx.fillStyle = '#e9e4ff';
        ctx.beginPath();
        ctx.moveTo(hx2 + 44, hy2 - 12 - jaw * 8);
        ctx.lineTo(hx2 + 46, hy2 - 5);
        ctx.lineTo(hx2 + 40, hy2 - 9);
        ctx.closePath();
        ctx.fill();
        // 蛇信（分叉软摆）
        ctx.strokeStyle = '#8f2b4a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(hx2 + 50, hy2 - 4);
        ctx.lineTo(hx2 + 62, hy2 - 4 + Math.sin(an * 0.5) * 3);
        ctx.stroke();
        // 蛇目（金绿竖瞳）
        ctx.fillStyle = '#c8e85c';
        ctx.beginPath();
        ctx.arc(hx2 + 16, hy2 - 10, 3.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0c1410';
        ctx.fillRect(hx2 + 15.2, hy2 - 13, 1.6, 6);
        // 咒力影环
        ctx.strokeStyle = 'rgba(115,95,255,' + (0.30 + Math.sin(an * 0.25) * 0.12).toFixed(3) + ')';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        g_ellipse(ctx, 0, 0, 60, p.h * 0.42);
        ctx.stroke();
    } else if (p.type === 'ido') { // 不知井底：鵺×虾蟆嵌合式神（蛙躯鵺翅，自空俯冲）
        const an = p.anim || 0;
        const dirI = (p.vx || 0) >= 0 ? 1 : -1;
        ctx.translate(p.x, p.y);
        ctx.scale(dirI, 1);
        // 俯冲/拉升时机体随航迹俯仰
        ctx.rotate(Math.atan2(p.vy || 0, Math.abs(p.vx) || 1) * 0.55);
        const flap = Math.sin(an * 0.5) * 13;
        // 咒力影辉氛围
        const gi = ctx.createRadialGradient(0, 0, 6, 0, 0, 62);
        gi.addColorStop(0, 'rgba(154,184,255,0.30)');
        gi.addColorStop(0.5, 'rgba(106,92,255,0.16)');
        gi.addColorStop(1, 'rgba(106,92,255,0)');
        ctx.fillStyle = gi;
        ctx.beginPath();
        ctx.arc(0, 0, 62, 0, Math.PI * 2);
        ctx.fill();
        // 后拖影流尾迹（飞行感速度线）
        ctx.strokeStyle = 'rgba(115,95,255,0.4)';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
            const ly = -10 + i * 9 + Math.sin(an * 0.3 + i * 2) * 2;
            ctx.beginPath();
            ctx.moveTo(-34, ly);
            ctx.lineTo(-58 - i * 7, ly + 3);
            ctx.stroke();
        }
        // 鵺之双翅（双层羽，振翅与鵺同源配色）
        ctx.fillStyle = '#5a5a8a';
        ctx.beginPath();
        g_ellipse(ctx, -6, -16 - flap, 30, 9);
        ctx.fill();
        ctx.beginPath();
        g_ellipse(ctx, -6, -16 + flap, 30, 9);
        ctx.fill();
        ctx.fillStyle = '#6e6ea6';
        ctx.beginPath();
        g_ellipse(ctx, -16, -19 - flap * 1.2, 17, 5.5);
        ctx.fill();
        ctx.beginPath();
        g_ellipse(ctx, -16, -19 + flap * 1.2, 17, 5.5);
        ctx.fill();
        // 翅梢零散羽片（确定性飘落）
        ctx.fillStyle = 'rgba(110,110,166,0.6)';
        for (let i = 0; i < 3; i++) {
            const ph = ((an * 0.04 + i * 0.33) % 1);
            ctx.globalAlpha = (1 - ph) * 0.6;
            ctx.beginPath();
            g_ellipse(ctx, -26 - ph * 22, -14 + ph * 20 + i * 4, 4, 1.6);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        // 虾蟆躯体：宽矮蒹身 + 淡色肋腹
        ctx.fillStyle = '#2c3a36';
        ctx.beginPath();
        g_ellipse(ctx, 0, 0, 30, 17);
        ctx.fill();
        ctx.fillStyle = '#93a89c';
        ctx.beginPath();
        g_ellipse(ctx, 4, 7, 20, 8);
        ctx.fill();
        // 背部疣粒斑（虾蟆特征）
        ctx.fillStyle = 'rgba(58,74,66,0.9)';
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.arc(-14 + i * 9, -8 - (i % 2) * 4, 2.2, 0, Math.PI * 2);
            ctx.fill();
        }
        // 蛙首：宽嘴头部前伸
        ctx.fillStyle = '#33443e';
        ctx.beginPath();
        g_ellipse(ctx, 26, -3, 15, 11);
        ctx.fill();
        // 宽嘴缝（俯冲时张口）
        const jaw = p.vy > 1 ? 0.35 : 0.12;
        ctx.strokeStyle = '#141c1a';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(16, 2);
        ctx.quadraticCurveTo(30, 4 + jaw * 12, 39, 1 + jaw * 8);
        ctx.stroke();
        // 蛙舌：俯冲攻击时前探弹射（确定性相位）
        if (p.vy > 1) {
            const tl = 26 + Math.sin(an * 0.45) * 10;
            ctx.strokeStyle = '#c88fb8';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(36, 3);
            ctx.quadraticCurveTo(44 + tl * 0.5, 8, 38 + tl, 12 + Math.sin(an * 0.3) * 4);
            ctx.stroke();
            ctx.fillStyle = '#d8a8c8';
            ctx.beginPath();
            ctx.arc(38 + tl, 12 + Math.sin(an * 0.3) * 4, 3, 0, Math.PI * 2);
            ctx.fill();
        }
        // 鼓目：头顶双眸隆起，金瞳竖瞳孔
        ctx.fillStyle = '#33443e';
        ctx.beginPath();
        ctx.arc(24, -12, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(32, -10, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffd45c';
        ctx.beginPath();
        ctx.arc(24, -12, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(32, -10, 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#141c1a';
        ctx.fillRect(23.2, -14.4, 1.6, 5);
        ctx.fillRect(31.3, -12.3, 1.4, 4.6);
        // 收拢的蹼足（飞行时后收，随振翅微摆）
        ctx.strokeStyle = '#26332e';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-8, 12);
        ctx.lineTo(-20, 18 + flap * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(8, 13);
        ctx.lineTo(0, 20 - flap * 0.2);
        ctx.stroke();
        // 额心嵌合咒印：双纹（两式神合体的印记）
        ctx.strokeStyle = 'rgba(185,168,255,0.85)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(20, -7);
        ctx.lineTo(26, -5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(20, -4);
        ctx.lineTo(26, -2);
        ctx.stroke();
        // 咒力影环（呼吸明灭）
        ctx.strokeStyle = 'rgba(143,123,255,' + (0.30 + Math.sin(an * 0.25) * 0.12).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        g_ellipse(ctx, 0, 0, 44, 22);
        ctx.stroke();
    } else if (p.type === 'slashP') { // 宿傩「解」：赤色斩击波（残影 + 炎白刃芯 + 刃屑飞散）
        const an = p.anim || 0;
        const dir = (p.vx || 0) >= 0 ? 1 : -1;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.ang || 0);
        // 双重滞后残影
        for (let k = 2; k >= 1; k--) {
            ctx.globalAlpha = 0.16 * k;
            ctx.strokeStyle = '#ff8ca6';
            ctx.lineWidth = 8 - k;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(-p.w / 2 - dir * k * 9, k * 2);
            ctx.quadraticCurveTo(-dir * k * 9, -14 + k * 2, p.w / 2 - dir * k * 9, k * 2);
            ctx.stroke();
        }
        // 主刃
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = '#ff6d8d';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-p.w / 2, 0);
        ctx.quadraticCurveTo(0, -14, p.w / 2, 0);
        ctx.stroke();
        // 炎白刃芯
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-p.w / 2 + 8, 0);
        ctx.quadraticCurveTo(0, -10, p.w / 2 - 8, 0);
        ctx.stroke();
        // 刃屑：沿刃口确定性飞散（基于帧计数，不闪烁）
        for (let i = 0; i < 4; i++) {
            const ph = ((an * 0.07 + i * 0.25) % 1);
            const px2 = -p.w / 2 + p.w * ((i * 0.27 + an * 0.02) % 1);
            ctx.globalAlpha = (1 - ph) * 0.7;
            ctx.fillStyle = i % 2 ? '#ffd2dc' : '#ff8ca6';
            ctx.beginPath();
            ctx.arc(px2, -8 - ph * 12, 1.4, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
}
