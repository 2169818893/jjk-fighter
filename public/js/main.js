/* =====================================================================
   入口文件：初始化 Canvas、输入、响应式缩放并启动主循环
   ===================================================================== */
import { fit } from './utils.js';
import { Input } from './input.js';
import { Net } from './net.js';
// 入口版本号：确保游戏加载最新的角色与战斗模块
import { Game } from './game.js?v=ai-duel-20260810';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

/* P2-2：fit() 负责按 devicePixelRatio 设置画布后备分辨率与基准变换（见 utils.js） */
fit(canvas);
addEventListener('resize', ()=>fit(canvas));

Input.init();

// 暴露到全局，供 utils / fighter-core / audio 等模块在运行时使用
window.Game = Game;

let lastT = 0, acc = 0;
// 逻辑步进（与渲染解耦：由 rAF 或定时器驱动）
function stepLogic(now){
  if(!lastT) lastT = now;
  let dt = now - lastT; lastT = now;
  if(dt > 100) dt = 100;
  acc += dt;
  if(acc > 500) acc = 500; // 长时间等待后避免爆发式追帧
  // 固定 60fps 逻辑步长
  while(acc >= 16.66){
    // 联机帧锁：战斗中屏蔽真实键盘直写；对端输入未到达时暂停逻辑模拟（渲染照常）
    Input.netLock = Net.lockstepScene(Game.scene);
    if(Input.netLock && !Net.tick(Game, Input)){
      /* P2-11：等待对端输入而跳过本帧时既不扣 acc 也不清 press，
         postUpdate() 也被跳过，积压的 press 会在恢复后的第一帧集中触发 */
      Input.press = {};
      break;
    }
    acc -= 16.66;
    /* P2-10：原列表里的 'difficulty' 全代码无任何处赋值，是死场景，已移除 */
    if(['title','netLobby','help','select','stageSelect','result','settings','arcadeTransition','arcadeResult'].includes(Game.scene)) Game.handleMenus();
    Game.update();
    Input.postUpdate();
  }
}

/* ---- 单一时钟驱动（P2 修复）：任意时刻只有一个泵在推进逻辑 ----
   前台：rAF 驱动（逻辑 + 渲染）
   失焦：浏览器会节流 rAF，切到 setInterval 后备泵维持逻辑推进
         （联机对局尤其同机双窗口测试依赖此泵）；切回可见时恢复 rAF。
   切换驱动源时重置时间基准，避免追帧爆发。 */
const STEP_MS = 16;
let pump = null;      // 'raf' | 'timer'
let rafId = 0;
let timerId = null;

function startRaf(){
  pump = 'raf';
  rafId = requestAnimationFrame(rafLoop);
}
let drawErrors = 0;   // 连续绘制失败计数（P1-8 熔断）
function rafLoop(ts){
  if(pump !== 'raf') return;
  rafId = requestAnimationFrame(rafLoop);
  /* P3-4：逻辑与渲染统一用 rAF 时间戳。原先用 performance.now() 跑逻辑、
     用 rAF 的 ts 渲染，两条时基会让动画与逻辑错半个相位。 */
  stepLogic(ts);
  /* P1-8：渲染异常必须在此隔离。rAF 已在函数开头重新排队，draw 抛错不会停泵，
     但 Game.draw 内部已用 finally 保证 ctx 变换栈还原；这里再做计数熔断，
     避免持续抛错时每帧刷屏。 */
  try {
    Game.draw(ctx, ts);
    drawErrors = 0;
  } catch(err){
    drawErrors++;
    if(drawErrors <= 3) console.error('[raf] 绘制失败：', err);
    if(drawErrors >= 30){
      cancelAnimationFrame(rafId);
      pump = null;
      console.error('[raf] 连续 30 帧绘制失败，已停止渲染（逻辑泵仍在运行）');
    }
  }
}
function startTimer(){
  pump = 'timer';
  timerId = setInterval(() => {
    if(pump !== 'timer') return;
    stepLogic(performance.now());
  }, STEP_MS);
}
function switchPump(mode){
  if(pump === mode) return;
  if(pump === 'raf') cancelAnimationFrame(rafId);
  if(pump === 'timer') clearInterval(timerId);
  pump = null;
  lastT = 0; acc = 0; // 切换基准：首个 step 重建 lastT，避免跨泵追帧
  if(mode === 'raf') startRaf(); else startTimer();
}
document.addEventListener('visibilitychange', () => {
  /* P1-12：Net.onPageHidden() 已实现，但此前从未被调用（死代码）。
     浏览器把后台标签页的 setInterval 钳制到 ≥1000ms，帧锁每帧都要等对端输入，
     硬撑必然失步；隐藏瞬间主动中止，双方都能干净地回到大厅。 */
  Net.onPageHidden(document.hidden);
  switchPump(document.hidden ? 'timer' : 'raf');
});
startRaf();
