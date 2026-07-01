import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectRuntimeAssetPaths, loadAssetManifest } from "./asset_runtime_paths.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function mimeFor(file) {
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".wav")) return "audio/wav";
  if (file.endsWith(".m4a")) return "audio/mp4";
  if (file.endsWith(".mp4")) return "audio/mp4";
  if (file.endsWith(".js")) return "text/javascript";
  if (file.endsWith(".css")) return "text/css";
  return "application/octet-stream";
}

function dataUrl(file) {
  const absolute = path.join(root, file);
  const data = fs.readFileSync(absolute);
  return `data:${mimeFor(file)};base64,${data.toString("base64")}`;
}

function collectAssetPaths() {
  return collectRuntimeAssetPaths(loadAssetManifest(root));
}

function inlineManifestAssets(manifestCode) {
  let output = manifestCode;
  for (const assetPath of collectAssetPaths()) {
    if (!fs.existsSync(path.join(root, assetPath))) {
      throw new Error(`Missing asset for single-file build: ${assetPath}`);
    }
    output = output.split(assetPath).join(dataUrl(assetPath));
  }
  return output;
}

const css = read("styles.css");
const phaser = read("vendor/phaser.min.js");
const manifest = inlineManifestAssets(read("assetManifest.js"));
const runtimeLifecycle = read("runtimeLifecycle.js");
const debugBridge = read("debugBridge.js");
const progressStore = read("progressStore.js");
const audioDirector = read("audioDirector.js");
const randomSource = read("randomSource.js");
const sceneBridge = read("sceneBridge.js");
const a11ySupport = read("a11ySupport.js");
const gameConfig = read("gameConfig.js");
const homeRules = read("homeRules.js");
const cruiseRules = read("cruiseRules.js");
const strikeRules = read("strikeRules.js");
const sceneSnapshots = read("sceneSnapshots.js");
const homeScene = read("homePreflightScene.js");
const roomScene = read("roomCombatScene.js");
const cruiseScene = read("cruiseDefenseScene.js");
const app = read("app.js");

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Key Pilot | 地下坐标重启</title>
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
${phaser}
    </script>
    <script>
${manifest}
    </script>
    <script>
${runtimeLifecycle}
    </script>
    <script>
${debugBridge}
    </script>
    <script>
${progressStore}
    </script>
    <script>
${audioDirector}
    </script>
    <script>
${randomSource}
    </script>
    <script>
${sceneBridge}
    </script>
    <script>
${a11ySupport}
    </script>
    <script>
${gameConfig}
    </script>
    <script>
${homeRules}
    </script>
    <script>
${cruiseRules}
    </script>
    <script>
${strikeRules}
    </script>
    <script>
${sceneSnapshots}
    </script>
    <script>
${homeScene}
    </script>
    <script>
${roomScene}
    </script>
    <script>
${cruiseScene}
    </script>
    <script>
${app}
    </script>
  </body>
</html>
`;

fs.writeFileSync(path.join(root, "key-pilot-mvp.html"), html);
console.log("Built key-pilot-mvp.html");
