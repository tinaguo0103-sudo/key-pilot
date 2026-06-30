import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

export function loadAssetManifest(root) {
  const manifestPath = path.join(root, "assetManifest.js");
  const code = fs.readFileSync(manifestPath, "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { filename: manifestPath });
  return sandbox.window.KeyPilotAssets || {};
}

function addPath(paths, value) {
  if (typeof value === "string" && value.startsWith("assets/")) paths.add(value);
}

function addSheetAsset(paths, asset = {}) {
  addPath(paths, asset.preview);
  addPath(paths, asset.sheet);
}

export function collectRuntimeAssetPaths(manifest) {
  const paths = new Set();

  Object.values(manifest.scenes || {}).forEach((scene) => addPath(paths, scene.background));
  addSheetAsset(paths, manifest.characters?.k01);
  Object.values(manifest.monsters || {}).forEach((monster) => addSheetAsset(paths, monster));
  Object.values(manifest.rooms || {}).forEach((room) => addPath(paths, room.background));
  addPath(paths, manifest.cruise?.room?.background);
  addPath(paths, manifest.cruise?.threats?.sheet);
  addPath(paths, manifest.vfx?.hitSpark);
  addPath(paths, manifest.vfx?.combat?.sheet);
  addPath(paths, manifest.ui?.targetHud);
  Object.values(manifest.audio?.bgm || {}).forEach((item) => addPath(paths, item.src));
  Object.values(manifest.audio?.sfx || {}).forEach((item) => addPath(paths, item.src));

  return [...paths].sort((a, b) => b.length - a.length);
}

export function findDeprecatedRuntimeFields(manifest) {
  const blockedKeys = new Set([
    "legacyConceptCrop",
    "conceptCrop",
    "placeholder",
    "placeholderBackground",
    "targetHudPlaceholder",
    "chromaSource"
  ]);
  const hits = [];
  const walk = (value, trail = []) => {
    if (!value || typeof value !== "object") return;
    Object.entries(value).forEach(([key, child]) => {
      const nextTrail = [...trail, key];
      if (blockedKeys.has(key) && typeof child === "string" && child.startsWith("assets/")) {
        hits.push(`${nextTrail.join(".")}: ${child}`);
      }
      if (child && typeof child === "object") walk(child, nextTrail);
    });
  };
  walk(manifest);
  return hits;
}
