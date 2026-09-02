/* =====================================================================
   特效系统：粒子、震屏、顿帧、缩放、文字、斩击、光柱
   ===================================================================== */
import { VW, VH, GROUND } from './config.js';
import { rand, lerp } from './utils.js';

/* 粒子硬上限（P2-1）：单次大招可连喷约 100 个粒子，叠加后峰值可达数百。
   在入口截断，而不是先膨胀再淘汰，避免帧时间抖动。 */
const PART_CAP = 800;

/* 原地压缩：一次遍历完成"推进 + 回收"（O(n)）。
   原实现逐个倒序 splice，批量到期时接近 O(n²)（500 粒子集中过期约 12 万次元素搬移/帧）。
   约定：fn 负责推进元素状态并返回它是否存活。 */
function compact(arr, fn){
  let w = 0;
  for(let i=0;i<arr.length;i++){ if(fn(arr[i])) arr[w++] = arr[i]; }
  arr.length = w;
}

export const FX = {
  parts:[], rings:[], texts:[], slashes:[], flashes:[], pillars:[], cracks:[], lightnings:[],
  shake:0, shakeX:0, shakeY:0, hitstop:0, zoom:0, zoomX:VW/2, zoomY:VH/2,
  reset(){ this.parts.length=0; this.rings.length=0; this.texts.length=0; this.slashes.length=0; this.flashes.length=0; this.pillars.length=0; this.cracks.length=0; this.lightnings.length=0;
    this.shake=0; this.hitstop=0; this.zoom=0; },
  burst(x,y,color,n,spd,life,size,grav){
    const room = PART_CAP - this.parts.length;   // P2-1：超出上限直接丢弃新粒子
    if(room <= 0) return;
    if(n > room) n = room;
    for(let i=0;i<n;i++){ const a=rand(0,Math.PI*2), s=rand(spd*0.3,spd);
    this.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-(grav?rand(1,3):0),life:rand(life*0.5,life),maxLife:life,color,size:rand(size*0.5,size*1.4),grav:grav?0.25:0}); } },
  spark(x,y,color){ this.burst(x,y,color,14,7,26,4); },
  ring(x,y,color,maxR,w){ this.rings.push({x,y,r:8,maxR,color,w:w||5,life:22,maxLife:22}); },
  slash(x,y,ang,color,len){ this.slashes.push({x,y,ang,color,len:len||90,life:12,maxLife:12}); },
  flash(color,alpha,life){ this.flashes.push({color,alpha,life,maxLife:life}); },
  pillar(x,color,w,h){ this.pillars.push({x,color,w,h,life:20,maxLife:20}); },
  text(x,y,str,color,size){ this.texts.push({x,y,str,color,size:size||26,vy:-1.4,life:55,maxLife:55}); },
  addShake(v){ this.shake = Math.min(28, this.shake + v); },
  addHitstop(f){ this.hitstop = Math.max(this.hitstop, f); },
  addZoom(v,x,y){ this.zoom=Math.max(this.zoom,v); this.zoomX=x; this.zoomY=y; },

  /* 空间裂纹：从中心点放射出键齿状裂纹线 */
  crack(x, y, color, branches, maxLen){
    branches = branches || 5;
    maxLen = maxLen || 120;
    const segs = [];
    for(let b=0; b<branches; b++){
      const ang = rand(0, Math.PI*2);
      const pts = [{x, y}];
      let cx=x, cy=y, ca=ang;
      const n = 4 + Math.floor(rand(0,3));
      for(let i=0;i<n;i++){
        ca += rand(-0.6, 0.6);
        const step = maxLen / n * rand(0.6, 1.2);
        cx += Math.cos(ca)*step;
        cy += Math.sin(ca)*step;
        pts.push({x:cx, y:cy});
      }
      segs.push(pts);
    }
    this.cracks.push({segs, color, life:28, maxLife:28});
  },

  /* 灵魂碎片：向上飘散的发光碎片粒子 */
  soulFragments(x, y, n, color){
    color = color || '#c8e8ff';
    const room = PART_CAP - this.parts.length;   // P2-1：同样受硬上限约束
    if(room <= 0) return;
    if(n > room) n = room;
    for(let i=0;i<n;i++){
      this.parts.push({
        x: x + rand(-40, 40), y: y + rand(-30, 30),
        vx: rand(-2, 2), vy: rand(-4.5, -1.5),
        life: rand(24, 48), maxLife: 48,
        color: i%3===0 ? '#ffffff' : color,
        size: rand(1.5, 4), grav: -0.03
      });
    }
  },

  /* 闪电弧线：两点之间的键齿状闪电 */
  lightning(x1, y1, x2, y2, color, segments){
    segments = segments || 6;
    const pts = [{x:x1, y:y1}];
    for(let i=1;i<segments;i++){
      const t = i/segments;
      pts.push({
        x: lerp(x1, x2, t) + rand(-18, 18),
        y: lerp(y1, y2, t) + rand(-18, 18)
      });
    }
    pts.push({x:x2, y:y2});
    this.lightnings.push({pts, color, life:14, maxLife:14});
  },
  update(){
    /* P2-1：全部改为原地压缩，元素搬移从 O(n²) 降到 O(n) */
    compact(this.parts, p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=p.grav; p.vx*=0.96; p.life--; return p.life>0; });
    compact(this.rings, r=>{ r.r = lerp(r.maxR, 8, r.life/r.maxLife); r.life--; return r.life>0; });
    compact(this.texts, t=>{ t.y+=t.vy; t.life--; return t.life>0; });
    compact(this.slashes, s=>{ s.life--; return s.life>0; });
    compact(this.flashes, f=>{ f.life--; return f.life>0; });
    compact(this.pillars, p=>{ p.life--; return p.life>0; });
    compact(this.cracks, c=>{ c.life--; return c.life>0; });
    compact(this.lightnings, l=>{ l.life--; return l.life>0; });
    this.shake *= 0.86; if(this.shake<0.3) this.shake=0;
    this.shakeX = rand(-this.shake,this.shake); this.shakeY = rand(-this.shake,this.shake);
    this.zoom *= 0.9; if(this.zoom<0.01) this.zoom=0;
    if(this.hitstop>0) this.hitstop--;
  },
  draw(g){
    for(const p of this.parts){ const a=p.life/p.maxLife;
      g.globalAlpha=a; g.fillStyle=p.color;
      g.beginPath(); g.arc(p.x,p.y,p.size*a+0.5,0,Math.PI*2); g.fill(); }
    for(const r of this.rings){ const a=r.life/r.maxLife;
      g.globalAlpha=a*0.9; g.strokeStyle=r.color; g.lineWidth=r.w*a+1;
      g.beginPath(); g.arc(r.x,r.y,r.r,0,Math.PI*2); g.stroke(); }
    for(const p of this.pillars){ const a=p.life/p.maxLife;
      const gr=g.createLinearGradient(p.x,GROUND,p.x,GROUND-p.h*a);
      gr.addColorStop(0,p.color); gr.addColorStop(1,'rgba(255,255,255,0)');
      g.globalAlpha=a*0.85; g.fillStyle=gr;
      g.fillRect(p.x-p.w/2*(1.2-a), GROUND-p.h*a, p.w*(1.2-a), p.h*a); }
    for(const s of this.slashes){ const a=s.life/s.maxLife;
      g.globalAlpha=a; g.strokeStyle=s.color; g.lineWidth=5*a+1; g.lineCap='round';
      const dx=Math.cos(s.ang)*s.len/2, dy=Math.sin(s.ang)*s.len/2;
      g.beginPath(); g.moveTo(s.x-dx,s.y-dy); g.lineTo(s.x+dx,s.y+dy); g.stroke();
      g.strokeStyle='#fff'; g.lineWidth=2*a;
      g.beginPath(); g.moveTo(s.x-dx*0.7,s.y-dy*0.7); g.lineTo(s.x+dx*0.7,s.y+dy*0.7); g.stroke(); }
    /* 空间裂纹绘制 */
    for(const c of this.cracks){ const a=c.life/c.maxLife;
      g.globalAlpha=a*0.9; g.strokeStyle=c.color; g.lineWidth=2.5*a+0.5; g.lineCap='round';
      for(const seg of c.segs){
        g.beginPath(); g.moveTo(seg[0].x, seg[0].y);
        for(let i=1;i<seg.length;i++) g.lineTo(seg[i].x, seg[i].y);
        g.stroke();
      }
      g.globalAlpha=a*0.4; g.strokeStyle='#fff'; g.lineWidth=1;
      for(const seg of c.segs){
        g.beginPath(); g.moveTo(seg[0].x, seg[0].y);
        for(let i=1;i<seg.length;i++) g.lineTo(seg[i].x, seg[i].y);
        g.stroke();
      }
    }
    /* 闪电弧线绘制 */
    for(const l of this.lightnings){ const a=l.life/l.maxLife;
      g.globalAlpha=a; g.strokeStyle=l.color; g.lineWidth=3*a+1; g.lineCap='round'; g.lineJoin='round';
      g.beginPath(); g.moveTo(l.pts[0].x, l.pts[0].y);
      for(let i=1;i<l.pts.length;i++) g.lineTo(l.pts[i].x, l.pts[i].y);
      g.stroke();
      g.globalAlpha=a*0.5; g.strokeStyle='#fff'; g.lineWidth=1.5*a;
      g.beginPath(); g.moveTo(l.pts[0].x, l.pts[0].y);
      for(let i=1;i<l.pts.length;i++) g.lineTo(l.pts[i].x, l.pts[i].y);
      g.stroke();
    }
    g.globalAlpha=1;
    for(const t of this.texts){ const a=Math.min(1,t.life/20);
      g.globalAlpha=a; g.font=`900 ${t.size}px "Microsoft YaHei"`; g.textAlign='center';
      g.strokeStyle='rgba(0,0,0,0.8)'; g.lineWidth=4; g.strokeText(t.str,t.x,t.y);
      g.fillStyle=t.color; g.fillText(t.str,t.x,t.y); }
    g.globalAlpha=1;
  },
  drawFlashes(g){
    for(const f of this.flashes){ const a=(f.life/f.maxLife)*f.alpha;
      g.globalAlpha=a; g.fillStyle=f.color; g.fillRect(-60,-60,VW+120,VH+120); }
    g.globalAlpha=1;
  }
};
