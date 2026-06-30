import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(root, "dist");
const sourceApp = path.join(root, "node_modules", "electron", "dist", "Electron.app");
const targetApp = path.join(distDir, "Key Pilot.app");
const appResources = path.join(targetApp, "Contents", "Resources");
const bundledApp = path.join(appResources, "app");

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    fail(`${command} ${args.join(" ")} failed`);
  }
}

function setPlistString(plist, key, value) {
  const pattern = new RegExp(`(<key>${key}</key>\\s*<string>)([^<]*)(</string>)`, "m");
  if (!pattern.test(plist)) return plist;
  return plist.replace(pattern, `$1${value}$3`);
}

if (!fs.existsSync(sourceApp)) {
  fail("Electron runtime not found. Run npm install first.");
}

await import("./build_single_file.js");

fs.mkdirSync(distDir, { recursive: true });
fs.rmSync(targetApp, { recursive: true, force: true });
fs.cpSync(sourceApp, targetApp, { recursive: true, verbatimSymlinks: true });

fs.rmSync(path.join(appResources, "default_app.asar"), { force: true });
fs.rmSync(path.join(appResources, "default_app.asar.unpacked"), { recursive: true, force: true });
fs.mkdirSync(path.join(bundledApp, "electron"), { recursive: true });

fs.copyFileSync(path.join(root, "electron", "main.cjs"), path.join(bundledApp, "electron", "main.cjs"));
fs.copyFileSync(path.join(root, "key-pilot-mvp.html"), path.join(bundledApp, "key-pilot-mvp.html"));
fs.writeFileSync(
  path.join(bundledApp, "package.json"),
  JSON.stringify({
    name: "key-pilot-desktop",
    productName: "Key Pilot",
    version: JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version || "0.1.0",
    private: true,
    type: "module",
    main: "electron/main.cjs"
  }, null, 2)
);

const plistPath = path.join(targetApp, "Contents", "Info.plist");
if (fs.existsSync(plistPath)) {
  const packageInfo = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const appVersion = packageInfo.version || "0.1.0";
  let plist = fs.readFileSync(plistPath, "utf8");
  plist = setPlistString(plist, "CFBundleName", "Key Pilot");
  plist = setPlistString(plist, "CFBundleDisplayName", "Key Pilot");
  plist = setPlistString(plist, "CFBundleIdentifier", "com.keypilot.typinggame");
  plist = setPlistString(plist, "CFBundleShortVersionString", appVersion);
  plist = setPlistString(plist, "CFBundleVersion", appVersion);
  fs.writeFileSync(plistPath, plist);
}

run("codesign", ["--force", "--deep", "--sign", "-", "--timestamp=none", targetApp]);

console.log(`Built ${targetApp}`);
