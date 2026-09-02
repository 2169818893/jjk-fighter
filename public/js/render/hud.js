/* =====================================================================
   HUD 渲染：血条、计时器、咒力、技能冷却、连击
   ===================================================================== */
import { VW, VH, Settings } from '../config.js';
import { clamp, roundRect } from '../utils.js';

export const HUD = {
  draw(game, ctx, t){
    const [a,b]=game.fighters;
    if(!a||!b) return;
    // 血条
    this.drawHpBar(ctx, a, 40, 30, false);
    this.drawHpBar(ctx, b, VW-40, 30, true);
    // 计时器
    ctx.textAlign='center';
    ctx.fillStyle='rgba(0,0,0,0.55)'; roundRect(ctx,VW/2-46,14,92,64,10); ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.25)'; ctx.lineWidth=2; roundRect(ctx,VW/2-46,14,92,64,10); ctx.stroke();
    if(game.timer===Infinity){
      ctx.font='900 40px monospace'; ctx.fillStyle='#b9a8ff';
      ctx.fillText('∞', VW/2, 58);
    } else {
      ctx.font='900 40px monospace'; ctx.fillStyle= game.timer<600? '#ff5c5c':'#fff';
      ctx.fillText(Math.ceil(game.timer/60), VW/2, 58);
    }
    // 回合标记
    ctx.font='700 20px "Microsoft YaHei"'; ctx.fillStyle='rgba(255,255,255,0.75)';
    ctx.fillText(`ROUND ${game.round}`, VW/2, 100);
    for(let i=0;i<Settings.targetWins;i++){
      ctx.fillStyle = i<game.wins[0]? '#ffd76a':'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(VW/2-26-i*18, 116, 6,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = i<game.wins[1]? '#ffd76a':'rgba(255,255,255,0.2)';
      ctx.beginPath(); ctx.arc(VW/2+26+i*18, 116, 6,0,Math.PI*2); ctx.fill();
    }
    // 咒力/必杀槽
    this.drawEnergy(ctx, a, 40, VH-54, false, t);
    this.drawEnergy(ctx, b, VW-40, VH-54, true, t);
    // 技能冷却
    this.drawSkillCD(ctx, a, 40, VH-96, false);
    this.drawSkillCD(ctx, b, VW-40, VH-96, true);
    // gojo2 蓄力条
    this.drawCharge(ctx, a, 40, VH-114, false, t);
    this.drawCharge(ctx, b, VW-40, VH-114, true, t);
    // 连击
    if(a.combo>=2){ this.drawCombo(ctx, a, 150, 190, false, t); }
    if(b.combo>=2){ this.drawCombo(ctx, b, VW-150, 190, true, t); }
    // 角色名
    ctx.font='800 22px "Microsoft YaHei"';
    ctx.textAlign='left'; ctx.fillStyle=a.c.color; ctx.fillText(a.c.name + (a.isAI?' (AI)':''), 40, 108);
    ctx.textAlign='right'; ctx.fillStyle=b.c.color; ctx.fillText(b.c.name + (b.isAI?' (AI)':''), VW-40, 108);
    // 术士禁用 debuff 提示
    if(a.skillDisabled>0){ ctx.textAlign='left'; ctx.fillStyle='#ff5c5c'; ctx.font='700 16px "Microsoft YaHei"'; ctx.fillText(`术式禁用 ${Math.ceil(a.skillDisabled/60)}s`, 40, 132); }
    if(b.skillDisabled>0){ ctx.textAlign='right'; ctx.fillStyle='#ff5c5c'; ctx.font='700 16px "Microsoft YaHei"'; ctx.fillText(`术式禁用 ${Math.ceil(b.skillDisabled/60)}s`, VW-40, 132); }
    // 闯关模式进度提示
    if(game.mode==='arcade' && game.arcade){
      ctx.textAlign='center'; ctx.font='800 18px "Microsoft YaHei"'; ctx.fillStyle='#ffd76a';
      ctx.fillText(`第 ${game.arcade.stage+1} / ${game.arcade.total} 关`, VW/2, 136);
    }
  },

  drawHpBar(ctx, f, x, y, right){
    const w=470, h=26;
    const pct=clamp(f.hp/f.d.maxHp,0,1);
    ctx.save(); ctx.translate(x,y); if(right) ctx.scale(-1,1);
    // 底
    ctx.fillStyle='rgba(0,0,0,0.6)';
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(w,0); ctx.lineTo(w-14,h); ctx.lineTo(0,h); ctx.closePath(); ctx.fill();
    // 血
    const hpW=w*pct;
    const grd=ctx.createLinearGradient(0,0,w,0);
    if(pct>0.5){ grd.addColorStop(0,'#5cff8a'); grd.addColorStop(1,'#1ec85c'); }
    else if(pct>0.25){ grd.addColorStop(0,'#ffe45c'); grd.addColorStop(1,'#e8a020'); }
    else { grd.addColorStop(0,'#ff6a5c'); grd.addColorStop(1,'#d62020'); }
    ctx.fillStyle=grd;
    ctx.beginPath(); ctx.moveTo(0,2); ctx.lineTo(hpW,2); ctx.lineTo(Math.max(0,hpW-14),h-2); ctx.lineTo(0,h-2); ctx.closePath(); ctx.fill();
    // 高光 & 框
    ctx.fillStyle='rgba(255,255,255,0.25)'; ctx.fillRect(0,2,hpW,6);
    ctx.strokeStyle=f.c.color; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(w,0); ctx.lineTo(w-14,h); ctx.lineTo(0,h); ctx.closePath(); ctx.stroke();
    ctx.restore();
  },

  drawEnergy(ctx, f, x, y, right, t){
    const w=320, h=14;
    ctx.save(); ctx.translate(x,y); if(right) ctx.scale(-1,1);
    ctx.fillStyle='rgba(0,0,0,0.6)'; roundRect(ctx,0,0,w,h,7); ctx.fill();
    const pct=f.energy/100;
    const grd=ctx.createLinearGradient(0,0,w,0);
    grd.addColorStop(0,f.c.color2); grd.addColorStop(1,f.c.color);
    ctx.fillStyle=grd; roundRect(ctx,2,2,(w-4)*pct,h-4,5); ctx.fill();
    if(f.energy>=100){ ctx.strokeStyle=`rgba(255,255,255,${0.5+Math.sin(t*0.3)*0.4})`;
      ctx.lineWidth=2; roundRect(ctx,0,0,w,h,7); ctx.stroke(); }
    ctx.restore();
    ctx.textAlign=right?'right':'left'; ctx.font='700 14px "Microsoft YaHei"';
    ctx.fillStyle= f.energy>=100? '#fff':'rgba(255,255,255,0.6)';
    ctx.fillText(f.energy>=100?'必杀技就绪！':'咒力', x, y-6);
  },

  /* 技能蓄力条（gojo2 三技能 / 宿傩三技能）：蓄力中显示在技能槽上方，蓄满白色脉冲 */
  drawCharge(ctx, f, x, y, right, t){
    const canCharge = f.c.id==='gojo2' || (f.c.id==='sukuna' && f.skillKind==='skill3');
    if(!canCharge || f.state!=='skill' || !(f.chargeT>0) || f.st>=f.castAt) return;
    const w=146, h=10, pct=Math.min(1,(f.charge||0)/(f.chargeMax||90));
    ctx.save(); ctx.translate(x,y); if(right) ctx.scale(-1,1);
    ctx.fillStyle='rgba(0,0,0,0.6)'; roundRect(ctx,0,0,w,h,5); ctx.fill();
    const chC = f.c.id==='sukuna' ? '#ff9a3c' : (f.skillKind==='skill1' ? '#7fd4ff' : (f.skillKind==='skill2' ? '#ff6a4a' : '#b89aff'));
    ctx.fillStyle=chC; roundRect(ctx,2,2,Math.max(2,(w-4)*pct),h-4,3); ctx.fill();
    if(pct>=1){ ctx.strokeStyle=`rgba(255,255,255,${0.5+Math.sin(t*0.35)*0.4})`;
      ctx.lineWidth=2; roundRect(ctx,0,0,w,h,5); ctx.stroke(); }
    ctx.restore();
    ctx.textAlign=right?'right':'left'; ctx.font='700 13px "Microsoft YaHei"';
    ctx.fillStyle= pct>=1? '#fff':'rgba(255,255,255,0.7)';
    ctx.fillText(pct>=1?(f.c.id==='sukuna'?'蓄力完成！松开射出':(f.skillKind==='skill3'?'蓄力完成！':(f.skillKind==='skill2'?'蓄力完成！↑上抛/松开射出':'蓄力完成！↑ 上抛'))):'蓄力中…', x, y-5);
  },

  drawSkillCD(ctx, f, x, y, right){
    const keys=['skill1','skill2','skill3'];
    const labels=['技·壹','技·贰','技·叁'];
    let idx=0;
    keys.forEach((k,i)=>{
      if(!f.c.moves[k]) return; // 跳过角色没有的技能槽
      const bx = right? x-42-idx*52 : x+idx*52;
      idx++;
      ctx.fillStyle='rgba(0,0,0,0.6)'; roundRect(ctx,bx,y,42,34,6); ctx.fill();
      ctx.strokeStyle=f.c.color; ctx.lineWidth=1.5; roundRect(ctx,bx,y,42,34,6); ctx.stroke();
      const cdSeconds=k==='skill3'&&f.c.id==='sukunaMegumi'&&f.summonsDeployed?f.c.moves[k].transformedCd:f.c.moves[k].cd;
      const cdMax=cdSeconds*60, cd=f.cd[k];
      if(cd>0){ ctx.fillStyle='rgba(0,0,0,0.72)';
        const hh=34*cd/cdMax; ctx.fillRect(bx,y+34-hh,42,hh);
        ctx.fillStyle='#fff'; ctx.font='800 15px monospace'; ctx.textAlign='center';
        ctx.fillText(Math.ceil(cd/60), bx+21, y+22);
      } else {
        ctx.fillStyle=f.c.color; ctx.font='700 12px "Microsoft YaHei"'; ctx.textAlign='center';
        ctx.fillText(k==='skill3'&&f.c.id==='sukunaMegumi'&&f.summonsDeployed?'空间斩':labels[i], bx+21, y+22);
      }
    });
  },

  drawCombo(ctx, f, x, y, right, t){
    ctx.save(); ctx.translate(x,y);
    ctx.textAlign='center';
    const pulse=1+Math.sin(t*0.35)*0.08;
    ctx.scale(pulse,pulse);
    ctx.font='900 52px "Microsoft YaHei"';
    ctx.strokeStyle='#000'; ctx.lineWidth=7;
    ctx.strokeText(f.combo,0,0);
    ctx.fillStyle= f.combo>=10? '#ff5c3a' : '#ffd76a';
    ctx.fillText(f.combo,0,0);
    ctx.font='800 20px "Microsoft YaHei"'; ctx.fillStyle='#fff';
    ctx.strokeText('HITS',0,26); ctx.fillText('HITS',0,26);
    ctx.restore();
  }
};
