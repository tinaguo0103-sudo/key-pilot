(function () {
  const TEXT_FONT = "PingFang SC, Microsoft YaHei, system-ui, sans-serif";
  const MONO_FONT = "SFMono-Regular, Menlo, Consolas, monospace";

  const TEXTURES = {
    room: "kp-cruise-room-v07",
    k01: "kp-cruise-k01-v04",
    threats: "kp-cruise-threats-v07"
  };

  function manifest() {
    return window.KeyPilotAssets || {};
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatKey(key) {
    return key ? String(key).toUpperCase() : "";
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

  function threatVisual(threat = {}) {
    const rhythm = threat.rhythmId || "warmup";
    if (threat.type === "turret") {
      return { color: 0xff625c, accent: 0xffd66e, dark: 0x2a1010, alpha: rhythm === "overdrive" ? 0.92 : 0.78 };
    }
    if (threat.type === "swarm") {
      return { color: 0x9d7cff, accent: 0x45f7e4, dark: 0x15112d, alpha: rhythm === "surge" ? 0.86 : 0.72 };
    }
    if (threat.type === "anchor") {
      return { color: 0x62ff9d, accent: 0xffd66e, dark: 0x0b2518, alpha: 0.7 };
    }
    return { color: 0xffd66e, accent: 0xff625c, dark: 0x2a210f, alpha: rhythm === "overdrive" ? 0.9 : 0.76 };
  }

  function lanePoint(snapshot, laneId) {
    const { width, height } = snapshot;
    const map = {
      "left-high": { x: width * 0.13, y: height * 0.32 },
      "left-mid": { x: width * 0.11, y: height * 0.52 },
      "left-low": { x: width * 0.16, y: height * 0.72 },
      "right-high": { x: width * 0.87, y: height * 0.32 },
      "right-mid": { x: width * 0.89, y: height * 0.52 },
      "right-low": { x: width * 0.84, y: height * 0.72 },
      top: { x: width * 0.5, y: height * 0.18 },
      bottom: { x: width * 0.5, y: height * 0.84 }
    };
    return map[laneId] || map["right-mid"];
  }

  function robotPoint(snapshot) {
    return { x: snapshot.width * 0.5, y: snapshot.height * 0.66 };
  }

  function shieldPoint(snapshot, laneId = "") {
    const robot = robotPoint(snapshot);
    const radius = Math.min(snapshot.width, snapshot.height) * 0.13;
    const lane = String(laneId || "");
    let dx = 0;
    let dy = -radius * 0.08;
    if (lane.startsWith("left")) dx = -radius * 0.52;
    if (lane.startsWith("right")) dx = radius * 0.52;
    if (lane === "top") dy = -radius * 0.58;
    if (lane === "bottom") dy = radius * 0.58;
    if (lane.endsWith("high")) dy -= radius * 0.26;
    if (lane.endsWith("low")) dy += radius * 0.26;
    return { x: robot.x + dx, y: robot.y + dy };
  }

  function pointAt(from, to, t) {
    return {
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t
    };
  }

  function curvedPoint(from, to, t, bend = 0) {
    const mid = pointAt(from, to, 0.5);
    const angle = angleBetween(from, to);
    const normal = angle + Math.PI / 2;
    const control = {
      x: mid.x + Math.cos(normal) * bend,
      y: mid.y + Math.sin(normal) * bend
    };
    const oneMinus = 1 - t;
    return {
      x: oneMinus * oneMinus * from.x + 2 * oneMinus * t * control.x + t * t * to.x,
      y: oneMinus * oneMinus * from.y + 2 * oneMinus * t * control.y + t * t * to.y
    };
  }

  function angleBetween(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }

  function easeInCubic(t) {
    const n = clamp(t, 0, 1);
    return n * n * n;
  }

  function easeOutCubic(t) {
    const n = clamp(t, 0, 1);
    return 1 - Math.pow(1 - n, 3);
  }

  function easeInQuart(t) {
    const n = clamp(t, 0, 1);
    return n * n * n * n;
  }

  function projectileMotion(threat = {}, rawProgress = 0, timeRatio = 1) {
    const progress = clamp(rawProgress, 0, 1);
    const pressure = 1 - clamp(timeRatio, 0, 1);
    if (progress < 0.22) {
      return {
        phase: threat.type === "turret" ? "charge" : "telegraph",
        t: 0.04 + progress * 0.18,
        scaleBoost: 0.02 + pressure * 0.025,
        shake: 0,
        frameBias: 0,
        pathStyle: "ballistic"
      };
    }
    if (progress < 0.82) {
      const local = (progress - 0.22) / 0.6;
      return {
        phase: threat.type === "turret" ? "fire" : "launch",
        t: 0.12 + easeInQuart(local) * 0.68,
        scaleBoost: 0.04 + local * 0.06,
        shake: 0,
        frameBias: local > 0.45 ? 1 : 0,
        pathStyle: "ballistic"
      };
    }
    const local = (progress - 0.82) / 0.18;
    return {
      phase: "terminal",
      t: clamp(0.8 + easeOutCubic(local) * 0.18, 0.8, 0.985),
      scaleBoost: 0.1 + pressure * 0.06,
      shake: 0,
      frameBias: 2,
      pathStyle: "ballistic"
    };
  }

  function creatureMotion(threat = {}, rawProgress = 0, timeRatio = 1) {
    const progress = clamp(rawProgress, 0, 1);
    const pressure = 1 - clamp(timeRatio, 0, 1);
    if (progress < 0.3) {
      return {
        phase: "emerge",
        t: 0.04 + progress * 0.22,
        scaleBoost: pressure * 0.035,
        shake: 1.2 + pressure * 1.4,
        frameBias: Math.floor(progress * 16) % 2,
        pathStyle: "creature"
      };
    }
    if (progress < 0.76) {
      const local = (progress - 0.3) / 0.46;
      return {
        phase: "crawl",
        t: 0.24 + Math.pow(local, 1.18) * 0.5,
        scaleBoost: 0.04 + local * 0.12,
        shake: 2.6 + local * 3.8,
        frameBias: 1 + Math.floor(local * 8) % 2,
        pathStyle: "creature"
      };
    }
    const local = (progress - 0.76) / 0.24;
    return {
      phase: "lunge",
      t: clamp(0.74 + easeOutCubic(local) * 0.24, 0.74, 0.985),
      scaleBoost: 0.12 + local * 0.16,
      shake: 5 + local * 5,
      frameBias: 2,
      pathStyle: "creature"
    };
  }

  function deviceMotion(threat = {}, rawProgress = 0) {
    const progress = clamp(rawProgress, 0, 1);
    if (progress < 0.28) {
      return { phase: "aim", frameBias: 0, chargeAlpha: 0.4 + progress, muzzleScale: 0.7 };
    }
    if (progress < 0.62) {
      const local = (progress - 0.28) / 0.34;
      return { phase: "charge", frameBias: 1, chargeAlpha: 0.62 + local * 0.28, muzzleScale: 0.84 + local * 0.36 };
    }
    return { phase: "fire", frameBias: 2, chargeAlpha: 0.84, muzzleScale: 1.14 + (progress - 0.62) * 0.22 };
  }

  function attackMotion(threat = {}, rawProgress = 0, timeRatio = 1) {
    if (threat.type === "swarm") return creatureMotion(threat, rawProgress, timeRatio);
    return projectileMotion(threat, rawProgress, timeRatio);
  }

  function threatDisplayClass(threat = {}) {
    if (threat.type === "swarm") return "creature";
    if (threat.type === "turret") return "projectile";
    return "projectile";
  }

  function threatUnitSize(snapshot, threat = {}) {
    const min = Math.min(snapshot.width, snapshot.height);
    if (threat.type === "swarm") return clamp(min * 0.055, 34, 58);
    return clamp(min * 0.047, 28, 48);
  }

  function deviceSize(snapshot) {
    return clamp(Math.min(snapshot.width, snapshot.height) * 0.105, 72, 118);
  }

  function muzzlePoint(start, shield, distance) {
    const angle = angleBetween(start, shield);
    return {
      x: start.x + Math.cos(angle) * distance,
      y: start.y + Math.sin(angle) * distance
    };
  }

  function getThreatFramesForType(type = "projectile") {
    const states = manifest().cruise?.threats?.states || {};
    const visualType = type === "anchor" ? "projectile" : type;
    return states[visualType] || states.projectile || [0];
  }

  function getThreatFrames(threat = {}) {
    return getThreatFramesForType(threat.type);
  }

  function mobileThreatType(threat = {}) {
    if (threat.type === "turret") return "projectile";
    if (threat.type === "anchor") return "projectile";
    return threat.type || "projectile";
  }

  function threatTaxonomy(threat = {}) {
    const taxonomy = manifest().cruise?.threats?.taxonomy || {};
    return taxonomy[threat.type] || (threat.type === "turret" ? "device" : threat.type === "swarm" ? "creature" : "projectile");
  }

  class AttackWaveController {
    constructor(scene) {
      this.scene = scene;
      this.actors = new Map();
      this.cleared = new Set();
      this.roundKey = "";
      this.activeId = "";
      this.recreateWorld();
    }

    recreateWorld() {
      if (this.laneGraphics) this.laneGraphics.destroy();
      this.laneGraphics = this.scene.add.graphics();
      this.scene.layers.world.add(this.laneGraphics);
    }

    build(snapshot, force = false) {
      const round = snapshot.roundInfo || {};
      const threats = Array.isArray(snapshot.roundThreats) && snapshot.roundThreats.length
        ? snapshot.roundThreats
        : snapshot.threat ? [snapshot.threat] : [];
      const roundKey = `${round.roundIndex || 0}:${round.size || threats.length}:${(round.keys || []).join("")}`;
      if (!force && roundKey === this.roundKey && this.actors.size === threats.length) return;
      this.destroyActors();
      this.cleared.clear();
      this.roundKey = roundKey;
      threats.forEach((threat) => {
        const actor = this.createActor(threat, snapshot);
        this.actors.set(threat.id, actor);
      });
      this.sync(snapshot);
    }

    destroyActors() {
      this.actors.forEach((actor) => {
        actor.container?.destroy?.();
        actor.device?.destroy?.();
      });
      this.actors.clear();
    }

    sync(snapshot) {
      this.build(snapshot);
      const activeId = snapshot.activeThreatId || snapshot.threat?.id || "";
      this.activeId = activeId;
      const round = snapshot.roundInfo || {};
      const activeStep = Number.isFinite(snapshot.activeRoundStep) ? snapshot.activeRoundStep : round.step || 0;
      const threats = Array.isArray(snapshot.roundThreats) && snapshot.roundThreats.length
        ? snapshot.roundThreats
        : snapshot.threat ? [snapshot.threat] : [];
      threats.forEach((threat) => {
        const actor = this.actors.get(threat.id);
        if (!actor) return;
        if ((threat.roundStep || 0) < activeStep) this.cleared.add(threat.id);
        this.positionActor(actor, threat, snapshot, activeStep, activeId);
      });
      this.drawActiveLane(snapshot);
    }

    positionActor(actor, threat, snapshot, activeStep, activeId) {
      const start = lanePoint(snapshot, threat.lane);
      const shield = shieldPoint(snapshot, threat.lane);
      const step = threat.roundStep || 0;
      const isActive = threat.id === activeId;
      const isCleared = this.cleared.has(threat.id) || step < activeStep;
      const taxonomy = threatTaxonomy(threat);
      const delta = Math.max(0, step - activeStep);
      const pressure = 1 - clamp(snapshot.timeRatio || 1, 0, 1);
      let t = 0.08;
      let alpha = 0.78;
      let scale = actor.baseScale;
      let visible = true;
      let motion = { phase: "queued", shake: 0, frameBias: 0, scaleBoost: 0, pathStyle: actor.displayClass };
      if (snapshot.introActive) {
        t = clamp(0.04 + step * 0.018, 0.04, 0.18);
        alpha = step < 2 ? 0.26 : 0;
        scale = actor.baseScale * 0.7;
        visible = step < 2;
      } else if (isCleared) {
        t = 0.9;
        alpha = 0;
        scale = actor.baseScale * 0.72;
        visible = false;
      } else if (isActive) {
        const progress = clamp(snapshot.threatProgress || 0, 0, 1);
        motion = attackMotion(threat, progress, snapshot.timeRatio);
        const rushBoost = actor.rushBoost || 0;
        t = clamp(motion.t + rushBoost * (actor.displayClass === "creature" ? 0.055 : 0.035), 0.04, 0.995);
        alpha = 1;
        const maxBoost = actor.displayClass === "creature" ? 0.32 : 0.18;
        scale = actor.baseScale * (1 + Math.min(maxBoost, motion.scaleBoost + rushBoost * 0.06));
      } else {
        visible = delta <= 1 && taxonomy !== "device";
        t = clamp(0.025 + delta * 0.028, 0.025, 0.09);
        alpha = visible ? 0.2 : 0;
        scale = actor.baseScale * 0.72;
        motion.phase = `queued-${delta}`;
      }
      if (taxonomy === "device" && !isActive) {
        visible = false;
        alpha = 0;
      }

      const sideBend = String(threat.lane || "").startsWith("left") ? -1 : 1;
      const travelStart = taxonomy === "device" ? muzzlePoint(start, shield, actor.deviceSize * 0.34) : start;
      const laneBend = Math.min(snapshot.width, snapshot.height) * 0.06 * sideBend;
      const pos = actor.displayClass === "creature" && isActive
        ? curvedPoint(travelStart, shield, t, laneBend)
        : pointAt(travelStart, shield, t);
      const normal = angleBetween(start, shield) + Math.PI / 2;
      if (isActive && actor.displayClass === "creature") {
        const crawl = motion.phase === "crawl" ? Math.sin(this.scene.time.now / 38 + step) * motion.shake : 0;
        const lunge = motion.phase === "lunge" ? Math.pow(pressure, 2.2) * Math.min(snapshot.width, snapshot.height) * 0.028 : 0;
        const forwardAngle = angleBetween(pos, shield);
        pos.x += Math.cos(normal) * crawl + Math.cos(forwardAngle) * lunge;
        pos.y += Math.sin(normal) * crawl * 0.42 + Math.sin(forwardAngle) * lunge;
      } else if (!isActive && visible) {
        const queueOffset = (step % 2 ? 1 : -1) * Math.min(10, 4 + delta * 3);
        pos.x += Math.cos(normal) * queueOffset;
        pos.y += Math.sin(normal) * queueOffset;
      }

      actor.container.setVisible(visible);
      actor.container.setPosition(pos.x, pos.y);
      actor.container.setAlpha(alpha);
      actor.container.setScale(scale);
      actor.targetScale = scale;
      const faceAngle = angleBetween(pos, shield);
      actor.container.setRotation(actor.displayClass === "projectile" ? faceAngle : 0);
      actor.container.setDepth(isActive ? 125 : 86 - Math.min(30, delta));
      this.updateMobileVisual(actor, threat, motion, isActive, pressure);
      if (actor.device) {
        const deviceVisible = taxonomy === "device" && !isCleared && (isActive || delta <= 1);
        const deviceAlpha = deviceVisible ? (isActive ? 0.95 : 0.42) : 0;
        actor.device.setVisible(deviceVisible || deviceAlpha > 0);
        actor.device.setPosition(start.x, start.y);
        actor.device.setAlpha(deviceAlpha);
        actor.device.setDepth(isActive ? 94 : 70);
        this.updateDeviceVisual(actor, threat, isActive ? deviceMotion(threat, clamp(snapshot.threatProgress || 0, 0, 1)) : null, pressure);
      }
      if (actor.shadow) {
        actor.shadow.setAlpha(isActive ? 0.36 : 0.22);
        actor.shadow.setScale(isActive ? 1.08 : 0.9);
      }
      if (actor.homePulse) {
        actor.homePulse.setAlpha(threat.homePulse && !isCleared ? (isActive ? 0.8 : 0.34) : 0);
      }
      if (actor.aura) {
        actor.aura.setAlpha(isCleared ? 0 : isActive ? 0.1 : 0.04);
        actor.aura.setScale(isActive ? 1.1 : 0.82);
      }
      actor.status = isActive ? "active" : isCleared ? "cleared" : "queued";
      actor.visibleTier = visible ? (isActive ? "active" : `queued-${delta}`) : "hidden";
      actor.motionPhase = isActive ? motion.phase : actor.visibleTier;
      actor.pathStyle = isActive ? motion.pathStyle : actor.displayClass;
      actor.taxonomy = taxonomy;
      actor.distanceToShield = Math.hypot(actor.container.x - shield.x, actor.container.y - shield.y);
      actor.approxSize = actor.unitSize * scale;
    }

    createActor(threat, snapshot) {
      const container = this.scene.add.container(0, 0);
      const min = Math.min(snapshot.width, snapshot.height);
      const taxonomy = threatTaxonomy(threat);
      const displayClass = threatDisplayClass(threat);
      const visualType = mobileThreatType(threat);
      const unitSize = threatUnitSize(snapshot, threat);
      const visual = threatVisual(threat);
      let sprite = null;
      const shadow = this.scene.add.ellipse(0, unitSize * 0.28, unitSize * 0.86, unitSize * 0.16, 0x000000, 0.28);
      const aura = this.scene.add.ellipse(0, unitSize * 0.02, unitSize * 0.72, unitSize * 0.3, visual.color, 0.045);
      container.add(shadow);
      container.add(aura);
      const swarmUnits = [];
      if (displayClass === "creature") this.createCreatureSwarmActor(container, swarmUnits, threat, visual, unitSize);
      else sprite = this.createProjectileActor(container, threat, visual, unitSize);
      let device = null;
      let deviceSprite = null;
      let deviceBaseScale = 1;
      const fixedDeviceSize = deviceSize(snapshot);
      if (taxonomy === "device") {
        const createdDevice = this.createDeviceActor(threat, visual, fixedDeviceSize);
        device = createdDevice.device;
        deviceSprite = createdDevice.deviceSprite;
        deviceBaseScale = createdDevice.deviceBaseScale;
      }
      let homePulse = null;
      if (threat.homePulse || threat.type === "anchor") {
        homePulse = this.scene.add.ellipse(0, unitSize * 0.02, unitSize * 0.34, unitSize * 0.2, 0x62ff9d, 0.12);
        homePulse.setAlpha(0.16);
        container.add(homePulse);
      }
      this.scene.layers.actors.add(container);
      return {
        container,
        sprite,
        swarmUnits,
        shadow,
        aura,
        homePulse,
        device,
        deviceSprite,
        deviceBaseScale,
        threat,
        taxonomy,
        mobileType: visualType,
        displayClass,
        unitSize,
        deviceSize: fixedDeviceSize,
        swarmRadius: unitSize * 0.74,
        baseScale: 1,
        targetScale: 1,
        status: "queued",
        visibleTier: "queued",
        pathStyle: displayClass,
        approxSize: unitSize,
        lastTrailAt: 0
      };
    }

    createProjectileActor(container, threat, visual, unitSize) {
      let sprite = null;
      const flame = this.scene.add.ellipse(-unitSize * 0.46, 0, unitSize * 0.46, unitSize * 0.16, visual.accent, 0.62);
      const coreGlow = this.scene.add.ellipse(0, 0, unitSize * 0.92, unitSize * 0.34, visual.color, 0.2);
      container.add([flame, coreGlow]);
      if (this.scene.textures.exists(TEXTURES.threats)) {
        const frames = getThreatFramesForType(mobileThreatType(threat));
        sprite = this.scene.add.sprite(0, 0, TEXTURES.threats, frames[0] || 0);
        sprite.setDisplaySize(unitSize * 1.18, unitSize * 1.18);
        sprite.setAlpha(0.98);
        if (threat.homePulse || threat.type === "anchor") sprite.setTint(0xc9fff0);
        container.add(sprite);
      } else {
        const g = this.scene.add.graphics();
        g.fillStyle(visual.dark, 0.95);
        g.fillRoundedRect(-unitSize * 0.42, -unitSize * 0.14, unitSize * 0.74, unitSize * 0.28, unitSize * 0.12);
        g.fillStyle(visual.color, 0.96);
        g.fillCircle(unitSize * 0.26, 0, unitSize * 0.13);
        g.fillStyle(visual.accent, 0.82);
        g.fillTriangle(-unitSize * 0.4, 0, -unitSize * 0.7, -unitSize * 0.16, -unitSize * 0.7, unitSize * 0.16);
        container.add(g);
      }
      return sprite;
    }

    createCreatureSwarmActor(container, swarmUnits, threat, visual, unitSize) {
      const frames = getThreatFramesForType("swarm");
      const unitCount = 5;
      for (let index = 0; index < unitCount; index += 1) {
        let unit;
        if (this.scene.textures.exists(TEXTURES.threats)) {
          unit = this.scene.add.sprite(0, 0, TEXTURES.threats, frames[index % frames.length] || frames[0] || 0);
          unit.setDisplaySize(unitSize * 0.92, unitSize * 0.92);
        } else {
          unit = this.scene.add.graphics();
          unit.fillStyle(index % 2 ? visual.color : visual.accent, 0.94);
          unit.fillEllipse(0, 0, unitSize * 0.62, unitSize * 0.38);
          unit.fillStyle(visual.dark, 0.88);
          unit.fillCircle(unitSize * 0.14, -unitSize * 0.04, unitSize * 0.07);
        }
        unit.setAlpha?.(0.94);
        unit.seed = index * 1.73;
        swarmUnits.push(unit);
        container.add(unit);
      }
    }

    createDeviceActor(threat, visual, size) {
      const device = this.scene.add.container(0, 0);
      const deviceShadow = this.scene.add.ellipse(0, size * 0.28, size * 0.72, size * 0.16, 0x000000, 0.34);
      const deviceGlow = this.scene.add.ellipse(0, size * 0.04, size * 0.58, size * 0.24, visual.color, 0.08);
      let deviceSprite = null;
      if (this.scene.textures.exists(TEXTURES.threats)) {
        const deviceFrames = getThreatFramesForType("turret");
        deviceSprite = this.scene.add.sprite(0, 0, TEXTURES.threats, deviceFrames[0] || 0);
        deviceSprite.setDisplaySize(size, size);
      } else {
        deviceSprite = this.scene.add.graphics();
        deviceSprite.fillStyle(visual.dark, 0.96);
        deviceSprite.fillRoundedRect(-size * 0.28, -size * 0.22, size * 0.56, size * 0.44, size * 0.08);
        deviceSprite.fillStyle(visual.color, 0.92);
        deviceSprite.fillCircle(size * 0.08, 0, size * 0.1);
      }
      const muzzle = this.scene.add.ellipse(size * 0.23, 0, size * 0.22, size * 0.12, visual.accent, 0.42);
      const charge = this.scene.add.ellipse(size * 0.08, 0, size * 0.42, size * 0.26, visual.color, 0.14);
      device.add([deviceShadow, deviceGlow, deviceSprite, charge, muzzle]);
      device.setAlpha(0);
      device.muzzle = muzzle;
      device.charge = charge;
      this.scene.layers.actors.add(device);
      return { device, deviceSprite, deviceBaseScale: 1 };
    }

    updateMobileVisual(actor, threat, motion, isActive, pressure) {
      if (actor.sprite?.setFrame) {
        const frames = getThreatFramesForType(actor.mobileType || mobileThreatType(threat));
        const usableFrames = frames.length ? frames : [0];
        const frameIndex = isActive ? Math.min(usableFrames.length - 1, Math.max(0, motion.frameBias || 0)) : 0;
        actor.sprite.setFrame(usableFrames[frameIndex] || usableFrames[0]);
        actor.sprite.setAlpha(isActive ? 1 : 0.72);
        actor.sprite.setPosition(0, 0);
        actor.sprite.setRotation(0);
      }
      if (actor.swarmUnits?.length) {
        const frames = getThreatFramesForType("swarm");
        actor.swarmUnits.forEach((unit, index) => {
          const phase = (motion.phase || "").startsWith("queued") ? "queued" : motion.phase;
          const row = index % 2;
          const baseX = (index - 2) * actor.unitSize * 0.34;
          const crawl = isActive ? Math.sin(this.scene.time.now / (58 + index * 5) + unit.seed) * actor.unitSize * 0.12 : 0;
          const lunge = phase === "lunge" ? -Math.pow(pressure, 2) * actor.unitSize * (0.22 + index * 0.025) : 0;
          unit.setFrame?.(frames[(isActive ? Math.floor(this.scene.time.now / 72 + index + (motion.frameBias || 0)) : index) % frames.length] || frames[0]);
          unit.setPosition(baseX + crawl, (row ? 1 : -1) * actor.unitSize * 0.16 + lunge);
          unit.setScale?.(1 + (isActive ? pressure * 0.12 : 0));
          unit.setRotation?.(Math.sin(this.scene.time.now / 86 + index) * (isActive ? 0.08 : 0.02));
          unit.setAlpha?.(isActive ? 0.96 : 0.58);
        });
      }
      if (actor.aura) actor.aura.setAlpha(isActive ? (actor.displayClass === "creature" ? 0.11 : 0.07) : 0.035);
    }

    updateDeviceVisual(actor, threat, motion, pressure) {
      const device = actor.device;
      if (!device) return;
      device.setScale(actor.deviceBaseScale * (1 + pressure * 0.04));
      const faceAngle = angleBetween(lanePoint(this.scene.snapshot, threat.lane), shieldPoint(this.scene.snapshot, threat.lane));
      device.setRotation(faceAngle);
      if (actor.deviceSprite?.setFrame) {
        const deviceFrames = getThreatFramesForType("turret");
        const frameBias = motion ? motion.frameBias || 0 : 0;
        actor.deviceSprite.setFrame(deviceFrames[Math.min(deviceFrames.length - 1, frameBias)] || deviceFrames[0]);
      }
      if (device.charge) {
        device.charge.setAlpha(motion ? motion.chargeAlpha : 0.12);
        device.charge.setScale(motion ? motion.muzzleScale : 0.82);
      }
      if (device.muzzle) {
        device.muzzle.setAlpha(motion ? 0.42 + pressure * 0.32 : 0.18);
        device.muzzle.setScale(motion ? motion.muzzleScale : 0.76);
      }
    }

    drawActiveLane(snapshot) {
      this.laneGraphics.clear();
    }

    activate(threat) {
      if (!threat) return;
      this.activeId = threat.id;
      const actor = this.actors.get(threat.id);
      if (!actor) return;
      actor.rushBoost = 0;
      this.scene.tweens.killTweensOf(actor.container);
      this.scene.tweens.add({
        targets: actor.container,
        alpha: 1,
        scaleX: actor.baseScale * 1.18,
        scaleY: actor.baseScale * 1.18,
        duration: 120,
        yoyo: true,
        ease: "Cubic.easeOut"
      });
    }

    pounce(threat) {
      const actor = threat ? this.actors.get(threat.id) : null;
      if (!actor || this.scene.snapshot.reducedMotion) return;
      actor.rushBoost = Math.max(actor.rushBoost || 0, actor.displayClass === "creature" ? 1 : 0.72);
      this.scene.tweens.killTweensOf(actor.container);
      const scaleBoost = actor.displayClass === "creature" ? 1.14 : 1.05;
      this.scene.tweens.add({
        targets: actor.container,
        scaleX: (actor.targetScale || actor.baseScale) * scaleBoost,
        scaleY: (actor.targetScale || actor.baseScale) * scaleBoost,
        duration: actor.displayClass === "creature" ? 82 : 56,
        yoyo: true,
        ease: "Cubic.easeOut"
      });
      if (actor.sprite) {
        this.scene.tweens.add({
          targets: actor.sprite,
          alpha: 0.68,
          duration: 48,
          yoyo: true,
          ease: "Cubic.easeOut"
        });
      }
    }

    intercept(threat, anchor = false) {
      if (!threat) return null;
      const actor = this.actors.get(threat.id);
      const target = actor ? { x: actor.container.x, y: actor.container.y } : lanePoint(this.scene.snapshot, threat.lane);
      this.cleared.add(threat.id);
      if (actor && !anchor) {
        this.scene.tweens.killTweensOf(actor.container);
        const frames = getThreatFramesForType(actor.mobileType || mobileThreatType(threat));
        if (actor.sprite?.setFrame && frames.length) actor.sprite.setFrame(frames[frames.length - 1]);
        const exitScale = actor.displayClass === "creature" ? 1.12 : 0.82;
        this.scene.tweens.add({
          targets: actor.container,
          alpha: 0,
          scaleX: actor.baseScale * exitScale,
          scaleY: actor.baseScale * exitScale,
          duration: actor.displayClass === "creature" ? 190 : 120,
          ease: "Cubic.easeOut"
        });
      }
      const displayClass = actor?.displayClass || threatDisplayClass(threat);
      this.burstAt(target.x, target.y, threatVisual(threat).accent, anchor ? 0.55 : displayClass === "creature" ? 0.9 : 0.72);
      return target;
    }

    wrongRush(threat) {
      const snapshot = this.scene.snapshot;
      const actor = threat ? this.actors.get(threat.id) : null;
      if (!actor || snapshot.reducedMotion) return;
      const shield = shieldPoint(snapshot, threat.lane);
      const current = { x: actor.container.x, y: actor.container.y };
      const next = pointAt(current, shield, actor.displayClass === "creature" ? 0.18 : 0.12);
      actor.rushBoost = Math.max(actor.rushBoost || 0, actor.displayClass === "creature" ? 0.85 : 0.45);
      this.scene.tweens.killTweensOf(actor.container);
      this.scene.tweens.add({
        targets: actor.container,
        x: next.x,
        y: next.y,
        duration: actor.displayClass === "creature" ? 90 : 64,
        yoyo: actor.displayClass !== "projectile",
        ease: "Cubic.easeOut"
      });
    }

    impact(threat) {
      if (!threat) return shieldPoint(this.scene.snapshot);
      const actor = this.actors.get(threat.id);
      const target = shieldPoint(this.scene.snapshot, threat.lane);
      this.cleared.add(threat.id);
      if (actor && !this.scene.snapshot.reducedMotion) {
        this.scene.tweens.killTweensOf(actor.container);
        const frames = getThreatFramesForType(actor.mobileType || mobileThreatType(threat));
        if (actor.sprite?.setFrame && frames.length) actor.sprite.setFrame(frames[frames.length - 1]);
        this.scene.tweens.add({
          targets: actor.container,
          x: target.x,
          y: target.y,
          alpha: 0,
          scaleX: actor.baseScale * (actor.displayClass === "creature" ? 0.58 : 0.38),
          scaleY: actor.baseScale * (actor.displayClass === "creature" ? 0.58 : 0.38),
          duration: actor.displayClass === "creature" ? 170 : 115,
          ease: "Cubic.easeIn"
        });
      }
      return target;
    }

    burstAt(x, y, color = 0xffd66e, intensity = 1) {
      const group = this.scene.add.container(0, 0);
      const particles = [];
      const count = 10;
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count;
        const dot = this.scene.add.circle(x, y, 4 + intensity * 2, color, 0.82);
        particles.push(dot);
        group.add(dot);
        this.scene.tweens.add({
          targets: dot,
          x: x + Math.cos(angle) * (26 + intensity * 22),
          y: y + Math.sin(angle) * (18 + intensity * 18),
          alpha: 0,
          scaleX: 0.5,
          scaleY: 0.5,
          duration: 180,
          ease: "Cubic.easeOut"
        });
      }
      this.scene.layers.vfx.add(group);
      this.scene.tweens.add({ targets: group, alpha: 0, duration: 210, ease: "Cubic.easeOut", onComplete: () => group.destroy(true) });
    }

    clearWave() {
      this.actors.forEach((actor, id) => {
        this.cleared.add(id);
        this.scene.tweens.killTweensOf(actor.container);
        this.scene.tweens.add({
          targets: actor.container,
          alpha: 0,
          scaleX: actor.baseScale * 0.7,
          scaleY: actor.baseScale * 0.7,
          duration: 180,
          ease: "Cubic.easeOut"
        });
        if (actor.device) {
          this.scene.tweens.killTweensOf(actor.device);
          this.scene.tweens.add({
            targets: actor.device,
            alpha: 0,
            duration: 160,
            ease: "Cubic.easeOut"
          });
        }
      });
      this.laneGraphics.clear();
    }

    update() {
      const snapshot = this.scene.snapshot;
      if (!snapshot) return;
      this.actors.forEach((actor) => {
        if (actor.status !== "active") return;
        if (!actor.container.visible) return;
        if (!snapshot.reducedMotion && this.scene.time.now - (actor.lastTrailAt || 0) > (actor.threat.type === "projectile" ? 72 : 115)) {
          actor.lastTrailAt = this.scene.time.now;
          this.emitThreatTrail(actor);
        }
        actor.rushBoost = Math.max(0, (actor.rushBoost || 0) * 0.82 - 0.02);
      });
    }

    emitThreatTrail(actor) {
      const threat = actor.threat || {};
      const visual = threatVisual(threat);
      const snapshot = this.scene.snapshot;
      const start = lanePoint(snapshot, threat.lane);
      const current = { x: actor.container.x, y: actor.container.y };
      const angle = angleBetween(start, current);
      const count = actor.displayClass === "creature" ? 2 : 4;
      for (let i = 0; i < count; i += 1) {
        const dot = this.scene.add.ellipse(
          current.x - Math.cos(angle) * (14 + i * 8),
          current.y - Math.sin(angle) * (14 + i * 8) + (actor.displayClass === "creature" ? (i % 2 ? 3 : -3) : 0),
          actor.displayClass === "projectile" ? 10 - i * 1.5 : 6 - i,
          actor.displayClass === "projectile" ? 3.5 : 3,
          i % 2 ? visual.color : visual.accent,
          actor.displayClass === "projectile" ? 0.32 : 0.2
        );
        dot.setRotation(angle);
        this.scene.layers.vfx.add(dot);
        this.scene.tweens.add({
          targets: dot,
          alpha: 0,
          scaleX: 0.45,
          scaleY: 0.45,
          duration: 160 + i * 35,
          ease: "Cubic.easeOut",
          onComplete: () => dot.destroy()
        });
      }
    }

    debugState() {
      let visibleCount = 0;
      let hiddenCount = 0;
      let staleClearedVisible = 0;
      let activeMotionPhase = "";
      let activeDistanceToShield = 0;
      let activeMobileType = "";
      let activeTaxonomy = "";
      let activeDisplayClass = "";
      let activePathStyle = "";
      let activeApproxSize = 0;
      let visibleDeviceCount = 0;
      this.actors.forEach((actor) => {
        const visible = Boolean(actor.container?.visible && actor.container.alpha > 0.05);
        if (visible) visibleCount += 1;
        else hiddenCount += 1;
        if (actor.device?.visible && actor.device.alpha > 0.05) visibleDeviceCount += 1;
        if (visible && (actor.status === "cleared" || this.cleared.has(actor.threat?.id))) staleClearedVisible += 1;
        if (actor.threat?.id === this.activeId) {
          activeMotionPhase = actor.motionPhase || actor.status || "";
          activeDistanceToShield = actor.distanceToShield || 0;
          activeMobileType = actor.mobileType || "";
          activeTaxonomy = actor.taxonomy || "";
          activeDisplayClass = actor.displayClass || "";
          activePathStyle = actor.pathStyle || "";
          activeApproxSize = actor.approxSize || 0;
        }
      });
      return {
        actorCount: this.actors.size,
        visibleCount,
        hiddenCount,
        staleClearedVisible,
        clearedCount: this.cleared.size,
        activeId: this.activeId,
        activeMobileType,
        activeTaxonomy,
        activeDisplayClass,
        activePathStyle,
        activeApproxSize,
        visibleDeviceCount,
        roundKey: this.roundKey,
        aggressiveMotion: true,
        motionVersion: "ballistic-v09",
        activeMotionPhase,
        activeDistanceToShield,
        activeRushBoost: this.actors.get(this.activeId)?.rushBoost || 0
      };
    }
  }

  class ShieldController {
    constructor(scene) {
      this.scene = scene;
      this.damageScore = 0;
      this.recreateWorld();
    }

    recreateWorld() {
      if (this.graphics) this.graphics.destroy();
      this.graphics = this.scene.add.graphics();
      this.scene.layers.world.add(this.graphics);
    }

    sync(snapshot) {
      this.damageScore = Math.max(this.damageScore * 0.985, snapshot.shieldDamage || 0);
      this.draw(snapshot);
    }

    draw(snapshot) {
      const robot = robotPoint(snapshot);
      const min = Math.min(snapshot.width, snapshot.height);
      const radius = min * 0.12;
      const pressure = 1 - clamp(snapshot.timeRatio || 1, 0, 1);
      const damage = clamp(this.damageScore, 0, 1);
      const threat = snapshot.threat || {};
      const barrier = shieldPoint(snapshot, threat.lane);
      const angle = angleBetween(robot, barrier);
      const normal = angle + Math.PI / 2;
      this.graphics.clear();

      const shieldAlpha = 0.06 + pressure * 0.12 + damage * 0.1;
      this.graphics.fillStyle(snapshot.shield > 45 ? 0x62ff9d : 0xffd66e, shieldAlpha);
      this.graphics.fillEllipse(barrier.x, barrier.y, radius * (0.42 + pressure * 0.28), radius * 0.18);

      const glowCount = Math.min(9, Math.ceil(pressure * 5 + damage * 7 + (snapshot.breaches || 0)));
      for (let i = 0; i < glowCount; i += 1) {
        const seed = (i * 37 + Math.floor(this.scene.time.now / 90)) % 19;
        const offset = ((i / Math.max(1, glowCount - 1)) - 0.5) * radius * 0.76;
        const jitter = Math.sin(this.scene.time.now / 220 + i) * radius * 0.035;
        const x = barrier.x + Math.cos(normal) * (offset + jitter);
        const y = barrier.y + Math.sin(normal) * (offset - jitter * 0.4);
        const color = i % 3 === 0 || damage > 0.45 ? 0xff625c : 0xffd66e;
        this.graphics.fillStyle(color, 0.08 + damage * 0.16 + pressure * 0.08);
        this.graphics.fillCircle(x, y, 3 + (seed % 5) + damage * 5);
      }

      if (snapshot.corruption > 0.18) {
        const smears = Math.min(8, Math.ceil(snapshot.corruption * 10));
        for (let i = 0; i < smears; i += 1) {
          const x = robot.x - radius + (i / Math.max(1, smears - 1)) * radius * 2;
          const y = robot.y + radius * 0.5 + Math.sin((this.scene.time.now / 300) + i) * 4;
          this.graphics.fillStyle(0xff625c, 0.04 + snapshot.corruption * 0.12);
          this.graphics.fillEllipse(x, y, radius * 0.16, radius * 0.045);
        }
      }
    }

    recover(anchor = false) {
      const snapshot = this.scene.snapshot;
      if (!snapshot) return;
      this.damageScore = Math.max(0, this.damageScore - (anchor ? 0.06 : 0.025));
      const robot = robotPoint(snapshot);
      this.scene.pulseAt(robot.x, robot.y - Math.min(snapshot.width, snapshot.height) * 0.045, anchor ? 0x62ff9d : 0x45f7e4, 0.18, 160);
    }

    wrong(threat) {
      const snapshot = this.scene.snapshot;
      const point = shieldPoint(snapshot, threat?.lane);
      this.damageScore = clamp(this.damageScore + 0.035, 0, 1);
      this.scene.pulseAt(point.x, point.y, 0xff625c, 0.32, 160);
      if (!snapshot.reducedMotion) this.scene.cameras.main.shake(90, 0.0035);
    }

    impact(threat) {
      const snapshot = this.scene.snapshot;
      const point = shieldPoint(snapshot, threat?.lane);
      this.damageScore = clamp(this.damageScore + (threat?.type === "turret" ? 0.14 : 0.09), 0, 1);
      this.scene.pulseAt(point.x, point.y, 0xff625c, 0.44, 190);
      if (!snapshot.reducedMotion) this.scene.cameras.main.shake(threat?.type === "turret" ? 170 : 130, threat?.type === "turret" ? 0.008 : 0.006);
    }

    drift() {
      const snapshot = this.scene.snapshot;
      if (!snapshot) return;
      this.damageScore = clamp(this.damageScore + 0.11, 0, 1);
      if (!snapshot.reducedMotion) this.scene.cameras.main.shake(180, 0.01);
    }

    waveClear(mission = false) {
      this.damageScore = mission ? 0 : Math.max(0, this.damageScore - 0.08);
    }

    update() {
      if (this.scene.snapshot) this.draw(this.scene.snapshot);
    }
  }

  class K01DefenseController {
    constructor(scene) {
      this.scene = scene;
    }

    counterFire(threat, anchor = false, targetOverride = null) {
      const snapshot = this.scene.snapshot;
      if (!snapshot) return;
      const robot = robotPoint(snapshot);
      const target = targetOverride || shieldPoint(snapshot, threat?.lane);
      const overdrive = threat?.rhythmId === "overdrive";
      const color = anchor ? 0x62ff9d : overdrive ? 0xff8f70 : 0xffd66e;
      this.scene.emitInterceptor(
        { x: robot.x, y: robot.y - snapshot.height * 0.035 },
        target,
        color,
        overdrive ? 1.22 : anchor ? 0.9 : 1
      );
      this.scene.pulseAt(target.x, target.y, color, anchor ? 0.28 : 0.4, 150);
      if (this.scene.k01 && !snapshot.reducedMotion) {
        this.scene.tweens.add({
          targets: this.scene.k01,
          scaleX: this.scene.k01.scaleX * 1.05,
          scaleY: this.scene.k01.scaleY * 1.05,
          duration: 70,
          yoyo: true,
          ease: "Cubic.easeOut"
        });
      }
    }
  }

  class CruiseHudController {
    constructor(scene) {
      this.scene = scene;
    }

    sync() {
      this.scene.drawHud();
      this.scene.drawReadouts();
      this.scene.drawOverlayState();
    }
  }

  class CruiseDefenseScene extends Phaser.Scene {
    constructor() {
      super("CruiseDefenseScene");
      this.snapshot = null;
      this.activeThreatId = "";
      this.lastEventId = 0;
    }

    preload() {
      const assets = manifest();
      const room = assets.cruise?.room?.background;
      const k01 = assets.characters?.k01;
      if (room && !this.textures.exists(TEXTURES.room)) this.load.image(TEXTURES.room, room);
      if (k01?.sheet && !this.textures.exists(TEXTURES.k01)) {
        this.load.spritesheet(TEXTURES.k01, k01.sheet, {
          frameWidth: k01.frameWidth || 192,
          frameHeight: k01.frameHeight || 192
        });
      }
      const threats = assets.cruise?.threats;
      if (threats?.sheet && !this.textures.exists(TEXTURES.threats)) {
        this.load.spritesheet(TEXTURES.threats, threats.sheet, {
          frameWidth: threats.frameWidth || 362,
          frameHeight: threats.frameHeight || 362
        });
      }
    }

    create() {
      this.__keyPilotMode = "cruise";
      this.layers = {
        bg: this.add.container(0, 0).setDepth(0),
        world: this.add.container(0, 0).setDepth(20),
        actors: this.add.container(0, 0).setDepth(80),
        vfx: this.add.container(0, 0).setDepth(160),
        hud: this.add.container(0, 0).setDepth(260),
        overlay: this.add.container(0, 0).setDepth(420)
      };
      this.attackWave = new AttackWaveController(this);
      this.shieldController = new ShieldController(this);
      this.k01Controller = new K01DefenseController(this);
      this.hudController = new CruiseHudController(this);
      this.updateSnapshot(window.__KEY_PILOT_CRUISE_SNAPSHOT__ || {});
      const queue = Array.isArray(window.__KEY_PILOT_CRUISE_EVENT_QUEUE__) ? window.__KEY_PILOT_CRUISE_EVENT_QUEUE__ : [];
      queue.forEach((event) => this.applyCruiseEvent(event));
      window.__KEY_PILOT_CRUISE_EVENT_QUEUE__ = [];
    }

    update() {
      if (!this.snapshot) return;
      this.updateLiveTiming();
      if (this.attackWave) {
        this.attackWave.sync(this.snapshot);
        this.attackWave.update();
      } else {
        this.updateThreatPosition();
      }
      this.shieldController?.update();
      this.updateHudCountdown();
    }

    updateLiveTiming() {
      const snapshot = this.snapshot;
      if (!snapshot?.threatStartedAt || !snapshot?.threatDeadlineAt || snapshot.introActive) return;
      const duration = Math.max(1, snapshot.threatDeadlineAt - snapshot.threatStartedAt);
      const ratio = clamp((snapshot.threatDeadlineAt - Date.now()) / duration, 0, 1);
      snapshot.timeRatio = ratio;
      snapshot.threatProgress = 1 - ratio;
    }

    updateSnapshot(snapshot) {
      if (!snapshot?.width || !snapshot?.height) return;
      const sizeChanged = !this.snapshot || this.snapshot.width !== snapshot.width || this.snapshot.height !== snapshot.height;
      const threatChanged = this.snapshot?.threat?.id !== snapshot.threat?.id;
      this.snapshot = snapshot;
      this.cameras.main.setZoom(snapshot.pixelRatio || 1);
      this.cameras.main.centerOn(snapshot.width / 2, snapshot.height / 2);
      this.cameras.main.setBackgroundColor(snapshot.palette?.bg || "#04090d");
      if (sizeChanged) {
        this.rebuildBase();
      }
      this.updateActors();
      this.attackWave?.sync(snapshot);
      this.shieldController?.sync(snapshot);
      if (threatChanged) {
        this.spawnThreat(snapshot.threat);
      }
      this.hudController?.sync();
    }

    rebuildBase() {
      const snapshot = this.snapshot;
      const { width, height } = snapshot;
      this.layers.bg.removeAll(true);
      if (this.textures.exists(TEXTURES.room)) {
        this.layers.bg.add(this.add.image(width / 2, height / 2, TEXTURES.room).setDisplaySize(width, height));
      } else {
        const g = this.add.graphics();
        g.fillStyle(0x05090d, 1).fillRect(0, 0, width, height);
        g.fillStyle(0x10262c, 1).fillRect(width * 0.05, height * 0.1, width * 0.9, height * 0.78);
        this.layers.bg.add(g);
      }

      this.layers.world.removeAll(true);
      this.attackWave?.recreateWorld();
      this.shieldController?.recreateWorld();
    }

    updateActors() {
      const snapshot = this.snapshot;
      const { width, height } = snapshot;
      const robot = robotPoint(snapshot);
      const robotSize = Math.min(width, height) * 0.2;
      if (!this.k01) {
        if (this.textures.exists(TEXTURES.k01)) {
          this.k01 = this.add.sprite(robot.x, robot.y, TEXTURES.k01, 0);
        } else {
          this.k01 = this.add.rectangle(robot.x, robot.y, robotSize * 0.56, robotSize * 0.48, 0x244047, 1)
            .setStrokeStyle(4, 0x45f7e4, 0.8);
        }
        this.layers.actors.add(this.k01);
      }
      this.k01.setPosition(robot.x, robot.y);
      this.k01.setDisplaySize(robotSize, robotSize);
      if (this.k01.setFrame && this.textures.exists(TEXTURES.k01)) {
        const frame = snapshot.event === "crash" || snapshot.event === "timeout-hit" ? 4 : snapshot.event === "intercept" ? 5 : 0;
        this.k01.setFrame(frame);
      }

      if (this.k01Glow) {
        this.k01Glow.destroy();
        this.k01Glow = null;
      }
    }

    clearThreatArtifacts() {
      ["threatSprite", "threatLine", "threatSource"].forEach((key) => {
        if (this[key]) {
          this[key].destroy();
          this[key] = null;
        }
      });
      [this.swarmSprites, this.trailSprites].forEach((list) => {
        if (Array.isArray(list)) list.forEach((item) => item?.destroy?.());
      });
      this.swarmSprites = [];
      this.trailSprites = [];
    }

    spawnThreat(threat) {
      if (!threat) return;
      this.activeThreatId = threat.id;
      if (this.attackWave) {
        this.attackWave.build(this.snapshot);
        this.attackWave.activate(threat);
        return;
      }
      const snapshot = this.snapshot;
      const start = lanePoint(snapshot, threat.lane);
      const robot = robotPoint(snapshot);
      const progress = clamp(snapshot.threatProgress || 0, 0, 1);
      const pos = threat.type === "anchor" ? robot : pointAt(start, robot, 0.12 + progress * 0.72);
      const size = Math.min(snapshot.width, snapshot.height) * (threat.type === "turret" ? 0.15 : threat.type === "swarm" ? 0.13 : threat.type === "anchor" ? 0.11 : 0.12);
      const visual = threatVisual(threat);
      this.threatBaseSize = size;
      this.clearThreatArtifacts();

      this.threatSprite = this.createThreatActor(pos, threat, visual, size)
        .setRotation(threat.type === "anchor" ? 0 : angleBetween(start, robot));
      this.threatSprite.setAlpha(1);
      this.layers.actors.add(this.threatSprite);

      this.threatLine = this.add.graphics().setAlpha(0.92);
      this.layers.world.add(this.threatLine);
      this.paintThreatLane(this.threatLine, start, robot, threat, pos, snapshot.timeRatio);
    }

    updateThreatPosition() {
      if (this.attackWave) return;
      const snapshot = this.snapshot;
      const threat = snapshot.threat;
      if (!threat || !this.threatSprite) return;
      const start = lanePoint(snapshot, threat.lane);
      const robot = robotPoint(snapshot);
      const rawProgress = clamp(snapshot.threatProgress || 0, 0, 1);
      const eased = threat.type === "turret"
        ? Math.pow(rawProgress, 0.9)
        : threat.type === "swarm"
          ? Math.pow(rawProgress, 1.05)
          : Math.pow(rawProgress, 1.35);
      const drift = threat.rhythmLaneDrift || 1;
      const t = this.time?.now || Date.now();
      const wiggle = (threat.type === "swarm" || threat.rhythmId === "overdrive")
        ? Math.sin(t / (threat.rhythmId === "overdrive" ? 42 : 64)) * (threat.type === "swarm" ? 18 : 10) * drift
        : 0;
      const pos = threat.type === "anchor" ? { ...robot } : pointAt(start, robot, 0.14 + eased * 0.68);
      const normal = angleBetween(start, robot) + Math.PI / 2;
      pos.x += Math.cos(normal) * wiggle;
      pos.y += Math.sin(normal) * wiggle;
      this.threatSprite.setPosition(pos.x, pos.y);
      if (this.threatSprite.setRotation) this.threatSprite.setRotation(threat.type === "anchor" ? 0 : angleBetween(start, robot));
      if (!snapshot.reducedMotion) {
        const closePulse = snapshot.timeRatio < 0.34 ? (0.34 - snapshot.timeRatio) * 0.5 : 0;
        const rhythmPulse = threat.rhythmId === "overdrive" ? Math.sin(t / 80) * 0.06 : 0;
        this.threatSprite.setScale(1 + closePulse + rhythmPulse);
      }
      this.paintThreatLane(this.threatLine, start, robot, threat, pos, snapshot.timeRatio);
    }

    createThreatActor(pos, threat, visual, size) {
      const actor = this.add.container(pos.x, pos.y);
      const half = size * 0.5;
      const shadow = this.add.ellipse(0, half * 0.34, half * 0.9, half * 0.24, 0x000000, 0.28);
      actor.add(shadow);
      if (this.textures.exists(TEXTURES.threats)) {
        const frames = getThreatFrames(threat);
        const sprite = this.add.sprite(0, 0, TEXTURES.threats, frames[0] || 0);
        sprite.setDisplaySize(size * 1.05, size * 1.05);
        actor.add(sprite);
        return actor;
      }
      const g = this.add.graphics();
      if (threat.type === "swarm") {
        for (let i = 0; i < 6; i += 1) {
          const angle = i * Math.PI / 3;
          const radius = half * (0.12 + (i % 2) * 0.08);
          g.fillStyle(i % 2 ? visual.accent : visual.color, 0.95);
          g.fillCircle(Math.cos(angle) * half * 0.22, Math.sin(angle) * half * 0.18, Math.max(4, radius));
        }
      } else {
        g.fillStyle(visual.dark, 0.88);
        g.fillEllipse(0, 0, half * 0.95, half * 0.62);
        g.fillStyle(visual.color, 0.96);
        g.fillEllipse(half * 0.08, 0, half * 0.42, half * 0.3);
        g.fillStyle(visual.accent, 0.85);
        g.fillCircle(half * 0.2, 0, Math.max(4, half * 0.08));
      }
      actor.add(g);
      return actor;
    }

    createThreatSource(start, robot, threat, visual) {
      return null;
    }

    createThreatCompanions(pos, threat, visual, size) {
      this.swarmSprites = [];
      this.trailSprites = [];
    }

    updateThreatCompanions(pos, start, robot, threat, eased) {
    }

    paintThreatLane(g, start, robot, threat, current, timeRatio = 1) {
      if (!g) return;
      g.clear();
    }

    drawHud() {
      const snapshot = this.snapshot;
      const { width, height } = snapshot;
      const threat = snapshot.threat;
      const guide = snapshot.fingerGuide;
      const round = snapshot.roundInfo || { keys: [], step: 0, size: 0, roundIndex: 0, roundTotal: 1 };
      const intro = Boolean(snapshot.introActive);
      this.layers.hud.removeAll(true);
      const x = width * 0.5;
      const y = height * 0.2;
      const panelW = clamp(width * 0.42, 430, 660);
      const panelH = clamp(height * 0.22, 150, 190);
      const panel = this.add.graphics();
      panel.fillStyle(0x02070c, 0.84);
      panel.fillRoundedRect(x - panelW / 2, y - panelH / 2, panelW, panelH, 18);
      panel.lineStyle(4, !intro && snapshot.timeRatio < 0.3 ? 0xffd66e : 0x45f7e4, 0.92);
      panel.strokeRoundedRect(x - panelW / 2, y - panelH / 2, panelW, panelH, 18);
      this.layers.hud.add(panel);

      const displayKey = intro ? String(Math.max(1, Math.ceil((snapshot.introRemaining || 0) / 1000))) : formatKey(snapshot.currentTarget);
      const key = this.add.text(x, y - panelH * 0.18, displayKey, textStyle(snapshot, {
        fontFamily: MONO_FONT,
        fontSize: `${Math.round(panelH * 0.42)}px`,
        color: "#fff2bd",
        fontStyle: "900"
      })).setOrigin(0.5);
      this.layers.hud.add(key);

      const code = intro ? "READY / 防线接入" : `ROUND ${round.roundIndex + 1} / ${round.roundTotal}`;
      const label = this.add.text(x - panelW * 0.39, y - panelH * 0.34, code, textStyle(snapshot, {
        fontFamily: MONO_FONT,
        fontSize: "17px",
        color: intro || threat?.type === "anchor" ? "#62ff9d" : "#45f7e4",
        fontStyle: "900"
      })).setOrigin(0, 0.5);
      this.layers.hud.add(label);

      const stepText = intro ? "观察第一串，倒数结束后按亮起键" : `${round.rhythmLabel || "巡航"} · 第 ${round.step + 1}/${round.size || 1} 键`;
      const statusText = this.add.text(x + panelW * 0.39, y - panelH * 0.34, stepText, textStyle(snapshot, {
        fontSize: "15px",
        color: intro ? "#b8ffd5" : "#ffd66e",
        fontStyle: "900"
      })).setOrigin(1, 0.5);
      this.layers.hud.add(statusText);

      this.drawRoundKeys(x, y + panelH * 0.12, round, snapshot, intro, panelW);

      const hint = intro
        ? "这一轮是一串键，不是单个反应点"
        : `${guide ? `${guide.hand}${guide.finger}` : "当前手指"} ${formatKey(threat?.key || "")} / ${threat?.laneLabel || "防线"}`;
      const hintNode = this.add.text(x, y + panelH * 0.32, hint, textStyle(snapshot, {
        fontSize: "17px",
        color: "#bdeeff",
        fontStyle: "700"
      })).setOrigin(0.5);
      this.layers.hud.add(hintNode);

      this.countdownRing = this.add.graphics();
      this.layers.hud.add(this.countdownRing);
      this.updateHudCountdown();
    }

    drawRoundKeys(x, y, round, snapshot, intro = false, panelW = 560) {
      const keys = round.keys?.length ? round.keys : [];
      if (!keys.length) return;
      const gap = keys.length >= 10 ? 5 : 8;
      const availableW = Math.min(panelW * 0.86, snapshot.width * 0.58);
      const chipW = clamp((availableW - Math.max(0, keys.length - 1) * gap) / keys.length, 26, 46);
      const chipH = clamp(snapshot.height * 0.046, 28, 40);
      const totalW = keys.length * chipW + Math.max(0, keys.length - 1) * gap;
      const startX = x - totalW / 2;
      keys.forEach((key, index) => {
        const chipX = startX + index * (chipW + gap);
        const completed = !intro && index < round.step;
        const active = !intro && index === round.step;
        const g = this.add.graphics();
        g.fillStyle(active ? 0xffd66e : completed ? 0x19d57a : 0x071820, active || completed ? 0.96 : 0.72);
        g.fillRoundedRect(chipX, y - chipH / 2, chipW, chipH, 5);
        g.lineStyle(2, active ? 0xfff2bd : completed ? 0x62ff9d : 0x45f7e4, active ? 1 : completed ? 0.72 : 0.42);
        g.strokeRoundedRect(chipX, y - chipH / 2, chipW, chipH, 5);
        this.layers.hud.add(g);
        const text = this.add.text(chipX + chipW / 2, y, formatKey(key), textStyle(snapshot, {
          fontFamily: MONO_FONT,
          fontSize: active ? `${chipW >= 32 ? 22 : 18}px` : `${chipW >= 32 ? 18 : 15}px`,
          color: active ? "#07100f" : completed ? "#052015" : "#bdeeff",
          fontStyle: "900"
        })).setOrigin(0.5);
        this.layers.hud.add(text);
      });
    }

    updateHudCountdown() {
      if (!this.countdownRing || !this.snapshot) return;
      const snapshot = this.snapshot;
      const x = snapshot.width * 0.5;
      const panelH = clamp(snapshot.height * 0.22, 150, 190);
      const y = snapshot.height * 0.2;
      const panelW = clamp(snapshot.width * 0.42, 430, 660);
      const ratio = snapshot.introActive ? clamp((snapshot.introRemaining || 0) / 3200, 0, 1) : clamp(snapshot.timeRatio || 0, 0, 1);
      const barW = panelW * 0.72;
      const barH = 8;
      const barX = x - barW / 2;
      const barY = y + panelH * 0.5 - 22;
      const color = !snapshot.introActive && ratio < 0.28 ? 0xff625c : ratio < 0.48 ? 0xffd66e : 0x62ff9d;
      this.countdownRing.clear();
      this.countdownRing.fillStyle(0x0b2528, 0.92);
      this.countdownRing.fillRoundedRect(barX, barY, barW, barH, 4);
      this.countdownRing.fillStyle(color, 0.96);
      this.countdownRing.fillRoundedRect(barX, barY, Math.max(6, barW * ratio), barH, 4);
      this.countdownRing.lineStyle(1, color, 0.5);
      this.countdownRing.strokeRoundedRect(barX, barY, barW, barH, 4);
    }

    drawReadouts() {
      const snapshot = this.snapshot;
      const { width, height } = snapshot;
      if (this.readoutLayer) this.readoutLayer.destroy(true);
      this.readoutLayer = this.add.container(0, 0).setDepth(210);
      this.layers.hud.add(this.readoutLayer);
      const items = [
        { label: "拦截", value: `${snapshot.cruiseIntercepts}/${snapshot.targetActions}`, x: width * 0.07, y: height * 0.9 },
        { label: "超时", value: snapshot.cruiseTimeouts, x: width * 0.23, y: height * 0.9 },
        { label: "护盾", value: `${snapshot.shield}%`, x: width * 0.75, y: height * 0.9 },
        { label: "污染", value: `${Math.round(snapshot.corruption * 100)}%`, x: width * 0.88, y: height * 0.9 }
      ];
      items.forEach((item) => {
        const text = this.add.text(item.x, item.y, `${item.label} ${item.value}`, textStyle(snapshot, {
          fontFamily: MONO_FONT,
          fontSize: "15px",
          color: item.label === "超时" && item.value ? "#ffd66e" : "#bdeeff",
          fontStyle: "800"
        })).setOrigin(0.5);
        this.readoutLayer.add(text);
      });
    }

    drawOverlayState() {
      const snapshot = this.snapshot;
      this.layers.overlay.removeAll(true);
    }

    applyCruiseEvent(event) {
      if (!event || event.id <= this.lastEventId || !this.snapshot) return;
      this.lastEventId = event.id;
      const threat = event.detail?.threat || this.snapshot.threat;
      if (event.type === "threat-spawn") {
        this.spawnThreat(threat);
        return;
      }
      if (event.type === "round-shift") {
        this.roundShift(event.detail?.round, threat);
        return;
      }
      if (event.type === "threat-close") {
        this.closeWarning(threat);
        return;
      }
      if (event.type === "intercept" || event.type === "anchor-pulse") {
        this.counterFire(threat, event.type === "anchor-pulse");
        return;
      }
      if (event.type === "wrong-key") {
        this.wrongSpark(threat);
        return;
      }
      if (event.type === "timeout-hit" || event.type === "shield-break") {
        this.timeoutImpact(threat);
        return;
      }
      if (event.type === "drift-error") {
        this.driftHit();
        return;
      }
      if (event.type === "wave-clear" || event.type === "mission-clear") {
        this.clearSweep(event.type === "mission-clear");
      }
    }

    roundShift(round, threat) {
      this.attackWave?.build(this.snapshot, true);
      this.shieldController?.recover(true);
      if (!this.snapshot.reducedMotion) {
        this.cameras.main.shake(60, 0.0018);
      }
    }

    closeWarning(threat) {
      const snapshot = this.snapshot;
      this.attackWave?.pounce(threat);
      if (!snapshot.reducedMotion) {
        this.cameras.main.shake(96, 0.0032);
      }
    }

    counterFire(threat, anchor = false) {
      if (this.attackWave || this.k01Controller) {
        const target = this.attackWave?.intercept(threat, anchor);
        this.k01Controller?.counterFire(threat, anchor, target);
        this.shieldController?.recover(anchor);
        return;
      }
      const snapshot = this.snapshot;
      const robot = robotPoint(snapshot);
      const target = this.threatSprite ? { x: this.threatSprite.x, y: this.threatSprite.y } : lanePoint(snapshot, threat?.lane);
      const overdrive = threat?.rhythmId === "overdrive";
      const color = anchor ? 0x62ff9d : overdrive ? 0xff8f70 : 0xffd66e;
      this.emitInterceptor(
        { x: robot.x, y: robot.y - snapshot.height * 0.04 },
        target,
        color,
        overdrive ? 1.18 : anchor ? 0.9 : 1
      );
      this.pulseAt(target.x, target.y, color, 0.44, 360);
      if (this.threatSprite && !anchor) {
        this.tweens.add({ targets: this.threatSprite, alpha: 0, scaleX: 1.28, scaleY: 1.28, duration: 220, ease: "Cubic.easeOut" });
      }
    }

    wrongSpark(threat) {
      if (this.attackWave || this.shieldController) {
        this.attackWave?.wrongRush(threat);
        this.shieldController?.wrong(threat);
        return;
      }
      const snapshot = this.snapshot;
      const point = this.threatSprite ? { x: this.threatSprite.x, y: this.threatSprite.y } : lanePoint(snapshot, threat?.lane);
      this.pulseAt(point.x, point.y, 0xff625c, 0.48, 360);
      if (this.threatSprite && !snapshot.reducedMotion) {
        this.tweens.add({ targets: this.threatSprite, x: this.threatSprite.x + (point.x < snapshot.width / 2 ? 28 : -28), duration: 90, yoyo: true, repeat: 2 });
      }
      this.cameras.main.shake(120, 0.006);
    }

    timeoutImpact(threat) {
      if (this.attackWave || this.shieldController) {
        const point = this.attackWave?.impact(threat) || shieldPoint(this.snapshot, threat?.lane);
        this.shieldController?.impact(threat);
        this.pulseAt(point.x, point.y, 0xff625c, 0.42, 170);
        return;
      }
      const snapshot = this.snapshot;
      const robot = robotPoint(snapshot);
      this.pulseAt(robot.x, robot.y, 0xff625c, 0.5, 420);
      this.cameras.main.shake(170, 0.01);
      if (this.threatSprite && !snapshot.reducedMotion) {
        this.tweens.add({ targets: this.threatSprite, x: robot.x, y: robot.y, alpha: 0, scaleX: 0.6, scaleY: 0.6, duration: 170, ease: "Cubic.easeIn" });
      }
    }

    driftHit() {
      const snapshot = this.snapshot;
      this.shieldController?.drift();
      const robot = robotPoint(snapshot);
      const g = this.add.graphics().setDepth(410);
      for (let i = 0; i < 14; i += 1) {
        const angle = (Math.PI * 2 * i) / 14;
        const distance = 18 + (i % 4) * 9;
        g.fillStyle(i % 2 ? 0xff625c : 0xffd66e, 0.18);
        g.fillEllipse(
          robot.x + Math.cos(angle) * distance - 20,
          robot.y + Math.sin(angle) * distance,
          12 + (i % 3) * 5,
          4 + (i % 2) * 3
        );
      }
      this.layers.vfx.add(g);
      this.cameras.main.shake(180, 0.012);
      this.tweens.add({ targets: g, alpha: 0, duration: 180, ease: "Cubic.easeOut", onComplete: () => g.destroy() });
    }

    clearSweep(mission = false) {
      this.attackWave?.clearWave();
      this.shieldController?.waveClear(mission);
    }

    emitInterceptor(from, to, color, strength = 1) {
      const group = this.add.container(0, 0).setDepth(178);
      const angle = angleBetween(from, to);
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const travel = clamp(distance / 8, 80, 145);
      const head = this.add.ellipse(from.x, from.y, 22 * strength, 10 * strength, color, 0.92);
      const core = this.add.circle(from.x, from.y, 4.5 * strength, 0xfff2bd, 0.92);
      head.setRotation(angle);
      group.add([head, core]);
      for (let i = 0; i < 4; i += 1) {
        const ember = this.add.circle(from.x, from.y, 3 + i, color, 0.26);
        group.add(ember);
        this.tweens.add({
          targets: ember,
          x: from.x - Math.cos(angle) * (16 + i * 11),
          y: from.y - Math.sin(angle) * (16 + i * 11) + (i % 2 ? 5 : -5),
          alpha: 0,
          scaleX: 0.4,
          scaleY: 0.4,
          duration: travel + i * 18,
          ease: "Cubic.easeOut"
        });
      }
      this.layers.vfx.add(group);
      this.tweens.add({ targets: [head, core], x: to.x, y: to.y, duration: travel, ease: "Cubic.easeIn" });
      this.tweens.add({ targets: group, alpha: 0, duration: 120, delay: travel - 20, ease: "Cubic.easeOut", onComplete: () => group.destroy(true) });
    }

    pulseAt(x, y, color, alpha = 0.32, duration = 320) {
      const group = this.add.container(0, 0).setDepth(180);
      const center = this.add.circle(x, y, 10, color, Math.min(0.38, alpha));
      group.add(center);
      const count = 9;
      for (let i = 0; i < count; i += 1) {
        const angle = (Math.PI * 2 * i) / count;
        const dot = this.add.circle(x, y, 3 + (i % 3), i % 2 ? color : 0xfff2bd, Math.min(0.72, alpha + 0.2));
        group.add(dot);
        this.tweens.add({
          targets: dot,
          x: x + Math.cos(angle) * (18 + (i % 4) * 6),
          y: y + Math.sin(angle) * (14 + (i % 5) * 5),
          alpha: 0,
          scaleX: 0.4,
          scaleY: 0.4,
          duration: Math.min(duration, 190),
          ease: "Cubic.easeOut"
        });
      }
      this.layers.vfx.add(group);
      this.tweens.add({ targets: center, alpha: 0, scaleX: 1.8, scaleY: 1.8, duration: Math.min(duration, 160), ease: "Cubic.easeOut" });
      this.tweens.add({ targets: group, alpha: 0, duration: Math.min(duration, 210), ease: "Cubic.easeOut", onComplete: () => group.destroy(true) });
    }

    getDebugState() {
      return {
        wave: this.attackWave?.debugState?.() || null,
        shieldDamage: this.shieldController?.damageScore || 0,
        activeThreatId: this.snapshot?.activeThreatId || "",
        roundSize: this.snapshot?.roundInfo?.size || 0,
        introActive: Boolean(this.snapshot?.introActive),
        canvasCount: document.querySelectorAll("canvas").length
      };
    }
  }

  window.CruiseDefenseScene = CruiseDefenseScene;
})();
