import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const sourceDir = process.argv[2];
if (!sourceDir) {
  console.error("Usage: node scripts/prepare_approved_assets.mjs <generated-image-directory>");
  process.exit(1);
}

const root = process.cwd();
const files = fs.readdirSync(sourceDir)
  .filter((file) => file.endsWith(".png"))
  .map((file) => path.join(sourceDir, file))
  .sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs)
  .slice(-8);

if (files.length < 8) {
  console.error(`Expected at least 8 generated png files in ${sourceDir}, found ${files.length}`);
  process.exit(1);
}

const roomTargets = [
  ["gate", "assets/rooms/gate/room_gate_approved_v02.png"],
  ["pipe", "assets/rooms/pipe/room_pipe_approved_v02.png"],
  ["nest", "assets/rooms/nest/room_nest_approved_v02.png"],
  ["blackout", "assets/rooms/blackout/room_blackout_approved_v02.png"],
  ["core", "assets/rooms/core/room_core_approved_v02.png"]
];

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(path.join(root, filePath)), { recursive: true });
}

function keyOutRgba(data, mode) {
  const output = Buffer.from(data);
  for (let index = 0; index < output.length; index += 4) {
    const r = output[index];
    const g = output[index + 1];
    const b = output[index + 2];
    const a = output[index + 3];

    const isGreen = g > 130 && g > r * 1.45 && g > b * 1.45;
    const isMagenta = r > 150 && b > 135 && g < 120 && Math.abs(r - b) < 95;
    const keyed = mode === "green" ? isGreen : isMagenta;

    if (keyed) {
      output[index + 3] = 0;
      continue;
    }

    if (mode === "green" && g > r * 1.12 && g > b * 1.12) {
      output[index + 1] = Math.max(r, b);
      output[index + 3] = Math.min(a, 235);
    }
    if (mode === "magenta" && r > g * 1.2 && b > g * 1.2) {
      const replacement = Math.max(g, Math.min(r, b) * 0.35);
      output[index] = Math.max(g, replacement);
      output[index + 2] = Math.max(g, replacement);
      output[index + 3] = Math.min(a, 235);
    }
  }
  return output;
}

async function saveRoom(source, target) {
  ensureDir(target);
  await sharp(source)
    .resize(1920, 1080, { fit: "cover", position: "center" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, target));
}

async function chromaResize(source, target, width, height, mode) {
  ensureDir(target);
  const { data, info } = await sharp(source)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cleaned = keyOutRgba(data, mode);
  await sharp(cleaned, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, target));
}

async function splitMonsterRows(source) {
  const width = 512;
  const rowHeight = 128;
  const height = rowHeight * 5;
  const { data, info } = await sharp(source)
    .resize(width, height, { fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const cleaned = keyOutRgba(data, "green");
  const targets = [
    "assets/monsters/drift_zombie_sheet_approved_v02.png",
    "assets/monsters/iron_walker_sheet_approved_v02.png",
    "assets/monsters/split_phantom_sheet_approved_v02.png",
    "assets/monsters/rush_crawler_sheet_approved_v02.png",
    "assets/monsters/old_coordinate_core_sheet_approved_v02.png"
  ];

  for (let row = 0; row < targets.length; row += 1) {
    const target = targets[row];
    ensureDir(target);
    await sharp(cleaned, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extract({ left: 0, top: row * rowHeight, width, height: rowHeight })
      .png({ compressionLevel: 9 })
      .toFile(path.join(root, target));
  }
}

for (let index = 0; index < roomTargets.length; index += 1) {
  await saveRoom(files[index], roomTargets[index][1]);
}

await chromaResize(files[5], "assets/characters/k01/k01_sheet_approved_v02.png", 896, 512, "green");
await splitMonsterRows(files[6]);
await chromaResize(files[7], "assets/vfx/vfx_combat_sheet_approved_v02.png", 768, 512, "magenta");
await chromaResize(files[7], "assets/ui/target_hud_approved_v02.png", 768, 512, "magenta");

console.log("Prepared approved Key Pilot assets:");
roomTargets.forEach(([id, target]) => console.log(`- ${id}: ${target}`));
console.log("- k01: assets/characters/k01/k01_sheet_approved_v02.png");
console.log("- monsters: assets/monsters/*_approved_v02.png");
console.log("- vfx: assets/vfx/vfx_combat_sheet_approved_v02.png");
