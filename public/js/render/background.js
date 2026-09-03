/* =====================================================================
   背景渲染：多战斗场景地图
   ===================================================================== */
import { VW, VH, GROUND } from '../config.js';
import { rand, irand, lerp, dprOf } from '../utils.js';
import { FX } from '../fx.js';

export const BG = {
    current: 'shibuya',
    cache: {},
    setStage(id) { this.current = id || 'shibuya'; },
    draw(g, t, stageId) {
        const id = stageId || this.current || 'shibuya';
        switch (id) {
            case 'shibuya':
                this.drawShibuya(g, t);
                break;
            case 'kyoto':
                this.drawKyoto(g, t);
                break;
            case 'tokyo-rooftop':
                this.drawRooftop(g, t);
                break;
            case 'cursed-forest':
                this.drawForest(g, t);
                break;
            case 'sendai-beach':
                this.drawBeach(g, t);
                break;
            case 'abandoned-shrine':
                this.drawShrine(g, t);
                break;
            case 'underground':
                this.drawUnderground(g, t);
                break;
            default:
                this.drawShibuya(g, t);
        }
    },

    /* ---------------- 通用工具 ---------------- */
    _get(key, fn) {
        if (!this.cache[key]) this.cache[key] = fn();
        return this.cache[key];
    },
    _ensureBuildings() {
        return this._get('buildings', () => {
            const bs = [];
            let x = -40;
            while (x < VW + 80) { const w = rand(70, 160),
                    h = rand(80, 260);
                bs.push({ x, w, h, layer: 0, win: irand(2, 5) });
                x += w + rand(10, 50); }
            x = -60;
            while (x < VW + 120) { const w = rand(90, 200),
                    h = rand(160, 380);
                bs.push({ x, w, h, layer: 1, win: irand(3, 7) });
                x += w + rand(20, 70); }
            return bs;
        });
    },
    _ensureEmbers(n) {
        return this._get('embers', () => { const arr = []; for (let i = 0; i < n; i++) arr.push({ x: rand(0, VW), y: rand(0, VH), s: rand(1, 3), vy: rand(0.2, 0.7), ph: rand(0, 6) }); return arr; });
    },
    _ensureTrees(n) {
        return this._get('trees', () => { const arr = []; for (let i = 0; i < n; i++) arr.push({ x: rand(-60, VW + 60), h: rand(180, 360), w: rand(18, 34), ph: rand(0, 6) }); return arr; });
    },
    _ensurePillars(n) {
        return this._get('pillars', () => { const arr = []; for (let i = 0; i < n; i++) arr.push({ x: rand(60, VW - 60), w: rand(40, 90), h: rand(180, 340) }); return arr; });
    },
    /* P2-3：离屏烘焙。全项目原本 createElement('canvas') 为 0，静态几何每帧全量重绘。
       这里把"永不变化的图形"画到离屏 canvas 上，之后每帧只 drawImage。
       离屏尺寸按 dpr 放大，保证高 dpr 屏上不因位图拉伸发虚。
       注意：只能烘焙不含时间/随机动画的图形，且绘制结果必须允许透明背景叠加。 */
    _bake(key, fn){
        if(this.cache['bake:'+key]) return this.cache['bake:'+key];
        const dpr = dprOf();
        const c = document.createElement('canvas');
        c.width = Math.round(VW * dpr);
        c.height = Math.round(VH * dpr);
        const cg = c.getContext('2d');
        cg.setTransform(dpr, 0, 0, dpr, 0, 0);
        fn(cg);
        this.cache['bake:'+key] = c;
        return c;
    },

    /* ---------------- 1. 涩谷事变 ---------------- */
    drawShibuya(g, t) {
        const bs = this._ensureBuildings(),
            embers = this._ensureEmbers(40);
        let grd = g.createLinearGradient(0, 0, 0, VH);
        grd.addColorStop(0, '#050510');
        grd.addColorStop(0.55, '#0b1030');
        grd.addColorStop(1, '#1a1038');
        g.fillStyle = grd;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        g.save();
        const mg = g.createRadialGradient(980, 140, 10, 980, 140, 150);
        mg.addColorStop(0, 'rgba(255,120,90,0.9)');
        mg.addColorStop(0.25, 'rgba(230,70,60,0.55)');
        mg.addColorStop(1, 'rgba(200,50,60,0)');
        g.fillStyle = mg;
        g.beginPath();
        g.arc(980, 140, 150, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#ff9a7a';
        g.beginPath();
        g.arc(980, 140, 52, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(120,20,30,0.35)';
        g.beginPath();
        g.arc(965, 128, 12, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(995, 155, 8, 0, Math.PI * 2);
        g.fill();
        g.restore();
        g.fillStyle = 'rgba(20,18,50,0.7)';
        for (let i = 0; i < 4; i++) { const cx = ((t * 0.08 + i * 400) % (VW + 400)) - 200;
            g.beginPath();
            g.ellipse(cx, 90 + i * 55, 150, 22, 0, 0, Math.PI * 2);
            g.fill(); }
        /* P2-3：以下楼宇（含窗户双层循环）与招牌是静态几何，原实现每帧重绘
           约 580 次循环迭代 / 190 个 fillRect。烘焙后每帧只做一次 drawImage。
           bs 由 _ensureBuildings() 缓存，内容恒定，故可安全一次性烘焙。 */
        g.drawImage(this._bake('shibuya-buildings', bg => {
            for (const b of bs) {
                if (b.layer !== 0) continue;
                bg.fillStyle = '#0c0e1e';
                bg.fillRect(b.x, GROUND - b.h - 120, b.w, b.h + 120);
                bg.fillStyle = 'rgba(120,150,255,0.12)';
                for (let wy = 0; wy < b.h - 30; wy += 26)
                    for (let wx = 8; wx < b.w - 10; wx += 22)
                        if (((wx * 7 + wy * 13 + b.win) % 5) < 2) bg.fillRect(b.x + wx, GROUND - b.h - 110 + wy, 8, 11);
            }
            for (const b of bs) {
                if (b.layer !== 1) continue;
                bg.fillStyle = '#080a16';
                bg.fillRect(b.x, GROUND - b.h - 60, b.w, b.h + 60);
                bg.fillStyle = 'rgba(255,190,120,0.16)';
                for (let wy = 0; wy < b.h - 30; wy += 30)
                    for (let wx = 10; wx < b.w - 14; wx += 26)
                        if (((wx * 3 + wy * 11 + b.win) % 4) < 1) bg.fillRect(b.x + wx, GROUND - b.h - 50 + wy, 10, 13);
            }
            bg.fillStyle = '#06070f';
            bg.fillRect(150, GROUND - 170, 14, 170);
            bg.fillRect(260, GROUND - 170, 14, 170);
            bg.fillRect(128, GROUND - 186, 168, 12);
            bg.fillRect(140, GROUND - 150, 144, 9);
        }), 0, 0, VW, VH);
        grd = g.createLinearGradient(0, GROUND, 0, VH);
        grd.addColorStop(0, '#181428');
        grd.addColorStop(0.08, '#121022');
        grd.addColorStop(1, '#060510');
        g.fillStyle = grd;
        g.fillRect(-60, GROUND, VW + 120, VH - GROUND + 60);
        g.strokeStyle = 'rgba(140,120,255,0.20)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-60, GROUND + 2);
        g.lineTo(VW + 60, GROUND + 2);
        g.stroke();
        g.strokeStyle = 'rgba(120,100,220,0.07)';
        for (let i = 0; i < 10; i++) { g.beginPath();
            g.moveTo(i * 160 - 60, GROUND);
            g.lineTo(i * 160 - 160, VH);
            g.stroke(); }
        for (const e of embers) {
            e.y -= e.vy;
            e.x += Math.sin(t * 0.01 + e.ph) * 0.3;
            if (e.y < -10) { e.y = VH + 10;
                e.x = rand(0, VW); }
            g.fillStyle = `rgba(160,120,255,${0.25+Math.sin(t*0.05+e.ph)*0.15})`;
            g.beginPath();
            g.arc(e.x, e.y, e.s, 0, Math.PI * 2);
            g.fill();
        }
    },

    /* ---------------- 2. 京都高专 ---------------- */
    drawKyoto(g, t) {
        let grd = g.createLinearGradient(0, 0, 0, VH);
        grd.addColorStop(0, '#1a2838');
        grd.addColorStop(0.6, '#2a2838');
        grd.addColorStop(1, '#181020');
        g.fillStyle = grd;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 远山
        g.fillStyle = '#0f1820';
        g.beginPath();
        g.moveTo(-60, VH - 180);
        g.lineTo(200, VH - 320);
        g.lineTo(520, VH - 260);
        g.lineTo(800, VH - 340);
        g.lineTo(1100, VH - 280);
        g.lineTo(VW + 60, VH - 220);
        g.lineTo(VW + 60, VH);
        g.lineTo(-60, VH);
        g.fill();
        // 日式建筑剪影
        const roofs = [{ x: 80, w: 180, h: 70 }, { x: 320, w: 220, h: 90 }, { x: 620, w: 160, h: 65 }, { x: 860, w: 240, h: 95 }, { x: 1140, w: 140, h: 60 }];
        for (const r of roofs) {
            g.fillStyle = '#181018';
            g.fillRect(r.x, GROUND - r.h - 80, r.w, r.h + 80);
            g.beginPath();
            g.moveTo(r.x - 20, GROUND - r.h - 80);
            g.quadraticCurveTo(r.x + r.w / 2, GROUND - r.h - 130, r.x + r.w + 20, GROUND - r.h - 80);
            g.lineTo(r.x + r.w, GROUND - r.h - 75);
            g.lineTo(r.x, GROUND - r.h - 75);
            g.fill();
        }
        // 锦鲤池
        grd = g.createLinearGradient(0, GROUND, 0, VH);
        grd.addColorStop(0, '#202838');
        grd.addColorStop(1, '#101018');
        g.fillStyle = grd;
        g.fillRect(-60, GROUND, VW + 120, VH - GROUND + 60);
        g.strokeStyle = 'rgba(120,160,255,0.18)';
        g.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const ox = (t * 0.15 + i * 280) % VW;
            g.beginPath();
            g.ellipse(ox, GROUND + 40 + i * 25, 80 + i * 10, 12, 0, 0, Math.PI * 2);
            g.stroke();
        }
        // 飘红叶
        for (let i = 0; i < 18; i++) {
            const ph = i * 0.7;
            const x = (i * 83 + t * 0.4 + ph * 50) % VW;
            const y = 120 + Math.sin(t * 0.02 + ph) * 80 + ((i * 47 + t * 0.3) % 400);
            const yy = y % VH;
            g.fillStyle = `rgba(255,${90+Math.sin(ph)*60},60,${0.4+Math.sin(t*0.05+ph)*0.2})`;
            g.beginPath();
            g.ellipse(x, yy, 7, 4, Math.sin(t * 0.03 + ph), 0, Math.PI * 2);
            g.fill();
        }
    },

    /* ---------------- 3. 东京高专天台 ---------------- */
    drawRooftop(g, t) {
        let grd = g.createLinearGradient(0, 0, 0, VH);
        grd.addColorStop(0, '#2a2040');
        grd.addColorStop(0.45, '#ff8a6a');
        grd.addColorStop(0.75, '#ff5c8a');
        grd.addColorStop(1, '#3a2040');
        g.fillStyle = grd;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 太阳
        grd = g.createLinearGradient(600, 160, 600, 320);
        grd.addColorStop(0, 'rgba(255,240,200,0.9)');
        grd.addColorStop(1, 'rgba(255,120,120,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(600, 220, 110, 0, Math.PI * 2);
        g.fill();
        // 东京塔
        g.strokeStyle = '#3a1020';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(900, GROUND - 80);
        g.lineTo(900, GROUND - 260);
        g.stroke();
        g.lineWidth = 4;
        for (let i = 0; i < 6; i++) {
            const y = GROUND - 100 - i * 28,
                w = 14 + i * 5;
            g.beginPath();
            g.moveTo(900 - w, y);
            g.lineTo(900 + w, y);
            g.stroke();
        }
        // 远景楼
        g.fillStyle = '#1a1020';
        for (let i = 0; i < 12; i++) {
            const x = i * 120 - 40;
            const h = 120 + (i * 47) % 160;
            g.fillRect(x, GROUND - h - 60, 70, h + 60);
        }
        // 天台地面
        grd = g.createLinearGradient(0, GROUND, 0, VH);
        grd.addColorStop(0, '#3a3040');
        grd.addColorStop(1, '#181020');
        g.fillStyle = grd;
        g.fillRect(-60, GROUND, VW + 120, VH - GROUND + 60);
        g.strokeStyle = 'rgba(255,255,255,0.12)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-60, GROUND + 2);
        g.lineTo(VW + 60, GROUND + 2);
        g.stroke();
        // 护栏
        g.strokeStyle = 'rgba(40,30,50,0.8)';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(-60, GROUND - 70);
        g.lineTo(VW + 60, GROUND - 70);
        g.stroke();
        for (let x = 40; x < VW; x += 120) { g.beginPath();
            g.moveTo(x, GROUND - 70);
            g.lineTo(x, GROUND - 20);
            g.stroke(); }
        // 飞鸟
        g.strokeStyle = 'rgba(40,20,30,0.5)';
        g.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const x = (i * 240 + t * 0.5) % VW;
            const y = 180 + i * 40;
            g.beginPath();
            g.moveTo(x, y);
            g.quadraticCurveTo(x + 10, y - 8, x + 20, y);
            g.stroke();
        }
    },

    /* ---------------- 4. 诅咒森林 ---------------- */
    drawForest(g, t) {
        let grd = g.createLinearGradient(0, 0, 0, VH);
        grd.addColorStop(0, '#080610');
        grd.addColorStop(0.55, '#120a20');
        grd.addColorStop(1, '#051008');
        g.fillStyle = grd;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        const trees = this._ensureTrees(22);
        // 远景树
        g.strokeStyle = '#0f0818';
        g.lineWidth = 3;
        for (const tr of trees) {
            const sway = Math.sin(t * 0.015 + tr.ph) * 8;
            g.beginPath();
            g.moveTo(tr.x, GROUND - 80);
            g.lineTo(tr.x + sway, GROUND - 80 - tr.h * 0.7);
            g.stroke();
            g.fillStyle = '#0f0818';
            g.beginPath();
            g.ellipse(tr.x + sway, GROUND - 80 - tr.h * 0.7, tr.w * 1.4, tr.w * 0.8, 0, 0, Math.PI * 2);
            g.fill();
        }
        // 近景扭曲树
        g.strokeStyle = '#1a1028';
        g.lineWidth = 8;
        for (let i = 0; i < 9; i++) {
            const x = i * 160 + 40;
            const h = 220 + (i * 53) % 180;
            const bend = Math.sin(t * 0.01 + i) * 20;
            g.beginPath();
            g.moveTo(x, GROUND - 40);
            g.quadraticCurveTo(x + bend, GROUND - 40 - h / 2, x + bend * 0.6, GROUND - 40 - h);
            g.stroke();
            g.fillStyle = '#140a1c';
            g.beginPath();
            g.ellipse(x + bend * 0.6, GROUND - 40 - h, 35, 22, 0, 0, Math.PI * 2);
            g.fill();
        }
        // 瘴气
        grd = g.createLinearGradient(0, GROUND - 80, 0, VH);
        grd.addColorStop(0, 'rgba(120,60,180,0)');
        grd.addColorStop(0.4, 'rgba(120,60,180,0.18)');
        grd.addColorStop(1, 'rgba(80,30,120,0.35)');
        g.fillStyle = grd;
        g.fillRect(-60, GROUND - 80, VW + 120, VH - GROUND + 140);
        // 地面
        grd = g.createLinearGradient(0, GROUND, 0, VH);
        grd.addColorStop(0, '#0a1010');
        grd.addColorStop(1, '#030508');
        g.fillStyle = grd;
        g.fillRect(-60, GROUND, VW + 120, VH - GROUND + 60);
        // 发光蘑菇
        for (let i = 0; i < 10; i++) {
            const x = (i * 137 + t * 0.05) % VW;
            const y = GROUND - 15 - (i * 23) % 40;
            g.fillStyle = `rgba(140,255,120,${0.25+Math.sin(t*0.08+i)*0.15})`;
            g.beginPath();
            g.arc(x, y, 5, 0, Math.PI * 2);
            g.fill();
        }
    },

    /* ---------------- 5. 仙台海岸 ---------------- */
    drawBeach(g, t) {
        let grd = g.createLinearGradient(0, 0, 0, VH);
        grd.addColorStop(0, '#2a2050');
        grd.addColorStop(0.35, '#ff6a8a');
        grd.addColorStop(0.65, '#ffaa5c');
        grd.addColorStop(1, '#5a3060');
        g.fillStyle = grd;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 太阳
        grd = g.createRadialGradient(900, 220, 10, 900, 220, 180);
        grd.addColorStop(0, 'rgba(255,220,160,0.9)');
        grd.addColorStop(0.4, 'rgba(255,140,100,0.35)');
        grd.addColorStop(1, 'rgba(255,100,80,0)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(900, 220, 180, 0, Math.PI * 2);
        g.fill();
        // 海
        grd = g.createLinearGradient(0, GROUND - 120, 0, GROUND);
        grd.addColorStop(0, 'rgba(80,60,120,0.8)');
        grd.addColorStop(1, 'rgba(140,100,160,0.9)');
        g.fillStyle = grd;
        g.fillRect(-60, GROUND - 150, VW + 120, 150);
        g.strokeStyle = 'rgba(255,220,180,0.25)';
        g.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const y = GROUND - 130 + i * 22;
            const o = t * 0.1 + i * 50;
            g.beginPath();
            for (let x = -60; x <= VW + 60; x += 40) g.lineTo(x, y + Math.sin(x * 0.02 + o) * 6);
            g.stroke();
        }
        // 沙滩
        grd = g.createLinearGradient(0, GROUND, 0, VH);
        grd.addColorStop(0, '#4a3a50');
        grd.addColorStop(1, '#201018');
        g.fillStyle = grd;
        g.fillRect(-60, GROUND, VW + 120, VH - GROUND + 60);
        g.strokeStyle = 'rgba(255,200,150,0.15)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-60, GROUND + 2);
        g.lineTo(VW + 60, GROUND + 2);
        g.stroke();
        // 归鸟
        g.strokeStyle = 'rgba(40,20,40,0.5)';
        g.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const x = (i * 200 + t * 0.6) % VW;
            const y = 160 + i * 35;
            g.beginPath();
            g.moveTo(x, y);
            g.quadraticCurveTo(x + 12, y - 10, x + 24, y);
            g.stroke();
        }
    },

    /* ---------------- 6. 废弃神社 ---------------- */
    drawShrine(g, t) {
        let grd = g.createLinearGradient(0, 0, 0, VH);
        grd.addColorStop(0, '#101020');
        grd.addColorStop(0.55, '#1a2030');
        grd.addColorStop(1, '#0a1018');
        g.fillStyle = grd;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 雨
        g.strokeStyle = 'rgba(160,180,200,0.12)';
        g.lineWidth = 1;
        for (let i = 0; i < 60; i++) {
            const x = (i * 47 + t * 2) % VW;
            const y = (i * 37 + t * 6) % VH;
            g.beginPath();
            g.moveTo(x, y);
            g.lineTo(x - 8, y + 28);
            g.stroke();
        }
        // 远景鸟居
        g.fillStyle = '#080a10';
        for (let i = 0; i < 5; i++) {
            const x = 180 + i * 240,
                h = 150 + (i * 31) % 80;
            g.fillRect(x, GROUND - h - 40, 14, h + 40);
            g.fillRect(x + 70, GROUND - h - 40, 14, h + 40);
            g.fillRect(x - 12, GROUND - h - 40, 108, 12);
            g.fillRect(x - 4, GROUND - h - 20, 92, 8);
        }
        // 主殿剪影
        g.fillStyle = '#06070c';
        g.fillRect(VW / 2 - 140, GROUND - 220, 280, 220);
        g.beginPath();
        g.moveTo(VW / 2 - 170, GROUND - 220);
        g.lineTo(VW / 2, GROUND - 300);
        g.lineTo(VW / 2 + 170, GROUND - 220);
        g.fill();
        // 地面
        grd = g.createLinearGradient(0, GROUND, 0, VH);
        grd.addColorStop(0, '#141820');
        grd.addColorStop(1, '#080a10');
        g.fillStyle = grd;
        g.fillRect(-60, GROUND, VW + 120, VH - GROUND + 60);
        g.strokeStyle = 'rgba(120,140,160,0.15)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-60, GROUND + 2);
        g.lineTo(VW + 60, GROUND + 2);
        g.stroke();
        // 水洼反光
        g.fillStyle = 'rgba(120,150,180,0.12)';
        for (let i = 0; i < 8; i++) { const x = (i * 173 + t * 0.02) % VW;
            g.beginPath();
            g.ellipse(x, GROUND + 40 + (i * 31) % 80, 60, 8, 0, 0, Math.PI * 2);
            g.fill(); }
    },

    /* ---------------- 7. 地下停车场 ---------------- */
    drawUnderground(g, t) {
        let grd = g.createLinearGradient(0, 0, 0, VH);
        grd.addColorStop(0, '#0a0a14');
        grd.addColorStop(1, '#101020');
        g.fillStyle = grd;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        const pillars = this._ensurePillars(7);
        // 天花板管线
        g.strokeStyle = '#151520';
        g.lineWidth = 6;
        for (let y = 60; y < 180; y += 40) { g.beginPath();
            g.moveTo(-60, y);
            g.lineTo(VW + 60, y);
            g.stroke(); }
        // 霓虹灯管
        g.shadowColor = '#5cd8ff';
        g.shadowBlur = 20;
        g.strokeStyle = 'rgba(92,216,255,0.6)';
        g.lineWidth = 4;
        for (let i = 0; i < 5; i++) { const x = 100 + i * 280;
            g.beginPath();
            g.moveTo(x, 80);
            g.lineTo(x + 180, 80);
            g.stroke(); }
        g.shadowBlur = 0;
        // 柱子
        for (const p of pillars) {
            g.fillStyle = '#121018';
            g.fillRect(p.x - p.w / 2, GROUND - p.h - 40, p.w, p.h + 40);
            g.strokeStyle = 'rgba(255,92,109,0.25)';
            g.lineWidth = 2;
            g.strokeRect(p.x - p.w / 2, GROUND - p.h - 40, p.w, p.h + 40);
        }
        // 地面
        grd = g.createLinearGradient(0, GROUND, 0, VH);
        grd.addColorStop(0, '#181420');
        grd.addColorStop(1, '#0a0810');
        g.fillStyle = grd;
        g.fillRect(-60, GROUND, VW + 120, VH - GROUND + 60);
        g.strokeStyle = 'rgba(92,216,255,0.15)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-60, GROUND + 2);
        g.lineTo(VW + 60, GROUND + 2);
        g.stroke();
        // 停车线
        g.strokeStyle = 'rgba(255,255,255,0.08)';
        g.lineWidth = 3;
        for (let i = 0; i < 10; i++) { g.beginPath();
            g.moveTo(i * 160 - 40, GROUND + 20);
            g.lineTo(i * 160 - 100, VH);
            g.stroke(); }
        // 积水反光
        g.fillStyle = 'rgba(92,216,255,0.08)';
        for (let i = 0; i < 6; i++) { const x = (i * 220 + t * 0.03) % VW;
            g.beginPath();
            g.ellipse(x, GROUND + 50 + (i * 47) % 70, 90, 10, 0, 0, Math.PI * 2);
            g.fill(); }
    }
};

/* ---------------- 领域背景覆盖 ---------------- */
export function drawDomain(g, domain) {
    const t = domain.t,
        dur = domain.dur;
    const a = Math.min(1, t / 20) * Math.min(1, (dur - t) / 20) * 0.88;
    if (domain.type === 'muryo') {
        /* 无量空处：白闪→无限虚空（深穹星点 + 情报流收束 + 奇点光段） */
        const cx = VW / 2,
            cy = VH * 0.42;
        // 深穹底色：中心青白微光，向外沉入深蓝黑
        const bg = g.createRadialGradient(cx, cy, 60, cx, cy, VW * 0.75);
        bg.addColorStop(0, `rgba(190,225,255,${a*0.55})`);
        bg.addColorStop(0.35, `rgba(40,70,140,${a*0.92})`);
        bg.addColorStop(1, `rgba(4,8,26,${a*0.96})`);
        g.fillStyle = bg;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 展开白闪（前14帧由白转透）
        if (t < 14) { g.fillStyle = `rgba(255,255,255,${(1-t/14)*0.9})`;
            g.fillRect(-60, -60, VW + 120, VH + 120); }
        // 确定性星点：缓慢向奇点漂移 + 呼吸明灭
        for (let i = 0; i < 56; i++) {
            const sx0 = (i * 173.3) % VW,
                sy0 = (i * 97.7) % VH;
            const ph = Math.min(1, t / 160); // 缓慢向中心收束
            const sx = sx0 + (cx - sx0) * ph * 0.12,
                sy = sy0 + (cy - sy0) * ph * 0.12;
            const tw = 0.35 + Math.sin(t * 0.12 + i * 2.6) * 0.3;
            g.fillStyle = `rgba(220,240,255,${a*tw})`;
            g.beginPath();
            g.arc(sx, sy, (i % 3 === 0 ? 1.8 : 1.1), 0, Math.PI * 2);
            g.fill();
        }
        // 情报流：细光线自四周向奇点汇聚
        g.lineCap = 'round';
        for (let i = 0; i < 14; i++) {
            const ang = i * Math.PI * 2 / 14 + Math.sin(t * 0.01 + i) * 0.1;
            const ph = ((t * 0.011 + i * 0.19) % 1); // 循环向内流动
            const r1 = (VW * 0.62) * (1 - ph),
                r2 = r1 - 70;
            if (r2 < 70) continue;
            g.strokeStyle = `rgba(140,200,255,${a*(0.12+ph*0.3)})`;
            g.lineWidth = 1.4;
            g.beginPath();
            g.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1 * 0.72);
            g.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2 * 0.72);
            g.stroke();
        }
        // 奇点：横向光段（无下限的地平线）+ 脉动白核
        const hg = g.createLinearGradient(cx - 320, cy, cx + 320, cy);
        hg.addColorStop(0, 'rgba(150,210,255,0)');
        hg.addColorStop(0.5, `rgba(235,248,255,${a*0.8})`);
        hg.addColorStop(1, 'rgba(150,210,255,0)');
        g.fillStyle = hg;
        g.fillRect(cx - 320, cy - 2.5 - Math.sin(t * 0.08) * 1, 640, 5 + Math.sin(t * 0.08) * 2);
        const core = g.createRadialGradient(cx, cy, 0, cx, cy, 90 + Math.sin(t * 0.06) * 10);
        core.addColorStop(0, `rgba(255,255,255,${a*0.75})`);
        core.addColorStop(0.4, `rgba(160,215,255,${a*0.3})`);
        core.addColorStop(1, 'rgba(120,190,255,0)');
        g.fillStyle = core;
        g.beginPath();
        g.arc(cx, cy, 100, 0, Math.PI * 2);
        g.fill();
        // 领域名：白蓝发光字
        g.save();
        g.shadowColor = 'rgba(150,215,255,0.9)';
        g.shadowBlur = 18;
        g.fillStyle = `rgba(240,250,255,${a*0.85})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('无 量 空 处', VW / 2, 120);
        g.restore();
    } else if (domain.type === 'chimera') {
        /* 嵌合暗翳庭：影之水没膝的暗庭（影海 + 苍白孤月 + 式神游影 + 影泡） */
        const cx = VW / 2;
        // 暗紫穹底：高处残留一线幽蓝，向下沉入影黑
        const bg3 = g.createLinearGradient(0, 0, 0, VH);
        bg3.addColorStop(0, `rgba(22,16,52,${a})`);
        bg3.addColorStop(0.55, `rgba(10,6,30,${a})`);
        bg3.addColorStop(1, `rgba(3,2,12,${a})`);
        g.fillStyle = bg3;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 开幕影闪：紫白骤亮转瞬没入黑暗
        if (t < 12) {
            g.fillStyle = `rgba(214,204,255,${(1 - t / 12) * 0.8})`;
            g.fillRect(-60, -60, VW + 120, VH + 120);
        }
        // 苍白孤月：领域内唯一光源（呼吸微晕）
        const mx = cx + 300,
            my = 150;
        const mg2 = g.createRadialGradient(mx, my, 8, mx, my, 120 + Math.sin(t * 0.04) * 8);
        mg2.addColorStop(0, `rgba(225,220,255,${a*0.55})`);
        mg2.addColorStop(0.3, `rgba(150,130,235,${a*0.22})`);
        mg2.addColorStop(1, 'rgba(110,90,220,0)');
        g.fillStyle = mg2;
        g.beginPath();
        g.arc(mx, my, 130, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = `rgba(232,228,255,${a*0.85})`;
        g.beginPath();
        g.arc(mx, my, 34, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = `rgba(22,16,52,${a*0.9})`; // 月面缺口（弦月剪影）
        g.beginPath();
        g.arc(mx - 12, my - 8, 30, 0, Math.PI * 2);
        g.fill();
        // 影之水面：从展开中心向全场漫延（前40帧扩张）
        const wy = GROUND - 6;
        const spread = Math.min(1, t / 40);
        const ww = lerp(140, VW * 0.62 + 120, spread);
        const wg2 = g.createLinearGradient(0, wy - 8, 0, VH);
        wg2.addColorStop(0, `rgba(64,50,140,${a*0.85})`);
        wg2.addColorStop(0.25, `rgba(24,16,64,${a*0.95})`);
        wg2.addColorStop(1, `rgba(4,2,16,${a})`);
        g.fillStyle = wg2;
        g.beginPath();
        g.ellipse(cx, wy + 70, ww * 1.4, 96, 0, 0, Math.PI * 2);
        g.fill();
        g.fillRect(cx - ww * 1.4, wy + 70, ww * 2.8, VH - wy);
        // 水面月光倒影：碎光带（确定性摆动）
        for (let i = 0; i < 5; i++) {
            const ry = wy + 14 + i * 13;
            const rw = 90 - i * 14 + Math.sin(t * 0.06 + i * 1.7) * 10;
            g.fillStyle = `rgba(200,190,255,${a*(0.22-i*0.035)})`;
            g.beginPath();
            g.ellipse(mx - 40 + Math.sin(t * 0.03 + i) * 8, ry, rw, 2.4, 0, 0, Math.PI * 2);
            g.fill();
        }
        // 影波纹：多圈涟漪自中心荡开（循环相位）
        g.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
            const ph = ((t * 0.012 + i * 0.167) % 1);
            const rr = 60 + ph * ww * 1.15;
            g.strokeStyle = `rgba(140,120,255,${a*(1-ph)*0.4})`;
            g.lineWidth = 2;
            g.beginPath();
            g.ellipse(cx, wy + 16, rr, rr * 0.14, 0, 0, Math.PI * 2);
            g.stroke();
        }
        // 式神游影：影犬奔行剪影（贴水面左右巡游）
        for (let i = 0; i < 2; i++) {
            const dph = ((t * 0.008 + i * 0.5) % 1);
            const dx = -80 + dph * (VW + 160);
            const ddir = i === 0 ? 1 : -1;
            const px2 = ddir > 0 ? dx : VW - dx;
            const run2 = Math.sin(t * 0.35 + i * 3) * 4;
            g.fillStyle = `rgba(30,22,70,${a*0.8})`;
            g.beginPath();
            g.ellipse(px2, wy - 8, 30, 11, 0, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.ellipse(px2 + ddir * 26, wy - 16, 10, 7, 0, 0, Math.PI * 2);
            g.fill(); // 头
            g.strokeStyle = `rgba(30,22,70,${a*0.8})`;
            g.lineWidth = 4;
            g.beginPath();
            g.moveTo(px2 - ddir * 10, wy - 2);
            g.lineTo(px2 - ddir * (16 + run2), wy + 8);
            g.stroke();
            g.beginPath();
            g.moveTo(px2 + ddir * 12, wy - 2);
            g.lineTo(px2 + ddir * (18 - run2), wy + 8);
            g.stroke();
        }
        // 鵺掠空剪影：月前缓慢盘旋
        const na = t * 0.014;
        const nx = cx + Math.cos(na) * 320,
            ny = 190 + Math.sin(na * 2) * 40;
        const nflap = Math.sin(t * 0.3) * 8;
        g.fillStyle = `rgba(26,20,60,${a*0.85})`;
        g.beginPath();
        g.ellipse(nx, ny, 22, 8, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(nx - 6, ny - 8 - nflap, 20, 5, -0.3, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(nx - 6, ny - 8 + nflap * 0.6, 20, 5, 0.3, 0, Math.PI * 2);
        g.fill();
        // 蛇形游影：水面下起伏的暗脊
        g.strokeStyle = `rgba(52,40,120,${a*0.55})`;
        g.lineWidth = 9;
        g.beginPath();
        for (let s = 0; s <= 10; s++) {
            const sx2 = cx - 300 + s * 60 + Math.sin(t * 0.02) * 40;
            const sy2 = wy + 34 + Math.sin(s * 1.1 - t * 0.05) * 10;
            if (s === 0) g.moveTo(sx2, sy2);
            else g.lineTo(sx2, sy2);
        }
        g.stroke();
        // 影泡：自水面升起的暗紫气泡（循环上浮渐隐）
        for (let i = 0; i < 12; i++) {
            const ph = ((t * 0.007 + i * 0.083) % 1);
            const ex = ((i * 211.7) % VW) + Math.sin(t * 0.025 + i * 1.9) * 16;
            const ey = wy - ph * (wy - 140);
            g.fillStyle = `rgba(${120+(i%3)*20},${95+(i%3)*15},255,${(1-ph)*a*0.4})`;
            g.beginPath();
            g.arc(ex, ey, 1.8 + (i % 3), 0, Math.PI * 2);
            g.fill();
        }
        // 满场游影：大量影斑在半空缓慢漂游（充斥战场的影子）
        for (let i = 0; i < 14; i++) {
            const bx = ((i * 149.3) % VW) + Math.sin(t * 0.014 + i * 2.3) * 46;
            const by2 = 130 + ((i * 101.9) % (wy - 200)) + Math.sin(t * 0.02 + i) * 14;
            const bw2 = 26 + (i % 4) * 14;
            g.fillStyle = `rgba(14,10,36,${a*(0.30+((i*0.13)%0.22))})`;
            g.beginPath();
            g.ellipse(bx, by2, bw2, bw2 * 0.36, Math.sin(i * 1.7) * 0.5, 0, Math.PI * 2);
            g.fill();
        }
        // 影分身群：潜伏在领域各处的伏黑影替身剪影（循环隐现）
        for (let i = 0; i < 4; i++) {
            const kx = 170 + ((i * 297.7) % (VW - 340));
            const vis = 0.5 + Math.sin(t * 0.03 + i * 1.9) * 0.5; // 0~1 隐现相位
            if (vis < 0.25) continue;
            const ka = a * Math.min(1, (vis - 0.25) / 0.4) * 0.7;
            const ky = wy - 4;
            g.fillStyle = `rgba(16,10,40,${ka})`;
            // 躯干（插兜站姿剪影）
            g.beginPath();
            g.moveTo(kx - 15, ky);
            g.lineTo(kx - 11, ky - 74);
            g.quadraticCurveTo(kx, ky - 84, kx + 11, ky - 74);
            g.lineTo(kx + 15, ky);
            g.closePath();
            g.fill();
            // 头部 + 刺发剪影
            g.beginPath();
            g.arc(kx, ky - 96, 12, 0, Math.PI * 2);
            g.fill();
            for (let s = 0; s < 5; s++) {
                const sa3 = -Math.PI * 0.85 + s * 0.32;
                g.beginPath();
                g.moveTo(kx + Math.cos(sa3) * 10, ky - 96 + Math.sin(sa3) * 10);
                g.lineTo(kx + Math.cos(sa3) * 19, ky - 96 + Math.sin(sa3) * 19);
                g.lineWidth = 3;
                g.strokeStyle = `rgba(16,10,40,${ka})`;
                g.stroke();
            }
            // 替身紫瞳微光 + 脚下影池
            g.fillStyle = `rgba(150,125,255,${ka*0.8})`;
            g.beginPath();
            g.arc(kx - 4, ky - 97, 1.6, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = `rgba(10,6,30,${ka})`;
            g.beginPath();
            g.ellipse(kx, ky + 4, 30, 7, 0, 0, Math.PI * 2);
            g.fill();
        }
        // 影手：自影水中探出的扭曲暗手（循环升起隐没）
        for (let i = 0; i < 5; i++) {
            const hph = ((t * 0.009 + i * 0.2) % 1);
            const rise = Math.sin(hph * Math.PI); // 升起→沉没
            const hx2 = 90 + ((i * 263.9) % (VW - 180));
            const hh2 = 46 * rise;
            if (hh2 < 4) continue;
            g.strokeStyle = `rgba(20,14,50,${a*rise*0.8})`;
            g.lineWidth = 7;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(hx2, wy + 6);
            g.quadraticCurveTo(hx2 + Math.sin(t * 0.04 + i * 2.6) * 10, wy - hh2 * 0.5, hx2 + Math.sin(t * 0.03 + i) * 6, wy - hh2);
            g.stroke();
            // 五指张开
            g.lineWidth = 2.6;
            for (let s = -2; s <= 2; s++) {
                g.beginPath();
                g.moveTo(hx2 + Math.sin(t * 0.03 + i) * 6, wy - hh2);
                g.lineTo(hx2 + Math.sin(t * 0.03 + i) * 6 + s * 5, wy - hh2 - 9 - Math.abs(s));
                g.stroke();
            }
        }
        // 领域名：暗紫发光字
        g.save();
        g.shadowColor = 'rgba(150,125,255,0.9)';
        g.shadowBlur = 18;
        g.fillStyle = `rgba(216,206,255,${a*0.85})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('嵌 合 暗 翳 庭', VW / 2, 120);
        g.restore();
    } else if (domain.type === 'shrine') {
        const cx = VW / 2;
        // 血色穹底：中心暗红向外沉黑
        const bg2 = g.createRadialGradient(cx, VH * 0.45, 60, cx, VH * 0.45, VW * 0.75);
        bg2.addColorStop(0, `rgba(66,8,20,${a})`);
        bg2.addColorStop(0.6, `rgba(34,3,10,${a})`);
        bg2.addColorStop(1, `rgba(10,0,4,${a})`);
        g.fillStyle = bg2;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 开幕白粉闪淡出
        if (t < 12) {
            g.fillStyle = `rgba(255,217,226,${(1 - t / 12) * 0.8})`;
            g.fillRect(-60, -60, VW + 120, VH + 120);
        }
        // 御厨子佛堂剪影：双层屋顶 + 堂身 + 底座
        const by = GROUND - 10;
        g.fillStyle = `rgba(14,2,6,${a*0.95})`;
        g.fillRect(cx - 210, by - 60, 420, 60);
        g.fillRect(cx - 170, by - 190, 340, 130);
        g.beginPath();
        g.moveTo(cx - 250, by - 190);
        g.quadraticCurveTo(cx, by - 262, cx + 250, by - 190);
        g.lineTo(cx + 190, by - 172);
        g.quadraticCurveTo(cx, by - 234, cx - 190, by - 172);
        g.closePath();
        g.fill();
        g.fillRect(cx - 80, by - 285, 160, 60);
        g.beginPath();
        g.moveTo(cx - 130, by - 285);
        g.quadraticCurveTo(cx, by - 342, cx + 130, by - 285);
        g.lineTo(cx + 95, by - 270);
        g.quadraticCurveTo(cx, by - 320, cx - 95, by - 270);
        g.closePath();
        g.fill();
        // 屋脊兽角（左右上挑）
        g.strokeStyle = `rgba(200,160,130,${a*0.5})`;
        g.lineWidth = 5;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(cx - 238, by - 196);
        g.quadraticCurveTo(cx - 278, by - 236, cx - 266, by - 276);
        g.stroke();
        g.beginPath();
        g.moveTo(cx + 238, by - 196);
        g.quadraticCurveTo(cx + 278, by - 236, cx + 266, by - 276);
        g.stroke();
        // 堂前牛首骷髅饰：骷盖 + 双角 + 眼窝
        g.fillStyle = `rgba(220,205,185,${a*0.75})`;
        g.beginPath();
        g.arc(cx, by - 150, 15, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = `rgba(220,205,185,${a*0.75})`;
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(cx - 13, by - 158);
        g.quadraticCurveTo(cx - 30, by - 172, cx - 27, by - 190);
        g.stroke();
        g.beginPath();
        g.moveTo(cx + 13, by - 158);
        g.quadraticCurveTo(cx + 30, by - 172, cx + 27, by - 190);
        g.stroke();
        g.fillStyle = `rgba(20,2,6,${a})`;
        g.beginPath();
        g.arc(cx - 5.5, by - 152, 3.4, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(cx + 5.5, by - 152, 3.4, 0, Math.PI * 2);
        g.fill();
        // 堂侧双盏血灯笼晕光（呼吸明灭）
        for (let i = 0; i < 2; i++) {
            const lx = cx + (i === 0 ? -120 : 120);
            const la = 0.4 + Math.sin(t * 0.05 + i * 2.4) * 0.12;
            const lg2 = g.createRadialGradient(lx, by - 128, 0, lx, by - 128, 34);
            lg2.addColorStop(0, `rgba(255,120,80,${a*la})`);
            lg2.addColorStop(1, 'rgba(255,120,80,0)');
            g.fillStyle = lg2;
            g.beginPath();
            g.arc(lx, by - 128, 34, 0, Math.PI * 2);
            g.fill();
        }
        // 无休无止的斩线：确定性循环淡入淡出，不闪烁
        for (let i = 0; i < 10; i++) {
            const ph = ((t * 0.016 + i * 0.31) % 1);
            const sx = ((i * 233.7) % VW),
                sy = 100 + ((i * 157.3) % (GROUND - 180));
            const ln = 60 + (i % 3) * 50;
            const sa2 = (i * 0.7) % Math.PI;
            g.globalAlpha = Math.sin(ph * Math.PI) * a * 0.55;
            g.strokeStyle = i % 3 === 0 ? '#ffd9e2' : '#ff6d8d';
            g.lineWidth = i % 3 === 0 ? 1.5 : 2.5;
            g.beginPath();
            g.moveTo(sx - Math.cos(sa2) * ln, sy - Math.sin(sa2) * ln);
            g.lineTo(sx + Math.cos(sa2) * ln, sy + Math.sin(sa2) * ln);
            g.stroke();
        }
        g.globalAlpha = 1;
        // 血雾余烬上浮
        for (let i = 0; i < 12; i++) {
            const ph = ((t * 0.006 + i * 0.083) % 1);
            const ex = ((i * 199.1) % VW) + Math.sin(t * 0.02 + i) * 20;
            const ey = GROUND - ph * (GROUND - 120);
            g.fillStyle = `rgba(255,${100 + (i % 3) * 30},120,${(1 - ph) * a * 0.4})`;
            g.beginPath();
            g.arc(ex, ey, 1.6 + (i % 2), 0, Math.PI * 2);
            g.fill();
        }
        // 领域名：赤红发光字
        g.save();
        g.shadowColor = 'rgba(255,110,140,0.9)';
        g.shadowBlur = 18;
        g.fillStyle = `rgba(255,214,224,${a*0.85})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('伏 魔 御 厨 子', VW / 2, 120);
        g.restore();
    } else if (domain.type === 'sendai') {
        g.fillStyle = `rgba(30,20,26,${a*0.9})`;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        const sg = g.createLinearGradient(0, 200, 0, GROUND);
        sg.addColorStop(0, `rgba(255,150,100,${a*0.4})`);
        sg.addColorStop(1, 'rgba(60,30,20,0)');
        g.fillStyle = sg;
        g.fillRect(-60, 200, VW + 120, GROUND - 200);
        g.strokeStyle = `rgba(255,120,90,${a*0.5})`;
        g.lineWidth = 2;
        for (let i = 0; i < 6; i++) { const y = 260 + i * 50;
            g.beginPath();
            g.moveTo(-60, y);
            g.quadraticCurveTo(VW / 2, y - 30, VW + 60, y);
            g.stroke(); }
        for (let i = 0; i < 3; i++) { const x = rand(100, VW - 100),
                y = rand(150, GROUND - 40);
            FX.slash(x, y, 0, 'rgba(255,255,255,0.7)', rand(100, 200)); }
        g.fillStyle = `rgba(255,140,110,${a*0.6})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('领 域 展 开', VW / 2, 120);
    } else if (domain.type === 'swords') {
        g.fillStyle = `rgba(10,20,24,${a*0.92})`;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        g.strokeStyle = `rgba(140,230,215,${a*0.4})`;
        g.lineWidth = 2;
        for (let i = 0; i < 30; i++) { const x = (i * 47 + t * 0.5) % VW,
                h = 40 + ((i * 31) % 80);
            g.beginPath();
            g.moveTo(x, GROUND);
            g.lineTo(x + ((i * 13) % 20 - 10), GROUND - h);
            g.stroke(); }
        g.strokeStyle = `rgba(200,240,230,${a*0.3})`;
        for (let i = 0; i < 12; i++) { const x = (i * 107 + t) % VW;
            g.beginPath();
            g.moveTo(x, GROUND - 60);
            g.lineTo(x, GROUND - 160);
            g.stroke();
            g.beginPath();
            g.moveTo(x - 8, GROUND - 160);
            g.lineTo(x + 8, GROUND - 160);
            g.stroke(); }
        g.fillStyle = `rgba(130,235,215,${a*0.65})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('真 赝 相 爱', VW / 2, 120);
    } else if (domain.type === 'jitaku') {
        /* 自闭圆顿裹：大量手臂从地面/空间中伸出抓取 */
        // 灰蓝冷色底色
        g.fillStyle = `rgba(12,14,24,${a*0.93})`;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 冷色调径向光（压迫感）
        const dg = g.createRadialGradient(VW/2, VH/2, 50, VW/2, VH/2, VW*0.6);
        dg.addColorStop(0, `rgba(60,80,110,${a*0.15})`);
        dg.addColorStop(1, `rgba(8,10,20,${a*0.4})`);
        g.fillStyle = dg;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 大量手臂从四面八方伸出
        g.lineCap = 'round';
        const handCount = 14;
        for (let i = 0; i < handCount; i++) {
            const phase = (t * 0.03 + i * 0.45) % 1;
            const appear = Math.min(1, phase * 3); // 淡入
            const baseAng = i * Math.PI * 2 / handCount + Math.sin(t * 0.01 + i) * 0.15;
            // 手臂从边缘向中心伸出
            const edgeR = VW * 0.55;
            const bx = VW/2 + Math.cos(baseAng) * edgeR;
            const by = VH/2 + Math.sin(baseAng) * edgeR * 0.7;
            const reach = 80 + appear * (180 + (i % 3) * 40);
            const tx = bx - Math.cos(baseAng) * reach;
            const ty = by - Math.sin(baseAng) * reach * 0.7;
            const midX = (bx + tx) / 2 + Math.sin(t * 0.05 + i * 2) * 15;
            const midY = (by + ty) / 2 + Math.cos(t * 0.04 + i * 3) * 10;
            // 手臂（灰白色、细长扭曲）
            g.strokeStyle = `rgba(180,190,205,${a * appear * 0.6})`;
            g.lineWidth = 5 + (i % 2) * 2;
            g.beginPath();
            g.moveTo(bx, by);
            g.quadraticCurveTo(midX, midY, tx, ty);
            g.stroke();
            // 前臂缝合线纹理
            g.strokeStyle = `rgba(80,90,110,${a * appear * 0.4})`;
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(midX - 4, midY - 3);
            g.lineTo(midX + 4, midY + 3);
            g.stroke();
            g.beginPath();
            g.moveTo(midX - 2, midY + 5);
            g.lineTo(midX + 5, midY - 2);
            g.stroke();
            // 指尖张开（5指）
            g.strokeStyle = `rgba(190,200,215,${a * appear * 0.55})`;
            g.lineWidth = 2.5;
            for (let f = 0; f < 5; f++) {
                const fa = baseAng + Math.PI + (f - 2) * 0.3 + Math.sin(t * 0.08 + f + i) * 0.1;
                const fl = 14 + (f % 2) * 6;
                g.beginPath();
                g.moveTo(tx, ty);
                g.lineTo(tx + Math.cos(fa) * fl, ty + Math.sin(fa) * fl * 0.7);
                g.stroke();
            }
        }
        // 地面裂缝中伸出的手（底部）
        for (let i = 0; i < 8; i++) {
            const gx = 100 + i * 150 + Math.sin(i * 3.7) * 40;
            const phase2 = Math.min(1, Math.max(0, (t - 10 - i * 6) / 20));
            if (phase2 <= 0) continue;
            const gh = 50 + phase2 * (70 + (i % 3) * 25);
            const sway2 = Math.sin(t * 0.06 + i * 2) * 8;
            g.strokeStyle = `rgba(170,180,195,${a * phase2 * 0.55})`;
            g.lineWidth = 5;
            g.beginPath();
            g.moveTo(gx, VH + 10);
            g.quadraticCurveTo(gx + sway2, VH - gh * 0.6, gx + sway2 * 1.5, VH - gh);
            g.stroke();
            // 指尖
            g.lineWidth = 2;
            for (let f = 0; f < 4; f++) {
                const fa2 = -Math.PI/2 + (f - 1.5) * 0.35;
                g.beginPath();
                g.moveTo(gx + sway2 * 1.5, VH - gh);
                g.lineTo(gx + sway2 * 1.5 + Math.cos(fa2) * 12, VH - gh + Math.sin(fa2) * 12);
                g.stroke();
            }
        }
        // 领域标题
        g.fillStyle = `rgba(170,216,255,${a*0.7})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('自 闭 圆 顿 裹', VW / 2, 110);
        // 无为转变文字（延迟出现）
        if (t > 40) {
            const ta = Math.min(1, (t - 40) / 20) * a;
            g.fillStyle = `rgba(200,220,255,${ta * 0.5})`;
            g.font = '700 28px "Microsoft YaHei"';
            g.fillText('无为转变——灵魂改造', VW / 2, VH - 60);
        }
    } else if (domain.type === 'flower') {
        /* 领域展开·朵颐光海：深森幕布 + 花田光海 + 巨花绽放 + 花瓣飘雪 + 光柱 */
        g.fillStyle = `rgba(10,18,8,${a*0.92})`;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 地面花田光海（粉绿叠渐发光，缓缓呼吸）
        const sea = g.createLinearGradient(0, GROUND - 130, 0, GROUND + 40);
        sea.addColorStop(0, 'rgba(239,154,184,0)');
        sea.addColorStop(0.55, `rgba(239,154,184,${a*(0.20+Math.sin(t*0.05)*0.05)})`);
        sea.addColorStop(1, `rgba(150,235,130,${a*0.42})`);
        g.fillStyle = sea;
        g.fillRect(-60, GROUND - 130, VW + 120, 170);
        // 天际生机光柱（缓慢摆动的三道斜光）
        for (let i = 0; i < 3; i++) {
            const lx = VW * (0.22 + i * 0.28) + Math.sin(t * 0.02 + i * 2.1) * 30;
            const lw2 = 60 + i * 14;
            const lg2 = g.createLinearGradient(lx - lw2, 0, lx + lw2, 0);
            lg2.addColorStop(0, 'rgba(232,255,200,0)');
            lg2.addColorStop(0.5, `rgba(232,255,200,${a*0.10})`);
            lg2.addColorStop(1, 'rgba(232,255,200,0)');
            g.fillStyle = lg2;
            g.fillRect(lx - lw2, -60, lw2 * 2, GROUND + 60);
        }
        // 摇曳草茎与发光花苞
        g.lineWidth = 2;
        for (let i = 0; i < 20; i++) {
            const x = (i * 71 + t * 0.4) % VW;
            const sway = Math.sin(t * 0.03 + i) * 14;
            const th = GROUND - 120 - ((i * 37) % 60);
            g.strokeStyle = `rgba(150,235,130,${a*0.4})`;
            g.beginPath();
            g.moveTo(x, GROUND);
            g.quadraticCurveTo(x + sway, GROUND - 70, x + sway * 1.6, th);
            g.stroke();
            // 花苞：粉瓣小花交替绿光芽
            if (i % 2) {
                g.fillStyle = `rgba(239,154,184,${a*0.6})`;
                for (let pt = 0; pt < 5; pt++) {
                    const pa = pt * Math.PI * 2 / 5 + t * 0.01 + i;
                    g.beginPath();
                    g.ellipse(x + sway * 1.6 + Math.cos(pa) * 5, th + Math.sin(pa) * 5, 3.6, 2, pa, 0, Math.PI * 2);
                    g.fill();
                }
                g.fillStyle = `rgba(255,228,92,${a*0.7})`;
                g.beginPath();
                g.arc(x + sway * 1.6, th, 2.4, 0, Math.PI * 2);
                g.fill();
            } else {
                g.fillStyle = `rgba(180,255,150,${a*0.5})`;
                g.beginPath();
                g.arc(x + sway * 1.6, th, 5, 0, Math.PI * 2);
                g.fill();
            }
        }
        // 两侧巨花绽放（随领域展开逐渐开花）
        const bloom = Math.min(1, t / 50);
        for (let s2 = 0; s2 < 2; s2++) {
            const bx = s2 ? VW - 130 : 130,
                by = GROUND - 40;
            const br = (46 + Math.sin(t * 0.04 + s2 * 2) * 4) * bloom;
            g.save();
            g.globalAlpha = a * 0.55;
            g.fillStyle = 'rgba(239,154,184,0.75)';
            for (let pt = 0; pt < 8; pt++) {
                const pa = pt * Math.PI / 4 + t * 0.004 * (s2 ? -1 : 1);
                g.beginPath();
                g.ellipse(bx + Math.cos(pa) * br * 0.62, by + Math.sin(pa) * br * 0.62, br * 0.52, br * 0.24, pa, 0, Math.PI * 2);
                g.fill();
            }
            g.fillStyle = 'rgba(248,196,216,0.85)';
            for (let pt = 0; pt < 6; pt++) {
                const pa = pt * Math.PI / 3 - t * 0.006 * (s2 ? -1 : 1);
                g.beginPath();
                g.ellipse(bx + Math.cos(pa) * br * 0.3, by + Math.sin(pa) * br * 0.3, br * 0.3, br * 0.15, pa, 0, Math.PI * 2);
                g.fill();
            }
            g.fillStyle = 'rgba(255,228,92,0.9)';
            g.beginPath();
            g.arc(bx, by, br * 0.16, 0, Math.PI * 2);
            g.fill();
            g.restore();
        }
        // 漫天花瓣飘雪（确定性相位，缓降横飘）
        for (let i = 0; i < 16; i++) {
            const ph = ((t * 0.35 + i * 61) % (VH + 80)) - 40;
            const px2 = (i * 137 + Math.sin(t * 0.02 + i * 1.7) * 60 + t * 0.6) % VW;
            g.fillStyle = i % 3 ? `rgba(248,196,216,${a*0.55})` : `rgba(239,154,184,${a*0.65})`;
            g.beginPath();
            g.ellipse(px2, ph, 4.2, 2.1, t * 0.03 + i, 0, Math.PI * 2);
            g.fill();
        }
        // 领域标题
        g.fillStyle = `rgba(160,240,140,${a*0.65})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('未 闻 花 名 · 朵 颐 光 海', VW / 2, 120);
        if (t > 36) {
            const ta = Math.min(1, (t - 36) / 20) * a;
            g.fillStyle = `rgba(248,196,216,${ta * 0.55})`;
            g.font = '700 26px "Microsoft YaHei"';
            g.fillText('松懈吧——沉入温柔的花田光海', VW / 2, VH - 60);
        }
    } else if (domain.type === 'volcano') {
        /* 盖棺铁围山：铁围山环抱的灼热洞窟——顶盖垂岩如棺盖合拢，熔岩海翻涌，火星漫天 */
        // 洞窟幕布：中心灼红、四周沉入焦黑
        const bgv = g.createRadialGradient(VW / 2, GROUND - 60, 80, VW / 2, GROUND - 60, VW * 0.75);
        bgv.addColorStop(0, `rgba(80,26,8,${a*0.9})`);
        bgv.addColorStop(0.5, `rgba(40,12,6,${a*0.94})`);
        bgv.addColorStop(1, `rgba(14,4,2,${a*0.97})`);
        g.fillStyle = bgv;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 熔岩海：底部灼热渐变 + 波动岩流线
        const lg = g.createLinearGradient(0, GROUND - 110, 0, GROUND + 40);
        lg.addColorStop(0, 'rgba(255,100,30,0)');
        lg.addColorStop(0.7, `rgba(255,120,40,${a*0.5})`);
        lg.addColorStop(1, `rgba(255,180,80,${a*0.75})`);
        g.fillStyle = lg;
        g.fillRect(-60, GROUND - 110, VW + 120, 150);
        for (let i = 0; i < 7; i++) {
            const y = GROUND - 84 + i * 14;
            g.strokeStyle = `rgba(255,${150 + i * 10},60,${a * (0.25 + i * 0.05)})`;
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(-60, y);
            for (let x = 0; x <= VW + 60; x += 60) g.lineTo(x, y + Math.sin(t * 0.05 + x * 0.02 + i * 1.7) * 6);
            g.stroke();
        }
        // 铁围山环抱：双层山棱剪影（外层更暗，围拢闭塞感）
        for (let l = 0; l < 2; l++) {
            g.fillStyle = `rgba(${30 - l * 10},${14 - l * 5},${8 - l * 3},${a * (0.92 - l * 0.2)})`;
            const off = l * 90;
            g.beginPath();
            g.moveTo(-60, GROUND);
            for (let i = 0; i <= 6; i++) {
                const px = -60 + i * (VW + 120) / 6;
                const ph = (i * 137 + l * 61) % 3;
                const peak = 190 + ph * 70 + (i === 0 || i === 6 ? 160 : 0) - off;
                g.lineTo(px, GROUND - peak);
                g.lineTo(px + (VW + 120) / 12, GROUND - 60 - ph * 30);
            }
            g.lineTo(VW + 60, GROUND);
            g.closePath();
            g.fill();
        }
        // 山棱熔岩流痕
        g.strokeStyle = `rgba(255,120,40,${a*0.4})`;
        g.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const rx = 90 + i * 340;
            g.beginPath();
            g.moveTo(rx, GROUND - 240 - (i % 2) * 60);
            g.quadraticCurveTo(rx + 14, GROUND - 140, rx - 6, GROUND - 40);
            g.stroke();
        }
        // 盖棺垂岩：洞顶垂下的巨大岩锥（棺盖合拢的压迫感）
        g.fillStyle = `rgba(24,10,6,${a*0.95})`;
        for (let i = 0; i < 7; i++) {
            const px = 40 + i * (VW - 80) / 6;
            const len = 70 + ((i * 89) % 4) * 34;
            g.beginPath();
            g.moveTo(px - 34, -10);
            g.lineTo(px, len);
            g.lineTo(px + 34, -10);
            g.closePath();
            g.fill();
        }
        // 垂岩尖端熔光滴落
        g.fillStyle = `rgba(255,150,60,${a*0.6})`;
        for (let i = 0; i < 7; i += 2) {
            const px = 40 + i * (VW - 80) / 6;
            const len = 70 + ((i * 89) % 4) * 34;
            const dy = (t * 2.2 + i * 40) % 130;
            g.beginPath();
            g.arc(px, len + dy, 2.4, 0, Math.PI * 2);
            g.fill();
        }
        // 漫天火星（上升 + 摇摆，确定相位防闪烁）
        g.fillStyle = `rgba(255,190,90,${a*0.8})`;
        for (let i = 0; i < 18; i++) {
            const px = ((i * 173) % VW) + Math.sin(t * 0.03 + i * 1.7) * 26;
            const py = GROUND - 40 - ((t * (1.1 + (i % 4) * 0.5) + i * 67) % (VH - 130));
            g.beginPath();
            g.arc(px, py, 1.2 + (i % 3) * 0.8, 0, Math.PI * 2);
            g.fill();
        }
        // 热浪微光弧（缓缓上升的扭曲感）
        g.strokeStyle = `rgba(255,150,80,${a*0.14})`;
        g.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
            const py = GROUND - 60 - ((t * 1.6 + i * 90) % 360);
            g.beginPath();
            g.arc(VW / 2, py + 200, 260 + i * 40, Math.PI * 1.15, Math.PI * 1.85);
            g.stroke();
        }
        // 领域名与低语
        g.fillStyle = `rgba(255,170,90,${a*0.75})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('盖 棺 铁 围 山', VW / 2, 120);
        if (t > 36) {
            g.fillStyle = `rgba(255,200,140,${a*0.5})`;
            g.font = '600 17px "Microsoft YaHei"';
            g.fillText('——普通术师踏入的瞬间，就会被烧成灰烬。', VW / 2, 152);
        }
    } else if (domain.type === 'ocean') {
        /* 荡蕴平线：热带海滨度假区——碧青天穹、海平线落日、翻涌海面与沙滩，鱼群暗影巡游 */
        // 海天幕布：上碧青、海平线暖光、下深海蓝
        const sky = g.createLinearGradient(0, -60, 0, GROUND + 40);
        sky.addColorStop(0, `rgba(20,60,90,${a*0.95})`);
        sky.addColorStop(0.42, `rgba(60,140,160,${a*0.9})`);
        sky.addColorStop(0.52, `rgba(120,200,200,${a*0.85})`);
        sky.addColorStop(0.62, `rgba(24,90,120,${a*0.92})`);
        sky.addColorStop(1, `rgba(10,40,60,${a*0.95})`);
        g.fillStyle = sky;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 海平线落日（低悬暖日 + 海面倒影光带）
        const hy = GROUND - 300;
        g.fillStyle = `rgba(255,220,160,${a*0.55})`;
        g.beginPath();
        g.arc(VW * 0.72, hy - 26, 44, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = `rgba(255,236,190,${a*0.35})`;
        g.beginPath();
        g.arc(VW * 0.72, hy - 26, 66, 0, Math.PI * 2);
        g.fill();
        // 海平线
        g.strokeStyle = `rgba(220,250,250,${a*0.6})`;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-60, hy);
        g.lineTo(VW + 60, hy);
        g.stroke();
        // 海面波光（横向漩涡线，随时间起伏）
        for (let i = 0; i < 8; i++) {
            const y = hy + 18 + i * 30;
            g.strokeStyle = `rgba(${120 + i * 10},${210 - i * 8},${215 - i * 6},${a * (0.34 - i * 0.025)})`;
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(-60, y);
            for (let x = 0; x <= VW + 60; x += 50) g.lineTo(x, y + Math.sin(t * 0.045 + x * 0.018 + i * 1.4) * 5);
            g.stroke();
        }
        // 落日倒影光带
        g.fillStyle = `rgba(255,220,150,${a*0.16})`;
        g.fillRect(VW * 0.72 - 34, hy, 68, GROUND - hy);
        // 沙滩：底部暖沙色弧带 + 浪沫线
        g.fillStyle = `rgba(214,188,140,${a*0.8})`;
        g.beginPath();
        g.moveTo(-60, VH + 60);
        g.lineTo(-60, GROUND - 20);
        g.quadraticCurveTo(VW / 2, GROUND - 56, VW + 60, GROUND - 20);
        g.lineTo(VW + 60, VH + 60);
        g.closePath();
        g.fill();
        const foamY = GROUND - 38 + Math.sin(t * 0.04) * 8;
        g.strokeStyle = `rgba(240,252,255,${a*0.75})`;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-60, foamY + 8);
        for (let x = 0; x <= VW + 60; x += 46) g.lineTo(x, foamY + Math.sin(t * 0.05 + x * 0.03) * 5);
        g.stroke();
        // 鱼群暗影：海面下巡游的食肉鱼剪影（循环横游）
        g.fillStyle = `rgba(16,50,64,${a*0.65})`;
        for (let i = 0; i < 6; i++) {
            const fx = ((t * (1.4 + (i % 3) * 0.6) + i * 260) % (VW + 240)) - 120;
            const fy = hy + 50 + (i % 4) * 46 + Math.sin(t * 0.06 + i * 2.1) * 6;
            const dir2 = i % 2 ? 1 : -1;
            g.save();
            g.translate(dir2 > 0 ? fx : VW - fx, fy);
            g.scale(dir2, 1);
            g.beginPath();
            g.moveTo(-16, 0);
            g.quadraticCurveTo(0, -6, 14, 0);
            g.quadraticCurveTo(0, 6, -16, 0);
            g.lineTo(-24, -6);
            g.lineTo(-22, 0);
            g.lineTo(-24, 6);
            g.closePath();
            g.fill();
            g.restore();
        }
        // 海面上方飘浮的水泡光点（确定相位防闪烁）
        g.fillStyle = `rgba(216,244,255,${a*0.7})`;
        for (let i = 0; i < 14; i++) {
            const px = ((i * 197) % VW) + Math.sin(t * 0.025 + i * 1.9) * 20;
            const py = GROUND - 30 - ((t * (0.8 + (i % 3) * 0.4) + i * 83) % (VH - 180));
            g.beginPath();
            g.arc(px, py, 1.4 + (i % 3) * 0.7, 0, Math.PI * 2);
            g.fill();
        }
        // 领域名与低语
        g.fillStyle = `rgba(150,230,225,${a*0.8})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('荡 蕴 平 线', VW / 2, 120);
        if (t > 36) {
            g.fillStyle = `rgba(200,244,240,${a*0.5})`;
            g.font = '600 17px "Microsoft YaHei"';
            g.fillText('——无限的式神涌军，将在此处将你咬碎。', VW / 2, 152);
        }
    } else if (domain.type === 'palace') {
        /* 时胞月宫殿：深青月夜穹顶 + 巨大满月 + 24分割表盘与快转秒针 + 细胞六角浮粒 */
        const cx = VW / 2,
            cy = 210;
        // 月夜穹底：中心青白月辉，向外沉入墨绿黑
        const bgP = g.createRadialGradient(cx, cy, 60, cx, cy, VW * 0.72);
        bgP.addColorStop(0, `rgba(56,62,34,${a*0.92})`);
        bgP.addColorStop(0.5, `rgba(26,30,18,${a*0.95})`);
        bgP.addColorStop(1, `rgba(8,10,6,${a*0.97})`);
        g.fillStyle = bgP;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 开幕黄绿闪淡出
        if (t < 14) {
            g.fillStyle = `rgba(240,248,192,${(1 - t / 14) * 0.8})`;
            g.fillRect(-60, -60, VW + 120, VH + 120);
        }
        // 巨大满月（青白月盘 + 月海斑痕）
        const mg = g.createRadialGradient(cx, cy, 10, cx, cy, 110);
        mg.addColorStop(0, `rgba(244,246,220,${a*0.9})`);
        mg.addColorStop(0.75, `rgba(216,224,168,${a*0.7})`);
        mg.addColorStop(1, `rgba(180,196,120,${a*0.15})`);
        g.fillStyle = mg;
        g.beginPath();
        g.arc(cx, cy, 110, 0, Math.PI * 2);
        g.fill();
        // 月海斑痕（月面暗斑，确定位置）
        g.fillStyle = `rgba(150,160,100,${a*0.35})`;
        g.beginPath();
        g.ellipse(cx - 30, cy - 22, 20, 14, 0.4, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(cx + 26, cy + 14, 15, 11, -0.3, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(cx - 6, cy + 38, 11, 8, 0.2, 0, Math.PI * 2);
        g.fill();
        // 月外光晕环
        g.strokeStyle = `rgba(232,240,176,${a*0.3})`;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(cx, cy, 126 + Math.sin(t * 0.05) * 4, 0, Math.PI * 2);
        g.stroke();
        // 24分割表盘（双环 + 24辐条，缓转）
        g.strokeStyle = `rgba(225,240,110,${a*0.5})`;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(cx, cy, 148, 0, Math.PI * 2);
        g.stroke();
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(cx, cy, 136, 0, Math.PI * 2);
        g.stroke();
        for (let i = 0; i < 24; i++) {
            const a2 = i * Math.PI / 12 + t * 0.008;
            const long = i % 6 === 0;
            g.lineWidth = long ? 2.2 : 1.2;
            g.beginPath();
            g.moveTo(cx + Math.cos(a2) * (long ? 130 : 136), cy + Math.sin(a2) * (long ? 130 : 136));
            g.lineTo(cx + Math.cos(a2) * 148, cy + Math.sin(a2) * 148);
            g.stroke();
        }
        // 快转秒针（一秒被切碎成24份）
        const ha = t * 0.22;
        g.strokeStyle = `rgba(240,248,192,${a*0.85})`;
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(ha) * 122, cy + Math.sin(ha) * 122);
        g.stroke();
        g.fillStyle = `rgba(240,248,192,${a*0.85})`;
        g.beginPath();
        g.arc(cx, cy, 4, 0, Math.PI * 2);
        g.fill();
        // 秒针残影（帧格感）
        g.strokeStyle = `rgba(225,240,110,${a*0.3})`;
        g.lineWidth = 1.6;
        for (let i = 1; i <= 3; i++) {
            const aa = ha - i * Math.PI / 12;
            g.beginPath();
            g.moveTo(cx, cy);
            g.lineTo(cx + Math.cos(aa) * 116, cy + Math.sin(aa) * 116);
            g.stroke();
        }
        // 细胞六角浮粒（术式对象细分化，确定相位上升）
        g.strokeStyle = `rgba(225,240,110,${a*0.4})`;
        g.lineWidth = 1;
        for (let i = 0; i < 12; i++) {
            const py = VH - ((t * 0.9 + i * 64) % (VH + 60));
            const px = (i * 173 + 60) % VW + Math.sin(t * 0.02 + i * 1.7) * 18;
            const cr = 4 + (i % 4) * 2;
            g.beginPath();
            for (let j = 0; j < 6; j++) {
                const a3 = j * Math.PI / 3 + t * 0.01 + i;
                if (j === 0) g.moveTo(px + Math.cos(a3) * cr, py + Math.sin(a3) * cr);
                else g.lineTo(px + Math.cos(a3) * cr, py + Math.sin(a3) * cr);
            }
            g.closePath();
            g.stroke();
        }
        // 地面月光倒影
        const rg = g.createLinearGradient(0, GROUND - 40, 0, GROUND + 60);
        rg.addColorStop(0, `rgba(225,240,110,0)`);
        rg.addColorStop(1, `rgba(225,240,110,${a*0.14})`);
        g.fillStyle = rg;
        g.fillRect(cx - 170, GROUND - 40, 340, 100);
        // 领域名与低语
        g.fillStyle = `rgba(232,240,176,${a*0.8})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('时 胞 月 宫 殿', VW / 2, 120);
        if (t > 36) {
            g.fillStyle = `rgba(225,240,110,${a*0.5})`;
            g.font = '600 17px "Microsoft YaHei"';
            g.fillText('——你的每一个细胞，都是术式的对象。', VW / 2, 152);
        }
    } else if (domain.type === 'taizo') {
        /* 胎藏遍野：深紫胎宫穹顶 + 胎藏曼荼罗大日轮 + 咒灵之海 + 脐带咒纹 */
        const cx = VW / 2,
            cy = VH * 0.36;
        // 胎宫穹底：中心暗金微光，向外沉入深紫黑
        const bg9 = g.createRadialGradient(cx, cy, 70, cx, cy, VW * 0.72);
        bg9.addColorStop(0, `rgba(84,58,110,${a*0.9})`);
        bg9.addColorStop(0.45, `rgba(38,22,58,${a*0.95})`);
        bg9.addColorStop(1, `rgba(10,5,20,${a*0.97})`);
        g.fillStyle = bg9;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 开幕紫白闪淡出
        if (t < 14) {
            g.fillStyle = `rgba(232,216,255,${(1 - t / 14) * 0.85})`;
            g.fillRect(-60, -60, VW + 120, VH + 120);
        }
        // 胎藏曼荼罗大日轮：金紫三重同心环 + 辐条 + 八叶莲瓣（缓转）
        const open = Math.min(1, t / 34); // 展开进度
        const mr = 190 * open;
        const mrot = t * 0.006;
        g.save();
        g.translate(cx, cy);
        // 轮心晕光
        const hg9 = g.createRadialGradient(0, 0, 8, 0, 0, mr + 90);
        hg9.addColorStop(0, `rgba(232,216,255,${a*0.30})`);
        hg9.addColorStop(0.4, `rgba(184,143,216,${a*0.14})`);
        hg9.addColorStop(1, 'rgba(120,80,180,0)');
        g.fillStyle = hg9;
        g.beginPath();
        g.arc(0, 0, mr + 90, 0, Math.PI * 2);
        g.fill();
        // 三重同心环（金/紫/金）
        g.strokeStyle = `rgba(200,168,90,${a*0.6})`;
        g.lineWidth = 3;
        g.beginPath();
        g.arc(0, 0, mr, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = `rgba(184,143,216,${a*0.5})`;
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, 0, mr * 0.74, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = `rgba(200,168,90,${a*0.45})`;
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(0, 0, mr * 0.48, 0, Math.PI * 2);
        g.stroke();
        // 十二向辐条（内环→外环）
        g.strokeStyle = `rgba(200,168,90,${a*0.35})`;
        g.lineWidth = 1.6;
        for (let i = 0; i < 12; i++) {
            const ra = mrot + i * Math.PI / 6;
            g.beginPath();
            g.moveTo(Math.cos(ra) * mr * 0.48, Math.sin(ra) * mr * 0.48);
            g.lineTo(Math.cos(ra) * mr, Math.sin(ra) * mr);
            g.stroke();
        }
        // 八叶莲瓣（反向缓转，瓣尖向外）
        g.fillStyle = `rgba(184,143,216,${a*0.28})`;
        g.strokeStyle = `rgba(216,188,242,${a*0.4})`;
        g.lineWidth = 1.2;
        for (let i = 0; i < 8; i++) {
            const pa = -mrot * 1.6 + i * Math.PI / 4;
            const pr = mr * 0.86;
            g.save();
            g.translate(Math.cos(pa) * pr, Math.sin(pa) * pr);
            g.rotate(pa);
            g.beginPath();
            g.moveTo(-mr * 0.16, 0);
            g.quadraticCurveTo(0, -mr * 0.13, mr * 0.2, 0);
            g.quadraticCurveTo(0, mr * 0.13, -mr * 0.16, 0);
            g.closePath();
            g.fill();
            g.stroke();
            g.restore();
        }
        // 轮心大日白金核（呼吸脉动）
        const core9 = g.createRadialGradient(0, 0, 0, 0, 0, 56 + Math.sin(t * 0.06) * 6);
        core9.addColorStop(0, `rgba(255,250,235,${a*0.8})`);
        core9.addColorStop(0.5, `rgba(232,200,140,${a*0.35})`);
        core9.addColorStop(1, 'rgba(200,150,90,0)');
        g.fillStyle = core9;
        g.beginPath();
        g.arc(0, 0, 66, 0, Math.PI * 2);
        g.fill();
        // 环上梵字座位：外环八点小咒印（菱形）
        g.fillStyle = `rgba(232,216,255,${a*0.5})`;
        for (let i = 0; i < 8; i++) {
            const sa9 = mrot * 0.5 + i * Math.PI / 4 + Math.PI / 8;
            const sx9 = Math.cos(sa9) * mr,
                sy9 = Math.sin(sa9) * mr;
            g.save();
            g.translate(sx9, sy9);
            g.rotate(sa9 + Math.PI / 4);
            g.fillRect(-4, -4, 8, 8);
            g.restore();
        }
        g.restore();
        // 脐带咒纹：自曼荼罗垂向地面的脉络（微摆）
        g.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
            const vx0 = cx + (i - 2) * 190 + Math.sin(t * 0.015 + i * 2.1) * 24;
            g.strokeStyle = `rgba(140,100,180,${a*(0.22+(i%2)*0.08)})`;
            g.lineWidth = 4 - (i % 2);
            g.beginPath();
            g.moveTo(cx + (i - 2) * 60, cy + mr * 0.5);
            g.quadraticCurveTo(vx0, (cy + GROUND) / 2 + Math.sin(t * 0.02 + i) * 30, vx0 + Math.sin(t * 0.025 + i * 1.3) * 16, GROUND - 10);
            g.stroke();
        }
        // 咒灵之海：地面暗紫浪层 + 起伏的咒灵剪影群
        const sg9 = g.createLinearGradient(0, GROUND - 70, 0, VH);
        sg9.addColorStop(0, 'rgba(60,36,86,0)');
        sg9.addColorStop(0.4, `rgba(44,26,66,${a*0.8})`);
        sg9.addColorStop(1, `rgba(14,6,26,${a*0.95})`);
        g.fillStyle = sg9;
        g.fillRect(-60, GROUND - 70, VW + 120, VH - GROUND + 130);
        // 浪层起伏线
        g.strokeStyle = `rgba(150,110,190,${a*0.30})`;
        g.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
            const wy9 = GROUND - 44 + i * 22;
            g.beginPath();
            g.moveTo(-60, wy9);
            for (let x = 0; x <= VW + 60; x += 60) g.lineTo(x, wy9 + Math.sin(t * 0.04 + x * 0.016 + i * 1.8) * 7);
            g.stroke();
        }
        // 咒灵剪影群：浪间浮沉的独眼异形（确定性相位）
        for (let i = 0; i < 9; i++) {
            const bx9 = ((i * 173.9) % VW) + Math.sin(t * 0.02 + i * 2.4) * 22;
            const bob9 = Math.sin(t * 0.045 + i * 1.7);
            const by9 = GROUND - 26 + bob9 * 12;
            const vis9 = 0.5 + bob9 * 0.5;
            if (vis9 < 0.2) continue;
            const ba9 = a * vis9 * 0.75;
            g.fillStyle = `rgba(26,14,44,${ba9})`;
            g.beginPath();
            g.ellipse(bx9, by9, 20 + (i % 3) * 7, 14 + (i % 2) * 5, Math.sin(i * 2.2) * 0.3, 0, Math.PI * 2);
            g.fill();
            // 触肢/角突
            g.strokeStyle = `rgba(26,14,44,${ba9})`;
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(bx9 - 8, by9 - 12);
            g.lineTo(bx9 - 13, by9 - 24 - (i % 3) * 3);
            g.stroke();
            g.beginPath();
            g.moveTo(bx9 + 9, by9 - 11);
            g.lineTo(bx9 + 15, by9 - 20);
            g.stroke();
            // 发光独眼
            g.fillStyle = `rgba(216,188,242,${ba9})`;
            g.beginPath();
            g.arc(bx9 + 4, by9 - 4, 2.2, 0, Math.PI * 2);
            g.fill();
        }
        // 咒力紫萤：自咒灵之海升腾的微光（循环上浮）
        for (let i = 0; i < 14; i++) {
            const ph = ((t * 0.006 + i * 0.071) % 1);
            const ex9 = ((i * 157.1) % VW) + Math.sin(t * 0.02 + i * 1.6) * 18;
            const ey9 = GROUND - ph * (GROUND - 130);
            g.fillStyle = `rgba(${190+(i%3)*15},${150+(i%3)*20},235,${(1-ph)*a*0.4})`;
            g.beginPath();
            g.arc(ex9, ey9, 1.6 + (i % 3), 0, Math.PI * 2);
            g.fill();
        }
        // 领域名：金紫发光字
        g.save();
        g.shadowColor = 'rgba(200,168,120,0.9)';
        g.shadowBlur = 18;
        g.fillStyle = `rgba(240,228,255,${a*0.85})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('胎 藏 遍 野', VW / 2, 120);
        g.restore();
    } else if (domain.type === 'hanabi') {
        /* 漫天花火：夜穹底色 + 升空光迹 + 蓝色花火连环绽放 + 星屑坠落 */
        const colsH = [[90, 168, 255], [154, 208, 255], [90, 168, 255], [200, 230, 255], [120, 180, 255]];
        // 夜穹底色：天顶深墨蓝，地平线残留蓝紫余晖
        const bgH = g.createLinearGradient(0, 0, 0, VH);
        bgH.addColorStop(0, `rgba(6,8,22,${a*0.97})`);
        bgH.addColorStop(0.62, `rgba(16,14,40,${a*0.95})`);
        bgH.addColorStop(1, `rgba(20,34,52,${a*0.9})`);
        g.fillStyle = bgH;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 开幕蓝白闪淡出
        if (t < 14) {
            g.fillStyle = `rgba(200,230,255,${(1 - t / 14) * 0.85})`;
            g.fillRect(-60, -60, VW + 120, VH + 120);
        }
        // 稀疏星点（高空明灭）
        for (let i = 0; i < 26; i++) {
            const tw = 0.3 + Math.sin(t * 0.1 + i * 2.3) * 0.25;
            g.fillStyle = `rgba(235,240,255,${a*tw})`;
            g.beginPath();
            g.arc((i * 199.7) % VW, (i * 83.3) % (VH * 0.5), i % 4 === 0 ? 1.6 : 1, 0, Math.PI * 2);
            g.fill();
        }
        // 花火群：7座确定性发射位，循环 升空光迹→绽放→星火坠散
        g.lineCap = 'round';
        for (let i = 0; i < 7; i++) {
            const cyc = 130 + (i % 3) * 24; // 各自循环周期
            const ph = ((t + i * 47) % cyc) / cyc;
            const fx = 90 + ((i * 267.7) % (VW - 180));
            const fy = 90 + ((i * 143.3) % (VH * 0.34));
            const col = colsH[i % colsH.length];
            if (ph < 0.3) {
                // 升空光迹：自地面拉起的细光线 + 弹头亮点
                const up = ph / 0.3;
                const ty = GROUND - (GROUND - fy) * up;
                const tg = g.createLinearGradient(fx, ty + 60, fx, ty);
                tg.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0)`);
                tg.addColorStop(1, `rgba(216,232,255,${a*0.8})`);
                g.strokeStyle = tg;
                g.lineWidth = 2.2;
                g.beginPath();
                g.moveTo(fx + Math.sin(up * 9 + i) * 5, ty + 60);
                g.lineTo(fx, ty);
                g.stroke();
                g.fillStyle = `rgba(232,244,255,${a*0.9})`;
                g.beginPath();
                g.arc(fx, ty, 2.4, 0, Math.PI * 2);
                g.fill();
            } else {
                // 绽放：18根放射星线（受重力下垂）+ 心核闪光 + 扩散环
                const bp = (ph - 0.3) / 0.7;
                const R = (86 + (i % 3) * 30) * Math.min(1, bp * 2.4);
                const fade = Math.max(0, 1 - bp * 1.15);
                if (fade > 0.02) {
                    for (let j = 0; j < 18; j++) {
                        const ra = j * Math.PI / 9 + i * 0.7;
                        const drop = bp * bp * 46; // 星火下坠
                        const ex = fx + Math.cos(ra) * R;
                        const ey = fy + Math.sin(ra) * R * 0.94 + drop;
                        g.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},${a*fade*0.75})`;
                        g.lineWidth = j % 3 === 0 ? 2 : 1.2;
                        g.beginPath();
                        g.moveTo(fx + Math.cos(ra) * R * 0.42, fy + Math.sin(ra) * R * 0.4 + drop * 0.4);
                        g.lineTo(ex, ey);
                        g.stroke();
                        g.fillStyle = `rgba(232,244,255,${a*fade*0.85})`;
                        g.beginPath();
                        g.arc(ex, ey, j % 3 === 0 ? 1.8 : 1.1, 0, Math.PI * 2);
                        g.fill();
                    }
                    const cgH = g.createRadialGradient(fx, fy, 0, fx, fy, R * 0.5 + 14);
                    cgH.addColorStop(0, `rgba(232,244,255,${a*fade*0.85})`);
                    cgH.addColorStop(0.4, `rgba(${col[0]},${col[1]},${col[2]},${a*fade*0.4})`);
                    cgH.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
                    g.fillStyle = cgH;
                    g.beginPath();
                    g.arc(fx, fy, R * 0.5 + 14, 0, Math.PI * 2);
                    g.fill();
                    g.strokeStyle = `rgba(180,216,255,${a*fade*0.5})`;
                    g.lineWidth = 1.4;
                    g.beginPath();
                    g.arc(fx, fy, R * 1.08, 0, Math.PI * 2);
                    g.stroke();
                }
            }
        }
        // 漫天坠落星屑（循环下飘的五彩余烬）
        for (let i = 0; i < 20; i++) {
            const ph = ((t * 0.008 + i * 0.083) % 1);
            const dx = ((i * 181.3) % VW) + Math.sin(t * 0.02 + i * 1.9) * 26;
            const dy = 60 + ph * (GROUND - 80);
            const col = colsH[i % colsH.length];
            g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${(1-ph)*a*0.5})`;
            g.beginPath();
            g.arc(dx, dy, 1.4 + (i % 3) * 0.7, 0, Math.PI * 2);
            g.fill();
        }
        // 地面蓝光映照
        const ggH = g.createLinearGradient(0, GROUND - 40, 0, VH);
        ggH.addColorStop(0, 'rgba(90,168,255,0)');
        ggH.addColorStop(0.5, `rgba(26,70,120,${a*0.35})`);
        ggH.addColorStop(1, `rgba(8,16,30,${a*0.8})`);
        g.fillStyle = ggH;
        g.fillRect(-60, GROUND - 40, VW + 120, VH - GROUND + 100);
        // 领域名：蓝白发光字
        g.save();
        g.shadowColor = 'rgba(90,168,255,0.9)';
        g.shadowBlur = 18;
        g.fillStyle = `rgba(216,232,255,${a*0.85})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('漫 天 花 火', VW / 2, 120);
        g.restore();
    } else if (domain.type === 'sora') {
        /* 葬空白纱：苍白丧葬天穹 + 崩裂天空断层 + 漫卷白纱 + 青白鬼火 + 崩落天光 */
        // 苍白天穹底色：天顶青灰白，向下沉入墨蓝暮色
        const bgS = g.createLinearGradient(0, 0, 0, VH);
        bgS.addColorStop(0, `rgba(198,222,238,${a*0.96})`);
        bgS.addColorStop(0.5, `rgba(122,158,190,${a*0.94})`);
        bgS.addColorStop(1, `rgba(24,34,52,${a*0.92})`);
        g.fillStyle = bgS;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 开幕白闪淡出
        if (t < 14) {
            g.fillStyle = `rgba(240,250,255,${(1 - t / 14) * 0.85})`;
            g.fillRect(-60, -60, VW + 120, VH + 120);
        }
        // 崩裂的天空断层：数块错位漂移的天空平面（被掌握后崩解的整片天空）
        g.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
            const px = 70 + ((i * 293.3) % (VW - 140));
            const py = 60 + ((i * 127.7) % (VH * 0.36));
            const drift = Math.sin(t * 0.03 + i * 1.7) * 8;
            const w = 90 + (i % 3) * 34, h = 46 + (i % 2) * 22;
            g.save();
            g.translate(px + drift, py + Math.sin(t * 0.02 + i) * 5);
            g.rotate(Math.sin(i * 2.6) * 0.22);
            // 错位平面（比背景略亮的天色块，白光勾边）
            g.fillStyle = `rgba(224,240,250,${a*0.30})`;
            g.fillRect(-w / 2, -h / 2, w, h);
            g.strokeStyle = `rgba(255,255,255,${a*0.55})`;
            g.lineWidth = 1.6;
            g.strokeRect(-w / 2, -h / 2, w, h);
            // 平面内裂纹
            g.strokeStyle = `rgba(255,255,255,${a*0.35})`;
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(-w * 0.3, -h * 0.3);
            g.lineTo(w * 0.05, h * 0.1);
            g.lineTo(w * 0.35, h * 0.4);
            g.stroke();
            g.restore();
        }
        // 漫卷白纱：横贯天穹的丧葬绢纱（多条正弦飘带）
        for (let i = 0; i < 4; i++) {
            const baseY = 110 + i * 96;
            const amp = 26 + (i % 2) * 14;
            g.fillStyle = `rgba(245,250,255,${a*(0.16-i*0.02)})`;
            g.beginPath();
            g.moveTo(-60, baseY);
            for (let s = 0; s <= 16; s++) {
                const sx = -60 + (VW + 120) * s / 16;
                g.lineTo(sx, baseY + Math.sin(s * 0.7 + t * 0.045 + i * 2.1) * amp);
            }
            for (let s = 16; s >= 0; s--) {
                const sx = -60 + (VW + 120) * s / 16;
                g.lineTo(sx, baseY + 34 + Math.sin(s * 0.7 + t * 0.045 + i * 2.1 + 0.5) * amp * 0.8);
            }
            g.closePath();
            g.fill();
            // 纱缘高光线
            g.strokeStyle = `rgba(255,255,255,${a*0.30})`;
            g.lineWidth = 1.2;
            g.beginPath();
            for (let s = 0; s <= 16; s++) {
                const sx = -60 + (VW + 120) * s / 16;
                const sy = baseY + Math.sin(s * 0.7 + t * 0.045 + i * 2.1) * amp;
                if (s === 0) g.moveTo(sx, sy);
                else g.lineTo(sx, sy);
            }
            g.stroke();
        }
        // 青白鬼火：丧葬之火摇曳漂浮（循环上浮）
        for (let i = 0; i < 10; i++) {
            const ph = ((t * 0.005 + i * 0.097) % 1);
            const gx = ((i * 211.7) % VW) + Math.sin(t * 0.03 + i * 2.2) * 22;
            const gy = GROUND - 40 - ph * (GROUND - 170);
            const ga = (1 - ph) * a * 0.7;
            const gr = 7 + (i % 3) * 3;
            const fgS = g.createRadialGradient(gx, gy, 0, gx, gy, gr * 2.4);
            fgS.addColorStop(0, `rgba(235,255,250,${ga})`);
            fgS.addColorStop(0.45, `rgba(154,220,255,${ga*0.6})`);
            fgS.addColorStop(1, 'rgba(154,220,255,0)');
            g.fillStyle = fgS;
            g.beginPath();
            g.arc(gx, gy, gr * 2.4, 0, Math.PI * 2);
            g.fill();
            // 火舌（上尖椭圆）
            g.fillStyle = `rgba(216,244,255,${ga})`;
            g.beginPath();
            g.ellipse(gx, gy, gr * 0.5, gr * (1 + Math.sin(t * 0.2 + i) * 0.14), 0, 0, Math.PI * 2);
            g.fill();
        }
        // 崩落天光：自天顶斩下的细长光丝（天空崩落斩击意象）
        for (let i = 0; i < 8; i++) {
            const ph = ((t * 0.016 + i * 0.129) % 1);
            const lx = 50 + ((i * 233.9) % (VW - 100));
            const ly = ph * (GROUND + 30);
            g.strokeStyle = `rgba(255,255,255,${(1-ph)*a*0.55})`;
            g.lineWidth = i % 3 === 0 ? 2.2 : 1.3;
            g.beginPath();
            g.moveTo(lx, ly - 90);
            g.lineTo(lx + 6, ly);
            g.stroke();
        }
        // 地面寒色映照
        const ggS = g.createLinearGradient(0, GROUND - 40, 0, VH);
        ggS.addColorStop(0, 'rgba(154,220,255,0)');
        ggS.addColorStop(0.5, `rgba(60,96,130,${a*0.35})`);
        ggS.addColorStop(1, `rgba(12,20,32,${a*0.8})`);
        g.fillStyle = ggS;
        g.fillRect(-60, GROUND - 40, VW + 120, VH - GROUND + 100);
        // 领域名：青白发光字
        g.save();
        g.shadowColor = 'rgba(154,220,255,0.9)';
        g.shadowBlur = 18;
        g.fillStyle = `rgba(240,250,255,${a*0.85})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('葬 空 白 纱', VW / 2, 120);
        g.restore();
    } else if (domain.type === 'akaku') {
        /* 赤空回游：赤红天穹 + 双巨式神剪影回游 + 赤红轨迹带 + 染红光尘 */
        // 赤红天穹底色：天顶亮红，向下沉入浓赤暗色
        const bgA = g.createLinearGradient(0, 0, 0, VH);
        bgA.addColorStop(0, `rgba(255,140,110,${a*0.95})`);
        bgA.addColorStop(0.5, `rgba(178,52,34,${a*0.94})`);
        bgA.addColorStop(1, `rgba(40,8,6,${a*0.92})`);
        g.fillStyle = bgA;
        g.fillRect(-60, -60, VW + 120, VH + 120);
        // 开幕赤闪淡出
        if (t < 14) {
            g.fillStyle = `rgba(255,214,200,${(1 - t / 14) * 0.85})`;
            g.fillRect(-60, -60, VW + 120, VH + 120);
        }
        // 赤红轨迹带：式神游过之处化为赤红领域（多条横贯正弦光带）
        for (let i = 0; i < 4; i++) {
            const baseY = 100 + i * 100;
            const amp = 24 + (i % 2) * 14;
            g.fillStyle = `rgba(255,116,88,${a*(0.16-i*0.02)})`;
            g.beginPath();
            g.moveTo(-60, baseY);
            for (let s = 0; s <= 16; s++) {
                const sx = -60 + (VW + 120) * s / 16;
                g.lineTo(sx, baseY + Math.sin(s * 0.7 + t * 0.05 + i * 2.1) * amp);
            }
            for (let s = 16; s >= 0; s--) {
                const sx = -60 + (VW + 120) * s / 16;
                g.lineTo(sx, baseY + 30 + Math.sin(s * 0.7 + t * 0.05 + i * 2.1 + 0.5) * amp * 0.8);
            }
            g.closePath();
            g.fill();
            // 轨迹上缘亮线
            g.strokeStyle = `rgba(255,176,154,${a*0.35})`;
            g.lineWidth = 1.2;
            g.beginPath();
            for (let s = 0; s <= 16; s++) {
                const sx = -60 + (VW + 120) * s / 16;
                const sy = baseY + Math.sin(s * 0.7 + t * 0.05 + i * 2.1) * amp;
                if (s === 0) g.moveTo(sx, sy);
                else g.lineTo(sx, sy);
            }
            g.stroke();
        }
        // 双巨式神剪影：穿梭天穹的鱼形式神（对相位循环横越）
        for (let s2 = 0; s2 < 2; s2++) {
            const ph = ((t * 0.004 + s2 * 0.5) % 1);
            const fw = s2 === 0 ? 1 : -1;
            const fx = fw === 1 ? -180 + ph * (VW + 360) : VW + 180 - ph * (VW + 360);
            const fy = 120 + s2 * 150 + Math.sin(t * 0.03 + s2 * 2.6) * 34;
            const sc = 1 + s2 * 0.35;
            g.save();
            g.translate(fx, fy);
            g.scale(fw * sc, sc);
            // 剪影后拖染红光幕
            const gtA = g.createLinearGradient(-220, 0, 30, 0);
            gtA.addColorStop(0, 'rgba(255,106,82,0)');
            gtA.addColorStop(1, `rgba(255,106,82,${a*0.30})`);
            g.fillStyle = gtA;
            g.beginPath();
            g.moveTo(-220, -16);
            g.lineTo(24, 0);
            g.lineTo(-220, 16);
            g.closePath();
            g.fill();
            // 鱼形剪影本体（深赤剪影 + 白独眼）
            g.fillStyle = `rgba(90,16,10,${a*0.85})`;
            g.beginPath();
            g.ellipse(0, 0, 46, 18, 0, 0, Math.PI * 2);
            g.fill();
            const twA = Math.sin(t * 0.25 + s2 * 2) * 8;
            g.beginPath();
            g.moveTo(-40, 0);
            g.lineTo(-68, -17 + twA);
            g.lineTo(-68, 17 + twA);
            g.closePath();
            g.fill();
            g.beginPath();
            g.moveTo(-12, -16);
            g.lineTo(4, -30);
            g.lineTo(16, -15);
            g.closePath();
            g.fill();
            g.fillStyle = `rgba(255,240,235,${a*0.9})`;
            g.beginPath();
            g.arc(26, -4, 5.5, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = `rgba(40,8,6,${a*0.95})`;
            g.beginPath();
            g.arc(27.5, -4, 2.6, 0, Math.PI * 2);
            g.fill();
            g.restore();
        }
        // 染红光尘：缓慢上浮的赤红光点（循环上浮）
        for (let i = 0; i < 10; i++) {
            const ph = ((t * 0.005 + i * 0.097) % 1);
            const gx = ((i * 211.7) % VW) + Math.sin(t * 0.03 + i * 2.2) * 20;
            const gy = GROUND - 30 - ph * (GROUND - 160);
            const ga = (1 - ph) * a * 0.65;
            const gr = 2.4 + (i % 3) * 1.4;
            g.fillStyle = i % 2 === 0 ? `rgba(255,106,82,${ga})` : `rgba(255,176,154,${ga})`;
            g.beginPath();
            g.arc(gx, gy, gr, 0, Math.PI * 2);
            g.fill();
        }
        // 地面赤红映照
        const ggA = g.createLinearGradient(0, GROUND - 40, 0, VH);
        ggA.addColorStop(0, 'rgba(255,106,82,0)');
        ggA.addColorStop(0.5, `rgba(130,36,22,${a*0.4})`);
        ggA.addColorStop(1, `rgba(28,6,4,${a*0.8})`);
        g.fillStyle = ggA;
        g.fillRect(-60, GROUND - 40, VW + 120, VH - GROUND + 100);
        // 领域名：赤红发光字
        g.save();
        g.shadowColor = 'rgba(255,106,82,0.9)';
        g.shadowBlur = 18;
        g.fillStyle = `rgba(255,232,224,${a*0.88})`;
        g.font = '900 46px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillText('赤 空 回 游', VW / 2, 120);
        g.restore();
    }
}
