# Key Pilot 美术与音频规范 v0.7

## 1. 文档目的

本文档承接 `key-pilot-visual-bible-v0.2.md`，把 MVP 结束后的实际实现沉淀成后续关卡的统一标准。它不是重新定义世界观，而是规定后续所有关卡、资产、UI、动效和音频都必须如何保持一致。

当前 Key Pilot 已经完成 01 战前预检、02 机械臂清障、桌面版、单文件版、便携 zip 和基础 BGM/SFX。下一步将进入 03 巡航防线。03 会引入多手指连续输入和限时压力，因此必须先锁定风格边界，避免把游戏做成普通反应打字器或杂乱弹幕游戏。

## 2. 当前产品基准

Key Pilot 的核心体验是：玩家驾驶 K-01 进入被旧坐标污染的地下键境，通过正确盲打重新夺回身体控制权。

已成立的基准：

- 视觉基调：地下赛博、机械污染、俯视 2D 房间、脏污金属、低亮度、高目标可读性。
- 角色基准：K-01 是神经作战机体，不是可爱机器人，也不是写实机甲。
- 怪物基准：怪物是错误肌肉记忆的实体化，不是普通敌人皮肤。
- UI 基准：目标键必须在视觉焦点区，右侧和底部只放辅助信息。
- 音频基准：BGM 负责持续氛围和节奏，SFX 负责按键和战斗反馈。
- 发行基准：桌面版优先，单文件 HTML 保留为备用，便携 zip 用于测试分发。

## 3. 视觉不变量

后续所有关卡都必须遵守以下不变量。

当前目标键永远是画面第一优先级。任何房间、怪物、弹幕、粒子、警报、剧情提示都不能遮挡或抢走当前目标键。

K-01 必须始终在主视觉中可识别。角色可以被打击、过载、拖拽、失联，但不能被大圈、文字或背景噪声遮住本体。

怪物必须表达训练机制。漂移僵尸表达忘记回家，突进感染体表达错键压力，03 的远程敌人必须表达“连续巡航中的目标威胁”，不能只是随机射子弹。

UI 必须是驾驶舱指令，而不是网页卡片。按钮、读数、状态条可以存在，但要融入房间边框、机体 HUD、墙体终端或底部驾驶舱面板。

房间必须有主题差异。不要只改标题或颜色。每个关卡至少有一个可一眼识别的空间装置，例如 02 的闸门、管道、巢穴、闪断、核心；03 应有巡航轨道、防线炮塔、弹道入口、护盾发生器或巡航信标。

## 4. 屏幕焦点规则

玩家打字时的视觉焦点在画面中心附近，不在右侧说明栏，也不在底部长文案。

主焦点区：

- 当前目标键。
- 当前威胁来源。
- K-01 与当前动作反馈。
- 03 中的倒计时环、弹道距离或防御窗口。

次焦点区：

- 连击、护盾、污染、房间进度。
- 下一个目标预告。
- 简短手指通道提示。

盲区：

- 右侧长说明。
- 左下角提示条。
- 复杂完整键盘图。
- 训练时需要阅读的长句。

设计结论：所有“必须马上理解”的信息都要进入主焦点区，且必须用视觉形态表达，不依赖文字说明。

## 5. 当前资产盘点

### 5.1 场景资产

已批准的全局场景：

- `assets/scenes/menu_node_hangar_approved_v03.png`：任务选择舱。
- `assets/scenes/preflight_chamber_approved_v03.png`：战前预检舱。
- `assets/scenes/calibration_chamber_approved_v03.png`：机械臂校准舱。
- `assets/scenes/report_chamber_approved_v03.png`：任务报告舱。

已批准的 02 房间：

- `assets/rooms/gate/room_gate_approved_v02.png`：闸门入口。
- `assets/rooms/pipe/room_pipe_approved_v02.png`：腐蚀管道。
- `assets/rooms/nest/room_nest_approved_v02.png`：侧墙巢穴。
- `assets/rooms/blackout/room_blackout_approved_v02.png`：闪断隧道。
- `assets/rooms/core/room_core_approved_v02.png`：旧坐标核心。

使用规则：03 可以复用 02 的地下房间语言，但需要新增巡航防线专属房间。不能只把 02 房间换个标题继续用。

### 5.2 角色和怪物资产

已批准的角色：

- `assets/characters/k01/k01_sheet_approved_v04.png`
- `assets/characters/k01/k01_preview_approved_v04.png`

已批准的怪物：

- `assets/monsters/drift_zombie_sheet_approved_v04.png`
- `assets/monsters/iron_walker_sheet_approved_v04.png`
- `assets/monsters/split_phantom_sheet_approved_v04.png`
- `assets/monsters/rush_crawler_sheet_approved_v04.png`
- `assets/monsters/old_coordinate_core_sheet_approved_v04.png`

使用规则：03 继续使用 K-01 v04。02 的突进感染体可以作为 03 压迫型敌人的基础，但 03 需要新增至少一种远程威胁敌人或炮台，避免视觉上像 02 续房。

### 5.3 VFX 和 UI 资产

已批准资产：

- `assets/vfx/vfx_combat_sheet_approved_v02.png`
- `assets/ui/target_hud_approved_v02.png`

03 需要新增或扩展的 VFX：

- 污染弹 projectile。
- 护盾拦截 spark。
- 限时倒计时 ring。
- 弹道预警 line。
- 巡航连击 pulse。
- 超时受击 impact。

03 需要新增或扩展的 UI：

- 中央目标键 + 倒计时环。
- 下一个目标小预告。
- 多手指巡航路径节点。
- 威胁距离条或弹道进度。

### 5.4 音频资产

现有 BGM：

- `assets/audio/bgm/menu_loop_v06.wav`
- `assets/audio/bgm/preflight_loop_v06.wav`
- `assets/audio/bgm/calibration_loop_v06.wav`
- `assets/audio/bgm/combat_loop_v06.wav`
- `assets/audio/bgm/report_loop_v06.wav`

现有 SFX：

- `door_soft`
- `base_lock`
- `arm_strike`
- `arm_return`
- `monster_hit`
- `monster_clear`
- `wrong_key`
- `drift_error`
- `low_health`
- `report_open`

03 需要新增的 SFX：

- `projectile_spawn`：污染弹生成，短促，不刺耳。
- `projectile_close`：威胁接近，轻微上扬。
- `shield_block`：按键成功防御，清脆但不盖过目标键。
- `counter_fire`：按键成功攻击，短促能量发射。
- `timeout_hit`：超时受击，和普通错键区分。
- `wave_clear`：连续巡航波清除。

03 需要新增的 BGM：

- `cruise_loop_v07.wav`：稳定低频、清晰节拍、比 02 战斗更有紧迫感，但不能乱。

## 6. 音乐规范

BGM 不负责每一次输入反馈。BGM 只负责氛围、节拍和压力曲线。

Key Pilot 的 BGM 应该是：

- 稳定循环。
- 层数少。
- 低频清楚。
- 和声暗色。
- 主题音稀疏可记。
- 不使用密集琶音作为常态。
- 不用持续轰鸣冒充音乐。
- 不用随机噪声制造紧张。

当前 `scripts/generate_audio_assets.mjs` 的 v0.6 修订已经确立一条规则：BGM 由稳定低频脉冲、柔和和声垫、少量主题音构成；SFX 才负责瞬时反馈。

03 的音乐比 02 更紧张，但必须使用“规则感”制造压力，而不是混乱感。推荐 BPM 118 到 124，4 小节循环，低频每拍或隔拍推进，旋律只在波次节点出现。

## 7. SFX 规范

SFX 必须短、明确、低干扰。

03 会增加时间压力，SFX 很容易过载，因此必须分层：

- 正确按键：短、清亮、上扬。
- 防御成功：略厚，但不刺耳。
- 攻击成功：有方向感，可带短尾音。
- 超时受击：低频钝击，不要尖叫。
- 普通错键：短促失败音。
- 偏左残影：失真拖拽音，必须与普通错键不同。
- 低血量：短警报，不持续盖住 BGM。

SFX 同时播放时要遵守优先级：当前目标反馈 > 受击 > 清波 > 环境。环境音永远不能盖住按键反馈。

## 8. 03 巡航防线的风格边界

03 可以更难、更紧张，但不能变成 WPM 测速器。

允许：

- 限时窗口。
- 污染弹接近。
- 怪物远程攻击。
- 连续 6 到 12 个目标。
- 手指快速切换。
- 超时等同错键。
- 低血量和波次压力。

不允许：

- 屏幕上同时要求多个键。
- 因为反应太快导致玩家只能乱按。
- 大量小字母在背景里飞。
- 当前目标键和背景文字混在一起。
- 完整键盘图占据主焦点。
- 只按随机键，没有训练意图。

03 的画面必须让玩家理解：自己不是在打一串随机字母，而是在用正确手指拦截污染弹、守住 K-01 的神经防线。

## 9. 资产质量门槛

新资产进入主流程前必须满足：

- `assetManifest` 中标记 `quality: "approved"`。
- 角色和怪物必须有透明 alpha。
- 小尺寸下轮廓清晰。
- 不出现绿幕残留或方形裁切边。
- 不使用纯线框或几何占位作为正式主流程。
- 不复制具体游戏、角色或 IP。
- 背景不能让目标键失去对比。
- UI 不能像网页卡片。

03 的新增 projectile 和倒计时环必须特别注意：它们是紧迫感来源，但不能遮挡当前目标键。

## 10. 后续制作顺序

建议按以下顺序推进 03：

1. 先生成 03 视觉样板图：巡航防线房间、K-01、污染弹、远程怪/炮台、中央目标键倒计时环。
2. 生成 03 房间背景和 projectile/VFX 资产。
3. 生成远程怪或炮台 sprite。
4. 生成 `cruise_loop_v07.wav` 和新增 SFX。
5. 实现 03 的输入队列和限时判定。
6. 接入 Phaser 巡航防线场景。
7. 做 03 桌面版回归测试。

不要先写完整剧情、装备系统或地图系统。03 的第一目标是证明“多手指连续巡航但不丢手位”可以被做成紧张、清楚、可重复玩的关卡。

