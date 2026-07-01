(function () {
  const BG_KEY = "key-pilot-preflight-chamber-v03";
  const K01_KEY = "key-pilot-k01-concept-v03";
  const HOME_KEYS = ["a", "s", "d", "f", "j", "k", "l", ";"];

  function assetManifest() {
    return window.KeyPilotAssets || {};
  }

  function sceneBackground() {
    return assetManifest().scenes?.preflightChamber?.background || "";
  }

  function k01Preview() {
    return assetManifest().characters?.k01?.preview || "";
  }

  function formatKey(key) {
    return key === ";" ? ";" : String(key || "").toUpperCase();
  }

  function textStyle(style, pixelRatio = 1) {
    return {
      resolution: Math.min(pixelRatio || 1, 2),
      ...style
    };
  }

  function drawPulse(scene, x, y, color, alpha, startRadius, endRadius, reducedMotion) {
    const pulse = scene.add.circle(x, y, startRadius, color, 0).setStrokeStyle(5, color, alpha).setDepth(60);
    if (!reducedMotion) {
      scene.tweens.add({ targets: pulse, radius: endRadius, alpha: 0, duration: 360, ease: "Cubic.easeOut" });
    } else {
      pulse.setAlpha(0.2);
    }
  }

  function drawBeam(scene, from, to, color, alpha, thickness, depth) {
    const beam = scene.add.graphics().setDepth(depth);
    beam.lineStyle(thickness + 8, color, alpha * 0.12);
    beam.beginPath();
    beam.moveTo(from.x, from.y);
    beam.lineTo(to.x, to.y);
    beam.strokePath();
    beam.lineStyle(thickness, color, alpha);
    beam.beginPath();
    beam.moveTo(from.x, from.y);
    beam.lineTo(to.x, to.y);
    beam.strokePath();
    return beam;
  }

  class HomePreflightScene extends Phaser.Scene {
    preload() {
      const background = sceneBackground();
      if (background && !this.textures.exists(BG_KEY)) this.load.image(BG_KEY, background);
      const k01 = k01Preview();
      if (k01 && !this.textures.exists(K01_KEY)) this.load.image(K01_KEY, k01);
    }

    create() {
      this.__keyPilotMode = "home";
      this.updateSnapshot = (snapshot) => {
        this.children.removeAll(true);
        this.tweens.killAll();
        this.renderWorld(snapshot || window.__KEY_PILOT_HOME_SNAPSHOT__);
      };
      this.updateSnapshot(window.__KEY_PILOT_HOME_SNAPSHOT__);
    }

    renderWorld(snapshot) {
      if (!snapshot) return;
      this.snapshot = snapshot;
      const { width, height, palette, pixelRatio = 1 } = snapshot;
      this.cameras.main.setZoom(pixelRatio);
      this.cameras.main.centerOn(width / 2, height / 2);
      this.cameras.main.setBackgroundColor(palette.bg);
      this.drawHangar(snapshot);
      const robotX = snapshot.status === "prelock" ? width * 0.5 : width * 0.48;
      const robotY = snapshot.status === "prelock" ? height * 0.58 : height * 0.52;
      const robot = this.drawRobot(snapshot, robotX, robotY);
      const stations = this.drawStations(snapshot);
      this.drawAnchors(snapshot, robotX, robotY, stations);
      this.drawResidualThreat(snapshot);
      this.drawEvent(snapshot, { robot, robotX, robotY, stations });
      this.drawTargetBeacon(snapshot);
    }

    drawHangar(snapshot) {
      const { width, height, palette, corruption } = snapshot;
      const hasBackground = this.textures.exists(BG_KEY);
      if (hasBackground) {
        const background = this.add.image(width * 0.5, height * 0.5, BG_KEY).setDepth(0);
        background.setScale(Math.max(width / background.width, height / background.height)).setAlpha(0.94);
      }
      const g = this.add.graphics().setDepth(1);
      if (!hasBackground) {
        g.fillStyle(palette.wall, 1);
        g.fillRect(0, 0, width, height);
      } else {
        g.fillStyle(0x02070c, 0.32);
        g.fillRect(0, 0, width, height);
      }
      g.fillStyle(palette.fog, hasBackground ? 0.2 + corruption * 0.12 : 0.36 + corruption * 0.18);
      g.fillEllipse(width * 0.5, height * 0.5, width * 0.72, height * 0.72);
      g.fillStyle(0x020608, hasBackground ? 0.34 : 0.6);
      g.fillRoundedRect(width * 0.34, height * 0.16, width * 0.32, height * 0.52, 8);
      g.lineStyle(4, palette.accent, snapshot.leftLocked && snapshot.rightLocked ? 0.34 : 0.14);
      g.strokeRoundedRect(width * 0.34, height * 0.16, width * 0.32, height * 0.52, 8);
      const doorGap = snapshot.leftLocked && snapshot.rightLocked ? width * 0.06 : 0;
      g.fillStyle(0x071820, 0.3);
      g.fillRoundedRect(width * 0.36 - doorGap, height * 0.18, width * 0.13, height * 0.48, 4);
      g.fillRoundedRect(width * 0.51 + doorGap, height * 0.18, width * 0.13, height * 0.48, 4);
      g.fillStyle(palette.danger, 0.11 + corruption * 0.12);
      g.fillRect(0, 0, width * 0.085, height);
      g.lineStyle(3, palette.danger, 0.26 + corruption * 0.18);
      g.lineBetween(width * 0.085, 0, width * 0.085, height);
      const progress = snapshot.targetCount ? snapshot.completedTargets / snapshot.targetCount : 0;
      g.fillStyle(palette.green, 0.16);
      g.fillRoundedRect(width * 0.2, height * 0.87, width * 0.6, 10, 5);
      g.fillStyle(palette.green, 0.72);
      g.fillRoundedRect(width * 0.2, height * 0.87, width * 0.6 * progress, 10, 5);
      this.add.text(width * 0.5, height * 0.14, snapshot.status === "prelock" ? "开舱锁定" : "中排神经底座", textStyle({
        fontFamily: "PingFang SC, system-ui, sans-serif",
        fontSize: "42px",
        fontStyle: "900",
        color: palette.label
      }, snapshot.pixelRatio)).setOrigin(0.5).setDepth(4).setAlpha(hasBackground ? 0.08 : 0.12);
    }

    drawRobot(snapshot, x, y) {
      if (this.textures.exists(K01_KEY)) {
        const robot = this.add.image(x, y, K01_KEY).setDepth(22);
        robot.setScale(Math.min(snapshot.width, snapshot.height) / 760).setAlpha(0.98);
        this.add.text(x, y + 80, "K-01", textStyle({
          fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: "14px",
          fontStyle: "900",
          color: "#d7f7ff"
        }, snapshot.pixelRatio)).setOrigin(0.5).setDepth(24);
        return robot;
      }
      const body = this.add.rectangle(x, y, 86, 88, 0x1f3a42, 1).setStrokeStyle(3, snapshot.palette.secondary, 0.8).setDepth(22);
      this.add.rectangle(x, y - 65, 76, 44, 0x17323c, 1).setStrokeStyle(3, snapshot.palette.accentSoft, 0.76).setDepth(23);
      return body;
    }

    drawStations(snapshot) {
      const { width, height, palette } = snapshot;
      const stations = {};
      if (snapshot.status === "prelock") return stations;
      const stationY = height * 0.74;
      const leftStartX = width * 0.18;
      const rightStartX = width * 0.55;
      const handGap = width * 0.09;
      HOME_KEYS.forEach((key, index) => {
        const localIndex = index < 4 ? index : index - 4;
        const x = (index < 4 ? leftStartX : rightStartX) + handGap * localIndex;
        const active = snapshot.currentTarget === key;
        const charged = Boolean(snapshot.chargedKeys[key]);
        const anchor = key === "f" || key === "j";
        const boxW = anchor ? 58 : 48;
        const boxH = anchor ? 54 : 46;
        const depth = active ? 34 : 24;
        const fillColor = active ? palette.secondary : charged ? 0x17492f : anchor ? 0x11222b : 0x071014;
        const g = this.add.graphics().setDepth(depth);
        g.fillStyle(fillColor, active ? 1 : charged ? 0.58 : anchor ? 0.32 : 0.68);
        g.fillRoundedRect(x - boxW / 2, stationY - boxH / 2, boxW, boxH, 5);
        g.lineStyle(2, active ? 0xfff2a8 : charged ? palette.green : palette.accentSoft, active ? 1 : charged ? 0.42 : 0.26);
        g.strokeRoundedRect(x - boxW / 2, stationY - boxH / 2, boxW, boxH, 5);
        this.add.text(x, stationY - 2, formatKey(key), textStyle({
          fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
          fontSize: active ? "30px" : anchor ? "25px" : "20px",
          fontStyle: "900",
          color: active ? "#07100f" : charged ? "#a8ffd0" : anchor ? "#96c6d3" : "#a9d9e8"
        }, snapshot.pixelRatio)).setOrigin(0.5).setDepth(depth + 2);
        this.add.text(x, stationY + boxH / 2 + 14, active ? "现在按" : charged ? "亮起" : anchor ? "主锚" : "底座", textStyle({
          fontFamily: "PingFang SC, system-ui, sans-serif",
          fontSize: "12px",
          color: active ? "#fff1b8" : charged ? "#b8ffd5" : "#7fa4b0"
        }, snapshot.pixelRatio)).setOrigin(0.5).setDepth(depth + 1).setAlpha(active ? 0.86 : charged ? 0.58 : 0.42);
        stations[key] = { x, y: stationY, active, charged, anchor };
      });
      return stations;
    }

    drawAnchors(snapshot, robotX, robotY, stations) {
      const { width, height, palette } = snapshot;
      const g = this.add.graphics().setDepth(18);
      [
        { x: width * 0.23, y: height * 0.32, key: "F", locked: snapshot.leftLocked },
        { x: width * 0.77, y: height * 0.32, key: "J", locked: snapshot.rightLocked }
      ].forEach((anchor) => {
        const key = anchor.key.toLowerCase();
        const activeAnchor = snapshot.currentTarget === key;
        const lineAlpha = snapshot.status === "prelock" ? anchor.locked ? 0.72 : 0.2 : activeAnchor ? 0.58 : 0.14;
        g.lineStyle(4, anchor.locked ? palette.green : palette.accentSoft, lineAlpha);
        g.lineBetween(anchor.x, anchor.y, robotX, robotY - 40);
        this.drawKeyPad(snapshot, anchor.x, anchor.y, key, anchor.locked || activeAnchor, 28);
      });
      if (snapshot.status === "playing" && stations[snapshot.currentTarget]) {
        const station = stations[snapshot.currentTarget];
        drawBeam(this, { x: station.x, y: station.y }, { x: robotX, y: robotY + 10 }, palette.secondary, 0.42, 5, 19);
      }
    }

    drawKeyPad(snapshot, x, y, key, active, depth) {
      const g = this.add.graphics().setDepth(depth);
      g.fillStyle(active ? 0xffd66e : 0x081219, active ? 1 : 0.6);
      g.fillRoundedRect(x - 34, y - 26, 68, 52, 6);
      g.lineStyle(2, active ? 0xfff3bd : snapshot.palette.accentSoft, active ? 1 : 0.45);
      g.strokeRoundedRect(x - 34, y - 26, 68, 52, 6);
      this.add.text(x, y - 1, formatKey(key), textStyle({
        fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: "27px",
        fontStyle: "900",
        color: active ? "#07100f" : "#a9d9e8"
      }, snapshot.pixelRatio)).setOrigin(0.5).setDepth(depth + 1);
    }

    drawTargetBeacon(snapshot) {
      const target = formatKey(snapshot.currentTarget);
      if (!target) return;
      const { width, height, palette } = snapshot;
      const x = width * 0.5;
      const y = snapshot.status === "prelock" ? height * 0.22 : height * 0.2;
      const caption = snapshot.status === "prelock"
        ? target === "F" ? "按 F 锁定左手主锚" : "按 J 锁定右手主锚"
        : `现在按 ${target}`;
      const g = this.add.graphics().setDepth(74);
      g.fillStyle(0x02070c, 0.88);
      g.fillRoundedRect(x - 132, y - 44, 264, 88, 9);
      g.lineStyle(3, palette.secondary, 0.92);
      g.strokeRoundedRect(x - 132, y - 44, 264, 88, 9);
      g.fillStyle(0xffd66e, 1);
      g.fillRoundedRect(x - 34, y - 34, 68, 68, 8);
      this.add.text(x, y - 1, target, textStyle({
        fontFamily: "SFMono-Regular, Menlo, Consolas, monospace",
        fontSize: "42px",
        fontStyle: "900",
        color: "#07100f"
      }, snapshot.pixelRatio)).setOrigin(0.5).setDepth(76);
      this.add.text(x, y + 56, caption, textStyle({
        fontFamily: "PingFang SC, system-ui, sans-serif",
        fontSize: "15px",
        fontStyle: "800",
        color: "#fff2bc"
      }, snapshot.pixelRatio)).setOrigin(0.5).setDepth(76);
    }

    drawResidualThreat(snapshot) {
      const { width, height, palette, corruption } = snapshot;
      const g = this.add.graphics().setDepth(12);
      g.fillStyle(palette.danger, 0.18 + corruption * 0.32);
      g.fillEllipse(width * 0.11, height * 0.5, 118 + corruption * 80, 160 + corruption * 80);
      g.lineStyle(3, palette.danger, 0.3 + corruption * 0.36);
      g.strokeEllipse(width * 0.11, height * 0.5, 128 + corruption * 90, 170 + corruption * 90);
      this.add.text(width * 0.12, height * 0.62, "偏左残影", textStyle({
        fontFamily: "PingFang SC, system-ui, sans-serif",
        fontSize: "14px",
        fontStyle: "800",
        color: "#ffd3d1",
        backgroundColor: "rgba(35,6,8,0.58)",
        padding: { x: 7, y: 3 }
      }, snapshot.pixelRatio)).setOrigin(0.5).setDepth(13).setAlpha(0.76);
    }

    drawEvent(snapshot, refs) {
      const { width, height, event, palette, reducedMotion } = snapshot;
      const activeStation = refs.stations[snapshot.currentTarget];
      if (event === "boot") {
        const x = snapshot.currentTarget === "j" ? width * 0.77 : width * 0.23;
        drawPulse(this, x, height * 0.32, palette.green, 0.72, 46, 92, reducedMotion);
      }
      if (event === "launch") {
        const gate = this.add.rectangle(width * 0.5, height * 0.42, width * 0.32, height * 0.52, palette.green, 0.12).setDepth(45);
        if (!reducedMotion) this.tweens.add({ targets: gate, alpha: 0, scaleX: 1.18, scaleY: 1.12, duration: 420, ease: "Cubic.easeOut" });
      }
      if ((event === "charge" || event === "hit") && activeStation) {
        drawPulse(this, activeStation.x, activeStation.y, palette.secondary, 0.82, 38, 86, reducedMotion);
      }
      if (event === "crash" || event === "drift") {
        const flash = this.add.rectangle(width * 0.07, height * 0.5, width * 0.16, height, palette.danger, event === "drift" ? 0.34 : 0.22).setDepth(50);
        drawPulse(this, width * 0.1, height * 0.5, palette.danger, 0.72, 70, 180, reducedMotion);
        if (!reducedMotion) {
          this.cameras.main.shake(event === "drift" ? 260 : 180, event === "drift" ? 0.016 : 0.009);
          this.tweens.add({ targets: flash, alpha: 0, duration: 320, ease: "Cubic.easeOut" });
          this.tweens.add({ targets: refs.robot, x: refs.robotX - 32, duration: 120, yoyo: true, ease: "Cubic.easeOut" });
        }
      }
    }

    getDebugState() {
      return {
        mode: this.__keyPilotMode,
        currentTarget: this.snapshot?.currentTarget || "",
        status: this.snapshot?.status || "",
        childCount: this.children?.list?.length || 0,
        canvasCount: document.querySelectorAll("#home-phaser-stage canvas").length
      };
    }
  }

  window.HomePreflightScene = HomePreflightScene;
})();
