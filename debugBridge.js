(function () {
  function installDebugBridge(api) {
    if (!new URLSearchParams(window.location.search).has("debug")) return;

    window.__KEY_PILOT_DEBUG_FORCE_TIMELEFT__ = (seconds = 1) => api.forceTimeLeft(seconds);
    window.__KEY_PILOT_DEBUG_FORCE_CRUISE_DEADLINE__ = (ms = 120) => api.forceCruiseDeadline(ms);
    window.__KEY_PILOT_DEBUG_FORCE_HULL_DAMAGE__ = (hullLoss = 80) => api.forceHullDamage(hullLoss);
    window.__KEY_PILOT_DEBUG_SCHEDULE_DEFERRED_COMPLETE__ = (ms = 120) => api.scheduleDeferredComplete(ms);
    window.__KEY_PILOT_DEBUG_STATE__ = () => api.getDebugState();
  }

  window.KeyPilotDebugBridge = { install: installDebugBridge };
})();
