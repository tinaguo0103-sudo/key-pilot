(function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createStrikeRules(options) {
    const fingerGroups = options.fingerGroups || [];
    const fingerGuideById = options.fingerGuideById || {};
    const calibrationDrills = options.calibrationDrills || [];
    const modifiers = options.modifiers || [];
    const combatRules = options.combatRules || {};
    const monsterVariants = options.monsterVariants || {};
    const roomThemes = options.roomThemes || [];
    const roomChain = options.roomChain || [];
    const shuffle = options.shuffle;
    const pick = options.pick;
    const random = options.random || Math.random;
    const makeShuffledRun = options.makeShuffledRun;
    const makeBalancedSideOrder = options.makeBalancedSideOrder;
    const getFingerGuideForKey = options.getFingerGuideForKey;
    const getPatternForAction = options.getPatternForAction;
    const getWaveProgress = options.getWaveProgress;

    function getAlternateStrikeTarget(pattern, wave, index) {
      const [home, target] = pattern;
      const options = wave.patterns
        .filter((item) => item[0] === home && item[1] !== target)
        .map((item) => item[1]);
      if (options.length) return options[index % options.length];

      const guide = getFingerGuideForKey(home) || getFingerGuideForKey(target);
      const guideOptions = (guide?.keys || [])
        .filter((key) => key !== guide.home && key !== target);
      if (!guideOptions.length) return target;
      return guideOptions[index % guideOptions.length];
    }

    function getStrikeAttackKeysForGuide(guide) {
      return (guide?.keys || []).filter((key) => key !== guide.home);
    }

    function makeEvenEntryOrder(entries) {
      const remaining = shuffle(entries);
      const ordered = [];
      let lastGuideId = "";

      while (remaining.length) {
        const candidates = remaining.filter((entry) => entry.guide.id !== lastGuideId);
        const pool = candidates.length ? candidates : remaining;
        const counts = remaining.reduce((map, entry) => {
          map[entry.guide.id] = (map[entry.guide.id] || 0) + 1;
          return map;
        }, {});
        const maxCount = Math.max(...pool.map((entry) => counts[entry.guide.id] || 0));
        const strongest = pool.filter((entry) => counts[entry.guide.id] === maxCount);
        const picked = pick(strongest);
        const index = remaining.indexOf(picked);
        remaining.splice(index, 1);
        ordered.push(picked);
        lastGuideId = picked.guide.id;
      }

      return ordered;
    }

    function makeSideStrikeEntries(sideGuides, count) {
      if (!sideGuides.length || count <= 0) return [];
      const baseCount = Math.floor(count / sideGuides.length);
      const extraCount = count % sideGuides.length;
      const extraGuideIds = new Set(shuffle(sideGuides).slice(0, extraCount).map((entry) => entry.guide.id));
      const entries = [];

      sideGuides.forEach((entry) => {
        const guideCount = baseCount + (extraGuideIds.has(entry.guide.id) ? 1 : 0);
        const pool = makeShuffledRun(entry.attackKeys, Math.max(entry.attackKeys.length, guideCount), (key) => key);
        for (let index = 0; index < guideCount; index += 1) {
          const target = pool[index % pool.length] || entry.attackKeys[index % entry.attackKeys.length];
          entries.push({ guide: entry.guide, target });
        }
      });

      return makeEvenEntryOrder(entries);
    }

    function makeBalancedStrikePatterns(totalCount) {
      const guides = fingerGroups
        .map((guide) => ({ guide, attackKeys: getStrikeAttackKeysForGuide(guide) }))
        .filter((entry) => entry.attackKeys.length);
      if (!guides.length || totalCount <= 0) return [];

      const sideOrder = makeBalancedSideOrder(totalCount);
      const sideCounts = sideOrder.reduce((map, side) => {
        map[side] = (map[side] || 0) + 1;
        return map;
      }, {});
      const sideQueues = {
        left: makeSideStrikeEntries(guides.filter((entry) => entry.guide.side === "left"), sideCounts.left || 0),
        right: makeSideStrikeEntries(guides.filter((entry) => entry.guide.side === "right"), sideCounts.right || 0)
      };

      return sideOrder.map((side) => {
        const entry = sideQueues[side].shift() || sideQueues.left.shift() || sideQueues.right.shift();
        return [entry.guide.home, entry.target, entry.guide.home];
      });
    }

    function makeCombatPattern(pattern, wave, index, modifier) {
      const [home, target] = pattern;
      if (!home || !target) return pattern;

      if (modifier.id === "shield") {
        return [home, target, home, target, home];
      }

      if (modifier.id === "split") {
        const alternate = getAlternateStrikeTarget(pattern, wave, index + 1);
        return [home, target, home, alternate, home];
      }

      return pattern;
    }

    function getEncounterRule(modifierOrEncounter) {
      const id = modifierOrEncounter?.modifier?.id || modifierOrEncounter?.id || "rush";
      return combatRules[id] || combatRules.rush;
    }

    function getEncounterRuleLabel(encounter) {
      return getEncounterRule(encounter).label;
    }

    function getEncounterRuleHint(encounter) {
      return encounter?.ruleHint || getEncounterRule(encounter).hint;
    }

    function getEncounterEntryPressure(encounter) {
      const rule = getEncounterRule(encounter);
      const routePressure = encounter?.pattern?.length > 3 ? 6 : 0;
      return rule.pressure + routePressure;
    }

    function isStrikeReturnStep(pattern, step) {
      return step > 0 && pattern[step] === pattern[0];
    }

    function getStrikeStepLabel(pattern, step) {
      if (step === 0) return "基地";
      if (isStrikeReturnStep(pattern, step)) return "收臂";
      return step > 1 ? "补击" : "命中";
    }

    function getVisibleStrikePadKeys(pattern, pathStep) {
      const home = pattern[0];
      const currentKey = pattern[pathStep] || home;
      const attackIndexes = pattern
        .map((key, index) => ({ key, index }))
        .filter((item) => item.index > 0 && item.key !== home);
      const nextAttack = attackIndexes.find((item) => item.index >= pathStep) || attackIndexes[attackIndexes.length - 1];
      const nextReturnIndex = pattern.findIndex((key, index) => index >= pathStep && index > 0 && key === home);
      const returnIndex = nextReturnIndex >= 0 ? nextReturnIndex : pattern.length - 1;

      return {
        base: home,
        attack: pathStep > 0 && currentKey !== home ? currentKey : nextAttack?.key || pattern[1] || home,
        returnHome: pattern[returnIndex] || home,
        attackActive: pathStep > 0 && currentKey !== home,
        returnActive: isStrikeReturnStep(pattern, pathStep)
      };
    }

    function getStrikeModifierById(id) {
      return modifiers.find((modifier) => modifier.id === id) || modifiers[0];
    }

    function getStrikeRoomThemeById(id) {
      return roomThemes.find((room) => room.id === id) || roomThemes[0];
    }

    function getStrikeRoomTheme(indexOrId = 0) {
      if (typeof indexOrId === "string") return getStrikeRoomThemeById(indexOrId);
      return roomThemes[indexOrId] || roomThemes[roomThemes.length - 1];
    }

    function makeStrikeRoomQueue() {
      const totalRooms = roomChain.length;
      const totalEncounters = roomChain.reduce((sum, room) => sum + room.patterns.length, 0);
      const balancedPatterns = makeBalancedStrikePatterns(totalEncounters);
      let patternIndex = 0;
      return roomChain.flatMap((roomConfig, roomIndex) => {
        const room = getStrikeRoomThemeById(roomConfig.id);
        const roomTotal = roomConfig.patterns.length;
        return roomConfig.patterns.map((pattern, roomLocalIndex) => {
          const basePattern = balancedPatterns[patternIndex] || pattern;
          patternIndex += 1;
          const modifierOffset = Math.floor(random() * roomConfig.modifiers.length);
          const laneOffset = Math.floor(random() * roomConfig.lanes.length);
          const spawnOffset = Math.floor(random() * roomConfig.spawnSides.length);
          const modifier = getStrikeModifierById(roomConfig.modifiers[(roomLocalIndex + modifierOffset) % roomConfig.modifiers.length] || roomConfig.modifiers[0]);
          const combatPattern = makeCombatPattern(basePattern, roomConfig, roomLocalIndex, modifier);
          const bossPhase = roomConfig.mechanic === "boss" ? roomLocalIndex + 1 : 0;
          return {
            pattern: combatPattern,
            basePattern,
            monster: roomConfig.monster,
            monsterId: roomConfig.monsterId,
            mechanic: roomConfig.mechanic,
            modifier,
            ruleLabel: getEncounterRule(modifier).label,
            ruleHint: getEncounterRule(modifier).hint,
            lane: roomConfig.lanes[(roomLocalIndex + laneOffset) % roomConfig.lanes.length] || "mid",
            spawnSide: roomConfig.spawnSides[(roomLocalIndex + spawnOffset) % roomConfig.spawnSides.length] || "right",
            bossPhase,
            roomId: room.id,
            roomName: room.name,
            roomIndex,
            roomLocalIndex,
            roomTotal,
            totalRooms,
            waveName: room.name,
            waveIndex: roomIndex
          };
        });
      });
    }

    function makeStrikeQueue(level) {
      if (level.mode !== "strike") return [];
      if (level.id === "level-02-strike") return makeStrikeRoomQueue();
      return level.waves.flatMap((wave, waveIndex) => {
        const patterns = makeShuffledRun(wave.patterns, wave.count, (pattern) => pattern.join("-"));
        const monsters = monsterVariants[wave.name] || [wave.monster || level.monster];
        const shuffledModifiers = shuffle(modifiers);
        return patterns.map((pattern, index) => {
          const monster = monsters[(index + Math.floor(random() * monsters.length)) % monsters.length];
          const modifier = shuffledModifiers[(index + waveIndex) % shuffledModifiers.length];
          const combatPattern = makeCombatPattern(pattern, wave, index, modifier);
          const lane = ["low", "mid", "high"][(index + waveIndex + Math.floor(random() * 3)) % 3];
          return {
            pattern: combatPattern,
            basePattern: pattern,
            monster,
            modifier,
            ruleLabel: getEncounterRule(modifier).label,
            ruleHint: getEncounterRule(modifier).hint,
            lane,
            waveName: wave.name,
            waveIndex
          };
        });
      });
    }

    function makeStrikeCalibrationQueue(level) {
      if (level.mode !== "strike") return [];
      return calibrationDrills.map((drill, index) => ({
        ...drill,
        index,
        guide: fingerGuideById[drill.guideId]
      })).filter((drill) => drill.guide);
    }

    function getCurrentCalibrationDrill(currentState) {
      if (!currentState || currentState.level.mode !== "strike") return null;
      return currentState.calibrationQueue?.[currentState.calibrationIndex] || null;
    }

    function getStrikeEncounter(currentState) {
      if (!currentState || currentState.level.mode !== "strike") return null;
      const queue = currentState.strikeQueue || [];
      if (queue.length && (
        currentState.missionClearing
          || currentState.completedActions >= queue.length
          || currentState.completedActions >= currentState.level.targetActions
      )) {
        return queue[clamp(currentState.completedActions, 0, queue.length - 1)];
      }
      const fallbackPattern = getPatternForAction(currentState.level, currentState.completedActions);
      const fallbackRoom = getStrikeRoomTheme(0);
      const fallbackWave = getWaveProgress(currentState);
      return queue[currentState.completedActions] || {
        pattern: fallbackPattern,
        basePattern: fallbackPattern,
        monster: currentState.level.monster,
        monsterId: "driftZombie",
        mechanic: "standard",
        modifier: modifiers[0],
        ruleLabel: getEncounterRule(modifiers[0]).label,
        ruleHint: getEncounterRule(modifiers[0]).hint,
        lane: "mid",
        waveName: fallbackWave?.name || "",
        waveIndex: fallbackWave?.index || 0,
        roomId: fallbackRoom.id,
        roomName: fallbackRoom.name,
        roomIndex: 0,
        roomLocalIndex: 0,
        roomTotal: 1,
        totalRooms: 1,
        spawnSide: "right",
        bossPhase: 0
      };
    }

    return {
      getAlternateStrikeTarget,
      getStrikeAttackKeysForGuide,
      makeEvenEntryOrder,
      makeSideStrikeEntries,
      makeBalancedStrikePatterns,
      makeCombatPattern,
      getEncounterRule,
      getEncounterRuleLabel,
      getEncounterRuleHint,
      getEncounterEntryPressure,
      isStrikeReturnStep,
      getStrikeStepLabel,
      getVisibleStrikePadKeys,
      getStrikeModifierById,
      getStrikeRoomThemeById,
      getStrikeRoomTheme,
      makeStrikeRoomQueue,
      makeStrikeQueue,
      makeStrikeCalibrationQueue,
      getCurrentCalibrationDrill,
      getStrikeEncounter
    };
  }

  window.KeyPilotStrikeRules = { createStrikeRules };
})();
