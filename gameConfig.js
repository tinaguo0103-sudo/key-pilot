(function () {
const STORAGE_KEY = "key-pilot-results-v1";
const INVENTORY_KEY = "key-pilot-inventory-v1";
const AUDIO_PREFS_KEY = "key-pilot-audio-prefs-v1";
const LOW_HEALTH_THRESHOLD = 40;
const CRITICAL_HEALTH_THRESHOLD = 30;
const HULL_DAMAGE_PER_BREACH = 18;
const HOME_SCENE_BG_KEY = "key-pilot-preflight-chamber-v03";
const HOME_K01_TEXTURE_KEY = "key-pilot-k01-concept-v03";
const RUNTIME_PARAMS = new URLSearchParams(window.location.search);
const IS_DESKTOP_RUNTIME = RUNTIME_PARAMS.has("desktop") || RUNTIME_PARAMS.get("runtime") === "electron";
const BUILD_LABEL = "v0.7.6 POUNCE-DEATH";

const HOME_KEYS = ["a", "s", "d", "f", "j", "k", "l", ";"];
const KEYBOARD_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
  ["z", "x", "c", "v", "b", "n", "m", ",", "."]
];

const FINGER_GROUPS = [
  { id: "left-pinky", side: "left", hand: "左手", finger: "小指", arm: "左小指边界臂", home: "a", keys: ["q", "a", "z"], visualRows: [["q"], ["a"], ["z"]], color: "#ff8f70", phaserColor: 0xff8f70 },
  { id: "left-ring", side: "left", hand: "左手", finger: "无名指", arm: "左无名指侧墙臂", home: "s", keys: ["w", "s", "x"], visualRows: [["w"], ["s"], ["x"]], color: "#ffb95f", phaserColor: 0xffb95f },
  { id: "left-middle", side: "left", hand: "左手", finger: "中指", arm: "左中指上层臂", home: "d", keys: ["e", "d", "c"], visualRows: [["e"], ["d"], ["c"]], color: "#8ea7ff", phaserColor: 0x8ea7ff },
  { id: "left-index", side: "left", hand: "左手", finger: "食指", arm: "左食指突击臂", home: "f", keys: ["r", "t", "f", "g", "v", "b"], visualRows: [["r", "t"], ["f", "g"], ["v", "b"]], color: "#ffd66e", phaserColor: 0xffd66e },
  { id: "right-index", side: "right", hand: "右手", finger: "食指", arm: "右食指突击臂", home: "j", keys: ["y", "u", "h", "j", "n", "m"], visualRows: [["y", "u"], ["h", "j"], ["n", "m"]], color: "#ffd66e", phaserColor: 0xffd66e },
  { id: "right-middle", side: "right", hand: "右手", finger: "中指", arm: "右中指上层臂", home: "k", keys: ["i", "k", ","], visualRows: [["i"], ["k"], [","]], color: "#8ea7ff", phaserColor: 0x8ea7ff },
  { id: "right-ring", side: "right", hand: "右手", finger: "无名指", arm: "右无名指侧墙臂", home: "l", keys: ["o", "l", "."], visualRows: [["o"], ["l"], ["."]], color: "#ffb95f", phaserColor: 0xffb95f },
  { id: "right-pinky", side: "right", hand: "右手", finger: "小指", arm: "右小指边界臂", home: ";", keys: ["p", ";"], visualRows: [["p"], [";"]], color: "#ff8f70", phaserColor: 0xff8f70 }
];

const FINGER_GUIDES = FINGER_GROUPS.reduce((map, guide) => {
  guide.keys.forEach((key) => {
    map[key] = guide;
  });
  return map;
}, {});

const FINGER_GUIDE_BY_ID = FINGER_GROUPS.reduce((map, guide) => {
  map[guide.id] = guide;
  return map;
}, {});

const STRIKE_CALIBRATION_DRILLS = [
  { guideId: "left-index", pattern: ["f", "r", "f"], objective: "左食指从 F 基地出击到 R，再收回 F。" },
  { guideId: "right-index", pattern: ["j", "u", "j"], objective: "右食指从 J 基地出击到 U，再收回 J。" },
  { guideId: "left-middle", pattern: ["d", "e", "d"], objective: "左中指从 D 基地出击到 E，再收回 D。" },
  { guideId: "right-middle", pattern: ["k", "i", "k"], objective: "右中指从 K 基地出击到 I，再收回 K。" },
  { guideId: "left-ring", pattern: ["s", "w", "s"], objective: "左无名指从 S 基地出击到 W，再收回 S。" },
  { guideId: "right-ring", pattern: ["l", "o", "l"], objective: "右无名指从 L 基地出击到 O，再收回 L。" },
  { guideId: "left-pinky", pattern: ["a", "q", "a"], objective: "左小指从 A 边界出击到 Q，再收回 A。" },
  { guideId: "right-pinky", pattern: [";", "p", ";"], objective: "右小指从 ; 边界出击到 P，再收回 ;。" },
  { guideId: "left-index", pattern: ["f", "v", "f"], objective: "左食指下探 V，确认同一根手指能上下出击。" },
  { guideId: "right-index", pattern: ["j", "m", "j"], objective: "右食指下探 M，命中后回到 J 基地。" },
  { guideId: "left-middle", pattern: ["d", "c", "d"], objective: "左中指下探 C，手掌不要整体漂移。" },
  { guideId: "right-middle", pattern: ["k", ",", "k"], objective: "右中指下探逗号，回收时锁回 K。" },
  { guideId: "left-ring", pattern: ["s", "x", "s"], objective: "左无名指下探 X，慢一点也要回 S。" },
  { guideId: "right-ring", pattern: ["l", ".", "l"], objective: "右无名指下探句点，回收时锁回 L。" },
  { guideId: "left-pinky", pattern: ["a", "z", "a"], objective: "左小指下探 Z，边界键先求稳。" },
  { guideId: "right-pinky", pattern: [";", "p", ";"], objective: "右小指再确认 P，边界臂接入完成。" }
];

const EQUIPMENT_PREVIEW = [
  { name: "锚点心脏", slot: "核心", hint: "偏移时强制高亮 F/J", sources: ["锚点芯片碎片", "稳定核心样本", "残影污染样本"] },
  { name: "返航钩爪", slot: "机械臂", hint: "回家阶段显示返航轨道", sources: ["返航钩爪碎片", "机械臂润滑剂", "清障战斗记录"] },
  { name: "护盾电容", slot: "护盾", hint: "抵消一次普通错误护盾损失", sources: ["无破舱徽记", "漂移僵尸图鉴", "漂移僵尸图鉴更新"] }
];

const STRIKE_MODIFIERS = [
  { id: "rush", label: "突进", hint: "怪物会迅速贴近，错键压力更大" },
  { id: "shield", label: "装甲", hint: "命中窗口更厚重，回家必须干净" },
  { id: "glitch", label: "闪断", hint: "隧道干扰更强，错误会污染屏幕" },
  { id: "split", label: "分裂", hint: "残影增多，目标键需要更稳" }
];

const STRIKE_COMBAT_RULES = {
  rush: {
    label: "突进压迫",
    hint: "错键会让怪物大幅贴近，先稳住基地再出击。",
    pressure: 13
  },
  shield: {
    label: "装甲二连",
    hint: "命中后回家，再补第二击，完整闭环才清除。",
    pressure: 9
  },
  glitch: {
    label: "闪断干扰",
    hint: "污染增长更快，回家阶段错键会更危险。",
    pressure: 11
  },
  split: {
    label: "分裂残影",
    hint: "同一根手指连续处理两个目标，中间必须回家。",
    pressure: 10
  }
};

const STRIKE_MONSTER_VARIANTS = {
  "食指臂": ["漂移僵尸", "铁皮行尸", "跳频残骸"],
  "中指臂": ["上层爬行者", "倒挂腐蚀体", "电弧残影"],
  "无名指臂": ["侧墙怪", "裂相幽影", "管线怨影"],
  "小指边界": ["边界虫", "闸门僵尸", "边线污染体"]
};

const DRIFT_LEFT_MAP = {
  j: "h",
  k: "j",
  l: "k",
  ";": "l",
  f: "d",
  d: "s",
  s: "a"
};

const CRUISE_TARGET_COUNT = 71;
const CRUISE_INTRO_MS = 3200;
const CRUISE_WAVE_DEADLINES = [3400, 2950, 2450];
const CRUISE_ROUND_SIZES = [5, 5, 5, 6, 6, 7, 7, 8, 10, 12];
const CRUISE_ROUND_RHYTHMS = [
  { id: "warmup", label: "接触巡航", deadlineScale: 1.06, laneDrift: 0.7 },
  { id: "crossfire", label: "交叉火线", deadlineScale: 1, laneDrift: 1 },
  { id: "surge", label: "加速巡航", deadlineScale: 0.92, laneDrift: 1.2 },
  { id: "overdrive", label: "过载长串", deadlineScale: 0.86, laneDrift: 1.45 }
];
const CRUISE_THREAT_TYPES = ["projectile", "turret", "swarm"];
const CRUISE_LANES = [
  { id: "left-high", side: "left", label: "左上管线" },
  { id: "left-mid", side: "left", label: "左侧闸门" },
  { id: "left-low", side: "left", label: "左下管线" },
  { id: "right-high", side: "right", label: "右上管线" },
  { id: "right-mid", side: "right", label: "右侧闸门" },
  { id: "right-low", side: "right", label: "右下管线" },
  { id: "top", side: "top", label: "上层裂缝" },
  { id: "bottom", side: "bottom", label: "下层排污口" }
];

const CRUISE_FINGER_WEIGHTS = {
  "left-index": 3.6,
  "right-index": 3.6,
  "left-middle": 2.4,
  "right-middle": 2.4,
  "left-ring": 2,
  "right-ring": 2,
  "left-pinky": 1.7,
  "right-pinky": 1.7
};

const LEVELS = [
  {
    id: "level-01-home",
    index: "01",
    title: "战前预检",
    subtitle: "唤醒 K-01 的中排神经底座",
    mission: "F/J 是开舱锁，真正任务是完成 8 个基准位设备预检。",
    scene: "出战前-01 / 机库预检舱",
    briefing: "开战前先把旧坐标残影从驾驶舱里清出去。锁定 F/J，再逐个点亮 A S D F / J K L ; 八个中排神经底座。",
    durationSeconds: 60,
    targetCount: 48,
    mode: "home",
    monster: "偏左残影",
    rewardPool: ["锚点芯片碎片", "稳定核心样本", "残影污染样本"],
    unlock: true,
    segments: [
      ["f", "j", "f", "j", "j", "f", "f", "j"],
      ["f", "d", "j", "k", "d", "f", "k", "j", "f", "j"],
      ["s", "d", "f", "j", "k", "l", "d", "k", "s", "l"],
      ["a", "s", "d", "f", "j", "k", "l", ";", "f", "j", "a", ";"]
    ],
    waves: [
      { name: "开舱锁", monster: "偏左残影", objective: "用 F/J 接通左右主锚，确认驾驶舱没有偏移", count: 8 },
      { name: "内侧预检", monster: "错位虫群", objective: "D/K 接入神经底座，手掌不能整体偏左", count: 10 },
      { name: "外侧预检", monster: "错位虫群", objective: "S/L 点亮稳定台，保持中轴不漂", count: 10 },
      { name: "八键出舱许可", monster: "偏左残影", objective: "A S D F / J K L ; 全部亮起，准许进入清障隧道", count: 20 }
    ],
    goal: {
      accuracy: 85,
      maxHomeDrift: 8
    }
  },
  {
    id: "level-02-strike",
    index: "02",
    title: "机械臂清障",
    subtitle: "击退隧道怪物，再把机械臂收回",
    mission: "从基地出击，命中怪物，再回家。每条动作都要闭环。",
    scene: "启动层-02 / 清障隧道",
    briefing: "命中不是结束。机械臂打出去、击中、收回基地，三步完整才算清除一个怪物。",
    durationSeconds: 110,
    targetActions: 20,
    mode: "strike",
    monster: "漂移僵尸",
    rewardPool: ["返航钩爪碎片", "机械臂润滑剂", "漂移僵尸图鉴"],
    unlock: true,
    waves: [
      {
        name: "食指臂",
        monster: "漂移僵尸",
        objective: "食指先清路：F/R/V 与 J/U/M，命中后必须回家",
        count: 5,
        patterns: [["f", "r", "f"], ["j", "u", "j"], ["f", "v", "f"], ["j", "m", "j"], ["f", "t", "f"]]
      },
      {
        name: "中指臂",
        monster: "上层爬行者",
        objective: "中指接管 E/I/C/,，不要让手掌飘走",
        count: 5,
        patterns: [["d", "e", "d"], ["k", "i", "k"], ["d", "c", "d"], ["k", ",", "k"], ["d", "e", "d"]]
      },
      {
        name: "无名指臂",
        monster: "侧墙怪",
        objective: "无名指处理 W/O/X/.，慢一点也要收臂",
        count: 5,
        patterns: [["s", "w", "s"], ["l", "o", "l"], ["s", "x", "s"], ["l", ".", "l"], ["s", "w", "s"]]
      },
      {
        name: "小指边界",
        monster: "边界虫",
        objective: "小指清理 Q/P/Z，边界键不追速度",
        count: 5,
        patterns: [["a", "q", "a"], [";", "p", ";"], ["a", "z", "a"], [";", "p", ";"], ["a", "q", "a"]]
      }
    ],
    goal: {
      accuracy: 85,
      pathCompleteRate: 80
    }
  },
  {
    id: "level-03-cruise",
    index: "03",
    title: "巡航防线",
    subtitle: "多手指连续拦截，守住中轴手位",
    mission: "污染弹体从多方向袭来。看中央目标键，在倒计时内用正确手指拦截。",
    scene: "启动层-03 / 巡航防线舱",
    briefing: "这一关不再固定同一条机械臂。K-01 会在防线中央连续接收威胁坐标，你需要用八根手指轮流拦截，同时随时回到中排基准位。",
    durationSeconds: 360,
    targetActions: CRUISE_TARGET_COUNT,
    mode: "cruise",
    monster: "污染弹体",
    rewardPool: ["巡航防线记录", "多指同步芯片", "污染弹体残片"],
    unlock: true,
    waves: [
      { name: "接触巡航", monster: "污染弹体", objective: "5 键短串起步，先把多手指巡航接上节奏", count: 20, deadlineMs: 3400 },
      { name: "交叉火线", monster: "错位虫群", objective: "6-8 键中串，左右手连续切换但不丢中排", count: 24, deadlineMs: 2950 },
      { name: "防线压缩", monster: "污染炮台", objective: "8-12 键长串压迫，守住中轴完成过载巡航", count: 27, deadlineMs: 2450 }
    ],
    goal: {
      accuracy: 82,
      interceptRate: 78,
      maxTimeouts: 8
    }
  }
];

const FEEDBACK = {
  correct: ["锁定", "稳定", "很好", "K-01 同步中"],
  strike: ["出击", "命中", "收臂", "怪物清除"],
  wrong: ["信号打滑了", "目标还在，重新出手", "别急，先稳住底座"],
  drift: ["旧坐标残影接管了", "你刚才把基地搬家了", "左墙说它不想再被撞了", "重新锁回 F/J"],
  returnHome: ["命中不算结束，收臂才算", "机械臂还挂在墙上", "先回基地"]
};

const STRIKE_ROOM_THEMES = [
  { id: "gate", name: "闸门入口", code: "GATE", color: "cyan", briefing: "闸门锁死，漂移僵尸从地缝里爬出。" },
  { id: "pipe", name: "腐蚀管道", code: "PIPE", color: "green", briefing: "管道腐蚀，铁皮行尸需要二连破甲。" },
  { id: "nest", name: "侧墙巢穴", code: "NEST", color: "orange", briefing: "墙体吐出分裂残影，同一根手指必须连续处理。" },
  { id: "blackout", name: "闪断隧道", code: "BLACKOUT", color: "blue", briefing: "照明闪断，突进感染体会在错键时逼近。" },
  { id: "core", name: "旧坐标核心", code: "CORE", color: "red", briefing: "旧坐标核心暴露，所有闭环规则进入混合压力。" }
];

const STRIKE_ROOM_CHAIN = [
  {
    id: "gate",
    monsterId: "driftZombie",
    monster: "漂移僵尸",
    mechanic: "standard",
    patterns: [["f", "r", "f"], ["j", "u", "j"], ["d", "e", "d"]],
    modifiers: ["rush", "glitch", "rush"],
    lanes: ["mid", "high", "low"],
    spawnSides: ["right", "top", "right"]
  },
  {
    id: "pipe",
    monsterId: "ironWalker",
    monster: "铁皮行尸",
    mechanic: "shield",
    patterns: [["f", "r", "f"], ["j", "u", "j"], ["d", "e", "d"], ["k", "i", "k"]],
    modifiers: ["shield", "shield", "shield", "shield"],
    lanes: ["mid", "low", "high", "mid"],
    spawnSides: ["right", "bottom", "right", "top"]
  },
  {
    id: "nest",
    monsterId: "splitPhantom",
    monster: "分裂残影",
    mechanic: "split",
    patterns: [["f", "r", "f"], ["j", "u", "j"], ["s", "w", "s"], ["l", "o", "l"]],
    modifiers: ["split", "split", "split", "split"],
    lanes: ["high", "mid", "low", "mid"],
    spawnSides: ["left", "right", "left", "right"]
  },
  {
    id: "blackout",
    monsterId: "rushCrawler",
    monster: "突进感染体",
    mechanic: "rush",
    patterns: [["a", "q", "a"], [";", "p", ";"], ["d", "c", "d"], ["k", ",", "k"]],
    modifiers: ["rush", "glitch", "rush", "glitch"],
    lanes: ["low", "high", "mid", "low"],
    spawnSides: ["top", "right", "left", "bottom"]
  },
  {
    id: "core",
    monsterId: "oldCoordinateCore",
    monster: "旧坐标核心",
    mechanic: "boss",
    patterns: [["f", "t", "f"], ["j", "u", "j"], ["d", "e", "d"], ["k", "i", "k"], ["f", "r", "f"]],
    modifiers: ["rush", "shield", "split", "glitch", "shield"],
    lanes: ["mid", "high", "low", "mid", "mid"],
    spawnSides: ["core", "core", "core", "core", "core"]
  }
];

  window.KeyPilotConfig = {
    STORAGE_KEY,
    INVENTORY_KEY,
    AUDIO_PREFS_KEY,
    LOW_HEALTH_THRESHOLD,
    CRITICAL_HEALTH_THRESHOLD,
    HULL_DAMAGE_PER_BREACH,
    HOME_SCENE_BG_KEY,
    HOME_K01_TEXTURE_KEY,
    RUNTIME_PARAMS,
    IS_DESKTOP_RUNTIME,
    BUILD_LABEL,
    HOME_KEYS,
    KEYBOARD_ROWS,
    FINGER_GROUPS,
    FINGER_GUIDES,
    FINGER_GUIDE_BY_ID,
    STRIKE_CALIBRATION_DRILLS,
    EQUIPMENT_PREVIEW,
    STRIKE_MODIFIERS,
    STRIKE_COMBAT_RULES,
    STRIKE_MONSTER_VARIANTS,
    DRIFT_LEFT_MAP,
    FEEDBACK,
    CRUISE_TARGET_COUNT,
    CRUISE_INTRO_MS,
    CRUISE_WAVE_DEADLINES,
    CRUISE_ROUND_SIZES,
    CRUISE_ROUND_RHYTHMS,
    CRUISE_THREAT_TYPES,
    CRUISE_LANES,
    CRUISE_FINGER_WEIGHTS,
    LEVELS,
    STRIKE_ROOM_THEMES,
    STRIKE_ROOM_CHAIN
  };
})();
