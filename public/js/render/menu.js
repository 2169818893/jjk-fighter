/* =====================================================================
   菜单与 UI 场景渲染：标题、选人、设置、暂停、结算、操作说明
   ===================================================================== */
import { VW, VH, ROSTER, CHARS, STAGES, Settings, SET_C, ACTION_ORDER, ACTION_LABELS, ACTION_MISSING_ON, KEYMAP, THEME } from '../config.js';
import { roundRect, lerp, easeOut, easeOutBack } from '../utils.js';
import { Net } from '../net.js';
import { BGM } from '../audio.js';
import { BG } from './background.js';
import { drawPortrait } from './portrait.js';

/* ---- 颜色辅助函数 ---- */
function hexToRgba(hex, a){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
}
function parseColor(str){
  if(str && str.startsWith('#') && str.length>=7){
    const r=parseInt(str.slice(1,3),16);
    const g=parseInt(str.slice(3,5),16);
    const b=parseInt(str.slice(5,7),16);
    if(!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r,g,b,1];
  }
  const m=str && str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  return m? [+m[1],+m[2],+m[3],(m[4]!==undefined?+m[4]:1)] : [0,0,0,1];
}
function lerpColor(c1,c2,t){
  const a=parseColor(c1), b=parseColor(c2);
  const r=Math.round(a[0]+(b[0]-a[0])*t);
  const g=Math.round(a[1]+(b[1]-a[1])*t);
  const bl=Math.round(a[2]+(b[2]-a[2])*t);
  return 'rgb('+r+','+g+','+bl+')';
}

/* ---- 统一标题装饰线（两侧渐隐线 + 中央菱形） ---- */
function drawTitleDecor(ctx, cx, y, halfW){
  // 左侧渐隐线
  const lg=ctx.createLinearGradient(cx-halfW,0,cx-12,0);
  lg.addColorStop(0,'rgba(185,168,255,0)');
  lg.addColorStop(1,THEME.primary.glow+'0.5)');
  ctx.strokeStyle=lg; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(cx-halfW,y); ctx.lineTo(cx-12,y); ctx.stroke();
  // 右侧渐隐线
  const rg=ctx.createLinearGradient(cx+12,0,cx+halfW,0);
  rg.addColorStop(0,THEME.primary.glow+'0.5)');
  rg.addColorStop(1,'rgba(185,168,255,0)');
  ctx.strokeStyle=rg; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(cx+12,y); ctx.lineTo(cx+halfW,y); ctx.stroke();
  // 中央菱形
  ctx.fillStyle=THEME.accent.goldGlow+'0.7)';
  ctx.beginPath(); ctx.moveTo(cx,y-5); ctx.lineTo(cx+5,y); ctx.lineTo(cx,y+5); ctx.lineTo(cx-5,y); ctx.closePath(); ctx.fill();
}

export const MenuRenderer = {
  drawTitle(game, ctx, t){
    BG.draw(ctx,t);
    // 纵向渐晕：上下压暗、中央通透，突出标题主体
    const vg=ctx.createLinearGradient(0,0,0,VH);
    vg.addColorStop(0,'rgba(2,2,8,0.66)');
    vg.addColorStop(0.42,THEME.bg.overlay.replace('0.66','0.36'));
    vg.addColorStop(1,THEME.bg.overlayDark);
    ctx.fillStyle=vg; ctx.fillRect(0,0,VW,VH);
    // 标题背后的咒力光晕（冷色层）
    const halo=ctx.createRadialGradient(VW/2,240,30,VW/2,240,430);
    halo.addColorStop(0,THEME.primary.glow+'0.18)');
    halo.addColorStop(0.6,THEME.primary.glow+'0.05)');
    halo.addColorStop(1,THEME.primary.glow+'0)');
    ctx.fillStyle=halo; ctx.fillRect(0,0,VW,VH);
    // 第二层暖色光晕（红/橙，冷暖对比）
    const warmHalo=ctx.createRadialGradient(VW/2,260,20,VW/2,260,380);
    warmHalo.addColorStop(0,'rgba(255,80,60,0.08)');
    warmHalo.addColorStop(0.5,'rgba(255,120,50,0.03)');
    warmHalo.addColorStop(1,'rgba(255,80,60,0)');
    ctx.fillStyle=warmHalo; ctx.fillRect(0,0,VW,VH);
    // 上升咒力残粒（32个，含咒力火花，Y坐标渐变，脉动大小，水平漂移）
    for(let i=0;i<32;i++){
      const sd=i*137.5, spd=0.3+(i%5)*0.14;
      // 水平漂移：基础位置+正弦漂移
      const drift=Math.sin(t*0.008+i*2.1)*40;
      const px=(sd*7.31)%VW + Math.sin(t*0.012+i*1.3)*26 + drift;
      const py=VH+30-((t*spd+sd*3.7)%(VH+80));
      const a=0.08+0.10*(1+Math.sin(t*0.05+i*1.7))*0.5;
      // 粒子大小脉动
      const baseSize=1+(i%3)*0.9;
      const size=baseSize*(1+Math.sin(t*0.06+i)*0.3);
      // 颜色按Y坐标渐变：底部偏红→顶部偏紫
      const yRatio=py/VH;
      const cr=Math.round(255-(255-165)*(1-yRatio));
      const cg=Math.round(110+(125-110)*(1-yRatio));
      const cb=Math.round(130+(255-130)*(1-yRatio));
      // 底部粒子额外暖色叠加（红/橙）
      if(yRatio>0.7){
        const warmA=a*0.5*((yRatio-0.7)/0.3);
        ctx.fillStyle=`rgba(255,${80+Math.round(40*(1-yRatio))},${40+Math.round(30*(1-yRatio))},${warmA})`;
        ctx.beginPath(); ctx.arc(px,py,size*1.2,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle= i%4===0? `rgba(255,110,130,${a})` : `rgba(${cr},${cg},${cb},${a})`;
      ctx.beginPath(); ctx.arc(px,py,size,0,Math.PI*2); ctx.fill();
      // 闪烁效果：部分粒子随机变亮
      if(i%6===0 && Math.sin(t*0.12+i*3.7)>0.6){
        ctx.fillStyle=`rgba(255,255,255,${(a*1.5).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(px,py,size*0.7,0,Math.PI*2); ctx.fill();
      }
      // 咒力火花（前10个粒子，单层拖尾）
      if(i<10){
        const sparkA=a*0.4;
        ctx.fillStyle=`rgba(${cr},${cg},${cb},${sparkA})`;
        ctx.beginPath(); ctx.arc(px,py+size*2.5,size*0.6,0,Math.PI*2); ctx.fill();
      }
      // 咒力爆（偶发大粒子，白色闪光）
      if(i%11===0 && Math.sin(t*0.04+i*5.3)>0.85){
        const burstA=0.25+Math.sin(t*0.15+i)*0.1;
        ctx.fillStyle=`rgba(255,255,255,${burstA.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(px,py,size*2.2,0,Math.PI*2); ctx.fill();
      }
    }
    // 咒力丝线（相邻粒子间细线连接）
    ctx.strokeStyle='rgba(165,125,255,0.04)'; ctx.lineWidth=0.5;
    for(let i=0;i<32;i++){
      const sd=i*137.5, spd=0.3+(i%5)*0.14;
      const drift=Math.sin(t*0.008+i*2.1)*40;
      const px1=(sd*7.31)%VW + Math.sin(t*0.012+i*1.3)*26 + drift;
      const py1=VH+30-((t*spd+sd*3.7)%(VH+80));
      const ni=(i+1)%32;
      const sd2=ni*137.5, spd2=0.3+(ni%5)*0.14;
      const drift2=Math.sin(t*0.008+ni*2.1)*40;
      const px2=(sd2*7.31)%VW + Math.sin(t*0.012+ni*1.3)*26 + drift2;
      const py2=VH+30-((t*spd2+sd2*3.7)%(VH+80));
      const dist=Math.hypot(px2-px1,py2-py1);
      if(dist<120){
        ctx.beginPath(); ctx.moveTo(px1,py1); ctx.lineTo(px2,py2); ctx.stroke();
      }
    }
    // 咒力涡旋（粒子偶尔绕中心旋转）
    const vortexT=t*0.02;
    const vortexCx=VW/2+Math.sin(vortexT*0.3)*200;
    const vortexCy=VH/2+Math.cos(vortexT*0.2)*100;
    ctx.strokeStyle=THEME.primary.glow+'0.025)'; ctx.lineWidth=0.8;
    for(let i=0;i<8;i++){
      const angle=vortexT+i*Math.PI/4;
      const r=30+i*8;
      const vx=vortexCx+Math.cos(angle)*r;
      const vy=vortexCy+Math.sin(angle)*r;
      const nvx=vortexCx+Math.cos(angle+0.3)*r;
      const nvy=vortexCy+Math.sin(angle+0.3)*r;
      ctx.beginPath(); ctx.moveTo(vx,vy); ctx.lineTo(nvx,nvy); ctx.stroke();
    }
    // 四角饰线（紫线+内平行线+金点，呼吸脉动透明度）
    ctx.lineWidth=2;
    const cl=34;
    const cornerAlpha=0.30+Math.sin(t*0.05)*0.08;
    [[24,24,1,1],[VW-24,24,-1,1],[24,VH-24,1,-1],[VW-24,VH-24,-1,-1]].forEach(([cx,cy,dx,dy])=>{
      ctx.strokeStyle=`rgba(185,168,255,${cornerAlpha.toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(cx+dx*cl,cy); ctx.lineTo(cx,cy); ctx.lineTo(cx,cy+dy*cl); ctx.stroke();
      // 角顶点小菱形
      ctx.fillStyle=THEME.accent.goldGlow+'0.45)';
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(Math.PI/4);
      ctx.fillRect(-2.5,-2.5,5,5);
      ctx.restore();
      // 内侧平行线（更细、更淡）
      ctx.lineWidth=1;
      ctx.strokeStyle=`rgba(185,168,255,${(cornerAlpha*0.5).toFixed(3)})`;
      const off=5;
      ctx.beginPath(); ctx.moveTo(cx+dx*cl+dx*off,cy+dy*off); ctx.lineTo(cx+dx*off,cy+dy*off); ctx.lineTo(cx+dx*off,cy+dy*cl+dy*off); ctx.stroke();
      ctx.lineWidth=2;
      // 端点小圆点
      ctx.fillStyle=`rgba(185,168,255,${cornerAlpha.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(cx+dx*cl,cy,1.8,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy+dy*cl,1.8,0,Math.PI*2); ctx.fill();
      // 对角连接线（连接L形两端）
      ctx.strokeStyle=`rgba(185,168,255,${(cornerAlpha*0.35).toFixed(3)})`;
      ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(cx+dx*cl,cy); ctx.lineTo(cx,cy+dy*cl); ctx.stroke();
      ctx.lineWidth=2;
      // 角顶点十字标记
      ctx.strokeStyle=`rgba(185,168,255,${(cornerAlpha*0.6).toFixed(3)})`;
      ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(cx-4,cy); ctx.lineTo(cx+4,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy-4); ctx.lineTo(cx,cy+4); ctx.stroke();
      // 角顶点点阵（3个小点）
      ctx.fillStyle=`rgba(185,168,255,${(cornerAlpha*0.4).toFixed(3)})`;
      for(let di=0;di<3;di++){
        for(let dj=0;dj<3;dj++){
          ctx.beginPath(); ctx.arc(cx+dx*(8+di*4),cy+dy*(8+dj*4),0.6,0,Math.PI*2); ctx.fill();
        }
      }
      ctx.lineWidth=2;
      ctx.fillStyle=THEME.accent.goldGlow+'0.5)';
      ctx.beginPath(); ctx.arc(cx+dx*6,cy+dy*6,1.6,0,Math.PI*2); ctx.fill();
    });
    ctx.textAlign='center';
    // 主标题：双层脉冲辉光 + 三段渐变 + 细描边 + 微浮动+微旋转
    const glowOuter=0.5+Math.sin(t*0.03)*0.25;
    const glowInner=0.3+Math.sin(t*0.07)*0.2;
    const titleFloatY=Math.sin(t*0.025)*3;
    const titleRotZ=Math.sin(t*0.018)*0.003;
    ctx.save();
    ctx.translate(VW/2,252+titleFloatY);
    ctx.rotate(titleRotZ);
    ctx.translate(-VW/2,-(252+titleFloatY));
    ctx.font='900 112px "Microsoft YaHei"';
    // 色差效果：红色通道偏移
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle='rgba(255,0,0,0.03)';
    ctx.fillText('咒术回战', VW/2-2, 252+titleFloatY);
    // 色差效果：蓝色通道偏移
    ctx.fillStyle='rgba(0,0,255,0.03)';
    ctx.fillText('咒术回战', VW/2+2, 252+titleFloatY);
    ctx.globalCompositeOperation='source-over';
    ctx.shadowColor=THEME.primary.glow+glowOuter.toFixed(3)+')'; ctx.shadowBlur=50;
    const grd=ctx.createLinearGradient(0,150+titleFloatY,0,290+titleFloatY);
    grd.addColorStop(0,'#ffffff'); grd.addColorStop(0.55,THEME.primary.main); grd.addColorStop(1,THEME.primary.dark);
    ctx.fillStyle=grd;
    ctx.fillText('咒术回战', VW/2, 252+titleFloatY);
    // 内层锐利辉光
    ctx.shadowColor='rgba(255,90,110,'+glowInner.toFixed(3)+')'; ctx.shadowBlur=22;
    ctx.fillText('咒术回战', VW/2, 252+titleFloatY);
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,0.16)'; ctx.lineWidth=1.5;
    ctx.strokeText('咒术回战', VW/2, 252+titleFloatY);
    // 标题底部倒影（翻转文字+低透明度）
    ctx.save();
    ctx.globalAlpha=0.06;
    ctx.translate(VW/2,252+titleFloatY); ctx.scale(1,-0.35);
    ctx.font='900 112px "Microsoft YaHei"';
    ctx.fillStyle=THEME.primary.main;
    ctx.fillText('咒术回战', 0, 0);
    ctx.restore();
    ctx.restore(); // 结束标题旋转
    // 副标题：红底斜切横幅 + 光线扫过效果 + 微脉动缩放
    const bw=380, bh=52, by=292;
    const bannerScale=1+Math.sin(t*0.04)*0.008;
    ctx.save();
    ctx.translate(VW/2, by+bh/2);
    ctx.scale(bannerScale,bannerScale);
    const bg2=ctx.createLinearGradient(-bw/2,0,bw/2,0);
    bg2.addColorStop(0,'rgba(180,30,50,0)');
    bg2.addColorStop(0.18,THEME.accent.redBanner);
    bg2.addColorStop(0.82,THEME.accent.redBanner);
    bg2.addColorStop(1,'rgba(180,30,50,0)');
    ctx.fillStyle=bg2;
    ctx.beginPath();
    ctx.moveTo(-bw/2+12,-bh/2); ctx.lineTo(bw/2,-bh/2);
    ctx.lineTo(bw/2-12,bh/2); ctx.lineTo(-bw/2,bh/2);
    ctx.closePath(); ctx.fill();
    // 横幅两侧缎带延伸
    ctx.fillStyle='rgba(150,20,40,0.5)';
    ctx.beginPath(); ctx.moveTo(-bw/2+12,-bh/2); ctx.lineTo(-bw/2-10,-bh/2+4); ctx.lineTo(-bw/2-8,bh/2-4); ctx.lineTo(-bw/2,bh/2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bw/2,-bh/2); ctx.lineTo(bw/2+10,-bh/2+4); ctx.lineTo(bw/2+8,bh/2-4); ctx.lineTo(bw/2-12,bh/2); ctx.closePath(); ctx.fill();
    // 横幅底部垂饰（小三角+圆点）
    ctx.fillStyle='rgba(180,30,50,0.4)';
    for(let bi=0;bi<5;bi++){
      const bx=-bw/2+60+bi*65;
      ctx.beginPath(); ctx.moveTo(bx,bh/2); ctx.lineTo(bx+3,bh/2+10); ctx.lineTo(bx+6,bh/2); ctx.closePath(); ctx.fill();
      ctx.fillStyle=THEME.accent.goldGlow+'0.3)';
      ctx.beginPath(); ctx.arc(bx+3,bh/2+13,1.5,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(180,30,50,0.4)';
    }
    // 横幅两侧小三角旗
    ctx.fillStyle='rgba(200,40,60,0.6)';
    ctx.beginPath(); ctx.moveTo(-bw/2+4,-bh/2); ctx.lineTo(-bw/2-6,-bh/2-8); ctx.lineTo(-bw/2+14,-bh/2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bw/2-4,-bh/2); ctx.lineTo(bw/2+6,-bh/2-8); ctx.lineTo(bw/2-14,-bh/2); ctx.closePath(); ctx.fill();
    // 横幅光线扫过（每120帧一次，持续15帧）
    const sweepCycle=t%120;
    if(sweepCycle<15){
      const sweepProg=sweepCycle/15;
      const sweepX=-bw/2+sweepProg*bw;
      const sweepGrad=ctx.createLinearGradient(sweepX-40,0,sweepX+40,0);
      sweepGrad.addColorStop(0,'rgba(255,255,255,0)');
      sweepGrad.addColorStop(0.5,'rgba(255,255,255,0.18)');
      sweepGrad.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=sweepGrad;
      ctx.beginPath();
      ctx.moveTo(-bw/2+12,-bh/2); ctx.lineTo(bw/2,-bh/2);
      ctx.lineTo(bw/2-12,bh/2); ctx.lineTo(-bw/2,bh/2);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle='rgba(255,140,150,0.35)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(-bw/2+26,-bh/2+5); ctx.lineTo(bw/2-14,-bh/2+5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-bw/2+14,bh/2-5); ctx.lineTo(bw/2-26,bh/2-5); ctx.stroke();
    ctx.font='900 38px "Microsoft YaHei"';
    ctx.strokeStyle='rgba(0,0,0,0.55)'; ctx.lineWidth=5;
    ctx.strokeText('咒 术 激 斗', 0, 13);
    ctx.fillStyle=THEME.text.white; ctx.fillText('咒 术 激 斗', 0, 13);
    ctx.restore();
    // 英文副题 + 菱形分隔饰
    ctx.font='400 15px "Microsoft YaHei"'; ctx.fillStyle='rgba(255,255,255,0.55)';
    ctx.fillText('JUJUTSU KAISEN FAN-MADE FIGHTING GAME', VW/2, 380);
    ctx.strokeStyle=THEME.primary.glow+'0.35)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(VW/2-250,398); ctx.lineTo(VW/2-16,398); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(VW/2+16,398); ctx.lineTo(VW/2+250,398); ctx.stroke();
    ctx.fillStyle=THEME.accent.goldGlow+'0.7)';
    ctx.beginPath(); ctx.moveTo(VW/2,393); ctx.lineTo(VW/2+5,398); ctx.lineTo(VW/2,403); ctx.lineTo(VW/2-5,398); ctx.closePath(); ctx.fill();
    // 菜单选中态过渡追踪
    if(game.menuIdxPrev===undefined) game.menuIdxPrev=game.menuIdx;
    if(game.menuIdx!==game.menuIdxPrev){
      game.menuIdxPrev=game.menuIdx;
      game.menuTransition=t;
    }
    // 菜单项：选中态渐变卡片 + 扫光动画 + 弹性菱形指示
    const opts=[
      ['开始游戏','玩家 vs AI'],
      ['双人对战','双人同屏'],
      ['闯关模式','连战十人'],
      ['AI对决','选择两个角色 · AI 自动对战'],
      ['联机对战','局域网 1v1'],
      ['操作说明','按键与规则'],
      ['设置','键位 / 难度 / 音乐']
    ];
    opts.forEach((o,i)=>{
      const y=420+i*36, sel=game.menuIdx===i;
      // 菜单项微浮动（选中项轻微上下浮动）
      const itemFloat=sel? Math.sin(t*0.06+i*0.8)*2 : 0;
      const iy=y+itemFloat;
      if(sel){
        const pulse=0.7+Math.sin(t*0.09)*0.3;
        const cg=ctx.createLinearGradient(VW/2-300,0,VW/2+300,0);
        cg.addColorStop(0,THEME.primary.glow+'0)');
        cg.addColorStop(0.5,THEME.primary.glow+'0.26)');
        cg.addColorStop(1,THEME.primary.glow+'0)');
        ctx.fillStyle=cg;
        roundRect(ctx,VW/2-300,iy-34,600,56,8); ctx.fill();
        // 卡片左右侧强调边框
        ctx.strokeStyle=THEME.accent.goldGlow+'0.2)'; ctx.lineWidth=1.5;
        ctx.beginPath(); ctx.moveTo(VW/2-300,iy-26); ctx.lineTo(VW/2-300,iy+14); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(VW/2+300,iy-26); ctx.lineTo(VW/2+300,iy+14); ctx.stroke();
        // 卡片底部阴影
        ctx.fillStyle='rgba(0,0,0,0.12)';
        roundRect(ctx,VW/2-296,iy+22,592,6,4); ctx.fill();
        // 卡片内部顶部高光线条
        ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(VW/2-290,iy-33); ctx.lineTo(VW/2+290,iy-33); ctx.stroke();
        // 扫光动画：半透明白色渐变从左滑到右（循环）
        const sweepPos=((t*3)%700)-100;
        ctx.save();
        ctx.beginPath(); ctx.rect(VW/2-300,iy-34,600,56); ctx.clip();
        const sg=ctx.createLinearGradient(sweepPos-80,0,sweepPos+80,0);
        sg.addColorStop(0,'rgba(255,255,255,0)');
        sg.addColorStop(0.5,'rgba(255,255,255,0.08)');
        sg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sg;
        ctx.fillRect(VW/2-300,iy-34,600,56);
        ctx.restore();
        ctx.strokeStyle=`rgba(185,168,255,${(0.45*pulse).toFixed(3)})`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(VW/2-262,iy-34); ctx.lineTo(VW/2+262,iy-34); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(VW/2-262,iy+22); ctx.lineTo(VW/2+262,iy+22); ctx.stroke();
        // 菱形指示器弹性缓动过渡
        const transElapsed=t-(game.menuTransition||0);
        const transT=Math.min(1,transElapsed/12);
        const elastic=transT<1? 1-Math.pow(2,-10*transT)*Math.cos(transT*Math.PI*3) : 1;
        const dofs=Math.sin(t*0.09)*4;
        // elastic驱动菱形额外偏移量+旋转动画（光标切换时弹性滑动）
        const elasticOfs=(1-elastic)*20;
        const diamondRot=Math.sin(t*0.08)*0.15 + (1-elastic)*0.5;
        ctx.fillStyle=THEME.accent.gold;
        [[VW/2-252-dofs-elasticOfs,iy-8],[VW/2+252+dofs+elasticOfs,iy-8]].forEach(([dx,dy])=>{
          ctx.save(); ctx.translate(dx,dy); ctx.rotate(diamondRot);
          ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(7,0); ctx.lineTo(0,7); ctx.lineTo(-7,0); ctx.closePath(); ctx.fill();
          ctx.restore();
        });
        // 菜单文字微缩放动画（X轴轻微呼吸+渐变填色）
        const textScaleX=1+Math.sin(t*0.05)*0.015;
        ctx.save(); ctx.translate(VW/2,iy-2); ctx.scale(textScaleX,1);
        const txtGrd=ctx.createLinearGradient(-100,-15,100,15);
        txtGrd.addColorStop(0,'#ffffff');
        txtGrd.addColorStop(0.5,'#f0e8ff');
        txtGrd.addColorStop(1,'#d8c8ff');
        ctx.font='900 30px "Microsoft YaHei"'; ctx.fillStyle=txtGrd;
        ctx.fillText(o[0], 0, 0);
        ctx.restore();
        ctx.font='400 13px "Microsoft YaHei"'; ctx.fillStyle=THEME.accent.goldGlow+'0.75)';
        ctx.fillText(o[1], VW/2, iy+16);
        // 选中文字下划线动画（从左到右绘制）
        const underlineProg=((t*2)%200)/200;
        const underlineW=200*underlineProg;
        ctx.strokeStyle=THEME.accent.goldGlow+'0.3)'; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(VW/2-100,iy+4); ctx.lineTo(VW/2-100+underlineW,iy+4); ctx.stroke();
      } else {
        ctx.font='500 25px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
        ctx.fillText(o[0], VW/2, iy);
      }
    });
    // 底部信息条
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(0,VH-56,VW,56);
    ctx.strokeStyle=THEME.primary.glow+'0.18)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,VH-56); ctx.lineTo(VW,VH-56); ctx.stroke();
    ctx.font='400 13px "Microsoft YaHei"'; ctx.fillStyle='rgba(255,255,255,0.38)';
    ctx.fillText('本作品为粉丝自制非商业同人游戏 · 《咒术回战》版权归芥见下下/集英社所有', VW/2, VH-34);
    ctx.font='400 15px "Microsoft YaHei"'; ctx.fillStyle='rgba(255,255,255,0.55)';
    ctx.fillText('↑↓ 选择 · J / Enter 确认', VW/2, VH-13);
  },

  drawSelect(game, ctx, t){
    BG.draw(ctx,t);
    ctx.fillStyle='rgba(3,3,10,0.66)'; ctx.fillRect(0,0,VW,VH);
    ctx.textAlign='center';
    ctx.font='900 40px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
    let selTitle;
    if(game.mode==='net') selTitle='选择你的角色（联机 · 你是 '+(Net.side===0?'P1':'P2')+'）';
    else if(game.mode==='arcade') selTitle='选择角色（闯关模式）';
    else if(game.mode==='aivsai') selTitle=game.sel.stage===0?'AI对决 · 选择 AI 1 的角色':'AI对决 · 选择 AI 2 的角色';
    else selTitle=game.sel.stage===0?'玩家1 选择角色':(game.mode==='pvai'?'选择对手（AI）':'玩家2 选择角色');
    ctx.fillText(selTitle, VW/2, 58);
    drawTitleDecor(ctx, VW/2, 72, 200);
    ctx.font='400 16px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('← → ↑ ↓ 移动光标 · J / Enter 确认 · K 返回', VW/2, 86);

    const cols=ROSTER.length>18?7:6, cardW=ROSTER.length>18?170:182, cardH=158, gapX=ROSTER.length>18?10:16, gapY=12;
    const rows=Math.ceil(ROSTER.length/cols);
    const gridW=cols*cardW+(cols-1)*gapX;
    const x0=(VW-gridW)/2, y0=104;
    /* 联机模式：光标始终是己方选择位（不走 sel.stage 流程），对方光标另行描边展示 */
    const cursor=game.mode==='net'? (Net.side===0? game.sel.p1:game.sel.p2) : (game.sel.stage===0? game.sel.p1:game.sel.p2);

    /* ---- 光标过渡动画追踪 ---- */
    if(game.cursorPrev===undefined) game.cursorPrev=cursor;
    if(game.cursorTransition===undefined) game.cursorTransition=1;
    if(game.cursorPrev!==cursor){
      game.cursorTransition=0;
      game.cursorPrev=cursor;
    }
    if(game.cursorTransition<1) game.cursorTransition=Math.min(1,game.cursorTransition+1/12);
    const cursorT=easeOut(game.cursorTransition);

    /* ---- 确认弹跳追踪 ---- */
    if(game.selStagePrev===undefined) game.selStagePrev=game.sel.stage;
    if(game.sel.stage!==game.selStagePrev){
      game.selStagePrev=game.sel.stage;
      game.confirmBounceT=t;
    }
    const bounceElapsed=t-(game.confirmBounceT||0);
    const bounceT=Math.min(1,bounceElapsed/15);
    const bounceScale=bounceT<1? easeOutBack(bounceT):1;

    /* ---- 边框颜色lerp追踪 ---- */
    const curCharData=CHARS[ROSTER[cursor]];
    const safeTarget=(curCharData && curCharData.color)? curCharData.color:THEME.primary.main;
    if(!game.panelBorderColor) game.panelBorderColor=safeTarget;
    game.panelBorderColor=lerpColor(game.panelBorderColor,safeTarget,0.12);

    const statColors=[THEME.stat.atk,THEME.stat.def,THEME.stat.spd];

    ROSTER.forEach((id,i)=>{
      const c=CHARS[id];
      const col=i%cols, row=Math.floor(i/cols);
      const x=x0+col*(cardW+gapX), y=y0+row*(cardH+gapY);
      const isCursor=cursor===i;
      const picked=game.mode==='net'? (Net.peerPickIdx===i) : (game.sel.stage===1 && game.sel.p1===i);

      ctx.save();
      /* 确认弹跳缩放 */
      if(isCursor && bounceT<1){
        const cx=x+cardW/2, cy=y+cardH/2;
        ctx.translate(cx,cy);
        ctx.scale(bounceScale,bounceScale);
        ctx.translate(-cx,-cy);
      }

      if(isCursor){
        /* ---- 光标卡片：微渐变底板 ---- */
        const cardGrad=ctx.createLinearGradient(x,y,x,y+cardH);
        cardGrad.addColorStop(0,'rgba(20,18,40,0.7)');
        cardGrad.addColorStop(1,'rgba(5,5,15,0.85)');
        ctx.fillStyle=cardGrad;
        roundRect(ctx,x,y,cardW,cardH,10); ctx.fill();
        /* 内发光：径向渐变叠加 */
        const innerGlow=ctx.createRadialGradient(x+cardW/2,y+cardH/2,0,x+cardW/2,y+cardH/2,cardW*0.65);
        innerGlow.addColorStop(0,hexToRgba(c.color,0.15));
        innerGlow.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=innerGlow;
        roundRect(ctx,x+2,y+2,cardW-4,cardH-4,8); ctx.fill();
        /* 顶部角色主题色光带 3px */
        const topStrip=ctx.createLinearGradient(x,y,x+cardW,y);
        topStrip.addColorStop(0,hexToRgba(c.color,0));
        topStrip.addColorStop(0.5,c.color);
        topStrip.addColorStop(1,hexToRgba(c.color,0));
        ctx.fillStyle=topStrip;
        ctx.fillRect(x+10,y+1,cardW-20,3);
      } else {
        /* ---- 非悬停卡片：更暗渐变 ---- */
        const dimGrad=ctx.createLinearGradient(x,y,x,y+cardH);
        dimGrad.addColorStop(0,'rgba(0,0,0,0.5)');
        dimGrad.addColorStop(1,'rgba(0,0,0,0.6)');
        ctx.fillStyle=dimGrad;
        roundRect(ctx,x,y,cardW,cardH,10); ctx.fill();
      }

      /* 边框 */
      ctx.strokeStyle= isCursor? c.color : (picked? THEME.accent.gold:'rgba(255,255,255,0.14)');
      ctx.lineWidth= isCursor? 3:1.5;
      if(isCursor){ ctx.shadowColor=c.color; ctx.shadowBlur=18; }
      roundRect(ctx,x,y,cardW,cardH,10); ctx.stroke();
      ctx.shadowBlur=0;

      /* 角色肖像 */
      ctx.save(); ctx.translate(x+cardW/2, y+94); ctx.scale(0.5,0.5);
      drawPortrait(ctx, c, t+i*7);
      ctx.restore();

      /* 角色名 */
      ctx.font='800 18px "Microsoft YaHei"'; ctx.fillStyle=c.color; ctx.textAlign='center';
      ctx.fillText(c.name, x+cardW/2, y+116);
      /* 称号 */
      ctx.font='400 10px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
      let title=c.title; if(title.length>14) title=title.slice(0,13)+'…';
      ctx.fillText(title, x+cardW/2, y+132);

      /* 属性条（带发光） */
      const stats=[c.atk,c.def,c.spd];
      stats.forEach((sv,si)=>{
        if(isCursor){ ctx.shadowColor=statColors[si]; ctx.shadowBlur=8; }
        for(let d=0;d<10;d++){
          ctx.fillStyle= d<sv? statColors[si] : THEME.text.dim;
          ctx.fillRect(x+13+si*52+d*4.6, y+141, 3.6, 7);
        }
        ctx.shadowBlur=0;
      });

      if(picked){ ctx.font='900 14px "Microsoft YaHei"'; ctx.fillStyle=THEME.accent.gold;
        ctx.fillText(game.mode==='net'? (Net.side===0?'P2':'P1') : (game.mode==='aivsai'?'AI 1':'P1'), x+cardW/2, y+18); }
      if(isCursor){ ctx.font='900 14px "Microsoft YaHei"'; ctx.fillStyle=c.color;
        ctx.fillText(game.mode==='net'? (Net.side===0?'P1':'P2') : (game.mode==='aivsai'?(game.sel.stage===0?'AI 1':'AI 2'):(game.sel.stage===0?'P1':'P2')), x+cardW/2, y+18); }
      /* 联机：对方光标实时描边（未锁定时） */
      if(game.mode==='net' && !isCursor && !picked){
        const peerKey=Net.side===0?'p2':'p1';
        if(game.sel[peerKey]===i){
          ctx.strokeStyle='rgba(255,140,140,0.85)'; ctx.lineWidth=2;
          roundRect(ctx,x+2,y+2,cardW-4,cardH-4,9); ctx.stroke();
          ctx.font='900 12px "Microsoft YaHei"'; ctx.fillStyle='rgba(255,140,140,0.9)';
          ctx.fillText('对方', x+cardW/2, y+18);
        }
      }

      ctx.restore();
    });

    /* ---- 光标边框平滑滑动（新旧位置间lerp） ---- */
    if(game.cursorTransition<1 && game.cursorPrev!==cursor){
      const prevCol=game.cursorPrev%cols, prevRow=Math.floor(game.cursorPrev/cols);
      const curCol=cursor%cols, curRow=Math.floor(cursor/cols);
      const px=x0+prevCol*(cardW+gapX), py_=y0+prevRow*(cardH+gapY);
      const cx_=x0+curCol*(cardW+gapX), cy_=y0+curRow*(cardH+gapY);
      const lx=lerp(px,cx_,cursorT), ly=lerp(py_,cy_,cursorT);
      const prevChar=CHARS[ROSTER[game.cursorPrev]];
      const curChar=CHARS[ROSTER[cursor]];
      ctx.strokeStyle=lerpColor(prevChar.color,curChar.color,cursorT);
      ctx.lineWidth=2; ctx.globalAlpha=0.5*(1-cursorT);
      roundRect(ctx,lx,ly,cardW,cardH,10); ctx.stroke();
      ctx.globalAlpha=1;
    }

    /* ---- 底部信息面板 ---- */
    const cur=CHARS[ROSTER[cursor]];
    const panelY=y0+rows*(cardH+gapY)+6;
    const ph=VH-panelY-10;
    ctx.textAlign='center';

    /* 面板底板 */
    ctx.fillStyle='rgba(0,0,0,0.66)'; roundRect(ctx,50,panelY,VW-100,ph,10); ctx.fill();
    /* 面板顶部角色主题色渐变条 */
    const panelStrip=ctx.createLinearGradient(50,panelY,VW-50,panelY);
    panelStrip.addColorStop(0,'rgba(0,0,0,0)');
    panelStrip.addColorStop(0.3,cur.color);
    panelStrip.addColorStop(0.7,cur.color);
    panelStrip.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=panelStrip;
    ctx.fillRect(50,panelY,VW-100,3);
    /* 面板顶部向下渐变（角色色→透明） */
    const panelFade=ctx.createLinearGradient(0,panelY,0,panelY+40);
    panelFade.addColorStop(0,hexToRgba(cur.color,0.12));
    panelFade.addColorStop(1,'rgba(0,0,0,0)');
    ctx.save();
    ctx.beginPath(); roundRect(ctx,50,panelY,VW-100,ph,10); ctx.clip();
    ctx.fillStyle=panelFade; ctx.fillRect(50,panelY,VW-100,40);
    ctx.restore();
    /* 边框（颜色平滑过渡） */
    ctx.strokeStyle=game.panelBorderColor; ctx.lineWidth=1.5;
    roundRect(ctx,50,panelY,VW-100,ph,10); ctx.stroke();

    ctx.font='800 17px "Microsoft YaHei"'; ctx.fillStyle=cur.color;
    ctx.fillText(`${cur.name} — ${cur.title}`, VW/2, panelY+24);
    ctx.font='400 13px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.sub;
    ctx.fillText(`攻击 ${cur.atk} · 防御 ${cur.def} · 速度 ${cur.spd} · 体力 ${cur.hp}`, VW/2, panelY+44);
    const skills=[
      ['壹', cur.moves.skill1, false],
      ['贰', cur.moves.skill2, false],
      ['叁', cur.moves.skill3, false],
      ['必杀', cur.moves.ult, true]
    ].filter(s=>s[1]);
    ctx.textAlign='left';
    const colX=[76, VW/2+16], colW=VW/2-100;
    skills.forEach((s,i)=>{
      const lx=colX[i%2], ly=panelY+68+Math.floor(i/2)*26;
      ctx.font='800 14px "Microsoft YaHei"';
      ctx.fillStyle= s[2]? THEME.accent.gold : cur.color;
      const name=`${s[0]} · ${s[1].name}`;
      ctx.fillText(name, lx, ly);
      ctx.font='400 12px "Microsoft YaHei"';
      ctx.fillStyle= s[2]? 'rgba(255,215,106,0.75)' : THEME.text.sub;
      const nameW=ctx.measureText(name).width;
      let desc=s[1].desc;
      const maxW=colW-nameW-14;
      while(desc.length>4 && ctx.measureText(desc).width>maxW) desc=desc.slice(0,-2);
      if(desc!==s[1].desc) desc+='…';
      ctx.fillText(' '+desc, lx+nameW, ly);
    });
    ctx.textAlign='center';
  },

  drawStageSelect(game, ctx, t){
    // 背景使用当前悬停的地图做模糊预览
    const hoverId = game.stageCursor < STAGES.length ? STAGES[game.stageCursor].id : (STAGES[0] && STAGES[0].id || 'shibuya');
    BG.draw(ctx,t,hoverId);
    ctx.fillStyle='rgba(3,3,10,0.72)'; ctx.fillRect(0,0,VW,VH);

    ctx.textAlign='center';
    ctx.font='900 40px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
    ctx.fillText('选择战斗场景', VW/2, 58);
    drawTitleDecor(ctx, VW/2, 72, 180);
    ctx.font='400 16px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('← → ↑ ↓ 移动光标 · J / Enter 确认 · K 返回 · 最后一张为随机地图', VW/2, 86);

    const cols=4, total=STAGES.length+1;
    const cardW=280, cardH=188, gapX=18, gapY=16;
    const rows=Math.ceil(total/cols);
    const gridW=cols*cardW+(cols-1)*gapX;
    const x0=(VW-gridW)/2, y0=108;

    for(let i=0;i<total;i++){
      const col=i%cols, row=Math.floor(i/cols);
      const x=x0+col*(cardW+gapX), y=y0+row*(cardH+gapY);
      const isCursor=game.stageCursor===i;
      const isRandom=i===STAGES.length;
      const stage=isRandom?null:STAGES[i];

      ctx.save();
      /* 非选中卡片微弱灰度效果 */
      if(!isCursor){
        ctx.filter='saturate(0.3)';
      }

      // 卡片底
      ctx.fillStyle= isCursor? THEME.bg.cardSelected : 'rgba(0,0,0,0.55)';
      roundRect(ctx,x,y,cardW,cardH,12); ctx.fill();
      ctx.strokeStyle= isCursor? (isRandom? THEME.accent.gold :stage.color) : 'rgba(255,255,255,0.18)';
      ctx.lineWidth= isCursor?3:1.5;
      if(isCursor){ ctx.shadowColor=isRandom? THEME.accent.gold :stage.color; ctx.shadowBlur=18; }
      roundRect(ctx,x,y,cardW,cardH,12); ctx.stroke();
      ctx.shadowBlur=0;

      // 预览图：在小区域内绘制背景
      ctx.save();
      ctx.beginPath(); roundRect(ctx,x+8,y+8,cardW-16,cardH-70,8); ctx.clip();
      ctx.translate(x+cardW/2, y+cardH/2-12);
      ctx.scale(0.22,0.22);
      ctx.translate(-VW/2, -VH/2);
      BG.draw(ctx,t,isRandom?'shibuya':stage.id);
      /* 预览图暗角遮罩：中心透明→边缘半透明黑 */
      const vigX=x+cardW/2, vigY=y+8+(cardH-70)/2;
      const vigR=Math.max(cardW-16,cardH-70)*0.55;
      const vignette=ctx.createRadialGradient(vigX,vigY,vigR*0.4,vigX,vigY,vigR);
      vignette.addColorStop(0,'rgba(0,0,0,0)');
      vignette.addColorStop(1,'rgba(0,0,0,0.45)');
      ctx.fillStyle=vignette;
      ctx.fillRect(x+8,y+8,cardW-16,cardH-70);
      ctx.restore();

      /* 选中卡片底部渐变标签栏 */
      if(isCursor){
        ctx.save();
        ctx.beginPath(); roundRect(ctx,x+8,y+8,cardW-16,cardH-70,8); ctx.clip();
        const labelGrad=ctx.createLinearGradient(0,y+cardH-70,0,y+cardH-8);
        labelGrad.addColorStop(0,'rgba(0,0,0,0)');
        labelGrad.addColorStop(1,'rgba(0,0,0,0.6)');
        ctx.fillStyle=labelGrad;
        ctx.fillRect(x+8,y+cardH-50,cardW-16,42);
        ctx.restore();
      }

      // 名称与标签
      ctx.textAlign='center';
      if(isRandom){
        ctx.font='900 26px "Microsoft YaHei"'; ctx.fillStyle=THEME.accent.gold;
        ctx.fillText('?', x+cardW/2, y+cardH-36);
        ctx.font='700 18px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
        ctx.fillText('随机地图', x+cardW/2, y+cardH-14);
      } else {
        ctx.font='900 22px "Microsoft YaHei"'; ctx.fillStyle=stage.color;
        ctx.fillText(stage.name, x+cardW/2, y+cardH-28);
        ctx.font='400 12px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.sub;
        let theme=stage.theme; while(ctx.measureText(theme).width>cardW-24 && theme.length>4) theme=theme.slice(0,-2)+'…';
        ctx.fillText(theme, x+cardW/2, y+cardH-10);
      }

      if(isCursor){
        ctx.font='900 14px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
        ctx.fillText('▶', x+cardW/2, y+20);
      }

      ctx.restore(); // 恢复 filter
    }

    // 底部信息栏
    const cur = game.stageCursor < STAGES.length ? STAGES[game.stageCursor] : null;
    const py=y0+rows*(cardH+gapY)+14;
    const ph=VH-py-16;
    if(ph>50){
      ctx.fillStyle=THEME.bg.card; roundRect(ctx,60,py,VW-120,ph,10); ctx.fill();
      ctx.strokeStyle= cur? cur.color:THEME.accent.gold; ctx.lineWidth=1.5; roundRect(ctx,60,py,VW-120,ph,10); ctx.stroke();
      ctx.textAlign='center';
      ctx.font='800 22px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
      ctx.fillText(cur? `${cur.name} — ${cur.theme}` : '随机地图 — 系统将自动分配一张战斗场景', VW/2, py+34);
    }
  },

  drawSettings(game, ctx, t){
    BG.draw(ctx,t);
    ctx.fillStyle=THEME.bg.overlay; ctx.fillRect(0,0,VW,VH);
    ctx.textAlign='center';
    // 标题 + 光晕
    ctx.save();
    ctx.shadowColor=THEME.primary.glow+'0.4)'; ctx.shadowBlur=24;
    ctx.font='900 44px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
    ctx.fillText('设 置', VW/2, 56);
    drawTitleDecor(ctx, VW/2, 70, 120);
    ctx.shadowBlur=0;
    ctx.restore();
    const tabs=['难度','时间','回合','音频','键位'];
    const tabW=140;
    const totalW=tabs.length*tabW;
    const x0=(VW-totalW)/2+tabW/2;
    /* Tab切换过渡追踪 */
    if(game.setTabPrev===undefined) game.setTabPrev=game.setTab;
    if(game.setTab!==game.setTabPrev){
      game.setTabPrev=game.setTab;
      game.settingsTransT=t;
    }
    const transElapsed=t-(game.settingsTransT||0);
    const transT=Math.min(1,transElapsed/12);
    tabs.forEach((tab,i)=>{
      const sel=game.setTab===i;
      const tx=x0+i*tabW;
      // 选中Tab微弱光背景
      if(sel){
        ctx.fillStyle=THEME.primary.gradStart;
        roundRect(ctx,tx-55,52,110,38,THEME.radius.small); ctx.fill();
      }
      ctx.font=(sel?'900 26px':'700 22px')+' "Microsoft YaHei"';
      ctx.fillStyle= sel? THEME.primary.main : THEME.text.muted;
      ctx.fillText(tab, tx, 78);
      // 选中Tab渐变下划线（紫→金）
      if(sel){
        const ulGrad=ctx.createLinearGradient(tx-50,0,tx+50,0);
        ulGrad.addColorStop(0,THEME.primary.main);
        ulGrad.addColorStop(1,THEME.accent.gold);
        ctx.strokeStyle=ulGrad; ctx.lineWidth=3;
        ctx.beginPath(); ctx.moveTo(tx-50,84); ctx.lineTo(tx+50,84); ctx.stroke();
      }
    });
    // 内容区域横向滑动过渡
    ctx.save();
    if(transT<1){
      const slideX=(1-easeOut(transT))*80;
      ctx.globalAlpha=easeOut(transT);
      ctx.translate(-slideX,0);
    }
    if(game.setTab===0) this.drawSetDiff(game,ctx,t);
    else if(game.setTab===1) this.drawSetTime(game,ctx,t);
    else if(game.setTab===2) this.drawSetRound(game,ctx,t);
    else if(game.setTab===3) this.drawSetAudio(game,ctx,t);
    else this.drawSetKeys(game,ctx,t);
    ctx.restore();
    ctx.font='400 16px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('Q / E 切换标签 · ← → 调整 · Enter 确认 · K/Esc 返回', VW/2, 700);
  },

  drawSetDiff(game,ctx,t){
    ctx.textAlign='center';
    ctx.font='800 26px "Microsoft YaHei"'; ctx.fillStyle=THEME.primary.main;
    ctx.fillText('AI 难度设置', VW/2, 140);
    const keys=['easy','normal','hard'];
    const names=['简单','普通','困难'];
    const descs=['反应迟缓 · 较少格挡闪避 · 适合新手',
                 '均衡决策 · 适度格挡闪避 · 标准对战',
                 '极速反应 · 高频格挡闪避 · 领域即时对抗 · 连击凶狠'];
    /* 数值弹跳反馈追踪 */
    if(game.setDiffBounceT===undefined) game.setDiffBounceT=0;
    if(game.setDiffIdxPrev===undefined) game.setDiffIdxPrev=Settings.diffIdx;
    if(Settings.diffIdx!==game.setDiffIdxPrev){ game.setDiffIdxPrev=Settings.diffIdx; game.setDiffBounceT=t; }
    keys.forEach((k,i)=>{
      const sel=Settings.diffIdx===i;
      const y=220+i*90;
      if(sel){
        // 选中态渐变卡片 + 扫光
        const cg=ctx.createLinearGradient(VW/2-300,0,VW/2+300,0);
        cg.addColorStop(0,THEME.primary.glow+'0)');
        cg.addColorStop(0.5,THEME.primary.glow+'0.22)');
        cg.addColorStop(1,THEME.primary.glow+'0)');
        ctx.fillStyle=cg;
        roundRect(ctx,VW/2-300,y-34,600,64,THEME.radius.card); ctx.fill();
        ctx.strokeStyle=THEME.accent.gold; ctx.lineWidth=2;
        roundRect(ctx,VW/2-300,y-34,600,64,THEME.radius.card); ctx.stroke();
        // 扫光动画
        const sweepPos=((t*3)%700)-100;
        ctx.save();
        ctx.beginPath(); roundRect(ctx,VW/2-300,y-34,600,64,THEME.radius.card); ctx.clip();
        const sg=ctx.createLinearGradient(sweepPos-80,0,sweepPos+80,0);
        sg.addColorStop(0,'rgba(255,255,255,0)');
        sg.addColorStop(0.5,'rgba(255,255,255,0.07)');
        sg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sg;
        ctx.fillRect(VW/2-300,y-34,600,64);
        ctx.restore();
      }
      // 弹跳缩放
      const bounceElapsed=t-game.setDiffBounceT;
      const bounceT=Math.min(1,bounceElapsed/3);
      const bounceScale=sel && bounceT<1? 0.85+0.15*easeOutBack(bounceT) : 1;
      ctx.save();
      ctx.translate(VW/2,y);
      ctx.scale(bounceScale,bounceScale);
      ctx.translate(-VW/2,-y);
      ctx.font=(sel?'900 30px':'700 24px')+' "Microsoft YaHei"';
      ctx.fillStyle= sel? THEME.text.white : THEME.text.muted;
      ctx.fillText(names[i], VW/2, y);
      ctx.font='400 15px "Microsoft YaHei"';
      ctx.fillStyle= sel? THEME.text.sub : 'rgba(255,255,255,0.35)';
      ctx.fillText(descs[i], VW/2, y+26);
      ctx.restore();
    });
    ctx.font='400 15px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('← → 或 ↑↓ 切换难度 · Enter 确认', VW/2, 530);
  },

  drawSetTime(game,ctx,t){
    ctx.textAlign='center';
    ctx.font='800 26px "Microsoft YaHei"'; ctx.fillStyle=THEME.primary.main;
    ctx.fillText('回合时间设置', VW/2, 160);
    // 数值弹跳追踪
    if(game.setTimeBounceT===undefined) game.setTimeBounceT=0;
    if(game.setTimePrev===undefined) game.setTimePrev=Settings.roundTime;
    if(Settings.roundTime!==game.setTimePrev){ game.setTimePrev=Settings.roundTime; game.setTimeBounceT=t; }
    const timeBounceElapsed=t-game.setTimeBounceT;
    const timeBounceT=Math.min(1,timeBounceElapsed/3);
    const timeBounceScale=1+0.15*(1-easeOutBack(timeBounceT));
    ctx.save();
    ctx.translate(VW/2,260); ctx.scale(timeBounceScale,timeBounceScale); ctx.translate(-VW/2,-260);
    ctx.font='900 64px monospace'; ctx.fillStyle=THEME.accent.gold;
    ctx.fillText(Settings.roundTime==='∞' ? '∞' : Settings.roundTime+' 秒', VW/2, 260);
    ctx.restore();
    ctx.font='400 16px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('← → 调整（30 / 60 / 99 / 120 / ∞ 无限）', VW/2, 310);
    // 可视化选项列表
    const opts=[30,60,99,120,'∞'];
    const labels=['30秒','60秒','99秒','120秒','无限'];
    const curIdx=opts.indexOf(Settings.roundTime);
    opts.forEach((o,i)=>{
      const x=VW/2-280+i*140;
      const sel=i===curIdx;
      ctx.fillStyle= sel? THEME.primary.gradCenter : THEME.bg.card;
      roundRect(ctx,x-50,370,100,50,THEME.radius.button); ctx.fill();
      ctx.strokeStyle= sel? THEME.accent.gold : 'rgba(255,255,255,0.2)'; ctx.lineWidth= sel?2:1;
      roundRect(ctx,x-50,370,100,50,THEME.radius.button); ctx.stroke();
      ctx.font=(sel?'900 22px':'700 18px')+' "Microsoft YaHei"';
      ctx.fillStyle= sel? THEME.text.white : THEME.text.muted;
      ctx.fillText(labels[i], x, 402);
    });
    ctx.font='400 15px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('← → 切换时间 · Enter 确认', VW/2, 470);
  },

  drawSetRound(game,ctx,t){
    ctx.textAlign='center';
    ctx.font='800 26px "Microsoft YaHei"'; ctx.fillStyle=THEME.primary.main;
    ctx.fillText('回合制设置', VW/2, 160);
    const modes=[
      {val:1, label:'1 回合制', desc:'BO1 · 先赢 1 局即胜 · 快速对决'},
      {val:3, label:'3 回合制', desc:'BO3 · 先赢 2 局即胜 · 标准对战'}
    ];
    modes.forEach((m,i)=>{
      const sel=Settings.roundMode===m.val;
      const y=250+i*110;
      if(sel){
        const cg=ctx.createLinearGradient(VW/2-280,0,VW/2+280,0);
        cg.addColorStop(0,THEME.primary.glow+'0)');
        cg.addColorStop(0.5,THEME.primary.glow+'0.22)');
        cg.addColorStop(1,THEME.primary.glow+'0)');
        ctx.fillStyle=cg;
        roundRect(ctx,VW/2-280,y-34,560,70,THEME.radius.card); ctx.fill();
        ctx.strokeStyle=THEME.accent.gold; ctx.lineWidth=2;
        roundRect(ctx,VW/2-280,y-34,560,70,THEME.radius.card); ctx.stroke();
        // 扫光
        const sweepPos=((t*3)%700)-100;
        ctx.save();
        ctx.beginPath(); roundRect(ctx,VW/2-280,y-34,560,70,THEME.radius.card); ctx.clip();
        const sg=ctx.createLinearGradient(sweepPos-80,0,sweepPos+80,0);
        sg.addColorStop(0,'rgba(255,255,255,0)');
        sg.addColorStop(0.5,'rgba(255,255,255,0.07)');
        sg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sg;
        ctx.fillRect(VW/2-280,y-34,560,70);
        ctx.restore();
      }
      ctx.font=(sel?'900 32px':'700 26px')+' "Microsoft YaHei"';
      ctx.fillStyle= sel? THEME.text.white : THEME.text.muted;
      ctx.fillText(m.label, VW/2, y);
      ctx.font='400 15px "Microsoft YaHei"';
      ctx.fillStyle= sel? THEME.text.sub : 'rgba(255,255,255,0.35)';
      ctx.fillText(m.desc, VW/2, y+28);
    });
    ctx.font='400 15px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('← → 或 ↑↓ 切换回合制 · Enter 确认', VW/2, 510);
  },

  drawSetAudio(game,ctx,t){
    ctx.textAlign='center';
    const mSel=game.setCursor===SET_C.AUDIO_MUSIC;
    ctx.font='800 24px "Microsoft YaHei"'; ctx.fillStyle= mSel? THEME.primary.main:THEME.text.white;
    ctx.fillText('战斗背景音乐', VW/2, 160);
    const on=Settings.music;
    // Toggle开关滑动过渡追踪
    if(game.audioTogglePrev===undefined) game.audioTogglePrev=on?1:0;
    if(game.audioToggleAnim===undefined) game.audioToggleAnim=on?1:0;
    const targetVal=on?1:0;
    if(game.audioTogglePrev!==targetVal){ game.audioTogglePrev=targetVal; game.audioToggleStartT=t; }
    const toggleElapsed=t-(game.audioToggleStartT||0);
    const toggleT=Math.min(1,toggleElapsed/8);
    const togglePos=lerp(game.audioTogglePrev===1?1:-1, targetVal?1:-1, easeOut(toggleT));
    ctx.fillStyle= on? THEME.primary.gradCenter : 'rgba(80,80,90,0.4)';
    roundRect(ctx,VW/2-90,195,180,56,28); ctx.fill();
    ctx.strokeStyle= mSel? THEME.accent.gold : (on?THEME.primary.main:'rgba(255,255,255,0.3)'); ctx.lineWidth=2;
    roundRect(ctx,VW/2-90,195,180,56,28); ctx.stroke();
    // 滑块圆形按钮
    ctx.beginPath(); ctx.arc(VW/2+togglePos*40, 223, 22, 0, Math.PI*2);
    ctx.fillStyle= on? THEME.primary.main : '#888'; ctx.fill();
    ctx.font='800 22px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
    ctx.fillText(on?'ON':'OFF', VW/2, 230);
    ctx.font='400 15px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('← → 或 Enter 切换 · 战斗中循环播放 Dm-Bb-F-C 进行', VW/2, 280);
    const pSel=game.setCursor===SET_C.AUDIO_PREVIEW;
    ctx.font='800 22px "Microsoft YaHei"'; ctx.fillStyle= pSel? THEME.accent.gold:THEME.text.white;
    ctx.fillText('▶ 试听 / 停止', VW/2, 360);
    ctx.font='400 14px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('当前: '+(BGM.playing?'播放中':'已停止')+'  ·  Enter 或 ← → 试听', VW/2, 390);
  },

  drawSetKeys(game,ctx,t){
    if(game.keySide===undefined) game.keySide='p1';
    ctx.textAlign='center';
    ctx.font='800 22px "Microsoft YaHei"';
    ['p1','p2'].forEach((s,i)=>{
      const sel=game.keySide===s, x=VW/2-120+i*240, cur=game.setCursor===0;
      if(sel){
        ctx.fillStyle=THEME.primary.gradCenter;
        roundRect(ctx,x-90,124,180,38,THEME.radius.button); ctx.fill();
        ctx.strokeStyle= cur? THEME.accent.gold:THEME.primary.main; ctx.lineWidth=2;
        roundRect(ctx,x-90,124,180,38,THEME.radius.button); ctx.stroke();
      }
      ctx.fillStyle= sel? THEME.text.white:THEME.text.muted;
      ctx.fillText(s==='p1'?'玩家 1':'玩家 2', x, 150);
    });
    ctx.textAlign='left';
    const startX=180, startY=200, rowH=40;
    ACTION_ORDER.forEach((act,i)=>{
      const cur=game.setCursor===i+1;
      const y=startY+i*rowH;
      if(cur){
        ctx.fillStyle=THEME.primary.glow+'0.16)';
        roundRect(ctx,startX-12,y-22,VW-360,32,THEME.radius.small); ctx.fill();
      }
      ctx.font='700 18px "Microsoft YaHei"'; ctx.fillStyle= cur?THEME.primary.main:THEME.text.sub;
      ctx.fillText(ACTION_LABELS[act], startX, y);
      /* P3-2：标注"部分角色没有这个技能"（如 yuji 无 skill3），
         否则玩家可能给它绑一个永远不会触发的键。角色少时直接列出名字，多时只报数量。 */
      const missing = ACTION_MISSING_ON[act];
      if(missing){
        const lw = ctx.measureText(ACTION_LABELS[act]).width;
        ctx.save();
        ctx.font='600 12px "Microsoft YaHei"';
        ctx.fillStyle=THEME.text.muted;
        ctx.fillText(missing.length<=2
          ? missing.map(id=>CHARS[id] && CHARS[id].name).filter(Boolean).join('、')+' 无此技'
          : missing.length+' 名角色无此技', startX+lw+10, y);
        ctx.restore();
      }
      const km=game.keyMapForSide(game.keySide)[act][0];
      const keyName=this.codeToName(km);
      const rebinding=Settings.rebind && Settings.rebind.side===game.keySide && Settings.rebind.action===act;
      ctx.font='800 18px "Microsoft YaHei"';
      // 键名标签背景高亮脉冲
      const keyBgAlpha=0.12+Math.sin(t*0.05+i*0.5)*0.04;
      ctx.fillStyle=THEME.primary.glow+keyBgAlpha.toFixed(3)+')';
      roundRect(ctx,VW-260,y-16,90,24,4); ctx.fill();
      // 绑定中状态金色边框脉冲
      if(rebinding){
        const bindPulse=0.5+Math.sin(t*0.15)*0.5;
        ctx.strokeStyle=THEME.accent.goldGlow+bindPulse.toFixed(3)+')';
        ctx.lineWidth=2;
        roundRect(ctx,VW-260,y-16,90,24,4); ctx.stroke();
      }
      ctx.fillStyle= rebinding? THEME.accent.gold : (cur? THEME.text.white:THEME.text.sub);
      ctx.textAlign='right';
      const txt= rebinding? '按任意键…' : keyName;
      ctx.fillText(txt, VW-180, y);
      ctx.textAlign='left';
    });
    ctx.textAlign='center';
    const rSel=game.setCursor===ACTION_ORDER.length+1;
    ctx.font=(rSel?'900 ':'700 ')+'20px "Microsoft YaHei"';
    ctx.fillStyle= rSel? THEME.accent.gold : THEME.text.sub;
    ctx.fillText('↻ 重置为默认键位', VW/2, startY+ACTION_ORDER.length*rowH+24);
  },

  codeToName(code){
    if(!code) return '—';
    if(code.startsWith('Key')) return code.slice(3);
    if(code.startsWith('Arrow')) return ({Up:'↑',Down:'↓',Left:'←',Right:'→'})[code.slice(5)] || '方向'+code.slice(5);
    if(code.startsWith('Numpad')) return '小键盘'+code.slice(6);
    if(code==='Escape') return 'Esc';
    if(code==='Enter') return 'Enter';
    if(code==='Space') return '空格';
    return code;
  },

  drawHelp(game, ctx, t){
    BG.draw(ctx,t);
    ctx.fillStyle='rgba(3,3,10,0.7)'; ctx.fillRect(0,0,VW,VH);
    ctx.textAlign='center';
    ctx.font='900 44px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
    ctx.fillText('操作说明', VW/2, 80);
    drawTitleDecor(ctx, VW/2, 96, 180);
    const drawTable=(title,cx,map)=>{
      ctx.textAlign='center'; ctx.font='800 26px "Microsoft YaHei"'; ctx.fillStyle=THEME.primary.main;
      ctx.fillText(title, cx, 150);
      // 动态读取当前键位映射（改键后自动同步）
      const km=KEYMAP[map], kn=a=>this.codeToName(km[a] && km[a][0]);
      const rr=[['移动', kn('left')+' / '+kn('right')],['跳跃', kn('jump')],['格挡', kn('block')+'（按住）'],
        ['轻攻击（三段连）', kn('light')],['重攻击（浮空）', kn('heavy')],
        ['技能·壹', kn('skill1')],['技能·贰', kn('skill2')],['技能·叁', kn('skill3')],
        ['必杀技（满咒力）', kn('ult')],['闪避（无敌帧）', kn('dodge')]];
      ctx.font='400 20px "Microsoft YaHei"';
      rr.forEach((r,i)=>{
        const y=186+i*40;
        ctx.textAlign='right'; ctx.fillStyle='rgba(255,255,255,0.65)'; ctx.fillText(r[0], cx-16, y);
        ctx.textAlign='left'; ctx.fillStyle=THEME.accent.gold; ctx.fillText(r[1], cx+16, y);
      });
    };
    drawTable('玩家 1', VW/2-330, 'p1');
    drawTable('玩家 2', VW/2+330, 'p2');
    ctx.textAlign='center'; ctx.font='400 17px "Microsoft YaHei"'; ctx.fillStyle='rgba(255,255,255,0.55)';
    ctx.fillText('攻击命中积累咒力，咒力全满后释放必杀技 · 连击数越高伤害加成越高', VW/2, 596);
    ctx.fillText('格挡可大幅减伤 · 闪避期间无敌 · 重攻击可将对手击浮空', VW/2, 624);
    ctx.fillText('双方同时发动领域展开将触发「领域对抗」，领域强度更高的一方压制另一方', VW/2, 638);
    ctx.fillText('伏黑惠的必杀可召唤魔虚罗：盲目之兽不分敌我，连召唤者本人也会被攻击，且可被双方击破', VW/2, 662);
    ctx.fillText('战斗中按 Esc 暂停 · 在主菜单「设置」中可调整回合时间/难度/键位/背景音乐', VW/2, 686);
    ctx.fillStyle=THEME.text.white; ctx.fillText('按 J / Enter 返回主菜单', VW/2, 706);
  },

  drawVersus(game, ctx, t){
    const vt=game.versusT;
    ctx.fillStyle=THEME.bg.overlayLight; ctx.fillRect(0,0,VW,VH);
    // 背景放射线条效果（12条，缓慢旋转）
    ctx.save();
    ctx.translate(VW/2,VH/2);
    ctx.rotate(t*0.003);
    for(let i=0;i<12;i++){
      const angle=i*Math.PI/6;
      const lineAlpha=0.03+Math.sin(t*0.02+i)*0.015;
      ctx.strokeStyle='rgba(185,168,255,'+lineAlpha.toFixed(3)+')';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle)*50,Math.sin(angle)*50);
      ctx.lineTo(Math.cos(angle)*600,Math.sin(angle)*600);
      ctx.stroke();
    }
    ctx.restore();
    const [a,b]=game.fighters;
    // 角色肖像滑入使用easeOutBack
    const k=easeOutBack(Math.min(1,vt/20));
    ctx.save(); ctx.translate(lerp(-300,300,k), 400); ctx.scale(2.2,2.2);
    drawPortrait(ctx, a.c, t); ctx.restore();
    ctx.save(); ctx.translate(lerp(VW+300,VW-300,k), 400); ctx.scale(2.2,2.2);
    ctx.scale(-1,1); drawPortrait(ctx, b.c, t); ctx.restore();
    ctx.textAlign='center';
    ctx.globalAlpha=Math.min(1,vt/15);
    ctx.font='900 60px "Microsoft YaHei"';
    ctx.fillStyle=a.c.color; ctx.textAlign='right'; ctx.fillText(a.c.name+(a.isAI?' (AI)':''), VW/2-130, 200);
    ctx.fillStyle=b.c.color; ctx.textAlign='left';  ctx.fillText(b.c.name+(b.isAI?' (AI)':''), VW/2+130, 200);
    // VS文字旋转入场：从rotate(-0.26)+scale(3)到rotate(0)+scale(1)
    ctx.textAlign='center';
    const vsT=Math.min(1,vt/18);
    const vsRot=lerp(-0.26,0,easeOut(vsT));
    const vsScale=lerp(3,1,easeOut(vsT));
    ctx.font='900 100px "Microsoft YaHei"';
    ctx.fillStyle=`rgba(255,${100+Math.sin(vt*0.3)*60},60)`;
    ctx.strokeStyle='#000'; ctx.lineWidth=10;
    ctx.save();
    ctx.translate(VW/2,360); ctx.rotate(vsRot); ctx.scale(vsScale,vsScale);
    ctx.strokeText('VS',0,0); ctx.fillText('VS',0,0);
    ctx.restore();
    ctx.globalAlpha=1;
    // 底部台词打字机效果（逐字显示；联机时展示本方角色台词）
    const qc=(game.mode==='net' && Net.side===1)? b.c : a.c;
    const fullQuote=`「${qc.quotes[0]}」`;
    const charCount=Math.min(fullQuote.length, Math.floor(vt*0.8));
    const displayQuote=fullQuote.slice(0,charCount);
    ctx.font='400 22px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.sub;
    ctx.fillText(displayQuote, VW/2, 520);
  },

  drawPause(game, ctx, t){
    // 多层半透明叠加模拟毛玻璃效果
    ctx.fillStyle='rgba(3,3,12,0.55)'; ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle='rgba(8,6,20,0.12)'; ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle='rgba(15,10,30,0.08)'; ctx.fillRect(0,0,VW,VH);
    ctx.fillStyle='rgba(5,5,15,0.06)'; ctx.fillRect(0,0,VW,VH);
    ctx.textAlign='center';
    // 面板底板
    ctx.fillStyle=THEME.bg.panel;
    roundRect(ctx,VW/2-260,200,520,300,THEME.radius.panel); ctx.fill();
    // 双层描边：外圈实线
    ctx.strokeStyle=THEME.primary.main; ctx.lineWidth=2;
    roundRect(ctx,VW/2-260,200,520,300,THEME.radius.panel); ctx.stroke();
    // 内圈微发光（shadowBlur）
    ctx.save();
    ctx.shadowColor=THEME.primary.glow+'0.35)'; ctx.shadowBlur=16;
    ctx.strokeStyle=THEME.primary.glow+'0.2)'; ctx.lineWidth=1;
    roundRect(ctx,VW/2-256,204,512,292,THEME.radius.panel-2); ctx.stroke();
    ctx.shadowBlur=0;
    ctx.restore();
    // 标题
    ctx.save();
    ctx.shadowColor=THEME.primary.glow+'0.3)'; ctx.shadowBlur=20;
    ctx.font='900 52px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
    ctx.fillText('暂 停', VW/2, 278);
    ctx.shadowBlur=0;
    ctx.restore();
    ctx.font='400 18px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('PAUSED', VW/2, 308);
    const opts=['继续游戏','退出战斗'];
    opts.forEach((o,i)=>{
      const y=380+i*64, sel=game.pauseIdx===i;
      ctx.font=(sel?'900 30px':'700 26px')+' "Microsoft YaHei"';
      if(sel){
        // 选中态渐变卡片 + 扫光动画
        const cg=ctx.createLinearGradient(VW/2-190,0,VW/2+190,0);
        cg.addColorStop(0,THEME.primary.glow+'0)');
        cg.addColorStop(0.5,THEME.primary.glow+'0.22)');
        cg.addColorStop(1,THEME.primary.glow+'0)');
        ctx.fillStyle=cg;
        roundRect(ctx,VW/2-190,y-32,380,46,THEME.radius.card); ctx.fill();
        // 金色描边
        ctx.strokeStyle=THEME.accent.gold; ctx.lineWidth=1.5;
        roundRect(ctx,VW/2-190,y-32,380,46,THEME.radius.card); ctx.stroke();
        // 扫光
        const sweepPos=((t*3)%500)-60;
        ctx.save();
        ctx.beginPath(); roundRect(ctx,VW/2-190,y-32,380,46,THEME.radius.card); ctx.clip();
        const sg=ctx.createLinearGradient(sweepPos-60,0,sweepPos+60,0);
        sg.addColorStop(0,'rgba(255,255,255,0)');
        sg.addColorStop(0.5,'rgba(255,255,255,0.08)');
        sg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sg;
        ctx.fillRect(VW/2-190,y-32,380,46);
        ctx.restore();
        ctx.fillStyle=THEME.text.white;
        // 菱形指示器
        const dFloat=Math.sin(t*0.09)*4;
        ctx.fillStyle=THEME.accent.gold;
        ctx.save(); ctx.translate(VW/2-210-dFloat,y-8); ctx.rotate(Math.sin(t*0.08)*0.15);
        ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(7,0); ctx.lineTo(0,7); ctx.lineTo(-7,0); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.translate(VW/2+210+dFloat,y-8); ctx.rotate(-Math.sin(t*0.08)*0.15);
        ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(7,0); ctx.lineTo(0,7); ctx.lineTo(-7,0); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else ctx.fillStyle=THEME.text.muted;
      ctx.fillText(o, VW/2, y);
    });
    ctx.font='400 15px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('Esc 继续 · ↑↓ 选择 · J / Enter 确认', VW/2, 480);
  },

  drawResult(game, ctx, t){
    const rt=game.resultT;
    // 背景淡入改为从中心扩散的径向渐变
    const bgAlpha=Math.min(0.85,rt/60);
    const radR=Math.min(VW,VH)*Math.min(1,rt/40);
    const radGrad=ctx.createRadialGradient(VW/2,VH/2,0,VW/2,VH/2,radR);
    radGrad.addColorStop(0,'rgba(3,3,10,'+bgAlpha.toFixed(2)+')');
    radGrad.addColorStop(1,'rgba(3,3,10,'+(bgAlpha*0.6).toFixed(2)+')');
    ctx.fillStyle=radGrad; ctx.fillRect(0,0,VW,VH);
    // 填充外围确保全黑
    if(bgAlpha>0.1){
      ctx.fillStyle='rgba(3,3,10,'+(bgAlpha*0.5).toFixed(2)+')'; ctx.fillRect(0,0,VW,VH);
    }
    if(rt<20) return;
    const w=game.fighters[game.result];
    // 获胜文字：easeOutBack缩放 + 金色光晕脉动
    const kT=Math.min(1,(rt-20)/30);
    const k=easeOutBack(kT);
    ctx.textAlign='center';
    ctx.save(); ctx.translate(VW/2, 240); ctx.scale(k,k);
    ctx.font='900 74px "Microsoft YaHei"';
    ctx.strokeStyle='#000'; ctx.lineWidth=10;
    const grd=ctx.createLinearGradient(0,-50,0,30);
    grd.addColorStop(0,THEME.text.white); grd.addColorStop(1,w.c.color);
    // 金色光晕脉动
    const glowPulse=12+Math.sin(t*0.08)*8;
    ctx.shadowColor=THEME.accent.goldGlow+'0.6)'; ctx.shadowBlur=glowPulse;
    ctx.strokeText(`${w.c.name} 获胜！`,0,0);
    ctx.fillStyle=grd; ctx.fillText(`${w.c.name} 获胜！`,0,0);
    ctx.shadowBlur=0;
    ctx.restore();
    // 台词
    ctx.font='400 26px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.sub;
    ctx.fillText(`「${w.c.quotes[0]}」`, VW/2, 320);
    // 比分数字滚动效果（从0递增到实际值，20帧内完成）
    if(game.resultScoreAnimT===undefined) game.resultScoreAnimT=t;
    const scoreElapsed=t-game.resultScoreAnimT;
    const scoreT=Math.min(1,scoreElapsed/20);
    const s0=Math.round(game.wins[0]*easeOut(scoreT));
    const s1=Math.round(game.wins[1]*easeOut(scoreT));
    ctx.fillText(`比分 ${s0} : ${s1}`, VW/2, 370);
    // 选项列表逐个入场（联机模式：再战/返回两项，光标用 netResultIdx）
    const isNet=game.mode==='net';
    const opts=isNet? ['再战一局','返回主菜单'] : ['再战一局','返回角色选择','返回主菜单'];
    const selIdx=isNet? (game.netResultIdx||0) : game.resultIdx;
    opts.forEach((o,i)=>{
      const itemDelay=i*5;
      const itemElapsed=rt-20-itemDelay;
      if(itemElapsed<0) return;
      const itemT=Math.min(1,itemElapsed/10);
      const itemAlpha=easeOut(itemT);
      const itemY=460+i*62;
      const sel=selIdx===i;
      ctx.save();
      ctx.globalAlpha=itemAlpha;
      ctx.font=(sel?'900 32px':'700 27px')+' "Microsoft YaHei"';
      if(sel){
        const cg=ctx.createLinearGradient(VW/2-220,0,VW/2+220,0);
        cg.addColorStop(0,THEME.primary.glow+'0)');
        cg.addColorStop(0.5,THEME.primary.glow+'0.22)');
        cg.addColorStop(1,THEME.primary.glow+'0)');
        ctx.fillStyle=cg;
        roundRect(ctx,VW/2-220,itemY-32,440,46,THEME.radius.card); ctx.fill();
        // 金色描边
        ctx.strokeStyle=THEME.accent.gold; ctx.lineWidth=1.5;
        roundRect(ctx,VW/2-220,itemY-32,440,46,THEME.radius.card); ctx.stroke();
        // 扫光
        const sweepPos=((t*3)%560)-80;
        ctx.save();
        ctx.beginPath(); roundRect(ctx,VW/2-220,itemY-32,440,46,THEME.radius.card); ctx.clip();
        const sg=ctx.createLinearGradient(sweepPos-60,0,sweepPos+60,0);
        sg.addColorStop(0,'rgba(255,255,255,0)');
        sg.addColorStop(0.5,'rgba(255,255,255,0.07)');
        sg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sg;
        ctx.fillRect(VW/2-220,itemY-32,440,46);
        ctx.restore();
        ctx.fillStyle=THEME.text.white;
      } else ctx.fillStyle='rgba(255,255,255,0.55)';
      ctx.fillText(o, VW/2, itemY);
      ctx.restore();
    });
    /* 联机：再战协商状态提示 */
    if(isNet && rt>30){
      ctx.font='500 19px "Microsoft YaHei"';
      if(Net.rematchLocal && Net.rematchPeer){
        ctx.fillStyle='#8ce68c'; ctx.fillText('双方已确认，即将开战！', VW/2, 630);
      } else if(Net.rematchLocal){
        ctx.fillStyle='#ffd76a'; ctx.fillText('已请求再战，等待对方确认…', VW/2, 630);
      } else if(Net.rematchPeer){
        ctx.fillStyle='#8ce68c'; ctx.fillText('对方想再战一局！选择「再战一局」应战', VW/2, 630);
      }
    }
    ctx.font='400 16px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('↑↓ 选择 · J / Enter 确认', VW/2, 680);
  },

  /* ============ 闯关模式 UI ============ */
  drawArcadeTransition(game, ctx, t){
    BG.draw(ctx,t);
    ctx.fillStyle=THEME.bg.deep; ctx.fillRect(0,0,VW,VH);
    ctx.textAlign='center';
    const arc=game.arcade;
    const k=Math.min(1,(game.arcadeTransT||0)/30);
    // 整体从下方滑入+淡入组合
    const slideY=lerp(50,0,easeOut(k));
    ctx.save();
    ctx.globalAlpha=easeOut(k);
    ctx.translate(0,slideY);
    // “第X关通过”文字：缩放弹入动画（easeOutBack）
    const titleT=Math.min(1,(game.arcadeTransT||0)/25);
    const titleScale=easeOutBack(titleT);
    ctx.save();
    ctx.translate(VW/2,260); ctx.scale(titleScale,titleScale); ctx.translate(-VW/2,-260);
    ctx.font='900 56px "Microsoft YaHei"';
    ctx.save();
    ctx.shadowColor=THEME.accent.goldGlow+'0.5)'; ctx.shadowBlur=18;
    ctx.fillStyle=THEME.accent.gold;
    ctx.fillText(`第 ${arc.stage} 关通过！`, VW/2, 260);
    ctx.shadowBlur=0;
    ctx.restore();
    ctx.restore();
    ctx.font='700 28px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
    ctx.fillText(`进度 ${arc.stage} / ${arc.total}`, VW/2, 320);
    /* 下一关对手预告 */
    if(arc.stage<arc.total){
      const nextChar=CHARS[arc.opponents[arc.stage]];
      ctx.font='700 24px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.sub;
      ctx.fillText('下一关对手', VW/2, 400);
      // 对手名字从模糊到清晰（shadowBlur从20递减到0）
      const nameT=Math.min(1,((game.arcadeTransT||0)-10)/20);
      const nameBlur=nameT<1? 20*(1-easeOut(nameT)) : 0;
      ctx.save();
      ctx.shadowColor=nextChar.color; ctx.shadowBlur=nameBlur;
      ctx.font='900 36px "Microsoft YaHei"'; ctx.fillStyle=nextChar.color;
      ctx.fillText(nextChar.name, VW/2, 445);
      ctx.shadowBlur=0;
      ctx.restore();
      ctx.font='400 16px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
      ctx.fillText(nextChar.title, VW/2, 478);
    }
    /* 进度条 + 流光效果 */
    const barW=500, barH=12, bx=(VW-barW)/2, by=540;
    ctx.fillStyle=THEME.text.dim; roundRect(ctx,bx,by,barW,barH,6); ctx.fill();
    const fillW=barW*(arc.stage/arc.total);
    if(fillW>0){
      ctx.fillStyle=THEME.accent.gold; roundRect(ctx,bx,by,fillW,barH,6); ctx.fill();
      // 流光效果：高光点沿进度条循环移动
      const lightPos=((t*4)%(barW+80))-40;
      ctx.save();
      ctx.beginPath(); roundRect(ctx,bx,by,fillW,barH,6); ctx.clip();
      const lightGrad=ctx.createLinearGradient(bx+lightPos-30,0,bx+lightPos+30,0);
      lightGrad.addColorStop(0,'rgba(255,255,255,0)');
      lightGrad.addColorStop(0.5,'rgba(255,255,255,0.35)');
      lightGrad.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=lightGrad;
      ctx.fillRect(bx,by,fillW,barH);
      ctx.restore();
    }
    ctx.font='400 16px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('J / Enter 继续', VW/2, 600);
    ctx.restore();
    ctx.globalAlpha=1;
  },

  drawArcadeResult(game, ctx, t){
    BG.draw(ctx,t);
    ctx.fillStyle=THEME.bg.deep; ctx.fillRect(0,0,VW,VH);
    ctx.textAlign='center';
    const arc=game.arcade;
    const win=game.arcadeWin;
    if(win){
      ctx.font='900 64px "Microsoft YaHei"';
      const grd=ctx.createLinearGradient(0,180,0,260);
      grd.addColorStop(0,THEME.accent.gold); grd.addColorStop(1,'#ff8a3c');
      ctx.fillStyle=grd;
      ctx.fillText('全 关 通 过 ！', VW/2, 230);
      ctx.font='700 26px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
      ctx.fillText(`恭喜！你以 ${CHARS[arc.playerChar].name} 通关了全部 ${arc.total} 关！`, VW/2, 300);
    } else {
      ctx.font='900 56px "Microsoft YaHei"'; ctx.fillStyle=THEME.accent.red;
      ctx.fillText('闯 关 失 败', VW/2, 220);
      ctx.font='700 28px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.white;
      ctx.fillText(`止步第 ${arc.stage+1} 关（共 ${arc.total} 关）`, VW/2, 290);
      const foeChar=CHARS[arc.opponents[arc.stage]];
      ctx.font='400 20px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.sub;
      ctx.fillText(`被 ${foeChar.name} 击败`, VW/2, 330);
    }
    /* 选项 */
    const opts=['重新挑战','返回主菜单'];
    opts.forEach((o,i)=>{
      const y=430+i*64, sel=(game.arcadeResultIdx||0)===i;
      ctx.font=(sel?'900 30px':'700 26px')+' "Microsoft YaHei"';
      if(sel){
        const cg=ctx.createLinearGradient(VW/2-190,0,VW/2+190,0);
        cg.addColorStop(0,THEME.primary.glow+'0)');
        cg.addColorStop(0.5,THEME.primary.glow+'0.22)');
        cg.addColorStop(1,THEME.primary.glow+'0)');
        ctx.fillStyle=cg;
        roundRect(ctx,VW/2-190,y-32,380,46,THEME.radius.card); ctx.fill();
        // 金色描边
        ctx.strokeStyle=THEME.accent.gold; ctx.lineWidth=1.5;
        roundRect(ctx,VW/2-190,y-32,380,46,THEME.radius.card); ctx.stroke();
        // 扫光动画
        const sweepPos=((t*3)%500)-60;
        ctx.save();
        ctx.beginPath(); roundRect(ctx,VW/2-190,y-32,380,46,THEME.radius.card); ctx.clip();
        const sg=ctx.createLinearGradient(sweepPos-60,0,sweepPos+60,0);
        sg.addColorStop(0,'rgba(255,255,255,0)');
        sg.addColorStop(0.5,'rgba(255,255,255,0.08)');
        sg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sg;
        ctx.fillRect(VW/2-190,y-32,380,46);
        ctx.restore();
        ctx.fillStyle=THEME.text.white;
        // 菱形指示器
        const dFloat=Math.sin(t*0.09)*4;
        ctx.fillStyle=THEME.accent.gold;
        ctx.save(); ctx.translate(VW/2-210-dFloat,y-8); ctx.rotate(Math.sin(t*0.08)*0.15);
        ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(7,0); ctx.lineTo(0,7); ctx.lineTo(-7,0); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.translate(VW/2+210+dFloat,y-8); ctx.rotate(-Math.sin(t*0.08)*0.15);
        ctx.beginPath(); ctx.moveTo(0,-7); ctx.lineTo(7,0); ctx.lineTo(0,7); ctx.lineTo(-7,0); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else ctx.fillStyle=THEME.text.muted;
      ctx.fillText(o, VW/2, y);
    });
    ctx.font='400 15px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText('↑↓ 选择 · J / Enter 确认', VW/2, 580);
  },

  /* ---- 联机大厅：模式菜单 / 房号输入 / 等待状态 ---- */
  drawNetLobby(game, ctx, t){
    ctx.fillStyle='#07080f'; ctx.fillRect(0,0,VW,VH);
    // 背景流动光斑
    for(let i=0;i<5;i++){
      const gx=(VW/2)+Math.sin(t*0.004+i*1.9)*420, gy=200+Math.cos(t*0.005+i*2.3)*140;
      const g=ctx.createRadialGradient(gx,gy,0,gx,gy,180);
      g.addColorStop(0,THEME.primary.glow+'0.05)'); g.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,VW,VH);
    }
    ctx.textAlign='center';
    ctx.font='900 44px "Microsoft YaHei"'; ctx.fillStyle='#f0e8ff';
    ctx.fillText('联机对战', VW/2, 190);

    const st=Net.status;
    /* ===== 大厅菜单 / 房号输入 ===== */
    if(st==='lobby'){
      if(game.netLobbyStage==='input'){
        ctx.font='500 24px "Microsoft YaHei"'; ctx.fillStyle='#cfc4ff';
        ctx.fillText('输入 4 位房号', VW/2, 300);
        /* 4 个数字格 */
        const boxW=72, gap=18, x0=VW/2-(boxW*4+gap*3)/2;
        for(let i=0;i<4;i++){
          const x=x0+i*(boxW+gap), filled=i<game.netCodeInput.length;
          const isCur=i===game.netCodeInput.length;
          ctx.fillStyle='rgba(20,18,40,0.75)';
          roundRect(ctx,x,350,boxW,88,10); ctx.fill();
          ctx.strokeStyle=isCur? THEME.accent.gold:'rgba(255,255,255,0.2)';
          ctx.lineWidth=isCur? 2.5:1.5;
          roundRect(ctx,x,350,boxW,88,10); ctx.stroke();
          if(filled){
            ctx.font='900 52px "Microsoft YaHei"'; ctx.fillStyle='#fff';
            ctx.fillText(game.netCodeInput[i], x+boxW/2, 412);
          } else if(isCur && Math.floor(t/500)%2===0){
            ctx.fillStyle=THEME.accent.gold;
            ctx.fillRect(x+boxW/2-14,418,28,3);
          }
        }
        if(Net.failMsg){
          ctx.font='500 19px "Microsoft YaHei"'; ctx.fillStyle='#ff8a8a';
          ctx.fillText(Net.failMsg, VW/2, 490);
        }
        ctx.font='400 16px "Microsoft YaHei"'; ctx.fillStyle='rgba(255,255,255,0.5)';
        ctx.fillText('数字键输入 · 退格删除 · J / Enter 加入 · K / Esc 返回', VW/2, 545);
      } else {
        const opts=[
          ['快速匹配','自动与另一位等待中的玩家配对'],
          ['创建房间','生成 4 位房号，等待好友加入'],
          ['加入房间','输入好友的房号进行配对']
        ];
        opts.forEach((o,i)=>{
          const y=310+i*84, sel=(game.netLobbyIdx||0)===i;
          if(sel){
            const cg=ctx.createLinearGradient(VW/2-260,0,VW/2+260,0);
            cg.addColorStop(0,THEME.primary.glow+'0)');
            cg.addColorStop(0.5,THEME.primary.glow+'0.24)');
            cg.addColorStop(1,THEME.primary.glow+'0)');
            ctx.fillStyle=cg;
            roundRect(ctx,VW/2-260,y-38,520,64,10); ctx.fill();
            ctx.strokeStyle=THEME.accent.gold; ctx.lineWidth=1.5;
            roundRect(ctx,VW/2-260,y-38,520,64,10); ctx.stroke();
            const dofs=Math.sin(t*0.09)*4;
            ctx.fillStyle=THEME.accent.gold;
            [[VW/2-286-dofs,y-8],[VW/2+286+dofs,y-8]].forEach(([dx,dy])=>{
              ctx.beginPath(); ctx.moveTo(dx,dy-7); ctx.lineTo(dx+7,dy); ctx.lineTo(dx,dy+7); ctx.lineTo(dx-7,dy); ctx.closePath(); ctx.fill();
            });
            ctx.font='900 28px "Microsoft YaHei"'; ctx.fillStyle='#fff';
            ctx.fillText(o[0], VW/2, y-4);
            ctx.font='400 14px "Microsoft YaHei"'; ctx.fillStyle=THEME.accent.goldGlow+'0.75)';
            ctx.fillText(o[1], VW/2, y+18);
          } else {
            ctx.font='500 24px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
            ctx.fillText(o[0], VW/2, y);
          }
        });
        if(Net.failMsg){
          ctx.font='500 18px "Microsoft YaHei"'; ctx.fillStyle='#ff8a8a';
          ctx.fillText(Net.failMsg, VW/2, 578);
        }
        ctx.font='400 16px "Microsoft YaHei"'; ctx.fillStyle='rgba(255,255,255,0.5)';
        ctx.fillText('↑↓ 选择 · J / Enter 确认 · Esc 返回主菜单', VW/2, 620);
      }
      return;
    }

    /* ===== 已建房：展示房号等待好友 ===== */
    if(st==='hosting'){
      ctx.font='500 24px "Microsoft YaHei"'; ctx.fillStyle='#cfc4ff';
      ctx.fillText('房间已创建，把房号告诉好友吧', VW/2, 290);
      /* 房号大字展示 */
      ctx.save();
      ctx.shadowColor=THEME.accent.goldGlow+'0.6)'; ctx.shadowBlur=16+Math.sin(t*0.08)*8;
      ctx.font='900 96px "Microsoft YaHei"'; ctx.fillStyle=THEME.accent.gold;
      const code=Net.roomCode||'----';
      let cx=VW/2-((code.length-1)*46);
      for(const ch of code){ ctx.fillText(ch, cx, 420); cx+=92; }
      ctx.restore();
      ctx.font='500 20px "Microsoft YaHei"'; ctx.fillStyle='#cfc4ff';
      ctx.fillText('等待好友选择「加入房间」输入房号…', VW/2, 490);
      ctx.save(); ctx.translate(VW/2, 550); ctx.rotate(t*0.05);
      ctx.strokeStyle=THEME.accent.gold; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(14,0); ctx.lineTo(0,14); ctx.lineTo(-14,0); ctx.closePath(); ctx.stroke();
      ctx.restore();
      ctx.font='400 15px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
      ctx.fillText('Esc 取消并返回主菜单', VW/2, VH-40);
      return;
    }

    /* ===== 连接中 / 等待配对 / 配对成功 / 出错 ===== */
    const stMap={
      connecting:'正在连接联机服务器…',
      waiting:'等待另一位玩家加入…',
      paired:'配对成功！正在进入角色选择…',
      error:(Net.errMsg||'连接失败')
    };
    const isErr=st==='error';
    ctx.font='500 24px "Microsoft YaHei"';
    ctx.fillStyle=isErr? '#ff8a8a' : '#cfc4ff';
    ctx.fillText(stMap[st]||'…', VW/2, 340);
    // 等待动画（旋转菱形）
    if(!isErr){
      ctx.save(); ctx.translate(VW/2, 420); ctx.rotate(t*0.05);
      ctx.strokeStyle=THEME.accent.gold; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(0,-16); ctx.lineTo(16,0); ctx.lineTo(0,16); ctx.lineTo(-16,0); ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
    // 提示
    ctx.font='400 16px "Microsoft YaHei"'; ctx.fillStyle='rgba(255,255,255,0.5)';
    if(st==='waiting'){
      ctx.fillText('同一局域网玩家选择「快速匹配」即可自动配对', VW/2, 500);
    } else if(isErr){
      ctx.fillText('当前服务器地址：'+Net.wsUrl(), VW/2, 500);
      ctx.fillText('局域网请确认服务器已启动；公网联机可用 ?server=wss://你的域名 指定', VW/2, 526);
    }
    ctx.font='400 15px "Microsoft YaHei"'; ctx.fillStyle=THEME.text.muted;
    ctx.fillText(isErr? 'J / Esc 返回主菜单' : 'Esc 取消并返回主菜单', VW/2, VH-40);
  },

  /* ---- 联机选人状态横幅（叠加在选人界面上） ---- */
  drawNetSelectStatus(game, ctx, _t){
    ctx.save();
    ctx.textAlign='center';
    ctx.fillStyle='rgba(0,0,0,0.55)';
    roundRect(ctx, VW/2-280, 8, 560, 34, 8); ctx.fill();
    ctx.font='500 16px "Microsoft YaHei"';
    let txt='联机模式 · 你是 '+(Net.side===0?'P1（左侧）':'P2（右侧）');
    if(Net.picked && Net.peerPickIdx===null) txt='已锁定，等待对方选择…';
    else if(Net.picked) txt='双方已锁定，即将开战！';
    else if(Net.peerPickIdx!==null) txt+=' · 对方已锁定';
    ctx.fillStyle=Net.picked? '#ffd76a' : '#cfc4ff';
    ctx.fillText(txt, VW/2, 31);
    ctx.restore();
  }
};
