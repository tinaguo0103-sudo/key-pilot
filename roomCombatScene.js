(function () {
  const TEXT_FONT = "PingFang SC, Microsoft YaHei, system-ui, sans-serif";
  const MONO_FONT = "SFMono-Regular, Menlo, Consolas, monospace";

  const TEXTURES = {
    room: "kp-room-gate",
    k01: "kp-k01-sheet",
    monster: "kp-monster-driftZombie",
    spark: "kp-vfx-hit-spark",
    vfxCombat: "kp-vfx-combat-sheet",
    targetHud: "kp-ui-target-hud"
  };
  const ROOM_IDS = ["gate", "pipe", "nest", "blackout", "core"];

  function asset(path, fallback = "") {
    return path || fallback;
  }

  function getAssetManifest() {
    return window.KeyPilotAssets || {};
  }

  function roomTextureKey(id = "gate") {
    return `kp-room-${id}`;
  }

  function monsterTextureKey(id = "driftZombie") {
    return `kp-monster-${id}`;
  }

  function animKey(prefix, state) {
    return `${prefix}-${state}`;
  }

  function framesFromList(key, frames) {
    return (frames || []).map((frame) => ({ key, frame }));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatKey(key) {
    if (!key) return "";
    return String(key).toUpperCase();
  }

  function textStyle(snapshot, style) {
    return {
      fontFamily: style.fontFamily || TEXT_FONT,
      fontSize: style.fontSize || "18px",
      color: style.color || "#e8f7ff",
      fontStyle: style.fontStyle,
      align: style.align,
      resolution: Math.min(snapshot.pixelRatio || 1, 2),
      padding: style.padding
    };
  }

  function getPhase(snapshot) {
    if (snapshot.missionClearing) {
      return { code: "ROOM", label: "清除", hint: "任务报告生成中", target: "OK", home: "" };
    }
    const pattern = snapshot.pattern || [];
    const step = clamp(snapshot.pathStep || 0, 0, Math.max(pattern.length - 1, 0));
    const home = pattern[0] || snapshot.currentTarget || "";
    const target = pattern[step] || snapshot.currentTarget || home;
    const isReturn = step > 0 && target === home;
    if (snapshot.event === "arm-stuck" && isReturn) {
      return { code: "RETURN", label: "回收", hint: `按 ${formatKey(home)} 收臂`, target, home };
    }
    if (step === 0) return { code: "BASE", label: "基地", hint: `按 ${formatKey(target)} 接入基地`, target, home };
    if (isReturn) return { code: "RETURN", label: "回收", hint: `按 ${formatKey(target)} 回家闭环`, target, home };
    return { code: "STRIKE", label: "出击", hint: `${formatKey(target)} 目标键，命中后必须回家`, target, home };
  }

  function getLaneY(snapshot, height) {
    const lane = snapshot.encounter?.lane || "mid";
    if (lane === "high") return height * 0.44;
    if (lane === "low") return height * 0.66;
    return height * 0.55;
  }

  function getCombatHudBounds(snapshot) {
    const hudW = clamp(snapshot.width * 0.34, 360, 560) + 44;
    const hudH = clamp(snapshot.height * 0.16, 112, 138) + 72;
    const x = snapshot.width * 0.5;
    const y = snapshot.height * 0.152;
    return {
      left: x - hudW / 2,
      right: x + hudW / 2,
      top: y - hudH / 2,
      bottom: y + hudH / 2
    };
  }

  function clampMonsterPoint(snapshot, x, y, size = 0) {
    const margin = Math.max(24, size * 0.32);
    const hud = getCombatHudBounds(snapshot);
    const minX = snapshot.width * 0.09 + size * 0.22;
    const maxX = snapshot.width * 0.91 - size * 0.24;
    const minY = snapshot.height * 0.38 + size * 0.08;
    const maxY = snapshot.height * 0.74 - size * 0.08;
    let nextX = clamp(x, minX, maxX);
    let nextY = clamp(y, minY, maxY);
    const overlapsHud = nextX > hud.left - margin
      && nextX < hud.right + margin
      && nextY > hud.top - margin
      && nextY < hud.bottom + margin;

    if (overlapsHud) {
      nextX = Math.min(maxX, hud.right + margin);
      if (nextX >= maxX - 2) {
        nextY = Math.min(maxY, hud.bottom + margin);
      }
    }

    return { x: nextX, y: nextY };
  }

  function getRoute(snapshot) {
    const width = snapshot.width;
    const height = snapshot.height;
    const pressure = clamp(snapshot.pressure || 0, 0, 1.25);
    const monsterSize = Math.min(width, height) * (0.22 + pressure * 0.04);
    const side = snapshot.encounter?.spawnSide || "right";
    const sideX = {
      left: width * (0.22 + pressure * 0.03),
      right: width * (0.78 - pressure * 0.035),
      top: width * 0.5,
      bottom: width * 0.5,
      core: width * 0.68
    }[side] || width * (0.78 - pressure * 0.035);
    const sideY = {
      left: getLaneY(snapshot, height),
      right: getLaneY(snapshot, height),
      top: height * (0.36 + pressure * 0.05),
      bottom: height * (0.72 - pressure * 0.04),
      core: height * 0.49
    }[side] || getLaneY(snapshot, height);
    const monster = clampMonsterPoint(
      snapshot,
      sideX,
      sideY,
      monsterSize
    );
    return {
      robot: { x: width * 0.5, y: height * 0.64 },
      monster,
      wallMiss: {
        x: side === "left" ? width * 0.14 : side === "top" || side === "bottom" ? width * 0.62 : width * 0.86,
        y: side === "top" ? height * 0.24 : side === "bottom" ? height * 0.8 : height * 0.38
      }
    };
  }

  function fingerHint(snapshot) {
    const guide = snapshot.fingerGuide;
    const pattern = snapshot.pattern || [];
    const home = pattern[0] || "";
    const attackKeys = [...new Set(pattern.filter((key, index) => index > 0 && key !== home))];
    if (!guide) return "当前手指通道接入";
    const attacks = attackKeys.length ? attackKeys.map(formatKey).join("/") : guide.keys.map(formatKey).join("/");
    return `${guide.hand.replace("手", "")}${guide.finger} ${formatKey(home)}→${attacks}`;
  }

  function drawLine(graphics, from, to, color, alpha, width) {
    graphics.lineStyle(width, color, alpha);
    graphics.beginPath();
    graphics.moveTo(from.x, from.y);
    graphics.lineTo(to.x, to.y);
    graphics.strokePath();
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function pointAt(from, to, t) {
    return {
      x: lerp(from.x, to.x, t),
      y: lerp(from.y, to.y, t)
    };
  }

  function angleBetween(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }

  function distance(from, to) {
    return Math.hypot(to.x - from.x, to.y - from.y);
  }

  function drawRoomBase(scene, snapshot) {
    const { width, height } = snapshot;
    const baseObjects = [];
    if (scene.textures.exists(TEXTURES.room)) {
      baseObjects.push(scene.add.image(width / 2, height / 2, TEXTURES.room)
        .setDisplaySize(width, height)
        .setDepth(0));
    } else {
      const fallback = scene.add.graphics().setDepth(0);
      fallback.fillStyle(0x05090c, 1).fillRect(0, 0, width, height);
      fallback.fillStyle(0x1b2a2d, 1).fillRect(width * 0.04, height * 0.08, width * 0.92, height * 0.84);
      baseObjects.push(fallback);
    }
    return baseObjects;
  }

  function drawRoomEffects(scene, snapshot) {
    const { width, height, event, corruption = 0 } = snapshot;
    const drift = event === "drift";

    const g = scene.add.graphics().setDepth(2);
    g.fillStyle(0x020608, 0.1 + corruption * 0.1);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x45f7e4, 0.05);
    g.fillEllipse(width * 0.5, height * 0.62, width * 0.36, height * 0.24);

    if (drift) {
      const gridShift = -width * 0.04;
      g.fillStyle(0xff625c, 0.1);
      g.fillRect(width * 0.08 + gridShift, height * 0.12, width * 0.25, height * 0.72);
      g.lineStyle(4, 0xff9d45, 0.24);
      for (let i = 0; i < 4; i += 1) {
        g.beginPath();
        g.moveTo(width * (0.18 - i * 0.024), height * 0.16);
        g.lineTo(width * (0.12 - i * 0.024), height * 0.82);
        g.strokePath();
      }
    }

    drawDoors(scene, snapshot);
    drawRoomContamination(scene, snapshot);
    drawVignette(scene, snapshot);
  }

  function drawRoom(scene, snapshot) {
    drawRoomBase(scene, snapshot);
    drawRoomEffects(scene, snapshot);
  }

  function drawRoomActionLayer(scene, snapshot, route) {
    const { width, height, event, pressure = 0 } = snapshot;
    drawDoorLocks(scene, snapshot);
    drawSpawnRift(scene, snapshot, route.monster.x, route.monster.y);
    drawFloorActionFlow(scene, snapshot, route);

    if (event === "launch") {
      drawDockingSurge(scene, snapshot, route.robot.x, route.robot.y);
    }
    if (event === "crash" || event === "arm-stuck") {
      drawShieldCracks(scene, snapshot);
    }
    if (event === "drift") {
      const drag = scene.add.rectangle(width * 0.37, height * 0.64, width * 0.28, height * 0.24, 0xff625c, 0.1)
        .setDepth(72)
        .setRotation(-0.08);
      if (!snapshot.reducedMotion) {
        scene.tweens.add({ targets: drag, x: drag.x - width * 0.04, alpha: 0, duration: 430, ease: "Cubic.easeOut" });
      }
    }
    if (pressure > 0.45 && event !== "kill") {
      const warning = scene.add.circle(route.robot.x, route.robot.y + height * 0.02, height * 0.2, 0xff625c, 0.035)
        .setStrokeStyle(6, 0xff625c, 0.18)
        .setDepth(58);
      if (!snapshot.reducedMotion) {
        scene.tweens.add({ targets: warning, scaleX: 1.08, scaleY: 1.08, alpha: 0.01, duration: 620, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
    }
  }

  function drawDoorLocks(scene, snapshot) {
    const { width, height, event } = snapshot;
    const clear = event === "kill" || event === "room-change";
    const g = scene.add.graphics().setDepth(34);
    const topY = height * 0.095;
    const bottomY = height * 0.902;
    const leftX = width * 0.19;
    const rightX = width * 0.81;
    const color = clear ? 0x62ff9d : 0xff625c;
    const alpha = clear ? 0.68 : 0.48;
    [
      { x: width * 0.5, y: topY, w: width * 0.18, h: height * 0.018 },
      { x: width * 0.5, y: bottomY, w: width * 0.2, h: height * 0.018 },
      { x: leftX, y: height * 0.5, w: width * 0.018, h: height * 0.17 },
      { x: rightX, y: height * 0.5, w: width * 0.018, h: height * 0.17 }
    ].forEach((lock) => {
      g.fillStyle(color, clear ? 0.12 : 0.08);
      g.fillRoundedRect(lock.x - lock.w / 2, lock.y - lock.h / 2, lock.w, lock.h, 6);
      g.lineStyle(2, color, alpha);
      g.strokeRoundedRect(lock.x - lock.w / 2, lock.y - lock.h / 2, lock.w, lock.h, 6);
    });

    if (clear && !snapshot.reducedMotion) {
      const sweep = scene.add.rectangle(width * 0.5, topY, width * 0.05, height * 0.03, 0x62ff9d, 0.28).setDepth(35);
      scene.tweens.add({ targets: sweep, scaleX: 8, alpha: 0, duration: 460, ease: "Cubic.easeOut" });
    }
  }

  function drawSpawnRift(scene, snapshot, x, y) {
    const { event, pressure = 0 } = snapshot;
    const rift = scene.add.graphics().setDepth(42);
    const color = event === "kill" ? 0x62ff9d : 0xff625c;
    const riftW = snapshot.height * (0.12 + pressure * 0.04);
    const riftH = snapshot.height * 0.055;
    rift.fillStyle(color, event === "kill" ? 0.05 : 0.09 + pressure * 0.05);
    rift.fillEllipse(x, y + snapshot.height * 0.08, riftW, riftH);
    rift.lineStyle(3, color, event === "kill" ? 0.3 : 0.42);
    rift.strokeEllipse(x, y + snapshot.height * 0.08, riftW * 0.9, riftH * 0.72);
    for (let i = 0; i < 5; i += 1) {
      const t = (i - 2) / 2;
      rift.beginPath();
      rift.moveTo(x + t * riftW * 0.18, y + snapshot.height * 0.08);
      rift.lineTo(x + t * riftW * 0.3, y + snapshot.height * (0.045 + Math.abs(t) * 0.012));
      rift.strokePath();
    }
    if (!snapshot.reducedMotion && event !== "kill") {
      scene.tweens.add({ targets: rift, alpha: 0.5, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  function drawFloorActionFlow(scene, snapshot, route) {
    const { event } = snapshot;
    const active = event === "launch" || event === "hit" || event === "combo-hit" || event === "return" || event === "kill";
    if (!active) return;
    const color = event === "return" || event === "kill" ? 0x62ff9d : 0xffd66e;
    const g = scene.add.graphics().setDepth(46);
    const start = { x: route.robot.x, y: route.robot.y + snapshot.height * 0.14 };
    const end = { x: route.monster.x, y: route.monster.y + snapshot.height * 0.13 };
    g.lineStyle(3, color, 0.22);
    g.beginPath();
    g.moveTo(start.x, start.y);
    g.lineTo(pointAt(start, end, 0.45).x, start.y + snapshot.height * 0.025);
    g.lineTo(end.x, end.y);
    g.strokePath();
    for (let i = 0; i < 5; i += 1) {
      const p = pointAt(start, end, i / 4);
      const marker = scene.add.rectangle(p.x, p.y + snapshot.height * 0.02, snapshot.width * 0.035, 4, color, 0.38)
        .setDepth(47)
        .setRotation(0.05);
      if (!snapshot.reducedMotion) {
        scene.tweens.add({ targets: marker, x: marker.x + snapshot.width * 0.02, alpha: 0, duration: 380, delay: i * 40, ease: "Cubic.easeOut" });
      }
    }
  }

  function drawDockingSurge(scene, snapshot, x, y) {
    const ring = scene.add.circle(x, y + snapshot.height * 0.035, snapshot.height * 0.03, 0x45f7e4, 0.08)
      .setStrokeStyle(6, 0x45f7e4, 0.8)
      .setDepth(185);
    const plug = scene.add.rectangle(x, y - snapshot.height * 0.08, snapshot.width * 0.075, snapshot.height * 0.015, 0xffd66e, 0.75)
      .setDepth(184);
    if (!snapshot.reducedMotion) {
      scene.tweens.add({ targets: ring, scaleX: 2.4, scaleY: 2.4, alpha: 0, duration: 360, ease: "Cubic.easeOut" });
      scene.tweens.add({ targets: plug, y: y - snapshot.height * 0.025, alpha: 0, duration: 260, ease: "Cubic.easeOut" });
    }
  }

  function drawShieldCracks(scene, snapshot) {
    const { width, height, event } = snapshot;
    const g = scene.add.graphics().setDepth(935);
    const cx = width * 0.5;
    const cy = height * 0.56;
    g.lineStyle(event === "arm-stuck" ? 5 : 4, event === "arm-stuck" ? 0xffd66e : 0xff625c, 0.48);
    [
      [[-0.16, -0.03], [-0.08, 0.02], [-0.03, 0.1]],
      [[0.16, -0.02], [0.09, 0.04], [0.05, 0.13]],
      [[-0.02, -0.13], [0.03, -0.04], [0.01, 0.06]]
    ].forEach((line) => {
      g.beginPath();
      line.forEach((point, index) => {
        const x = cx + point[0] * width;
        const y = cy + point[1] * height;
        if (index === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      });
      g.strokePath();
    });
    if (!snapshot.reducedMotion) {
      scene.tweens.add({ targets: g, alpha: 0, duration: 420, ease: "Cubic.easeOut" });
    }
  }

  function drawDoors(scene, snapshot) {
    const { width, height, event } = snapshot;
    const g = scene.add.graphics().setDepth(12);
    const clear = event === "kill" || event === "room-change";
    if (!clear) return;
    const doorY = height * 0.09;
    const doorW = width * 0.27;
    const doorH = height * 0.06;
    g.fillStyle(0x62ff9d, 0.12);
    g.fillRoundedRect(width / 2 - doorW / 2, doorY, doorW, doorH, 8);
    g.lineStyle(4, 0x62ff9d, 0.62);
    g.strokeRoundedRect(width / 2 - doorW / 2, doorY, doorW, doorH, 8);
    if (!snapshot.reducedMotion) {
      scene.tweens.add({
        targets: scene.add.rectangle(width / 2, doorY + doorH / 2, doorW, doorH, 0x62ff9d, 0.22).setDepth(13),
        alpha: 0,
        scaleX: 1.18,
        scaleY: 1.7,
        duration: 520,
        ease: "Cubic.easeOut"
      });
    }
  }

  function drawRoomContamination(scene, snapshot) {
    const { width, height, corruption = 0, event } = snapshot;
    const g = scene.add.graphics().setDepth(18);
    const intensity = clamp(corruption, 0, 1);
    g.fillStyle(0x233d25, 0.14 + intensity * 0.18);
    g.fillEllipse(width * 0.13, height * 0.72, width * (0.12 + intensity * 0.12), height * 0.09);
    g.fillEllipse(width * 0.86, height * 0.22, width * (0.08 + intensity * 0.1), height * 0.07);
    if (event === "drift") {
      g.fillStyle(0xff625c, 0.22);
      g.fillRect(width * 0.04, height * 0.1, width * 0.18, height * 0.78);
      g.lineStyle(5, 0xff9d45, 0.42);
      for (let i = 0; i < 4; i += 1) {
        g.beginPath();
        g.moveTo(width * (0.14 - i * 0.018), height * 0.18);
        g.lineTo(width * (0.1 - i * 0.018), height * 0.86);
        g.strokePath();
      }
    }
  }

  function drawVignette(scene, snapshot) {
    const { width, height, hull = 100 } = snapshot;
    const lowHull = hull <= 40;
    const g = scene.add.graphics().setDepth(900);
    g.fillStyle(0x000000, lowHull ? 0.18 : 0.12);
    g.fillRect(0, 0, width, height * 0.08);
    g.fillRect(0, height * 0.92, width, height * 0.08);
    g.fillRect(0, 0, width * 0.045, height);
    g.fillRect(width * 0.955, 0, width * 0.045, height);
    if (lowHull) {
      g.lineStyle(8, 0xff625c, 0.22);
      g.strokeRect(10, 10, width - 20, height - 20);
    }
  }

  function drawK01(scene, snapshot, route) {
    const { width, height, event, combo = 0 } = snapshot;
    const glow = scene.add.graphics().setDepth(70);
    const robotSize = Math.min(width, height) * 0.26;
    const dragX = event === "drift" ? -width * 0.025 : 0;
    glow.fillStyle(0x020608, 0.28);
    glow.fillEllipse(route.robot.x + dragX, route.robot.y + robotSize * 0.28, robotSize * 1.18, robotSize * 0.42);
    glow.fillStyle(event === "overdrive" ? 0xffd66e : 0x45f7e4, 0.14 + clamp(combo / 40, 0, 0.2));
    glow.fillEllipse(route.robot.x + dragX, route.robot.y + robotSize * 0.1, robotSize * 1.05, robotSize * 0.54);

    let sprite;
    if (scene.textures.exists(TEXTURES.k01)) {
      sprite = scene.add.image(route.robot.x + dragX, route.robot.y, TEXTURES.k01)
        .setDisplaySize(robotSize, robotSize)
        .setDepth(90);
    } else {
      sprite = drawFallbackK01(scene, route.robot.x + dragX, route.robot.y, robotSize, snapshot);
    }

    if (!snapshot.reducedMotion) {
      scene.tweens.add({
        targets: sprite,
        y: route.robot.y - height * 0.008,
        duration: 720,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut"
      });
      if (event === "drift") {
        scene.tweens.add({ targets: sprite, x: route.robot.x - width * 0.05, duration: 110, yoyo: true, ease: "Cubic.easeOut" });
      }
      if (event === "crash" || event === "arm-stuck") {
        scene.tweens.add({ targets: sprite, x: sprite.x + 10, duration: 42, yoyo: true, repeat: 3 });
      }
    }

    drawK01Foreground(scene, route.robot.x + dragX, route.robot.y, robotSize, snapshot);
    drawCorePulse(scene, route.robot.x + dragX, route.robot.y, robotSize, snapshot);
    return sprite;
  }

  function drawK01Foreground(scene, x, y, size, snapshot) {
    const g = scene.add.graphics().setDepth(132);
    const coreColor = snapshot.event === "crash" || snapshot.event === "arm-stuck" ? 0xff625c : snapshot.event === "overdrive" ? 0xffd66e : 0x45f7e4;
    g.lineStyle(5, coreColor, 0.78);
    g.strokeCircle(x, y + size * 0.03, size * 0.12);
    g.lineStyle(3, 0x45f7e4, 0.44);
    g.strokeCircle(x, y + size * 0.03, size * 0.22);
    g.fillStyle(coreColor, 0.18);
    g.fillCircle(x, y + size * 0.03, size * 0.2);
    g.lineStyle(4, 0xffd66e, 0.52);
    g.beginPath();
    g.moveTo(x - size * 0.44, y + size * 0.16);
    g.lineTo(x - size * 0.25, y + size * 0.08);
    g.moveTo(x + size * 0.44, y + size * 0.16);
    g.lineTo(x + size * 0.25, y + size * 0.08);
    g.strokePath();
    scene.add.text(x, y + size * 0.48, "K-01", textStyle(snapshot, {
      fontFamily: MONO_FONT,
      fontSize: "15px",
      color: "#bdeeff",
      fontStyle: "900"
    })).setOrigin(0.5).setDepth(133);
  }

  function drawFallbackK01(scene, x, y, size, snapshot) {
    const g = scene.add.graphics().setDepth(90);
    g.fillStyle(0x10252c, 1);
    g.fillRoundedRect(x - size * 0.34, y - size * 0.34, size * 0.68, size * 0.34, 8);
    g.fillStyle(0x37454a, 1);
    g.fillRoundedRect(x - size * 0.38, y, size * 0.76, size * 0.5, 8);
    g.lineStyle(4, 0xffd66e, 0.8);
    g.strokeRoundedRect(x - size * 0.38, y, size * 0.76, size * 0.5, 8);
    g.fillStyle(0x45f7e4, 0.9);
    g.fillRect(x - size * 0.52, y + size * 0.1, size * 0.16, size * 0.38);
    g.fillRect(x + size * 0.36, y + size * 0.1, size * 0.16, size * 0.38);
    return g;
  }

  function drawCorePulse(scene, x, y, size, snapshot) {
    const color = snapshot.event === "overdrive" ? 0xffd66e : snapshot.event === "crash" ? 0xff625c : 0x45f7e4;
    const ring = scene.add.circle(x, y + size * 0.18, size * 0.12, color, 0.08)
      .setStrokeStyle(4, color, 0.65)
      .setDepth(120);
    if (!snapshot.reducedMotion) {
      scene.tweens.add({ targets: ring, scaleX: 1.45, scaleY: 1.45, alpha: 0, duration: 420, ease: "Cubic.easeOut" });
    }
  }

  function drawMonster(scene, snapshot, route) {
    const { width, event, pressure = 0 } = snapshot;
    const monsterSize = Math.min(snapshot.width, snapshot.height) * (0.25 + pressure * 0.035);
    const aliveAlpha = event === "kill" ? 0.55 : 1;
    const lunge = event === "crash" || event === "arm-stuck";
    const monsterX = event === "drift" ? route.monster.x - width * 0.035 : route.monster.x - (lunge ? width * 0.018 : 0);
    let sprite;
    if (scene.textures.exists(TEXTURES.monster)) {
      sprite = scene.add.image(monsterX, route.monster.y, TEXTURES.monster)
        .setDisplaySize(monsterSize, monsterSize * 0.92)
        .setAlpha(aliveAlpha)
        .setDepth(82);
    } else {
      sprite = drawFallbackMonster(scene, monsterX, route.monster.y, monsterSize, snapshot);
    }
    const aura = scene.add.circle(monsterX, route.monster.y, monsterSize * (0.45 + pressure * 0.28), 0xff625c, 0.08 + pressure * 0.11).setDepth(65);
    if (!snapshot.reducedMotion) {
      scene.tweens.add({ targets: sprite, x: monsterX - width * 0.008, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      scene.tweens.add({ targets: aura, scaleX: 1.12, scaleY: 1.12, alpha: 0.04, duration: 640, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      if (event === "hit" || event === "combo-hit") {
        scene.tweens.add({ targets: sprite, x: monsterX + width * 0.045, angle: 3, duration: 90, yoyo: true, ease: "Cubic.easeOut" });
        scene.tweens.add({ targets: aura, scaleX: 1.45, scaleY: 1.45, alpha: 0.02, duration: 180, ease: "Cubic.easeOut" });
      }
      if (lunge) {
        scene.tweens.add({ targets: sprite, x: monsterX - width * 0.05, scaleX: 1.08, scaleY: 1.08, duration: 160, yoyo: true, ease: "Cubic.easeOut" });
        scene.tweens.add({ targets: aura, scaleX: 1.36, scaleY: 1.36, alpha: 0.16, duration: 180, yoyo: true, ease: "Cubic.easeOut" });
      }
      if (event === "kill") {
        scene.tweens.add({ targets: sprite, alpha: 0, scaleX: 1.42, scaleY: 1.42, duration: 430, ease: "Cubic.easeOut" });
        drawDebrisBurst(scene, snapshot, monsterX, route.monster.y, monsterSize * 0.34, 0xffd66e, 12);
      }
    }
    drawMonsterForeground(scene, monsterX, route.monster.y, monsterSize, snapshot);
    scene.add.text(monsterX, route.monster.y + monsterSize * 0.54, snapshot.encounter?.monster || "漂移僵尸", textStyle(snapshot, {
      fontSize: "14px",
      color: "#ffd5d2",
      fontStyle: "700",
      fontFamily: TEXT_FONT
    })).setOrigin(0.5).setDepth(130).setAlpha(0.78);
    return sprite;
  }

  function drawMonsterForeground(scene, x, y, size, snapshot) {
    const g = scene.add.graphics().setDepth(128);
    const damaged = snapshot.event === "hit" || snapshot.event === "combo-hit" || snapshot.event === "arm-stuck";
    g.lineStyle(5, damaged ? 0xffd66e : 0xff625c, damaged ? 0.86 : 0.52);
    g.strokeEllipse(x, y, size * 0.68, size * 0.72);
    g.lineStyle(3, 0xff9d45, 0.32);
    g.beginPath();
    g.moveTo(x - size * 0.5, y - size * 0.16);
    g.lineTo(x - size * 0.66, y - size * 0.34);
    g.moveTo(x + size * 0.5, y - size * 0.16);
    g.lineTo(x + size * 0.66, y - size * 0.34);
    g.strokePath();
  }

  function drawFallbackMonster(scene, x, y, size, snapshot) {
    const g = scene.add.graphics().setDepth(82);
    g.fillStyle(0x842d2f, 0.94);
    g.fillEllipse(x, y, size * 0.72, size * 0.82);
    g.lineStyle(5, 0xff625c, 0.78);
    g.strokeEllipse(x, y, size * 0.72, size * 0.82);
    g.fillStyle(0xffd66e, 0.9);
    g.fillRect(x - size * 0.18, y - size * 0.12, size * 0.1, size * 0.1);
    g.fillRect(x + size * 0.08, y - size * 0.12, size * 0.1, size * 0.1);
    g.fillStyle(0xff625c, 0.9);
    g.fillRect(x - size * 0.18, y + size * 0.18, size * 0.36, size * 0.06);
    return g;
  }

  function drawMechanicalArm(scene, snapshot, route) {
    const { event, pathStep = 0, pattern = [], width, height } = snapshot;
    const phase = getPhase(snapshot);
    const from = { x: route.robot.x, y: route.robot.y - height * 0.025 };
    const toMonster = { x: route.monster.x - width * 0.04, y: route.monster.y };
    const targetIsReturn = phase.code === "RETURN";
    const attackResolvedPendingReturn = pathStep > 1 && pattern[pathStep] === pattern[0];

    if (event === "launch") {
      drawLockRing(scene, snapshot, route.robot.x, route.robot.y);
      drawArmPortOpen(scene, snapshot, from);
      return;
    }

    if (event === "crash") {
      animateArmTrace(scene, snapshot, from, from, route.wallMiss, {
        color: 0xff625c,
        core: 0xff9d45,
        label: "MISS",
        duration: 160,
        width: 8,
        jagged: true,
        impact: true
      });
      return;
    }

    if (event === "arm-stuck") {
      const g = scene.add.graphics().setDepth(160);
      drawJaggedArm(g, from, toMonster, 0xff9d45, 0.86);
      drawActionClaw(scene, snapshot, toMonster, 0xff9d45, angleBetween(from, toMonster), true);
      drawSpark(scene, snapshot, toMonster.x, toMonster.y, targetIsReturn ? "卡住" : "打偏");
      return;
    }

    if (event === "hit" || event === "combo-hit" || attackResolvedPendingReturn) {
      animateArmTrace(scene, snapshot, from, from, toMonster, {
        color: 0xffd66e,
        core: 0x45f7e4,
        label: event === "combo-hit" ? "连击" : "命中",
        duration: event === "combo-hit" ? 135 : 165,
        width: event === "combo-hit" ? 11 : 9,
        impact: event === "hit" || event === "combo-hit"
      });
      return;
    }

    if (event === "return" || targetIsReturn) {
      animateArmTrace(scene, snapshot, from, toMonster, from, {
        color: 0x62ff9d,
        core: 0x79e8ff,
        label: "回收",
        duration: 210,
        width: 7,
        retract: true
      });
      drawLockRing(scene, snapshot, route.robot.x, route.robot.y);
      return;
    }

    if (event === "kill") {
      const g = scene.add.graphics().setDepth(160);
      drawLine(g, from, toMonster, 0x62ff9d, 0.28, 5);
      drawSpark(scene, snapshot, toMonster.x, toMonster.y, "清除");
    }
  }

  function drawArmPortOpen(scene, snapshot, origin) {
    const g = scene.add.graphics().setDepth(164);
    g.lineStyle(5, 0x45f7e4, 0.75);
    g.beginPath();
    g.moveTo(origin.x - snapshot.width * 0.045, origin.y + snapshot.height * 0.01);
    g.lineTo(origin.x - snapshot.width * 0.02, origin.y - snapshot.height * 0.035);
    g.moveTo(origin.x + snapshot.width * 0.045, origin.y + snapshot.height * 0.01);
    g.lineTo(origin.x + snapshot.width * 0.02, origin.y - snapshot.height * 0.035);
    g.strokePath();
    const light = scene.add.rectangle(origin.x, origin.y - snapshot.height * 0.04, snapshot.width * 0.1, 5, 0x45f7e4, 0.55).setDepth(165);
    if (!snapshot.reducedMotion) {
      scene.tweens.add({ targets: light, scaleX: 1.8, alpha: 0, duration: 300, ease: "Cubic.easeOut" });
    }
  }

  function animateArmTrace(scene, snapshot, anchor, start, end, options) {
    const trace = scene.add.graphics().setDepth(166);
    const state = { t: snapshot.reducedMotion ? 1 : 0 };
    const color = options.color || 0xffd66e;
    const core = options.core || 0x45f7e4;
    const travelAngle = angleBetween(start, end);
    const claw = drawActionClaw(scene, snapshot, start, color, travelAngle, options.jagged);
    const duration = options.duration || 180;
    const render = () => {
      const current = pointAt(start, end, state.t);
      trace.clear();
      if (options.jagged) {
        drawJaggedArm(trace, anchor, current, color, 0.74);
      } else {
        drawTelescopicArm(trace, anchor, current, color, core, options.width || 8, options.retract);
      }
      claw.setPosition(current.x, current.y);
      claw.setRotation(angleBetween(anchor, current));
    };
    render();
    const finish = () => {
      const current = pointAt(start, end, 1);
      if (options.impact) {
        drawImpactBurst(scene, snapshot, current.x, current.y, options.label || "命中", color);
      } else if (options.label) {
        drawSpark(scene, snapshot, current.x, current.y, options.label);
      }
      if (options.retract && !snapshot.reducedMotion) {
        scene.tweens.add({ targets: claw, scaleX: 0.35, scaleY: 0.35, alpha: 0, duration: 130, ease: "Cubic.easeIn" });
      }
    };
    if (!snapshot.reducedMotion) {
      const startedAt = scene.time.now;
      const timer = scene.time.addEvent({
        delay: 16,
        repeat: Math.max(1, Math.ceil(duration / 16)),
        callback: () => {
          const raw = clamp((scene.time.now - startedAt) / duration, 0, 1);
          state.t = options.retract ? raw * raw : 1 - Math.pow(1 - raw, 3);
          render();
          if (raw >= 1) {
            timer.remove(false);
            finish();
          }
        }
      });
    } else {
      finish();
    }
  }

  function drawTelescopicArm(graphics, anchor, current, color, core, width, retract = false) {
    const dist = distance(anchor, current);
    if (dist < 2) return;
    graphics.lineStyle(width + 6, 0x020608, 0.64);
    graphics.beginPath();
    graphics.moveTo(anchor.x, anchor.y);
    graphics.lineTo(current.x, current.y);
    graphics.strokePath();
    graphics.lineStyle(width, color, retract ? 0.64 : 0.82);
    graphics.beginPath();
    graphics.moveTo(anchor.x, anchor.y);
    graphics.lineTo(current.x, current.y);
    graphics.strokePath();
    graphics.lineStyle(3, core, 0.55);
    graphics.beginPath();
    graphics.moveTo(anchor.x, anchor.y);
    graphics.lineTo(current.x, current.y);
    graphics.strokePath();
    const joints = clamp(Math.floor(dist / 80), 2, 5);
    for (let i = 1; i < joints; i += 1) {
      const p = pointAt(anchor, current, i / joints);
      graphics.fillStyle(0x020608, 0.85);
      graphics.fillCircle(p.x, p.y, width * 0.92);
      graphics.lineStyle(2, core, 0.62);
      graphics.strokeCircle(p.x, p.y, width * 0.92);
    }
  }

  function drawActionClaw(scene, snapshot, point, color, rotation = 0, unstable = false) {
    const container = scene.add.container(point.x, point.y).setDepth(214);
    const size = snapshot.height * 0.045;
    const g = scene.add.graphics();
    g.fillStyle(0x020608, 0.92);
    g.fillRoundedRect(-size * 0.42, -size * 0.28, size * 0.84, size * 0.56, 6);
    g.lineStyle(3, color, 0.9);
    g.strokeRoundedRect(-size * 0.42, -size * 0.28, size * 0.84, size * 0.56, 6);
    g.lineStyle(4, color, 0.76);
    g.beginPath();
    g.moveTo(size * 0.34, -size * 0.24);
    g.lineTo(size * 0.62, -size * 0.44);
    g.moveTo(size * 0.34, size * 0.24);
    g.lineTo(size * 0.62, size * 0.44);
    g.strokePath();
    container.add(g);
    container.setRotation(rotation);
    if (unstable && !snapshot.reducedMotion) {
      scene.tweens.add({ targets: container, x: point.x + 8, duration: 42, yoyo: true, repeat: 4 });
    }
    return container;
  }

  function drawImpactBurst(scene, snapshot, x, y, label, color) {
    drawSpark(scene, snapshot, x, y, label);
    const ring = scene.add.circle(x, y, snapshot.height * 0.035, color, 0.08)
      .setStrokeStyle(6, color, 0.84)
      .setDepth(225);
    drawDebrisBurst(scene, snapshot, x, y, snapshot.height * 0.07, color, 9);
    if (!snapshot.reducedMotion) {
      scene.tweens.add({ targets: ring, scaleX: 2.1, scaleY: 2.1, alpha: 0, duration: 250, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
      scene.cameras.main.shake(90, 0.004);
    } else {
      scene.time.delayedCall(120, () => ring.destroy());
    }
  }

  function drawDebrisBurst(scene, snapshot, x, y, radius, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count;
      const shard = scene.add.rectangle(x, y, snapshot.width * 0.008, snapshot.height * 0.01, color, 0.82)
        .setDepth(222)
        .setRotation(angle);
      if (!snapshot.reducedMotion) {
        scene.tweens.add({
          targets: shard,
          x: x + Math.cos(angle) * radius * (0.5 + (i % 3) * 0.22),
          y: y + Math.sin(angle) * radius * (0.5 + (i % 2) * 0.25),
          alpha: 0,
          scaleX: 0.35,
          scaleY: 0.35,
          duration: 320,
          ease: "Cubic.easeOut",
          onComplete: () => shard.destroy()
        });
      } else {
        scene.time.delayedCall(120, () => shard.destroy());
      }
    }
  }

  function drawJaggedArm(graphics, from, to, color, alpha) {
    graphics.lineStyle(8, color, alpha);
    graphics.beginPath();
    graphics.moveTo(from.x, from.y);
    const steps = 5;
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      const offset = i % 2 ? 18 : -14;
      graphics.lineTo(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t + offset);
    }
    graphics.lineTo(to.x, to.y);
    graphics.strokePath();
  }

  function drawLockRing(scene, snapshot, x, y) {
    const ring = scene.add.circle(x, y + snapshot.height * 0.03, snapshot.height * 0.06, 0x62ff9d, 0.08)
      .setStrokeStyle(5, 0x62ff9d, 0.76)
      .setDepth(180);
    if (!snapshot.reducedMotion) {
      scene.tweens.add({ targets: ring, scaleX: 1.55, scaleY: 1.55, alpha: 0, duration: 360, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
    } else {
      scene.time.delayedCall(140, () => ring.destroy());
    }
  }

  function drawSpark(scene, snapshot, x, y, label) {
    const hot = label === "MISS" || label === "打偏" || label === "卡住" || label === "破舱";
    const color = hot ? 0xff625c : label === "回收" || label === "清除" || label === "核心离线" ? 0x62ff9d : 0xffd66e;
    if (scene.textures.exists(TEXTURES.spark)) {
      const spark = scene.add.image(x, y, TEXTURES.spark).setDisplaySize(snapshot.height * 0.18, snapshot.height * 0.18).setDepth(230);
      if (spark.setTint) spark.setTint(color);
      if (!snapshot.reducedMotion) {
        scene.tweens.add({ targets: spark, alpha: 0, scaleX: 1.35, scaleY: 1.35, duration: 280, ease: "Cubic.easeOut", onComplete: () => spark.destroy() });
      } else {
        scene.time.delayedCall(120, () => spark.destroy());
      }
    } else {
      const g = scene.add.graphics().setDepth(230);
      g.lineStyle(5, 0xffd66e, 0.8);
      g.beginPath();
      g.moveTo(x - 30, y);
      g.lineTo(x + 30, y);
      g.moveTo(x, y - 30);
      g.lineTo(x, y + 30);
      g.strokePath();
      scene.time.delayedCall(snapshot.reducedMotion ? 120 : 280, () => g.destroy());
    }
    const shard = scene.add.graphics().setDepth(238);
    shard.lineStyle(hot ? 5 : 4, color, hot ? 0.85 : 0.74);
    shard.beginPath();
    shard.moveTo(x - snapshot.height * 0.055, y);
    shard.lineTo(x + snapshot.height * 0.055, y);
    shard.moveTo(x, y - snapshot.height * 0.055);
    shard.lineTo(x, y + snapshot.height * 0.055);
    shard.strokePath();
    scene.tweens.add({
      targets: shard,
      alpha: 0,
      scaleX: 1.45,
      scaleY: 1.45,
      duration: snapshot.reducedMotion ? 120 : 300,
      ease: "Cubic.easeOut",
      onComplete: () => shard.destroy()
    });
  }

  function drawTargetHud(scene, snapshot) {
    const { width, height, pattern = [], pathStep = 0, event } = snapshot;
    const phase = getPhase(snapshot);
    const x = width * 0.5;
    const y = height * 0.152;
    const hudW = clamp(width * 0.34, 360, 560);
    const hudH = clamp(height * 0.16, 112, 138);
    const g = scene.add.graphics().setDepth(1000);
    const urgent = event === "arm-stuck" || phase.code === "RETURN";

    g.fillStyle(0x010508, 0.96);
    g.fillRoundedRect(x - hudW / 2 - 22, y - hudH / 2 - 14, hudW + 44, hudH + 72, 18);
    g.fillStyle(0x061117, 0.96);
    g.fillRoundedRect(x - hudW / 2, y - hudH / 2, hudW, hudH, 16);
    g.lineStyle(4, urgent ? 0xffd66e : 0x45f7e4, urgent ? 0.94 : 0.74);
    g.strokeRoundedRect(x - hudW / 2, y - hudH / 2, hudW, hudH, 16);
    g.fillStyle(urgent ? 0xffd66e : 0x45f7e4, urgent ? 0.13 : 0.08);
    g.fillEllipse(x, y - 2, hudH * 0.9, hudH * 0.9);

    scene.add.text(x - hudW * 0.42, y - hudH * 0.33, `${phase.code} / ${phase.label}`, textStyle(snapshot, {
      fontFamily: MONO_FONT,
      fontSize: "15px",
      color: urgent ? "#ffd66e" : "#45f7e4",
      fontStyle: "900"
    })).setOrigin(0, 0.5).setDepth(1001);
    scene.add.text(x, y - 6, formatKey(phase.target), textStyle(snapshot, {
      fontFamily: MONO_FONT,
      fontSize: "76px",
      color: urgent ? "#ffd66e" : "#e8f7ff",
      fontStyle: "900"
    })).setOrigin(0.5).setDepth(1002);

    scene.add.text(x + hudW * 0.32, y + hudH * 0.27, fingerHint(snapshot), textStyle(snapshot, {
      fontSize: "14px",
      color: "#62ff9d",
      fontStyle: "800"
    })).setOrigin(0.5).setDepth(1002);
    drawPathNodes(scene, snapshot, x, y + hudH * 0.48, pattern, pathStep);
  }

  function drawPathNodes(scene, snapshot, x, y, pattern, pathStep) {
    const nodeGap = Math.min(58, snapshot.width * 0.046);
    const totalW = (pattern.length - 1) * nodeGap;
    const startX = x - totalW / 2;
    const g = scene.add.graphics().setDepth(1001);
    if (pattern.length > 1) {
      g.lineStyle(4, 0x7fa4b0, 0.28);
      g.beginPath();
      g.moveTo(startX, y);
      g.lineTo(startX + totalW, y);
      g.strokePath();
    }
    pattern.forEach((key, index) => {
      const active = index === pathStep;
      const done = index < pathStep;
      const color = active ? 0xffd66e : done ? 0x62ff9d : 0x223a43;
      const border = active ? 0xffd66e : done ? 0x62ff9d : 0x79e8ff;
      const cx = startX + nodeGap * index;
      const box = scene.add.rectangle(cx, y, 38, 30, color, active ? 1 : done ? 0.62 : 0.42)
        .setStrokeStyle(2, border, active ? 1 : 0.48)
        .setDepth(1002);
      scene.add.text(cx, y - 1, formatKey(key), textStyle(snapshot, {
        fontFamily: MONO_FONT,
        fontSize: "18px",
        color: active ? "#07100f" : "#e8f7ff",
        fontStyle: "900"
      })).setOrigin(0.5).setDepth(1003);
      if (active && !snapshot.reducedMotion) {
        scene.tweens.add({ targets: box, scaleX: 1.12, scaleY: 1.12, duration: 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
    });
  }

  function drawStatusHud(scene, snapshot) {
    const { width, height, room, combo = 0, hull = 100, shield = 100, corruption = 0, monstersCleared = 0, targetActions = 1 } = snapshot;
    const g = scene.add.graphics().setDepth(950);
    g.fillStyle(0x020608, 0.64);
    g.fillRoundedRect(width * 0.035, height * 0.835, width * 0.36, height * 0.105, 10);
    g.lineStyle(2, 0x45f7e4, 0.24);
    g.strokeRoundedRect(width * 0.035, height * 0.835, width * 0.36, height * 0.105, 10);
    scene.add.text(width * 0.055, height * 0.858, `${room?.name || "闸门入口"} / ${snapshot.encounter?.modifier?.label || "清障"}`, textStyle(snapshot, {
      fontFamily: MONO_FONT,
      fontSize: "15px",
      color: "#8fb1bd",
      fontStyle: "800"
    })).setDepth(951);
    scene.add.text(width * 0.055, height * 0.895, `同步链 ${combo}   清除 ${monstersCleared}/${targetActions}`, textStyle(snapshot, {
      fontFamily: MONO_FONT,
      fontSize: "18px",
      color: "#ffd66e",
      fontStyle: "900"
    })).setDepth(951);

    const barX = width * 0.62;
    const barY = height * 0.852;
    drawStatusBar(scene, snapshot, barX, barY, width * 0.28, "HULL", hull, 0x79e8ff);
    drawStatusBar(scene, snapshot, barX, barY + height * 0.045, width * 0.28, "POLLUTION", Math.round(corruption * 100), 0x62ff9d, true);
    drawStatusBar(scene, snapshot, barX, barY + height * 0.09, width * 0.28, "SHIELD", shield, 0xffd66e);
  }

  function drawStatusBar(scene, snapshot, x, y, width, label, value, color, dangerScale = false) {
    const percent = clamp(value / 100, 0, 1);
    const g = scene.add.graphics().setDepth(951);
    g.fillStyle(0x020608, 0.65).fillRect(x, y, width, 7);
    g.fillStyle(color, 0.85).fillRect(x, y, width * percent, 7);
    g.lineStyle(1, 0x79e8ff, 0.24).strokeRect(x, y, width, 7);
    scene.add.text(x, y - 18, label, textStyle(snapshot, {
      fontFamily: MONO_FONT,
      fontSize: "12px",
      color: "#8fb1bd"
    })).setDepth(952);
    scene.add.text(x + width, y - 18, `${value}%`, textStyle(snapshot, {
      fontFamily: MONO_FONT,
      fontSize: "12px",
      color: dangerScale ? "#62ff9d" : "#bdeeff"
    })).setOrigin(1, 0).setDepth(952);
  }

  function drawEventOverlay(scene, snapshot) {
    const { width, height, event } = snapshot;
    if (event === "drift") {
      scene.cameras.main.setRotation(-0.006);
      const ghost = scene.add.text(width * 0.17, height * 0.36, "偏左残影", textStyle(snapshot, {
        fontSize: "34px",
        color: "#ff9d45",
        fontStyle: "900"
      })).setOrigin(0.5).setAlpha(0.36).setDepth(880);
      scene.add.text(width * 0.5, height * 0.78, "旧坐标接管：重新锁回当前目标", textStyle(snapshot, {
        fontSize: "20px",
        color: "#ffd6c7",
        fontStyle: "900"
      })).setOrigin(0.5).setDepth(1005);
      if (!snapshot.reducedMotion) {
        scene.cameras.main.shake(260, 0.012);
        scene.tweens.add({ targets: ghost, x: width * 0.11, alpha: 0, duration: 520, ease: "Cubic.easeOut" });
      }
    }

    if (event === "arm-stuck") {
      scene.add.text(width * 0.5, height * 0.31, "机械臂卡住，必须回家闭环", textStyle(snapshot, {
        fontSize: "22px",
        color: "#ffd66e",
        fontStyle: "900"
      })).setOrigin(0.5).setDepth(1005);
    }

    if (event === "crash") {
      scene.add.text(width * 0.5, height * 0.31, "目标未消失，重新出手", textStyle(snapshot, {
        fontSize: "22px",
        color: "#ffaaa6",
        fontStyle: "900"
      })).setOrigin(0.5).setDepth(1005);
      if (!snapshot.reducedMotion) scene.cameras.main.shake(150, 0.008);
    }
  }

  function defaultSnapshot() {
    return {
      width: 1280,
      height: 720,
      pixelRatio: 1,
      pattern: ["f", "r", "f"],
      pathStep: 0,
      currentTarget: "f",
      event: "idle",
      sceneNonce: 0,
      pressure: 0,
      corruption: 0,
      hull: 100,
      shield: 100,
      energy: 24,
      combo: 0,
      breaches: 0,
      monstersCleared: 0,
      completedActions: 0,
      targetActions: 20,
      room: { id: "gate", name: "闸门入口" },
      encounter: {
        monster: "漂移僵尸",
        modifier: { id: "rush", label: "突进压迫" },
        lane: "mid",
        pattern: ["f", "r", "f"],
        basePattern: ["f", "r", "f"]
      },
      reducedMotion: false
    };
  }

  function normalizeSnapshot(nextSnapshot) {
    const base = defaultSnapshot();
    const snapshot = { ...base, ...(nextSnapshot || window.__KEY_PILOT_ROOM_SNAPSHOT__ || {}) };
    snapshot.width = Number(snapshot.width) || base.width;
    snapshot.height = Number(snapshot.height) || base.height;
    snapshot.pixelRatio = Number(snapshot.pixelRatio) || 1;
    snapshot.pattern = Array.isArray(snapshot.pattern) && snapshot.pattern.length ? snapshot.pattern : base.pattern;
    snapshot.encounter = {
      ...base.encounter,
      ...(snapshot.encounter || {})
    };
    snapshot.encounter.modifier = {
      ...base.encounter.modifier,
      ...(snapshot.encounter.modifier || {})
    };
    snapshot.encounter.pattern = Array.isArray(snapshot.encounter.pattern) ? snapshot.encounter.pattern : snapshot.pattern;
    snapshot.encounter.basePattern = Array.isArray(snapshot.encounter.basePattern) ? snapshot.encounter.basePattern : snapshot.pattern;
    return snapshot;
  }

  function snapshotSignature(snapshot) {
    return [
      snapshot.sceneNonce,
      snapshot.currentTarget,
      snapshot.pathStep,
      snapshot.completedActions,
      snapshot.monstersCleared,
      snapshot.combo,
      snapshot.hull,
      snapshot.shield,
      snapshot.corruption,
      snapshot.pressure,
      snapshot.event,
      snapshot.roomTransition?.fromRoomId || "",
      snapshot.roomTransition?.toRoomId || "",
      snapshot.encounter?.monster,
      snapshot.encounter?.monsterId,
      snapshot.encounter?.modifier?.id
    ].join("|");
  }

  function stageSignature(snapshot) {
    return `${snapshot.width}|${snapshot.height}|${snapshot.pixelRatio}`;
  }

  class RoomController {
    constructor(scene) {
      this.scene = scene;
      this.container = scene.add.container(0, 0).setDepth(0);
      this.dynamic = scene.add.graphics().setDepth(34);
      this.pollution = scene.add.graphics().setDepth(46);
      this.alarm = scene.add.rectangle(0, 0, 1, 1, 0xff625c, 0).setOrigin(0).setDepth(930);
      this.lastBuildSignature = "";
      this.clearFlash = null;
      this.driftOffset = 0;
      this.warningPulse = 0;
      this.backgrounds = new Map();
      this.currentRoomId = "";
    }

    rebuild(snapshot) {
      this.container.removeAll(true);
      const { width, height } = snapshot;
      this.backgrounds.clear();
      const availableRooms = new Set([
        ...ROOM_IDS,
        ...Object.keys(getAssetManifest().rooms || {})
      ]);
      availableRooms.forEach((roomId) => {
        const roomKey = roomTextureKey(roomId);
        const textureKey = this.scene.textures.exists(roomKey) ? roomKey : "";
        if (!textureKey) return;
        const image = this.scene.add.image(width / 2, height / 2, textureKey)
          .setDisplaySize(width, height)
          .setDepth(0)
          .setVisible(false)
          .setAlpha(0);
        this.container.add(image);
        this.backgrounds.set(roomId, image);
      });
      if (!this.backgrounds.size && this.scene.textures.exists(TEXTURES.room)) {
        const image = this.scene.add.image(width / 2, height / 2, TEXTURES.room)
          .setDisplaySize(width, height)
          .setDepth(0)
          .setVisible(false)
          .setAlpha(0);
        this.container.add(image);
        this.backgrounds.set("gate", image);
      }
      if (!this.backgrounds.size) {
        const fallback = this.scene.add.graphics();
        fallback.fillStyle(0x05090c, 1).fillRect(0, 0, width, height);
        fallback.fillStyle(0x1b2a2d, 1).fillRect(width * 0.04, height * 0.08, width * 0.92, height * 0.84);
        this.container.add(fallback);
      }
      this.currentRoomId = "";
      this.showRoom(snapshot.room?.id || "gate", true);
      this.lastBuildSignature = stageSignature(snapshot);
    }

    showRoom(roomId = "gate", immediate = false) {
      const nextId = this.backgrounds.has(roomId) ? roomId : "gate";
      if (this.currentRoomId === nextId) return;
      const previous = this.backgrounds.get(this.currentRoomId);
      const next = this.backgrounds.get(nextId);
      if (!next) return;
      this.scene.tweens.killTweensOf([previous, next].filter(Boolean));
      next.setVisible(true);
      if (immediate || !previous) {
        if (previous) previous.setVisible(false).setAlpha(0);
        next.setAlpha(1);
      } else {
        next.setAlpha(0);
        this.scene.tweens.add({ targets: next, alpha: 1, duration: 180, ease: "Cubic.easeOut" });
        this.scene.tweens.add({
          targets: previous,
          alpha: 0,
          duration: 180,
          ease: "Cubic.easeOut",
          onComplete: () => previous.setVisible(false)
        });
      }
      this.currentRoomId = nextId;
    }

    sync(snapshot, route) {
      if (this.lastBuildSignature !== stageSignature(snapshot)) this.rebuild(snapshot);
      this.showRoom(snapshot.room?.id || "gate", false);
      this.draw(snapshot, route);
    }

    draw(snapshot, route) {
      const { width, height, corruption = 0, pressure = 0, event } = snapshot;
      const danger = event === "breach" || event === "low-health" || event === "death";
      const g = this.dynamic;
      const p = this.pollution;
      g.clear();
      p.clear();

      g.fillStyle(0x020608, 0.08 + corruption * 0.12);
      g.fillRect(0, 0, width, height);

      const lockColor = event === "kill" || this.clearFlash ? 0x62ff9d : 0xff625c;
      const lockAlpha = event === "kill" || this.clearFlash ? 0.62 : 0.34 + pressure * 0.14;
      [
        { x: width * 0.5, y: height * 0.1, w: width * 0.18, h: height * 0.018 },
        { x: width * 0.5, y: height * 0.902, w: width * 0.2, h: height * 0.018 },
        { x: width * 0.19, y: height * 0.5, w: width * 0.018, h: height * 0.17 },
        { x: width * 0.81, y: height * 0.5, w: width * 0.018, h: height * 0.17 }
      ].forEach((lock) => {
        g.fillStyle(lockColor, 0.08);
        g.fillRoundedRect(lock.x - lock.w / 2, lock.y - lock.h / 2, lock.w, lock.h, 6);
        g.lineStyle(3, lockColor, lockAlpha);
        g.strokeRoundedRect(lock.x - lock.w / 2, lock.y - lock.h / 2, lock.w, lock.h, 6);
      });

      const riftColor = this.clearFlash ? 0x62ff9d : snapshot.encounter?.modifier?.id === "glitch" ? 0xff9d45 : 0xff625c;
      g.fillStyle(riftColor, this.clearFlash ? 0.04 : 0.1 + pressure * 0.08);
      g.fillEllipse(route.monster.x, route.monster.y + height * 0.08, height * (0.13 + pressure * 0.04), height * 0.055);
      g.lineStyle(3, riftColor, this.clearFlash ? 0.25 : 0.38 + pressure * 0.12);
      g.strokeEllipse(route.monster.x, route.monster.y + height * 0.08, height * 0.12, height * 0.04);

      if (snapshot.room?.id === "pipe") {
        g.fillStyle(0x62ff9d, 0.035 + corruption * 0.05);
        g.fillEllipse(width * 0.23, height * 0.74, width * 0.28, height * 0.09);
        g.fillEllipse(width * 0.74, height * 0.24, width * 0.22, height * 0.08);
        g.lineStyle(6, 0x62ff9d, 0.16);
        g.beginPath();
        g.moveTo(width * 0.12, height * 0.22);
        g.lineTo(width * 0.88, height * 0.28);
        g.moveTo(width * 0.12, height * 0.78);
        g.lineTo(width * 0.88, height * 0.7);
        g.strokePath();
      } else if (snapshot.room?.id === "nest") {
        g.fillStyle(0xff9d45, 0.05 + pressure * 0.04);
        g.fillEllipse(width * 0.11, height * 0.48, width * 0.2, height * 0.42);
        g.fillEllipse(width * 0.89, height * 0.5, width * 0.2, height * 0.38);
        g.lineStyle(4, 0xff625c, 0.18);
        for (let i = 0; i < 5; i += 1) {
          g.strokeEllipse(width * (i % 2 ? 0.86 : 0.14), height * (0.24 + i * 0.12), width * 0.08, height * 0.045);
        }
      } else if (snapshot.room?.id === "blackout") {
        g.fillStyle(0x000000, 0.22 + Math.sin(this.scene.time.now / 120) * 0.05);
        g.fillRect(0, 0, width, height);
        g.fillStyle(0x8ea7ff, 0.035);
        g.fillRect(width * 0.16, height * 0.08, width * 0.68, height * 0.84);
      } else if (snapshot.room?.id === "core") {
        g.lineStyle(5, 0xff625c, 0.16 + pressure * 0.08);
        g.strokeCircle(width * 0.5, height * 0.5, height * 0.18);
        g.strokeCircle(width * 0.5, height * 0.5, height * 0.27);
        g.fillStyle(0xff625c, 0.045 + corruption * 0.05);
        g.fillCircle(width * 0.5, height * 0.5, height * 0.26);
      }

      const intensity = clamp(corruption, 0, 1);
      p.fillStyle(0x233d25, 0.13 + intensity * 0.18);
      p.fillEllipse(width * 0.13 + this.driftOffset, height * 0.72, width * (0.12 + intensity * 0.14), height * 0.09);
      p.fillEllipse(width * 0.86 + this.driftOffset * 0.35, height * 0.22, width * (0.08 + intensity * 0.1), height * 0.07);

      if (this.warningPulse > 0 || danger) {
        this.alarm.setSize(width, height);
        this.alarm.setFillStyle(danger ? 0xff625c : 0xff9d45, danger ? 0.12 : 0.07);
      } else {
        this.alarm.setFillStyle(0xff625c, 0);
      }
    }

    openDoor(snapshot) {
      const { width, height } = snapshot;
      const sweep = this.scene.add.rectangle(width * 0.5, height * 0.1, width * 0.08, height * 0.028, 0x62ff9d, 0.18).setDepth(70);
      const bottomSweep = this.scene.add.rectangle(width * 0.5, height * 0.9, width * 0.08, height * 0.026, 0x62ff9d, 0.16).setDepth(70);
      const doorGlow = this.scene.add.rectangle(width * 0.5, height * 0.5, width * 0.42, height * 0.78, 0x45f7e4, 0.025)
        .setDepth(69)
        .setOrigin(0.5);
      if (!snapshot.reducedMotion) {
        this.scene.tweens.add({ targets: sweep, scaleX: 7, alpha: 0, duration: 420, ease: "Cubic.easeOut", onComplete: () => sweep.destroy() });
        this.scene.tweens.add({ targets: bottomSweep, scaleX: 7, alpha: 0, duration: 420, ease: "Cubic.easeOut", onComplete: () => bottomSweep.destroy() });
        this.scene.tweens.add({ targets: doorGlow, alpha: 0, scaleX: 1.1, scaleY: 1.04, duration: 520, ease: "Cubic.easeOut", onComplete: () => doorGlow.destroy() });
      } else {
        this.scene.time.delayedCall(140, () => sweep.destroy());
        this.scene.time.delayedCall(140, () => bottomSweep.destroy());
        this.scene.time.delayedCall(160, () => doorGlow.destroy());
      }
      this.clearFlash = true;
      this.scene.time.delayedCall(520, () => {
        this.clearFlash = false;
      });
    }

    wrong(snapshot) {
      this.warningPulse = 1;
      this.scene.time.delayedCall(360, () => {
        this.warningPulse = 0;
      });
      if (!snapshot.reducedMotion) this.scene.cameras.main.shake(120, 0.005);
    }

    drift(snapshot) {
      this.driftOffset = -snapshot.width * 0.04;
      this.scene.tweens.add({ targets: this, driftOffset: 0, duration: 560, ease: "Cubic.easeOut" });
      const panel = this.scene.add.rectangle(snapshot.width * 0.32, snapshot.height * 0.52, snapshot.width * 0.26, snapshot.height * 0.62, 0xff625c, 0.12)
        .setDepth(72)
        .setRotation(-0.08);
      this.scene.tweens.add({ targets: panel, x: panel.x - snapshot.width * 0.08, alpha: 0, duration: 560, ease: "Cubic.easeOut", onComplete: () => panel.destroy() });
      if (!snapshot.reducedMotion) {
        this.scene.cameras.main.setRotation(-0.01);
        this.scene.time.delayedCall(260, () => this.scene.cameras.main.setRotation(0));
        this.scene.cameras.main.shake(240, 0.01);
      }
    }

    update(time, delta, snapshot, route) {
      this.draw(snapshot, route);
    }
  }

  class K01Actor {
    constructor(scene) {
      this.scene = scene;
      this.container = scene.add.container(0, 0).setDepth(140);
      this.shadow = scene.add.graphics();
      this.body = scene.textures.exists(TEXTURES.k01) ? scene.add.sprite(0, 0, TEXTURES.k01, 0) : scene.add.graphics();
      this.overlay = scene.add.graphics();
      this.label = scene.add.text(0, 0, "K-01", { fontFamily: MONO_FONT, fontSize: "15px", color: "#d9f6ff", fontStyle: "900" }).setOrigin(0.5);
      this.container.add([this.shadow, this.body, this.overlay, this.label]);
      this.base = { x: 0, y: 0 };
      this.size = 140;
      this.driftX = 0;
      this.hurtX = 0;
      this.coreBoost = 0;
      this.shutdown = false;
      this.currentAnimState = "";
      this.transitionY = 0;
      this.transitionAlpha = 1;
      this.play("idle", true);
    }

    play(stateName, loop = false) {
      if (!this.body.play || !this.scene.anims.exists(animKey("k01", stateName))) return;
      const key = animKey("k01", stateName);
      if (this.currentAnimState === stateName && loop) return;
      this.currentAnimState = stateName;
      this.body.play(key, true);
      if (!loop && stateName !== "idle") {
        this.body.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
          if (!this.shutdown) this.play("idle", true);
        });
      }
    }

    sync(snapshot, route) {
      this.base = { ...route.robot };
      this.size = Math.min(snapshot.width, snapshot.height) * 0.24;
      if (this.body.setDisplaySize) {
        this.body.setDisplaySize(this.size, this.size);
      }
      this.redraw(snapshot);
    }

    redraw(snapshot) {
      const s = this.size;
      this.shadow.clear();
      this.overlay.clear();
      this.shadow.fillStyle(0x020608, 0.35).fillEllipse(0, s * 0.28, s * 1.05, s * 0.36);
      this.shadow.fillStyle(this.shutdown ? 0x333333 : 0x45f7e4, this.shutdown ? 0.05 : 0.1 + this.coreBoost * 0.12)
        .fillEllipse(0, s * 0.08, s * 0.92, s * 0.46);

      if (!this.body.setDisplaySize) {
        this.body.clear();
        this.body.fillStyle(0x10252c, 1).fillRoundedRect(-s * 0.31, -s * 0.32, s * 0.62, s * 0.3, 10);
        this.body.fillStyle(0x37454a, 1).fillRoundedRect(-s * 0.36, -s * 0.02, s * 0.72, s * 0.5, 10);
        this.body.lineStyle(4, 0xffd66e, 0.8).strokeRoundedRect(-s * 0.36, -s * 0.02, s * 0.72, s * 0.5, 10);
        this.body.fillStyle(0x45f7e4, 0.9).fillRect(-s * 0.5, s * 0.08, s * 0.15, s * 0.36);
        this.body.fillRect(s * 0.35, s * 0.08, s * 0.15, s * 0.36);
      }

      const coreColor = this.shutdown ? 0x26333a : snapshot.event === "overdrive" ? 0xffd66e : snapshot.event === "drift" ? 0xff9d45 : 0x45f7e4;
      this.overlay.lineStyle(3, coreColor, this.shutdown ? 0.18 : 0.42 + this.coreBoost * 0.16);
      const bracketY = s * 0.31;
      const bracketW = s * 0.4;
      this.overlay.beginPath();
      this.overlay.moveTo(-bracketW, bracketY);
      this.overlay.lineTo(-bracketW * 0.48, bracketY);
      this.overlay.moveTo(bracketW * 0.48, bracketY);
      this.overlay.lineTo(bracketW, bracketY);
      this.overlay.strokePath();
      this.overlay.fillStyle(coreColor, this.shutdown ? 0.04 : 0.08 + this.coreBoost * 0.06);
      this.overlay.fillEllipse(0, s * 0.38, s * (0.54 + this.coreBoost * 0.05), s * 0.08);
      this.label.setY(s * 0.5);
      this.label.setAlpha(this.shutdown ? 0.45 : 1);
    }

    update(time, delta, snapshot) {
      const bob = snapshot.reducedMotion ? 0 : Math.sin(time / 520) * snapshot.height * 0.006;
      this.container.setPosition(this.base.x + this.driftX + this.hurtX, this.base.y + bob + this.transitionY);
      this.container.setAlpha(this.transitionAlpha);
      this.redraw(snapshot);
    }

    baseLock(snapshot) {
      this.play("baseLock");
      this.coreBoost = 1;
      const ring = this.scene.add.circle(this.base.x, this.base.y + this.size * 0.16, this.size * 0.16, 0x45f7e4, 0.06)
        .setStrokeStyle(6, 0x45f7e4, 0.82)
        .setDepth(132);
      this.scene.tweens.add({ targets: ring, scaleX: 2.2, scaleY: 2.2, alpha: 0, duration: 360, ease: "Cubic.easeOut" });
      this.scene.tweens.add({ targets: this, coreBoost: 0.25, duration: 420, ease: "Cubic.easeOut" });
    }

    damage(snapshot) {
      this.play("damaged");
      this.hurtX = 12;
      this.coreBoost = 0.7;
      this.scene.tweens.add({ targets: this, hurtX: 0, duration: 180, ease: "Cubic.easeOut" });
      this.scene.tweens.add({ targets: this, coreBoost: 0.05, duration: 340, ease: "Cubic.easeOut" });
    }

    drift(snapshot) {
      this.play("damaged");
      this.driftX = -snapshot.width * 0.055;
      this.coreBoost = 0.9;
      this.scene.tweens.add({ targets: this, driftX: 0, coreBoost: 0.05, duration: 560, ease: "Cubic.easeOut" });
    }

    overdrive(snapshot) {
      this.play("overdrive");
      this.coreBoost = 1.4;
      this.scene.tweens.add({ targets: this, coreBoost: 0.15, duration: 720, ease: "Cubic.easeOut" });
    }

    exitRoom(snapshot) {
      this.play("return");
      this.transitionY = 0;
      this.transitionAlpha = 1;
      this.scene.tweens.add({
        targets: this,
        transitionY: -snapshot.height * 0.11,
        transitionAlpha: 0.34,
        coreBoost: 1,
        duration: snapshot.reducedMotion ? 120 : 520,
        ease: "Cubic.easeInOut"
      });
    }

    enterRoom(snapshot) {
      this.play("baseLock");
      this.transitionY = snapshot.height * 0.13;
      this.transitionAlpha = 0.48;
      this.scene.tweens.add({
        targets: this,
        transitionY: 0,
        transitionAlpha: 1,
        coreBoost: 0.55,
        duration: snapshot.reducedMotion ? 120 : 430,
        ease: "Cubic.easeOut",
        onComplete: () => {
          this.coreBoost = 0.2;
        }
      });
    }

    shutdownMode() {
      this.play("shutdown", true);
      this.shutdown = true;
    }
  }

  class ArmActor {
    constructor(scene) {
      this.scene = scene;
      this.graphics = scene.add.graphics().setDepth(190);
      this.claw = scene.add.container(0, 0).setDepth(220);
      this.clawGraphic = scene.add.graphics();
      this.claw.add(this.clawGraphic);
      this.model = { t: 0 };
      this.origin = { x: 0, y: 0 };
      this.tip = { x: 0, y: 0 };
      this.visible = false;
      this.mode = "idle";
      this.activeTween = null;
      this.activePath = null;
      this.drawClaw(0xffd66e, false);
    }

    sync(snapshot, route) {
      this.origin = { x: route.robot.x, y: route.robot.y - snapshot.height * 0.025 };
      if (!this.visible) {
        this.graphics.clear();
        this.claw.setVisible(false);
      }
    }

    killTween() {
      if (this.activeTween) this.activeTween.remove();
      this.activeTween = null;
      this.activePath = null;
    }

    drawClaw(color, unstable) {
      const size = 28;
      this.clawGraphic.clear();
      this.clawGraphic.fillStyle(0x020608, 0.96).fillRoundedRect(-size * 0.45, -size * 0.28, size * 0.9, size * 0.56, 5);
      this.clawGraphic.lineStyle(3, color, 0.95).strokeRoundedRect(-size * 0.45, -size * 0.28, size * 0.9, size * 0.56, 5);
      this.clawGraphic.lineStyle(4, color, unstable ? 0.95 : 0.76);
      this.clawGraphic.beginPath();
      this.clawGraphic.moveTo(size * 0.34, -size * 0.24);
      this.clawGraphic.lineTo(size * 0.66, -size * 0.46);
      this.clawGraphic.moveTo(size * 0.34, size * 0.24);
      this.clawGraphic.lineTo(size * 0.66, size * 0.46);
      this.clawGraphic.strokePath();
    }

    drawArm(snapshot, from, to, color, core, width, jagged = false) {
      this.graphics.clear();
      const dist = distance(from, to);
      if (dist < 2) return;
      if (jagged) {
        drawJaggedArm(this.graphics, from, to, color, 0.85);
      } else {
        drawTelescopicArm(this.graphics, from, to, color, core, width);
      }
      this.claw.setVisible(true);
      this.claw.setPosition(to.x, to.y);
      this.claw.setRotation(angleBetween(from, to));
      this.tip = { ...to };
    }

    baseLock(snapshot) {
      this.visible = false;
      this.graphics.clear();
      this.claw.setVisible(false);
      const port = this.scene.add.rectangle(this.origin.x, this.origin.y - snapshot.height * 0.025, snapshot.width * 0.11, 5, 0x45f7e4, 0.68).setDepth(185);
      this.scene.tweens.add({ targets: port, scaleX: 1.9, alpha: 0, duration: 310, ease: "Cubic.easeOut", onComplete: () => port.destroy() });
    }

    strike(snapshot, target, combo = false) {
      this.killTween();
      this.visible = true;
      this.mode = "strike";
      this.model.t = 0;
      const start = { ...this.origin };
      const end = { ...target };
      this.activePath = { start, end, color: combo ? 0xfff1a8 : 0xffd66e, core: 0x45f7e4, width: combo ? 12 : 10, jagged: false };
      this.drawClaw(combo ? 0xfff1a8 : 0xffd66e, false);
      this.claw.setVisible(false);
      const charge = this.scene.add.circle(start.x, start.y, snapshot.height * 0.035, 0xffd66e, 0.08)
        .setStrokeStyle(5, 0xffd66e, 0.88)
        .setDepth(188);
      this.scene.tweens.add({ targets: charge, scaleX: 1.8, scaleY: 1.8, alpha: 0, duration: 90, ease: "Cubic.easeOut", onComplete: () => charge.destroy() });
      this.scene.time.delayedCall(snapshot.reducedMotion ? 0 : 55, () => {
        this.activeTween = this.scene.tweens.add({
          targets: this.model,
          t: 1,
          duration: combo ? 118 : 145,
          ease: "Cubic.easeOut",
          onComplete: () => {
            this.drawArm(snapshot, start, end, combo ? 0xfff1a8 : 0xffd66e, 0x45f7e4, combo ? 12 : 10);
            this.mode = "extended";
          }
        });
      });
    }

    returnHome(snapshot) {
      this.killTween();
      const start = this.visible ? { ...this.tip } : { x: this.origin.x + snapshot.width * 0.18, y: this.origin.y - snapshot.height * 0.12 };
      const end = { ...this.origin };
      this.visible = true;
      this.mode = "return";
      this.model.t = 0;
      this.drawClaw(0x62ff9d, false);
      this.activePath = { start, end, color: 0x62ff9d, core: 0x79e8ff, width: 8, jagged: false };
      this.activeTween = this.scene.tweens.add({
        targets: this.model,
        t: 1,
        duration: 210,
        ease: "Cubic.easeIn",
        onComplete: () => {
          this.visible = false;
          this.mode = "idle";
          this.graphics.clear();
          this.claw.setVisible(false);
          this.activePath = null;
        }
      });
    }

    miss(snapshot, wall) {
      this.killTween();
      this.visible = true;
      this.mode = "miss";
      this.activePath = null;
      this.drawClaw(0xff625c, true);
      this.drawArm(snapshot, this.origin, wall, 0xff625c, 0xff9d45, 9, true);
      this.scene.tweens.add({ targets: this.claw, x: wall.x + 10, duration: 42, yoyo: true, repeat: 4 });
    }

    stuck(snapshot, target) {
      this.killTween();
      this.visible = true;
      this.mode = "stuck";
      this.activePath = null;
      this.drawClaw(0xff9d45, true);
      this.drawArm(snapshot, this.origin, target, 0xff9d45, 0xffd66e, 10, true);
      this.scene.tweens.add({ targets: this.claw, x: target.x + 8, duration: 46, yoyo: true, repeat: 6 });
    }

    clear() {
      this.visible = false;
      this.mode = "idle";
      this.activePath = null;
      this.graphics.clear();
      this.claw.setVisible(false);
    }

    update(time, delta, snapshot) {
      if (!this.visible || !this.activePath) return;
      const { start, end, color, core, width, jagged } = this.activePath;
      this.drawArm(snapshot, start, pointAt(start, end, this.model.t), color, core, width, jagged);
    }
  }

  class MonsterActor {
    constructor(scene) {
      this.scene = scene;
      this.container = scene.add.container(0, 0).setDepth(110);
      this.shadow = scene.add.graphics();
      this.aura = scene.add.graphics();
      this.sprite = scene.textures.exists(monsterTextureKey("driftZombie"))
        ? scene.add.sprite(0, 0, monsterTextureKey("driftZombie"), 0)
        : scene.textures.exists(TEXTURES.monster)
          ? scene.add.image(0, 0, TEXTURES.monster)
          : scene.add.graphics();
      this.overlay = scene.add.graphics();
      this.marker = scene.add.graphics();
      this.label = scene.add.text(0, 0, "", { fontFamily: TEXT_FONT, fontSize: "14px", color: "#ffd5d2", fontStyle: "800" }).setOrigin(0.5);
      this.container.add([this.shadow, this.aura, this.sprite, this.overlay, this.marker, this.label]);
      this.signature = "";
      this.target = { x: 0, y: 0 };
      this.size = 130;
      this.pressureOffset = 0;
      this.clearing = false;
      this.armorCracks = 0;
      this.splitGhosts = [];
      this.monsterId = "driftZombie";
    }

    setMonsterTexture(monsterId = "driftZombie") {
      const nextId = monsterId || "driftZombie";
      const key = monsterTextureKey(nextId);
      if (this.monsterId === nextId && this.sprite.texture?.key === key) return;
      if (this.scene.textures.exists(key) && this.sprite.setTexture) {
        this.sprite.setTexture(key, 0);
        this.monsterId = nextId;
      }
    }

    play(stateName, snapshot, loopFallback = "move") {
      if (!this.sprite.play) return;
      const id = snapshot?.encounter?.monsterId || this.monsterId || "driftZombie";
      const key = animKey(`monster-${id}`, stateName);
      if (!this.scene.anims.exists(key)) return;
      this.sprite.play(key, true);
      if (stateName !== "idle" && stateName !== "move" && loopFallback) {
        this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.play(loopFallback, snapshot, null));
      }
    }

    idleStateFor(snapshot) {
      const id = snapshot.encounter?.monsterId || this.monsterId;
      if (id !== "oldCoordinateCore") return "move";
      const phase = snapshot.encounter?.bossPhase || 0;
      if (phase >= 4) return "crack2";
      if (phase >= 2) return "crack1";
      return "idle";
    }

    sync(snapshot, route) {
      this.setMonsterTexture(snapshot.encounter?.monsterId || "driftZombie");
      const signature = `${snapshot.completedActions}|${snapshot.encounter?.monsterId}|${snapshot.encounter?.monster}|${snapshot.encounter?.modifier?.id}|${snapshot.encounter?.lane}|${snapshot.encounter?.bossPhase || 0}`;
      if (this.clearing) return;
      this.target = { ...route.monster };
      this.size = Math.min(snapshot.width, snapshot.height) * (0.22 + snapshot.pressure * 0.04);
      if (signature !== this.signature && !this.clearing) {
        this.signature = signature;
        this.respawn(snapshot, route);
      }
      if (this.sprite.setDisplaySize) {
        this.sprite.setDisplaySize(this.size, this.size * 0.92);
      }
      this.label.setText(snapshot.encounter?.monster || "漂移僵尸");
      this.label.setY(this.size * 0.5);
      this.redraw(snapshot);
    }

    respawn(snapshot, route) {
      this.scene.tweens.killTweensOf(this.container);
      this.clearing = false;
      this.armorCracks = 0;
      this.pressureOffset = 0;
      const start = clampMonsterPoint(snapshot, route.monster.x + snapshot.width * 0.05, route.monster.y, this.size);
      const end = clampMonsterPoint(snapshot, route.monster.x, route.monster.y, this.size);
      this.container
        .setVisible(true)
        .setDepth(110)
        .setAlpha(1)
        .setScale(0.86)
        .setAngle(0)
        .setPosition(start.x, start.y);
      [this.shadow, this.aura, this.sprite, this.overlay, this.marker, this.label].forEach((item) => {
        if (item?.setAlpha) item.setAlpha(1);
        if (item?.setVisible) item.setVisible(true);
        if (item?.clearTint) item.clearTint();
      });
      this.splitGhosts.forEach((ghost) => ghost.destroy());
      this.splitGhosts = [];
      this.scene.tweens.add({
        targets: this.container,
        scaleX: 1,
        scaleY: 1,
        x: end.x,
        y: end.y,
        duration: 360,
        ease: "Cubic.easeOut"
      });
      this.play(this.idleStateFor(snapshot), snapshot, null);
    }

    redraw(snapshot) {
      this.shadow.clear();
      this.aura.clear();
      this.overlay.clear();
      this.marker.clear();
      this.shadow.fillStyle(0x020608, 0.68)
        .fillEllipse(0, this.size * 0.34, this.size * 0.9, this.size * 0.24);
      this.aura.fillStyle(0xff625c, this.clearing ? 0.025 : 0.055 + snapshot.pressure * 0.06)
        .fillEllipse(0, this.size * 0.38, this.size * (0.82 + snapshot.pressure * 0.2), this.size * 0.18);
      if (!this.sprite.setDisplaySize) {
        this.sprite.clear();
        this.sprite.fillStyle(0x842d2f, 0.95).fillEllipse(0, 0, this.size * 0.72, this.size * 0.82);
        this.sprite.lineStyle(5, 0xff625c, 0.78).strokeEllipse(0, 0, this.size * 0.72, this.size * 0.82);
        this.sprite.fillStyle(0xffd66e, 0.9).fillRect(-this.size * 0.18, -this.size * 0.12, this.size * 0.1, this.size * 0.1);
        this.sprite.fillRect(this.size * 0.08, -this.size * 0.12, this.size * 0.1, this.size * 0.1);
        this.sprite.fillStyle(0xff625c, 0.9).fillRect(-this.size * 0.18, this.size * 0.18, this.size * 0.36, this.size * 0.06);
      }
      const modifier = snapshot.encounter?.modifier?.id;
      const stroke = this.armorCracks > 0 || modifier === "shield" ? 0xffd66e : 0xff625c;
      this.overlay.lineStyle(3, stroke, this.armorCracks > 0 ? 0.72 : 0.28);
      this.overlay.beginPath();
      this.overlay.moveTo(-this.size * 0.34, this.size * 0.42);
      this.overlay.lineTo(-this.size * 0.08, this.size * 0.42);
      this.overlay.moveTo(this.size * 0.08, this.size * 0.42);
      this.overlay.lineTo(this.size * 0.34, this.size * 0.42);
      this.overlay.strokePath();
      if (modifier === "blink" || modifier === "glitch") {
        this.overlay.lineStyle(2, 0xfff1a8, 0.32);
        this.overlay.strokeRoundedRect(-this.size * 0.44, -this.size * 0.4, this.size * 0.88, this.size * 0.8, 10);
      }
      if (this.sprite.setDisplaySize) {
        if (this.armorCracks > 0) {
          this.overlay.lineStyle(3, 0xfff1a8, 0.78);
          for (let i = 0; i < this.armorCracks; i += 1) {
            this.overlay.beginPath();
            this.overlay.moveTo(-this.size * 0.18 + i * this.size * 0.14, -this.size * 0.25);
            this.overlay.lineTo(-this.size * 0.04 + i * this.size * 0.12, this.size * 0.18);
            this.overlay.strokePath();
          }
        }
        return;
      }
      this.marker.fillStyle(stroke, 0.96);
      this.marker.fillCircle(-this.size * 0.36, -this.size * 0.38, this.size * 0.035);
      this.marker.fillCircle(this.size * 0.36, -this.size * 0.38, this.size * 0.035);
      this.marker.fillStyle(0x05090c, 0.74);
      this.marker.fillRoundedRect(-this.size * 0.25, -this.size * 0.19, this.size * 0.5, this.size * 0.34, 8);
      this.marker.lineStyle(3, stroke, 0.76);
      this.marker.strokeRoundedRect(-this.size * 0.25, -this.size * 0.19, this.size * 0.5, this.size * 0.34, 8);
      this.marker.fillStyle(0xffd66e, 0.95);
      this.marker.fillRect(-this.size * 0.15, -this.size * 0.08, this.size * 0.08, this.size * 0.08);
      this.marker.fillRect(this.size * 0.07, -this.size * 0.08, this.size * 0.08, this.size * 0.08);
      this.marker.fillStyle(0xff625c, 0.9);
      this.marker.fillRect(-this.size * 0.14, this.size * 0.07, this.size * 0.28, this.size * 0.045);
      this.marker.lineStyle(3, stroke, 0.62);
      this.marker.beginPath();
      this.marker.moveTo(-this.size * 0.56, -this.size * 0.12);
      this.marker.lineTo(-this.size * 0.42, -this.size * 0.12);
      this.marker.moveTo(this.size * 0.42, -this.size * 0.12);
      this.marker.lineTo(this.size * 0.56, -this.size * 0.12);
      this.marker.moveTo(-this.size * 0.2, -this.size * 0.2);
      this.marker.lineTo(-this.size * 0.34, -this.size * 0.34);
      this.marker.moveTo(this.size * 0.2, -this.size * 0.2);
      this.marker.lineTo(this.size * 0.34, -this.size * 0.34);
      this.marker.strokePath();
      if (this.armorCracks > 0) {
        this.overlay.lineStyle(3, 0xfff1a8, 0.78);
        for (let i = 0; i < this.armorCracks; i += 1) {
          this.overlay.beginPath();
          this.overlay.moveTo(-this.size * 0.18 + i * this.size * 0.14, -this.size * 0.25);
          this.overlay.lineTo(-this.size * 0.04 + i * this.size * 0.12, this.size * 0.18);
          this.overlay.strokePath();
        }
      }
    }

    update(time, delta, snapshot) {
      if (this.clearing) return;
      const safePoint = clampMonsterPoint(
        snapshot,
        this.target.x - snapshot.width * this.pressureOffset,
        this.target.y + Math.sin(time / 460) * snapshot.height * 0.006,
        this.size
      );
      const ease = Math.min(delta / 260, 1);
      this.container.x = lerp(this.container.x, safePoint.x, ease);
      this.container.y = lerp(this.container.y, safePoint.y, ease);
      this.redraw(snapshot);
    }

    hit(snapshot) {
      const modifier = snapshot.encounter?.modifier?.id;
      this.play(snapshot.encounter?.monsterId === "oldCoordinateCore" ? "hit" : "hit", snapshot, this.idleStateFor(snapshot));
      if (modifier === "shield") this.armorCracks = clamp(this.armorCracks + 1, 0, 2);
      if (modifier === "split" && !this.splitGhosts.length) this.spawnSplitGhosts(snapshot);
      if (this.sprite.setTint) {
        this.sprite.setTint(0xffd66e);
        this.scene.time.delayedCall(90, () => this.sprite.clearTint?.());
      }
      this.scene.tweens.add({ targets: this.container, x: this.container.x + snapshot.width * 0.045, angle: 3, duration: 90, yoyo: true, ease: "Cubic.easeOut" });
      this.scene.tweens.add({ targets: this.container, scaleX: 1.08, scaleY: 1.08, duration: 70, yoyo: true, ease: "Cubic.easeOut" });
    }

    spawnSplitGhosts(snapshot) {
      [-1, 1].forEach((side) => {
        const ghost = this.scene.add.circle(this.container.x, this.container.y + side * snapshot.height * 0.05, this.size * 0.22, 0xff9d45, 0.18)
          .setStrokeStyle(3, 0xffd66e, 0.42)
          .setDepth(104);
        this.scene.tweens.add({ targets: ghost, x: ghost.x + side * snapshot.width * 0.05, alpha: 0.26, duration: 220, ease: "Cubic.easeOut" });
        this.splitGhosts.push(ghost);
      });
    }

    approach(snapshot, amount = 0.035) {
      this.pressureOffset = clamp(this.pressureOffset + amount, 0, 0.1);
      const lunge = clampMonsterPoint(snapshot, this.container.x - snapshot.width * amount, this.container.y, this.size);
      this.scene.tweens.add({
        targets: this.container,
        x: lunge.x,
        y: lunge.y,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 160,
        yoyo: true,
        ease: "Cubic.easeOut"
      });
    }

    clear(snapshot, onComplete) {
      this.scene.tweens.killTweensOf(this.container);
      this.clearing = true;
      this.container.setVisible(true).setAlpha(1);
      this.play("death", snapshot, null);
      drawDebrisBurst(this.scene, snapshot, this.container.x, this.container.y, this.size * 0.45, 0xffd66e, 14);
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        scaleX: 1.42,
        scaleY: 1.42,
        angle: 8,
        duration: 420,
        ease: "Cubic.easeOut",
        onComplete: () => {
          this.splitGhosts.forEach((ghost) => ghost.destroy());
          this.splitGhosts = [];
          this.clearing = false;
          if (onComplete) onComplete();
        }
      });
    }
  }

  class CombatHud {
    constructor(scene) {
      this.scene = scene;
      this.container = scene.add.container(0, 0).setDepth(1000);
      this.bg = scene.add.graphics();
      this.phase = scene.add.text(0, 0, "", { fontFamily: MONO_FONT, fontSize: "15px", color: "#45f7e4", fontStyle: "900" }).setOrigin(0, 0.5);
      this.key = scene.add.text(0, 0, "", { fontFamily: MONO_FONT, fontSize: "76px", color: "#e8f7ff", fontStyle: "900" }).setOrigin(0.5);
      this.finger = scene.add.text(0, 0, "", { fontFamily: TEXT_FONT, fontSize: "14px", color: "#62ff9d", fontStyle: "900" }).setOrigin(0.5);
      this.nodes = scene.add.container(0, 0);
      this.container.add([this.bg, this.phase, this.key, this.finger, this.nodes]);
      this.lastSignature = "";
    }

    sync(snapshot) {
      const phase = getPhase(snapshot);
      const urgent = snapshot.event === "arm-stuck" || phase.code === "RETURN";
      const x = snapshot.width * 0.5;
      const y = snapshot.height * 0.152;
      const hudW = clamp(snapshot.width * 0.34, 360, 560);
      const hudH = clamp(snapshot.height * 0.16, 112, 138);
      const transitionKey = snapshot.roomTransition
        ? `${snapshot.roomTransition.fromRoomId || ""}->${snapshot.roomTransition.toRoomId || ""}`
        : "combat";
      const signature = `${snapshot.currentTarget}|${snapshot.pathStep}|${snapshot.sceneNonce}|${snapshot.pattern.join("-")}|${urgent}|${phase.code}|${transitionKey}|${snapshot.missionClearing ? "clearing" : "active"}`;
      if (signature === this.lastSignature) return;
      this.lastSignature = signature;

      this.bg.clear();
      this.bg.fillStyle(0x010508, 0.96).fillRoundedRect(x - hudW / 2 - 22, y - hudH / 2 - 14, hudW + 44, hudH + 72, 18);
      this.bg.fillStyle(0x061117, 0.96).fillRoundedRect(x - hudW / 2, y - hudH / 2, hudW, hudH, 16);
      this.bg.lineStyle(4, urgent ? 0xffd66e : 0x45f7e4, urgent ? 0.94 : 0.74).strokeRoundedRect(x - hudW / 2, y - hudH / 2, hudW, hudH, 16);
      this.bg.fillStyle(urgent ? 0xffd66e : 0x45f7e4, urgent ? 0.13 : 0.08).fillEllipse(x, y - 2, hudH * 0.9, hudH * 0.9);

      this.phase.setText(`${phase.code} / ${phase.label}`).setPosition(x - hudW * 0.42, y - hudH * 0.33).setColor(urgent ? "#ffd66e" : "#45f7e4");
      this.key.setText(formatKey(phase.target)).setPosition(x, y - 6).setColor(urgent ? "#ffd66e" : "#e8f7ff");
      this.finger.setText(fingerHint(snapshot)).setPosition(x + hudW * 0.32, y + hudH * 0.27);
      this.drawNodes(snapshot, x, y + hudH * 0.48);
    }

    drawNodes(snapshot, x, y) {
      this.nodes.removeAll(true);
      if (snapshot.roomTransition) {
        const totalRooms = snapshot.roomProgress?.roomCount || 5;
        const clearedRooms = snapshot.roomsCleared || 0;
        const nodeGap = Math.min(52, snapshot.width * 0.042);
        const totalW = (totalRooms - 1) * nodeGap;
        const startX = x - totalW / 2;
        for (let index = 0; index < totalRooms; index += 1) {
          const done = index < clearedRooms;
          const active = index === clearedRooms;
          const color = done ? 0x62ff9d : active ? 0xffd66e : 0x223a43;
          const border = done ? 0x62ff9d : active ? 0xffd66e : 0x79e8ff;
          const cx = startX + nodeGap * index;
          const box = this.scene.add.rectangle(cx, y, 34, 22, color, done ? 0.72 : active ? 0.95 : 0.34)
            .setStrokeStyle(2, border, active ? 1 : 0.5);
          this.nodes.add(box);
          if (active && !snapshot.reducedMotion) this.scene.tweens.add({ targets: box, scaleX: 1.18, duration: 220, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        }
        return;
      }
      const pattern = snapshot.pattern || [];
      const nodeGap = Math.min(58, snapshot.width * 0.046);
      const totalW = (pattern.length - 1) * nodeGap;
      const startX = x - totalW / 2;
      if (pattern.length > 1) {
        const line = this.scene.add.graphics().setDepth(1001);
        line.lineStyle(4, 0x7fa4b0, 0.28).beginPath();
        line.moveTo(startX, y);
        line.lineTo(startX + totalW, y);
        line.strokePath();
        this.nodes.add(line);
      }
      pattern.forEach((key, index) => {
        const active = index === snapshot.pathStep;
        const done = index < snapshot.pathStep;
        const color = active ? 0xffd66e : done ? 0x62ff9d : 0x223a43;
        const border = active ? 0xffd66e : done ? 0x62ff9d : 0x79e8ff;
        const cx = startX + nodeGap * index;
        const box = this.scene.add.rectangle(cx, y, 38, 30, color, active ? 1 : done ? 0.62 : 0.42)
          .setStrokeStyle(2, border, active ? 1 : 0.48);
        const label = this.scene.add.text(cx, y - 1, formatKey(key), {
          fontFamily: MONO_FONT,
          fontSize: "18px",
          color: active ? "#07100f" : "#e8f7ff",
          fontStyle: "900"
        }).setOrigin(0.5);
        this.nodes.add([box, label]);
        if (active && !snapshot.reducedMotion) this.scene.tweens.add({ targets: box, scaleX: 1.12, scaleY: 1.12, duration: 260, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      });
    }

    pulse(snapshot, good = true) {
      const color = good ? 0x62ff9d : 0xff625c;
      const ring = this.scene.add.rectangle(snapshot.width * 0.5, snapshot.height * 0.152, clamp(snapshot.width * 0.34, 360, 560), clamp(snapshot.height * 0.16, 112, 138), color, 0)
        .setStrokeStyle(4, color, 0.72)
        .setDepth(1004);
      this.scene.tweens.add({ targets: ring, scaleX: 1.08, scaleY: 1.18, alpha: 0, duration: 240, ease: "Cubic.easeOut" });
    }

  }

  class VfxSystem {
    constructor(scene) {
      this.scene = scene;
    }

    spark(snapshot, x, y, label, color = 0xffd66e) {
      if (this.scene.textures.exists(TEXTURES.vfxCombat) && this.scene.anims.exists(animKey("vfx", "hitSpark"))) {
        const sprite = this.scene.add.sprite(x, y, TEXTURES.vfxCombat, 0).setDepth(235);
        sprite.setDisplaySize(snapshot.height * 0.13, snapshot.height * 0.13);
        sprite.play(animKey("vfx", label === "清除" || label === "核心离线" ? "dissolve" : "hitSpark"));
        sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy());
      }
      drawSpark(this.scene, snapshot, x, y, label);
      const ring = this.scene.add.circle(x, y, snapshot.height * 0.035, color, 0.08)
        .setStrokeStyle(6, color, 0.8)
        .setDepth(230);
      this.scene.tweens.add({ targets: ring, scaleX: 2, scaleY: 2, alpha: 0, duration: 260, ease: "Cubic.easeOut", onComplete: () => ring.destroy() });
    }

    shieldCrack(snapshot) {
      drawShieldCracks(this.scene, snapshot);
    }

    driftGhost(snapshot) {
      const ghost = this.scene.add.container(snapshot.width * 0.2, snapshot.height * 0.34).setDepth(910).setAlpha(0.42);
      const body = this.scene.add.circle(0, 0, snapshot.height * 0.055, 0xff9d45, 0.16)
        .setStrokeStyle(4, 0xff625c, 0.72);
      const eyeA = this.scene.add.rectangle(-snapshot.height * 0.022, -snapshot.height * 0.01, snapshot.height * 0.012, snapshot.height * 0.014, 0xffd66e, 0.9);
      const eyeB = this.scene.add.rectangle(snapshot.height * 0.018, -snapshot.height * 0.01, snapshot.height * 0.012, snapshot.height * 0.014, 0xffd66e, 0.9);
      ghost.add([body, eyeA, eyeB]);
      this.scene.tweens.add({
        targets: ghost,
        x: snapshot.width * 0.11,
        alpha: 0,
        scaleX: 1.4,
        scaleY: 1.4,
        duration: 560,
        ease: "Cubic.easeOut",
        onComplete: () => ghost.destroy()
      });
    }
  }

  class RoomCombatScene extends Phaser.Scene {
    constructor() {
      super("RoomCombatScene");
      this.snapshot = defaultSnapshot();
      this.lastSignature = "";
      this.lastStageSignature = "";
      this.lastCombatEventId = 0;
      this.route = getRoute(this.snapshot);
    }

    preload() {
      const assets = getAssetManifest();
      Object.entries(assets.rooms || {}).forEach(([id, room]) => {
        const background = asset(room.background || room.concept);
        const textureKey = roomTextureKey(id);
        if (background && !this.textures.exists(textureKey)) this.load.image(textureKey, background);
      });
      const room = asset(assets.rooms?.gate?.background || assets.rooms?.gate?.concept);
      const k01Sheet = assets.characters?.k01?.sheet;
      const k01Fallback = asset(assets.characters?.k01?.preview);
      const monsterFallback = asset(assets.monsters?.driftZombie?.preview);
      const hasDriftZombieSheet = Boolean(assets.monsters?.driftZombie?.sheet);
      const spark = asset(assets.vfx?.hitSpark);
      const targetHud = asset(assets.ui?.targetHud);
      if (room && !this.textures.exists(TEXTURES.room)) this.load.image(TEXTURES.room, room);
      if (k01Sheet) {
        if (!this.textures.exists(TEXTURES.k01)) this.load.spritesheet(TEXTURES.k01, k01Sheet, {
          frameWidth: assets.characters.k01.frameWidth || 128,
          frameHeight: assets.characters.k01.frameHeight || 128
        });
      } else if (k01Fallback) {
        if (!this.textures.exists(TEXTURES.k01)) this.load.image(TEXTURES.k01, k01Fallback);
      }
      Object.entries(assets.monsters || {}).forEach(([id, monster]) => {
        if (!monster.sheet) return;
        const textureKey = monsterTextureKey(id);
        if (this.textures.exists(textureKey)) return;
        this.load.spritesheet(textureKey, monster.sheet, {
          frameWidth: monster.frameWidth || 128,
          frameHeight: monster.frameHeight || 128
        });
      });
      if (!hasDriftZombieSheet && monsterFallback && !this.textures.exists(TEXTURES.monster)) this.load.image(TEXTURES.monster, monsterFallback);
      if (assets.vfx?.combat?.sheet) {
        if (!this.textures.exists(TEXTURES.vfxCombat)) this.load.spritesheet(TEXTURES.vfxCombat, assets.vfx.combat.sheet, {
          frameWidth: assets.vfx.combat.frameWidth || 96,
          frameHeight: assets.vfx.combat.frameHeight || 96
        });
      }
      if (spark && !this.textures.exists(TEXTURES.spark)) this.load.image(TEXTURES.spark, spark);
      if (targetHud && !this.textures.exists(TEXTURES.targetHud)) this.load.image(TEXTURES.targetHud, targetHud);
    }

    create() {
      this.snapshot = normalizeSnapshot(window.__KEY_PILOT_ROOM_SNAPSHOT__);
      this.createAnimations();
      this.route = getRoute(this.snapshot);
      this.buildWorld(true);
      this.updateSnapshot(this.snapshot, true);
      const eventQueue = Array.isArray(window.__KEY_PILOT_ROOM_EVENT_QUEUE__) ? window.__KEY_PILOT_ROOM_EVENT_QUEUE__ : [];
      eventQueue.forEach((event) => this.applyCombatEvent(event));
      window.__KEY_PILOT_ROOM_EVENT_QUEUE__ = [];
      if (!eventQueue.length && window.__KEY_PILOT_ROOM_EVENT__) this.applyCombatEvent(window.__KEY_PILOT_ROOM_EVENT__);
    }

    createAnimations() {
      const assets = getAssetManifest();
      const k01 = assets.characters?.k01;
      if (this.textures.exists(TEXTURES.k01) && k01?.states) {
        Object.entries(k01.states).forEach(([state, frames]) => {
          const key = animKey("k01", state);
          if (this.anims.exists(key)) return;
          this.anims.create({
            key,
            frames: framesFromList(TEXTURES.k01, frames),
            frameRate: state === "idle" ? 5 : 9,
            repeat: state === "idle" ? -1 : 0
          });
        });
      }
      Object.entries(assets.monsters || {}).forEach(([id, monster]) => {
        const textureKey = monsterTextureKey(id);
        if (!this.textures.exists(textureKey) || !monster.states) return;
        Object.entries(monster.states).forEach(([state, frames]) => {
          const key = animKey(`monster-${id}`, state);
          if (this.anims.exists(key)) return;
          const looping = state === "idle" || state === "move" || state === "crack1" || state === "crack2";
          this.anims.create({
            key,
            frames: framesFromList(textureKey, frames),
            frameRate: state === "move" ? 7 : 8,
            repeat: looping ? -1 : 0
          });
        });
      });
      const vfx = assets.vfx?.combat;
      if (this.textures.exists(TEXTURES.vfxCombat) && vfx?.states) {
        Object.entries(vfx.states).forEach(([state, frames]) => {
          const key = animKey("vfx", state);
          if (this.anims.exists(key)) return;
          this.anims.create({
            key,
            frames: framesFromList(TEXTURES.vfxCombat, frames),
            frameRate: 18,
            repeat: 0
          });
        });
      }
    }

    buildWorld(force = false) {
      if (force) {
        this.children.removeAll(true);
        this.tweens.killAll();
      }
      this.cameras.main.setZoom(this.snapshot.pixelRatio);
      this.cameras.main.centerOn(this.snapshot.width / 2, this.snapshot.height / 2);
      this.cameras.main.setBackgroundColor("#05090c");
      this.room = new RoomController(this);
      this.vfx = new VfxSystem(this);
      this.monster = new MonsterActor(this);
      this.arm = new ArmActor(this);
      this.k01 = new K01Actor(this);
      this.hud = new CombatHud(this);
      this.lastStageSignature = stageSignature(this.snapshot);
    }

    updateSnapshot(nextSnapshot, force = false) {
      const snapshot = normalizeSnapshot(nextSnapshot);
      const signature = snapshotSignature(snapshot);
      const nextStageSignature = stageSignature(snapshot);
      this.snapshot = snapshot;
      this.route = getRoute(snapshot);
      window.__KEY_PILOT_ROOM_SNAPSHOT__ = snapshot;

      if (force || nextStageSignature !== this.lastStageSignature || !this.room) {
        this.buildWorld(true);
      }
      if (!force && signature === this.lastSignature) {
        this.hud.sync(snapshot);
        return;
      }
      this.lastSignature = signature;
      this.room.sync(snapshot, this.route);
      this.k01.sync(snapshot, this.route);
      this.monster.sync(snapshot, this.route);
      this.arm.sync(snapshot, this.route);
      this.hud.sync(snapshot);
    }

    applyCombatEvent(event) {
      if (!event || event.id <= this.lastCombatEventId || !this.room) return;
      this.lastCombatEventId = event.id;
      const snapshot = this.snapshot;
      const route = getRoute(snapshot);
      const armTarget = { x: route.monster.x - snapshot.width * 0.04, y: route.monster.y };
      const wallMiss = route.wallMiss;
      const comboHit = event.type === "arm-strike" && (event.detail?.stepBefore || 0) > 1;

      switch (event.type) {
        case "base-lock":
          this.room.sync(snapshot, route);
          this.k01.baseLock(snapshot);
          this.arm.baseLock(snapshot);
          this.hud.pulse(snapshot, true);
          this.vfx.spark(snapshot, route.robot.x, route.robot.y, "接入", 0x45f7e4);
          break;
        case "arm-strike":
          this.k01.play("strike");
          this.arm.strike(snapshot, armTarget, comboHit);
          this.monster.hit(snapshot);
          this.hud.pulse(snapshot, true);
          this.time.delayedCall(snapshot.reducedMotion ? 0 : 155, () => {
            this.vfx.spark(snapshot, armTarget.x, armTarget.y, comboHit ? "连击" : "命中", 0xffd66e);
            if (!snapshot.reducedMotion) this.cameras.main.shake(70, 0.004);
          });
          break;
        case "arm-return":
          this.k01.play("return");
          this.arm.returnHome(snapshot);
          this.k01.baseLock(snapshot);
          this.hud.pulse(snapshot, true);
          this.vfx.spark(snapshot, route.robot.x, route.robot.y, "回收", 0x62ff9d);
          break;
        case "monster-clear":
          this.arm.returnHome(snapshot);
          this.hud.pulse(snapshot, true);
          this.monster.clear(snapshot, () => {
            this.monster.signature = "";
            this.monster.sync(this.snapshot, getRoute(this.snapshot));
          });
          this.time.delayedCall(120, () => this.vfx.spark(snapshot, armTarget.x, armTarget.y, "清除", 0x62ff9d));
          break;
        case "room-clear":
          this.hud.pulse(snapshot, true);
          this.room.openDoor(snapshot);
          this.arm.clear();
          this.vfx.spark(snapshot, snapshot.width * 0.5, snapshot.height * 0.12, "开门", 0x62ff9d);
          break;
        case "room-enter":
          this.k01.enterRoom(snapshot);
          this.k01.baseLock(snapshot);
          this.vfx.spark(snapshot, route.robot.x, route.robot.y, "入场", 0x45f7e4);
          break;
        case "boss-phase-crack":
          this.monster.hit(snapshot);
          this.room.wrong(snapshot);
          this.vfx.spark(snapshot, armTarget.x, armTarget.y, "裂甲", 0xffd66e);
          break;
        case "mission-clear":
          this.arm.returnHome(snapshot);
          this.room.openDoor(snapshot);
          this.k01.overdrive(snapshot);
          this.monster.clear(snapshot);
          this.vfx.spark(snapshot, snapshot.width * 0.5, snapshot.height * 0.48, "核心离线", 0x62ff9d);
          break;
        case "drift-error":
          this.room.drift(snapshot);
          this.k01.drift(snapshot);
          this.monster.approach(snapshot, 0.05);
          this.arm.miss(snapshot, { x: wallMiss.x - snapshot.width * 0.12, y: wallMiss.y + snapshot.height * 0.08 });
          this.vfx.driftGhost(snapshot);
          this.vfx.shieldCrack(snapshot);
          this.hud.pulse(snapshot, false);
          break;
        case "arm-stuck":
          this.arm.stuck(snapshot, armTarget);
          this.monster.approach(snapshot, 0.035);
          this.k01.damage(snapshot);
          this.vfx.spark(snapshot, armTarget.x, armTarget.y, "卡住", 0xff9d45);
          this.vfx.shieldCrack(snapshot);
          this.hud.pulse(snapshot, false);
          break;
        case "breach":
          this.room.wrong(snapshot);
          this.monster.approach(snapshot, 0.08);
          this.k01.damage(snapshot);
          this.arm.miss(snapshot, wallMiss);
          this.vfx.spark(snapshot, route.robot.x, route.robot.y, "破舱", 0xff625c);
          this.vfx.shieldCrack(snapshot);
          this.hud.pulse(snapshot, false);
          break;
        case "death":
          this.k01.shutdownMode();
          this.room.wrong(snapshot);
          this.arm.clear();
          this.hud.pulse(snapshot, false);
          break;
        case "low-health":
          this.room.wrong(snapshot);
          this.k01.damage(snapshot);
          this.hud.pulse(snapshot, false);
          break;
        case "wrong-key":
        default:
          this.room.wrong(snapshot);
          this.monster.approach(snapshot, snapshot.encounter?.modifier?.id === "rush" ? 0.06 : 0.035);
          this.k01.damage(snapshot);
          this.arm.miss(snapshot, wallMiss);
          this.vfx.spark(snapshot, wallMiss.x, wallMiss.y, "MISS", 0xff625c);
          this.vfx.shieldCrack(snapshot);
          this.hud.pulse(snapshot, false);
          break;
      }
    }

    update(time, delta) {
      if (!this.snapshot || !this.room) return;
      this.route = getRoute(this.snapshot);
      this.room.update(time, delta, this.snapshot, this.route);
      this.k01.update(time, delta, this.snapshot);
      this.monster.update(time, delta, this.snapshot);
      this.arm.update(time, delta, this.snapshot);
    }
  }

  window.RoomCombatScene = RoomCombatScene;
})();
