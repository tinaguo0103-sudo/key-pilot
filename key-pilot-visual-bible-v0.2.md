# Key Pilot 视觉圣经 v0.2

## 1. 文档目的

本文档定义 Key Pilot 垂直切片版本的视觉风格、画面结构、角色怪物方向、UI 规范、动效规范、素材清单和 Codex 生图要求。

当前版本的问题不是训练功能缺失，而是视觉仍然像网页原型。线条、几何图形、静态面板和弱动画让玩家感知不到战斗、怪物、机体和地下房间。下一阶段必须让玩家第一眼相信：这是一个俯视角 2D 地下赛博房间战斗游戏。

## 2. 视觉目标

Key Pilot 的视觉目标是：脏污、怪诞、机械、生物污染、地下赛博、可读性极强的训练信息。

它不是可爱儿童打字游戏，不是纯霓虹科技面板，也不是普通测速工具。它应该像一个废弃地下输入网络里的维修战斗房。墙体潮湿，地板生锈，电缆像神经一样缠绕，怪物像错误肌肉记忆长出的污染实体，K-01 像一台正在重新夺回身体控制权的神经机体。

整体画面要有游戏完成度，但不能牺牲训练可读性。世界可以脏，目标键必须干净。背景可以怪，当前动作必须一眼看懂。污染可以压迫，不能遮住键位。怪物可以有存在感，不能抢走当前目标。

## 3. 视觉参考方向

参考结构是俯视房间制独立地牢游戏，但不复制任何具体游戏的角色、宗教隐喻、怪物造型、血腥风格或道具设定。Key Pilot 要吸收的是：单屏房间、门、墙、怪物波次、低帧手绘 sprite、强命中反馈、道具协同、短局重玩。

画面气质更接近“地下赛博维修站 + 怪诞地牢 + 被污染的人机接口”。它不应该是明亮科技风，也不应该是低龄卡通风。它可以荒诞，可以阴郁，可以有一点轻恐怖，但不能过度血腥，不能恶心到影响训练，也不能让键位不可读。

## 4. 核心关键词

视觉关键词包括：地下键境、废弃输入网络、神经驾驶舱、旧坐标污染、生物电缆、铁锈地板、腐蚀管道、污染黏液、机械臂轨迹、手绘 sprite、短帧动画、hit stop、怪物压迫、驾驶舱 UI、强目标可读性。

反向关键词包括：干净 SaaS 面板、纯几何线框、霓虹发光过度、幼稚卡通、过度科幻 HUD、长篇剧情插画、复杂 3D、写实血腥、密集粒子遮挡目标。

## 5. 色彩系统

主背景色使用低亮度深色。推荐基调是沥青黑、煤灰、铁锈棕、深橄榄绿、暗红棕、旧金属灰。房间不应该大面积纯黑，而应该有脏污纹理、地板块、墙面裂缝和污染层次。

功能高亮色必须少而准。当前目标键使用电青或偏白蓝高亮。基地键和回家轨迹使用稳定蓝。命中和过载使用亮黄或电白。错误和破舱使用红橙。污染使用病态绿或紫黑。偏左残影使用偏橙红或故障粉，并带轻微错位重影。

颜色层级必须遵守：当前目标键最高对比，其次是机械臂轨迹和怪物威胁，再次是房间环境，最后是装饰纹理。不要让背景霓虹和目标键使用同一亮度，否则玩家会失去焦点。

## 6. 画面构图

画面采用 16:9 固定单屏房间。房间主体占据 80% 以上画面。K-01 位于中央偏下，方便上方出现怪物和目标提示。房门位于房间上方或左右两侧，用于表现推进感。墙体和边缘留出怪物出现、污染蔓延、低血量警报和门开合空间。

主目标 UI 位于画面中央偏上，不是右侧信息栏。它要像悬浮在驾驶舱前方的战斗指令环，而不是网页卡片。当前目标键必须最大，当前动作阶段紧贴目标键展示。手指归属提示放在目标 UI 的左下或右下，保持短小。

底部状态区只占很少空间。护盾、污染、连击、房间名可以放在底部或角落，但不要让玩家必须低头找关键信息。关键信息永远在中间。

## 7. 房间视觉规范

闸门入口是第一种房间。它应该有厚重铁门、黄黑警戒条、红色门锁灯、地面轨道、电缆插口和旧维修站氛围。整体颜色偏暗灰、铁锈、警戒黄。这个房间用于建立基础清障爽感，视觉应该清楚，污染不宜过重。

腐蚀管道是第二种房间。它应该有破裂管道、滴落腐蚀液、绿色污染池、潮湿地板和蒸汽。整体颜色偏暗绿、污黄、旧金属。这个房间对应装甲二连，可以让怪物外壳和管道腐蚀感更强。

侧墙巢穴是第三种房间。它应该有左右墙洞、虫巢状电缆、裂开的墙面、粘连的神经线和小怪出入口。整体颜色偏暗橙、棕红、紫黑。这个房间对应分裂残影，左右和上下层次要明显。

闪断隧道是第四种房间。它应该有破损灯管、黑屏监控、故障扫描线、红色警报、强暗角和间歇性照明。整体颜色偏蓝黑、红橙、灰白闪光。这个房间对应突进压迫和闪断干扰，视觉可以更紧张，但目标键必须保持清晰。

旧坐标核心是小 Boss 房。它应该有巨大核心外壳、错位地板网格、向左偏移的残影线、污染电缆、异常坐标标记和封锁门。整体颜色偏黑红、橙红、病态绿。这个房间要体现“旧坐标正在夺回机体控制权”。

## 8. K-01 角色视觉

K-01 是神经作战机体，不是可爱机器人，也不是复杂写实机甲。它应该小而有轮廓，能在暗色房间中被一眼识别。

核心造型建议是：圆形或椭圆形驾驶核心，外圈有机械护甲，左右有机械臂基座，底部有磁轨脚架，背后有短电缆和散热片。身体中央可以有一个发光核心，颜色随状态变化。待机是暗蓝或青色，过载是亮黄或电白，受击是红橙闪烁，死亡是核心熄灭。

K-01 的动画不需要多帧复杂走路，因为它不自由移动。重点是待机呼吸、基地接入、机械臂出击、机械臂回收、受击短震、过载爆发。它应该像一个固定在房间中心的驾驶/作战节点。

K-01 的轮廓要避免太细。小尺寸下仍能看出核心、左右机械臂、底部支架。不要做成复杂线稿，否则缩小后会糊成一团。

## 9. 怪物视觉

怪物不是装饰，而是错误习惯实体。每个怪物必须通过造型表达对应错误类型。

偏左残影代表整手偏左。造型应该像被向左拖拽的半透明残影，轮廓错位，身体有多层重影，左侧拉长。它不一定是实体怪，可以像污染幽灵。出现时地板和 K-01 都要轻微向左错位。

漂移僵尸代表忘记回家。造型可以是旧维修机器人残骸，身体歪斜，拖着断裂机械臂，移动方式不稳。它应该让人感觉“它会把你的机械臂拖住”。

铁皮行尸代表装甲二连。造型厚重，有破旧外壳、铆钉、裂纹和笨重步伐。第一次命中时装甲裂开，第二次完整闭环后外壳爆裂。

分裂残影代表同一手指上下目标切换。造型可以像一团被错误坐标撕裂的残影，命中后分裂成上下两个较小残影。两个残影颜色或高度层级不同，帮助玩家理解上下排切换。

突进感染体代表错键压迫。造型瘦长、低伏、带尖锐机械腿或电缆触须。正常时缓慢爬行，错键后突然向 K-01 冲一段。

旧坐标核心外壳代表综合错误坐标。它可以是一个被污染线缆缠绕的核心设备，不一定是传统怪物。每阶段外壳裂开，露出更强的错位光线和污染脉冲。

所有怪物必须避免可爱化，也不需要写实血腥。方向是机械污染、生物电缆、残影、旧设备复活。

## 10. UI 视觉规范

UI 必须看起来属于驾驶舱，而不是网页系统。

目标键 UI 是最重要的组件。它应该像一个悬浮战斗指令环，中间是当前目标键，外圈显示动作阶段。基地阶段显示“BASE”，出击阶段显示“STRIKE”，回收阶段显示“RETURN”或中文短词。中文文案要短，不超过 6 个字。

路径 UI 可以显示为三段轨迹：基地点、目标点、回收点。当前步骤高亮，已完成步骤变成稳定蓝，未完成步骤灰暗。对于五步路径，路径不宜太长，可以用折叠轨迹显示当前和下一步。

手指提示 UI 不能是大段说明。推荐格式是“左食指通道：F → R/V”。或者“右中指：K 基地，I 上层”。旁边可以显示小型键位领地图，但只显示当前手指负责区域。

护盾条应该像机体外壳能量，不要像网页进度条。污染条可以像一条蠕动的脏色液体。连击可以叫神经同步链，用短脉冲或小节点表示。低血量时 UI 破损，但目标键不能破损到看不清。

## 11. 动效规范

Key Pilot 的动画重点不是高帧数，而是游戏反馈。所有关键动作都应该具备预备、爆发、命中停顿、回弹和残影。

机械臂出击动效应该先蓄力 40 到 60 毫秒，然后快速打出。命中时暂停 50 到 70 毫秒，怪物和镜头短停，随后怪物击退。机械臂回收时沿返航轨迹拉回，最后有扣合感。

正确输入动效应该轻快、上扬、稳定。目标键亮起，K-01 核心增强，机械臂或锚点响应。不要让正确反馈太弱，否则玩家会觉得只是 UI 变色。

错误输入动效应该短促、有后果、不羞辱。机械臂打偏，墙面火花，怪物前进，护盾裂纹。错误不能用长动画拖慢训练节奏。

偏左残影动效必须独立。出现时地板网格向左错位，画面轻微左倾，K-01 被拉向左侧，残影从左墙或机体左侧浮现。持续时间 300 到 600 毫秒即可，不要太长。

低血量动效是环境层，不是遮挡层。边缘暗角、红色警报、舱内灯闪、音效变闷，但中央目标键保持稳定清晰。

过载动效要给爽感。连击触发时，K-01 核心亮起，房间地面轨道发光，下一次清怪有更强的拖尾和爆裂。过载不能改变输入要求，只改变反馈强度。

## 12. 素材清单

第一阶段必须生成和接入以下素材。

K-01 sprite sheet：idle, base-lock, strike, return, hit, overdrive, shutdown。每个状态可以 2 到 6 帧。透明背景。角度统一。

普通怪物 sprite sheet：漂移僵尸、铁皮行尸、分裂残影、突进感染体。每种至少 idle, move, hit, death 四个状态。透明背景。角度统一。

小 Boss sprite sheet：旧坐标核心外壳。包含 idle, phase-crack-1, phase-crack-2, hit, death, pulse。透明背景。

房间 tile 或背景：闸门入口、腐蚀管道、侧墙巢穴、闪断隧道、旧坐标核心。每个房间需要地板层、墙体层、门、污染层、灯光/装饰层。可以先用整张背景，后续再切 tile。

VFX sprite：命中火花、机械臂拖尾、返航轨迹、护盾裂纹、污染烟雾、电火花、过载环、怪物消散、门解锁、低血量暗角。

UI 资产：目标键主框、路径节点、基地/出击/回收标签、手指通道标签、护盾条、污染条、连击节点、房间名牌、任务报告面板。

音效资产：base lock, strike, hit, return lock, monster death, wrong, drift, breach, low health, overdrive, room clear, door open。音效短促，不要长音乐化。

## 13. Codex 生图总规范

Codex 生图时，禁止直接要求“画成某具体游戏的风格”。应使用原创描述：top-down 2D hand-drawn indie dungeon room, dirty cyberpunk biomechanical environment, original robot pilot, corrupted keyboard-memory monsters, readable key-command UI, sprite game asset, no copyrighted characters, no religious symbols, no gore.

每张图都要明确用途。如果是概念图，就允许细节丰富。如果是 sprite sheet，就必须透明背景、角色居中、动作分格、角度统一。如果是 tilemap，就必须可切割、俯视角、边缘可拼接。如果是 UI，就必须高对比、暗背景可读、不能过度装饰。

Codex 输出图后，开发需要把素材统一整理到 assets 目录。建议目录结构为 assets/characters/k01, assets/monsters, assets/rooms, assets/vfx, assets/ui, assets/audio。文件命名必须包含角色、状态、帧序号或用途，例如 k01_idle_01.png, monster_driftZombie_hit_02.png, room_gate_floor.png, vfx_hitSpark_01.png。

## 14. Codex 生图提示词模板

整体视觉样板图提示词：

Create an original 16:9 concept art for a top-down 2D indie dungeon combat room. The scene is a dirty underground cyberpunk keyboard-control chamber. A small biomechanical robot named K-01 stands slightly below the center, with two mechanical arm bases and a glowing neural core. Rusty metal floor tiles, polluted cables, locked doors, corrupted pipes, dim warning lights, and crawling keyboard-memory monsters surround the room. Add a readable cockpit-like key command UI near the top center, showing a large target key and a short path indicator. Mood: dark, strange, tense, hand-drawn sprite game feel, strong silhouettes, readable gameplay information. Original design only, no copyrighted characters, no religious symbols, no gore.

K-01 sprite sheet 提示词：

Create an original transparent-background 2D sprite sheet for a small biomechanical robot pilot unit called K-01. Top-down or three-quarter top-down view, suitable for an indie dungeon combat game. Include separate animation poses: idle, base lock, mechanical arm strike, arm return, damaged, overdrive, shutdown. The robot has a round glowing neural core, compact armor shell, left and right mechanical arm bases, small magnetic rail feet, short cables, and a gritty cyberpunk repair-machine look. Strong silhouette, limited but expressive frames, not cute, not realistic 3D, no copyrighted design.

漂移僵尸提示词：

Create an original transparent-background 2D sprite sheet for a corrupted drift zombie monster in a top-down dirty cyberpunk dungeon game. It represents the habit of forgetting to return home position. The creature looks like a broken maintenance robot corpse with dragging cables and a twisted arm that can grab the player’s mechanical arm. Include idle, crawl, hit, death frames. Strong readable silhouette, grimy metal, corrupted signal glow, no gore, no copyrighted characters.

偏左残影提示词：

Create an original transparent-background 2D sprite sheet for a left-drift coordinate ghost monster. It represents an old incorrect keyboard muscle memory that pulls everything one key to the left. The creature is semi-transparent, stretched toward the left, with multiple offset silhouettes, glitch trails, orange-red corrupted glow, and distorted grid fragments. Include appear, idle, pull, hit, dissolve frames. Top-down 2D hand-drawn sprite game asset, no gore, no copyrighted characters.

铁皮行尸提示词：

Create an original transparent-background 2D sprite sheet for an armored corrupted maintenance walker. It represents the armor double-hit mechanic. The monster has a heavy cracked metal shell, bolts, rust, and a slow bulky crawl. Include idle, move, armor-crack hit, second-hit break, death frames. Top-down 2D indie dungeon sprite, strong silhouette, dirty cyberpunk, no gore, no copyrighted characters.

分裂残影提示词：

Create an original transparent-background 2D sprite sheet for a split coordinate phantom. It represents one finger handling two targets with a required return-home step between them. The monster is a corrupted ghost made of two offset halves, one upper and one lower, connected by glitch cables. Include idle, first-hit split, two-small-phantoms, hit, dissolve frames. Top-down 2D hand-drawn sprite, dark cyberpunk dungeon, no copyrighted characters.

突进感染体提示词：

Create an original transparent-background 2D sprite sheet for a rush infection crawler. It represents pressure after wrong key input. The creature is low to the ground, thin, fast, with cable legs and a corrupted sensor head. Include idle, crawl, sudden rush, hit, death frames. Top-down 2D dirty cyberpunk sprite, strong silhouette, no gore, no copyrighted characters.

房间背景提示词：

Create a top-down 2D hand-drawn room background for an original dirty cyberpunk dungeon game. The room is a locked underground keyboard-control chamber with rusty metal floor tiles, thick walls, doors, cables, pipes, dim warning lights, and polluted cracks. Leave the center readable for the player robot and enemies. Dark mood, high readability, sprite game asset, no characters, no copyrighted elements, no text.

目标 UI 提示词：

Create an original cockpit-style key command UI asset for a dark 2D cyberpunk dungeon typing-combat game. The UI shows a large readable target key in the center, with path nodes for BASE, STRIKE, RETURN, and a small finger-channel tag. It must be readable on a dark noisy background, high contrast, not too futuristic, not a clean SaaS panel. Transparent background, game HUD asset, no copyrighted elements.

VFX 提示词：

Create a transparent-background 2D sprite sheet of combat VFX for a dirty cyberpunk dungeon typing-combat game. Include hit spark, shield crack, corruption smoke, return trail, overdrive ring, electric glitch, door unlock flash, monster dissolve. Short-frame game effects, readable, hand-drawn sprite feel, no text, no copyrighted elements.

## 15. 资产质量标准

所有 sprite 必须在小尺寸下可读。怪物缩小到 80 到 120 像素宽时，仍然能分辨轮廓和类型。K-01 缩小到 100 到 140 像素时，仍然能看出核心和机械臂方向。

所有 UI 必须在战斗状态下可读。目标键不能被纹理、粒子、污染遮挡。目标键字体要大，形状要稳定，颜色要高对比。

所有动画必须服务输入反馈。不要为了好看做长演出。战斗输入频率高，动画要短、快、有力。正确反馈和错误反馈要清楚区分。

所有房间必须有主题差异。闸门入口、腐蚀管道、侧墙巢穴、闪断隧道、旧坐标核心不能只是换颜色。它们的墙、地面、污染、灯光和怪物入口都应该有差异。

所有视觉资产必须避免幼稚化。不要圆润可爱怪物，不要亮色儿童 UI，不要卡通大眼睛。可以荒诞，但不是低龄。

## 16. 与训练目标的关系

视觉不是装饰，而是训练反馈。

F/J 锚点必须像机体稳定核心。回家阶段必须有返航轨迹。错键必须表现为机械控制失败。偏左错误必须表现为坐标偏移。连续正确必须表现为神经同步链。路径完整率必须表现为机械臂闭环稳定。怪物死亡必须对应完整训练动作，而不是单个目标键。

任何视觉设计如果让用户更难看清当前键位，都必须降级或删除。任何动画如果打断输入节奏，都必须缩短。任何装备如果让用户跳过训练目标，都不能进入当前版本。

## 17. 首批视觉验收

第一眼验收：截图不看文字，必须像一个完整 2D 地下房间战斗游戏，而不是网页练习器。

信息验收：截图中必须能一眼找到当前目标键、K-01、怪物、房间状态。

动作验收：录屏中必须能看出基地接入、机械臂出击、命中、回收、怪物死亡。

错误验收：录屏中必须能区分普通错键、偏左残影、忘记回家。

风格验收：所有房间、怪物、K-01、UI 看起来属于同一个世界，不像不同生成素材拼贴。

训练验收：视觉升级后，用户仍然能稳定完成输入，不因为背景、粒子、动画过强而分心。

## 18. 推荐制作顺序

第一步先生成整体视觉样板图。不要马上生成几十张素材，先确认一个画面方向：K-01、房间、怪物、目标 UI 是否统一。

第二步生成 K-01 和一只怪物的 sprite sheet。用它们替换现有几何图形，验证动画和输入反馈。

第三步生成一个房间背景和一组 VFX。先做闸门入口房，把标准三步闭环做完整。

第四步扩展到四个房间主题和四种怪物。每个房间只做最必要的差异，不要追求过早精细。

第五步统一 UI 皮肤和任务报告。确保整个切片从开场、战斗到结算都不像网页原型。

第六步再考虑装备视觉和图鉴。装备不作为第一批重点，除非基础战斗反馈已经成立。
