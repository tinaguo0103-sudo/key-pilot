(function () {
  function createSceneSnapshots(options) {
    const clamp = options.clamp;
    const getState = options.getState;
    const getWaveProgress = options.getWaveProgress;
    const getStrikeEncounter = options.getStrikeEncounter;
    const getCurrentPattern = options.getCurrentPattern;
    const getStrikeRoomTheme = options.getStrikeRoomTheme;
    const getCurrentFingerGuide = options.getCurrentFingerGuide;
    const getCurrentCruiseThreat = options.getCurrentCruiseThreat;
    const getCruiseThreatTimeRatio = options.getCruiseThreatTimeRatio;
    const getCruiseThreatProgress = options.getCruiseThreatProgress;
    const getCruiseIntroRemaining = options.getCruiseIntroRemaining;
    const getCruiseRoundInfo = options.getCruiseRoundInfo;
    const getCruiseRoundThreats = options.getCruiseRoundThreats;
    const isCruiseIntroActive = options.isCruiseIntroActive;
    const fingerGuideById = options.fingerGuideById || {};
    const strikeRoomThemes = options.strikeRoomThemes || [];

    function reducedMotion() {
      return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
    }

    function getAssetManifest() {
      return window.KeyPilotAssets || {};
    }

    function getSceneBackground(sceneId) {
      return getAssetManifest().scenes?.[sceneId]?.background || "";
    }

    function getK01ConceptImage() {
      const k01 = getAssetManifest().characters?.k01 || {};
      return k01.preview || "";
    }

    function getMonsterPreviewImage(nameOrId = "driftZombie") {
      const monsters = getAssetManifest().monsters || {};
      let id = nameOrId;
      if (!monsters[id]) {
        const name = String(nameOrId);
        if (name.includes("铁") || name.includes("装甲")) id = "ironWalker";
        else if (name.includes("分裂") || name.includes("残影")) id = "splitPhantom";
        else if (name.includes("突进") || name.includes("爬行")) id = "rushCrawler";
        else if (name.includes("核心") || name.includes("Boss")) id = "oldCoordinateCore";
        else id = "driftZombie";
      }
      const monster = monsters[id] || monsters.driftZombie || {};
      return monster.preview || "";
    }

    function getHomePhaserPalette() {
      return {
        bg: "#071018",
        wall: 0x0b1f2a,
        floor: 0x102c36,
        accent: 0x45f7e4,
        accentSoft: 0x79e8ff,
        secondary: 0xffd66e,
        danger: 0xff625c,
        green: 0x62ff9d,
        fog: 0x123845,
        label: "#bdeeff"
      };
    }

    function getCruisePhaserPalette() {
      return {
        bg: "#04090d",
        accent: 0x45f7e4,
        accentSoft: 0x9defff,
        secondary: 0xffd66e,
        danger: 0xff625c,
        green: 0x62ff9d,
        fog: 0x0b2528,
        label: "#bdeeff"
      };
    }

    function getStrikePhaserPalette(roomId) {
      const palettes = {
        gate: {
          bg: "#061018",
          wall: 0x0b2530,
          floor: 0x102f36,
          accent: 0x45f7e4,
          accentSoft: 0x79e8ff,
          secondary: 0xffd66e,
          danger: 0xff625c,
          fog: 0x123845,
          label: "#9bdce7"
        },
        pipe: {
          bg: "#07120d",
          wall: 0x102819,
          floor: 0x153526,
          accent: 0x62ff9d,
          accentSoft: 0x9bffd1,
          secondary: 0xffd66e,
          danger: 0xff625c,
          fog: 0x163d2b,
          label: "#b5ffd7"
        },
        nest: {
          bg: "#16080d",
          wall: 0x31131b,
          floor: 0x2b1a19,
          accent: 0xff9d45,
          accentSoft: 0xffd66e,
          secondary: 0x45f7e4,
          danger: 0xff625c,
          fog: 0x4b1922,
          label: "#ffd2a8"
        },
        blackout: {
          bg: "#02060c",
          wall: 0x111a2b,
          floor: 0x141f2a,
          accent: 0x8ea7ff,
          accentSoft: 0xd9e3ff,
          secondary: 0xffd66e,
          danger: 0xff625c,
          fog: 0x0a1220,
          label: "#d6e2ff"
        },
        core: {
          bg: "#100711",
          wall: 0x24102b,
          floor: 0x24151d,
          accent: 0xff625c,
          accentSoft: 0xffd66e,
          secondary: 0x8ea7ff,
          danger: 0xff625c,
          fog: 0x3a1328,
          label: "#ffc7c3"
        }
      };
      return palettes[roomId] || palettes.gate;
    }

    function getHomeSceneSnapshot(width, height, pixelRatio = 1) {
      const state = getState();
      const wave = getWaveProgress();
      return {
        width,
        height,
        pixelRatio,
        wave,
        levelWaveCount: state.level.waves.length,
        palette: getHomePhaserPalette(),
        event: state.sceneEvent || "idle",
        status: state.status,
        currentTarget: state.currentTarget,
        leftLocked: state.leftLocked,
        rightLocked: state.rightLocked,
        chargedKeys: { ...state.chargedKeys },
        completedTargets: state.completedTargets,
        targetCount: state.level.targetCount,
        corruption: clamp(state.corruption / 100, 0, 1),
        driftCount: state.homeDriftCount,
        combo: state.combo,
        breaches: 0,
        reducedMotion: reducedMotion()
      };
    }

    function getStrikeSceneSnapshot(width, height, pixelRatio = 1) {
      const state = getState();
      const transition = state.roomTransition;
      const encounter = transition?.toEncounter || getStrikeEncounter();
      const missionClearing = Boolean(state.missionClearing);
      const pattern = transition?.toEncounter?.pattern || getCurrentPattern();
      const wave = getWaveProgress();
      const room = getStrikeRoomTheme(encounter.roomId || encounter.waveIndex || 0);
      const fingerGuide = getCurrentFingerGuide();
      return {
        width,
        height,
        pixelRatio,
        pattern,
        encounter,
        fingerGuide,
        missionClearing,
        wave,
        levelWaveCount: strikeRoomThemes.length,
        room,
        roomTransition: transition ? {
          fromRoomId: transition.fromRoomId,
          toRoomId: transition.toRoomId,
          startedAt: transition.startedAt,
          durationMs: transition.durationMs,
          progress: clamp((Date.now() - transition.startedAt) / transition.durationMs, 0, 1)
        } : null,
        roomsCleared: state.roomsCleared || 0,
        bossCleared: Boolean(state.bossCleared),
        roomProgress: {
          index: encounter.roomIndex || 0,
          localIndex: encounter.roomLocalIndex || 0,
          total: encounter.roomTotal || 1,
          roomCount: encounter.totalRooms || strikeRoomThemes.length
        },
        palette: getStrikePhaserPalette(room.id),
        event: state.sceneEvent || "idle",
        sceneNonce: state.sceneNonce,
        pathStep: missionClearing ? pattern.length : transition ? 0 : state.pathStep,
        currentTarget: missionClearing ? "" : transition?.toEncounter?.pattern?.[0] || state.currentTarget,
        pressure: clamp(state.monsterPressure / 100, 0, 1.2),
        corruption: clamp(state.corruption / 100, 0, 1),
        breaches: state.breaches,
        hull: state.hull,
        shield: state.shield,
        energy: state.energy,
        combo: state.combo,
        monstersCleared: state.monstersCleared,
        completedActions: state.completedActions,
        targetActions: state.level.targetActions,
        reducedMotion: reducedMotion()
      };
    }

    function getCruiseSceneSnapshot(width, height, pixelRatio = 1) {
      const state = getState();
      const threat = getCurrentCruiseThreat();
      const guide = threat ? fingerGuideById[threat.guideId] : null;
      const wave = getWaveProgress();
      const timeRatio = getCruiseThreatTimeRatio();
      const progress = getCruiseThreatProgress();
      const introRemaining = getCruiseIntroRemaining();
      const introTotal = Math.max(1, (state.cruiseIntroUntil || 0) - (state.cruiseIntroStartedAt || state.startedAt || Date.now()));
      const roundInfo = getCruiseRoundInfo();
      const roundThreats = getCruiseRoundThreats();
      const shieldDamage = clamp(
        ((100 - state.shield) / 100) * 0.5
          + ((100 - state.hull) / 100) * 0.32
          + (state.cruiseTimeouts || 0) * 0.025
          + (state.breaches || 0) * 0.08,
        0,
        1
      );
      return {
        width,
        height,
        pixelRatio,
        threat,
        fingerGuide: guide,
        wave,
        levelWaveCount: state.level.waves.length,
        room: { id: "cruise", name: "巡航防线舱" },
        palette: getCruisePhaserPalette(),
        event: state.sceneEvent || "idle",
        sceneNonce: state.sceneNonce,
        currentTarget: state.currentTarget,
        introActive: isCruiseIntroActive(),
        introRemaining,
        introProgress: introRemaining ? clamp(1 - introRemaining / introTotal, 0, 1) : 1,
        roundInfo,
        roundThreats,
        activeRoundStep: threat?.roundStep || 0,
        activeThreatId: threat?.id || "",
        timeRatio,
        threatProgress: progress,
        threatStartedAt: state.threatStartedAt,
        threatDeadlineAt: state.threatDeadlineAt,
        completedActions: state.completedActions,
        targetActions: state.level.targetActions,
        cruiseIntercepts: state.cruiseIntercepts,
        cruiseTimeouts: state.cruiseTimeouts,
        cruiseMisses: state.cruiseMisses,
        cruiseWaveClears: state.cruiseWaveClears,
        corruption: clamp(state.corruption / 100, 0, 1),
        shieldDamage,
        breaches: state.breaches,
        hull: state.hull,
        shield: state.shield,
        energy: state.energy,
        combo: state.combo,
        reducedMotion: reducedMotion()
      };
    }

    return {
      getAssetManifest,
      getSceneBackground,
      getK01ConceptImage,
      getMonsterPreviewImage,
      getHomePhaserPalette,
      getStrikePhaserPalette,
      getCruisePhaserPalette,
      getHomeSceneSnapshot,
      getStrikeSceneSnapshot,
      getCruiseSceneSnapshot
    };
  }

  window.KeyPilotSceneSnapshots = { createSceneSnapshots };
})();
