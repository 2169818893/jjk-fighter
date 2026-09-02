/* =====================================================================
   选人界面用立绘（数据驱动轻量人偶）
   ===================================================================== */

export function drawPortrait(g, c, t) {
    // t 为毫秒时间戳，使用较小系数避免选人/Versus 画面呼吸动画抖动
    const bob = Math.sin(t * 0.002) * 3;
    g.translate(0, bob);
    // 光环
    const grd = g.createRadialGradient(0, -70, 10, 0, -70, 110);
    grd.addColorStop(0, c.aura + '0.22)');
    grd.addColorStop(1, c.aura + '0)');
    g.fillStyle = grd;
    g.beginPath();
    g.arc(0, -70, 110, 0, Math.PI * 2);
    g.fill();
    if (c.style === 'toji' || c.style === 'ryu') {
        // 甚尔/石流龙：专属腿线由上方风格块统一绘制，此处跳过默认腿线
    } else {
        // 腿（从躯干下方 y=-50 自然伸出）
        g.lineCap = 'round';
        g.strokeStyle = c.legColor || c.clothSub;
        g.lineWidth = 13;
        g.beginPath();
        g.moveTo(-6, -50);
        g.lineTo(-10, 0);
        g.stroke();
        g.beginPath();
        g.moveTo(6, -50);
        g.lineTo(12, 0);
        g.stroke();
        g.fillStyle = c.shoeColor || '#0c0f18';
        g.beginPath();
        g.ellipse(-11, 0, 9, 5, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(13, 0, 9, 5, 0, 0, Math.PI * 2);
        g.fill();
    }
    // 躯干
    g.fillStyle = c.cloth;
    g.beginPath();
    g.moveTo(-20, -110);
    g.quadraticCurveTo(0, -118, 20, -110);
    g.lineTo(16, -50);
    g.quadraticCurveTo(0, -44, -16, -50);
    g.closePath();
    g.fill();
    // 领口（五条/伏黑的高立领全覆盖领口，宿傩真身裸上身，真人宽松圆领，陀艮海兽躯体，均跳过通用亮色 V 线避免外露）
    if (c.id !== 'gojo' && c.id !== 'gojo2' && c.id !== 'megumi' && c.id !== 'megumi2' && c.id !== 'sukuna' && c.id !== 'sukunaMegumi' && c.id !== 'mahito' && c.id !== 'dagon') {
        g.strokeStyle = c.accent;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-14, -106);
        g.lineTo(0, -86);
        g.lineTo(14, -106);
        g.stroke();
    }
    if (c.style === 'ocean') {
        // 陀艮：深红粗壮躯干——鞭状尾巴 + 大黑色胸甲 + 米色腹板 + 肩颈鳍褶（与战斗中一致）
        const at2 = t * 0.06;
        // 鞭状尾巴（从腰后延伸，向右下弯曲，摆动）
        const tailSw = Math.sin(at2 * 0.05) * 6;
        g.strokeStyle = c.skin;
        g.lineCap = 'round'; g.lineWidth = 4;
        g.beginPath();
        g.moveTo(8, -50);
        g.quadraticCurveTo(18 + tailSw * 0.5, -42, 26 + tailSw, -32);
        g.quadraticCurveTo(32 + tailSw * 1.5, -22, 34 + tailSw * 2, -8);
        g.stroke();
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(34 + tailSw * 2, -8);
        g.quadraticCurveTo(36 + tailSw * 2.5, 0, 36 + tailSw * 3, 8);
        g.stroke();
        g.lineCap = 'butt';
        // 大黑色胸甲覆盖层
        g.fillStyle = c.cloth;
        g.beginPath();
        g.moveTo(-20, -110);
        g.quadraticCurveTo(0, -116, 20, -110);
        g.lineTo(18, -78);
        g.quadraticCurveTo(0, -72, -18, -78);
        g.closePath();
        g.fill();
        // 胸甲肌肉纹理
        g.strokeStyle = 'rgba(50,50,60,0.7)'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(-14, -104); g.quadraticCurveTo(0, -98, 14, -104); g.stroke();
        g.beginPath(); g.moveTo(-10, -94); g.quadraticCurveTo(0, -88, 10, -94); g.stroke();
        g.beginPath(); g.moveTo(0, -108); g.lineTo(0, -80); g.stroke();
        // 米色腹板
        g.fillStyle = c.fin;
        g.beginPath();
        g.moveTo(-10, -76); g.quadraticCurveTo(0, -78, 10, -76);
        g.lineTo(8, -50); g.quadraticCurveTo(0, -48, -8, -50);
        g.closePath(); g.fill();
        // 腹板横纹
        g.strokeStyle = 'rgba(100,70,40,0.4)'; g.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const ly = -70 + i * 8;
            g.beginPath(); g.moveTo(-6, ly); g.quadraticCurveTo(0, ly + 2, 6, ly); g.stroke();
        }
        // 肩颈鳍褶
        const fb = Math.sin(at2 * 0.08) * 1.6;
        g.fillStyle = c.fin;
        g.beginPath(); g.moveTo(-18, -106);
        g.quadraticCurveTo(-28 - fb, -114, -30 - fb, -102);
        g.quadraticCurveTo(-22, -98, -18, -100);
        g.closePath(); g.fill();
        g.beginPath(); g.moveTo(18, -106);
        g.quadraticCurveTo(28 + fb, -114, 30 + fb, -102);
        g.quadraticCurveTo(22, -98, 18, -100);
        g.closePath(); g.fill();
        // 水光流纹
        g.strokeStyle = 'rgba(89,200,232,' + (0.3 + Math.sin(at2 * 0.09) * 0.12).toFixed(3) + ')';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-14, -88); g.quadraticCurveTo(-8, -82 + Math.sin(at2 * 0.06) * 2, -12, -66); g.stroke();
        g.beginPath(); g.moveTo(14, -92); g.quadraticCurveTo(9, -84 + Math.sin(at2 * 0.06 + 1.5) * 2, 13, -70); g.stroke();
        // 腰间深色束带
        g.fillStyle = c.deep; g.fillRect(-16, -54, 32, 6);
        g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1; g.strokeRect(-16, -54, 32, 6);
        // 绷带腿缠绕纹理
        g.strokeStyle = 'rgba(160,120,70,0.5)'; g.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const ty = -44 + i * 10;
            g.beginPath(); g.moveTo(-8, ty); g.lineTo(-4, ty + 1); g.stroke();
            g.beginPath(); g.moveTo(8, ty); g.lineTo(4, ty + 1); g.stroke();
        }
    }
    if (c.id === 'uro') {
        // 乌鹭亨子：黑革项圈 + 背心吊带扣带 + 衣褶 + 绯红裤腰
        g.strokeStyle = '#14161c';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(-10, -113);
        g.quadraticCurveTo(0, -108, 10, -113);
        g.stroke();
        g.fillStyle = '#d8dce4';
        g.beginPath();
        g.arc(0, -109.5, 1.3, 0, Math.PI * 2);
        g.fill();
        // 双肩吊带扣带
        g.strokeStyle = '#d0b4c2';
        g.lineWidth = 3.5;
        g.beginPath();
        g.moveTo(-15, -109);
        g.quadraticCurveTo(-11, -90, -8, -72);
        g.stroke();
        g.beginPath();
        g.moveTo(15, -109);
        g.quadraticCurveTo(11, -90, 8, -72);
        g.stroke();
        // 吊带金属扣件
        g.fillStyle = '#8a7078';
        g.fillRect(-12.6, -92, 3.4, 4.4);
        g.fillRect(9.2, -92, 3.4, 4.4);
        // 背心衣褶
        g.strokeStyle = 'rgba(150,110,130,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-7, -82);
        g.quadraticCurveTo(-1, -78, 4, -80);
        g.stroke();
        g.beginPath();
        g.moveTo(-6, -68);
        g.quadraticCurveTo(1, -64, 7, -67);
        g.stroke();
        // 绯红裤腰
        g.fillStyle = c.clothSub || '#a8324e';
        g.beginPath();
        g.moveTo(-16.5, -57);
        g.lineTo(16.5, -57);
        g.lineTo(16, -50);
        g.quadraticCurveTo(0, -44, -16, -50);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-14, -53.5);
        g.lineTo(14, -53.5);
        g.stroke();
    }
    if (c.id === 'druv') {
        // 杜鲁夫：苍白垂帘披布 + 锁骨肋骨嶙峋的枯瘦老躯 + 暗色缠腰
        // 肩两侧苍白垂帘披布（不跨躯干中部）
        g.fillStyle = '#d8d0c0';
        g.beginPath();
        g.moveTo(-19, -109);
        g.quadraticCurveTo(-30, -84, -26, -54);
        g.lineTo(-19, -56);
        g.quadraticCurveTo(-22, -82, -16, -106);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(19, -109);
        g.quadraticCurveTo(30, -84, 26, -54);
        g.lineTo(19, -56);
        g.quadraticCurveTo(22, -82, 16, -106);
        g.closePath();
        g.fill();
        // 垂帘折痕暗线
        g.strokeStyle = 'rgba(120,106,88,0.5)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-22, -100);
        g.quadraticCurveTo(-27, -80, -24, -58);
        g.stroke();
        g.beginPath();
        g.moveTo(22, -100);
        g.quadraticCurveTo(27, -80, 24, -58);
        g.stroke();
        // 锁骨（枯瘦凸显）
        g.strokeStyle = 'rgba(60,40,24,0.55)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-13, -101);
        g.quadraticCurveTo(-6, -97, -1, -99);
        g.stroke();
        g.beginPath();
        g.moveTo(13, -101);
        g.quadraticCurveTo(6, -97, 1, -99);
        g.stroke();
        // 胸骨中线与两侧肋骨纹（嶙峋老躯）
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -95);
        g.lineTo(0, -72);
        g.stroke();
        for (let i = 0; i < 3; i++) {
            const ry = -87 + i * 7.5;
            g.beginPath();
            g.moveTo(-13, ry);
            g.quadraticCurveTo(-6, ry + 3.5, -2, ry + 2);
            g.stroke();
            g.beginPath();
            g.moveTo(13, ry);
            g.quadraticCurveTo(6, ry + 3.5, 2, ry + 2);
            g.stroke();
        }
        // 内缩腹部阴影（枯瘦凹陷）
        g.strokeStyle = 'rgba(60,40,24,0.4)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-8, -66);
        g.quadraticCurveTo(0, -63, 8, -66);
        g.stroke();
        // 暗色缠腰布
        g.fillStyle = c.clothSub || '#2e2620';
        g.beginPath();
        g.moveTo(-16.5, -57);
        g.lineTo(16.5, -57);
        g.lineTo(16, -50);
        g.quadraticCurveTo(0, -44, -16, -50);
        g.closePath();
        g.fill();
        // 缠腰布束带线
        g.strokeStyle = 'rgba(200,190,170,0.4)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-14, -53.5);
        g.lineTo(14, -53.5);
        g.stroke();
    }
    if (c.id === 'kuro') {
        // 黑沐死：黑色垂布宽罩躯体（底缘撕裂）+ 背后细长暗紫触肢
        // 背后六根细长触肢（先画在罩下层，弧形外伸）
        g.strokeStyle = '#3c1828';
        g.lineCap = 'round';
        for (let s = -1; s <= 1; s += 2) {
            g.lineWidth = 2.4;
            g.beginPath();
            g.moveTo(s * 10, -102);
            g.quadraticCurveTo(s * 36, -116, s * 47, -90);
            g.stroke();
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(s * 12, -88);
            g.quadraticCurveTo(s * 42, -94, s * 51, -66);
            g.stroke();
            g.lineWidth = 1.7;
            g.beginPath();
            g.moveTo(s * 12, -74);
            g.quadraticCurveTo(s * 40, -70, s * 46, -46);
            g.stroke();
        }
        g.lineCap = 'butt';
        // 黑色垂布宽罩（自肩披至腰下，下缘撕裂锯齿）
        g.fillStyle = c.cloth || '#1a1512';
        g.beginPath();
        g.moveTo(-17, -110);
        g.quadraticCurveTo(-28, -84, -25, -50);
        g.lineTo(-19, -44);
        g.lineTo(-13, -51);
        g.lineTo(-7, -43);
        g.lineTo(-1, -51);
        g.lineTo(5, -43);
        g.lineTo(11, -50);
        g.lineTo(18, -44);
        g.lineTo(25, -50);
        g.quadraticCurveTo(28, -84, 17, -110);
        g.quadraticCurveTo(0, -116, -17, -110);
        g.closePath();
        g.fill();
        // 罩面垂坠折痕（腐橙微光线）
        g.strokeStyle = 'rgba(224,134,46,0.20)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-12, -102);
        g.quadraticCurveTo(-15, -78, -13, -52);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -106);
        g.lineTo(0, -54);
        g.stroke();
        g.beginPath();
        g.moveTo(12, -102);
        g.quadraticCurveTo(15, -78, 13, -52);
        g.stroke();
        // 罩身横向暗缝板块线
        g.strokeStyle = 'rgba(14,11,9,0.85)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-24, -80);
        g.quadraticCurveTo(0, -73, 24, -80);
        g.stroke();
        // 胸前腐蚀橙斑点（罩下虫巢微光）
        g.fillStyle = 'rgba(224,134,46,0.5)';
        g.beginPath();
        g.arc(-6, -92, 1.4, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(7, -85, 1.2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(-2, -66, 1.3, 0, Math.PI * 2);
        g.fill();
    }
    if (c.style === 'suit') {
        // 七海：蓝色衬衫V领 + 橄榄绿波点领带 + 米色西装翻领
        // 蓝色衬衫领口（V形内衬）
        g.fillStyle = c.shirtColor || '#4a6a9a';
        g.beginPath();
        g.moveTo(-8, -106);
        g.lineTo(0, -88);
        g.lineTo(8, -106);
        g.lineTo(6, -54);
        g.lineTo(-6, -54);
        g.closePath();
        g.fill();
        // 西装翻领线（深米色）
        g.strokeStyle = c.clothSub || '#c8c0a8';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-10, -108); g.quadraticCurveTo(-4, -96, 0, -88);
        g.stroke();
        g.beginPath();
        g.moveTo(10, -108); g.quadraticCurveTo(4, -96, 0, -88);
        g.stroke();
        // 橄榄绿领带
        g.fillStyle = c.tieColor || '#5a6a3a';
        g.beginPath();
        g.moveTo(0, -98);
        g.lineTo(4, -88);
        g.lineTo(2, -54);
        g.lineTo(-2, -54);
        g.lineTo(-4, -88);
        g.closePath();
        g.fill();
        // 领带黑色波点
        g.fillStyle = c.tieSpot || '#1a1a14';
        g.beginPath(); g.arc(0, -90, 1, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(1, -78, 1.2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(-1, -66, 1, 0, Math.PI * 2); g.fill();
    }
    if (c.style === 'toji') {
        // 甚尔：黑色圆领T恤 + 胸肌/腹肌立体线 + 紫褐色大念珠 + 灰色束脚裤
        // 黑色T恤领口
        g.strokeStyle = 'rgba(0,0,0,0.45)';
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(-13, -108);
        g.quadraticCurveTo(0, -99, 13, -108);
        g.stroke();
        // 领口内衬亮线
        g.strokeStyle = 'rgba(154,168,184,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-11, -107);
        g.quadraticCurveTo(0, -98.5, 11, -107);
        g.stroke();
        // 胸肌沟与下缘
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(0, -98);
        g.lineTo(0, -84);
        g.stroke();
        g.beginPath();
        g.moveTo(-14, -88);
        g.quadraticCurveTo(-7, -83, -1, -86);
        g.stroke();
        g.beginPath();
        g.moveTo(14, -88);
        g.quadraticCurveTo(7, -83, 1, -86);
        g.stroke();
        // 腹肌节理
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(0, -82);
        g.lineTo(0, -58);
        g.stroke();
        g.beginPath();
        g.moveTo(-9, -76);
        g.lineTo(9, -76);
        g.stroke();
        g.beginPath();
        g.moveTo(-8, -67);
        g.lineTo(8, -67);
        g.stroke();
        // 贴身衣料反光
        g.strokeStyle = 'rgba(200,212,232,0.18)';
        g.lineWidth = 2.6;
        g.beginPath();
        g.moveTo(-11, -102);
        g.quadraticCurveTo(-16, -86, -12, -68);
        g.stroke();
        // 紫褐色大念珠（颈间粗大串珠，胸前垂下）
        g.strokeStyle = c.beadColor || '#5a3a52';
        g.lineWidth = 7;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-15, -112);
        g.quadraticCurveTo(-18, -100, -10, -92);
        g.quadraticCurveTo(0, -84, 10, -92);
        g.quadraticCurveTo(18, -100, 15, -112);
        g.stroke();
        // 珠子暗面
        g.strokeStyle = c.beadDark || '#3a2436';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(-15, -112);
        g.quadraticCurveTo(-18, -100, -10, -92);
        g.stroke();
        // 胸前垂下的念珠
        g.strokeStyle = c.beadColor || '#5a3a52';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(0, -86);
        g.quadraticCurveTo(4, -74, 2, -62);
        g.stroke();
        g.strokeStyle = c.beadDark || '#3a2436';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, -86);
        g.quadraticCurveTo(4, -74, 2, -62);
        g.stroke();
        // 灰色束脚裤（宽松裤腿，脚踝收紧）
        g.fillStyle = c.pants || '#c0c4c8';
        g.beginPath();
        g.moveTo(-16, -50);
        g.lineTo(16, -50);
        g.lineTo(20, -6);
        g.quadraticCurveTo(0, -2, -20, -6);
        g.closePath();
        g.fill();
        // 裤腿阴影
        g.strokeStyle = c.pantsShadow || '#9a9ea4';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-10, -50);
        g.quadraticCurveTo(-12, -28, -8, -8);
        g.stroke();
        g.beginPath();
        g.moveTo(10, -50);
        g.quadraticCurveTo(12, -28, 8, -8);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -50);
        g.lineTo(0, -6);
        g.stroke();
        // 裤脚束口
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-18, -10);
        g.quadraticCurveTo(0, -6, 18, -10);
        g.stroke();
        // 黑色便鞋
        g.fillStyle = c.shoeColor || '#1a1c20';
        g.beginPath();
        g.ellipse(-11, 0, 9, 5, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(13, 0, 9, 5, 0, 0, Math.PI * 2);
        g.fill();
    }
    if (c.style === 'ryu') {
        // 石流龙：宽肩黑色开襟大衣 + 厚白毛领 + 强立体胸腹肌
        g.fillStyle = 'rgba(32,36,44,0.9)';
        g.beginPath();
        g.moveTo(-25, -108);
        g.quadraticCurveTo(-29, -118, -23, -100);
        g.quadraticCurveTo(0, -91, 23, -100);
        g.quadraticCurveTo(29, -118, 25, -108);
        g.closePath(); g.fill();
        g.fillStyle = c.collar || '#f0ece4';
        g.beginPath();
        g.moveTo(-22, -108);
        g.quadraticCurveTo(-28, -119, -21, -103);
        g.quadraticCurveTo(-12, -96, 0, -97);
        g.quadraticCurveTo(12, -96, 21, -103);
        g.quadraticCurveTo(28, -119, 22, -108);
        g.quadraticCurveTo(17, -113, 13, -107);
        g.quadraticCurveTo(0, -101, -13, -107);
        g.quadraticCurveTo(-17, -113, -22, -108);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.62)';
        g.lineWidth = 1.15;
        for (let i = -18; i <= 18; i += 4) {
            g.beginPath();
            g.moveTo(i, -106 + Math.abs(i) * 0.08);
            g.lineTo(i + (i < 0 ? -2 : 2), -99 + Math.abs(i) * 0.06);
            g.stroke();
        }
        g.fillStyle = c.cloth || '#181c22';
        g.beginPath();
        g.moveTo(-25, -109);
        g.quadraticCurveTo(0, -120, 25, -109);
        g.lineTo(29, -52);
        g.quadraticCurveTo(0, -42, -29, -52);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(106,128,156,0.46)';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(-24, -108); g.quadraticCurveTo(-16, -115, -7, -114); g.stroke();
        g.beginPath(); g.moveTo(24, -108); g.quadraticCurveTo(16, -115, 7, -114); g.stroke();
        g.fillStyle = c.clothSub || '#0f1116';
        g.beginPath();
        g.moveTo(-9, -109); g.lineTo(9, -109); g.lineTo(13, -52);
        g.quadraticCurveTo(0, -47, -13, -52); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(204,212,226,0.32)';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-9, -109); g.lineTo(-13, -52); g.stroke();
        g.beginPath(); g.moveTo(9, -109); g.lineTo(13, -52); g.stroke();
        g.fillStyle = c.skin;
        g.beginPath();
        g.moveTo(-14, -108); g.lineTo(14, -108); g.lineTo(12, -56);
        g.quadraticCurveTo(0, -51, -12, -56); g.closePath(); g.fill();
        g.fillStyle = 'rgba(255,224,184,0.14)';
        g.beginPath(); g.ellipse(-6, -96, 6.8, 4.3, -0.1, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(6, -96, 6.8, 4.3, 0.1, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.beginPath(); g.ellipse(-7, -96, 6.5, 4.2, -0.1, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(7, -96, 6.5, 4.2, 0.1, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(48,25,19,0.5)';
        g.lineWidth = 1.7;
        g.beginPath(); g.moveTo(0, -105); g.lineTo(0, -87); g.stroke();
        g.beginPath(); g.moveTo(-13, -92); g.quadraticCurveTo(-6, -85, -1, -88); g.stroke();
        g.beginPath(); g.moveTo(13, -92); g.quadraticCurveTo(6, -85, 1, -88); g.stroke();
        g.lineWidth = 1.35;
        g.beginPath(); g.moveTo(0, -84); g.lineTo(0, -59); g.stroke();
        g.beginPath(); g.moveTo(-9, -78); g.quadraticCurveTo(0, -75, 9, -78); g.stroke();
        g.beginPath(); g.moveTo(-8, -69); g.quadraticCurveTo(0, -67, 8, -69); g.stroke();
        g.strokeStyle = c.pendant || '#d8c8a8';
        g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-12, -105); g.quadraticCurveTo(0, -91, 12, -105); g.stroke();
        g.fillStyle = c.pendant || '#d8c8a8';
        g.beginPath(); g.moveTo(0, -90); g.lineTo(-3.4, -82); g.lineTo(0, -69); g.lineTo(3.4, -82); g.closePath(); g.fill();
        g.fillStyle = 'rgba(126,190,255,0.72)';
        g.beginPath(); g.arc(-0.9, -84, 1, 0, Math.PI * 2); g.fill();
        // 黑色长裤（修身）
        g.fillStyle = c.pants || '#1a1c22';
        g.beginPath();
        g.moveTo(-15, -50);
        g.lineTo(15, -50);
        g.lineTo(18, -4);
        g.quadraticCurveTo(0, 0, -18, -4);
        g.closePath();
        g.fill();
        // 裤缝与褶皱
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-9, -50); g.lineTo(-10, -6); g.stroke();
        g.beginPath();
        g.moveTo(9, -50); g.lineTo(10, -6); g.stroke();
        g.beginPath();
        g.moveTo(0, -50); g.lineTo(0, -6); g.stroke();
        // 黑色皮鞋
        g.fillStyle = c.shoeColor || '#101216';
        g.beginPath();
        g.ellipse(-11, 0, 9, 5, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(13, 0, 9, 5, 0, 0, Math.PI * 2);
        g.fill();
    }
    if (c.style === 'muscular') {
        // 甚尔紧身衣：圆领口 + 胸肌腹肌立体线 + 斜挎咒具挂带
        g.strokeStyle = 'rgba(0,0,0,0.45)';
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(-13, -108);
        g.quadraticCurveTo(0, -99, 13, -108);
        g.stroke();
        g.strokeStyle = 'rgba(154,168,184,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-11, -107);
        g.quadraticCurveTo(0, -98.5, 11, -107);
        g.stroke();
        // 胸肌沟与下缘
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(0, -98);
        g.lineTo(0, -84);
        g.stroke();
        g.beginPath();
        g.moveTo(-14, -88);
        g.quadraticCurveTo(-7, -83, -1, -86);
        g.stroke();
        g.beginPath();
        g.moveTo(14, -88);
        g.quadraticCurveTo(7, -83, 1, -86);
        g.stroke();
        // 腹肌节理
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(0, -82);
        g.lineTo(0, -58);
        g.stroke();
        g.beginPath();
        g.moveTo(-9, -76);
        g.lineTo(9, -76);
        g.stroke();
        g.beginPath();
        g.moveTo(-8, -67);
        g.lineTo(8, -67);
        g.stroke();
        // 贴身衣料反光
        g.strokeStyle = 'rgba(200,212,232,0.18)';
        g.lineWidth = 2.6;
        g.beginPath();
        g.moveTo(-11, -102);
        g.quadraticCurveTo(-16, -86, -12, -68);
        g.stroke();
        // 斜挎咒具挂带与收纳袋
        g.strokeStyle = 'rgba(154,168,184,0.6)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-16, -62);
        g.lineTo(16, -54);
        g.stroke();
        g.fillStyle = '#10131a';
        g.fillRect(6, -60, 10, 9);
        g.strokeStyle = 'rgba(154,168,184,0.45)';
        g.lineWidth = 1;
        g.strokeRect(6, -60, 10, 9);
    }
    if (c.id === 'sukunaMegumi') {
        g.fillStyle = '#d7d9de';
        g.beginPath();
        g.moveTo(-22, -111);
        g.quadraticCurveTo(0, -120, 22, -111);
        g.lineTo(20, -52);
        g.quadraticCurveTo(0, -44, -20, -52);
        g.closePath();
        g.fill();
        g.strokeStyle = '#9ea4ad';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(-14, -106); g.quadraticCurveTo(-3, -96, 8, -105); g.stroke();
        g.beginPath(); g.moveTo(-15, -78); g.quadraticCurveTo(0, -70, 15, -78); g.stroke();
        g.fillStyle = '#141820';
        g.fillRect(-17, -57, 34, 8);
    }
    if (c.id === 'sukuna') {
        // 平安真身：裸上身健硕肌肉 + 黑色咒印纹身 + 藏青束裤腰
        g.fillStyle = c.skin;
        g.beginPath();
        g.moveTo(-20, -110);
        g.quadraticCurveTo(0, -118, 20, -110);
        g.lineTo(15, -62);
        g.quadraticCurveTo(0, -57, -15, -62);
        g.closePath();
        g.fill();
        // 胸肌阴影
        g.fillStyle = 'rgba(0,0,0,0.10)';
        g.beginPath();
        g.ellipse(-8, -95, 7.5, 5, -0.15, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(8, -95, 7.5, 5, 0.15, 0, Math.PI * 2);
        g.fill();
        // 腹肌浅阴影线
        g.strokeStyle = 'rgba(0,0,0,0.14)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -86);
        g.lineTo(0, -64);
        g.stroke();
        g.beginPath();
        g.moveTo(-6, -78);
        g.lineTo(6, -78);
        g.stroke();
        g.beginPath();
        g.moveTo(-5, -70);
        g.lineTo(5, -70);
        g.stroke();
        // 黑色咒印纹身：胸口双环
        g.strokeStyle = c.markings || '#17171c';
        g.lineWidth = 1.8;
        g.beginPath();
        g.arc(0, -92, 7, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(0, -92, 3.4, 0, Math.PI * 2);
        g.stroke();
        // 胸下弧纹
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-15, -84);
        g.quadraticCurveTo(-8, -80, -3, -83);
        g.stroke();
        g.beginPath();
        g.moveTo(15, -84);
        g.quadraticCurveTo(8, -80, 3, -83);
        g.stroke();
        // 侧腹斜线
        g.beginPath();
        g.moveTo(-17, -76);
        g.lineTo(-10, -63);
        g.stroke();
        g.beginPath();
        g.moveTo(17, -76);
        g.lineTo(10, -63);
        g.stroke();
        // 双肩黑环带 + 左肩黑圆
        g.lineWidth = 3.4;
        g.beginPath();
        g.moveTo(-20, -104);
        g.quadraticCurveTo(-14, -101, -9, -104);
        g.stroke();
        g.beginPath();
        g.moveTo(20, -104);
        g.quadraticCurveTo(14, -101, 9, -104);
        g.stroke();
        g.fillStyle = c.markings || '#17171c';
        g.beginPath();
        g.arc(-16, -99, 3.2, 0, Math.PI * 2);
        g.fill();
        // 藏青束裤腰头 + 黑腰带
        g.fillStyle = c.cloth;
        g.beginPath();
        g.moveTo(-15, -62);
        g.quadraticCurveTo(0, -57, 15, -62);
        g.lineTo(16, -50);
        g.quadraticCurveTo(0, -44, -16, -50);
        g.closePath();
        g.fill();
        g.strokeStyle = '#111318';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-15, -60);
        g.quadraticCurveTo(0, -55, 15, -60);
        g.stroke();
        // 第二对下臂（主臂下层，自侧腹伸出）
        g.strokeStyle = c.skin;
        g.lineWidth = 10;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-16, -86);
        g.lineTo(-27, -58);
        g.stroke();
        g.beginPath();
        g.moveTo(16, -86);
        g.lineTo(27, -58);
        g.stroke();
        g.lineCap = 'butt';
        // 下臂黑臂环
        g.strokeStyle = c.markings || '#17171c';
        g.lineWidth = 2.6;
        g.beginPath();
        g.moveTo(-25.5, -73);
        g.lineTo(-17.5, -70);
        g.stroke();
        g.beginPath();
        g.moveTo(25.5, -73);
        g.lineTo(17.5, -70);
        g.stroke();
    }
    if (c.id === 'kenjaku') {
        // 藏青道袍 + 绿底金格马甲 + 金斜带 + 金结 + 白领
        // 白色内领
        g.fillStyle = c.collar || '#e8e4dc';
        g.beginPath();
        g.moveTo(-6, -110); g.lineTo(0, -96); g.lineTo(6, -110);
        g.lineTo(4, -54); g.lineTo(-4, -54);
        g.closePath(); g.fill();
        // 道袍交领金边
        g.strokeStyle = c.robeTrim || '#c8a85a';
        g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(-13, -110); g.quadraticCurveTo(-3, -94, 3, -80); g.stroke();
        g.beginPath(); g.moveTo(13, -110); g.quadraticCurveTo(3, -96, -3, -82); g.stroke();
        // 绿色马甲（金边方格纹）
        g.fillStyle = c.vest || '#3a5a2a';
        g.beginPath();
        g.moveTo(-10, -104);
        g.quadraticCurveTo(0, -108, 10, -104);
        g.lineTo(8, -56);
        g.quadraticCurveTo(0, -52, -8, -56);
        g.closePath(); g.fill();
        // 金色网格纹
        g.strokeStyle = c.vestTrim || '#c8a85a';
        g.lineWidth = 1;
        for (let i = -8; i <= 8; i += 4) {
            g.beginPath(); g.moveTo(i, -102); g.lineTo(i * 0.9, -56); g.stroke();
        }
        g.beginPath(); g.moveTo(-9, -92); g.quadraticCurveTo(0, -90, 9, -92); g.stroke();
        g.beginPath(); g.moveTo(-9, -80); g.quadraticCurveTo(0, -78, 9, -80); g.stroke();
        g.beginPath(); g.moveTo(-9, -68); g.quadraticCurveTo(0, -66, 9, -68); g.stroke();
        // 马甲金边
        g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(-10, -104); g.quadraticCurveTo(0, -108, 10, -104); g.stroke();
        g.beginPath(); g.moveTo(-8, -56); g.quadraticCurveTo(0, -52, 8, -56); g.stroke();
        // 金色斜带（左肩到右腰）
        g.fillStyle = c.robeTrim || '#c8a85a';
        g.beginPath();
        g.moveTo(-14, -106);
        g.lineTo(-8, -112);
        g.lineTo(14, -58);
        g.lineTo(6, -54);
        g.closePath(); g.fill();
        // 斜带暗纹
        g.strokeStyle = 'rgba(120,90,30,0.5)';
        g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(-11, -108); g.lineTo(10, -56); g.stroke();
        // 金结（腰右侧蝴蝶结）
        g.fillStyle = c.robeTrim || '#c8a85a';
        g.beginPath();
        g.ellipse(8, -54, 5, 3, 0.3, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(12, -52, 4, 2.5, -0.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#a88838';
        g.beginPath(); g.arc(9, -53, 1.5, 0, Math.PI * 2); g.fill();
        // 金线腰带
        g.strokeStyle = c.robeTrim || '#c8a85a';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(-13, -50); g.quadraticCurveTo(0, -46, 13, -50); g.stroke();
    }
    if (c.id === 'hanami') {
        // 裸上身肌肉躯干：灰白皮肤 + 黑色不规则条纹 + 缝合线 + 白色束腰
        g.fillStyle = c.skin;
        g.beginPath();
        g.moveTo(-20, -110);
        g.quadraticCurveTo(0, -118, 20, -110);
        g.lineTo(15, -50);
        g.quadraticCurveTo(0, -44, -15, -50);
        g.closePath();
        g.fill();
        // 胸肌阴影
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.beginPath();
        g.ellipse(-8, -96, 9, 6, 0.1, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(8, -96, 9, 6, -0.1, 0, Math.PI * 2);
        g.fill();
        // 黑色不规则条纹（遍布肩、胸、腹）
        g.strokeStyle = c.grain || '#2a2a26';
        g.lineWidth = 2;
        // 胸中线
        g.beginPath();
        g.moveTo(0, -106); g.lineTo(0, -54);
        g.stroke();
        // 左肩到胸弧条纹
        g.beginPath();
        g.moveTo(-16, -102); g.quadraticCurveTo(-8, -94, -3, -98); g.stroke();
        g.beginPath();
        g.moveTo(-14, -96); g.quadraticCurveTo(-6, -88, -2, -90); g.stroke();
        // 右肩到胸弧条纹
        g.beginPath();
        g.moveTo(16, -102); g.quadraticCurveTo(8, -94, 3, -98); g.stroke();
        g.beginPath();
        g.moveTo(14, -96); g.quadraticCurveTo(6, -88, 2, -90); g.stroke();
        // 腹肌横纹
        g.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
            const ly = -78 + i * 8;
            g.beginPath();
            g.moveTo(-8, ly); g.quadraticCurveTo(0, ly + 2, 8, ly);
            g.stroke();
        }
        // 侧腹斜纹
        g.beginPath();
        g.moveTo(-15, -88); g.quadraticCurveTo(-11, -72, -9, -60); g.stroke();
        g.beginPath();
        g.moveTo(15, -88); g.quadraticCurveTo(11, -72, 9, -60); g.stroke();
        // 腹部斜条纹
        g.beginPath(); g.moveTo(-6, -70); g.lineTo(-10, -64); g.stroke();
        g.beginPath(); g.moveTo(6, -70); g.lineTo(10, -64); g.stroke();
        // 肩部缝合线（横向缝合痕迹）
        g.lineWidth = 1.2;
        g.strokeStyle = c.grain || '#2a2a26';
        g.setLineDash([3, 2]);
        g.beginPath();
        g.moveTo(-18, -106); g.quadraticCurveTo(0, -112, 18, -106);
        g.stroke();
        g.beginPath();
        g.moveTo(-16, -100); g.quadraticCurveTo(0, -104, 16, -100);
        g.stroke();
        g.setLineDash([]);
        // 绷带覆盖右肩到右胸（后臂侧 = 负x）
        g.fillStyle = c.branch || '#e8e4d8';
        g.beginPath();
        g.moveTo(-20, -110);
        g.quadraticCurveTo(-12, -114, -4, -110);
        g.lineTo(-3, -96);
        g.quadraticCurveTo(-12, -98, -19, -96);
        g.closePath();
        g.fill();
        // 绷带缠绕横纹
        g.strokeStyle = 'rgba(180,170,150,0.6)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const yy = -108 + i * 5;
            g.beginPath();
            g.moveTo(-19, yy); g.quadraticCurveTo(-12, yy - 2, -4, yy);
            g.stroke();
        }
        // 白色束腰
        g.fillStyle = c.branch || '#e8e4d8';
        g.fillRect(-16, -54, 32, 6);
        g.strokeStyle = 'rgba(0,0,0,0.2)';
        g.lineWidth = 1;
        g.strokeRect(-16, -54, 32, 6);
        // 腰带垂带
        g.fillStyle = c.branch || '#e8e4d8';
        g.beginPath();
        g.moveTo(-4, -48); g.lineTo(-2, -28); g.lineTo(2, -28); g.lineTo(4, -48);
        g.closePath();
        g.fill();
    }
    if (c.style === 'stitch' && c.id !== 'mahito') {
        g.strokeStyle = '#4a3a5a';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-18, -114);
        g.lineTo(18, -98);
        g.stroke();
    }
    if (c.id === 'mahito') {
        // 真人本体：宽松深灰罩衫 + 菱形格纹 + 宽松圆领露锁骨
        g.fillStyle = c.cloth;
        g.beginPath();
        g.moveTo(-20, -110);
        g.quadraticCurveTo(-26, -84, -19, -56);
        g.quadraticCurveTo(0, -49, 19, -56);
        g.quadraticCurveTo(26, -84, 20, -110);
        g.closePath();
        g.fill();
        // 菱形格纹（斜线交叉，裁剪到罩衫轮廓内）
        g.save();
        g.beginPath();
        g.moveTo(-20, -110);
        g.quadraticCurveTo(-26, -84, -19, -56);
        g.quadraticCurveTo(0, -49, 19, -56);
        g.quadraticCurveTo(26, -84, 20, -110);
        g.closePath();
        g.clip();
        g.strokeStyle = c.meshColor || '#3e3e4c';
        g.lineWidth = 1.1;
        for (let i = -2; i <= 2; i++) {
            g.beginPath();
            g.moveTo(-22 + i * 10, -110);
            g.lineTo(2 + i * 10, -54);
            g.stroke();
            g.beginPath();
            g.moveTo(22 + i * 10, -110);
            g.lineTo(-2 + i * 10, -54);
            g.stroke();
        }
        g.restore();
        // 宽松圆领（露锁骨）
        g.fillStyle = c.skin;
        g.beginPath();
        g.moveTo(-9, -113);
        g.quadraticCurveTo(0, -116, 9, -113);
        g.quadraticCurveTo(0, -100, -9, -113);
        g.closePath();
        g.fill();
        g.strokeStyle = '#1c1c26';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-9, -113);
        g.quadraticCurveTo(0, -99, 9, -113);
        g.stroke();
        // 胸口缝合疤
        g.strokeStyle = c.stitchColor || '#7a6a7e';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-3, -106);
        g.lineTo(2, -100);
        g.stroke();
        // 下摆垂坠折痕
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-8, -78);
        g.quadraticCurveTo(-6, -66, -8, -56);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -80);
        g.quadraticCurveTo(10, -68, 9, -57);
        g.stroke();
    }
    if (c.id === 'gojo') {
        // 黑紫高领夹克：外翻高立领护住脖颈 + 紫缎面折痕反光 + 拉链中线 + 插手口袋
        g.fillStyle = '#1d1728';
        g.beginPath();
        g.moveTo(-15, -116);
        g.lineTo(15, -116);
        g.lineTo(10, -92);
        g.lineTo(-10, -92);
        g.closePath();
        g.fill();
        // 领顶外翻边（紫色受光）
        g.strokeStyle = 'rgba(122,100,190,0.55)';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(-15, -115);
        g.lineTo(15, -115);
        g.stroke();
        // 立领前中缝
        g.strokeStyle = 'rgba(0,0,0,0.55)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -115);
        g.lineTo(0, -92);
        g.stroke();
        // 领侧紫折痕
        g.strokeStyle = 'rgba(122,100,190,0.35)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-11, -112);
        g.lineTo(-6, -96);
        g.stroke();
        g.beginPath();
        g.moveTo(11, -112);
        g.lineTo(6, -96);
        g.stroke();
        // 胸腹紫缎面斜折痕反光
        g.strokeStyle = 'rgba(122,96,180,0.42)';
        g.lineCap = 'round';
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(-16, -88);
        g.quadraticCurveTo(-9, -84, -2, -81);
        g.stroke();
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(5, -97);
        g.quadraticCurveTo(11, -93, 16, -88);
        g.stroke();
        g.beginPath();
        g.moveTo(-13, -70);
        g.quadraticCurveTo(-6, -66, 1, -63);
        g.stroke();
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(7, -76);
        g.quadraticCurveTo(12, -72, 16, -68);
        g.stroke();
        g.lineCap = 'butt';
        // 拉链中线 + 拉头
        g.strokeStyle = 'rgba(160,170,200,0.40)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(0, -92);
        g.lineTo(0, -54);
        g.stroke();
        g.fillStyle = 'rgba(180,190,215,0.6)';
        g.fillRect(-1, -91, 2, 3.6);
        // 两侧插手口袋斜口
        g.strokeStyle = 'rgba(0,0,0,0.5)';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(-14, -64);
        g.lineTo(-8, -58);
        g.stroke();
        g.beginPath();
        g.moveTo(14, -64);
        g.lineTo(8, -58);
        g.stroke();
        // 下摆
        g.strokeStyle = 'rgba(0,0,0,0.4)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-14, -54);
        g.quadraticCurveTo(0, -48, 14, -54);
        g.stroke();
    }
    if (c.id === 'gojo2') {
        // 便装：黑色紧身短袖T恤 + 浅灰宽松长裤 + 腰前藏青束带
        // 圆领口（露出锁骨肤色）
        g.fillStyle = c.skin;
        g.beginPath();
        g.moveTo(-9, -110);
        g.quadraticCurveTo(0, -101, 9, -110);
        g.quadraticCurveTo(0, -115, -9, -110);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.16)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-9, -110);
        g.quadraticCurveTo(0, -101, 9, -110);
        g.stroke();
        // 紧身衣肌肉线条
        g.strokeStyle = 'rgba(255,255,255,0.10)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-13, -90);
        g.quadraticCurveTo(-5, -86, -1, -89);
        g.stroke();
        g.beginPath();
        g.moveTo(13, -90);
        g.quadraticCurveTo(5, -86, 1, -89);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -86);
        g.lineTo(0, -69);
        g.stroke();
        // 浅灰宽松长裤（腰胯段）
        g.fillStyle = c.clothSub;
        g.beginPath();
        g.moveTo(-16.5, -65);
        g.lineTo(16.5, -65);
        g.lineTo(16, -48);
        g.quadraticCurveTo(0, -43, -16, -48);
        g.closePath();
        g.fill();
        // T恤下摆压在裤腰上
        g.fillStyle = c.cloth;
        g.beginPath();
        g.moveTo(-17, -69);
        g.quadraticCurveTo(0, -63, 17, -69);
        g.lineTo(17, -64);
        g.quadraticCurveTo(0, -58, -17, -64);
        g.closePath();
        g.fill();
        // 腰间藏青束带 + 腰前打结垂带
        g.fillStyle = c.sashColor || '#2c3a68';
        g.fillRect(-16.5, -61, 33, 5);
        g.fillStyle = 'rgba(255,255,255,0.10)';
        g.fillRect(-16.5, -61, 33, 1.4);
        g.fillStyle = c.sashColor || '#2c3a68';
        g.beginPath();
        g.arc(3, -58, 3.4, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = c.sashColor || '#2c3a68';
        g.lineWidth = 3;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(3, -56);
        g.quadraticCurveTo(6, -50, 5, -44);
        g.stroke();
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(1, -56);
        g.quadraticCurveTo(-1, -51, 0, -46);
        g.stroke();
        g.lineCap = 'butt';
    }
    if (c.id === 'megumi' || c.id === 'megumi2') {
        // 咒术高专制服（参考立绘）：高立领 + 喉前单金扣 + 斜向剪裁缝线；觉醒版肩头飘影纹
        g.fillStyle = '#141a2e';
        g.beginPath();
        g.moveTo(-14, -114);
        g.lineTo(14, -114);
        g.lineTo(10, -94);
        g.lineTo(-10, -94);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(120,130,170,0.35)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-14, -112);
        g.lineTo(14, -112);
        g.stroke();
        // 喉前单枚金扣
        g.fillStyle = '#d8b862';
        g.beginPath();
        g.arc(5.5, -101, 1.7, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,244,200,0.8)';
        g.beginPath();
        g.arc(5, -101.6, 0.6, 0, Math.PI * 2);
        g.fill();
        // 斜向剪裁缝线（胸口与腰间两道）
        g.strokeStyle = 'rgba(0,0,0,0.45)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-15, -86);
        g.quadraticCurveTo(-2, -82, 11, -78);
        g.stroke();
        g.beginPath();
        g.moveTo(-12, -68);
        g.quadraticCurveTo(2, -64, 14, -61);
        g.stroke();
        // 斜缝受光边
        g.strokeStyle = 'rgba(120,130,170,0.25)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-15, -84.6);
        g.quadraticCurveTo(-2, -80.6, 11, -76.6);
        g.stroke();
        // 束腰长上衣下摆线
        g.strokeStyle = 'rgba(0,0,0,0.45)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-15, -58);
        g.quadraticCurveTo(0, -52, 15, -58);
        g.stroke();
        if (c.id === 'megumi2') {
            // 觉醒版：肩头与衣摆渗出影之咒力纹（黑影色，随呼吸漂动）
            g.strokeStyle = 'rgba(10,8,20,' + (0.45 + Math.sin(t * 0.002) * 0.12) + ')';
            g.lineWidth = 1.8;
            for (let i = 0; i < 3; i++) {
                const wx = -14 + i * 14,
                    ph = t * 0.0016 + i * 2.1;
                g.beginPath();
                g.moveTo(wx, -52);
                g.quadraticCurveTo(wx + Math.sin(ph) * 6, -68, wx + Math.sin(ph + 1.2) * 9, -84);
                g.stroke();
            }
        }
    }
    if (c.id === 'okkotsu') {
        // 咒术高专制服：白高立领 + 深色领缘 + 金扣中线 + 斜肩刀带
        g.fillStyle = '#eef1f6';
        g.beginPath();
        g.moveTo(-13, -112);
        g.lineTo(13, -112);
        g.lineTo(10, -93);
        g.lineTo(-10, -93);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(38,46,68,0.65)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-13, -110);
        g.lineTo(13, -110);
        g.stroke();
        // 斜向前门线（左领口斜向右下的偏向开合——乙骨制服标志）
        g.strokeStyle = 'rgba(60,70,100,0.5)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-7, -110);
        g.quadraticCurveTo(3, -104, 6, -94);
        g.lineTo(4, -54);
        g.stroke();
        g.strokeStyle = 'rgba(200,210,228,0.5)';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(-5.5, -109);
        g.quadraticCurveTo(4, -103.5, 7, -94);
        g.lineTo(5.5, -56);
        g.stroke();
        // 领口圆金扣
        g.fillStyle = 'rgba(60,52,30,0.9)';
        g.beginPath();
        g.arc(4.5, -101, 2.9, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(206,182,116,0.95)';
        g.beginPath();
        g.arc(4.5, -101, 2.1, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(240,224,150,0.9)';
        g.beginPath();
        g.arc(3.8, -101.7, 0.7, 0, Math.PI * 2);
        g.fill();
        // 斜肩刀带（佩刀背带，双层描边）
        g.strokeStyle = 'rgba(40,48,70,0.75)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-14, -104);
        g.lineTo(15, -62);
        g.stroke();
        g.strokeStyle = 'rgba(180,192,214,0.45)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-14, -104);
        g.lineTo(15, -62);
        g.stroke();
        g.fillStyle = 'rgba(110,122,150,0.85)';
        g.fillRect(-2, -86, 5, 5);
        // 腰间里香咒力微光（呼吸明灭）
        g.fillStyle = 'rgba(184,154,255,' + (0.10 + Math.sin(t * 0.0022) * 0.06) + ')';
        g.beginPath();
        g.arc(12, -58, 7, 0, Math.PI * 2);
        g.fill();
    }
    if (c.id === 'yuji') {
        // 前期高专连帽校服：肩颈红风帽堆叠 + 拉链中线 + 风帽抽绳
        const hoodC = c.hoodColor || '#b8241a';
        g.fillStyle = hoodC;
        g.beginPath();
        g.moveTo(-19, -105);
        g.quadraticCurveTo(-14, -113, 0, -114);
        g.quadraticCurveTo(14, -113, 19, -105);
        g.quadraticCurveTo(20, -98, 14, -95);
        g.quadraticCurveTo(7, -100, 0, -100);
        g.quadraticCurveTo(-7, -100, -14, -95);
        g.quadraticCurveTo(-20, -98, -19, -105);
        g.closePath();
        g.fill();
        // 风帽堆叠纹理阴影（两道）
        g.strokeStyle = 'rgba(110,20,14,0.75)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-15, -104);
        g.quadraticCurveTo(0, -109, 15, -104);
        g.stroke();
        g.beginPath();
        g.moveTo(-11, -99);
        g.quadraticCurveTo(0, -103, 11, -99);
        g.stroke();
        // 风帽亮缘高光
        g.strokeStyle = 'rgba(240,120,100,0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-16, -107);
        g.quadraticCurveTo(0, -112, 16, -107);
        g.stroke();
        // 胸前 V 领口（红衣内衬翻出）
        g.strokeStyle = '#c8321e';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-10, -99);
        g.lineTo(0, -87);
        g.lineTo(10, -99);
        g.stroke();
        // 拉链中线
        g.strokeStyle = 'rgba(150,160,190,0.45)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -87);
        g.lineTo(0, -54);
        g.stroke();
        // 风帽抽绳（两根白绳垂于胸前，呼吸微摆）
        g.strokeStyle = 'rgba(230,230,235,0.75)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-7, -97);
        g.quadraticCurveTo(-8 + Math.sin(t * 0.002) * 1.5, -87, -6, -77);
        g.stroke();
        g.beginPath();
        g.moveTo(7, -97);
        g.quadraticCurveTo(8 + Math.sin(t * 0.002 + 1.2) * 1.5, -87, 6, -77);
        g.stroke();
        g.fillStyle = 'rgba(230,230,235,0.85)';
        g.beginPath();
        g.arc(-6, -76, 1.2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(6, -76, 1.2, 0, Math.PI * 2);
        g.fill();
        // 下摆罗纹束口
        g.strokeStyle = 'rgba(20,26,50,0.7)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-14, -52);
        g.quadraticCurveTo(0, -47, 14, -52);
        g.stroke();
    }
    if (c.id === 'yuji2') {
        // 新宿决战：颈间红色高领围拢 + 拉链中线 + 下摆束口
        const hoodC2 = c.hoodColor || '#c02418';
        g.fillStyle = hoodC2;
        g.beginPath();
        g.ellipse(0, -103, 19, 9, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(-12, -107, 6.5, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(0, -109.5, 7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(12, -107, 6.5, 0, Math.PI * 2);
        g.fill();
        // 鼓包间阴影纹
        g.strokeStyle = 'rgba(110,18,12,0.75)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-8, -111);
        g.quadraticCurveTo(-6, -105, -7, -99);
        g.stroke();
        g.beginPath();
        g.moveTo(7, -111);
        g.quadraticCurveTo(5, -105, 6, -99);
        g.stroke();
        g.beginPath();
        g.moveTo(-15, -100);
        g.quadraticCurveTo(0, -95, 15, -100);
        g.stroke();
        // 亮缘高光
        g.strokeStyle = 'rgba(240,110,90,0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-14, -111);
        g.quadraticCurveTo(0, -116, 14, -111);
        g.stroke();
        // 拉链中线
        g.strokeStyle = 'rgba(150,160,190,0.4)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -94);
        g.lineTo(0, -54);
        g.stroke();
        // 下摆束口
        g.strokeStyle = 'rgba(12,16,28,0.8)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-14, -52);
        g.quadraticCurveTo(0, -47, 14, -52);
        g.stroke();
    }
    if (c.style === 'volcano') {
        // 漏瑚：黄绿斑点斗篷 + 深灰内衬 + 白毛领 + 棕靴红底
        // 白色毛领（颈部蓬松围领）
        g.fillStyle = c.collar || '#f0ece4';
        g.beginPath();
        g.moveTo(-18, -110);
        g.quadraticCurveTo(-22, -114, -20, -104);
        g.quadraticCurveTo(-10, -100, 0, -100);
        g.quadraticCurveTo(10, -100, 20, -104);
        g.quadraticCurveTo(22, -114, 18, -110);
        g.closePath();
        g.fill();
        // 毛领纹理
        g.strokeStyle = 'rgba(180,170,160,0.4)';
        g.lineWidth = 1;
        for (let i = -16; i <= 16; i += 4) {
            g.beginPath();
            g.moveTo(i, -110); g.lineTo(i + 1, -104);
            g.stroke();
        }
        // 黄绿色斗篷主体（覆盖肩到腰）
        g.fillStyle = c.cloth || '#a8c84a';
        g.beginPath();
        g.moveTo(-20, -104);
        g.quadraticCurveTo(-24, -80, -18, -50);
        g.quadraticCurveTo(0, -44, 18, -50);
        g.quadraticCurveTo(24, -80, 20, -104);
        g.quadraticCurveTo(0, -112, -20, -104);
        g.closePath();
        g.fill();
        // 斗篷黑色不规则斑点（豹纹）
        g.fillStyle = c.spot || '#1a1a14';
        const spots = [
            [-12, -96, 5, 4], [8, -92, 6, 5], [-6, -82, 4, 3],
            [10, -76, 5, 4], [-14, -72, 4, 3], [4, -68, 5, 4],
            [-8, -62, 3, 3], [14, -64, 4, 3], [0, -88, 3, 2]
        ];
        for (const [sx, sy, sw, sh] of spots) {
            g.beginPath();
            g.ellipse(sx, sy, sw, sh, 0.3, 0, Math.PI * 2);
            g.fill();
        }
        // 斗篷边缘暗影
        g.strokeStyle = 'rgba(80,90,20,0.4)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-20, -104);
        g.quadraticCurveTo(-24, -80, -18, -50);
        g.stroke();
        g.beginPath();
        g.moveTo(20, -104);
        g.quadraticCurveTo(24, -80, 18, -50);
        g.stroke();
    }
    if (c.style === 'zenin') {
        // 直哉：黑色羽织 + 立领白衬衫（有纽扣） + 浅灰袴裙（带褶皱） + 草履
        // 立领白衬衫（高领，半遮颈）
        g.fillStyle = c.shirt || '#d8dce0';
        g.beginPath();
        g.moveTo(-9, -108);
        g.lineTo(9, -108);
        g.lineTo(7, -64);
        g.lineTo(-7, -64);
        g.closePath();
        g.fill();
        // 立领（高领翻折）
        g.fillStyle = '#c8ccd0';
        g.beginPath();
        g.moveTo(-8, -112);
        g.lineTo(8, -112);
        g.lineTo(9, -106);
        g.lineTo(-9, -106);
        g.closePath();
        g.fill();
        // 领口阴影
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-8, -109); g.lineTo(8, -109); g.stroke();
        // 衬衫纽扣（两颗）
        g.fillStyle = '#b0b4b8';
        g.beginPath(); g.arc(0, -98, 1.2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(0, -84, 1.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e8ecef';
        g.beginPath(); g.arc(-0.3, -98.3, 0.4, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(-0.3, -84.3, 0.4, 0, Math.PI * 2); g.fill();
        // 黑色羽织（宽袖，覆盖外层）
        g.fillStyle = c.cloth || '#1a2228';
        g.beginPath();
        g.moveTo(-22, -110);
        g.quadraticCurveTo(-26, -84, -20, -54);
        g.quadraticCurveTo(0, -48, 20, -54);
        g.quadraticCurveTo(26, -84, 22, -110);
        g.quadraticCurveTo(0, -118, -22, -110);
        g.closePath();
        g.fill();
        // 羽织襟边（深色竖缘）
        g.strokeStyle = c.clothSub || '#14181c';
        g.lineWidth = 3.5;
        g.beginPath();
        g.moveTo(-12, -108);
        g.lineTo(-10, -56);
        g.stroke();
        g.beginPath();
        g.moveTo(12, -108);
        g.lineTo(10, -56);
        g.stroke();
        // 羽织纽绳结
        g.strokeStyle = '#a8a49a';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-9, -88);
        g.quadraticCurveTo(0, -82, 9, -88);
        g.stroke();
        g.fillStyle = '#a8a49a';
        g.beginPath();
        g.arc(0, -84, 2, 0, Math.PI * 2);
        g.fill();
        // 羽织衣褶
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-16, -82); g.lineTo(-18, -58); g.stroke();
        g.beginPath();
        g.moveTo(16, -80); g.lineTo(18, -58); g.stroke();
        // 浅灰袴裙（宽松，长至脚踝，带褶皱）
        g.fillStyle = c.hakama || '#c4c8cc';
        g.beginPath();
        g.moveTo(-18, -54);
        g.lineTo(18, -54);
        g.lineTo(22, -6);
        g.quadraticCurveTo(0, -2, -22, -6);
        g.closePath();
        g.fill();
        // 袴裙褶皱线
        g.strokeStyle = 'rgba(0,0,0,0.15)';
        g.lineWidth = 1;
        for (let i = -3; i <= 3; i++) {
            const px = i * 6;
            g.beginPath();
            g.moveTo(px, -54);
            g.quadraticCurveTo(px + 2, -30, px + 4, -6);
            g.stroke();
        }
        // 袴腰带
        g.fillStyle = '#d0d4d8';
        g.fillRect(-16, -56, 32, 5);
        g.strokeStyle = 'rgba(0,0,0,0.2)';
        g.lineWidth = 1;
        g.strokeRect(-16, -56, 32, 5);
        // 草履绳带（黄绿色）
        g.strokeStyle = c.sandalStrap || '#a8c060';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(-14, -2); g.lineTo(-8, 2); g.stroke();
        g.beginPath(); g.moveTo(-8, 0); g.lineTo(-14, -4); g.stroke();
        g.beginPath(); g.moveTo(12, -2); g.lineTo(18, 2); g.stroke();
        g.beginPath(); g.moveTo(18, 0); g.lineTo(12, -4); g.stroke();
    }
    // 手臂
    g.strokeStyle = c.armColor || c.cloth;
    g.lineWidth = (c.style === 'muscular' || c.style === 'ocean' || c.style === 'toji' || c.style === 'ryu') ? 13 : 11;
    g.beginPath();
    g.moveTo(-14, -108);
    g.lineTo(-24, -70);
    g.stroke();
    g.beginPath();
    g.moveTo(14, -108);
    g.lineTo(24, -70);
    g.stroke();
    if (c.id === 'sukunaMegumi') {
        g.strokeStyle = '#171a20';
        g.lineWidth = 3.5;
        g.beginPath(); g.moveTo(-23, -92); g.lineTo(-14, -89); g.stroke();
        g.beginPath(); g.moveTo(23, -92); g.lineTo(14, -89); g.stroke();
        g.lineWidth = 4.5;
        g.beginPath(); g.moveTo(-26, -77); g.lineTo(-20, -75); g.stroke();
        g.beginPath(); g.moveTo(26, -77); g.lineTo(20, -75); g.stroke();
    }
    if (c.id === 'sukuna') {
        // 主臂黑色咒印环：上臂环带 + 腕部黑带
        g.strokeStyle = c.markings || '#17171c';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-26, -91);
        g.lineTo(-12, -87);
        g.stroke();
        g.beginPath();
        g.moveTo(26, -91);
        g.lineTo(12, -87);
        g.stroke();
        g.beginPath();
        g.moveTo(-28.5, -81.5);
        g.lineTo(-14.5, -77.5);
        g.stroke();
        g.beginPath();
        g.moveTo(28.5, -81.5);
        g.lineTo(14.5, -77.5);
        g.stroke();
    }
    if (c.id === 'mahito') {
        // 上臂脱袖黑布环（参考图：裸臂 + 脱离的黑色布环）
        g.strokeStyle = '#20202a';
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(-24.5, -92.5);
        g.lineTo(-11.5, -89);
        g.stroke();
        g.beginPath();
        g.moveTo(24.5, -92.5);
        g.lineTo(11.5, -89);
        g.stroke();
    }
    if (c.sleeveCap) {
        // 短袖套口：肩部一小段T恤袖
        g.strokeStyle = c.cloth;
        g.lineWidth = (c.style === 'muscular' || c.style === 'toji' || c.style === 'ryu' ? 13 : 11) + 3;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-14, -108);
        g.lineTo(-17, -96.6);
        g.stroke();
        g.beginPath();
        g.moveTo(14, -108);
        g.lineTo(17, -96.6);
        g.stroke();
        g.lineCap = 'butt';
    }
    if (c.wrapColor) {
        // 右前臂皮革缠带护具
        g.strokeStyle = c.wrapColor;
        g.lineWidth = 12;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(18, -94);
        g.lineTo(23, -74);
        g.stroke();
        g.strokeStyle = 'rgba(60,36,20,0.8)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(14, -88);
        g.lineTo(26, -91);
        g.stroke();
        g.beginPath();
        g.moveTo(15.5, -82);
        g.lineTo(27.5, -85);
        g.stroke();
        g.beginPath();
        g.moveTo(17, -76);
        g.lineTo(29, -79);
        g.stroke();
        g.lineCap = 'butt';
    }
    g.fillStyle = c.gloveColor || c.skin;
    g.beginPath();
    g.arc(-24, -68, 7, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(24, -68, 7, 0, Math.PI * 2);
    g.fill();
    if (c.id === 'hanami') {
        // 绷带右臂（后臂 = 负x侧）：白色覆盖 + 缠带横纹
        g.strokeStyle = c.branch || '#e8e4d8';
        g.lineWidth = 13;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-14, -108); g.lineTo(-24, -70);
        g.stroke();
        // 缠带横纹
        g.strokeStyle = 'rgba(180,170,150,0.6)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 5; i++) {
            const tt = 0.1 + i * 0.18;
            const bx = -14 + (-24 - (-14)) * tt;
            const by = -108 + (-70 - (-108)) * tt;
            g.beginPath();
            g.moveTo(bx - 6, by - 2);
            g.lineTo(bx + 6, by + 2);
            g.stroke();
        }
        // 绷带手
        g.fillStyle = c.branch || '#e8e4d8';
        g.beginPath();
        g.arc(-24, -68, 7, 0, Math.PI * 2);
        g.fill();
        g.lineCap = 'butt';
        // 黑色爪子（双手）
        g.strokeStyle = '#1a0a08';
        g.lineWidth = 2;
        g.lineCap = 'round';
        for (let i = -1; i <= 1; i++) {
            g.beginPath();
            g.moveTo(-24 + i * 3, -74);
            g.lineTo(-24 + i * 4, -82);
            g.stroke();
            g.beginPath();
            g.moveTo(24 + i * 3, -74);
            g.lineTo(24 + i * 4, -82);
            g.stroke();
        }
        g.lineCap = 'butt';
    }
    // 武器
    if (c.weapon) {
        if (c.weapon === 'umbrella') {
            // 斑点折叠伞（手握伞柄，伞身向外延伸）
            g.save();
            g.translate(24, -68);
            g.rotate(-0.4);
            // 黑色伞柄（手握位置在原点）
            g.strokeStyle = c.umbrellaHandle || '#1a1a1a';
            g.lineWidth = 4;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(-4, 0); g.lineTo(10, 2);
            g.stroke();
            // 伞布（从柄端向外延伸）
            g.fillStyle = c.umbrellaBase || '#e8e4d8';
            g.beginPath();
            g.moveTo(8, 0);
            g.quadraticCurveTo(10, -5, 20, -6);
            g.lineTo(36, -6);
            g.quadraticCurveTo(42, -5, 44, 0);
            g.quadraticCurveTo(42, 5, 36, 6);
            g.lineTo(20, 6);
            g.quadraticCurveTo(10, 5, 8, 0);
            g.closePath();
            g.fill();
            // 黑色斑点
            g.fillStyle = c.umbrellaSpot || '#1a1a14';
            const usp = [[16, -2, 3, 2], [28, -3, 4, 2.5], [22, 1, 2.5, 2], [38, 2, 3, 2], [12, 2, 2, 1.5], [32, -1, 2, 1.5]];
            for (const [sx, sy, sw, sh] of usp) {
                g.beginPath();
                g.ellipse(sx, sy, sw, sh, 0.2, 0, Math.PI * 2);
                g.fill();
            }
            // 褶皱线
            g.strokeStyle = 'rgba(0,0,0,0.15)';
            g.lineWidth = 0.8;
            for (let i = 14; i <= 40; i += 7) {
                g.beginPath();
                g.moveTo(i, -5); g.lineTo(i, 5);
                g.stroke();
            }
            // 伞尖
            g.strokeStyle = c.umbrellaHandle || '#1a1a1a';
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(44, 0); g.lineTo(50, -1);
            g.stroke();
            g.lineCap = 'butt';
            g.restore();
        } else {
            g.save();
            g.translate(24, -68);
            g.rotate(0.9);
            g.strokeStyle = '#d8dce8';
            g.lineWidth = 4;
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(50, -4);
            g.stroke();
            g.strokeStyle = '#8a4a2a';
            g.lineWidth = 5;
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(-12, 2);
            g.stroke();
            g.restore();
        }
    }
    // 头
    g.fillStyle = c.skin;
    g.beginPath();
    g.arc(0, -136, 20, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = c.hair;
    if (c.id === 'gojo' || c.id === 'gojo2') {
        if (c.id === 'gojo') {
            // 后脑眼罩结带（随呼吸轻飘）
            g.strokeStyle = c.blindfold || '#0a0e18';
            g.lineWidth = 5;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(-15, -138);
            g.quadraticCurveTo(-30, -132 + Math.sin(t * 0.002) * 2, -38, -122 + Math.sin(t * 0.002 + 1) * 3);
            g.stroke();
            g.lineWidth = 4;
            g.beginPath();
            g.moveTo(-16, -135);
            g.quadraticCurveTo(-28, -126 + Math.sin(t * 0.002 + 2) * 2, -33, -114 + Math.sin(t * 0.002 + 3) * 3);
            g.stroke();
        }
        // 内层发丝阴影 + 外层蓬松白发
        g.fillStyle = '#cfe0ee';
        g.beginPath();
        g.arc(0, -144, 19, Math.PI, 0);
        g.fill();
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-21, -140);
        for (let i = 0; i <= 11; i++) {
            const a = -Math.PI + i * Math.PI / 11;
            g.lineTo(Math.cos(a) * 21, -138 + Math.sin(a) * 22 - (i % 2 ? 8 : 19));
        }
        g.closePath();
        g.fill();
        // 前额垂发
        g.beginPath();
        g.moveTo(-11, -152);
        g.quadraticCurveTo(-7, -166, 1, -151);
        g.lineTo(-3, -149);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(5, -151);
        g.quadraticCurveTo(11, -165, 15, -150);
        g.lineTo(9, -148);
        g.closePath();
        g.fill();
        if (c.id === 'gojo') {
            // 眼罩：缎面高光 + 蓝缘 + 六眼微辉
            g.fillStyle = c.blindfold || '#0a0e18';
            g.fillRect(-20, -142, 40, 12);
            g.fillStyle = 'rgba(255,255,255,0.10)';
            g.fillRect(-20, -142, 40, 3);
            g.fillStyle = c.color;
            g.fillRect(-20, -142, 40, 1.6);
            g.fillStyle = 'rgba(53,196,255,' + (0.25 + Math.sin(t * 0.003) * 0.12) + ')';
            g.fillRect(-18, -131, 36, 2);
        } else {
            // 便装：湛蓝双眼常驻可见
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.ellipse(-7, -134, 5, 3.4, 0, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.ellipse(8, -134, 5, 3.4, 0, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = c.eyeColor || '#35c4ff';
            g.beginPath();
            g.arc(-7, -134, 2.4, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(8, -134, 2.4, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.arc(-6.2, -134.8, 0.9, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(8.8, -134.8, 0.9, 0, Math.PI * 2);
            g.fill();
            // 上睫毛线 + 眉毛
            g.strokeStyle = '#2a3140';
            g.lineWidth = 1.6;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(-11.5, -136.6);
            g.quadraticCurveTo(-7, -139, -2.5, -136.6);
            g.stroke();
            g.beginPath();
            g.moveTo(3.5, -136.6);
            g.quadraticCurveTo(8, -139, 12.5, -136.6);
            g.stroke();
            g.lineWidth = 1.3;
            g.beginPath();
            g.moveTo(-11, -143);
            g.quadraticCurveTo(-7, -144.6, -3, -143.4);
            g.stroke();
            g.beginPath();
            g.moveTo(4, -143.4);
            g.quadraticCurveTo(8, -144.6, 12, -143);
            g.stroke();
            // 自信微笑（嘴角上扬的浅笑）
            g.strokeStyle = '#8a5a48';
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(-4.5, -124.5);
            g.quadraticCurveTo(1, -121.2, 7, -125.2);
            g.stroke();
            g.lineCap = 'butt';
            // 六眼微辉
            g.fillStyle = 'rgba(53,196,255,' + (0.16 + Math.sin(t * 0.003) * 0.08) + ')';
            g.beginPath();
            g.arc(-7, -134, 6, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(8, -134, 6, 0, Math.PI * 2);
            g.fill();
        }
    } else if (c.id === 'megumi' || c.id === 'megumi2') {
        // 伏黑惠：双层黑刺发 + 斜刘海；觉醒版长刘海遮右眼 + 影光瞳
        const v2 = c.id === 'megumi2';
        // 内层发丝阴影
        g.fillStyle = c.hairShade || '#2a3244';
        g.beginPath();
        g.arc(0, -144, 19, Math.PI, 0);
        g.fill();
        // 外层黑发圆顶基底（盖住头顶并压到发际线，与脸部贴合）
        g.fillStyle = c.hair;
        g.beginPath();
        g.arc(0, -140, 19, Math.PI, 0);
        g.fill();
        g.fillRect(-19, -144, 38, 5.5);
        // 外层黑刺发：长短交错后扬尖刺
        g.beginPath();
        g.moveTo(-20, -136);
        for (let i = 0; i <= 12; i++) {
            const a = -Math.PI + i * Math.PI / 12;
            const off = (i % 2 === 0) ? 19 : 7;
            const back = (1 - i / 12) * 5;
            g.lineTo(Math.cos(a) * 20 - back * 0.6, -136 + Math.sin(a) * 20 - off - back);
        }
        g.closePath();
        g.fill();
        // 鬓角下探发尾
        g.beginPath();
        g.moveTo(-19, -140);
        g.lineTo(-26, -130);
        g.lineTo(-17, -132);
        g.closePath();
        g.fill();
        // 前额斜刘海（短款，不遮眼，前后期一致）
        g.beginPath();
        g.moveTo(-2, -152);
        g.quadraticCurveTo(8, -160, 14, -148);
        g.lineTo(10, -140);
        g.lineTo(3, -144);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(-14, -150);
        g.quadraticCurveTo(-10, -160, -2, -150);
        g.lineTo(-6, -142);
        g.lineTo(-11, -144);
        g.closePath();
        g.fill();
        // 冷瞳（深青色，双眼可见，前后期一致）
        g.fillStyle = c.eyeColor || '#2a4a6e';
        g.beginPath();
        g.arc(-7, -134, 2.6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -134, 2.6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(-6, -135, 0.9, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(9, -135, 0.9, 0, Math.PI * 2);
        g.fill();
        // 冷峻垂目眼线
        g.strokeStyle = 'rgba(20,26,40,0.75)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-11, -138);
        g.lineTo(-3, -138);
        g.stroke();
        g.beginPath();
        g.moveTo(4, -138);
        g.lineTo(12, -138);
        g.stroke();
    } else if (c.id === 'yuji' || c.id === 'yuji2') {
        // 虎杖：两侧剃短深色底层 + 顶部粉色乱刺 + 额前碎刺
        const hsY = c.hairShade || '#4a343c';
        // 底层：剃短深色底壳（仅在粉发外缘露出一圈，不压到额头）
        g.fillStyle = hsY;
        g.beginPath();
        g.arc(0, -144, 19.4, Math.PI, 0);
        g.fill();
        // 顶层粉发圆顶基底（盖住头顶，发际线留出额头与眉毛）
        g.fillStyle = c.hair;
        g.beginPath();
        g.arc(0, -142, 19, Math.PI, 0);
        g.fill();
        g.fillRect(-19, -146, 38, 3.5);
        // 粉色乱刺（长短交错；后期发型更长更野）
        const spikeHY = c.id === 'yuji2' ? 17 : 13;
        g.beginPath();
        for (let i = 0; i <= 11; i++) {
            const a = -Math.PI + i * Math.PI / 11;
            const off = (i % 2 === 0) ? spikeHY : 4;
            const hx = Math.cos(a) * 18.5,
                hy = -140 + Math.sin(a) * 18.5 - off - 4;
            if (i === 0) g.moveTo(hx, hy);
            else g.lineTo(hx, hy);
        }
        g.closePath();
        g.fill();
        // 额前碎刺（三束小尖自发际线压向额头）
        g.beginPath();
        g.moveTo(-12, -143);
        g.lineTo(-9, -137.5);
        g.lineTo(-5, -143);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(-3, -143);
        g.lineTo(0, -137);
        g.lineTo(4, -143);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(6, -143);
        g.lineTo(9, -137.5);
        g.lineTo(13, -143);
        g.closePath();
        g.fill();
        // 发丝阴影线
        g.strokeStyle = 'rgba(160,100,110,0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-8, -159);
        g.quadraticCurveTo(-6, -152, -7, -146);
        g.stroke();
        g.beginPath();
        g.moveTo(3, -161);
        g.quadraticCurveTo(5, -153, 4, -147);
        g.stroke();
        if (c.id === 'yuji2') {
            // 新宿决战：长刘海垂落额前
            g.fillStyle = c.hair;
            g.beginPath();
            g.moveTo(-9, -144);
            g.lineTo(-6, -136);
            g.lineTo(-2, -144);
            g.closePath();
            g.fill();
            g.beginPath();
            g.moveTo(1, -144);
            g.lineTo(5, -137);
            g.lineTo(9, -144);
            g.closePath();
            g.fill();
            g.beginPath();
            g.moveTo(-18, -143);
            g.lineTo(-16, -135);
            g.lineTo(-12, -143);
            g.closePath();
            g.fill();
        }
    } else if (c.id === 'sukunaMegumi') {
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-22, -138);
        g.lineTo(-25, -150);
        g.lineTo(-17, -149);
        g.lineTo(-18, -161);
        g.lineTo(-10, -157);
        g.lineTo(-6, -170);
        g.lineTo(0, -160);
        g.lineTo(8, -172);
        g.lineTo(10, -158);
        g.lineTo(21, -165);
        g.lineTo(18, -151);
        g.lineTo(27, -149);
        g.lineTo(21, -137);
        g.quadraticCurveTo(0, -145, -22, -138);
        g.closePath();
        g.fill();
        g.strokeStyle = c.hairShade;
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-13, -158); g.lineTo(-8, -147); g.stroke();
        g.beginPath(); g.moveTo(2, -164); g.lineTo(1, -148); g.stroke();
        g.beginPath(); g.moveTo(14, -158); g.lineTo(9, -146); g.stroke();
        g.fillStyle = c.eyeColor;
        g.beginPath(); g.arc(-7, -133, 3, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(8, -133, 3, 0, Math.PI * 2); g.fill();
        g.strokeStyle = c.markings;
        g.lineWidth = 1.7;
        g.beginPath(); g.moveTo(-15, -125); g.lineTo(-4, -122); g.stroke();
        g.beginPath(); g.moveTo(15, -125); g.lineTo(4, -122); g.stroke();
        g.beginPath(); g.moveTo(-11, -141); g.lineTo(-3, -140); g.stroke();
        g.beginPath(); g.moveTo(3, -140); g.lineTo(11, -141); g.stroke();
    } else if (c.id === 'sukuna') {
        // 内层发丝阴影
        g.fillStyle = c.hairShade || '#d19aa4';
        g.beginPath();
        g.arc(0, -148, 19, Math.PI, 0);
        g.fill();
        // 外层怒立短刺
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-20, -140);
        for (let i = 0; i <= 12; i++) { const a = -Math.PI + i * Math.PI / 12;
            g.lineTo(Math.cos(a) * 20, -140 + Math.sin(a) * 21 - (i % 2 ? 5 : 16)); }
        g.closePath();
        g.fill();
        // 鬓角利刺
        g.beginPath();
        g.moveTo(-19, -144);
        g.lineTo(-26, -134);
        g.lineTo(-17, -136);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(19, -144);
        g.lineTo(26, -134);
        g.lineTo(17, -136);
        g.closePath();
        g.fill();
        // 眉上双纹 + 闭合的第二对眼 + 颊线/颌线
        g.strokeStyle = c.markings || '#4a0812';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-11, -141);
        g.lineTo(-3, -141);
        g.stroke();
        g.beginPath();
        g.moveTo(3, -141);
        g.lineTo(11, -141);
        g.stroke();
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-11, -126);
        g.lineTo(-3, -126);
        g.stroke();
        g.beginPath();
        g.moveTo(3, -126);
        g.lineTo(11, -126);
        g.stroke();
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-14, -121);
        g.quadraticCurveTo(-7, -118.5, -3, -120);
        g.stroke();
        g.beginPath();
        g.moveTo(14, -121);
        g.quadraticCurveTo(7, -118.5, 3, -120);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -120);
        g.lineTo(0, -115);
        g.stroke();
        // 赤瞳微辉（呼吸明灭）
        g.fillStyle = 'rgba(255,36,56,' + (0.20 + Math.sin(t * 0.003) * 0.10) + ')';
        g.beginPath();
        g.arc(-7, -134, 5, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -134, 5, 0, Math.PI * 2);
        g.fill();
    } else if (c.id === 'okkotsu') {
        // 乙骨：凌乱蓬松黑色短发，锯齿状外缘 + 垂颈鬓发 + 蓬乱长刘海
        // 头顶蓬乱锯齿轮廓
        g.beginPath();
        g.moveTo(-21, -136);
        g.lineTo(-24, -146);
        g.lineTo(-19, -150);
        g.lineTo(-21, -158);
        g.lineTo(-13, -157);
        g.lineTo(-12, -166);
        g.lineTo(-5, -161);
        g.lineTo(0, -168);
        g.lineTo(5, -161);
        g.lineTo(11, -166);
        g.lineTo(13, -157);
        g.lineTo(20, -158);
        g.lineTo(18, -149);
        g.lineTo(24, -145);
        g.lineTo(20, -136);
        g.quadraticCurveTo(0, -142, -21, -136);
        g.closePath();
        g.fill();
        // 左鬓发（垂颈长束）
        g.beginPath();
        g.moveTo(-20, -140);
        g.quadraticCurveTo(-24, -128, -22, -116);
        g.lineTo(-19, -108);
        g.quadraticCurveTo(-16, -116, -17, -126);
        g.quadraticCurveTo(-17, -134, -15, -139);
        g.closePath();
        g.fill();
        // 右鬓发（外翘碎束）
        g.beginPath();
        g.moveTo(19, -140);
        g.quadraticCurveTo(23, -130, 22, -120);
        g.lineTo(25, -113);
        g.lineTo(20, -114);
        g.quadraticCurveTo(16, -124, 15, -134);
        g.closePath();
        g.fill();
        // 蓬乱长刘海（三束交错，尖端压向眉间）
        g.beginPath();
        g.moveTo(-15, -152);
        g.quadraticCurveTo(-13, -144, -16, -136);
        g.lineTo(-12, -140);
        g.quadraticCurveTo(-11, -135, -13, -131);
        g.lineTo(-9, -136);
        g.quadraticCurveTo(-8, -142, -9, -150);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(-4, -154);
        g.quadraticCurveTo(-3, -145, -6, -137);
        g.lineTo(-2, -142);
        g.quadraticCurveTo(0, -136, -1, -131);
        g.lineTo(2, -139);
        g.quadraticCurveTo(3, -146, 1, -153);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(7, -153);
        g.quadraticCurveTo(9, -145, 6, -138);
        g.lineTo(10, -142);
        g.quadraticCurveTo(12, -136, 11, -131);
        g.lineTo(14, -139);
        g.quadraticCurveTo(14, -147, 12, -152);
        g.closePath();
        g.fill();
        // 发丝高光（深蓝灰冷调）
        g.strokeStyle = c.hairShade || '#3a4468';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-10, -162);
        g.quadraticCurveTo(-7, -154, -9, -146);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -165);
        g.quadraticCurveTo(2, -156, 0, -148);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -162);
        g.quadraticCurveTo(11, -153, 9, -146);
        g.stroke();
        g.beginPath();
        g.moveTo(-19, -146);
        g.quadraticCurveTo(-21, -132, -20, -120);
        g.stroke();
    } else if (c.id === 'mahito') {
        // 真人：蓝灰中长发，梳成三股，右侧一股搭在肩前
        // 头顶轮廓
        g.beginPath();
        g.moveTo(-19, -138);
        g.quadraticCurveTo(-22, -150, -16, -158);
        g.quadraticCurveTo(-8, -164, 0, -163);
        g.quadraticCurveTo(8, -164, 16, -158);
        g.quadraticCurveTo(22, -150, 19, -138);
        g.lineTo(-19, -138);
        g.closePath();
        g.fill();
        // 左侧发股（向后垂）
        g.beginPath();
        g.moveTo(-17, -142);
        g.quadraticCurveTo(-21, -132, -19, -120);
        g.quadraticCurveTo(-18, -114, -15, -110);
        g.quadraticCurveTo(-13, -118, -14, -128);
        g.quadraticCurveTo(-14, -136, -13, -140);
        g.closePath();
        g.fill();
        // 中间发股
        g.beginPath();
        g.moveTo(-5, -140);
        g.quadraticCurveTo(-3, -128, -4, -118);
        g.quadraticCurveTo(-3, -112, -1, -108);
        g.quadraticCurveTo(1, -116, 0, -126);
        g.quadraticCurveTo(0, -134, -1, -138);
        g.closePath();
        g.fill();
        // 右侧发股（搭在肩前，较长）
        g.beginPath();
        g.moveTo(15, -142);
        g.quadraticCurveTo(21, -132, 20, -120);
        g.quadraticCurveTo(19, -110, 17, -102);
        g.quadraticCurveTo(15, -98, 13, -96);
        g.quadraticCurveTo(12, -106, 13, -118);
        g.quadraticCurveTo(13, -132, 12, -140);
        g.closePath();
        g.fill();
        // 发丝纹理
        g.strokeStyle = c.hairShade || '#4a7a9f';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-7, -158);
        g.quadraticCurveTo(-5, -150, -6, -142);
        g.stroke();
        g.beginPath();
        g.moveTo(5, -159);
        g.quadraticCurveTo(7, -150, 6, -142);
        g.stroke();
        // 面部缝合线（标志性特征：左面颊斜线 + 下颌横线，避开眼部）
        g.strokeStyle = c.stitchColor || '#3a3a4a';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-15, -128);
        g.lineTo(-9, -118);
        g.stroke();
        g.beginPath();
        g.moveTo(-11, -119);
        g.lineTo(10, -122);
        g.stroke();
        // 缝合针脚
        g.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
            const sx = -13.5 + i * 2.5, sy = -125.5 + i * 3;
            g.beginPath();
            g.moveTo(sx - 2, sy + 1.3);
            g.lineTo(sx + 2, sy - 1.3);
            g.stroke();
        }
        // 右侧发股扎带（肩前发股中段束带）
        g.strokeStyle = '#3a3a46';
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(12, -104);
        g.lineTo(19, -106);
        g.stroke();
    } else if (c.id === 'nanami') {
        // 七海：金色短发侧分，整洁利落
        g.beginPath();
        g.moveTo(-19, -138);
        g.quadraticCurveTo(-21, -150, -15, -157);
        g.quadraticCurveTo(-8, -162, 0, -161);
        g.quadraticCurveTo(8, -162, 15, -157);
        g.quadraticCurveTo(21, -150, 19, -138);
        g.lineTo(-19, -138);
        g.closePath();
        g.fill();
        // 侧分刘海（向左斜分）
        g.beginPath();
        g.moveTo(-14, -152);
        g.quadraticCurveTo(-16, -144, -18, -138);
        g.quadraticCurveTo(-15, -140, -12, -146);
        g.quadraticCurveTo(-8, -142, -10, -136);
        g.quadraticCurveTo(-6, -142, -5, -148);
        g.lineTo(-8, -152);
        g.closePath();
        g.fill();
        // 发丝纹理（金色调）
        g.strokeStyle = c.hairShade || '#a08040';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-6, -158);
        g.quadraticCurveTo(-4, -150, -5, -142);
        g.stroke();
        g.beginPath();
        g.moveTo(5, -159);
        g.quadraticCurveTo(7, -150, 6, -142);
        g.stroke();
        // 圆形眼镜（细深色框 + 绿色镜片）
        g.fillStyle = c.glassesLens || 'rgba(90,138,90,0.2)';
        g.beginPath(); g.arc(-7, -134, 6, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(8, -134, 6, 0, Math.PI * 2); g.fill();
        g.strokeStyle = c.glassesColor || '#2a2a2a';
        g.lineWidth = 1.2;
        g.beginPath(); g.arc(-7, -134, 6, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(8, -134, 6, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(-1, -134); g.lineTo(2, -134); g.stroke();
    } else if (c.id === 'kenjaku') {
        // 羂索：黑发高髻 + 侧垂长发 + 额头缝合疤 + 金环耳饰
        // 脑后垂发（底层）
        g.fillStyle = c.hairShade || '#2e2440';
        g.beginPath();
        g.moveTo(-15, -148);
        g.quadraticCurveTo(-23, -132, -20, -114);
        g.quadraticCurveTo(-17, -106, -14, -102);
        g.quadraticCurveTo(-13, -118, -14, -134);
        g.closePath();
        g.fill();
        // 头顶轮廓
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-19, -138);
        g.quadraticCurveTo(-22, -152, -14, -159);
        g.quadraticCurveTo(-7, -164, 0, -163);
        g.quadraticCurveTo(8, -164, 15, -158);
        g.quadraticCurveTo(22, -151, 19, -138);
        g.lineTo(-19, -138);
        g.closePath();
        g.fill();
        // 高髻
        g.beginPath();
        g.ellipse(-2, -167, 8.5, 6.5, -0.2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(-3, -173, 5, 4, -0.3, 0, Math.PI * 2);
        g.fill();
        // 发髻束绳
        g.strokeStyle = '#4a3a5e';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-9, -164);
        g.quadraticCurveTo(-2, -161, 5, -164);
        g.stroke();
        // 中分前发
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-1, -161);
        g.quadraticCurveTo(-11, -157, -16, -146);
        g.quadraticCurveTo(-11, -150, -5, -152);
        g.quadraticCurveTo(-3, -156, -1, -161);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(1, -161);
        g.quadraticCurveTo(11, -157, 16, -146);
        g.quadraticCurveTo(11, -150, 5, -152);
        g.quadraticCurveTo(3, -156, 1, -161);
        g.closePath();
        g.fill();
        // 两侧垂发
        g.beginPath();
        g.moveTo(-18, -142);
        g.quadraticCurveTo(-22, -128, -20, -114);
        g.quadraticCurveTo(-19, -108, -16, -104);
        g.quadraticCurveTo(-15, -118, -15.5, -130);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(18, -142);
        g.quadraticCurveTo(22, -128, 20, -114);
        g.quadraticCurveTo(19, -108, 16, -104);
        g.quadraticCurveTo(15, -118, 15.5, -130);
        g.closePath();
        g.fill();
        // 额头缝合疤（横疤 + 骑缝钉）
        g.strokeStyle = c.stitch || '#7a5a4a';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-14, -147);
        g.quadraticCurveTo(0, -149, 14, -147);
        g.stroke();
        g.lineWidth = 1;
        for (let i = -3; i <= 3; i++) {
            g.beginPath();
            g.moveTo(i * 4.2, -151);
            g.lineTo(i * 4.2, -144);
            g.stroke();
        }
        // 金环耳饰
        g.strokeStyle = '#e8c86a';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(19, -128, 3, -0.4, Math.PI + 0.8);
        g.stroke();
        g.beginPath();
        g.arc(-19, -128, 2.7, Math.PI - 0.8, Math.PI * 2 + 0.4);
        g.stroke();
    } else if (c.id === 'hanami') {
        // 面具咒灵：上半脸面具覆盖 + 双弯角 + 暴露嘴部獠牙 + 眼下黑色纹路
        const skin = c.skin || '#c8c8c0';
        // 下半脸（皮肤外露，下颚到颧骨）
        g.fillStyle = skin;
        g.beginPath();
        g.arc(0, -136, 20, Math.PI * 0.15, Math.PI * 0.85, true);
        g.lineTo(-14, -128);
        g.quadraticCurveTo(0, -122, 14, -128);
        g.closePath();
        g.fill();
        // 上半脸面具（米色覆盖额头到眼线区域）
        g.fillStyle = c.branch || '#e8e4d8';
        g.beginPath();
        g.arc(0, -136, 20, Math.PI, 0);
        g.lineTo(16, -130);
        g.quadraticCurveTo(0, -124, -16, -130);
        g.closePath();
        g.fill();
        // 面具边缘缝合线（齿状咬合）
        g.strokeStyle = c.grain || '#2a2a26';
        g.lineWidth = 1.2;
        for (let i = -14; i <= 14; i += 4) {
            g.beginPath();
            g.moveTo(i, -130); g.lineTo(i + 2, -128);
            g.stroke();
        }
        // 双弯角（从额头向上弯曲）
        g.strokeStyle = c.hair || '#3a3a36';
        g.lineWidth = 4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-8, -150);
        g.quadraticCurveTo(-16, -160, -14, -172);
        g.quadraticCurveTo(-12, -178, -8, -176);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -150);
        g.quadraticCurveTo(16, -160, 14, -172);
        g.quadraticCurveTo(12, -178, 8, -176);
        g.stroke();
        g.lineCap = 'butt';
        // 角纹路
        g.strokeStyle = c.hairShade || '#5a5a54';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-12, -158); g.lineTo(-10, -166); g.stroke();
        g.beginPath(); g.moveTo(12, -158); g.lineTo(10, -166); g.stroke();
        // 暴露嘴部：大裂口 + 獠牙
        g.fillStyle = '#3a1a18';
        g.beginPath();
        g.moveTo(-10, -128);
        g.quadraticCurveTo(-12, -120, -6, -118);
        g.quadraticCurveTo(0, -116, 6, -118);
        g.quadraticCurveTo(12, -120, 10, -128);
        g.closePath();
        g.fill();
        // 上颚獠牙（多枚锯齿）
        g.fillStyle = '#e8e4d0';
        g.beginPath();
        g.moveTo(-9, -128); g.lineTo(-7, -122); g.lineTo(-5, -128);
        g.lineTo(-3, -122); g.lineTo(-1, -128); g.lineTo(1, -122);
        g.lineTo(3, -128); g.lineTo(5, -122); g.lineTo(7, -128);
        g.lineTo(9, -122);
        g.closePath();
        g.fill();
        // 下颚獠牙
        g.beginPath();
        g.moveTo(-7, -118); g.lineTo(-5, -120); g.lineTo(-3, -118);
        g.lineTo(-1, -120); g.lineTo(1, -118); g.lineTo(3, -120);
        g.lineTo(5, -118); g.lineTo(7, -120);
        g.closePath();
        g.fill();
        // 眼下黑色纹路（从眼角向下延伸的静脉纹）
        g.strokeStyle = c.grain || '#2a2a26';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-10, -128); g.quadraticCurveTo(-14, -122, -16, -116);
        g.stroke();
        g.beginPath();
        g.moveTo(-11, -126); g.lineTo(-15, -124);
        g.stroke();
        g.beginPath();
        g.moveTo(10, -128); g.quadraticCurveTo(14, -122, 16, -116);
        g.stroke();
        g.beginPath();
        g.moveTo(11, -126); g.lineTo(15, -124);
        g.stroke();
        // 面具高光
        g.fillStyle = 'rgba(255,255,255,0.1)';
        g.beginPath();
        g.ellipse(-6, -146, 5, 7, -0.3, 0, Math.PI * 2);
        g.fill();
    } else if (c.id === 'jogo') {
        // 面具咒灵：蓝灰面具脸 + 棕色壶帽 + 单眼缝 + 利齿裂嘴 + 额纹
        g.fillStyle = c.skin || '#a8b0b8';
        g.beginPath();
        g.arc(0, -136, 20, 0, Math.PI * 2);
        g.fill();
        // 火山帽（嶙峋山体 + 顶部火山口熔光）
        const t2 = t || 0;
        g.fillStyle = c.hat || '#6e5a3a';
        g.beginPath();
        g.moveTo(-15, -150);
        g.lineTo(-17, -156); g.lineTo(-13, -162); g.lineTo(-16, -168);
        g.lineTo(-11, -172); g.lineTo(-9, -174);
        g.lineTo(9, -174); g.lineTo(11, -172); g.lineTo(16, -168);
        g.lineTo(13, -162); g.lineTo(17, -156); g.lineTo(15, -150);
        g.closePath(); g.fill();
        // 山体右侧暗面
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.beginPath();
        g.moveTo(2, -174); g.lineTo(9, -174); g.lineTo(11, -172); g.lineTo(16, -168);
        g.lineTo(13, -162); g.lineTo(17, -156); g.lineTo(15, -150); g.lineTo(8, -150);
        g.closePath(); g.fill();
        // 火山口（顶部凹陷）
        g.fillStyle = '#2a1a10';
        g.beginPath(); g.ellipse(0, -174, 9, 3, 0, 0, Math.PI * 2); g.fill();
        // 熔岩辉光（呼吸明灭）
        const glow = 0.55 + Math.sin(t2 * 0.0066) * 0.25;
        g.fillStyle = 'rgba(255,106,42,' + glow.toFixed(3) + ')';
        g.beginPath(); g.ellipse(0, -174, 6, 2, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,210,60,' + (glow * 0.8).toFixed(3) + ')';
        g.beginPath(); g.ellipse(0, -175, 3, 1, 0, 0, Math.PI * 2); g.fill();
        // 硫烟（两缕缓缓上升）
        g.strokeStyle = 'rgba(150,140,130,0.35)';
        g.lineWidth = 1.8; g.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
            const sx = -3 + i * 6, ph = t2 * 0.003 + i * 2.1;
            g.beginPath();
            g.moveTo(sx, -176);
            g.quadraticCurveTo(sx + Math.sin(ph) * 4, -184, sx + Math.sin(ph + 1) * 6, -192 - i * 2);
            g.stroke();
        }
        g.lineCap = 'butt';
        // 岩石纹理（不规则斜纹）
        g.strokeStyle = '#5a4830';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-14, -154); g.lineTo(-8, -160); g.stroke();
        g.beginPath(); g.moveTo(-10, -164); g.lineTo(-6, -168); g.stroke();
        g.beginPath(); g.moveTo(12, -156); g.lineTo(8, -162); g.stroke();
        g.beginPath(); g.moveTo(10, -166); g.lineTo(14, -170); g.stroke();
        // 熔岩裂纹（明灭）
        g.strokeStyle = 'rgba(255,106,42,' + (0.45 + Math.sin(t2 * 0.0066) * 0.2).toFixed(3) + ')';
        g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(-10, -156); g.lineTo(-7, -162); g.lineTo(-9, -168); g.stroke();
        g.beginPath(); g.moveTo(8, -158); g.lineTo(11, -164); g.stroke();
        // 额头棕色纹路
        g.strokeStyle = c.hat || '#6e5a3a';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(-10, -144); g.quadraticCurveTo(0, -148, 10, -144); g.stroke();
        g.beginPath(); g.moveTo(-8, -140); g.lineTo(8, -140); g.stroke();
        // 单眼缝
        g.fillStyle = '#1a1a20';
        g.beginPath(); g.ellipse(0, -134, 10, 3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ff9a3c';
        g.beginPath(); g.arc(0, -134, 2.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(1, -135, 0.8, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#3a3a30'; g.lineWidth = 1;
        g.beginPath(); g.ellipse(0, -134, 10, 3, 0, 0, Math.PI * 2); g.stroke();
        // 利齿裂嘴
        g.fillStyle = '#3a1a18';
        g.beginPath();
        g.moveTo(-10, -126);
        g.quadraticCurveTo(-12, -120, -6, -118);
        g.quadraticCurveTo(0, -116, 6, -118);
        g.quadraticCurveTo(12, -120, 10, -126);
        g.closePath(); g.fill();
        g.fillStyle = '#e8e4d0';
        g.beginPath();
        g.moveTo(-9, -126); g.lineTo(-7, -121); g.lineTo(-5, -126);
        g.lineTo(-3, -121); g.lineTo(-1, -126); g.lineTo(1, -121);
        g.lineTo(3, -126); g.lineTo(5, -121); g.lineTo(7, -126); g.lineTo(9, -121);
        g.closePath(); g.fill();
        g.beginPath();
        g.moveTo(-7, -118); g.lineTo(-5, -120); g.lineTo(-3, -118);
        g.lineTo(-1, -120); g.lineTo(1, -118); g.lineTo(3, -120);
        g.lineTo(5, -118); g.lineTo(7, -120);
        g.closePath(); g.fill();
        // 面具高光
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.beginPath(); g.ellipse(-7, -140, 4, 6, -0.3, 0, Math.PI * 2); g.fill();
    } else if (c.id === 'dagon') {
        // 陀艮：红色球状咒灵头—— elongated bulbous红头 + 深色斑点 + 头顶触手 + 面部粗触须下垂
        const skin = c.skin || '#8b1a1a';
        // 头部主体：更圆更长的 bulbous 球状
        g.fillStyle = skin;
        g.beginPath();
        g.moveTo(-22, -120);
        g.quadraticCurveTo(-28, -138, -25, -154);
        g.quadraticCurveTo(-19, -172, 0, -172);
        g.quadraticCurveTo(19, -172, 25, -154);
        g.quadraticCurveTo(28, -138, 22, -120);
        g.closePath();
        g.fill();
        // 头顶深色斑点（更大更明显）
        g.fillStyle = c.hair || '#3a0a0a';
        g.beginPath(); g.arc(-10, -162, 4, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(6, -164, 3.5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(-3, -156, 3, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(14, -156, 3.2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(-16, -154, 2.5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(0, -168, 2.8, 0, Math.PI * 2); g.fill();
        // 头顶触手（粗触手向上/后延伸，摆动）
        g.strokeStyle = skin;
        g.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
            const ang = -Math.PI * 0.7 + i * 0.35;
            const sw = Math.sin(t * 0.002 + i * 1.5) * 3;
            const bx = Math.cos(ang) * 20;
            const by = -164 + Math.sin(ang) * 8;
            g.lineWidth = 6 - i * 0.4;
            g.beginPath();
            g.moveTo(bx, by);
            g.quadraticCurveTo(bx + Math.cos(ang) * 16 + sw, by - 18, bx + Math.cos(ang) * 28 + sw * 1.5, by - 30);
            g.stroke();
        }
        g.lineCap = 'butt';
        // 触手吸盘点
        g.fillStyle = 'rgba(210,180,140,0.5)';
        for (let i = 0; i < 5; i++) {
            const ang = -Math.PI * 0.7 + i * 0.35;
            const sw = Math.sin(t * 0.002 + i * 1.5) * 3;
            const bx = Math.cos(ang) * 20;
            const by = -164 + Math.sin(ang) * 8;
            g.beginPath();
            g.arc(bx + Math.cos(ang) * 14 + sw * 0.5, by - 12, 1.5, 0, Math.PI * 2);
            g.fill();
        }
        // 面部粗触须（从眼下到下颌区域，多根粗触手向下垂落，摆动）
        g.strokeStyle = skin;
        g.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
            const fx = -12 + i * 6;
            const sw = Math.sin(t * 0.0025 + i * 0.9) * 4;
            const sw2 = Math.sin(t * 0.003 + i * 1.2) * 3;
            g.lineWidth = 5.5 - i * 0.3;
            g.beginPath();
            g.moveTo(fx, -128);
            g.quadraticCurveTo(fx + sw, -115, fx + sw2 * 1.5, -104);
            g.stroke();
        }
        // 触须吸盘点
        g.fillStyle = 'rgba(210,180,140,0.4)';
        for (let i = 0; i < 5; i++) {
            const fx = -12 + i * 6;
            const sw2 = Math.sin(t * 0.003 + i * 1.2) * 3;
            g.beginPath();
            g.arc(fx + sw2 * 0.8, -112, 1.2, 0, Math.PI * 2);
            g.fill();
        }
        g.lineCap = 'butt';
        // 湿润高光
        g.fillStyle = 'rgba(255,200,180,0.2)';
        g.beginPath();
        g.ellipse(-10, -160, 6, 3.5, -0.5, 0, Math.PI * 2);
        g.fill();
    } else if (c.id === 'naoya') {
        // 直哉：橄榄绿三七偏分短发 + 利落短鬓角 + 顶发微蓬
        // 后发主体（短发，贴头骨后部）
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-20, -138);
        g.quadraticCurveTo(-22, -152, -14, -156);
        g.quadraticCurveTo(-6, -160, 2, -158);
        g.quadraticCurveTo(12, -162, 18, -154);
        g.quadraticCurveTo(22, -146, 20, -136);
        g.quadraticCurveTo(12, -132, 0, -132);
        g.quadraticCurveTo(-12, -132, -20, -138);
        g.closePath();
        g.fill();
        // 顶发微蓬
        g.beginPath();
        g.moveTo(-14, -152);
        g.quadraticCurveTo(-8, -164, 0, -162);
        g.quadraticCurveTo(8, -166, 14, -158);
        g.quadraticCurveTo(10, -154, 0, -156);
        g.quadraticCurveTo(-6, -154, -14, -152);
        g.closePath();
        g.fill();
        // 三七偏分刘海（向右偏，覆盖左额 3 分，右额 7 分遮眉梢）
        g.beginPath();
        g.moveTo(-18, -144);
        g.quadraticCurveTo(-14, -154, -6, -152);
        g.quadraticCurveTo(2, -156, 12, -148);
        g.quadraticCurveTo(17, -144, 18, -136);
        g.quadraticCurveTo(10, -140, 2, -138);
        g.quadraticCurveTo(-6, -138, -18, -144);
        g.closePath();
        g.fill();
        // 右刘海短碎（不遮眉太多）
        g.beginPath();
        g.moveTo(10, -148);
        g.quadraticCurveTo(16, -144, 18, -136);
        g.quadraticCurveTo(12, -138, 8, -140);
        g.quadraticCurveTo(4, -142, 4, -146);
        g.closePath();
        g.fill();
        // 左刘海短碎
        g.beginPath();
        g.moveTo(-14, -148);
        g.quadraticCurveTo(-18, -140, -16, -132);
        g.quadraticCurveTo(-10, -134, -8, -140);
        g.quadraticCurveTo(-6, -144, -10, -146);
        g.closePath();
        g.fill();
        // 短鬓角（利落，只到耳上，不垂下颌）
        g.beginPath();
        g.moveTo(-18, -136);
        g.quadraticCurveTo(-20, -122, -16, -114);
        g.quadraticCurveTo(-13, -118, -13, -128);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(19, -136);
        g.quadraticCurveTo(21, -122, 17, -114);
        g.quadraticCurveTo(14, -118, 14, -128);
        g.closePath();
        g.fill();
        // 深色发根阴影带
        g.fillStyle = c.hairShade;
        g.beginPath();
        g.moveTo(-18, -138);
        g.quadraticCurveTo(-10, -142, 0, -142);
        g.quadraticCurveTo(10, -142, 18, -138);
        g.quadraticCurveTo(10, -136, 0, -136);
        g.quadraticCurveTo(-10, -136, -18, -138);
        g.closePath();
        g.fill();
        // 发丝层次线
        g.strokeStyle = c.hairShade;
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(-3, -160); g.lineTo(-1, -148); g.stroke(); // 偏分缝线
        g.beginPath(); g.moveTo(-10, -154); g.lineTo(-8, -142); g.stroke();
        g.beginPath(); g.moveTo(-14, -144); g.lineTo(-13, -132); g.stroke();
        g.beginPath(); g.moveTo(8, -154); g.lineTo(10, -140); g.stroke();
        g.beginPath(); g.moveTo(14, -146); g.lineTo(15, -130); g.stroke();
        g.beginPath(); g.moveTo(0, -158); g.lineTo(0, -146); g.stroke();
        // 黑色耳钉
        g.fillStyle = '#1a1a1a';
        g.beginPath();
        g.arc(19, -128, 1.5, 0, Math.PI * 2);
        g.fill();
        // 轻蔑笑
        g.strokeStyle = 'rgba(90,50,40,0.75)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-4, -125);
        g.quadraticCurveTo(3, -123, 8, -127);
        g.stroke();
    } else if (c.id === 'toji') {
        // 甚尔：黑色刺猬短发（密锯齿分层）+ 鬓角
        g.beginPath();
        g.moveTo(-21.5, -132);
        g.lineTo(-19.5, -142);
        g.lineTo(-23, -147);
        g.lineTo(-14.5, -149);
        g.lineTo(-15.5, -157);
        g.lineTo(-8, -152);
        g.lineTo(-5, -161);
        g.lineTo(0.5, -154);
        g.lineTo(5.5, -160);
        g.lineTo(9, -152.5);
        g.lineTo(16, -156);
        g.lineTo(14.5, -148);
        g.lineTo(22, -146);
        g.lineTo(18, -140);
        g.lineTo(21.5, -133);
        g.quadraticCurveTo(14, -144, 0, -145);
        g.quadraticCurveTo(-14, -144, -21.5, -132);
        g.closePath();
        g.fill();
        // 鬓角
        g.beginPath();
        g.moveTo(-21, -135);
        g.lineTo(-18.5, -135);
        g.lineTo(-20, -126);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(20.5, -135);
        g.lineTo(18, -135);
        g.lineTo(19.5, -126);
        g.closePath();
        g.fill();
        // 发丝分层（深灰内影）
        g.strokeStyle = c.hairShade || '#2e3540';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-10, -154);
        g.lineTo(-7, -147);
        g.stroke();
        g.beginPath();
        g.moveTo(-1, -157);
        g.lineTo(0, -148);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -155);
        g.lineTo(6, -148);
        g.stroke();
        g.beginPath();
        g.moveTo(15, -150);
        g.lineTo(12, -145);
        g.stroke();
    } else if (c.id === 'ryu') {
        // 石流龙：后梳短发 + 厚重飞机头炮管 + 蓝色咒力核心
        // 只覆盖头顶，不遮挡额头和眼睛
        g.beginPath();
        g.arc(0, -138, 21.5, Math.PI, 0);
        g.fill();
        // 头顶背头，三段起伏形成硬朗轮廓
        g.beginPath();
        g.moveTo(-19, -154);
        g.quadraticCurveTo(-11, -168, -3, -170);
        g.quadraticCurveTo(6, -172, 18, -156);
        g.lineTo(13, -152);
        g.quadraticCurveTo(5, -159, 0, -159);
        g.quadraticCurveTo(-10, -159, -19, -154);
        g.closePath(); g.fill();
        // 额前炮管发束：底部加宽，顶部收束
        g.beginPath();
        g.moveTo(-8, -160);
        g.quadraticCurveTo(-8, -176, -2, -184);
        g.quadraticCurveTo(2, -191, 8, -184);
        g.quadraticCurveTo(14, -176, 11, -164);
        g.quadraticCurveTo(8, -158, -8, -160);
        g.closePath(); g.fill();
        // 炮口内壁与蓝色核心外环
        g.fillStyle = 'rgba(9,18,32,0.86)';
        g.beginPath(); g.arc(2, -176, 6, 0, Math.PI * 2); g.fill();
        const ryuCorePulse = 0.85 + Math.sin(t * 0.12) * 0.15;
        g.fillStyle = 'rgba(110,184,255,0.22)';
        g.beginPath(); g.arc(2, -176, 9.5 * ryuCorePulse, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#dff1ff';
        g.beginPath(); g.arc(2, -176, 4.1 * ryuCorePulse, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(61,145,255,0.95)';
        g.beginPath(); g.arc(2, -176, 2.4 * ryuCorePulse, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(174,220,255,0.82)';
        g.lineWidth = 1.35;
        g.beginPath(); g.arc(2, -176, 5.8 * ryuCorePulse, 0, Math.PI * 2); g.stroke();
        // 飞机头硬边高光与发丝层次
        g.strokeStyle = 'rgba(112,130,154,0.7)';
        g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(-14, -163); g.quadraticCurveTo(-7, -170, -1, -168); g.stroke();
        g.beginPath(); g.moveTo(4, -170); g.quadraticCurveTo(10, -168, 15, -160); g.stroke();
        g.strokeStyle = c.hairShade || '#303640';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-11, -160); g.lineTo(-7, -150); g.stroke();
        g.beginPath(); g.moveTo(-1, -164); g.lineTo(0, -154); g.stroke();
        g.beginPath(); g.moveTo(10, -160); g.lineTo(7, -150); g.stroke();
        // 鬓角
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-20.5, -134);
        g.lineTo(-17.5, -134);
        g.lineTo(-19, -125);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(20, -134);
        g.lineTo(17.5, -134);
        g.lineTo(19, -125);
        g.closePath();
        g.fill();
    } else if (c.id === 'uro') {
        // 乌鹭亨子：粉白渐变大背头——发际线高抬全部后梳（无刘海）+ 垂肩长发浪不遮脸
        // 两侧垂肩长发浪（深粉底层，绝不跨过面部）
        g.fillStyle = c.hairShade || '#b05a92';
        g.beginPath();
        g.moveTo(-13, -156);
        g.quadraticCurveTo(-26, -148, -27, -128);
        g.quadraticCurveTo(-27, -108, -22, -86);
        g.quadraticCurveTo(-18, -96, -20, -116);
        g.quadraticCurveTo(-21, -134, -17, -148);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(13, -156);
        g.quadraticCurveTo(26, -148, 27, -128);
        g.quadraticCurveTo(27, -108, 22, -86);
        g.quadraticCurveTo(18, -96, 20, -116);
        g.quadraticCurveTo(21, -134, 17, -148);
        g.closePath();
        g.fill();
        // 发浪内侧亮部（粉白渐变）
        g.strokeStyle = 'rgba(248,214,232,0.7)';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(-22, -144);
        g.quadraticCurveTo(-25, -124, -21, -96);
        g.stroke();
        g.beginPath();
        g.moveTo(22, -144);
        g.quadraticCurveTo(25, -124, 21, -96);
        g.stroke();
        // 头顶大背头：发际线高抬（美人尖），发体全部向后梳起
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-20.5, -140);
        g.quadraticCurveTo(-23.5, -156, -13, -164.5);
        g.quadraticCurveTo(0, -170, 13, -164.5);
        g.quadraticCurveTo(23.5, -156, 20.5, -140);
        g.quadraticCurveTo(20, -150, 15.5, -154.5);
        g.quadraticCurveTo(8, -158.5, 2, -152.5);
        g.quadraticCurveTo(0, -151, -2, -152.5);
        g.quadraticCurveTo(-8, -158.5, -15.5, -154.5);
        g.quadraticCurveTo(-20, -150, -20.5, -140);
        g.closePath();
        g.fill();
        // 后梳发丝梳痕（自发际线向头顶后方收束）
        g.strokeStyle = c.hairShade || '#b05a92';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-3, -152.5);
        g.quadraticCurveTo(-4, -160, -7, -166);
        g.stroke();
        g.beginPath();
        g.moveTo(3, -152.5);
        g.quadraticCurveTo(4, -160, 7, -166);
        g.stroke();
        g.beginPath();
        g.moveTo(-11, -155.5);
        g.quadraticCurveTo(-14, -161, -16, -163);
        g.stroke();
        g.beginPath();
        g.moveTo(11, -155.5);
        g.quadraticCurveTo(14, -161, 16, -163);
        g.stroke();
        // 发顶粉白亮部（渐变至白的发根高光）
        g.strokeStyle = 'rgba(255,238,248,0.85)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-6, -167.5);
        g.quadraticCurveTo(0, -169.5, 6, -167.5);
        g.stroke();
        g.strokeStyle = 'rgba(255,238,248,0.5)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-13, -163.5);
        g.quadraticCurveTo(0, -168, 13, -163.5);
        g.stroke();
        // 耳部银环耳饰（发不遮耳，直接外露）
        g.strokeStyle = '#d8dce4';
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(-19, -130, 2.4, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(19, -130, 2.4, 0, Math.PI * 2);
        g.stroke();
    } else if (c.id === 'druv') {
        // 杜鲁夫：尖顶头巾（额前三角纹章）+ 两侧垂落白发帘 + 成缕长白须
        // 两侧垂落的白发帘（不跨面部）
        g.fillStyle = c.hairShade || '#b2a894';
        g.beginPath();
        g.moveTo(-14, -154);
        g.quadraticCurveTo(-24, -148, -26, -134);
        g.quadraticCurveTo(-27, -124, -23, -115);
        g.lineTo(-18.5, -123);
        g.quadraticCurveTo(-20, -134, -17, -147);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(14, -154);
        g.quadraticCurveTo(24, -148, 26, -134);
        g.quadraticCurveTo(27, -124, 23, -115);
        g.lineTo(18.5, -123);
        g.quadraticCurveTo(20, -134, 17, -147);
        g.closePath();
        g.fill();
        // 发帘亮丝
        g.strokeStyle = 'rgba(246,242,232,0.7)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-21, -144);
        g.quadraticCurveTo(-23.5, -132, -21, -120);
        g.stroke();
        g.beginPath();
        g.moveTo(21, -144);
        g.quadraticCurveTo(23.5, -132, 21, -120);
        g.stroke();
        // 尖顶头巾（覆顶至额，顶部高耸收尖）
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-20.5, -138);
        g.quadraticCurveTo(-23, -156, -11, -165);
        g.quadraticCurveTo(-4, -174, 0, -181);
        g.quadraticCurveTo(4, -174, 11, -165);
        g.quadraticCurveTo(23, -156, 20.5, -138);
        g.quadraticCurveTo(10, -147, 0, -147.5);
        g.quadraticCurveTo(-10, -147, -20.5, -138);
        g.closePath();
        g.fill();
        // 头巾前缘束带线与折痕
        g.strokeStyle = 'rgba(120,106,88,0.6)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-19, -140);
        g.quadraticCurveTo(0, -150, 19, -140);
        g.stroke();
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-8, -152);
        g.quadraticCurveTo(-3, -166, 0, -176);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -152);
        g.quadraticCurveTo(3, -166, 0, -176);
        g.stroke();
        // 额前三角纹章（倒三角）
        g.fillStyle = 'rgba(40,32,24,0.85)';
        g.beginPath();
        g.moveTo(-4.5, -162);
        g.lineTo(4.5, -162);
        g.lineTo(0, -152.5);
        g.closePath();
        g.fill();
        // 面颊凹陷纹（枯瘦老者的颊侧衰老纹）
        g.strokeStyle = 'rgba(96,70,48,0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-14, -133);
        g.quadraticCurveTo(-12, -129, -13, -126);
        g.stroke();
        g.beginPath();
        g.moveTo(14, -133);
        g.quadraticCurveTo(12, -129, 13, -126);
        g.stroke();
        // 唇上长垂八字白须
        g.strokeStyle = c.hair;
        g.lineWidth = 2.4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-1.5, -129);
        g.quadraticCurveTo(-8, -127, -11.5, -117);
        g.stroke();
        g.beginPath();
        g.moveTo(1.5, -129);
        g.quadraticCurveTo(8, -127, 11.5, -117);
        g.stroke();
        g.lineCap = 'butt';
        // 颏下成缕长白须（三缕垂落）
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-3.5, -123);
        g.quadraticCurveTo(-5, -111, -2, -99);
        g.quadraticCurveTo(0, -96.5, 2, -99);
        g.quadraticCurveTo(5, -111, 3.5, -123);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(-9.5, -126);
        g.quadraticCurveTo(-11, -117, -8, -108);
        g.quadraticCurveTo(-6.5, -106.5, -5.5, -109);
        g.quadraticCurveTo(-7, -118, -6, -124.5);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(9.5, -126);
        g.quadraticCurveTo(11, -117, 8, -108);
        g.quadraticCurveTo(6.5, -106.5, 5.5, -109);
        g.quadraticCurveTo(7, -118, 6, -124.5);
        g.closePath();
        g.fill();
        // 须缕内影线
        g.strokeStyle = 'rgba(150,138,118,0.6)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-0.5, -120);
        g.quadraticCurveTo(-1.5, -110, 0, -101);
        g.stroke();
        g.beginPath();
        g.moveTo(-7.5, -123);
        g.quadraticCurveTo(-9, -116, -7, -110);
        g.stroke();
        g.beginPath();
        g.moveTo(7.5, -123);
        g.quadraticCurveTo(9, -116, 7, -110);
        g.stroke();
    } else if (c.id === 'kuro') {
        // 黑沐死：黑色圆顶头罩（环形罩缘）+ 橙红面甲板块缝线 + 栅栏状牙口 + 双触须
        // 头顶双触须（细长外扬上挑）
        g.strokeStyle = '#3c1828';
        g.lineWidth = 2;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-7, -158);
        g.quadraticCurveTo(-19, -173, -30, -181);
        g.stroke();
        g.beginPath();
        g.moveTo(7, -158);
        g.quadraticCurveTo(19, -173, 30, -181);
        g.stroke();
        g.lineCap = 'butt';
        // 黑色圆顶头罩（环形：外圆减去面甲开窗）
        g.fillStyle = c.hair;
        g.beginPath();
        g.arc(0, -139, 23.5, 0, Math.PI * 2);
        g.ellipse(0, -135.5, 15, 16, 0, 0, Math.PI * 2, true);
        g.fill();
        // 罩顶弧光（微亮缘）
        g.strokeStyle = c.hairShade || '#2c2420';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(0, -139, 21.2, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
        // 面甲板块缝线（横向暗缝 + 中缝）
        g.strokeStyle = 'rgba(74,26,20,0.6)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-13, -142);
        g.quadraticCurveTo(0, -139.5, 13, -142);
        g.stroke();
        g.beginPath();
        g.moveTo(-13.5, -132);
        g.quadraticCurveTo(0, -129.5, 13.5, -132);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -150);
        g.lineTo(0, -142);
        g.stroke();
        // 栅栏状牙口（暗口带 + 竖排亮齿条）
        g.fillStyle = '#2c0e08';
        g.beginPath();
        g.moveTo(-9.5, -128);
        g.quadraticCurveTo(0, -129.5, 9.5, -128);
        g.quadraticCurveTo(10, -123.5, 8.5, -121);
        g.quadraticCurveTo(0, -119, -8.5, -121);
        g.quadraticCurveTo(-10, -123.5, -9.5, -128);
        g.closePath();
        g.fill();
        g.strokeStyle = '#f0b060';
        g.lineWidth = 1.2;
        for (let i = -3; i <= 3; i++) {
            g.beginPath();
            g.moveTo(i * 2.5, -127.8 + Math.abs(i) * 0.3);
            g.lineTo(i * 2.5, -121.4 - Math.abs(i) * 0.3);
            g.stroke();
        }
    }
    // 眼睛（伏黑两版本已在头部分支自绘）
    if (c.id === 'gojo' || c.id === 'gojo2' || c.id === 'megumi' || c.id === 'megumi2') {} else if (c.id === 'hanami') {
        // 面具覆盖上半脸，无眼睛
    } else if (c.id === 'jogo') {
        // 眼缝已在头部绘制，此处跳过
    } else if (c.id === 'dagon') {
        // 双眼（大圆眼，白色巩膜 + 黑色大瞳孔 + 高光 + 眼眶描边）
        g.fillStyle = '#f0f0e8';
        g.beginPath();
        g.arc(-9, -140, 7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(9, -140, 7, 0, Math.PI * 2);
        g.fill();
        // 黑色大瞳孔
        g.fillStyle = '#0a0604';
        g.beginPath();
        g.arc(-9, -140, 4.5, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(9, -140, 4.5, 0, Math.PI * 2);
        g.fill();
        // 高光
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(-11, -143, 2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(7, -143, 2, 0, Math.PI * 2);
        g.fill();
        // 眼眶描边
        g.strokeStyle = 'rgba(20,8,4,0.4)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(-9, -140, 7, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(9, -140, 7, 0, Math.PI * 2);
        g.stroke();
    } else if (c.id === 'mahito') {
        // 真人：漆黑双瞳 + 微小高光
        g.fillStyle = '#14141c';
        g.beginPath();
        g.arc(-7, -134, 2.6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -134, 2.6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.beginPath();
        g.arc(-7.8, -134.9, 0.7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(7.2, -134.9, 0.7, 0, Math.PI * 2);
        g.fill();
    } else if (c.id === 'naoya') {
        // 眼角上挑的琥珀色细目（傲慢睨视）
        g.fillStyle = '#fdf6ea';
        g.beginPath();
        g.moveTo(-12, -133.5);
        g.quadraticCurveTo(-7, -139, -2, -134.5);
        g.quadraticCurveTo(-7, -131.5, -12, -133.5);
        g.fill();
        g.beginPath();
        g.moveTo(3, -134.5);
        g.quadraticCurveTo(8, -139, 13, -133.5);
        g.quadraticCurveTo(8, -131.5, 3, -134.5);
        g.fill();
        // 灰色虹膜与瞳孔
        g.fillStyle = c.eyeColor || '#b0b8c0';
        g.beginPath();
        g.arc(-7, -135, 2.2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -135, 2.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#2a1c0c';
        g.beginPath();
        g.arc(-7, -135, 1, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -135, 1, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(-8, -136, 0.7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(7, -136, 0.7, 0, Math.PI * 2);
        g.fill();
        // 外眼角上挑眼线
        g.strokeStyle = 'rgba(60,40,20,0.8)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-12, -133.5);
        g.lineTo(-15, -137);
        g.stroke();
        g.beginPath();
        g.moveTo(13, -133.5);
        g.lineTo(16, -137);
        g.stroke();
        // 细挑眉
        g.strokeStyle = 'rgba(150,120,60,0.8)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-11, -142);
        g.quadraticCurveTo(-6, -144.5, -2, -142.5);
        g.stroke();
        g.beginPath();
        g.moveTo(3, -142.5);
        g.quadraticCurveTo(8, -144.5, 12, -142);
        g.stroke();
    } else if (c.id === 'toji') {
        // 死鱼般的冷冽细目：上睑压平 + 墨绿虹膜 + 右嘴角刀疤
        g.fillStyle = '#e8e4dc';
        g.beginPath();
        g.ellipse(-7, -134, 4.4, 2.5, 0.06, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(8, -134, 4.4, 2.5, -0.06, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#2a4a2a';
        g.beginPath();
        g.arc(-7, -133.8, 2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -133.8, 2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#0c120c';
        g.beginPath();
        g.arc(-7, -133.8, 0.9, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -133.8, 0.9, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.beginPath();
        g.arc(-6.3, -134.6, 0.55, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8.7, -134.6, 0.55, 0, Math.PI * 2);
        g.fill();
        // 上睑压平粗线（三白眼压迫感）
        g.strokeStyle = 'rgba(16,18,22,0.95)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-11.5, -135.6);
        g.lineTo(-2.5, -135.8);
        g.stroke();
        g.beginPath();
        g.moveTo(3.5, -135.8);
        g.lineTo(12.5, -135.6);
        g.stroke();
        // 低平直眉
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-11, -140.5);
        g.lineTo(-3, -140);
        g.stroke();
        g.beginPath();
        g.moveTo(4, -140);
        g.lineTo(12, -140.5);
        g.stroke();
        // 右嘴角刀疤（浅色旧疤 + 缝合痕）
        g.strokeStyle = '#c09080';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(9, -128);
        g.quadraticCurveTo(13, -125.5, 17.5, -122);
        g.stroke();
        g.strokeStyle = '#8a5a4a';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(9, -128);
        g.quadraticCurveTo(13, -125.5, 17.5, -122);
        g.stroke();
        for (let i = 0; i < 3; i++) {
            const sx = 10.5 + i * 2.6,
                sy = -127.1 + i * 1.8;
            g.beginPath();
            g.moveTo(sx - 1.1, sy + 1.1);
            g.lineTo(sx + 1.1, sy - 1.1);
            g.stroke();
        }
        // 冷峻抿平嘴线
        g.strokeStyle = 'rgba(90,50,40,0.8)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-6, -125);
        g.lineTo(5, -125);
        g.stroke();
    } else if (c.id === 'ryu') {
        // 石流龙：窄长锐眼 + 棕金虹膜 + 压低浓眉
        g.fillStyle = '#f2eee6';
        g.beginPath();
        g.ellipse(-7, -134, 5.2, 2.8, 0.08, 0, Math.PI * 2); g.fill();
        g.beginPath();
        g.ellipse(8, -134, 5.2, 2.8, -0.08, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#9a642c';
        g.beginPath(); g.arc(-7, -134, 2.55, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(8, -134, 2.55, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#241307';
        g.beginPath(); g.arc(-7, -134, 1.15, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(8, -134, 1.15, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(-8.2, -135.1, 0.8, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(6.8, -135.1, 0.8, 0, Math.PI * 2); g.fill();
        // 压低上睑与外眼角挑线
        g.strokeStyle = 'rgba(16,14,10,0.95)';
        g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(-12, -134); g.quadraticCurveTo(-7, -136.5, -2.2, -134); g.lineTo(-0.5, -135.5); g.stroke();
        g.beginPath(); g.moveTo(3.2, -134); g.quadraticCurveTo(8, -136.5, 12.8, -134); g.lineTo(14.2, -135.5); g.stroke();
        // 粗重浓眉：内端压低，外端抬起
        g.lineWidth = 2.6;
        g.beginPath(); g.moveTo(-12, -140.4); g.quadraticCurveTo(-7, -142.8, -2.2, -139.8); g.stroke();
        g.beginPath(); g.moveTo(3.2, -139.8); g.quadraticCurveTo(8, -142.8, 13, -140.4); g.stroke();
        // 露齿感笑纹
        g.strokeStyle = 'rgba(70,38,30,0.88)';
        g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(-8, -127); g.quadraticCurveTo(0, -120.5, 9, -127); g.stroke();
        g.strokeStyle = 'rgba(255,238,220,0.55)';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(-5, -123.5); g.lineTo(5, -123.5); g.stroke();
    } else if (c.id === 'uro') {
        // 傲然凤眼：眼尾上挑 + 墨黑瞳 + 细长挑眉 + 淡色薄唇
        g.fillStyle = '#f6f2ee';
        g.beginPath();
        g.moveTo(-12, -133.5);
        g.quadraticCurveTo(-7, -138.5, -2.5, -134);
        g.quadraticCurveTo(-7, -130.8, -12, -133.5);
        g.fill();
        g.beginPath();
        g.moveTo(3.5, -134);
        g.quadraticCurveTo(8, -138.5, 13, -133.5);
        g.quadraticCurveTo(8, -130.8, 3.5, -134);
        g.fill();
        // 墨黑虹膜
        g.fillStyle = c.eyeColor || '#16181e';
        g.beginPath();
        g.arc(-7, -134.2, 2.3, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -134.2, 2.3, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(-7.8, -135.2, 0.7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(7.2, -135.2, 0.7, 0, Math.PI * 2);
        g.fill();
        // 浓重上眼线（沿上睑勾勒，眼尾上挑）
        g.strokeStyle = 'rgba(20,12,18,0.95)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-12, -133.5);
        g.quadraticCurveTo(-7, -138.5, -2.5, -134.5);
        g.stroke();
        g.beginPath();
        g.moveTo(3.5, -134.5);
        g.quadraticCurveTo(8, -138.5, 13, -133.5);
        g.stroke();
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-12, -133.5);
        g.lineTo(-15.5, -137);
        g.stroke();
        g.beginPath();
        g.moveTo(13, -133.5);
        g.lineTo(16.5, -137);
        g.stroke();
        // 细高挑眉（远离眼睛的高位细弯眉，原作标志特征）
        g.strokeStyle = 'rgba(120,60,90,0.9)';
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(-12, -146);
        g.quadraticCurveTo(-7, -150.5, -2, -147.5);
        g.stroke();
        g.beginPath();
        g.moveTo(2, -147.5);
        g.quadraticCurveTo(7, -150.5, 12, -146);
        g.stroke();
        // 淡色薄唇（微抿）
        g.strokeStyle = 'rgba(180,100,110,0.75)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-5, -124.5);
        g.quadraticCurveTo(0, -123.2, 5, -124.5);
        g.stroke();
    } else if (c.id === 'druv') {
        // 深陷黑眼窝：环目暗影 + 苍白小虹膜 + 灰白垂眉（古老术师的洞穿目光）
        // 深陷眼窝暗影
        g.fillStyle = 'rgba(28,20,14,0.6)';
        g.beginPath();
        g.ellipse(-7, -134.5, 5.6, 4.2, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(8, -134.5, 5.6, 4.2, 0, 0, Math.PI * 2);
        g.fill();
        // 窄长暗白眼白
        g.fillStyle = '#ded4c2';
        g.beginPath();
        g.ellipse(-7, -134, 3.6, 2, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(8, -134, 3.6, 2, 0, 0, Math.PI * 2);
        g.fill();
        // 苍白小虹膜 + 针尖黑瞳
        g.fillStyle = c.eyeColor || '#d8c8a0';
        g.beginPath();
        g.arc(-7, -134, 1.8, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -134, 1.8, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#140c06';
        g.beginPath();
        g.arc(-7, -134, 0.8, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -134, 0.8, 0, Math.PI * 2);
        g.fill();
        // 上睑沉重暗线
        g.strokeStyle = 'rgba(16,10,6,0.9)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-11.5, -135);
        g.quadraticCurveTo(-7, -137.5, -2.5, -135);
        g.stroke();
        g.beginPath();
        g.moveTo(12.5, -135);
        g.quadraticCurveTo(8, -137.5, 3.5, -135);
        g.stroke();
        // 眼下衰老垂纹
        g.strokeStyle = 'rgba(70,50,34,0.6)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-11, -130);
        g.quadraticCurveTo(-7, -128.5, -3, -129.8);
        g.stroke();
        g.beginPath();
        g.moveTo(12, -130);
        g.quadraticCurveTo(8, -128.5, 4, -129.8);
        g.stroke();
        // 灰白细长垂眉
        g.strokeStyle = 'rgba(226,220,206,0.95)';
        g.lineWidth = 1.8;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-12.5, -139.5);
        g.quadraticCurveTo(-7, -142, -2.5, -140.5);
        g.stroke();
        g.beginPath();
        g.moveTo(12.5, -139.5);
        g.quadraticCurveTo(7, -142, 2.5, -140.5);
        g.stroke();
        g.lineCap = 'butt';
        // 眉间双竖纹（岁月刻痕）
        g.strokeStyle = 'rgba(60,42,28,0.6)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-1.2, -141.5);
        g.lineTo(-1.6, -138.5);
        g.stroke();
        g.beginPath();
        g.moveTo(1.2, -141.5);
        g.lineTo(1.6, -138.5);
        g.stroke();
    } else if (c.id === 'kuro') {
        // 黑沐死：一对大暗红主眼斑 + 上方多枚小眼斑（多眼面甲，无眼白）
        // 主眼斑暗晕
        g.fillStyle = 'rgba(122,20,32,0.30)';
        g.beginPath();
        g.ellipse(-7, -134, 6.2, 4.8, 0.18, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(7, -134, 6.2, 4.8, -0.18, 0, Math.PI * 2);
        g.fill();
        // 主眼斑本体（暗红）
        g.fillStyle = c.eyeColor || '#7a1420';
        g.beginPath();
        g.ellipse(-7, -134, 4.6, 3.4, 0.18, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(7, -134, 4.6, 3.4, -0.18, 0, Math.PI * 2);
        g.fill();
        // 眼内腐橙亮核 + 高光点
        g.fillStyle = '#e0862e';
        g.beginPath();
        g.arc(-7, -134, 1.7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(7, -134, 1.7, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#f0b060';
        g.beginPath();
        g.arc(-7.7, -134.7, 0.75, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(6.3, -134.7, 0.75, 0, Math.PI * 2);
        g.fill();
        // 上方多枚小眼斑（弧形排列，多眼咒灵）
        g.fillStyle = c.eyeColor || '#7a1420';
        const kspots = [[-11, -142, 1.6], [-4.5, -144.2, 1.25], [0, -145.2, 1.05], [4.5, -144.2, 1.25], [11, -142, 1.6]];
        for (const sp of kspots) {
            g.beginPath();
            g.arc(sp[0], sp[1], sp[2], 0, Math.PI * 2);
            g.fill();
        }
        // 大颗小眼斑内的橙芯
        g.fillStyle = '#e0862e';
        g.beginPath();
        g.arc(-11, -142, 0.65, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(11, -142, 0.65, 0, Math.PI * 2);
        g.fill();
    } else if (c.id === 'okkotsu') {
        // 疲惫温柔的垂眼：墨黑瞳 + 湿润高光 + 深重双层黑眼圈
        g.fillStyle = '#eef0f4';
        g.beginPath();
        g.ellipse(-7, -134, 4.2, 2.9, 0.10, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(8, -134, 4.2, 2.9, -0.10, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = c.eyeColor || '#1a1e26';
        g.beginPath();
        g.arc(-7, -133.8, 2.3, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -133.8, 2.3, 0, Math.PI * 2);
        g.fill();
        // 湿润高光
        g.fillStyle = 'rgba(255,255,255,0.9)';
        g.beginPath();
        g.arc(-7.8, -134.8, 0.6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(7.2, -134.8, 0.6, 0, Math.PI * 2);
        g.fill();
        // 上睑微垂线（疲惫感）
        g.strokeStyle = 'rgba(14,17,24,0.9)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-11, -136.2);
        g.quadraticCurveTo(-7, -137.6, -3, -135.6);
        g.stroke();
        g.beginPath();
        g.moveTo(12, -136.2);
        g.quadraticCurveTo(8, -137.6, 4, -135.6);
        g.stroke();
        // 双层黑眼圈（原作标志性特征）
        g.fillStyle = 'rgba(58,48,84,0.40)';
        g.beginPath();
        g.ellipse(-7, -129.5, 4.2, 2.2, 0, 0, Math.PI);
        g.fill();
        g.beginPath();
        g.ellipse(8, -129.5, 4.2, 2.2, 0, 0, Math.PI);
        g.fill();
        g.strokeStyle = 'rgba(50,40,72,0.55)';
        g.lineWidth = 1.1;
        g.beginPath();
        g.arc(-7, -130.5, 4, 0.3, Math.PI - 0.3);
        g.stroke();
        g.beginPath();
        g.arc(8, -130.5, 4, 0.3, Math.PI - 0.3);
        g.stroke();
        g.beginPath();
        g.arc(-7, -128.2, 4.6, 0.5, Math.PI - 0.5);
        g.stroke();
        g.beginPath();
        g.arc(8, -128.2, 4.6, 0.5, Math.PI - 0.5);
        g.stroke();
        // 柔和斜眉（略带忧郁）
        g.strokeStyle = 'rgba(20,24,34,0.8)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-11, -140);
        g.quadraticCurveTo(-7, -141.5, -3, -139.5);
        g.stroke();
        g.beginPath();
        g.moveTo(4, -139.5);
        g.quadraticCurveTo(8, -141.5, 12, -140);
        g.stroke();
    } else if (c.id === 'yuji' || c.id === 'yuji2') {
        // 棕色圆瞳大眼 + 粗直浓眉 + 左眼下红痕
        g.fillStyle = '#f6f2ec';
        g.beginPath();
        g.ellipse(-7, -134, 4.0, 3.2, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(8, -134, 4.0, 3.2, 0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = c.eyeColor || '#6a4426';
        g.beginPath();
        g.arc(-7, -134, 2.5, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -134, 2.5, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#2a1a10';
        g.beginPath();
        g.arc(-7, -133.8, 1.1, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -133.8, 1.1, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(-7.9, -135, 0.8, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(7.1, -135, 0.8, 0, Math.PI * 2);
        g.fill();
        // 粗直浓眉（少年的开朗坚毅）
        g.strokeStyle = 'rgba(90,60,60,0.9)';
        g.lineWidth = 2;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-11, -140);
        g.lineTo(-3, -140.6);
        g.stroke();
        g.beginPath();
        g.moveTo(4, -140.6);
        g.lineTo(12, -140);
        g.stroke();
        g.lineCap = 'butt';
        // 左眼下红痕
        g.strokeStyle = 'rgba(200,40,40,0.5)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-7, -128);
        g.lineTo(-7, -124);
        g.stroke();
        if (c.id === 'yuji2') {
            // 新宿决战：眼角血迹
            g.fillStyle = 'rgba(200,40,40,0.55)';
            g.beginPath();
            g.arc(-11, -130, 2.6, 0, Math.PI * 2);
            g.fill();
            g.fillRect(-11.6, -130, 1.6, 7);
        }
    } else if (c.id === 'kenjaku') {
        // 窄长锐眼（深紫瞳，自信睥睨）
        g.fillStyle = '#f0e8e0';
        g.beginPath(); g.ellipse(-8, -134, 4, 2, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(8, -134, 4, 2, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = c.eyeColor || '#3a2a4a';
        g.beginPath(); g.arc(-8, -134, 2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(8, -134, 2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(-9, -134.5, 0.7, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(7, -134.5, 0.7, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#1a0a18'; g.lineWidth = 1;
        g.beginPath(); g.ellipse(-8, -134, 4, 2, 0, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.ellipse(8, -134, 4, 2, 0, 0, Math.PI * 2); g.stroke();
    } else {
        g.fillStyle = c.id === 'sukuna' ? (c.eyeColor || '#ff2438') : '#20242e';
        g.beginPath();
        g.arc(-7, -134, 2.6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, -134, 2.6, 0, Math.PI * 2);
        g.fill();
        if (c.id === 'nanami') {
            // 圆形眼镜绿片反光
            g.fillStyle = 'rgba(90,138,90,0.15)';
            g.beginPath(); g.arc(-7, -134, 5, 0, Math.PI * 2); g.fill();
            g.beginPath(); g.arc(8, -134, 5, 0, Math.PI * 2); g.fill();
        }
    }
}
