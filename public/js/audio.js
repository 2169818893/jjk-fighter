/* =====================================================================
   音频系统：WebAudio 程序合成音效 + 多轨道 BGM
   （BGM 音序器用墙钟 setInterval 属正确行为：音频节拍不应随逻辑帧波动）
   ===================================================================== */

/* ---- AudioSys 与 BGM 共用的音频辅助 ----
   注意：这两个函数必须放在模块作用域。BGM 与 AudioSys 是两个彼此独立的对象字面量，
   早期版本把它们写成各自对象上的方法，BGM.note/kick/snare/hihat 里的 this 指向 BGM，
   取不到 AudioSys 的成员，导致每条合成音轨第一拍就抛 TypeError（详见文件末尾说明）。 */

/* P1-13：噪声波形内容恒为"白噪 × 线性衰减包络"，原实现每次调用都 createBuffer
   并逐样本填充。142bpm 下 hihat≈9.5 次/秒 × 1920 样本 + snare≈4.7 次/秒 × 5760 样本
   ≈ 180KB/s（约 11MB/分钟）的纯垃圾。按长度缓存，之后每次只新建 BufferSource。
   cache 按 AudioContext 持有：换 ctx 时采样率可能不同，缓存必须一并作废。 */
function noiseBuffer(ctx, len, cache){
  let buf = cache.get(len);
  if(buf) return buf;
  buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for(let i=0;i<len;i++) d[i]=(Math.random()*2-1)*(1-i/len);
  cache.set(len, buf);
  return buf;
}
/* P2-4：节点用完即断链。Chrome 会自动回收，Safari/旧版有已知回收延迟 */
function autoRelease(src, nodes){ src.onended = ()=>{ try{ src.disconnect(); for(const n of nodes) n.disconnect(); }catch(e){} }; }

export const AudioSys = {
  ctx:null, enabled:true,
  _noiseCache:new Map(),   // 长度 -> AudioBuffer（噪声波形缓存，见 noiseBuffer）
  init(){ if(!this.ctx){ try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ this.enabled=false; }
    if(this.ctx) this._noiseCache = new Map(); }   // 换 ctx 时缓存作废（采样率可能不同）
    if(this.ctx && this.ctx.state==='suspended') this.ctx.resume();
    if(this.ctx && !BGM.ctx) BGM.init(this.ctx); },
  /* 保留对象方法形式（内部转发到模块级实现），供外部与 BGM 共用同一份缓存 */
  noiseBuffer(len){ return noiseBuffer(this.ctx, len, this._noiseCache); },
  _autoRelease(src, nodes){ return autoRelease(src, nodes); },
  env(g,t0,a,d,peak){ g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(peak,t0+a); g.gain.exponentialRampToValueAtTime(0.0001,t0+a+d); },
  tone(freq,type,dur,vol,slideTo){ if(!this.enabled||!this.ctx)return; const t0=this.ctx.currentTime;
    const o=this.ctx.createOscillator(), g=this.ctx.createGain(); o.type=type; o.frequency.setValueAtTime(freq,t0);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30,slideTo),t0+dur);
    this.env(g,t0,0.005,dur,vol); o.connect(g); g.connect(this.ctx.destination); o.start(t0); o.stop(t0+dur+0.1);
    this._autoRelease(o, [g]); },
  noise(dur,vol,fc){ if(!this.enabled||!this.ctx)return; const t0=this.ctx.currentTime;
    const len=Math.floor(this.ctx.sampleRate*dur);
    const s=this.ctx.createBufferSource(); s.buffer=this.noiseBuffer(len);
    const f=this.ctx.createBiquadFilter(); f.type='bandpass'; f.frequency.value=fc||800; f.Q.value=0.8;
    const g=this.ctx.createGain(); this.env(g,t0,0.004,dur,vol);
    s.connect(f); f.connect(g); g.connect(this.ctx.destination);
    s.start(t0); s.stop(t0+dur+0.05); this._autoRelease(s, [f, g]); },
  play(name){
    if(!this.enabled) return;
    this.init();
    if(!this.ctx || this.ctx.state!=='running') return;
    switch(name){
      case 'hit1': this.noise(0.10,0.30,900);  this.tone(180,'square',0.08,0.15,90); break;
      case 'hit2': this.noise(0.14,0.38,700);  this.tone(140,'square',0.11,0.20,70); break;
      case 'hit3': this.noise(0.20,0.50,500);  this.tone(100,'sawtooth',0.18,0.28,50); break;
      case 'block': this.tone(1200,'triangle',0.06,0.12,900); this.noise(0.05,0.10,2400); break;
      case 'dash': this.noise(0.16,0.14,1600); break;
      case 'jump': this.tone(300,'sine',0.12,0.08,520); break;
      case 'ko':   this.tone(70,'sawtooth',0.9,0.5,38); this.noise(0.7,0.5,220); break;
      case 'select': this.tone(660,'square',0.06,0.10); this.tone(990,'square',0.09,0.10); break;
      case 'confirm': this.tone(523,'square',0.07,0.12); this.tone(784,'square',0.07,0.12); this.tone(1046,'square',0.12,0.14); break;
      case 'cast': this.tone(200,'sawtooth',0.25,0.18,600); break;
      case 'ult':  this.tone(90,'sawtooth',0.8,0.35,400); this.noise(0.8,0.28,300); break;
      case 'beam': this.tone(880,'sawtooth',0.35,0.16,110); this.noise(0.3,0.2,1800); break;
      case 'slam': this.noise(0.35,0.5,180); this.tone(60,'sine',0.35,0.4,35); break;
      case 'howl': this.tone(520,'sawtooth',0.3,0.10,180); break;
      case 'blackflash': this.tone(60,'square',0.5,0.4,45); this.noise(0.5,0.45,2500); this.tone(1800,'sine',0.4,0.2,100); break;
      case 'mugen': /* 无限制·茈：超重低音下滑 + 长噪声冲击 + 高频湮灭尖鸣，显著重于普通技能 */
        this.tone(48,'sawtooth',1.2,0.5,26); this.noise(1.1,0.55,220); this.tone(90,'square',0.8,0.32,38); this.tone(1600,'sine',0.55,0.18,110); break;
    }
  }
};

/* ---------------- BGM 多轨道配置 ---------------- */
// 节拍与和弦工具
const NOTE = {
  C4:261.63, Cs4:277.18, D4:293.66, Ds4:311.13, E4:329.63, F4:349.23,
  Fs4:369.99, G4:392.00, Gs4:415.30, A4:440.00, As4:466.16, Bb4:466.16, B4:493.88,
  C3:130.81, Cs3:138.59, D3:146.83, Ds3:155.56, E3:164.81, F3:174.61,
  Fs3:185.00, G3:196.00, Gs3:207.65, A3:220.00, As3:233.08, Bb3:233.08, B3:246.94,
  C2:65.41, Cs2:69.30, D2:73.42, Ds2:77.78, E2:82.41, F2:87.31,
  Fs2:92.50, G2:98.00, Gs2:103.83, A2:110.00, As2:116.54, Bb2:116.54, B2:123.47
};
const ch = (root, type) => ({ root, type, notes: type==='m'
  ? [root, root*1.2, root*1.5]
  : (type==='M' ? [root, root*1.26, root*1.5] : [root, root*1.2, root*1.5, root*1.78]) });

export const BGM = {
  ctx:null, master:null, timer:null, beat:0, playing:false, enabled:true,
  current:'fight1',
  lastSong:null, // 最近播过的歌曲（排除菜单曲），供战斗选曲去重
  tracks:{
    // 标题：慢速、神秘、略带史诗感
    title:{
      bpm:86, masterVol:0.14,
      pattern:[ch(NOTE.D3,'m'), ch(NOTE.Bb2,'M'), ch(NOTE.F3,'M'), ch(NOTE.C3,'M')],
      tick(self, t0, beat, track){
        const chord = track.pattern[Math.floor(beat/8)%track.pattern.length];
        const inBar = beat%8;
        // 低沉铺底
        if(inBar===0){
          self.note(chord.root/2, t0, 3.6, 'sine', 0.18);
          self.note(chord.notes[1], t0, 2.8, 'triangle', 0.07);
        }
        // 琶音
        if(inBar%2===0){
          const arp = chord.notes;
          self.note(arp[(inBar/2)%3]*2, t0, 0.35, 'square', 0.045);
        }
        if(inBar%4===0) self.kick(t0, 0.35);
        if(inBar%4===2) self.snare(t0, 0.16);
        self.hihat(t0, 0.06);
      }
    },
    // 选人：轻快、电子感
    select:{
      bpm:104, masterVol:0.13,
      pattern:[ch(NOTE.F3,'M'), ch(NOTE.G3,'M'), ch(NOTE.A3,'m'), ch(NOTE.C3,'M')],
      tick(self, t0, beat, track){
        const chord = track.pattern[Math.floor(beat/8)%track.pattern.length];
        const inBar = beat%8;
        if(inBar===0){
          self.note(chord.root, t0, 1.8, 'triangle', 0.12);
          self.note(chord.notes[2], t0, 1.6, 'sine', 0.08);
        }
        // 活泼琶音
        const arp = [chord.root, chord.notes[1], chord.notes[2], chord.root*2];
        self.note(arp[inBar%4]*2, t0, 0.28, 'square', 0.055);
        if(inBar%2===0) self.kick(t0, 0.30);
        if(inBar===4) self.snare(t0, 0.14);
        self.hihat(t0, 0.07);
      }
    },
    // 战斗1：热血快版，默认战斗
    fight1:{
      bpm:128, masterVol:0.16,
      pattern:[ch(NOTE.D3,'m'), ch(NOTE.Bb2,'M'), ch(NOTE.F3,'M'), ch(NOTE.C3,'M')],
      tick(self, t0, beat, track){
        const chord = track.pattern[Math.floor(beat/8)%track.pattern.length];
        const inBar = beat%8;
        if(inBar===0){
          self.note(chord.root/2, t0, 1.9, 'triangle', 0.16);
          self.note(chord.root, t0, 1.9, 'sawtooth', 0.05);
        }
        const scale=[chord.root, chord.root*1.2, chord.root*1.5, chord.root*1.6875];
        self.note(scale[inBar%4], t0, 0.42, 'square', 0.07);
        if(inBar%2===0) self.kick(t0, 0.42);
        self.hihat(t0, 0.08);
        if(inBar===4) self.kick(t0+0.25, 0.32);
      }
    },
    // 战斗2：更紧张的高速对攻
    fight2:{
      bpm:142, masterVol:0.16,
      pattern:[ch(NOTE.E3,'m'), ch(NOTE.C3,'M'), ch(NOTE.G3,'M'), ch(NOTE.B2,'m')],
      tick(self, t0, beat, track){
        const chord = track.pattern[Math.floor(beat/8)%track.pattern.length];
        const inBar = beat%8;
        if(inBar===0){
          self.note(chord.root/2, t0, 1.7, 'sawtooth', 0.14);
          self.note(chord.notes[1], t0, 1.5, 'square', 0.06);
        }
        // 急促旋律
        const scale=[chord.root, chord.root*1.12, chord.root*1.5, chord.root*1.68, chord.root*2];
        self.note(scale[inBar%5], t0, 0.32, 'square', 0.065);
        if(inBar%2===0) self.kick(t0, 0.45);
        if(inBar%2===1) self.snare(t0, 0.14);
        self.hihat(t0, 0.09);
      }
    },
    // Boss战：沉重、压迫感
    boss:{
      bpm:110, masterVol:0.17,
      pattern:[ch(NOTE.Cs3,'m'), ch(NOTE.A2,'M'), ch(NOTE.E3,'m'), ch(NOTE.B2,'m')],
      tick(self, t0, beat, track){
        const chord = track.pattern[Math.floor(beat/8)%track.pattern.length];
        const inBar = beat%8;
        // 厚重低音
        if(inBar===0){
          self.note(chord.root/2, t0, 3.2, 'sawtooth', 0.20);
          self.note(chord.root, t0, 2.4, 'square', 0.08);
        }
        if(inBar===4){
          self.note(chord.notes[1], t0, 1.2, 'sawtooth', 0.07);
        }
        // 工业感踩镲
        if(inBar%2===0) self.kick(t0, 0.50);
        if(inBar===4 || inBar===6) self.snare(t0, 0.18);
        self.hihat(t0, 0.10);
      }
    }
  },
  init(ctx){ this.ctx=ctx; this.enabled=true;
    this.master=ctx.createGain(); this.master.gain.value=0.16;
    this.master.connect(ctx.destination);
    // 预加载文件曲目，避免切曲时等待解码
    for(const name in this.fileTracks) this.loadFile(name); },
  /* ---- 文件曲目：真实音频（OGG），解码后用 BufferSource 无缝循环 ---- */
  fileTracks:{
    specialz:{ url:'audio/SPECIALZ.ogg', vol:0.35, fallback:'title' },
    aizo:    { url:'audio/aizo.ogg',     vol:0.35, fallback:'fight1' },
    yuai:    { url:'audio/yuai.ogg',     vol:0.35, fallback:'boss' }   // 专属曲：仅觉醒五条悟 vs 受肉伏黑惠宿傩播放
  },
  buffers:{}, loading:{}, fileSource:null,
  loadFile(name){
    if(!this.ctx || this.buffers[name] || this.loading[name]) return;
    this.loading[name]=true;
    fetch(this.fileTracks[name].url)
      .then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(ab=>this.ctx.decodeAudioData(ab))
      .then(buf=>{ this.buffers[name]=buf; delete this.loading[name];
        // 解码完成时若仍是当前曲目且处于播放态 → 立即开播
        if(this.playing && this.current===name && !this.fileSource) this.startFileSource(name); })
      .catch(()=>{ delete this.loading[name];
        // 加载失败 → 回退到对应合成曲目，保证不静音
        if(this.playing && this.current===name){ this.playing=false; this.playTrack(this.fileTracks[name].fallback); } });
  },
  startFileSource(name){
    const s=this.ctx.createBufferSource();
    s.buffer=this.buffers[name]; s.loop=true;
    s.connect(this.master); s.start();
    this.fileSource=s;
  },
  note(freq, t0, dur, type, vol){
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type||'sawtooth'; o.frequency.setValueAtTime(freq,t0);
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.linearRampToValueAtTime(vol||0.18, t0+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0+dur+0.05);
    autoRelease(o, [g]);
  },
  kick(t0, vol=0.5){
    const o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.frequency.setValueAtTime(140,t0); o.frequency.exponentialRampToValueAtTime(40,t0+0.12);
    g.gain.setValueAtTime(vol,t0); g.gain.exponentialRampToValueAtTime(0.001,t0+0.16);
    o.connect(g); g.connect(this.master); o.start(t0); o.stop(t0+0.18);
    autoRelease(o, [g]);
  },
  /* P1-13：复用缓存的噪声波形，每次只新建 BufferSource（原实现每次都重建 buffer）。
     与 AudioSys 共用同一个 AudioContext，故可直接复用它的波形缓存。 */
  snare(t0, vol=0.16){
    if(!this.ctx || !this.master) return;
    const dur=0.12, len=Math.floor(this.ctx.sampleRate*dur);
    const s=this.ctx.createBufferSource(); s.buffer=noiseBuffer(this.ctx, len, AudioSys._noiseCache);
    const f=this.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=1200;
    const g=this.ctx.createGain(); g.gain.value=vol;
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t0); s.stop(t0+dur+0.05); autoRelease(s, [f, g]);
  },
  hihat(t0, vol=0.12){
    if(!this.ctx || !this.master) return;
    const dur=0.04, len=Math.floor(this.ctx.sampleRate*dur);
    const s=this.ctx.createBufferSource(); s.buffer=noiseBuffer(this.ctx, len, AudioSys._noiseCache);
    const f=this.ctx.createBiquadFilter(); f.type='highpass'; f.frequency.value=6000;
    const g=this.ctx.createGain(); g.gain.value=vol;
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t0); s.stop(t0+dur+0.05); autoRelease(s, [f, g]);
  },
  tick(){
    if(!this.playing||!this.ctx) return;
    const track = this.tracks[this.current];
    if(!track) return;
    const t0=this.ctx.currentTime+0.05;
    /* 音序器跑在 setInterval 上：任一拍抛错若冒泡出去，不仅当拍的鼓组全丢，
       this.beat++ 也会跳过，音轨会永久停在第一拍反复重播同一小节。
       这里就地隔离并计数熔断，保证节拍至少持续推进、错误可见。 */
    try {
      track.tick(this, t0, this.beat, track);
    } catch(err){
      this.tickErrors = (this.tickErrors||0) + 1;
      if(this.tickErrors <= 3) console.error(`[bgm] 音轨 ${this.current} 第 ${this.beat} 拍播放失败：`, err);
      if(this.tickErrors >= 60){ this.stop(); console.error(`[bgm] 连续 60 拍失败，已停止音轨 ${this.current}`); return; }
    }
    this.beat++;
  },
  playTrack(name){
    if(!this.enabled) return;
    if(!this.tracks[name] && !this.fileTracks[name]) name='fight1';
    if(this.playing && this.current===name) return;
    this.stop();
    this.current=name;
    AudioSys.init();
    if(!this.ctx){ if(AudioSys.ctx) this.init(AudioSys.ctx); else return; }
    if(this.ctx.state==='suspended') this.ctx.resume();
    this.playing=true; this.beat=0; this.tickErrors=0;
    if(name!=='select') this.lastSong=name;
    // 文件曲目：已解码则直接循环播放，否则异步加载完成后自动开播
    if(this.fileTracks[name]){
      this.master.gain.value=this.fileTracks[name].vol;
      if(this.buffers[name]) this.startFileSource(name);
      else this.loadFile(name);
      return;
    }
    const track=this.tracks[name];
    if(this.master) this.master.gain.value=track.masterVol;
    const interval=60000/track.bpm/4; // 16分音符间隔
    this.timer=setInterval(()=>this.tick(), interval);
  },
  start(){ this.playTrack('fight1'); },
  stop(){
    this.playing=false;
    if(this.timer){ clearInterval(this.timer); this.timer=null; }
    if(this.fileSource){ try{ this.fileSource.stop(); }catch(e){} this.fileSource=null; }
  },
  setEnabled(on){
    this.enabled=on;
    if(!on) this.stop();
    else if(typeof Game!=='undefined' && Game.scene==='fight') this.playTrack('fight1');
  },
  restoreVol(){
    if(!this.master) return;
    if(this.fileTracks[this.current] && this.buffers[this.current])
      this.master.gain.value=this.fileTracks[this.current].vol;
    else if(this.tracks[this.current])
      this.master.gain.value=this.tracks[this.current].masterVol;
    else
      this.master.gain.value=0.16;
  }
};
