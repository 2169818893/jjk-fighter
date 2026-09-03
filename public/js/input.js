/* =====================================================================
   输入系统：键盘事件、按键缓冲、键位重绑
   ===================================================================== */
import { Settings, KEYMAP, persistSettings } from './config.js';
import { AudioSys } from './audio.js';
import { Net } from './net.js';

/* 重绑捕获态下必须忽略的键：功能键/修饰键交给浏览器，Escape 留给"取消重绑" */
const REBIND_IGNORED = /^(F\d{1,2}|Tab|MetaLeft|MetaRight|ControlLeft|ControlRight|AltLeft|AltRight|ShiftLeft|ShiftRight|CapsLock|ContextMenu|Escape)$/;

export const Input = {
  down:{}, press:{}, buf:{}, bufT:{}, netLock:false,
  /* P1-10：窗口失焦/页面隐藏时清空按键状态。按住方向键 Alt+Tab 切走后 keyup 永不到达，
     否则 down 恒为 true，切回来角色会持续单向移动（联机下还会持续发送错误输入）。 */
  clearHeld(){
    this.down={}; this.press={}; this.buf={}; this.bufT={};
    if(Net && Net.raw){ Net.raw.down={}; Net.raw.tap={}; }
  },
  init(){
    addEventListener('keydown', e=>{
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      // 键位重绑捕获（设置面板）
      if(Settings.rebind){
        /* P1-11：原实现无条件把任意 e.code 绑成动作键——用户按 Esc 想取消重绑时，
           Esc 被绑成动作键，且 handleSettings 会接着走到退出分支直接回主菜单；
           F5/F11/Ctrl+R 在捕获态下也照样生效。 */
        if(e.code === 'Escape'){
          Settings.rebind = null;
          AudioSys.play('select');
          e.preventDefault();
          return;
        }
        if(REBIND_IGNORED.test(e.code)) return;   // 功能键/修饰键不参与重绑
        e.preventDefault();
        const rb = Settings.rebind;
        const oldKey = KEYMAP[rb.side][rb.action] && KEYMAP[rb.side][rb.action][0];
        /* P2-18：跨侧冲突检测。原实现只遍历本侧键表，P1 可以绑到 ArrowLeft，
           本地 PvP 时一键同时驱动双方。这里遍历两侧，与占用方交换按键。 */
        for(const side of ['p1','p2']){
          const map = KEYMAP[side];
          for(const a in map){
            const arr = map[a];
            if(!arr) continue;
            const idx = arr.indexOf(e.code);
            if(idx < 0) continue;
            if(side === rb.side && a === rb.action) continue;
            if(oldKey) arr[idx] = oldKey; else arr.splice(idx, 1);
          }
        }
        KEYMAP[rb.side][rb.action]=[e.code];
        Settings.rebind=null;
        AudioSys.play('confirm');
        persistSettings();   // P2-9：重绑结果落盘
        return;
      }
      // 联机帧锁期间：真实键盘不直接写入输入状态（由 net.js 按帧注入双方输入），
      // 否则本地即时按键会绕过延迟同步直接触发动作，导致两端失步
      if(this.netLock){ AudioSys.init(); return; }
      if(!this.down[e.code]){ this.press[e.code]=true; this.buf[e.code]=true; this.bufT[e.code]=10; }
      this.down[e.code]=true;
      AudioSys.init();
    });
    addEventListener('keyup', e=>{ this.down[e.code]=false; });
    addEventListener('pointerdown', ()=>{ AudioSys.init(); });
    addEventListener('blur', ()=>this.clearHeld());
    document.addEventListener('visibilitychange', ()=>{ if(document.hidden) this.clearHeld(); });
  },
  held(map,action){ return (map[action]||[]).some(k=>this.down[k]); },
  pressed(map,action){ return (map[action]||[]).some(k=>this.press[k]||this.buf[k]); },
  consume(map,action){ (map[action]||[]).forEach(k=>{ this.buf[k]=false; }); },
  postUpdate(){
    this.press={};
    // 缓冲倒计时（顿帧期间按键保留数帧，只触发一次后由战斗逻辑自然消费）
    for(const k in this.bufT){ if(this.bufT[k]>0){ this.bufT[k]--; if(this.bufT[k]<=0) this.buf[k]=false; } }
  }
};
