import { GROUND, GRAV, VW } from '../config.js';
import { clamp } from '../utils.js';
import { FX } from '../fx.js';
import { AudioSys } from '../audio.js';

export class Agito {
    constructor(owner) {
        this.owner = owner;
        this.side = owner.side;
        this.x = owner.x - owner.facing * 110;
        this.y = GROUND;
        this.vx = 0;
        this.vy = 0;
        this.facing = owner.facing;
        this.maxHp = 240;
        this.hp = this.maxHp;
        this.permanent = true;
        this.dead = false;
        this.state = 'idle';
        this.st = 0;
        this.atkCD = 0;
        this.animT = 0;
        this.flashT = 0;
        this.regenTick = 0;
    }

    get cy() { return this.y - 78; }
    hittable() { return !this.dead; }

    takeHit(foe, opt) {
        if (this.dead) return;
        const dmg = opt.dmg * 0.9;
        this.hp -= dmg;
        this.flashT = 6;
        FX.spark(this.x, this.cy, '#b8d8ff');
        FX.text(this.x, this.cy - 70, Math.round(dmg), '#b8d8ff', 20);
        if (this.hp <= 0) this.die();
    }

    die() {
        if (this.dead) return;
        this.dead = true;
        FX.burst(this.x, this.cy, '#8ab8e8', 28, 9, 38, 4);
        FX.ring(this.x, this.cy, '#d8ecff', 100, 6);
        if (this.owner) this.owner.agito = null;
    }

    update(game) {
        if (this.dead) return;
        this.animT++;
        this.st++;
        if (!this.owner || this.owner.dead) { this.die(); return; }
        if (this.flashT > 0) this.flashT--;
        if (this.atkCD > 0) this.atkCD--;
        this.regenTick++;
        if (this.regenTick >= 60) {
            this.regenTick = 0;
            this.hp = Math.min(this.maxHp, this.hp + 4);
        }
        const target = game.fighters[1 - this.side];
        if (!target || target.dead) {
            this.state = 'idle';
            this.vx *= 0.75;
        } else {
            const dx = target.x - this.x;
            const dist = Math.abs(dx);
            this.facing = dx >= 0 ? 1 : -1;
            if (this.state === 'attack') {
                if (this.st === 12 && target.hittable() && dist < 170 && Math.abs(target.cy - this.cy) < 120) {
                    FX.lightning(this.x, this.cy - 30, target.x, target.cy, '#8fc8ff', 6);
                    FX.slash(target.x, target.cy, this.facing > 0 ? -0.4 : Math.PI + 0.4, '#d8ecff', 130);
                    target.takeHit(this.owner, { dmg: 15, stun: 20, kb: 7, launch: 3, shake: 7, hitstop: 6, spark: '#8fc8ff', sound: 'hit2' });
                    AudioSys.play('hit2');
                }
                if (this.st > 28) { this.state = 'idle'; this.st = 0; this.atkCD = 86; }
            } else if (dist > 150) {
                this.state = 'walk';
                this.vx = this.facing * 3;
            } else {
                this.state = 'idle';
                this.vx *= 0.65;
                if (this.atkCD <= 0) { this.state = 'attack'; this.st = 0; }
            }
        }
        this.x = clamp(this.x + this.vx, 60, VW - 60);
        if (this.y < GROUND) this.vy += GRAV;
        this.y = Math.min(GROUND, this.y + this.vy);
        if (this.y >= GROUND) this.vy = 0;
    }

    draw(g) {
        if (this.dead) return;
        const t = this.animT;
        const bob = Math.sin(t * 0.07) * 2;
        const step = this.state === 'walk' ? Math.sin(t * 0.28) * 9 : 0;
        const strike = this.state === 'attack' ? Math.sin(Math.min(1, this.st / 22) * Math.PI) : 0;
        g.save();
        g.translate(this.x, this.y + bob);
        g.fillStyle = 'rgba(20,4,8,0.48)';
        g.beginPath(); g.ellipse(0, 5, 58, 10, 0, 0, Math.PI * 2); g.fill();
        g.scale(this.facing, 1);
        const pulse = 0.24 + Math.sin(t * 0.12) * 0.08;
        const aura = g.createRadialGradient(0, -104, 12, 0, -104, 128);
        aura.addColorStop(0, `rgba(255,72,38,${pulse})`);
        aura.addColorStop(1, 'rgba(255,40,20,0)');
        g.fillStyle = aura; g.beginPath(); g.arc(0, -104, 128, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#17141a'; g.lineWidth = 23; g.lineCap = 'round';
        g.beginPath(); g.moveTo(-18, -61); g.lineTo(-20 - step, -5); g.stroke();
        g.beginPath(); g.moveTo(18, -61); g.lineTo(22 + step, -5); g.stroke();
        g.strokeStyle = '#241922'; g.lineWidth = 4;
        g.beginPath(); g.moveTo(-18, -48); g.lineTo(-23 - step * 0.5, -22); g.stroke();
        g.beginPath(); g.moveTo(18, -48); g.lineTo(24 + step * 0.5, -22); g.stroke();
        g.fillStyle = '#d6a090';
        g.beginPath();
        g.moveTo(-27, -102); g.quadraticCurveTo(-16, -73, -15, -58);
        g.lineTo(15, -58); g.quadraticCurveTo(17, -76, 29, -103);
        g.quadraticCurveTo(8, -92, 0, -86); g.quadraticCurveTo(-8, -93, -27, -102);
        g.closePath(); g.fill();
        g.strokeStyle = '#704648'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, -95); g.lineTo(0, -64); g.stroke();
        g.beginPath(); g.moveTo(-12, -85); g.quadraticCurveTo(0, -78, 12, -85); g.stroke();
        const flesh = g.createLinearGradient(-45, -160, 38, -78);
        flesh.addColorStop(0, '#641b2b'); flesh.addColorStop(0.52, '#a52c35'); flesh.addColorStop(1, '#d34a3f');
        g.fillStyle = flesh;
        g.beginPath();
        g.moveTo(-42, -142); g.quadraticCurveTo(-25, -171, 0, -164);
        g.quadraticCurveTo(28, -174, 46, -139); g.quadraticCurveTo(35, -105, 25, -91);
        g.quadraticCurveTo(4, -102, 0, -110); g.quadraticCurveTo(-11, -96, -28, -103);
        g.quadraticCurveTo(-39, -119, -42, -142); g.closePath(); g.fill();
        g.strokeStyle = '#8a2833'; g.lineWidth = 19;
        g.beginPath(); g.moveTo(-34, -139); g.quadraticCurveTo(-57, -123, -57, -79); g.lineTo(-62, -46); g.stroke();
        g.beginPath(); g.moveTo(35, -137); g.quadraticCurveTo(57, -116, 53 + strike * 43, -73 - strike * 15); g.lineTo(57 + strike * 48, -49 - strike * 12); g.stroke();
        g.strokeStyle = '#d34a3f'; g.lineWidth = 12;
        g.beginPath(); g.moveTo(-35, -135); g.quadraticCurveTo(-51, -116, -52, -82); g.stroke();
        g.beginPath(); g.moveTo(36, -134); g.quadraticCurveTo(51, -112, 49 + strike * 42, -78 - strike * 14); g.stroke();
        g.fillStyle = '#bd3b3b';
        g.beginPath(); g.ellipse(-62, -43, 10, 13, 0.2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(58 + strike * 48, -46 - strike * 12, 10, 13, -0.2, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#e0664d'; g.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
            const yy = -151 + i * 8;
            g.beginPath(); g.moveTo(-30 + (i % 2) * 4, yy); g.quadraticCurveTo(-13, yy + 5, -3, yy + 1); g.stroke();
            g.beginPath(); g.moveTo(30 - (i % 2) * 4, yy + 2); g.quadraticCurveTo(16, yy + 7, 5, yy + 2); g.stroke();
        }
        g.strokeStyle = '#4f1623'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(-20, -114); g.quadraticCurveTo(-8, -106, -3, -110); g.stroke();
        g.beginPath(); g.moveTo(18, -112); g.quadraticCurveTo(8, -103, 2, -109); g.stroke();
        g.fillStyle = '#d75646';
        g.beginPath(); g.moveTo(-18, -155); g.quadraticCurveTo(-4, -178, 6, -160); g.quadraticCurveTo(13, -177, 24, -153); g.quadraticCurveTo(10, -143, -18, -155); g.fill();
        g.strokeStyle = '#35151e'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(-8, -160); g.quadraticCurveTo(-13, -184, -5, -196); g.stroke();
        g.beginPath(); g.moveTo(8, -160); g.quadraticCurveTo(18, -184, 13, -199); g.stroke();
        g.fillStyle = '#f0b54f';
        g.beginPath(); g.arc(29, -135, 14, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#ffe090'; g.lineWidth = 4;
        g.beginPath(); g.arc(29, -135, 17 + Math.sin(t * 0.12) * 2, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#5b171f';
        g.beginPath(); g.arc(29, -135, 7, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#ffb640'; g.lineWidth = 2;
        const bolts = [[-43,-126,-56,-101],[-53,-82,-69,-63],[39,-109,58,-92],[22,-52,33,-26],[-14,-54,-25,-29]];
        for (const b of bolts) {
            g.beginPath(); g.moveTo(b[0], b[1]); g.lineTo((b[0] + b[2]) / 2 + 5, (b[1] + b[3]) / 2); g.lineTo(b[2], b[3]); g.stroke();
        }
        if (this.flashT > 0) { g.globalCompositeOperation = 'screen'; g.fillStyle = 'rgba(255,220,180,0.55)'; g.fillRect(-78, -205, 165, 210); }
        g.restore();
    }
}
