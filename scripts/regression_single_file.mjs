import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const consoleErrors = [];

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function mimeFor(file) {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".png")) return "image/png";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".wav")) return "audio/wav";
  if (file.endsWith(".m4a")) return "audio/mp4";
  return "application/octet-stream";
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const requested = decodeURIComponent(url.pathname === "/" ? "/key-pilot-mvp.html" : url.pathname);
    const normalized = path.normalize(requested).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(root, normalized);
    if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": mimeFor(filePath) });
    fs.createReadStream(filePath).pipe(response);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  for (const bin of ["google-chrome", "chromium", "chromium-browser"]) {
    const found = spawnSync("which", [bin], { encoding: "utf8" });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error("Chrome/Chromium executable not found. Set CHROME_BIN to run regression.");
}

async function launchChrome() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "key-pilot-regression-"));
  const chrome = spawn(findChrome(), [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "--autoplay-policy=no-user-gesture-required",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "about:blank"
  ], { stdio: ["ignore", "ignore", "pipe"] });
  chrome.stderr.on("data", () => {});
  const activePortPath = path.join(userDataDir, "DevToolsActivePort");
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (fs.existsSync(activePortPath)) {
      const [port, wsPath] = fs.readFileSync(activePortPath, "utf8").trim().split("\n");
      return { chrome, wsUrl: `ws://127.0.0.1:${port}${wsPath}`, userDataDir };
    }
    await delay(100);
  }
  chrome.kill();
  throw new Error("Chrome DevTools port did not become available.");
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out connecting to Chrome DevTools")), 5000);
      this.ws.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => this.handleMessage(event));
  }

  handleMessage(event) {
    const message = JSON.parse(String(event.data));
    if (message.id && this.pending.has(message.id)) {
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message || "CDP command failed"));
      else resolve(message.result || {});
      return;
    }
    const callbacks = this.listeners.get(message.method) || [];
    callbacks.forEach((callback) => callback(message));
  }

  send(method, params = {}, sessionId = null) {
    const id = this.nextId;
    this.nextId += 1;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP command timed out: ${method}`));
        }
      }, 10000);
    });
  }

  on(method, callback) {
    const callbacks = this.listeners.get(method) || [];
    callbacks.push(callback);
    this.listeners.set(method, callbacks);
  }

  waitFor(method, sessionId = null, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);
      const handler = (message) => {
        if (sessionId && message.sessionId !== sessionId) return;
        clearTimeout(timer);
        const callbacks = this.listeners.get(method) || [];
        this.listeners.set(method, callbacks.filter((item) => item !== handler));
        resolve(message.params || {});
      };
      this.on(method, handler);
    });
  }

  close() {
    this.ws?.close();
  }
}

async function setupPage(client) {
  const { targetId } = await client.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await client.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params = {}) => client.send(method, params, sessionId);
  client.on("Runtime.exceptionThrown", (message) => {
    if (message.sessionId !== sessionId) return;
    const details = message.params?.exceptionDetails;
    const text = details?.exception?.description
      || details?.exception?.value
      || details?.text
      || "Runtime exception";
    consoleErrors.push(text);
  });
  client.on("Runtime.consoleAPICalled", (message) => {
    if (message.sessionId !== sessionId) return;
    if (!["error", "warning"].includes(message.params?.type)) return;
    const text = (message.params.args || []).map((arg) => arg.value || arg.description || "").join(" ");
    if (message.params.type === "error") consoleErrors.push(text || "Console error");
  });
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  return { sessionId, send };
}

async function evaluate(page, expression) {
  const result = await page.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description
      || result.exceptionDetails.exception?.value
      || result.exceptionDetails.text
      || "Evaluation failed";
    throw new Error(detail);
  }
  return result.result?.value;
}

async function waitForEval(page, expression, timeoutMs = 10000, label = expression) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate(page, expression).catch(() => false);
    if (value) return value;
    await delay(100);
  }
  const details = consoleErrors.length ? ` Console errors: ${consoleErrors.join(" | ")}` : "";
  throw new Error(`Timed out waiting for ${label}.${details}`);
}

async function click(page, selector) {
  await evaluate(page, `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) throw new Error(${JSON.stringify(`Missing selector: ${selector}`)});
    el.click();
    return true;
  })()`);
}

async function press(page, key) {
  await evaluate(page, `document.dispatchEvent(new KeyboardEvent("keydown", {
    key: ${JSON.stringify(key)},
    bubbles: true,
    cancelable: true
  }))`);
}

async function debugState(page) {
  return evaluate(page, `window.__KEY_PILOT_DEBUG_STATE__ ? window.__KEY_PILOT_DEBUG_STATE__() : null`);
}

async function homeSceneDebug(page) {
  return evaluate(page, `(() => {
    const scene = window.__KEY_PILOT_PHASER__?.scene?.scenes?.[0];
    return scene?.getDebugState?.() || null;
  })()`);
}

async function runHomeRegression(page) {
  await click(page, '[data-start-level="level-01-home"]');
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().status === "prelock"`, 8000, "01 prelock");
  let debug = await debugState(page);
  assert(debug.currentTarget === "f", `01 should start on F, got ${debug.currentTarget}`);
  assert(await evaluate(page, `document.querySelector("#app")?.getAttribute("role") === "application"`), "app should expose an application role for assistive tech");
  assert(await evaluate(page, `Boolean(document.querySelector("#key-pilot-live-region"))`), "app should keep a polite live region mounted");

  await press(page, "f");
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().currentTarget === "j"`, 4000, "01 switches to J after F");
  const prelockCommand = await evaluate(page, `document.querySelector(".prelock-focus-command strong")?.textContent.trim()`);
  assert(prelockCommand === "J", `01 prelock command should show J after F, got ${prelockCommand}`);

  await press(page, "j");
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().status === "playing"`, 6000, "01 playing");
  assert(await evaluate(page, `!document.querySelector(".prelock-focus-command")`), "01 prelock focus command should disappear after F/J lock");
  assert(await evaluate(page, `document.querySelectorAll("#home-phaser-stage canvas").length === 1`), "01 should keep exactly one home Phaser canvas");
  let homeDebug = await homeSceneDebug(page);
  assert(homeDebug?.mode === "home", `01 should run through HomePreflightScene, got ${homeDebug?.mode || "missing"}`);
  assert(homeDebug.canvasCount === 1, `01 HomePreflightScene should own exactly one canvas, got ${homeDebug.canvasCount}`);
  assert(homeDebug.childCount > 8, `01 HomePreflightScene should render a populated world, got ${homeDebug.childCount} display objects`);

  for (let index = 0; index < 12; index += 1) {
    debug = await debugState(page);
    assert(debug.currentTarget, `01 target missing before input ${index + 1}`);
    const before = debug.completedActions || debug.completedTargets || 0;
    await press(page, debug.currentTarget);
    await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().completedActions > ${before} || window.__KEY_PILOT_DEBUG_STATE__?.().completedTargets > ${before}`, 5000, `01 input ${index + 1}`);
    const commandText = await evaluate(page, `document.querySelector(".scene-command strong")?.textContent.trim() || ""`);
    assert(commandText.length >= 1, `01 scene command key disappeared after input ${index + 1}`);
    homeDebug = await homeSceneDebug(page);
    assert(homeDebug?.currentTarget, `01 Phaser target disappeared after input ${index + 1}`);
    assert(await evaluate(page, `!document.querySelector(".app-shell.audio-beat")`), "01 should not leave audio-beat flash class on the shell");
    assert(await evaluate(page, `document.querySelectorAll("#home-phaser-stage canvas").length === 1`), "01 should not duplicate home canvas");
  }

  await press(page, "Escape");
  await waitForEval(page, `Boolean(document.querySelector(".menu-grid"))`, 5000, "return to menu after 01");
}

async function runStrikeRegression(page) {
  await click(page, '[data-start-level="level-02-strike"]');
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().status === "finger-calibration"`, 8000, "02 calibration");
  await click(page, "[data-skip-calibration]");
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().status === "playing"`, 8000, "02 combat");
  assert(await evaluate(page, `document.querySelectorAll("#strike-phaser-stage canvas").length === 1`), "02 should start with exactly one combat canvas");

  let maxCanvasCount = 0;
  for (let step = 0; step < 160; step += 1) {
    const debug = await debugState(page);
    if (debug.resultReason === "complete") break;
    const canvasCount = await evaluate(page, `document.querySelectorAll("#strike-phaser-stage canvas").length`);
    maxCanvasCount = Math.max(maxCanvasCount, canvasCount || 0);
    if (debug.inputLockedRemaining > 0 || !debug.currentTarget) {
      await delay(140);
      continue;
    }
    await press(page, debug.currentTarget);
    await delay(90);
  }

  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().resultReason === "complete"`, 12000, "02 complete result");
  const debug = await debugState(page);
  assert(debug.completedActions === 20, `02 should complete 20 encounters, got ${debug.completedActions}`);
  assert(maxCanvasCount <= 1, `02 duplicated combat canvas, max count ${maxCanvasCount}`);
  assert(await evaluate(page, `!document.body.textContent.includes("清障协议接入")`), "02 should not show old room protocol popup text");
}

function analyzeCruiseDistribution(queue) {
  const total = queue.length || 1;
  const left = queue.filter((item) => item.side === "left").length;
  const right = queue.filter((item) => item.side === "right").length;
  let maxSameSideStreak = 0;
  let maxSameFingerStreak = 0;
  let sideStreak = 0;
  let fingerStreak = 0;
  let lastSide = "";
  let lastFinger = "";
  queue.forEach((item) => {
    sideStreak = item.side === lastSide ? sideStreak + 1 : 1;
    fingerStreak = item.guideId === lastFinger ? fingerStreak + 1 : 1;
    maxSameSideStreak = Math.max(maxSameSideStreak, sideStreak);
    maxSameFingerStreak = Math.max(maxSameFingerStreak, fingerStreak);
    lastSide = item.side;
    lastFinger = item.guideId;
  });
  return {
    total,
    left,
    right,
    leftRatio: left / total,
    rightRatio: right / total,
    maxSameSideStreak,
    maxSameFingerStreak
  };
}

async function assertCruiseVisualNoiseAbsent(page, label = "03 visual noise guard") {
  const visual = await evaluate(page, `(() => {
    const scene = window.__KEY_PILOT_PHASER__?.scene?.keys?.CruiseDefenseScene;
    if (!scene) return { missing: true };
    const count = (name) => scene.layers?.[name]?.list?.length || 0;
    return {
      missing: false,
      hasK01Glow: Boolean(scene.k01Glow),
      hasThreatSource: Boolean(scene.threatSource),
      swarmSprites: scene.swarmSprites?.length || 0,
      trailSprites: scene.trailSprites?.length || 0,
      overlayCount: count("overlay"),
      worldCount: count("world")
    };
  })()`);
  assert(!visual.missing, `${label}: CruiseDefenseScene is missing`);
  assert(!visual.hasK01Glow, `${label}: old K-01 glow ring is still mounted`);
  assert(!visual.hasThreatSource, `${label}: old threat source geometry is still mounted`);
  assert(visual.swarmSprites === 0, `${label}: old swarm companion sprites remain (${visual.swarmSprites})`);
  assert(visual.trailSprites === 0, `${label}: old trail sprites remain (${visual.trailSprites})`);
  assert(visual.overlayCount === 0, `${label}: overlay geometry should be empty, got ${visual.overlayCount}`);
  assert(visual.worldCount <= 2, `${label}: world layer should only contain threat lane and shield graphics, got ${visual.worldCount}`);
}

async function cruiseSceneDebug(page) {
  return evaluate(page, `(() => {
    const scene = window.__KEY_PILOT_PHASER__?.scene?.keys?.CruiseDefenseScene;
    return scene?.getDebugState?.() || null;
  })()`);
}

async function assertCruiseBattleObjectsReady(page, label = "03 battle objects") {
  const sceneDebug = await cruiseSceneDebug(page);
  assert(sceneDebug, `${label}: CruiseDefenseScene debug state missing`);
  const actorCount = sceneDebug.wave?.actorCount || 0;
  const visibleCount = sceneDebug.wave?.visibleCount || 0;
  const roundSize = sceneDebug.roundSize || 0;
  assert(roundSize > 0, `${label}: current round should expose a positive size`);
  assert(actorCount === roundSize, `${label}: wave actors should match round size, got ${actorCount}/${roundSize}`);
  assert(visibleCount >= 1 && visibleCount <= Math.min(3, roundSize), `${label}: visible wave actors should be active plus near queue only, got ${visibleCount}/${roundSize}`);
  assert(sceneDebug.wave?.aggressiveMotion === true, `${label}: wave controller should use the aggressive pounce motion system`);
  assert(sceneDebug.wave?.motionVersion === "pounce-v08", `${label}: expected pounce-v08 motion, got ${sceneDebug.wave?.motionVersion}`);
  assert((sceneDebug.wave?.staleClearedVisible || 0) === 0, `${label}: cleared threats should not remain visible, got ${sceneDebug.wave?.staleClearedVisible}`);
  if (!sceneDebug.introActive && sceneDebug.wave?.activeId) {
    assert(
      !["queued", "hidden", "cleared"].includes(sceneDebug.wave?.activeMotionPhase),
      `${label}: active threat should be in an attack phase, got ${sceneDebug.wave?.activeMotionPhase}`
    );
  }
  assert(sceneDebug.canvasCount === 1, `${label}: cruise canvas count should stay 1, got ${sceneDebug.canvasCount}`);
}

async function runCruiseRegression(page) {
  await click(page, '[data-start-level="level-03-cruise"]');
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().status === "playing"`, 8000, "03 cruise playing");
  assert(await evaluate(page, `document.querySelectorAll("#cruise-phaser-stage canvas").length === 1`), "03 should start with exactly one cruise canvas");
  await delay(250);
  await assertCruiseVisualNoiseAbsent(page, "03 start");
  await assertCruiseBattleObjectsReady(page, "03 start objects");

  let debug = await debugState(page);
  assert(debug.targetActions === 71, `03 should generate 71 threats with late long strings, got ${debug.targetActions}`);
  const distribution = analyzeCruiseDistribution(debug.cruiseQueue || []);
  assert(distribution.total === debug.targetActions, `03 cruise queue should match target actions, queue ${distribution.total}, target ${debug.targetActions}`);
  assert(!(debug.cruiseQueue || []).some((threat) => threat.type === "anchor"), "03 should not render home-row targets as anchor fallback threats");
  assert(distribution.leftRatio >= 0.42 && distribution.leftRatio <= 0.58, `03 left/right ratio is unbalanced: left ${distribution.left}/${distribution.total}`);
  assert(distribution.rightRatio >= 0.42 && distribution.rightRatio <= 0.58, `03 right ratio is unbalanced: right ${distribution.right}/${distribution.total}`);
  assert(distribution.maxSameSideStreak <= 4, `03 has too many same-hand targets in a row: ${distribution.maxSameSideStreak}`);
  assert(distribution.maxSameFingerStreak <= 3, `03 has too many same-finger targets in a row: ${distribution.maxSameFingerStreak}`);
  await waitForEval(page, `Boolean(window.__KEY_PILOT_DEBUG_STATE__?.().currentTarget)`, 6000, "03 active threat after intro");
  const beforeTimeout = await cruiseSceneDebug(page);
  const previousTimeouts = (await debugState(page)).cruise?.timeouts || 0;
  await evaluate(page, `window.__KEY_PILOT_DEBUG_FORCE_CRUISE_DEADLINE__?.(80)`);
  await delay(420);
  const afterTimeout = await cruiseSceneDebug(page);
  debug = await debugState(page);
  assert((debug.cruise?.timeouts || 0) > previousTimeouts, "03 forced threat deadline should register a timeout");
  assert(afterTimeout?.shieldDamage > (beforeTimeout?.shieldDamage || 0), `03 timeout should increase shield damage, before ${beforeTimeout?.shieldDamage}, after ${afterTimeout?.shieldDamage}`);
  await assertCruiseVisualNoiseAbsent(page, "03 after forced threat timeout");
  await assertCruiseBattleObjectsReady(page, "03 after forced threat timeout objects");
  await evaluate(page, `window.__KEY_PILOT_DEBUG_FORCE_HULL_DAMAGE__?.(65)`);
  await delay(220);
  debug = await debugState(page);
  assert(debug.status === "playing", `03 low hull should keep the run alive, got ${debug.status}`);
  assert(debug.hull <= 40 && debug.hull > 0, `03 forced low hull should leave K-01 damaged but alive, hull ${debug.hull}`);
  assert(debug.hullAlertVisible || debug.hullAlertLevel, "03 low hull should raise a visible hull alert state");

  let maxCanvasCount = 0;
  let checkedInterceptObject = false;
  for (let step = 0; step < 140; step += 1) {
    debug = await debugState(page);
    if (debug.resultReason === "complete") break;
    const canvasCount = await evaluate(page, `document.querySelectorAll("#cruise-phaser-stage canvas").length`);
    maxCanvasCount = Math.max(maxCanvasCount, canvasCount || 0);
    if (debug.inputLockedRemaining > 0 || !debug.currentTarget) {
      await delay(80);
      continue;
    }
    const beforePressScene = checkedInterceptObject ? null : await cruiseSceneDebug(page);
    await press(page, debug.currentTarget);
    await delay(150);
    if (!checkedInterceptObject && beforePressScene?.wave) {
      const afterPressScene = await cruiseSceneDebug(page);
      assert(
        afterPressScene?.wave?.roundKey !== beforePressScene.wave.roundKey
          || afterPressScene?.wave?.activeId !== beforePressScene.wave.activeId
          || (afterPressScene?.wave?.clearedCount || 0) > (beforePressScene.wave.clearedCount || 0),
        "03 correct input should clear an active wave actor or advance the wave"
      );
      checkedInterceptObject = true;
    }
    if (step % 12 === 0) {
      await delay(220);
      await assertCruiseVisualNoiseAbsent(page, `03 visual noise after input ${step + 1}`);
      await assertCruiseBattleObjectsReady(page, `03 battle objects after input ${step + 1}`);
    }
  }

  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().resultReason === "complete"`, 12000, "03 complete result");
  debug = await debugState(page);
  assert(debug.completedActions === debug.targetActions, `03 should complete all threats, got ${debug.completedActions}/${debug.targetActions}`);
  assert(maxCanvasCount <= 1, `03 duplicated cruise canvas, max count ${maxCanvasCount}`);
}

async function runCruiseOuterTimeoutRegression(page) {
  await click(page, '[data-start-level="level-03-cruise"]');
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().status === "playing"`, 8000, "03 timeout regression playing");
  await evaluate(page, `window.__KEY_PILOT_DEBUG_FORCE_TIMELEFT__?.(1)`);
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().resultReason === "timeout"`, 4000, "03 outer timer timeout result");
  const debug = await debugState(page);
  assert(debug.resultReason === "timeout", `03 outer mission timer should fail the run, got ${debug.resultReason}`);
  await click(page, "[data-stop]");
  await waitForEval(page, `Boolean(document.querySelector(".menu-grid"))`, 5000, "return to menu after 03 timeout regression");
}

async function runCruiseDeathRegression(page) {
  await click(page, '[data-stop]');
  await waitForEval(page, `Boolean(document.querySelector(".menu-grid"))`, 5000, "return to menu before 03 death regression");
  await click(page, '[data-start-level="level-03-cruise"]');
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().status === "playing"`, 8000, "03 death regression playing");
  await evaluate(page, `window.__KEY_PILOT_DEBUG_FORCE_HULL_DAMAGE__?.(140)`);
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().resultReason === "death"`, 4000, "03 forced death result");
  const debug = await debugState(page);
  assert(debug.resultReason === "death", `03 forced death should finish as death, got ${debug.resultReason}`);
}

async function runDeferredFinishIsolationRegression(page) {
  await click(page, '[data-start-level="level-03-cruise"]');
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().status === "playing"`, 8000, "deferred finish isolation start");
  const oldRunId = await evaluate(page, `window.__KEY_PILOT_DEBUG_SCHEDULE_DEFERRED_COMPLETE__?.(180)`);
  await press(page, "Escape");
  await waitForEval(page, `Boolean(document.querySelector(".menu-grid"))`, 5000, "return to menu after scheduling deferred finish");
  await click(page, '[data-start-level="level-01-home"]');
  await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().status === "prelock"`, 8000, "01 after stale deferred finish");
  await delay(320);
  const debug = await debugState(page);
  assert(debug.runId !== oldRunId, "new run should have a fresh runId after restart");
  assert(!debug.resultReason, `stale deferred finish should not complete the new run, got ${debug.resultReason}`);
  assert(debug.status === "prelock", `new 01 run should remain in prelock, got ${debug.status}`);
  await press(page, "Escape");
  await waitForEval(page, `Boolean(document.querySelector(".menu-grid"))`, 5000, "return to menu after deferred finish isolation");
}

async function main() {
  if (!fs.existsSync(path.join(root, "key-pilot-mvp.html"))) {
    throw new Error("key-pilot-mvp.html is missing. Run node scripts/build_single_file.js first.");
  }
  const server = await startServer();
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}/key-pilot-mvp.html?debug`;
  const chromeRuntime = await launchChrome();
  const client = new CdpClient(chromeRuntime.wsUrl);
  try {
    await client.connect();
    const page = await setupPage(client);
    const loaded = client.waitFor("Page.loadEventFired", page.sessionId, 15000);
    await page.send("Page.navigate", { url });
    await loaded;
    await waitForEval(page, `document.title.includes("Key Pilot") && Boolean(document.querySelector(".menu-grid"))`, 30000, "menu screen");

    assert(await evaluate(page, `document.scrollingElement.scrollHeight <= window.innerHeight + 2`), "single-file page should not have a vertical scrollbar at first load");
    assert(await evaluate(page, `document.querySelectorAll("canvas").length === 0`), "menu should not create gameplay canvas before a level starts");
    assert(await evaluate(page, `document.querySelector("#app")?.getAttribute("role") === "application"`), "menu should expose app role");
    assert(await evaluate(page, `Boolean(document.querySelector("#key-pilot-live-region"))`), "menu should mount accessibility live region");

    await runHomeRegression(page);
    await runStrikeRegression(page);
    await click(page, '[data-start-level="level-03-cruise"]');
    await waitForEval(page, `window.__KEY_PILOT_DEBUG_STATE__?.().status === "playing"`, 8000, "03 direct start after 02 report");
    await press(page, "Escape");
    await waitForEval(page, `Boolean(document.querySelector(".menu-grid"))`, 5000, "return to menu before 03 full regression");
    await runDeferredFinishIsolationRegression(page);
    await runCruiseOuterTimeoutRegression(page);
    await runCruiseRegression(page);
    await runCruiseDeathRegression(page);

    const audio = (await debugState(page))?.audio || {};
    assert(["cruise", "report"].includes(audio.bgmId), `BGM should be on a v07 loop after gameplay, got ${audio.bgmId || "none"}`);
    assert(consoleErrors.length === 0, `Console/runtime errors found: ${consoleErrors.join(" | ")}`);
  } finally {
    client.close();
    chromeRuntime.chrome.kill();
    server.close();
  }

  if (failures.length) {
    console.error("Regression failed:");
    failures.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
  }
  console.log("Regression passed: single-file 01, 02, and 03 flows are healthy.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
