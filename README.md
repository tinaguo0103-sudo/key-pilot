# Key Pilot 本地原型

这是 Key Pilot 的本地原型。当前包含 `01 战前预检`、`02 机械臂清障`、`03 巡航防线` 三个训练关卡。现在有两个入口：

- 桌面版：更接近正式游戏体验，没有浏览器地址栏，并允许桌面模式自动启动 BGM。
- 单文件网页版：仍可作为备用分发物，双击即可打开，但浏览器会要求先点击一次才能播放声音。

## 桌面版运行

第一次运行先安装依赖：

```bash
npm install
```

启动桌面版：

```bash
npm run desktop
```

桌面版默认会先更新 `key-pilot-mvp.html`，再用 Electron 打开它。窗口没有浏览器标签栏，BGM 会按桌面模式主动启动。

## 打包 macOS 应用

生成本机可打开的应用：

```bash
npm run desktop:package
```

产物在：

```text
dist/Key Pilot.app
```

这是未签名的本地测试包，发给其他 Mac 时可能需要右键打开。后续如果要公开分发，再做签名和公证。

## 生成内测分享包

如果只是发给别人测试，更推荐生成内测 zip：

```bash
npm run desktop:zip
```

产物在：

```text
dist/Key-Pilot-internal-mac-arm64.zip
```

对方双击 zip 后会得到一个文件夹，里面包含 `Key Pilot.app` 和 `打开 Key Pilot.command`。如果直接双击 app 被 macOS 提示“已损坏”，请先双击 `打开 Key Pilot.command`，它会解除下载隔离标记并打开游戏。更新时删除旧文件夹，换成新的文件夹即可。

## 直接打开

双击打开：

```text
key-pilot-mvp.html
```

这是已打包的单文件网页备用版。它适合临时发送和快速试用，但浏览器会限制自动播放，所以正式体验优先使用桌面版。训练成绩使用浏览器本地存储，换电脑或换浏览器后不会自动同步。

## 开发源码预览

如果要调试源码，可以打开：

```text
index.html
```

源码预览需要保留这些文件在同一目录下：

```text
index.html
styles.css
app.js
assetManifest.js
roomCombatScene.js
cruiseDefenseScene.js
vendor/
assets/
```

修改源码后运行 `npm run build:single`，会重新生成可分发的 `key-pilot-mvp.html`。

## 后续设计文档

MVP 后续规划优先看：

```text
key-pilot-style-audio-bible-v0.7.md
level-03-cruise-defense-prd-v0.7.md
key-pilot-game-system-prd-v0.8.md
key-pilot-monster-system-v0.1.md
```

前三者定义后续关卡的美术、资产、音频、03 巡航防线玩法和全局战斗系统；`monster-system` 文档专门约束怪物分类、资产规格和 03 威胁重做方向。

## 可选本地服务

如果想用本地服务访问，也可以运行：

```bash
npm run dev
```

然后打开：

```text
http://127.0.0.1:4173/
```

这只是开发预览方式，不是运行必需条件。
