(function () {
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function createCruiseRules(options) {
    const keyboardRows = options.keyboardRows || [];
    const fingerGroups = options.fingerGroups || [];
    const targetCount = options.targetCount || 0;
    const waveDeadlines = options.waveDeadlines || [];
    const roundSizes = options.roundSizes || [];
    const roundRhythms = options.roundRhythms || [];
    const threatTypes = options.threatTypes || [];
    const lanes = options.lanes || [];
    const fingerWeights = options.fingerWeights || {};
    const makeBalancedSideOrder = options.makeBalancedSideOrder;
    const now = options.now || (() => Date.now());

    function getKeyRowIndex(key) {
      const rowIndex = keyboardRows.findIndex((row) => row.includes(key));
      return rowIndex < 0 ? 1 : rowIndex;
    }

    function getCruiseWaveIndex(index, level) {
      let accumulated = 0;
      for (let waveIndex = 0; waveIndex < level.waves.length; waveIndex += 1) {
        accumulated += level.waves[waveIndex].count;
        if (index < accumulated) return waveIndex;
      }
      return level.waves.length - 1;
    }

    function getCruiseLane(threatIndex, guide, rowIndex) {
      const preferredSide = guide.side === "left" ? "left" : "right";
      const matching = lanes.filter((lane) => lane.side === preferredSide);
      const lanePool = rowIndex === 0
        ? [...matching, lanes.find((lane) => lane.id === "top")]
        : rowIndex === 2
          ? [...matching, lanes.find((lane) => lane.id === "bottom")]
          : matching;
      const filtered = lanePool.filter(Boolean);
      return filtered[threatIndex % filtered.length] || lanes[threatIndex % lanes.length];
    }

    function getCruiseDeadline(level, waveIndex, threatIndex) {
      const wave = level.waves[waveIndex] || level.waves[level.waves.length - 1];
      const base = wave?.deadlineMs || waveDeadlines[waveIndex] || 1600;
      const jitter = ((threatIndex * 73) % 260) - 130;
      return clamp(base + jitter, 2200, 4200);
    }

    function decorateCruiseRounds(queue) {
      let index = 0;
      let roundIndex = 0;
      while (index < queue.length) {
        const desiredSize = roundSizes[roundIndex % roundSizes.length];
        const remaining = queue.length - index;
        const size = remaining <= desiredSize + 2 ? remaining : desiredSize;
        const roundKeys = queue.slice(index, index + size).map((threat) => threat.key);
        const rhythm = roundIndex < 3
          ? roundRhythms[0]
          : roundIndex < 6
            ? roundRhythms[1]
            : roundIndex < 8
              ? roundRhythms[2]
              : roundRhythms[3];
        for (let offset = 0; offset < size; offset += 1) {
          const threat = queue[index + offset];
          threat.deadlineMs = Math.round(clamp(threat.deadlineMs * rhythm.deadlineScale - offset * 18, 1900, 4300));
          Object.assign(queue[index + offset], {
            roundIndex,
            roundStep: offset,
            roundSize: size,
            roundKeys: [...roundKeys],
            rhythmId: rhythm.id,
            rhythmLabel: rhythm.label,
            rhythmLaneDrift: rhythm.laneDrift
          });
        }
        index += size;
        roundIndex += 1;
      }
      return queue;
    }

    function weightedCruiseGuide(pool, stats, sideCounts, index, total) {
      const remaining = Math.max(1, total - index);
      const missingGuides = pool.filter((guide) => !stats[guide.id]);
      if (missingGuides.length >= remaining) return missingGuides[0];

      const recent = stats.__recent || [];
      const candidates = pool.filter((guide) => {
        const sameFingerRun = recent.slice(-2).every((item) => item?.guideId === guide.id);
        const sameSideRun = recent.slice(-2).every((item) => item?.side === guide.side);
        if (sameFingerRun || sameSideRun) return false;
        const nextSideRatio = (sideCounts[guide.side] + 1) / (index + 1);
        return nextSideRatio <= 0.58;
      });
      const safePool = candidates.length ? candidates : pool;
      const scored = safePool.map((guide) => {
        const count = stats[guide.id] || 0;
        const sidePenalty = sideCounts[guide.side] > sideCounts[guide.side === "left" ? "right" : "left"] ? 0.72 : 1;
        return {
          guide,
          score: (fingerWeights[guide.id] || 1) * sidePenalty / (1 + count * 0.55)
        };
      });
      const totalScore = scored.reduce((sum, item) => sum + item.score, 0);
      let roll = Math.random() * totalScore;
      for (const item of scored) {
        roll -= item.score;
        if (roll <= 0) return item.guide;
      }
      return scored[scored.length - 1]?.guide || pool[0];
    }

    function pickCruiseKey(guide, previousThreats, threatIndex) {
      const lastRows = previousThreats.slice(-2).map((threat) => threat.row);
      const candidates = guide.keys.filter((key) => {
        const sameKey = previousThreats.slice(-2).some((threat) => threat.key === key);
        const sameRowRun = lastRows.length === 2 && lastRows.every((row) => row === getKeyRowIndex(key));
        return !sameKey && !sameRowRun;
      });
      const pool = candidates.length ? candidates : guide.keys;
      if (threatIndex > 0 && threatIndex % 4 === 0 && guide.home) return guide.home;
      return pool[threatIndex % pool.length];
    }

    function makeCruiseQueue(level) {
      if (level.mode !== "cruise") return [];
      const total = level.targetActions || targetCount;
      const queue = [];
      const stats = { __recent: [] };
      const sideCounts = { left: 0, right: 0 };
      const guides = fingerGroups.filter((guide) => guide.keys?.length);
      const sideOrder = makeBalancedSideOrder(total);

      for (let index = 0; index < total; index += 1) {
        const side = sideOrder[index] || (index % 2 ? "right" : "left");
        const sideGuides = guides.filter((guide) => guide.side === side);
        const guide = weightedCruiseGuide(sideGuides.length ? sideGuides : guides, stats, sideCounts, index, total);
        const key = pickCruiseKey(guide, queue, index);
        const row = getKeyRowIndex(key);
        const waveIndex = getCruiseWaveIndex(index, level);
        const lane = getCruiseLane(index, guide, row);
        const homePulse = key === guide.home;
        const type = threatTypes[(index + row + waveIndex + (homePulse ? 1 : 0)) % threatTypes.length];
        const threat = {
          id: `cruise-${index + 1}`,
          key,
          guideId: guide.id,
          side: guide.side,
          hand: guide.hand,
          finger: guide.finger,
          row,
          lane: lane.id,
          laneLabel: lane.label,
          type,
          homePulse,
          waveIndex,
          waveName: level.waves[waveIndex]?.name || "巡航防线",
          deadlineMs: getCruiseDeadline(level, waveIndex, index)
        };
        queue.push(threat);
        stats[guide.id] = (stats[guide.id] || 0) + 1;
        sideCounts[guide.side] += 1;
        stats.__recent = [...stats.__recent, threat].slice(-3);
      }

      return decorateCruiseRounds(queue);
    }

    function getCurrentCruiseThreat(currentState) {
      if (!currentState || currentState.level.mode !== "cruise") return null;
      return currentState.cruiseQueue?.[currentState.threatIndex] || null;
    }

    function getCruiseThreatTimeRatio(currentState) {
      const threat = getCurrentCruiseThreat(currentState);
      if (!currentState || !threat) return 1;
      if (!currentState.threatStartedAt || !currentState.threatDeadlineAt) return 1;
      const duration = Math.max(1, currentState.threatDeadlineAt - currentState.threatStartedAt);
      return clamp((currentState.threatDeadlineAt - now()) / duration, 0, 1);
    }

    function getCruiseThreatProgress(currentState) {
      return 1 - getCruiseThreatTimeRatio(currentState);
    }

    function getCruiseRoundInfo(currentState) {
      if (!currentState || currentState.level.mode !== "cruise") return null;
      const threat = getCurrentCruiseThreat(currentState) || currentState.cruiseQueue?.[currentState.threatIndex] || currentState.cruiseQueue?.[0];
      if (!threat) return null;
      const roundIndex = threat.roundIndex || 0;
      const threats = currentState.cruiseQueue.filter((item) => (item.roundIndex || 0) === roundIndex);
      const rhythm = roundRhythms.find((item) => item.id === threat.rhythmId) || roundRhythms[0];
      return {
        roundIndex,
        roundTotal: Math.max(1, Math.max(...currentState.cruiseQueue.map((item) => item.roundIndex || 0)) + 1),
        step: threat.roundStep || 0,
        size: threat.roundSize || threats.length || 1,
        keys: threats.map((item) => item.key),
        completedInRound: threat.roundStep || 0,
        rhythmId: rhythm.id,
        rhythmLabel: rhythm.label
      };
    }

    function getCruiseRoundThreats(currentState) {
      if (!currentState || currentState.level.mode !== "cruise") return [];
      const threat = getCurrentCruiseThreat(currentState) || currentState.cruiseQueue?.[currentState.threatIndex] || currentState.cruiseQueue?.[0];
      if (!threat) return [];
      const roundIndex = threat.roundIndex || 0;
      return (currentState.cruiseQueue || [])
        .filter((item) => (item.roundIndex || 0) === roundIndex)
        .map((item) => ({ ...item }));
    }

    function getCruiseIntroRemaining(currentState) {
      if (!currentState || currentState.level.mode !== "cruise") return 0;
      return Math.max(0, (currentState.cruiseIntroUntil || 0) - now());
    }

    function isCruiseIntroActive(currentState) {
      return getCruiseIntroRemaining(currentState) > 0 && !currentState.threatStartedAt;
    }

    return {
      makeCruiseQueue,
      getKeyRowIndex,
      getCruiseWaveIndex,
      getCruiseLane,
      getCruiseDeadline,
      decorateCruiseRounds,
      weightedCruiseGuide,
      pickCruiseKey,
      getCurrentCruiseThreat,
      getCruiseThreatTimeRatio,
      getCruiseThreatProgress,
      getCruiseRoundInfo,
      getCruiseRoundThreats,
      getCruiseIntroRemaining,
      isCruiseIntroActive
    };
  }

  window.KeyPilotCruiseRules = { createCruiseRules };
})();
