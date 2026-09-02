/* =====================================================================
   改造人（真人召唤的小型独立实体，可被攻击击破）
   ===================================================================== */
import { GROUND, GRAV, VW } from '../config.js';
import { clamp } from '../utils.js';
import { FX } from '../fx.js';
import { AudioSys } from '../audio.js';

export class TransfiguredHuman {
    constructor(owner) {
        this.owner = owner;
        this.side = owner.side;
        this.x = owner.x + owner.facing * 60;
        this.y = GROUND;
        this.vx = 0; this.vy = 0;
        this.facing = owner.facing;
        this.maxHp = 80; this.hp = this.maxHp;
        this.life = 60 * 8;           // 存在8秒
        this.dead = false;
        this.state = 'walk';
        this.st = 0;
        this.atkCD = 0;
        this.animT = 0;
        this.flashT = 0;
        this.hasHit = false;          // 接触伤害只触发一次
    }
    get cy() { return this.y - 60; }
    hittable() { return !this.dead; }
    takeHit(foe, opt) {
        if (this.dead) return;
        let dmg = opt.dmg || 10;
        this.hp -= dmg;
        this.flashT = 6;
        FX.spark(this.x, this.cy, '#d8a8c8');
        FX.text(this.x, this.cy - 50, Math.round(dmg), '#d8a8c8', 18);
        FX.addShake(2);
        if (this.hp <= 0) { this.hp = 0; this.die(); }
    }
    die() {
        this.dead = true;
        FX.burst(this.x, this.cy, '#d8a8c8', 18, 7, 28, 4);
        FX.burst(this.x, this.cy, '#8a9ab0', 12, 5, 22, 3);
        FX.text(this.x, this.cy - 60, '改造人崩解', '#d8a8c8', 20);
        AudioSys.play('hit2');
    }
    update(game) {
        if (this.dead) return;
        this.animT++;
        this.st++;
        if (this.flashT > 0) this.flashT--;
        /* P2-16：原实现 hasHit 置 true 后从不复位，atkCD 形同虚设，改造人一生只能攻击一次。
           冷却归零时复位，恢复"接触—自残—再接触"的既定节奏。 */
        if (this.atkCD > 0) { this.atkCD--; if (this.atkCD === 0) this.hasHit = false; }
        this.life--;
        if (this.life <= 0) { this.die(); return; }

        // 锁定敌方目标
        const tgt = game.fighters[1 - this.side];
        if (!tgt || tgt.dead) { this.vx *= 0.8; return; }

        const dx = tgt.x - this.x;
        this.facing = dx > 0 ? 1 : -1;
        const dist = Math.abs(dx);

        if (dist > 80) {
            // 朝敌方移动
            this.vx = this.facing * 3.2;
            this.state = 'walk';
        } else {
            // 接触攻击
            this.vx *= 0.6;
            this.state = 'attack';
            if (!this.hasHit && this.atkCD <= 0) {
                this.hasHit = true;
                this.atkCD = 50;
                if (tgt.hittable() && Math.abs(tgt.x - this.x) < 100 && Math.abs(tgt.cy - this.cy) < 90) {
                    tgt.takeHit(this.owner, { dmg: 28, stun: 30, kb: 14, launch: 8, shake: 11, hitstop: 10, spark: '#d8a8c8', sound: 'hit3' });
                    FX.burst(tgt.x, tgt.cy, '#d8a8c8', 24, 9, 32, 4);
                    FX.text(tgt.x, tgt.cy - 80, '灵魂改造', '#d8a8c8', 22);
                }
                // 接触后自毁
                this.hp -= 40;
                if (this.hp <= 0) { this.hp = 0; this.die(); return; }
            }
        }

        this.x += this.vx;
        if (this.y < GROUND) this.vy += GRAV;
        this.y = Math.min(GROUND, this.y + this.vy);
        if (this.y >= GROUND) this.vy = 0;
        this.x = clamp(this.x, 60, VW - 60);
    }
    draw(g) {
        if (this.dead) return;
        const an = this.animT;
        const br = Math.sin(an * 0.08) * 2;
        const walk = this.state === 'walk' ? Math.sin(an * 0.25) * 5 : 0;
        const atk = this.state === 'attack' ? Math.sin(an * 0.4) * 3 : 0;

        g.save();
        g.translate(this.x, this.y);
        g.scale(this.facing, 1);

        // 接地影
        g.fillStyle = 'rgba(0,0,0,0.3)';
        g.beginPath();
        g.ellipse(0, 4, 22, 6, 0, 0, Math.PI * 2);
        g.fill();

        g.translate(0, br);
        g.lineCap = 'round';

        // ---- 腿（扭曲多关节）----
        g.strokeStyle = '#8a9ab0';
        g.lineWidth = 7;
        g.beginPath();
        g.moveTo(-6, -40);
        g.quadraticCurveTo(-10 - walk * 0.5, -22, -8 - walk, -2);
        g.stroke();
        g.beginPath();
        g.moveTo(6, -40);
        g.quadraticCurveTo(10 + walk * 0.5, -22, 9 + walk, -2);
        g.stroke();
        // 额外畸形小肢（融合感）
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(138,154,176,0.5)';
        g.beginPath();
        g.moveTo(-3, -35);
        g.quadraticCurveTo(-14, -28, -16, -18);
        g.stroke();

        // ---- 躯干（扭曲人形，灰蓝色调）----
        g.fillStyle = '#9aa8bc';
        g.strokeStyle = '#6a7a90';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-14, -78);
        g.quadraticCurveTo(0, -84, 14, -78);
        g.lineTo(10 + atk, -40);
        g.quadraticCurveTo(0, -36, -10 - atk, -40);
        g.closePath();
        g.fill();
        g.stroke();

        // 缝合线纹理（躯干）
        g.strokeStyle = '#4a5a6a';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-8, -72);
        g.lineTo(-4, -52);
        g.lineTo(-9, -44);
        g.stroke();
        g.beginPath();
        g.moveTo(6, -70);
        g.lineTo(3, -55);
        g.stroke();
        // 针脚
        g.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
            const sy = -70 + i * 10;
            g.beginPath();
            g.moveTo(-7, sy);
            g.lineTo(-3, sy + 3);
            g.stroke();
        }

        // ---- 手臂（多肢体融合：正常双臂 + 额外畸形臂）----
        g.strokeStyle = '#8a9ab0';
        g.lineWidth = 6;
        // 左臂
        g.beginPath();
        g.moveTo(-12, -72);
        g.quadraticCurveTo(-22 - atk, -58, -20 - atk * 2, -42);
        g.stroke();
        // 右臂（前伸抓取）
        g.beginPath();
        g.moveTo(12, -72);
        g.quadraticCurveTo(24 + atk, -60, 28 + atk * 2, -48);
        g.stroke();
        // 额外畸形小臂（背部突出）
        g.lineWidth = 4;
        g.strokeStyle = 'rgba(138,154,176,0.6)';
        g.beginPath();
        g.moveTo(-8, -76);
        g.quadraticCurveTo(-18, -82, -22, -90);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -76);
        g.quadraticCurveTo(16, -84, 14, -92);
        g.stroke();
        // 指尖（张开爪状）
        g.lineWidth = 2;
        g.strokeStyle = '#7a8a9e';
        for (let i = 0; i < 3; i++) {
            g.beginPath();
            g.moveTo(28 + atk * 2, -48);
            g.lineTo(33 + atk * 2 + i * 3, -52 + i * 4);
            g.stroke();
        }

        // ---- 头部（扭曲歪斜，无正常五官）----
        g.fillStyle = '#a8b4c4';
        g.strokeStyle = '#6a7a90';
        g.lineWidth = 1.8;
        g.beginPath();
        g.ellipse(2, -90 + br * 0.5, 11, 13, 0.15, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        // 面部缝合线（十字）
        g.strokeStyle = '#4a5a6a';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(2, -100 + br * 0.5);
        g.lineTo(2, -80 + br * 0.5);
        g.stroke();
        g.beginPath();
        g.moveTo(-6, -90 + br * 0.5);
        g.lineTo(10, -90 + br * 0.5);
        g.stroke();
        // 歪斜嘴缝
        g.beginPath();
        g.moveTo(-3, -83 + br * 0.5);
        g.quadraticCurveTo(3, -80 + br * 0.5, 8, -84 + br * 0.5);
        g.stroke();

        g.restore();

        // 血条（小型）
        g.save();
        g.fillStyle = 'rgba(0,0,0,0.5)';
        g.fillRect(this.x - 20, this.y - 118, 40, 5);
        g.fillStyle = '#d8a8c8';
        g.fillRect(this.x - 20, this.y - 118, 40 * this.hp / this.maxHp, 5);
        g.strokeStyle = 'rgba(216,168,200,0.6)';
        g.lineWidth = 0.8;
        g.strokeRect(this.x - 20, this.y - 118, 40, 5);
        g.font = '600 9px "Microsoft YaHei"';
        g.textAlign = 'center';
        g.fillStyle = '#d8a8c8';
        g.fillText('改造人', this.x, this.y - 122);
        g.restore();

        // 受击闪白
        if (this.flashT > 0 && this.flashT % 4 < 2) {
            g.save();
            g.globalAlpha = 0.3;
            g.fillStyle = '#fff';
            g.beginPath();
            g.arc(this.x, this.cy, 35, 0, Math.PI * 2);
            g.fill();
            g.restore();
        }
    }
}
