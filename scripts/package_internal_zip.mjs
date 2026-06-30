import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const appPath = path.join(distDir, "Key Pilot.app");
const bundleDir = path.join(distDir, "Key-Pilot-internal-mac-arm64");
const zipPath = path.join(distDir, "Key-Pilot-internal-mac-arm64.zip");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit", ...options });
  if (result.status !== 0) fail(`${command} ${args.join(" ")} failed`);
}

run(process.execPath, [path.join(root, "scripts", "package_desktop_app.mjs")]);

if (!fs.existsSync(appPath)) {
  fail("Desktop app package is missing.");
}

fs.rmSync(bundleDir, { recursive: true, force: true });
fs.rmSync(zipPath, { force: true });
fs.mkdirSync(bundleDir, { recursive: true });
fs.cpSync(appPath, path.join(bundleDir, "Key Pilot.app"), { recursive: true, verbatimSymlinks: true });

const launcher = `#!/bin/zsh
set -e

DIR="\${0:A:h}"
APP="\$DIR/Key Pilot.app"

if [[ ! -d "\$APP" ]]; then
  echo "没有找到 Key Pilot.app。请把这个脚本和 Key Pilot.app 放在同一个文件夹里。"
  read "?按回车退出"
  exit 1
fi

echo "正在解除 macOS 下载隔离标记..."
xattr -dr com.apple.quarantine "\$APP" 2>/dev/null || true

echo "正在打开 Key Pilot..."
open "\$APP"
`;

const launcherPath = path.join(bundleDir, "打开 Key Pilot.command");
fs.writeFileSync(launcherPath, launcher, "utf8");
fs.chmodSync(launcherPath, 0o755);

fs.writeFileSync(path.join(bundleDir, "README-先看我.txt"), `Key Pilot 内测版打开说明

如果直接双击 Key Pilot.app 出现“已损坏，无法打开”，这是 macOS Gatekeeper 对微信/浏览器下载文件加的隔离标记，不是游戏文件坏了。

推荐打开方式：
1. 解压这个 zip。
2. 双击“打开 Key Pilot.command”。
3. 终端窗口会解除同目录下 Key Pilot.app 的下载隔离标记，并打开游戏。

如果系统阻止 .command 运行，可以手动执行：

xattr -dr com.apple.quarantine "/你的路径/Key Pilot.app"

然后再双击 Key Pilot.app。

说明：
- 这是内测分发方式。
- 真正做到所有电脑上双击无提示，需要 Apple Developer ID 签名和 notarization。
`, "utf8");

run("ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", bundleDir, zipPath]);

console.log(`Built ${zipPath}`);
