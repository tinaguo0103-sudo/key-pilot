(function () {
  function createHomeRules(options) {
    const homeKeys = options.homeKeys || [];
    const makeShuffledRun = options.makeShuffledRun;

    function makeHomeQueue(level) {
      if (level.mode !== "home") return [];
      let previousKey = "";
      return level.segments.flatMap((segment) => {
        const segmentQueue = makeShuffledRun(segment, segment.length, (key) => key, previousKey);
        previousKey = segmentQueue[segmentQueue.length - 1] || previousKey;
        return segmentQueue;
      });
    }

    function generateHomeTargets(level) {
      return makeHomeQueue(level);
    }

    function nextHomeTarget(currentState) {
      if (!currentState.homeQueue?.length || currentState.targetIndex >= currentState.homeQueue.length) {
        currentState.homeQueue = generateHomeTargets(currentState.level);
        currentState.targetIndex = 0;
      }
      const sequence = currentState.homeQueue?.length ? currentState.homeQueue : homeKeys;
      const nextIndex = currentState.targetIndex % sequence.length;
      currentState.currentTarget = sequence[nextIndex];
      currentState.targetIndex += 1;
      return currentState.currentTarget;
    }

    return {
      makeHomeQueue,
      generateHomeTargets,
      nextHomeTarget
    };
  }

  window.KeyPilotHomeRules = { createHomeRules };
})();
