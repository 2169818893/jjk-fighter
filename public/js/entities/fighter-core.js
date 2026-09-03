/* =====================================================================
   Fighter 核心：构造、状态、移动、受击、普通攻击、技能入口、闪避、更新
   ===================================================================== */
import { CHARS, derive, GROUND, GRAV, VW, ULT_CAST_FREEZE, KEYMAP, hasDomainUlt, BLACK_FLASH } from '../config.js';
import { clamp, rand, RNG } from '../utils.js';
import { Input } from '../input.js';
import { AudioSys } from '../audio.js';
import { FX } from '../fx.js';
import { drawFighter } from './fighter-render.js';

export class Fighter {
    constructor(charId, side, isAI) {
        this.c = CHARS[charId];
        this.d = derive(this.c);
        this.side = side;
        this.isAI = isAI;
        this.energy = 20;
        this.diff = { name: '普通', decide: 30, react: 0.30, blockP: 0.25, dodgeP: 0.12, skillP: 0.65, ultP: 0.55, comboP: 0.55, aggro: 0.7 };
        /* 与回合重置共用同一套初始化，保证"新建角色"与"开新回合"状态完全一致 */
        this.resetRound();
        // AI 决策相位用种子随机错开（联机下 isAI 恒为 false，不消耗于战斗判定）
        this.ai = { t: 0, plan: 'idle', dir: 0, decideTick: RNG.irand(0, 30) };
    }

    /* ------ 回合重置（P1-5） ------
       原 startRound() 只重置了 x/y/vx/vy/hp/dead/state/combo/hurtCombo/energy/召唤物，
       导致 BO3 第二回合会继承上一回合的负面与增益：甚尔 slaughterActive 会拦截
       setState('hurt') 形成"全程霸体"、领域对冲失败的 skillDisabled=600（10 秒禁术）
       被带入下回合、变身/加班形态残留、cd 与无敌帧不清等。
       这里把所有跨回合状态一次性归零，构造与 Game.startRound() 共用同一份清单。
       注意：本函数不得消耗 RNG（两端必须在同一帧做完全相同的操作）。
       energy 有意不重置（跨回合继承是既有设计，由 startRound 钳到 50）。 */
    resetRound() {
        this.x = this.side === 0 ? 380 : 900;
        this.y = GROUND;
        this.vx = 0;
        this.vy = 0;
        this.facing = this.side === 0 ? 1 : -1;
        /* d 会被变身/杀戮本能/减伤技能就地乘过（如 d.atkMul *= 1.25），
           且"回合结束才还原"的延迟回调会被 clearAllGameIntervals/清空 delayed 丢掉，
           故按角色基础值重算，避免跨回合叠加或丢失 */
        this.d = derive(this.c);
        this.hp = this.d.maxHp;
        this.dead = false;
        this.animT = 0;
        this.state = 'idle';
        this.st = 0;
        this.combo = 0;
        this.comboDmg = 0;
        this.comboTimer = 0;
        this.hurtCombo = 0;
        this.hurtLen = 0;
        this.flashT = 0;
        this.onGround = true;
        this.attackStep = 0;
        this.attackHasHit = false;
        this.attackBox = null;
        this.cd = { skill1: 0, skill2: 0, skill3: 0 };
        this.dodgeCD = 0;
        this.dodgeDir = 0;
        this.invuln = 0;
        this.blockstun = 0;
        this.blockHeld = false;
        this.ultCasting = false;
        this.ultDone = false;
        this.ultDur = 0;
        this.ultPhase = 0;
        this.ultT0 = null;
        this.ultSequenceActive = false;
        this.ultSequenceFrame = null;
        this.ultSequenceKind = null;
        this.ultSequenceLocal = false;
        this.ultSequenceStart = 0;
        this.charge = 0;
        this.chargeT = 0;
        this.chargeDone = false;
        this.chargeThrow = false;
        this.skillDisabled = 0;  // 术士禁用 debuff 帧数
        this.hensetsu = 0;       // 真人遍杀即灵体状态计时器
        this.hensetsuActive = false;
        this.overtime = 0;       // 七海建人加班形态计时器
        this.overtimeActive = false;
        this.slaughter = 0;      // 甚尔杀戮本能计时器
        this.slaughterActive = false;
        this.hovering = false;
        this.shadowSub = 0;
        this._ambushed = false;
        this.mahoraga = null;
        this.agito = null;
        this.summonsDeployed = false;
        this.ai = { t: 0, plan: 'idle', dir: 0, decideTick: 0 };
    }
    get cy() { return this.y - 78; }
    get foe() { return typeof Game !== 'undefined' ? Game.fighters[1 - this.side] : null; }
    hittable() { return !this.dead && this.invuln <= 0 && this.state !== 'dodge' && this.state !== 'clashing' && !this.ultCasting; }

    setState(s) {
        // 杀戮本能全程霸体：任何受击/击飞状态都无法打断（含领域强制定身）
        if (this.slaughterActive && (s === 'hurt' || s === 'launched')) return;
        if (s !== 'ult') {
            this.ultCasting = false;
            this.ultSequenceActive = false;
            this.ultSequenceFrame = null;
        }
        // 进入必杀重置连击时间轴锚点：ultEffect 触发时才会写入真实 ultT0，
        // 未触发前渲染层据此保持收拳待机，避免用上一次残留锚点错位出拳
        if (s === 'ult') this.ultT0 = null;
        this.state = s;
        this.st = 0;
        if (s === 'idle' || s === 'walk' || s === 'block') this.vx = 0;
    }
    busy() { return ['attack', 'skill', 'ult', 'hurt', 'launched', 'blockstun', 'dodge', 'wakeup', 'clashing'].includes(this.state); }
    airborne() { return this.y < GROUND - 1; }

    /* ------ 伤害受理 ------ */
    takeHit(foe, opt) {
        if (this.dead) return;
        const blocking = (this.state === 'block' || this.blockHeld) && this.onGround && !opt.unblockable;
        const esc = 1 + Math.min(0.6, this.hurtCombo * 0.055);
        let dmg = opt.dmg * this.d.dmgTaken * esc;
        this.flashT = 8;

        if (blocking && !opt.unblockable) {
            // 领域伤害格挡仅减免 50%，普通攻击/技能减免 88%
            dmg *= opt.isDomain ? 0.5 : 0.12;
            this.hp -= dmg;
            /* P1-6：格挡也会被磨死。原实现在此分支直接 return，抢在 hp<=0 判定之前，
               残血格挡被磨死时 HP 转负、血条渲染负数且不触发 die()，回合只能靠超时结束 */
            if (this.settleHp()) return;
            this.blockstun = Math.max(this.blockstun, opt.stun * 0.5 + 8);
            this.setState('blockstun');
            this.vx = opt.kb * 0.4 * -this.facing;
            FX.spark(this.x + this.facing * 30, this.cy, '#9fd8ff');
            FX.text(this.x, this.cy - 70, opt.isDomain ? '领域格挡' : '格挡', '#9fd8ff', 22);
            AudioSys.play('block');
            FX.addShake(3);
            FX.addHitstop(3);
            this.energy = clamp(this.energy + 4, 0, 100);
            return;
        }

        this.hp -= dmg;
        this.hurtCombo++;
        foe.combo++;
        foe.comboTimer = 90;
        foe.comboDmg += dmg;
        foe.energy = clamp(foe.energy + opt.dmg * 0.35, 0, 100);
        this.energy = clamp(this.energy + dmg * 0.18, 0, 100);

        /* 遭杀即灵体小霸体：普攻/重攻造成伤害但不打断；杀戮本能全程霸体（任何攻击都无法打断） */
        const superArmor = (this.hensetsuActive && foe.state === 'attack') || this.slaughterActive;
        if (superArmor) {
            // 霸体：仅受击反馈（不进入hurt/launched状态）
            this.vx = (opt.kb || 4) * -this.facing * 0.3;
            FX.text(this.x, this.cy - 90, this.slaughterActive ? '杀戮霸体' : '霸体', this.slaughterActive ? '#ff8a8a' : '#a8d8ff', 18);
        } else if (opt.launch) {
            this.setState('launched');
            this.vy = -opt.launch;
            this.vx = (opt.kb || 6) * -this.facing;
        } else {
            this.setState('hurt');
            this.st = 0;
            this.hurtLen = clamp(opt.stun, 10, 40);
            this.vx = (opt.kb || 4) * -this.facing;
        }
        const hx = this.x + this.facing * 20,
            hy = this.cy;
        /* P2-15：原此处命名为 rand，遮蔽了 utils 导出的同名函数（后者才是种子随机）。
           当前只喂视觉特效不致失步，但一旦被误用于伤害/坐标就是 P0，故改名明示用途。 */
        const vfxRand = (a, b) => a + Math.random() * (b - a);
        FX.spark(hx, hy, opt.spark || '#ffd76a');
        FX.ring(hx, hy, opt.spark || '#ffd76a', 46, 4);
        FX.slash(hx, hy, vfxRand(0, Math.PI * 2), '#ffffff', 80);
        FX.text(this.x + vfxRand(-10, 10), hy - 60, Math.round(dmg), opt.dmgColor || '#ffd76a', 24 + Math.min(14, dmg * 0.12));
        FX.addShake(opt.shake || 5);
        FX.addHitstop(opt.hitstop !== undefined ? opt.hitstop : 5);
        AudioSys.play(opt.sound || (opt.dmg > 34 ? 'hit3' : (opt.dmg > 18 ? 'hit2' : 'hit1')));
        this.settleHp();
    }

    /* 血量结算：先钳位再判死，格挡分支与普通受击分支共用（P1-6） */
    settleHp() {
        if (this.hp > 0) return false;
        this.hp = 0;
        this.die();
        return true;
    }

    die() {
        this.ultCasting = false;
        this.dead = true;
        this.setState('ko');
        this.vy = -9;
        this.vx = -this.facing * 5;
        FX.flash('#ffffff', 0.55, 14);
        FX.addShake(16);
        FX.addHitstop(24);
        FX.burst(this.x, this.cy, this.c.color, 40, 10, 50, 5);
        AudioSys.play('ko');
    }

    /* ------ 攻击判定盒 ------ */
    makeBox(w, h, ox, oy, opt) {
        this.attackBox = {
            x: this.x + this.facing * ox,
            y: this.y + oy,
            w,
            h,
            dmg: opt.dmg * this.d.atkMul,
            stun: opt.stun || 18,
            kb: opt.kb || 5,
            launch: opt.launch || 0,
            sound: opt.sound,
            shake: opt.shake,
            hitstop: opt.hitstop,
            spark: opt.spark,
            dmgColor: opt.dmgColor,
            unblockable: opt.unblockable || false
        };
    }

    /* ------ 黑闪结算：概率判定 + 伤害加成 + 演出，命中则返回 true ------
       通用规则：所有角色轻/重攻击 1%；虎杖悠仁（前期 yuji）全攻击动作 10%，
       且连击每 +1 概率额外 +0.5%（连击中断归零后自动回落 10%）；
       每次命中独立抽奖，不影响其他攻击 */
    tryBlackFlash(tg, hit) {
        const chance = this.c.id === 'yuji'
            ? BLACK_FLASH.yujiChance + this.combo * BLACK_FLASH.yujiComboStep
            : BLACK_FLASH.chance;
        if (!RNG.chance(chance)) return false;
        const boosted = Object.assign({}, hit, { dmg: hit.dmg * BLACK_FLASH.dmgMul, dmgColor: '#ff2b2b', spark: '#ff2b2b' });
        tg.takeHit(this, boosted);
        const heal = Math.max(BLACK_FLASH.healAmount, this.d.maxHp * BLACK_FLASH.healRatio);
        this.hp = Math.min(this.d.maxHp, this.hp + heal);
        FX.flash('#000000', 0.55, 12);
        FX.flash('#ff2b2b', 0.35, 10);
        FX.addShake(14);
        FX.addHitstop(16);
        FX.addZoom(0.05, tg.x, tg.cy);
        AudioSys.play('blackflash');
        for (let i = 0; i < 4; i++) FX.ring(tg.x + rand(-30, 30), tg.cy + rand(-30, 30), '#ff2b2b', 80 + i * 20, 5);
        FX.burst(tg.x, tg.cy, '#ff2b2b', 24, 10, 36, 5);
        FX.text(tg.x, tg.cy - 110, '黑闪！', '#ff2b2b', 34);
        FX.text(this.x, this.cy - 60, '+' + Math.round(heal), '#5cff8a', 20);
        return true;
    }

    /* ------ 普通攻击链 ------ */
    startAttack(kind) {
        if (this.busy()) return;
        this.setState('attack');
        this.attackHasHit = false;
        this.attackStep = kind === 'light' ? (this.attackStep % 3) + 1 : 4;
        this.attackKind = kind;
        this.attackDur = kind === 'light' ? [0, 20, 20, 24][this.attackStep] : 32;
        this.vx = this.facing * (kind === 'light' ? 2.5 : 4.5);
    }
    attackFrame() {
        const step = this.attackStep,
            t = this.st;
        if (this.attackKind === 'light') {
            if (step === 1 && t === 7) this.makeBox(70, 60, 66, -100, { dmg: 9, stun: 16, kb: 4, shake: 3 });
            if (step === 2 && t === 6) this.makeBox(76, 56, 70, -92, { dmg: 10, stun: 18, kb: 5, shake: 4 });
            if (step === 3 && t === 9) this.makeBox(88, 64, 76, -96, { dmg: 16, stun: 24, kb: 9, shake: 7, hitstop: 8 });
        } else {
            if (t === 13) this.makeBox(96, 74, 80, -98, { dmg: 24, stun: 28, kb: 11, launch: 9, shake: 9, hitstop: 9 });
        }
    }

    /* ------ 技能入口 ------ */
    canSkill(k) { return this.c.moves[k] && this.cd[k] <= 0 && !this.busy() && this.skillDisabled <= 0; }
    startSkill(k) {
        if (!this.canSkill(k)) return;
        this.setState('skill');
        this.skillKind = k;
        this.attackHasHit = false;
        AudioSys.play('cast');
        this.energy = clamp(this.energy + 6, 0, 100);
        const mv = this.c.moves[k];
        const cdSeconds = k === 'skill3' && this.c.id === 'sukunaMegumi' && this.summonsDeployed ? mv.transformedCd : mv.cd;
        this.cd[k] = cdSeconds * 60;
        this.skillDur = 36;
        this.castAt = 16;
        const id = this.c.base || this.c.id;
        if (k === 'skill1') {
            if (id === 'gojo') {
                this.skillDur = 48;
                this.castAt = 24;
            }
            if (id === 'sukuna') {
                this.skillDur = 42;
                this.castAt = 20;
            }
            if (id === 'megumi') {
                this.skillDur = 40;
                this.castAt = 18;
            }
            if (id === 'megumi2') {
                this.skillDur = 42;
                this.castAt = 20;
            }
            if (id === 'yuji') {
                this.skillDur = 44;
                this.vx = this.facing * 6;
                this.castAt = 18;
            }
            if (id === 'yuji2') {
                this.skillDur = 40;
                this.vx = this.facing * 7;
                this.castAt = 16;
            }
            if (id === 'naoya') {
                /* 24帧突进：脑内预演帧格后三段瞬发位移（位移在 skillFrame 中逐段触发） */
                this.skillDur = 36;
                this.castAt = 12;
            }
            if (id === 'toji') {
                /* 释魂刀·斩魂：拔刀低身后二连斩 */
                this.skillDur = 38;
                this.castAt = 14;
            }
            if (id === 'okkotsu') {
                this.skillDur = 42;
                this.castAt = 18;
            }
            if (id === 'mahito') {
                this.skillDur = 38;
                this.castAt = 14;
                this.vx = this.facing * 5;
            }
            if (id === 'nanami') {
                this.skillDur = 36;
                this.castAt = 16;
                this.vx = this.facing * 4;
            }
            if (id === 'kenjaku') {
                /* 咒灵操术：结印解放咒灵群 */
                this.skillDur = 44;
                this.castAt = 18;
            }
            if (id === 'hanami') {
                /* 树根：双臂插地引根 */
                this.skillDur = 48;
                this.castAt = 20;
            }
            if (id === 'jogo') {
                /* 火焰术式：按掌向地召唤丘状小火山 */
                this.skillDur = 46;
                this.castAt = 20;
            }
            if (id === 'dagon') {
                /* 激流·水铁炮：抬臂聚水后连射高压水弹 */
                this.skillDur = 42;
                this.castAt = 18;
            }
            if (id === 'ryu') {
                /* 冰沙冲击波：低头聚束咒力后炮口直射 */
                this.skillDur = 44;
                this.castAt = 20;
            }
            if (id === 'uro') {
                /* 宇守罗弹：握住天空平面后一掌击出空之碎片 */
                this.skillDur = 40;
                this.castAt = 18;
            }
            if (id === 'druv') {
                /* 赤空噬咬：挥臂差遣赤鳍式神破空突进 */
                this.skillDur = 42;
                this.castAt = 18;
            }
            if (id === 'kuro') {
                /* 噬铁潮：俯身张臂驱使蟑螂奔流前涌 */
                this.skillDur = 42;
                this.castAt = 18;
            }
        } else if (k === 'skill2') {
            if (id === 'gojo') {
                this.skillDur = 54;
                this.castAt = 28;
            }
            if (id === 'yuji') {
                this.skillDur = 50;
                this.castAt = 16;
                this.vx = this.facing * 5;
            }
            if (id === 'megumi') {
                this.skillDur = 40;
                this.castAt = 20;
            }
            if (id === 'megumi2') {
                this.skillDur = 48;
                this.castAt = 22;
            }
            if (id === 'sukuna') {
                this.skillDur = 50;
                this.castAt = 20;
            }
            if (id === 'nanami') {
                this.skillDur = 44;
                this.castAt = 24;
            }
            if (id === 'yuji2') {
                this.skillDur = 44;
                this.castAt = 20;
            }
            if (id === 'okkotsu') {
                this.skillDur = 46;
                this.castAt = 22;
            }
            if (id === 'mahito') {
                this.skillDur = 44;
                this.castAt = 20;
            }
            if (id === 'kenjaku') {
                /* 反重力机构：举掌引动重力反转 */
                this.skillDur = 50;
                this.castAt = 22;
            }
            if (id === 'hanami') {
                /* 咒种：背枝孕种后推掌射出 */
                this.skillDur = 42;
                this.castAt = 18;
            }
            if (id === 'jogo') {
                /* 火烁虫：头顶火山口喷焰放出咒虫 */
                this.skillDur = 44;
                this.castAt = 18;
            }
            if (id === 'dagon') {
                /* 水阵壁：张臂展开环身水屏障 */
                this.skillDur = 44;
                this.castAt = 16;
            }
            if (id === 'naoya') {
                /* 定帧掌：前踏探掌触碰强制同步 */
                this.skillDur = 40;
                this.castAt = 16;
                this.vx = this.facing * 4;
            }
            if (id === 'toji') {
                /* 天逆鉾：换持短刃后突刺 */
                this.skillDur = 42;
                this.castAt = 18;
            }
            if (id === 'ryu') {
                /* 追迹冲击波：仰天轰向空中后转向追踪 */
                this.skillDur = 46;
                this.castAt = 22;
            }
            if (id === 'uro') {
                /* 天空·反拨：抓住身前天空展开弹反窗口 */
                this.skillDur = 58;
                this.castAt = 16;
            }
            if (id === 'druv') {
                /* 赤轨护领：差遣式神绕身回游结成轨迹环 */
                this.skillDur = 62;
                this.castAt = 14;
            }
            if (id === 'kuro') {
                /* 烂生刀：拖刀蓄势 → 挥斩并自刀刃空洞射出虫卵 */
                this.skillDur = 46;
                this.castAt = 20;
            }
        } else if (k === 'skill3') {
            if (id === 'megumi') {
                this.skillDur = 40;
                this.castAt = 14;
            }
            if (id === 'megumi2') {
                this.skillDur = 54;
                this.castAt = 26;
            }
            if (id === 'sukuna') {
                this.skillDur = 58;
                this.castAt = 26;
            }
            if (id === 'jogo') {
                /* 极之番·陨：双臂高举引陨，蓄力更长 */
                this.skillDur = 64;
                this.castAt = 34;
            }
            if (id === 'dagon') {
                /* 死累累涌军：俯身张口召唤食肉鱼式神群 */
                this.skillDur = 56;
                this.castAt = 24;
            }
            if (id === 'ryu') {
                /* 连珠炮：扎马蓄力后连轰五发冲击波 */
                this.skillDur = 60;
                this.castAt = 20;
            }
            if (id === 'uro') {
                /* 空之断层：双手撕裂头顶天空，三道断层自天而降 */
                this.skillDur = 56;
                this.castAt = 20;
            }
            if (id === 'druv') {
                /* 合围狩猎：双臂张开同时差遣两只式神夹击 */
                this.skillDur = 54;
                this.castAt = 20;
            }
            if (id === 'kuro') {
                /* 土虫蠕定：仰首尖鸣召唤两只携囊式神 */
                this.skillDur = 56;
                this.castAt = 22;
            }
            if (id === 'naoya') {
                /* 空气爆炸：伸掌连续冻结空气 → 一拳击碎 */
                this.skillDur = 54;
                this.castAt = 26;
            }
            if (id === 'toji') {
                /* 游云：三节棍多段乱打 */
                this.skillDur = 52;
                this.castAt = 16;
            }
            if (id === 'gojo') {
                this.skillDur = 60;
                this.castAt = 30;
            }
            if (id === 'yuji2') {
                this.skillDur = 52;
                this.castAt = 14;
                this.vx = this.facing * 10;
            }
            if (id === 'okkotsu') {
                this.skillDur = 50;
                this.castAt = 24;
            }
            if (id === 'mahito') {
                /* 遍杀即灵体：变身技能，较长施法时间 */
                this.skillDur = 56;
                this.castAt = 28;
            }
            if (id === 'nanami') {
                /* 十划咒法·崩落：蓄力下劈 */
                this.skillDur = 52;
                this.castAt = 26;
            }
            if (id === 'kenjaku') {
                /* 极之番「漩涡」：千咒压缩长蓄力 */
                this.skillDur = 66;
                this.castAt = 34;
            }
            if (id === 'hanami') {
                /* 树鞠：招手具现漂浮木球，根刺连续突击 */
                this.skillDur = 58;
                this.castAt = 24;
            }
            if (id === 'sukunaMegumi') {
                this.skillDur = 52;
                this.castAt = 24;
            }
        }
    }

    /* ------ 必杀入口 ------ */
    canUlt() { return this.energy >= 100 && !this.busy() && this.skillDisabled <= 0; }
    startUlt(game) {
        if (!this.canUlt()) return;
        this.energy = 0;
        this.setState('ult');
        this.st = 0;
        this.ultPhase = 0;
        this.ultCasting = true;
        this.ultT0 = null;   // 连击类必杀的演出时间轴锚点（ultEffect 触发时记录）
        this.ultDur = 90;    // 必杀状态时长，连击类角色可在 ultEffect 中延长
        this.ultSequenceActive = false;
        this.ultSequenceFrame = null;
        this.ultSequenceKind = null;
        this.ultSequenceLocal = -1;
        const megumiRecast = (this.c.base || this.c.id) === 'megumi' && this.mahoraga && !this.mahoraga.dead;
        const megumiUltName = megumiRecast ? (this.c.moves.ult.recastName || '十种影法术！') : this.c.moves.ult.name;
        game.cutin = {
            f: this,
            t: 0,
            dur: 64,
            name: megumiUltName,
            quote: megumiRecast ? megumiUltName : this.c.quotes[1]
        };
        AudioSys.play('ult');
        FX.addHitstop(ULT_CAST_FREEZE);
    }

    /* ------ 闪避 ------ */
    startDodge(dir) {
        if (this.busy() || this.dodgeCD > 0) return;
        this.setState('dodge');
        this.invuln = 22;
        this.dodgeCD = 90;
        /* 方向键决定前/后闪避方向，未按方向键时默认向后 */
        this.dodgeDir = dir === 1 || dir === -1 ? dir : this.facing * -1;
        this.vx = this.dodgeDir * 9;
        FX.burst(this.x, this.cy, '#ffffff', 10, 4, 18, 3);
        AudioSys.play('dash');
    }

    /* ------ 每帧更新 ------ */
    update(game) {
        this.animT++;
        if (this.flashT > 0) this.flashT--;
        if (this.invuln > 0) this.invuln--;
        if (this.dodgeCD > 0) this.dodgeCD--;
        if (this.cd.skill1 > 0) this.cd.skill1--;
        if (this.cd.skill2 > 0) this.cd.skill2--;
        if (this.cd.skill3 > 0) this.cd.skill3--;
        if (this.comboTimer > 0) {
            this.comboTimer--;
            if (this.comboTimer === 0) {
                this.combo = 0;
                this.comboDmg = 0;
            }
        }
        if (this.skillDisabled > 0) { this.skillDisabled--; if (this.skillDisabled === 0) FX.text(this.x, this.cy - 80, '术式恢复', '#7be8d8', 22); }

        /* 真人遍杀即灵体状态计时 */
        if (this.hensetsu > 0) {
            this.hensetsu--;
            if (this.hensetsu === 0 && this.hensetsuActive) {
                this.hensetsuActive = false;
                this.d.atkMul /= (this.c.hensetsu ? this.c.hensetsu.atkMul : 1.2);
                this.d.dmgTaken /= (this.c.hensetsu ? (1 / this.c.hensetsu.defMul) : (1 / 1.2));
                this.d.speed /= (this.c.hensetsu ? (this.c.hensetsu.spdMul || 1.25) : 1.25);
                FX.text(this.x, this.cy - 100, '遍杀即灵体解除', '#a8d8ff', 22);
                FX.burst(this.x, this.cy, '#a8d8ff', 12, 5, 20, 3);
            }
        }

        /* 七海建人加班形态计时 */
        if (this.overtime > 0) {
            this.overtime--;
            if (this.overtime === 0 && this.overtimeActive) {
                this.overtimeActive = false;
                FX.text(this.x, this.cy - 100, '加班结束', '#e8c86a', 22);
                FX.burst(this.x, this.cy, '#e8c86a', 10, 4, 18, 3);
            }
        }

        /* 甚尔杀戮本能计时：结束时还原攻防加成 */
        if (this.slaughter > 0) {
            this.slaughter--;
            if (this.slaughter === 0 && this.slaughterActive) {
                this.slaughterActive = false;
                this.d.atkMul /= 1.25;
                this.d.dmgTaken /= 0.8;
                FX.text(this.x, this.cy - 100, '杀戮本能解除', '#c8d4e8', 22);
                FX.burst(this.x, this.cy, '#9aa8b8', 12, 5, 20, 3);
            }
        }

        const foe = this.foe;
        if (foe && !foe.dead && !this.dead && ['idle', 'walk', 'block'].includes(this.state)) this.facing = foe.x >= this.x ? 1 : -1;

        this.st++;
        /* 遍杀即灵体加速：攻击/施法动画每4帧额外推进1逻辑帧（约+25%速度），
           逐帧推进不跳帧，保证 t === X 的命中/施法帧判定正常触发 */
        if (this.hensetsuActive && this.animT % 4 === 0) {
            if (this.state === 'attack') { this.attackFrame(); this.st++; }
            else if (this.state === 'skill') { this.skillFrame(game); this.st++; }
        }
        switch (this.state) {
            case 'idle':
            case 'walk':
            case 'block':
                this.controlUpdate(game);
                if (this.state === 'walk') this.vx = (this.vx < 0 ? -1 : 1) * this.d.speed;
                break;
            case 'attack':
                this.attackFrame();
                if (this.st >= this.attackDur) { this.setState('idle'); if (this.attackKind === 'heavy') this.attackStep = 0; }
                break;
            case 'skill':
                this.skillFrame(game);
                if (this.st >= this.skillDur) this.setState('idle');
                break;
            case 'ult':
                if (this.st === 2) this.ultDone = false;
                if (!this.ultDone && (!game.cutin || game.cutin.t >= game.cutin.dur - 6)) {
                    this.ultDone = true;
                    this.ultCasting = false;
                    this.ultEffect(game);
                }
                // 前期伏黑惠的必杀会在同一个 ult 状态内依次执行三种影法术，
                // 不经过 startSkill，因此不会写入或重置 skill1/2/3 的 CD。
                if (this.ultSequenceActive && this.ultSequenceFrame) this.ultSequenceFrame(game);
                if (game.domainClash) { if (this.st >= 90) this.st = 90; break; }
                if (this.st >= (this.ultDur || 90)) this.setState('idle');
                break;
            case 'hurt':
                if (this.st >= (this.hurtLen || 20) && this.onGround) {
                    this.setState('idle');
                    this.hurtCombo = 0;
                }
                break;
            case 'launched':
                if (this.onGround && this.st > 6) {
                    this.setState('wakeup');
                    this.hurtCombo = 0;
                }
                break;
            case 'wakeup':
                if (this.st >= 18) this.setState('idle');
                break;
            case 'blockstun':
                if (this.blockstun > 0) { this.blockstun--; }
                if (this.blockstun <= 0) this.setState('idle');
                break;
            case 'dodge':
                if (this.st >= 24) this.setState('idle');
                break;
            case 'clashing':
                break;
            case 'ko':
                break;
        }

        // 领域对抗期间禁止移动、攻击、受击判定
        if (this.state === 'clashing') return;

        if (this.attackBox) {
            const b = this.attackBox,
                tg = this.foe;
            this.attackBox = null;
            if (tg && tg.hittable()) {
                if (Math.abs(tg.x - b.x) < b.w / 2 + 34 && Math.abs(tg.cy - b.y) < b.h / 2 + 56) {
                    /* 黑闪机制：所有角色轻/重攻击命中 1% 触发；
                       虎杖悠仁（前期）普攻/重攻/技能/必杀命中均 10% 触发 */
                    const bfEligible = this.state === 'attack' ||
                        (this.c.id === 'yuji' && (this.state === 'skill' || this.state === 'ult'));
                    if (bfEligible && this.tryBlackFlash(tg, b)) {
                        /* 黑闪已结算（含伤害与演出） */
                    } else if (this.c.id === 'nanami' && this.overtimeActive && RNG.chance(this.c.overtime ? this.c.overtime.critChance : 0.3)) {
                        /* 加班暴击：七海建人加班形态期间30%概率双倍伤害 */
                        const critMul = this.c.overtime ? this.c.overtime.critMul : 2.0;
                        const boosted = Object.assign({}, b, { dmg: b.dmg * critMul, dmgColor: '#e8c86a' });
                        tg.takeHit(this, boosted);
                        FX.flash('#e8c86a', 0.3, 8);
                        FX.addShake(10);
                        FX.addHitstop(10);
                        FX.ring(tg.x, tg.cy, '#e8c86a', 70, 5);
                        FX.burst(tg.x, tg.cy, '#e8c86a', 16, 7, 28, 4);
                        FX.text(tg.x, tg.cy - 110, '加班暴击!', '#e8c86a', 30);
                        AudioSys.play('hit3');
                    } else {
                        tg.takeHit(this, b);
                    }
                    if (this.state === 'attack' && this.attackStep === 3) this.attackStep = 0;
                }
            }
            for (const al of game.allies) {
                // 召唤者不能误伤自己的魔虚罗；魔虚罗仍会按自身 AI 锁定双方目标。
                if (!al.dead && al.owner !== this &&
                    Math.abs(al.x - b.x) < b.w / 2 + 44 && Math.abs(al.cy - b.y) < b.h / 2 + 72) {
                    al.takeHit(this, b);
                }
            }
        }

        this.x += this.vx;
        this.y += this.vy;
        if (['launched', 'hurt', 'ko', 'dodge'].includes(this.state)) this.vx *= 0.94;
        else if (this.state !== 'walk') this.vx *= 0.7;
        if (this.y < GROUND) this.vy += GRAV;
        if (this.y >= GROUND) {
            this.y = GROUND;
            this.vy = 0;
            this.onGround = true;
        } else this.onGround = false;
        this.x = clamp(this.x, 70, VW - 70);

        if (foe && !foe.dead && !this.dead) {
            const dx = foe.x - this.x;
            if (Math.abs(dx) < 64 && Math.abs(this.y - foe.y) < 100) {
                const push = (64 - Math.abs(dx)) / 2 * (dx > 0 ? 1 : -1);
                this.x -= push;
                foe.x += push;
            }
        }
    }

    controlUpdate(game) {
        if (this.dead) return;
        if (this.isAI) { this.aiUpdate(game); return; }
        const map = KEYMAP[this.side === 0 ? 'p1' : 'p2'];
        // 术士禁用期间吞掉技能与必杀输入
        if (this.skillDisabled > 0) {
            Input.consume(map, 'skill1');
            Input.consume(map, 'skill2');
            Input.consume(map, 'skill3');
            Input.consume(map, 'ult');
        }
        this.blockHeld = Input.held(map, 'block') && this.onGround;
        if (this.blockHeld) {
            this.state = 'block';
            this.vx = 0;
            return;
        } else if (this.state === 'block') this.state = 'idle';

        let mv = 0;
        if (Input.held(map, 'left')) mv = -1;
        if (Input.held(map, 'right')) mv = 1;
        if (mv !== 0) {
            this.vx = mv * this.d.speed;
            this.state = 'walk';
        } else {
            this.vx *= 0.5;
            this.state = 'idle';
        }

        if (Input.pressed(map, 'jump') && this.onGround) {
            this.vy = -this.d.jumpV;
            this.onGround = false;
            AudioSys.play('jump');
            Input.consume(map, 'jump');
        }
        if (Input.pressed(map, 'dodge')) {
            this.startDodge(mv); // 按住方向键则朝该方向闪避，否则默认后闪
            Input.consume(map, 'dodge');
        }
        if (Input.pressed(map, 'light')) {
            this.startAttack('light');
            Input.consume(map, 'light');
        } else if (Input.pressed(map, 'heavy')) {
            this.startAttack('heavy');
            Input.consume(map, 'heavy');
        } else if (Input.pressed(map, 'skill1') && this.skillDisabled <= 0) {
            this.startSkill('skill1');
            Input.consume(map, 'skill1');
        } else if (Input.pressed(map, 'skill2') && this.skillDisabled <= 0) {
            this.startSkill('skill2');
            Input.consume(map, 'skill2');
        } else if (Input.pressed(map, 'skill3') && this.skillDisabled <= 0) {
            this.startSkill('skill3');
            Input.consume(map, 'skill3');
        } else if (Input.pressed(map, 'ult') && this.skillDisabled <= 0) {
            this.startUlt(game);
            Input.consume(map, 'ult');
        }
    }

    /* ------ AI（三级难度差异化） ------ */
    aiUpdate(game) {
        const foe = this.foe;
        if (!foe) return;
        const ai = this.ai;
        ai.t++;
        const D = this.diff;
        const dist = Math.abs(foe.x - this.x);
        const dir = foe.x > this.x ? 1 : -1;
        const style = this.c.aiStyle;
        this.blockHeld = false;
        if (this.state === 'block') this.state = 'idle';

        /* 即时反应层（困难以上才有反应能力：格挡/闪避对手攻击） */
        if (foe.state === 'attack' && dist < 200 && RNG.chance(D.blockP * 0.14)) {
            if (RNG.chance(D.blockP)) {
                ai.plan = 'block';
                ai.planT = 0;
            } else if (RNG.chance(D.dodgeP) && this.dodgeCD <= 0) { this.startDodge(); }
        }
        if (foe.state === 'skill' && dist < 320 && RNG.chance(D.react * 0.05)) {
            if (RNG.chance(D.dodgeP) && this.dodgeCD <= 0) this.startDodge();
            else ai.plan = 'retreat';
        }
        /* 困难：对手开领域且自身也有领域展开时，立刻用自己领域对抗 */
        if (foe.state === 'ult' && hasDomainUlt(foe.c) && hasDomainUlt(this.c) && this.canUlt() && D.ultP > 0.5) {
            ai.plan = 'ult';
        }

        /* 决策层：频率由难度决定 */
        if (ai.t - ai.decideTick >= D.decide) {
            ai.decideTick = ai.t;
            const r = RNG.random();
            const aggro = D.aggro;
            if (dist > 460) ai.plan = style === 'zoner' ? (r < D.skillP ? 'skill' : 'approach') : (r < aggro ? 'dashin' : 'approach');
            else if (dist > 200) ai.plan = r < aggro * 0.6 ? 'approach' : (r < D.skillP ? 'skill' : 'dashin');
            else ai.plan = r < aggro * 0.62 ? 'attack' : (r < aggro * 0.62 + D.skillP * 0.25 ? 'skill' : (r < 0.86 ? 'block' : 'retreat'));
            if (this.canUlt() && dist < 480 && RNG.chance(D.ultP)) ai.plan = 'ult';
            if (this.hp < this.d.maxHp * 0.3 && RNG.chance(0.3) && D.react > 0.3) ai.plan = 'retreat';
        }

        switch (ai.plan) {
            case 'approach':
                this.vx = dir * this.d.speed;
                this.state = 'walk';
                break;
            case 'dashin':
                this.vx = dir * this.d.speed * 1.2;
                this.state = 'walk';
                if (dist < 140) { ai.plan = 'attack'; }
                break;
            case 'retreat':
                this.vx = -dir * this.d.speed * 0.9;
                this.state = 'walk';
                break;
            case 'block':
                this.blockHeld = true;
                this.state = 'block';
                this.vx = 0;
                break;
            case 'attack':
                if (dist > 160) {
                    this.vx = dir * this.d.speed;
                    this.state = 'walk';
                } else {
                    this.vx = 0;
                    /* 连击倾向：困难AI会接完整三段+重击，简单只打一下 */
                    const atkRoll = RNG.random();
                    if (atkRoll < 0.05 + D.comboP * 0.05) {
                        const kind = (this.attackStep >= 2 && RNG.chance(D.comboP)) ? 'heavy' : (RNG.chance(0.75) ? 'light' : 'heavy');
                        this.startAttack(kind);
                    }
                    if (dist < 100 && RNG.chance(D.dodgeP * 0.04)) this.startDodge();
                }
                break;
            case 'skill':
                {
                    const pool = ['skill1', 'skill2', 'skill3'].filter(k => this.canSkill(k));
                    if (pool.length) {
                        const k = pool[RNG.irand(0, pool.length - 1)];
                        const ranged = ['gojo', 'sukuna', 'sukunaMegumi', 'kenjaku', 'jogo', 'okkotsu', 'hanami', 'ryu', 'uro', 'druv', 'kuro', 'dagon'].includes(this.c.base || this.c.id);
                        const inRange = ranged ? true : dist < 320;
                        if (inRange) this.startSkill(k);
                        else {
                            this.vx = dir * this.d.speed;
                            this.state = 'walk';
                        }
                    } else {
                        this.vx = dir * this.d.speed;
                        this.state = 'walk';
                    }
                    break;
                }
            case 'ult':
                if (this.canUlt()) this.startUlt(game);
                else ai.plan = 'approach';
                break;
            default:
                this.state = 'idle';
                this.vx = 0;
        }
        if (RNG.chance(0.004 + D.react * 0.006) && this.onGround && dist < 320) {
            this.vy = -this.d.jumpV;
            this.onGround = false;
        }
        if (this.state === 'idle' && !this.blockHeld) this.vx *= 0.6;
    }

    /* ------ 绘制角色：交给独立渲染器 ------ */
    draw(g) {
        drawFighter(g, this);
    }
}
