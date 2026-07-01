import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function readText(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

const singleFile = path.join(root, "key-pilot-mvp.html");
const packageJson = JSON.parse(readText("package.json"));

if (!packageJson.main || packageJson.main !== "electron/main.cjs") {
  fail("package.json should point Electron at electron/main.cjs");
}

if (
  !packageJson.scripts?.desktop
  || !packageJson.scripts?.["desktop:package"]
  || !packageJson.scripts?.["desktop:zip"]
  || !packageJson.scripts?.["desktop:internal"]
) {
  fail("package.json should expose desktop, desktop:package, desktop:zip, and desktop:internal scripts");
}

if (packageJson.scripts?.["desktop:zip"] !== "npm run desktop:internal") {
  fail("desktop:zip should point at the internal sharing package, not the raw portable app zip");
}

if (!fs.existsSync(path.join(root, "electron", "main.cjs"))) {
  fail("electron/main.cjs is missing");
}

if (!fs.existsSync(singleFile)) {
  fail("key-pilot-mvp.html is missing; run node scripts/build_single_file.js");
} else {
  const html = readText("key-pilot-mvp.html");
  if (!html.includes('version: "v07"')) fail("single-file build does not include audio manifest v07");
  const audioDataUrlCount = (html.match(/data:audio\/wav;base64/g) || []).length;
  if (audioDataUrlCount < 22) fail(`single-file build should inline 16 SFX and 6 BGM WAV assets, found ${audioDataUrlCount}`);
  if (html.includes("assets/audio/bgm/")) fail("single-file build still references external BGM paths");
  if (html.includes("key-pilot-mvp-local.zip")) fail("single-file build still mentions key-pilot-mvp-local.zip");
  ["legacyConceptCrop", "placeholderBackground", "targetHudPlaceholder", "chromaSource"].forEach((field) => {
    if (html.includes(field)) fail(`single-file build still includes deprecated manifest field: ${field}`);
  });
}

if (fs.existsSync(path.join(root, "key-pilot-mvp-local.zip"))) {
  fail("key-pilot-mvp-local.zip should stay removed; desktop app plus single-file HTML are the supported local options");
}

if (fs.existsSync(path.join(root, "dist", "Key-Pilot-portable-mac-arm64.zip"))) {
  fail("dist/Key-Pilot-portable-mac-arm64.zip is a stale raw package; use Key-Pilot-internal-mac-arm64.zip instead");
}

const readme = fs.existsSync(path.join(root, "README.md")) ? readText("README.md") : "";
if (readme.includes("key-pilot-mvp-local.zip")) {
  fail("README.md still documents the deprecated zip package");
}
if (!readme.includes("npm run desktop") || !readme.includes("dist/Key Pilot.app") || !readme.includes("Key-Pilot-internal-mac-arm64.zip")) {
  fail("README.md should document desktop run, app package, and internal zip commands");
}
if (readme.includes("Key-Pilot-portable-mac-arm64.zip")) {
  fail("README.md should not recommend the old raw portable app zip");
}

if (failures.length) {
  console.error("Distribution check failed:");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log("Distribution check passed: desktop entry and single-file fallback are healthy.");
