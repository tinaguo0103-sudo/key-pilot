(function () {
  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function createProgressStore(options) {
    const storage = options.storage;
    const storageKey = options.storageKey;
    const inventoryKey = options.inventoryKey;
    const levels = options.levels || [];

    function getLevelById(levelId) {
      return levels.find((item) => item.id === levelId) || levels[0] || null;
    }

    function getResults() {
      const parsed = safeParse(storage.getItem(storageKey), []);
      return Array.isArray(parsed) ? parsed : [];
    }

    function saveResult(result) {
      const results = [result, ...getResults()].slice(0, 20);
      storage.setItem(storageKey, JSON.stringify(results));
    }

    function saveInventory(inventory) {
      storage.setItem(inventoryKey, JSON.stringify(asRecord(inventory)));
    }

    function getInventory() {
      const stored = storage.getItem(inventoryKey);
      if (stored) return asRecord(safeParse(stored, {}));

      const migrated = {};
      getResults().forEach((result) => {
        (result.partsEarned || []).forEach((part) => {
          migrated[part] = (migrated[part] || 0) + 1;
        });
      });
      if (Object.keys(migrated).length) saveInventory(migrated);
      return migrated;
    }

    function addInventory(parts) {
      const inventory = getInventory();
      (parts || []).forEach((part) => {
        inventory[part] = (inventory[part] || 0) + 1;
      });
      saveInventory(inventory);
    }

    function getInventoryTotal() {
      return Object.values(getInventory()).reduce((sum, count) => sum + Number(count || 0), 0);
    }

    function getEquipmentCount(item, inventory) {
      return (item.sources || []).reduce((sum, source) => sum + Number((inventory || {})[source] || 0), 0);
    }

    function getBestFor(levelId) {
      const results = getResults().filter((item) => item.levelId === levelId);
      if (!results.length) return null;
      return results.slice().sort((a, b) => {
        const starDiff = Number(b.stars || 0) - Number(a.stars || 0);
        if (starDiff) return starDiff;
        return Number(b.accuracy || 0) - Number(a.accuracy || 0);
      })[0];
    }

    function isResultComplete(result) {
      if (!result) return false;
      if (typeof result.completed === "boolean") return result.completed;
      const level = getLevelById(result.levelId);
      if (!level) return false;
      const target = level.mode === "home" ? level.targetCount : level.targetActions;
      return result.reason === "complete" || Number(result.targets || 0) >= Number(target || 0);
    }

    function getLatestFor(levelId, results = getResults()) {
      return results.find((item) => item.levelId === levelId) || null;
    }

    function makeRecommendation(levelId, label, title, detail, action = "继续训练") {
      const level = getLevelById(levelId);
      return { level, levelId, label, title, detail, action };
    }

    function getRecommendedTraining() {
      const results = getResults();
      const latest = results[0] || null;
      const homeLevel = getLevelById("level-01-home");
      const cruiseLevel = getLevelById("level-03-cruise");
      const homeLatest = getLatestFor("level-01-home", results);
      const strikeLatest = getLatestFor("level-02-strike", results);
      const cruiseLatest = getLatestFor("level-03-cruise", results);
      const homeBest = getBestFor("level-01-home");
      const strikeBest = getBestFor("level-02-strike");
      const cruiseBest = getBestFor("level-03-cruise");
      const homeDone = results.some((item) => item.levelId === "level-01-home" && isResultComplete(item));
      const strikeDone = results.some((item) => item.levelId === "level-02-strike" && isResultComplete(item));
      const cruiseDone = results.some((item) => item.levelId === "level-03-cruise" && isResultComplete(item));

      if (!results.length) {
        return makeRecommendation("level-01-home", "首次启动", "从 01 战前预检开始", "先锁定 F/J，再进入中排八键校准。", "开始 01");
      }

      if (latest && !isResultComplete(latest)) {
        const level = getLevelById(latest.levelId);
        return makeRecommendation(level.id, "继续未完成", `继续 ${level.index} ${level.title}`, `上次停在 ${latest.targets || 0} 个目标，先把这一关打满。`, `继续 ${level.index}`);
      }

      if (!homeDone) {
        const done = homeLatest?.targets || 0;
        return makeRecommendation("level-01-home", "下一步", "补完 01 战前预检", `当前 01 还没完整通关，已完成 ${done}/${homeLevel?.targetCount || 0}。`, "继续 01");
      }

      if (!strikeDone) {
        return makeRecommendation("level-02-strike", "下一步", "进入 02 机械臂清障", "01 已打通，下一步练从基地出击再回家。", "进入 02");
      }

      if (!cruiseDone) {
        const done = cruiseLatest?.targets || 0;
        return makeRecommendation("level-03-cruise", "下一步", "进入 03 巡航防线", `02 已打通，开始多手指连续拦截。当前 03 进度 ${done}/${cruiseLevel?.targetActions || 0}。`, "进入 03");
      }

      if (cruiseBest && (cruiseBest.cruiseInterceptRate || cruiseBest.pathCompleteRate || 0) < 86) {
        return makeRecommendation("level-03-cruise", "强化建议", "重练 03 巡航拦截", `最佳拦截率 ${cruiseBest.cruiseInterceptRate || cruiseBest.pathCompleteRate || 0}%，继续练多手指连续巡航。`, "强化 03");
      }

      if (strikeBest && (strikeBest.pathCompleteRate || 0) < 90) {
        return makeRecommendation("level-02-strike", "强化建议", "重练 02 路径闭环", `最佳路径完整率 ${strikeBest.pathCompleteRate || 0}%，先把出击-命中-回家练顺。`, "强化 02");
      }

      if (homeBest && (homeBest.accuracy < 95 || homeBest.homeDriftCount > 3)) {
        return makeRecommendation("level-01-home", "强化建议", "回炉 01 锚点稳定", `最佳准确率 ${homeBest.accuracy}% ，继续压低旧位偏移。`, "强化 01");
      }

      if (latest) {
        const level = getLevelById(latest.levelId);
        return makeRecommendation(level.id, "继续上次", `继续 ${level.index} ${level.title}`, "当前训练线已打通，可以按最近节奏继续刷稳定度。", `继续 ${level.index}`);
      }

      return makeRecommendation("level-01-home", "推荐下一步", "从 01 战前预检开始", "先让 F/J 回到正确锚点。", "开始训练");
    }

    return {
      getResults,
      saveResult,
      getInventory,
      saveInventory,
      addInventory,
      getInventoryTotal,
      getEquipmentCount,
      getBestFor,
      getLevelById,
      isResultComplete,
      getLatestFor,
      getRecommendedTraining
    };
  }

  window.KeyPilotProgress = { createProgressStore };
})();
