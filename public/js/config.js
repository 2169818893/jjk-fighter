/* =====================================================================
   全局常量、角色数据与设置
   ===================================================================== */

/* ---------------- 基础常量 ---------------- */
export const VW = 1280,
    VH = 720; // 虚拟分辨率（响应式缩放基准）
export const GROUND = 600; // 地面 Y
export const GRAV = 0.9;
export const ROUND_TIME = 99;
export const TARGET_WINS = 2; // BO3
export const ARCADE_STAGES = 10; // 闯关模式总关卡数

/* 必杀技释放保护参数 */
export const ULT_CAST_FREEZE = 15; // 释放瞬间全局顿帧，@60fps ≈ 0.25s

/* 黑闪机制参数（通用机制 + 虎杖悠仁前期专属加成） */
export const BLACK_FLASH = {
    chance: 0.01,      // 通用触发概率：所有角色轻/重攻击命中 1%
    yujiChance: 0.10,  // 虎杖悠仁（前期 yuji）专属基础概率：普攻/重攻/技能/必杀均 10%
    yujiComboStep: 0.005, // 虎杖悠仁连击加成：连击每 +1，黑闪概率 +0.5%；连击中断归零后回落 10%
    dmgMul: 2.5,       // 伤害倍率（2.5次方威力）
    healAmount: 18,    // 触发时回复生命值
    healRatio: 0.012   // 备选：按最大生命比例回复（取两者较大值）
};

/* 设置面板光标常量 */
export const SET_C = {
    DIFF_SELECT: 0,
    TIME_SELECT: 0,
    AUDIO_MUSIC: 0,
    AUDIO_PREVIEW: 1
};

/* ---------------- 角色数据 ---------------- */
export const CHARS = {
    gojo: {
        id: 'gojo',
        name: '五条悟',
        nameJp: '五条 悟',
        title: '现代最强咒术师 · 无下限术式',
        color: '#59c8ff',
        color2: '#1b6fd6',
        aura: 'rgba(120,210,255,',
        skin: '#f2c9a4',
        hair: '#eef6ff',
        cloth: '#17131f',
        clothSub: '#141020',
        accent: '#59c8ff',
        eyeColor: '#35c4ff',
        blindfold: '#0a0e18',
        sixEyes: true,
        style: 'human',
        weapon: null,
        domain: 10,
        hp: 1000,
        atk: 9,
        def: 8,
        spd: 7,
        aiStyle: 'zoner',
        quotes: ['没关系，我是最强的。', '领域展开——无量空处。'],
        moves: {
            skill1: { name: '术式顺转 · 苍', cd: 8, desc: '收束咒力生成负无穷引力核，吸拽周围一切并将命中的对手强行拉近' },
            skill2: { name: '术式反转 · 赫', cd: 11, desc: '反转术式输出正无穷斥力，蓄集后将面前对手轰飞' },
            skill3: { name: '虚式 · 茈', cd: 16, desc: '苍与赫碰撞湮灭而成的假想质量，直击对手后原地起爆造成二段伤害' },
            ult: { name: '领域展开 · 无量空处', isDomain: true, desc: '无下限的内侧：无限情报灌入脑内，使对手知觉与行动彻底瘫痪' }
        }
    },
    gojo2: {
        id: 'gojo2',
        base: 'gojo', // 行为逻辑完全复用五条本体，仅外观不同（新宿决战服装）
        name: '五条悟',
        nameJp: '五条 悟（新宿决战）',
        title: '新宿决战 · 最强之姿',
        color: '#59c8ff',
        color2: '#1b6fd6',
        aura: 'rgba(120,210,255,',
        skin: '#f2c9a4',
        hair: '#eef6ff',
        cloth: '#181b20',      // 黑色紧身短袖T恤
        clothSub: '#c4c8ce',   // 浅灰宽松长裤
        accent: '#59c8ff',
        eyeColor: '#35c4ff',
        armColor: '#f2c9a4',   // 短袖露臂
        sleeveCap: true,       // 肩部短袖套口
        shoeColor: '#111318',  // 黑色一脚蹬布鞋
        sashColor: '#2c3a68',  // 腰间藏青束带
        sixEyes: true,
        style: 'human',
        weapon: null,
        domain: 10,
        hp: 1000,
        atk: 9,
        def: 8,
        spd: 7,
        aiStyle: 'zoner',
        quotes: ['会赢的!', '你才是挑战者!', '领域展开——无量空处。'],
        moves: {
            skill1: { name: '术式顺转 · 苍', cd: 8, desc: '收束咒力生成负无穷引力核，吸拽并拉近命中的对手；长按可蓄力1.25秒增强，蓄满按↑上抛悬空引力核（滞空20秒）' },
            skill2: { name: '术式反转 · 赫', cd: 11, desc: '反转术式输出正无穷斥力轰飞对手；蓄满后按↑上抛或直接向前射出斥力核，与悬空苍核相撞引发无限制·茈' },
            skill3: { name: '虚式 · 茈', cd: 16, desc: '苍与赫碰撞湮灭而成的假想质量，直击后原地起爆二段伤害；长按可蓄力增幅威力与范围' },
            ult: { name: '领域展开 · 无量空处', isDomain: true, desc: '无下限的内侧：无限情报灌入脑内，使对手知觉与行动彻底瘫痪' }
        }
    },
    megumi: {
        id: 'megumi',
        name: '伏黑惠',
        nameJp: '伏黑 惠',
        title: '十种影法术 · 式神使（前期）',
        color: '#8f7bff',
        color2: '#3a2f8f',
        aura: 'rgba(150,130,255,',
        skin: '#f2c9a4',
        hair: '#101418',
        hairShade: '#2a3244',
        eyeColor: '#2a4a6e',
        shadow: '#171226',
        cloth: '#1a2038',
        clothSub: '#232a48',
        shoeColor: '#a8834e',
        accent: '#8f7bff',
        style: 'human',
        weapon: null,
        domain: 3,
        hp: 980,
        atk: 7,
        def: 6,
        spd: 7,
        aiStyle: 'balanced',
        quotes: ['我并非善人，我是咒术师。', '布瑠部由良由良……来吧，魔虚罗！', '影子所及之处，都是我的武器。'],
        moves: {
            skill1: { name: '玉犬', cd: 7, desc: '黑白双犬自影中跃出，交错疾驰撕咬' },
            skill2: { name: '鵺', cd: 11, desc: '雷鸟式神自空中俯冲，带麻痹电击' },
            skill3: { name: '脱兔', cd: 10, desc: '无数白兔自影中涌出扰乱敌人，借势影遁突进' },
            ult: { name: '八握剑异戒神将 · 魔虚罗', recastName: '十种影法术！', desc: '首次召唤永久存在的魔虚罗；再次释放进入十种影法术连放，魔虚罗仍会锁定并攻击双方，但伏黑惠不会误伤自己的魔虚罗（魔虚罗可被敌方攻击击破）' }
        }
    },
    megumi2: {
        id: 'megumi2',
        name: '伏黑惠 · 觉醒',
        nameJp: '伏黑 惠（领域展开）',
        title: '十种影法术 · 嵌合暗翳庭（后期）',
        color: '#6a5cff',
        color2: '#241a6e',
        aura: 'rgba(115,95,255,',
        skin: '#f2c9a4',
        hair: '#101418',
        hairShade: '#2a3244',
        eyeColor: '#2a4a6e',
        shadow: '#120c22',
        cloth: '#161c34',
        clothSub: '#1e2542',
        shoeColor: '#a8834e',
        accent: '#6a5cff',
        style: 'human',
        weapon: null,
        domain: 9,
        hp: 1020,
        atk: 8,
        def: 7,
        spd: 7,
        aiStyle: 'balanced',
        quotes: ['就在这里——超越你。', '领域展开——嵌合暗翳庭。', '影之水漫过之处，式神无穷。'],
        moves: {
            skill1: { name: '玉犬 · 浑', cd: 8, desc: '继承白犬之力的漆黑神犬，影爪撕碎一切' },
            skill2: { name: '大蛇', cd: 12, desc: '巨蛇自影中窜出，张口吞咬前方敌人' },
            skill3: { name: '不知井底', cd: 14, desc: '鵺与虾蟆的嵌合式神自空中投下，长时间缠缚压制敌人' },
            ult: { name: '领域展开 · 嵌合暗翳庭', isDomain: true, desc: '影之水漫延的未完成领域，无数式神自暗翳中轮番袭击' }
        }
    },
    yuji: {
        id: 'yuji',
        name: '虎杖悠仁',
        nameJp: '虎杖 悠仁',
        title: '径庭拳 · 宿傩容器（前期）',
        color: '#ff7a5c',
        color2: '#a02c1a',
        aura: 'rgba(255,140,110,',
        skin: '#f2c9a4',
        hair: '#e8a2aa',
        hairShade: '#4a343c',
        eyeColor: '#6a4426',
        cloth: '#262e54',
        clothSub: '#232838',
        accent: '#c8321e',
        hoodColor: '#b8241a',
        shoeColor: '#b02820',
        style: 'human',
        weapon: null,
        domain: 0,
        hp: 1120,
        atk: 8,
        def: 8,
        spd: 8,
        aiStyle: 'rusher',
        quotes: ['我要让所有人都能正确地死去！', '黑闪——！'],
        moves: {
            skill1: { name: '径庭拳', cd: 7, desc: '咒力延迟0.5秒的二次冲击重拳，第一击命中后咒力爆发产生第二次打击' },
            skill2: { name: '体道之卍字踢', cd: 11, desc: '以全身轴心旋转带动的卍字形回旋踢，咒力缠绕足尖贯穿敌人' },
            ult: { name: '黑闪五连击', desc: '连续五次触发黑闪的极限连击，每一拳都是空间扭曲的2.5次方暴击' }
        }
    },
    yuji2: {
        id: 'yuji2',
        name: '虎杖悠仁 · 决意',
        nameJp: '虎杖 悠仁（新宿决战）',
        title: '御厨子刻印 · 新宿决战（后期）',
        color: '#ff3a3a',
        color2: '#4a0808',
        aura: 'rgba(255,50,50,',
        skin: '#f2c9a4',
        hair: '#e8a2aa',
        hairShade: '#4a343c',
        eyeColor: '#5a3a22',
        cloth: '#161a26',
        clothSub: '#1a1f2c',
        accent: '#ff2b2b',
        hoodColor: '#c02418',
        gloveColor: '#c8342a',
        wrapColor: '#8a5a3a',
        shoeColor: '#b02820',
        bloodColor: '#8a0012',
        slashColor: '#c8e8ff',
        style: 'human',
        weapon: null,
        domain: 4,
        hp: 1200,
        atk: 10,
        def: 8,
        spd: 8,
        aiStyle: 'rusher',
        quotes: ['我就是我，不是宿傩。', '领域展开——！', '这一拳，赌上所有人的未来。'],
        moves: {
            skill1: { name: '黑闪', cd: 7, desc: '咒力与打击在0.000001秒内同步的空间扭曲暴击，黑色闪电贯穿一切' },
            skill2: { name: '穿血', cd: 11, desc: '压缩血液化作高速血矢，贯穿直线上的一切敌人' },
            skill3: { name: '灵魂解', cd: 13, desc: '御厨子刻印发动，沿灵魂裁剪线连续斩切对手' },
            ult: { name: '领域展开 · 仙台', isDomain: true, desc: '故乡仙台景象的领域，斩击无需触碰即可剥离灵魂' }
        }
    },
    sukuna: {
        id: 'sukuna',
        name: '两面宿傩',
        nameJp: '两面宿傩',
        title: '诅咒之王 · 伏魔御厨子',
        color: '#ff4d6d',
        color2: '#7a1030',
        aura: 'rgba(255,80,120,',
        skin: '#e8c39e',
        hair: '#e8808e',
        hairShade: '#c05a6a',
        cloth: '#2c3752',
        clothSub: '#222b40',
        armColor: '#e8c39e',
        accent: '#e8d8c8',
        eyeColor: '#ff2438',
        markings: '#17171c',
        style: 'human',
        weapon: null,
        domain: 10,
        hp: 1080,
        atk: 10,
        def: 7,
        spd: 7,
        aiStyle: 'zoner',
        quotes: ['跪下，杂碎。', '愉悦……实在是愉悦。', '领域展开——伏魔御厨子。'],
        moves: {
            skill1: { name: '解', cd: 6, desc: '无形斩击隔空裂敌（三连斩波）' },
            skill2: { name: '捌', cd: 10, desc: '依咒力差调整的近身乱斩' },
            skill3: { name: '灶 · 开', cd: 15, desc: '长按可蓄力1.5秒，火矢破空飞出，命中或落点引发粉尘爆炸' },
            ult: { name: '领域展开 · 伏魔御厨子', isDomain: true, desc: '无结界封闭的领域，范围内万物皆被无限斩击' }
        }
    },
    sukunaMegumi: {
        id: 'sukunaMegumi',
        name: '两面宿傩·受肉伏黑惠',
        nameJp: '両面宿儺·伏黒 恵受肉',
        title: '黑发受肉之躯 · 伏魔御厨子与十种影法术',
        color: '#d83c55',
        color2: '#211326',
        aura: 'rgba(196,35,65,',
        skin: '#efc5a5',
        hair: '#11151d',
        hairShade: '#293044',
        eyeColor: '#e6334f',
        cloth: '#e7e8eb',
        clothSub: '#d9dce1',
        armColor: '#e7e8eb',
        pants: '#e4e5e8',
        legColor: '#e4e5e8',
        shoeColor: '#171a20',
        accent: '#e04a5c',
        markings: '#35121c',
        collar: '#0d111a',
        sashColor: '#141820',
        style: 'sukunaMegumi',
        weapon: null,
        domain: 10,
        hp: 1060,
        atk: 9,
        def: 7,
        spd: 7,
        aiStyle: 'zoner',
        quotes: ['这副身体……正合我意。', '伏魔御厨子，开。', '布瑠部由良由良——魔虚罗，适应吧。'],
        moves: {
            skill1: { name: '解', cd: 7, desc: '以伏黑惠的身体释放三连斩波，远距离切裂敌人' },
            skill2: { name: '捌', cd: 11, desc: '贴身触碰后发动多段斩击，距离越近越凶险' },
            skill3: { name: '魔虚罗与颚吐／空间斩', cd: 18, transformedCd: 35, desc: '首次同时召唤两只永久式神，之后转化为斩断空间的远程斩击' },
            ult: { name: '领域展开 · 伏魔御厨子', isDomain: true, desc: '开放式伏魔御厨子：持续斩击、范围领域效果与终结斩' }
        }
    },
    okkotsu: {
        id: 'okkotsu',
        name: '乙骨忧太',
        nameJp: '乙骨 忧太',
        title: '纯爱战神 · 特级术师',
        color: '#7be8d8',
        color2: '#1a6e62',
        aura: 'rgba(130,235,215,',
        skin: '#f2d2b0',
        hair: '#0e1118',
        hairShade: '#3a4468',
        eyeColor: '#1a1e26',
        cloth: '#e8ecf2',
        clothSub: '#14181f',
        accent: '#2a9d8f',
        rikaColor: '#b89aff',
        rikaBody: '#241a3a',
        bladeColor: '#c8e8ff',
        style: 'human',
        weapon: 'katana',
        domain: 9,
        hp: 1060,
        atk: 9,
        def: 8,
        spd: 7,
        aiStyle: 'balanced',
        quotes: ['真是失礼，我们可是纯爱。', '来吧，里香。该用全力了。', '领域展开——真赝相爱。'],
        moves: {
            skill1: { name: '里香 · 铁拳', cd: 8, desc: '里香巨腕显现，横扫面前之敌，紫色灵体拳压粉碎一切' },
            skill2: { name: '术式模仿 · 咒言', cd: 12, desc: '模仿狗卷的咒言，“爆炸吧”令前方敌人完全僵直' },
            skill3: { name: '里香 · 冲击波', cd: 14, desc: '里香完全显现，口中凝聚紫色能量发射贯穿冲击波' },
            ult: { name: '领域展开 · 真赝相爱', isDomain: true, desc: '插满刀剑的领域，随机术式必中连击，里香与乙骨共同斩杀' }
        }
    },
    mahito: {
        id: 'mahito',
        name: '真人',
        nameJp: '真人',
        title: '无为转变 · 灵魂改造',
        color: '#a8d8ff',
        color2: '#3a5a8f',
        aura: 'rgba(170,215,255,',
        skin: '#e6dce4',
        hair: '#a9c6d6',
        hairShade: '#6e93a8',
        eyeColorL: '#14141c',
        eyeColorR: '#14141c',
        cloth: '#2e2e38',
        clothSub: '#16161e',
        armColor: '#e6dce4',
        shoeColor: '#e4e4e8',
        accent: '#4a4a58',
        stitchColor: '#7a6a7e',
        meshColor: '#3e3e4c',
        transformedColor: '#b8c2d2',
        style: 'stitch',
        weapon: null,
        domain: 6,
        hp: 1040,
        atk: 8,
        def: 9,
        spd: 7,
        aiStyle: 'balanced',
        /* 遍杀即灵体状态参数（spdMul：移动速度倍率；攻击/施法加速25%由战斗循环每4帧额外推进1帧实现） */
        hensetsu: { duration: 480, atkMul: 1.2, defMul: 1.2, spdMul: 1.25 },
        quotes: ['灵魂的形状，真有趣啊。', '领域展开——自闭圆顿裹。', '遍杀即灵体——这才是我真正的姿态！'],
        moves: {
            skill1: { name: '无为转变 · 腕刃', cd: 8, desc: '手臂瞬间变形为巨刃横扫，触碰即改造灵魂' },
            skill2: { name: '多重魂 · 拨体', cd: 11, desc: '吐出体内储存的改造人，融合为多形体爆发射出' },
            skill3: { name: '遍杀即灵体', cd: 20, desc: '撕去人脸觉醒灵魂本质，攻防+20%，移动/攻击/施法速度+25%，持续8秒' },
            ult: { name: '领域展开 · 自闭圆顿裹', isDomain: true, desc: '领域内无需触碰即可发动无为转变，必中改造对手肉体' }
        }
    },
    nanami: {
        id: 'nanami',
        name: '七海建人',
        nameJp: '七海 建人',
        title: '十划咒法 · 成年人中的成年人',
        color: '#e8c86a',
        color2: '#8f6e1a',
        aura: 'rgba(235,205,120,',
        skin: '#f0c8a2',
        hair: '#c8a86a',
        hairShade: '#a08040',
        eyeColor: '#3a2a1a',
        cloth: '#d8d0b8',
        clothSub: '#c8c0a8',
        accent: '#e8c86a',
        shirtColor: '#4a6a9a',
        tieColor: '#5a6a3a',
        tieSpot: '#1a1a14',
        glassesColor: '#2a2a2a',
        glassesLens: 'rgba(90,138,90,0.2)',
        shoeColor: '#5a3a1a',
        style: 'suit',
        weapon: 'umbrella',
        umbrellaBase: '#e8e4d8',
        umbrellaSpot: '#1a1a14',
        umbrellaHandle: '#1a1a1a',
        domain: 0,
        hp: 1020,
        atk: 8,
        def: 8,
        spd: 7,
        aiStyle: 'balanced',
        /* 加班形态参数 */
        overtime: { duration: 720, critChance: 0.30, critMul: 2.0 },
        quotes: ['咒术师就是狗屎。', '加班时间到了——全力以赴。', '劳动就是狗屎！'],
        moves: {
            skill1: { name: '十划咒法 · 闷斩', cd: 8, desc: '在对手7:3分界点强制制造弱点，沿分界线精准斩下触发暴击' },
            skill2: { name: '十划咒法 · 连劈', cd: 12, desc: '连续多段沿不同7:3分界线切割，节奏干脆，末段击退' },
            skill3: { name: '十划咒法 · 崩落', cd: 14, desc: '蓄力强力下劈，咒力注入地面造成范围崩裂伤害+僵直' },
            ult: { name: 'Overtime · 加班时间', desc: '进入加班形态12秒，所有攻击30%概率触发双倍伤害' }
        }
    },
    kenjaku: {
        id: 'kenjaku',
        name: '羂索',
        nameJp: '羂索（夏油杰的肉体）',
        title: '千年宿敌 · 盗掌他人之躯的咒术师',
        color: '#b88fd8',
        color2: '#4a2a6e',
        aura: 'rgba(190,150,235,',
        skin: '#f0c8a2',
        hair: '#14101a',
        hairShade: '#2e2440',
        eyeColor: '#3a2a4a',
        cloth: '#1a2a44',
        clothSub: '#141c2e',
        accent: '#b88fd8',
        robeTrim: '#c8a85a',
        vest: '#3a5a2a',
        vestTrim: '#c8a85a',
        collar: '#e8e4dc',
        stitch: '#7a5a4a',
        shoeColor: '#e8e4dc',
        sandalStrap: '#cc3030',
        style: 'kenjaku',
        weapon: null,
        domain: 8,
        hp: 1060,
        atk: 9,
        def: 7,
        spd: 6,
        aiStyle: 'zoner',
        quotes: ['来吧，一起把人类的可能性推向极限。', '领域展开——胎藏遍野。', '咒力的最优化……真是有趣。'],
        moves: {
            skill1: { name: '术式：咒灵操术', cd: 7, desc: '解放收服的咒灵群，操纵数只咒灵成群扑咬撕扯敌人' },
            skill2: { name: '术式：反重力机构', cd: 12, desc: '夺自九十九由基的术式：反转对手体感重力，将其无重掀上半空后再狠狠砸回地面' },
            skill3: { name: '极之番「漩涡」', cd: 14, desc: '将上千咒灵压缩凝练成一点，轰出足以抹消一切的超高纯度咒力漩涡' },
            ult: { name: '领域展开「胎藏遍野」', isDomain: true, desc: '胎藏曼荼罗遍野展开：领域内亿万咒灵自胎界孕育涌出，将对手吞没于咒灵的汪洋' }
        }
    },
    hanami: {
        id: 'hanami',
        name: '花御',
        nameJp: '花御',
        title: '特级咒灵 · 森林之咒',
        color: '#8fe87b',
        color2: '#2a6e1a',
        aura: 'rgba(150,235,130,',
        skin: '#c8c8c0',
        hair: '#3a3a36',
        hairShade: '#5a5a54',
        cloth: '#1a1a1e',
        clothSub: '#121214',
        accent: '#cc3322',
        branch: '#e8e4d8',
        flower: '#e8e4d8',
        grain: '#2a2a26',
        bandage: '#e8e4d8',
        armColor: '#c8c8c0',
        legColor: '#1a1a1e',
        shoeColor: '#b8b8b0',
        gloveColor: '#c8c8c0',
        deep: '#2a2a26',
        style: 'muscular',
        weapon: null,
        domain: 8,
        hp: 1160,
        atk: 8,
        def: 9,
        spd: 5,
        aiStyle: 'balanced',
        quotes: ['人类必须消失，为了大自然。', '领——域——展——开……未闻花名「朵颐光海」。'],
        moves: {
            skill1: { name: '树根', cd: 7, desc: '咒力具现化树根从地面接连贯穿，末段巨根挑空' },
            skill2: { name: '咒种', cd: 11, desc: '射出吸食咒力的咒种，扎根后持续生长，目标动用咒力时侵蚀加剧' },
            skill3: { name: '树鞠', cd: 12, desc: '具现化漂浮树鞠，伸出两根树根连续突刺后消失' },
            ult: { name: '领域展开 · 朵颐光海', isDomain: true, desc: '未闻花名之光海，花田奠式尽食生机' }
        }
    },
    jogo: {
        id: 'jogo',
        name: '漏瑚',
        nameJp: '漏瑚',
        title: '大地之咒 · 火山之怒',
        color: '#ff9a3c',
        color2: '#8f3a00',
        aura: 'rgba(255,160,80,',
        skin: '#a8b0b8',
        hair: '#6e5a3a',
        rock: '#6e5a3a',
        lava: '#ff6a2a',
        magma: '#ffd23c',
        sash: '#5a4028',
        cloth: '#a8c84a',
        clothSub: '#3a3a42',
        hat: '#6e5a3a',
        collar: '#f0ece4',
        spot: '#1a1a14',
        armColor: '#3a3a42',
        legColor: '#3a3a42',
        shoeColor: '#5a4028',
        gloveColor: '#a8b0b8',
        bootSole: '#cc4040',
        accent: '#ff9a3c',
        style: 'volcano',
        weapon: null,
        domain: 8,
        hp: 1080,
        atk: 9,
        def: 8,
        spd: 6,
        aiStyle: 'zoner',
        quotes: ['我们才算得上是真正的人类。', '你知道被人小瞧的心情吗？', '领域展开——盖棺铁围山！'],
        moves: {
            skill1: { name: '火焰术式', cd: 7, desc: '肆意操控火焰，任意处召唤丘状小火山喷出烈焰' },
            skill2: { name: '火烁虫', cd: 11, desc: '头顶火山养育的蚊形咒虫，声波+爆炸二段式攻击' },
            skill3: { name: '极之番 · 陨', cd: 15, desc: '术式威能提至极限，巨大炽热陨石轰然坠落' },
            ult: { name: '领域展开 · 盖棺铁围山', isDomain: true, desc: '生得领域，普通术师入内瞬间烧成灰烬' }
        }
    },
    dagon: {
        id: 'dagon',
        name: '陀艮',
        nameJp: '陀艮',
        title: '海洋之咒 · 水之咒灵',
        color: '#3ec8c0',
        color2: '#1a5a6e',
        aura: 'rgba(80,200,200,',
        skin: '#8b1a1a',
        hair: '#3a0a0a',
        deep: '#2a0808',
        water: '#59c8e8',
        foam: '#d8f4ff',
        fin: '#d2b48c',
        cloth: '#0a0a0e',
        clothSub: '#080810',
        armColor: '#8b1a1a',
        legColor: '#d2b48c',
        shoeColor: '#5a1010',
        gloveColor: '#8b1a1a',
        bandage: '#d2b48c',
        accent: '#3ec8c0',
        style: 'ocean',
        weapon: null,
        domain: 8,
        hp: 1100,
        atk: 8,
        def: 9,
        spd: 5,
        aiStyle: 'zoner',
        quotes: ['我们都是有名字的！！！', '领域展开——荡蕴平线。', '海洋，是人类恐惧的故乡。'],
        moves: {
            skill1: { name: '激流 · 水铁炮', cd: 7, desc: '压缩海水凝成高压水弹连射，激流贯穿冲击对手' },
            skill2: { name: '水阵壁', cd: 12, desc: '展开环身水屏障护体减伤，随后化为激流奔涌淹没对手' },
            skill3: { name: '死累累涌军', cd: 14, desc: '解放术式召唤食肉鱼式神，自水中跃出连环撕咬对手' },
            ult: { name: '领域展开 · 荡蕴平线', isDomain: true, desc: '生得领域具现热带海滨，无限式神死累累涌军必中撕咬' }
        }
    },
    naoya: {
        id: 'naoya',
        name: '禅院直哉',
        nameJp: '禅院 直哉',
        title: '禅院家嫡子 · 投射咒法',
        color: '#d8e84a',
        color2: '#6e7a10',
        aura: 'rgba(225,240,110,',
        skin: '#f2c9a4',
        hair: '#a8c060',
        hairShade: '#7a9040',
        cloth: '#1a2228',
        clothSub: '#14181c',
        shirt: '#d8dce0',
        eyeColor: '#b0b8c0',
        legColor: '#b0b8c0',
        hakama: '#c4c8cc',
        shoeColor: '#3a3a38',
        sandalStrap: '#a8c060',
        accent: '#d8e84a',
        style: 'zenin',
        weapon: null,
        domain: 7,
        hp: 960,
        atk: 8,
        def: 6,
        spd: 10,
        aiStyle: 'rusher',
        quotes: ['冒牌货就该消失。', '1秒24帧——你的眼睛跟得上吗？', '领域展开——时胞月宫殿。'],
        moves: {
            skill1: { name: '投射咒法 · 24帧突进', cd: 7, desc: '一秒24分割预设动作，三段帧格瞬发的超高速突进' },
            skill2: { name: '投射咒法 · 定帧掌', cd: 10, desc: '手掌触碰强制同步术式，失败者被定帧冻结1秒' },
            skill3: { name: '空气爆炸', cd: 13, desc: '连续冻结空气后一拳击碎，引发大规模爆炸' },
            ult: { name: '领域展开 · 时胞月宫殿', isDomain: true, desc: '细胞级强制同步，一旦移动每个细胞都会错位重创' }
        }
    },
    toji: {
        id: 'toji',
        name: '伏黑甚尔',
        nameJp: '伏黑 甚尔',
        title: '天与暴君 · 术师杀手',
        color: '#9aa8b8',
        color2: '#3a4450',
        aura: 'rgba(160,175,195,',
        skin: '#e0b090',
        hair: '#101216',
        hairShade: '#2e3540',
        cloth: '#181c22',
        clothSub: '#10131a',
        pants: '#c0c4c8',
        pantsShadow: '#9a9ea4',
        beadColor: '#5a3a52',
        beadDark: '#3a2436',
        shoeColor: '#1a1c20',
        accent: '#9aa8b8',
        style: 'toji',
        weapon: 'sword',
        domain: 0,
        hp: 1060,
        atk: 9,
        def: 8,
        spd: 10,
        aiStyle: 'rusher',
        quotes: ['只对强者展露獠牙。', '天与咒缚——零咒力的怪物。', '术式？在绝对的肉体面前不值一提。'],
        moves: {
            skill1: { name: '释魂刀 · 斩魂', cd: 7, desc: '特级咒具长刀，无视一切硬度直斩魂魄的二连斩，无法格挡' },
            skill2: { name: '天逆鉾 · 术式解除', cd: 10, desc: '十手短刃突刺，消解周身咒术弹幕，命中后强制封禁对手术式3秒', },
            skill3: { name: '游云 · 三节乱打', cd: 13, desc: '无术式的纯粹物理乱舞，威力随自身体力（剩余体力越多越痛）', },
            ult: { name: '天与咒缚 · 杀戮本能', desc: '肉体极限解放11秒：攻防提升25%，全程霸体不可打断' }
        }
    },
    ryu: {
        id: 'ryu',
        name: '石流龙',
        nameJp: '石流 龙',
        title: '死灭回游泳者 · 史上最强咒力输出',
        color: '#5aa8ff',
        color2: '#1a4a8a',
        aura: 'rgba(90,168,255,',
        skin: '#d8a878',
        hair: '#101216',
        hairShade: '#303640',
        cloth: '#181c22',
        clothSub: '#0f1116',
        collar: '#f0ece4',
        pendant: '#d8c8a8',
        pants: '#1a1c22',
        shoeColor: '#101216',
        accent: '#5aa8ff',
        style: 'ryu',
        weapon: null,
        domain: 8,
        hp: 1100,
        atk: 10,
        def: 7,
        spd: 6,
        aiStyle: 'zoner',
        quotes: ['你就是我的甜点吗！？', '尽情绽放吧——漫天的花火！！', '也太甜了吧——！！', '400年了，还没人尝过我的全力。'],
        moves: {
            skill1: { name: '咒力放出 · 冰沙冲击波', cd: 7, desc: '飞机头炮口聚束咒力，轰出贯穿战场的Granité Blast冲击波' },
            skill2: { name: '追迹冲击波', cd: 11, desc: '射向天空的冲击波在空中转向，弧线追踪目标轰然坠击' },
            skill3: { name: '咒力放出 · 连珠炮', cd: 14, desc: '史上最强咒力输出全开，连轰五发冲击波实施覆盖轰炸' },
            ult: { name: '领域展开 · 漫天花火', isDomain: true, desc: '花火升空绽放之领域，咒力烟花连环炸裂吞没敌人' }
        }
    },
    uro: {
        id: 'uro',
        name: '乌鹭亨子',
        nameJp: '乌鹭 亨子',
        title: '日月星进队队长 · 操空之术师',
        color: '#9adcff',
        color2: '#3a6a9a',
        aura: 'rgba(154,220,255,',
        skin: '#f2dcca',
        hair: '#e896c4',
        hairShade: '#b05a92',
        eyeColor: '#16181e',
        cloth: '#f0e2e8',
        clothSub: '#a8324e',
        accent: '#e0b4c8',
        style: 'human',
        weapon: null,
        domain: 8,
        hp: 980,
        atk: 8,
        def: 6,
        spd: 8,
        aiStyle: 'balanced',
        quotes: ['你们就这么怕我出人头地吗？！', '「应该为他人而活」——这种高谈阔论，永远出自站在高位的人之口！！', '天空，是我的掌中之物。', '来了……他来了！！诅咒之王！！'],
        moves: {
            skill1: { name: '宇守罗弹', cd: 7, desc: '击打抓住的「天空平面」，如切割薄冰般将空之碎片轰向敌人' },
            skill2: { name: '天空 · 反拨', cd: 10, desc: '抓住身前天空翻掌反拨：弹返飞来的咒力弹幕并震开近身之敌' },
            skill3: { name: '空之断层', cd: 13, desc: '连续撕裂头顶天空，三道断层剪切自天而降切碎敌人' },
            ult: { name: '领域展开 · 葬空白纱', isDomain: true, desc: '丧葬白纱与鬼火笼罩之领域，被掌握的整片天空崩落斩击' }
        }
    },
    druv: {
        id: 'druv',
        name: '杜鲁夫·拉克达瓦拉',
        nameJp: '杜鲁夫·拉克达瓦拉',
        title: '仙台结界最高分 · 镇压列岛的古代王',
        color: '#ff6a52',
        color2: '#8a1c10',
        aura: 'rgba(255,116,88,',
        skin: '#b08a68',
        hair: '#e6e0d2',
        hairShade: '#b2a894',
        eyeColor: '#d8c8a0',
        cloth: '#a8825e',
        clothSub: '#2e2620',
        pendant: '#e8b84a',
        accent: '#e8b84a',
        style: 'human',
        weapon: null,
        domain: 8,
        hp: 1060,
        atk: 9,
        def: 7,
        spd: 6,
        aiStyle: 'zoner',
        quotes: ['倭国大乱，是我单枪匹马镇压的。', '式神啊——把这片天地染成赤红。', '91分。这座结界里，已无猎物可寻。', '古之王的领域，岂容尔等踏足。'],
        moves: {
            skill1: { name: '式神差遣 · 赤空噬咬', cd: 7, desc: '差遣赤鳍式神破空突进撕咬，掠过的轨迹燃起赤红领域残光' },
            skill2: { name: '式神环游 · 赤轨护领', cd: 10, desc: '式神绕身回游结成赤红轨迹环，撞开近前之敌并咬碎飞来的弹幕' },
            skill3: { name: '双式神 · 合围狩猎', cd: 13, desc: '同时差遣两只式神自身前身后夹击，赤红轨迹交错合围狩猎' },
            ult: { name: '领域展开 · 赤空回游', isDomain: true, desc: '双式神回游之轨迹染红整片空间，无差别吞噬领域内的一切' }
        }
    },
    kuro: {
        id: 'kuro',
        name: '黑沐死',
        nameJp: '黑沐死',
        title: '仙台结界 · 最后的特级蟑螂咒灵',
        color: '#e0862e',
        color2: '#4a1a2e',
        aura: 'rgba(224,134,70,',
        skin: '#d87830',
        hair: '#16120f',
        hairShade: '#2c2420',
        eyeColor: '#7a1420',
        cloth: '#1a1512',
        clothSub: '#0e0b09',
        accent: '#e0862e',
        style: 'human',
        weapon: null,
        domain: 0,
        hp: 1080,
        atk: 9,
        def: 6,
        spd: 7,
        aiStyle: 'zoner',
        quotes: ['我喜欢铁的味道！！！', '我喜欢铁的味道！！！——', '虫群声中，把你们连骨头一同磨碎。', '蔑视吧，厌恶吧——那正是我力量的源泉。'],
        moves: {
            skill1: { name: '咒蟑奔流 · 噬铁潮', cd: 7, desc: '差遣咒力强化的蟑螂大军结成奔流，扑向对手连环咬噬' },
            skill2: { name: '咒具 · 烂生刀', cd: 10, desc: '挥出生与死之间的魔剑，刀刃空洞中射出虫卵，孵化的幼虫咬噬命中之敌' },
            skill3: { name: '土虫蠕定', cd: 13, desc: '召唤两只携巨囊的有翅式神自两侧夹击，破囊喷出侵蚀目光的毒液' },
            ult: { name: '单性生殖 · 地狱归还', desc: '母体咒力全解放：日本全境的蔑视化作蟑螂海啸吞没对手，并孕育新生修复己身' }
        }
    }
};
export const ROSTER = ['gojo', 'gojo2', 'megumi', 'megumi2', 'yuji', 'yuji2', 'sukuna', 'sukunaMegumi', 'okkotsu', 'mahito', 'nanami', 'kenjaku', 'hanami', 'jogo', 'dagon', 'naoya', 'toji', 'ryu', 'uro', 'druv', 'kuro'];

/* ---------------- 战斗场景地图 ---------------- */
export const STAGES = [
    { id: 'shibuya', name: '涩谷事变', theme: '血月下的东京街头，咒灵余烬漂浮', color: '#ff5c6d', accent: '#8c7aff' },
    { id: 'kyoto', name: '京都高专', theme: '传统回廊与锦鲤池，红叶纷飞', color: '#ff7a5c', accent: '#ffd76a' },
    { id: 'tokyo-rooftop', name: '东京高专天台', theme: '黄昏天台，远处东京塔剪影', color: '#ff9a5c', accent: '#5cd8ff' },
    { id: 'cursed-forest', name: '诅咒森林', theme: '幽暗密林，紫色瘴气缭绕', color: '#a85cff', accent: '#7aff7a' },
    { id: 'sendai-beach', name: '仙台海岸', theme: '落日海滩，浪花与归鸟', color: '#ff7a9a', accent: '#ffe45c' },
    { id: 'abandoned-shrine', name: '废弃神社', theme: '阴雨中的破败神社，鸟居林立', color: '#7a9aff', accent: '#ff5c8a' },
    { id: 'underground', name: '地下停车场', theme: '工业霓虹与水泥柱，潮湿压抑', color: '#5cd8ff', accent: '#ff5c6d' }
];

/* ---------------- AI 难度系统 ---------------- */
export const DIFFICULTY = {
    easy: { name: '简单', decide: 52, react: 0.10, blockP: 0.06, dodgeP: 0.03, skillP: 0.45, ultP: 0.25, comboP: 0.25, aggro: 0.5 },
    normal: { name: '普通', decide: 30, react: 0.30, blockP: 0.25, dodgeP: 0.12, skillP: 0.65, ultP: 0.55, comboP: 0.55, aggro: 0.7 },
    hard: { name: '困难', decide: 15, react: 0.62, blockP: 0.50, dodgeP: 0.30, skillP: 0.85, ultP: 0.85, comboP: 0.85, aggro: 0.9 }
};

/* 是否具备领域展开能力：domain 值大于 0 且必杀技为领域展开 */
export function hasDomainUlt(c) {
    return !!(c && c.domain > 0 && c.moves && c.moves.ult && c.moves.ult.isDomain);
}

/* 由属性换算的数值 */
export function derive(c) {
    return {
        maxHp: c.hp,
        atkMul: 0.78 + c.atk * 0.045,
        dmgTaken: 1.16 - c.def * 0.055,
        speed: 3.1 + c.spd * 0.22,
        jumpV: 15 + c.spd * 0.25
    };
}

/* ---------------- 输入映射 ---------------- */
export const DEFAULT_KEYMAP = {
    p1: {
        left: ['KeyA'],
        right: ['KeyD'],
        jump: ['KeyW'],
        block: ['KeyS'],
        light: ['KeyJ'],
        heavy: ['KeyK'],
        skill1: ['KeyU'],
        skill2: ['KeyI'],
        skill3: ['KeyO'],
        ult: ['KeyP'],
        dodge: ['KeyL']
    },
    p2: {
        left: ['ArrowLeft'],
        right: ['ArrowRight'],
        jump: ['ArrowUp'],
        block: ['ArrowDown'],
        light: ['Numpad1'],
        heavy: ['Numpad2'],
        skill1: ['Numpad4'],
        skill2: ['Numpad5'],
        skill3: ['Numpad7'],
        ult: ['Numpad6'],
        dodge: ['Numpad3']
    }
};
export let KEYMAP = JSON.parse(JSON.stringify(DEFAULT_KEYMAP));
export const ACTION_LABELS = {
    left: '左移',
    right: '右移',
    jump: '跳跃',
    block: '格挡',
    light: '轻击',
    heavy: '重击',
    skill1: '技·壹',
    skill2: '技·贰',
    skill3: '技·叁',
    ult: '必杀',
    dodge: '闪避'
};
export const ACTION_ORDER = ['left', 'right', 'jump', 'block', 'dodge', 'light', 'heavy', 'skill1', 'skill2', 'skill3', 'ult'];

/* P3-2：并非每个角色都具备全部技能槽（目前只有 yuji 没有 skill3）。
   键位是全局的（按 p1/p2 侧绑定，不区分角色），所以不能在面板里禁用该行——
   其他角色仍需要它。这里导出一份"哪些角色缺这个技能"的清单，供键位面板标注提示，
   避免玩家给某个角色绑了一个永远触发不了的键。
   只检查技能类动作：移动/跳跃/格挡/闪避/轻重击不属于 moves，人人可用。 */
const CAPABILITY_ACTIONS = ['skill1', 'skill2', 'skill3', 'ult'];
export const ACTION_MISSING_ON = ACTION_ORDER.reduce((acc, act) => {
    if (!CAPABILITY_ACTIONS.includes(act)) return acc;
    const missing = ROSTER.filter(id => !(CHARS[id] && CHARS[id].moves && CHARS[id].moves[act]));
    if (missing.length) acc[act] = missing;
    return acc;
}, {});

/* ---------------- 全局设置 ---------------- */
export const Settings = {
    roundTime: 99,
    difficulty: 'normal',
    music: true,
    diffIdx: 1,
    rebind: null,
    roundMode: 3,      // 回合制：1=BO1，3=BO3
    targetWins: 2      // 先赢几局即胜（BO1→1，BO3→2）
};

/* ---------------- 主题颜色 Token 与通用参数 ---------------- */
export const THEME = {
    bg: {
        deep: '#05060d',
        panel: 'rgba(8,8,20,0.92)',
        overlay: 'rgba(3,3,10,0.66)',
        overlayLight: 'rgba(3,3,10,0.55)',
        overlayDark: 'rgba(3,3,10,0.74)',
        card: 'rgba(0,0,0,0.5)',
        cardSelected: 'rgba(255,255,255,0.10)'
    },
    primary: {
        main: '#b9a8ff',
        glow: 'rgba(140,100,255,',
        dark: '#5a3fd6',
        gradStart: 'rgba(140,100,255,0.26)',
        gradCenter: 'rgba(140,100,255,0.18)',
        gradEnd: 'rgba(100,60,200,0.12)'
    },
    accent: {
        gold: '#ffd76a',
        goldGlow: 'rgba(255,215,106,',
        red: '#ff5c5c',
        redBanner: 'rgba(170,26,46,0.85)'
    },
    text: {
        white: '#fff',
        sub: 'rgba(255,255,255,0.6)',
        muted: 'rgba(255,255,255,0.4)',
        dim: 'rgba(255,255,255,0.15)'
    },
    stat: {
        atk: '#ff6a5c',
        def: '#5cd8ff',
        spd: '#ffe45c'
    },
    radius: {
        panel: 16,
        card: 10,
        button: 8,
        small: 6
    }
};
