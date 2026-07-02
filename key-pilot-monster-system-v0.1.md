# Key Pilot Monster System v0.1

## 目的

怪物不是随机装饰，而是 Key Pilot 的训练语法。每个怪物必须回答四个问题：

- 它对应哪一种错误肌肉记忆或训练压力？
- 它在画面里是活体、固定装置、飞行弹体，还是异常现象？
- 玩家按对、按错、超时、低血量时，它如何表现？
- 它需要哪些独立资产，不能靠线条、方块或临时贴图补位？

如果一个怪物不能回答这些问题，就不能进入主流程。

## 分类原则

### Creature / 活体威胁

会主动移动、爬行、扑击或撞盾。它们可以靠近 K-01，也可以被击退、受击、死亡。

适用：02 房间怪、03 中后段扑脸怪。

### Device / 固定装置

固定在墙面、管线、闸门、炮座上。它们可以瞄准、充能、开火，但不能整只飞向玩家。

适用：03 炮台、门框炮口、管线喷口。

### Projectile / 飞行弹体

真正从装置或裂缝中飞向 K-01 的攻击物。它们是 03 防线拦截的主角。

适用：污染弹体、重弹、激光脉冲、飞梭。

### Anomaly / 异常污染

不是普通实体，而是旧坐标污染、偏左残影、键位噪声。它们表现肌肉记忆复发和坐标错位。

适用：01 偏左残影、02 分裂/闪断、03 后期旧坐标干扰。

## 当前资产盘点

### 01 战前预检

#### 偏左残影

- 类型：Anomaly
- 训练意义：整手坐标偏左，尤其是 F/J 锚点没有归位。
- 当前用途：01 的开舱锁、偏移反馈。
- 视觉行为：红色旧坐标区域、左偏残影、污染上升。
- 资产状态：目前不是独立 sprite，更多是场景/VFX 表现。
- 后续建议：保留为异常效果，不要做成普通怪物。

#### 错位虫群

- 类型：Anomaly + Creature 候选
- 训练意义：中排八键连续点亮时手位漂移。
- 当前用途：01 波次文案。
- 资产状态：没有独立 01 sprite。
- 后续建议：如果以后 01 需要更强游戏感，可做成细小污染虫在神经底座旁爬动，但第一优先级仍是目标键可读。

### 02 机械臂清障

02 是“闭环动作”关卡。这里的怪物必须站在房间中，等待 K-01 完成 `基地键 -> 目标键 -> 回家键`，命中但未回家不能死亡。

#### 漂移僵尸 / driftZombie

- 类型：Creature
- 训练意义：标准三步闭环，建立出击-命中-回家的基础爽感。
- 行为：缓慢逼近，受击硬直，回家后死亡。
- 资产：`assets/monsters/drift_zombie_sheet_approved_v04.png`
- 状态：approved。

#### 铁皮行尸 / ironWalker

- 类型：Creature
- 训练意义：装甲二连，要求玩家保持闭环稳定，不因第一次命中就放松。
- 行为：第一次完整闭环裂甲，第二次完整闭环死亡。
- 资产：`assets/monsters/iron_walker_sheet_approved_v04.png`
- 状态：approved。

#### 分裂残影 / splitPhantom

- 类型：Anomaly + Creature
- 训练意义：同一手指上下目标切换，防止命中后忘记回家。
- 行为：第一次命中后出现残影分裂，回家后继续处理。
- 资产：`assets/monsters/split_phantom_sheet_approved_v04.png`
- 状态：approved。

#### 突进感染体 / rushCrawler

- 类型：Creature
- 训练意义：错键压力。玩家一错，它就明显逼近。
- 行为：错键突进，低血量时压迫增强。
- 资产：`assets/monsters/rush_crawler_sheet_approved_v04.png`
- 状态：approved。

#### 旧坐标核心 / oldCoordinateCore

- 类型：Boss + Anomaly
- 训练意义：综合测试闭环、装甲、分裂、突进和旧坐标污染。
- 行为：多阶段破裂、污染增强、最终死亡。
- 资产：`assets/monsters/old_coordinate_core_sheet_approved_v04.png`
- 状态：approved。

### 03 巡航防线

03 是“连续多手指巡航”关卡。它不应该复用 02 的大怪靠近逻辑。03 的画面主体应该是防线、炮口、弹体、虫群、突击小怪，而不是大炮台飞过来。

#### 污染炮台

- 类型：Device
- 训练意义：提供方向压力和节奏压力。
- 正确行为：炮台固定在墙边或管线口，充能后发射弹体。
- 错误行为：错键时炮台充能加快或连续开火。
- 禁止行为：炮台本体不能飞向 K-01。
- 当前资产：`cruise_threats_sheet_approved_v07.png` 第 1 行更像炮台本体。
- v0.9 规则：炮台只作为固定设备显示，移动对象必须是小型弹体。
- 后续资产需求：固定炮台/炮口 sprite，独立于飞行弹体。

#### 污染弹体

- 类型：Projectile
- 训练意义：最基础的反应拦截，适合 03 前期。
- 行为：从炮口/管线口飞出，后段加速，按对时半路爆裂，超时时撞盾。
- 当前资产：`cruise_threats_sheet_approved_v07.png` 第 3 行可作为弹体基础。
- v0.9 规则：弹体必须小、快、稳定，使用 `telegraph -> launch -> terminal -> impact` 弹道，不允许蛇形晃动或角色级缩放。
- 后续资产需求：更小、更细长、更有速度感的弹体帧；尾焰和撞盾 VFX。

#### 机械虫群

- 类型：Creature
- 训练意义：连续字符压力，尤其是中段多手指切换。
- 行为：3-5 个小单位从地缝钻出，蛇形靠近，按对时一串爆裂。
- 当前资产：`cruise_threats_sheet_approved_v07.png` 第 2 行像大型机械虫，不适合直接整只平移。
- v0.9 规则：虫群只能以多只小单位出现，使用 `emerge -> crawl -> lunge -> splat` 动作，不再整张大图平移。
- 后续资产需求：小型虫群 sprite 或同一 sprite 的多实例缩放，不要一只大虫贴脸。

#### 突击无人机

- 类型：Creature / Projectile 混合
- 训练意义：后期紧迫感，长串中的高压目标。
- 行为：短暂左右锁定，随后直线冲撞护盾。
- 当前资产：缺失。
- 后续资产需求：新增小型无人机 sprite，动作包含 idle、lock、dash、explode。

#### 旧坐标残波

- 类型：Anomaly
- 训练意义：旧手位复发、偏左错位、节奏干扰。
- 行为：不以实体怪物形式扑脸，而是地板网格偏移、目标通道污染、K-01 被拖拽。
- 当前资产：可复用 drift VFX，但 03 需要更轻，不遮挡目标键。

## 03 下一版怪物体系

03 不再使用一个 `threats` sheet 同时代表炮台、虫群和弹体。应该拆成四组资产：

```text
assets/monsters/cruise/devices/
assets/monsters/cruise/projectiles/
assets/monsters/cruise/creatures/
assets/vfx/cruise/
```

### 必须新增或重做的资产

#### fixed_turret_sheet_v01.png

- 类型：Device
- 帧：idle / aim / charge / fire
- 位置：墙面、闸门、管线口
- 用途：固定开火源，不移动。

#### pollution_bolt_sheet_v01.png

- 类型：Projectile
- 帧：spawn / fly / overdrive / impact
- 用途：前期主威胁，飞向护盾，被拦截或撞盾。

#### crawler_swarm_sheet_v01.png

- 类型：Creature
- 帧：emerge / crawl / leap / death
- 用途：中期扑脸威胁，用多实例形成虫群。

#### rammer_drone_sheet_v01.png

- 类型：Creature / Projectile
- 帧：hover / lock / dash / explode
- 用途：后期高压突击目标。

#### shield_impact_vfx_v01.png

- 类型：VFX
- 帧：smallHit / heavyHit / crack / pollutionSplat
- 用途：超时、低血量、错键后果。

## 训练映射

| 训练压力 | 推荐怪物 | 表现 |
| --- | --- | --- |
| 单键反应 | 污染弹体 | 快速飞来，按对半路爆裂 |
| 多手指连续 | 机械虫群 | 多个小单位接力扑来 |
| 长串压迫 | 炮台 + 重弹 | 固定炮台开火，重弹撞盾 |
| 错键惩罚 | 突击无人机 / 突进感染体 | 错键后短距离突进 |
| 旧坐标复发 | 旧坐标残波 | 地板偏移、污染、拖拽 |
| Boss 综合 | 旧坐标核心 | 多阶段污染和混合威胁 |

## 实现约束

- 炮台本体永远不移动到 K-01 面前。
- 活体怪必须有身体动作，不能只是整张图平移。
- 飞行弹体必须小、快、有尾迹，不能像大型角色漂移。
- 队列威胁只能在边缘管线轻微露出，不能在场中央堆积。
- 当前目标键和字符串始终优先于怪物特效。
- 任何新怪物进入主流程前，manifest 必须标注 `taxonomy`、`role`、`quality`、`frameWidth`、`frameHeight`、`states`。

## 对抗性验收

如果截图停在任意一帧，观众应该能分辨：

- 哪个是固定炮台；
- 哪个是飞来的攻击物；
- 哪个是活体怪；
- 哪个是异常污染；
- K-01 正在防御还是反击；
- 当前应该按哪个键。

如果还需要靠文字解释“这是怪物扑过来了”，就视为失败。
