/* =====================================================================
   魔虚罗（伏黑惠召唤的可被攻击式神实体）
   视觉版本：参考图重置版 2026-08-01；领域友军判定版
   ===================================================================== */
import { GROUND, GRAV, VW } from '../config.js';
import { clamp, lerp } from '../utils.js';
import { FX } from '../fx.js';
import { AudioSys } from '../audio.js';

export class Mahoraga {
  constructor(owner, options={}){
    this.owner=owner; this.side=owner.side;
    this.x=owner.x - owner.facing*140; this.y=GROUND;
    this.vx=0; this.vy=0; this.facing=owner.facing;
    this.maxHp=options.maxHp||420; this.hp=this.maxHp;
    // 前期伏黑惠的必杀召唤在本回合内永久存在；被击破仍会正常退场。
    this.permanent=true;
    this.life=Infinity;
    this.dead=false; this.state='idle'; this.st=0;
    this.atkCD=0; this.animT=0; this.bornT=0; this.flashT=0;
    this.adapt=0;               // 法轮适应层数（减伤）
    this.damage=options.damage||22;
    this.moveSpeed=options.moveSpeed||3.4;
    this.attackCooldown=options.attackCooldown||70;
    this.maxReduction=options.maxReduction||0.55;
    this.adaptReduction=options.adaptReduction||0.08;
    this.attackOwner=options.attackOwner!==false;
  }
  get cy(){ return this.y-100; }
  hittable(){ return !this.dead; }
  takeHit(foe,opt){
    if(this.dead) return;
    // 法轮适应：每层减少受到的伤害
    const red = Math.min(this.maxReduction, this.adapt*this.adaptReduction);
    let dmg=opt.dmg*(1-red);
    this.hp-=dmg; this.flashT=6; this.adapt++;
    FX.spark(this.x,this.cy,'#e8e4ff');
    FX.text(this.x,this.cy-80,Math.round(dmg),'#e8e4ff',22);
    FX.addShake(3);
    if(this.hp<=0){ this.hp=0; this.die(); }
  }
  die(){
    this.dead=true;
    FX.burst(this.x,this.cy,'#e8e4ff',40,11,46,5);
    FX.flash('#e8e4ff',0.3,12); FX.addShake(10); AudioSys.play('ko');
    FX.text(this.x,this.cy-100,'魔虚罗 退魔','#e8e4ff',26);
    if(this.owner) this.owner.mahoraga=null;
  }
  update(game){
    if(this.dead) return;
    this.animT++; this.st++;
    if(this.flashT>0) this.flashT--;
    if(this.atkCD>0) this.atkCD--;
    if(!this.permanent){
      this.life--;
      if(this.life<=0){ this.die(); return; }
    }
    if(this.bornT<18) this.bornT++;
    // 未调伏魔虚罗攻击召唤者；已调伏魔虚罗仅攻击敌方
    const cand = this.attackOwner ? [this.owner, game.fighters[1-this.side]] : [game.fighters[1-this.side]];
    let tgt=null, best=Infinity;
    for(const c of cand){
      if(c && !c.dead && c.hittable()){
        const d=Math.abs(c.x-this.x);
        if(d<best){ best=d; tgt=c; }
      }
    }
    if(!tgt){ this.state='idle'; this.vx*=0.8; }
    else {
      const dx=tgt.x-this.x;
      this.facing=dx>0?1:-1;
      const dist=best;
      if(this.state==='attack'){
        if(this.st===12 && this.atkCD<=0){
          this.atkCD=this.attackCooldown;
          // 退魔剑斩
          if(tgt.hittable()&&dist<150&&Math.abs(tgt.cy-this.cy)<110){
            tgt.takeHit(this.owner,{dmg:this.damage,stun:20,kb:7,shake:6,hitstop:6,spark:'#e8e4ff',sound:'hit3'});
          }
          FX.slash(this.x+this.facing*80,this.cy,this.facing>0?-0.4:Math.PI+0.4,'#e8e4ff',160);
          FX.ring(this.x+this.facing*80,this.cy,'#e8e4ff',90,5);
          AudioSys.play('hit2');
        }
        if(this.st>26){ this.state='idle'; this.st=0; }
      } else {
        if(dist>150){ this.vx=this.facing*this.moveSpeed; this.state='walk'; }
        else { this.vx*=0.7; this.state='idle'; if(this.atkCD<=0){ this.state='attack'; this.st=0; } }
      }
    }
    this.x+=this.vx;
    if(this.y<GROUND) this.vy+=GRAV;
    this.y=Math.min(GROUND,this.y+this.vy);
    if(this.y>=GROUND){ this.vy=0; }
    this.x=clamp(this.x,60,VW-60);
    // 法轮转动视觉
    this.wheelA=(this.wheelA||0)+0.04+this.adapt*0.002;
  }
  draw(g){
    if(this.dead) return;
    const an=this.animT;
    const born=clamp(this.bornT/18,0,1);                    // 降临淡入 + 从影中升起
    const br=Math.sin(an*0.055)*2;                          // 呼吸起伏
    const walk=this.state==='walk'?Math.sin(an*0.3)*8:0;
    const ap=this.state==='attack'?clamp(this.st/26,0,1):0; // 攻击进度
    const wind=ap>0?Math.min(1,ap/0.42):0;                  // 抬剑蓄势 0-1
    const sl=ap>0.42?Math.min(1,(ap-0.42)/0.3):0;           // 挥斩 0-1
    g.save(); g.translate(this.x,this.y);
    g.globalAlpha=born;
    // 接地影 + 降临影池
    g.fillStyle='rgba(0,0,0,'+(0.42+0.3*(1-born))+')';
    g.beginPath(); g.ellipse(0,6,52+40*(1-born),10+5*(1-born),0,0,Math.PI*2); g.fill();
    // 圣辉（随适应层数增强的正极咒力场）
    const gl=0.14+Math.min(0.2,this.adapt*0.02)+Math.sin(an*0.08)*0.03;
    const grd=g.createRadialGradient(0,-104,10,0,-104,140);
    grd.addColorStop(0,'rgba(235,230,255,'+gl.toFixed(3)+')');
    grd.addColorStop(1,'rgba(235,230,255,0)');
    g.fillStyle=grd; g.beginPath(); g.arc(0,-104,140,0,Math.PI*2); g.fill();
    // 适应咒力环（受击越多越亮）
    if(this.adapt>0){
      g.strokeStyle='rgba(184,168,255,'+Math.min(0.5,0.1+this.adapt*0.045).toFixed(3)+')';
      g.lineWidth=2;
      g.beginPath(); g.ellipse(0,-98,58+Math.sin(an*0.06)*3,86,0,0,Math.PI*2); g.stroke();
    }
    g.scale(this.facing,1);
    g.translate(0,br+(1-born)*26);
    g.lineCap='round';
    // ---- 腿：参考图的白色肌肉小腿 + 黑色宽裤 ----
    // 白色大腿从裤口露出，腿部不再像铠甲，而是雕塑般的肌体
    g.strokeStyle='#d9d9d6'; g.lineWidth=17;
    g.beginPath(); g.moveTo(-13,-58); g.quadraticCurveTo(-18-walk*0.6,-34,-15-walk,-5); g.stroke();
    g.beginPath(); g.moveTo(13,-58); g.quadraticCurveTo(18+walk*0.6,-34,16+walk,-5); g.stroke();
    g.strokeStyle='#f4f4ef'; g.lineWidth=10;
    g.beginPath(); g.moveTo(-15-walk*0.8,-32); g.lineTo(-15-walk,-7); g.stroke();
    g.beginPath(); g.moveTo(15+walk*0.8,-32); g.lineTo(16+walk,-7); g.stroke();
    // 脚踝黑环和裸足
    g.strokeStyle='#17171a'; g.lineWidth=3;
    g.beginPath(); g.ellipse(-15-walk,-6,7,3,0,0,Math.PI*2); g.stroke();
    g.beginPath(); g.ellipse(16+walk,-6,7,3,0,0,Math.PI*2); g.stroke();
    g.fillStyle='#f0f0eb';
    g.beginPath(); g.ellipse(-16-walk,-2,12,6,0,0,Math.PI*2); g.fill();
    g.beginPath(); g.ellipse(18+walk,-2,12,6,0,0,Math.PI*2); g.fill();
    // ---- 黑色宽裤：参考图的膝上袴裤轮廓 ----
    g.fillStyle='#19191c';
    g.beginPath();
    g.moveTo(-25,-84); g.quadraticCurveTo(-36,-66,-34,-30);
    g.quadraticCurveTo(-29,-18,-5,-20); g.lineTo(0,-56);
    g.lineTo(5,-20); g.quadraticCurveTo(29,-18,34,-30);
    g.quadraticCurveTo(36,-66,25,-84); g.closePath(); g.fill();
    g.strokeStyle='rgba(86,82,78,0.5)'; g.lineWidth=1.4;
    g.beginPath(); g.moveTo(-22,-78); g.quadraticCurveTo(-28,-51,-23,-25); g.stroke();
    g.beginPath(); g.moveTo(22,-78); g.quadraticCurveTo(28,-51,23,-25); g.stroke();
    // ---- 腰间灰白布带：结扣垂到腹前 ----
    g.fillStyle='#c7c0b7';
    g.beginPath(); g.moveTo(-28,-86); g.quadraticCurveTo(0,-78,28,-86); g.lineTo(26,-73); g.quadraticCurveTo(0,-66,-26,-73); g.closePath(); g.fill();
    g.fillStyle='#aaa39b';
    g.beginPath(); g.moveTo(-3,-77); g.lineTo(12,-73); g.lineTo(9,-18); g.lineTo(-2,-29); g.closePath(); g.fill();
    g.strokeStyle='rgba(80,72,66,0.55)'; g.lineWidth=1;
    g.beginPath(); g.moveTo(0,-76); g.lineTo(7,-27); g.stroke();
    // ---- 白色肌肉躯干：胸肌、腹肌与肩颈轮廓 ----
    g.fillStyle='#ededeb';
    g.beginPath(); g.moveTo(-29,-146); g.quadraticCurveTo(0,-160,29,-146);
    g.lineTo(22,-82); g.quadraticCurveTo(0,-74,-22,-82); g.closePath(); g.fill();
    // 肌体阴影，塑造参考图中的雕塑感
    g.fillStyle='rgba(156,156,154,0.38)';
    g.beginPath(); g.ellipse(-13,-126,12,8,-0.1,0,Math.PI*2); g.fill();
    g.beginPath(); g.ellipse(13,-126,12,8,0.1,0,Math.PI*2); g.fill();
    g.beginPath(); g.moveTo(-19,-112); g.quadraticCurveTo(-13,-106,-5,-109); g.lineTo(-6,-99); g.quadraticCurveTo(-14,-98,-20,-103); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(19,-112); g.quadraticCurveTo(13,-106,5,-109); g.lineTo(6,-99); g.quadraticCurveTo(14,-98,20,-103); g.closePath(); g.fill();
    g.strokeStyle='rgba(104,104,102,0.72)'; g.lineWidth=2;
    // 胸肌弧线、腹肌横纹、腹中线
    g.beginPath(); g.moveTo(-24,-132); g.quadraticCurveTo(-12,-139,0,-132); g.stroke();
    g.beginPath(); g.moveTo(0,-132); g.quadraticCurveTo(12,-139,24,-132); g.stroke();
    g.beginPath(); g.moveTo(0,-143); g.lineTo(0,-84); g.stroke();
    g.lineWidth=1.5;
    for(let i=0;i<3;i++){
      const yy=-110+i*10;
      g.beginPath(); g.moveTo(-12,yy); g.quadraticCurveTo(0,yy+4,12,yy); g.stroke();
    }
    // 胸前黑色咒纹/束带，呼应参考图的黑色横向标志
    g.strokeStyle='#202024'; g.lineWidth=2.6; g.lineCap='round';
    g.beginPath(); g.moveTo(-15,-130); g.lineTo(15,-130); g.stroke();
    for(let i=-1;i<=1;i++){
      g.beginPath(); g.moveTo(i*8,-132); g.lineTo(i*8,-125); g.stroke();
    }
    g.lineCap='round';
    // 肩部白色圆润肌肉，而不是旧式肩甲
    g.fillStyle='#e3e3e0'; g.strokeStyle='#b5b5b2'; g.lineWidth=1.8;
    g.beginPath(); g.ellipse(-28,-141,13,11,-0.2,0,Math.PI*2); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(28,-141,13,11,0.2,0,Math.PI*2); g.fill(); g.stroke();
    // ---- 左臂：白色关节肌体 + 黑色腕环 ----
    g.strokeStyle='#d8d8d5'; g.lineWidth=14;
    g.beginPath(); g.moveTo(-25,-137); g.quadraticCurveTo(-35,-113,-34,-87); g.stroke();
    g.strokeStyle='#f0f0ec'; g.lineWidth=8;
    g.beginPath(); g.moveTo(-33,-112); g.lineTo(-34,-89); g.stroke();
    g.strokeStyle='#17171a'; g.lineWidth=3;
    g.beginPath(); g.ellipse(-34,-88,8,3,0,0,Math.PI*2); g.stroke();
    g.fillStyle='#e8e8e4'; g.beginPath(); g.arc(-34,-82,8,0,Math.PI*2); g.fill();
    // ---- 右臂 + 退魔剑（持剑待机 → 高举蓄势 → 弧光斩落） ----
    let hx=lerp(34,20,wind), hy=lerp(-90,-164,wind), sa=lerp(-0.55,-2.0,wind);
    hx=lerp(hx,62,sl); hy=lerp(hy,-86,sl); sa=lerp(sa,0.85,sl);
    g.strokeStyle='#d8d8d5'; g.lineWidth=14;
    g.beginPath(); g.moveTo(25,-137); g.quadraticCurveTo(35,-124,hx,hy); g.stroke();
    g.strokeStyle='#f1f1ed'; g.lineWidth=8;
    g.beginPath(); g.moveTo(31,-120); g.lineTo(hx-2,hy+2); g.stroke();
    g.strokeStyle='#17171a'; g.lineWidth=3;
    g.beginPath(); g.ellipse(hx-4,hy+2,8,3,sa,0,Math.PI*2); g.stroke();
    // 挥斩弧光轨迹
    if(sl>0&&sl<1){
      g.strokeStyle='rgba(255,233,168,'+(0.55*(1-sl*0.7)).toFixed(3)+')';
      g.lineWidth=10;
      g.beginPath(); g.arc(28,-122,88,-2.0,lerp(-2.0,0.85,sl)); g.stroke();
      g.strokeStyle='rgba(255,255,255,'+(0.4*(1-sl*0.7)).toFixed(3)+')';
      g.lineWidth=4;
      g.beginPath(); g.arc(28,-122,88,lerp(-2.0,0.85,sl)-0.5,lerp(-2.0,0.85,sl)); g.stroke();
    }
    // 剑体：护手 + 金辉光刃 + 白芯
    g.save(); g.translate(hx,hy); g.rotate(sa);
    g.strokeStyle='#8a7ab0'; g.lineWidth=5;
    g.beginPath(); g.moveTo(-8,0); g.lineTo(-2,0); g.stroke();
    g.strokeStyle='#c8b880'; g.lineWidth=4;
    g.beginPath(); g.moveTo(2,-8); g.lineTo(2,8); g.stroke();
    g.strokeStyle='rgba(255,233,168,0.4)'; g.lineWidth=13;
    g.beginPath(); g.moveTo(6,0); g.lineTo(80,-6); g.stroke();
    g.strokeStyle='rgba(255,240,180,0.95)'; g.lineWidth=7;
    g.beginPath(); g.moveTo(4,0); g.lineTo(82,-6); g.stroke();
    g.strokeStyle='rgba(255,255,255,0.92)'; g.lineWidth=2.6;
    g.beginPath(); g.moveTo(8,-1); g.lineTo(78,-6); g.stroke();
    g.restore();
    // ---- 头部：白色无眼面孔 + 兽性下颌 + 多束羽状头冠 ----
    g.fillStyle='#f0f0ec';
    g.beginPath(); g.arc(0,-168,18,0,Math.PI*2); g.fill();
    // 颌部阴影与狭长咧嘴，保留盲目之兽的非人感
    g.fillStyle='#c4c4c0';
    g.beginPath(); g.moveTo(-14,-166); g.quadraticCurveTo(0,-157,14,-166); g.lineTo(10,-151); g.quadraticCurveTo(0,-145,-10,-151); g.closePath(); g.fill();
    g.fillStyle='#17171a';
    g.beginPath(); g.moveTo(-9,-157); g.quadraticCurveTo(0,-151,9,-157); g.quadraticCurveTo(0,-146,-9,-157); g.fill();
    g.strokeStyle='#8d8d89'; g.lineWidth=1.5;
    g.beginPath(); g.moveTo(0,-185); g.lineTo(0,-162); g.stroke();
    g.beginPath(); g.moveTo(-11,-171); g.quadraticCurveTo(0,-175,11,-171); g.stroke();
    // 头顶四束白色羽角，像参考图中的放射状头冠
    g.fillStyle='#fafaf6';
    g.beginPath(); g.moveTo(-13,-176); g.quadraticCurveTo(-36,-183,-50,-202); g.quadraticCurveTo(-30,-193,-8,-185); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(13,-176); g.quadraticCurveTo(36,-183,50,-202); g.quadraticCurveTo(30,-193,8,-185); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(-8,-181); g.quadraticCurveTo(-16,-207,-7,-220); g.quadraticCurveTo(0,-198,0,-183); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(8,-181); g.quadraticCurveTo(16,-207,7,-220); g.quadraticCurveTo(0,-198,0,-183); g.closePath(); g.fill();
    g.strokeStyle='rgba(177,177,172,0.75)'; g.lineWidth=1.2;
    g.beginPath(); g.moveTo(-12,-179); g.quadraticCurveTo(-30,-187,-44,-198); g.stroke();
    g.beginPath(); g.moveTo(12,-179); g.quadraticCurveTo(30,-187,44,-198); g.stroke();
    // ---- 头顶法轮（金辉背光 + 转轮 + 适应刻度） ----
    const wg=g.createRadialGradient(0,-216,4,0,-216,38);
    wg.addColorStop(0,'rgba(255,233,168,'+(0.34+Math.min(0.28,this.adapt*0.03)).toFixed(3)+')');
    wg.addColorStop(1,'rgba(255,233,168,0)');
    g.fillStyle=wg; g.beginPath(); g.arc(0,-216,38,0,Math.PI*2); g.fill();
    g.save(); g.translate(0,-216); g.rotate(this.wheelA||0);
    g.strokeStyle='#ffe9a8'; g.lineWidth=3.6;
    g.beginPath(); g.arc(0,0,16,0,Math.PI*2); g.stroke();
    g.beginPath(); g.arc(0,0,6,0,Math.PI*2); g.stroke();
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      // 已适应的辐条亮白，未适应保持金色
      g.strokeStyle=i<Math.min(8,this.adapt)?'#ffffff':'#ffe9a8';
      g.beginPath(); g.moveTo(Math.cos(a)*6,Math.sin(a)*6); g.lineTo(Math.cos(a)*24,Math.sin(a)*24); g.stroke();
    }
    g.restore();
    // 金轮后方的短辐条与参考图一致，增强“神将”识别度
    g.strokeStyle='rgba(119,93,28,0.62)'; g.lineWidth=1.2;
    g.beginPath(); g.moveTo(-22,-216); g.lineTo(-34,-226); g.stroke();
    g.beginPath(); g.moveTo(22,-216); g.lineTo(34,-226); g.stroke();
    g.restore();
    // 血条 + 适应层数
    g.save();
    g.fillStyle='rgba(0,0,0,0.55)'; g.fillRect(this.x-40,this.y-244,80,7);
    g.fillStyle='#b8a8ff'; g.fillRect(this.x-40,this.y-244,80*this.hp/this.maxHp,7);
    g.strokeStyle='#e8e4ff'; g.lineWidth=1; g.strokeRect(this.x-40,this.y-244,80,7);
    g.font='700 11px "Microsoft YaHei"'; g.textAlign='center'; g.fillStyle='#e8e4ff';
    g.fillText('魔虚罗'+(this.adapt>0?' · 适应×'+this.adapt:''),this.x,this.y-250);
    g.restore();
    // 受击闪白
    if(this.flashT>0&&this.flashT%4<2){ g.save(); g.globalAlpha=0.3; g.fillStyle='#fff';
      g.beginPath(); g.arc(this.x,this.cy,70,0,Math.PI*2); g.fill(); g.restore(); }
  }
}
