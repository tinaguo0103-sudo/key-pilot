import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { collectRuntimeAssetPaths, findDeprecatedRuntimeFields, loadAssetManifest } from "./asset_runtime_paths.mjs";

const root = process.cwd();
const manifest = loadAssetManifest(root);
const failures = [];

function fail(message) {
  failures.push(message);
}

function fileExists(relativePath, label) {
  if (!relativePath) {
    fail(`${label} is missing a path`);
    return false;
  }
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`${label} does not exist: ${relativePath}`);
    return false;
  }
  return true;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function analyzePng(relativePath) {
  const absolutePath = path.join(root, relativePath);
  const buffer = fs.readFileSync(absolutePath);
  if (buffer.toString("ascii", 1, 4) !== "PNG") return null;
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (type === "IHDR") {
      width = buffer.readUInt32BE(dataStart);
      height = buffer.readUInt32BE(dataStart + 4);
      bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
    } else if (type === "IDAT") {
      idat.push(buffer.subarray(dataStart, dataEnd));
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
    return { width, height, unsupported: true, hasAlpha: colorType === 6 };
  }
  const channels = colorType === 6 ? 4 : 3;
  const rowBytes = width * channels;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const pixels = Buffer.alloc(width * height * channels);
  let inputOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[inputOffset];
    inputOffset += 1;
    const rowStart = y * rowBytes;
    const prevStart = rowStart - rowBytes;
    for (let x = 0; x < rowBytes; x += 1) {
      const left = x >= channels ? pixels[rowStart + x - channels] : 0;
      const up = y > 0 ? pixels[prevStart + x] : 0;
      const upLeft = y > 0 && x >= channels ? pixels[prevStart + x - channels] : 0;
      let value = raw[inputOffset + x];
      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) value = (value + paethPredictor(left, up, upLeft)) & 255;
      else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter} in ${relativePath}`);
      pixels[rowStart + x] = value;
    }
    inputOffset += rowBytes;
  }

  let visible = 0;
  let greenResidue = 0;
  let transparentCorners = 0;
  const cornerCoords = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * channels;
      const r = pixels[index];
      const g = pixels[index + 1];
      const b = pixels[index + 2];
      const a = channels === 4 ? pixels[index + 3] : 255;
      if (a > 18) {
        visible += 1;
        if (g > 105 && g > r + 24 && g > b + 24) greenResidue += 1;
      }
    }
  }
  cornerCoords.forEach(([x, y]) => {
    const index = (y * width + x) * channels;
    const a = channels === 4 ? pixels[index + 3] : 255;
    if (a <= 4) transparentCorners += 1;
  });
  return {
    width,
    height,
    hasAlpha: channels === 4,
    transparentCorners,
    greenResidueRatio: visible ? greenResidue / visible : 0
  };
}

function assertApproved(asset, label, pathKey = "sheet") {
  if (asset.quality !== "approved") fail(`${label} must be quality: approved`);
  const target = asset[pathKey];
  if (/placeholder/i.test(target || "")) fail(`${label} must not reference placeholder asset: ${target}`);
  fileExists(target, label);
}

const deprecatedFields = findDeprecatedRuntimeFields(manifest);
deprecatedFields.forEach((field) => fail(`runtime manifest should not keep deprecated asset field ${field}`));
collectRuntimeAssetPaths(manifest).forEach((assetPath) => fileExists(assetPath, `runtime asset ${assetPath}`));

Object.entries(manifest.rooms || {}).forEach(([id, room]) => {
  assertApproved(room, `room.${id}`, "background");
  const size = analyzePng(room.background);
  if (!size) fail(`room.${id} background must be PNG`);
  else if (size.width < 1280 || size.height < 720) fail(`room.${id} background too small: ${size.width}x${size.height}`);
});

if (!manifest.cruise?.room) {
  fail("cruise.room is missing");
} else {
  assertApproved(manifest.cruise.room, "cruise.room", "background");
  if (manifest.cruise.room.version !== "v07") fail("cruise.room must use version v07");
  const size = analyzePng(manifest.cruise.room.background);
  if (!size) fail("cruise.room background must be PNG");
  else if (size.width < 1280 || size.height < 720) fail(`cruise.room background too small: ${size.width}x${size.height}`);
}

if (!manifest.cruise?.threats) {
  fail("cruise.threats is missing");
} else {
  const threats = manifest.cruise.threats;
  assertApproved(threats, "cruise.threats");
  if (threats.version !== "v07") fail("cruise.threats must use version v07");
  if (threats.alpha !== "clean") fail("cruise.threats must be alpha: clean");
  const size = analyzePng(threats.sheet);
  if (!size) fail("cruise.threats sheet must be PNG");
  else {
    if (size.width !== threats.frameWidth * threats.columns || size.height !== threats.frameHeight * threats.rows) {
      fail(`cruise.threats sheet dimensions do not match frame grid: ${size.width}x${size.height}`);
    }
    if (!size.hasAlpha) fail("cruise.threats sheet must have alpha");
    if (size.transparentCorners !== 4) fail("cruise.threats sheet corners must be transparent");
    if (size.greenResidueRatio > 0.004) fail(`cruise.threats sheet has green residue ratio ${size.greenResidueRatio.toFixed(4)}`);
  }
}

Object.entries(manifest.scenes || {}).forEach(([id, scene]) => {
  assertApproved(scene, `scene.${id}`, "background");
  const size = analyzePng(scene.background);
  if (!size) fail(`scene.${id} background must be PNG`);
  else if (size.width < 1280 || size.height < 720) fail(`scene.${id} background too small: ${size.width}x${size.height}`);
});

assertApproved(manifest.characters.k01, "characters.k01");
{
  const k01 = manifest.characters.k01;
  if (k01.version !== "v04") fail("characters.k01 must use version v04");
  if (k01.alpha !== "clean") fail("characters.k01 must be alpha: clean");
  fileExists(k01.preview, "characters.k01.preview");
  const size = analyzePng(k01.sheet);
  if (!size) fail("characters.k01 sheet must be PNG");
  else {
    if (size.width !== k01.frameWidth * k01.columns || size.height !== k01.frameHeight * k01.rows) {
      fail(`characters.k01 sheet dimensions do not match frame grid: ${size.width}x${size.height}`);
    }
    if (!size.hasAlpha) fail("characters.k01 sheet must have alpha");
    if (size.transparentCorners !== 4) fail("characters.k01 sheet corners must be transparent");
    if (size.greenResidueRatio > 0.003) fail(`characters.k01 sheet has green residue ratio ${size.greenResidueRatio.toFixed(4)}`);
  }
}

Object.entries(manifest.monsters || {}).forEach(([id, monster]) => {
  assertApproved(monster, `monsters.${id}`);
  if (monster.version !== "v04") fail(`monsters.${id} must use version v04`);
  if (monster.alpha !== "clean") fail(`monsters.${id} must be alpha: clean`);
  fileExists(monster.preview, `monsters.${id}.preview`);
  const size = analyzePng(monster.sheet);
  if (!size) fail(`monsters.${id} sheet must be PNG`);
  else {
    if (size.width !== monster.frameWidth * monster.columns || size.height !== monster.frameHeight * monster.rows) {
      fail(`monsters.${id} sheet dimensions do not match frame grid: ${size.width}x${size.height}`);
    }
    if (!size.hasAlpha) fail(`monsters.${id} sheet must have alpha`);
    if (size.transparentCorners !== 4) fail(`monsters.${id} sheet corners must be transparent`);
    if (size.greenResidueRatio > 0.004) fail(`monsters.${id} sheet has green residue ratio ${size.greenResidueRatio.toFixed(4)}`);
  }
});

assertApproved(manifest.vfx.combat, "vfx.combat");
{
  const vfx = manifest.vfx.combat;
  const size = analyzePng(vfx.sheet);
  if (!size) fail("vfx.combat sheet must be PNG");
  else if (size.width % vfx.frameWidth !== 0 || size.height % vfx.frameHeight !== 0) {
    fail(`vfx.combat sheet dimensions do not match frame size: ${size.width}x${size.height}`);
  }
}

if (manifest.ui.quality !== "approved") fail("ui target HUD must be quality: approved");
fileExists(manifest.ui.targetHud, "ui.targetHud");

if (manifest.audio?.version !== "v07") fail("audio manifest must use version v07");
["soft", "standard", "strong"].forEach((profile) => {
  if (!manifest.audio?.mixProfiles?.includes(profile)) fail(`audio mix profile is missing: ${profile}`);
});
["menu", "preflight", "calibration", "combat", "cruise", "report"].forEach((id) => {
  const item = manifest.audio?.bgm?.[id];
  if (!item) {
    fail(`audio.bgm.${id} is missing`);
    return;
  }
  if (item.quality !== "approved") fail(`audio.bgm.${id} must be quality: approved`);
  if (!fileExists(item.src, `audio.bgm.${id}`)) return;
  if (!item.src.endsWith(".wav")) fail(`audio.bgm.${id} must be a wav file`);
  const size = fs.statSync(path.join(root, item.src)).size;
  if (size > 2600000) fail(`audio.bgm.${id} is too large: ${size} bytes`);
});
Object.entries(manifest.audio?.sfx || {}).forEach(([id, item]) => {
  if (item.quality !== "approved") fail(`audio.sfx.${id} must be quality: approved`);
  if (!fileExists(item.src, `audio.sfx.${id}`)) return;
  if (!item.src.endsWith(".wav")) fail(`audio.sfx.${id} must be a wav file`);
  const size = fs.statSync(path.join(root, item.src)).size;
  if (size > 120000) fail(`audio.sfx.${id} is too large: ${size} bytes`);
});

if (failures.length) {
  console.error("Asset check failed:");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("Asset check passed: approved runtime assets are present.");
