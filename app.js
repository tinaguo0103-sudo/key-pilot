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
let runSequence = 0;

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

const app = document.querySelector("#app");

let view = "menu";
let selectedLevelId = LEVELS[0].id;
let state = null;
let timerId = null;
let pressedKey = "";
let flashType = "";
let shellShake = false;
let sceneCanvasRaf = null;
let sceneEffects = [];
let phaserGame = null;
let roomCombatEventId = 0;
let cruiseCombatEventId = 0;
const finishLifecycle = window.KeyPilotRuntimeLifecycle.createDeferredFinishController({
  getState: () => state,
  getView: () => view,
  finishGame: (reason) => finishGame(reason)
});

function makeInitialState(level) {
  const homeQueue = level.mode === "home" ? makeHomeQueue(level) : [];
  const strikeQueue = level.mode === "strike" ? makeStrikeQueue(level) : [];
  const cruiseQueue = level.mode === "cruise" ? makeCruiseQueue(level) : [];
  const firstPattern = strikeQueue.length ? strikeQueue[0].pattern : getPatternForAction(level, 0);
  const calibrationQueue = level.mode === "strike" ? makeStrikeCalibrationQueue(level) : [];
  const firstCalibration = calibrationQueue[0];
  const initialTarget = level.mode === "home"
    ? "f"
    : level.mode === "cruise"
      ? ""
      : firstCalibration?.pattern?.[0] || firstPattern[0];
  const now = Date.now();
  const cruiseIntroUntil = level.mode === "cruise" ? now + CRUISE_INTRO_MS : 0;

  return {
    level,
    status: level.mode === "home" ? "prelock" : level.mode === "strike" ? "finger-calibration" : "playing",
    runId: 0,
    startedAt: now,
    endsAt: now + level.durationSeconds * 1000,
    timeLeft: level.durationSeconds,
    currentTarget: initialTarget,
    targetIndex: 0,
    combo: 0,
    maxCombo: 0,
    correctCount: 0,
    wrongCount: 0,
    homeDriftCount: 0,
    energy: 24,
    shield: 100,
    hull: 100,
    corruption: 0,
    consecutiveErrors: 0,
    monstersCleared: 0,
    partsEarned: [],
    totalInputs: 0,
    completedTargets: 0,
    completedActions: 0,
    actionAttempts: 0,
    pathStep: 0,
    currentPatternIndex: 0,
    homeQueue,
    strikeQueue,
    cruiseQueue,
    threatIndex: 0,
    threatStartedAt: 0,
    threatDeadlineAt: 0,
    cruiseIntroStartedAt: level.mode === "cruise" ? now : 0,
    cruiseIntroUntil,
    cruiseIntercepts: 0,
    cruiseTimeouts: 0,
    cruiseMisses: 0,
    cruiseAnchorPulses: 0,
    cruiseWaveClears: 0,
    cruiseCloseWarnedFor: "",
    cruiseFingerStats: {},
    cruiseHandStats: { left: 0, right: 0 },
    calibrationQueue,
    calibrationIndex: 0,
    calibrationStep: 0,
    calibrationCompleted: 0,
    calibrationWrong: 0,
    monsterPressure: level.mode === "strike" ? 22 : 0,
    roomsCleared: 0,
    bossCleared: false,
    missionClearing: false,
    currentRoomIndex: 0,
    roomTransition: null,
    inputLockedUntil: 0,
    breaches: 0,
    encounterHits: 0,
    weakKeys: {},
    chargedKeys: {},
    eventLog: [
      level.mode === "home"
        ? "战前预检开始：K-01 等待 F/J 主锚接入。"
        : level.mode === "cruise"
          ? "巡航防线接入：先看中央短串，倒数结束后开始拦截。"
          : "机械臂接入校准开始：先确认每根手指的出击领地。"
    ],
    leftLocked: false,
    rightLocked: false,
    feedback: level.mode === "home"
      ? "按 F 锁定左手，按 J 锁定右手"
      : level.mode === "cruise"
        ? "防线接入中：准备观察第一串目标"
        : `按 ${formatKey(initialTarget)} 接入第一条机械臂线路`,
    feedbackType: "neutral",
    sceneEvent: "idle",
    sceneNonce: 0,
    lowHealthWarned: false,
    hullAlertUntil: 0,
    hullAlertLevel: "",
    hullAlertNonce: 0,
    pendingDeath: false,
    lastEventAt: 0,
    result: null
  };
}

const progressStore = window.KeyPilotProgress.createProgressStore({
  storage: localStorage,
  storageKey: STORAGE_KEY,
  inventoryKey: INVENTORY_KEY,
  levels: LEVELS
});
const cruiseRules = window.KeyPilotCruiseRules.createCruiseRules({
  keyboardRows: KEYBOARD_ROWS,
  fingerGroups: FINGER_GROUPS,
  targetCount: CRUISE_TARGET_COUNT,
  waveDeadlines: CRUISE_WAVE_DEADLINES,
  roundSizes: CRUISE_ROUND_SIZES,
  roundRhythms: CRUISE_ROUND_RHYTHMS,
  threatTypes: CRUISE_THREAT_TYPES,
  lanes: CRUISE_LANES,
  fingerWeights: CRUISE_FINGER_WEIGHTS,
  makeBalancedSideOrder
});
const homeRules = window.KeyPilotHomeRules.createHomeRules({
  homeKeys: HOME_KEYS,
  makeShuffledRun
});
const strikeRules = window.KeyPilotStrikeRules.createStrikeRules({
  fingerGroups: FINGER_GROUPS,
  fingerGuideById: FINGER_GUIDE_BY_ID,
  calibrationDrills: STRIKE_CALIBRATION_DRILLS,
  modifiers: STRIKE_MODIFIERS,
  combatRules: STRIKE_COMBAT_RULES,
  monsterVariants: STRIKE_MONSTER_VARIANTS,
  roomThemes: STRIKE_ROOM_THEMES,
  roomChain: STRIKE_ROOM_CHAIN,
  shuffle,
  pick,
  makeShuffledRun,
  makeBalancedSideOrder,
  getFingerGuideForKey,
  getPatternForAction,
  getWaveProgress
});
const audioDirector = window.KeyPilotAudioDirector.createAudioDirector({
  storage: localStorage,
  prefsKey: AUDIO_PREFS_KEY,
  isDesktopRuntime: IS_DESKTOP_RUNTIME,
  clamp,
  getView: () => view,
  getState: () => state,
  getCurrentCruiseThreat,
  getCruiseThreatTimeRatio,
  isLowHullState
});
const sceneSnapshots = window.KeyPilotSceneSnapshots.createSceneSnapshots({
  clamp,
  getState: () => state,
  getWaveProgress,
  getStrikeEncounter,
  getCurrentPattern,
  getStrikeRoomTheme,
  getCurrentFingerGuide,
  getCurrentCruiseThreat,
  getCruiseThreatTimeRatio,
  getCruiseThreatProgress,
  getCruiseIntroRemaining,
  getCruiseRoundInfo,
  getCruiseRoundThreats,
  isCruiseIntroActive,
  fingerGuideById: FINGER_GUIDE_BY_ID,
  strikeRoomThemes: STRIKE_ROOM_THEMES
});

function getResults() {
  return progressStore.getResults();
}

function saveResult(result) {
  progressStore.saveResult(result);
}

function getInventory() {
  return progressStore.getInventory();
}

function saveInventory(inventory) {
  progressStore.saveInventory(inventory);
}

function addInventory(parts) {
  progressStore.addInventory(parts);
}

function getInventoryTotal() {
  return progressStore.getInventoryTotal();
}

function getEquipmentCount(item, inventory) {
  return progressStore.getEquipmentCount(item, inventory);
}

function getBestFor(levelId) {
  return progressStore.getBestFor(levelId);
}

function getLevelById(levelId) {
  return progressStore.getLevelById(levelId);
}

function isResultComplete(result) {
  return progressStore.isResultComplete(result);
}

function getLatestFor(levelId, results = getResults()) {
  return progressStore.getLatestFor(levelId, results);
}

function getRecommendedTraining() {
  return progressStore.getRecommendedTraining();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatKey(key) {
  if (!key) return "";
  return key === ";" ? ";" : key.toUpperCase();
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const copy = list.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function makeShuffledRun(items, count, keyForItem = (item) => String(item), previousKey = "") {
  const queue = [];
  let lastKey = previousKey;

  while (queue.length < count) {
    const cycle = shuffle(items);
    if (cycle.length > 1 && keyForItem(cycle[0]) === lastKey) {
      const swapIndex = cycle.findIndex((item) => keyForItem(item) !== lastKey);
      [cycle[0], cycle[swapIndex]] = [cycle[swapIndex], cycle[0]];
    }

    for (const item of cycle) {
      if (queue.length >= count) break;
      queue.push(item);
      lastKey = keyForItem(item);
    }
  }

  return queue;
}

function makeHomeQueue(level) {
  return homeRules.makeHomeQueue(level);
}

function getKeyRowIndex(key) {
  return cruiseRules.getKeyRowIndex(key);
}

function getCruiseWaveIndex(index, level) {
  return cruiseRules.getCruiseWaveIndex(index, level);
}

function getCruiseLane(threatIndex, guide, rowIndex) {
  return cruiseRules.getCruiseLane(threatIndex, guide, rowIndex);
}

function getCruiseDeadline(level, waveIndex, threatIndex) {
  return cruiseRules.getCruiseDeadline(level, waveIndex, threatIndex);
}

function decorateCruiseRounds(queue) {
  return cruiseRules.decorateCruiseRounds(queue);
}

function weightedCruiseGuide(pool, stats, sideCounts, index, total) {
  return cruiseRules.weightedCruiseGuide(pool, stats, sideCounts, index, total);
}

function pickCruiseKey(guide, previousThreats, threatIndex) {
  return cruiseRules.pickCruiseKey(guide, previousThreats, threatIndex);
}

function makeCruiseQueue(level) {
  return cruiseRules.makeCruiseQueue(level);
}

function getAlternateStrikeTarget(pattern, wave, index) {
  return strikeRules.getAlternateStrikeTarget(pattern, wave, index);
}

function getStrikeAttackKeysForGuide(guide) {
  return strikeRules.getStrikeAttackKeysForGuide(guide);
}

function hasLongSideRun(sequence, maxRun = 2) {
  let lastSide = "";
  let runLength = 0;
  return sequence.some((side) => {
    runLength = side === lastSide ? runLength + 1 : 1;
    lastSide = side;
    return runLength > maxRun;
  });
}

function makeSidePermutations(leftCount, rightCount) {
  const result = [];
  const walk = (items, leftRemaining, rightRemaining) => {
    if (!leftRemaining && !rightRemaining) {
      result.push(items);
      return;
    }
    if (leftRemaining) walk([...items, "left"], leftRemaining - 1, rightRemaining);
    if (rightRemaining) walk([...items, "right"], leftRemaining, rightRemaining - 1);
  };
  walk([], leftCount, rightCount);
  return result;
}

function pickBalancedSideChunk(existing, leftCount, rightCount) {
  const candidates = shuffle(makeSidePermutations(leftCount, rightCount))
    .filter((chunk) => !hasLongSideRun([...existing, ...chunk], 2));
  if (candidates.length) return pick(candidates);

  const fallback = [];
  const remaining = { left: leftCount, right: rightCount };
  while (remaining.left || remaining.right) {
    const last = fallback[fallback.length - 1] || existing[existing.length - 1] || "";
    const preferred = last === "left" ? "right" : "left";
    const side = remaining[preferred] ? preferred : remaining.left ? "left" : "right";
    fallback.push(side);
    remaining[side] -= 1;
  }
  return fallback;
}

function makeBalancedSideOrder(totalCount) {
  const firstSide = Math.random() < 0.5 ? "left" : "right";
  const counts = {
    left: Math.floor(totalCount / 2),
    right: Math.floor(totalCount / 2)
  };
  if (totalCount % 2) counts[firstSide] += 1;

  const order = [];
  while (order.length < totalCount) {
    const remainingTotal = counts.left + counts.right;
    const chunkSize = Math.min(4, remainingTotal);
    const idealLeft = Math.round(chunkSize * (counts.left / remainingTotal));
    const leftCount = Math.max(0, Math.min(counts.left, Math.min(chunkSize, idealLeft)));
    const rightCount = chunkSize - leftCount;
    const safeLeftCount = rightCount > counts.right ? chunkSize - counts.right : leftCount;
    const safeRightCount = chunkSize - safeLeftCount;
    const chunk = pickBalancedSideChunk(order, safeLeftCount, safeRightCount);
    order.push(...chunk);
    counts.left -= safeLeftCount;
    counts.right -= safeRightCount;
  }

  return order;
}

function makeEvenEntryOrder(entries) {
  return strikeRules.makeEvenEntryOrder(entries);
}

function makeSideStrikeEntries(sideGuides, count) {
  return strikeRules.makeSideStrikeEntries(sideGuides, count);
}

function makeBalancedStrikePatterns(totalCount) {
  return strikeRules.makeBalancedStrikePatterns(totalCount);
}

function makeCombatPattern(pattern, wave, index, modifier) {
  return strikeRules.makeCombatPattern(pattern, wave, index, modifier);
}

function getEncounterRule(modifierOrEncounter) {
  return strikeRules.getEncounterRule(modifierOrEncounter);
}

function getEncounterRuleLabel(encounter) {
  return strikeRules.getEncounterRuleLabel(encounter);
}

function getEncounterRuleHint(encounter) {
  return strikeRules.getEncounterRuleHint(encounter);
}

function getEncounterEntryPressure(encounter) {
  return strikeRules.getEncounterEntryPressure(encounter);
}

function isStrikeReturnStep(pattern, step) {
  return strikeRules.isStrikeReturnStep(pattern, step);
}

function getStrikeStepLabel(pattern, step) {
  return strikeRules.getStrikeStepLabel(pattern, step);
}

function getVisibleStrikePadKeys(pattern, pathStep) {
  return strikeRules.getVisibleStrikePadKeys(pattern, pathStep);
}

function getStrikeModifierById(id) {
  return strikeRules.getStrikeModifierById(id);
}

function getStrikeRoomThemeById(id) {
  return strikeRules.getStrikeRoomThemeById(id);
}

function makeStrikeRoomQueue() {
  return strikeRules.makeStrikeRoomQueue();
}

function makeStrikeQueue(level) {
  return strikeRules.makeStrikeQueue(level);
}

function makeStrikeCalibrationQueue(level) {
  return strikeRules.makeStrikeCalibrationQueue(level);
}

function getStrikeEncounter(currentState = state) {
  return strikeRules.getStrikeEncounter(currentState);
}

function triggerScene(eventName) {
  if (!state) return;
  state.sceneEvent = eventName;
  state.sceneNonce += 1;
  sceneEffects = [
    ...sceneEffects.slice(-10),
    { name: eventName, at: performance.now(), nonce: state.sceneNonce }
  ];
}

function queueRoomCombatEvent(type, detail = {}) {
  if (!state || state.level.mode !== "strike") return;
  roomCombatEventId += 1;
  const event = {
    id: roomCombatEventId,
    type,
    sceneEvent: state.sceneEvent || "idle",
    sceneNonce: state.sceneNonce,
    at: performance.now(),
    detail
  };
  const queue = Array.isArray(window.__KEY_PILOT_ROOM_EVENT_QUEUE__) ? window.__KEY_PILOT_ROOM_EVENT_QUEUE__ : [];
  queue.push(event);
  window.__KEY_PILOT_ROOM_EVENT_QUEUE__ = queue.slice(-16);
  window.__KEY_PILOT_ROOM_EVENT__ = event;
}

function queueCruiseCombatEvent(type, detail = {}) {
  if (!state || state.level.mode !== "cruise") return;
  cruiseCombatEventId += 1;
  const event = {
    id: cruiseCombatEventId,
    type,
    sceneEvent: state.sceneEvent || "idle",
    sceneNonce: state.sceneNonce,
    at: performance.now(),
    detail
  };
  const queue = Array.isArray(window.__KEY_PILOT_CRUISE_EVENT_QUEUE__) ? window.__KEY_PILOT_CRUISE_EVENT_QUEUE__ : [];
  queue.push(event);
  window.__KEY_PILOT_CRUISE_EVENT_QUEUE__ = queue.slice(-20);
  window.__KEY_PILOT_CRUISE_EVENT__ = event;
}

function combatEventForSceneEvent(fallback = "wrong-key") {
  if (!state) return fallback;
  if (state.sceneEvent === "drift") return "drift-error";
  if (state.sceneEvent === "breach") return "breach";
  if (state.sceneEvent === "death") return "death";
  if (state.sceneEvent === "low-health") return "low-health";
  if (state.sceneEvent === "surge" || state.sceneEvent === "ambush") return "wrong-key";
  return fallback;
}

function getVolumeProfile() {
  return audioDirector.getVolumeProfile();
}

function playSound(kind, options = {}) {
  audioDirector.playSound(kind, options);
}

function syncAudioDirector(forceStart = false) {
  audioDirector.sync(forceStart);
}

function bootDesktopAudioIfNeeded() {
  audioDirector.bootDesktopIfNeeded();
}

function wakeMusicIfNeeded() {
  audioDirector.wakeMusicIfNeeded();
}

function stopAudioDirector() {
  audioDirector.stop();
}

function getPatternForAction(level, actionIndex) {
  if (level.mode !== "strike") return [];
  let accumulated = 0;
  for (const wave of level.waves) {
    const start = accumulated;
    accumulated += wave.count;
    if (actionIndex < accumulated) {
      const localIndex = actionIndex - start;
      return wave.patterns[localIndex % wave.patterns.length];
    }
  }
  const lastWave = level.waves[level.waves.length - 1];
  return lastWave.patterns[lastWave.patterns.length - 1];
}

function pushEvent(message) {
  if (!state) return;
  state.eventLog = [message, ...state.eventLog].slice(0, 4);
}

function resetTransientEffects() {
  pressedKey = "";
  flashType = "";
  shellShake = false;
}

function isActivePlay(currentState = state) {
  return view === "playing" && Boolean(currentState);
}

function usesHullSystem(currentState = state) {
  return Boolean(
    isActivePlay(currentState)
      && currentState.level?.mode !== "home"
      && currentState.status !== "dead"
  );
}

function isLowHullState(currentState = state) {
  return Boolean(
    usesHullSystem(currentState)
      && currentState.hull <= LOW_HEALTH_THRESHOLD
  );
}

function isCriticalHullState(currentState = state) {
  return Boolean(isLowHullState(currentState) && currentState.hull <= CRITICAL_HEALTH_THRESHOLD);
}

function isHullAlertVisible(currentState = state) {
  return Boolean(isLowHullState(currentState) && Date.now() < currentState.hullAlertUntil);
}

function flashHullAlert(level = isCriticalHullState() ? "critical" : "low") {
  if (!state || !usesHullSystem(state)) return;
  state.hullAlertLevel = level;
  state.hullAlertUntil = Date.now() + (level === "critical" ? 760 : 620);
  state.hullAlertNonce += 1;
  const nonce = state.hullAlertNonce;

  window.setTimeout(() => {
    if (state && state.hullAlertNonce === nonce) render();
  }, level === "critical" ? 800 : 660);
}

function clearDeferredFinishTimers() {
  finishLifecycle.clear();
}

function scheduleDeferredFinish(reason = "complete", delay = 720) {
  finishLifecycle.schedule(reason, delay);
}

function scheduleDeathFinish(delay = 820) {
  finishLifecycle.scheduleDeath(delay);
}

function applyGlobalHullDamage(options = {}) {
  if (!state || !usesHullSystem(state)) return { dead: false, breached: false };
  const {
    shieldLoss = 0,
    hullLoss = HULL_DAMAGE_PER_BREACH,
    energyLoss = 0,
    corruptionGain = 0,
    forceBreach = false,
    shieldRestore = 32,
    breachEvent = null,
    deathEvent = null,
    lowEvent = null,
    sound = {},
    messages = {}
  } = options;
  const readMessage = (message) => (typeof message === "function" ? message() : message);
  const previousHull = state.hull;
  if (energyLoss) state.energy = clamp(state.energy - energyLoss, 0, 100);
  if (shieldLoss) state.shield = clamp(state.shield - shieldLoss, 0, 100);
  if (corruptionGain) state.corruption = clamp(state.corruption + corruptionGain, 0, 100);

  const breached = forceBreach || state.shield <= 0;
  if (breached) {
    state.breaches += 1;
    state.hull = clamp(state.hull - hullLoss, 0, 100);
    state.shield = clamp(state.shield + shieldRestore, 0, 100);
    shellShake = true;
    if (breachEvent) breachEvent();
    if (sound.breach) playSound(sound.breach);
    if (messages.breach) pushEvent(readMessage(messages.breach));
  }

  if (state.hull <= 0) {
    state.status = "dead";
    state.pendingDeath = true;
    state.hull = 0;
    triggerScene("death");
    if (deathEvent) deathEvent();
    playSound(sound.death || "death");
    setFeedback(readMessage(messages.death) || "K-01 机体耐久归零，驾驶舱失联", "death");
    pushEvent(readMessage(messages.deathLog) || "死亡记录：机体耐久归零。");
    scheduleDeathFinish();
    return { dead: true, breached };
  }

  if (isLowHullState() && state.status !== "dead") {
    const critical = isCriticalHullState();
    flashHullAlert(critical ? "critical" : "low");
    if (lowEvent) lowEvent(critical);
    if (!state.lowHealthWarned || critical) {
      state.lowHealthWarned = true;
      playSound(sound.low || "low");
    }
    if (critical) {
      if (messages.critical) {
        const message = readMessage(messages.critical);
        setFeedback(message, "low-health");
        pushEvent(message);
      }
    } else if (previousHull > LOW_HEALTH_THRESHOLD && state.hull <= LOW_HEALTH_THRESHOLD && messages.low) {
      const message = readMessage(messages.low);
      setFeedback(message, "low-health");
      pushEvent(message);
    }
  }

  return { dead: false, breached };
}

function getWaveProgress(currentState = state) {
  if (!currentState) return null;
  const progress = currentState.level.mode === "home" ? currentState.completedTargets : currentState.completedActions;
  let accumulated = 0;
  for (let index = 0; index < currentState.level.waves.length; index += 1) {
    const wave = currentState.level.waves[index];
    const start = accumulated;
    accumulated += wave.count;
    if (progress < accumulated || index === currentState.level.waves.length - 1) {
      return {
        ...wave,
        index,
        total: currentState.level.waves.length,
        current: clamp(progress - start, 0, wave.count),
        overall: progress
      };
    }
  }
  return currentState.level.waves[currentState.level.waves.length - 1];
}

function getComboRank() {
  if (!state) return "校准中";
  if (state.status === "finger-calibration") return "校准中";
  if (state.level.mode === "cruise" && state.combo < 5) return isCruiseIntroActive() ? "接入中" : "巡航中";
  if (state.combo < 5) return state.level.mode === "strike" ? "交战中" : "校准中";
  if (state.combo < 10) return "稳定";
  if (state.combo < 20) return "巡航";
  if (state.combo < 30) return "加速";
  return "完美航线";
}

function getCurrentMonster() {
  if (!state) return "";
  if (state.level.mode === "strike") {
    return getStrikeEncounter()?.monster || state.level.monster || "漂移僵尸";
  }
  if (state.level.mode === "cruise") {
    const threat = getCurrentCruiseThreat();
    if (!threat) return state.level.monster || "污染弹体";
    if (threat.type === "turret") return "污染炮台";
    if (threat.type === "swarm") return "错位虫群";
    if (threat.homePulse) return "基准位稳压威胁";
    return "污染弹体";
  }
  const wave = getWaveProgress();
  return wave?.monster || state.level.monster || "旧坐标残影";
}

function generateHomeTargets(level) {
  return homeRules.generateHomeTargets(level);
}

function nextHomeTarget(currentState) {
  homeRules.nextHomeTarget(currentState);
}

function nextStrikePattern(currentState) {
  const previousEncounter = currentState.strikeQueue?.[Math.max(0, currentState.completedActions - 1)];
  const encounter = getStrikeEncounter(currentState);
  currentState.pathStep = 0;
  currentState.encounterHits = 0;
  currentState.monsterPressure = clamp(currentState.monsterPressure + getEncounterEntryPressure(encounter), 18, 90);
  currentState.currentTarget = encounter.pattern[0];
  currentState.currentRoomIndex = encounter.roomIndex || 0;
  if (previousEncounter && encounter.roomId !== previousEncounter.roomId) {
    triggerScene("room-change");
    pushEvent(`进入${getStrikeRoomTheme(encounter.roomId).name}。${getStrikeRoomTheme(encounter.roomId).briefing}`);
  } else if (encounter.pattern.length > 3 || encounter.modifier.id === "rush") {
    triggerScene(encounter.modifier.id === "rush" ? "surge" : "ambush");
  }
  pushEvent(`${getEncounterRuleLabel(encounter)}：${getEncounterRuleHint(encounter)}`);
}

function getCurrentCruiseThreat(currentState = state) {
  return cruiseRules.getCurrentCruiseThreat(currentState);
}

function getCruiseThreatTimeRatio(currentState = state) {
  return cruiseRules.getCruiseThreatTimeRatio(currentState);
}

function getCruiseThreatProgress(currentState = state) {
  return cruiseRules.getCruiseThreatProgress(currentState);
}

function getCruiseRoundInfo(currentState = state) {
  return cruiseRules.getCruiseRoundInfo(currentState);
}

function getCruiseRoundThreats(currentState = state) {
  return cruiseRules.getCruiseRoundThreats(currentState);
}

function getCruiseIntroRemaining(currentState = state) {
  return cruiseRules.getCruiseIntroRemaining(currentState);
}

function isCruiseIntroActive(currentState = state) {
  return cruiseRules.isCruiseIntroActive(currentState);
}

function maybeBeginCruiseThreat(currentState = state) {
  if (!currentState || currentState.level.mode !== "cruise" || currentState.status !== "playing") return false;
  if (currentState.result || currentState.threatStartedAt || getCruiseIntroRemaining(currentState) > 0) return false;
  beginCruiseThreat(currentState);
  return true;
}

function beginCruiseThreat(currentState, options = {}) {
  const threat = getCurrentCruiseThreat(currentState);
  if (!threat) {
    currentState.currentTarget = "";
    return;
  }
  const now = Date.now();
  currentState.threatStartedAt = now;
  currentState.threatDeadlineAt = now + threat.deadlineMs;
  currentState.currentTarget = threat.key;
  currentState.cruiseCloseWarnedFor = "";
  if (!options.silent) {
    if ((threat.roundStep || 0) === 0 && currentState.completedActions === 0) {
      queueCruiseCombatEvent("round-shift", { threat: { ...threat }, round: getCruiseRoundInfo(currentState) });
      if ((threat.roundIndex || 0) > 0) playSound("projectile_close", { gain: 0.28 });
    }
    triggerScene("threat-spawn");
    queueCruiseCombatEvent("threat-spawn", { threat: { ...threat } });
    playSound("projectile_spawn", { gain: threat.homePulse ? 0.64 : 0.58 });
    setFeedback(`${threat.hand}${threat.finger} / ${formatKey(threat.key)} 拦截 ${threat.laneLabel}`, "neutral");
  }
}

function advanceCruiseThreat(reason = "resolved") {
  if (!state || state.level.mode !== "cruise") return;
  const previousThreat = getCurrentCruiseThreat(state);
  const previousWave = previousThreat?.waveIndex || 0;
  const previousRound = previousThreat?.roundIndex || 0;
  state.threatIndex += 1;
  state.completedActions = Math.max(state.completedActions, state.threatIndex);

  if (state.completedActions >= state.level.targetActions || state.threatIndex >= state.cruiseQueue.length) {
    state.currentTarget = "";
    triggerScene("mission-clear");
    queueCruiseCombatEvent("mission-clear", { reason, intercepts: state.cruiseIntercepts });
    playSound("wave_clear");
    syncAudioDirector();
    scheduleDeferredFinish("complete", 720);
    return;
  }

  const nextThreat = getCurrentCruiseThreat(state);
  if (nextThreat && nextThreat.waveIndex !== previousWave) {
    state.cruiseWaveClears += 1;
    triggerScene("wave-clear");
    queueCruiseCombatEvent("wave-clear", {
      previousWave,
      nextWave: nextThreat.waveIndex,
      threat: { ...nextThreat }
    });
    playSound("wave_clear");
    pushEvent(`${state.level.waves[previousWave]?.name || "巡航段"}压制，进入${nextThreat.waveName}。`);
  }
  if (nextThreat && (nextThreat.roundIndex || 0) !== previousRound) {
    triggerScene("round-shift");
    queueCruiseCombatEvent("round-shift", { threat: { ...nextThreat }, round: getCruiseRoundInfo(state) });
    pushEvent(`巡航节奏切换：${nextThreat.rhythmLabel || "下一串"} / ${nextThreat.roundSize} 键。`);
  }

  beginCruiseThreat(state);
}

function applyCruiseDamage(kind, threat, actual = "") {
  const timeout = kind === "timeout";
  const drifted = actual ? isDrift(threat.key, actual) : false;
  state.wrongCount += 1;
  state.totalInputs += 1;
  state.combo = 0;
  state.consecutiveErrors += 1;
  state.cruiseMisses += 1;
  markWeak(threat.key);
  flashType = "bad";
  shellShake = true;

  if (drifted) {
    state.homeDriftCount += 1;
    triggerScene("drift");
    queueCruiseCombatEvent("drift-error", { threat: { ...threat }, actual, target: threat.key });
    playSound("drift");
    setFeedback(`旧坐标接管：目标 ${formatKey(threat.key)}，实际 ${formatKey(actual)}`, "drift");
  } else {
    triggerScene(timeout ? "timeout-hit" : "crash");
    queueCruiseCombatEvent(timeout ? "timeout-hit" : "wrong-key", { threat: { ...threat }, actual, target: threat.key });
    playSound(timeout ? "timeout_hit" : "wrong");
    setFeedback(timeout ? `${threat.laneLabel} 命中防线，下一枚威胁进入` : `目标仍是 ${formatKey(threat.key)}，防线受压`, "error");
  }

  const damage = applyGlobalHullDamage({
    energyLoss: timeout ? 5 : 3,
    shieldLoss: timeout ? 14 : 10,
    hullLoss: timeout ? 12 : 9,
    corruptionGain: drifted ? 14 : timeout ? 10 : 7,
    breachEvent: () => queueCruiseCombatEvent("shield-break", { threat: { ...threat }, hull: state.hull }),
    deathEvent: () => queueCruiseCombatEvent("death", { threat: { ...threat } }),
    lowEvent: () => queueCruiseCombatEvent("low-health", { hull: state.hull, shield: state.shield }),
    sound: { breach: "shield_block", low: "low", death: "death" },
    messages: {
      breach: () => `防线破口：机体耐久 ${state.hull}%`,
      low: () => `低血量：机体耐久 ${state.hull}%`,
      critical: () => `最终警报：机体耐久仅 ${state.hull}%`,
      death: "K-01 防线崩溃，驾驶舱失联",
      deathLog: "死亡记录：03 巡航防线被突破。"
    }
  });
  if (damage.dead) {
    return { drifted, dead: true };
  }

  return { drifted };
}

function handleCruiseTimeouts() {
  if (!state || state.level.mode !== "cruise" || state.status !== "playing" || state.result) return false;
  if (isCruiseIntroActive(state)) return false;
  if (maybeBeginCruiseThreat(state)) return false;
  const threat = getCurrentCruiseThreat(state);
  if (!threat || !state.threatStartedAt) return false;
  const ratio = getCruiseThreatTimeRatio(state);
  if (ratio < 0.34 && state.cruiseCloseWarnedFor !== threat.id) {
    state.cruiseCloseWarnedFor = threat.id;
    queueCruiseCombatEvent("threat-close", { threat: { ...threat }, ratio });
    playSound("projectile_close", { gain: 0.38 });
  }
  if (Date.now() < state.threatDeadlineAt) return false;
  state.cruiseTimeouts += 1;
  applyCruiseDamage("timeout", threat);
  if (state.status === "dead") return true;
  advanceCruiseThreat("timeout");
  return true;
}

function getCurrentCalibrationDrill(currentState = state) {
  return strikeRules.getCurrentCalibrationDrill(currentState);
}

function beginStrikeCombat() {
  if (!state || state.level.mode !== "strike") return;
  state.status = "playing";
  state.startedAt = Date.now();
  state.endsAt = Date.now() + state.level.durationSeconds * 1000;
  state.timeLeft = state.level.durationSeconds;
  state.pathStep = 0;
  state.encounterHits = 0;
  state.roomsCleared = 0;
  state.bossCleared = false;
  state.missionClearing = false;
  state.currentRoomIndex = 0;
  state.roomTransition = null;
  state.inputLockedUntil = 0;
  const encounter = getStrikeEncounter(state);
  state.monsterPressure = 34;
  state.currentTarget = encounter.pattern[0];
  triggerScene("launch");
  queueRoomCombatEvent("room-enter", {
    room: getStrikeRoomTheme(encounter.roomId),
    encounter: { ...encounter, pattern: [...encounter.pattern], basePattern: [...encounter.basePattern] }
  });
  playSound("door");
  syncAudioDirector(true);
  pushEvent(`${getStrikeRoomTheme(encounter.roomId).name}：${getStrikeRoomTheme(encounter.roomId).briefing}`);
  pushEvent(`正式清障开始：${getEncounterRuleLabel(encounter)}。`);
  setFeedback("校准完成，实战闸门开启", "correct");
}

function skipStrikeCalibration() {
  if (!state || state.level.mode !== "strike" || state.status !== "finger-calibration") return;
  state.calibrationIndex = state.calibrationQueue.length;
  state.calibrationStep = 0;
  state.calibrationCompleted = Math.max(state.calibrationCompleted, state.calibrationQueue.length);
  state.calibrationWrong = 0;
  pushEvent("已跳过机械臂接入校准，直接进入实战房间。");
  beginStrikeCombat();
  render();
}

function getStrikeRoomTheme(indexOrId = 0) {
  return strikeRules.getStrikeRoomTheme(indexOrId);
}

function calculateAccuracy(currentState) {
  if (!currentState.totalInputs) return 100;
  return Math.round((currentState.correctCount / currentState.totalInputs) * 100);
}

function calculateStability(currentState) {
  return clamp(100 - currentState.homeDriftCount * 8 - currentState.wrongCount * 3, 0, 100);
}

function calculatePathRate(currentState) {
  if (currentState.level.mode === "cruise") {
    if (!currentState.completedActions && !currentState.cruiseMisses) return 0;
    const resolved = currentState.cruiseIntercepts + currentState.cruiseMisses;
    return resolved ? Math.round((currentState.cruiseIntercepts / resolved) * 100) : 0;
  }
  if (currentState.level.mode !== "strike") return 100;
  if (!currentState.actionAttempts) return 0;
  return Math.round((currentState.completedActions / currentState.actionAttempts) * 100);
}

function calculateStars(currentState) {
  const accuracy = calculateAccuracy(currentState);
  if (currentState.level.mode === "home") {
    if (accuracy >= 95 && currentState.homeDriftCount <= 3) return 3;
    if (accuracy >= 90) return 2;
    return currentState.completedTargets >= currentState.level.targetCount ? 1 : 0;
  }

  if (currentState.level.mode === "cruise") {
    const interceptRate = calculatePathRate(currentState);
    if (interceptRate >= 92 && currentState.cruiseTimeouts <= 3 && accuracy >= 90) return 3;
    if (interceptRate >= 84 && currentState.cruiseTimeouts <= 6) return 2;
    return currentState.completedActions >= currentState.level.targetActions ? 1 : 0;
  }

  const pathRate = calculatePathRate(currentState);
  if (pathRate >= 95 && currentState.homeDriftCount <= 3) return 3;
  if (pathRate >= 90) return 2;
  return currentState.completedActions >= currentState.level.targetActions ? 1 : 0;
}

function getWeakKeys(currentState) {
  return Object.entries(currentState.weakKeys)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key]) => formatKey(key));
}

function getPartsEarned(currentState) {
  const parts = [];
  if (currentState.level.rewardPool?.length) {
    parts.push(currentState.level.rewardPool[0]);
  }
  if (calculateAccuracy(currentState) >= 90 && currentState.level.rewardPool?.[1]) {
    parts.push(currentState.level.rewardPool[1]);
  }
  if (currentState.homeDriftCount === 0 && currentState.level.rewardPool?.[2]) {
    parts.push(currentState.level.rewardPool[2]);
  }
  if (currentState.level.mode === "strike" && calculatePathRate(currentState) >= 95) {
    parts.push("漂移僵尸图鉴更新");
  }
  if (currentState.level.mode === "strike" && currentState.monstersCleared >= 10) {
    parts.push("清障战斗记录");
  }
  if (currentState.level.mode === "strike" && (currentState.roomsCleared || 0) >= STRIKE_ROOM_CHAIN.length) {
    parts.push("全房间清障记录");
  }
  if (currentState.level.mode === "strike" && currentState.bossCleared) {
    parts.push("旧坐标核心压制样本");
  }
  if (currentState.level.mode === "strike" && currentState.breaches === 0 && currentState.monstersCleared >= currentState.level.targetActions) {
    parts.push("无破舱徽记");
  }
  if (currentState.level.mode === "cruise" && calculatePathRate(currentState) >= 84) {
    parts.push("巡航拦截记录");
  }
  if (currentState.level.mode === "cruise" && currentState.cruiseTimeouts <= 3) {
    parts.push("防线稳压徽记");
  }
  return [...new Set(parts)];
}

function isTrainingComplete(currentState) {
  if (currentState.level.mode === "home") {
    return currentState.completedTargets >= currentState.level.targetCount;
  }
  return currentState.completedActions >= currentState.level.targetActions;
}

function finishGame(reason = "complete") {
  if (!state || state.result) return;
  clearInterval(timerId);
  timerId = null;
  clearDeferredFinishTimers();
  resetTransientEffects();

  const duration = Math.round((Date.now() - state.startedAt) / 1000);
  const completed = isTrainingComplete(state);
  const rewardEligible = reason === "complete" && completed;
  const partsEarned = rewardEligible ? getPartsEarned(state) : [];
  const accuracy = state.totalInputs ? calculateAccuracy(state) : 0;
  const result = {
    levelId: state.level.id,
    levelTitle: state.level.title,
    playedAt: new Date().toISOString(),
    duration,
    reason,
    completed,
    targets: state.level.mode === "home" ? state.completedTargets : state.completedActions,
    correctCount: state.correctCount,
    wrongCount: state.wrongCount,
    accuracy,
    maxCombo: state.maxCombo,
    homeDriftCount: state.homeDriftCount,
    pathCompleteRate: calculatePathRate(state),
    stability: calculateStability(state),
    weakKeys: getWeakKeys(state),
    shieldRemaining: state.shield,
    hullRemaining: state.hull,
    corruption: state.corruption,
    breaches: state.breaches,
    monsterPressure: state.monsterPressure,
    monstersCleared: state.monstersCleared,
    roomsCleared: state.roomsCleared || 0,
    bossCleared: Boolean(state.bossCleared),
    loopStability: calculatePathRate(state),
    cruiseInterceptRate: state.level.mode === "cruise" ? calculatePathRate(state) : null,
    cruiseTimeouts: state.cruiseTimeouts || 0,
    cruiseMisses: state.cruiseMisses || 0,
    cruiseAnchorPulses: state.cruiseAnchorPulses || 0,
    cruiseWaveClears: state.cruiseWaveClears || 0,
    cruiseFingerStats: state.cruiseFingerStats || {},
    cruiseHandStats: state.cruiseHandStats || {},
    partsEarned,
    stars: rewardEligible ? calculateStars(state) : 0
  };

  state.result = result;
  saveResult(result);
  addInventory(partsEarned);
  view = "result";
  playSound(reason === "death" ? "death" : "report");
  render();
}

function startLevel(levelId) {
  const level = LEVELS.find((item) => item.id === levelId) || LEVELS[0];
  clearDeferredFinishTimers();
  resetTransientEffects();
  selectedLevelId = level.id;
  state = makeInitialState(level);
  state.runId = ++runSequence;
  view = "playing";

  if (level.mode === "home") {
    state.currentTarget = "f";
  } else if (level.mode === "cruise") {
    state.inputLockedUntil = state.cruiseIntroUntil;
    triggerScene("cruise-ready");
    queueCruiseCombatEvent("cruise-ready", { round: getCruiseRoundInfo(state) });
  } else if (state.status === "playing") {
    state.currentTarget = getCurrentPattern(state)[0];
  }

  clearInterval(timerId);
  syncAudioDirector(true);
  timerId = setInterval(() => {
    if (!state || view !== "playing" || state.status !== "playing") return;
    completeRoomTransitionIfReady();
    if (state.level.mode === "cruise") {
      const introWasActive = isCruiseIntroActive();
      handleCruiseTimeouts();
      if (introWasActive && !isCruiseIntroActive()) {
        state.inputLockedUntil = 0;
        maybeBeginCruiseThreat(state);
      }
      if (isCruiseCombatLive()) {
        updateLiveCruiseHud();
        refreshLiveCruiseSurface();
      }
      if (!state || view !== "playing" || state.status !== "playing") return;
    }
    const nextTimeLeft = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
    if (nextTimeLeft !== state.timeLeft) {
      state.timeLeft = nextTimeLeft;
      if (isRoomCombatLive()) {
        updateLiveCombatHud();
      } else if (isCruiseCombatLive()) {
        updateLiveCruiseHud();
        refreshLiveCruiseSurface();
      } else {
        render();
      }
    }
    if (nextTimeLeft <= 0) {
      finishGame("timeout");
    }
  }, 250);

  render();
}

function isRoomCombatLive(currentState = state) {
  return view === "playing"
    && currentState
    && currentState.level.mode === "strike"
    && currentState.status === "playing";
}

function isCruiseCombatLive(currentState = state) {
  return view === "playing"
    && currentState
    && currentState.level.mode === "cruise"
    && currentState.status === "playing";
}

function updateLiveCombatHud() {
  if (!state) return;
  syncAudioDirector();
  const setHudValue = (label, value, fill = null) => {
    const item = document.querySelector(`[data-hud="${label}"]`);
    const node = item?.querySelector(".hud-value");
    if (node) node.textContent = value;
    if (item && fill !== null) item.style.setProperty("--readout-fill", fill);
  };
  const accuracy = calculateAccuracy(state);
  setHudValue("倒计时", `${state.timeLeft}s`, state.level.timeLimit ? state.timeLeft / state.level.timeLimit : 1);
  setHudValue("任务", `${state.completedActions}/${state.level.targetActions}`, state.level.targetActions ? state.completedActions / state.level.targetActions : 0);
  setHudValue("连击", state.combo, clamp(state.combo, 0, 30) / 30);
  setHudValue("准确率", `${accuracy}%`, accuracy / 100);
  const statusNode = document.querySelector('[data-hud="状态"] .hud-value');
  if (statusNode) statusNode.textContent = getComboRank();
  const feedbackNode = document.querySelector(".room-combat-layout .feedback-message");
  if (feedbackNode) {
    feedbackNode.className = `feedback-message ${state.feedbackType}`;
    feedbackNode.textContent = state.feedback;
  }
}

function updateLiveCruiseHud() {
  if (!state || state.level.mode !== "cruise") return;
  syncAudioDirector();
  updateAppShellState();
  const setHudValue = (label, value, fill = null) => {
    const item = document.querySelector(`[data-hud="${label}"]`);
    const node = item?.querySelector(".hud-value");
    if (node) node.textContent = value;
    if (item && fill !== null) item.style.setProperty("--readout-fill", fill);
  };
  const accuracy = calculateAccuracy(state);
  const progress = state.level.targetActions ? state.completedActions / state.level.targetActions : 0;
  setHudValue("倒计时", `${state.timeLeft}s`, state.level.durationSeconds ? state.timeLeft / state.level.durationSeconds : 1);
  setHudValue("任务", `${state.completedActions}/${state.level.targetActions}`, progress);
  setHudValue("连击", state.combo, clamp(state.combo, 0, 30) / 30);
  setHudValue("准确率", `${accuracy}%`, accuracy / 100);
  const statusNode = document.querySelector('[data-hud="状态"] .hud-value');
  if (statusNode) statusNode.textContent = getComboRank();
  const feedbackNode = document.querySelector(".room-combat-layout .feedback-message");
  if (feedbackNode) {
    feedbackNode.className = `feedback-message ${state.feedbackType}`;
    feedbackNode.textContent = state.feedback;
  }
}

function refreshLiveCombatSurface() {
  if (!isRoomCombatLive()) return;
  completeRoomTransitionIfReady(false, { renderAfter: false });
  const stage = document.querySelector("#strike-phaser-stage");
  if (!stage || !window.Phaser || !window.RoomCombatScene) return;
  const rect = stage.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || stage.clientWidth || 900));
  const height = Math.max(1, Math.round(rect.height || stage.clientHeight || 460));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const snapshot = getStrikeSceneSnapshot(width, height, pixelRatio);
  window.__KEY_PILOT_ROOM_SNAPSHOT__ = snapshot;
  const scene = phaserGame?.scene?.keys?.RoomCombatScene;
  if (scene?.updateSnapshot) {
    const eventQueue = Array.isArray(window.__KEY_PILOT_ROOM_EVENT_QUEUE__) ? window.__KEY_PILOT_ROOM_EVENT_QUEUE__ : [];
    const preSnapshotEvents = eventQueue.filter((event) => event?.type !== "room-enter");
    const postSnapshotEvents = eventQueue.filter((event) => event?.type === "room-enter");
    if (scene.applyCombatEvent) {
      preSnapshotEvents.forEach((event) => scene.applyCombatEvent(event));
    }
    scene.updateSnapshot(snapshot);
    if (scene.applyCombatEvent) {
      postSnapshotEvents.forEach((event) => scene.applyCombatEvent(event));
      window.__KEY_PILOT_ROOM_EVENT_QUEUE__ = [];
      if (!eventQueue.length && window.__KEY_PILOT_ROOM_EVENT__) {
        scene.applyCombatEvent(window.__KEY_PILOT_ROOM_EVENT__);
      }
    }
    return;
  }
  syncPhaserScene();
}

function refreshLiveCruiseSurface() {
  if (!isCruiseCombatLive()) return;
  const stage = document.querySelector("#cruise-phaser-stage");
  if (!stage || !window.Phaser || !window.CruiseDefenseScene) return;
  const rect = stage.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || stage.clientWidth || 900));
  const height = Math.max(1, Math.round(rect.height || stage.clientHeight || 460));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const snapshot = getCruiseSceneSnapshot(width, height, pixelRatio);
  window.__KEY_PILOT_CRUISE_SNAPSHOT__ = snapshot;
  const scene = phaserGame?.scene?.keys?.CruiseDefenseScene;
  if (scene?.updateSnapshot) {
    const eventQueue = Array.isArray(window.__KEY_PILOT_CRUISE_EVENT_QUEUE__) ? window.__KEY_PILOT_CRUISE_EVENT_QUEUE__ : [];
    scene.updateSnapshot(snapshot);
    if (scene.applyCruiseEvent) {
      eventQueue.forEach((event) => scene.applyCruiseEvent(event));
      window.__KEY_PILOT_CRUISE_EVENT_QUEUE__ = [];
      if (!eventQueue.length && window.__KEY_PILOT_CRUISE_EVENT__) {
        scene.applyCruiseEvent(window.__KEY_PILOT_CRUISE_EVENT__);
      }
    }
    return;
  }
  syncPhaserScene();
}

function completeRoomTransitionIfReady(force = false, options = {}) {
  if (!state?.roomTransition || state.result || view !== "playing") return false;
  const { renderAfter = true } = options;
  const transition = state.roomTransition;
  const elapsed = Date.now() - transition.startedAt;
  if (!force && elapsed < transition.durationMs) return false;
  const nextEncounter = transition.toEncounter || state.strikeQueue?.[state.completedActions];
  state.roomTransition = null;
  state.inputLockedUntil = 0;
  if (!nextEncounter) {
    if (renderAfter) render();
    return true;
  }
  nextStrikePattern(state);
  queueRoomCombatEvent("room-enter", {
    room: getStrikeRoomTheme(nextEncounter.roomId),
    encounter: { ...nextEncounter, pattern: [...nextEncounter.pattern], basePattern: [...nextEncounter.basePattern] },
    roomsCleared: state.roomsCleared
  });
  playSound("door");
  syncAudioDirector();
  setFeedback(`${getStrikeRoomTheme(nextEncounter.roomId).name}接入：${getStrikeRoomTheme(nextEncounter.roomId).briefing}`, "neutral");
  if (renderAfter) {
    updateLiveCombatHud();
    refreshLiveCombatSurface();
  }
  return true;
}

function stopToMenu() {
  clearInterval(timerId);
  timerId = null;
  clearDeferredFinishTimers();
  resetTransientEffects();
  state = null;
  view = "menu";
  syncAudioDirector();
  render();
}

function markWeak(key) {
  state.weakKeys[key] = (state.weakKeys[key] || 0) + 1;
}

function isDrift(target, actual) {
  return DRIFT_LEFT_MAP[target] === actual;
}

function setFeedback(message, type = "neutral") {
  state.feedback = message;
  state.feedbackType = type;
  if (type !== "neutral") {
    pushEvent(message);
  }
}

function lowerStrikePressure(amount) {
  if (!state || state.level.mode !== "strike") return;
  state.monsterPressure = clamp(state.monsterPressure - amount, 0, 100);
}

function raiseStrikePressure(actual, target) {
  if (!state || state.level.mode !== "strike") return;
  const encounter = getStrikeEncounter();
  const pattern = getCurrentPattern();
  const modifierBoost = encounter.modifier.id === "rush" ? 14 : encounter.modifier.id === "glitch" ? 10 : encounter.modifier.id === "split" ? 8 : 5;
  const pathBoost = state.pathStep > 0 ? (isStrikeReturnStep(pattern, state.pathStep) ? 14 : 10) : 0;
  const advancedBoost = pattern.length > 3 ? 5 : 0;
  const streakBoost = Math.min(state.consecutiveErrors * 7, 28);
  state.monsterPressure = clamp(state.monsterPressure + 18 + modifierBoost + pathBoost + advancedBoost + streakBoost, 0, 120);

  if (state.monsterPressure >= 100) {
    state.monsterPressure = 76;
    const damage = applyGlobalHullDamage({
      forceBreach: true,
      energyLoss: 10,
      shieldLoss: 18,
      hullLoss: HULL_DAMAGE_PER_BREACH,
      corruptionGain: 16,
      breachEvent: () => triggerScene("breach"),
      deathEvent: () => triggerScene("death"),
      lowEvent: (critical) => triggerScene(critical ? "low-health" : "low-health"),
      sound: { breach: "breach", low: "low", death: "death" },
      messages: {
        breach: () => `破舱记录：${encounter.monster} 撞上驾驶舱，目标 ${formatKey(target)}，实际 ${formatKey(actual)}，耐久 ${state.hull}%`,
        low: () => `低血量：机体耐久 ${state.hull}%`,
        critical: () => `最终警报：机体耐久仅 ${state.hull}%`,
        death: "K-01 耐久归零，驾驶舱失联",
        deathLog: "死亡记录：机体耐久归零。"
      }
    });
    if (!damage.dead) {
      setFeedback(
        state.hull <= CRITICAL_HEALTH_THRESHOLD
          ? `最终警报：机体耐久仅 ${state.hull}%`
          : `${encounter.monster} 撞上驾驶舱，破舱 ${state.breaches}`,
        state.hull <= LOW_HEALTH_THRESHOLD ? "low-health" : "critical"
      );
    }
    return;
  }

  if (state.monsterPressure >= 72) {
    triggerScene("surge");
    setFeedback(`警报：${encounter.monster} 已贴近，先稳住 ${formatKey(target)}`, "critical");
    return;
  }

  if (state.consecutiveErrors >= 3) {
    triggerScene("ambush");
    setFeedback(`${encounter.modifier.label}干扰叠加，怪物压近`, "error");
  }
}

function maybeTriggerCombatOverdrive() {
  if (!state || state.level.mode !== "strike" || state.status !== "playing") return false;
  if (!state.combo || state.combo % 6 !== 0) return false;
  const bonus = state.combo >= 18 ? 14 : state.combo >= 12 ? 11 : 8;
  state.energy = clamp(state.energy + 5, 0, 100);
  state.shield = clamp(state.shield + 4, 0, 100);
  lowerStrikePressure(bonus);
  triggerScene("overdrive");
  playSound("clear");
  pushEvent(`连击 ${state.combo}：机械臂过载，威胁回退。`);
  setFeedback(`连击 ${state.combo} / 过载清障`, "correct");
  return true;
}

function registerCorrect(message) {
  state.correctCount += 1;
  state.totalInputs += 1;
  state.combo += 1;
  state.consecutiveErrors = 0;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.energy = clamp(state.energy + 2 + (state.combo > 0 && state.combo % 10 === 0 ? 4 : 0), 0, 100);
  state.corruption = clamp(state.corruption - 1, 0, 100);
  if (state.combo > 0 && state.combo % 10 === 0) {
    state.shield = clamp(state.shield + 6, 0, 100);
    lowerStrikePressure(10);
    pushEvent("护盾电容短暂回充。");
  }
  flashType = "ok";
  triggerScene("hit");
  if (!(state.level.mode === "strike" && state.status === "playing")) {
    playSound("correct");
  }
  setFeedback(message, "correct");
}

function registerWrong(actual, target) {
  const drifted = isDrift(target, actual);
  state.wrongCount += 1;
  state.totalInputs += 1;
  state.combo = 0;
  state.consecutiveErrors += 1;
  state.energy = clamp(state.energy - 3, 0, 100);
  state.shield = clamp(state.shield - 8, 0, 100);
  state.corruption = clamp(state.corruption + 7, 0, 100);
  markWeak(target);
  flashType = "bad";

  if (drifted) {
    state.homeDriftCount += 1;
    state.energy = clamp(state.energy - 3, 0, 100);
    state.shield = clamp(state.shield - 7, 0, 100);
    state.corruption = clamp(state.corruption + 10, 0, 100);
    shellShake = true;
    triggerScene("drift");
    playSound("drift");
    setFeedback(pick(FEEDBACK.drift), "drift");
    pushEvent(`漂移警报：目标 ${formatKey(target)}，实际 ${formatKey(actual)}`);
  } else {
    shellShake = true;
    triggerScene("crash");
    playSound("wrong");
    setFeedback(pick(FEEDBACK.wrong), "error");
  }

  raiseStrikePressure(actual, target);

  if (drifted && state.status !== "dead") {
    triggerScene("drift");
    setFeedback(pick(FEEDBACK.drift), "drift");
  }

  if (isLowHullState() && state.status !== "dead") {
    flashHullAlert(isCriticalHullState() ? "critical" : "low");
  }

  if (state.consecutiveErrors >= 2) {
    pushEvent(`${getCurrentMonster()} 靠近了一格。`);
  }
  if (state.consecutiveErrors >= 4) {
    pushEvent("锚点信号变脏，建议重新锁 F/J。");
  }

  return { drifted };
}

function handlePrelock(key) {
  if (key === "f") {
    state.leftLocked = true;
    if (!state.rightLocked) state.currentTarget = "j";
    state.energy = clamp(state.energy + 8, 0, 100);
    triggerScene("boot");
    playSound("correct");
    setFeedback("左手锚点 F 已锁定", "correct");
  } else if (key === "j") {
    state.rightLocked = true;
    if (!state.leftLocked) state.currentTarget = "f";
    state.energy = clamp(state.energy + 8, 0, 100);
    triggerScene("boot");
    playSound("correct");
    setFeedback("右手锚点 J 已锁定", "correct");
  } else {
    state.energy = clamp(state.energy - 3, 0, 100);
    shellShake = true;
    triggerScene("crash");
    playSound("wrong");
    setFeedback("先锁定 F/J", "error");
  }

  if (state.leftLocked && state.rightLocked) {
    state.status = "playing";
    state.startedAt = Date.now();
    state.endsAt = Date.now() + state.level.durationSeconds * 1000;
    state.timeLeft = state.level.durationSeconds;
    nextHomeTarget(state);
    pushEvent("舱门打开：开始战前设备预检。");
    triggerScene("launch");
    playSound("clear");
    setFeedback("锚点锁定，开始中排预检", "correct");
  }
}

function handleHomeInput(key) {
  const target = state.currentTarget;
  if (key === target) {
    registerCorrect(pick(FEEDBACK.correct));
    triggerScene("charge");
    state.completedTargets += 1;
    if (HOME_KEYS.includes(target)) {
      state.chargedKeys[target] = (state.chargedKeys[target] || 0) + 1;
    }
    const wave = getWaveProgress(state);
    if (wave.current === 0 && state.completedTargets > 1) {
      pushEvent(`${wave.name} 启动：${wave.objective}`);
    }
    if (state.completedTargets >= state.level.targetCount) {
      finishGame("complete");
      return;
    }
    nextHomeTarget(state);
  } else {
    registerWrong(key, target);
  }
}

function getCurrentPattern(currentState = state) {
  if (!currentState) return [];
  if (currentState.level.mode === "strike") {
    if (currentState.status === "finger-calibration") {
      return getCurrentCalibrationDrill(currentState)?.pattern || [];
    }
    return getStrikeEncounter(currentState)?.pattern || [];
  }
  if (currentState.level.mode === "cruise") {
    const threat = getCurrentCruiseThreat(currentState);
    return threat?.key ? [threat.key] : [];
  }
  return getPatternForAction(currentState.level, currentState.completedActions);
}

function getFingerGuideForKey(key) {
  return FINGER_GUIDES[key] || null;
}

function getFingerGuideForPattern(pattern) {
  if (!pattern?.length) return null;
  return getFingerGuideForKey(pattern[1]) || getFingerGuideForKey(pattern[0]) || null;
}

function getCurrentFingerGuide(currentState = state) {
  if (!currentState) return null;
  if (currentState.level.mode === "cruise") {
    const threat = getCurrentCruiseThreat(currentState);
    return threat ? FINGER_GUIDE_BY_ID[threat.guideId] || getFingerGuideForKey(threat.key) : null;
  }
  if (currentState.level.mode !== "strike") return null;
  if (currentState.status === "finger-calibration") {
    return getCurrentCalibrationDrill(currentState)?.guide || null;
  }
  return getFingerGuideForPattern(getCurrentPattern(currentState));
}

function handleStrikeCalibrationInput(key) {
  const drill = getCurrentCalibrationDrill();
  if (!drill) {
    beginStrikeCombat();
    return;
  }

  const pattern = drill.pattern;
  const target = pattern[state.calibrationStep];
  const guide = drill.guide;

  if (key === target) {
    state.calibrationStep += 1;
    state.calibrationCompleted += 1;
    state.energy = clamp(state.energy + 2, 0, 100);
    flashType = "ok";
    triggerScene(state.calibrationStep === 1 ? "boot" : state.calibrationStep === 2 ? "launch" : "return");
    playSound("correct");

    if (state.calibrationStep >= pattern.length) {
      state.calibrationIndex += 1;
      state.calibrationStep = 0;
      triggerScene("kill");
      playSound("clear");

      const nextDrill = getCurrentCalibrationDrill();
      if (!nextDrill) {
        beginStrikeCombat();
        return;
      }

      state.currentTarget = nextDrill.pattern[0];
      setFeedback(`${guide.hand}${guide.finger}接入完成，切换${nextDrill.guide.hand}${nextDrill.guide.finger}`, "correct");
      return;
    }

    state.currentTarget = pattern[state.calibrationStep];
    setFeedback(`${guide.hand}${guide.finger}线路同步中`, "correct");
    return;
  }

  state.calibrationWrong += 1;
  state.energy = clamp(state.energy - 2, 0, 100);
  flashType = "bad";
  shellShake = true;
  triggerScene("crash");
  playSound("wrong");
  setFeedback(`先用${guide.hand}${guide.finger}按 ${formatKey(target)}，这一步不扣血`, "error");
}

function handleStrikeInput(key) {
  const pattern = getCurrentPattern();
  const target = pattern[state.pathStep];
  const encounter = getStrikeEncounter();
  const returnStep = isStrikeReturnStep(pattern, state.pathStep);
  const attackStep = state.pathStep > 0 && !returnStep;
  const stepBefore = state.pathStep;

  if (key === target) {
    const labels = getStrikeStepLabel(pattern, state.pathStep);
    registerCorrect(labels);
    triggerScene(state.pathStep === 0 ? "launch" : attackStep ? (state.pathStep > 1 ? "combo-hit" : "hit") : "return");
    queueRoomCombatEvent(state.pathStep === 0 ? "base-lock" : attackStep ? "arm-strike" : "arm-return", {
      key,
      target,
      pattern: [...pattern],
      stepBefore,
      returnStep,
      attackStep,
      encounter: { ...encounter, pattern: [...encounter.pattern], basePattern: [...encounter.basePattern] },
      modifierId: encounter.modifier.id
    });
    if (state.pathStep === 0) {
      playSound("base_lock");
    } else if (attackStep) {
      playSound("arm_strike");
      playSound("monster_hit", { delay: 0.075, gain: 0.62 });
    } else {
      playSound("arm_return");
    }
    if (attackStep) {
      state.encounterHits += 1;
      lowerStrikePressure(encounter.modifier.id === "shield" ? 5 : 9);
    }
    if (returnStep) {
      lowerStrikePressure(pattern.length > 3 ? 14 : 12);
    }
    maybeTriggerCombatOverdrive();
    state.pathStep += 1;

    if (state.pathStep >= pattern.length) {
      state.completedActions += 1;
      state.actionAttempts += 1;
      state.monstersCleared += 1;
      state.energy = clamp(state.energy + (pattern.length > 3 ? 8 : 5), 0, 100);
      lowerStrikePressure(pattern.length > 3 ? 22 : 16);
      triggerScene("kill");
      queueRoomCombatEvent("monster-clear", {
        key,
        target,
        pattern: [...pattern],
        stepBefore,
        encounter: { ...encounter, pattern: [...encounter.pattern], basePattern: [...encounter.basePattern] },
        modifierId: encounter.modifier.id
      });
      playSound("clear");
      pushEvent(`${encounter.monster} 清除：${pattern.map(formatKey).join(" -> ")}`);
      setFeedback(pattern.length > 3 ? `${getEncounterRuleLabel(encounter)}完成，怪物碎裂` : "怪物清除，机械臂已收回", "correct");
      if (state.completedActions >= state.level.targetActions) {
        state.bossCleared = encounter.roomId === "core";
        state.roomsCleared = Math.max(state.roomsCleared || 0, (encounter.roomIndex || 0) + 1);
        state.missionClearing = true;
        state.pathStep = pattern.length;
        state.currentTarget = "";
        state.inputLockedUntil = Date.now() + 900;
        queueRoomCombatEvent("mission-clear", {
          room: getStrikeRoomTheme(encounter.roomId),
          encounter: { ...encounter, pattern: [...encounter.pattern], basePattern: [...encounter.basePattern] },
          roomsCleared: state.roomsCleared
        });
        playSound("report");
        syncAudioDirector();
        scheduleDeferredFinish("complete", 880);
        return;
      }
      const nextEncounter = state.strikeQueue?.[state.completedActions];
      if (nextEncounter && nextEncounter.roomId !== encounter.roomId) {
        state.roomsCleared = Math.max(state.roomsCleared || 0, (encounter.roomIndex || 0) + 1);
        const previousRoom = getStrikeRoomTheme(encounter.roomId);
        const nextRoom = getStrikeRoomTheme(nextEncounter.roomId);
        nextStrikePattern(state);
        queueRoomCombatEvent("room-enter", {
          room: nextRoom,
          encounter: { ...nextEncounter, pattern: [...nextEncounter.pattern], basePattern: [...nextEncounter.basePattern] },
          roomsCleared: state.roomsCleared
        });
        playSound("door");
        syncAudioDirector();
        setFeedback(`${nextRoom.name}接入：${nextRoom.briefing}`, "correct");
        pushEvent(`${previousRoom.name}清除，K-01 已接入${nextRoom.name}。`);
        return;
      }
      nextStrikePattern(state);
      return;
    }

    state.currentTarget = pattern[state.pathStep];
    return;
  }

  const wrongInfo = registerWrong(key, target);
  if (state.pathStep > 0 && !wrongInfo?.drifted && state.status !== "dead") {
    state.actionAttempts += 1;
    state.corruption = clamp(state.corruption + 4, 0, 100);
    triggerScene("arm-stuck");
    setFeedback(returnStep ? pick(FEEDBACK.returnHome) : state.feedback, state.feedbackType);
  }
  queueRoomCombatEvent(combatEventForSceneEvent(state.pathStep > 0 ? "arm-stuck" : "wrong-key"), {
    actual: key,
    target,
    pattern: [...pattern],
    stepBefore,
    returnStep,
    attackStep,
    drifted: Boolean(wrongInfo?.drifted),
    encounter: { ...encounter, pattern: [...encounter.pattern], basePattern: [...encounter.basePattern] },
    modifierId: encounter.modifier.id
  });
}

function registerCruiseCorrect(threat) {
  state.correctCount += 1;
  state.totalInputs += 1;
  state.combo += 1;
  state.consecutiveErrors = 0;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
  state.energy = clamp(state.energy + (threat.homePulse ? 4 : 3), 0, 100);
  state.shield = clamp(state.shield + (state.combo % 8 === 0 ? 5 : 1), 0, 100);
  state.corruption = clamp(state.corruption - 1, 0, 100);
  state.cruiseIntercepts += 1;
  state.cruiseFingerStats[threat.guideId] = (state.cruiseFingerStats[threat.guideId] || 0) + 1;
  state.cruiseHandStats[threat.side] = (state.cruiseHandStats[threat.side] || 0) + 1;
  if (threat.homePulse) state.cruiseAnchorPulses += 1;
  flashType = "ok";
  triggerScene("intercept");
  queueCruiseCombatEvent("intercept", {
    threat: { ...threat },
    combo: state.combo
  });
  playSound(threat.homePulse ? "base_lock" : "counter_fire", { gain: threat.homePulse ? 0.6 : 0.7 });
  if (state.combo > 0 && state.combo % 10 === 0) {
    playSound("wave_clear", { gain: 0.45 });
    pushEvent(`同步链 ${state.combo}：防线短暂稳压。`);
  }
  setFeedback(threat.homePulse ? `${formatKey(threat.key)} 基准稳压 / 拦截完成` : `${formatKey(threat.key)} 拦截成功 / ${threat.hand}${threat.finger}`, "correct");
}

function handleCruiseInput(key) {
  if (isCruiseIntroActive(state)) {
    setFeedback("防线接入中，倒数结束后开始第一串拦截", "neutral");
    return;
  }
  if (!state.threatStartedAt) {
    maybeBeginCruiseThreat(state);
  }
  const threat = getCurrentCruiseThreat();
  if (!threat || !state.threatStartedAt) return;
  if (key === threat.key) {
    registerCruiseCorrect(threat);
    advanceCruiseThreat("intercept");
    return;
  }

  applyCruiseDamage("wrong", threat, key);
}

function normalizeKey(event) {
  if (event.key === " " || event.key === "Spacebar") return "";
  if (event.key.length === 1) return event.key.toLowerCase();
  return "";
}

function handleKeydown(event) {
  if (view !== "playing" || !state) return;
  if (state.status === "dead") return;
  const key = normalizeKey(event);
  if (!key) {
    if (event.key === "Escape") stopToMenu();
    return;
  }

  event.preventDefault();
  wakeMusicIfNeeded();
  if (state.roomTransition && completeRoomTransitionIfReady()) return;
  if (state.inputLockedUntil && Date.now() < state.inputLockedUntil) {
    const missionDone = state.level.mode === "strike" && state.completedActions >= state.level.targetActions;
    setFeedback(state.level.mode === "cruise" ? "巡航防线接入中，先看中央目标串" : missionDone ? "核心离线，任务报告生成中" : "K-01 正在接入下一目标", "neutral");
    if (isRoomCombatLive()) {
      updateLiveCombatHud();
      refreshLiveCombatSurface();
    } else if (isCruiseCombatLive()) {
      updateLiveCruiseHud();
      refreshLiveCruiseSurface();
    } else {
      render();
    }
    return;
  }
  pressedKey = key;
  state.lastEventAt = Date.now();

  if (state.status === "prelock") {
    handlePrelock(key);
  } else if (state.status === "finger-calibration") {
    handleStrikeCalibrationInput(key);
  } else if (state.level.mode === "home") {
    handleHomeInput(key);
  } else if (state.level.mode === "cruise") {
    handleCruiseInput(key);
  } else {
    handleStrikeInput(key);
  }

  if (isRoomCombatLive()) {
    updateLiveCombatHud();
    refreshLiveCombatSurface();
  } else if (isCruiseCombatLive()) {
    updateLiveCruiseHud();
    refreshLiveCruiseSurface();
  } else {
    render();
  }
  if (state?.pendingDeath) {
    scheduleDeathFinish();
    return;
  }
  const effectNonce = state?.sceneNonce || 0;
  const effectDuration = state?.sceneEvent === "room-change" ? 680 : 320;
  window.setTimeout(() => {
    pressedKey = "";
    flashType = "";
    shellShake = false;
    if (state && state.sceneNonce === effectNonce) {
      state.sceneEvent = "idle";
    }
    render();
  }, effectDuration);
}

function render(forceFull = false) {
  if (!forceFull && isRoomCombatLive() && document.querySelector("#strike-phaser-stage canvas")) {
    updateLiveCombatHud();
    refreshLiveCombatSurface();
    shellShake = false;
    return;
  }
  if (!forceFull && isCruiseCombatLive() && document.querySelector("#cruise-phaser-stage canvas")) {
    updateLiveCruiseHud();
    refreshLiveCruiseSurface();
    shellShake = false;
    return;
  }
  if (!forceFull && isHomePhaserLive()) {
    updateLiveHomeHud();
    refreshLiveHomeSurface();
    shellShake = false;
    return;
  }
  const activePlay = isActivePlay();
  const lowHull = isHullAlertVisible();
  const criticalHull = lowHull && state?.hullAlertLevel === "critical";
  destroyPhaserScene();
  app.innerHTML = `
    <div class="app-shell ${activePlay && shellShake ? "shake" : ""} ${activePlay && state?.feedbackType === "error" ? "alarm" : ""} ${activePlay && state?.feedbackType === "drift" ? "drift-alarm" : ""} ${activePlay && state?.feedbackType === "critical" ? "critical-alarm" : ""} ${lowHull ? "low-health-alarm" : ""} ${criticalHull ? "critical-hull-alarm" : ""} ${activePlay && state?.feedbackType === "death" ? "death-alarm" : ""} scene-${activePlay ? state?.sceneEvent || "idle" : "idle"}" style="--lane-shift: ${activePlay && state?.feedbackType === "drift" ? "-28px" : "0"};">
      ${renderTopbar()}
      <main class="screen">
        ${view === "menu" ? renderMenu() : ""}
        ${view === "playing" ? renderPlaying() : ""}
        ${view === "result" ? renderResult() : ""}
      </main>
    </div>
  `;
  syncSceneCanvasLoop();
  syncPhaserScene();
  syncAudioDirector();
  bootDesktopAudioIfNeeded();
}

function syncSceneCanvasLoop() {
  if (view === "playing" && state && document.querySelector(".scene-canvas")) {
    if (!sceneCanvasRaf) sceneCanvasRaf = requestAnimationFrame(drawSceneCanvasFrame);
    return;
  }

  if (sceneCanvasRaf) {
    cancelAnimationFrame(sceneCanvasRaf);
    sceneCanvasRaf = null;
  }
}

function destroyPhaserScene() {
  if (!phaserGame) return;
  phaserGame.destroy(true);
  phaserGame = null;
  window.__KEY_PILOT_PHASER__ = null;
}

function isHomePhaserLive() {
  return view === "playing"
    && state?.level?.mode === "home"
    && state.status === "playing"
    && Boolean(document.querySelector(".home-scene #home-phaser-stage canvas"));
}

function updateAppShellState() {
  const shell = document.querySelector(".app-shell");
  if (!shell) return;
  const activePlay = isActivePlay();
  const lowHull = isHullAlertVisible();
  const criticalHull = lowHull && state?.hullAlertLevel === "critical";
  shell.className = `app-shell ${activePlay && shellShake ? "shake" : ""} ${activePlay && state?.feedbackType === "error" ? "alarm" : ""} ${activePlay && state?.feedbackType === "drift" ? "drift-alarm" : ""} ${activePlay && state?.feedbackType === "critical" ? "critical-alarm" : ""} ${lowHull ? "low-health-alarm" : ""} ${criticalHull ? "critical-hull-alarm" : ""} ${activePlay && state?.feedbackType === "death" ? "death-alarm" : ""} scene-${activePlay ? state?.sceneEvent || "idle" : "idle"}`;
  shell.style.setProperty("--lane-shift", activePlay && state?.feedbackType === "drift" ? "-28px" : "0");
}

function updateLiveHomeHud() {
  if (!state || state.level.mode !== "home") return;
  syncAudioDirector();
  updateAppShellState();
  const setHudValue = (label, value) => {
    const node = document.querySelector(`[data-hud="${label}"] .hud-value`);
    if (node) node.textContent = value;
  };
  setHudValue("任务", `${state.completedTargets}/${state.level.targetCount}`);
  setHudValue("倒计时", `${state.timeLeft}s`);
  setHudValue("连击", state.combo);
  setHudValue("准确率", `${calculateAccuracy(state)}%`);
  setHudValue("状态", getComboRank());
  const feedbackNode = document.querySelector(".target-stage .feedback-message");
  if (feedbackNode) {
    feedbackNode.className = `feedback-message ${state.feedbackType}`;
    feedbackNode.textContent = state.feedback;
  }
  const tag = document.querySelector(".phaser-home-tag span");
  if (tag) tag.textContent = `预检 ${state.completedTargets}/${state.level.targetCount} / 偏移 ${state.homeDriftCount}`;
  const sequence = document.querySelector(".phase-line .sequence");
  if (sequence) {
    const target = formatKey(state.currentTarget);
    sequence.innerHTML = target ? `<span class="seq-key current">${target}</span>` : "";
  }
  const vitals = document.querySelector(".feedback-strip .vitals");
  if (vitals) vitals.outerHTML = renderVitals();
  const keyboard = document.querySelector(".keyboard-panel");
  if (keyboard) keyboard.outerHTML = renderKeyboardPanel();
}

function refreshLiveHomeSurface() {
  if (!isHomePhaserLive()) return;
  const stage = document.querySelector("#home-phaser-stage");
  if (!stage || !window.Phaser) return;
  const rect = stage.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || stage.clientWidth || 900));
  const height = Math.max(1, Math.round(rect.height || stage.clientHeight || 460));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const snapshot = getHomeSceneSnapshot(width, height, pixelRatio);
  const scene = phaserGame?.scene?.scenes?.[0];
  if (scene?.updateSnapshot && scene.__keyPilotMode === "home") {
    scene.updateSnapshot(snapshot);
    return;
  }
  syncPhaserScene();
}

function syncPhaserScene() {
  const stage = document.querySelector("#strike-phaser-stage") || document.querySelector("#cruise-phaser-stage") || document.querySelector("#home-phaser-stage");
  if (!stage || view !== "playing" || !state) {
    destroyPhaserScene();
    return;
  }

  if (!window.Phaser) {
    stage.innerHTML = `<div class="phaser-fallback">场景引擎未加载，请确认 vendor/phaser.min.js 在同一文件夹。</div>`;
    return;
  }

  const rect = stage.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width || stage.clientWidth || 900));
  const height = Math.max(1, Math.round(rect.height || stage.clientHeight || 460));
  const isStrike = stage.id === "strike-phaser-stage";
  const PhaserEngine = window.Phaser;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const renderWidth = Math.round(width * pixelRatio);
  const renderHeight = Math.round(height * pixelRatio);
  const isCruise = stage.id === "cruise-phaser-stage";
  const snapshot = isCruise ? getCruiseSceneSnapshot(width, height, pixelRatio) : isStrike ? getStrikeSceneSnapshot(width, height, pixelRatio) : getHomeSceneSnapshot(width, height, pixelRatio);
  const useRoomCombatScene = isStrike && state.level.mode === "strike" && state.status === "playing" && window.RoomCombatScene;
  const useCruiseScene = isCruise && state.level.mode === "cruise" && state.status === "playing" && window.CruiseDefenseScene;
  if (!useRoomCombatScene && !useCruiseScene && stage.querySelector("canvas")) {
    const liveScene = phaserGame?.scene?.scenes?.[0];
    if (liveScene?.updateSnapshot && liveScene.__keyPilotMode === (isCruise ? "cruise" : isStrike ? "strike" : "home")) {
      liveScene.updateSnapshot(snapshot);
      return;
    }
  }
  if (useRoomCombatScene) {
    window.__KEY_PILOT_ROOM_SNAPSHOT__ = snapshot;
    const liveScene = phaserGame?.scene?.keys?.RoomCombatScene;
    if (liveScene?.updateSnapshot && stage.querySelector("canvas")) {
      liveScene.updateSnapshot(snapshot);
      if (liveScene.applyCombatEvent) {
        const eventQueue = Array.isArray(window.__KEY_PILOT_ROOM_EVENT_QUEUE__) ? window.__KEY_PILOT_ROOM_EVENT_QUEUE__ : [];
        eventQueue.forEach((event) => liveScene.applyCombatEvent(event));
        window.__KEY_PILOT_ROOM_EVENT_QUEUE__ = [];
        if (!eventQueue.length && window.__KEY_PILOT_ROOM_EVENT__) {
          liveScene.applyCombatEvent(window.__KEY_PILOT_ROOM_EVENT__);
        }
      }
      return;
    }
  }
  if (useCruiseScene) {
    window.__KEY_PILOT_CRUISE_SNAPSHOT__ = snapshot;
    const liveScene = phaserGame?.scene?.keys?.CruiseDefenseScene;
    if (liveScene?.updateSnapshot && stage.querySelector("canvas")) {
      liveScene.updateSnapshot(snapshot);
      if (liveScene.applyCruiseEvent) {
        const eventQueue = Array.isArray(window.__KEY_PILOT_CRUISE_EVENT_QUEUE__) ? window.__KEY_PILOT_CRUISE_EVENT_QUEUE__ : [];
        eventQueue.forEach((event) => liveScene.applyCruiseEvent(event));
        window.__KEY_PILOT_CRUISE_EVENT_QUEUE__ = [];
        if (!eventQueue.length && window.__KEY_PILOT_CRUISE_EVENT__) {
          liveScene.applyCruiseEvent(window.__KEY_PILOT_CRUISE_EVENT__);
        }
      }
      return;
    }
  }
  destroyPhaserScene();
  stage.innerHTML = "";
  const SceneClass = class extends PhaserEngine.Scene {
    preload() {
      if (isStrike) return;
      const background = getSceneBackground("preflightChamber");
      if (background && !this.textures.exists(HOME_SCENE_BG_KEY)) {
        this.load.image(HOME_SCENE_BG_KEY, background);
      }
      const k01 = getK01ConceptImage();
      if (k01 && !this.textures.exists(HOME_K01_TEXTURE_KEY)) {
        this.load.image(HOME_K01_TEXTURE_KEY, k01);
      }
    }

    create() {
      this.cameras.main.setZoom(pixelRatio);
      this.cameras.main.centerOn(width / 2, height / 2);
      this.__keyPilotMode = isCruise ? "cruise" : isStrike ? "strike" : "home";
      this.updateSnapshot = (nextSnapshot) => {
        this.children.removeAll(true);
        this.tweens.killAll();
        if (isCruise && window.CruiseDefenseScene) return;
        if (isStrike) renderStrikePhaserWorld(this, nextSnapshot);
        else renderHomePhaserWorld(this, nextSnapshot);
      };
      this.updateSnapshot(snapshot);
    }
  };

  phaserGame = new PhaserEngine.Game({
    type: PhaserEngine.CANVAS,
    parent: stage,
    width: renderWidth,
    height: renderHeight,
    backgroundColor: snapshot.palette.bg,
    audio: { noAudio: true },
    render: { antialias: true, pixelArt: false, roundPixels: true },
    scale: {
      mode: PhaserEngine.Scale.NONE
    },
    scene: useCruiseScene ? window.CruiseDefenseScene : useRoomCombatScene ? window.RoomCombatScene : SceneClass
  });
  window.__KEY_PILOT_PHASER__ = phaserGame;
}

function getHomeSceneSnapshot(width, height, pixelRatio = 1) {
  return sceneSnapshots.getHomeSceneSnapshot(width, height, pixelRatio);
}

function getHomePhaserPalette() {
  return sceneSnapshots.getHomePhaserPalette();
}

function getAssetManifest() {
  return sceneSnapshots.getAssetManifest();
}

function getSceneBackground(sceneId) {
  return sceneSnapshots.getSceneBackground(sceneId);
}

function getK01ConceptImage() {
  return sceneSnapshots.getK01ConceptImage();
}

function getMonsterPreviewImage(nameOrId = "driftZombie") {
  return sceneSnapshots.getMonsterPreviewImage(nameOrId);
}

function phaserTextStyle(style, pixelRatio = window.devicePixelRatio || 1) {
  return {
    resolution: Math.min(pixelRatio || 1, 2),
    ...style
  };
}

function sceneBackgroundStyle(sceneId) {
  const background = getSceneBackground(sceneId);
  if (background.startsWith("data:")) return "";
  return background ? `--scene-bg: url('${background}')` : "";
}

function sceneImageMarkup(sceneId, className = "") {
  const background = getSceneBackground(sceneId);
  if (!background) return "";
  return `<img class="scene-bg-img ${className}" src="${background}" alt="" aria-hidden="true" decoding="async" />`;
}

function imageMarkup(src, className = "") {
  if (!src) return "";
  return `<img class="${className}" src="${src}" alt="" aria-hidden="true" decoding="async" />`;
}

function renderHomePhaserWorld(scene, snapshot) {
  const { width, height } = snapshot;
  scene.cameras.main.setBackgroundColor(snapshot.palette.bg);
  drawHomeHangar(scene, snapshot);
  drawPhaserWaveMarkers(scene, snapshot);
  const robotX = snapshot.status === "prelock" ? width * 0.5 : width * 0.48;
  const robotY = snapshot.status === "prelock" ? height * 0.58 : height * 0.52;
  const robot = drawPhaserRobot(scene, robotX, robotY, snapshot);
  const stations = drawHomeStationsPhaser(scene, snapshot);
  drawHomeAnchorSystem(scene, snapshot, robotX, robotY, stations);
  drawHomeResidualThreat(scene, snapshot);
  runHomePhaserEvent(scene, snapshot, { robot, stations, robotX, robotY });
  drawHomeTargetBeacon(scene, snapshot);
}

function drawHomeHangar(scene, snapshot) {
  const { width, height, palette, corruption } = snapshot;
  const hasApprovedBackground = scene.textures.exists(HOME_SCENE_BG_KEY);
  if (hasApprovedBackground) {
    const background = scene.add.image(width * 0.5, height * 0.5, HOME_SCENE_BG_KEY).setDepth(0);
    const coverScale = Math.max(width / background.width, height / background.height);
    background.setScale(coverScale).setAlpha(0.94);
  }

  const g = scene.add.graphics().setDepth(1);
  if (!hasApprovedBackground) {
    g.fillStyle(palette.wall, 1);
    g.fillRect(0, 0, width, height);
  } else {
    g.fillStyle(0x02070c, 0.32);
    g.fillRect(0, 0, width, height);
  }
  g.fillStyle(palette.fog, hasApprovedBackground ? 0.2 + corruption * 0.12 : 0.36 + corruption * 0.18);
  g.fillEllipse(width * 0.5, height * 0.5, width * 0.72, height * 0.72);

  g.fillStyle(0x020608, hasApprovedBackground ? 0.34 : 0.6);
  g.fillRoundedRect(width * 0.34, height * 0.16, width * 0.32, height * 0.52, 8);
  g.lineStyle(4, palette.accent, hasApprovedBackground ? snapshot.leftLocked && snapshot.rightLocked ? 0.34 : 0.14 : snapshot.leftLocked && snapshot.rightLocked ? 0.5 : 0.22);
  g.strokeRoundedRect(width * 0.34, height * 0.16, width * 0.32, height * 0.52, 8);

  const doorGap = snapshot.leftLocked && snapshot.rightLocked ? width * 0.06 : 0;
  g.fillStyle(0x071820, hasApprovedBackground ? 0.3 : 0.92);
  g.fillRoundedRect(width * 0.36 - doorGap, height * 0.18, width * 0.13, height * 0.48, 4);
  g.fillRoundedRect(width * 0.51 + doorGap, height * 0.18, width * 0.13, height * 0.48, 4);
  g.fillStyle(palette.accentSoft, hasApprovedBackground ? 0.08 : 0.13);
  g.fillRoundedRect(width * 0.41 - doorGap, height * 0.23, width * 0.025, height * 0.36, 4);
  g.fillRoundedRect(width * 0.57 + doorGap, height * 0.23, width * 0.025, height * 0.36, 4);

  g.fillStyle(palette.danger, hasApprovedBackground ? 0.11 + corruption * 0.12 : 0.22 + corruption * 0.18);
  g.fillRect(0, 0, width * 0.085, height);
  g.lineStyle(3, palette.danger, hasApprovedBackground ? 0.26 + corruption * 0.18 : 0.5 + corruption * 0.24);
  g.beginPath();
  g.moveTo(width * 0.085, 0);
  g.lineTo(width * 0.085, height);
  g.strokePath();
  scene.add.text(width * 0.042, height * 0.72, "旧位左墙", phaserTextStyle({
    fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "15px",
    color: "#ffaaa6"
  })).setOrigin(0.5).setRotation(-Math.PI / 2).setDepth(5).setAlpha(hasApprovedBackground ? 0.34 : 0.72);

  if (!hasApprovedBackground) drawPhaserFloor(scene, snapshot);
  scene.add.text(width * 0.5, height * 0.14, snapshot.status === "prelock" ? "开舱锁定" : "中排神经底座", phaserTextStyle({
    fontFamily: "PingFang SC, system-ui, sans-serif",
    fontSize: "42px",
    fontStyle: "900",
    color: palette.label
  })).setOrigin(0.5).setDepth(4).setAlpha(hasApprovedBackground ? 0.08 : 0.12);

  const progress = snapshot.targetCount ? snapshot.completedTargets / snapshot.targetCount : 0;
  g.fillStyle(palette.green, 0.16);
  g.fillRoundedRect(width * 0.2, height * 0.87, width * 0.6, 10, 5);
  g.fillStyle(palette.green, 0.72);
  g.fillRoundedRect(width * 0.2, height * 0.87, width * 0.6 * progress, 10, 5);
}

function drawHomeStationsPhaser(scene, snapshot) {
  const { width, height, palette } = snapshot;
  const stations = {};
  if (snapshot.status === "prelock") return stations;
  const stationY = height * 0.74;
  const leftStartX = width * 0.18;
  const rightStartX = width * 0.55;
  const handGap = width * 0.09;
  HOME_KEYS.forEach((key, index) => {
    const localIndex = index < 4 ? index : index - 4;
    const x = (index < 4 ? leftStartX : rightStartX) + handGap * localIndex;
    const y = stationY;
    const charged = Boolean(snapshot.chargedKeys[key]);
    const active = snapshot.currentTarget === key && snapshot.status !== "prelock";
    const anchor = key === "f" || key === "j";
    const displayKey = formatKey(key);
    const boxW = anchor ? 58 : 48;
    const boxH = anchor ? 54 : 46;
    const depth = active ? 34 : 24;
    const g = scene.add.graphics().setDepth(depth);
    const fillColor = active ? palette.secondary : charged ? 0x17492f : anchor ? 0x11222b : 0x071014;
    const fillAlpha = active ? 1 : charged ? 0.58 : anchor ? 0.32 : 0.68;
    g.fillStyle(fillColor, fillAlpha);
    g.fillRoundedRect(x - boxW / 2, y - boxH / 2, boxW, boxH, 5);
    g.lineStyle(2, active ? 0xfff2a8 : charged ? palette.green : anchor ? palette.accentSoft : palette.accentSoft, active ? 1 : charged ? 0.42 : anchor ? 0.32 : 0.26);
    g.strokeRoundedRect(x - boxW / 2, y - boxH / 2, boxW, boxH, 5);
    scene.add.text(x, y - 2, displayKey, phaserTextStyle({
      fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: active ? "30px" : anchor ? "25px" : "20px",
      fontStyle: "900",
      color: active ? "#07100f" : charged ? "#a8ffd0" : anchor ? "#96c6d3" : "#a9d9e8"
    })).setOrigin(0.5).setDepth(depth + 2).setAlpha(displayKey ? 1 : 0);
    scene.add.text(x, y + boxH / 2 + 14, active ? "现在按" : charged ? "亮起" : anchor ? "主锚" : "底座", phaserTextStyle({
      fontFamily: "PingFang SC, system-ui, sans-serif",
      fontSize: "12px",
      color: active ? "#fff1b8" : charged ? "#b8ffd5" : "#7fa4b0"
    })).setOrigin(0.5).setDepth(depth + 1).setAlpha(active ? 0.86 : charged ? 0.58 : 0.42);
    stations[key] = { x, y, active, charged, anchor };
  });
  return stations;
}

function drawHomeAnchorSystem(scene, snapshot, robotX, robotY, stations) {
  const { width, height, palette } = snapshot;
  const g = scene.add.graphics().setDepth(18);
  const left = { x: width * 0.23, y: height * 0.32 };
  const right = { x: width * 0.77, y: height * 0.32 };
  const anchors = [
    { ...left, key: "F", locked: snapshot.leftLocked, label: "左主锚" },
    { ...right, key: "J", locked: snapshot.rightLocked, label: "右主锚" }
  ];

  anchors.forEach((anchor) => {
    const key = anchor.key.toLowerCase();
    const activeAnchor = snapshot.currentTarget === key;
    const prelockMode = snapshot.status === "prelock";
    const lineAlpha = prelockMode
      ? anchor.locked ? 0.72 : 0.2
      : activeAnchor ? 0.58 : 0.14;
    g.lineStyle(4, anchor.locked ? palette.green : palette.accentSoft, lineAlpha);
    g.beginPath();
    g.moveTo(anchor.x, anchor.y);
    g.lineTo(robotX, robotY - 40);
    g.strokePath();
    if (prelockMode) {
      drawPhaserKeyPad(scene, anchor.x, anchor.y, key, "", anchor.locked || activeAnchor, snapshot, 28);
    } else {
      g.lineStyle(2, activeAnchor ? palette.secondary : palette.accentSoft, activeAnchor ? 0.42 : 0.18);
      g.strokeRoundedRect(anchor.x - 28, anchor.y - 22, 56, 44, 5);
      scene.add.text(anchor.x, anchor.y - 1, anchor.key, phaserTextStyle({
        fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: "20px",
        fontStyle: "900",
        color: activeAnchor ? "#ffe28a" : "#8fb5c0"
      })).setOrigin(0.5).setDepth(29).setAlpha(activeAnchor ? 0.62 : 0.32);
      scene.add.text(anchor.x, anchor.y + 32, "锚点在线", phaserTextStyle({
        fontFamily: "PingFang SC, system-ui, sans-serif",
        fontSize: "11px",
        color: "#7fa4b0"
      })).setOrigin(0.5).setDepth(29).setAlpha(activeAnchor ? 0.44 : 0.28);
    }
  });

  if (snapshot.status === "playing" && stations[snapshot.currentTarget]) {
    const station = stations[snapshot.currentTarget];
    drawPhaserBeam(scene, { x: station.x, y: station.y }, { x: robotX, y: robotY + 10 }, palette.secondary, 0.42, 5, 19);
  }
}

function drawHomeTargetBeacon(scene, snapshot) {
  const target = formatKey(snapshot.currentTarget);
  if (!target) return;
  const { width, height, palette } = snapshot;
  const x = width * 0.5;
  const y = snapshot.status === "prelock" ? height * 0.22 : height * 0.2;
  const caption = snapshot.status === "prelock"
    ? target === "F" ? "按 F 锁定左手主锚" : "按 J 锁定右手主锚"
    : `现在按 ${target}`;
  const g = scene.add.graphics().setDepth(74);
  g.fillStyle(0x02070c, 0.88);
  g.fillRoundedRect(x - 132, y - 44, 264, 88, 9);
  g.lineStyle(3, palette.secondary, 0.92);
  g.strokeRoundedRect(x - 132, y - 44, 264, 88, 9);
  g.fillStyle(0xffd66e, 1);
  g.fillRoundedRect(x - 34, y - 34, 68, 68, 8);
  g.lineStyle(2, 0xfff3bd, 1);
  g.strokeRoundedRect(x - 34, y - 34, 68, 68, 8);
  scene.add.text(x, y - 1, target, phaserTextStyle({
    fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "42px",
    fontStyle: "900",
    color: "#07100f"
  })).setOrigin(0.5).setDepth(76);
  scene.add.text(x, y + 56, caption, phaserTextStyle({
    fontFamily: "PingFang SC, system-ui, sans-serif",
    fontSize: "15px",
    fontStyle: "800",
    color: "#fff2bc"
  })).setOrigin(0.5).setDepth(76);
}

function drawHomeResidualThreat(scene, snapshot) {
  const { width, height, palette, corruption } = snapshot;
  const g = scene.add.graphics().setDepth(12);
  const alpha = 0.18 + corruption * 0.32;
  g.fillStyle(palette.danger, alpha);
  g.fillEllipse(width * 0.11, height * 0.5, 118 + corruption * 80, 160 + corruption * 80);
  g.lineStyle(3, palette.danger, 0.3 + corruption * 0.36);
  g.strokeEllipse(width * 0.11, height * 0.5, 128 + corruption * 90, 170 + corruption * 90);
  g.fillStyle(0xffd66e, 0.7);
  g.fillRect(width * 0.085, height * 0.47, 12, 14);
  g.fillRect(width * 0.125, height * 0.47, 12, 14);
  scene.add.text(width * 0.12, height * 0.62, "偏左残影", phaserTextStyle({
    fontFamily: "PingFang SC, system-ui, sans-serif",
    fontSize: "14px",
    fontStyle: "800",
    color: "#ffd3d1",
    backgroundColor: "rgba(35,6,8,0.58)",
    padding: { x: 7, y: 3 }
  })).setOrigin(0.5).setDepth(13).setAlpha(0.76);
}

function runHomePhaserEvent(scene, snapshot, refs) {
  const { width, height, event, palette, reducedMotion } = snapshot;
  const activeStation = refs.stations[snapshot.currentTarget];
  if (event === "boot") {
    const x = snapshot.currentTarget === "j" ? width * 0.77 : width * 0.23;
    const y = height * 0.32;
    drawPhaserPulse(scene, x, y, palette.green, 0.72, 46, 92, reducedMotion);
  }
  if (event === "launch") {
    const gate = scene.add.rectangle(width * 0.5, height * 0.42, width * 0.32, height * 0.52, palette.green, 0.12).setDepth(45);
    if (!reducedMotion) {
      scene.tweens.add({ targets: gate, alpha: 0, scaleX: 1.18, scaleY: 1.12, duration: 420, ease: "Cubic.easeOut" });
    }
  }
  if ((event === "charge" || event === "hit") && activeStation) {
    drawPhaserPulse(scene, activeStation.x, activeStation.y, palette.secondary, 0.82, 38, 86, reducedMotion);
  }
  if (event === "crash" || event === "drift") {
    const flash = scene.add.rectangle(width * 0.07, height * 0.5, width * 0.16, height, palette.danger, event === "drift" ? 0.34 : 0.22).setDepth(50);
    drawPhaserPulse(scene, width * 0.1, height * 0.5, palette.danger, 0.72, 70, 180, reducedMotion);
    if (!reducedMotion) {
      scene.cameras.main.shake(event === "drift" ? 260 : 180, event === "drift" ? 0.016 : 0.009);
      scene.tweens.add({ targets: flash, alpha: 0, duration: 320, ease: "Cubic.easeOut" });
      scene.tweens.add({ targets: refs.robot, x: refs.robotX - 32, duration: 120, yoyo: true, ease: "Cubic.easeOut" });
    }
  }
}

function drawPhaserPulse(scene, x, y, color, alpha, startRadius, endRadius, reducedMotion) {
  const pulse = scene.add.circle(x, y, startRadius, color, 0).setStrokeStyle(5, color, alpha).setDepth(60);
  if (!reducedMotion) {
    scene.tweens.add({ targets: pulse, radius: endRadius, alpha: 0, duration: 360, ease: "Cubic.easeOut" });
  } else {
    pulse.setAlpha(0.2);
  }
}

function getStrikeSceneSnapshot(width, height, pixelRatio = 1) {
  return sceneSnapshots.getStrikeSceneSnapshot(width, height, pixelRatio);
}

function getCruiseSceneSnapshot(width, height, pixelRatio = 1) {
  return sceneSnapshots.getCruiseSceneSnapshot(width, height, pixelRatio);
}

function getCruisePhaserPalette() {
  return sceneSnapshots.getCruisePhaserPalette();
}

function getStrikePhaserPalette(roomId) {
  return sceneSnapshots.getStrikePhaserPalette(roomId);
}

function renderStrikePhaserWorld(scene, snapshot) {
  const { width, height } = snapshot;
  scene.cameras.main.setBackgroundColor(snapshot.palette.bg);
  drawPhaserRoom(scene, snapshot);
  drawPhaserWaveMarkers(scene, snapshot);
  const route = getPhaserRoutePoints(snapshot);
  drawPhaserRoute(scene, snapshot, route);
  const robot = drawPhaserRobot(scene, route.base.x, route.base.y, snapshot);
  const monster = drawPhaserMonster(scene, route.target.x, route.target.y, snapshot);
  const visiblePads = getVisibleStrikePadKeys(snapshot.pattern, snapshot.pathStep);
  drawPhaserKeyPad(scene, route.base.x, route.base.y + 72, visiblePads.base, "基地", snapshot.pathStep === 0, snapshot, 30);
  drawPhaserKeyPad(scene, route.target.x, route.target.y - 88, visiblePads.attack, getEncounterRuleLabel(snapshot.encounter), visiblePads.attackActive, snapshot, 31);
  drawPhaserKeyPad(scene, route.return.x, route.return.y, visiblePads.returnHome, "回收点", visiblePads.returnActive, snapshot, 30);
  drawPhaserPressure(scene, snapshot);
  drawPhaserBreachDamage(scene, snapshot);
  runStrikePhaserEvent(scene, snapshot, { robot, monster, route });

  scene.add.rectangle(width / 2, height - 8, width, 16, snapshot.palette.accent, 0.08).setDepth(1);
}

function getPhaserRoutePoints(snapshot) {
  const { width, height, encounter, pressure } = snapshot;
  const laneY = encounter.lane === "high" ? height * 0.39 : encounter.lane === "low" ? height * 0.66 : height * 0.53;
  return {
    base: { x: width * 0.17, y: height * 0.68 },
    target: { x: width * (0.82 - pressure * 0.24), y: laneY },
    return: { x: width * 0.82, y: height * 0.76 }
  };
}

function drawPhaserRoom(scene, snapshot) {
  const { width, height, room, palette, pressure, corruption } = snapshot;
  const g = scene.add.graphics().setDepth(0);
  g.fillStyle(palette.wall, 1);
  g.fillRect(0, 0, width, height);
  g.fillStyle(palette.fog, 0.38 + corruption * 0.22);
  g.fillEllipse(width * 0.54, height * 0.55, width * 0.72, height * 0.72);
  drawPhaserFloor(scene, snapshot);

  if (room.id === "gate") drawPhaserGateRoom(scene, snapshot);
  if (room.id === "pipe") drawPhaserPipeRoom(scene, snapshot);
  if (room.id === "nest") drawPhaserNestRoom(scene, snapshot);
  if (room.id === "core") drawPhaserCoreRoom(scene, snapshot);

  const title = scene.add.text(width * 0.56, height * 0.18, room.name, phaserTextStyle({
    fontFamily: "PingFang SC, system-ui, sans-serif",
    fontSize: "44px",
    fontStyle: "800",
    color: palette.label
  })).setOrigin(0.5).setDepth(4);
  title.setAlpha(0.12);

  const threat = scene.add.text(width * 0.56, height * 0.18 + 44, `${snapshot.encounter.monster} / ${snapshot.encounter.modifier.label}`, phaserTextStyle({
    fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "14px",
    color: pressure > 0.72 ? "#ffb1ac" : "#8fb1bd"
  })).setOrigin(0.5).setDepth(4);
  threat.setAlpha(0.22);
}

function drawPhaserFloor(scene, snapshot) {
  const { width, height, palette } = snapshot;
  const g = scene.add.graphics().setDepth(2);
  g.fillStyle(palette.floor, 0.82);
  g.beginPath();
  g.moveTo(width * 0.08, height * 0.83);
  g.lineTo(width * 0.92, height * 0.83);
  g.lineTo(width, height);
  g.lineTo(0, height);
  g.closePath();
  g.fillPath();
  g.lineStyle(2, palette.accent, 0.24);
  for (let index = 0; index < 7; index += 1) {
    const y = height * (0.84 + index * 0.026);
    g.beginPath();
    g.moveTo(width * (0.08 - index * 0.022), y);
    g.lineTo(width * (0.92 + index * 0.022), y);
    g.strokePath();
  }
  g.lineStyle(3, palette.secondary, 0.3);
  g.beginPath();
  g.moveTo(width * 0.22, height * 0.84);
  g.lineTo(width * 0.5, height * 0.98);
  g.moveTo(width * 0.78, height * 0.84);
  g.lineTo(width * 0.5, height * 0.98);
  g.strokePath();
}

function drawPhaserGateRoom(scene, snapshot) {
  const { width, height, palette, pressure } = snapshot;
  const g = scene.add.graphics().setDepth(3);
  g.fillStyle(0x071b22, 0.94);
  g.fillRoundedRect(width * 0.52, height * 0.19, width * 0.36, height * 0.58, 4);
  g.lineStyle(4, palette.accent, 0.32 + pressure * 0.22);
  g.strokeRoundedRect(width * 0.52, height * 0.19, width * 0.36, height * 0.58, 4);
  g.fillStyle(0x020608, 0.82);
  g.fillRect(width * 0.66, height * 0.2, width * 0.08, height * 0.56);
  [0.56, 0.79].forEach((x) => {
    g.fillStyle(palette.accent, 0.08);
    g.fillRect(width * x, height * 0.23, width * 0.06, height * 0.5);
  });
  g.fillStyle(palette.secondary, 0.28);
  for (let index = 0; index < 3; index += 1) {
    g.fillRoundedRect(width * 0.28, height * (0.82 + index * 0.035), width * 0.52, 5, 4);
  }
  g.fillStyle(palette.accentSoft, 0.16);
  g.fillRoundedRect(width * 0.46, height * 0.25, width * 0.035, height * 0.46, 4);
  g.fillRoundedRect(width * 0.73, height * 0.25, width * 0.035, height * 0.46, 4);
}

function drawPhaserPipeRoom(scene, snapshot) {
  const { width, height, palette } = snapshot;
  const g = scene.add.graphics().setDepth(3);
  [0.19, 0.32, 0.72].forEach((y, index) => {
    g.lineStyle(index === 2 ? 18 : 22, palette.accent, index === 2 ? 0.26 : 0.34);
    g.beginPath();
    g.moveTo(width * -0.04, height * y);
    g.lineTo(width * 0.22, height * (y + 0.02));
    g.lineTo(width * 0.54, height * (y - 0.03));
    g.lineTo(width * 1.04, height * (y + 0.01));
    g.strokePath();
  });
  g.fillStyle(palette.accent, 0.18);
  g.fillRoundedRect(width * 0.17, height * 0.79, width * 0.62, height * 0.055, 14);
  g.fillStyle(0x9bffd1, 0.38);
  for (let index = 0; index < 7; index += 1) {
    g.fillCircle(width * (0.2 + index * 0.08), height * (0.78 - (index % 2) * 0.025), 5 + (index % 3));
  }
  scene.add.text(width * 0.55, height * 0.24, "腐蚀管道", phaserTextStyle({
    fontFamily: "PingFang SC, system-ui, sans-serif",
    fontSize: "42px",
    color: "#62ff9d"
  })).setAlpha(0.13).setDepth(4);
}

function drawPhaserNestRoom(scene, snapshot) {
  const { width, height, palette, pressure } = snapshot;
  const g = scene.add.graphics().setDepth(3);
  g.fillStyle(0x3a1017, 0.86);
  g.beginPath();
  g.moveTo(width * 0.78, height * 0.08);
  g.lineTo(width, 0);
  g.lineTo(width, height);
  g.lineTo(width * 0.76, height * 0.84);
  g.lineTo(width * 0.86, height * 0.56);
  g.lineTo(width * 0.75, height * 0.33);
  g.closePath();
  g.fillPath();
  g.lineStyle(6, palette.accent, 0.28 + pressure * 0.18);
  for (let index = 0; index < 7; index += 1) {
    const y = height * (0.17 + index * 0.1);
    g.beginPath();
    g.moveTo(width * 0.96, y);
    g.lineTo(width * (0.76 + (index % 2) * 0.04), y + 36);
    g.strokePath();
  }
  [0.3, 0.48, 0.66].forEach((y, index) => {
    g.fillStyle(palette.accentSoft, 0.16 + index * 0.04);
    g.fillEllipse(width * (0.83 + index * 0.04), height * y, 48, 66);
    g.lineStyle(2, palette.accent, 0.34);
    g.strokeEllipse(width * (0.83 + index * 0.04), height * y, 48, 66);
  });
}

function drawPhaserCoreRoom(scene, snapshot) {
  const { width, height, palette, pressure } = snapshot;
  const cx = width * 0.68;
  const cy = height * 0.46;
  const g = scene.add.graphics().setDepth(3);
  g.lineStyle(3, palette.accent, 0.38 + pressure * 0.28);
  for (let index = 0; index < 4; index += 1) {
    g.strokeCircle(cx, cy, 64 + index * 42);
  }
  g.fillStyle(palette.accent, 0.16 + pressure * 0.16);
  g.fillCircle(cx, cy, 72);
  g.fillStyle(palette.secondary, 0.58);
  g.fillCircle(cx, cy, 28);
  g.lineStyle(2, palette.secondary, 0.28);
  for (let index = 0; index < 8; index += 1) {
    const angle = index * Math.PI / 4;
    g.beginPath();
    g.moveTo(cx + Math.cos(angle) * 30, cy + Math.sin(angle) * 30);
    g.lineTo(cx + Math.cos(angle) * 220, cy + Math.sin(angle) * 220);
    g.strokePath();
  }
}

function drawPhaserWaveMarkers(scene, snapshot) {
  const { width, height, wave, palette } = snapshot;
  const startX = width * 0.42;
  const y = height * 0.08;
  for (let index = 0; index < snapshot.levelWaveCount; index += 1) {
    const active = index === wave.index;
    const done = index < wave.index;
    const color = done ? 0x62ff9d : active ? palette.secondary : palette.accentSoft;
    scene.add.rectangle(startX + index * 56, y, 42, 6, color, done || active ? 0.9 : 0.18)
      .setOrigin(0.5)
      .setRotation(-0.06)
      .setDepth(8);
  }
}

function drawPhaserRoute(scene, snapshot, route) {
  const g = scene.add.graphics().setDepth(12);
  const activeColor = snapshot.fingerGuide?.phaserColor || snapshot.palette.secondary;
  const inactive = snapshot.palette.accentSoft;
  const attacking = snapshot.pathStep > 0 && !isStrikeReturnStep(snapshot.pattern, snapshot.pathStep);
  const returning = isStrikeReturnStep(snapshot.pattern, snapshot.pathStep);
  drawDashedPhaserLine(g, route.base.x, route.base.y, route.target.x, route.target.y, activeColor, snapshot.pathStep >= 1 ? 0.78 : 0.32, 18, 12);
  drawDashedPhaserLine(g, route.target.x, route.target.y, route.return.x, route.return.y, inactive, returning || snapshot.pathStep >= 2 ? 0.72 : 0.18, 18, 12);
  if (attacking) {
    drawPhaserBeam(scene, route.base, route.target, activeColor, 0.58, 7, 14);
  }
  if (returning) {
    drawPhaserBeam(scene, route.target, route.return, 0x62ff9d, 0.48, 7, 14);
  }
}

function drawDashedPhaserLine(graphics, x1, y1, x2, y2, color, alpha, dash = 18, gap = 10) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.max(1, Math.floor(distance / (dash + gap)));
  graphics.lineStyle(3, color, alpha);
  for (let index = 0; index < steps; index += 1) {
    const start = (index * (dash + gap)) / distance;
    const end = Math.min(1, (index * (dash + gap) + dash) / distance);
    graphics.beginPath();
    graphics.moveTo(x1 + dx * start, y1 + dy * start);
    graphics.lineTo(x1 + dx * end, y1 + dy * end);
    graphics.strokePath();
  }
}

function drawPhaserBeam(scene, from, to, color, alpha, thickness, depth) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const beam = scene.add.rectangle(from.x, from.y, length, thickness, color, alpha)
    .setOrigin(0, 0.5)
    .setRotation(Math.atan2(dy, dx))
    .setDepth(depth);
  scene.add.rectangle(from.x, from.y, length, Math.max(2, thickness / 2), 0xffffff, alpha * 0.45)
    .setOrigin(0, 0.5)
    .setRotation(Math.atan2(dy, dx))
    .setDepth(depth + 1);
  return beam;
}

function drawPhaserRobot(scene, x, y, snapshot) {
  const robot = scene.add.container(x, y).setDepth(24);
  if (scene.textures.exists(HOME_K01_TEXTURE_KEY)) {
    const shadow = scene.add.ellipse(0, 74, 126, 28, 0x020608, 0.48);
    const body = scene.add.image(0, -10, HOME_K01_TEXTURE_KEY)
      .setDisplaySize(154, 154)
      .setAlpha(0.98);
    const glow = scene.add.circle(0, -8, 54, snapshot.palette.accent, 0)
      .setStrokeStyle(3, snapshot.palette.accent, snapshot.status === "prelock" ? 0.38 : 0.28);
    robot.add([shadow, glow, body]);
    if (snapshot.breaches) {
      const damage = scene.add.triangle(48, -18, 0, 18, 20, -8, 6, 16, snapshot.palette.danger, 0.9)
        .setRotation(0.5);
      robot.add(damage);
    }
    scene.add.text(x, y + 84, "K-01", phaserTextStyle({
      fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: "14px",
      color: "#bdeeff"
    })).setOrigin(0.5).setDepth(16).setAlpha(0.42);
    if (!snapshot.reducedMotion) {
      scene.tweens.add({
        targets: robot,
        y: y - 5,
        duration: 960,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
    }
    return robot;
  }

  const g = scene.add.graphics();
  g.fillStyle(0x061015, 0.55);
  g.fillEllipse(0, 74, 112, 22);
  g.fillStyle(0x28424d, 1);
  g.fillRoundedRect(-34, -94, 68, 48, 6);
  g.lineStyle(3, snapshot.palette.accentSoft, 0.72);
  g.strokeRoundedRect(-34, -94, 68, 48, 6);
  g.fillStyle(0x62ff9d, 1);
  g.fillRect(-19, -75, 13, 8);
  g.fillRect(8, -75, 13, 8);
  g.fillStyle(0x34414b, 1);
  g.fillRoundedRect(-42, -34, 84, 66, 6);
  g.lineStyle(3, snapshot.palette.secondary, 0.82);
  g.strokeRoundedRect(-42, -34, 84, 66, 6);
  g.lineStyle(3, snapshot.palette.accent, 0.9);
  g.beginPath();
  g.moveTo(0, -18);
  g.lineTo(18, 0);
  g.lineTo(0, 18);
  g.lineTo(-18, 0);
  g.closePath();
  g.strokePath();
  g.fillStyle(snapshot.palette.accent, 0.78);
  g.fillRect(-62, -18, 18, 66);
  g.fillRect(44, -18, 18, 66);
  g.fillStyle(snapshot.palette.accentSoft, 0.76);
  g.fillRect(-30, 34, 18, 32);
  g.fillRect(12, 34, 18, 32);
  if (snapshot.breaches) {
    g.fillStyle(snapshot.palette.danger, 0.9);
    g.fillTriangle(38, -28, 58, -8, 42, 16);
    g.lineStyle(3, snapshot.palette.danger, 0.72);
    g.beginPath();
    g.moveTo(32, -88);
    g.lineTo(44, -74);
    g.lineTo(35, -62);
    g.strokePath();
  }
  robot.add(g);

  scene.add.text(x, y + 92, "K-01", phaserTextStyle({
    fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "14px",
    color: "#bdeeff"
  })).setOrigin(0.5).setDepth(16).setAlpha(0.42);

  if (!snapshot.reducedMotion) {
    scene.tweens.add({
      targets: robot,
      y: y - 5,
      duration: 960,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }
  return robot;
}

function drawPhaserMonster(scene, x, y, snapshot) {
  const monster = scene.add.container(x, y).setDepth(23);
  const g = scene.add.graphics();
  const kind = getMonsterKind(snapshot.encounter.monster);
  const modifier = snapshot.encounter.modifier.id;
  const bodyColor = kind === "bug" ? 0x2a734d : kind === "crawler" ? 0x68354b : kind === "wall" ? 0x6e3326 : 0x6b1d2b;
  const bodyW = kind === "crawler" ? 132 : 116;
  const bodyH = kind === "crawler" ? 72 : 96;

  if (modifier === "split") {
    drawPhaserMonsterGhost(scene, x - 42, y + 14, snapshot, 0.28);
    drawPhaserMonsterGhost(scene, x + 38, y - 10, snapshot, 0.22);
  }
  if (modifier === "rush") {
    drawPhaserMonsterGhost(scene, x + 58, y, snapshot, 0.2);
  }

  g.fillStyle(snapshot.palette.danger, 0.08 + snapshot.pressure * 0.2);
  g.fillCircle(0, 0, 78 + snapshot.pressure * 24);
  if (modifier === "shield") {
    g.lineStyle(5, 0x8ea7ff, 0.58);
    g.strokeCircle(0, 0, 78);
    g.lineStyle(2, 0x8ea7ff, 0.34);
    g.strokeCircle(0, 0, 98);
  }
  if (modifier === "glitch") {
    g.fillStyle(snapshot.palette.accent, 0.38);
    g.fillRect(-72, -48, 44, 8);
    g.fillStyle(snapshot.palette.danger, 0.42);
    g.fillRect(26, -34, 52, 7);
    g.fillRect(-36, 42, 64, 8);
  }

  g.fillStyle(bodyColor, 1);
  if (kind === "wall") {
    g.fillRoundedRect(-58, -48, bodyW, bodyH, 8);
  } else {
    g.fillEllipse(0, 0, bodyW, bodyH);
  }
  g.lineStyle(3, snapshot.palette.danger, 0.78);
  if (kind === "wall") {
    g.strokeRoundedRect(-58, -48, bodyW, bodyH, 8);
  } else {
    g.strokeEllipse(0, 0, bodyW, bodyH);
  }
  g.fillStyle(snapshot.palette.secondary, 1);
  g.fillRect(-28, -16, 16, 16);
  g.fillRect(12, -16, 16, 16);
  g.fillStyle(snapshot.palette.danger, 0.95);
  g.fillRect(-24, 22, 48, 8);
  g.lineStyle(4, snapshot.palette.secondary, 0.68);
  g.beginPath();
  g.moveTo(-42, -42);
  g.lineTo(-62, -76);
  g.moveTo(42, -42);
  g.lineTo(62, -76);
  g.strokePath();
  monster.add(g);

  const label = scene.add.text(0, 68, snapshot.encounter.monster, phaserTextStyle({
    fontFamily: "PingFang SC, system-ui, sans-serif",
    fontSize: "15px",
    fontStyle: "800",
    color: "#ffd3d1",
    backgroundColor: "rgba(32,4,8,0.82)",
    padding: { x: 8, y: 4 }
  })).setOrigin(0.5);
  monster.add(label);

  if (!snapshot.reducedMotion) {
    scene.tweens.add({
      targets: monster,
      y: y - 8,
      duration: modifier === "rush" ? 520 : 880,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });
  }
  return monster;
}

function drawPhaserMonsterGhost(scene, x, y, snapshot, alpha) {
  const g = scene.add.graphics().setDepth(19);
  g.fillStyle(snapshot.palette.danger, alpha);
  g.fillEllipse(x, y, 104, 82);
  g.lineStyle(2, snapshot.palette.accentSoft, alpha);
  g.strokeEllipse(x, y, 116, 92);
}

function drawPhaserKeyPad(scene, x, y, key, label, active, snapshot, depth) {
  const displayKey = formatKey(key);
  if (!displayKey) return;
  const activeFill = 0xffd66e;
  const color = active ? 0xfff2a8 : snapshot.palette.accentSoft;
  const alpha = active ? 1 : 0.22;
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(active ? activeFill : 0x02070c, active ? 1 : 0.72);
  g.fillRoundedRect(x - 42, y - 24, 84, 48, 4);
  g.lineStyle(2, color, active ? 1 : 0.36);
  g.strokeRoundedRect(x - 42, y - 24, 84, 48, 4);
  scene.add.text(x, y - 2, displayKey, phaserTextStyle({
    fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
    fontSize: "28px",
    fontStyle: "900",
    color: active ? "#07100f" : "#a9d9e8"
  })).setOrigin(0.5).setDepth(depth + 1);
  if (label) {
    scene.add.text(x, y + 37, label, phaserTextStyle({
      fontFamily: "PingFang SC, system-ui, sans-serif",
      fontSize: "13px",
      color: active ? "#ffe3a5" : "#7fa4b0"
    })).setOrigin(0.5).setDepth(depth + 1).setAlpha(alpha);
  }
}

function drawPhaserPressure(scene, snapshot) {
  const { width, height, pressure, palette } = snapshot;
  const g = scene.add.graphics().setDepth(40);
  if (pressure < 0.36 && !snapshot.breaches) return;
  g.fillStyle(palette.danger, pressure > 0.72 ? 0.16 : 0.07);
  g.fillRect(0, 0, width, height);
  g.lineStyle(6, palette.danger, pressure > 0.72 ? 0.42 : 0.18);
  g.strokeRect(8, 8, width - 16, height - 16);
}

function drawPhaserBreachDamage(scene, snapshot) {
  if (!snapshot.breaches) return;
  const { width, height, palette } = snapshot;
  const g = scene.add.graphics().setDepth(42);
  g.lineStyle(3, palette.danger, 0.42 + Math.min(snapshot.breaches, 4) * 0.08);
  const crackCount = Math.min(snapshot.breaches + 1, 6);
  for (let index = 0; index < crackCount; index += 1) {
    const x = width * (0.18 + index * 0.12);
    const y = height * (0.16 + (index % 3) * 0.12);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 26, y + 62);
    g.lineTo(x + 8, y + 94);
    g.strokePath();
  }
}

function runStrikePhaserEvent(scene, snapshot, refs) {
  const { width, height, event, palette, reducedMotion } = snapshot;
  const intense = ["crash", "drift", "breach", "ambush", "surge", "low-health", "death"].includes(event);

  if (event === "room-change") {
    const shutter = scene.add.rectangle(-8, height / 2, width + 24, height, 0x020506, 0.96)
      .setOrigin(0, 0.5)
      .setDepth(80);
    const label = scene.add.text(width * 0.5, height * 0.48, `进入 ${snapshot.room.name}`, phaserTextStyle({
      fontFamily: "PingFang SC, system-ui, sans-serif",
      fontSize: "34px",
      fontStyle: "900",
      color: palette.label
    })).setOrigin(0.5).setDepth(81);
    if (!reducedMotion) {
      scene.tweens.add({ targets: shutter, x: width + 28, duration: 620, ease: "Cubic.easeOut" });
      scene.tweens.add({ targets: label, alpha: 0, x: width * 0.62, duration: 520, delay: 160, ease: "Cubic.easeOut" });
    } else {
      shutter.setAlpha(0);
      label.setAlpha(0);
    }
  }

  if (event === "launch") {
    const beam = drawPhaserBeam(scene, refs.route.base, refs.route.target, palette.secondary, 0.74, 10, 50);
    beam.scaleX = reducedMotion ? 1 : 0.08;
    if (!reducedMotion) scene.tweens.add({ targets: beam, scaleX: 1, duration: 180, ease: "Cubic.easeOut" });
  }

  if (event === "hit" || event === "combo-hit" || event === "kill") {
    drawPhaserBeam(scene, refs.route.base, refs.route.target, palette.secondary, 0.85, 9, 50);
    const sparkCount = event === "combo-hit" ? 20 : 14;
    for (let index = 0; index < sparkCount; index += 1) {
      const angle = (Math.PI * 2 * index) / sparkCount;
      const spark = scene.add.rectangle(refs.route.target.x, refs.route.target.y, event === "combo-hit" ? 8 : 6, event === "combo-hit" ? 30 : 24, palette.secondary, 0.9)
        .setRotation(angle)
        .setDepth(55);
      if (!reducedMotion) {
        scene.tweens.add({
          targets: spark,
          x: refs.route.target.x + Math.cos(angle) * (event === "combo-hit" ? 104 : 84),
          y: refs.route.target.y + Math.sin(angle) * (event === "combo-hit" ? 78 : 64),
          alpha: 0,
          duration: event === "kill" ? 420 : event === "combo-hit" ? 340 : 260,
          ease: "Cubic.easeOut"
        });
      }
    }
    if (event === "kill" && !reducedMotion) {
      scene.tweens.add({ targets: refs.monster, scaleX: 1.22, scaleY: 1.22, alpha: 0.25, duration: 320, ease: "Cubic.easeOut" });
    }
  }

  if (event === "overdrive") {
    drawPhaserPulse(scene, refs.route.base.x, refs.route.base.y, 0x62ff9d, 0.74, 42, 190, reducedMotion);
    drawPhaserBeam(scene, refs.route.base, refs.route.target, 0x62ff9d, 0.9, 14, 60);
    const label = scene.add.text(refs.route.base.x + 34, refs.route.base.y - 104, "OVERDRIVE", phaserTextStyle({
      fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: "24px",
      fontStyle: "900",
      color: "#62ff9d"
    })).setOrigin(0, 0.5).setDepth(72);
    if (!reducedMotion) {
      scene.tweens.add({ targets: label, x: label.x + 42, alpha: 0, duration: 420, ease: "Cubic.easeOut" });
      scene.cameras.main.flash(120, 98, 255, 157, false);
    }
  }

  if (event === "return") {
    const beam = drawPhaserBeam(scene, refs.route.target, refs.route.return, 0x62ff9d, 0.72, 9, 50);
    beam.scaleX = reducedMotion ? 1 : 0.08;
    if (!reducedMotion) scene.tweens.add({ targets: beam, scaleX: 1, duration: 180, ease: "Cubic.easeOut" });
  }

  if (intense) {
    const alpha = event === "breach" || event === "death" ? 0.34 : 0.18;
    const flash = scene.add.rectangle(width / 2, height / 2, width, height, palette.danger, alpha).setDepth(70);
    if (!reducedMotion) {
      scene.cameras.main.shake(event === "breach" || event === "death" ? 340 : 180, event === "breach" ? 0.018 : 0.01);
      scene.tweens.add({ targets: flash, alpha: 0, duration: 320, ease: "Cubic.easeOut" });
      scene.tweens.add({
        targets: refs.monster,
        x: refs.monster.x - (event === "breach" ? 78 : 42),
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 180,
        yoyo: event !== "death",
        ease: "Cubic.easeOut"
      });
    }
  }
}

function drawSceneCanvasFrame(now) {
  sceneCanvasRaf = null;
  const canvas = document.querySelector(".scene-canvas");
  if (!canvas || view !== "playing" || !state) return syncSceneCanvasLoop();

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);

  drawCanvasTunnel(ctx, rect.width, rect.height, now);
  if (state.level.mode === "home") {
    drawCanvasPreflight(ctx, rect.width, rect.height, now);
  } else {
    drawCanvasStrike(ctx, rect.width, rect.height, now);
  }
  drawCanvasSceneEffects(ctx, rect.width, rect.height, now);

  sceneEffects = sceneEffects.filter((effect) => now - effect.at < 950);
  syncSceneCanvasLoop();
}

function drawCanvasTunnel(ctx, width, height, now) {
  const time = now / 1000;
  const pressure = state.level.mode === "strike" ? state.monsterPressure / 100 : state.corruption / 120;
  const speed = state.level.mode === "strike" ? 34 + pressure * 70 : 22;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = pressure > 0.7 ? "rgba(255,98,92,0.18)" : "rgba(69,247,228,0.14)";
  ctx.lineWidth = 2;
  for (let index = 0; index < 9; index += 1) {
    const x = ((index * 130 + time * speed) % (width + 160)) - 80;
    ctx.beginPath();
    ctx.moveTo(x, height * 0.22);
    ctx.lineTo(x - width * 0.08, height * 0.88);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCanvasPreflight(ctx, width, height, now) {
  const time = now / 1000;
  const wave = getWaveProgress();
  const progress = wave ? (wave.index + wave.current / Math.max(1, wave.count)) / state.level.waves.length : 0;
  const centerX = width * 0.5;
  const centerY = height * 0.52;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(255,214,110,0.46)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, 48 + Math.sin(time * 3) * 4, 0, Math.PI * 2 * Math.max(0.05, progress));
  ctx.stroke();

  const droneCount = 3;
  for (let index = 0; index < droneCount; index += 1) {
    const angle = time * 1.4 + index * ((Math.PI * 2) / droneCount);
    const radius = 92 + index * 18;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle * 1.2) * radius * 0.35;
    ctx.fillStyle = index % 2 ? "rgba(98,255,157,0.78)" : "rgba(255,214,110,0.78)";
    ctx.fillRect(x - 5, y - 5, 10, 10);
    ctx.strokeStyle = "rgba(121,232,255,0.24)";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(centerX, centerY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCanvasStrike(ctx, width, height, now) {
  const time = now / 1000;
  const encounter = getStrikeEncounter();
  const modifier = encounter?.modifier?.id || "rush";
  const pressure = state.monsterPressure / 100;
  const robot = { x: width * 0.23, y: height * 0.58 };
  const monster = { x: width * (0.78 - pressure * 0.22), y: height * (encounter?.lane === "high" ? 0.42 : encounter?.lane === "low" ? 0.66 : 0.54) };

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  drawCanvasRoomEnvironment(ctx, width, height, time, pressure, encounter?.waveIndex || 0);
  drawCanvasIntent(ctx, modifier, monster, pressure, time);
  drawCanvasActionRoute(ctx, robot, monster, width, height, time);
  ctx.restore();
}

function drawCanvasRoomEnvironment(ctx, width, height, time, pressure, waveIndex) {
  const room = getStrikeRoomTheme(waveIndex);
  if (room.id === "gate") return drawCanvasGateRoom(ctx, width, height, time, pressure);
  if (room.id === "pipe") return drawCanvasPipeRoom(ctx, width, height, time, pressure);
  if (room.id === "nest") return drawCanvasNestRoom(ctx, width, height, time, pressure);
  return drawCanvasCoreRoom(ctx, width, height, time, pressure);
}

function drawCanvasGateRoom(ctx, width, height, time, pressure) {
  const pulse = 0.5 + Math.sin(time * 3) * 0.5;
  ctx.strokeStyle = `rgba(69,247,228,${0.18 + pressure * 0.18})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(width * 0.55, height * 0.2, width * 0.28, height * 0.56);
  ctx.fillStyle = `rgba(69,247,228,${0.04 + pulse * 0.05})`;
  ctx.fillRect(width * 0.57, height * 0.23, width * 0.24, height * 0.5);
}

function drawCanvasPipeRoom(ctx, width, height, time, pressure) {
  ctx.lineWidth = 10;
  ctx.strokeStyle = `rgba(98,255,157,${0.16 + pressure * 0.18})`;
  [0.22, 0.42, 0.68].forEach((y, index) => {
    ctx.beginPath();
    ctx.moveTo(width * 0.12, height * y + Math.sin(time * 2 + index) * 5);
    ctx.bezierCurveTo(width * 0.36, height * (y - 0.04), width * 0.62, height * (y + 0.06), width * 0.94, height * y);
    ctx.stroke();
  });
  ctx.fillStyle = `rgba(98,255,157,${0.08 + Math.sin(time * 4) * 0.02})`;
  ctx.fillRect(width * 0.1, height * 0.78, width * 0.74, height * 0.06);
}

function drawCanvasNestRoom(ctx, width, height, time, pressure) {
  ctx.strokeStyle = `rgba(255,157,69,${0.18 + pressure * 0.22})`;
  ctx.lineWidth = 5;
  for (let index = 0; index < 7; index += 1) {
    const y = height * (0.18 + index * 0.1);
    ctx.beginPath();
    ctx.moveTo(width * 0.94, y);
    ctx.lineTo(width * (0.72 + Math.sin(time + index) * 0.04), y + 34);
    ctx.lineTo(width * 0.88, y + 68);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,98,92,0.12)";
  ctx.fillRect(width * 0.76, height * 0.18, width * 0.17, height * 0.62);
}

function drawCanvasCoreRoom(ctx, width, height, time, pressure) {
  const cx = width * 0.74;
  const cy = height * 0.48;
  ctx.strokeStyle = `rgba(255,98,92,${0.26 + pressure * 0.28})`;
  ctx.lineWidth = 3;
  for (let index = 0; index < 3; index += 1) {
    ctx.beginPath();
    ctx.arc(cx, cy, 72 + index * 38 + Math.sin(time * 2 + index) * 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = `rgba(255,98,92,${0.12 + pressure * 0.12})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 46 + Math.sin(time * 4) * 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCanvasIntent(ctx, modifier, monster, pressure, time) {
  const intentAlpha = 0.24 + pressure * 0.46;
  ctx.lineWidth = 2;

  if (modifier === "rush") {
    for (let index = 0; index < 3; index += 1) {
      const offset = ((time * 80 + index * 42) % 160) - 80;
      ctx.strokeStyle = `rgba(255,98,92,${intentAlpha})`;
      ctx.beginPath();
      ctx.moveTo(monster.x + 30 - offset, monster.y - 44 + index * 30);
      ctx.lineTo(monster.x - 72 - offset, monster.y - 20 + index * 18);
      ctx.stroke();
    }
  } else if (modifier === "shield") {
    ctx.strokeStyle = `rgba(142,167,255,${intentAlpha + 0.15})`;
    for (let index = 0; index < 2; index += 1) {
      ctx.beginPath();
      ctx.arc(monster.x, monster.y, 62 + index * 16 + Math.sin(time * 3) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (modifier === "glitch") {
    ctx.fillStyle = `rgba(69,247,228,${intentAlpha * 0.55})`;
    for (let index = 0; index < 8; index += 1) {
      const x = monster.x - 82 + ((index * 37 + time * 80) % 164);
      const y = monster.y - 70 + ((index * 23) % 118);
      ctx.fillRect(x, y, 26, 4);
    }
  } else {
    ctx.strokeStyle = `rgba(255,214,110,${intentAlpha})`;
    [-46, 46].forEach((offset) => {
      ctx.beginPath();
      ctx.arc(monster.x + offset, monster.y + Math.sin(time * 4) * 8, 38, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
}

function drawCanvasActionRoute(ctx, robot, monster, width, height, time) {
  const returnPad = { x: width * 0.82, y: height * 0.78 };
  const route = [robot, monster, returnPad];
  ctx.lineWidth = 4;
  for (let index = 0; index < route.length - 1; index += 1) {
    const active = index === state.pathStep || index < state.pathStep;
    ctx.strokeStyle = active ? "rgba(255,214,110,0.58)" : "rgba(121,232,255,0.16)";
    ctx.setLineDash(active ? [18, 10] : [8, 12]);
    ctx.lineDashOffset = -time * 34;
    ctx.beginPath();
    ctx.moveTo(route[index].x, route[index].y);
    ctx.lineTo(route[index + 1].x, route[index + 1].y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

function drawCanvasSceneEffects(ctx, width, height, now) {
  const robot = { x: width * 0.23, y: height * 0.58 };
  const pressure = state.level.mode === "strike" ? state.monsterPressure / 100 : 0;
  const monster = { x: width * (0.78 - pressure * 0.22), y: height * 0.54 };

  sceneEffects.forEach((effect) => {
    const age = (now - effect.at) / 950;
    if (age < 0 || age > 1) return;
    const fade = 1 - age;
    ctx.save();
    ctx.globalCompositeOperation = "screen";

    if (effect.name === "hit" || effect.name === "combo-hit" || effect.name === "kill") {
      ctx.strokeStyle = `rgba(255,214,110,${fade})`;
      ctx.lineWidth = effect.name === "combo-hit" ? 8 + fade * 11 : 5 + fade * 8;
      ctx.beginPath();
      ctx.moveTo(robot.x, robot.y);
      ctx.lineTo(monster.x, monster.y);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,214,110,${fade})`;
      const sparkCount = effect.name === "combo-hit" ? 16 : 10;
      for (let index = 0; index < sparkCount; index += 1) {
        const angle = index * 0.63 + age * 3;
        const radius = age * (effect.name === "combo-hit" ? 112 : 78);
        ctx.fillRect(monster.x + Math.cos(angle) * radius, monster.y + Math.sin(angle) * radius, effect.name === "combo-hit" ? 6 : 4, (effect.name === "combo-hit" ? 24 : 18) * fade);
      }
    }

    if (["crash", "drift", "breach", "low-health"].includes(effect.name)) {
      const radius = 42 + age * 260;
      ctx.strokeStyle = `rgba(255,98,92,${fade * 0.85})`;
      ctx.lineWidth = 8 * fade;
      ctx.beginPath();
      ctx.arc(effect.name === "breach" ? width * 0.5 : robot.x, robot.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (effect.name === "charge" || effect.name === "boot" || effect.name === "overdrive") {
      ctx.strokeStyle = `rgba(98,255,157,${fade * 0.8})`;
      ctx.lineWidth = (effect.name === "overdrive" ? 8 : 4) * fade;
      ctx.beginPath();
      ctx.arc(effect.name === "overdrive" ? robot.x : width * 0.5, effect.name === "overdrive" ? robot.y : height * 0.52, 60 + age * (effect.name === "overdrive" ? 190 : 110), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  });
}

function renderTopbar() {
  const resultCount = getResults().length;
  const inventoryTotal = getInventoryTotal();
  const audioPrefs = audioDirector.getPrefs();
  return `
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark" aria-hidden="true">${iconBolt()}</div>
        <div>
          <h1 class="brand-title">Key Pilot</h1>
          <p class="brand-subtitle">地下坐标重启</p>
        </div>
      </div>
      <div class="top-status">
        <span class="status-dot" aria-hidden="true"></span>
        <span>K-01 本地接口在线</span>
        <span class="build-chip">${IS_DESKTOP_RUNTIME ? "桌面版" : "HTML"} ${BUILD_LABEL}</span>
        <span>${resultCount ? `最近记录 ${resultCount}` : "等待首次训练"}</span>
        <span>${inventoryTotal ? `仓库 ${inventoryTotal}` : "仓库空"}</span>
        <button class="top-action fullscreen-toggle" type="button" data-toggle-fullscreen aria-label="切换全屏">FULL</button>
        <button class="sound-toggle music-toggle ${audioPrefs.musicEnabled ? "on" : ""}" type="button" data-toggle-music aria-label="切换背景音乐">${audioPrefs.musicEnabled ? "BGM ON" : "BGM OFF"}</button>
        <button class="sound-toggle ${audioPrefs.soundEnabled ? "on" : ""}" type="button" data-toggle-sound aria-label="切换音效">${audioPrefs.soundEnabled ? "SFX ON" : "SFX OFF"}</button>
        <button class="sound-toggle volume-toggle" type="button" data-toggle-volume aria-label="切换音量档位">VOL ${audioPrefs.volumeLabel}</button>
      </div>
    </header>
  `;
}

function syncAudioToggleButtons() {
  const audioPrefs = audioDirector.getPrefs();
  document.querySelectorAll("[data-toggle-music]").forEach((button) => {
    button.classList.toggle("on", audioPrefs.musicEnabled);
    button.textContent = audioPrefs.musicEnabled ? "BGM ON" : "BGM OFF";
  });
  document.querySelectorAll("[data-toggle-sound]").forEach((button) => {
    button.classList.toggle("on", audioPrefs.soundEnabled);
    button.textContent = audioPrefs.soundEnabled ? "SFX ON" : "SFX OFF";
  });
  document.querySelectorAll("[data-toggle-volume]").forEach((button) => {
    button.textContent = `VOL ${audioPrefs.volumeLabel}`;
  });
}

function renderMenu() {
  const recent = getResults().slice(0, 3);
  const bestHome = getBestFor("level-01-home");
  const bestStrike = getBestFor("level-02-strike");
  const bestCruise = getBestFor("level-03-cruise");
  const inventory = getInventory();
  const recommendation = getRecommendedTraining();

  return `
    <section class="menu-grid" style="${sceneBackgroundStyle("menuHangar")}">
      ${sceneImageMarkup("menuHangar", "menu-scene-bg")}
      <div class="terminal">
        <p class="mission-kicker">Underground Node / 启动层</p>
        <h2 class="hero-title">Key<br><span>Pilot</span></h2>
        <p class="hero-copy">驾驶 K-01 进入被旧坐标残影污染的键境。正确键位让机体前进，错误键位会让它撞墙、污染上升、怪物逼近。</p>
        <div class="menu-cta">
          <div>
            <small>${recommendation.label}</small>
            <strong>${recommendation.title}</strong>
            <span>${recommendation.detail}</span>
          </div>
          <button class="btn primary menu-start-btn" type="button" data-start-level="${recommendation.levelId}">${recommendation.action}</button>
        </div>
        ${renderMenuVisual()}
        <div class="mission-list">
          ${LEVELS.map((level) => renderMissionCard(level, recommendation.levelId)).join("")}
        </div>
      </div>
      <aside class="side-panel">
        <div>
          <h3 class="panel-title">最近成绩</h3>
        </div>
        <div class="recent-list">
          ${
            recent.length
              ? recent.map((item) => `
                <div class="recent-row">
                  <span class="recent-main"><strong>${item.levelTitle}</strong><em>${new Date(item.playedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</em></span>
                  <span class="recent-score">${item.accuracy}% / ${item.reason === "timeout" ? "未完成" : "★".repeat(item.stars) || "未评级"}</span>
                </div>
              `).join("")
              : `<p class="empty-recent">还没有训练记录。先跑一局 01 归位，把左右锚点点亮。</p>`
          }
        </div>
        <div class="stat-stack">
          <div class="stat-box">
            <small>01 最佳准确率</small>
            <div class="stat-value">${bestHome ? `${bestHome.accuracy}%` : "--"}</div>
          </div>
          <div class="stat-box">
            <small>02 最佳路径完整率</small>
            <div class="stat-value">${bestStrike ? `${bestStrike.pathCompleteRate}%` : "--"}</div>
          </div>
          <div class="stat-box">
            <small>03 最佳巡航拦截率</small>
            <div class="stat-value">${bestCruise ? `${bestCruise.cruiseInterceptRate || bestCruise.pathCompleteRate || 0}%` : "--"}</div>
          </div>
          <div class="tip-box">
            <small>机体仓库</small>
            ${getInventoryTotal() ? "奖励已入库。继续通关可以堆叠零件，后续会用于装备改造和怪物图鉴。" : "完成任务可获得锚点芯片、返航钩爪和怪物图鉴进度。"}
          </div>
          <div class="equipment-preview">
            ${EQUIPMENT_PREVIEW.map((item) => {
              const count = getEquipmentCount(item, inventory);
              return `
              <div class="${count ? "owned" : ""}">
                <strong>${item.name}<em>x${count}</em></strong>
                <span>${item.slot} / ${item.hint}</span>
              </div>
            `;
            }).join("")}
          </div>
          ${renderInventoryShelf(inventory)}
        </div>
      </aside>
    </section>
  `;
}

function renderInventoryShelf(inventory) {
  const entries = Object.entries(inventory)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, 8);

  if (!entries.length) {
    return `
      <div class="inventory-shelf empty">
        <small>掉落仓</small>
        <span>暂无掉落</span>
      </div>
    `;
  }

  return `
    <div class="inventory-shelf">
      <small>掉落仓</small>
      ${entries.map(([name, count]) => `
        <div class="loot-chip">
          <span>${name}</span>
          <strong>x${count}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMenuVisual() {
  return `
    <div class="menu-visual scene-preview" aria-hidden="true">
      ${sceneImageMarkup("menuHangar", "menu-visual-bg")}
      <div class="scene-preview-scan"></div>
      ${renderRobotSprite("menu-robot")}
      <div class="menu-arm"></div>
      ${renderMonsterSprite("漂移僵尸", "menu-monster")}
      <div class="scene-preview-label">
        <small>任务选择舱在线</small>
        <strong>K-01 等待出舱</strong>
      </div>
      <div class="scene-preview-status">
        <span>01 预检舱</span>
        <span>02 清障隧道</span>
        <span>03 巡航防线</span>
      </div>
    </div>
  `;
}

function renderMissionCard(level, recommendedLevelId = "level-01-home") {
  const best = getBestFor(level.id);
  const recommended = level.id === recommendedLevelId;
  return `
    <button class="mission-card ${recommended ? "recommended" : ""}" type="button" data-start-level="${level.id}" aria-label="开始 ${level.index} ${level.title}">
      <span class="mission-index">${level.index}</span>
      <span>
        <strong class="mission-name">${level.title}</strong>
        <p class="mission-desc">${level.subtitle} · ${level.mission}</p>
      </span>
      <span class="mission-action">
        <small>${recommended ? "推荐" : "选关"}</small>
        <strong>开始</strong>
        <em>${best ? `${"★".repeat(best.stars) || "未评级"} ${best.accuracy}%` : "未训练"}</em>
      </span>
    </button>
  `;
}

function renderPlaying() {
  if (!state) return "";
  if (state.status === "prelock") return renderPrelock();
  if (state.status === "finger-calibration") return renderStrikeCalibration();

  const accuracy = calculateAccuracy(state);
  const wave = getWaveProgress();
  const progressText = state.level.mode === "home"
    ? `${state.completedTargets}/${state.level.targetCount}`
    : `${state.completedActions}/${state.level.targetActions}`;
  const roomCombatMode = state.level.mode === "strike" && state.status === "playing";
  const cruiseCombatMode = state.level.mode === "cruise" && state.status === "playing";
  const liveCombatMode = roomCombatMode || cruiseCombatMode;
  const cockpitClasses = ["cockpit"];
  if (state.level.mode === "home") cockpitClasses.push("home-cockpit");
  if (liveCombatMode) cockpitClasses.push("combat-cockpit");
  const cockpitStyle = state.level.mode === "home" ? sceneBackgroundStyle("preflightChamber") : "";

  return `
    <section class="${cockpitClasses.join(" ")}" style="${cockpitStyle}">
      ${state.level.mode === "home" ? sceneImageMarkup("preflightChamber", "preflight-scene-bg") : ""}
      ${liveCombatMode ? "" : `
        <div class="hud">
          ${renderHudItem("任务", progressText)}
          ${renderHudItem("倒计时", `${state.timeLeft}s`)}
          ${renderHudItem("连击", state.combo)}
          ${renderHudItem("准确率", `${accuracy}%`)}
          ${renderHudItem("状态", getComboRank())}
        </div>
      `}
      <div class="play-zone ${liveCombatMode ? "room-combat-layout" : ""}">
        <div class="target-stage">
          ${liveCombatMode ? "" : `<div class="lane"></div>`}
          ${liveCombatMode ? "" : `
            <div class="phase-line">
              <span>${state.level.scene} / WAVE ${wave.index + 1}.${wave.total} ${wave.name}</span>
              ${renderSequence()}
            </div>
            <div class="mission-brief">
              <div>
                <strong>${wave.objective}</strong>
                <span>${state.level.briefing}</span>
              </div>
              <div class="wave-meter">
                ${state.level.waves.map((item, index) => `
                  <span class="${index < wave.index ? "done" : ""} ${index === wave.index ? "active" : ""}"></span>
                `).join("")}
              </div>
            </div>
          `}
          <div class="target-core">
            ${renderGameBoard()}
          </div>
          ${liveCombatMode ? "" : renderCommsPanel()}
          <div class="feedback-strip">
            <div class="feedback-message ${state.feedbackType}">${state.feedback}</div>
            ${liveCombatMode ? "" : renderVitals()}
          </div>
        </div>
        ${liveCombatMode ? "" : renderKeyboardPanel()}
      </div>
      <div class="control-row">
        <button class="btn danger" type="button" data-stop>退出训练</button>
        <button class="btn" type="button" data-restart="${state.level.id}">重开本关</button>
      </div>
    </section>
  `;
}

function renderStrikeCalibration() {
  const drill = getCurrentCalibrationDrill();
  const guide = drill?.guide || FINGER_GROUPS[0];
  const pattern = drill?.pattern || [];
  const total = state.calibrationQueue.length || 1;
  const step = state.calibrationStep;
  const current = pattern[step] || state.currentTarget;
  const route = pattern.map((key, index) => `
    <span class="${index < step ? "done" : ""} ${index === step ? "current" : ""}">
      ${formatKey(key)}
    </span>
  `).join("");
  const visualRows = guide.visualRows || [guide.keys];
  const territory = visualRows.map((row) => `
    <div class="territory-row ${row.length > 1 ? "wide" : "single"}">
      ${row.map((key) => `
        <span class="${key === current ? "current" : ""} ${key === guide.home ? "home" : ""}">
          ${formatKey(key)}
        </span>
      `).join("")}
    </div>
  `).join("");
  const progressDots = state.calibrationQueue.map((item, index) => `
    <i class="${index < state.calibrationIndex ? "done" : ""} ${index === state.calibrationIndex ? "active" : ""}" style="--finger-color: ${item.guide.color}"></i>
  `).join("");

  return `
    <section class="cockpit calibration-cockpit" style="--finger-color: ${guide.color}; ${sceneBackgroundStyle("calibrationChamber")}">
      ${sceneImageMarkup("calibrationChamber", "calibration-scene-bg")}
      <div class="calibration-header">
        <div>
          <p class="mission-kicker">Arm Sync / 机械臂接入校准</p>
          <h2>接入<strong>校准</strong></h2>
        </div>
        <div class="calibration-count">
          <small>校准进度</small>
          <strong>${state.calibrationIndex + 1}/${total}</strong>
        </div>
      </div>
      <div class="calibration-stage event-${state.sceneEvent || "idle"}">
        <div class="calibration-orbit" aria-hidden="true">
          <i></i><i></i><i></i>
        </div>
        <div class="calibration-robot-wrap">
          ${renderRobotSprite("calibration")}
          <div class="calibration-arm ${guide.side}">
            <span></span>
          </div>
        </div>
        <div class="calibration-command">
          <div class="calibration-finger-mark">
            <small>当前机械臂</small>
            <b>${guide.hand}<em>${guide.finger}</em></b>
          </div>
          <small>当前按键</small>
          <strong class="calibration-key-target">${formatKey(current)}</strong>
          <span>${drill?.objective || "确认机械臂线路"}</span>
        </div>
        <div class="calibration-route" aria-label="校准路线">
          ${route}
        </div>
        <div class="calibration-territory">
          <small>${guide.arm}</small>
          <div class="territory-grid ${guide.keys.length > 3 ? "wide" : "single"}">${territory}</div>
        </div>
        <div class="calibration-progress">${progressDots}</div>
        <div class="calibration-feedback ${state.feedbackType}">${state.feedback}</div>
      </div>
      <div class="calibration-footer">
        <div>
          <strong>先校准，再开战</strong>
          <span>这一段不计时、不扣血。目标是把每根手指的上下线路先接入脑子里。</span>
        </div>
        ${renderVitals()}
        <div class="calibration-actions">
          <button class="btn primary" type="button" data-skip-calibration>跳过教程，直接实战</button>
          <button class="btn danger" type="button" data-stop>返回主界面</button>
        </div>
      </div>
    </section>
  `;
}

function renderPrelock() {
  return `
    <section class="cockpit preflight-cockpit" style="${sceneBackgroundStyle("preflightChamber")}">
      ${sceneImageMarkup("preflightChamber", "preflight-scene-bg")}
      <div class="prelock">
        <div class="prelock-intro">
          <p class="mission-kicker">Preflight / 战前预检</p>
          <h2 class="hero-title">出舱<br><span>许可</span></h2>
          <p class="hero-copy">只看中央指令舱。先锁 F，再锁 J，舱门打开后才进入八键预检。</p>
        </div>
        ${renderPrelockVisual()}
        <div class="feedback-message ${state.feedbackType}">${state.feedback}</div>
        ${renderVitals()}
        <div class="control-row">
          <button class="btn danger" type="button" data-stop>返回主界面</button>
        </div>
      </div>
    </section>
  `;
}

function getPrelockPrompt() {
  if (!state.leftLocked) {
    return {
      title: "按 F 锁定左手",
      detail: "先让左手食指回到 F 锚点。"
    };
  }
  if (!state.rightLocked) {
    return {
      title: "按 J 锁定右手",
      detail: "左右主锚都接入后，舱门会打开。"
    };
  }
  return {
    title: "主锚已接入",
    detail: "准备进入中排八键预检。"
  };
}

function renderPrelockVisual() {
  const prompt = getPrelockPrompt();
  const commandKey = !state.leftLocked ? "F" : !state.rightLocked ? "J" : "GO";
  return `
    <div class="prelock-visual phaser-home-shell prelock-phaser-shell ${state.sceneEvent ? `event-${state.sceneEvent}` : ""}" aria-hidden="true">
      <div id="home-phaser-stage" class="phaser-stage"></div>
      <div class="prelock-focus-command">
        <small>当前只做这一步</small>
        <strong>${commandKey}</strong>
        <span>${prompt.title}</span>
        <em>${prompt.detail}</em>
        <div class="prelock-focus-anchors">
          <i class="${state.leftLocked ? "done" : "active"}">F</i>
          <i class="${state.rightLocked ? "done" : state.leftLocked ? "active" : ""}">J</i>
        </div>
      </div>
      <div class="impact-flash"></div>
    </div>
  `;
}

function renderHudItem(label, value) {
  return `
    <div class="hud-item" data-hud="${label}">
      <div class="hud-label">${label}</div>
      <div class="hud-value">${value}</div>
    </div>
  `;
}

function renderCombatReadouts() {
  const accuracy = calculateAccuracy(state);
  const progress = state.level.targetActions ? state.completedActions / state.level.targetActions : 0;
  const timeProgress = state.level.timeLimit ? state.timeLeft / state.level.timeLimit : 1;
  const comboProgress = clamp(state.combo, 0, 30) / 30;
  const accuracyProgress = accuracy / 100;
  return `
    <div class="combat-readouts" aria-hidden="true">
      <div class="combat-readout mission" data-hud="任务" style="--readout-fill: ${progress};">
        <small>${state.level.mode === "cruise" ? "防线进度" : "清障进度"}</small>
        <span class="readout-track"><i></i></span>
        <strong class="hud-value">${state.completedActions}/${state.level.targetActions}</strong>
      </div>
      <div class="combat-readout time" data-hud="倒计时" style="--readout-fill: ${timeProgress};">
        <small>${state.level.mode === "cruise" ? "巡航计时" : "氧舱计时"}</small>
        <span class="readout-track"><i></i></span>
        <strong class="hud-value">${state.timeLeft}s</strong>
      </div>
      <div class="combat-readout combo" data-hud="连击" style="--readout-fill: ${comboProgress};">
        <small>同步链</small>
        <span class="readout-track"><i></i></span>
        <strong class="hud-value">${state.combo}</strong>
      </div>
      <div class="combat-readout accuracy" data-hud="准确率" style="--readout-fill: ${accuracyProgress};">
        <small>神经命中</small>
        <span class="readout-track"><i></i></span>
        <strong class="hud-value">${accuracy}%</strong>
      </div>
      <div class="combat-readout status" data-hud="状态">
        <small>机体状态</small>
        <strong class="hud-value">${getComboRank()}</strong>
      </div>
    </div>
  `;
}

function renderSequence() {
  if (state.level.mode === "home") {
    const target = formatKey(state.currentTarget);
    return `<div class="sequence">${target ? `<span class="seq-key current">${target}</span>` : ""}</div>`;
  }

  const pattern = getCurrentPattern();
  return `
    <div class="sequence">
      ${pattern.map((key, index) => `
        <span class="seq-key ${index < state.pathStep ? "done" : ""} ${index === state.pathStep ? "current" : ""}">${formatKey(key)}</span>
      `).join("")}
    </div>
  `;
}

function renderGameBoard() {
  const eventClass = `event-${state.sceneEvent || "idle"}`;
  const corruptionAlpha = state.corruption / 100;
  const pressureAlpha = state.monsterPressure / 100;
  const breachAlpha = Math.min(state.breaches, 6) / 6;
  const comboGlow = Math.min(state.combo, 30) / 30;
  const monsterX = Math.round(state.monsterPressure * -3.25);
  const monsterScale = (0.9 + state.monsterPressure * 0.0065).toFixed(2);
  const monsterRight = `${clamp(18 - state.monsterPressure * 0.22, -8, 18).toFixed(1)}%`;
  const sceneStyle = [
    `--corruption-level: ${state.corruption}%`,
    `--corruption-glow: ${(0.16 + corruptionAlpha * 0.74).toFixed(2)}`,
    `--pressure-glow: ${(pressureAlpha * 0.82).toFixed(2)}`,
    `--proximity-scale: ${(0.2 + pressureAlpha * 0.8).toFixed(2)}`,
    `--monster-right: ${monsterRight}`,
    `--monster-x: ${monsterX}px`,
    `--monster-scale: ${monsterScale}`,
    `--breach-count: ${Math.min(state.breaches, 6)}`,
    `--breach-glow: ${(0.32 + breachAlpha * 0.68).toFixed(2)}`,
    `--body-glow: ${(0.65 + comboGlow * 0.35).toFixed(2)}`
  ].join("; ");

  if (state.level.mode === "home") {
    const wave = getWaveProgress();
    return `
      <div class="game-scene home-scene phaser-home-shell ${eventClass}" style="${sceneStyle}" data-event="${state.sceneNonce}" aria-label="底座校准游戏场景">
        <div id="home-phaser-stage" class="phaser-stage" aria-hidden="true"></div>
        <div class="phaser-home-tag">
          <small>${wave.name}</small>
          <strong>${getCurrentMonster()}</strong>
          <span>预检 ${state.completedTargets}/${state.level.targetCount} / 偏移 ${state.homeDriftCount}</span>
        </div>
        ${renderSceneCommand()}
        <div class="impact-flash"></div>
        <div class="spark-burst"><i></i><i></i><i></i><i></i><i></i></div>
      </div>
    `;
  }

  if (state.level.mode === "cruise") {
    const threat = getCurrentCruiseThreat();
    const pressureTier = getCruiseThreatTimeRatio() <= 0.28 ? "danger" : getCruiseThreatTimeRatio() <= 0.48 ? "warning" : "steady";
    const breachTier = `breach-${clamp(state.breaches, 0, 3)}`;
    return `
      <div class="game-scene cruise-scene phaser-cruise-shell room-combat-shell event-${state.sceneEvent || "idle"} threat-${threat?.type || "none"} pressure-${pressureTier} ${breachTier}" style="${sceneStyle};" data-event="${state.sceneNonce}" data-target="${state.currentTarget}" aria-label="巡航防线拦截战斗场景">
        <div id="cruise-phaser-stage" class="phaser-stage" aria-hidden="true"></div>
        ${renderCombatReadouts()}
        ${renderDeathOverlay()}
      </div>
    `;
  }

  const transition = state.roomTransition;
  const pattern = transition?.toEncounter?.pattern || getCurrentPattern();
  const encounter = transition?.toEncounter || getStrikeEncounter();
  const room = getStrikeRoomTheme(encounter.roomId || encounter.waveIndex || 0);
  const pressureTier = state.monsterPressure >= 72 ? "danger" : state.monsterPressure >= 46 ? "warning" : "steady";
  const breachTier = `breach-${clamp(state.breaches, 0, 3)}`;
	  return `
	    <div class="game-scene strike-scene phaser-strike-shell room-combat-shell room-${room.id} ${eventClass} encounter-${encounter.modifier.id} lane-${encounter.lane} pressure-${pressureTier} ${breachTier}" style="${sceneStyle}; --monster-pressure: ${state.monsterPressure}%;" data-event="${state.sceneNonce}" data-pattern="${pattern.join(",")}" data-target="${state.currentTarget}" data-step="${state.pathStep}" aria-label="机械臂清障房间战斗场景">
	      <div id="strike-phaser-stage" class="phaser-stage" aria-hidden="true"></div>
	      ${renderCombatReadouts()}
	      ${renderDeathOverlay()}
	    </div>
	  `;
}

function renderDeathOverlay() {
  if (state.status !== "dead") return "";
  return `
    <div class="death-overlay" aria-hidden="true">
      <strong>K-01 OFFLINE</strong>
      <span>机体耐久归零</span>
    </div>
  `;
}

function renderHullAlert() {
  if (!isHullAlertVisible()) return "";
  const critical = state.hullAlertLevel === "critical";
  const breachesLeft = Math.max(1, Math.ceil(state.hull / HULL_DAMAGE_PER_BREACH));
  return `
    <div class="hull-alert ${critical ? "critical" : ""}" aria-live="polite">
      <small>${critical ? "FINAL HULL WARNING" : "LOW HULL"}</small>
      <strong>${state.hull}%</strong>
      <span>${critical ? "下一次破舱可能失联" : `约 ${breachesLeft} 次破舱后失联`}</span>
    </div>
  `;
}

function renderStoryLayer(pattern = null, encounter = null) {
  const wave = getWaveProgress();
  const nodes = state.level.waves.map((_, index) => `
    <i class="${index < wave.index ? "done" : ""} ${index === wave.index ? "active" : ""}"></i>
  `).join("");

  if (state.level.mode === "home") {
    return `
      <div class="story-layer home-story wave-${wave.index}" aria-hidden="true">
        <div class="story-gate">${nodes}</div>
        <div class="diagnostic-drones"><i></i><i></i><i></i></div>
        <div class="anchor-sync left ${state.leftLocked || state.status === "playing" ? "locked" : ""}"></div>
        <div class="anchor-sync right ${state.rightLocked || state.status === "playing" ? "locked" : ""}"></div>
      </div>
    `;
  }

  const dangerCount = clamp(Math.ceil(state.monsterPressure / 24), 0, 5);
  const lamps = Array.from({ length: 5 }).map((_, index) => `<i class="${index < dangerCount ? "hot" : ""}"></i>`).join("");
  return `
    <div class="story-layer strike-story path-${state.pathStep} ${encounter ? `mod-${encounter.modifier.id}` : ""}" aria-hidden="true">
      <div class="story-gate strike-gate">${nodes}</div>
      <div class="danger-lamps">${lamps}</div>
      <div class="comic-burst"><i></i><i></i><i></i><b></b></div>
      <div class="route-ghost">
        ${pattern ? pattern.map((_, index) => `<i class="${index < state.pathStep ? "done" : ""} ${index === state.pathStep ? "active" : ""}"></i>`).join("") : ""}
      </div>
    </div>
  `;
}

function renderRoomSetPieces(room, encounter) {
  const label = `${room.name} / ${encounter.modifier.label}`;
  if (room.id === "gate") {
    return `
      <div class="room-set room-gate-set" aria-hidden="true">
        <div class="blast-door left"></div>
        <div class="blast-door right"></div>
        <div class="room-name">${label}</div>
        <div class="floor-stripes"><i></i><i></i><i></i></div>
      </div>
    `;
  }

  if (room.id === "pipe") {
    return `
      <div class="room-set room-pipe-set" aria-hidden="true">
        <div class="pipe pipe-top"></div>
        <div class="pipe pipe-back"></div>
        <div class="acid-pool"><i></i><i></i><i></i></div>
        <div class="room-name">${label}</div>
      </div>
    `;
  }

  if (room.id === "nest") {
    return `
      <div class="room-set room-nest-set" aria-hidden="true">
        <div class="wall-claw c1"></div>
        <div class="wall-claw c2"></div>
        <div class="egg-sacs"><i></i><i></i><i></i></div>
        <div class="room-name">${label}</div>
      </div>
    `;
  }

  return `
    <div class="room-set room-core-set" aria-hidden="true">
      <div class="core-orb"><i></i></div>
      <div class="core-rings"><i></i><i></i><i></i></div>
      <div class="room-name">${label}</div>
    </div>
  `;
}

function renderIntentSigil(encounter) {
  const glyphs = {
    rush: "≫",
    shield: "⬡",
    glitch: "▦",
    split: "◇"
  };
  const id = encounter?.modifier?.id || "rush";
  return `
    <div class="intent-sigil sigil-${id}" aria-hidden="true">
      <i></i>
      <span>${glyphs[id]}</span>
    </div>
  `;
}

function renderBreachDamage() {
  if (!state.breaches && state.monsterPressure < 72) return "";
  const cracks = Array.from({ length: clamp(state.breaches, 1, 6) }).map((_, index) => `<i class="crack-${index + 1}"></i>`).join("");
  return `
    <div class="breach-damage ${state.breaches >= 3 ? "severe" : ""}" aria-hidden="true">
      ${cracks}
      <span class="breach-warning">${state.breaches ? "HULL BREACH" : "PROXIMITY ALERT"}</span>
    </div>
    <div class="monster-proximity-line" aria-hidden="true"></div>
  `;
}

function renderEncounterHazards(encounter) {
  return `
    <div class="hazard-lane ${encounter.modifier.id}" aria-hidden="true">
      <span></span><span></span><span></span>
    </div>
    <div class="pressure-vignette" aria-hidden="true"></div>
  `;
}

function renderMonsterEchoes(encounter) {
  if (encounter.modifier.id !== "split" && encounter.modifier.id !== "glitch") return "";
  return `
    <div class="monster-echoes" aria-hidden="true">
      <i></i><i></i>
    </div>
  `;
}

function renderSceneDepth() {
  return `
    <div class="tunnel-depth" aria-hidden="true">
      <span></span><span></span><span></span><span></span><span></span>
    </div>
    <div class="tunnel-floor" aria-hidden="true"></div>
    <div class="pollution-fog" aria-hidden="true"></div>
  `;
}

function renderRobotSprite(variant = "") {
  const k01Image = getK01ConceptImage();
  if (k01Image) {
    return `
      <div class="robot-sprite ${variant} robot-sprite-image" aria-hidden="true">
        ${imageMarkup(k01Image, "robot-image")}
        <span class="robot-image-glow"></span>
      </div>
    `;
  }
  return `
    <div class="robot-sprite ${variant}" aria-hidden="true">
      <div class="robot-antenna"></div>
      <div class="robot-head">
        <i></i><i></i>
      </div>
      <div class="robot-neck"></div>
      <div class="robot-body">
        <span></span>
      </div>
      <div class="robot-arm left"></div>
      <div class="robot-arm right"></div>
      <div class="robot-leg left"></div>
      <div class="robot-leg right"></div>
    </div>
  `;
}

function getMonsterKind(name) {
  if (name.includes("僵尸")) return "zombie";
  if (name.includes("虫")) return "bug";
  if (name.includes("爬行")) return "crawler";
  if (name.includes("侧墙")) return "wall";
  if (name.includes("残影")) return "shadow";
  return "drift";
}

function renderMonsterSprite(name, variant = "") {
  const monsterImage = getMonsterPreviewImage(name);
  if (monsterImage) {
    return `
      <div class="monster-sprite ${variant} ${getMonsterKind(name)} monster-sprite-image" aria-hidden="true">
        ${imageMarkup(monsterImage, "monster-image")}
        <strong>${name}</strong>
      </div>
    `;
  }
  return `
    <div class="monster-sprite ${variant} ${getMonsterKind(name)}" aria-hidden="true">
      <div class="monster-horns"><i></i><i></i></div>
      <div class="monster-core">
        <span class="monster-eye left"></span>
        <span class="monster-eye right"></span>
        <span class="monster-mouth"></span>
      </div>
      <strong>${name}</strong>
    </div>
  `;
}

function renderHomeStations() {
  return `
    <div class="home-stations scene-stations" aria-label="中排基准位校准节点">
      ${HOME_KEYS.map((key) => {
        const charge = state.chargedKeys[key] || 0;
        const active = key === state.currentTarget;
        const anchor = key === "f" || key === "j";
        return `
          <div class="station ${charge ? "charged" : ""} ${active ? "active" : ""} ${anchor ? "anchor-station" : ""}">
            <span>${formatKey(key)}</span>
            <small>${charge ? `预检 ${charge}` : anchor ? "主锚" : "待检"}</small>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderStrikeRoute(pattern) {
  return `
    <div class="strike-route">
      ${pattern.map((key, index) => `
        <span class="${index < state.pathStep ? "done" : ""} ${index === state.pathStep ? "current" : ""}">
          ${formatKey(key)}
        </span>
      `).join("")}
    </div>
  `;
}

function renderSceneCommand(pattern = null, encounter = null) {
  const guide = getCurrentFingerGuide();
  const route = pattern
    ? `<div class="command-route">${pattern.map((key, index) => `<span class="${index === state.pathStep ? "current" : index < state.pathStep ? "done" : ""}">${formatKey(key)}</span>`).join("")}</div>`
    : "";
  const encounterLine = encounter ? `<em>${getEncounterRuleLabel(encounter)} / ${getEncounterRuleHint(encounter)}</em>` : "";
  const fingerLine = guide ? `<mark>${guide.hand}${guide.finger}负责</mark>` : "";
  return `
    <div class="scene-command">
      <small>${state.level.mode === "home" ? "预检键位" : "当前输入"}</small>
      <strong>${formatKey(state.currentTarget)}</strong>
      <span>${getTargetCaption()}</span>
      ${fingerLine}
      ${encounterLine}
      ${route}
    </div>
  `;
}

function getTargetCaption() {
  if (state.level.mode === "home") {
    if (state.currentTarget === "f") return "左手食指锚点";
    if (state.currentTarget === "j") return "右手食指锚点";
    return "中排神经底座预检";
  }

  if (state.level.mode === "cruise") {
    const threat = getCurrentCruiseThreat();
    const guide = getCurrentFingerGuide();
    if (!threat) return "防线巡航完成";
    if (threat.type === "anchor") return `${formatKey(threat.key)} 基准位脉冲`;
    return `${guide ? `${guide.hand}${guide.finger}` : "当前手指"}拦截 ${threat.laneLabel}`;
  }

  const pattern = getCurrentPattern();
  const guide = getCurrentFingerGuide();
  const finger = guide ? `${guide.hand}${guide.finger}` : "";
  if (state.pathStep === 0) return `${formatKey(pattern[0])} ${finger ? `${finger}基地确认` : "基地确认"}`;
  if (isStrikeReturnStep(pattern, state.pathStep)) return `${finger || "机械臂"}收回 ${formatKey(pattern[state.pathStep])}`;
  return `${finger || "机械臂"}${state.pathStep > 1 ? "补击" : "出击"}到 ${formatKey(pattern[state.pathStep])}`;
}

function renderVitals() {
  return `
    <div class="vitals">
      ${renderMeter("ENERGY", state.energy, "energy")}
      ${renderMeter("SHIELD", state.shield, "shield")}
      ${renderMeter("HULL", state.hull, state.hull <= LOW_HEALTH_THRESHOLD ? "hull low" : "hull")}
      ${renderMeter("POLLUTION", state.corruption, "pollution")}
    </div>
  `;
}

function renderMeter(label, value, type) {
  return `
    <div class="meter ${type}" aria-label="${label} ${value}%">
      <div class="meter-top"><span>${label}</span><span>${value}%</span></div>
      <div class="meter-track"><div class="meter-fill" style="--meter-width: ${value}%"></div></div>
    </div>
  `;
}

function renderKeyboardPanel() {
  const guide = getCurrentFingerGuide();
  return `
    <aside class="keyboard-panel">
      <div class="keyboard-title">
        <span>LOCAL KEYBOARD</span>
        <span>${state.feedbackType === "drift" ? "DRIFT LEFT" : "HOME ROW ACTIVE"}</span>
      </div>
      <div class="keyboard">
        ${KEYBOARD_ROWS.map((row, index) => renderKeyRow(row, index)).join("")}
      </div>
      <div class="finger-map">
        <div class="finger-card"><small>左手基地</small><strong>A S D F</strong></div>
        <div class="finger-card"><small>右手基地</small><strong>J K L ;</strong></div>
        <div class="finger-card"><small>左手出击</small><strong>Q W E R / Z X C V</strong></div>
        <div class="finger-card"><small>右手出击</small><strong>U I O P / M , .</strong></div>
      </div>
    </aside>
  `;
}

function renderCommsPanel() {
  const wave = getWaveProgress();
  const encounter = state.level.mode === "strike" ? getStrikeEncounter() : null;
  const channel = state.level.mode === "home" ? "预检频道" : "战斗频道";
  return `
    <div class="comms-panel">
      <div class="comms-head">
        <span>${channel}</span>
        <strong>${encounter ? `${wave.name} / ${encounter.monster} / ${encounter.modifier.label}` : wave ? `${wave.name} / ${wave.monster || state.level.monster}` : "开舱锁"}</strong>
      </div>
      ${encounter ? `<p class="pressure-line">威胁 ${state.monsterPressure}% · ${getEncounterRuleHint(encounter)}</p>` : ""}
      ${state.eventLog.map((item) => `<p>${item}</p>`).join("")}
    </div>
  `;
}

function renderKeyRow(row, index) {
  const rowClass = index === 1 ? "home" : index === 2 ? "bottom" : "top";
  return `
    <div class="key-row ${rowClass}">
      ${row.map(renderKeycap).join("")}
    </div>
  `;
}

function renderKeycap(key) {
  const guide = getCurrentFingerGuide();
  const fingerZone = guide?.keys.includes(key);
  const fingerHome = guide?.home === key;
  const classes = [
    "keycap",
    HOME_KEYS.includes(key) ? "home-key" : "",
    key === "f" || key === "j" ? "anchor" : "",
    fingerZone ? `finger-zone finger-${guide.id}` : "",
    fingerHome ? "finger-home" : "",
    state?.currentTarget === key ? "target" : "",
    pressedKey === key && flashType === "ok" ? "pressed-ok" : "",
    pressedKey === key && flashType === "bad" ? "pressed-bad" : ""
  ].filter(Boolean).join(" ");
  const style = fingerZone ? ` style="--finger-color: ${guide.color}"` : "";

  return `<div class="${classes}"${style}>${formatKey(key)}</div>`;
}

function renderResult() {
  const result = state?.result;
  if (!result) return "";
  const targetLabel = state.level.mode === "home" ? "预检节点" : state.level.mode === "cruise" ? "巡航威胁" : "清障链路";
  const resultTitle = result.reason === "death"
    ? `${state.level.index} ${state.level.title} 任务报告：失联`
    : result.reason === "timeout"
      ? `${state.level.index} ${state.level.title} 任务报告：未完成`
      : `${state.level.index} ${state.level.title} 任务报告`;
  const resultReason = result.reason === "death"
    ? "K-01 耐久归零"
    : result.reason === "timeout"
      ? "时间结束，目标未达成"
      : "训练目标完成";
  const lootTitle = result.partsEarned.length
    ? result.partsEarned.join(" / ")
    : result.reason === "death"
      ? "机体失联，本局无掉落"
      : result.reason === "timeout"
        ? "任务未完成，本局无掉落"
        : "获得污染样本 x1";
  const lootHint = result.partsEarned.length
    ? "已写入本地机体仓库，返回主界面可查看。"
    : result.reason === "death"
      ? "低血量后继续破舱会导致死亡，建议放慢节奏重新出击。"
      : result.reason === "timeout"
        ? "先完成目标数量，才会结算任务奖励。"
        : "基础记录已保存。";
  const pathMetric = state.level.mode === "strike"
    ? renderMetric("机械臂闭环稳定率", `${result.pathCompleteRate}%`)
    : state.level.mode === "cruise"
      ? renderMetric("巡航拦截率", `${result.cruiseInterceptRate ?? result.pathCompleteRate}%`)
      : renderMetric("归位稳定度", result.stability);
  const hullDamage = 100 - (result.hullRemaining ?? 100);
  const nextLabel = state.level.id === "level-01-home" ? "进入 02 清障" : state.level.id === "level-02-strike" ? "进入 03 巡航" : "再巡航一次";
  const nextLevelId = state.level.id === "level-01-home" ? "level-02-strike" : state.level.id === "level-02-strike" ? "level-03-cruise" : "level-03-cruise";

  return `
    <section class="result-wrap ${result.reason === "death" ? "death-result" : ""}" style="${sceneBackgroundStyle("reportChamber")}">
      ${sceneImageMarkup("reportChamber", "report-scene-bg")}
      <div class="result-panel">
        <div class="result-heading">
          <div>
            <h2>${resultTitle}</h2>
            <p>${resultReason} · ${new Date(result.playedAt).toLocaleString("zh-CN")}</p>
          </div>
          <div class="stars">${"★".repeat(result.stars)}${"☆".repeat(3 - result.stars)}</div>
        </div>
        <div class="result-body">
          <div class="result-grid">
            ${renderMetric(targetLabel, result.targets)}
            ${renderMetric("神经命中率", `${result.accuracy}%`)}
            ${renderMetric("最高神经同步链", result.maxCombo)}
            ${renderMetric("旧坐标复发", result.homeDriftCount)}
            ${pathMetric}
            ${renderMetric("清除怪物", result.monstersCleared)}
            ${state.level.mode === "strike" ? renderMetric("清除房间", `${result.roomsCleared || 0}/5`) : ""}
            ${state.level.mode === "strike" ? renderMetric("核心状态", result.bossCleared ? "已压制" : "未压制") : ""}
            ${state.level.mode === "cruise" ? renderMetric("超时命中", result.cruiseTimeouts || 0) : ""}
            ${state.level.mode === "cruise" ? renderMetric("基准脉冲", result.cruiseAnchorPulses || 0) : ""}
            ${state.level.mode === "cruise" ? renderMetric("防线波次", `${Math.min((result.cruiseWaveClears || 0) + 1, state.level.waves.length)}/${state.level.waves.length}`) : ""}
            ${renderMetric("护盾余量", `${result.shieldRemaining}%`)}
            ${renderMetric("机体损伤", `${hullDamage}%`)}
            ${renderMetric("破舱记录", result.breaches || 0)}
            ${renderMetric("污染读数", `${result.corruption}%`)}
            ${renderMetric("任务时长", `${result.duration}s`)}
          </div>
          <div class="recommend">${getRecommendation(result)}</div>
          <p class="weak-list">不稳定管线：${result.weakKeys.length ? result.weakKeys.join(" / ") : "本局没有明显弱点"}</p>
          <div class="loot-box">
            <small>回收零件</small>
            <strong>${lootTitle}</strong>
            <span>${lootHint}</span>
          </div>
        </div>
        <div class="control-row result-actions">
          <button class="btn primary" type="button" data-restart="${state.level.id}">重进本房</button>
          <button class="btn" type="button" data-start-level="${nextLevelId}">${nextLabel}</button>
          <button class="btn" type="button" data-stop>查看仓库预览</button>
        </div>
      </div>
    </section>
  `;
}

function renderMetric(label, value) {
  return `
    <div class="result-metric">
      <small>${label}</small>
      <strong>${value}</strong>
    </div>
  `;
}

function getRecommendation(result) {
  if (result.reason === "death") return state.level.mode === "cruise"
    ? "任务建议：防线崩溃前检测到连续超时或错键。下一局先盯中央目标键，宁可慢半拍也别让手掌整体漂移。"
    : "任务建议：机体失联前检测到连续控制失败。下次进入低血量后先慢下来，优先完成回家闭环。";
  if (result.reason === "timeout") return state.level.mode === "cruise"
    ? `任务建议：本局只拦截 ${result.targets} 个威胁。下一局先守住中央目标键和倒计时环。`
    : `任务建议：本局只完成 ${result.targets} 个节点。下一局先盯住中央目标键，慢一点也要让清障链路闭合。`;
  if (result.homeDriftCount > 8) return "任务建议：旧坐标接管频繁。建议回到战前预检，把 F/J 主锚重新压稳。";
  if (state.level.mode === "cruise" && (result.cruiseTimeouts || 0) > 8) return "任务建议：防线超时命中过多。先放慢目标扫描节奏，看到中央键后再让对应手指出击。";
  if (state.level.mode === "cruise" && (result.cruiseInterceptRate || result.pathCompleteRate || 0) < 82) return "任务建议：巡航拦截率偏低。重点练左右手连续切换，但每次按完都回到中排基准。";
  if (state.level.mode === "strike" && result.pathCompleteRate < 85) return "任务建议：机械臂闭环不稳定。重点训练“命中不是结束，收臂才算清除”。";
  if (result.accuracy < 90) return "任务建议：神经命中率偏低。降低节奏，确认每次出击都从基地发起。";
  if (result.stars >= 3) return "K-01 同步良好，旧坐标污染被压住了。可以继续下一节点。";
  return "任务建议：再进一次本房，把闭环稳定率推到 90% 以上，争取回收更多装备零件。";
}

function iconBolt() {
  return `
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    </svg>
  `;
}

document.addEventListener("keydown", handleKeydown);

function forceDebugTimeLeft(seconds = 1) {
  if (!state) return false;
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  state.endsAt = Date.now() + safeSeconds * 1000;
  state.timeLeft = Math.ceil(safeSeconds);
  return true;
}

function forceDebugCruiseDeadline(ms = 120) {
  if (!state || state.level?.mode !== "cruise") return false;
  const safeMs = Math.max(0, Number(ms) || 0);
  if (!state.threatStartedAt) maybeBeginCruiseThreat(state);
  state.threatDeadlineAt = Date.now() + safeMs;
  return true;
}

function forceDebugHullDamage(hullLoss = 80) {
  if (!state || state.level?.mode === "home") return false;
  const threat = getCurrentCruiseThreat(state);
  applyGlobalHullDamage({
    forceBreach: true,
    shieldLoss: 100,
    hullLoss: Math.max(1, Number(hullLoss) || 1),
    corruptionGain: 0,
    breachEvent: () => {
      if (state.level?.mode === "cruise") queueCruiseCombatEvent("shield-break", { threat: threat ? { ...threat } : null, hull: state.hull });
      else triggerScene("breach");
    },
    deathEvent: () => {
      if (state.level?.mode === "cruise") queueCruiseCombatEvent("death", { threat: threat ? { ...threat } : null });
      else triggerScene("death");
    },
    lowEvent: () => {
      if (state.level?.mode === "cruise") queueCruiseCombatEvent("low-health", { hull: state.hull, shield: state.shield });
      else triggerScene("low-health");
    },
    sound: { breach: "shield_block", low: "low", death: "death" },
    messages: {
      breach: () => `DEBUG 破口：机体耐久 ${state.hull}%`,
      low: () => `DEBUG 低血量：机体耐久 ${state.hull}%`,
      critical: () => `DEBUG 最终警报：机体耐久 ${state.hull}%`,
      death: "DEBUG 机体失联",
      deathLog: "DEBUG 死亡回归触发。"
    }
  });
  render();
  return true;
}

function scheduleDebugDeferredComplete(ms = 120) {
  if (!state) return 0;
  scheduleDeferredFinish("complete", Math.max(0, Number(ms) || 0));
  return state.runId || 0;
}

function getDebugState() {
  return {
    view,
    status: state?.status || "",
    runId: state?.runId || 0,
    hull: state?.hull ?? 0,
    shield: state?.shield ?? 0,
    hullAlertVisible: isHullAlertVisible(),
    hullAlertLevel: state?.hullAlertLevel || "",
    completedActions: state?.completedActions || 0,
    completedTargets: state?.completedTargets || 0,
    targetActions: state?.level?.targetActions || 0,
    currentTarget: state?.currentTarget || "",
    pathStep: state?.pathStep || 0,
    missionClearing: Boolean(state?.missionClearing),
    inputLockedRemaining: state?.inputLockedUntil ? Math.max(0, state.inputLockedUntil - Date.now()) : 0,
    resultReason: state?.result?.reason || "",
    deferredFinishPending: finishLifecycle.pending(),
    audio: audioDirector.getDebugState(),
    currentPattern: state ? getCurrentPattern(state) : [],
    cruiseQueue: (state?.cruiseQueue || []).map((threat) => ({
      key: threat.key,
      guideId: threat.guideId,
      side: threat.side,
      row: threat.row,
      type: threat.type,
      homePulse: Boolean(threat.homePulse),
      waveIndex: threat.waveIndex,
      deadlineMs: threat.deadlineMs,
      roundIndex: threat.roundIndex,
      roundStep: threat.roundStep,
      roundSize: threat.roundSize
    })),
    cruise: state?.level?.mode === "cruise" ? {
      threatIndex: state.threatIndex,
      deadlineRemaining: Math.max(0, state.threatDeadlineAt - Date.now()),
      intercepts: state.cruiseIntercepts,
      timeouts: state.cruiseTimeouts,
      misses: state.cruiseMisses,
      roundInfo: getCruiseRoundInfo(state),
      roundThreats: getCruiseRoundThreats(state).map((threat) => ({
        id: threat.id,
        key: threat.key,
        type: threat.type,
        homePulse: Boolean(threat.homePulse),
        lane: threat.lane,
        roundStep: threat.roundStep,
        roundSize: threat.roundSize
      }))
    } : null,
    strikeQueue: (state?.strikeQueue || []).map((encounter) => ({
      roomId: encounter.roomId,
      roomLocalIndex: encounter.roomLocalIndex,
      pattern: encounter.pattern,
      basePattern: encounter.basePattern,
      guideId: getFingerGuideForPattern(encounter.basePattern || encounter.pattern)?.id || "unknown",
      modifierId: encounter.modifier?.id || ""
    }))
  };
}

window.KeyPilotDebugBridge?.install({
  forceTimeLeft: forceDebugTimeLeft,
  forceCruiseDeadline: forceDebugCruiseDeadline,
  forceHullDamage: forceDebugHullDamage,
  scheduleDeferredComplete: scheduleDebugDeferredComplete,
  getDebugState
});

app.addEventListener("click", (event) => {
  const start = event.target.closest("[data-start-level]");
  const restart = event.target.closest("[data-restart]");
  const stop = event.target.closest("[data-stop]");
  const skipCalibration = event.target.closest("[data-skip-calibration]");
  const toggleSound = event.target.closest("[data-toggle-sound]");
  const toggleMusic = event.target.closest("[data-toggle-music]");
  const toggleVolume = event.target.closest("[data-toggle-volume]");
  const toggleFullscreen = event.target.closest("[data-toggle-fullscreen]");

  if (toggleFullscreen) {
    toggleFullscreenMode();
    return;
  }
  if (toggleSound) {
    audioDirector.toggleSound();
    syncAudioToggleButtons();
    if (!isRoomCombatLive() && !isCruiseCombatLive()) render();
    return;
  }
  if (toggleMusic) {
    audioDirector.toggleMusic();
    syncAudioToggleButtons();
    if (!isRoomCombatLive() && !isCruiseCombatLive()) render();
    return;
  }
  if (toggleVolume) {
    audioDirector.cycleVolume();
    syncAudioToggleButtons();
    if (!isRoomCombatLive() && !isCruiseCombatLive()) render();
    return;
  }
  if (start) startLevel(start.dataset.startLevel);
  if (restart) startLevel(restart.dataset.restart);
  if (skipCalibration) skipStrikeCalibration();
  if (stop) stopToMenu();
});

render();

async function toggleFullscreenMode() {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {
    pushEvent("浏览器没有允许进入全屏，可以用系统快捷键全屏窗口。");
  }
}
