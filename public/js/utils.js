/* =====================================================================
   工具函数与绘图辅助
   ===================================================================== */
import { VW, VH } from './config.js';

export const clamp = (v,a,b)=> v<a?a:(v>b?b:v);
export const lerp  = (a,b,t)=> a+(b-a)*t;
export const rand  = (a,b)=> a+Math.random()*(b-a);
export const irand = (a,b)=> Math.floor(rand(a,b+1));

/* ---------------- 逻辑层种子随机（网络联机确定性基础） ----------------
   战斗逻辑随机（黑闪/暴击/AI决策/领域对冲/场地与对手抽选）必须走 RNG，
   同一种子 + 同一输入序列 => 每帧结果完全一致；
   纯视觉特效（粒子/闪光位置/音噪）继续用 rand/irand 真随机，不影响同步 */
let _rngState = 1;
export const RNG = {
  /* 设种：每场战斗开始时调用，联机时双方约定同一种子 */
  seed(s){ _rngState = (s >>> 0) || 1; },
  getState(){ return _rngState; },
  /* mulberry32：快速高质量 32 位伪随机 */
  random(){
    _rngState = (_rngState + 0x6D2B79F5) >>> 0;
    let t = _rngState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  },
  rand(a,b){ return a + this.random() * (b - a); },
  irand(a,b){ return Math.floor(this.rand(a, b + 1)); },
  chance(p){ return this.random() < p; }
};

export const easeOut = t => 1-Math.pow(1-t,3);
export function easeOutBack(t){
  const c1=1.70158;
  const c3=c1+1;
  return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);
}

/* 响应式适配：按窗口比例缩放 #stage；并按 devicePixelRatio 设置画布后备分辨率（P2-2）
   原实现 canvas 恒为 1280×720，2x 屏上被拉伸到 2560×1440 物理像素，文字与立绘发虚。
   这里把 dpr 作为"基准变换"烘焙进上下文，之后所有绘制继续用 1280×720 逻辑坐标。 */
const MAX_DPR = 2;          // 上限：3x/4x 屏上再按比例放大会显著增加填充率开销
export const dprOf = () => Math.min(MAX_DPR, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
let _dprApplied = 0;
export function fit(canvas){
  const w = innerWidth, h = innerHeight;
  const s = Math.min(w / VW, h / VH);
  const st = document.getElementById('stage');
  if(st){
    st.style.width  = VW + 'px';
    st.style.height = VH + 'px';
    st.style.transform = `translate(-50%,-50%) scale(${s})`;
  }
  if(!canvas) return;
  const dpr = dprOf();
  const bw = Math.round(VW * dpr), bh = Math.round(VH * dpr);
  // dpr 变化（换显示器/系统缩放）或分辨率变化时才重建后备缓冲
  if(canvas.width !== bw || canvas.height !== bh || _dprApplied !== dpr){
    canvas.width = bw;
    canvas.height = bh;
    canvas.style.width = VW + 'px';
    canvas.style.height = VH + 'px';
    /* 注意：改 canvas.width 会重置上下文状态，必须在之后重新设置基准变换。
       game.js 的 draw() 每帧 save()/restore() 不会破坏它。 */
    const c = canvas.getContext('2d');
    if(c) c.setTransform(dpr, 0, 0, dpr, 0, 0);
    _dprApplied = dpr;
  }
}

/* 受控计时器（帧驱动）：按逻辑帧推进而非墙钟，保证联机两端在同一帧触发；
   暂停/非战斗场景不推进（与旧墙钟版语义一致） */
const _frameTimers = new Map();
let _ftSeq = 0;
export function gameInterval(fn, ms){
  const id = ++_ftSeq;
  _frameTimers.set(id, { fn, every: Math.max(1, Math.round(ms / 16.66)), cnt: 0 });
  return id;
}
export function clearGameInterval(id){ _frameTimers.delete(id); }
export function clearAllGameIntervals(){ _frameTimers.clear(); }
/* P2-4：场景来源改为依赖注入（main.js 调 setSceneProvider），模块不再依赖裸全局 Game，
   可被独立 import / 单元测试。未注入时回退 window.Game 兜底，保持旧行为。 */
let _sceneProvider = null;
export function setSceneProvider(fn){ _sceneProvider = fn; }
export function tickGameIntervals(){
  /* P1-7：原为黑名单（只排 pause/select/title），result/settings/help/stageSelect/
     netLobby/arcadeTransition/versus 全部漏网——回合结束后的结算界面仍会掉血，
     versus 入场动画期间也在推进。技能多段结算只可能发生在 fight，故改白名单。 */
  const scene = _sceneProvider ? _sceneProvider() : (typeof window.Game !== 'undefined' ? window.Game.scene : null);
  if (scene !== 'fight') return;
  for(const t of [..._frameTimers.values()]){
    t.cnt++;
    if(t.cnt >= t.every){ t.cnt = 0; t.fn(); }
  }
}

/* 圆角矩形路径 */
export function roundRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y); ctx.lineTo(x+w-rr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+rr);
  ctx.lineTo(x+w,y+h-rr); ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);
  ctx.lineTo(x+rr,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-rr);
  ctx.lineTo(x,y+rr); ctx.quadraticCurveTo(x,y,x+rr,y);
  ctx.closePath();
}

/* 简单椭圆 */
export function g_ellipse(ctx,x,y,rx,ry,rot=0){
  ctx.beginPath();
  ctx.ellipse(x,y,rx,ry,rot,0,Math.PI*2);
  ctx.closePath();
}

/* 渐变线 */
export function g_line(ctx,x1,y1,x2,y2,w,c1,c2){
  ctx.save();
  ctx.lineWidth=w; ctx.lineCap='round';
  const g=ctx.createLinearGradient(x1,y1,x2,y2); g.addColorStop(0,c1); g.addColorStop(1,c2);
  ctx.strokeStyle=g;
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  ctx.restore();
}
