(function () {
  const AUDIO_VOLUME_PROFILES = {
    soft: { label: "轻", master: 0.82, bgm: 0.82, ambient: 0.44, sfx: 0.58, alert: 0.62 },
    standard: { label: "标准", master: 0.96, bgm: 1.08, ambient: 0.52, sfx: 0.78, alert: 0.78 },
    strong: { label: "强", master: 1, bgm: 1.28, ambient: 0.58, sfx: 0.92, alert: 0.9 }
  };

  const SOUND_ALIASES = {
    correct: "baseLock",
    clear: "monsterClear",
    drift: "driftError",
    wrong: "wrongKey",
    low: "lowHealth",
    door: "doorSoft",
    report: "reportOpen",
    base_lock: "baseLock",
    arm_strike: "armStrike",
    arm_return: "armReturn",
    monster_hit: "monsterHit",
    monster_clear: "monsterClear",
    wrong_key: "wrongKey",
    drift_error: "driftError",
    low_health: "lowHealth",
    report_open: "reportOpen",
    door_soft: "doorSoft",
    projectile_spawn: "projectileSpawn",
    projectile_close: "projectileClose",
    shield_block: "shieldBlock",
    counter_fire: "counterFire",
    timeout_hit: "timeoutHit",
    wave_clear: "waveClear"
  };

  const ALERT_SOUNDS = new Set(["driftError", "wrongKey", "lowHealth", "breach", "death", "timeoutHit", "projectileClose"]);

  function createAudioDirector(options) {
    const storage = options.storage;
    const prefsKey = options.prefsKey;
    const clamp = options.clamp;
    const getState = options.getState;
    const getView = options.getView;
    const getCurrentCruiseThreat = options.getCurrentCruiseThreat;
    const getCruiseThreatTimeRatio = options.getCruiseThreatTimeRatio;
    const isLowHullState = options.isLowHullState;
    const isDesktopRuntime = options.isDesktopRuntime;

    let audioContext = null;
    let soundEnabled = true;
    let musicEnabled = true;
    let audioVolumeMode = "standard";
    let director = null;
    let musicPulseTimer = null;
    let audioBeatTimer = null;
    let desktopAudioBooted = false;

    const audioBuffers = new Map();
    const audioBufferPromises = new Map();
    const bgmBuffers = new Map();
    const bgmBufferPromises = new Map();
    const bgmLoadFailures = new Set();

    try {
      const audioPrefs = JSON.parse(storage.getItem(prefsKey) || "{}");
      if (typeof audioPrefs.sfx === "boolean") soundEnabled = audioPrefs.sfx;
      if (typeof audioPrefs.bgm === "boolean") musicEnabled = audioPrefs.bgm;
      if (["soft", "standard", "strong"].includes(audioPrefs.volume)) audioVolumeMode = audioPrefs.volume;
    } catch {
      soundEnabled = true;
      musicEnabled = true;
      audioVolumeMode = "standard";
    }

    function savePrefs() {
      storage.setItem(prefsKey, JSON.stringify({
        sfx: soundEnabled,
        bgm: musicEnabled,
        volume: audioVolumeMode
      }));
    }

    function getVolumeProfile() {
      return AUDIO_VOLUME_PROFILES[audioVolumeMode] || AUDIO_VOLUME_PROFILES.standard;
    }

    function getSfxManifest(id) {
      return window.KeyPilotAssets?.audio?.sfx?.[id] || null;
    }

    function getBgmManifest(id) {
      return window.KeyPilotAssets?.audio?.bgm?.[id] || null;
    }

    function ensureAudio() {
      try {
        const AudioEngine = window.AudioContext || window.webkitAudioContext;
        if (!AudioEngine) return null;
        if (!audioContext) audioContext = new AudioEngine();
        if (audioContext.state === "suspended") audioContext.resume();
        return audioContext;
      } catch {
        return null;
      }
    }

    function loadAudioBuffer(id) {
      const manifest = getSfxManifest(id);
      if (!manifest?.src) return null;
      if (audioBuffers.has(id)) return Promise.resolve(audioBuffers.get(id));
      if (audioBufferPromises.has(id)) return audioBufferPromises.get(id);
      const ctx = ensureAudio();
      if (!ctx) return null;
      const promise = fetch(manifest.src)
        .then((response) => {
          if (!response.ok) throw new Error(`Audio load failed: ${manifest.src}`);
          return response.arrayBuffer();
        })
        .then((buffer) => ctx.decodeAudioData(buffer.slice(0)))
        .then((decoded) => {
          audioBuffers.set(id, decoded);
          return decoded;
        })
        .catch(() => null);
      audioBufferPromises.set(id, promise);
      return promise;
    }

    function loadBgmBuffer(id) {
      const manifest = getBgmManifest(id);
      if (!manifest?.src || bgmLoadFailures.has(id)) return null;
      if (bgmBuffers.has(id)) return Promise.resolve(bgmBuffers.get(id));
      if (bgmBufferPromises.has(id)) return bgmBufferPromises.get(id);
      const ctx = ensureAudio();
      if (!ctx) return null;
      const promise = fetch(manifest.src)
        .then((response) => {
          if (!response.ok) throw new Error(`BGM load failed: ${manifest.src}`);
          return response.arrayBuffer();
        })
        .then((buffer) => ctx.decodeAudioData(buffer.slice(0)))
        .then((decoded) => {
          bgmBuffers.set(id, decoded);
          return decoded;
        })
        .catch(() => {
          bgmLoadFailures.add(id);
          return null;
        });
      bgmBufferPromises.set(id, promise);
      return promise;
    }

    function preloadAudioAssets() {
      Object.keys(window.KeyPilotAssets?.audio?.sfx || {}).forEach((id) => loadAudioBuffer(id));
      Object.keys(window.KeyPilotAssets?.audio?.bgm || {}).forEach((id) => loadBgmBuffer(id));
    }

    function makeNoiseBuffer(ctx, seconds = 2) {
      const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let index = 0; index < length; index += 1) {
        last = (last + (Math.random() * 2 - 1) * 0.08) * 0.98;
        data[index] = clamp(last, -1, 1);
      }
      return buffer;
    }

    function stopBgmLoop(fade = 0.28) {
      if (!director?.bgmSource) return;
      const now = director.ctx.currentTime;
      try {
        director.bgmSourceGain?.gain.cancelScheduledValues(now);
        director.bgmSourceGain?.gain.setValueAtTime(director.bgmSourceGain.gain.value || 0.0001, now);
        director.bgmSourceGain?.gain.linearRampToValueAtTime(0.0001, now + fade);
        director.bgmSource.stop(now + fade + 0.03);
      } catch {
        // Source may already be stopped by the browser; the next loop will replace it.
      }
      director.bgmSource = null;
      director.bgmSourceGain = null;
      director.currentBgmId = "";
      director.usingAssetBgm = false;
    }

    function startBgmLoop(id) {
      const buffer = bgmBuffers.get(id);
      if (!director || !buffer) return false;
      if (director.currentBgmId === id && director.bgmSource) return true;
      stopBgmLoop(0.18);
      const now = director.ctx.currentTime;
      const source = director.ctx.createBufferSource();
      const sourceGain = director.ctx.createGain();
      source.buffer = buffer;
      source.loop = true;
      sourceGain.gain.setValueAtTime(0.0001, now);
      sourceGain.gain.linearRampToValueAtTime(1, now + 0.32);
      source.connect(sourceGain).connect(director.bgmGain);
      source.start(now);
      director.bgmSource = source;
      director.bgmSourceGain = sourceGain;
      director.currentBgmId = id;
      director.usingAssetBgm = true;
      return true;
    }

    function syncBgmLoop(profile) {
      const bgmId = profile.bgmId;
      if (!musicEnabled || !bgmId) {
        stopBgmLoop();
        return false;
      }
      if (startBgmLoop(bgmId)) return true;
      const promise = loadBgmBuffer(bgmId);
      if (!promise || bgmLoadFailures.has(bgmId)) {
        stopBgmLoop();
        return false;
      }
      promise.then((buffer) => {
        if (buffer && musicEnabled && getAudioProfile().bgmId === bgmId) {
          startBgmLoop(bgmId);
        }
      });
      stopBgmLoop(0.18);
      director.currentBgmId = bgmId;
      director.usingAssetBgm = false;
      return true;
    }

    function getAudioChannel(channel = "sfx") {
      const activeDirector = director || ensureAudioDirector(true);
      if (!activeDirector) return null;
      if (channel === "alert") return activeDirector.alertGain;
      if (channel === "bgm") return activeDirector.bgmGain;
      if (channel === "ambient") return activeDirector.ambientGain;
      return activeDirector.sfxGain;
    }

    function tone(frequency, duration = 0.08, type = "square", gain = 0.035, delay = 0, channel = "sfx") {
      if (channel !== "bgm" && channel !== "ambient" && !soundEnabled) return;
      const ctx = ensureAudio();
      if (!ctx) return;
      const now = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();
      const output = getAudioChannel(channel) || ctx.destination;
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      volume.gain.setValueAtTime(0.0001, now);
      volume.gain.exponentialRampToValueAtTime(gain, now + 0.012);
      volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(volume).connect(output);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    }

    function playBufferSound(id, playOptions = {}) {
      if (!soundEnabled) return false;
      const ctx = ensureAudio();
      const buffer = audioBuffers.get(id);
      if (!ctx || !buffer) {
        loadAudioBuffer(id);
        return false;
      }
      const channel = playOptions.channel || (ALERT_SOUNDS.has(id) ? "alert" : "sfx");
      const output = getAudioChannel(channel) || ctx.destination;
      const source = ctx.createBufferSource();
      const volume = ctx.createGain();
      const now = ctx.currentTime + (playOptions.delay || 0);
      source.buffer = buffer;
      volume.gain.setValueAtTime(playOptions.gain ?? 0.72, now);
      source.connect(volume).connect(output);
      source.start(now);
      return true;
    }

    function playFallbackSound(kind, playOptions = {}) {
      kind = {
        base_lock: "correct",
        arm_strike: "door",
        arm_return: "correct",
        monster_hit: "wrong",
        monster_clear: "clear",
        wrong_key: "wrong",
        drift_error: "drift",
        low_health: "low",
        report_open: "report",
        door_soft: "door"
      }[kind] || kind;
      const delay = playOptions.delay || 0;
      if (kind === "correct") {
        tone(520, 0.07, "triangle", 0.018, delay);
        tone(780, 0.08, "triangle", 0.014, delay + 0.045);
      } else if (kind === "clear") {
        tone(420, 0.08, "square", 0.018, delay);
        tone(840, 0.12, "triangle", 0.024, delay + 0.06);
        tone(1260, 0.1, "sine", 0.014, delay + 0.13);
      } else if (kind === "drift") {
        tone(96, 0.14, "sawtooth", 0.032, delay, "alert");
        tone(72, 0.18, "sawtooth", 0.022, delay + 0.045, "alert");
      } else if (kind === "wrong") {
        tone(150, 0.1, "sawtooth", 0.026, delay, "alert");
        tone(110, 0.08, "square", 0.018, delay + 0.05, "alert");
      } else if (kind === "breach") {
        tone(86, 0.18, "sawtooth", 0.034, delay, "alert");
        tone(52, 0.22, "square", 0.022, delay + 0.06, "alert");
        tone(720, 0.05, "square", 0.02, delay + 0.02, "alert");
      } else if (kind === "low") {
        tone(260, 0.07, "square", 0.026, delay, "alert");
        tone(260, 0.07, "square", 0.026, delay + 0.18, "alert");
      } else if (kind === "death") {
        tone(72, 0.28, "sawtooth", 0.034, delay, "alert");
        tone(42, 0.36, "square", 0.026, delay + 0.08, "alert");
      } else if (kind === "door") {
        tone(86, 0.16, "triangle", 0.018, delay);
        tone(118, 0.12, "sine", 0.012, delay + 0.08);
      } else if (kind === "report") {
        tone(392, 0.1, "triangle", 0.018, delay);
        tone(587, 0.12, "sine", 0.014, delay + 0.08);
        tone(784, 0.14, "triangle", 0.012, delay + 0.16);
      }
    }

    function playSound(kind, playOptions = {}) {
      const id = SOUND_ALIASES[kind] || kind;
      if (playBufferSound(id, playOptions)) return;
      playFallbackSound(kind, playOptions);
    }

    function musicTone(frequency, duration = 0.12, type = "triangle", gain = 0.012, delay = 0) {
      if (!musicEnabled) return;
      const activeDirector = ensureAudioDirector(true);
      if (!activeDirector) return;
      const ctx = activeDirector.ctx;
      const now = ctx.currentTime + delay;
      const oscillator = ctx.createOscillator();
      const volume = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      volume.gain.setValueAtTime(0.0001, now);
      volume.gain.exponentialRampToValueAtTime(gain, now + 0.018);
      volume.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(volume).connect(activeDirector.bgmGain);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.03);
    }

    function musicSemitone(root, steps) {
      return root * Math.pow(2, steps / 12);
    }

    function musicChord(root, intervals, duration, gain, delay = 0, type = "triangle") {
      intervals.forEach((step, index) => {
        musicTone(musicSemitone(root, step), duration, type, gain * (index === 0 ? 0.72 : 0.42), delay + index * 0.018);
      });
    }

    function ensureAudioDirector(forceStart = false) {
      if (director) return director;
      if (!musicEnabled && !forceStart) return null;
      const ctx = ensureAudio();
      if (!ctx) return null;
      if (ctx.state === "suspended") ctx.resume?.();

      const master = ctx.createGain();
      const bgmGain = ctx.createGain();
      const bedGain = ctx.createGain();
      const ambientGain = ctx.createGain();
      const sfxGain = ctx.createGain();
      const alertGain = ctx.createGain();
      const bgmFilter = ctx.createBiquadFilter();
      const ambientFilter = ctx.createBiquadFilter();
      const drone = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const noise = ctx.createBufferSource();

      master.gain.setValueAtTime(0.72, ctx.currentTime);
      bgmGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      bedGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      ambientGain.gain.setValueAtTime(0.0001, ctx.currentTime);
      sfxGain.gain.setValueAtTime(0.62, ctx.currentTime);
      alertGain.gain.setValueAtTime(0.62, ctx.currentTime);
      bgmFilter.type = "lowpass";
      bgmFilter.frequency.setValueAtTime(520, ctx.currentTime);
      bgmFilter.Q.setValueAtTime(0.8, ctx.currentTime);
      ambientFilter.type = "lowpass";
      ambientFilter.frequency.setValueAtTime(680, ctx.currentTime);
      ambientFilter.Q.setValueAtTime(0.45, ctx.currentTime);

      drone.type = "triangle";
      drone.frequency.setValueAtTime(146.83, ctx.currentTime);
      sub.type = "sine";
      sub.frequency.setValueAtTime(73.42, ctx.currentTime);
      noise.buffer = makeNoiseBuffer(ctx, 2.4);
      noise.loop = true;

      drone.connect(bedGain);
      sub.connect(bedGain);
      bedGain.connect(bgmFilter);
      bgmFilter.connect(bgmGain).connect(master);
      noise.connect(ambientFilter).connect(ambientGain).connect(master);
      sfxGain.connect(master);
      alertGain.connect(master);
      master.connect(ctx.destination);

      drone.start();
      sub.start();
      noise.start();
      preloadAudioAssets();

      director = {
        ctx,
        master,
        drone,
        sub,
        bgmGain,
        bedGain,
        ambientGain,
        sfxGain,
        alertGain,
        bgmFilter,
        ambientFilter,
        mode: "",
        currentBgmId: "",
        bgmSource: null,
        bgmSourceGain: null,
        usingAssetBgm: false,
        tempo: 0,
        beat: 0
      };
      return director;
    }

    function getAudioProfile() {
      const view = getView();
      const state = getState();
      const muted = { mode: "muted", bgmId: "", bgm: 0, bed: 0, ambient: 0, filter: 300, ambientFilter: 420, tempo: 0, root: 146.83, scale: "menu" };
      if (!musicEnabled) return muted;

      if (view === "playing" && state) {
        if (state.status === "dead") {
          return { mode: "shutdown", bgmId: "report", bgm: 0.24, bed: 0.0001, ambient: 0.004, filter: 720, ambientFilter: 340, tempo: 0, root: 98, scale: "shutdown" };
        }
        if (state.level.mode === "strike" && state.status === "playing") {
          const danger = clamp((state.monsterPressure + state.corruption) / 200, 0, 1);
          const low = isLowHullState(state);
          return {
            mode: low ? "critical-combat" : "combat",
            bgmId: "combat",
            bgm: 0.58 + danger * 0.12,
            bed: 0.0001 + danger * 0.0001,
            ambient: 0.004 + danger * 0.004,
            filter: low ? 1420 : 1180 + danger * 280,
            ambientFilter: low ? 820 : 520 + danger * 180,
            tempo: low ? 390 : 520,
            root: low ? 130.81 : 110,
            noteGain: low ? 0.34 : 0.3,
            scale: low ? "critical" : "combat"
          };
        }
        if (state.level.mode === "strike" && state.status === "finger-calibration") {
          return { mode: "calibration", bgmId: "calibration", bgm: 0.5, bed: 0.0001, ambient: 0.003, filter: 1180, ambientFilter: 480, tempo: 640, root: 146.83, noteGain: 0.28, scale: "calibration" };
        }
        if (state.level.mode === "cruise" && state.status === "playing") {
          const threat = getCurrentCruiseThreat(state);
          const timeRatio = getCruiseThreatTimeRatio(state);
          const danger = clamp((1 - timeRatio) * 0.7 + state.corruption / 240 + state.cruiseTimeouts / 30, 0, 1);
          const low = isLowHullState(state);
          return {
            mode: low ? "critical-cruise" : "cruise",
            bgmId: "cruise",
            bgm: 0.62 + danger * 0.12,
            bed: 0.0001,
            ambient: 0.004 + danger * 0.004,
            filter: low ? 1500 : 1280 + danger * 260,
            ambientFilter: 580 + danger * 180,
            tempo: low ? 330 : 470,
            root: threat?.side === "right" ? 123.47 : 116.54,
            noteGain: low ? 0.34 : 0.28,
            scale: low ? "critical" : "combat"
          };
        }
        return { mode: "preflight", bgmId: "preflight", bgm: 0.52, bed: 0.0001, ambient: 0.003, filter: 1180, ambientFilter: 460, tempo: 680, root: 130.81, noteGain: 0.28, scale: "preflight" };
      }

      if (view === "result") {
        return { mode: "report", bgmId: "report", bgm: 0.46, bed: 0.0001, ambient: 0.003, filter: 1160, ambientFilter: 420, tempo: 920, root: 174.61, noteGain: 0.22, scale: "report" };
      }

      return { mode: "menu", bgmId: "menu", bgm: 0.44, bed: 0.0001, ambient: 0.003, filter: 1040, ambientFilter: 440, tempo: 1040, root: 110, noteGain: 0.2, scale: "menu" };
    }

    function playMusicBeat() {
      if (!director || !musicEnabled) return;
      const profile = getAudioProfile();
      if (!profile.tempo) return;
      director.beat += 1;
      const root = profile.root || 146.83;
      const scales = {
        menu: [0, 3, 7, 10, 7, 3, -2, 0],
        preflight: [0, 3, 7, 10, 7, 5, 3, -2],
        calibration: [0, 3, 5, 7, 10, 7, 5, 3],
        combat: [0, 3, 5, 7, 10, 7, 5, 3],
        critical: [0, 1, 3, 5, 6, 5, 3, 1],
        report: [0, 3, 7, 10, 12, 10, 7, 3],
        shutdown: [0]
      };
      const scale = scales[profile.scale] || scales.menu;
      const note = musicSemitone(root, scale[director.beat % scale.length]);
      const gain = profile.noteGain || 0.05;
      const isCombat = profile.mode.includes("combat");
      const barStep = director.beat % 8;

      if (barStep === 1) {
        const chordSets = {
          menu: [[0, 3, 7], [-2, 3, 7]],
          preflight: [[0, 3, 7], [-2, 3, 7]],
          calibration: [[0, 5, 10], [3, 7, 12]],
          combat: [[0, 3, 10], [-2, 3, 7]],
          critical: [[0, 1, 6], [-1, 3, 6]],
          report: [[0, 3, 7], [3, 7, 12]]
        };
        const chords = chordSets[profile.scale] || chordSets.menu;
        musicChord(root, chords[Math.floor(director.beat / 8) % chords.length], isCombat ? 1.05 : 1.3, gain * 0.34, 0.01, "sine");
      }

      if (barStep === 1 || barStep === 5) {
        musicTone(root / 2, isCombat ? 0.42 : 0.5, "triangle", gain * 0.38, 0.01);
      }

      if (barStep === 3 || barStep === 7) {
        musicTone(musicSemitone(root / 2, 7), 0.28, "sine", gain * 0.18, 0.02);
      }

      musicTone(note, isCombat ? 0.2 : 0.24, "triangle", gain * (isCombat ? 0.8 : 0.7));
      if (director.beat % 2 === 0) {
        musicTone(note * 2, 0.08, "sine", gain * 0.16, 0.07);
      }
      if (isCombat && director.beat % 4 === 0) {
        musicTone(musicSemitone(root / 2, scale[(director.beat / 4) % scale.length] || 0), 0.16, "sine", gain * 0.3, 0.03);
      }
      flashAudioBeat(profile);
    }

    function syncMusicPulse(profile, allowFallback = true) {
      if (musicPulseTimer && (!musicEnabled || !profile.tempo || !allowFallback)) {
        window.clearInterval(musicPulseTimer);
        musicPulseTimer = null;
        if (director) director.tempo = 0;
        return;
      }
      if (!musicEnabled || !profile.tempo || !allowFallback) return;
      if (director?.tempo === profile.tempo && musicPulseTimer) return;
      if (musicPulseTimer) window.clearInterval(musicPulseTimer);
      if (director) director.tempo = profile.tempo;
      musicPulseTimer = window.setInterval(playMusicBeat, profile.tempo);
      window.setTimeout(playMusicBeat, 90);
      window.setTimeout(playMusicBeat, 360);
    }

    function sync(forceStart = false) {
      if (!forceStart && !director) return;
      if (!musicEnabled && !director) return;
      const profile = getAudioProfile();
      const activeDirector = musicEnabled || director ? ensureAudioDirector(forceStart) : null;
      if (!activeDirector) return;
      activeDirector.ctx.resume?.();
      const mix = getVolumeProfile();
      const now = activeDirector.ctx.currentTime;
      const ramp = forceStart ? 0.18 : 0.42;
      activeDirector.master.gain.cancelScheduledValues(now);
      activeDirector.bgmGain.gain.cancelScheduledValues(now);
      activeDirector.bedGain?.gain.cancelScheduledValues(now);
      activeDirector.ambientGain.gain.cancelScheduledValues(now);
      activeDirector.sfxGain.gain.cancelScheduledValues(now);
      activeDirector.alertGain.gain.cancelScheduledValues(now);
      activeDirector.bgmFilter.frequency.cancelScheduledValues(now);
      activeDirector.ambientFilter.frequency.cancelScheduledValues(now);
      activeDirector.master.gain.linearRampToValueAtTime(mix.master || 0.0001, now + ramp);
      activeDirector.bgmGain.gain.linearRampToValueAtTime((profile.bgm || 0) * mix.bgm || 0.0001, now + ramp);
      activeDirector.bedGain?.gain.linearRampToValueAtTime((profile.bed || 0) * mix.bgm || 0.0001, now + ramp);
      activeDirector.ambientGain.gain.linearRampToValueAtTime((profile.ambient || 0) * mix.ambient || 0.0001, now + ramp);
      activeDirector.sfxGain.gain.linearRampToValueAtTime(mix.sfx || 0.0001, now + 0.08);
      activeDirector.alertGain.gain.linearRampToValueAtTime(mix.alert || 0.0001, now + 0.08);
      activeDirector.bgmFilter.frequency.linearRampToValueAtTime(profile.filter || 300, now + ramp);
      activeDirector.ambientFilter.frequency.linearRampToValueAtTime(profile.ambientFilter || 500, now + ramp);
      if (profile.root) {
        activeDirector.drone.frequency.linearRampToValueAtTime(profile.root, now + ramp);
        activeDirector.sub.frequency.linearRampToValueAtTime(profile.root / 2, now + ramp);
      }
      activeDirector.mode = profile.mode;
      const hasAssetLoop = syncBgmLoop(profile);
      syncMusicPulse(profile, !hasAssetLoop);
    }

    function bootDesktopIfNeeded() {
      if (!isDesktopRuntime || desktopAudioBooted || !musicEnabled) return;
      desktopAudioBooted = true;
      window.setTimeout(() => {
        sync(true);
        const bgmId = getAudioProfile().bgmId;
        if (bgmId) {
          loadBgmBuffer(bgmId)?.then(() => {
            if (musicEnabled) sync(true);
          });
        }
      }, 120);
    }

    function wakeMusicIfNeeded() {
      if (!musicEnabled) return;
      if (!director || director.ctx?.state === "suspended" || !musicPulseTimer) {
        sync(true);
      }
    }

    function stop() {
      if (musicPulseTimer) {
        window.clearInterval(musicPulseTimer);
        musicPulseTimer = null;
      }
      if (!director) return;
      stopBgmLoop();
      const now = director.ctx.currentTime;
      director.bgmGain.gain.cancelScheduledValues(now);
      director.bedGain?.gain.cancelScheduledValues(now);
      director.ambientGain.gain.cancelScheduledValues(now);
      director.bgmGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
      director.bedGain?.gain.linearRampToValueAtTime(0.0001, now + 0.35);
      director.ambientGain.gain.linearRampToValueAtTime(0.0001, now + 0.35);
      director.tempo = 0;
    }

    function flashAudioBeat(profile) {
      if (!profile.mode || profile.mode === "muted") return;
      if (audioBeatTimer) {
        window.clearTimeout(audioBeatTimer);
        audioBeatTimer = null;
      }
      document.querySelector(".app-shell")?.classList.remove("audio-beat");
    }

    function toggleSound() {
      soundEnabled = !soundEnabled;
      if (soundEnabled) playSound("correct");
      savePrefs();
      return soundEnabled;
    }

    function toggleMusic() {
      musicEnabled = !musicEnabled;
      savePrefs();
      if (musicEnabled) {
        sync(true);
        playSound("report");
      } else {
        stop();
      }
      return musicEnabled;
    }

    function cycleVolume() {
      const modes = ["soft", "standard", "strong"];
      audioVolumeMode = modes[(modes.indexOf(audioVolumeMode) + 1) % modes.length] || "standard";
      savePrefs();
      sync(true);
      if (soundEnabled) playSound("base_lock");
      return audioVolumeMode;
    }

    function getPrefs() {
      return {
        musicEnabled,
        soundEnabled,
        volume: audioVolumeMode,
        volumeLabel: getVolumeProfile().label
      };
    }

    function getDebugState() {
      return {
        musicEnabled,
        soundEnabled,
        volume: audioVolumeMode,
        bgmId: director?.currentBgmId || "",
        usingAssetBgm: Boolean(director?.usingAssetBgm),
        desktop: isDesktopRuntime,
        audioState: director?.ctx?.state || ""
      };
    }

    return {
      getPrefs,
      getVolumeProfile,
      getDebugState,
      playSound,
      sync,
      bootDesktopIfNeeded,
      wakeMusicIfNeeded,
      stop,
      toggleSound,
      toggleMusic,
      cycleVolume
    };
  }

  window.KeyPilotAudioDirector = { createAudioDirector };
})();
