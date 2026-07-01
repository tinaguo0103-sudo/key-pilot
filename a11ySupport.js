(function () {
  function createA11ySupport(options = {}) {
    const getState = options.getState;
    const getView = options.getView;
    const formatKey = options.formatKey || ((key) => String(key || "").toUpperCase());
    let liveNode = null;

    function ensureLiveNode() {
      if (liveNode && document.body.contains(liveNode)) return liveNode;
      liveNode = document.createElement("div");
      liveNode.className = "sr-only";
      liveNode.setAttribute("aria-live", "polite");
      liveNode.setAttribute("aria-atomic", "true");
      liveNode.id = "key-pilot-live-region";
      document.body.appendChild(liveNode);
      return liveNode;
    }

    function describeCurrentState() {
      const state = getState?.();
      const view = getView?.();
      if (!state || view === "menu") return "主界面，选择训练关卡。";
      if (view === "result") return "任务报告已打开。";
      const key = formatKey(state.currentTarget);
      if (state.status === "prelock") return key ? `战前预检，请按 ${key}。` : "战前预检。";
      if (state.status === "finger-calibration") return key ? `机械臂校准，请按 ${key}。` : "机械臂校准。";
      if (state.level?.mode === "cruise") return key ? `巡航防线，当前目标 ${key}。` : "巡航防线。";
      if (state.level?.mode === "strike") return key ? `机械臂清障，当前目标 ${key}。` : "机械臂清障。";
      return key ? `当前目标 ${key}。` : "训练中。";
    }

    function announce(message = "") {
      const node = ensureLiveNode();
      node.textContent = message || describeCurrentState();
    }

    function sync() {
      ensureLiveNode();
      const app = document.querySelector("#app");
      if (app) {
        app.setAttribute("role", "application");
        app.setAttribute("aria-label", "Key Pilot 打字训练游戏");
      }
      const targetStage = document.querySelector(".target-stage");
      if (targetStage) {
        targetStage.setAttribute("aria-label", describeCurrentState());
      }
    }

    return { announce, sync };
  }

  window.KeyPilotA11ySupport = { createA11ySupport };
})();
