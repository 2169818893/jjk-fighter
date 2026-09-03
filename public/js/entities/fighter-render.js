/* =====================================================================
   Fighter 渲染器 v2：姿势计算 + 精致化 Canvas 绘制
   将绘制逻辑从 fighter-core 分离，方便独立迭代人物动作与模型
   ===================================================================== */
import { lerp, clamp, rand } from '../utils.js';

/* ---------------- 向量/角度辅助 ---------------- */
/* （toRad/len2/angleTo/qLerp 已无引用，移除；如需恢复见 git 历史） */

/* ---------------- 姿势计算 ---------------- */
function computePose(f) {
    const t = f.animT,
        // 前期伏黑惠必杀连放共用普通技能姿势，但时间来自独立序列轴。
        st = f.ultSequenceActive ? f.ultSequenceLocal : f.st;
    const moving = f.state === 'walk';
    const bob = f.onGround ? Math.sin(t * 0.09) * 2.2 : 0;

    let progress = 0,
        peak = 0;
    if (f.state === 'attack') { progress = clamp(st / (f.attackDur || 24), 0, 1);
        peak = Math.sin(progress * Math.PI); } else if (f.state === 'skill') { progress = clamp(st / (f.skillDur || 36), 0, 1);
        peak = Math.sin(progress * Math.PI); } else if (f.state === 'ult') { progress = clamp(st / 90, 0, 1);
        peak = Math.sin(progress * Math.PI); }

    // 默认站立姿势（胯部 y=0；躯干在上方，腿从胯部下方自然伸出）
    const pose = {
        bodyY: -84 + bob,
        bodyRot: 0,
        bodyTilt: 0,
        shoulderL: { x: -22, y: -110 },
        shoulderR: { x: 22, y: -110 },
        hipL: { x: -11, y: -48 },
        hipR: { x: 11, y: -48 },
        headY: -136,
        headRot: 0,
        armL: { elbow: { x: -28, y: -80 }, hand: { x: -34, y: -56 }, rot: 0 },
        armR: { elbow: { x: 28, y: -80 }, hand: { x: 34, y: -56 }, rot: 0 },
        legL: { knee: { x: -10, y: -24 }, foot: { x: -12, y: 0 } },
        legR: { knee: { x: 12, y: -24 }, foot: { x: 14, y: 0 } },
        weaponRot: 0.9,
        auraBoost: 0,
        ghost: 0,
        atkExt: peak
    };

    // 受伤/击飞/击倒 倾斜
    if (f.state === 'hurt') pose.bodyTilt = -0.28;
    else if (f.state === 'launched') pose.bodyTilt = -0.65;
    else if (f.state === 'ko') pose.bodyTilt = -1.35;

    // 移动：四肢摆动 + 重心
    if (moving) {
        const a = t * 0.34;
        pose.hipL.x += Math.sin(a) * 7;
        pose.legL.knee.x += Math.sin(a - 0.55) * 14;
        pose.legL.foot.x += Math.sin(a - 1.1) * 16;
        pose.hipR.x -= Math.sin(a) * 7;
        pose.legR.knee.x -= Math.sin(a - 0.55) * 14;
        pose.legR.foot.x -= Math.sin(a - 1.1) * 16;
        pose.shoulderL.x += Math.sin(a) * 6;
        pose.armL.hand.x += Math.sin(a) * 12;
        pose.shoulderR.x -= Math.sin(a) * 6;
        pose.armR.hand.x -= Math.sin(a) * 12;
        pose.bodyY += Math.abs(Math.sin(a)) * 2.4;
        pose.bodyRot = Math.sin(a) * 0.04;
    }

    // 跳跃
    if (f.airborne && f.state !== 'launched' && f.state !== 'ko') {
        pose.legL.knee.y -= 8;
        pose.legL.foot.y -= 10;
        pose.legR.knee.y -= 12;
        pose.legR.foot.y -= 4;
        pose.armL.hand.y += 8;
        pose.armR.hand.y += 8;
        pose.bodyTilt = 0.05;
    }

    // 五条悟：待机时后手插兜、微仰头的从容姿态（最强的余裕）
    if ((f.c.base || f.c.id) === 'gojo' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        pose.armL.elbow = { x: -22, y: -76 };
        pose.armL.hand = { x: -10, y: -50 };
        pose.headRot = -0.03 + Math.sin(t * 0.05) * 0.03;
        pose.bodyRot = Math.sin(t * 0.045) * 0.015;
    }

    // 宿傩：待机时抱臂昂首的睥睨姿态（诅咒之王的威压）
    if (f.c.id === 'sukuna' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        pose.armL.elbow = { x: -24, y: -86 };
        pose.armL.hand = { x: 12, y: -92 };
        pose.armR.elbow = { x: 24, y: -84 };
        pose.armR.hand = { x: -10, y: -88 };
        pose.headRot = -0.06 + Math.sin(t * 0.04) * 0.02;
        pose.bodyRot = Math.sin(t * 0.04) * 0.012;
    }

    // 伏黑惠：待机时双手插兜、微低头的冷峻姿态（前后期通用）
    if ((f.c.id === 'megumi' || f.c.id === 'megumi2') && f.state === 'idle' && f.onGround && !f.blockHeld) {
        pose.armL.elbow = { x: -20, y: -74 };
        pose.armL.hand = { x: -8, y: -50 };
        pose.armR.elbow = { x: 20, y: -74 };
        pose.armR.hand = { x: 8, y: -50 };
        pose.headRot = 0.05 + Math.sin(t * 0.045) * 0.02;
        pose.bodyRot = Math.sin(t * 0.04) * 0.012;
    }

    // 虎杖悠仁：待机时双拳护脸的格斗架势（充满战意的肉体派）
    if (f.c.id === 'yuji' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        pose.armL.elbow = { x: -20, y: -92 };
        pose.armL.hand = { x: -6, y: -108 };
        pose.armR.elbow = { x: 22, y: -90 };
        pose.armR.hand = { x: 14, y: -106 };
        pose.bodyY += 3;
        pose.legL.foot.x -= 4;
        pose.legR.foot.x += 6;
        pose.headRot = -0.02 + Math.sin(t * 0.06) * 0.02;
        pose.bodyRot = Math.sin(t * 0.05) * 0.01;
    }

    // 虎杖悠仁·决意：新宿决战站姿（重心更低、前倾、拳头紧握、目光凌厉）
    if (f.c.id === 'yuji2' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        pose.armL.elbow = { x: -22, y: -88 };
        pose.armL.hand = { x: -10, y: -104 };
        pose.armR.elbow = { x: 24, y: -86 };
        pose.armR.hand = { x: 18, y: -102 };
        pose.bodyY += 5;
        pose.bodyTilt = 0.04;
        pose.legL.foot.x -= 6;
        pose.legR.foot.x += 8;
        pose.headRot = -0.04 + Math.sin(t * 0.05) * 0.015;
        pose.bodyRot = Math.sin(t * 0.04) * 0.008;
    }

    // 羂索：待机时双手拢袖相叠于身前、微仰睥视的僧侣姿态（千年智者的余裕）
    if (f.c.id === 'kenjaku' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        pose.armL.elbow = { x: -20, y: -78 };
        pose.armL.hand = { x: 6, y: -64 };
        pose.armR.elbow = { x: 20, y: -78 };
        pose.armR.hand = { x: -4, y: -66 };
        pose.headRot = -0.05 + Math.sin(t * 0.04) * 0.025;
        pose.bodyRot = Math.sin(t * 0.035) * 0.012;
    }

    // 花御：待机时双臂微张低垂、重心下沉的魁梧咒灵姿态（森林的宁静与威压）
    if (f.c.id === 'hanami' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        pose.bodyY += 3;
        pose.armL.elbow = { x: -32, y: -80 };
        pose.armL.hand = { x: -38, y: -52 + Math.sin(t * 0.05) * 2 };
        pose.armR.elbow = { x: 32, y: -80 };
        pose.armR.hand = { x: 38, y: -52 + Math.sin(t * 0.05 + 1.2) * 2 };
        pose.legL.foot.x -= 5;
        pose.legR.foot.x += 6;
        pose.headRot = 0.03 + Math.sin(t * 0.032) * 0.03;
        pose.bodyRot = Math.sin(t * 0.04) * 0.014;
        pose.shoulderL.y += Math.sin(t * 0.05) * 1.5;
        pose.shoulderR.y += Math.sin(t * 0.05) * 1.5;
    }

    // 漏瑚：待机时双拳自然垂于身体两侧、头顶火山口徐徐冒烟的老翁咒灵站姿（大地的愠怒）
    if (f.c.id === 'jogo' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        pose.armL.elbow = { x: -22, y: -78 };
        pose.armL.hand = { x: -26, y: -50 + Math.sin(t * 0.045) * 1.5 };
        pose.armR.elbow = { x: 22, y: -78 };
        pose.armR.hand = { x: 26, y: -50 + Math.sin(t * 0.045 + 0.8) * 1.5 };
        pose.legL.foot.x -= 3;
        pose.legR.foot.x += 5;
        pose.headRot = 0.04 + Math.sin(t * 0.03) * 0.025;
        pose.bodyRot = Math.sin(t * 0.038) * 0.010;
        pose.shoulderL.y += Math.sin(t * 0.045) * 1.2;
        pose.shoulderR.y += Math.sin(t * 0.045) * 1.2;
    }

    // 禅院直哉：待机时单手撩发、下巴微抬睨视的傲慢站姿（禅院家嫡子的余裕）
    if (f.c.id === 'naoya' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        const sw = Math.sin(t * 0.04); // 撩发慢相位
        // 右臂：肘部大幅外张抬高，小臂斜指头侧撩发，在头旁撑出清晰三角轮廓
        pose.armR.elbow = { x: 42, y: -104 + sw * 2 };
        pose.armR.hand = { x: 18, y: -128 + sw * 3 };
        // 左臂：叉腰，肘部外张脱离躯干剪影
        pose.armL.elbow = { x: -36, y: -82 + Math.sin(t * 0.045 + 1.0) * 1.5 };
        pose.armL.hand = { x: -16, y: -58 };
        pose.legL.foot.x -= 4;
        pose.legR.foot.x += 6;
        pose.headRot = -0.06 + Math.sin(t * 0.03) * 0.02;
        pose.bodyTilt = -0.02;
        pose.bodyRot = Math.sin(t * 0.04) * 0.01;
    }

    // 伏黑甚尔：待机时松肩垂刀的杀手站姿（野兽般的松弛，随时可暴起）
    if (f.c.id === 'toji' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        const br = Math.sin(t * 0.05); // 深长呼吸相位
        // 右臂：提刀松垂、肘部外张，刀尖随呼吸微晃
        pose.armR.elbow = { x: 34, y: -84 + br * 1.5 };
        pose.armR.hand = { x: 42, y: -52 + br * 2 };
        // 左臂：微屈外张于体侧，五指松开蓄势
        pose.armL.elbow = { x: -34, y: -80 + Math.sin(t * 0.05 + 0.9) * 1.5 };
        pose.armL.hand = { x: -40, y: -52 };
        pose.legL.foot.x -= 6;
        pose.legR.foot.x += 8;
        pose.headRot = 0.05 + Math.sin(t * 0.03) * 0.02; // 微低头冷视
        pose.bodyTilt = 0.03;
        pose.shoulderL.y += br * 1.2;
        pose.shoulderR.y += br * 1.2;
    }

    // 石流龙：宽肩低重心的炮手站姿（肩线外扩，双拳松握，像随时会开炮）
    if (f.c.id === 'ryu' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        const br = Math.sin(t * 0.05); // 深呼吸相位
        // 肩线外扩，先把成年男性的体格立在剪影里
        pose.shoulderL.x = -25;
        pose.shoulderR.x = 25;
        // 双臂微屈外张垂于体侧，拳头松握蓄势
        pose.armL.elbow = { x: -39, y: -84 + br * 1.5 };
        pose.armL.hand = { x: -47, y: -54 + br * 2 };
        pose.armR.elbow = { x: 39, y: -84 + Math.sin(t * 0.05 + 0.9) * 1.5 };
        pose.armR.hand = { x: 47, y: -54 + Math.sin(t * 0.05 + 0.9) * 2 };
        pose.legL.foot.x -= 8;
        pose.legR.foot.x += 10;
        pose.headRot = -0.08 + Math.sin(t * 0.03) * 0.02; // 下颌微抬，炮口随视线抬起
        pose.bodyTilt = -0.025;
        pose.shoulderL.y += br * 1.4;
        pose.shoulderR.y += br * 1.4;
    }

    // 乌鹭亨子：待机时单手轻按无形天空的从容站姿（微扬下颌的自负）
    if (f.c.id === 'uro' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        const br = Math.sin(t * 0.05); // 平稳呼吸相位
        // 左臂松垂体侧，右手抬起轻按身前天空平面
        pose.armL.elbow = { x: -30, y: -84 + br * 1.5 };
        pose.armL.hand = { x: -36, y: -56 + br * 2 };
        pose.armR.elbow = { x: 26, y: -92 + br * 1.2 };
        pose.armR.hand = { x: 40, y: -84 + br * 1.6 };
        pose.legL.foot.x -= 5;
        pose.legR.foot.x += 7;
        pose.headRot = -0.03 + Math.sin(t * 0.03) * 0.02;
        pose.bodyTilt = -0.01;
        pose.shoulderL.y += br * 1.2;
        pose.shoulderR.y += br * 1.2;
    }

    // 杜鲁夫：待机时双臂抱胸的古代王者镇座站姿（俯瞰猎物的威压）
    if (f.c.id === 'druv' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        const br = Math.sin(t * 0.045); // 沉稳呼吸相位
        // 双臂抱胸：前臂交叠于胸前
        pose.armL.elbow = { x: -32, y: -86 + br * 1.2 };
        pose.armL.hand = { x: 12, y: -88 + br * 1.2 };
        pose.armR.elbow = { x: 32, y: -83 + br * 1.2 };
        pose.armR.hand = { x: -10, y: -82 + br * 1.2 };
        pose.legL.foot.x -= 9;
        pose.legR.foot.x += 9;
        pose.headRot = -0.06 + Math.sin(t * 0.028) * 0.02; // 微抬下颌俯瞰
        pose.bodyTilt = -0.02;
        pose.shoulderL.y += br * 1.3;
        pose.shoulderR.y += br * 1.3;
    }

    // 黑沐死：待机时僵直低首的咒灵伫立姿（双臂垂在黑罩内，轻摆如飘）
    if (f.c.id === 'kuro' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        const br = Math.sin(t * 0.05); // 虫群蠕动般的呼吸相位
        pose.armL.elbow = { x: -18, y: -80 + br * 1.4 };
        pose.armL.hand = { x: -14, y: -58 + br * 1.8 };
        pose.armR.elbow = { x: 18, y: -80 + br * 1.4 };
        pose.armR.hand = { x: 14, y: -58 + br * 1.8 };
        pose.legL.foot.x += 3;
        pose.legR.foot.x -= 3;
        pose.headRot = 0.05 + Math.sin(t * 0.032) * 0.03; // 低首俯瞰猎物
        pose.bodyTilt = 0.03 + Math.sin(t * 0.024) * 0.012; // 罩下躯体轻轻起伏
        pose.shoulderL.y += br * 1.5;
        pose.shoulderR.y += br * 1.5;
    }

    // 格挡
    if (f.state === 'block' || f.blockHeld) {
        pose.armL.elbow = { x: -18, y: -100 };
        pose.armL.hand = { x: 8, y: -96 };
        pose.armL.rot = -0.55;
        pose.armR.elbow = { x: 18, y: -100 };
        pose.armR.hand = { x: 20, y: -94 };
        pose.armR.rot = 0.55;
        pose.bodyTilt = 0.10;
        pose.shoulderL.x += 4;
        pose.shoulderR.x += 4;
    }

    // 闪避
    if (f.state === 'dodge') {
        pose.ghost = 1;
        pose.bodyTilt = f.dodgeDir > 0 ? 0.32 : -0.32;
        pose.armL.hand.x -= 22;
        pose.armR.hand.x -= 22;
        pose.armL.hand.y += 4;
        pose.armR.hand.y += 4;
        pose.bodyY += 4;
    }

    // 普通攻击：三段轻击 + 重击
    if (f.state === 'attack') {
        const step = f.attackStep;
        const p = progress;
        // 通用攻击让前臂动作更夸张
        if (f.attackKind === 'light') {
            // 三段节奏：刺拳(快)→勾拳(中)→升龙/回旋(重)
            if (step === 1) { // 刺拳
                const wind = clamp(p / 0.25, 0, 1);
                const strike = p >= 0.25 ? clamp((p - 0.25) / 0.45, 0, 1) : 0;
                const rec = p >= 0.70 ? clamp((p - 0.70) / 0.30, 0, 1) : 0;
                pose.bodyY -= strike * 5 + wind * 2;
                pose.bodyTilt = strike * 0.18 - wind * 0.08;
                pose.headRot = -strike * 0.18;
                // 后手贴肋防守
                pose.armL.elbow = { x: lerp(-28, -24, wind), y: lerp(-80, -90, wind) };
                pose.armL.hand = { x: lerp(-34, -18, wind), y: lerp(-56, -88, wind) };
                // 前手直拳：蓄力→出击→回收
                const rHandX = lerp(34, lerp(lerp(22, 82, strike), 34, rec), Math.min(1, wind + strike + rec));
                const rHandY = lerp(-56, lerp(lerp(-56, -94, strike), -56, rec), Math.min(1, wind + strike + rec));
                pose.armR.elbow = { x: lerp(28, 46, strike) - rec * 10, y: lerp(-80, -100, strike) + rec * 20 };
                pose.armR.hand = { x: rHandX, y: rHandY };
                pose.shoulderR.x += strike * 8 - wind * 4;
                pose.shoulderR.y -= strike * 3;
                // 前脚踏实
                pose.legR.foot.x += strike * 6;
            } else if (step === 2) { // 勾拳
                const wind = clamp(p / 0.25, 0, 1);
                const strike = p >= 0.25 ? clamp((p - 0.25) / 0.45, 0, 1) : 0;
                const rec = p >= 0.70 ? clamp((p - 0.70) / 0.30, 0, 1) : 0;
                pose.bodyRot = strike * 0.45 - rec * 0.15;
                pose.bodyTilt = -strike * 0.16 + wind * 0.10;
                pose.bodyY -= strike * 4;
                pose.headRot = strike * 0.22;
                pose.armR.elbow = { x: lerp(28, 34, strike) - rec * 6, y: lerp(-80, -66, strike) + rec * 12 };
                pose.armR.hand = { x: lerp(34, 68, strike) - rec * 24, y: lerp(-56, -74, strike) + rec * 18 };
                pose.armR.rot = strike * 1.3;
                pose.shoulderR.y -= strike * 6;
                pose.shoulderR.x += strike * 4;
                pose.armL.hand.x -= strike * 8;
                pose.legL.foot.x -= strike * 6;
                pose.legR.foot.x += strike * 4;
            } else if (step === 3) { // 上勾/回旋踢
                const wind = clamp(p / 0.28, 0, 1);
                const strike = p >= 0.28 ? clamp((p - 0.28) / 0.42, 0, 1) : 0;
                const rec = p >= 0.70 ? clamp((p - 0.70) / 0.30, 0, 1) : 0;
                pose.bodyY -= strike * 10 + wind * 4;
                pose.bodyTilt = strike * 0.28 - wind * 0.16;
                pose.bodyRot = -strike * 0.25 + rec * 0.10;
                pose.headRot = -strike * 0.30;
                pose.armR.elbow = { x: lerp(28, 38, strike) - rec * 4, y: lerp(-80, -56, strike) + rec * 8 };
                pose.armR.hand = { x: lerp(34, 66, strike) - rec * 18, y: lerp(-56, -112, strike) + rec * 40 };
                pose.armR.rot = -strike * 1.55 + rec * 0.6;
                pose.armL.hand.y += strike * 8;
                // 右腿抬起
                pose.legR.knee.x += lerp(0, 26, strike) - rec * 10;
                pose.legR.knee.y -= lerp(0, 32, strike) - rec * 10;
                pose.legR.foot.x += lerp(0, 38, strike) - rec * 18;
                pose.legR.foot.y -= lerp(0, 14, strike) - rec * 4;
            }
        } else { // 重击：蓄力后上挑斩
            const wind = p < 0.45 ? Math.sin(p / 0.45 * Math.PI) : 0;
            const strike = p >= 0.45 ? Math.min(1, (p - 0.45) / 0.55) : 0;
            const rec = p >= 0.85 ? (p - 0.85) / 0.15 : 0;
            pose.bodyY -= wind * 6 + strike * 8 - rec * 2;
            pose.bodyTilt = -wind * 0.20 + strike * 0.32 - rec * 0.10;
            pose.headRot = wind * 0.18 - strike * 0.25;
            // 蓄力：双手持刀/拳后拉
            pose.armR.elbow = { x: lerp(28, 2, wind), y: lerp(-80, -76, wind) };
            pose.armR.hand = { x: lerp(34, -6, wind), y: lerp(-56, -78, wind) };
            pose.armL.hand.x += wind * 6;
            // 出招：上挑弧线
            if (strike > 0) {
                pose.armR.elbow = { x: lerp(2, 42, strike) - rec * 6, y: lerp(-76, -60, strike) + rec * 10 };
                pose.armR.hand = { x: lerp(-6, 74, strike) - rec * 28, y: lerp(-78, -124, strike) + rec * 50 };
                pose.armR.rot = -strike * 1.35 + rec * 0.5;
                pose.legL.foot.x -= strike * 10;
                pose.legR.foot.x += strike * 10;
                pose.shoulderR.y -= strike * 8;
            }
        }
    }

    // 技能：更丰富的施法姿势，根据技能方向微调
    if (f.state === 'skill') {
        const k = f.skillKind;
        const aimUp = k === 'skill3';
        pose.bodyTilt = peak * 0.12;
        pose.headRot = peak * 0.15;
        // 右手前伸聚咒力
        pose.armR.elbow = { x: lerp(28, 54, peak), y: lerp(-80, -96, peak) };
        pose.armR.hand = { x: lerp(34, 84, peak), y: lerp(-56, -90 + (aimUp ? -16 : 0), peak) };
        // 左手后拉护胸
        pose.armL.elbow = { x: lerp(-28, -40, peak), y: lerp(-80, -74, peak) };
        pose.armL.hand = { x: lerp(-34, -26, peak), y: lerp(-56, -70, peak) };
        pose.auraBoost = peak;
        if (f.c.weapon) pose.weaponRot = lerp(0.9, -0.3, peak);
    }

    // 五条悟专属施法姿势：苍/赫/茈各具手势（覆盖通用施法）
    if (f.state === 'skill' && (f.c.base || f.c.id) === 'gojo') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1); // 蓄力进度
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0; // 释放进度
        if (k === 'skill1') {
            // 苍：单手二指引导，指尖收束引力核
            pose.bodyTilt = 0.05 + cast * 0.06;
            pose.headRot = -0.08 * cast;
            pose.armR.elbow = { x: lerp(28, 40, cast), y: lerp(-80, -102, cast) };
            pose.armR.hand = { x: lerp(34, 76, cast) + rel * 12, y: lerp(-56, -98, cast) };
            pose.armL.elbow = { x: -30, y: -72 };
            pose.armL.hand = { x: -20, y: -58 };
        } else if (k === 'skill2') {
            // 赫：反转咒力后引蓄爆 → 掌心前推轰出
            pose.bodyTilt = -cast * 0.14 + rel * 0.30;
            pose.bodyRot = -cast * 0.10 + rel * 0.14;
            pose.armR.elbow = { x: lerp(28, -2, cast) + rel * 50, y: lerp(-80, -92, cast) };
            pose.armR.hand = { x: lerp(34, -12, cast) + rel * 100, y: lerp(-56, -92, cast) };
            pose.armL.elbow = { x: -34, y: -84 };
            pose.armL.hand = { x: -30, y: -96 };
            pose.legL.foot.x -= rel * 10;
            pose.legR.foot.x += rel * 12;
        } else if (k === 'skill3') {
            // 茈：双手分持苍赫 → 合掌推出湮灭波
            pose.bodyY -= cast * 4;
            pose.bodyTilt = cast * 0.10 + rel * 0.16;
            pose.headRot = -cast * 0.10;
            pose.armR.elbow = { x: lerp(28, 44, cast), y: lerp(-80, -96, cast) };
            pose.armR.hand = { x: lerp(34, 64, cast) + rel * 22, y: lerp(-56, -92, cast) };
            pose.armL.elbow = { x: lerp(-28, 20, cast), y: lerp(-80, -88, cast) };
            pose.armL.hand = { x: lerp(-34, 56, cast) + rel * 24, y: lerp(-56, -86, cast) };
        }
        pose.auraBoost = 0; // 禁用通用蓝色聚光，改用专属双色咒力核
        pose.gojoSkill = k;
        pose.gojoCast = cast;
        pose.gojoRel = rel;
        // gojo2 蓄力进度（手部咒力核随蓄力增大）
        pose.gojoCharge = f.c.id === 'gojo2' ? clamp((f.charge || 0) / (f.chargeMax || 90), 0, 1) : 0;
    }

    // 宿傩专属施法姿势：解/捌/灶·开各具手势（覆盖通用施法）
    if (f.state === 'skill' && f.c.id === 'sukuna') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1); // 蓄力进度
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0; // 释放进度
        if (k === 'skill1') {
            // 解：手刀高引凝咒力刃 → 横扫挥出无形斩
            pose.bodyTilt = -cast * 0.06 + rel * 0.14;
            pose.bodyRot = -cast * 0.12 + rel * 0.30;
            pose.headRot = -cast * 0.06;
            pose.armR.elbow = { x: lerp(28, 20, cast) + rel * 22, y: lerp(-80, -104, cast) + rel * 16 };
            pose.armR.hand = { x: lerp(34, 30, cast) + rel * 52, y: lerp(-56, -128, cast) + rel * 50 };
            pose.armL.elbow = { x: -30, y: -78 };
            pose.armL.hand = { x: -24, y: -60 };
        } else if (k === 'skill2') {
            // 捌：双臂交叉后引 → 高频乱斩连挥（小幅抖动模拟连斩）
            const jit = rel > 0 ? Math.sin(st * 1.4) : 0;
            pose.bodyTilt = cast * 0.10 + rel * 0.08;
            pose.bodyY -= rel * 3;
            pose.armR.elbow = { x: lerp(28, 6, cast) + rel * 34, y: lerp(-80, -96, cast) };
            pose.armR.hand = { x: lerp(34, -6, cast) + rel * 78, y: lerp(-56, -104, cast) + jit * 18 };
            pose.armL.elbow = { x: lerp(-28, -8, cast) + rel * 26, y: lerp(-80, -70, cast) };
            pose.armL.hand = { x: lerp(-34, 10, cast) + rel * 60, y: lerp(-56, -60, cast) - jit * 18 };
            pose.legL.foot.x -= rel * 8;
            pose.legR.foot.x += rel * 10;
        } else if (k === 'skill3') {
            // 灶·开：引火拉弓拉满 → 放矢轰爆
            pose.bodyTilt = -cast * 0.10 + rel * 0.22;
            pose.headRot = -cast * 0.08;
            pose.armL.elbow = { x: lerp(-28, 30, cast), y: lerp(-80, -96, cast) };
            pose.armL.hand = { x: lerp(-34, 66, cast), y: lerp(-56, -94, cast) };
            pose.armR.elbow = { x: lerp(28, 2, cast) + rel * 40, y: lerp(-80, -100, cast) };
            pose.armR.hand = { x: lerp(34, -8, cast) + rel * 84, y: lerp(-56, -108, cast) + rel * 10 };
            pose.legL.foot.x -= cast * 8;
            pose.legR.foot.x += cast * 8;
        }
        pose.auraBoost = 0; // 改用专属赤色刃光/焰核
        pose.sukunaSkill = k;
        pose.sukunaCast = cast;
        pose.sukunaRel = rel;
    }

    // 伏黑惠专属施法姿势：十种影法术结印/引导（前后期共用框架）
    if ((f.state === 'skill' || (f.state === 'ult' && f.ultSequenceActive)) && (f.c.id === 'megumi' || f.c.id === 'megumi2')) {
        const k = f.skillKind;
        const v2 = f.c.id === 'megumi2';
        const cast = clamp(st / (f.castAt || 16), 0, 1); // 蓄力进度
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0; // 释放进度
        if (k === 'skill1') {
            // 玉犬（·浑）：屈身影手印按向地面 → 影犬跃出时抬手指向前方
            pose.bodyY += cast * 8 - rel * 4;
            pose.bodyTilt = cast * 0.16 - rel * 0.06;
            pose.headRot = cast * 0.10;
            pose.armR.elbow = { x: lerp(28, 34, cast), y: lerp(-80, -58, cast) - rel * 26 };
            pose.armR.hand = { x: lerp(34, 52, cast) + rel * 18, y: lerp(-56, -20, cast) - rel * 58 };
            pose.armL.elbow = { x: -26, y: -76 };
            pose.armL.hand = { x: -18, y: -58 };
            pose.legL.foot.x -= cast * 8;
            pose.legR.knee.y += cast * 6;
        } else if (k === 'skill2') {
            if (!v2) {
                // 鵺：仰首扬臂指天召来雷鸟
                pose.bodyTilt = -cast * 0.14;
                pose.headRot = -cast * 0.22;
                pose.armR.elbow = { x: lerp(28, 22, cast), y: lerp(-80, -108, cast) };
                pose.armR.hand = { x: lerp(34, 26, cast), y: lerp(-56, -140, cast) };
                pose.armL.elbow = { x: -28, y: -74 };
                pose.armL.hand = { x: -22, y: -58 };
            } else {
                // 大蛇：双掌前按引大蛇自足下暴起
                pose.bodyY += cast * 5;
                pose.bodyTilt = cast * 0.12 + rel * 0.10;
                pose.armR.elbow = { x: lerp(28, 40, cast), y: lerp(-80, -84, cast) };
                pose.armR.hand = { x: lerp(34, 70, cast) + rel * 10, y: lerp(-56, -74, cast) };
                pose.armL.elbow = { x: lerp(-28, 18, cast), y: lerp(-80, -78, cast) };
                pose.armL.hand = { x: lerp(-34, 58, cast) + rel * 12, y: lerp(-56, -66, cast) };
                pose.legL.foot.x -= cast * 10;
                pose.legR.foot.x += cast * 10;
            }
        } else if (k === 'skill3') {
            if (!v2) {
                // 脱兔：低伏前倾蓄势 → 影遁突进
                pose.bodyY += cast * 10;
                pose.bodyTilt = cast * 0.30 + rel * 0.10;
                pose.headRot = -cast * 0.10;
                pose.armR.elbow = { x: lerp(28, 8, cast) + rel * 40, y: lerp(-80, -66, cast) };
                pose.armR.hand = { x: lerp(34, -6, cast) + rel * 78, y: lerp(-56, -50, cast) };
                pose.armL.elbow = { x: lerp(-28, -42, cast), y: lerp(-80, -66, cast) };
                pose.armL.hand = { x: lerp(-34, -58, cast), y: lerp(-56, -48, cast) };
                pose.legL.knee.y += cast * 8;
                pose.legR.foot.x += cast * 10;
                if (rel > 0) pose.ghost = 1;
            } else {
                // 不知井底：双手结印高举，井影自天而降
                pose.bodyTilt = -cast * 0.10;
                pose.headRot = -cast * 0.18;
                pose.armR.elbow = { x: lerp(28, 26, cast), y: lerp(-80, -102, cast) };
                pose.armR.hand = { x: lerp(34, 12, cast), y: lerp(-56, -128, cast) };
                pose.armL.elbow = { x: lerp(-28, -24, cast), y: lerp(-80, -100, cast) };
                pose.armL.hand = { x: lerp(-34, -8, cast), y: lerp(-56, -126, cast) };
            }
        }
        pose.auraBoost = 0; // 改用专属影之咒力核
        pose.megSkill = k;
        pose.megCast = cast;
        pose.megRel = rel;
        pose.megVer2 = v2;
    }

    // 羂索专属施法姿势：咒灵操术结印/反重力托天/漩涡千咒压缩（覆盖通用施法）
    if (f.state === 'skill' && f.c.id === 'kenjaku') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1); // 蓄力进度
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0; // 释放进度
        if (k === 'skill1') {
            // 咒灵操术：胸前二指结印蓄力 → 挥臂号令咒灵扑出
            pose.bodyTilt = -cast * 0.05 + rel * 0.14;
            pose.headRot = -cast * 0.08 + rel * 0.06;
            pose.armR.elbow = { x: lerp(28, 18, cast) + rel * 26, y: lerp(-80, -98, cast) };
            pose.armR.hand = { x: lerp(34, 14, cast) + rel * 66, y: lerp(-56, -112, cast) + rel * 22 };
            pose.armL.elbow = { x: -26, y: -76 };
            pose.armL.hand = { x: -12, y: -62 };
            pose.legL.foot.x -= rel * 6;
            pose.legR.foot.x += rel * 8;
        } else if (k === 'skill2') {
            // 反重力机构：拢掌下压蓄力 → 翻掌托天引重力反转（微悬浮）
            pose.bodyY -= rel * 8;
            pose.bodyTilt = cast * 0.06 - rel * 0.10;
            pose.headRot = cast * 0.05 - rel * 0.22;
            pose.armR.elbow = { x: lerp(28, 34, cast), y: lerp(-80, -66, cast) - rel * 38 };
            pose.armR.hand = { x: lerp(34, 46, cast) - rel * 16, y: lerp(-56, -46, cast) - rel * 90 };
            pose.armL.elbow = { x: lerp(-28, -34, cast), y: lerp(-80, -66, cast) - rel * 20 };
            pose.armL.hand = { x: lerp(-34, -44, cast), y: lerp(-56, -46, cast) - rel * 42 };
            pose.legL.foot.x -= rel * 4;
            pose.legR.foot.x += rel * 4;
        } else if (k === 'skill3') {
            // 极之番「漩涡」：双臂张开纳千咒（蓄满颤抖） → 双掌合拢轰出漩涡
            const trem = cast > 0.75 && rel === 0 ? Math.sin(st * 1.6) * 2.2 : 0;
            pose.bodyY += cast * 4 - rel * 6;
            pose.bodyTilt = -cast * 0.10 + rel * 0.26;
            pose.headRot = -cast * 0.12 + rel * 0.10;
            pose.armR.elbow = { x: lerp(28, 44, cast), y: lerp(-80, -100, cast) + trem };
            pose.armR.hand = { x: lerp(34, 64, cast) + rel * 24, y: lerp(-56, -102, cast) + rel * 16 + trem };
            pose.armL.elbow = { x: lerp(-28, -44, cast) + rel * 62, y: lerp(-80, -100, cast) - trem };
            pose.armL.hand = { x: lerp(-34, -62, cast) + rel * 118, y: lerp(-56, -102, cast) + rel * 14 - trem };
            pose.legL.foot.x -= cast * 8 + rel * 4;
            pose.legR.foot.x += cast * 8 + rel * 6;
        }
        pose.auraBoost = 0; // 改用专属黑紫咒力核与咒灵虚影
        pose.kenSkill = k;
        pose.kenCast = cast;
        pose.kenRel = rel;
    }

    // 花御专属施法姿势：树根插地/咒种孕射/树鞠招手（覆盖通用施法）
    if (f.state === 'skill' && f.c.id === 'hanami') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1); // 蓄力进度
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0; // 释放进度
        if (k === 'skill1') {
            // 树根：俯身双掌插入大地灌注咒力 → 猛然拔起双臂引根破土
            pose.bodyY += cast * 14 - rel * 10;
            pose.bodyTilt = cast * 0.30 - rel * 0.18;
            pose.headRot = cast * 0.22 - rel * 0.16;
            pose.armR.elbow = { x: lerp(28, 40, cast), y: lerp(-80, -46, cast) - rel * 44 };
            pose.armR.hand = { x: lerp(34, 52, cast), y: lerp(-56, -4, cast) - rel * 86 };
            pose.armL.elbow = { x: lerp(-28, -12, cast), y: lerp(-80, -48, cast) - rel * 40 };
            pose.armL.hand = { x: lerp(-34, 10, cast), y: lerp(-56, -6, cast) - rel * 80 };
            pose.legL.knee.y += cast * 8 - rel * 6;
            pose.legL.foot.x -= cast * 8;
            pose.legR.foot.x += cast * 10;
        } else if (k === 'skill2') {
            // 咒种：单手拢于胸前孕育咒种（微低头凝视） → 推掌射出
            pose.bodyTilt = cast * 0.08 + rel * 0.16;
            pose.headRot = cast * 0.14 - rel * 0.06;
            pose.armR.elbow = { x: lerp(28, 16, cast) + rel * 34, y: lerp(-80, -84, cast) };
            pose.armR.hand = { x: lerp(34, 20, cast) + rel * 78, y: lerp(-56, -86, cast) + rel * 4 };
            pose.armL.elbow = { x: lerp(-28, -16, cast), y: lerp(-80, -82, cast) };
            pose.armL.hand = { x: lerp(-34, 8, cast) - rel * 30, y: lerp(-56, -84, cast) + rel * 16 };
            pose.legL.foot.x -= rel * 6;
            pose.legR.foot.x += rel * 8;
            pose.shoulderR.x += rel * 6;
        } else if (k === 'skill3') {
            // 树鞠：仰首抬臂具现漂浮木球 → 手臂前指号令根刺突击
            pose.bodyY -= cast * 4;
            pose.bodyTilt = -cast * 0.10 + rel * 0.08;
            pose.headRot = -cast * 0.20 + rel * 0.14;
            pose.armR.elbow = { x: lerp(28, 36, cast), y: lerp(-80, -104, cast) + rel * 14 };
            pose.armR.hand = { x: lerp(34, 48, cast) + rel * 30, y: lerp(-56, -130, cast) + rel * 36 };
            pose.armL.elbow = { x: -30, y: -78 };
            pose.armL.hand = { x: -26, y: -60 };
            pose.legL.foot.x -= cast * 4;
            pose.legR.foot.x += cast * 6;
        }
        pose.auraBoost = 0; // 改用专属翠绿生机咒力与花瓣粒子
        pose.hanSkill = k;
        pose.hanCast = cast;
        pose.hanRel = rel;
    }

    // 漏瑚专属施法姿势：火焰术式按地/火烁虫放虫/极之番引陨（覆盖通用施法）
    if (f.state === 'skill' && f.c.id === 'jogo') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1); // 蓄力进度
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0; // 释放进度
        if (k === 'skill1') {
            // 火焰术式：俯身单掌按向大地灌注火焰咒力 → 扬掌令群山喷发
            pose.bodyY += cast * 10 - rel * 8;
            pose.bodyTilt = cast * 0.24 - rel * 0.10;
            pose.headRot = cast * 0.16 - rel * 0.12;
            pose.armR.elbow = { x: lerp(28, 38, cast), y: lerp(-80, -50, cast) - rel * 34 };
            pose.armR.hand = { x: lerp(34, 54, cast) + rel * 8, y: lerp(-56, -10, cast) - rel * 70 };
            pose.armL.elbow = { x: lerp(-28, -34, cast), y: lerp(-80, -72, cast) };
            pose.armL.hand = { x: lerp(-34, -42, cast), y: lerp(-56, -52, cast) };
            pose.legL.knee.y += cast * 6 - rel * 4;
            pose.legL.foot.x -= cast * 6;
            pose.legR.foot.x += cast * 8;
        } else if (k === 'skill2') {
            // 火烁虫：侧首屈指凑近头顶火山口唤虫 → 挥臂前指命其突击
            pose.bodyTilt = -cast * 0.06 + rel * 0.14;
            pose.headRot = cast * 0.18 - rel * 0.10;
            pose.armR.elbow = { x: lerp(28, 22, cast) + rel * 22, y: lerp(-80, -102, cast) + rel * 18 };
            pose.armR.hand = { x: lerp(34, 10, cast) + rel * 74, y: lerp(-56, -122, cast) + rel * 40 };
            pose.armL.elbow = { x: -26, y: -76 };
            pose.armL.hand = { x: -14, y: -62 };
            pose.legL.foot.x -= rel * 5;
            pose.legR.foot.x += rel * 7;
            pose.shoulderR.x += rel * 5;
        } else if (k === 'skill3') {
            // 极之番·陨：双臂高举承天引陨（蓄满颤抖） → 双臂挥落号令陨石坠地
            const trem = cast > 0.75 && rel === 0 ? Math.sin(st * 1.5) * 2.4 : 0;
            pose.bodyY -= cast * 6 - rel * 8;
            pose.bodyTilt = -cast * 0.16 + rel * 0.30;
            pose.headRot = -cast * 0.24 + rel * 0.26;
            pose.armR.elbow = { x: lerp(28, 30, cast), y: lerp(-80, -108, cast) + rel * 44 + trem };
            pose.armR.hand = { x: lerp(34, 22, cast) + rel * 30, y: lerp(-56, -136, cast) + rel * 92 + trem };
            pose.armL.elbow = { x: lerp(-28, -30, cast), y: lerp(-80, -108, cast) - trem };
            pose.armL.hand = { x: lerp(-34, -20, cast) + rel * 26, y: lerp(-56, -134, cast) + rel * 88 - trem };
            pose.legL.foot.x -= cast * 8;
            pose.legR.foot.x += cast * 10;
        }
        pose.auraBoost = 0; // 改用专属熔火咒力特效
        pose.jogSkill = k;
        pose.jogCast = cast;
        pose.jogRel = rel;
    }

    // 直哉专属施法姿势：24帧突进/定帧掌/空气爆炸（覆盖通用施法）
    if (f.state === 'skill' && f.c.id === 'naoya') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1); // 蓄力进度
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0; // 释放进度
        if (k === 'skill1') {
            // 24帧突进：压低重心脑内预演帧格 → 前倾疾驰拳架
            pose.bodyY += cast * 8 - rel * 4;
            pose.bodyTilt = cast * 0.10 + rel * 0.22;
            pose.headRot = -cast * 0.06 + rel * 0.10;
            pose.armR.elbow = { x: lerp(28, 10, cast) + rel * 24, y: lerp(-80, -70, cast) - rel * 10 };
            pose.armR.hand = { x: lerp(34, -6, cast) + rel * 66, y: lerp(-56, -58, cast) - rel * 30 };
            pose.armL.elbow = { x: lerp(-28, -34, cast) - rel * 6, y: -80 };
            pose.armL.hand = { x: lerp(-34, -46, cast) - rel * 12, y: lerp(-56, -66, cast) };
            pose.legL.foot.x -= cast * 10 + rel * 4;
            pose.legR.knee.y += cast * 4;
        } else if (k === 'skill2') {
            // 定帧掌：掌收腰侧蓄势 → 前踏一步探掌直伸
            pose.bodyTilt = cast * 0.04 + rel * 0.16;
            pose.armR.elbow = { x: lerp(28, 12, cast) + rel * 26, y: lerp(-80, -72, cast) - rel * 14 };
            pose.armR.hand = { x: lerp(34, 6, cast) + rel * 78, y: lerp(-56, -66, cast) - rel * 22 };
            pose.armL.elbow = { x: -26, y: -78 };
            pose.armL.hand = { x: lerp(-34, -40, cast), y: lerp(-56, -60, cast) };
            pose.legL.foot.x -= rel * 6;
            pose.legR.foot.x += rel * 10;
            pose.shoulderR.x += rel * 6;
        } else if (k === 'skill3') {
            // 空气爆炸：伸掌向前凝空冻结（蓄满颤抖） → 握拳挥碎
            const trem = cast > 0.75 && rel === 0 ? Math.sin(st * 1.4) * 2.0 : 0;
            pose.bodyTilt = cast * 0.06 + rel * 0.20;
            pose.headRot = cast * 0.04 + rel * 0.06;
            pose.armR.elbow = { x: lerp(28, 30, cast), y: lerp(-80, -84, cast) + rel * 8 + trem * 0.4 };
            pose.armR.hand = { x: lerp(34, 66, cast) + rel * 18, y: lerp(-56, -84, cast) + rel * 16 + trem };
            pose.armL.elbow = { x: lerp(-28, -30, cast), y: -80 };
            pose.armL.hand = { x: lerp(-34, -42, cast), y: lerp(-56, -62, cast) };
            pose.legL.foot.x -= cast * 8;
            pose.legR.foot.x += cast * 6 + rel * 6;
        }
        pose.auraBoost = 0; // 改用专属黄绿帧格特效
        pose.naoSkill = k;
        pose.naoCast = cast;
        pose.naoRel = rel;
    }

    // 甚尔专属施法姿势：释魂刀/天逆鉾/游云（零咒力的纯物理杀阵）
    if (f.state === 'skill' && f.c.id === 'toji') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1);
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0;
        if (k === 'skill1') {
            // 释魂刀·斩魂：压低重心拔刀蓄势 → 突进二连横斩
            const sw = rel > 0 ? Math.sin(rel * Math.PI * 2) : 0; // 二连斩往复相位
            pose.bodyY += cast * 10 - rel * 6;
            pose.bodyTilt = cast * 0.14 + rel * 0.18;
            pose.headRot = cast * 0.06;
            pose.armR.elbow = { x: lerp(28, 8, cast) + rel * 26, y: lerp(-80, -66, cast) - rel * 24 };
            pose.armR.hand = { x: lerp(34, -10, cast) + rel * 86, y: lerp(-56, -54, cast) - rel * 36 + sw * 18 };
            pose.armL.elbow = { x: lerp(-28, -36, cast), y: -78 };
            pose.armL.hand = { x: lerp(-34, -48, cast), y: lerp(-56, -64, cast) };
            pose.legL.foot.x -= cast * 10;
            pose.legR.foot.x += cast * 6 + rel * 8;
        } else if (k === 'skill2') {
            // 天逆鉾：收刀换持十手短刃 → 前踏一步全力突刺
            pose.hideWeapon = true; // 佩刀收起，天逆鉾在特效层绘制
            pose.bodyTilt = cast * 0.05 + rel * 0.20;
            pose.bodyY += rel * 2;
            pose.armR.elbow = { x: lerp(28, 8, cast) + rel * 30, y: lerp(-80, -74, cast) - rel * 10 };
            pose.armR.hand = { x: lerp(34, 2, cast) + rel * 84, y: lerp(-56, -68, cast) - rel * 16 };
            pose.armL.elbow = { x: -28, y: lerp(-80, -84, cast) };
            pose.armL.hand = { x: lerp(-34, -18, cast), y: lerp(-56, -92, cast) - rel * 6 };
            pose.legL.foot.x -= rel * 8;
            pose.legR.foot.x += cast * 4 + rel * 12;
            pose.shoulderR.x += rel * 8;
        } else if (k === 'skill3') {
            // 游云：三节棍双臂轮转乱打 → 终段全力抡碎
            pose.hideWeapon = true; // 三节棍在特效层绘制
            const whirl = rel > 0 ? Math.sin(st * 0.9) : 0; // 高速轮转相位
            pose.bodyTilt = cast * 0.08 + rel * 0.10 + whirl * 0.05;
            pose.bodyRot = whirl * 0.10;
            pose.headRot = cast * 0.04;
            pose.armR.elbow = { x: lerp(28, 24, cast) + whirl * 22, y: lerp(-80, -96, cast) + whirl * 14 };
            pose.armR.hand = { x: lerp(34, 40, cast) + whirl * 40, y: lerp(-56, -108, cast) + whirl * 34 };
            pose.armL.elbow = { x: lerp(-28, -30, cast) - whirl * 12, y: lerp(-80, -70, cast) - whirl * 10 };
            pose.armL.hand = { x: lerp(-34, -44, cast) - whirl * 22, y: lerp(-56, -60, cast) - whirl * 22 };
            pose.legL.foot.x -= cast * 8;
            pose.legR.foot.x += cast * 8 + rel * 6;
        }
        pose.auraBoost = 0; // 零咒力：改用纯物理兵刃特效
        pose.tojiSkill = k;
        pose.tojiCast = cast;
        pose.tojiRel = rel;
    }

    // 必杀：领域展开，更夸张的展开姿势
    if (f.state === 'ult') {
        pose.bodyY -= peak * 8;
        pose.bodyTilt = -peak * 0.22 + Math.sin(t * 0.25) * 0.04;
        pose.headRot = -peak * 0.20;
        pose.armL.elbow = { x: lerp(-28, -58, peak), y: lerp(-80, -104, peak) };
        pose.armL.hand = { x: lerp(-34, -78, peak), y: lerp(-56, -86, peak) };
        pose.armR.elbow = { x: lerp(28, 58, peak), y: lerp(-80, -104, peak) };
        pose.armR.hand = { x: lerp(34, 78, peak), y: lerp(-56, -86, peak) };
        pose.auraBoost = peak;
        // 双脚张开
        pose.legL.foot.x -= peak * 8;
        pose.legR.foot.x += peak * 8;
    }

    // 五条悟必杀：无量空处结印（双手于面前结印，六眼显现）
    if (f.state === 'ult' && (f.c.base || f.c.id) === 'gojo') {
        pose.armL.elbow = { x: lerp(-28, -10, peak), y: lerp(-80, -96, peak) };
        pose.armL.hand = { x: lerp(-34, 16, peak), y: lerp(-56, -116, peak) };
        pose.armR.elbow = { x: lerp(28, 34, peak), y: lerp(-80, -98, peak) };
        pose.armR.hand = { x: lerp(34, 22, peak), y: lerp(-56, -118, peak) };
        pose.bodyTilt = 0.02;
        pose.headRot = -0.05 * peak;
        pose.auraBoost = 0; // 改用结印白蓝辉光
        pose.gojoUlt = peak;
    }

    // 宿傩必杀：伏魔御厨子结印（双手交叠于胸前，第二对赤瞳睁开）
    if (f.state === 'ult' && f.c.id === 'sukuna') {
        pose.armL.elbow = { x: lerp(-28, -12, peak), y: lerp(-80, -88, peak) };
        pose.armL.hand = { x: lerp(-34, 8, peak), y: lerp(-56, -100, peak) };
        pose.armR.elbow = { x: lerp(28, 30, peak), y: lerp(-80, -90, peak) };
        pose.armR.hand = { x: lerp(34, 14, peak), y: lerp(-56, -102, peak) };
        pose.bodyTilt = -0.04 * peak;
        pose.headRot = -0.10 * peak;
        pose.auraBoost = 0; // 改用结印黑赤瘴气
        pose.sukunaUlt = peak;
    }

    // 伏黑惠必杀：先完成召唤仪式；之后由普通技能专属姿势承接三段连放。
    if (f.state === 'ult' && f.c.id === 'megumi' && !f.ultSequenceActive) {
        pose.bodyY += peak * 16;
        pose.bodyTilt = peak * 0.22;
        pose.headRot = peak * 0.16;
        pose.armR.elbow = { x: lerp(28, 30, peak), y: lerp(-80, -46, peak) };
        pose.armR.hand = { x: lerp(34, 40, peak), y: lerp(-56, -6, peak) };
        pose.armL.elbow = { x: lerp(-28, -34, peak), y: lerp(-80, -60, peak) };
        pose.armL.hand = { x: lerp(-34, -30, peak), y: lerp(-56, -40, peak) };
        pose.legL.knee.y += peak * 10;
        pose.legR.foot.x += peak * 12;
        pose.auraBoost = 0; // 改用按地影池与影核
        pose.megUlt = peak;
    }

    // 伏黑惠·觉醒必杀：嵌合暗翳庭结印（双手交叠于胸前，影自足下漫延）
    if (f.state === 'ult' && f.c.id === 'megumi2') {
        pose.armL.elbow = { x: lerp(-28, -14, peak), y: lerp(-80, -90, peak) };
        pose.armL.hand = { x: lerp(-34, 10, peak), y: lerp(-56, -104, peak) };
        pose.armR.elbow = { x: lerp(28, 32, peak), y: lerp(-80, -92, peak) };
        pose.armR.hand = { x: lerp(34, 16, peak), y: lerp(-56, -106, peak) };
        pose.bodyTilt = -0.03 * peak;
        pose.headRot = 0.08 * peak;
        pose.auraBoost = 0; // 改用结印影核
        pose.megUlt2 = peak;
    }

    // 羂索必杀：胎藏遍野——法界定印于腹前入定，胎藏曼荼罗自身后展开
    if (f.state === 'ult' && f.c.id === 'kenjaku') {
        pose.bodyY -= peak * 10; // 结印悬浮
        pose.bodyTilt = 0;
        pose.headRot = 0.10 * peak; // 微垂首入定
        pose.armL.elbow = { x: lerp(-28, -22, peak), y: lerp(-80, -72, peak) };
        pose.armL.hand = { x: lerp(-34, 2, peak), y: lerp(-56, -58, peak) };
        pose.armR.elbow = { x: lerp(28, 24, peak), y: lerp(-80, -72, peak) };
        pose.armR.hand = { x: lerp(34, 6, peak), y: lerp(-56, -60, peak) };
        pose.legL.foot.x -= peak * 4;
        pose.legR.foot.x += peak * 4;
        pose.auraBoost = 0; // 改用胎藏曼荼罗光轮
        pose.kenUlt = peak;
    }

    // 花御必杀：朵颐光海——双臂如巨树伸枝般缓缓张开，仰面向天沉入花田
    if (f.state === 'ult' && f.c.id === 'hanami') {
        pose.bodyY -= peak * 6;
        pose.bodyTilt = -peak * 0.10;
        pose.headRot = -peak * 0.30 + Math.sin(t * 0.06) * 0.02;
        pose.armL.elbow = { x: lerp(-28, -52, peak), y: lerp(-80, -110, peak) };
        pose.armL.hand = { x: lerp(-34, -70, peak), y: lerp(-56, -136, peak) };
        pose.armR.elbow = { x: lerp(28, 52, peak), y: lerp(-80, -110, peak) };
        pose.armR.hand = { x: lerp(34, 70, peak), y: lerp(-56, -136, peak) };
        pose.legL.foot.x -= peak * 10;
        pose.legR.foot.x += peak * 10;
        pose.auraBoost = 0; // 改用花瓣光海与巨花光轮
        pose.hanUlt = peak;
    }

    // 漏瑚必杀：盖棺铁围山——双手于胸前结印，仰首怒吼，头顶火山口轰然喷发
    if (f.state === 'ult' && f.c.id === 'jogo') {
        pose.bodyY += peak * 4;
        pose.bodyTilt = peak * 0.06;
        pose.headRot = -peak * 0.26 + Math.sin(t * 0.2) * 0.02;
        pose.armL.elbow = { x: lerp(-28, -18, peak), y: lerp(-80, -86, peak) };
        pose.armL.hand = { x: lerp(-34, 6, peak), y: lerp(-56, -98, peak) };
        pose.armR.elbow = { x: lerp(28, 26, peak), y: lerp(-80, -88, peak) };
        pose.armR.hand = { x: lerp(34, 12, peak), y: lerp(-56, -100, peak) };
        pose.legL.foot.x -= peak * 8;
        pose.legR.foot.x += peak * 8;
        pose.auraBoost = 0; // 改用铁围山业火光轮
        pose.jogUlt = peak;
    }

    // 直哉必杀：时胞月宫殿——胸前合掌结印，仰首睨视，月宫表盘自身后展开
    if (f.state === 'ult' && f.c.id === 'naoya') {
        pose.bodyY -= peak * 4;
        pose.bodyTilt = -peak * 0.06;
        pose.headRot = -peak * 0.18 + Math.sin(t * 0.1) * 0.015;
        pose.armL.elbow = { x: lerp(-28, -16, peak), y: lerp(-80, -88, peak) };
        pose.armL.hand = { x: lerp(-34, 4, peak), y: lerp(-56, -102, peak) };
        pose.armR.elbow = { x: lerp(28, 28, peak), y: lerp(-80, -90, peak) };
        pose.armR.hand = { x: lerp(34, 10, peak), y: lerp(-56, -104, peak) };
        pose.legL.foot.x -= peak * 6;
        pose.legR.foot.x += peak * 6;
        pose.auraBoost = 0; // 改用月宫表盘光轮
        pose.naoUlt = peak;
    }

    // 甚尔必杀：天与咒缚·杀戮本能——低伏蓄爆，肌肉贲张，杀气外放
    if (f.state === 'ult' && f.c.id === 'toji') {
        pose.bodyY += peak * 14; // 压低重心（覆盖通用上扬）
        pose.bodyTilt = peak * 0.20;
        pose.headRot = -peak * 0.10 + Math.sin(t * 0.5) * 0.02; // 低伏中抬眼死盯
        pose.armR.elbow = { x: lerp(28, 40, peak), y: lerp(-80, -66, peak) };
        pose.armR.hand = { x: lerp(34, 58, peak), y: lerp(-56, -44, peak) };
        pose.armL.elbow = { x: lerp(-28, -42, peak), y: lerp(-80, -64, peak) };
        pose.armL.hand = { x: lerp(-34, -56, peak), y: lerp(-56, -42, peak) };
        pose.legL.foot.x -= peak * 12;
        pose.legR.foot.x += peak * 12;
        pose.legL.knee.y += peak * 6;
        pose.legR.knee.y += peak * 6;
        pose.auraBoost = 0; // 改用杀戮气浪
        pose.tojiUlt = peak;
    }

    // 石流龙专属施法姿势：冰沙冲击波/追迹冲击波/连珠炮（飞机头即炮管）
    if (f.state === 'skill' && f.c.id === 'ryu') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1); // 蓄力进度
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0; // 释放进度
        if (k === 'skill1') {
            // 冰沙冲击波：握拳低头对准炮口聚束 → 头前顶轰出，上身后座
            pose.bodyY += cast * 6 - rel * 2;
            pose.bodyTilt = cast * 0.16 - rel * 0.20;
            pose.headRot = cast * 0.22 - rel * 0.30;
            pose.armL.elbow = { x: lerp(-28, -34, cast), y: lerp(-80, -70, cast) + rel * 6 };
            pose.armL.hand = { x: lerp(-34, -40, cast), y: lerp(-56, -48, cast) + rel * 4 };
            pose.armR.elbow = { x: lerp(28, 34, cast), y: lerp(-80, -70, cast) + rel * 6 };
            pose.armR.hand = { x: lerp(34, 40, cast), y: lerp(-56, -48, cast) + rel * 4 };
            pose.legL.foot.x -= cast * 8;
            pose.legR.foot.x += cast * 10;
            pose.shoulderL.y += cast * 2;
            pose.shoulderR.y += cast * 2;
        } else if (k === 'skill2') {
            // 追迹冲击波：仰天抬炮蓄力 → 头后仰轰向天空
            pose.bodyTilt = -cast * 0.12 - rel * 0.08;
            pose.headRot = -cast * 0.34 - rel * 0.12;
            pose.bodyY -= cast * 4;
            pose.armL.elbow = { x: lerp(-28, -36, cast), y: lerp(-80, -88, cast) };
            pose.armL.hand = { x: lerp(-34, -44, cast), y: lerp(-56, -66, cast) };
            pose.armR.elbow = { x: lerp(28, 36, cast), y: lerp(-80, -88, cast) };
            pose.armR.hand = { x: lerp(34, 44, cast), y: lerp(-56, -66, cast) };
            pose.legL.foot.x -= cast * 6;
            pose.legR.foot.x += cast * 8;
        } else if (k === 'skill3') {
            // 连珠炮：扎马双拳握紧蓄力（蓄满颤抖） → 连发时周身后座震颤
            const trem = rel > 0 ? Math.sin(st * 1.6) * 2.2 : (cast > 0.75 ? Math.sin(st * 1.2) * 1.6 : 0);
            pose.bodyY += cast * 10;
            pose.bodyTilt = cast * 0.10 - rel * 0.06 + trem * 0.008;
            pose.headRot = cast * 0.14 - rel * 0.16;
            pose.armL.elbow = { x: lerp(-28, -38, cast), y: lerp(-80, -66, cast) + trem * 0.5 };
            pose.armL.hand = { x: lerp(-34, -30, cast), y: lerp(-56, -44, cast) + trem * 0.5 };
            pose.armR.elbow = { x: lerp(28, 38, cast), y: lerp(-80, -66, cast) - trem * 0.5 };
            pose.armR.hand = { x: lerp(34, 30, cast), y: lerp(-56, -44, cast) - trem * 0.5 };
            pose.legL.knee.y += cast * 4;
            pose.legR.knee.y += cast * 4;
            pose.legL.foot.x -= cast * 12;
            pose.legR.foot.x += cast * 14;
        }
        pose.auraBoost = 0; // 改用专属金色咒力炮口特效
        pose.ryuSkill = k;
        pose.ryuCast = cast;
        pose.ryuRel = rel;
    }

    // 石流龙必杀：漫天花火——双臂大张仰天龙啸，咒力花火自炮口连环升空
    if (f.state === 'ult' && f.c.id === 'ryu') {
        pose.bodyY -= peak * 6;
        pose.bodyTilt = -peak * 0.12;
        pose.headRot = -peak * 0.34 + Math.sin(t * 0.18) * 0.02;
        pose.armL.elbow = { x: lerp(-28, -54, peak), y: lerp(-80, -100, peak) };
        pose.armL.hand = { x: lerp(-34, -74, peak), y: lerp(-56, -122, peak) };
        pose.armR.elbow = { x: lerp(28, 54, peak), y: lerp(-80, -100, peak) };
        pose.armR.hand = { x: lerp(34, 74, peak), y: lerp(-56, -122, peak) };
        pose.legL.foot.x -= peak * 10;
        pose.legR.foot.x += peak * 10;
        pose.auraBoost = 0; // 改用花火升空光轮
        pose.ryuUlt = peak;
    }

    // 乌鹭亨子专属施法姿势：宇守罗弹/天空·反拨/空之断层（掌握天空平面）
    if (f.state === 'skill' && f.c.id === 'uro') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1); // 蓄力进度
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0; // 释放进度
        if (k === 'skill1') {
            // 宇守罗弹：拉掌抓住天空平面 → 全力推掌击出空之碎片
            pose.bodyTilt = -cast * 0.08 + rel * 0.18;
            pose.headRot = -cast * 0.04 + rel * 0.08;
            pose.armR.elbow = { x: lerp(28, 6, cast) + rel * 40, y: lerp(-80, -92, cast) };
            pose.armR.hand = { x: lerp(34, 2, cast) + rel * 84, y: lerp(-56, -88, cast) };
            pose.armL.elbow = { x: -26, y: -86 };
            pose.armL.hand = { x: -14, y: -94 };
            pose.legL.foot.x -= cast * 6 + rel * 6;
            pose.legR.foot.x += cast * 4 + rel * 8;
            pose.shoulderR.x += rel * 8;
        } else if (k === 'skill2') {
            // 天空·反拨：双掌于身前撑住天空平面（弹反架势）
            pose.bodyY += cast * 3;
            pose.bodyTilt = cast * 0.06;
            pose.armL.elbow = { x: lerp(-28, -16, cast), y: lerp(-80, -96, cast) };
            pose.armL.hand = { x: lerp(-34, 20, cast), y: lerp(-56, -96, cast) };
            pose.armR.elbow = { x: lerp(28, 18, cast), y: lerp(-80, -84, cast) };
            pose.armR.hand = { x: lerp(34, 26, cast), y: lerp(-56, -72, cast) };
            pose.legL.foot.x -= cast * 8;
            pose.legR.foot.x += cast * 8;
            pose.legL.knee.y += cast * 3;
            pose.legR.knee.y += cast * 3;
        } else if (k === 'skill3') {
            // 空之断层：双手高举抓住头顶天空 → 猛然撕裂下拽
            pose.bodyY -= cast * 4 - rel * 6;
            pose.bodyTilt = -cast * 0.10 + rel * 0.22;
            pose.headRot = -cast * 0.18 + rel * 0.26;
            pose.armL.elbow = { x: lerp(-28, -30, cast), y: lerp(-80, -108, cast) + rel * 40 };
            pose.armL.hand = { x: lerp(-34, -22, cast), y: lerp(-56, -132, cast) + rel * 66 };
            pose.armR.elbow = { x: lerp(28, 30, cast), y: lerp(-80, -108, cast) + rel * 40 };
            pose.armR.hand = { x: lerp(34, 22, cast), y: lerp(-56, -132, cast) + rel * 66 };
            pose.legL.foot.x -= cast * 8;
            pose.legR.foot.x += cast * 10;
        }
        pose.auraBoost = 0; // 改用专属天空平面特效
        pose.uroSkill = k;
        pose.uroCast = cast;
        pose.uroRel = rel;
    }

    // 乌鹭亨子必杀：葬空白纱——双臂徐张仰望崩落之天，白纱绕身
    if (f.state === 'ult' && f.c.id === 'uro') {
        pose.bodyY -= peak * 5;
        pose.bodyTilt = -peak * 0.10;
        pose.headRot = -peak * 0.30 + Math.sin(t * 0.16) * 0.02;
        pose.armL.elbow = { x: lerp(-28, -50, peak), y: lerp(-80, -96, peak) };
        pose.armL.hand = { x: lerp(-34, -70, peak), y: lerp(-56, -114, peak) };
        pose.armR.elbow = { x: lerp(28, 50, peak), y: lerp(-80, -96, peak) };
        pose.armR.hand = { x: lerp(34, 70, peak), y: lerp(-56, -114, peak) };
        pose.legL.foot.x -= peak * 8;
        pose.legR.foot.x += peak * 8;
        pose.auraBoost = 0; // 改用白纱鬼火光轮
        pose.uroUlt = peak;
    }

    // 杜鲁夫专属施法姿势：赤空噬咬/赤轨护领/合围狩猎（差遣式神的王者手势）
    if (f.state === 'skill' && f.c.id === 'druv') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1); // 蓄力进度
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0; // 释放进度
        if (k === 'skill1') {
            // 赤空噬咬：扬臂高举聚力 → 挥臂前指差遣式神
            pose.bodyTilt = -cast * 0.06 + rel * 0.16;
            pose.headRot = -cast * 0.06 + rel * 0.06;
            pose.armR.elbow = { x: lerp(28, 16, cast) + rel * 26, y: lerp(-80, -108, cast) + rel * 34 };
            pose.armR.hand = { x: lerp(34, 20, cast) + rel * 64, y: lerp(-56, -132, cast) + rel * 62 };
            pose.armL.elbow = { x: -28, y: -84 };
            pose.armL.hand = { x: -18, y: -92 };
            pose.legL.foot.x -= cast * 5 + rel * 6;
            pose.legR.foot.x += cast * 4 + rel * 8;
            pose.shoulderR.x += rel * 8;
        } else if (k === 'skill2') {
            // 赤轨护领：双臂抱胸镇座不动，式神绕身回游
            pose.bodyY += cast * 2;
            pose.bodyTilt = 0;
            pose.armL.elbow = { x: lerp(-28, -32, cast), y: lerp(-80, -86, cast) };
            pose.armL.hand = { x: lerp(-34, 12, cast), y: lerp(-56, -88, cast) };
            pose.armR.elbow = { x: lerp(28, 32, cast), y: lerp(-80, -83, cast) };
            pose.armR.hand = { x: lerp(34, -10, cast), y: lerp(-56, -82, cast) };
            pose.legL.foot.x -= cast * 9;
            pose.legR.foot.x += cast * 9;
            pose.legL.knee.y += cast * 3;
            pose.legR.knee.y += cast * 3;
            pose.headRot = -cast * 0.05;
        } else if (k === 'skill3') {
            // 合围狩猎：双臂左右平张同时下令 → 猛然合拢
            pose.bodyY -= cast * 3;
            pose.bodyTilt = -cast * 0.06 + rel * 0.10;
            pose.headRot = -cast * 0.10 + rel * 0.10;
            pose.armL.elbow = { x: lerp(-28, -44, cast) + rel * 18, y: lerp(-80, -94, cast) };
            pose.armL.hand = { x: lerp(-34, -68, cast) + rel * 40, y: lerp(-56, -98, cast) };
            pose.armR.elbow = { x: lerp(28, 44, cast) - rel * 18, y: lerp(-80, -94, cast) };
            pose.armR.hand = { x: lerp(34, 68, cast) - rel * 40, y: lerp(-56, -98, cast) };
            pose.legL.foot.x -= cast * 8;
            pose.legR.foot.x += cast * 10;
        }
        pose.auraBoost = 0; // 改用专属赤红式神特效
        pose.druvSkill = k;
        pose.druvCast = cast;
        pose.druvRel = rel;
    }

    // 杜鲁夫必杀：赤空回游——双臂张开的王者观天之姿，双式神绕身盘旋
    if (f.state === 'ult' && f.c.id === 'druv') {
        pose.bodyY -= peak * 5;
        pose.bodyTilt = -peak * 0.08;
        pose.headRot = -peak * 0.26 + Math.sin(t * 0.15) * 0.02;
        pose.armL.elbow = { x: lerp(-28, -52, peak), y: lerp(-80, -94, peak) };
        pose.armL.hand = { x: lerp(-34, -74, peak), y: lerp(-56, -108, peak) };
        pose.armR.elbow = { x: lerp(28, 52, peak), y: lerp(-80, -94, peak) };
        pose.armR.hand = { x: lerp(34, 74, peak), y: lerp(-56, -108, peak) };
        pose.legL.foot.x -= peak * 9;
        pose.legR.foot.x += peak * 9;
        pose.auraBoost = 0; // 改用赤红轨迹光轮
        pose.druvUlt = peak;
    }

    // 黑沐死专属施法姿势：噬铁潮/烂生刀/土虫蠕定（驱虫与挥刀的咒灵体态）
    if (f.state === 'skill' && f.c.id === 'kuro') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1); // 蓄力进度
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0; // 释放进度
        if (k === 'skill1') {
            // 噬铁潮：俯身前倾张臂 → 双臂前扫驱虫
            pose.bodyTilt = cast * 0.10 + rel * 0.08;
            pose.headRot = cast * 0.10 - rel * 0.04;
            pose.armL.elbow = { x: lerp(-18, -26, cast) + rel * 30, y: lerp(-80, -72, cast) };
            pose.armL.hand = { x: lerp(-14, -30, cast) + rel * 74, y: lerp(-58, -62, cast) + rel * 4 };
            pose.armR.elbow = { x: lerp(18, 8, cast) + rel * 28, y: lerp(-80, -76, cast) };
            pose.armR.hand = { x: lerp(14, -6, cast) + rel * 78, y: lerp(-58, -66, cast) + rel * 6 };
            pose.legL.foot.x -= cast * 6 + rel * 4;
            pose.legR.foot.x += cast * 5 + rel * 7;
            pose.shoulderR.x += rel * 6;
        } else if (k === 'skill2') {
            // 烂生刀：拖刀在后蓄势 → 猛然挥斩
            pose.bodyTilt = -cast * 0.08 + rel * 0.22;
            pose.headRot = -cast * 0.05 + rel * 0.08;
            pose.armR.elbow = { x: lerp(18, -12, cast) + rel * 44, y: lerp(-80, -88, cast) + rel * 8 };
            pose.armR.hand = { x: lerp(14, -30, cast) + rel * 96, y: lerp(-58, -74, cast) + rel * 12 };
            pose.armL.elbow = { x: lerp(-18, -24, cast), y: -78 };
            pose.armL.hand = { x: lerp(-14, -34, cast) + rel * 20, y: lerp(-58, -70, cast) };
            pose.legL.foot.x -= cast * 7;
            pose.legR.foot.x += cast * 5 + rel * 9;
            pose.shoulderR.x += rel * 9;
        } else if (k === 'skill3') {
            // 土虫蠕定：仰首尖鸣，双臂微张召唤携囊式神
            pose.bodyY -= cast * 3;
            pose.bodyTilt = -cast * 0.07;
            pose.headRot = -cast * 0.22 + rel * 0.16;
            pose.armL.elbow = { x: lerp(-18, -36, cast), y: lerp(-80, -88, cast) };
            pose.armL.hand = { x: lerp(-14, -50, cast), y: lerp(-58, -84, cast) };
            pose.armR.elbow = { x: lerp(18, 36, cast), y: lerp(-80, -88, cast) };
            pose.armR.hand = { x: lerp(14, 50, cast), y: lerp(-58, -84, cast) };
            pose.legL.foot.x -= cast * 7;
            pose.legR.foot.x += cast * 7;
        }
        pose.auraBoost = 0; // 改用专属虫群特效
        pose.kuroSkill = k;
        pose.kuroCast = cast;
        pose.kuroRel = rel;
    }

    // 黑沐死必杀：单性生殖·地狱归还——双臂大张仰天尖鸣，蟑螂海啸绕身翻涌
    if (f.state === 'ult' && f.c.id === 'kuro') {
        pose.bodyY -= peak * 4;
        pose.bodyTilt = -peak * 0.07;
        pose.headRot = -peak * 0.30 + Math.sin(t * 0.18) * 0.03;
        pose.armL.elbow = { x: lerp(-18, -50, peak), y: lerp(-80, -92, peak) };
        pose.armL.hand = { x: lerp(-14, -72, peak), y: lerp(-58, -104, peak) };
        pose.armR.elbow = { x: lerp(18, 50, peak), y: lerp(-80, -92, peak) };
        pose.armR.hand = { x: lerp(14, 72, peak), y: lerp(-58, -104, peak) };
        pose.legL.foot.x -= peak * 8;
        pose.legR.foot.x += peak * 8;
        pose.auraBoost = 0; // 改用虫群环绕光轮
        pose.kuroUlt = peak;
    }

    // 虎杖悠仁专属施法姿势：径庭拳/卍字踢（覆盖通用施法）
    if (f.state === 'skill' && f.c.id === 'yuji') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1);
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0;
        if (k === 'skill1') {
            // 径庭拳：后手蓄力拉满 → 全力突进直拳
            pose.bodyTilt = -cast * 0.12 + rel * 0.26;
            pose.bodyRot = -cast * 0.08 + rel * 0.12;
            pose.headRot = -cast * 0.06 + rel * 0.10;
            pose.bodyY -= rel * 4;
            // 后手拉满蓄力
            pose.armR.elbow = { x: lerp(28, -4, cast) + rel * 52, y: lerp(-80, -88, cast) + rel * 6 };
            pose.armR.hand = { x: lerp(34, -14, cast) + rel * 100, y: lerp(-56, -92, cast) + rel * 4 };
            // 前手护胸
            pose.armL.elbow = { x: -24, y: -88 };
            pose.armL.hand = { x: -12, y: -96 };
            pose.legL.foot.x -= cast * 6 + rel * 8;
            pose.legR.foot.x += cast * 4 + rel * 10;
            pose.shoulderR.x += rel * 10;
        } else if (k === 'skill2') {
            // 体道之卍字踢：全身轴心旋转 → 右腿高举回旋下踢
            const spin = rel > 0 ? Math.sin(rel * Math.PI * 2) * 0.3 : 0;
            pose.bodyRot = cast * 0.15 + spin;
            pose.bodyTilt = -cast * 0.08 + rel * 0.18;
            pose.bodyY -= cast * 6 + rel * 4;
            pose.headRot = -cast * 0.10 + rel * 0.14;
            // 双臂展开维持旋转平衡
            pose.armR.elbow = { x: lerp(28, 44, cast) + rel * 8, y: lerp(-80, -100, cast) };
            pose.armR.hand = { x: lerp(34, 62, cast) + rel * 10, y: lerp(-56, -108, cast) };
            pose.armL.elbow = { x: lerp(-28, -46, cast) - rel * 6, y: lerp(-80, -98, cast) };
            pose.armL.hand = { x: lerp(-34, -64, cast) - rel * 8, y: lerp(-56, -104, cast) };
            // 右腿高举旋转下踢
            pose.legR.knee.x += lerp(0, 30, cast) + rel * 12;
            pose.legR.knee.y -= lerp(0, 36, cast) + rel * 8;
            pose.legR.foot.x += lerp(0, 42, cast) + rel * 16;
            pose.legR.foot.y -= lerp(0, 20, cast) - rel * 6;
            pose.legL.foot.x -= cast * 6;
        }
        pose.auraBoost = 0;
        pose.yujiSkill = k;
        pose.yujiCast = cast;
        pose.yujiRel = rel;
    }

    // 虎杖悠仁必杀：黑闪五连击——连续突进重拳姿势
    if (f.state === 'ult' && f.c.id === 'yuji') {
        /* 黑闪五连击：判定与动画共用同一时间轴。
           ultEffect 触发帧记为 ultT0，五连拳判定帧 = ultT0+12+i*14，终结判定帧 = ultT0+88。
           这里用 local = st-ultT0 驱动出拳，使每拳「全伸展」恰好落在对应判定帧上，
           出拳与命中严格同步；ultT0 为空（施法/cut-in 未结束）时保持收拳待机。 */
        const local = f.ultT0 != null ? st - f.ultT0 : -999;
        const FIN = 88;
        let ext = 0, isFin = false, right = true;
        if (local >= 79) {
            // 终结一击：双拳齐推，峰值落在 local=88
            isFin = true;
            ext = clamp(1 - Math.abs(local - FIN) / 10, 0, 1);
        } else if (local >= 5) {
            // 第 idx 拳（0~4），峰值落在 local=12+idx*14，左右手交替
            const idx = clamp(Math.round((local - 12) / 14), 0, 4);
            ext = clamp(1 - Math.abs(local - (12 + idx * 14)) / 7, 0, 1);
            right = idx % 2 === 0;
        }
        pose.bodyTilt = 0.12 + ext * 0.10;
        pose.bodyY -= ext * 6;
        pose.headRot = -0.08;
        if (isFin) {
            pose.bodyRot = ext * 0.10;
            pose.armR.elbow = { x: lerp(28, 52, ext), y: lerp(-80, -98, ext) };
            pose.armR.hand = { x: lerp(34, 98, ext), y: lerp(-56, -90, ext) };
            pose.armL.elbow = { x: lerp(-28, 34, ext), y: lerp(-80, -96, ext) };
            pose.armL.hand = { x: lerp(-34, 90, ext), y: lerp(-56, -88, ext) };
        } else if (right) {
            // 右直拳伸展，左手收回护脸
            pose.bodyRot = ext * 0.12;
            pose.armR.elbow = { x: lerp(28, 48, ext), y: lerp(-80, -96, ext) };
            pose.armR.hand = { x: lerp(34, 90, ext), y: lerp(-56, -92, ext) };
            pose.armL.elbow = { x: -24, y: -90 };
            pose.armL.hand = { x: -8, y: -106 };
        } else {
            // 左直拳伸展，右手收回护脸
            pose.bodyRot = -ext * 0.12;
            pose.armL.elbow = { x: lerp(-28, -16, ext), y: lerp(-80, -94, ext) };
            pose.armL.hand = { x: lerp(-34, 78, ext), y: lerp(-56, -90, ext) };
            pose.armR.elbow = { x: 24, y: -90 };
            pose.armR.hand = { x: 8, y: -106 };
        }
        pose.legL.foot.x -= ext * 10;
        pose.legR.foot.x += ext * 12;
        pose.auraBoost = 0;
        pose.yujiUlt = ext;              // 咒力核强度跟随出拳伸展，命中帧最亮
        pose.yujiUltRight = isFin ? null : right; // 咒力核所在手（null=终结双手）
    }

    // 虎杖悠仁·决意专属施法姿势：黑闪/穿血/灵魂解
    if (f.state === 'skill' && f.c.id === 'yuji2') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1);
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0;
        if (k === 'skill1') {
            // 黑闪：后手蓄力拉满 → 单拳猛击
            pose.bodyTilt = -cast * 0.14 + rel * 0.30;
            pose.bodyRot = -cast * 0.10 + rel * 0.14;
            pose.headRot = -cast * 0.08 + rel * 0.12;
            pose.bodyY -= rel * 5;
            pose.armR.elbow = { x: lerp(28, -8, cast) + rel * 58, y: lerp(-80, -90, cast) + rel * 8 };
            pose.armR.hand = { x: lerp(34, -18, cast) + rel * 110, y: lerp(-56, -94, cast) + rel * 6 };
            pose.armL.elbow = { x: -26, y: -86 };
            pose.armL.hand = { x: -14, y: -94 };
            pose.legL.foot.x -= cast * 8 + rel * 10;
            pose.legR.foot.x += cast * 4 + rel * 12;
            pose.shoulderR.x += rel * 12;
        } else if (k === 'skill2') {
            // 穿血：抬手凝聚 → 掌心前推发射
            pose.bodyTilt = -cast * 0.06 + rel * 0.16;
            pose.headRot = -cast * 0.06;
            pose.armR.elbow = { x: lerp(28, 36, cast) + rel * 14, y: lerp(-80, -96, cast) };
            pose.armR.hand = { x: lerp(34, 60, cast) + rel * 30, y: lerp(-56, -88, cast) };
            pose.armL.elbow = { x: lerp(-28, 20, cast), y: lerp(-80, -92, cast) };
            pose.armL.hand = { x: lerp(-34, 50, cast), y: lerp(-56, -84, cast) };
            pose.legL.foot.x -= rel * 6;
            pose.legR.foot.x += rel * 8;
        } else if (k === 'skill3') {
            // 灵魂解：低身突进 → 连续斩击姿态
            const jit = rel > 0 ? Math.sin(st * 1.6) * 0.2 : 0;
            pose.bodyTilt = 0.10 + cast * 0.08 + jit;
            pose.bodyRot = cast * 0.12 + jit;
            pose.bodyY -= cast * 4;
            pose.headRot = -0.06;
            pose.armR.elbow = { x: lerp(28, 48, cast) + rel * 16, y: lerp(-80, -98, cast) + jit * 20 };
            pose.armR.hand = { x: lerp(34, 78, cast) + rel * 20, y: lerp(-56, -92, cast) - jit * 24 };
            pose.armL.elbow = { x: lerp(-28, -38, cast), y: lerp(-80, -90, cast) };
            pose.armL.hand = { x: lerp(-34, -48, cast), y: lerp(-56, -80, cast) };
            pose.legL.foot.x -= cast * 10;
            pose.legR.foot.x += cast * 12;
            if (rel > 0.1) pose.ghost = 1;
        }
        pose.auraBoost = 0;
        pose.yuji2Skill = k;
        pose.yuji2Cast = cast;
        pose.yuji2Rel = rel;
    }

    // 虎杖悠仁·决意必杀：领域展开·仙台——双手交叠胸前结印
    if (f.state === 'ult' && f.c.id === 'yuji2') {
        pose.armL.elbow = { x: lerp(-28, -12, peak), y: lerp(-80, -90, peak) };
        pose.armL.hand = { x: lerp(-34, 10, peak), y: lerp(-56, -102, peak) };
        pose.armR.elbow = { x: lerp(28, 30, peak), y: lerp(-80, -92, peak) };
        pose.armR.hand = { x: lerp(34, 16, peak), y: lerp(-56, -104, peak) };
        pose.bodyTilt = -0.03 * peak;
        pose.headRot = -0.08 * peak;
        pose.auraBoost = 0;
        pose.yuji2Ult = peak;
    }

    // 乙骨忧太：持刀待机姿态（刀自然下垂，身体微侧，沉稳温柔）
    if (f.c.id === 'okkotsu' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        pose.armL.elbow = { x: -20, y: -82 };
        pose.armL.hand = { x: -12, y: -58 };
        pose.armR.elbow = { x: 24, y: -84 };
        pose.armR.hand = { x: 20, y: -60 };
        pose.bodyTilt = -0.02;
        pose.headRot = 0.02 + Math.sin(t * 0.04) * 0.02;
        pose.bodyRot = Math.sin(t * 0.035) * 0.01;
        pose.weaponRot = 1.2;
    }

    // 乙骨忧太专属施法姿势：里香铁拳/咒言/冲击波
    if (f.state === 'skill' && f.c.id === 'okkotsu') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1);
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0;
        if (k === 'skill1') {
            // 里香·铁拳：举刀→里香巨腕横扫
            pose.bodyTilt = -cast * 0.08 + rel * 0.22;
            pose.bodyRot = -cast * 0.12 + rel * 0.20;
            pose.headRot = -cast * 0.06 + rel * 0.10;
            pose.armR.elbow = { x: lerp(28, 10, cast) + rel * 44, y: lerp(-80, -106, cast) + rel * 20 };
            pose.armR.hand = { x: lerp(34, 20, cast) + rel * 70, y: lerp(-56, -120, cast) + rel * 40 };
            pose.armL.elbow = { x: lerp(-28, -36, cast), y: lerp(-80, -90, cast) };
            pose.armL.hand = { x: lerp(-34, -44, cast), y: lerp(-56, -76, cast) };
            pose.legL.foot.x -= rel * 8;
            pose.legR.foot.x += cast * 6 + rel * 10;
            pose.weaponRot = lerp(0.9, -0.6, cast) + rel * 1.2;
        } else if (k === 'skill2') {
            // 术式模仿·咒言：收刀→双手结印→释放
            pose.bodyTilt = cast * 0.06 + rel * 0.08;
            pose.headRot = -cast * 0.10;
            pose.armR.elbow = { x: lerp(28, 16, cast) + rel * 20, y: lerp(-80, -96, cast) };
            pose.armR.hand = { x: lerp(34, 30, cast) + rel * 36, y: lerp(-56, -92, cast) };
            pose.armL.elbow = { x: lerp(-28, -14, cast) + rel * 16, y: lerp(-80, -94, cast) };
            pose.armL.hand = { x: lerp(-34, -20, cast) + rel * 30, y: lerp(-56, -90, cast) };
            pose.weaponRot = lerp(0.9, 1.4, cast);
        } else if (k === 'skill3') {
            // 里香·冲击波：里香显现→蓄力→发射
            pose.bodyTilt = -cast * 0.06 + rel * 0.14;
            pose.headRot = -cast * 0.08;
            pose.armR.elbow = { x: lerp(28, 38, cast) + rel * 16, y: lerp(-80, -98, cast) };
            pose.armR.hand = { x: lerp(34, 56, cast) + rel * 28, y: lerp(-56, -90, cast) };
            pose.armL.elbow = { x: lerp(-28, 24, cast), y: lerp(-80, -94, cast) };
            pose.armL.hand = { x: lerp(-34, 48, cast), y: lerp(-56, -86, cast) };
            pose.legL.foot.x -= rel * 6;
            pose.legR.foot.x += rel * 8;
            pose.weaponRot = lerp(0.9, 1.3, cast);
        }
        pose.auraBoost = 0;
        pose.okkotsuSkill = k;
        pose.okkotsuCast = cast;
        pose.okkotsuRel = rel;
    }

    // 乙骨忧太必杀：领域展开·真赝相爱——拔刀插入地面结印
    if (f.state === 'ult' && f.c.id === 'okkotsu') {
        pose.armL.elbow = { x: lerp(-28, -16, peak), y: lerp(-80, -92, peak) };
        pose.armL.hand = { x: lerp(-34, 6, peak), y: lerp(-56, -106, peak) };
        pose.armR.elbow = { x: lerp(28, 26, peak), y: lerp(-80, -94, peak) };
        pose.armR.hand = { x: lerp(34, 14, peak), y: lerp(-56, -108, peak) };
        pose.bodyTilt = -0.04 * peak;
        pose.headRot = -0.06 * peak;
        pose.weaponRot = lerp(0.9, 2.2, peak);
        pose.auraBoost = 0;
        pose.okkotsuUlt = peak;
    }

    // 真人：待机姿态（微驼、松散、嘲讽感，双手自然下垂微张）
    if (f.c.id === 'mahito' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        pose.armL.elbow = { x: -24, y: -78 };
        pose.armL.hand = { x: -28, y: -54 };
        pose.armR.elbow = { x: 24, y: -78 };
        pose.armR.hand = { x: 28, y: -54 };
        pose.bodyTilt = 0.03 + Math.sin(t * 0.05) * 0.015;
        pose.headRot = -0.04 + Math.sin(t * 0.03) * 0.03;
        pose.bodyRot = Math.sin(t * 0.04) * 0.012;
    }

    // 真人专属施法姿势：腕刃/拨体/遍杀即灵体
    if (f.state === 'skill' && f.c.id === 'mahito') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 14), 0, 1);
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0;
        if (k === 'skill1') {
            // 无为转变·腕刃：右臂膨胀变形为巨刃横扫
            pose.bodyTilt = -cast * 0.1 + rel * 0.25;
            pose.bodyRot = -cast * 0.15 + rel * 0.22;
            pose.headRot = -cast * 0.05 + rel * 0.08;
            pose.armR.elbow = { x: lerp(28, 40, cast) + rel * 30, y: lerp(-80, -100, cast) + rel * 10 };
            pose.armR.hand = { x: lerp(34, 55, cast) + rel * 60, y: lerp(-56, -110, cast) + rel * 30 };
            pose.armL.elbow = { x: lerp(-28, -20, cast), y: lerp(-80, -70, cast) };
            pose.armL.hand = { x: lerp(-34, -16, cast), y: lerp(-56, -50, cast) };
            pose.mahitoSkill = 'skill1';
        } else if (k === 'skill2') {
            // 多重魂·拨体：双手前推吐出改造人
            pose.bodyTilt = cast * 0.08 + rel * 0.1;
            pose.headRot = -cast * 0.06;
            pose.armR.elbow = { x: lerp(28, 30, cast) + rel * 20, y: lerp(-80, -90, cast) };
            pose.armR.hand = { x: lerp(34, 44, cast) + rel * 30, y: lerp(-56, -80, cast) };
            pose.armL.elbow = { x: lerp(-28, -10, cast) + rel * 14, y: lerp(-80, -88, cast) };
            pose.armL.hand = { x: lerp(-34, 20, cast) + rel * 26, y: lerp(-56, -78, cast) };
            pose.mahitoSkill = 'skill2';
        } else if (k === 'skill3') {
            // 遍杀即灵体：撕去人脸→身体膨胀变身
            pose.bodyTilt = -cast * 0.06;
            pose.headRot = cast * 0.15 - rel * 0.1;
            pose.armR.elbow = { x: lerp(28, 44, cast), y: lerp(-80, -110, cast) };
            pose.armR.hand = { x: lerp(34, 20, cast), y: lerp(-56, -120, cast) };
            pose.armL.elbow = { x: lerp(-28, -44, cast), y: lerp(-80, -110, cast) };
            pose.armL.hand = { x: lerp(-34, -20, cast), y: lerp(-56, -120, cast) };
            pose.mahitoSkill = 'skill3';
        }
        pose.mahitoCast = cast;
        pose.mahitoRel = rel;
        pose.auraBoost = 0;
    }

    // 真人遍杀即灵体状态：变身后的体型膨胀渲染标记
    if (f.c.id === 'mahito' && f.hensetsuActive) {
        pose.mahitoTransformed = true;
    }

    // 七海建人：持刀待机姿态（沉稳、理性、刀自然垂于身侧）
    if (f.c.id === 'nanami' && f.state === 'idle' && f.onGround && !f.blockHeld) {
        pose.armL.elbow = { x: -22, y: -80 };
        pose.armL.hand = { x: -16, y: -56 };
        pose.armR.elbow = { x: 22, y: -82 };
        pose.armR.hand = { x: 18, y: -58 };
        pose.bodyTilt = 0.01;
        pose.headRot = -0.02 + Math.sin(t * 0.03) * 0.01;
        pose.bodyRot = Math.sin(t * 0.025) * 0.008;
        pose.weaponRot = 1.4;
    }

    // 七海建人专属施法姿势：闷斩/连劈/崩落
    if (f.state === 'skill' && f.c.id === 'nanami') {
        const k = f.skillKind;
        const cast = clamp(st / (f.castAt || 16), 0, 1);
        const rel = st > f.castAt ? clamp((st - f.castAt) / ((f.skillDur - f.castAt) || 20), 0, 1) : 0;
        if (k === 'skill1') {
            // 十划咒法·闷斩：精准斜线斩
            pose.bodyTilt = -cast * 0.06 + rel * 0.18;
            pose.bodyRot = -cast * 0.1 + rel * 0.15;
            pose.headRot = -cast * 0.04;
            pose.armR.elbow = { x: lerp(28, 14, cast) + rel * 40, y: lerp(-80, -108, cast) + rel * 20 };
            pose.armR.hand = { x: lerp(34, 24, cast) + rel * 65, y: lerp(-56, -120, cast) + rel * 50 };
            pose.armL.elbow = { x: lerp(-28, -20, cast), y: lerp(-80, -72, cast) };
            pose.armL.hand = { x: lerp(-34, -14, cast), y: lerp(-56, -52, cast) };
            pose.weaponRot = lerp(1.4, -0.8, cast) + rel * 1.6;
        } else if (k === 'skill2') {
            // 十划咒法·连劈：连续多段斩击
            const swing = Math.sin(st * 0.6) * 0.3;
            pose.bodyTilt = swing * 0.15 + rel * 0.1;
            pose.bodyRot = swing * 0.12;
            pose.headRot = swing * 0.05;
            pose.armR.elbow = { x: 20 + swing * 30, y: -95 + swing * 10 };
            pose.armR.hand = { x: 30 + swing * 50, y: -100 + swing * 20 };
            pose.armL.elbow = { x: -20 - swing * 10, y: -75 };
            pose.armL.hand = { x: -14 - swing * 10, y: -55 };
            pose.weaponRot = 0.5 + swing * 1.5;
        } else if (k === 'skill3') {
            // 十划咒法·崩落：蓄力下劈
            pose.bodyTilt = -cast * 0.08 + rel * 0.2;
            pose.headRot = -cast * 0.06 + rel * 0.04;
            pose.armR.elbow = { x: lerp(28, 10, cast), y: lerp(-80, -120, cast) + rel * 40 };
            pose.armR.hand = { x: lerp(34, 16, cast), y: lerp(-56, -135, cast) + rel * 80 };
            pose.armL.elbow = { x: lerp(-28, -16, cast), y: lerp(-80, -100, cast) };
            pose.armL.hand = { x: lerp(-34, -10, cast), y: lerp(-56, -80, cast) };
            pose.weaponRot = lerp(1.4, -2.0, cast) + rel * 3.0;
        }
        pose.nanamiSkill = k;
        pose.nanamiCast = cast;
        pose.nanamiRel = rel;
        pose.auraBoost = 0;
    }

    // 七海建人加班形态标记
    if (f.c.id === 'nanami' && f.overtimeActive) {
        pose.nanamiOvertime = true;
    }

    // 甚尔杀戮本能形态标记（霸体持续期间全程可见）
    if (f.c.id === 'toji' && f.slaughterActive) {
        pose.tojiSlaughter = true;
    }

    // 六眼：咒力充满时眼罩下透出蓝光
    if ((f.c.base || f.c.id) === 'gojo' && f.energy >= 100) pose.gojoGlow = 1;
    // 赤瞳：咒力充满时双瞳灼灼生辉
    if (f.c.id === 'sukuna' && f.energy >= 100) pose.sukunaGlow = 1;

    // 宿傩真身：第二对手臂（下臂，自躯干中段伸出，随状态摆位）
    if (f.c.id === 'sukuna') {
        pose.shoulderL2 = { x: -19, y: -90 };
        pose.shoulderR2 = { x: 19, y: -90 };
        pose.armL2 = { elbow: { x: -30, y: -68 }, hand: { x: -27, y: -46 } };
        pose.armR2 = { elbow: { x: 30, y: -68 }, hand: { x: 27, y: -46 } };
        if (f.state === 'walk') {
            const a2 = t * 0.34;
            pose.armL2.hand.x -= Math.sin(a2) * 9;
            pose.armR2.hand.x += Math.sin(a2) * 9;
        } else if (f.state === 'idle' && f.onGround && !f.blockHeld) {
            // 待机：上臂抱胸，下臂自然下垂微摆
            pose.armL2.hand.y += Math.sin(t * 0.06) * 1.6;
            pose.armR2.hand.y += Math.sin(t * 0.06 + 1.2) * 1.6;
        } else if (f.state === 'skill') {
            // 施法：下臂向外张开助势
            pose.armL2.elbow = { x: -33, y: -72 };
            pose.armL2.hand = { x: -36 - peak * 8, y: -58 - peak * 8 };
            pose.armR2.elbow = { x: 33, y: -72 };
            pose.armR2.hand = { x: 36 + peak * 10, y: -58 - peak * 10 };
        } else if (f.state === 'ult') {
            // 必杀：下臂于腹前合拢结印
            pose.armL2.elbow = { x: -26, y: -64 };
            pose.armL2.hand = { x: 5 * peak - 27 * (1 - peak), y: -70 };
            pose.armR2.elbow = { x: 26, y: -64 };
            pose.armR2.hand = { x: -3 * peak + 27 * (1 - peak), y: -72 };
        } else if (f.state === 'attack') {
            // 普攻：下位前臂随挥击前送
            pose.armR2.elbow = { x: 30, y: -70 };
            pose.armR2.hand = { x: 28 + peak * 26, y: -58 };
            pose.armL2.hand.x = -28 - peak * 4;
        } else if (f.state === 'hurt' || f.state === 'launched' || f.state === 'ko') {
            pose.armL2.hand = { x: -32, y: -52 };
            pose.armR2.hand = { x: 32, y: -52 };
        } else if (f.blockHeld && f.onGround) {
            // 格挡：下臂交叠护于腹前
            pose.armL2.elbow = { x: -24, y: -66 };
            pose.armL2.hand = { x: 10, y: -66 };
            pose.armR2.elbow = { x: 24, y: -66 };
            pose.armR2.hand = { x: -8, y: -70 };
        }
    }
    // 影之咒力：蓄满时眼中透出影光
    if ((f.c.id === 'megumi' || f.c.id === 'megumi2') && f.energy >= 100) pose.megGlow = 1;

    return pose;
}

/* ---------------- 肢体绘制辅助 ---------------- */
function limb(g, x1, y1, x2, y2, x3, y3, color, width) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo(x2, y2, x3, y3);
    g.stroke();
}

function joint(g, x, y, r, color) {
    g.fillStyle = color;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
}

function foot(g, x, y, color = '#0c0f18') {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, y, 10, 5.5, 0, 0, Math.PI * 2);
    g.fill();
}

/* 五条悟：发光咒力核（白芯 + 彩色晕 + 透明边缘） */
function gojoOrb(g, x, y, r, core, edge) {
    if (r <= 0.5) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, '#ffffff');
    gr.addColorStop(0.35, core);
    gr.addColorStop(1, edge);
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
}

/* 里香灵体绘制：过咒怨灵——惨白巨脸 + 黑紫涌动躯体 + 裂口密齿 + 金婚戒 */
function drawRika(g, x, y, facing, alpha, mode, animT) {
    if (alpha <= 0.02) return;
    g.save();
    g.translate(x, y);
    g.scale(facing, 1);
    g.globalAlpha = alpha;

    const at = animT || 0;
    const breathe = Math.sin(at * 0.08) * 3;
    // 里香配色：惨白骨感上身 + 黑色涌流下躯 + 猩红血口 + 紫咒力边缘（贴合原作过咒怨灵）
    const boneFill = 'rgba(226,222,230,0.74)';
    const boneShade = 'rgba(150,140,168,0.5)';
    const bodyEdge = 'rgba(184,154,255,0.65)';
    const faceFill = 'rgba(240,236,248,0.9)';
    const mawFill = 'rgba(122,16,26,0.92)';
    const mawDeep = 'rgba(66,8,16,0.96)';
    const glowCore = 'rgba(184,154,255,0.5)';

    if (mode === 'arm') {
        /* 巨腕模式：里香黑紫怨灵巨臂从虚空裂隙伸出，惨白骨感拳面 */
        // 显现裂隙（虚空撕开的紫黑口）
        g.fillStyle = 'rgba(12,6,24,0.5)';
        g.beginPath();
        g.ellipse(-16, -34, 26, 44, 0.3, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = bodyEdge;
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(-16, -34, 26, 44, 0.3, 0, Math.PI * 2);
        g.stroke();
        // 手臂主体（惨白骨感 · 紫咒力边缘）
        g.fillStyle = boneFill;
        g.strokeStyle = bodyEdge;
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(-20, -60);
        g.quadraticCurveTo(30, -80 + breathe, 70, -50);
        g.quadraticCurveTo(95, -35, 100, -10);
        g.quadraticCurveTo(105, 10, 90, 25);
        g.quadraticCurveTo(70, 40, 40, 35);
        g.quadraticCurveTo(10, 30, -10, 10);
        g.quadraticCurveTo(-25, -10, -20, -60);
        g.closePath();
        g.fill();
        g.stroke();
        // 咒力涌动纹（沿臂三道波纹）
        g.strokeStyle = 'rgba(184,154,255,0.35)';
        g.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
            const ph = at * 0.1 + i * 1.7;
            g.beginPath();
            g.moveTo(-8 + i * 6, -46 + i * 14);
            g.quadraticCurveTo(24 + i * 8, -56 + i * 14 + Math.sin(ph) * 4, 58 + i * 8, -34 + i * 12);
            g.stroke();
        }
        // 惨白手背骨感区（拳面）
        g.fillStyle = 'rgba(238,234,246,0.55)';
        g.beginPath();
        g.moveTo(42, -36);
        g.quadraticCurveTo(78, -46, 96, -22);
        g.quadraticCurveTo(102, -4, 94, 16);
        g.quadraticCurveTo(72, 28, 50, 20);
        g.quadraticCurveTo(38, 0, 42, -36);
        g.closePath();
        g.fill();
        // 指节线条（白骨感）
        g.strokeStyle = 'rgba(90,70,120,0.55)';
        g.lineWidth = 1.8;
        for (let i = 0; i < 4; i++) {
            g.beginPath();
            g.moveTo(48 + i * 13, -30 + i * 6);
            g.lineTo(53 + i * 13, 8 + i * 3);
            g.stroke();
        }
        // 指甲（尖锐怨灵爪）
        g.fillStyle = 'rgba(255,252,255,0.85)';
        for (let i = 0; i < 4; i++) {
            g.beginPath();
            g.moveTo(46 + i * 13, -32 + i * 6);
            g.lineTo(51 + i * 13, -44 + i * 5);
            g.lineTo(55 + i * 13, -30 + i * 6);
            g.closePath();
            g.fill();
        }
        // 婚戒（无名指金环——爱的具象）
        g.strokeStyle = 'rgba(255,215,100,0.9)';
        g.lineWidth = 2.4;
        g.beginPath();
        g.arc(74, -6, 4.5, 0, Math.PI * 2);
        g.stroke();
        gojoOrb(g, 74, -6, 8, 'rgba(255,224,130,0.4)', 'rgba(255,215,100,0)');
        // 拳锋咒力辉光
        gojoOrb(g, 88, -4, 18, glowCore, 'rgba(184,154,255,0)');
    } else if (mode === 'upper') {
        /* 上半身模式：惨白巨脸 + 黑发涌流 + 裂口密齿 + 黑紫肩躯 */
        // 黑发涌流（先铺底，包裹头部与肩部）
        g.fillStyle = 'rgba(14,8,26,0.6)';
        g.beginPath();
        g.moveTo(-46, 30);
        g.quadraticCurveTo(-58, -40, -44, -120 + breathe);
        g.quadraticCurveTo(-30, -160 + breathe, 0, -158 + breathe);
        g.quadraticCurveTo(30, -160 + breathe, 44, -120 + breathe);
        g.quadraticCurveTo(58, -40, 46, 30);
        g.closePath();
        g.fill();
        // 发丝飘动（黑发如触流扭动）
        g.strokeStyle = 'rgba(60,40,90,0.55)';
        g.lineWidth = 3;
        g.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
            const sx = -40 + i * 16,
                ph = at * 0.09 + i * 1.3;
            g.beginPath();
            g.moveTo(sx, -130 + breathe);
            g.quadraticCurveTo(sx + Math.sin(ph) * 8, -80, sx + Math.sin(ph + 1.5) * 12, -10);
            g.stroke();
        }
        // 头部（惨白巨脸）
        g.fillStyle = faceFill;
        g.strokeStyle = 'rgba(120,100,160,0.5)';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(0, -110 + breathe, 30, 36, 0, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        // 额前碎发（黑发垂落遮额）
        g.fillStyle = 'rgba(14,8,26,0.7)';
        for (let i = 0; i < 5; i++) {
            const hx = -22 + i * 11;
            g.beginPath();
            g.moveTo(hx, -142 + breathe);
            g.quadraticCurveTo(hx + 4, -130 + breathe, hx + 2, -120 + breathe + (i % 2) * 6);
            g.lineTo(hx + 8, -142 + breathe);
            g.closePath();
            g.fill();
        }
        // 双眼（黑眶凹窝 + 小白瞳——怨灵凝视）
        g.fillStyle = 'rgba(16,8,28,0.9)';
        g.beginPath();
        g.ellipse(-12, -116 + breathe, 6.5, 8, 0.15, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(12, -116 + breathe, 6.5, 8, -0.15, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)';
        g.beginPath();
        g.arc(-12, -115 + breathe, 2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(12, -115 + breathe, 2, 0, Math.PI * 2);
        g.fill();
        // 裂口血盆大嘴（咧开至脸缘，猩红口腔 + 深喉）
        const mawG = g.createRadialGradient(0, -86 + breathe, 2, 0, -86 + breathe, 22);
        mawG.addColorStop(0, mawDeep);
        mawG.addColorStop(1, mawFill);
        g.fillStyle = mawG;
        g.beginPath();
        g.moveTo(-26, -97 + breathe);
        g.quadraticCurveTo(0, -82 + breathe, 26, -97 + breathe);
        g.quadraticCurveTo(0, -70 + breathe, -26, -97 + breathe);
        g.closePath();
        g.fill();
        // 密列方齿（上下两排）
        g.fillStyle = 'rgba(255,255,250,0.92)';
        for (let i = 0; i < 8; i++) {
            const tx = -21 + i * 6;
            g.fillRect(tx, -95.5 + breathe + Math.abs(i - 3.5) * 0.8, 4.6, 4.2);
        }
        for (let i = 0; i < 7; i++) {
            const tx = -18 + i * 6;
            g.fillRect(tx, -86 + breathe + Math.abs(i - 3) * 1.0, 4.4, 3.6);
        }
        // 嘴缘裂痕（向两颊延伸）
        g.strokeStyle = 'rgba(80,40,70,0.7)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-24, -96 + breathe);
        g.quadraticCurveTo(-29, -98 + breathe, -32, -103 + breathe);
        g.stroke();
        g.beginPath();
        g.moveTo(24, -96 + breathe);
        g.quadraticCurveTo(29, -98 + breathe, 32, -103 + breathe);
        g.stroke();
        // 肩部+躯体（惨白骨感躯壳）
        g.fillStyle = boneFill;
        g.strokeStyle = bodyEdge;
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-40, -75 + breathe);
        g.quadraticCurveTo(-55, -50, -50, -10);
        g.quadraticCurveTo(-45, 20, -20, 30);
        g.lineTo(25, 30);
        g.quadraticCurveTo(50, 20, 55, -10);
        g.quadraticCurveTo(58, -50, 42, -75 + breathe);
        g.quadraticCurveTo(20, -85 + breathe, 0, -80 + breathe);
        g.quadraticCurveTo(-20, -85 + breathe, -40, -75 + breathe);
        g.closePath();
        g.fill();
        g.stroke();
        // 肋骨横纹（惨白骨感）
        g.strokeStyle = boneShade;
        g.lineWidth = 1.4;
        for (let ri = 0; ri < 4; ri++) {
            g.beginPath();
            g.moveTo(-32 + ri * 2, -56 + ri * 13);
            g.quadraticCurveTo(0, -48 + ri * 13, 32 - ri * 2, -56 + ri * 13);
            g.stroke();
        }
        // 躯体咒力涌动纹
        g.strokeStyle = 'rgba(184,154,255,0.3)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const ph = at * 0.08 + i * 2.0;
            g.beginPath();
            g.moveTo(-38 + i * 8, -40 + i * 16);
            g.quadraticCurveTo(0, -48 + i * 16 + Math.sin(ph) * 5, 38 - i * 6, -38 + i * 16);
            g.stroke();
        }
        // 心口咒力核（紫色——与乙骨的羁绊核心）
        gojoOrb(g, 0, -40 + breathe, 18, glowCore, 'rgba(184,154,255,0)');
        // 心口金环微光（婚约之证）
        g.strokeStyle = 'rgba(255,215,100,0.5)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(0, -40 + breathe, 7, 0, Math.PI * 2);
        g.stroke();
    } else if (mode === 'giant') {
        /* 巨影模式：里香完全显现——领域展开时的守护怨灵 */
        const sway = Math.sin(at * 0.05) * 4;
        // 黑发暴涌（整体背幕，包裹巨躯）
        g.fillStyle = 'rgba(10,5,22,0.5)';
        g.beginPath();
        g.moveTo(-80 + sway, -240);
        g.quadraticCurveTo(-110, -160, -95, -60);
        g.quadraticCurveTo(-85, 20, -50, 55);
        g.lineTo(50, 55);
        g.quadraticCurveTo(85, 20, 95, -60);
        g.quadraticCurveTo(110, -160, 80 + sway, -240);
        g.quadraticCurveTo(30, -268, 0, -265);
        g.quadraticCurveTo(-30, -268, -80 + sway, -240);
        g.closePath();
        g.fill();
        // 发丝飘扭（外缘长发如触手扭动）
        g.strokeStyle = 'rgba(50,32,80,0.6)';
        g.lineWidth = 4;
        g.lineCap = 'round';
        for (let i = 0; i < 8; i++) {
            const ang = -Math.PI * 0.88 + i * 0.25;
            const hx = sway + Math.cos(ang) * 92;
            const hy = -140 + Math.sin(ang) * 120;
            const ph = at * 0.07 + i * 1.1;
            g.beginPath();
            g.moveTo(hx, hy);
            g.quadraticCurveTo(hx + Math.cos(ang) * 24 + Math.sin(ph) * 8, hy + 30, hx + Math.cos(ang) * 40 + Math.sin(ph + 1.4) * 12, hy + 80);
            g.stroke();
        }
        // 巨大躯体（惨白骨感躯壳）
        g.fillStyle = boneFill;
        g.strokeStyle = bodyEdge;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-50 + sway, -180);
        g.quadraticCurveTo(-70, -140, -65, -80);
        g.quadraticCurveTo(-60, -20, -45, 20);
        g.quadraticCurveTo(-30, 50, 0, 55);
        g.quadraticCurveTo(30, 50, 45, 20);
        g.quadraticCurveTo(60, -20, 65, -80);
        g.quadraticCurveTo(70, -140, 50 + sway, -180);
        g.quadraticCurveTo(25, -200, 0, -195);
        g.quadraticCurveTo(-25, -200, -50 + sway, -180);
        g.closePath();
        g.fill();
        g.stroke();
        // 躯体咒力涌动纹（四道横向波纹）
        g.strokeStyle = 'rgba(184,154,255,0.28)';
        g.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            const ph = at * 0.06 + i * 1.6;
            g.beginPath();
            g.moveTo(-55 + i * 5, -140 + i * 44);
            g.quadraticCurveTo(sway, -150 + i * 44 + Math.sin(ph) * 6, 55 - i * 5, -140 + i * 44);
            g.stroke();
        }
        // 头部（惨白巨脸）
        g.fillStyle = 'rgba(242,238,250,0.88)';
        g.strokeStyle = 'rgba(120,100,160,0.55)';
        g.lineWidth = 2.5;
        g.beginPath();
        g.ellipse(sway * 0.5, -212, 38, 44, 0, 0, Math.PI * 2);
        g.fill();
        g.stroke();
        // 额前黑发垂落
        g.fillStyle = 'rgba(10,5,22,0.75)';
        for (let i = 0; i < 6; i++) {
            const hx = sway * 0.5 - 28 + i * 11;
            g.beginPath();
            g.moveTo(hx, -252);
            g.quadraticCurveTo(hx + 5, -238, hx + 2, -226 + (i % 2) * 8);
            g.lineTo(hx + 9, -252);
            g.closePath();
            g.fill();
        }
        // 双眼（黑眶凹窝 + 白瞳凝视——完全显现的怨灵之眼）
        g.fillStyle = 'rgba(14,6,26,0.92)';
        g.beginPath();
        g.ellipse(sway * 0.5 - 15, -220, 8.5, 11, 0.12, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(sway * 0.5 + 15, -220, 8.5, 11, -0.12, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.95)';
        g.beginPath();
        g.arc(sway * 0.5 - 15, -218, 2.6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(sway * 0.5 + 15, -218, 2.6, 0, Math.PI * 2);
        g.fill();
        // 裂口血盆巨嘴（咧至脸缘，猩红口腔 + 深喉）
        const gMawG = g.createRadialGradient(sway * 0.5, -180, 3, sway * 0.5, -180, 30);
        gMawG.addColorStop(0, mawDeep);
        gMawG.addColorStop(1, mawFill);
        g.fillStyle = gMawG;
        g.beginPath();
        g.moveTo(sway * 0.5 - 30, -192);
        g.quadraticCurveTo(sway * 0.5, -178, sway * 0.5 + 30, -192);
        g.quadraticCurveTo(sway * 0.5, -162, sway * 0.5 - 30, -192);
        g.closePath();
        g.fill();
        g.fillStyle = 'rgba(255,255,250,0.92)';
        for (let i = 0; i < 9; i++) {
            const tx = sway * 0.5 - 26 + i * 6;
            g.fillRect(tx, -191 + Math.abs(i - 4) * 1.0, 4.6, 5.2);
        }
        for (let i = 0; i < 8; i++) {
            const tx = sway * 0.5 - 23 + i * 6;
            g.fillRect(tx, -179 + Math.abs(i - 3.5) * 1.2, 4.4, 4.4);
        }
        // 嘴缘裂痕
        g.strokeStyle = 'rgba(80,40,70,0.7)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(sway * 0.5 - 30, -192);
        g.quadraticCurveTo(sway * 0.5 - 37, -195, sway * 0.5 - 42, -201);
        g.stroke();
        g.beginPath();
        g.moveTo(sway * 0.5 + 30, -192);
        g.quadraticCurveTo(sway * 0.5 + 37, -195, sway * 0.5 + 42, -201);
        g.stroke();
        // 双臂张开（黑紫巨臂）
        g.strokeStyle = 'rgba(36,24,60,0.72)';
        g.lineWidth = 12;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-55, -100);
        g.quadraticCurveTo(-90, -60, -100 + sway, -20);
        g.stroke();
        g.beginPath();
        g.moveTo(55, -100);
        g.quadraticCurveTo(90, -60, 100 + sway, -20);
        g.stroke();
        // 巨手惨白手掌 + 尖锐利爪
        g.fillStyle = 'rgba(238,234,246,0.6)';
        for (let s = -1; s <= 1; s += 2) {
            g.beginPath();
            g.ellipse(s * 100 + sway, -18, 12, 9, s * 0.4, 0, Math.PI * 2);
            g.fill();
        }
        g.fillStyle = 'rgba(255,252,255,0.7)';
        for (let s = -1; s <= 1; s += 2) {
            for (let i = 0; i < 3; i++) {
                const bx = s * (95 + i * 6) + sway;
                g.beginPath();
                g.moveTo(bx, -22 + i * 4);
                g.lineTo(bx + s * 10, -32 + i * 3);
                g.lineTo(bx + s * 2, -16 + i * 4);
                g.closePath();
                g.fill();
            }
        }
        // 左手无名指金戒（巨大化后依然发光）
        g.strokeStyle = 'rgba(255,215,100,0.85)';
        g.lineWidth = 2.6;
        g.beginPath();
        g.arc(-100 + sway, -14, 5, 0, Math.PI * 2);
        g.stroke();
        // 心口咒力核（紫色巨核）
        gojoOrb(g, 0, -80, 30, 'rgba(184,154,255,0.4)', 'rgba(184,154,255,0)');
        g.strokeStyle = 'rgba(255,215,100,0.45)';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, -80, 12 + Math.sin(at * 0.12) * 2, 0, Math.PI * 2);
        g.stroke();
        // 咒力边缘辉光
        g.strokeStyle = 'rgba(184,154,255,0.25)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.ellipse(sway * 0.3, -100, 70, 135, 0, 0, Math.PI * 2);
        g.stroke();
    }

    g.restore();
}

/* 伏黑惠：影之咒力核（黑芯 + 暗紫晕，与白芯相反的吸光感） */
function shadowOrb(g, x, y, r, edge) {
    if (r <= 0.5) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, '#05030c');
    gr.addColorStop(0.5, '#241a4e');
    gr.addColorStop(1, edge || 'rgba(115,95,255,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
}

/* ---------------- 武器绘制 ---------------- */
function drawWeapon(g, c, handX, handY, rot, atkExt) {
    g.save();
    g.translate(handX, handY);
    g.rotate(rot);
    if (c.weapon === 'katana') {
        // 乙骨的咒具太刀：黑绳缠柄 + 圆铁护手 + 冷白刀身 + 里香紫咒力附刃
        const kbl = 68;
        // 挥动残影（紫咒力）
        if (atkExt > 0.15) {
            g.globalAlpha = atkExt * 0.5;
            g.strokeStyle = 'rgba(184,154,255,0.5)';
            g.lineWidth = 14;
            g.beginPath();
            g.arc(0, 0, kbl * 0.62, -1.4, 0.8);
            g.stroke();
            g.globalAlpha = 1;
        }
        // 刀身（冷白钢，微弧）
        const kGrad = g.createLinearGradient(0, 0, kbl, -6);
        kGrad.addColorStop(0, '#aeb8c8');
        kGrad.addColorStop(0.5, c.bladeColor || '#c8e8ff');
        kGrad.addColorStop(1, '#ffffff');
        g.strokeStyle = kGrad;
        g.lineWidth = 4.5;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(0, 0);
        g.quadraticCurveTo(kbl * 0.55, -6, kbl, -11);
        g.stroke();
        // 刃筋高光
        g.strokeStyle = 'rgba(255,255,255,0.75)';
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(6, -1.5);
        g.quadraticCurveTo(kbl * 0.55, -7, kbl - 3, -11);
        g.stroke();
        // 刃上里香紫咒力附着（微辉）
        g.strokeStyle = 'rgba(184,154,255,0.35)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(10, 1);
        g.quadraticCurveTo(kbl * 0.55, -4, kbl - 4, -9);
        g.stroke();
        // 圆铁护手
        g.fillStyle = '#2c3038';
        g.beginPath();
        g.ellipse(-1, 0, 2.6, 6.5, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(150,160,180,0.5)';
        g.lineWidth = 0.8;
        g.beginPath();
        g.ellipse(-1, 0, 2.6, 6.5, 0, 0, Math.PI * 2);
        g.stroke();
        // 黑绳缠柄
        g.strokeStyle = '#14181f';
        g.lineWidth = 5.5;
        g.lineCap = 'butt';
        g.beginPath();
        g.moveTo(-2, 0.5);
        g.lineTo(-17, 3);
        g.stroke();
        // 柄上菱纹缠绳
        g.strokeStyle = 'rgba(120,130,150,0.4)';
        g.lineWidth = 0.8;
        for (let ki = 0; ki < 4; ki++) {
            const khx = -4 - ki * 3.4;
            g.beginPath();
            g.moveTo(khx, -2);
            g.lineTo(khx - 2, 3.6);
            g.stroke();
            g.beginPath();
            g.moveTo(khx - 2, -2);
            g.lineTo(khx, 3.6);
            g.stroke();
        }
        // 柄头（金属缘）
        g.fillStyle = '#3a4048';
        g.beginPath();
        g.arc(-17.5, 3, 2, 0, Math.PI * 2);
        g.fill();
        g.restore();
        return;
    }
    if (c.weapon === 'umbrella') {
        // 七海建人的斑点折叠伞（手握伞柄，伞身向外延伸）
        if (atkExt > 0.15) {
            g.globalAlpha = atkExt * 0.45;
            g.strokeStyle = c.aura + '0.45)';
            g.lineWidth = 14;
            g.beginPath();
            g.arc(20, 0, 24, -1.4, 0.8);
            g.stroke();
            g.globalAlpha = 1;
        }
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
        return;
    }
    let blen = 58,
        guard = '#8a4a2a';
    if (c.weapon === 'sword') { blen = 72;
        guard = '#4a5a6a'; } else if (c.weapon === 'blade') { blen = 54;
        guard = '#6a4a2a'; }
    // 挥动轨迹
    if (atkExt > 0.15) {
        g.globalAlpha = atkExt * 0.45;
        g.strokeStyle = c.aura + '0.45)';
        g.lineWidth = 14;
        g.beginPath();
        g.arc(0, 0, blen * 0.65, -1.4, 0.8);
        g.stroke();
        g.globalAlpha = 1;
    }
    // 刀身
    const grad = g.createLinearGradient(0, 0, blen, -4);
    grad.addColorStop(0, '#c8ccd8');
    grad.addColorStop(1, '#ffffff');
    g.strokeStyle = grad;
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(blen, -4);
    g.stroke();
    // 刀刃高光
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(4, -2);
    g.lineTo(blen - 2, -5);
    g.stroke();
    // 刀柄
    g.strokeStyle = guard;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(-14, 2);
    g.stroke();
    // 护手
    g.strokeStyle = '#5a4a3a';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(-2, -6);
    g.lineTo(-2, 7);
    g.stroke();
    g.restore();
}

/* ---------------- 头部与发型（角色特征强化） ---------------- */
function drawHead(g, c, x, y, pose) {
    const id = c.id;
    g.save();
    g.translate(x, y);
    g.rotate(pose.headRot || 0);

    // 脸
    g.fillStyle = c.skin;
    g.beginPath();
    g.arc(0, 0, 20, 0, Math.PI * 2);
    g.fill();
    // 下巴微尖
    g.beginPath();
    g.moveTo(-12, 14);
    g.quadraticCurveTo(0, 20, 12, 14);
    g.lineTo(12, 10);
    g.lineTo(-12, 10);
    g.fill();

    // 发型（按角色）
    g.fillStyle = c.hair;
    if (id === 'gojo' || id === 'gojo2') {
        // 五条悟：蓬松双层白发 + 黑色眼罩（必杀时上推露出六眼）+ 后脑飘带；便装版无眼罩、湛蓝双眼常驻可见
        const at = pose.animT || 0;
        const ultP = pose.gojoUlt || 0;
        if (id === 'gojo') {
            // 后脑眼罩结带（随时间轻飘，画在头发下层）
            g.strokeStyle = c.blindfold || '#0a0e18';
            g.lineWidth = 5;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(-16, -4);
            g.quadraticCurveTo(-30, 2 + Math.sin(at * 0.08) * 3, -38, 12 + Math.sin(at * 0.08 + 1) * 4);
            g.stroke();
            g.lineWidth = 4;
            g.beginPath();
            g.moveTo(-17, -1);
            g.quadraticCurveTo(-28, 8 + Math.sin(at * 0.08 + 2) * 3, -34, 20 + Math.sin(at * 0.08 + 3) * 4);
            g.stroke();
        }
        // 内层发丝阴影
        g.fillStyle = '#cfe0ee';
        g.beginPath();
        g.arc(0, -8, 20, Math.PI, 0);
        g.fill();
        // 白发圆顶基底：贴颅盖住头顶，发际线压到眉上/眼罩顶（修复头发悬浮错位）
        g.fillStyle = c.hair;
        g.beginPath();
        g.arc(0, -8, 20.3, Math.PI, 0);
        g.fill();
        // 外层蓬松刺发：12束长短交错放射，根部埋进圆顶，带微颤动
        const N = 12;
        g.beginPath();
        for (let i = 0; i <= N; i++) {
            const a = -Math.PI + i * Math.PI / N;
            const wob = Math.sin(at * 0.06 + i * 1.7) * 1.5;
            const off = (i % 2 === 0) ? 15 + wob : 5;
            const hx = Math.cos(a) * 20,
                hy = Math.sin(a) * 20 - off - 3;
            if (i === 0) g.moveTo(hx, hy);
            else g.lineTo(hx, hy);
        }
        g.closePath();
        g.fill();
        // 前额垂发两缕
        g.beginPath();
        g.moveTo(-12, -16);
        g.quadraticCurveTo(-8, -30, 0, -15);
        g.lineTo(-4, -13);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(4, -15);
        g.quadraticCurveTo(10, -30, 15, -14);
        g.lineTo(9, -12);
        g.closePath();
        g.fill();
        // 眼罩：必杀时上推至额头，露出六眼（便装版无眼罩）
        const bfY = -8 - ultP * 15;
        if (id === 'gojo2') {
            // 便装：湛蓝双眼常驻可见
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.ellipse(-7, 2, 5, 3.4, 0, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.ellipse(8, 2, 5, 3.4, 0, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = c.eyeColor || '#35c4ff';
            g.beginPath();
            g.arc(-7, 2, 2.4, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(8, 2, 2.4, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.arc(-6.2, 1.2, 0.9, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(8.8, 1.2, 0.9, 0, Math.PI * 2);
            g.fill();
            // 上睫毛线 + 眉毛
            g.strokeStyle = '#2a3140';
            g.lineWidth = 1.6;
            g.lineCap = 'round';
            g.beginPath();
            g.moveTo(-11.5, -0.6);
            g.quadraticCurveTo(-7, -3, -2.5, -0.6);
            g.stroke();
            g.beginPath();
            g.moveTo(3.5, -0.6);
            g.quadraticCurveTo(8, -3, 12.5, -0.6);
            g.stroke();
            g.lineWidth = 1.3;
            g.beginPath();
            g.moveTo(-11, -7);
            g.quadraticCurveTo(-7, -8.6, -3, -7.4);
            g.stroke();
            g.beginPath();
            g.moveTo(4, -7.4);
            g.quadraticCurveTo(8, -8.6, 12, -7);
            g.stroke();
            // 自信微笑（嘴角上扬的浅笑）
            g.strokeStyle = '#8a5a48';
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(-4.5, 11.5);
            g.quadraticCurveTo(1, 14.8, 7, 10.8);
            g.stroke();
            g.lineCap = 'butt';
            // 咒力充盈/领域时六眼辉光
            if (pose.gojoGlow || ultP > 0.3) {
                g.globalAlpha = 0.35 + (ultP > 0.3 ? 0.35 : Math.max(0, Math.sin(at * 0.2)) * 0.12);
                g.fillStyle = c.eyeColor || '#35c4ff';
                g.beginPath();
                g.arc(-7, 2, 5.5, 0, Math.PI * 2);
                g.fill();
                g.beginPath();
                g.arc(8, 2, 5.5, 0, Math.PI * 2);
                g.fill();
                g.globalAlpha = 1;
            }
        }
        if (id === 'gojo' && (ultP > 0.3 || pose.gojoGlow)) {
            // 六眼：蓝宝石般发光双瞳
            const ea = ultP > 0.3 ? Math.min(1, (ultP - 0.3) / 0.4) : 0.55;
            g.globalAlpha = ea * 0.5;
            g.fillStyle = c.eyeColor || '#35c4ff';
            g.beginPath();
            g.arc(-7, 2, 6, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(8, 2, 6, 0, Math.PI * 2);
            g.fill();
            g.globalAlpha = ea;
            g.beginPath();
            g.arc(-7, 2, 3, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(8, 2, 3, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#ffffff';
            g.beginPath();
            g.arc(-6, 1, 1.1, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(9, 1, 1.1, 0, Math.PI * 2);
            g.fill();
            g.globalAlpha = 1;
        }
        if (id === 'gojo' && ultP < 0.85) {
            g.globalAlpha = ultP > 0.3 ? 1 - (ultP - 0.3) / 0.55 : 1;
            g.fillStyle = c.blindfold || '#0a0e18';
            g.fillRect(-21, bfY, 42, 13);
            g.fillStyle = 'rgba(255,255,255,0.10)';
            g.fillRect(-21, bfY, 42, 3); // 缎面高光
            g.fillStyle = c.color;
            g.fillRect(-21, bfY, 42, 1.6);
            // 蓄满咒力时眼罩下渗出蓝辉
            if (pose.gojoGlow && ultP <= 0.3) {
                g.globalAlpha = 0.35 + Math.sin(at * 0.2) * 0.15;
                g.fillStyle = c.eyeColor || '#35c4ff';
                g.fillRect(-19, bfY + 11, 38, 2.5);
            }
            g.globalAlpha = 1;
        }
    } else if (id === 'megumi' || id === 'megumi2') {
        // 伏黑惠：双层黑刺发（内层蓝灰阴影 + 外层长短交错乱刺），前后期同款（参考立绘）
        const at = pose.animT || 0;
        // 内层发丝阴影
        g.fillStyle = c.hairShade || '#2a3244';
        g.beginPath();
        g.arc(0, -8, 20, Math.PI, 0);
        g.fill();
        // 外层黑发圆顶基底（盖住头顶并压到发际线，与脸部贴合）
        g.fillStyle = c.hair;
        g.beginPath();
        g.arc(0, -4, 19.8, Math.PI, 0);
        g.fill();
        g.fillRect(-19.8, -8, 39.6, 5.5);
        // 外层黑刺发：向后侧倾斜的长短交错尖刺，带微颤动
        const N = 12;
        g.beginPath();
        for (let i = 0; i <= N; i++) {
            const a = -Math.PI + i * Math.PI / N;
            const wob = Math.sin(at * 0.05 + i * 1.9) * 1.4;
            const off = (i % 2 === 0) ? 20 + wob : 8;
            // 后脑（i 小）刺更长，前额（i 大）稍短，形成后扬乱发
            const back = (1 - i / N) * 5;
            const hx = Math.cos(a) * 21 - back * 0.6,
                hy = Math.sin(a) * 21 - off - back;
            if (i === 0) g.moveTo(hx, hy);
            else g.lineTo(hx, hy);
        }
        g.closePath();
        g.fill();
        // 后脑下探发尾
        g.beginPath();
        g.moveTo(-20, -4);
        g.lineTo(-27, 6);
        g.lineTo(-17, 4);
        g.closePath();
        g.fill();
        // 前额斜刘海（短款，不遮眼，前后期一致）
        g.beginPath();
        g.moveTo(-2, -16);
        g.quadraticCurveTo(8, -24, 14, -12);
        g.lineTo(10, -4);
        g.lineTo(4, -8);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(-14, -14);
        g.quadraticCurveTo(-10, -24, -2, -14);
        g.lineTo(-6, -6);
        g.lineTo(-11, -8);
        g.closePath();
        g.fill();
        // 影之咒力：蓄满/领域时眼周透出暗紫影光
        const shGlow = pose.megGlow || (pose.megUlt2 || 0) > 0.3 || (pose.megUlt || 0) > 0.3;
        if (shGlow) {
            g.globalAlpha = 0.30 + Math.sin(at * 0.18) * 0.12;
            g.fillStyle = c.accent || '#8f7bff';
            g.beginPath();
            g.arc(-7, 2, 5.5, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(8, 2, 5.5, 0, Math.PI * 2);
            g.fill();
            g.globalAlpha = 1;
        }
        // 自绘双瞳（深青色冷瞳，双眼可见，前后期一致）
        g.fillStyle = c.eyeColor || '#2a4a6e';
        g.beginPath();
        g.arc(-7, 2, 2.8, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, 2, 2.8, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(-6, 1, 0.9, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(9, 1, 0.9, 0, Math.PI * 2);
        g.fill();
        // 冷峻垂目眼线
        g.strokeStyle = 'rgba(20,26,40,0.75)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-11, -2);
        g.lineTo(-3, -2);
        g.stroke();
        g.beginPath();
        g.moveTo(4, -2);
        g.lineTo(12, -2);
        g.stroke();
    } else if (id === 'yuji' || id === 'yuji2') {
        // 虎杖：两侧剃短深色底层 + 顶部粉色乱刺（长短交错）+ 额前碎刺
        const at2 = pose.animT || 0;
        const hs2 = c.hairShade || '#4a343c';
        // 底层：剃短深色底壳（仅在粉发外缘露出一圈，不压到额头）
        g.fillStyle = hs2;
        g.beginPath();
        g.arc(0, -8, 20.4, Math.PI, 0);
        g.fill();
        // 顶层：粉发圆顶基底（盖住头顶，发际线留出额头与眉毛）
        g.fillStyle = c.hair;
        g.beginPath();
        g.arc(0, -6, 19.8, Math.PI, 0);
        g.fill();
        g.fillRect(-19.8, -10, 39.6, 3.5);
        // 粉色乱刺（不规则长短 + 微颤；后期发型更长更野）
        const NY = 11;
        const spikeH = (id === 'yuji2') ? 18 : 14;
        g.beginPath();
        for (let i = 0; i <= NY; i++) {
            const a = -Math.PI + i * Math.PI / NY;
            const wob = Math.sin(at2 * 0.05 + i * 1.9) * 1.2;
            const off = (i % 2 === 0) ? spikeH + wob : 4.5;
            const hx = Math.cos(a) * 19.5,
                hy = Math.sin(a) * 19.5 - off - 4;
            if (i === 0) g.moveTo(hx, hy);
            else g.lineTo(hx, hy);
        }
        g.closePath();
        g.fill();
        // 额前碎刺（三束小尖自发际线压向额头，形成锯齿）
        g.beginPath();
        g.moveTo(-13, -7);
        g.lineTo(-10, -1);
        g.lineTo(-6, -7);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(-4, -7);
        g.lineTo(-1, 0);
        g.lineTo(3, -7);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(6, -7);
        g.lineTo(9, -1);
        g.lineTo(13, -7);
        g.closePath();
        g.fill();
        // 发丝阴影线（粉发内的深纹理）
        g.strokeStyle = 'rgba(160,100,110,0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-9, -24);
        g.quadraticCurveTo(-7, -16, -8, -10);
        g.stroke();
        g.beginPath();
        g.moveTo(2, -26);
        g.quadraticCurveTo(4, -18, 3, -11);
        g.stroke();
        g.beginPath();
        g.moveTo(12, -22);
        g.quadraticCurveTo(14, -15, 13, -9);
        g.stroke();
        if (id === 'yuji2') { // 新宿决战：长刘海垂落额前 + 眼角血迹
            g.fillStyle = c.hair;
            g.beginPath();
            g.moveTo(-9, -8);
            g.lineTo(-6, 0);
            g.lineTo(-2, -8);
            g.closePath();
            g.fill();
            g.beginPath();
            g.moveTo(1, -8);
            g.lineTo(5, -1);
            g.lineTo(9, -8);
            g.closePath();
            g.fill();
            g.beginPath();
            g.moveTo(-18, -7);
            g.lineTo(-16, 2);
            g.lineTo(-12, -7);
            g.closePath();
            g.fill();
            g.fillStyle = 'rgba(200,40,40,0.55)';
            g.beginPath();
            g.arc(-10, 5, 4, 0, Math.PI * 2);
            g.fill();
            g.fillRect(-10, 5, 2, 10);
        }
    } else if (id === 'sukunaMegumi') {
        const at = pose.animT || 0;
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-22, 0);
        g.lineTo(-25, -12);
        g.lineTo(-17, -11);
        g.lineTo(-18, -23);
        g.lineTo(-10, -19);
        g.lineTo(-6, -32);
        g.lineTo(0, -22);
        g.lineTo(8, -34);
        g.lineTo(10, -20);
        g.lineTo(21, -27);
        g.lineTo(18, -13);
        g.lineTo(27, -11);
        g.lineTo(21, 1);
        g.quadraticCurveTo(0, -7, -22, 0);
        g.closePath();
        g.fill();
        g.strokeStyle = c.hairShade;
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-13, -20); g.lineTo(-8, -9); g.stroke();
        g.beginPath(); g.moveTo(2, -26); g.lineTo(1, -10); g.stroke();
        g.beginPath(); g.moveTo(14, -20); g.lineTo(9, -8); g.stroke();
        const glow = 0.24 + Math.sin(at * 0.12) * 0.08;
        g.fillStyle = `rgba(230,51,79,${glow})`;
        g.beginPath(); g.arc(-7, 5, 6, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(8, 5, 6, 0, Math.PI * 2); g.fill();
        g.fillStyle = c.eyeColor;
        g.beginPath(); g.arc(-7, 5, 3, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(8, 5, 3, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#140006';
        g.fillRect(-7.8, 2.5, 1.6, 5);
        g.fillRect(7.2, 2.5, 1.6, 5);
        g.strokeStyle = c.markings;
        g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(-15, 13); g.lineTo(-4, 16); g.stroke();
        g.beginPath(); g.moveTo(15, 13); g.lineTo(4, 16); g.stroke();
        g.beginPath(); g.moveTo(-11, -5); g.lineTo(-3, -4); g.stroke();
        g.beginPath(); g.moveTo(3, -4); g.lineTo(11, -5); g.stroke();
    } else if (id === 'sukuna') {
        // 宿傩：双层怒立粉发 + 鬓角利刺 + 四目纹身（必杀时第二对赤瞳睁开）
        const at = pose.animT || 0;
        const ultP = pose.sukunaUlt || 0;
        // 内层发丝阴影
        g.fillStyle = c.hairShade || '#d19aa4';
        g.beginPath();
        g.arc(0, -8, 20, Math.PI, 0);
        g.fill();
        // 外层怒立短刺：长短交错放射，带微颤动
        g.fillStyle = c.hair;
        const N = 12;
        g.beginPath();
        for (let i = 0; i <= N; i++) {
            const a = -Math.PI + i * Math.PI / N;
            const wob = Math.sin(at * 0.05 + i * 2.1) * 1.2;
            const off = (i % 2 === 0) ? 17 + wob : 6;
            const hx = Math.cos(a) * 21,
                hy = Math.sin(a) * 21 - off - 2;
            if (i === 0) g.moveTo(hx, hy);
            else g.lineTo(hx, hy);
        }
        g.closePath();
        g.fill();
        // 鬓角利刺（两侧下探）
        g.beginPath();
        g.moveTo(-20, -4);
        g.lineTo(-27, 5);
        g.lineTo(-18, 4);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(20, -4);
        g.lineTo(27, 5);
        g.lineTo(18, 4);
        g.closePath();
        g.fill();
        // 主瞳：赤红竖瞳（蓄满咒力/必杀时外溢红晕）
        const glow = pose.sukunaGlow || ultP > 0.3;
        if (glow) {
            g.globalAlpha = ultP > 0.3 ? 0.55 : 0.35 + Math.sin(at * 0.2) * 0.15;
            g.fillStyle = c.eyeColor || '#ff2438';
            g.beginPath();
            g.arc(-7, 2, 5.5, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(8, 2, 5.5, 0, Math.PI * 2);
            g.fill();
            g.globalAlpha = 1;
        }
        g.fillStyle = c.eyeColor || '#ff2438';
        g.beginPath();
        g.arc(-7, 2, 2.9, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, 2, 2.9, 0, Math.PI * 2);
        g.fill();
        // 竖瞳
        g.fillStyle = '#1a0004';
        g.fillRect(-7.8, -0.4, 1.6, 5);
        g.fillRect(7.2, -0.4, 1.6, 5);
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(-6, 0.8, 0.9, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(9, 0.8, 0.9, 0, Math.PI * 2);
        g.fill();
        // 第二对眼：平时为闭合纹线，领域展开时睁开赤瞳
        const e2 = ultP > 0.3 ? Math.min(1, (ultP - 0.3) / 0.4) : 0;
        if (e2 > 0.05) {
            g.globalAlpha = e2;
            g.fillStyle = c.eyeColor || '#ff2438';
            g.beginPath();
            g.arc(-7, 9, 2.2, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(8, 9, 2.2, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#fff';
            g.beginPath();
            g.arc(-6.2, 8.4, 0.7, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(8.8, 8.4, 0.7, 0, Math.PI * 2);
            g.fill();
            g.globalAlpha = 1;
        } else {
            g.strokeStyle = c.markings || '#4a0812';
            g.lineWidth = 1.6;
            g.beginPath();
            g.moveTo(-11, 9);
            g.lineTo(-3, 9);
            g.stroke();
            g.beginPath();
            g.moveTo(3, 9);
            g.lineTo(11, 9);
            g.stroke();
        }
        // 面部纹身：颊线 + 颌线 + 眉上双纹
        g.strokeStyle = c.markings || '#4a0812';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-15, 13);
        g.quadraticCurveTo(-8, 15.5, -3, 14);
        g.stroke();
        g.beginPath();
        g.moveTo(15, 13);
        g.quadraticCurveTo(8, 15.5, 3, 14);
        g.stroke();
        g.beginPath();
        g.moveTo(0, 14);
        g.lineTo(0, 19);
        g.stroke();
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-11, -7);
        g.lineTo(-3, -7);
        g.stroke();
        g.beginPath();
        g.moveTo(3, -7);
        g.lineTo(11, -7);
        g.stroke();
    } else if (id === 'okkotsu') {
        // 乙骨：凌乱蓬松黑发，发梢不规则翘起，长刘海压眉，鬓发垂颈，蓝黑冷调光泽
        // 头顶蓬乱轮廓（锅盖式蓬松 + 顶部碎发翘起）
        g.beginPath();
        g.moveTo(-22, 0);
        g.quadraticCurveTo(-26, -14, -20, -25);
        g.lineTo(-16, -21);
        g.lineTo(-14, -30);
        g.quadraticCurveTo(-9, -35, -4, -32);
        g.lineTo(-2, -38);
        g.lineTo(3, -32);
        g.quadraticCurveTo(8, -36, 12, -31);
        g.lineTo(15, -35);
        g.lineTo(16, -26);
        g.quadraticCurveTo(24, -18, 22, -2);
        g.lineTo(20, 2);
        g.quadraticCurveTo(10, -8, 0, -7);
        g.quadraticCurveTo(-10, -8, -20, 3);
        g.closePath();
        g.fill();
        // 左鬓发（垂至颈侧，内勾）
        g.beginPath();
        g.moveTo(-21, -6);
        g.quadraticCurveTo(-25, 4, -23, 14);
        g.quadraticCurveTo(-22, 21, -18, 26);
        g.quadraticCurveTo(-17, 18, -18, 9);
        g.quadraticCurveTo(-18, 0, -16, -6);
        g.closePath();
        g.fill();
        // 右鬓发（稍短，外翘发梢）
        g.beginPath();
        g.moveTo(21, -6);
        g.quadraticCurveTo(25, 2, 23, 11);
        g.quadraticCurveTo(22, 18, 20, 22);
        g.lineTo(24, 20);
        g.lineTo(19, 25);
        g.quadraticCurveTo(17, 16, 17, 7);
        g.quadraticCurveTo(17, 0, 16, -6);
        g.closePath();
        g.fill();
        // 蓬乱长刘海（三组不规则发绺压至眉际）
        g.beginPath();
        g.moveTo(-15, -18);
        g.quadraticCurveTo(-13, -8, -16, -1);
        g.quadraticCurveTo(-13, -4, -10, -10);
        g.quadraticCurveTo(-8, -3, -10, 3);
        g.quadraticCurveTo(-6, -2, -5, -12);
        g.lineTo(-8, -19);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(-4, -20);
        g.quadraticCurveTo(-2, -10, -4, -3);
        g.quadraticCurveTo(-1, -7, 1, -13);
        g.quadraticCurveTo(3, -6, 2, 0);
        g.quadraticCurveTo(5, -6, 5, -14);
        g.lineTo(2, -20);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(7, -19);
        g.quadraticCurveTo(9, -10, 7, -3);
        g.quadraticCurveTo(11, -7, 12, -12);
        g.quadraticCurveTo(14, -6, 13, -1);
        g.quadraticCurveTo(16, -7, 15, -15);
        g.lineTo(11, -19);
        g.closePath();
        g.fill();
        // 发丝高光（蓝黑冷调光泽）
        g.strokeStyle = c.hairShade || '#3a4468';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-12, -27);
        g.quadraticCurveTo(-8, -18, -10, -10);
        g.stroke();
        g.beginPath();
        g.moveTo(6, -29);
        g.quadraticCurveTo(10, -20, 8, -11);
        g.stroke();
        g.beginPath();
        g.moveTo(-2, -31);
        g.quadraticCurveTo(0, -21, -2, -13);
        g.stroke();
        g.beginPath();
        g.moveTo(18, -20);
        g.quadraticCurveTo(21, -12, 20, -4);
        g.stroke();
    } else if (id === 'mahito') {
        if (pose.mahitoTransformed) {
        // 遍杀即灵体：灰白肌质怪物头（覆盖人形脸），五官在此自绘
        const tc = c.transformedColor || '#b8c2d2';
        g.fillStyle = tc;
        g.beginPath();
        g.arc(0, 0, 20.5, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(-13, 13);
        g.quadraticCurveTo(0, 21, 13, 13);
        g.lineTo(13, 8);
        g.lineTo(-13, 8);
        g.fill();
        // 后掠尖刺鬃毛：从颅顶向后放射
        g.fillStyle = '#9aa8ba';
        const mane = [
            [14, -13, 4, -38, 6, -18],
            [7, -17, -8, -36, -1, -19],
            [-1, -19, -20, -30, -8, -17],
            [-8, -17, -30, -20, -13, -12],
            [-13, -12, -35, -8, -16, -6],
            [-16, -6, -36, 4, -18, 1]
        ];
        for (const [r1x, r1y, tx, ty, r2x, r2y] of mane) {
            g.beginPath();
            g.moveTo(r1x, r1y);
            g.lineTo(tx, ty);
            g.lineTo(r2x, r2y);
            g.closePath();
            g.fill();
        }
        // 鬃毛根部阴影
        g.fillStyle = 'rgba(60,74,96,0.35)';
        g.beginPath();
        g.arc(-4, -14, 13, Math.PI * 0.85, Math.PI * 1.75);
        g.quadraticCurveTo(-4, -10, 8, -16);
        g.closePath();
        g.fill();
        // 无眼：遍杀即灵体面部光滑无眼，仅留浅浅的额面阴影暗示眼窝位置
        g.fillStyle = 'rgba(60,74,96,0.18)';
        g.beginPath();
        g.ellipse(1, -6, 12, 4.5, 0, 0, Math.PI * 2);
        g.fill();
        // 宽幅獠牙齿列：暗色口腔带 + 上下交错白牙
        g.fillStyle = '#1c2230';
        g.beginPath();
        g.moveTo(-13, 5);
        g.quadraticCurveTo(0, 3, 14, 5);
        g.lineTo(13, 12);
        g.quadraticCurveTo(0, 15.5, -12, 12);
        g.closePath();
        g.fill();
        g.fillStyle = '#eef2f6';
        for (let i = 0; i < 6; i++) {
            const tx0 = -11.5 + i * 4.4;
            g.beginPath();
            g.moveTo(tx0, 5.4);
            g.lineTo(tx0 + 1.7, 10.6);
            g.lineTo(tx0 + 3.4, 5.4);
            g.closePath();
            g.fill();
        }
        for (let i = 0; i < 5; i++) {
            const tx0 = -9.3 + i * 4.4;
            g.beginPath();
            g.moveTo(tx0, 12.4);
            g.lineTo(tx0 + 1.7, 8.2);
            g.lineTo(tx0 + 3.4, 12.4);
            g.closePath();
            g.fill();
        }
        // 面部纵向棱线（肌质分节感）
        g.strokeStyle = 'rgba(40,50,70,0.45)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-2, -18);
        g.quadraticCurveTo(0, -11, -1, -1);
        g.stroke();
        g.beginPath();
        g.moveTo(-14, -12);
        g.quadraticCurveTo(-12, -6, -13, 1);
        g.stroke();
        g.beginPath();
        g.moveTo(12, -13);
        g.quadraticCurveTo(14, -7, 13, 0);
        g.stroke();
        } else {
        // 真人：蓝灰中长发，梳成三股，右侧一股搭在肩前，缝合线
        // 头顶轮廓
        g.beginPath();
        g.moveTo(-20, -4);
        g.quadraticCurveTo(-22, -16, -16, -24);
        g.quadraticCurveTo(-8, -30, 0, -29);
        g.quadraticCurveTo(8, -30, 16, -24);
        g.quadraticCurveTo(22, -16, 20, -4);
        g.lineTo(-20, -4);
        g.closePath();
        g.fill();
        // 左侧发股（向后垂）
        g.beginPath();
        g.moveTo(-18, -8);
        g.quadraticCurveTo(-22, 4, -20, 16);
        g.quadraticCurveTo(-19, 22, -16, 26);
        g.quadraticCurveTo(-14, 18, -15, 8);
        g.quadraticCurveTo(-15, 0, -14, -6);
        g.closePath();
        g.fill();
        // 中间发股（向后）
        g.beginPath();
        g.moveTo(-6, -6);
        g.quadraticCurveTo(-4, 6, -5, 18);
        g.quadraticCurveTo(-4, 24, -2, 28);
        g.quadraticCurveTo(0, 20, -1, 10);
        g.quadraticCurveTo(-1, 2, -2, -4);
        g.closePath();
        g.fill();
        // 右侧发股（搭在肩前，较长）
        g.beginPath();
        g.moveTo(16, -8);
        g.quadraticCurveTo(22, 2, 21, 14);
        g.quadraticCurveTo(20, 24, 18, 32);
        g.quadraticCurveTo(16, 36, 14, 38);
        g.quadraticCurveTo(13, 28, 14, 18);
        g.quadraticCurveTo(14, 6, 13, -4);
        g.closePath();
        g.fill();
        // 发丝纹理（蓝灰调）
        g.strokeStyle = c.hairShade || '#4a7a9f';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-8, -24);
        g.quadraticCurveTo(-6, -14, -7, -6);
        g.stroke();
        g.beginPath();
        g.moveTo(6, -25);
        g.quadraticCurveTo(8, -14, 7, -6);
        g.stroke();
        // 面部缝合线（标志性特征：左面颊斜线 + 下颌横线，避开眼部）
        g.strokeStyle = c.stitchColor || '#3a3a4a';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-17, 0);
        g.lineTo(-10, 10);
        g.stroke();
        g.beginPath();
        g.moveTo(-11, 10);
        g.lineTo(11, 7.5);
        g.stroke();
        // 缝合线交叉针脚
        g.lineWidth = 0.8;
        for (let i = 0; i < 3; i++) {
            const sx = -15.5 + i * 2.5, sy = 2.5 + i * 3;
            g.beginPath();
            g.moveTo(sx - 2, sy + 1.3);
            g.lineTo(sx + 2, sy - 1.3);
            g.stroke();
        }
        // 右侧发股扎带（参考图：肩前发股中段束带）
        g.strokeStyle = '#3a3a46';
        g.lineWidth = 2.6;
        g.beginPath();
        g.moveTo(12.5, 22);
        g.lineTo(20, 19.5);
        g.stroke();
        }
    } else if (id === 'nanami') {
        // 七海：金色短发侧分，整洁利落 + 方形眼镜
        g.beginPath();
        g.moveTo(-20, -4);
        g.quadraticCurveTo(-22, -14, -16, -22);
        g.quadraticCurveTo(-8, -28, 0, -27);
        g.quadraticCurveTo(8, -28, 16, -22);
        g.quadraticCurveTo(22, -14, 20, -4);
        g.lineTo(-20, -4);
        g.closePath();
        g.fill();
        // 侧分刘海（向左斜分）
        g.beginPath();
        g.moveTo(-12, -16);
        g.quadraticCurveTo(-14, -8, -16, -2);
        g.quadraticCurveTo(-13, -5, -10, -10);
        g.quadraticCurveTo(-7, -6, -8, -1);
        g.quadraticCurveTo(-5, -7, -4, -12);
        g.lineTo(-6, -16);
        g.closePath();
        g.fill();
        // 发丝纹理
        g.strokeStyle = c.hairShade || '#a08040';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-5, -24);
        g.quadraticCurveTo(-3, -16, -4, -8);
        g.stroke();
        g.beginPath();
        g.moveTo(5, -25);
        g.quadraticCurveTo(7, -16, 6, -8);
        g.stroke();
        // 圆形眼镜（细深色框 + 绿色镜片，与选人界面一致）
        g.fillStyle = c.glassesLens || 'rgba(90,138,90,0.2)';
        g.beginPath(); g.arc(-7, 2, 5.5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(8, 2, 5.5, 0, Math.PI * 2); g.fill();
        g.strokeStyle = c.glassesColor || '#2a2a2a';
        g.lineWidth = 1.2;
        g.beginPath(); g.arc(-7, 2, 5.5, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(8, 2, 5.5, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(-1.5, 2); g.lineTo(2.5, 2); g.stroke();
    } else if (id === 'kenjaku') {
        // 羂索（夏油杰的肉体）：黑发高髻 + 脑后垂发 + 侧垂长发 + 额头缝合疤 + 金环耳饰
        const kat = pose.animT || 0;
        // 脑后垂发（底层，随时间轻摆）
        g.fillStyle = c.hairShade || '#2e2440';
        g.beginPath();
        g.moveTo(-16, -12);
        g.quadraticCurveTo(-24, 6, -21 + Math.sin(kat * 0.05) * 1.5, 26);
        g.quadraticCurveTo(-18, 34, -14, 38);
        g.quadraticCurveTo(-13, 24, -14, 10);
        g.quadraticCurveTo(-15, -2, -14, -10);
        g.closePath();
        g.fill();
        // 头顶轮廓（黑发覆盖头骨）
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-20, -3);
        g.quadraticCurveTo(-23, -16, -15, -25);
        g.quadraticCurveTo(-7, -31, 0, -30);
        g.quadraticCurveTo(8, -31, 16, -24);
        g.quadraticCurveTo(23, -15, 20, -3);
        g.lineTo(-20, -3);
        g.closePath();
        g.fill();
        // 头顶高髻（束于头顶偏后的丸髻）
        g.beginPath();
        g.ellipse(-2, -34, 9, 7, -0.2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(-3, -40, 5.5, 4.5, -0.3, 0, Math.PI * 2);
        g.fill();
        // 发髻束绳
        g.strokeStyle = '#4a3a5e';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-9, -31);
        g.quadraticCurveTo(-2, -28, 6, -31);
        g.stroke();
        // 中分前发（左右两撇压额）
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-1, -28);
        g.quadraticCurveTo(-12, -24, -17, -12);
        g.quadraticCurveTo(-12, -16, -6, -18);
        g.quadraticCurveTo(-3, -22, -1, -28);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(1, -28);
        g.quadraticCurveTo(12, -24, 17, -12);
        g.quadraticCurveTo(12, -16, 6, -18);
        g.quadraticCurveTo(3, -22, 1, -28);
        g.closePath();
        g.fill();
        // 两侧垂发（垂至下颌，微摆）
        const ksway = Math.sin(kat * 0.045) * 1.2;
        g.beginPath();
        g.moveTo(-19, -8);
        g.quadraticCurveTo(-23, 6, -21 + ksway, 20);
        g.quadraticCurveTo(-20 + ksway, 26, -17 + ksway, 30);
        g.quadraticCurveTo(-16, 18, -16.5, 6);
        g.quadraticCurveTo(-17, -2, -16, -8);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(19, -8);
        g.quadraticCurveTo(23, 6, 21 - ksway, 20);
        g.quadraticCurveTo(20 - ksway, 26, 17 - ksway, 30);
        g.quadraticCurveTo(16, 18, 16.5, 6);
        g.quadraticCurveTo(17, -2, 16, -8);
        g.closePath();
        g.fill();
        // 发丝高光（暗紫冷调）
        g.strokeStyle = c.hairShade || '#2e2440';
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(-8, -27);
        g.quadraticCurveTo(-5, -20, -7, -14);
        g.stroke();
        g.beginPath();
        g.moveTo(7, -27);
        g.quadraticCurveTo(9, -20, 7, -14);
        g.stroke();
        g.beginPath();
        g.moveTo(-3, -37);
        g.quadraticCurveTo(1, -34, 3, -31);
        g.stroke();
        // 额头缝合疤淡影
        g.strokeStyle = 'rgba(122,90,74,0.30)';
        g.lineWidth = 3.4;
        g.beginPath();
        g.moveTo(-14, -13);
        g.quadraticCurveTo(0, -15, 14, -13);
        g.stroke();
        // 额头缝合疤（横贯额头 + 骑缝钉）
        g.strokeStyle = c.stitch || '#7a5a4a';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-15, -13);
        g.quadraticCurveTo(0, -15, 15, -13);
        g.stroke();
        g.lineWidth = 1.1;
        for (let i = -3; i <= 3; i++) {
            g.beginPath();
            g.moveTo(i * 4.4, -17);
            g.lineTo(i * 4.4, -10);
            g.stroke();
        }
        // 金环耳饰（双耳）
        g.strokeStyle = '#e8c86a';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(20, 8, 3.4, -0.4, Math.PI + 0.8);
        g.stroke();
        g.beginPath();
        g.arc(-20, 8, 3, Math.PI - 0.8, Math.PI * 2 + 0.4);
        g.stroke();
    } else if (id === 'hanami') {
        // 面具咒灵：上半脸面具覆盖 + 双弯角 + 暴露嘴部獠牙 + 眼下黑色纹路（与选人界面一致）
        const skin = c.skin || '#c8c8c0';
        // 下半脸（皮肤外露）
        g.fillStyle = skin;
        g.beginPath();
        g.arc(0, 0, 20, Math.PI * 0.15, Math.PI * 0.85, true);
        g.lineTo(-14, 8);
        g.quadraticCurveTo(0, 14, 14, 8);
        g.closePath();
        g.fill();
        // 上半脸面具（米色覆盖额头到眼线区域）
        g.fillStyle = c.branch || '#e8e4d8';
        g.beginPath();
        g.arc(0, 0, 20, Math.PI, 0);
        g.lineTo(16, 6);
        g.quadraticCurveTo(0, 12, -16, 6);
        g.closePath();
        g.fill();
        // 面具边缘缝合线
        g.strokeStyle = c.grain || '#2a2a26';
        g.lineWidth = 1.2;
        for (let i = -14; i <= 14; i += 4) {
            g.beginPath();
            g.moveTo(i, 6); g.lineTo(i + 2, 8);
            g.stroke();
        }
        // 双弯角
        g.strokeStyle = c.hair || '#3a3a36';
        g.lineWidth = 4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-8, -14);
        g.quadraticCurveTo(-16, -24, -14, -36);
        g.quadraticCurveTo(-12, -42, -8, -40);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -14);
        g.quadraticCurveTo(16, -24, 14, -36);
        g.quadraticCurveTo(12, -42, 8, -40);
        g.stroke();
        g.lineCap = 'butt';
        // 角纹路
        g.strokeStyle = c.hairShade || '#5a5a54';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-12, -22); g.lineTo(-10, -30); g.stroke();
        g.beginPath(); g.moveTo(12, -22); g.lineTo(10, -30); g.stroke();
        // 暴露嘴部：大裂口 + 獠牙
        g.fillStyle = '#3a1a18';
        g.beginPath();
        g.moveTo(-10, 8);
        g.quadraticCurveTo(-12, 16, -6, 18);
        g.quadraticCurveTo(0, 20, 6, 18);
        g.quadraticCurveTo(12, 16, 10, 8);
        g.closePath();
        g.fill();
        // 上颚獠牙
        g.fillStyle = '#e8e4d0';
        g.beginPath();
        g.moveTo(-9, 8); g.lineTo(-7, 14); g.lineTo(-5, 8);
        g.lineTo(-3, 14); g.lineTo(-1, 8); g.lineTo(1, 14);
        g.lineTo(3, 8); g.lineTo(5, 14); g.lineTo(7, 8);
        g.lineTo(9, 14);
        g.closePath();
        g.fill();
        // 下颚獠牙
        g.beginPath();
        g.moveTo(-7, 18); g.lineTo(-5, 16); g.lineTo(-3, 18);
        g.lineTo(-1, 16); g.lineTo(1, 18); g.lineTo(3, 16);
        g.lineTo(5, 18); g.lineTo(7, 16);
        g.closePath();
        g.fill();
        // 眼下黑色纹路
        g.strokeStyle = c.grain || '#2a2a26';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-10, 8); g.quadraticCurveTo(-14, 14, -16, 20);
        g.stroke();
        g.beginPath();
        g.moveTo(-11, 10); g.lineTo(-15, 12);
        g.stroke();
        g.beginPath();
        g.moveTo(10, 8); g.quadraticCurveTo(14, 14, 16, 20);
        g.stroke();
        g.beginPath();
        g.moveTo(11, 10); g.lineTo(15, 12);
        g.stroke();
        // 面具高光
        g.fillStyle = 'rgba(255,255,255,0.1)';
        g.beginPath();
        g.ellipse(-6, -10, 5, 7, -0.3, 0, Math.PI * 2);
        g.fill();
    } else if (id === 'jogo') {
        // 面具咒灵：蓝灰面具脸 + 棕色壶帽 + 单眼缝 + 利齿裂嘴 + 额纹（与选人界面一致）
        const at = pose.animT || 0;
        g.fillStyle = c.skin || '#a8b0b8';
        g.beginPath();
        g.arc(0, 0, 20, 0, Math.PI * 2);
        g.fill();
        // 火山帽（嶙峋山体 + 顶部火山口熔光，与选人界面一致）
        g.fillStyle = c.hat || '#6e5a3a';
        g.beginPath();
        g.moveTo(-15, -14);
        g.lineTo(-17, -20); g.lineTo(-13, -26); g.lineTo(-16, -32);
        g.lineTo(-11, -36); g.lineTo(-9, -38);
        g.lineTo(9, -38); g.lineTo(11, -36); g.lineTo(16, -32);
        g.lineTo(13, -26); g.lineTo(17, -20); g.lineTo(15, -14);
        g.closePath(); g.fill();
        // 山体右侧暗面
        g.fillStyle = 'rgba(0,0,0,0.2)';
        g.beginPath();
        g.moveTo(2, -38); g.lineTo(9, -38); g.lineTo(11, -36); g.lineTo(16, -32);
        g.lineTo(13, -26); g.lineTo(17, -20); g.lineTo(15, -14); g.lineTo(8, -14);
        g.closePath(); g.fill();
        // 火山口
        g.fillStyle = '#2a1a10';
        g.beginPath(); g.ellipse(0, -38, 9, 3, 0, 0, Math.PI * 2); g.fill();
        // 熔岩辉光（呼吸明灭）
        const glowJ = 0.55 + Math.sin(at * 0.12) * 0.25;
        g.fillStyle = 'rgba(255,106,42,' + glowJ.toFixed(3) + ')';
        g.beginPath(); g.ellipse(0, -38, 6, 2, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,210,60,' + (glowJ * 0.8).toFixed(3) + ')';
        g.beginPath(); g.ellipse(0, -39, 3, 1, 0, 0, Math.PI * 2); g.fill();
        // 硫烟
        g.strokeStyle = 'rgba(120,110,100,0.35)';
        g.lineWidth = 1.8; g.lineCap = 'round';
        for (let i = 0; i < 2; i++) {
            const ph = at * 0.03 + i * 2.1;
            const sy = -40 - ((at * 0.5 + i * 12) % 16);
            g.beginPath();
            g.moveTo(-3 + i * 6, -40);
            g.quadraticCurveTo(-3 + i * 6 + Math.sin(ph) * 4, sy + 4, -2 + i * 6 + Math.sin(ph + 1) * 5, sy);
            g.stroke();
        }
        g.lineCap = 'butt';
        // 岩石纹理
        g.strokeStyle = '#5a4830';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-14, -18); g.lineTo(-8, -24); g.stroke();
        g.beginPath(); g.moveTo(-10, -28); g.lineTo(-6, -32); g.stroke();
        g.beginPath(); g.moveTo(12, -20); g.lineTo(8, -26); g.stroke();
        g.beginPath(); g.moveTo(10, -30); g.lineTo(14, -34); g.stroke();
        // 熔岩裂纹
        g.strokeStyle = 'rgba(255,106,42,' + (0.45 + Math.sin(at * 0.1) * 0.2).toFixed(3) + ')';
        g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(-10, -20); g.lineTo(-7, -26); g.lineTo(-9, -32); g.stroke();
        g.beginPath(); g.moveTo(8, -22); g.lineTo(11, -28); g.stroke();
        // 额头棕色纹路
        g.strokeStyle = c.hat || '#6e5a3a';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(-10, -8); g.quadraticCurveTo(0, -12, 10, -8); g.stroke();
        g.beginPath(); g.moveTo(-8, -4); g.lineTo(8, -4); g.stroke();
        // 单眼缝
        g.fillStyle = '#1a1a20';
        g.beginPath(); g.ellipse(0, 2, 10, 3, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#ff9a3c';
        g.beginPath(); g.arc(0, 2, 2.5, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(1, 1, 0.8, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#3a3a30'; g.lineWidth = 1;
        g.beginPath(); g.ellipse(0, 2, 10, 3, 0, 0, Math.PI * 2); g.stroke();
        // 利齿裂嘴
        g.fillStyle = '#3a1a18';
        g.beginPath();
        g.moveTo(-10, 10);
        g.quadraticCurveTo(-12, 16, -6, 18);
        g.quadraticCurveTo(0, 20, 6, 18);
        g.quadraticCurveTo(12, 16, 10, 10);
        g.closePath(); g.fill();
        g.fillStyle = '#e8e4d0';
        g.beginPath();
        g.moveTo(-9, 10); g.lineTo(-7, 15); g.lineTo(-5, 10);
        g.lineTo(-3, 15); g.lineTo(-1, 10); g.lineTo(1, 15);
        g.lineTo(3, 10); g.lineTo(5, 15); g.lineTo(7, 10); g.lineTo(9, 15);
        g.closePath(); g.fill();
        g.beginPath();
        g.moveTo(-7, 18); g.lineTo(-5, 16); g.lineTo(-3, 18);
        g.lineTo(-1, 16); g.lineTo(1, 18); g.lineTo(3, 16);
        g.lineTo(5, 18); g.lineTo(7, 16);
        g.closePath(); g.fill();
        // 面具高光
        g.fillStyle = 'rgba(255,255,255,0.08)';
        g.beginPath(); g.ellipse(-7, -4, 4, 6, -0.3, 0, Math.PI * 2); g.fill();
    } else if (id === 'dagon') {
        // 陀艮：红色球状咒灵头—— elongated bulbous红头 + 深色斑点 + 头顶触手 + 面部粗触须下垂
        const at = pose.animT || 0;
        const skin = c.skin || '#8b1a1a';
        // 头部主体：更圆更长的 bulbous 球状头部（与选人界面一致）
        g.fillStyle = skin;
        g.beginPath();
        g.moveTo(-22, 14);
        g.quadraticCurveTo(-28, -4, -25, -20);
        g.quadraticCurveTo(-19, -38, 0, -38);
        g.quadraticCurveTo(19, -38, 25, -20);
        g.quadraticCurveTo(28, -4, 22, 14);
        g.closePath();
        g.fill();
        // 头顶深色斑点（更大更明显，与选人界面一致）
        g.fillStyle = c.hair || '#3a0a0a';
        g.beginPath(); g.arc(-10, -28, 4, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(6, -30, 3.5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(-3, -22, 3, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(14, -22, 3.2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(-16, -20, 2.5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(0, -34, 2.8, 0, Math.PI * 2); g.fill();
        // 头顶触手（粗触手向后/上延伸，摆动，与选人界面一致）
        g.strokeStyle = skin;
        g.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
            const ang = -Math.PI * 0.7 + i * 0.35;
            const sw = Math.sin(at * 0.06 + i * 1.5) * 3;
            const bx = Math.cos(ang) * 20;
            const by = -30 + Math.sin(ang) * 8;
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
            const sw = Math.sin(at * 0.06 + i * 1.5) * 3;
            const bx = Math.cos(ang) * 20;
            const by = -30 + Math.sin(ang) * 8;
            g.beginPath();
            g.arc(bx + Math.cos(ang) * 14 + sw * 0.5, by - 12, 1.5, 0, Math.PI * 2);
            g.fill();
        }
        // 面部粗触须（多根粗触手从面部下颌区域向下垂落，摆动，与选人界面一致）
        g.strokeStyle = skin;
        g.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
            const fx = -12 + i * 6;
            const sw = Math.sin(at * 0.07 + i * 0.9) * 4;
            const sw2 = Math.sin(at * 0.08 + i * 1.2) * 3;
            g.lineWidth = 5.5 - i * 0.3;
            g.beginPath();
            g.moveTo(fx, 6);
            g.quadraticCurveTo(fx + sw, 19, fx + sw2 * 1.5, 30);
            g.stroke();
        }
        // 触须吸盘点
        g.fillStyle = 'rgba(210,180,140,0.4)';
        for (let i = 0; i < 5; i++) {
            const fx = -12 + i * 6;
            const sw2 = Math.sin(at * 0.08 + i * 1.2) * 3;
            g.beginPath();
            g.arc(fx + sw2 * 0.8, 22, 1.2, 0, Math.PI * 2);
            g.fill();
        }
        g.lineCap = 'butt';
        // 湿润高光
        g.fillStyle = 'rgba(255,200,180,0.2)';
        g.beginPath();
        g.ellipse(-10, -26, 6, 3.5, -0.5, 0, Math.PI * 2);
        g.fill();
    } else if (id === 'naoya') {
        // 直哉：橄榄绿三七偏分短发 + 利落短鬓角 + 顶发微蓬
        // 后发主体（短发，贴头骨后部）
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-20, -2);
        g.quadraticCurveTo(-22, -16, -14, -20);
        g.quadraticCurveTo(-6, -24, 2, -22);
        g.quadraticCurveTo(12, -26, 18, -18);
        g.quadraticCurveTo(22, -10, 20, 0);
        g.quadraticCurveTo(12, 6, 0, 6);
        g.quadraticCurveTo(-12, 6, -20, -2);
        g.closePath();
        g.fill();
        // 顶发微蓬
        g.beginPath();
        g.moveTo(-14, -16);
        g.quadraticCurveTo(-8, -28, 0, -26);
        g.quadraticCurveTo(8, -30, 14, -22);
        g.quadraticCurveTo(10, -18, 0, -20);
        g.quadraticCurveTo(-6, -18, -14, -16);
        g.closePath();
        g.fill();
        // 三七偏分刘海（向右偏，3/7分）
        g.beginPath();
        g.moveTo(-18, -8);
        g.quadraticCurveTo(-14, -18, -6, -16);
        g.quadraticCurveTo(2, -20, 12, -12);
        g.quadraticCurveTo(17, -8, 18, 0);
        g.quadraticCurveTo(10, -4, 2, -2);
        g.quadraticCurveTo(-6, -2, -18, -8);
        g.closePath();
        g.fill();
        // 右刘海短碎
        g.beginPath();
        g.moveTo(10, -12);
        g.quadraticCurveTo(16, -8, 18, 0);
        g.quadraticCurveTo(12, -2, 8, -4);
        g.quadraticCurveTo(4, -6, 4, -10);
        g.closePath();
        g.fill();
        // 左刘海短碎
        g.beginPath();
        g.moveTo(-14, -12);
        g.quadraticCurveTo(-18, -4, -16, 4);
        g.quadraticCurveTo(-10, 0, -8, -6);
        g.quadraticCurveTo(-6, -10, -10, -12);
        g.closePath();
        g.fill();
        // 短鬓角（利落，耳上高度）
        g.beginPath();
        g.moveTo(-18, 0);
        g.quadraticCurveTo(-20, 14, -16, 22);
        g.quadraticCurveTo(-13, 18, -13, 8);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(19, 0);
        g.quadraticCurveTo(21, 14, 17, 22);
        g.quadraticCurveTo(14, 18, 14, 8);
        g.closePath();
        g.fill();
        // 深色发根阴影带
        g.fillStyle = c.hairShade;
        g.beginPath();
        g.moveTo(-18, -2);
        g.quadraticCurveTo(-10, -6, 0, -6);
        g.quadraticCurveTo(10, -6, 18, -2);
        g.quadraticCurveTo(10, 0, 0, 0);
        g.quadraticCurveTo(-10, 0, -18, -2);
        g.closePath();
        g.fill();
        // 发丝层次线
        g.strokeStyle = c.hairShade;
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(-3, -24); g.lineTo(-1, -12); g.stroke();
        g.beginPath(); g.moveTo(-10, -18); g.lineTo(-8, -6); g.stroke();
        g.beginPath(); g.moveTo(-14, -8); g.lineTo(-13, 4); g.stroke();
        g.beginPath(); g.moveTo(8, -18); g.lineTo(10, -4); g.stroke();
        g.beginPath(); g.moveTo(14, -10); g.lineTo(15, 6); g.stroke();
        g.beginPath(); g.moveTo(0, -22); g.lineTo(0, -10); g.stroke();
        // 黑色耳钉
        g.fillStyle = '#1a1a1a';
        g.beginPath();
        g.arc(19, 8, 1.5, 0, Math.PI * 2);
        g.fill();
        // 轻蔑笑
        g.strokeStyle = 'rgba(90,50,40,0.75)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-4, 11);
        g.quadraticCurveTo(3, 13, 8, 9);
        g.stroke();
    } else if (id === 'toji') {
        // 甚尔：黑色刺猬短发（密锯齿分层）+ 鬓角 + 右嘴角刀疤
        g.beginPath();
        g.moveTo(-21.5, 4);
        g.lineTo(-19.5, -6);
        g.lineTo(-23, -11);
        g.lineTo(-14.5, -13);
        g.lineTo(-15.5, -21);
        g.lineTo(-8, -16);
        g.lineTo(-5, -25);
        g.lineTo(0.5, -18);
        g.lineTo(5.5, -24);
        g.lineTo(9, -16.5);
        g.lineTo(16, -20);
        g.lineTo(14.5, -12);
        g.lineTo(22, -10);
        g.lineTo(18, -4);
        g.lineTo(21.5, 3);
        g.quadraticCurveTo(14, -8, 0, -9);
        g.quadraticCurveTo(-14, -8, -21.5, 4);
        g.closePath();
        g.fill();
        // 鬓角（两侧短尖）
        g.beginPath();
        g.moveTo(-21, 1);
        g.lineTo(-18.5, 1);
        g.lineTo(-20, 10);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(20.5, 1);
        g.lineTo(18, 1);
        g.lineTo(19.5, 10);
        g.closePath();
        g.fill();
        // 发丝分层（深灰内影）
        g.strokeStyle = c.hairShade || '#2e3540';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-10, -18);
        g.lineTo(-7, -11);
        g.stroke();
        g.beginPath();
        g.moveTo(-1, -21);
        g.lineTo(0, -12);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -19);
        g.lineTo(6, -12);
        g.stroke();
        g.beginPath();
        g.moveTo(15, -14);
        g.lineTo(12, -9);
        g.stroke();
        // 右嘴角刀疤（浅色旧疤 + 缝合痕）
        g.strokeStyle = '#c09080';
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(9, 8);
        g.quadraticCurveTo(13, 10.5, 17.5, 14);
        g.stroke();
        g.strokeStyle = '#8a5a4a';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(9, 8);
        g.quadraticCurveTo(13, 10.5, 17.5, 14);
        g.stroke();
        for (let i = 0; i < 3; i++) {
            const sx = 10.5 + i * 2.6,
                sy = 8.9 + i * 1.8;
            g.beginPath();
            g.moveTo(sx - 1.2, sy + 1.2);
            g.lineTo(sx + 1.2, sy - 1.2);
            g.stroke();
        }
        // 冷峻抿平嘴线
        g.strokeStyle = 'rgba(90,50,40,0.8)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-6, 11);
        g.lineTo(5, 11);
        g.stroke();
    } else if (id === 'ryu') {
        // 石流龙：后梳短发 + 厚重飞机头炮管（用硬朗外轮廓突出成年男性的头型）
        // 只覆盖头顶，不压到眼睛：脸部额头与双眼必须完整露出
        g.beginPath();
        g.arc(0, -5, 21.5, Math.PI, 0);
        g.fill();
        // 头顶背头：三段起伏，避免小尺寸下看成普通圆帽
        g.beginPath();
        g.moveTo(-19, -19);
        g.quadraticCurveTo(-11, -31, -3, -32);
        g.quadraticCurveTo(6, -34, 18, -21);
        g.lineTo(13, -18);
        g.quadraticCurveTo(5, -24, 0, -23);
        g.quadraticCurveTo(-10, -24, -19, -19);
        g.closePath();
        g.fill();
        // 额前卷曲翘起的炮管发束：底部加宽、顶部收束，强化“炮口”体积
        g.beginPath();
        g.moveTo(-8, -24);
        g.quadraticCurveTo(-8, -37, -2, -45);
        g.quadraticCurveTo(2, -52, 8, -46);
        g.quadraticCurveTo(14, -39, 11, -29);
        g.quadraticCurveTo(8, -24, -8, -24);
        g.closePath();
        g.fill();
        // 炮管内壁与蓝色咒力核心：外环让远景也能读出额前炮口
        g.fillStyle = 'rgba(9,18,32,0.85)';
        g.beginPath();
        g.arc(2, -39, 5.3, 0, Math.PI * 2);
        g.fill();
        const ryuCorePulse = 0.85 + Math.sin((pose.animT || 0) * 0.12) * 0.15;
        g.fillStyle = 'rgba(110,184,255,0.22)';
        g.beginPath();
        g.arc(2, -39, 8.5 * ryuCorePulse, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#dff1ff';
        g.beginPath();
        g.arc(2, -39, 3.8 * ryuCorePulse, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(61,145,255,0.95)';
        g.beginPath();
        g.arc(2, -39, 2.25 * ryuCorePulse, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(174,220,255,0.82)';
        g.lineWidth = 1.35;
        g.beginPath();
        g.arc(2, -39, 5.2 * ryuCorePulse, 0, Math.PI * 2);
        g.stroke();
        // 飞机头硬边高光与发丝分层
        g.strokeStyle = 'rgba(112,130,154,0.7)';
        g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(-14, -25); g.quadraticCurveTo(-7, -31, -1, -29); g.stroke();
        g.beginPath(); g.moveTo(4, -31); g.quadraticCurveTo(10, -30, 15, -23); g.stroke();
        g.strokeStyle = c.hairShade || '#303640';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-11, -24); g.lineTo(-7, -14); g.stroke();
        g.beginPath(); g.moveTo(-1, -28); g.lineTo(0, -17); g.stroke();
        g.beginPath(); g.moveTo(10, -25); g.lineTo(7, -14); g.stroke();
        // 鬓角
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-21.5, -1);
        g.lineTo(-17.5, -1);
        g.lineTo(-19.3, 10);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(21, -1);
        g.lineTo(17.5, -1);
        g.lineTo(19.3, 10);
        g.closePath();
        g.fill();
        // 粗犷下颚线 + 露齿感笑纹
        g.strokeStyle = 'rgba(70,38,30,0.88)';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(-8, 9);
        g.quadraticCurveTo(0, 16, 9, 9);
        g.stroke();
        g.strokeStyle = 'rgba(255,238,220,0.55)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-5, 11.5);
        g.lineTo(5, 11.5);
        g.stroke();
    } else if (id === 'uro') {
        // 乌鹭亨子：粉白渐变大背头长发——发际线高抬全部后梳（无刘海）+ 脑后长发浪不遮脸
        const at = pose.animT || 0;
        const sw = Math.sin(at * 0.045) * 1.6; // 发梢微摆
        // 脑后长发浪（仅两侧外缘，绝不跨过面部）
        g.fillStyle = c.hairShade || '#b05a92';
        g.beginPath();
        g.moveTo(-14, -17);
        g.quadraticCurveTo(-25, -8, -26 + sw, 12);
        g.quadraticCurveTo(-26 + sw, 32, -21 + sw * 1.4, 50);
        g.quadraticCurveTo(-18 + sw, 38, -20, 20);
        g.quadraticCurveTo(-21, 2, -18.5, -8);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(14, -17);
        g.quadraticCurveTo(25, -8, 26 - sw, 12);
        g.quadraticCurveTo(26 - sw, 32, 21 - sw * 1.4, 50);
        g.quadraticCurveTo(18 - sw, 38, 20, 20);
        g.quadraticCurveTo(21, 2, 18.5, -8);
        g.closePath();
        g.fill();
        // 发浪内侧亮部（粉白渐变）
        g.strokeStyle = 'rgba(248,214,232,0.7)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-21, -6);
        g.quadraticCurveTo(-24, 14, -20 + sw, 40);
        g.stroke();
        g.beginPath();
        g.moveTo(21, -6);
        g.quadraticCurveTo(24, 14, 20 - sw, 40);
        g.stroke();
        // 头顶大背头：发际线高抬（美人尖），发体全部向后梳起
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-20.5, -2);
        g.quadraticCurveTo(-23.5, -18, -13, -26.5);
        g.quadraticCurveTo(0, -32, 13, -26.5);
        g.quadraticCurveTo(23.5, -18, 20.5, -2);
        g.quadraticCurveTo(20, -12, 15.5, -16.5);
        g.quadraticCurveTo(8, -20.5, 2, -14.5);
        g.quadraticCurveTo(0, -13, -2, -14.5);
        g.quadraticCurveTo(-8, -20.5, -15.5, -16.5);
        g.quadraticCurveTo(-20, -12, -20.5, -2);
        g.closePath();
        g.fill();
        // 后梳发丝梳痕（自发际线向头顶后方收束）
        g.strokeStyle = c.hairShade || '#b05a92';
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(-3, -14.5);
        g.quadraticCurveTo(-4, -22, -7, -28);
        g.stroke();
        g.beginPath();
        g.moveTo(3, -14.5);
        g.quadraticCurveTo(4, -22, 7, -28);
        g.stroke();
        g.beginPath();
        g.moveTo(-11, -17.5);
        g.quadraticCurveTo(-14, -23, -16, -25);
        g.stroke();
        g.beginPath();
        g.moveTo(11, -17.5);
        g.quadraticCurveTo(14, -23, 16, -25);
        g.stroke();
        // 发顶粉白亮部（渐变至白的发根高光）
        g.strokeStyle = 'rgba(255,238,248,0.85)';
        g.lineWidth = 2.2;
        g.beginPath();
        g.moveTo(-6, -29.5);
        g.quadraticCurveTo(0, -31.5, 6, -29.5);
        g.stroke();
        g.strokeStyle = 'rgba(255,238,248,0.5)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-13, -25.5);
        g.quadraticCurveTo(0, -30, 13, -25.5);
        g.stroke();
        // 耳部银环耳饰（发不遮耳，直接外露）
        g.strokeStyle = '#d8dce4';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(-19, 8, 2.6, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(19, 8, 2.6, 0, Math.PI * 2);
        g.stroke();
        // 淡色薄唇（沉着神情）
        g.strokeStyle = 'rgba(150,70,80,0.7)';
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(-4, 12);
        g.quadraticCurveTo(0, 13.5, 4, 12);
        g.stroke();
    } else if (id === 'druv') {
        // 杜鲁夫：古老术师——尖顶头巾（额前三角纹章）+ 两侧垂落白发帘 + 成缕长白须
        // 两侧垂落的白发帘（自头巾下缘垂至颈侧外扬，不跨面部）
        g.fillStyle = c.hairShade || '#b2a894';
        g.beginPath();
        g.moveTo(-14, -16);
        g.quadraticCurveTo(-24, -10, -26, 4);
        g.quadraticCurveTo(-27, 14, -23, 23);
        g.lineTo(-18.5, 15);
        g.quadraticCurveTo(-20, 4, -17, -9);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(14, -16);
        g.quadraticCurveTo(24, -10, 26, 4);
        g.quadraticCurveTo(27, 14, 23, 23);
        g.lineTo(18.5, 15);
        g.quadraticCurveTo(20, 4, 17, -9);
        g.closePath();
        g.fill();
        // 发帘亮丝
        g.strokeStyle = 'rgba(246,242,232,0.7)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-21, -6);
        g.quadraticCurveTo(-23.5, 6, -21, 18);
        g.stroke();
        g.beginPath();
        g.moveTo(21, -6);
        g.quadraticCurveTo(23.5, 6, 21, 18);
        g.stroke();
        // 尖顶头巾（覆顶至额，顶部高耸收尖）
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-20.5, 0);
        g.quadraticCurveTo(-23, -18, -11, -27);
        g.quadraticCurveTo(-4, -36, 0, -43);
        g.quadraticCurveTo(4, -36, 11, -27);
        g.quadraticCurveTo(23, -18, 20.5, 0);
        g.quadraticCurveTo(10, -9, 0, -9.5);
        g.quadraticCurveTo(-10, -9, -20.5, 0);
        g.closePath();
        g.fill();
        // 头巾前缘束带线与折痕
        g.strokeStyle = 'rgba(120,106,88,0.6)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-19, -2);
        g.quadraticCurveTo(0, -12, 19, -2);
        g.stroke();
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-8, -14);
        g.quadraticCurveTo(-3, -28, 0, -38);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -14);
        g.quadraticCurveTo(3, -28, 0, -38);
        g.stroke();
        // 额前三角纹章（倒三角）
        g.fillStyle = 'rgba(40,32,24,0.85)';
        g.beginPath();
        g.moveTo(-4.5, -24);
        g.lineTo(4.5, -24);
        g.lineTo(0, -14.5);
        g.closePath();
        g.fill();
        // 面颊凹陷纹（枯瘦老者的颊侧衰老纹）
        g.strokeStyle = 'rgba(96,70,48,0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-14, 5);
        g.quadraticCurveTo(-12, 9, -13, 12);
        g.stroke();
        g.beginPath();
        g.moveTo(14, 5);
        g.quadraticCurveTo(12, 9, 13, 12);
        g.stroke();
        // 唇上长垂八字白须
        g.strokeStyle = c.hair;
        g.lineWidth = 2.4;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-1.5, 9);
        g.quadraticCurveTo(-8, 11, -11.5, 21);
        g.stroke();
        g.beginPath();
        g.moveTo(1.5, 9);
        g.quadraticCurveTo(8, 11, 11.5, 21);
        g.stroke();
        g.lineCap = 'butt';
        // 颏下成缕长白须（三缕垂落）
        g.fillStyle = c.hair;
        g.beginPath();
        g.moveTo(-3.5, 15);
        g.quadraticCurveTo(-5, 27, -2, 39);
        g.quadraticCurveTo(0, 41.5, 2, 39);
        g.quadraticCurveTo(5, 27, 3.5, 15);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(-9.5, 12);
        g.quadraticCurveTo(-11, 21, -8, 30);
        g.quadraticCurveTo(-6.5, 31.5, -5.5, 29);
        g.quadraticCurveTo(-7, 20, -6, 13.5);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(9.5, 12);
        g.quadraticCurveTo(11, 21, 8, 30);
        g.quadraticCurveTo(6.5, 31.5, 5.5, 29);
        g.quadraticCurveTo(7, 20, 6, 13.5);
        g.closePath();
        g.fill();
        // 须缕内影线
        g.strokeStyle = 'rgba(150,138,118,0.6)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-0.5, 18);
        g.quadraticCurveTo(-1.5, 28, 0, 37);
        g.stroke();
        g.beginPath();
        g.moveTo(-7.5, 15);
        g.quadraticCurveTo(-9, 22, -7, 28);
        g.stroke();
        g.beginPath();
        g.moveTo(7.5, 15);
        g.quadraticCurveTo(9, 22, 7, 28);
        g.stroke();
    } else if (id === 'kuro') {
        // 黑沐死：黑色圆顶头罩（环形罩缘）+ 橙红面甲板块缝线 + 栅栏状牙口 + 双触须
        // 头顶双触须（细长外扬上挑）
        g.strokeStyle = '#3c1828';
        g.lineWidth = 1.8;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-7, -20);
        g.quadraticCurveTo(-18, -34, -28, -41);
        g.stroke();
        g.beginPath();
        g.moveTo(7, -20);
        g.quadraticCurveTo(18, -34, 28, -41);
        g.stroke();
        g.lineCap = 'butt';
        // 黑色圆顶头罩（环形：外圆减去面甲开窗）
        g.fillStyle = c.hair;
        g.beginPath();
        g.arc(0, -1, 22.5, 0, Math.PI * 2);
        g.ellipse(0, 2.5, 14.5, 15.5, 0, 0, Math.PI * 2, true);
        g.fill();
        // 罩顶弧光（微亮缘）
        g.strokeStyle = c.hairShade || '#2c2420';
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(0, -1, 20.5, Math.PI * 1.15, Math.PI * 1.85);
        g.stroke();
        // 面甲板块缝线（横向暗缝 + 中缝）
        g.strokeStyle = 'rgba(74,26,20,0.6)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-12.5, -4);
        g.quadraticCurveTo(0, -1.5, 12.5, -4);
        g.stroke();
        g.beginPath();
        g.moveTo(-13, 6);
        g.quadraticCurveTo(0, 8.5, 13, 6);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -12);
        g.lineTo(0, -4);
        g.stroke();
        // 栅栏状牙口（暗口带 + 竖排亮齿条）
        g.fillStyle = '#2c0e08';
        g.beginPath();
        g.moveTo(-9, 10);
        g.quadraticCurveTo(0, 8.5, 9, 10);
        g.quadraticCurveTo(9.5, 14.5, 8, 16.5);
        g.quadraticCurveTo(0, 18.5, -8, 16.5);
        g.quadraticCurveTo(-9.5, 14.5, -9, 10);
        g.closePath();
        g.fill();
        g.strokeStyle = '#f0b060';
        g.lineWidth = 1.1;
        for (let i = -3; i <= 3; i++) {
            g.beginPath();
            g.moveTo(i * 2.4, 10.2 + Math.abs(i) * 0.3);
            g.lineTo(i * 2.4, 16.2 - Math.abs(i) * 0.3);
            g.stroke();
        }
    }

    // 眼睛（真人变身态五官已在 drawHead 内自绘，跳过）
    if (!(c.id === 'mahito' && pose.mahitoTransformed)) drawEyes(g, c, 0, 0);
    g.restore();
}

function drawEyes(g, c, x, y) {
    if (c.id === 'gojo' || c.id === 'gojo2' || c.id === 'sukuna' || c.id === 'sukunaMegumi' || c.id === 'megumi' || c.id === 'megumi2') return; // 专属眼睛在 drawHead 内绘制
    if (c.id === 'hanami') {
        // 面具覆盖上半脸，无眼睛
        return; }
    if (c.id === 'jogo') {
        // 眼缝已在头部绘制，此处跳过
        return; }
    if (c.id === 'dagon') {
        // 双眼（大圆眼，白色巩膜 + 黑色大瞳孔 + 高光 + 眼眶描边，与选人界面一致）
        g.fillStyle = '#f0f0e8';
        g.beginPath();
        g.arc(x - 9, y + 1, 7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 9, y + 1, 7, 0, Math.PI * 2);
        g.fill();
        // 黑色大瞳孔
        g.fillStyle = '#0a0604';
        g.beginPath();
        g.arc(x - 9, y + 1, 4.5, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 9, y + 1, 4.5, 0, Math.PI * 2);
        g.fill();
        // 高光
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x - 11, y - 1.5, 2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 7, y - 1.5, 2, 0, Math.PI * 2);
        g.fill();
        // 眼眶描边
        g.strokeStyle = 'rgba(20,8,4,0.4)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x - 9, y + 1, 7, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(x + 9, y + 1, 7, 0, Math.PI * 2);
        g.stroke();
        return;
    }
    if (c.id === 'naoya') {
        // 眼角上挑的琥珀色细目（傲慢睨视）
        g.fillStyle = '#fdf6ea';
        g.beginPath();
        g.moveTo(x - 12, y + 2.5);
        g.quadraticCurveTo(x - 7, y - 3, x - 2, y + 1.5);
        g.quadraticCurveTo(x - 7, y + 4.5, x - 12, y + 2.5);
        g.fill();
        g.beginPath();
        g.moveTo(x + 3, y + 1.5);
        g.quadraticCurveTo(x + 8, y - 3, x + 13, y + 2.5);
        g.quadraticCurveTo(x + 8, y + 4.5, x + 3, y + 1.5);
        g.fill();
        // 灰色虹膜与瞳孔
        g.fillStyle = c.eyeColor || '#b0b8c0';
        g.beginPath();
        g.arc(x - 7, y + 1, 2.2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 1, 2.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#2a1c0c';
        g.beginPath();
        g.arc(x - 7, y + 1, 1, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 1, 1, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x - 8, y, 0.7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 7, y, 0.7, 0, Math.PI * 2);
        g.fill();
        // 外眼角上挑眼线
        g.strokeStyle = 'rgba(60,40,20,0.9)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(x - 11, y + 1);
        g.lineTo(x - 14, y - 2);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 12, y + 1);
        g.lineTo(x + 15, y - 2);
        g.stroke();
        // 细挑眉
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(x - 12, y - 6);
        g.quadraticCurveTo(x - 6, y - 8.5, x - 2, y - 6.5);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 2, y - 6.5);
        g.quadraticCurveTo(x + 6, y - 8.5, x + 12, y - 6);
        g.stroke(); return; }
    if (c.id === 'mahito') {
        // 真人：漆黑双瞳 + 微小高光（淡漠无情的眼神）
        g.fillStyle = '#14141c';
        g.beginPath();
        g.arc(x - 7, y + 2, 2.8, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 2, 2.8, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.beginPath();
        g.arc(x - 7.9, y + 1.1, 0.7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 7.1, y + 1.1, 0.7, 0, Math.PI * 2);
        g.fill(); return; }
    if (c.id === 'toji') {
        // 死鱼般的冷冽细目：上睑压平 + 墨绿虹膜（缺乏温度的眼神）
        g.fillStyle = '#e8e4dc';
        g.beginPath();
        g.ellipse(x - 7, y + 2, 4.6, 2.6, 0.06, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(x + 8, y + 2, 4.6, 2.6, -0.06, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#2a4a2a';
        g.beginPath();
        g.arc(x - 7, y + 2.2, 2.1, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 2.2, 2.1, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#0c120c';
        g.beginPath();
        g.arc(x - 7, y + 2.2, 1, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 2.2, 1, 0, Math.PI * 2);
        g.fill();
        // 极小高光
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.beginPath();
        g.arc(x - 6.2, y + 1.4, 0.6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8.8, y + 1.4, 0.6, 0, Math.PI * 2);
        g.fill();
        // 上睑压平粗线（三白眼压迫感）
        g.strokeStyle = 'rgba(16,18,22,0.95)';
        g.lineWidth = 1.7;
        g.beginPath();
        g.moveTo(x - 11.5, y + 0.4);
        g.lineTo(x - 2.5, y + 0.2);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 3.5, y + 0.2);
        g.lineTo(x + 12.5, y + 0.4);
        g.stroke();
        // 低平直眉（无波澜）
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(x - 11, y - 4.5);
        g.lineTo(x - 3, y - 4);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 4, y - 4);
        g.lineTo(x + 12, y - 4.5);
        g.stroke();
        return;
    }
    if (c.id === 'ryu') {
        // 石流龙专属：窄长锐眼 + 棕金虹膜 + 压低浓眉（成熟、危险、锁定目标）
        g.fillStyle = '#f2eee6';
        g.beginPath();
        g.ellipse(x - 7, y + 2, 5.2, 2.8, 0.08, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(x + 8, y + 2, 5.2, 2.8, -0.08, 0, Math.PI * 2);
        g.fill();
        // 棕金虹膜 + 深棕瞳孔
        g.fillStyle = '#9a642c';
        g.beginPath();
        g.arc(x - 7, y + 2, 2.55, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 2, 2.55, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#241307';
        g.beginPath();
        g.arc(x - 7, y + 2, 1.15, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 2, 1.15, 0, Math.PI * 2);
        g.fill();
        // 双高光：保持咒力角色的锐度，但不做少年式圆眼
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x - 8.2, y + 0.9, 0.8, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 6.8, y + 0.9, 0.8, 0, Math.PI * 2);
        g.fill();
        // 压低上睑与外眼角挑线
        g.strokeStyle = 'rgba(16,14,10,0.95)';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(x - 12, y + 0.2);
        g.quadraticCurveTo(x - 7, y - 2.2, x - 2.2, y + 0.2);
        g.lineTo(x - 0.5, y - 1.2);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 3.2, y + 0.2);
        g.quadraticCurveTo(x + 8, y - 2.2, x + 12.8, y + 0.2);
        g.lineTo(x + 14.2, y - 1.2);
        g.stroke();
        // 粗重浓眉：内端压低、外端抬起，强化额头和炮口的压迫感
        g.lineWidth = 2.6;
        g.beginPath();
        g.moveTo(x - 12, y - 6.4);
        g.quadraticCurveTo(x - 7, y - 8.8, x - 2.2, y - 5.8);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 3.2, y - 5.8);
        g.quadraticCurveTo(x + 8, y - 8.8, x + 13, y - 6.4);
        g.stroke();
        return;
    }
    if (c.id === 'uro') {
        // 乌鹭亨子专属：锐利黑瞳凤眼——眼尾上挑 + 傲然细长眉（不逊的目光）
        g.fillStyle = '#f4f0ec';
        g.beginPath();
        g.moveTo(x - 12, y + 2.5);
        g.quadraticCurveTo(x - 7, y - 2.5, x - 2, y + 1.5);
        g.quadraticCurveTo(x - 7, y + 5, x - 12, y + 2.5);
        g.fill();
        g.beginPath();
        g.moveTo(x + 3, y + 1.5);
        g.quadraticCurveTo(x + 8, y - 2.5, x + 13, y + 2.5);
        g.quadraticCurveTo(x + 8, y + 5, x + 3, y + 1.5);
        g.fill();
        // 墨黑虹膜与瞳孔
        g.fillStyle = c.eyeColor || '#16181e';
        g.beginPath();
        g.arc(x - 7, y + 1.4, 2.3, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 1.4, 2.3, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#000';
        g.beginPath();
        g.arc(x - 7, y + 1.4, 1, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 1.4, 1, 0, Math.PI * 2);
        g.fill();
        // 高光
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x - 7.8, y + 0.6, 0.7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 7.2, y + 0.6, 0.7, 0, Math.PI * 2);
        g.fill();
        // 浓重上眼线（沿上睑勾勒，眼尾上挑）
        g.strokeStyle = 'rgba(20,12,18,0.95)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(x - 12, y + 2);
        g.quadraticCurveTo(x - 7, y - 3, x - 2, y + 1);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 3, y + 1);
        g.quadraticCurveTo(x + 8, y - 3, x + 13, y + 2);
        g.stroke();
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(x - 11, y + 1);
        g.lineTo(x - 14, y - 2);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 12, y + 1);
        g.lineTo(x + 15, y - 2);
        g.stroke();
        // 细高挑眉（远离眼睛的高位细弯眉，原作标志特征）
        g.strokeStyle = 'rgba(120,60,90,0.9)';
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(x - 12, y - 8);
        g.quadraticCurveTo(x - 7, y - 12.5, x - 2, y - 9.5);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 2, y - 9.5);
        g.quadraticCurveTo(x + 7, y - 12.5, x + 12, y - 8);
        g.stroke();
        return;
    }
    if (c.id === 'druv') {
        // 杜鲁夫专属：深陷黑眼窝——环目暗影 + 苍白小虹膜 + 衰老眼纹
        // 深陷眼窝（环目墨影）
        g.fillStyle = 'rgba(28,20,14,0.6)';
        g.beginPath();
        g.ellipse(x - 7, y + 1.5, 5.6, 4.2, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(x + 8, y + 1.5, 5.6, 4.2, 0, 0, Math.PI * 2);
        g.fill();
        // 窄长暗白眼白
        g.fillStyle = '#ded4c2';
        g.beginPath();
        g.ellipse(x - 7, y + 2, 3.6, 2, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(x + 8, y + 2, 3.6, 2, 0, 0, Math.PI * 2);
        g.fill();
        // 苍白小虹膜与针尖黑瞳（古老洞穿的目光）
        g.fillStyle = c.eyeColor || '#d8c8a0';
        g.beginPath();
        g.arc(x - 7, y + 2, 1.8, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 2, 1.8, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#140c06';
        g.beginPath();
        g.arc(x - 7, y + 2, 0.8, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 2, 0.8, 0, Math.PI * 2);
        g.fill();
        // 上睑沉重暗线
        g.strokeStyle = 'rgba(16,10,6,0.9)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(x - 11.5, y + 1);
        g.quadraticCurveTo(x - 7, y - 1.5, x - 2.5, y + 1);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 3.5, y + 1);
        g.quadraticCurveTo(x + 8, y - 1.5, x + 12.5, y + 1);
        g.stroke();
        // 眼下衰老垂纹（双层）
        g.strokeStyle = 'rgba(70,50,34,0.6)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x - 11, y + 6);
        g.quadraticCurveTo(x - 7, y + 7.5, x - 3, y + 6.2);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 4, y + 6.2);
        g.quadraticCurveTo(x + 8, y + 7.5, x + 12, y + 6);
        g.stroke();
        // 灰白细长垂眉
        g.strokeStyle = 'rgba(226,220,206,0.95)';
        g.lineWidth = 1.8;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(x - 12.5, y - 3.5);
        g.quadraticCurveTo(x - 7, y - 6, x - 2.5, y - 4.5);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 2.5, y - 4.5);
        g.quadraticCurveTo(x + 7, y - 6, x + 12.5, y - 3.5);
        g.stroke();
        g.lineCap = 'butt';
        // 眉间双竖纹（岁月刻痕）
        g.strokeStyle = 'rgba(60,42,28,0.6)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x - 1.2, y - 5.5);
        g.lineTo(x - 0.6, y - 2.5);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 1.2, y - 5.5);
        g.lineTo(x + 0.6, y - 2.5);
        g.stroke();
        return;
    }
    if (c.id === 'kuro') {
        // 黑沐死专属：一对大暗红主眼斑 + 上方多枚小眼斑（多眼面甲，无眼白）
        // 主眼斑暗晕
        g.fillStyle = 'rgba(122,20,32,0.30)';
        g.beginPath();
        g.ellipse(x - 7, y + 2, 6, 4.6, 0.18, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(x + 7, y + 2, 6, 4.6, -0.18, 0, Math.PI * 2);
        g.fill();
        // 主眼斑本体（暗红）
        g.fillStyle = c.eyeColor || '#7a1420';
        g.beginPath();
        g.ellipse(x - 7, y + 2, 4.4, 3.2, 0.18, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(x + 7, y + 2, 4.4, 3.2, -0.18, 0, Math.PI * 2);
        g.fill();
        // 眼内腐橙亮核 + 高光点
        g.fillStyle = '#e0862e';
        g.beginPath();
        g.arc(x - 7, y + 2, 1.6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 7, y + 2, 1.6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#f0b060';
        g.beginPath();
        g.arc(x - 7.6, y + 1.4, 0.7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 6.4, y + 1.4, 0.7, 0, Math.PI * 2);
        g.fill();
        // 上方多枚小眼斑（弧形排列，多眼咒灵）
        g.fillStyle = c.eyeColor || '#7a1420';
        const spots = [[-10.5, -5.5, 1.5], [-4.5, -7.5, 1.2], [0, -8.6, 1.0], [4.5, -7.5, 1.2], [10.5, -5.5, 1.5]];
        for (const sp of spots) {
            g.beginPath();
            g.arc(x + sp[0], y + sp[1], sp[2], 0, Math.PI * 2);
            g.fill();
        }
        // 大颗小眼斑内的橙芯
        g.fillStyle = '#e0862e';
        g.beginPath();
        g.arc(x - 10.5, y - 5.5, 0.6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 10.5, y - 5.5, 0.6, 0, Math.PI * 2);
        g.fill();
        return;
    }
    if (c.id === 'okkotsu') {
        // 乙骨专属：疲惫温柔眼——微垂眼角 + 墨黑瞳 + 深重黑眼圈
        // 眼白（微垂眼角的椭圆）
        g.fillStyle = '#f6f4f0';
        g.beginPath();
        g.ellipse(x - 7, y + 2, 4.4, 3.0, 0.10, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(x + 8, y + 2, 4.4, 3.0, -0.10, 0, Math.PI * 2);
        g.fill();
        // 墨黑虹膜 + 瞳孔
        g.fillStyle = c.eyeColor || '#1a1e26';
        g.beginPath();
        g.arc(x - 7, y + 2.2, 2.4, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 2.2, 2.4, 0, Math.PI * 2);
        g.fill();
        // 湿润高光（温柔感）
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x - 8, y + 1.2, 0.9, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 7, y + 1.2, 0.9, 0, Math.PI * 2);
        g.fill();
        // 上睑微垂线（困倦无害的垂眼）
        g.strokeStyle = 'rgba(14,17,24,0.9)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(x - 11, y + 0.6);
        g.quadraticCurveTo(x - 7, y - 1.4, x - 3, y + 1.2);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 4, y + 1.2);
        g.quadraticCurveTo(x + 8, y - 1.4, x + 12, y + 0.6);
        g.stroke();
        // 深重黑眼圈（双层卧蚕式阴影——原作标志性特征）
        g.fillStyle = 'rgba(58,48,84,0.42)';
        g.beginPath();
        g.ellipse(x - 7, y + 6, 4.6, 2.6, 0.1, 0, Math.PI);
        g.fill();
        g.beginPath();
        g.ellipse(x + 8, y + 6, 4.6, 2.6, -0.1, 0, Math.PI);
        g.fill();
        g.strokeStyle = 'rgba(62,48,86,0.6)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(x - 7, y + 5, 4.4, 0.25, Math.PI - 0.25);
        g.stroke();
        g.beginPath();
        g.arc(x + 8, y + 5, 4.4, 0.25, Math.PI - 0.25);
        g.stroke();
        g.beginPath();
        g.arc(x - 7, y + 7.2, 3.4, 0.4, Math.PI - 0.4);
        g.stroke();
        g.beginPath();
        g.arc(x + 8, y + 7.2, 3.4, 0.4, Math.PI - 0.4);
        g.stroke();
        // 柔和斜眉（微垂，温柔气质）
        g.lineWidth = 1.2;
        g.strokeStyle = 'rgba(14,17,24,0.8)';
        g.beginPath();
        g.moveTo(x - 11, y - 4);
        g.quadraticCurveTo(x - 7, y - 5.5, x - 3, y - 4.2);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 4, y - 4.2);
        g.quadraticCurveTo(x + 8, y - 5.5, x + 12, y - 4);
        g.stroke();
        return;
    }
    g.fillStyle = '#20242e';
    g.beginPath();
    g.arc(x - 7, y + 2, 2.8, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(x + 8, y + 2, 2.8, 0, Math.PI * 2);
    g.fill();
    // 高光
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(x - 6, y + 1, 0.9, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(x + 9, y + 1, 0.9, 0, Math.PI * 2);
    g.fill();
    if (c.id === 'nanami') {
        // 圆形绿片眼镜反光
        g.fillStyle = 'rgba(90,138,90,0.15)';
        g.beginPath(); g.arc(x - 7, y + 2, 4.5, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x + 8, y + 2, 4.5, 0, Math.PI * 2); g.fill();
    }
    if (c.id === 'kenjaku') {
        // 窄长锐眼（深紫瞳，与选人界面一致）
        g.fillStyle = '#f0e8e0';
        g.beginPath(); g.ellipse(x - 8, y + 2, 4, 2, 0, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(x + 8, y + 2, 4, 2, 0, 0, Math.PI * 2); g.fill();
        g.fillStyle = c.eyeColor || '#3a2a4a';
        g.beginPath(); g.arc(x - 8, y + 2, 2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x + 8, y + 2, 2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(x - 9, y + 1.5, 0.7, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(x + 7, y + 1.5, 0.7, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#1a0a18'; g.lineWidth = 1;
        g.beginPath(); g.ellipse(x - 8, y + 2, 4, 2, 0, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.ellipse(x + 8, y + 2, 4, 2, 0, 0, Math.PI * 2); g.stroke();
    }
    if (c.id === 'yuji' || c.id === 'yuji2') {
        // 棕色圆瞳覆盖（叠在通用瞳孔上，少年感大眼）
        g.fillStyle = c.eyeColor || '#6a4426';
        g.beginPath();
        g.arc(x - 7, y + 2, 2.6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 2, 2.6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#2a1a10';
        g.beginPath();
        g.arc(x - 7, y + 2.2, 1.2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 8, y + 2.2, 1.2, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(x - 8, y + 1, 0.9, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(x + 7, y + 1, 0.9, 0, Math.PI * 2);
        g.fill();
        // 粗直浓眉（前期开朗平直；后期内端压低、凌厉斜振）
        g.strokeStyle = 'rgba(90,60,60,0.9)';
        g.lineWidth = 2;
        g.lineCap = 'round';
        const browDip = c.id === 'yuji2' ? 2.4 : 0;
        g.beginPath();
        g.moveTo(x - 11, y - 4 - browDip * 0.6);
        g.lineTo(x - 3, y - 4.6 + browDip);
        g.stroke();
        g.beginPath();
        g.moveTo(x + 4, y - 4.6 + browDip);
        g.lineTo(x + 12, y - 4 - browDip * 0.6);
        g.stroke();
        g.lineCap = 'butt';
        // 眼下红痕
        g.strokeStyle = 'rgba(200,40,40,0.5)';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(x - 7, y + 11);
        g.lineTo(x - 7, y + 15);
        g.stroke();
    }
}

/* ---------------- 躯干细节 ---------------- */
function drawTorso(g, c, pose) {
    g.fillStyle = c.cloth;
    // 躯干主体：倒三角 + 腰部收窄，底部与胯部 y=-48 对齐
    g.beginPath();
    g.moveTo(-21, -108);
    g.quadraticCurveTo(0, -116, 21, -108);
    g.lineTo(15, -48);
    g.quadraticCurveTo(0, -42, -15, -48);
    g.closePath();
    g.fill();
    // 领口（五条/伏黑的高立领全覆盖领口，宿傩裸上身，真人宽松圆领罩衫，均跳过通用亮色 V 线避免杂色外露）
    if (c.id !== 'gojo' && c.id !== 'gojo2' && c.id !== 'megumi' && c.id !== 'megumi2' && c.id !== 'sukuna' && c.id !== 'mahito') {
        g.strokeStyle = c.accent;
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-15, -104);
        g.lineTo(0, -84);
        g.lineTo(15, -104);
        g.stroke();
    }
    // 风格化细节
    if (c.id === 'ryu') {
        // 石流龙：宽肩黑色开襟大衣 + 厚白毛领 + 强立体胸腹肌
        // 毛领底层阴影先压住颈部，再用亮边拉出蓬松体积
        g.fillStyle = 'rgba(32,36,44,0.9)';
        g.beginPath();
        g.moveTo(-25, -108);
        g.quadraticCurveTo(-29, -116, -23, -100);
        g.quadraticCurveTo(0, -91, 23, -100);
        g.quadraticCurveTo(29, -116, 25, -108);
        g.closePath();
        g.fill();
        g.fillStyle = c.collar || '#f0ece4';
        g.beginPath();
        g.moveTo(-22, -108);
        g.quadraticCurveTo(-28, -118, -21, -103);
        g.quadraticCurveTo(-12, -96, 0, -97);
        g.quadraticCurveTo(12, -96, 21, -103);
        g.quadraticCurveTo(28, -118, 22, -108);
        g.quadraticCurveTo(17, -113, 13, -107);
        g.quadraticCurveTo(0, -101, -13, -107);
        g.quadraticCurveTo(-17, -113, -22, -108);
        g.closePath();
        g.fill();
        // 毛领锯齿边与绒毛方向
        g.strokeStyle = 'rgba(255,255,255,0.62)';
        g.lineWidth = 1.15;
        for (let i = -18; i <= 18; i += 4) {
            g.beginPath();
            g.moveTo(i, -106 + Math.abs(i) * 0.08);
            g.lineTo(i + (i < 0 ? -2 : 2), -99 + Math.abs(i) * 0.06);
            g.stroke();
        }
        g.strokeStyle = 'rgba(164,154,148,0.52)';
        g.lineWidth = 1;
        g.beginPath(); g.moveTo(-23, -108); g.lineTo(-19, -100); g.stroke();
        g.beginPath(); g.moveTo(23, -108); g.lineTo(19, -100); g.stroke();
        // 黑色大衣主体：肩部外扩、下摆收束，形成强烈倒三角
        g.fillStyle = c.cloth || '#181c22';
        g.beginPath();
        g.moveTo(-25, -109);
        g.quadraticCurveTo(0, -120, 25, -109);
        g.lineTo(29, -52);
        g.quadraticCurveTo(0, -42, -29, -52);
        g.closePath();
        g.fill();
        // 肩部冷色轮廓光，避免黑衣在暗背景里丢失
        g.strokeStyle = 'rgba(106,128,156,0.46)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-24, -108); g.quadraticCurveTo(-16, -115, -7, -114); g.stroke();
        g.beginPath();
        g.moveTo(24, -108); g.quadraticCurveTo(16, -115, 7, -114); g.stroke();
        // 大衣开襟深色内衬
        g.fillStyle = c.clothSub || '#0f1116';
        g.beginPath();
        g.moveTo(-9, -109);
        g.lineTo(9, -109);
        g.lineTo(13, -52);
        g.quadraticCurveTo(0, -47, -13, -52);
        g.closePath();
        g.fill();
        // 大衣翻边与缝线
        g.strokeStyle = 'rgba(204,212,226,0.32)';
        g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-9, -109); g.lineTo(-13, -52); g.stroke();
        g.beginPath(); g.moveTo(9, -109); g.lineTo(13, -52); g.stroke();
        g.strokeStyle = 'rgba(5,8,12,0.9)';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(-21, -100); g.lineTo(-24, -58); g.stroke();
        g.beginPath(); g.moveTo(21, -100); g.lineTo(24, -58); g.stroke();
        // 裸露胸腹肌：肩宽增加后保留中央皮肤窗口
        g.fillStyle = c.skin;
        g.beginPath();
        g.moveTo(-14, -108); g.lineTo(14, -108); g.lineTo(12, -56);
        g.quadraticCurveTo(0, -51, -12, -56); g.closePath();
        g.fill();
        // 肌肉暖色高光和胸肌阴影
        g.fillStyle = 'rgba(255,224,184,0.14)';
        g.beginPath(); g.ellipse(-6, -96, 6.8, 4.3, -0.1, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(6, -96, 6.8, 4.3, 0.1, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(0,0,0,0.18)';
        g.beginPath(); g.ellipse(-7, -96, 6.5, 4.2, -0.1, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(7, -96, 6.5, 4.2, 0.1, 0, Math.PI * 2); g.fill();
        // 胸骨、腹肌与侧腹阴影
        g.strokeStyle = 'rgba(48,25,19,0.5)';
        g.lineWidth = 1.7;
        g.beginPath(); g.moveTo(0, -105); g.lineTo(0, -87); g.stroke();
        g.beginPath(); g.moveTo(-13, -92); g.quadraticCurveTo(-6, -85, -1, -88); g.stroke();
        g.beginPath(); g.moveTo(13, -92); g.quadraticCurveTo(6, -85, 1, -88); g.stroke();
        g.lineWidth = 1.35;
        g.beginPath(); g.moveTo(0, -84); g.lineTo(0, -59); g.stroke();
        g.beginPath(); g.moveTo(-9, -78); g.quadraticCurveTo(0, -75, 9, -78); g.stroke();
        g.beginPath(); g.moveTo(-8, -69); g.quadraticCurveTo(0, -67, 8, -69); g.stroke();
        // 吊坠项链：金属边缘和蓝色反光
        g.strokeStyle = c.pendant || '#d8c8a8';
        g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-12, -105); g.quadraticCurveTo(0, -91, 12, -105); g.stroke();
        g.fillStyle = c.pendant || '#d8c8a8';
        g.beginPath(); g.moveTo(0, -90); g.lineTo(-3.4, -82); g.lineTo(0, -69); g.lineTo(3.4, -82); g.closePath(); g.fill();
        g.fillStyle = 'rgba(126,190,255,0.72)';
        g.beginPath(); g.arc(-0.9, -84, 1, 0, Math.PI * 2); g.fill();
    } else if (c.id === 'mahito') {
        if (pose.mahitoTransformed) {
            // 遍杀即灵体：灰白肌体覆盖全躯干 + 肋状分节肌甲
            g.fillStyle = c.transformedColor || '#b8c2d2';
            g.beginPath();
            g.moveTo(-23, -109);
            g.quadraticCurveTo(0, -118, 23, -109);
            g.lineTo(16, -50);
            g.quadraticCurveTo(0, -44, -16, -50);
            g.closePath();
            g.fill();
            // 肋状胸肌分节（左右各三层弧板）
            g.strokeStyle = 'rgba(30,38,54,0.55)';
            g.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                const ry = -98 + i * 9;
                g.beginPath();
                g.moveTo(-18 + i * 1.5, ry);
                g.quadraticCurveTo(-9, ry + 4, -2, ry + 2);
                g.stroke();
                g.beginPath();
                g.moveTo(18 - i * 1.5, ry);
                g.quadraticCurveTo(9, ry + 4, 2, ry + 2);
                g.stroke();
            }
            // 胸骨中线 + 腹部分节板
            g.beginPath();
            g.moveTo(0, -100);
            g.lineTo(0, -58);
            g.stroke();
            g.lineWidth = 1.6;
            g.beginPath();
            g.moveTo(-10, -70);
            g.quadraticCurveTo(0, -66, 10, -70);
            g.stroke();
            g.beginPath();
            g.moveTo(-9, -62);
            g.quadraticCurveTo(0, -58, 9, -62);
            g.stroke();
            // 肌体高光（灰白边光）
            g.strokeStyle = 'rgba(236,242,250,0.35)';
            g.lineWidth = 2.4;
            g.beginPath();
            g.moveTo(-14, -104);
            g.quadraticCurveTo(-18, -86, -13, -66);
            g.stroke();
            // 深色束腰（下半身暗色裹布）
            g.fillStyle = c.clothSub || '#16161e';
            g.beginPath();
            g.moveTo(-15, -56);
            g.quadraticCurveTo(0, -51, 15, -56);
            g.lineTo(15, -48);
            g.quadraticCurveTo(0, -42, -15, -48);
            g.closePath();
            g.fill();
        } else {
            // 本体：宽松深灰罩衫 + 菱形格纹 + 垂坦下摆
            // 下摆外扩（宽松垂坠的缩口罩衫轮廓）
            g.fillStyle = c.cloth;
            g.beginPath();
            g.moveTo(-21, -108);
            g.quadraticCurveTo(-26, -84, -20, -62);
            g.quadraticCurveTo(0, -55, 20, -62);
            g.quadraticCurveTo(26, -84, 21, -108);
            g.closePath();
            g.fill();
            // 菱形格纹（网格斜线交叉，裁剪到罩衫轮廓内）
            g.save();
            g.beginPath();
            g.moveTo(-21, -108);
            g.quadraticCurveTo(-26, -84, -20, -62);
            g.quadraticCurveTo(0, -55, 20, -62);
            g.quadraticCurveTo(26, -84, 21, -108);
            g.closePath();
            g.clip();
            g.strokeStyle = c.meshColor || '#3e3e4c';
            g.lineWidth = 1.1;
            for (let i = -2; i <= 2; i++) {
                g.beginPath();
                g.moveTo(-22 + i * 10, -108);
                g.lineTo(2 + i * 10, -58);
                g.stroke();
                g.beginPath();
                g.moveTo(22 + i * 10, -108);
                g.lineTo(-2 + i * 10, -58);
                g.stroke();
            }
            g.restore();
            // 宽松圆领（露锁骨）
            g.fillStyle = c.skin;
            g.beginPath();
            g.moveTo(-9, -108);
            g.quadraticCurveTo(0, -100, 9, -108);
            g.quadraticCurveTo(0, -112, -9, -108);
            g.closePath();
            g.fill();
            g.strokeStyle = 'rgba(10,10,16,0.75)';
            g.lineWidth = 2;
            g.beginPath();
            g.moveTo(-9, -108);
            g.quadraticCurveTo(0, -99, 9, -108);
            g.stroke();
            // 领口下胸口缝合疤
            g.strokeStyle = c.stitchColor || '#7a6a7e';
            g.lineWidth = 1.2;
            g.beginPath();
            g.moveTo(-3, -104);
            g.lineTo(3, -100);
            g.stroke();
            // 下摆折痕
            g.strokeStyle = 'rgba(0,0,0,0.4)';
            g.lineWidth = 1.3;
            g.beginPath();
            g.moveTo(-12, -70);
            g.quadraticCurveTo(-10, -64, -11, -59);
            g.stroke();
            g.beginPath();
            g.moveTo(10, -72);
            g.quadraticCurveTo(12, -65, 11, -60);
            g.stroke();
        }
    }
    if (c.id === 'uro') {
        // 乌鹭亨子：黑革项圈 + 粉白背心吊带扣带 + 衣褶 + 绯红裤腰
        g.strokeStyle = '#14161c';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(-11, -108);
        g.quadraticCurveTo(0, -103, 11, -108);
        g.stroke();
        g.fillStyle = '#d8dce4';
        g.beginPath();
        g.arc(0, -104.5, 1.4, 0, Math.PI * 2);
        g.fill();
        // 双肩吊带扣带（自肩头斜落胸前）
        g.strokeStyle = '#d0b4c2';
        g.lineWidth = 3.5;
        g.beginPath();
        g.moveTo(-16, -107);
        g.quadraticCurveTo(-12, -88, -9, -70);
        g.stroke();
        g.beginPath();
        g.moveTo(16, -107);
        g.quadraticCurveTo(12, -88, 9, -70);
        g.stroke();
        // 吊带金属扣件
        g.fillStyle = '#8a7078';
        g.fillRect(-13.6, -90, 3.6, 4.6);
        g.fillRect(10, -90, 3.6, 4.6);
        // 背心衣褶（浅色布料的自然褶皱）
        g.strokeStyle = 'rgba(150,110,130,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-8, -80);
        g.quadraticCurveTo(-2, -76, 3, -78);
        g.stroke();
        g.beginPath();
        g.moveTo(-5, -66);
        g.quadraticCurveTo(2, -62, 8, -65);
        g.stroke();
        g.beginPath();
        g.moveTo(-9, -58);
        g.quadraticCurveTo(0, -55, 9, -58);
        g.stroke();
        // 绯红裤腰
        g.fillStyle = c.clothSub || '#a8324e';
        g.beginPath();
        g.moveTo(-15.5, -55);
        g.lineTo(15.5, -55);
        g.lineTo(15, -48);
        g.quadraticCurveTo(0, -42, -15, -48);
        g.closePath();
        g.fill();
        // 裤腰扣线
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-14, -52);
        g.lineTo(14, -52);
        g.stroke();
    }
    if (c.id === 'druv') {
        // 杜鲁夫：枯瘦老躯——苍白垂帘披布 + 锁骨肋骨嶙峋 + 暗色缠腰
        // 肩后苍白垂帘披布（头巾延垂至躯干两侧外缘）
        g.fillStyle = '#d8d0c0';
        g.beginPath();
        g.moveTo(-20, -107);
        g.quadraticCurveTo(-30, -80, -27, -50);
        g.lineTo(-19, -52);
        g.quadraticCurveTo(-23, -80, -18, -104);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(20, -107);
        g.quadraticCurveTo(30, -80, 27, -50);
        g.lineTo(19, -52);
        g.quadraticCurveTo(23, -80, 18, -104);
        g.closePath();
        g.fill();
        // 垂帘折痕暗线
        g.strokeStyle = 'rgba(120,106,88,0.5)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-24, -96);
        g.quadraticCurveTo(-26.5, -76, -24.5, -56);
        g.stroke();
        g.beginPath();
        g.moveTo(24, -96);
        g.quadraticCurveTo(26.5, -76, 24.5, -56);
        g.stroke();
        // 锁骨（枯瘦凸显）
        g.strokeStyle = 'rgba(60,40,24,0.55)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-13, -100);
        g.quadraticCurveTo(-6, -96.5, -1, -98);
        g.stroke();
        g.beginPath();
        g.moveTo(13, -100);
        g.quadraticCurveTo(6, -96.5, 1, -98);
        g.stroke();
        // 胸骨中线与两侧肋骨纹（嶙峋老躯）
        g.lineWidth = 1.1;
        g.beginPath();
        g.moveTo(0, -94);
        g.lineTo(0, -72);
        g.stroke();
        for (let i = 0; i < 3; i++) {
            const ry = -84 + i * 7;
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
        g.moveTo(-15.5, -56);
        g.lineTo(15.5, -56);
        g.lineTo(15, -48);
        g.quadraticCurveTo(0, -42, -15, -48);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(200,190,170,0.4)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-14, -53);
        g.lineTo(14, -53);
        g.stroke();
    }
    if (c.id === 'kuro') {
        // 黑沐死：黑色垂布宽罩躯体（底缘撕裂）+ 背后细长暗紫触肢
        // 背后六根细长触肢（自罩后弧形外伸，先画在罩下层）
        g.strokeStyle = '#3c1828';
        g.lineCap = 'round';
        for (let s = -1; s <= 1; s += 2) {
            g.lineWidth = 2.2;
            g.beginPath();
            g.moveTo(s * 10, -100);
            g.quadraticCurveTo(s * 34, -112, s * 44, -88);
            g.stroke();
            g.lineWidth = 1.8;
            g.beginPath();
            g.moveTo(s * 12, -88);
            g.quadraticCurveTo(s * 40, -92, s * 48, -66);
            g.stroke();
            g.lineWidth = 1.6;
            g.beginPath();
            g.moveTo(s * 12, -74);
            g.quadraticCurveTo(s * 38, -70, s * 44, -48);
            g.stroke();
        }
        g.lineCap = 'butt';
        // 黑色垂布宽罩（自肩披至腰下，下缘撕裂锯齿）
        g.fillStyle = c.cloth || '#1a1512';
        g.beginPath();
        g.moveTo(-16, -108);
        g.quadraticCurveTo(-26, -84, -24, -52);
        g.lineTo(-18, -46);
        g.lineTo(-13, -52);
        g.lineTo(-7, -45);
        g.lineTo(-1, -52);
        g.lineTo(5, -45);
        g.lineTo(11, -51);
        g.lineTo(17, -46);
        g.lineTo(24, -52);
        g.quadraticCurveTo(26, -84, 16, -108);
        g.quadraticCurveTo(0, -114, -16, -108);
        g.closePath();
        g.fill();
        // 罩面垂坠折痕（腐橙微光线）
        g.strokeStyle = 'rgba(224,134,46,0.20)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-12, -100);
        g.quadraticCurveTo(-15, -76, -13, -54);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -104);
        g.lineTo(0, -56);
        g.stroke();
        g.beginPath();
        g.moveTo(12, -100);
        g.quadraticCurveTo(15, -76, 13, -54);
        g.stroke();
        // 罩身横向暗缝板块线
        g.strokeStyle = 'rgba(14,11,9,0.85)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-23, -78);
        g.quadraticCurveTo(0, -72, 23, -78);
        g.stroke();
        // 胸前腐蚀橙斑点（罩下虫巢微光）
        g.fillStyle = 'rgba(224,134,46,0.5)';
        g.beginPath();
        g.arc(-6, -90, 1.3, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(7, -84, 1.1, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(-2, -66, 1.2, 0, Math.PI * 2);
        g.fill();
    }
    if (c.style === 'suit') {
        // 七海：蓝色衬衫V领 + 橄榄绿波点领带 + 米色西装翻领（与选人界面一致）
        // 蓝色衬衫领口
        g.fillStyle = c.shirtColor || '#4a6a9a';
        g.beginPath();
        g.moveTo(-8, -104);
        g.lineTo(0, -86);
        g.lineTo(8, -104);
        g.lineTo(6, -48);
        g.lineTo(-6, -48);
        g.closePath();
        g.fill();
        // 西装翻领线
        g.strokeStyle = c.clothSub || '#c8c0a8';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-10, -106); g.quadraticCurveTo(-4, -94, 0, -86);
        g.stroke();
        g.beginPath();
        g.moveTo(10, -106); g.quadraticCurveTo(4, -94, 0, -86);
        g.stroke();
        // 橄榄绿领带
        g.fillStyle = c.tieColor || '#5a6a3a';
        g.beginPath();
        g.moveTo(0, -96);
        g.lineTo(4, -86);
        g.lineTo(2, -48);
        g.lineTo(-2, -48);
        g.lineTo(-4, -86);
        g.closePath();
        g.fill();
        // 领带波点
        g.fillStyle = c.tieSpot || '#1a1a14';
        g.beginPath(); g.arc(0, -88, 1, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(1, -76, 1.2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(-1, -62, 1, 0, Math.PI * 2); g.fill();
    }
    if (c.style === 'stitch' && !(c.id === 'mahito' && pose.mahitoTransformed)) {
        g.strokeStyle = 'rgba(20,20,30,0.55)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-18, -100);
        g.lineTo(18, -88);
        g.stroke();
        g.beginPath();
        g.moveTo(-14, -72);
        g.lineTo(14, -80);
        g.stroke();
    }
    if (c.style === 'toji') {
        // 甚尔：黑色圆领T恤 + 胸肌/腹肌立体线 + 紫褐色大念珠（替代muscular默认逻辑）
        g.strokeStyle = 'rgba(0,0,0,0.4)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-14, -102);
        g.quadraticCurveTo(0, -93, 14, -102);
        g.stroke();
        // 领口内衬亮线
        g.strokeStyle = 'rgba(154,168,184,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-12, -101);
        g.quadraticCurveTo(0, -92.5, 12, -101);
        g.stroke();
        // 胸肌沟与下缘
        g.strokeStyle = 'rgba(0,0,0,0.32)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(0, -92);
        g.lineTo(0, -80);
        g.stroke();
        g.beginPath();
        g.moveTo(-13, -84);
        g.quadraticCurveTo(-6, -80, -1, -82);
        g.stroke();
        g.beginPath();
        g.moveTo(13, -84);
        g.quadraticCurveTo(6, -80, 1, -82);
        g.stroke();
        // 腹肌节理
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(0, -78);
        g.lineTo(0, -58);
        g.stroke();
        g.beginPath();
        g.moveTo(-8, -74);
        g.lineTo(8, -74);
        g.stroke();
        g.beginPath();
        g.moveTo(-7, -66);
        g.lineTo(7, -66);
        g.stroke();
        // 贴身衣料反光
        g.strokeStyle = 'rgba(200,212,232,0.16)';
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(-10, -96);
        g.quadraticCurveTo(-14, -84, -11, -70);
        g.stroke();
        // 紫褐色大念珠（颈间粗大串珠，胸前垂下）
        g.strokeStyle = c.beadColor || '#5a3a52';
        g.lineWidth = 7;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(-15, -108);
        g.quadraticCurveTo(-18, -96, -10, -88);
        g.quadraticCurveTo(0, -80, 10, -88);
        g.quadraticCurveTo(18, -96, 15, -108);
        g.stroke();
        // 珠子暗面
        g.strokeStyle = c.beadDark || '#3a2436';
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(-15, -108);
        g.quadraticCurveTo(-18, -96, -10, -88);
        g.stroke();
        // 胸前垂下的念珠
        g.strokeStyle = c.beadColor || '#5a3a52';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(0, -82);
        g.quadraticCurveTo(4, -70, 2, -58);
        g.stroke();
        g.strokeStyle = c.beadDark || '#3a2436';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, -82);
        g.quadraticCurveTo(4, -70, 2, -58);
        g.stroke();
    } else if (c.style === 'muscular') {
        // 甚尔紧身衣：圆领口 + 胸肌/腹肌立体线 + 腰侧咒具挂带
        g.strokeStyle = 'rgba(0,0,0,0.4)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-14, -102);
        g.quadraticCurveTo(0, -93, 14, -102);
        g.stroke();
        // 领口内衬亮线
        g.strokeStyle = 'rgba(154,168,184,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-12, -101);
        g.quadraticCurveTo(0, -92.5, 12, -101);
        g.stroke();
        // 胸肌沟与下缘
        g.strokeStyle = 'rgba(0,0,0,0.32)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(0, -92);
        g.lineTo(0, -80);
        g.stroke();
        g.beginPath();
        g.moveTo(-13, -84);
        g.quadraticCurveTo(-6, -80, -1, -82);
        g.stroke();
        g.beginPath();
        g.moveTo(13, -84);
        g.quadraticCurveTo(6, -80, 1, -82);
        g.stroke();
        // 腹肌节理
        g.lineWidth = 1.3;
        g.beginPath();
        g.moveTo(0, -78);
        g.lineTo(0, -58);
        g.stroke();
        g.beginPath();
        g.moveTo(-8, -74);
        g.lineTo(8, -74);
        g.stroke();
        g.beginPath();
        g.moveTo(-7, -66);
        g.lineTo(7, -66);
        g.stroke();
        // 贴身衣料反光
        g.strokeStyle = 'rgba(200,212,232,0.16)';
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(-10, -96);
        g.quadraticCurveTo(-14, -84, -11, -70);
        g.stroke();
        // 腰侧咒具挂带（斜挎收纳袋，甚尔专属）
        if (c.id === 'toji') {
            g.strokeStyle = 'rgba(154,168,184,0.55)';
            g.lineWidth = 2.6;
            g.beginPath();
            g.moveTo(-15, -60);
            g.lineTo(15, -52);
            g.stroke();
            g.fillStyle = '#10131a';
            g.fillRect(6, -58, 9, 8);
            g.strokeStyle = 'rgba(154,168,184,0.4)';
            g.lineWidth = 1;
            g.strokeRect(6, -58, 9, 8);
        }
        // 颈间吊坠项链（石流龙：金色链 + 长坠饰）
        if (c.pendant) {
            g.strokeStyle = c.pendant;
            g.lineWidth = 1.4;
            g.beginPath();
            g.moveTo(-11, -101);
            g.quadraticCurveTo(0, -90, 11, -101);
            g.stroke();
            g.fillStyle = c.pendant;
            g.beginPath();
            g.moveTo(0, -90);
            g.lineTo(-2.4, -85);
            g.lineTo(0, -78);
            g.lineTo(2.4, -85);
            g.closePath();
            g.fill();
            g.fillStyle = 'rgba(255,255,255,0.7)';
            g.beginPath();
            g.arc(-0.8, -86.5, 0.8, 0, Math.PI * 2);
            g.fill();
        }
    }
    if (c.style === 'volcano') {
        // 漏瑚：黄绿斑点斗篷 + 深灰内衬 + 白毛领（与选人界面一致）
        // 白色毛领
        g.fillStyle = c.collar || '#f0ece4';
        g.beginPath();
        g.moveTo(-18, -104);
        g.quadraticCurveTo(-22, -108, -20, -98);
        g.quadraticCurveTo(-10, -94, 0, -94);
        g.quadraticCurveTo(10, -94, 20, -98);
        g.quadraticCurveTo(22, -108, 18, -104);
        g.closePath();
        g.fill();
        // 毛领纹理
        g.strokeStyle = 'rgba(180,170,160,0.4)';
        g.lineWidth = 1;
        for (let i = -16; i <= 16; i += 4) {
            g.beginPath();
            g.moveTo(i, -104); g.lineTo(i + 1, -98);
            g.stroke();
        }
        // 黄绿色斗篷主体
        g.fillStyle = c.cloth || '#a8c84a';
        g.beginPath();
        g.moveTo(-20, -98);
        g.quadraticCurveTo(-24, -74, -18, -50);
        g.quadraticCurveTo(0, -44, 18, -50);
        g.quadraticCurveTo(24, -74, 20, -98);
        g.quadraticCurveTo(0, -106, -20, -98);
        g.closePath();
        g.fill();
        // 斗篷黑色不规则斑点
        g.fillStyle = c.spot || '#1a1a14';
        const spots = [
            [-12, -90, 5, 4], [8, -86, 6, 5], [-6, -76, 4, 3],
            [10, -70, 5, 4], [-14, -66, 4, 3], [4, -62, 5, 4],
            [-8, -56, 3, 3], [14, -58, 4, 3], [0, -82, 3, 2]
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
        g.moveTo(-20, -98);
        g.quadraticCurveTo(-24, -74, -18, -50);
        g.stroke();
        g.beginPath();
        g.moveTo(20, -98);
        g.quadraticCurveTo(24, -74, 18, -50);
        g.stroke();
    }
    if (c.style === 'ocean') {
        // 陀艮：深红粗壮躯干——大黑色胸甲 + 米色腹板 + 肩颈鳍褶 + 鞭状尾巴
        const at2 = pose.animT || 0;
        // 鞭状尾巴（从腰后延伸，向右下弯曲，摆动）
        const tailSw = Math.sin(at2 * 0.05) * 6;
        g.strokeStyle = c.skin || '#8b1a1a';
        g.lineCap = 'round';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(8, -56);
        g.quadraticCurveTo(18 + tailSw * 0.5, -48, 26 + tailSw, -38);
        g.quadraticCurveTo(32 + tailSw * 1.5, -28, 34 + tailSw * 2, -14);
        g.stroke();
        // 尾尖渐细
        g.lineWidth = 2.5;
        g.beginPath();
        g.moveTo(34 + tailSw * 2, -14);
        g.quadraticCurveTo(36 + tailSw * 2.5, -6, 36 + tailSw * 3, 2);
        g.stroke();
        g.lineCap = 'butt';
        // 大黑色胸甲覆盖层（更宽更大）
        g.fillStyle = c.cloth || '#0a0a0e';
        g.beginPath();
        g.moveTo(-20, -108);
        g.quadraticCurveTo(0, -114, 20, -108);
        g.lineTo(18, -76);
        g.quadraticCurveTo(0, -70, -18, -76);
        g.closePath();
        g.fill();
        // 胸甲肌肉纹理（更明显）
        g.strokeStyle = 'rgba(50,50,60,0.7)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-14, -102);
        g.quadraticCurveTo(0, -96, 14, -102);
        g.stroke();
        g.beginPath();
        g.moveTo(-10, -92);
        g.quadraticCurveTo(0, -86, 10, -92);
        g.stroke();
        // 胸甲中央竖纹
        g.beginPath();
        g.moveTo(0, -106);
        g.lineTo(0, -78);
        g.stroke();
        // 米色腹板（腹部浅色区域）
        g.fillStyle = c.fin || '#d2b48c';
        g.beginPath();
        g.moveTo(-10, -74);
        g.quadraticCurveTo(0, -76, 10, -74);
        g.lineTo(8, -48);
        g.quadraticCurveTo(0, -46, -8, -48);
        g.closePath();
        g.fill();
        // 腹板横纹
        g.strokeStyle = 'rgba(100,70,40,0.4)';
        g.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const ly = -68 + i * 8;
            g.beginPath();
            g.moveTo(-6, ly);
            g.quadraticCurveTo(0, ly + 2, 6, ly);
            g.stroke();
        }
        // 肩颈鳍褶（两肩鳍片，更大，微摆）
        const fb = Math.sin(at2 * 0.08) * 1.6;
        g.fillStyle = c.fin || '#d2b48c';
        g.beginPath();
        g.moveTo(-18, -104);
        g.quadraticCurveTo(-28 - fb, -112, -30 - fb, -100);
        g.quadraticCurveTo(-22, -96, -18, -98);
        g.closePath();
        g.fill();
        g.beginPath();
        g.moveTo(18, -104);
        g.quadraticCurveTo(28 + fb, -112, 30 + fb, -100);
        g.quadraticCurveTo(22, -96, 18, -98);
        g.closePath();
        g.fill();
        // 水光流纹（躯干表面游走的淡水光，确定相位）
        g.strokeStyle = 'rgba(89,200,232,' + (0.3 + Math.sin(at2 * 0.09) * 0.12).toFixed(3) + ')';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-14, -86);
        g.quadraticCurveTo(-8, -80 + Math.sin(at2 * 0.06) * 2, -12, -64);
        g.stroke();
        g.beginPath();
        g.moveTo(14, -90);
        g.quadraticCurveTo(9, -82 + Math.sin(at2 * 0.06 + 1.5) * 2, 13, -68);
        g.stroke();
        // 腰间深色束带
        g.fillStyle = c.deep || '#2a0808';
        g.fillRect(-16, -54, 32, 6);
        g.strokeStyle = 'rgba(0,0,0,0.3)';
        g.lineWidth = 1;
        g.strokeRect(-16, -54, 32, 6);
    }
    if (c.style === 'zenin') {
        // 直哉：黑色羽织 + 立领白衬衫（有纽扣） + 浅灰袴裙（带褶皱） + 草履
        // 立领白衬衫（高领，半遮颈）
        g.fillStyle = c.shirt || '#d8dce0';
        g.beginPath();
        g.moveTo(-9, -106);
        g.lineTo(9, -106);
        g.lineTo(7, -60);
        g.lineTo(-7, -60);
        g.closePath();
        g.fill();
        // 立领（高领翻折）
        g.fillStyle = '#c8ccd0';
        g.beginPath();
        g.moveTo(-8, -110);
        g.lineTo(8, -110);
        g.lineTo(9, -104);
        g.lineTo(-9, -104);
        g.closePath();
        g.fill();
        // 领口阴影
        g.strokeStyle = 'rgba(0,0,0,0.25)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-8, -107); g.lineTo(8, -107); g.stroke();
        // 衬衫纽扣（两颗）
        g.fillStyle = '#b0b4b8';
        g.beginPath(); g.arc(0, -96, 1.2, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(0, -82, 1.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#e8ecef';
        g.beginPath(); g.arc(-0.3, -96.3, 0.4, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.arc(-0.3, -82.3, 0.4, 0, Math.PI * 2); g.fill();
        // 黑色羽织（宽袖，覆盖外层）
        g.fillStyle = c.cloth || '#1a2228';
        g.beginPath();
        g.moveTo(-22, -108);
        g.quadraticCurveTo(-26, -82, -20, -52);
        g.quadraticCurveTo(0, -46, 20, -52);
        g.quadraticCurveTo(26, -82, 22, -108);
        g.quadraticCurveTo(0, -116, -22, -108);
        g.closePath();
        g.fill();
        // 羽织襟边（深色竖缘）
        g.strokeStyle = c.clothSub || '#14181c';
        g.lineWidth = 3.5;
        g.beginPath();
        g.moveTo(-12, -106);
        g.lineTo(-10, -54);
        g.stroke();
        g.beginPath();
        g.moveTo(12, -106);
        g.lineTo(10, -54);
        g.stroke();
        // 羽织纽绳结
        g.strokeStyle = '#a8a49a';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-9, -86);
        g.quadraticCurveTo(0, -80, 9, -86);
        g.stroke();
        g.fillStyle = '#a8a49a';
        g.beginPath();
        g.arc(0, -82, 2, 0, Math.PI * 2);
        g.fill();
        // 羽织衣褶
        g.strokeStyle = 'rgba(0,0,0,0.35)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(-16, -80); g.lineTo(-18, -56); g.stroke();
        g.beginPath();
        g.moveTo(16, -78); g.lineTo(18, -56); g.stroke();
        // 浅灰袴裙（宽松，长至脚踝，带褶皱）
        g.fillStyle = c.hakama || '#c4c8cc';
        g.beginPath();
        g.moveTo(-18, -52);
        g.lineTo(18, -52);
        g.lineTo(22, -4);
        g.quadraticCurveTo(0, 0, -22, -4);
        g.closePath();
        g.fill();
        // 袴裙褶皱线
        g.strokeStyle = 'rgba(0,0,0,0.15)';
        g.lineWidth = 1;
        for (let i = -3; i <= 3; i++) {
            const px = i * 6;
            g.beginPath();
            g.moveTo(px, -52);
            g.quadraticCurveTo(px + 2, -28, px + 4, -4);
            g.stroke();
        }
        // 袴腰带
        g.fillStyle = '#d0d4d8';
        g.fillRect(-16, -54, 32, 5);
        g.strokeStyle = 'rgba(0,0,0,0.2)';
        g.lineWidth = 1;
        g.strokeRect(-16, -54, 32, 5);
        // 草履绳带（黄绿色）
        const fLx = pose.legL.foot.x, fLy = pose.legL.foot.y;
        const fRx = pose.legR.foot.x, fRy = pose.legR.foot.y;
        g.strokeStyle = c.sandalStrap || '#a8c060';
        g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(fLx - 4, fLy - 2); g.lineTo(fLx + 4, fLy + 2); g.stroke();
        g.beginPath(); g.moveTo(fLx + 4, fLy); g.lineTo(fLx - 4, fLy - 4); g.stroke();
        g.beginPath(); g.moveTo(fRx - 4, fRy - 2); g.lineTo(fRx + 4, fRy + 2); g.stroke();
        g.beginPath(); g.moveTo(fRx + 4, fRy); g.lineTo(fRx - 4, fRy - 4); g.stroke();
    }
    if (c.id === 'sukunaMegumi') {
        g.fillStyle = '#d7d9de';
        g.beginPath();
        g.moveTo(-23, -109);
        g.quadraticCurveTo(0, -118, 23, -109);
        g.lineTo(21, -54);
        g.quadraticCurveTo(0, -46, -21, -54);
        g.closePath();
        g.fill();
        g.strokeStyle = '#9ea4ad';
        g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(-14, -105); g.quadraticCurveTo(-4, -94, 8, -104); g.stroke();
        g.beginPath(); g.moveTo(-16, -80); g.quadraticCurveTo(0, -70, 16, -80); g.stroke();
        g.fillStyle = '#151923';
        g.fillRect(-18, -59, 36, 9);
        g.strokeStyle = c.markings;
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(-15, -89); g.quadraticCurveTo(-7, -84, -2, -87); g.stroke();
        g.beginPath(); g.moveTo(15, -89); g.quadraticCurveTo(7, -84, 2, -87); g.stroke();
    }
    if (c.id === 'sukuna') {
        // 真身裸上身：肌肤覆盖整块躯干 + 黑色咒印纹身 + 藏青束裤腰
        g.fillStyle = c.skin;
        g.beginPath();
        g.moveTo(-21, -108);
        g.quadraticCurveTo(0, -116, 21, -108);
        g.lineTo(15, -56);
        g.quadraticCurveTo(0, -50, -15, -56);
        g.closePath();
        g.fill();
        // 胸肌阴影（健硕体格）
        g.fillStyle = 'rgba(0,0,0,0.10)';
        g.beginPath();
        g.ellipse(-8, -95, 8, 5.5, 0.1, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(8, -95, 8, 5.5, -0.1, 0, Math.PI * 2);
        g.fill();
        // 腹肌浅阴影
        g.strokeStyle = 'rgba(0,0,0,0.12)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -88);
        g.lineTo(0, -60);
        g.stroke();
        g.beginPath();
        g.moveTo(-8, -76);
        g.quadraticCurveTo(0, -73, 8, -76);
        g.stroke();
        g.beginPath();
        g.moveTo(-7, -66);
        g.quadraticCurveTo(0, -63, 7, -66);
        g.stroke();
        // 黑色咒印纹身：胸口双环 + 胸下弧纹 + 侧腹斜线（参考真身立绘）
        g.strokeStyle = c.markings || '#17171c';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, -92, 7, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.arc(0, -92, 3.4, 0, Math.PI * 2);
        g.stroke();
        g.beginPath();
        g.moveTo(-15, -84);
        g.quadraticCurveTo(-8, -79, -2, -82);
        g.stroke();
        g.beginPath();
        g.moveTo(15, -84);
        g.quadraticCurveTo(8, -79, 2, -82);
        g.stroke();
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(-17, -74);
        g.lineTo(-10, -62);
        g.stroke();
        g.beginPath();
        g.moveTo(17, -74);
        g.lineTo(10, -62);
        g.stroke();
        // 双肩黑环带 + 左肩黑圆咒印
        g.lineWidth = 3.4;
        g.beginPath();
        g.moveTo(-21, -104);
        g.lineTo(-13, -108);
        g.stroke();
        g.beginPath();
        g.moveTo(21, -104);
        g.lineTo(13, -108);
        g.stroke();
        g.fillStyle = c.markings || '#17171c';
        g.beginPath();
        g.arc(-17, -100, 3.6, 0, Math.PI * 2);
        g.fill();
        // 藏青束裤腰头 + 黑腰带
        g.fillStyle = c.cloth;
        g.beginPath();
        g.moveTo(-15, -58);
        g.quadraticCurveTo(0, -52, 15, -58);
        g.lineTo(15, -48);
        g.quadraticCurveTo(0, -42, -15, -48);
        g.closePath();
        g.fill();
        g.strokeStyle = '#111318';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-15, -55);
        g.quadraticCurveTo(0, -49, 15, -55);
        g.stroke();
    }
    if (c.id === 'kenjaku') {
        // 藏青道袍 + 绿底金格马甲 + 金斜带 + 金结 + 白领（与选人界面一致）
        // 白色内领
        g.fillStyle = c.collar || '#e8e4dc';
        g.beginPath();
        g.moveTo(-6, -108); g.lineTo(0, -94); g.lineTo(6, -108);
        g.lineTo(4, -48); g.lineTo(-4, -48);
        g.closePath(); g.fill();
        // 道袍交领金边
        g.strokeStyle = c.robeTrim || '#c8a85a';
        g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(-13, -108); g.quadraticCurveTo(-3, -92, 3, -78); g.stroke();
        g.beginPath(); g.moveTo(13, -108); g.quadraticCurveTo(3, -94, -3, -80); g.stroke();
        // 绿色马甲
        g.fillStyle = c.vest || '#3a5a2a';
        g.beginPath();
        g.moveTo(-10, -102);
        g.quadraticCurveTo(0, -106, 10, -102);
        g.lineTo(8, -50);
        g.quadraticCurveTo(0, -46, -8, -50);
        g.closePath(); g.fill();
        // 金色网格纹
        g.strokeStyle = c.vestTrim || '#c8a85a';
        g.lineWidth = 1;
        for (let i = -8; i <= 8; i += 4) {
            g.beginPath(); g.moveTo(i, -100); g.lineTo(i * 0.9, -50); g.stroke();
        }
        g.beginPath(); g.moveTo(-9, -90); g.quadraticCurveTo(0, -88, 9, -90); g.stroke();
        g.beginPath(); g.moveTo(-9, -78); g.quadraticCurveTo(0, -76, 9, -78); g.stroke();
        g.beginPath(); g.moveTo(-9, -66); g.quadraticCurveTo(0, -64, 9, -66); g.stroke();
        // 马甲金边
        g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(-10, -102); g.quadraticCurveTo(0, -106, 10, -102); g.stroke();
        g.beginPath(); g.moveTo(-8, -50); g.quadraticCurveTo(0, -46, 8, -50); g.stroke();
        // 金色斜带
        g.fillStyle = c.robeTrim || '#c8a85a';
        g.beginPath();
        g.moveTo(-14, -104);
        g.lineTo(-8, -110);
        g.lineTo(14, -52);
        g.lineTo(6, -48);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(120,90,30,0.5)';
        g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(-11, -106); g.lineTo(10, -50); g.stroke();
        // 金结
        g.fillStyle = c.robeTrim || '#c8a85a';
        g.beginPath(); g.ellipse(8, -48, 5, 3, 0.3, 0, Math.PI * 2); g.fill();
        g.beginPath(); g.ellipse(12, -46, 4, 2.5, -0.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = '#a88838';
        g.beginPath(); g.arc(9, -47, 1.5, 0, Math.PI * 2); g.fill();
        // 金线腰带
        g.strokeStyle = c.robeTrim || '#c8a85a';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(-13, -44); g.quadraticCurveTo(0, -40, 13, -44); g.stroke();
    }
    if (c.id === 'hanami') {
        // 裸上身肌肉躯干：灰白皮肤 + 黑色不规则条纹 + 缝合线 + 白色束腰（与选人界面一致）
        g.fillStyle = c.skin;
        g.beginPath();
        g.moveTo(-20, -107);
        g.quadraticCurveTo(0, -115, 20, -107);
        g.lineTo(15, -50);
        g.quadraticCurveTo(0, -44, -15, -50);
        g.closePath();
        g.fill();
        // 胸肌阴影
        g.fillStyle = 'rgba(0,0,0,0.12)';
        g.beginPath();
        g.ellipse(-8, -93, 9, 6, 0.1, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(8, -93, 9, 6, -0.1, 0, Math.PI * 2);
        g.fill();
        // 黑色不规则条纹
        g.strokeStyle = c.grain || '#2a2a26';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, -103); g.lineTo(0, -54);
        g.stroke();
        g.beginPath();
        g.moveTo(-16, -99); g.quadraticCurveTo(-8, -91, -3, -95); g.stroke();
        g.beginPath();
        g.moveTo(-14, -93); g.quadraticCurveTo(-6, -85, -2, -87); g.stroke();
        g.beginPath();
        g.moveTo(16, -99); g.quadraticCurveTo(8, -91, 3, -95); g.stroke();
        g.beginPath();
        g.moveTo(14, -93); g.quadraticCurveTo(6, -85, 2, -87); g.stroke();
        g.lineWidth = 1.4;
        for (let i = 0; i < 3; i++) {
            const ly = -75 + i * 8;
            g.beginPath();
            g.moveTo(-8, ly); g.quadraticCurveTo(0, ly + 2, 8, ly);
            g.stroke();
        }
        g.beginPath();
        g.moveTo(-15, -85); g.quadraticCurveTo(-11, -69, -9, -57); g.stroke();
        g.beginPath();
        g.moveTo(15, -85); g.quadraticCurveTo(11, -69, 9, -57); g.stroke();
        g.beginPath(); g.moveTo(-6, -67); g.lineTo(-10, -61); g.stroke();
        g.beginPath(); g.moveTo(6, -67); g.lineTo(10, -61); g.stroke();
        // 肩部缝合线
        g.lineWidth = 1.2;
        g.setLineDash([3, 2]);
        g.beginPath();
        g.moveTo(-18, -103); g.quadraticCurveTo(0, -109, 18, -103);
        g.stroke();
        g.beginPath();
        g.moveTo(-16, -97); g.quadraticCurveTo(0, -101, 16, -97);
        g.stroke();
        g.setLineDash([]);
        // 绷带覆盖右肩到右胸（后臂侧 = 负x）
        g.fillStyle = c.branch || '#e8e4d8';
        g.beginPath();
        g.moveTo(-20, -107);
        g.quadraticCurveTo(-12, -111, -4, -107);
        g.lineTo(-3, -93);
        g.quadraticCurveTo(-12, -95, -19, -93);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(180,170,150,0.6)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) {
            const yy = -105 + i * 5;
            g.beginPath();
            g.moveTo(-19, yy); g.quadraticCurveTo(-12, yy - 2, -4, yy);
            g.stroke();
        }
        // 白色束腰
        g.fillStyle = c.branch || '#e8e4d8';
        g.fillRect(-16, -50, 32, 6);
        g.strokeStyle = 'rgba(0,0,0,0.2)';
        g.lineWidth = 1;
        g.strokeRect(-16, -50, 32, 6);
        // 腰带垂带
        g.fillStyle = c.branch || '#e8e4d8';
        g.beginPath();
        g.moveTo(-4, -44); g.lineTo(-2, -24); g.lineTo(2, -24); g.lineTo(4, -44);
        g.closePath();
        g.fill();
    }
    if (c.id === 'yuji') {
        // 前期高专连帽校服：肩颈红风帽堆叠 + 拉链中线 + 风帽抽绳
        const hoodC = c.hoodColor || '#b8241a';
        // 风帽堆叠主体（披在颈后与双肩的厚重红布）
        g.fillStyle = hoodC;
        g.beginPath();
        g.moveTo(-19, -104);
        g.quadraticCurveTo(-14, -112, 0, -113);
        g.quadraticCurveTo(14, -112, 19, -104);
        g.quadraticCurveTo(20, -97, 14, -94);
        g.quadraticCurveTo(7, -99, 0, -99);
        g.quadraticCurveTo(-7, -99, -14, -94);
        g.quadraticCurveTo(-20, -97, -19, -104);
        g.closePath();
        g.fill();
        // 风帽堆叠纹理阴影（两道）
        g.strokeStyle = 'rgba(110,20,14,0.75)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-15, -103);
        g.quadraticCurveTo(0, -108, 15, -103);
        g.stroke();
        g.beginPath();
        g.moveTo(-11, -98);
        g.quadraticCurveTo(0, -102, 11, -98);
        g.stroke();
        // 风帽亮缘高光
        g.strokeStyle = 'rgba(240,120,100,0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-16, -106);
        g.quadraticCurveTo(0, -111, 16, -106);
        g.stroke();
        // 胸前 V 领口（红衣内衬翻出）
        g.strokeStyle = '#c8321e';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-10, -98);
        g.lineTo(0, -86);
        g.lineTo(10, -98);
        g.stroke();
        // 拉链中线（自领口垂至下摆）
        g.strokeStyle = 'rgba(150,160,190,0.45)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -86);
        g.lineTo(0, -52);
        g.stroke();
        // 风帽抽绳（两根白绳垂于胸前，随动作微摆）
        const at4 = pose.animT || 0;
        g.strokeStyle = 'rgba(230,230,235,0.75)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-7, -96);
        g.quadraticCurveTo(-8 + Math.sin(at4 * 0.05) * 1.5, -86, -6, -76);
        g.stroke();
        g.beginPath();
        g.moveTo(7, -96);
        g.quadraticCurveTo(8 + Math.sin(at4 * 0.05 + 1.2) * 1.5, -86, 6, -76);
        g.stroke();
        // 抽绳小头
        g.fillStyle = 'rgba(230,230,235,0.85)';
        g.beginPath();
        g.arc(-6, -75, 1.2, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(6, -75, 1.2, 0, Math.PI * 2);
        g.fill();
        // 下摆罗纹束口（运动卫衣底边）
        g.strokeStyle = 'rgba(20,26,50,0.7)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-15, -52);
        g.quadraticCurveTo(0, -47, 15, -52);
        g.stroke();
    }
    if (c.id === 'yuji2') {
        // 新宿决战：颈间红色高领围拢（厚实环绕鼓团）+ 拉链中线 + 下摆束口
        const hoodC2 = c.hoodColor || '#c02418';
        g.fillStyle = hoodC2;
        g.beginPath();
        g.ellipse(0, -102, 19, 9, 0, 0, Math.PI * 2);
        g.fill();
        // 围拢三团鼓包（堆在颈后与两肩）
        g.beginPath();
        g.arc(-12, -106, 6.5, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(0, -108.5, 7, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(12, -106, 6.5, 0, Math.PI * 2);
        g.fill();
        // 鼓包间阴影纹
        g.strokeStyle = 'rgba(110,18,12,0.75)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-8, -110);
        g.quadraticCurveTo(-6, -104, -7, -98);
        g.stroke();
        g.beginPath();
        g.moveTo(7, -110);
        g.quadraticCurveTo(5, -104, 6, -98);
        g.stroke();
        g.beginPath();
        g.moveTo(-15, -99);
        g.quadraticCurveTo(0, -94, 15, -99);
        g.stroke();
        // 亮缘高光
        g.strokeStyle = 'rgba(240,110,90,0.5)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-14, -110);
        g.quadraticCurveTo(0, -115, 14, -110);
        g.stroke();
        // 拉链中线（自围拢下垂至下摆）
        g.strokeStyle = 'rgba(150,160,190,0.4)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -93);
        g.lineTo(0, -52);
        g.stroke();
        // 下摆束口
        g.strokeStyle = 'rgba(12,16,28,0.8)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-15, -52);
        g.quadraticCurveTo(0, -47, 15, -52);
        g.stroke();
    }
    if (c.id === 'gojo') {
        // 黑紫高领夹克：外翻高立领护住脖颈 + 紫缎面折痕反光 + 拉链中线 + 插手口袋
        // 高立领（领口外敞、上宽下窄）
        g.fillStyle = '#1d1728';
        g.beginPath();
        g.moveTo(-15, -114);
        g.lineTo(15, -114);
        g.lineTo(10, -90);
        g.lineTo(-10, -90);
        g.closePath();
        g.fill();
        // 领顶外翻边（紫色受光）
        g.strokeStyle = 'rgba(122,100,190,0.55)';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(-15, -113);
        g.lineTo(15, -113);
        g.stroke();
        // 立领前中缝（拉链开到领顶）
        g.strokeStyle = 'rgba(0,0,0,0.55)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.moveTo(0, -113);
        g.lineTo(0, -90);
        g.stroke();
        // 领侧紫折痕
        g.strokeStyle = 'rgba(122,100,190,0.35)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-11, -110);
        g.lineTo(-6, -94);
        g.stroke();
        g.beginPath();
        g.moveTo(11, -110);
        g.lineTo(6, -94);
        g.stroke();
        // 胸腹紫缎面斜折痕反光（参考立绘的斜向划痕高光）
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
        g.moveTo(0, -90);
        g.lineTo(0, -52);
        g.stroke();
        g.fillStyle = 'rgba(180,190,215,0.6)';
        g.fillRect(-1, -89, 2, 3.6);
        // 两侧插手口袋斜口
        g.strokeStyle = 'rgba(0,0,0,0.5)';
        g.lineWidth = 1.8;
        g.beginPath();
        g.moveTo(-14, -62);
        g.lineTo(-8, -56);
        g.stroke();
        g.beginPath();
        g.moveTo(14, -62);
        g.lineTo(8, -56);
        g.stroke();
        // 下摆
        g.strokeStyle = 'rgba(0,0,0,0.4)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-15, -56);
        g.quadraticCurveTo(0, -50, 15, -56);
        g.stroke();
    }
    if (c.id === 'gojo2') {
        // 便装：黑色紧身短袖T恤 + 浅灰宽松长裤 + 腰前藏青束带打结垂坠
        // 圆领口（露出锁骨肤色）
        g.fillStyle = c.skin;
        g.beginPath();
        g.moveTo(-9, -108);
        g.quadraticCurveTo(0, -99, 9, -108);
        g.quadraticCurveTo(0, -113, -9, -108);
        g.closePath();
        g.fill();
        // 领口包边
        g.strokeStyle = 'rgba(255,255,255,0.16)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-9, -108);
        g.quadraticCurveTo(0, -99, 9, -108);
        g.stroke();
        // 紧身衣肌肉线条（胸线 + 腹肌中线）
        g.strokeStyle = 'rgba(255,255,255,0.10)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-12, -88);
        g.quadraticCurveTo(-5, -84, -1, -87);
        g.stroke();
        g.beginPath();
        g.moveTo(12, -88);
        g.quadraticCurveTo(5, -84, 1, -87);
        g.stroke();
        g.beginPath();
        g.moveTo(0, -84);
        g.lineTo(0, -67);
        g.stroke();
        g.beginPath();
        g.moveTo(-8, -77);
        g.lineTo(-2, -76);
        g.stroke();
        g.beginPath();
        g.moveTo(8, -77);
        g.lineTo(2, -76);
        g.stroke();
        // 浅灰宽松长裤（腰胯段，T恤下摆之下）
        g.fillStyle = c.clothSub;
        g.beginPath();
        g.moveTo(-15.5, -63);
        g.lineTo(15.5, -63);
        g.lineTo(15, -46);
        g.quadraticCurveTo(0, -41, -15, -46);
        g.closePath();
        g.fill();
        // T恤下摆压在裤腰上
        g.fillStyle = c.cloth;
        g.beginPath();
        g.moveTo(-16, -67);
        g.quadraticCurveTo(0, -61, 16, -67);
        g.lineTo(16, -62);
        g.quadraticCurveTo(0, -56, -16, -62);
        g.closePath();
        g.fill();
        // 腰间藏青束带
        g.fillStyle = c.sashColor || '#2c3a68';
        g.fillRect(-15.5, -59, 31, 5);
        g.fillStyle = 'rgba(255,255,255,0.10)';
        g.fillRect(-15.5, -59, 31, 1.4);
        // 腰前打结 + 两条垂带
        g.fillStyle = c.sashColor || '#2c3a68';
        g.beginPath();
        g.arc(3, -56, 3.4, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = c.sashColor || '#2c3a68';
        g.lineWidth = 3;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(3, -54);
        g.quadraticCurveTo(6, -48, 5, -41);
        g.stroke();
        g.lineWidth = 2.4;
        g.beginPath();
        g.moveTo(1, -54);
        g.quadraticCurveTo(-1, -49, 0, -44);
        g.stroke();
        g.lineCap = 'butt';
    }
    if (c.id === 'megumi' || c.id === 'megumi2') {
        // 咒术高专制服（参考立绘）：高立领 + 领口单金扣 + 斜向剪裁缝线 + 束腰长上衣；觉醒版衣摆渗出影纹
        g.fillStyle = '#141a2e';
        g.beginPath();
        g.moveTo(-14, -112);
        g.lineTo(14, -112);
        g.lineTo(10, -90);
        g.lineTo(-10, -90);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(120,130,170,0.35)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-14, -110);
        g.lineTo(14, -110);
        g.stroke(); // 立领深色镶线
        // 领口单枚金扣（参考立绘喉前金扣）
        g.fillStyle = '#d8b862';
        g.beginPath();
        g.arc(5.5, -99, 1.7, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(255,244,200,0.8)';
        g.beginPath();
        g.arc(5, -99.6, 0.6, 0, Math.PI * 2);
        g.fill();
        // 斜向剪裁缝线（胸口与腰间两道，参考立绘上衣斜纹）
        g.strokeStyle = 'rgba(0,0,0,0.45)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-15, -84);
        g.quadraticCurveTo(-2, -80, 11, -76);
        g.stroke();
        g.beginPath();
        g.moveTo(-12, -66);
        g.quadraticCurveTo(2, -62, 14, -59);
        g.stroke();
        // 斜缝受光边（紧贴斜缝下方的微亮线）
        g.strokeStyle = 'rgba(120,130,170,0.25)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-15, -82.6);
        g.quadraticCurveTo(-2, -78.6, 11, -74.6);
        g.stroke();
        // 束腰长上衣下摆线
        g.strokeStyle = 'rgba(0,0,0,0.45)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-15, -56);
        g.quadraticCurveTo(0, -50, 15, -56);
        g.stroke();
        if (c.id === 'megumi2') {
            // 觉醒版：衣摆与肩头渗出影之咒力纹（黑影色，确定性相位，不闪烁）
            const at2 = pose.animT || 0;
            g.strokeStyle = 'rgba(10,8,20,' + (0.40 + Math.sin(at2 * 0.07) * 0.12).toFixed(3) + ')';
            g.lineWidth = 1.6;
            for (let i = 0; i < 3; i++) {
                const wx = -12 + i * 11,
                    ph = at2 * 0.06 + i * 2.1;
                g.beginPath();
                g.moveTo(wx, -50);
                g.quadraticCurveTo(wx + Math.sin(ph) * 5, -62, wx + Math.sin(ph + 1.2) * 7, -74);
                g.stroke();
            }
        }
    }
    if (c.id === 'okkotsu') {
        // 咒术高专白立领制服：高立领 + 深纹领缘 + 金扣中线 + 胸前佩刀背带
        // 高立领（盖住领口）
        g.fillStyle = '#eef1f6';
        g.beginPath();
        g.moveTo(-13, -111);
        g.lineTo(13, -111);
        g.lineTo(10, -93);
        g.lineTo(-10, -93);
        g.closePath();
        g.fill();
        // 领缘深纹线（白制服深色描边）
        g.strokeStyle = 'rgba(38,46,68,0.65)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(-13, -109);
        g.lineTo(13, -109);
        g.stroke();
        // 斜向前门线（左领口斜向右下的偏向开合——乙骨制服标志）
        g.strokeStyle = 'rgba(60,70,100,0.5)';
        g.lineWidth = 1.4;
        g.beginPath();
        g.moveTo(-7, -110);
        g.quadraticCurveTo(3, -104, 6, -95);
        g.lineTo(4, -52);
        g.stroke();
        // 前门线浅色缝线（白制服立体感）
        g.strokeStyle = 'rgba(200,210,228,0.5)';
        g.lineWidth = 0.8;
        g.beginPath();
        g.moveTo(-5.5, -109);
        g.quadraticCurveTo(4, -103.5, 7, -95);
        g.lineTo(5.5, -54);
        g.stroke();
        // 领口圆金扣（斜向开合顶端的金属扣）
        g.fillStyle = 'rgba(60,52,30,0.9)';
        g.beginPath();
        g.arc(4.5, -102, 2.8, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(206,182,116,0.95)';
        g.beginPath();
        g.arc(4.5, -102, 2.0, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = 'rgba(240,224,150,0.9)';
        g.beginPath();
        g.arc(3.8, -102.7, 0.7, 0, Math.PI * 2);
        g.fill();
        // 斜肩刀带（佩刀背带，左肩斜至右腰）
        g.strokeStyle = 'rgba(40,48,70,0.75)';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(-13, -104);
        g.lineTo(14, -62);
        g.stroke();
        g.strokeStyle = 'rgba(180,192,214,0.45)';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(-13, -104);
        g.lineTo(14, -62);
        g.stroke();
        // 带扣
        g.fillStyle = 'rgba(110,122,150,0.85)';
        g.fillRect(-2, -85, 4, 4);
        // 下摆阴影线（白制服柔化）
        g.strokeStyle = 'rgba(90,102,130,0.35)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(-15, -56);
        g.quadraticCurveTo(0, -50, 15, -56);
        g.stroke();
        // 腰间里香微光（咒力伴随——紫色微辉）
        const at3 = pose.animT || 0;
        g.strokeStyle = 'rgba(184,154,255,' + (0.10 + Math.sin(at3 * 0.06) * 0.05).toFixed(3) + ')';
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(-14, -54);
        g.quadraticCurveTo(-18 + Math.sin(at3 * 0.05) * 3, -68, -15, -82);
        g.stroke();
    }
}

/* ---------------- 攻击轨迹残影 ---------------- */
function drawAttackTrail(g, f, pose) {
    if (f.state !== 'attack' || pose.atkExt < 0.25) return;
    const c = f.c,
        peak = pose.atkExt;
    g.save();
    g.globalAlpha = peak * 0.35;
    g.strokeStyle = c.aura + '0.5)';
    g.lineWidth = 8 + peak * 10;
    g.lineCap = 'round';
    g.beginPath();
    const s = f.attackStep;
    const r = pose.armR;
    if (f.attackKind === 'light') {
        if (s === 1) { g.moveTo(r.elbow.x, r.elbow.y);
            g.lineTo(r.hand.x + 12, r.hand.y); } else if (s === 2) { g.arc(r.hand.x - 10, r.hand.y + 10, 42, -0.5, 1.2); } else if (s === 3) { g.moveTo(r.elbow.x, r.elbow.y + 10);
            g.quadraticCurveTo(r.hand.x - 10, r.hand.y - 20, r.hand.x + 18, r.hand.y - 10); }
    } else {
        g.arc(r.hand.x - 10, r.hand.y + 30, 56, -1.2, 0.4);
    }
    g.stroke();
    g.restore();
}

/* ---------------- 外部主入口 ---------------- */
export function drawFighter(g, f) {
    const c = f.c;
    const hurtTilt = f.state === 'hurt' ? -0.28 : (f.state === 'launched' ? -0.65 : 0);
    const koTilt = f.state === 'ko' ? -1.35 : 0;

    g.save();
    g.translate(f.x, f.y);
    // 影子
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.beginPath();
    g.ellipse(0, 6, 44 * (f.onGround ? 1 : 0.7), 9, 0, 0, Math.PI * 2);
    g.fill();

    // 咒力气焰
    if (!f.dead) {
        const auraA = 0.10 + (f.energy >= 100 ? 0.16 + Math.sin(f.animT * 0.3) * 0.06 : 0);
        const grd = g.createRadialGradient(0, -70, 10, 0, -70, 120);
        grd.addColorStop(0, c.aura + (auraA + 0.10) + ')');
        grd.addColorStop(1, c.aura + '0)');
        g.fillStyle = grd;
        g.beginPath();
        g.arc(0, -70, 120, 0, Math.PI * 2);
        g.fill();
        if (f.energy >= 100) {
            for (let i = 0; i < 3; i++) {
                const a = f.animT * 0.05 + i * 2.1;
                g.fillStyle = c.aura + '0.5)';
                g.beginPath();
                g.arc(Math.cos(a) * 46, -70 + Math.sin(a * 1.3) * 56, 3, 0, Math.PI * 2);
                g.fill();
            }
        }
    }

    // 闪避残影
    if (f.state === 'dodge' && f.st % 6 < 3) {
        g.save();
        g.globalAlpha = 0.25;
        g.translate(-f.dodgeDir * 22, 0);
        drawBody(g, f, c, hurtTilt, koTilt);
        g.restore();
    }

    drawBody(g, f, c, hurtTilt, koTilt);
    g.restore();

    // 受击白闪
    if (f.flashT > 0 && f.flashT % 4 < 2) {
        g.save();
        g.globalAlpha = 0.35;
        g.fillStyle = '#fff';
        g.beginPath();
        g.arc(f.x, f.cy, 64, 0, Math.PI * 2);
        g.fill();
        g.restore();
    }
}

function drawBody(g, f, c, hurtTilt, koTilt) {
    const pose = computePose(f);
    pose.animT = f.animT; // 给绘制函数用

    g.save();
    g.scale(f.facing, 1);
    g.rotate(hurtTilt + koTilt + pose.bodyTilt + pose.bodyRot);
    g.translate(0, pose.bodyY + 84);
    if (f.state === 'dodge') g.globalAlpha = 0.45;
    if (f.state === 'ko') g.globalAlpha = 0.85;

    // 左腿（在身体下层）
    const lw = (c.style === 'muscular' || c.style === 'ocean' || c.style === 'toji' || c.style === 'ryu') ? 15 : 13;
    const legCol = c.legColor || c.clothSub;
    const pantsCol = c.pants || legCol;
    limb(g, pose.hipL.x, pose.hipL.y, (pose.hipL.x + pose.legL.knee.x) / 2, pose.legL.knee.y - 4, pose.legL.knee.x, pose.legL.knee.y, pantsCol, lw);
    limb(g, pose.legL.knee.x, pose.legL.knee.y, (pose.legL.knee.x + pose.legL.foot.x) / 2, (pose.legL.knee.y + pose.legL.foot.y) / 2, pose.legL.foot.x, pose.legL.foot.y, pantsCol, lw - 2);
    foot(g, pose.legL.foot.x, pose.legL.foot.y, c.shoeColor || '#0c0f18');
    // 陀艮：左腿绷带缠绕纹理
    if (c.style === 'ocean') {
        g.strokeStyle = 'rgba(160,120,70,0.5)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const tt = 0.15 + i * 0.2;
            const bx = pose.hipL.x + (pose.legL.knee.x - pose.hipL.x) * tt;
            const by = pose.hipL.y + (pose.legL.knee.y - pose.hipL.y) * tt;
            g.beginPath();
            g.moveTo(bx - 7, by - 1);
            g.lineTo(bx + 7, by + 1);
            g.stroke();
        }
        for (let i = 0; i < 3; i++) {
            const tt = 0.2 + i * 0.25;
            const bx = pose.legL.knee.x + (pose.legL.foot.x - pose.legL.knee.x) * tt;
            const by = pose.legL.knee.y + (pose.legL.foot.y - pose.legL.knee.y) * tt;
            g.beginPath();
            g.moveTo(bx - 6, by - 1);
            g.lineTo(bx + 6, by + 1);
            g.stroke();
        }
    }

    // 躯干
    drawTorso(g, c, pose);

    // 右腿（在身体前层，抬腿攻击时不被躯干遮挡）
    limb(g, pose.hipR.x, pose.hipR.y, (pose.hipR.x + pose.legR.knee.x) / 2, pose.legR.knee.y - 4, pose.legR.knee.x, pose.legR.knee.y, pantsCol, lw);
    limb(g, pose.legR.knee.x, pose.legR.knee.y, (pose.legR.knee.x + pose.legR.foot.x) / 2, (pose.legR.knee.y + pose.legR.foot.y) / 2, pose.legR.foot.x, pose.legR.foot.y, pantsCol, lw - 2);
    foot(g, pose.legR.foot.x, pose.legR.foot.y, c.shoeColor || '#0c0f18');
    // 陀艮：右腿绷带缠绕纹理
    if (c.style === 'ocean') {
        g.strokeStyle = 'rgba(160,120,70,0.5)';
        g.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
            const tt = 0.15 + i * 0.2;
            const bx = pose.hipR.x + (pose.legR.knee.x - pose.hipR.x) * tt;
            const by = pose.hipR.y + (pose.legR.knee.y - pose.hipR.y) * tt;
            g.beginPath();
            g.moveTo(bx - 7, by - 1);
            g.lineTo(bx + 7, by + 1);
            g.stroke();
        }
        for (let i = 0; i < 3; i++) {
            const tt = 0.2 + i * 0.25;
            const bx = pose.legR.knee.x + (pose.legR.foot.x - pose.legR.knee.x) * tt;
            const by = pose.legR.knee.y + (pose.legR.foot.y - pose.legR.knee.y) * tt;
            g.beginPath();
            g.moveTo(bx - 6, by - 1);
            g.lineTo(bx + 6, by + 1);
            g.stroke();
        }
    }

    // 攻击轨迹
    drawAttackTrail(g, f, pose);

    // 宿傩真身：第二对下臂（主臂下层，肤色裸臂 + 黑色臂环咒印）
    if (c.id === 'sukuna' && pose.armL2) {
        const aw2 = 11;
        const armBand = (sx, sy, ex2, ey2, tt, wRad) => {
            const bx = sx + (ex2 - sx) * tt,
                by = sy + (ey2 - sy) * tt;
            let nx = -(ey2 - sy),
                ny = ex2 - sx;
            const nl = Math.hypot(nx, ny) || 1;
            nx /= nl;
            ny /= nl;
            g.strokeStyle = c.markings || '#17171c';
            g.lineWidth = 3;
            g.beginPath();
            g.moveTo(bx - nx * wRad, by - ny * wRad);
            g.lineTo(bx + nx * wRad, by + ny * wRad);
            g.stroke();
        };
        pose.sukunaBand = armBand; // 主臂咒印复用
        limb(g, pose.shoulderL2.x, pose.shoulderL2.y, pose.armL2.elbow.x, pose.armL2.elbow.y, pose.armL2.hand.x, pose.armL2.hand.y, c.skin, aw2);
        joint(g, pose.armL2.hand.x, pose.armL2.hand.y, 6.5, c.skin);
        armBand(pose.shoulderL2.x, pose.shoulderL2.y, pose.armL2.elbow.x, pose.armL2.elbow.y, 0.55, aw2 / 2 + 1);
        limb(g, pose.shoulderR2.x, pose.shoulderR2.y, pose.armR2.elbow.x, pose.armR2.elbow.y, pose.armR2.hand.x, pose.armR2.hand.y, c.skin, aw2);
        joint(g, pose.armR2.hand.x, pose.armR2.hand.y, 6.5, c.skin);
        armBand(pose.shoulderR2.x, pose.shoulderR2.y, pose.armR2.elbow.x, pose.armR2.elbow.y, 0.55, aw2 / 2 + 1);
    }

    // 后臂
    const aw = (c.style === 'muscular' || c.style === 'ocean' || c.style === 'toji' || c.style === 'ryu') ? 13 : 11;
    // 真人：变身态灰白肌臂，人形裸臂；臂环绘制器（人形黑布环 / 变身态前臂护甲）
    const mhT = c.id === 'mahito' && pose.mahitoTransformed;
    const armCol = mhT ? (c.transformedColor || '#b8c2d2') : (c.armColor || c.cloth);
    const handCol = mhT ? (c.transformedColor || '#b8c2d2') : (c.gloveColor || c.skin);
    const mhBand = c.id === 'mahito' ? (sx, sy, ex2, ey2, tt, wRad, col, bw) => {
        const bx = sx + (ex2 - sx) * tt,
            by = sy + (ey2 - sy) * tt;
        let nx = -(ey2 - sy),
            ny = ex2 - sx;
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl;
        ny /= nl;
        g.strokeStyle = col;
        g.lineWidth = bw;
        g.beginPath();
        g.moveTo(bx - nx * wRad, by - ny * wRad);
        g.lineTo(bx + nx * wRad, by + ny * wRad);
        g.stroke();
    } : null;
    limb(g, pose.shoulderL.x, pose.shoulderL.y, pose.armL.elbow.x, pose.armL.elbow.y, pose.armL.hand.x, pose.armL.hand.y, armCol, aw);
    if (c.sleeveCap) {
        // 短袖套口：肩部一小段T恤袖
        g.strokeStyle = c.cloth;
        g.lineWidth = aw + 3;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(pose.shoulderL.x, pose.shoulderL.y);
        g.lineTo(pose.shoulderL.x + (pose.armL.elbow.x - pose.shoulderL.x) * 0.3, pose.shoulderL.y + (pose.armL.elbow.y - pose.shoulderL.y) * 0.3);
        g.stroke();
        g.lineCap = 'butt';
    }
    joint(g, pose.armL.hand.x, pose.armL.hand.y, 7, handCol);
    if (c.id === 'sukunaMegumi') {
        g.strokeStyle = '#171a20';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(pose.shoulderL.x + (pose.armL.elbow.x - pose.shoulderL.x) * 0.48, pose.shoulderL.y + (pose.armL.elbow.y - pose.shoulderL.y) * 0.48);
        g.lineTo(pose.shoulderL.x + (pose.armL.elbow.x - pose.shoulderL.x) * 0.7, pose.shoulderL.y + (pose.armL.elbow.y - pose.shoulderL.y) * 0.7);
        g.stroke();
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(pose.armL.elbow.x + (pose.armL.hand.x - pose.armL.elbow.x) * 0.68, pose.armL.elbow.y + (pose.armL.hand.y - pose.armL.elbow.y) * 0.68);
        g.lineTo(pose.armL.elbow.x + (pose.armL.hand.x - pose.armL.elbow.x) * 0.84, pose.armL.elbow.y + (pose.armL.hand.y - pose.armL.elbow.y) * 0.84);
        g.stroke();
    }
    if (mhBand) {
        if (mhT) mhBand(pose.armL.elbow.x, pose.armL.elbow.y, pose.armL.hand.x, pose.armL.hand.y, 0.45, aw / 2 + 1, '#2a3244', 7);
        else mhBand(pose.shoulderL.x, pose.shoulderL.y, pose.armL.elbow.x, pose.armL.elbow.y, 0.42, aw / 2 + 1.5, '#20202a', 5);
    }
    if (c.id === 'sukuna' && pose.sukunaBand) {
        // 主臂黑色咒印环：上臂环带 + 腕部黑带
        pose.sukunaBand(pose.shoulderL.x, pose.shoulderL.y, pose.armL.elbow.x, pose.armL.elbow.y, 0.5, aw / 2 + 1);
        pose.sukunaBand(pose.armL.elbow.x, pose.armL.elbow.y, pose.armL.hand.x, pose.armL.hand.y, 0.78, aw / 2);
    }
    if (c.id === 'hanami') {
        // 绷带后臂：白色覆盖 + 缠带横纹（与选人界面一致）
        g.strokeStyle = c.branch || '#e8e4d8';
        g.lineWidth = aw;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(pose.shoulderL.x, pose.shoulderL.y);
        g.quadraticCurveTo(pose.armL.elbow.x, pose.armL.elbow.y, pose.armL.hand.x, pose.armL.hand.y);
        g.stroke();
        // 缠带横纹
        g.strokeStyle = 'rgba(180,170,150,0.6)';
        g.lineWidth = 1.5;
        const sl = pose.shoulderL, el = pose.armL.elbow, hd = pose.armL.hand;
        for (let i = 0; i < 5; i++) {
            const tt = 0.1 + i * 0.18;
            const bx = sl.x + (el.x - sl.x) * tt;
            const by = sl.y + (el.y - sl.y) * tt;
            g.beginPath();
            g.moveTo(bx - 6, by - 2);
            g.lineTo(bx + 6, by + 2);
            g.stroke();
        }
        for (let i = 0; i < 3; i++) {
            const tt = 0.2 + i * 0.25;
            const bx = el.x + (hd.x - el.x) * tt;
            const by = el.y + (hd.y - el.y) * tt;
            g.beginPath();
            g.moveTo(bx - 6, by - 2);
            g.lineTo(bx + 6, by + 2);
            g.stroke();
        }
        // 绷带手
        g.fillStyle = c.branch || '#e8e4d8';
        g.beginPath();
        g.arc(pose.armL.hand.x, pose.armL.hand.y, 7, 0, Math.PI * 2);
        g.fill();
        g.lineCap = 'butt';
        // 黑色爪子（双手）
        g.strokeStyle = '#1a0a08';
        g.lineWidth = 2;
        g.lineCap = 'round';
        const hxL = pose.armL.hand.x, hyL = pose.armL.hand.y;
        for (let i = -1; i <= 1; i++) {
            g.beginPath();
            g.moveTo(hxL + i * 3, hyL - 6);
            g.lineTo(hxL + i * 4, hyL - 14);
            g.stroke();
        }
        g.lineCap = 'butt';
    }

    // 前臂 + 武器
    limb(g, pose.shoulderR.x, pose.shoulderR.y, pose.armR.elbow.x, pose.armR.elbow.y, pose.armR.hand.x, pose.armR.hand.y, armCol, aw);
    if (c.id === 'sukunaMegumi') {
        g.strokeStyle = '#171a20';
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(pose.shoulderR.x + (pose.armR.elbow.x - pose.shoulderR.x) * 0.48, pose.shoulderR.y + (pose.armR.elbow.y - pose.shoulderR.y) * 0.48);
        g.lineTo(pose.shoulderR.x + (pose.armR.elbow.x - pose.shoulderR.x) * 0.7, pose.shoulderR.y + (pose.armR.elbow.y - pose.shoulderR.y) * 0.7);
        g.stroke();
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(pose.armR.elbow.x + (pose.armR.hand.x - pose.armR.elbow.x) * 0.68, pose.armR.elbow.y + (pose.armR.hand.y - pose.armR.elbow.y) * 0.68);
        g.lineTo(pose.armR.elbow.x + (pose.armR.hand.x - pose.armR.elbow.x) * 0.84, pose.armR.elbow.y + (pose.armR.hand.y - pose.armR.elbow.y) * 0.84);
        g.stroke();
    }
    if (c.sleeveCap) {
        g.strokeStyle = c.cloth;
        g.lineWidth = aw + 3;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(pose.shoulderR.x, pose.shoulderR.y);
        g.lineTo(pose.shoulderR.x + (pose.armR.elbow.x - pose.shoulderR.x) * 0.3, pose.shoulderR.y + (pose.armR.elbow.y - pose.shoulderR.y) * 0.3);
        g.stroke();
        g.lineCap = 'butt';
    }
    if (c.wrapColor) {
        // 右前臂皮革缠带护具（肘到腕，带束带横线）
        const wx0 = pose.armR.elbow.x, wy0 = pose.armR.elbow.y;
        const wx1 = pose.armR.hand.x, wy1 = pose.armR.hand.y;
        g.strokeStyle = c.wrapColor;
        g.lineWidth = aw + 1;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(wx0 + (wx1 - wx0) * 0.18, wy0 + (wy1 - wy0) * 0.18);
        g.lineTo(wx0 + (wx1 - wx0) * 0.78, wy0 + (wy1 - wy0) * 0.78);
        g.stroke();
        g.strokeStyle = 'rgba(60,36,20,0.8)';
        g.lineWidth = 1.4;
        const wnx = -(wy1 - wy0), wny = (wx1 - wx0);
        const wnl = Math.hypot(wnx, wny) || 1;
        for (let wi = 1; wi <= 3; wi++) {
            const wt = 0.16 + wi * 0.17;
            const wcx = wx0 + (wx1 - wx0) * wt, wcy = wy0 + (wy1 - wy0) * wt;
            g.beginPath();
            g.moveTo(wcx - wnx / wnl * (aw / 2 + 1), wcy - wny / wnl * (aw / 2 + 1));
            g.lineTo(wcx + wnx / wnl * (aw / 2 + 1), wcy + wny / wnl * (aw / 2 + 1));
            g.stroke();
        }
        g.lineCap = 'butt';
    }
    joint(g, pose.armR.hand.x, pose.armR.hand.y, 7, handCol);
    if (mhBand) {
        if (mhT) mhBand(pose.armR.elbow.x, pose.armR.elbow.y, pose.armR.hand.x, pose.armR.hand.y, 0.45, aw / 2 + 1, '#2a3244', 7);
        else mhBand(pose.shoulderR.x, pose.shoulderR.y, pose.armR.elbow.x, pose.armR.elbow.y, 0.42, aw / 2 + 1.5, '#20202a', 5);
    }
    if (c.id === 'sukuna' && pose.sukunaBand) {
        pose.sukunaBand(pose.shoulderR.x, pose.shoulderR.y, pose.armR.elbow.x, pose.armR.elbow.y, 0.5, aw / 2 + 1);
        pose.sukunaBand(pose.armR.elbow.x, pose.armR.elbow.y, pose.armR.hand.x, pose.armR.hand.y, 0.78, aw / 2);
    }
    if (c.id === 'hanami') {
        // 黑色爪子（前臂手）
        g.strokeStyle = '#1a0a08';
        g.lineWidth = 2;
        g.lineCap = 'round';
        const hxR = pose.armR.hand.x, hyR = pose.armR.hand.y;
        for (let i = -1; i <= 1; i++) {
            g.beginPath();
            g.moveTo(hxR + i * 3, hyR - 6);
            g.lineTo(hxR + i * 4, hyR - 14);
            g.stroke();
        }
        g.lineCap = 'butt';
    }
    if (c.weapon && !pose.hideWeapon && (c.weapon === 'katana' || c.weapon === 'sword' || c.weapon === 'blade' || c.weapon === 'umbrella')) {
        const handRot = Math.atan2(pose.armR.hand.y - pose.armR.elbow.y, pose.armR.hand.x - pose.armR.elbow.x);
        drawWeapon(g, c, pose.armR.hand.x, pose.armR.hand.y, handRot + 0.25, pose.atkExt);
    }

    // 咒力聚光
    if (pose.auraBoost > 0.2) {
        g.fillStyle = c.aura + '0.75)';
        g.beginPath();
        g.arc(pose.armR.hand.x, pose.armR.hand.y, 12 * pose.auraBoost, 0, Math.PI * 2);
        g.fill();
    }

    // 五条悟：技能专属双色咒力核（苍蓝/赫红/茈红蓝合一）
    if (pose.gojoSkill) {
        const cast = pose.gojoCast || 0,
            rel = pose.gojoRel || 0;
        const rh = pose.armR.hand,
            lh = pose.armL.hand;
        const fade = 1 - rel; // 释放后逐渐消散
        const chB = 1 + (pose.gojoCharge || 0) * 0.9; // 蓄力增大倍率
        if (pose.gojoSkill === 'skill1' && fade > 0.05) {
            gojoOrb(g, rh.x + 8, rh.y, (5 + cast * 9) * chB * fade, '#7fd4ff', 'rgba(30,110,214,0)');
        } else if (pose.gojoSkill === 'skill2' && fade > 0.05) {
            gojoOrb(g, rh.x + 8, rh.y, (5 + cast * 10) * chB * fade, '#ff6a4a', 'rgba(180,30,20,0)');
        } else if (pose.gojoSkill === 'skill3' && fade > 0.05) {
            // 苍赫双核随蓄力向双掌中点汇聚，融合为紫
            const mx = (rh.x + lh.x) / 2 + 10,
                my = (rh.y + lh.y) / 2;
            const bx = lerp(rh.x + 6, mx, cast),
                by = lerp(rh.y, my, cast);
            const rx = lerp(lh.x + 6, mx, cast),
                ry = lerp(lh.y, my, cast);
            gojoOrb(g, bx, by, (4 + cast * 6) * chB * fade, '#7fd4ff', 'rgba(30,110,214,0)');
            gojoOrb(g, rx, ry, (4 + cast * 6) * chB * fade, '#ff6a4a', 'rgba(180,30,20,0)');
            if (cast > 0.85) gojoOrb(g, mx, my, (6 + cast * 8) * chB * fade, '#d8c8ff', 'rgba(140,80,220,0)');
        }
        // 蓄满提示：手部白色脉冲光环
        if ((pose.gojoCharge || 0) >= 1 && fade > 0.05) {
            const cat = pose.animT || 0;
            g.strokeStyle = `rgba(255,255,255,${0.5 + Math.sin(cat * 0.4) * 0.3})`;
            g.lineWidth = 2.5;
            g.beginPath();
            g.arc(rh.x + 8, rh.y, 20 + Math.sin(cat * 0.25) * 3, 0, Math.PI * 2);
            g.stroke();
        }
    }

    // 五条悟：无量空处结印白蓝辉光
    if (pose.gojoUlt > 0.2) {
        const p = pose.gojoUlt;
        const mx = (pose.armL.hand.x + pose.armR.hand.x) / 2,
            my = (pose.armL.hand.y + pose.armR.hand.y) / 2;
        gojoOrb(g, mx, my, 8 + p * 14, '#e8f6ff', 'rgba(120,200,255,0)');
        g.globalAlpha = p * 0.5;
        g.strokeStyle = '#bfe8ff';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(mx, my, 16 + p * 10 + Math.sin((pose.animT || 0) * 0.3) * 3, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
    }

    // 宿傩：技能专属赤色刃光/焰核
    if (pose.sukunaSkill) {
        const cast = pose.sukunaCast || 0,
            rel = pose.sukunaRel || 0;
        const rh = pose.armR.hand,
            lh = pose.armL.hand;
        const fade = 1 - rel; // 释放后逐渐消散
        if (pose.sukunaSkill === 'skill1' && fade > 0.05) {
            // 解：手际凝聚的细长咒力刃（随蓄力拔长，挥出时前倾）
            g.save();
            g.translate(rh.x, rh.y);
            g.rotate(-0.5 + rel * 1.6);
            g.globalAlpha = (0.35 + cast * 0.6) * fade;
            g.strokeStyle = '#ff6d8d';
            g.lineWidth = 3.5;
            g.beginPath();
            g.moveTo(0, -8 - cast * 26);
            g.quadraticCurveTo(7 + cast * 5, -cast * 10, 0, 10);
            g.stroke();
            g.strokeStyle = '#ffffff';
            g.lineWidth = 1.4;
            g.beginPath();
            g.moveTo(0, -6 - cast * 22);
            g.lineTo(0, 8);
            g.stroke();
            g.restore();
            g.globalAlpha = 1;
        } else if (pose.sukunaSkill === 'skill2' && fade > 0.05) {
            // 捌：双手各凝赤红咒力核
            gojoOrb(g, rh.x, rh.y, (4 + cast * 7) * fade, '#ff8ca6', 'rgba(200,20,60,0)');
            gojoOrb(g, lh.x, lh.y, (3 + cast * 6) * fade, '#ff8ca6', 'rgba(200,20,60,0)');
        } else if (pose.sukunaSkill === 'skill3' && fade > 0.05) {
            // 灶·开：后手引火成矢，焰核内芯炎白
            gojoOrb(g, rh.x + 6, rh.y, (5 + cast * 10) * fade, '#ffb35c', 'rgba(220,90,20,0)');
            if (cast > 0.5) gojoOrb(g, rh.x + 6, rh.y, (2 + cast * 4) * fade, '#ffe45c', 'rgba(255,180,60,0)');
        }
    }

    // 宿傩：伏魔御厨子结印黑赤瘴气
    if (pose.sukunaUlt > 0.2) {
        const p = pose.sukunaUlt;
        const mx = (pose.armL.hand.x + pose.armR.hand.x) / 2,
            my = (pose.armL.hand.y + pose.armR.hand.y) / 2;
        gojoOrb(g, mx, my, 7 + p * 12, '#ffd9e2', 'rgba(255,77,109,0)');
        g.globalAlpha = p * 0.5;
        g.strokeStyle = '#ff4d6d';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(mx, my, 14 + p * 10 + Math.sin((pose.animT || 0) * 0.3) * 3, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
    }

    // 伏黑惠：技能专属影之咒力核（手心影核 + 足下影池）
    if (pose.megSkill) {
        const cast = pose.megCast || 0,
            rel = pose.megRel || 0;
        const rh = pose.armR.hand,
            lh = pose.armL.hand;
        const fade = 1 - rel; // 释放后逐渐消散
        const k = pose.megSkill,
            v2 = pose.megVer2;
        // 足下影池：随蓄力扩张（十种影法术的影媒介）
        if (cast > 0.1 && fade > 0.05) {
            g.fillStyle = 'rgba(8,5,20,' + (0.40 * cast * fade).toFixed(3) + ')';
            g.beginPath();
            g.ellipse(14, 2, 30 + cast * 26, 6 + cast * 3, 0, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = 'rgba(115,95,255,' + (0.35 * cast * fade).toFixed(3) + ')';
            g.lineWidth = 1.6;
            g.beginPath();
            g.ellipse(14, 2, 30 + cast * 26, 6 + cast * 3, 0, 0, Math.PI * 2);
            g.stroke();
        }
        if (k === 'skill1' && fade > 0.05) {
            // 玉犬（·浑）：按地手心凝影核
            shadowOrb(g, rh.x, rh.y + 4, (4 + cast * 9) * fade, v2 ? 'rgba(106,92,255,0)' : 'rgba(143,123,255,0)');
        } else if (k === 'skill2' && fade > 0.05) {
            if (!v2) {
                // 鵺：指天手尖凝雷光
                gojoOrb(g, rh.x, rh.y - 4, (3 + cast * 7) * fade, '#ffe45c', 'rgba(220,170,40,0)');
            } else {
                // 大蛇：双掌各凝青紫影核
                shadowOrb(g, rh.x, rh.y, (4 + cast * 7) * fade, 'rgba(95,200,140,0)');
                shadowOrb(g, lh.x, lh.y, (3 + cast * 6) * fade, 'rgba(115,95,255,0)');
            }
        } else if (k === 'skill3' && fade > 0.05) {
            if (!v2) {
                // 脱兔：低伏双手间影核 + 释放时后方速度线
                shadowOrb(g, rh.x, rh.y, (3 + cast * 6) * fade, 'rgba(232,236,255,0)');
                if (rel > 0.05) {
                    g.strokeStyle = 'rgba(232,236,255,' + (0.45 * fade).toFixed(3) + ')';
                    g.lineWidth = 2;
                    for (let i = 0; i < 3; i++) {
                        g.beginPath();
                        g.moveTo(-30 - i * 14, -40 - i * 16);
                        g.lineTo(-58 - i * 16, -40 - i * 16);
                        g.stroke();
                    }
                }
            } else {
                // 不知井底：高举双手间凝聚井影核
                const mx = (rh.x + lh.x) / 2,
                    my = (rh.y + lh.y) / 2 - 6;
                shadowOrb(g, mx, my, (5 + cast * 10) * fade, 'rgba(115,95,255,0)');
                if (cast > 0.6) {
                    g.globalAlpha = (cast - 0.6) / 0.4 * fade * 0.5;
                    g.strokeStyle = '#8f7bff';
                    g.lineWidth = 1.4;
                    g.beginPath();
                    g.arc(mx, my, 12 + cast * 8, 0, Math.PI * 2);
                    g.stroke();
                    g.globalAlpha = 1;
                }
            }
        }
    }

    // 伏黑惠：召唤仪式——按地手印下的影池与影核
    if (pose.megUlt > 0.2) {
        const p = pose.megUlt;
        g.fillStyle = 'rgba(8,5,20,' + (0.55 * p).toFixed(3) + ')';
        g.beginPath();
        g.ellipse(20, 2, 44 * p + 16, 8 * p + 3, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = 'rgba(143,123,255,' + (0.5 * p).toFixed(3) + ')';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(20, 2, 44 * p + 16, 8 * p + 3, 0, 0, Math.PI * 2);
        g.stroke();
        shadowOrb(g, pose.armR.hand.x, pose.armR.hand.y, 6 + p * 10, 'rgba(143,123,255,0)');
    }

    // 伏黑惠·觉醒：嵌合暗翳庭结印影核
    if (pose.megUlt2 > 0.2) {
        const p = pose.megUlt2;
        const mx = (pose.armL.hand.x + pose.armR.hand.x) / 2,
            my = (pose.armL.hand.y + pose.armR.hand.y) / 2;
        shadowOrb(g, mx, my, 7 + p * 13, 'rgba(115,95,255,0)');
        g.globalAlpha = p * 0.5;
        g.strokeStyle = '#8f7bff';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(mx, my, 15 + p * 10 + Math.sin((pose.animT || 0) * 0.3) * 3, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
        // 足下影漫延
        g.fillStyle = 'rgba(8,5,20,' + (0.45 * p).toFixed(3) + ')';
        g.beginPath();
        g.ellipse(0, 2, 52 * p + 12, 8 * p + 3, 0, 0, Math.PI * 2);
        g.fill();
    }

    // 虎杖悠仁：技能专属咒力拳压/踢击轨迹
    if (pose.yujiSkill) {
        const cast = pose.yujiCast || 0,
            rel = pose.yujiRel || 0;
        const rh = pose.armR.hand;
        const fade = 1 - rel;
        if (pose.yujiSkill === 'skill1' && fade > 0.05) {
            // 径庭拳：拳心咒力压缩核（橙红）
            gojoOrb(g, rh.x + 6, rh.y, (4 + cast * 8) * fade, '#ffb38a', 'rgba(200,50,30,0)');
            if (rel > 0.1) {
                // 突进速度线
                g.strokeStyle = 'rgba(255,179,138,' + (0.5 * fade).toFixed(3) + ')';
                g.lineWidth = 2.5;
                for (let i = 0; i < 3; i++) {
                    g.beginPath();
                    g.moveTo(rh.x - 30 - i * 16, rh.y - 8 + i * 8);
                    g.lineTo(rh.x - 56 - i * 18, rh.y - 8 + i * 8);
                    g.stroke();
                }
            }
        } else if (pose.yujiSkill === 'skill2' && fade > 0.05) {
            // 卍字踢：足尖咒力缠绕弧光
            const rf = pose.legR.foot;
            gojoOrb(g, rf.x + 4, rf.y, (3 + cast * 7) * fade, '#ffb38a', 'rgba(200,50,30,0)');
            if (rel > 0.05) {
                g.strokeStyle = 'rgba(255,122,92,' + (0.55 * fade).toFixed(3) + ')';
                g.lineWidth = 3;
                g.beginPath();
                g.arc(rf.x, rf.y, 24 + cast * 14, -1.2, 1.8);
                g.stroke();
            }
        }
    }

    // 虎杖悠仁：黑闪五连击必杀——拳压黑红闪电
    if (pose.yujiUlt > 0.2) {
        const p = pose.yujiUlt;
        const rh = pose.armR.hand,
            lh = pose.armL.hand;
        // 咒力核跟随当前出拳的手（终结一击双手同时爆发），与判定同步脉动
        const hands = pose.yujiUltRight === null ? [rh, lh] : [pose.yujiUltRight ? rh : lh];
        for (const h of hands) {
            gojoOrb(g, h.x, h.y, 6 + p * 10, '#ff2b2b', 'rgba(80,0,0,0)');
            g.globalAlpha = p * 0.4;
            g.strokeStyle = '#ff2b2b';
            g.lineWidth = 2;
            g.beginPath();
            g.arc(h.x, h.y, 12 + p * 8 + Math.sin((pose.animT || 0) * 0.4) * 3, 0, Math.PI * 2);
            g.stroke();
            g.globalAlpha = 1;
        }
    }

    // 虎杖悠仁·决意：技能专属特效（黑闪拳压/穿血血液核/灵魂解斩击线）
    if (pose.yuji2Skill) {
        const cast = pose.yuji2Cast || 0,
            rel = pose.yuji2Rel || 0;
        const rh = pose.armR.hand;
        const fade = 1 - rel;
        if (pose.yuji2Skill === 'skill1' && fade > 0.05) {
            // 黑闪：拳心黑红咒力核 + 闪电弧线
            gojoOrb(g, rh.x + 6, rh.y, (5 + cast * 10) * fade, '#ff2b2b', 'rgba(20,0,0,0)');
            if (cast > 0.4) {
                g.strokeStyle = 'rgba(26,26,46,' + (0.6 * fade).toFixed(3) + ')';
                g.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    g.beginPath();
                    g.moveTo(rh.x + rand(-10, 10), rh.y + rand(-10, 10));
                    g.lineTo(rh.x + rand(-30, 30), rh.y + rand(-30, 30));
                    g.stroke();
                }
            }
        } else if (pose.yuji2Skill === 'skill2' && fade > 0.05) {
            // 穿血：双手间血液凝聚核
            const lh = pose.armL.hand;
            const mx = (rh.x + lh.x) / 2 + 8, my = (rh.y + lh.y) / 2;
            gojoOrb(g, mx, my, (4 + cast * 8) * fade, '#8a0012', 'rgba(138,0,18,0)');
        } else if (pose.yuji2Skill === 'skill3' && fade > 0.05) {
            // 灵魂解：手掌蓝白斩击线
            g.strokeStyle = 'rgba(200,232,255,' + (0.6 * fade).toFixed(3) + ')';
            g.lineWidth = 2.5;
            g.beginPath();
            g.moveTo(rh.x - 20, rh.y - 16);
            g.lineTo(rh.x + 24, rh.y + 12);
            g.stroke();
            if (rel > 0.1) {
                g.strokeStyle = 'rgba(255,255,255,' + (0.4 * fade).toFixed(3) + ')';
                g.beginPath();
                g.moveTo(rh.x + 10, rh.y - 20);
                g.lineTo(rh.x + 40, rh.y + 8);
                g.stroke();
            }
        }
    }

    // 虎杖悠仁·决意：领域展开结印——黑红+蓝白双色辉光
    if (pose.yuji2Ult > 0.2) {
        const p = pose.yuji2Ult;
        const mx = (pose.armL.hand.x + pose.armR.hand.x) / 2,
            my = (pose.armL.hand.y + pose.armR.hand.y) / 2;
        gojoOrb(g, mx, my, 7 + p * 12, '#c8e8ff', 'rgba(200,232,255,0)');
        g.globalAlpha = p * 0.45;
        g.strokeStyle = '#ff2b2b';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(mx, my, 14 + p * 10 + Math.sin((pose.animT || 0) * 0.3) * 3, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = '#c8e8ff';
        g.beginPath();
        g.arc(mx, my, 10 + p * 7, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
    }

    // 乙骨忧太：技能专属特效（里香巨腕/咒言声波/里香冲击波蓄力）
    if (pose.okkotsuSkill) {
        const cast = pose.okkotsuCast || 0,
            rel = pose.okkotsuRel || 0;
        const rh = pose.armR.hand;
        const fade = 1 - rel;
        const at = pose.animT || 0;
        if (pose.okkotsuSkill === 'skill1' && fade > 0.05) {
            // 里香·铁拳：黑紫怨灵巨臂从背后裂隙探出横扫
            const armAlpha = Math.min(cast * 1.5, 1) * fade * 0.9;
            drawRika(g, -14, -20 + rel * 6, 1, armAlpha, 'arm', at);
            // 拳风轨迹（释放时三道前冲风线）
            if (rel > 0.05) {
                g.strokeStyle = 'rgba(184,154,255,' + (0.55 * fade).toFixed(3) + ')';
                g.lineWidth = 3;
                g.beginPath();
                g.arc(rh.x + 10, rh.y, 24 + rel * 22, -1.0, 1.4);
                g.stroke();
                g.strokeStyle = 'rgba(123,232,216,' + (0.4 * fade).toFixed(3) + ')';
                g.lineWidth = 1.8;
                for (let i = 0; i < 3; i++) {
                    g.beginPath();
                    g.moveTo(rh.x - 20, rh.y - 14 + i * 12);
                    g.lineTo(rh.x + 34 + rel * 26, rh.y - 18 + i * 14);
                    g.stroke();
                }
            }
            // 蓄力期：乙骨手中咒力凝聚
            if (cast < 1) gojoOrb(g, rh.x + 6, rh.y - 4, (3 + cast * 6) * fade, '#b89aff', 'rgba(184,154,255,0)');
        } else if (pose.okkotsuSkill === 'skill2' && fade > 0.05) {
            // 术式模仿·咒言：喉部聚音环 + 前方锥形声波纹
            const lh = pose.armL.hand;
            const mx = (rh.x + lh.x) / 2, my = (rh.y + lh.y) / 2;
            // 喉部聚音（青翠能量汇聚到口部）
            const hy = pose.headY - pose.bodyY + 8;
            gojoOrb(g, 6, hy, (2 + cast * 5) * fade, '#7be8d8', 'rgba(123,232,216,0)');
            // 双手结印咒力核
            gojoOrb(g, mx, my, (3 + cast * 6) * fade, '#7be8d8', 'rgba(123,232,216,0)');
            // 声波同心弧（蓄力后期向前方展开）
            if (cast > 0.4) {
                g.globalAlpha = (cast - 0.4) * 1.6 * fade * 0.5;
                g.strokeStyle = '#7be8d8';
                g.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    g.beginPath();
                    g.arc(10, hy, 12 + i * 10 + cast * 10 + rel * 24, -0.7, 0.7);
                    g.stroke();
                }
                // 咒言符文小环（狗卷术式模仿的印记）
                g.strokeStyle = '#b89aff';
                g.lineWidth = 1.4;
                g.beginPath();
                g.arc(6, hy, 8 + Math.sin(at * 0.3) * 2, 0, Math.PI * 2);
                g.stroke();
                g.globalAlpha = 1;
            }
        } else if (pose.okkotsuSkill === 'skill3' && fade > 0.05) {
            // 里香·冲击波：里香上半身从乙骨背后升起，裂口中凝聚能量
            const upperAlpha = Math.min(cast * 1.3, 1) * fade * 0.85;
            drawRika(g, -18, 16, 1, upperAlpha, 'upper', at);
            // 口中能量核（对准里香裂口位置：绘制原点(-18,16)+嘴部(0,-88)）
            const bx = -18, by = 16 - 88;
            gojoOrb(g, bx, by, (4 + cast * 11) * fade, '#b89aff', 'rgba(184,154,255,0)');
            if (cast > 0.5) gojoOrb(g, bx, by, (2 + cast * 5) * fade, '#e8d8ff', 'rgba(232,216,255,0)');
            // 能量向口中汇聚的吸入线
            if (cast > 0.3 && rel < 0.1) {
                g.strokeStyle = 'rgba(184,154,255,' + (0.4 * cast).toFixed(3) + ')';
                g.lineWidth = 1.4;
                for (let i = 0; i < 4; i++) {
                    const ang = at * 0.15 + i * 1.6;
                    g.beginPath();
                    g.moveTo(bx + Math.cos(ang) * 30, by + Math.sin(ang) * 26);
                    g.lineTo(bx + Math.cos(ang) * 12, by + Math.sin(ang) * 10);
                    g.stroke();
                }
            }
            // 发射瞬间：口前冲击环
            if (rel > 0.05 && rel < 0.5) {
                g.globalAlpha = (0.5 - rel) * 2 * 0.6;
                g.strokeStyle = '#e8d8ff';
                g.lineWidth = 3;
                g.beginPath();
                g.arc(bx + 30, by, 14 + rel * 40, -0.9, 0.9);
                g.stroke();
                g.globalAlpha = 1;
            }
        }
    }

    // 乙骨忧太：领域展开——里香完全显现 + 刀剑悬浮 + 双色辉光
    if (pose.okkotsuUlt > 0.2) {
        const p = pose.okkotsuUlt;
        const at = pose.animT || 0;
        // 里香完全显现（守护在乙骨身后）
        drawRika(g, -8, 24, 1, p * 0.75, 'giant', at);
        // 真赝相爱：周围悬浮刀剑剪影（插满刀剑的领域意象）
        g.save();
        g.globalAlpha = p * 0.7;
        for (let i = 0; i < 6; i++) {
            const ang = i * 1.05 - 0.5,
                dist = 70 + (i % 3) * 24,
                sx = Math.cos(ang) * dist,
                sy = -70 + Math.sin(ang) * 56 + Math.sin(at * 0.06 + i * 1.3) * 5,
                srot = -0.5 + i * 0.22;
            g.save();
            g.translate(sx, sy);
            g.rotate(srot);
            // 刀身剪影
            const bg = g.createLinearGradient(0, -20, 0, 16);
            bg.addColorStop(0, i % 2 ? 'rgba(184,154,255,0.85)' : 'rgba(123,232,216,0.85)');
            bg.addColorStop(1, 'rgba(232,240,255,0.25)');
            g.strokeStyle = bg;
            g.lineWidth = 2.6;
            g.beginPath();
            g.moveTo(0, -20);
            g.lineTo(0, 14);
            g.stroke();
            // 护手与刀尖
            g.strokeStyle = 'rgba(232,240,255,0.7)';
            g.lineWidth = 1.6;
            g.beginPath();
            g.moveTo(-4, 10);
            g.lineTo(4, 10);
            g.stroke();
            g.beginPath();
            g.moveTo(0, -20);
            g.lineTo(1.6, -25);
            g.stroke();
            g.restore();
        }
        g.restore();
        // 结印辉光
        const mx = (pose.armL.hand.x + pose.armR.hand.x) / 2,
            my = (pose.armL.hand.y + pose.armR.hand.y) / 2;
        gojoOrb(g, mx, my, 7 + p * 12, '#7be8d8', 'rgba(123,232,216,0)');
        g.globalAlpha = p * 0.45;
        g.strokeStyle = '#b89aff';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(mx, my, 14 + p * 10 + Math.sin(at * 0.3) * 3, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = '#7be8d8';
        g.beginPath();
        g.arc(mx, my, 10 + p * 7, 0, Math.PI * 2);
        g.stroke();
        // 金戒共鸣光环（乙骨左手无名指——与里香的链接）
        g.strokeStyle = 'rgba(255,215,100,' + (p * 0.55).toFixed(3) + ')';
        g.lineWidth = 1.8;
        g.beginPath();
        g.arc(pose.armL.hand.x, pose.armL.hand.y, 5 + Math.sin(at * 0.2) * 1.5, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
    }

    // 真人：技能专属特效（腕刃变形/拨体吐出/遍杀即灵体变身）
    if (pose.mahitoSkill) {
        const cast = pose.mahitoCast || 0, rel = pose.mahitoRel || 0;
        const rh = pose.armR.hand;
        const fade = 1 - rel;
        const at = pose.animT || 0;
        if (pose.mahitoSkill === 'skill1' && fade > 0.05) {
            // 无为转变·腕刃：右臂膨胀变形为巨刃
            const bladeAlpha = Math.min(cast * 1.5, 1) * fade;
            g.save();
            g.globalAlpha = bladeAlpha * 0.7;
            g.fillStyle = 'rgba(168,216,255,0.4)';
            g.strokeStyle = 'rgba(122,170,208,0.8)';
            g.lineWidth = 2;
            // 巨刃形状（从手臂延伸）
            g.beginPath();
            g.moveTo(rh.x - 10, rh.y + 8);
            g.quadraticCurveTo(rh.x + 20, rh.y - 15, rh.x + 55, rh.y - 8);
            g.quadraticCurveTo(rh.x + 70, rh.y - 4, rh.x + 60, rh.y + 6);
            g.quadraticCurveTo(rh.x + 30, rh.y + 14, rh.x - 5, rh.y + 14);
            g.closePath();
            g.fill();
            g.stroke();
            // 刃缘发光
            g.strokeStyle = 'rgba(200,230,255,' + (0.6 * fade).toFixed(3) + ')';
            g.lineWidth = 1.5;
            g.beginPath();
            g.moveTo(rh.x + 10, rh.y - 10);
            g.quadraticCurveTo(rh.x + 40, rh.y - 14, rh.x + 60, rh.y - 4);
            g.stroke();
            g.restore();
        } else if (pose.mahitoSkill === 'skill2' && fade > 0.05) {
            // 多重魂·拨体：双手间改造人能量核
            const lh = pose.armL.hand;
            const mx = (rh.x + lh.x) / 2, my = (rh.y + lh.y) / 2;
            gojoOrb(g, mx, my, (4 + cast * 8) * fade, '#d8a8c8', 'rgba(216,168,200,0)');
            if (cast > 0.4) {
                g.globalAlpha = (cast - 0.4) * 1.6 * fade * 0.5;
                g.strokeStyle = '#d8a8c8';
                g.lineWidth = 1.5;
                g.beginPath();
                g.arc(mx, my, 8 + cast * 10, 0, Math.PI * 2);
                g.stroke();
                g.globalAlpha = 1;
            }
        } else if (pose.mahitoSkill === 'skill3' && cast > 0.3) {
            // 遍杀即灵体：变身能量爆发光环
            const p = Math.min((cast - 0.3) / 0.7, 1);
            g.globalAlpha = p * fade * 0.5;
            g.strokeStyle = '#a8d8ff';
            g.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                g.beginPath();
                g.arc(0, -60, 20 + p * 30 + i * 12 + Math.sin(at * 0.2 + i) * 4, 0, Math.PI * 2);
                g.stroke();
            }
            g.globalAlpha = 1;
            gojoOrb(g, 0, -70, p * 20 * fade, 'rgba(168,216,255,0.5)', 'rgba(168,216,255,0)');
        }
    }

    // 真人：遍杀即灵体状态持续期间的身体变形渲染
    if (pose.mahitoTransformed) {
        const at = pose.animT || 0;
        const sway = Math.sin(at * 0.07);
        // 遍杀即灵体：背后黑色尖刺（沿背线向后放射）
        g.save();
        g.fillStyle = '#20283a';
        const spikes = [
            [-20, -102, -34, -112, -18, -94],
            [-21, -92, -37, -96, -19, -82],
            [-20, -80, -35, -78, -18, -70],
            [-18, -68, -31, -62, -16, -58]
        ];
        for (const [r1x, r1y, tx, ty, r2x, r2y] of spikes) {
            g.beginPath();
            g.moveTo(r1x, r1y);
            g.lineTo(tx + sway * 1.5, ty);
            g.lineTo(r2x, r2y);
            g.closePath();
            g.fill();
        }
        // 灰白长尾：从髋部后方延伸，随动画摆动、末端渐细
        const tc = c.transformedColor || '#b8c2d2';
        g.strokeStyle = tc;
        g.lineCap = 'round';
        const tx0 = -14, ty0 = -50;
        const midX = -38 + sway * 5, midY = -34 + sway * 3;
        const tipX = -58 + sway * 10, tipY = -8 + sway * 6;
        g.lineWidth = 9;
        g.beginPath();
        g.moveTo(tx0, ty0);
        g.quadraticCurveTo(-28, -46, midX, midY);
        g.stroke();
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(midX, midY);
        g.quadraticCurveTo(-50 + sway * 8, -22 + sway * 4, tipX, tipY);
        g.stroke();
        // 尾尖黑刺
        g.fillStyle = '#20283a';
        g.beginPath();
        g.moveTo(tipX + 3, tipY - 3);
        g.lineTo(tipX - 9 + sway * 2, tipY + 8);
        g.lineTo(tipX - 2, tipY + 3);
        g.closePath();
        g.fill();
        // 尾部分节纹
        g.strokeStyle = 'rgba(40,50,70,0.5)';
        g.lineWidth = 1.2;
        for (let i = 1; i <= 3; i++) {
            const tt = i / 4;
            const px = tx0 + (midX - tx0) * tt,
                py = ty0 + (midY - ty0) * tt;
            g.beginPath();
            g.moveTo(px - 3, py - 4);
            g.lineTo(px + 3, py + 4);
            g.stroke();
        }
        // 微弱脉冲光晕（变身态存在感）
        g.globalAlpha = 0.18 + Math.sin(at * 0.1) * 0.06;
        g.strokeStyle = '#a8d8ff';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(0, -80, 34, 48, 0, 0, Math.PI * 2);
        g.stroke();
        g.restore();
    }

    // 羂索：技能专属特效（咒灵操术黑紫咒力核/反重力上升弧纹/漩涡螺旋压缩）
    if (pose.kenSkill) {
        const cast = pose.kenCast || 0,
            rel = pose.kenRel || 0;
        const rh = pose.armR.hand,
            lh = pose.armL.hand;
        const fade = 1 - rel;
        const at = pose.animT || 0;
        if (pose.kenSkill === 'skill1' && fade > 0.05) {
            // 咒灵操术：指尖黑紫咒力核 + 三只环绕咒灵虚影（独眼）
            gojoOrb(g, rh.x + 4, rh.y, (4 + cast * 8) * fade, '#b88fd8', 'rgba(74,42,110,0)');
            g.globalAlpha = cast * fade * 0.55;
            g.strokeStyle = 'rgba(184,143,216,0.7)';
            g.lineWidth = 1.2;
            for (let i = 0; i < 3; i++) {
                const a = at * 0.12 + i * Math.PI * 2 / 3;
                const ox = rh.x + Math.cos(a) * (16 + cast * 10),
                    oy = rh.y + Math.sin(a) * (12 + cast * 7);
                g.fillStyle = '#2a1a3e';
                g.beginPath();
                g.ellipse(ox, oy, 5, 3.4, a, 0, Math.PI * 2);
                g.fill();
                g.stroke();
                g.fillStyle = '#e8d8ff';
                g.beginPath();
                g.arc(ox + Math.cos(a) * 2, oy, 1.1, 0, Math.PI * 2);
                g.fill();
            }
            g.globalAlpha = 1;
        } else if (pose.kenSkill === 'skill2' && fade > 0.05) {
            // 反重力机构：托天掌心青紫核 + 周身上升反重力弧纹
            gojoOrb(g, rh.x, rh.y - 4, (4 + cast * 9) * fade, '#9adcff', 'rgba(90,140,220,0)');
            if (rel > 0.05) {
                g.globalAlpha = fade * 0.5;
                g.strokeStyle = '#9adcff';
                g.lineWidth = 1.6;
                for (let i = 0; i < 4; i++) {
                    const py = -((at * 2.4 + i * 26) % 104);
                    g.beginPath();
                    g.arc(0, py - 20, 26 + i * 3, Math.PI * 0.15, Math.PI * 0.85, true);
                    g.stroke();
                }
                g.globalAlpha = 1;
            }
        } else if (pose.kenSkill === 'skill3' && fade > 0.05) {
            // 极之番「漩涡」：双掌间千咒压缩成旋转螺旋 + 炽白内核
            const mx = (rh.x + lh.x) / 2 + 6,
                my = (rh.y + lh.y) / 2;
            g.globalAlpha = (0.3 + cast * 0.6) * fade;
            g.strokeStyle = '#b88fd8';
            g.lineWidth = 2;
            const rot = at * 0.35;
            for (let s = 0; s < 3; s++) {
                g.beginPath();
                for (let j = 0; j <= 10; j++) {
                    const a = rot + s * Math.PI * 2 / 3 + j * 0.30;
                    const rr = (2 + j * 1.6) * (0.4 + cast * 0.8);
                    const px = mx + Math.cos(a) * rr,
                        py = my + Math.sin(a) * rr;
                    if (j === 0) g.moveTo(px, py);
                    else g.lineTo(px, py);
                }
                g.stroke();
            }
            g.globalAlpha = 1;
            gojoOrb(g, mx, my, (3 + cast * 6) * fade, '#efe0ff', 'rgba(184,143,216,0)');
            if (cast > 0.8) gojoOrb(g, mx, my, (2 + cast * 3) * fade, '#ffffff', 'rgba(232,216,255,0)');
        }
    }

    // 羂索：胎藏遍野法界定印——掌间黑紫咒核 + 身后胎藏曼荼罗双环光轮
    if (pose.kenUlt > 0.2) {
        const p = pose.kenUlt;
        const at = pose.animT || 0;
        const mx = (pose.armL.hand.x + pose.armR.hand.x) / 2,
            my = (pose.armL.hand.y + pose.armR.hand.y) / 2;
        // 身后曼荼罗光轮（金紫双环 + 八向辐条 + 缓转莲瓣）
        g.save();
        g.globalAlpha = p * 0.5;
        g.strokeStyle = '#c8a85a';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, -96, 40 + p * 14, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = '#b88fd8';
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(0, -96, 30 + p * 10, 0, Math.PI * 2);
        g.stroke();
        const rot = at * 0.02;
        for (let i = 0; i < 8; i++) {
            const a = rot + i * Math.PI / 4;
            g.beginPath();
            g.moveTo(Math.cos(a) * (30 + p * 10), -96 + Math.sin(a) * (30 + p * 10));
            g.lineTo(Math.cos(a) * (40 + p * 14), -96 + Math.sin(a) * (40 + p * 14));
            g.stroke();
        }
        g.globalAlpha = p * 0.35;
        g.fillStyle = 'rgba(184,143,216,0.5)';
        for (let i = 0; i < 8; i++) {
            const a = -rot + i * Math.PI / 4 + Math.PI / 8;
            const px = Math.cos(a) * (44 + p * 15),
                py = -96 + Math.sin(a) * (44 + p * 15);
            g.beginPath();
            g.ellipse(px, py, 7, 3.2, a, 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
        // 法界定印咒核
        gojoOrb(g, mx, my - 2, 7 + p * 12, '#e8d8ff', 'rgba(184,143,216,0)');
        g.globalAlpha = p * 0.5;
        g.strokeStyle = '#b88fd8';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(mx, my - 2, 14 + p * 9 + Math.sin(at * 0.3) * 3, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
    }

    // 花御：施法生机咒力——树根灌地绿光/掌心咒种孕育/头顶树鞠虚影
    if (pose.hanSkill) {
        const k = pose.hanSkill;
        const cast = pose.hanCast || 0;
        const rel = pose.hanRel || 0;
        const at = pose.animT || 0;
        const fade = 1 - rel * 0.8;
        if (k === 'skill1') {
            // 双掌灌注大地：掌心绿光 + 脚下生机咒力上涌
            gojoOrb(g, pose.armR.hand.x, pose.armR.hand.y, (4 + cast * 7) * fade, '#c8f0a0', 'rgba(143,232,123,0)');
            gojoOrb(g, pose.armL.hand.x, pose.armL.hand.y, (4 + cast * 6) * fade, '#c8f0a0', 'rgba(143,232,123,0)');
            g.save();
            g.globalAlpha = cast * 0.55 * fade;
            g.strokeStyle = '#8fe87b';
            g.lineWidth = 1.6;
            for (let i = 0; i < 5; i++) {
                const px = -30 + i * 15 + Math.sin(at * 0.2 + i * 2.1) * 3;
                const h = 10 + cast * 16 + Math.sin(at * 0.25 + i * 1.3) * 4;
                g.beginPath();
                g.moveTo(px, 0);
                g.quadraticCurveTo(px + 4, -h * 0.5, px - 2, -h);
                g.stroke();
            }
            g.restore();
        } else if (k === 'skill2') {
            // 掌心孕育咒种：暗红种核 + 缠绕绿色咒力丝
            const mx = pose.armR.hand.x,
                my = pose.armR.hand.y;
            gojoOrb(g, mx, my, (3 + cast * 6) * fade, '#d86a5a', 'rgba(140,50,40,0)');
            g.save();
            g.globalAlpha = (0.35 + cast * 0.4) * fade;
            g.strokeStyle = '#8fe87b';
            g.lineWidth = 1.3;
            g.beginPath();
            g.arc(mx, my, 8 + cast * 6 + Math.sin(at * 0.35) * 2, at * 0.15, at * 0.15 + Math.PI * 1.4);
            g.stroke();
            g.beginPath();
            g.arc(mx, my, 5 + cast * 4, -at * 0.2, -at * 0.2 + Math.PI * 1.2);
            g.stroke();
            g.restore();
        } else if (k === 'skill3') {
            // 头顶具现树鞠虚影：木球轮廓 + 缠枝光弧 + 花瓣环绕
            const bx = 30 + rel * 20,
                by = -150 - cast * 16 + Math.sin(at * 0.1) * 3;
            g.save();
            g.globalAlpha = cast * (1 - rel * 0.9);
            g.fillStyle = 'rgba(110,90,56,0.55)';
            g.beginPath();
            g.arc(bx, by, 6 + cast * 9, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = '#8fe87b';
            g.lineWidth = 1.4;
            g.beginPath();
            g.arc(bx, by, 9 + cast * 11, at * 0.1, at * 0.1 + Math.PI * 1.5);
            g.stroke();
            g.fillStyle = '#ef9ab8';
            for (let i = 0; i < 3; i++) {
                const a = at * 0.06 + i * Math.PI * 2 / 3;
                g.beginPath();
                g.ellipse(bx + Math.cos(a) * (12 + cast * 10), by + Math.sin(a) * (10 + cast * 8), 2.4, 1.3, a, 0, Math.PI * 2);
                g.fill();
            }
            g.restore();
        }
    }

    // 花御：领域展开·朵颐光海——身后巨花光轮 + 花瓣飘散 + 双掌生机辉光
    if (pose.hanUlt > 0.2) {
        const p = pose.hanUlt;
        const at = pose.animT || 0;
        g.save();
        // 身后巨花光轮：八瓣粉花缓转 + 绿色年轮环 + 金色花芯环
        g.globalAlpha = p * 0.45;
        const rot = at * 0.015;
        g.fillStyle = 'rgba(239,154,184,0.55)';
        for (let i = 0; i < 8; i++) {
            const a = rot + i * Math.PI / 4;
            const px = Math.cos(a) * (36 + p * 14),
                py = -96 + Math.sin(a) * (36 + p * 14);
            g.beginPath();
            g.ellipse(px, py, 16 + p * 6, 7, a, 0, Math.PI * 2);
            g.fill();
        }
        g.globalAlpha = p * 0.55;
        g.strokeStyle = '#8fe87b';
        g.lineWidth = 2;
        g.beginPath();
        g.arc(0, -96, 26 + p * 10, 0, Math.PI * 2);
        g.stroke();
        g.strokeStyle = 'rgba(255,228,92,0.7)';
        g.lineWidth = 1.2;
        g.beginPath();
        g.arc(0, -96, 16 + p * 7, 0, Math.PI * 2);
        g.stroke();
        // 飘散花瓣（上升+摇摆，确定相位防闪烁）
        g.fillStyle = '#f8c4d8';
        g.globalAlpha = p * 0.7;
        for (let i = 0; i < 7; i++) {
            const py = -30 - ((at * 1.2 + i * 26) % 130);
            const px = Math.sin(at * 0.07 + i * 1.9) * (26 + i * 3);
            g.beginPath();
            g.ellipse(px, py, 3, 1.6, at * 0.05 + i, 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
        // 双掌绿色生机辉光
        gojoOrb(g, pose.armL.hand.x, pose.armL.hand.y, 5 + p * 8, '#d8f8c0', 'rgba(143,232,123,0)');
        gojoOrb(g, pose.armR.hand.x, pose.armR.hand.y, 5 + p * 8, '#d8f8c0', 'rgba(143,232,123,0)');
    }

    // 漏瑚：施法熔火咒力——按地火舌/山口唤虫/引陨天火
    if (pose.jogSkill) {
        const k = pose.jogSkill;
        const cast = pose.jogCast || 0;
        const rel = pose.jogRel || 0;
        const at = pose.animT || 0;
        const fade = 1 - rel * 0.8;
        if (k === 'skill1') {
            // 按地掌心熔火核 + 地面窜升火舌
            gojoOrb(g, pose.armR.hand.x, pose.armR.hand.y, (4 + cast * 8) * fade, '#ffb060', 'rgba(255,106,42,0)');
            g.save();
            g.globalAlpha = cast * 0.6 * fade;
            g.strokeStyle = '#ff8a3c';
            g.lineWidth = 1.8;
            for (let i = 0; i < 5; i++) {
                const px = -26 + i * 14 + Math.sin(at * 0.22 + i * 1.7) * 3;
                const h = 8 + cast * 18 + Math.sin(at * 0.3 + i * 2.2) * 5;
                g.beginPath();
                g.moveTo(px, 0);
                g.quadraticCurveTo(px + 3, -h * 0.5, px - 2, -h);
                g.stroke();
            }
            g.restore();
        } else if (k === 'skill2') {
            // 头顶山口火星躁动 + 指令掌心咒核 + 声波指令弧
            g.save();
            g.globalAlpha = (0.4 + cast * 0.5) * fade;
            g.fillStyle = '#ffb060';
            for (let i = 0; i < 4; i++) {
                const py = -136 - ((at * 1.8 + i * 12) % 34) - cast * 8;
                const px = Math.sin(at * 0.25 + i * 1.9) * 6;
                g.beginPath();
                g.arc(px, py, 1.6 + (i % 2), 0, Math.PI * 2);
                g.fill();
            }
            g.restore();
            gojoOrb(g, pose.armR.hand.x, pose.armR.hand.y, (3 + cast * 5) * fade, '#ffd8a0', 'rgba(255,176,96,0)');
            if (rel > 0.1) {
                g.save();
                g.globalAlpha = (1 - rel) * 0.5;
                g.strokeStyle = '#ffd8a0';
                g.lineWidth = 1.5;
                for (let i = 0; i < 3; i++) {
                    g.beginPath();
                    g.arc(pose.armR.hand.x + 8, pose.armR.hand.y, 8 + i * 8 + rel * 14, -0.7, 0.7);
                    g.stroke();
                }
                g.restore();
            }
        } else if (k === 'skill3') {
            // 双掌承天熔火核 + 天际灼红辉光 + 上升热浪弧
            gojoOrb(g, pose.armR.hand.x, pose.armR.hand.y, (4 + cast * 9) * fade, '#ffb060', 'rgba(255,106,42,0)');
            gojoOrb(g, pose.armL.hand.x, pose.armL.hand.y, (4 + cast * 8) * fade, '#ffb060', 'rgba(255,106,42,0)');
            g.save();
            g.globalAlpha = cast * 0.45 * fade;
            const sk = g.createRadialGradient(0, -170, 10, 0, -170, 90);
            sk.addColorStop(0, 'rgba(255,150,60,0.6)');
            sk.addColorStop(1, 'rgba(255,90,30,0)');
            g.fillStyle = sk;
            g.beginPath();
            g.arc(0, -170, 90, 0, Math.PI * 2);
            g.fill();
            g.strokeStyle = 'rgba(255,150,60,0.55)';
            g.lineWidth = 1.6;
            for (let i = 0; i < 4; i++) {
                const py = -((at * 2.2 + i * 24) % 96);
                g.beginPath();
                g.arc(0, py - 30, 24 + i * 4, Math.PI * 0.2, Math.PI * 0.8, true);
                g.stroke();
            }
            g.restore();
        }
    }

    // 漏瑚：领域展开·盖棺铁围山——身后业火山轮 + 火星喷涌 + 结印熔核
    if (pose.jogUlt > 0.2) {
        const p = pose.jogUlt;
        const at = pose.animT || 0;
        const mx = (pose.armL.hand.x + pose.armR.hand.x) / 2,
            my = (pose.armL.hand.y + pose.armR.hand.y) / 2;
        g.save();
        // 身后铁围山业火光轮：外圈暗红山棱环 + 内圈灼金环
        g.globalAlpha = p * 0.5;
        g.strokeStyle = '#8f3a00';
        g.lineWidth = 3;
        g.beginPath();
        g.arc(0, -96, 42 + p * 14, 0, Math.PI * 2);
        g.stroke();
        // 环上山棱尖齿（铁围山围拢意象，缓转）
        g.fillStyle = 'rgba(143,58,0,0.7)';
        const rot = at * 0.015;
        for (let i = 0; i < 10; i++) {
            const a = rot + i * Math.PI / 5;
            const r0 = 42 + p * 14;
            g.beginPath();
            g.moveTo(Math.cos(a - 0.12) * r0, -96 + Math.sin(a - 0.12) * r0);
            g.lineTo(Math.cos(a) * (r0 + 10), -96 + Math.sin(a) * (r0 + 10));
            g.lineTo(Math.cos(a + 0.12) * r0, -96 + Math.sin(a + 0.12) * r0);
            g.closePath();
            g.fill();
        }
        g.globalAlpha = p * 0.55;
        g.strokeStyle = 'rgba(255,180,96,0.8)';
        g.lineWidth = 1.6;
        g.beginPath();
        g.arc(0, -96, 30 + p * 10, 0, Math.PI * 2);
        g.stroke();
        // 火星喷涌（自头顶山口冲天，确定相位防闪烁）
        g.fillStyle = '#ffb060';
        g.globalAlpha = p * 0.75;
        for (let i = 0; i < 8; i++) {
            const py = -132 - ((at * 2.6 + i * 22) % 110);
            const px = Math.sin(at * 0.09 + i * 2.3) * (10 + i * 2);
            g.beginPath();
            g.arc(px, py, 1.4 + (i % 3) * 0.8, 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
        // 结印熔火咒核
        gojoOrb(g, mx, my - 2, 7 + p * 12, '#ffd8a0', 'rgba(255,150,60,0)');
        g.globalAlpha = p * 0.5;
        g.strokeStyle = '#ff8a3c';
        g.lineWidth = 1.5;
        g.beginPath();
        g.arc(mx, my - 2, 14 + p * 8 + Math.sin(at * 0.3) * 3, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
    }

    // 直哉：施法投射咒法视觉——24帧刻度弧/定帧同步核/冻结晶格
    if (pose.naoSkill) {
        const k = pose.naoSkill;
        const cast = pose.naoCast || 0;
        const rel = pose.naoRel || 0;
        const at = pose.animT || 0;
        const fade = 1 - rel * 0.75;
        if (k === 'skill1') {
            // 身周24帧预演刻度弧（脑内分割一秒的表盘）
            g.save();
            g.globalAlpha = cast * 0.55 * fade;
            g.strokeStyle = '#d8e84a';
            g.lineWidth = 1.4;
            const r0 = 40 + cast * 8;
            const lit = Math.floor(cast * 24);
            for (let i = 0; i < 24; i++) {
                const a = -Math.PI / 2 + i * Math.PI / 12;
                const rr = i < lit ? r0 + 5 : r0;
                g.beginPath();
                g.moveTo(Math.cos(a) * r0, -78 + Math.sin(a) * r0);
                g.lineTo(Math.cos(a) * rr + Math.cos(a) * 4, -78 + Math.sin(a) * rr + Math.sin(a) * 4);
                g.stroke();
            }
            g.restore();
            // 释放时水平速度线（帧与帧之间没有过程）
            if (rel > 0.05) {
                g.save();
                g.globalAlpha = (1 - rel) * 0.6;
                g.strokeStyle = '#e8f0b0';
                g.lineWidth = 1.6;
                for (let i = 0; i < 5; i++) {
                    const ly = -110 + i * 16;
                    const ll = 30 + (i % 3) * 14 + rel * 20;
                    g.beginPath();
                    g.moveTo(-20 - ll, ly);
                    g.lineTo(-20, ly);
                    g.stroke();
                }
                g.restore();
            }
        } else if (k === 'skill2') {
            // 掌心同步咒核 + 定帧方框刻度（触碰即强制 1/24 秒同步）
            gojoOrb(g, pose.armR.hand.x, pose.armR.hand.y, (3 + cast * 6) * fade, '#f0f8c0', 'rgba(216,232,74,0)');
            g.save();
            g.globalAlpha = (0.35 + cast * 0.4) * fade;
            g.strokeStyle = '#d8e84a';
            g.lineWidth = 1.3;
            const hx = pose.armR.hand.x,
                hy = pose.armR.hand.y;
            const bs = 9 + cast * 5 + Math.sin(at * 0.3) * 1.5;
            g.strokeRect(hx - bs, hy - bs, bs * 2, bs * 2);
            // 旋转菱形刻度框
            g.save();
            g.translate(hx, hy);
            g.rotate(Math.PI / 4 + at * 0.04);
            g.strokeRect(-bs * 0.8, -bs * 0.8, bs * 1.6, bs * 1.6);
            g.restore();
            g.restore();
        } else if (k === 'skill3') {
            // 前方冻结空气晶格（六角冰晶三枚）+ 凝滞微粒收束
            g.save();
            g.globalAlpha = (0.3 + cast * 0.55) * fade;
            g.strokeStyle = '#c8e8e0';
            g.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                const cx = 78 + i * 26,
                    cy = -86 + (i % 2) * 22;
                const cr = 7 + cast * 5 + Math.sin(at * 0.25 + i * 2) * 1.5;
                g.beginPath();
                for (let j = 0; j < 6; j++) {
                    const a = j * Math.PI / 3 + at * 0.02;
                    if (j === 0) g.moveTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
                    else g.lineTo(cx + Math.cos(a) * cr, cy + Math.sin(a) * cr);
                }
                g.closePath();
                g.stroke();
            }
            // 凝滞微粒向晶格收束
            g.fillStyle = '#e8f8f0';
            for (let i = 0; i < 6; i++) {
                const ph = 1 - ((at * 0.02 + i * 0.17) % 1);
                const px = 100 + Math.cos(i * 1.05) * 46 * ph,
                    py = -82 + Math.sin(i * 1.05) * 40 * ph;
                g.beginPath();
                g.arc(px, py, 1.2 + ph, 0, Math.PI * 2);
                g.fill();
            }
            g.restore();
            // 掌心淡青咒核
            gojoOrb(g, pose.armR.hand.x, pose.armR.hand.y, (3 + cast * 5) * fade, '#d8f0e8', 'rgba(160,220,200,0)');
        }
    }

    // 直哉：领域展开·时胞月宫殿——身后满月光轮 + 24分割表盘 + 细胞粒子 + 结印咒核
    if (pose.naoUlt > 0.2) {
        const p = pose.naoUlt;
        const at = pose.animT || 0;
        const mx = (pose.armL.hand.x + pose.armR.hand.x) / 2,
            my = (pose.armL.hand.y + pose.armR.hand.y) / 2;
        g.save();
        // 身后巨大满月光晕
        g.globalAlpha = p * 0.45;
        const mg = g.createRadialGradient(0, -100, 6, 0, -100, 56 + p * 16);
        mg.addColorStop(0, 'rgba(240,244,200,0.9)');
        mg.addColorStop(0.7, 'rgba(216,232,74,0.35)');
        mg.addColorStop(1, 'rgba(216,232,74,0)');
        g.fillStyle = mg;
        g.beginPath();
        g.arc(0, -100, 56 + p * 16, 0, Math.PI * 2);
        g.fill();
        // 24分割表盘环（缓转）
        g.globalAlpha = p * 0.55;
        g.strokeStyle = '#d8e84a';
        g.lineWidth = 1.6;
        const dr = 44 + p * 12;
        g.beginPath();
        g.arc(0, -100, dr, 0, Math.PI * 2);
        g.stroke();
        const rot = at * 0.012;
        g.lineWidth = 1.2;
        for (let i = 0; i < 24; i++) {
            const a = rot + i * Math.PI / 12;
            g.beginPath();
            g.moveTo(Math.cos(a) * (dr - 5), -100 + Math.sin(a) * (dr - 5));
            g.lineTo(Math.cos(a) * dr, -100 + Math.sin(a) * dr);
            g.stroke();
        }
        // 快转秒针（一秒被24等分的具象）
        const ha = at * 0.26;
        g.strokeStyle = 'rgba(240,248,192,0.9)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, -100);
        g.lineTo(Math.cos(ha) * (dr - 10), -100 + Math.sin(ha) * (dr - 10));
        g.stroke();
        // 细胞六角粒子上升（术式对象细分化）
        g.strokeStyle = 'rgba(232,240,176,0.75)';
        g.lineWidth = 1;
        g.globalAlpha = p * 0.7;
        for (let i = 0; i < 6; i++) {
            const py = -34 - ((at * 1.4 + i * 24) % 120);
            const px = Math.sin(at * 0.06 + i * 2.1) * (22 + i * 4);
            const cr = 2.4 + (i % 3);
            g.beginPath();
            for (let j = 0; j < 6; j++) {
                const a = j * Math.PI / 3;
                if (j === 0) g.moveTo(px + Math.cos(a) * cr, py + Math.sin(a) * cr);
                else g.lineTo(px + Math.cos(a) * cr, py + Math.sin(a) * cr);
            }
            g.closePath();
            g.stroke();
        }
        g.restore();
        // 结印咒核（黄绿辉光）
        gojoOrb(g, mx, my - 2, 6 + p * 10, '#f0f8c0', 'rgba(216,232,74,0)');
        g.globalAlpha = p * 0.5;
        g.strokeStyle = '#d8e84a';
        g.lineWidth = 1.4;
        g.beginPath();
        g.arc(mx, my - 2, 12 + p * 8 + Math.sin(at * 0.3) * 3, 0, Math.PI * 2);
        g.stroke();
        g.globalAlpha = 1;
    }

    // 甚尔：特级咒具视觉（零咒力——钢铁与杀气的纯物理表现）
    if (pose.tojiSkill) {
        const cast = pose.tojiCast || 0,
            rel = pose.tojiRel || 0;
        const at = pose.animT || 0;
        const rh = pose.armR.hand,
            lh = pose.armL.hand;
        const hr = Math.atan2(rh.y - pose.armR.elbow.y, rh.x - pose.armR.elbow.x) + 0.25;
        if (pose.tojiSkill === 'skill1') {
            // 释魂刀：刀身泛起幽蓝魂刃光（无视硬度、直斩魂魄的具象）
            const glow = Math.min(1, cast * 1.2) * (1 - rel * 0.5);
            if (glow > 0.05) {
                g.save();
                g.translate(rh.x, rh.y);
                g.rotate(hr);
                g.globalAlpha = glow * 0.7;
                g.strokeStyle = '#8fb8f0';
                g.lineWidth = 7;
                g.beginPath();
                g.moveTo(4, -3);
                g.lineTo(70, -6);
                g.stroke();
                g.globalAlpha = glow * 0.9;
                g.strokeStyle = '#e8f0ff';
                g.lineWidth = 2.2;
                g.beginPath();
                g.moveTo(4, -3);
                g.lineTo(72, -6);
                g.stroke();
                // 魂光粒子沿刃逸散
                g.fillStyle = '#cfe0f8';
                for (let i = 0; i < 4; i++) {
                    const ph = (at * 0.05 + i * 0.25) % 1;
                    g.globalAlpha = glow * (1 - ph);
                    g.beginPath();
                    g.arc(12 + ph * 56, -6 - ph * 8, 1.4, 0, Math.PI * 2);
                    g.fill();
                }
                g.restore();
                g.globalAlpha = 1;
            }
        } else if (pose.tojiSkill === 'skill2') {
            // 天逆鉾：右手十手状短刃（主刃 + 双侧护钩 + 缠柄），刃尖青金解除辉光
            g.save();
            g.translate(rh.x, rh.y);
            g.rotate(hr);
            // 缠柄
            g.strokeStyle = '#5a4a3a';
            g.lineWidth = 5;
            g.beginPath();
            g.moveTo(-12, 2);
            g.lineTo(0, 0);
            g.stroke();
            // 主刃（暗金古铜）
            const bg = g.createLinearGradient(0, 0, 46, -3);
            bg.addColorStop(0, '#8a7a5a');
            bg.addColorStop(1, '#e8d8a8');
            g.strokeStyle = bg;
            g.lineWidth = 4;
            g.beginPath();
            g.moveTo(0, 0);
            g.lineTo(46, -3);
            g.stroke();
            // 双侧护钩
            g.strokeStyle = '#c8b888';
            g.lineWidth = 2.4;
            g.beginPath();
            g.moveTo(6, -1);
            g.quadraticCurveTo(14, -10, 20, -12);
            g.stroke();
            g.beginPath();
            g.moveTo(6, 1);
            g.quadraticCurveTo(14, 8, 20, 10);
            g.stroke();
            // 刃尖解除辉光（释放期）
            if (rel > 0.05) {
                g.globalAlpha = (1 - rel) * 0.8;
                g.fillStyle = '#7be8d8';
                g.beginPath();
                g.arc(46, -3, 5 + rel * 6, 0, Math.PI * 2);
                g.fill();
                g.strokeStyle = '#7be8d8';
                g.lineWidth = 1.6;
                g.beginPath();
                g.arc(46, -3, 10 + rel * 22, 0, Math.PI * 2);
                g.stroke();
            }
            g.restore();
            g.globalAlpha = 1;
        } else if (pose.tojiSkill === 'skill3') {
            // 游云：三节棍（右手节 + 链摆中节 + 左手节），乱舞残影
            const lhr = Math.atan2(lh.y - pose.armL.elbow.y, lh.x - pose.armL.elbow.x) + 0.25;
            const sw = Math.sin(at * 0.9); // 与轮转姿势同相位
            const mx = (rh.x + lh.x) / 2 + sw * 30,
                my = (rh.y + lh.y) / 2 - 24 - Math.abs(sw) * 16;
            const seg = (x1, y1, a, len) => {
                g.save();
                g.translate(x1, y1);
                g.rotate(a);
                const sg = g.createLinearGradient(0, 0, len, 0);
                sg.addColorStop(0, '#2a2e36');
                sg.addColorStop(0.5, '#6a7482');
                sg.addColorStop(1, '#2a2e36');
                g.strokeStyle = sg;
                g.lineWidth = 6;
                g.lineCap = 'round';
                g.beginPath();
                g.moveTo(0, 0);
                g.lineTo(len, 0);
                g.stroke();
                // 节端金属箍
                g.fillStyle = '#9aa8b8';
                g.beginPath();
                g.arc(len, 0, 2.4, 0, Math.PI * 2);
                g.fill();
                g.restore();
            };
            seg(rh.x, rh.y, hr, 34);
            seg(lh.x, lh.y, lhr + Math.PI, 34);
            // 链条连接（两手节端 → 中节两端）
            const rex = rh.x + Math.cos(hr) * 34,
                rey = rh.y + Math.sin(hr) * 34;
            const lex = lh.x + Math.cos(lhr + Math.PI) * 34,
                ley = lh.y + Math.sin(lhr + Math.PI) * 34;
            g.strokeStyle = 'rgba(154,168,184,0.8)';
            g.lineWidth = 1.6;
            g.setLineDash([3, 3]);
            g.beginPath();
            g.moveTo(rex, rey);
            g.lineTo(mx - 17, my);
            g.moveTo(lex, ley);
            g.lineTo(mx + 17, my);
            g.stroke();
            g.setLineDash([]);
            // 中节（横摆）
            seg(mx - 17, my, sw * 0.5, 34);
            // 乱舞残影弧（释放期）
            if (rel > 0.05 && rel < 0.95) {
                g.globalAlpha = 0.35;
                g.strokeStyle = '#dce8f8';
                g.lineWidth = 3;
                g.beginPath();
                g.arc(0, -80, 62, at * 0.5, at * 0.5 + 1.6);
                g.stroke();
                g.globalAlpha = 0.2;
                g.beginPath();
                g.arc(0, -80, 74, -at * 0.4, -at * 0.4 + 1.2);
                g.stroke();
                g.globalAlpha = 1;
            }
        }
    }

    // 甚尔必杀展开：天与咒缚·杀戮本能——黑银杀气自足下炸开
    if (pose.tojiUlt > 0.2) {
        const p = pose.tojiUlt;
        const at = pose.animT || 0;
        g.save();
        // 足下杀气冲击环
        g.globalAlpha = p * 0.5;
        g.strokeStyle = '#c8d4e8';
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(0, -2, 40 + p * 30 + Math.sin(at * 0.3) * 6, 10 + p * 6, 0, 0, Math.PI * 2);
        g.stroke();
        // 身周黑银气浪（向上撕裂状）
        g.strokeStyle = 'rgba(154,168,184,0.9)';
        g.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
            const a = i * 0.9 + at * 0.05;
            const bx = Math.cos(a) * 34;
            const ph = (at * 0.03 + i * 0.14) % 1;
            g.globalAlpha = p * (1 - ph) * 0.6;
            g.beginPath();
            g.moveTo(bx, -20 - ph * 90);
            g.quadraticCurveTo(bx + Math.sin(a) * 8, -46 - ph * 90, bx + Math.sin(a) * 4, -66 - ph * 90);
            g.stroke();
        }
        // 猩红杀气眼焰
        g.globalAlpha = p * 0.85;
        g.fillStyle = '#ff4a4a';
        g.beginPath();
        g.arc(-7, pose.headY - 84 - pose.bodyY + 2, 2.6, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.arc(8, pose.headY - 84 - pose.bodyY + 2, 2.6, 0, Math.PI * 2);
        g.fill();
        g.restore();
    }

    // 甚尔杀戮本能持续形态：暗银气丝 + 赤眼残光 + 足下尘环（霸体全程可视）
    if (pose.tojiSlaughter && !(pose.tojiUlt > 0.2)) {
        const at = pose.animT || 0;
        const pulse = Math.sin(at * 0.14) * 0.08;
        g.save();
        // 暗银杀气外廓
        g.globalAlpha = 0.26 + pulse;
        g.strokeStyle = '#aab8c8';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(0, -70, 32 + Math.sin(at * 0.09) * 4, 58 + Math.cos(at * 0.07) * 4, 0, 0, Math.PI * 2);
        g.stroke();
        // 上升的黑银气丝
        g.strokeStyle = 'rgba(154,168,184,0.7)';
        g.lineWidth = 1.4;
        for (let i = 0; i < 5; i++) {
            const ph = (at * 0.02 + i * 0.2) % 1;
            const px = Math.sin(at * 0.05 + i * 1.9) * 24;
            g.globalAlpha = (1 - ph) * 0.45;
            g.beginPath();
            g.moveTo(px, -30 - ph * 80);
            g.quadraticCurveTo(px + 5, -44 - ph * 80, px - 2, -58 - ph * 80);
            g.stroke();
        }
        // 赤眼残光
        g.globalAlpha = 0.55 + pulse * 2;
        g.fillStyle = '#ff5a5a';
        g.beginPath();
        g.ellipse(-7, pose.headY - 84 - pose.bodyY + 2, 3.4, 1.8, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(8, pose.headY - 84 - pose.bodyY + 2, 3.4, 1.8, 0, 0, Math.PI * 2);
        g.fill();
        // 足下尘环
        g.globalAlpha = 0.2 + pulse;
        g.strokeStyle = '#8a94a2';
        g.lineWidth = 1.6;
        g.beginPath();
        g.ellipse(0, -2, 30 + Math.sin(at * 0.11) * 5, 7, 0, 0, Math.PI * 2);
        g.stroke();
        g.restore();
        g.globalAlpha = 1;
    }

    // 石流龙：施法咒力放出视觉——飞机头炮口蓝色聚束核 + 收束光环 + 释放冲击
    if (pose.ryuSkill) {
        const cast = pose.ryuCast || 0;
        const rel = pose.ryuRel || 0;
        const at = pose.animT || 0;
        const fade = 1 - rel * 0.75;
        // 炮口位置：随头部旋转同步（头心 + 旋转后的炮口偏移）
        const hr = pose.headRot || 0;
        const hy = pose.headY - 84 - pose.bodyY;
        const mzx = Math.cos(hr) * 38 - Math.sin(hr) * (-13);
        const mzy = hy + Math.sin(hr) * 38 + Math.cos(hr) * (-13);
        // 炮口聚束咒力核（蓝色）
        gojoOrb(g, mzx, mzy, (3 + cast * 9) * fade, '#9ad0ff', 'rgba(90,168,255,0)');
        g.save();
        // 收束光环（向炮口收敛）
        g.strokeStyle = 'rgba(90,168,255,0.75)';
        g.lineWidth = 1.6;
        for (let i = 0; i < 3; i++) {
            const ph = 1 - ((at * 0.06 + i * 0.34) % 1);
            g.globalAlpha = cast * (1 - ph) * 0.7 * fade;
            g.beginPath();
            g.arc(mzx, mzy, 4 + ph * 22, 0, Math.PI * 2);
            g.stroke();
        }
        // 释放瞬间：炮口绽开的蓝色冲击射线
        if (rel > 0 && rel < 0.6) {
            g.globalAlpha = (0.6 - rel) * 1.4;
            g.strokeStyle = '#d8e8ff';
            g.lineWidth = 2;
            for (let i = -2; i <= 2; i++) {
                const a = hr + i * 0.16;
                g.beginPath();
                g.moveTo(mzx + Math.cos(a) * 6, mzy + Math.sin(a) * 6);
                g.lineTo(mzx + Math.cos(a) * (26 + rel * 30), mzy + Math.sin(a) * (26 + rel * 30));
                g.stroke();
            }
        }
        // 蓄力时周身蓝色咒力上升粒子（史上最强输出的咒力密度）
        g.fillStyle = '#5aa8ff';
        for (let i = 0; i < 5; i++) {
            const ph = (at * 0.025 + i * 0.2) % 1;
            const px = Math.sin(at * 0.06 + i * 1.9) * 26;
            g.globalAlpha = cast * (1 - ph) * 0.5 * fade;
            g.beginPath();
            g.arc(px, -30 - ph * 92, 1.4 + (i % 2), 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
        g.globalAlpha = 1;
    }

    // 石流龙：领域展开·漫天花火——身后蓝色光轮 + 升空咒力星火 + 炮口蓝核
    if (pose.ryuUlt > 0.2) {
        const p = pose.ryuUlt;
        const at = pose.animT || 0;
        g.save();
        // 身后蓝色光轮：外圈蓝环 + 环上绽放射线（蓝色花火意象，缓转）
        g.globalAlpha = p * 0.5;
        g.strokeStyle = '#5aa8ff';
        g.lineWidth = 2.6;
        g.beginPath();
        g.arc(0, -96, 44 + p * 14, 0, Math.PI * 2);
        g.stroke();
        const rot = at * 0.02;
        g.lineWidth = 1.8;
        for (let i = 0; i < 12; i++) {
            const a = rot + i * Math.PI / 6;
            const r0 = 44 + p * 14,
                r1 = r0 + 12 + (i % 2) * 6;
            g.strokeStyle = i % 3 === 0 ? '#9ad0ff' : (i % 3 === 1 ? '#5aa8ff' : '#d8e8ff');
            g.beginPath();
            g.moveTo(Math.cos(a) * r0, -96 + Math.sin(a) * r0);
            g.lineTo(Math.cos(a) * r1, -96 + Math.sin(a) * r1);
            g.stroke();
        }
        // 升空咒力星火（自炮口冲天，确定相位防闪烁）
        for (let i = 0; i < 9; i++) {
            const ph = (at * 0.024 + i * 0.11) % 1;
            const px = Math.sin(at * 0.07 + i * 2.1) * (8 + i * 3);
            g.globalAlpha = p * (1 - ph) * 0.8;
            g.fillStyle = i % 3 === 0 ? '#9ad0ff' : (i % 3 === 1 ? '#5aa8ff' : '#d8e8ff');
            g.beginPath();
            g.arc(px, -140 - ph * 120, 1.5 + (i % 3) * 0.7, 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
        // 炮口蓝色咒力核（领域咒力全开）
        const hr = pose.headRot || 0;
        const hy = pose.headY - 84 - pose.bodyY;
        gojoOrb(g, Math.cos(hr) * 38 - Math.sin(hr) * (-13), hy + Math.sin(hr) * 38 + Math.cos(hr) * (-13), 6 + p * 10, '#d8e8ff', 'rgba(90,168,255,0)');
        g.globalAlpha = 1;
    }

    // 乌鹭亨子：施法天空平面视觉——掌前浮现的青蓝薄冰平面 + 裂纹 + 周身天青咒力粒子
    if (pose.uroSkill) {
        const cast = pose.uroCast || 0;
        const rel = pose.uroRel || 0;
        const at = pose.animT || 0;
        const k = pose.uroSkill;
        g.save();
        if (k === 'skill3') {
            // 头顶天空裂缝（双手高举撕裂处）
            g.globalAlpha = Math.min(1, cast * 1.2) * (1 - rel * 0.7);
            g.strokeStyle = '#d8f2ff';
            g.lineWidth = 2.2;
            g.beginPath();
            g.moveTo(-34, -150);
            g.lineTo(-10, -158 - cast * 8);
            g.lineTo(12, -152 - cast * 12);
            g.lineTo(36, -160);
            g.stroke();
            // 自裂缝放射的碎裂光线
            g.strokeStyle = 'rgba(154,220,255,0.6)';
            g.lineWidth = 1.2;
            for (let i = 0; i < 4; i++) {
                const a = -Math.PI / 2 + (i - 1.5) * 0.5;
                g.beginPath();
                g.moveTo(2, -154);
                g.lineTo(2 + Math.cos(a) * (14 + cast * 16), -154 + Math.sin(a) * (14 + cast * 16));
                g.stroke();
            }
        } else {
            // 身前竖立的天空平面（半透薄冰，蓄力渐显）
            const px = 34,
                ph2 = 0.5 + cast * 0.5;
            g.globalAlpha = (0.35 + cast * 0.4) * (1 - rel * 0.8);
            g.fillStyle = 'rgba(154,220,255,0.24)';
            g.beginPath();
            g.moveTo(px - 8, -128 * ph2);
            g.lineTo(px + 10, -120 * ph2);
            g.lineTo(px + 12, -18);
            g.lineTo(px - 6, -26);
            g.closePath();
            g.fill();
            g.strokeStyle = 'rgba(216,242,255,0.85)';
            g.lineWidth = 1.6;
            g.stroke();
            // 平面裂纹（蓄力渐显，释放时崩碎消失）
            g.globalAlpha = cast * (1 - rel);
            g.lineWidth = 1.1;
            g.beginPath();
            g.moveTo(px + 2, -86);
            g.lineTo(px - 2, -66);
            g.lineTo(px + 6, -48);
            g.stroke();
        }
        // 周身天青咒力上升粒子
        g.fillStyle = '#9adcff';
        for (let i = 0; i < 5; i++) {
            const phz = (at * 0.025 + i * 0.2) % 1;
            const pxx = Math.sin(at * 0.06 + i * 1.9) * 24;
            g.globalAlpha = Math.max(cast, rel > 0 ? 1 - rel : 0) * (1 - phz) * 0.5;
            g.beginPath();
            g.arc(pxx, -34 - phz * 88, 1.3 + (i % 2), 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
        g.globalAlpha = 1;
    }

    // 乌鹭亨子：领域展开·葬空白纱——绕身白纱飘带 + 青白鬼火 + 头顶崩落天光
    if (pose.uroUlt > 0.2) {
        const p = pose.uroUlt;
        const at = pose.animT || 0;
        g.save();
        // 绕身白纱（两条螺旋飘带，丧葬意象）
        g.strokeStyle = 'rgba(232,244,255,0.75)';
        g.lineCap = 'round';
        for (let s = 0; s < 2; s++) {
            g.globalAlpha = p * (0.5 - s * 0.15);
            g.lineWidth = 7 - s * 2;
            g.beginPath();
            for (let i = 0; i <= 14; i++) {
                const u = i / 14;
                const a = at * 0.05 + s * Math.PI + u * Math.PI * 2.2;
                const r = 30 + u * 26 + Math.sin(at * 0.08 + s) * 4;
                const wx = Math.cos(a) * r;
                const wy = -58 - u * 66 + Math.sin(a) * 10;
                if (i === 0) g.moveTo(wx, wy);
                else g.lineTo(wx, wy);
            }
            g.stroke();
        }
        // 青白鬼火（绕身漂浮，确定相位防闪烁）
        for (let i = 0; i < 6; i++) {
            const phz = (at * 0.02 + i * 0.167) % 1;
            const fx2 = Math.sin(at * 0.05 + i * 2.3) * (26 + i * 4);
            g.globalAlpha = p * (1 - phz) * 0.75;
            g.fillStyle = i % 2 === 0 ? '#b8e8e0' : '#9adcff';
            g.beginPath();
            g.ellipse(fx2, -46 - phz * 100, 2.2 + (i % 3) * 0.8, 3.6 + (i % 3), 0, 0, Math.PI * 2);
            g.fill();
        }
        // 头顶崩落天光（细密下坠光丝）
        g.strokeStyle = 'rgba(216,242,255,0.7)';
        g.lineWidth = 1.2;
        for (let i = 0; i < 7; i++) {
            const phz = (at * 0.03 + i * 0.143) % 1;
            const lx = -60 + i * 20;
            g.globalAlpha = p * (1 - phz) * 0.6;
            g.beginPath();
            g.moveTo(lx, -170 + phz * 90);
            g.lineTo(lx, -152 + phz * 90);
            g.stroke();
        }
        g.restore();
        g.globalAlpha = 1;
    }

    // 杜鲁夫：施法式神视觉——赤红式神虚影（差遣/回游/合围）+ 周身赤红咒力粒子
    if (pose.druvSkill) {
        const cast = pose.druvCast || 0;
        const rel = pose.druvRel || 0;
        const at = pose.animT || 0;
        const k = pose.druvSkill;
        // 鱼形式神虚影绘制（局部坐标，朝向 fw）
        const shikigami = (sx, sy, fw, alpha, scale) => {
            g.save();
            g.translate(sx, sy);
            g.scale(fw * (scale || 1), scale || 1);
            g.globalAlpha = alpha;
            // 赤红光晕
            const gsg = g.createRadialGradient(0, 0, 2, 0, 0, 22);
            gsg.addColorStop(0, 'rgba(255,176,154,0.7)');
            gsg.addColorStop(1, 'rgba(255,106,82,0)');
            g.fillStyle = gsg;
            g.beginPath();
            g.arc(0, 0, 22, 0, Math.PI * 2);
            g.fill();
            // 鱼身
            g.fillStyle = 'rgba(255,106,82,0.75)';
            g.beginPath();
            g.ellipse(0, 0, 15, 6.5, 0, 0, Math.PI * 2);
            g.fill();
            // 尾鳍
            g.beginPath();
            g.moveTo(-13, 0);
            g.lineTo(-22, -6);
            g.lineTo(-22, 6);
            g.closePath();
            g.fill();
            // 白独眼
            g.fillStyle = '#fff';
            g.beginPath();
            g.arc(8, -1.5, 2.2, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#8a1c10';
            g.beginPath();
            g.arc(8.6, -1.5, 1, 0, Math.PI * 2);
            g.fill();
            g.restore();
            g.globalAlpha = 1;
        };
        g.save();
        if (k === 'skill2') {
            // 赤轨护领：式神绕身回游（椭圆轨迹 + 赤红残光弧）
            const oa = at * 0.14;
            const ox = Math.cos(oa) * 84,
                oy = -76 + Math.sin(oa) * 40;
            const vis = Math.min(1, cast * 1.4) * (rel > 0.85 ? (1 - rel) / 0.15 : 1);
            // 轨迹残红弧
            g.globalAlpha = vis * 0.5;
            g.strokeStyle = '#ff6a52';
            g.lineWidth = 4;
            g.lineCap = 'round';
            g.beginPath();
            g.ellipse(0, -76, 84, 40, 0, oa - 1.6, oa);
            g.stroke();
            g.lineWidth = 2;
            g.globalAlpha = vis * 0.25;
            g.beginPath();
            g.ellipse(0, -76, 84, 40, 0, oa - 2.6, oa - 1.6);
            g.stroke();
            // 回游式神本体（朝向切线方向）
            shikigami(ox, oy, Math.sin(oa) <= 0 ? 1 : -1, vis * 0.9, 1);
        } else {
            // 赤空噬咬/合围狩猎：身侧悬浮待命式神（蓄力渐显，释放后淡出）
            const hov = Math.sin(at * 0.1) * 5;
            const vis = Math.min(1, cast * 1.3) * (1 - rel);
            shikigami(-38, -110 + hov, 1, vis * 0.75, 0.9);
            if (k === 'skill3') shikigami(42, -118 - hov, -1, vis * 0.75, 0.85);
        }
        // 周身赤红咒力上升粒子
        g.fillStyle = '#ff6a52';
        for (let i = 0; i < 5; i++) {
            const phz = (at * 0.025 + i * 0.2) % 1;
            const pxx = Math.sin(at * 0.06 + i * 1.9) * 24;
            g.globalAlpha = Math.max(cast, rel > 0 ? 1 - rel : 0) * (1 - phz) * 0.5;
            g.beginPath();
            g.arc(pxx, -34 - phz * 88, 1.3 + (i % 2), 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
        g.globalAlpha = 1;
    }

    // 杜鲁夫：领域展开·赤空回游——双式神对相位绕身回游 + 赤红轨迹光轮 + 染红光尘
    if (pose.druvUlt > 0.2) {
        const p = pose.druvUlt;
        const at = pose.animT || 0;
        g.save();
        // 双式神对相位回游（各自拖曳赤红轨迹弧）
        for (let s = 0; s < 2; s++) {
            const oa = at * 0.06 + s * Math.PI;
            const rr = 58 + s * 10;
            const oy0 = -70 - s * 22;
            const ox = Math.cos(oa) * rr,
                oy = oy0 + Math.sin(oa) * 26;
            // 轨迹弧（染红空间意象）
            g.globalAlpha = p * (0.45 - s * 0.1);
            g.strokeStyle = s === 0 ? '#ff6a52' : '#ffb09a';
            g.lineWidth = 5 - s;
            g.lineCap = 'round';
            g.beginPath();
            g.ellipse(0, oy0, rr, 26, 0, oa - 2.2, oa);
            g.stroke();
            // 式神本体（沿切线朝向）
            const fw = Math.sin(oa) <= 0 ? 1 : -1;
            g.save();
            g.translate(ox, oy);
            g.scale(fw, 1);
            g.globalAlpha = p * 0.85;
            g.fillStyle = 'rgba(255,106,82,0.8)';
            g.beginPath();
            g.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.moveTo(-14, 0);
            g.lineTo(-24, -7);
            g.lineTo(-24, 7);
            g.closePath();
            g.fill();
            g.fillStyle = '#fff';
            g.beginPath();
            g.arc(9, -1.5, 2.4, 0, Math.PI * 2);
            g.fill();
            g.fillStyle = '#8a1c10';
            g.beginPath();
            g.arc(9.6, -1.5, 1.1, 0, Math.PI * 2);
            g.fill();
            g.restore();
        }
        // 染红上升光尘（确定相位防闪烁）
        for (let i = 0; i < 6; i++) {
            const phz = (at * 0.02 + i * 0.167) % 1;
            const fx2 = Math.sin(at * 0.05 + i * 2.3) * (26 + i * 4);
            g.globalAlpha = p * (1 - phz) * 0.7;
            g.fillStyle = i % 2 === 0 ? '#ff6a52' : '#ffb09a';
            g.beginPath();
            g.ellipse(fx2, -46 - phz * 100, 2 + (i % 3) * 0.8, 3.4 + (i % 3), 0, 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
        g.globalAlpha = 1;
    }

    // 黑沐死技能特效：虫群聚涌（蓄力绕身聚集，释放向前奔流）
    if (pose.kuroSkill) {
        const cast = pose.kuroCast || 0;
        const rel = pose.kuroRel || 0;
        const at = pose.animT || 0;
        const k = pose.kuroSkill;
        g.save();
        // 绕身虫群粒子（暗褐虫点 + 腐橙鞘光，释放时整体前涌）
        for (let i = 0; i < 10; i++) {
            const a = at * 0.09 + i * 0.628;
            const rr = 30 + Math.sin(at * 0.07 + i) * 8 - cast * 6;
            const sx = Math.cos(a) * rr + rel * (26 + (i % 3) * 14);
            const sy = -64 + Math.sin(a) * 26;
            g.globalAlpha = Math.max(cast, rel > 0 ? 1 - rel : 0) * 0.8;
            g.fillStyle = i % 3 === 0 ? '#e0862e' : '#2c1812';
            g.beginPath();
            g.ellipse(sx, sy, 2.2, 1.3, a, 0, Math.PI * 2);
            g.fill();
        }
        if (k === 'skill2') {
            // 烂生刀刀身本体：锚在右手，蓄力拖刀在后 → 释放前扫挥斩
            const hx = lerp(14, -30, cast) + rel * 96;
            const hy = lerp(-58, -74, cast) + rel * 12;
            const ang = rel > 0 ? lerp(2.6, -0.45, rel) : lerp(1.9, 2.6, cast);
            const vis = Math.min(1, cast * 1.6) * (rel > 0.85 ? (1 - rel) / 0.15 : 1);
            g.save();
            g.translate(hx, hy);
            g.rotate(ang);
            g.globalAlpha = vis;
            // 缠布刀柄
            g.fillStyle = '#2c2018';
            g.fillRect(-12, -1.8, 14, 3.6);
            g.strokeStyle = 'rgba(138,128,114,0.6)';
            g.lineWidth = 0.8;
            g.beginPath();
            g.moveTo(-9, -1.8);
            g.lineTo(-7, 1.8);
            g.moveTo(-5, -1.8);
            g.lineTo(-3, 1.8);
            g.stroke();
            // 锈铜护手
            g.fillStyle = '#5a4a32';
            g.beginPath();
            g.ellipse(3, 0, 2, 4.4, 0, 0, Math.PI * 2);
            g.fill();
            // 钝重宽刃刀身（锈蚀灰褐，刃尖无锋收圆）
            g.fillStyle = '#6a6258';
            g.beginPath();
            g.moveTo(5, -5.5);
            g.lineTo(56, -4.2);
            g.quadraticCurveTo(64, -2.5, 64, 0.5);
            g.quadraticCurveTo(63, 3.5, 55, 4.4);
            g.lineTo(5, 5.5);
            g.closePath();
            g.fill();
            // 刃背亮缘与锈斑
            g.strokeStyle = 'rgba(138,128,114,0.85)';
            g.lineWidth = 1;
            g.beginPath();
            g.moveTo(6, -5);
            g.lineTo(56, -3.8);
            g.stroke();
            g.fillStyle = 'rgba(224,134,46,0.55)';
            g.beginPath();
            g.arc(14, 3, 1.1, 0, Math.PI * 2);
            g.fill();
            g.beginPath();
            g.arc(44, -2.4, 0.9, 0, Math.PI * 2);
            g.fill();
            // 刀刃空洞（三枚，释放时洞内虫卵橙光脉动）
            for (let hIdx = 0; hIdx < 3; hIdx++) {
                const hxx = 18 + hIdx * 15;
                g.fillStyle = '#1c0c06';
                g.beginPath();
                g.arc(hxx, 0.4, 2.6, 0, Math.PI * 2);
                g.fill();
                if (rel > 0) {
                    g.fillStyle = '#e0862e';
                    g.globalAlpha = vis * (0.5 + Math.sin((pose.animT || 0) * 0.6 + hIdx * 2) * 0.4);
                    g.beginPath();
                    g.arc(hxx, 0.4, 1.3, 0, Math.PI * 2);
                    g.fill();
                    g.globalAlpha = vis;
                }
            }
            g.restore();
            g.globalAlpha = 1;
        }
        if (k === 'skill2' && rel > 0) {
            // 烂生刀：挥斩暗紫残光弧
            g.globalAlpha = (1 - rel) * 0.6;
            g.strokeStyle = '#4a1a2e';
            g.lineWidth = 5;
            g.lineCap = 'round';
            g.beginPath();
            g.arc(10, -84, 52, -1.2 + rel * 1.6, -0.4 + rel * 1.6);
            g.stroke();
            g.lineCap = 'butt';
        }
        if (k === 'skill3') {
            // 土虫蠕定：毒液绿光点自两侧升起
            g.fillStyle = '#b8d44a';
            for (let i = 0; i < 6; i++) {
                const phz = (at * 0.03 + i * 0.167) % 1;
                g.globalAlpha = cast * (1 - phz) * 0.7;
                g.beginPath();
                g.arc(Math.sin(at * 0.05 + i * 2.1) * 40, -40 - phz * 80, 1.6 + (i % 2), 0, Math.PI * 2);
                g.fill();
            }
        }
        g.restore();
        g.globalAlpha = 1;
    }

    // 黑沐死必杀：单性生殖·地狱归还——蟑螂海啸绕身翻涌 + 腐蚀橙光轮
    if (pose.kuroUlt > 0.2) {
        const p = pose.kuroUlt;
        const at = pose.animT || 0;
        g.save();
        // 腐蚀橙光轮
        g.globalAlpha = p * 0.4;
        g.strokeStyle = '#e0862e';
        g.lineWidth = 3;
        g.beginPath();
        g.ellipse(0, -70, 46 + Math.sin(at * 0.1) * 5, 70, 0, 0, Math.PI * 2);
        g.stroke();
        // 三层绕身虫浪（椭圆轨道上的虫点串）
        for (let s = 0; s < 3; s++) {
            const rr = 40 + s * 14;
            const oy0 = -60 - s * 14;
            for (let i = 0; i < 8; i++) {
                const a = at * (0.08 + s * 0.02) + i * 0.785 + s * 1.1;
                const bx = Math.cos(a) * rr;
                const by = oy0 + Math.sin(a) * (18 + s * 5);
                g.globalAlpha = p * (0.75 - s * 0.15);
                g.fillStyle = i % 4 === 0 ? '#e0862e' : (i % 4 === 2 ? '#4a1a2e' : '#2c1812');
                g.beginPath();
                g.ellipse(bx, by, 2.4 - s * 0.4, 1.4, a, 0, Math.PI * 2);
                g.fill();
            }
        }
        // 上升腐橙光尘（确定相位防闪烁）
        for (let i = 0; i < 6; i++) {
            const phz = (at * 0.02 + i * 0.167) % 1;
            g.globalAlpha = p * (1 - phz) * 0.6;
            g.fillStyle = i % 2 === 0 ? '#f0b060' : '#e0862e';
            g.beginPath();
            g.arc(Math.sin(at * 0.05 + i * 2.3) * (24 + i * 4), -44 - phz * 96, 1.4 + (i % 3) * 0.6, 0, Math.PI * 2);
            g.fill();
        }
        g.restore();
        g.globalAlpha = 1;
    }

    // 七海建人：加班形态视觉（金色咒力外溢、眼镜反光、动作凌厉感）
    if (pose.nanamiOvertime) {
        const at = pose.animT || 0;
        const pulse = Math.sin(at * 0.12) * 0.1;
        g.save();
        // 金色咒力外溢光环
        g.globalAlpha = 0.3 + pulse;
        g.strokeStyle = '#e8c86a';
        g.lineWidth = 2;
        g.beginPath();
        g.ellipse(0, -70, 30 + Math.sin(at * 0.08) * 4, 55 + Math.cos(at * 0.06) * 4, 0, 0, Math.PI * 2);
        g.stroke();
        // 金色粒子上升
        g.globalAlpha = 0.4 + pulse;
        g.fillStyle = '#e8c86a';
        for (let i = 0; i < 5; i++) {
            const py = -40 - ((at * 1.5 + i * 30) % 80);
            const px = Math.sin(at * 0.1 + i * 2) * 18;
            g.beginPath();
            g.arc(px, py, 1.5 + (i % 2), 0, Math.PI * 2);
            g.fill();
        }
        // 眼镜反光增强（金色闪光）
        g.globalAlpha = 0.5 + pulse * 2;
        g.fillStyle = '#e8c86a';
        g.beginPath();
        g.ellipse(-7, pose.headY - 84 - pose.bodyY + 2, 4, 2.5, 0, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(8, pose.headY - 84 - pose.bodyY + 2, 4, 2.5, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
    }

    // 头部
    drawHead(g, c, 0, pose.headY - 84 - pose.bodyY, pose);

    g.restore();
}
