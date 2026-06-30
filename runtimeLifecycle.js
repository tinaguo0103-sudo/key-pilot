(function () {
  class DeferredFinishController {
    constructor({ getState, getView, finishGame }) {
      this.getState = getState;
      this.getView = getView;
      this.finishGame = finishGame;
      this.deferredTimer = null;
      this.deathTimer = null;
    }

    clear() {
      if (this.deferredTimer) {
        window.clearTimeout(this.deferredTimer);
        this.deferredTimer = null;
      }
      if (this.deathTimer) {
        window.clearTimeout(this.deathTimer);
        this.deathTimer = null;
      }
    }

    pending() {
      return Boolean(this.deferredTimer || this.deathTimer);
    }

    schedule(reason = "complete", delay = 720) {
      const state = this.getState();
      if (!state) return;
      if (this.deferredTimer) window.clearTimeout(this.deferredTimer);
      const runId = state.runId;
      this.deferredTimer = window.setTimeout(() => {
        this.deferredTimer = null;
        const current = this.getState();
        if (current && current.runId === runId && this.getView() === "playing" && !current.result) {
          this.finishGame(reason);
        }
      }, delay);
    }

    scheduleDeath(delay = 820) {
      const state = this.getState();
      if (!state?.pendingDeath) return;
      if (this.deathTimer) window.clearTimeout(this.deathTimer);
      const runId = state.runId;
      this.deathTimer = window.setTimeout(() => {
        this.deathTimer = null;
        const current = this.getState();
        if (current?.runId === runId && current?.pendingDeath) {
          this.finishGame("death");
        }
      }, delay);
    }
  }

  window.KeyPilotRuntimeLifecycle = {
    createDeferredFinishController(deps) {
      return new DeferredFinishController(deps);
    }
  };
})();
