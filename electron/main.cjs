const { app, BrowserWindow, Menu } = require("electron");
const fs = require("node:fs");
const path = require("node:path");

app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
app.commandLine.appendSwitch("disable-features", "HardwareMediaKeyHandling");

const isSmoke = process.env.KEY_PILOT_DESKTOP_SMOKE === "1";
const shouldFullscreen = process.env.KEY_PILOT_FULLSCREEN === "1";
const openDevTools = process.env.KEY_PILOT_DEVTOOLS === "1";

function getAppRoot() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "app")
    : path.resolve(__dirname, "..");
}

function getEntryFile(root) {
  const preferred = process.env.KEY_PILOT_ENTRY || "key-pilot-mvp.html";
  const preferredPath = path.join(root, preferred);
  if (fs.existsSync(preferredPath)) return preferredPath;

  const fallbackPath = path.join(root, "index.html");
  if (fs.existsSync(fallbackPath)) return fallbackPath;

  throw new Error(`Cannot find Key Pilot entry file: ${preferredPath}`);
}

function createWindow() {
  const root = getAppRoot();
  const entry = getEntryFile(root);

  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 720,
    show: !isSmoke,
    backgroundColor: "#02070c",
    autoHideMenuBar: true,
    fullscreenable: true,
    title: "Key Pilot",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  window.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") {
      event.preventDefault();
      window.setFullScreen(!window.isFullScreen());
    }
    if (input.key === "Escape" && window.isFullScreen()) {
      window.setFullScreen(false);
    }
  });

  window.once("ready-to-show", () => {
    if (shouldFullscreen) {
      window.setFullScreen(true);
    } else {
      window.maximize();
    }
    if (!isSmoke) window.show();
    if (openDevTools) window.webContents.openDevTools({ mode: "detach" });
  });

  window.loadFile(entry, {
    query: {
      desktop: "1",
      runtime: "electron",
      ...(isSmoke ? { debug: "1" } : {})
    }
  });

  if (isSmoke) {
    window.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        try {
          const debugState = await window.webContents.executeJavaScript(
            "window.__KEY_PILOT_DEBUG_STATE__ ? window.__KEY_PILOT_DEBUG_STATE__() : null",
            true
          );
          if (!debugState?.audio?.desktop) {
            console.error("Desktop smoke failed: renderer did not enter desktop mode.");
            process.exitCode = 1;
          } else if (debugState.audio.musicEnabled && debugState.audio.audioState !== "running") {
            console.error(`Desktop smoke failed: audio context is ${debugState.audio.audioState || "missing"}.`);
            process.exitCode = 1;
          }
        } catch (error) {
          console.error(error);
          process.exitCode = 1;
        } finally {
          app.quit();
        }
      }, 1400);
    });
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
