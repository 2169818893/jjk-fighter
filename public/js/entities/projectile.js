/* =====================================================================
   飞行道具 / 式神投射物
   ===================================================================== */
import { VW, VH } from '../config.js';
import { FX } from '../fx.js';

export class Projectile {
  constructor(o){ Object.assign(this,o); this.dead=false; this.hitSet=new Set(); }
  facing(){ return this.owner.facing; }
  update(game){
    this.x += this.vx||0; this.y += this.vy||0;
    if(this.gravP) this.vy += this.gravP;
    this.life--;
    if(this.anim!==undefined) this.anim++;
    if(this.update2) this.update2(game);
    if(this.trail) FX.burst(this.x,this.y,this.color,2,1.5,14,3);
    if(this.life<=0 || this.x<-150 || this.x>VW+150 || this.y>VH+150) this.dead=true;
    const target = this.owner.foe;
    if(target && !this.hitSet.has(target) && target.hittable()){
      const hw=this.w/2, hh=this.h/2;
      const yTol = this.type==='nue' ? hh+150 : hh+60;   // 鵺俯冲纵向容差更大
      if(Math.abs(target.x-this.x)<hw+34 && Math.abs(target.cy-this.y)<yTol){
        this.hitSet.add(target);
        this.onHit(target, game);
        if(this.consume!==false) this.dead=true;
      }
    }
  }
  draw(_g){}
}
