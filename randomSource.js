(function () {
  function hashSeed(value) {
    const text = String(value || "key-pilot");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createMulberry32(seed) {
    let value = seed >>> 0;
    return function next() {
      value += 0x6d2b79f5;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createRandomSource(options = {}) {
    const storage = options.storage || window.localStorage;
    const storageKey = options.storageKey || "key-pilot-random-seed-v1";
    const params = options.params || new URLSearchParams(window.location.search);
    const explicitSeed = params.get("seed");
    const baseSeed = explicitSeed || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    storage?.setItem(storageKey, String(baseSeed));

    let currentSeed = hashSeed(baseSeed);
    let nextRandom = createMulberry32(currentSeed);
    let runLabel = "boot";

    function reseed(label = "run") {
      runLabel = String(label);
      currentSeed = hashSeed(`${baseSeed}:${runLabel}`);
      nextRandom = createMulberry32(currentSeed);
      return currentSeed;
    }

    function random() {
      return nextRandom();
    }

    function pick(list) {
      if (!list?.length) return undefined;
      return list[Math.floor(random() * list.length)];
    }

    function shuffle(list) {
      const copy = list.slice();
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
      }
      return copy;
    }

    function getDebugState() {
      return {
        baseSeed: String(baseSeed),
        currentSeed,
        runLabel
      };
    }

    return {
      random,
      pick,
      shuffle,
      reseed,
      getDebugState
    };
  }

  window.KeyPilotRandomSource = { createRandomSource };
})();
