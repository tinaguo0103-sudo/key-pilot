import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "assets/audio");
const bgmDir = path.join(outDir, "bgm");
const workDir = path.join(root, ".runtime/audio-work");
const sampleRate = 44100;

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(bgmDir, { recursive: true });
fs.mkdirSync(workDir, { recursive: true });

function clamp(value, min = -1, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function envelope(t, duration, attack = 0.01, release = 0.08) {
  if (t < attack) return t / attack;
  if (t > duration - release) return Math.max(0, (duration - t) / release);
  return 1;
}

function osc(type, phase) {
  if (type === "square") return Math.sin(phase) >= 0 ? 1 : -1;
  if (type === "saw") return 2 * (phase / (Math.PI * 2) - Math.floor(0.5 + phase / (Math.PI * 2)));
  if (type === "triangle") return 2 * Math.asin(Math.sin(phase)) / Math.PI;
  return Math.sin(phase);
}

function synth({ duration, gain = 0.24, tones = [], noise = 0, noiseColor = 0.92, attack = 0.008, release = 0.08 }) {
  const length = Math.ceil(duration * sampleRate);
  const data = new Float32Array(length);
  const phases = tones.map(() => 0);
  let noiseState = 0;

  for (let i = 0; i < length; i += 1) {
    const t = i / sampleRate;
    let sample = 0;
    tones.forEach((tone, index) => {
      const start = tone.delay || 0;
      const end = start + (tone.duration || duration);
      if (t < start || t > end) return;
      const local = t - start;
      const progress = local / Math.max(0.001, tone.duration || duration);
      const freq = typeof tone.frequency === "function" ? tone.frequency(progress, local) : tone.frequency;
      phases[index] += (Math.PI * 2 * freq) / sampleRate;
      const localEnv = envelope(local, tone.duration || duration, tone.attack ?? attack, tone.release ?? release);
      sample += osc(tone.type || "sine", phases[index]) * (tone.gain ?? 1) * localEnv;
    });
    if (noise) {
      noiseState = noiseState * noiseColor + (Math.random() * 2 - 1) * (1 - noiseColor);
      sample += noiseState * noise;
    }
    data[i] = clamp(sample * gain * envelope(t, duration, attack, release));
  }
  return data;
}

function writeWavFile(filePath, data) {
  const channels = Array.isArray(data) ? data : [data];
  const channelCount = channels.length;
  const frames = channels[0]?.length || 0;
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample * channelCount;
  const byteRate = sampleRate * blockAlign;
  const dataSize = frames * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channelCount, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < frames; i += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const offset = 44 + (i * channelCount + channel) * bytesPerSample;
      buffer.writeInt16LE(Math.round(clamp(channels[channel][i] || 0) * 32767), offset);
    }
  }
  fs.writeFileSync(filePath, buffer);
}

function writeWav(name, data) {
  writeWavFile(path.join(outDir, `${name}.wav`), data);
}

const assets = {
  door_soft: {
    duration: 0.46,
    gain: 0.17,
    noise: 0.18,
    noiseColor: 0.985,
    attack: 0.02,
    release: 0.18,
    tones: [
      { frequency: (p) => 92 - p * 34, type: "sine", gain: 0.9, duration: 0.34 },
      { frequency: 138, type: "triangle", gain: 0.32, delay: 0.08, duration: 0.16 }
    ]
  },
  base_lock: {
    duration: 0.16,
    gain: 0.2,
    tones: [
      { frequency: 420, type: "triangle", gain: 0.7, duration: 0.1 },
      { frequency: 760, type: "sine", gain: 0.36, delay: 0.045, duration: 0.09 }
    ]
  },
  arm_strike: {
    duration: 0.22,
    gain: 0.18,
    noise: 0.12,
    noiseColor: 0.7,
    tones: [
      { frequency: (p) => 260 + p * 520, type: "saw", gain: 0.44, duration: 0.11, release: 0.035 },
      { frequency: 112, type: "triangle", gain: 0.26, delay: 0.07, duration: 0.1 }
    ]
  },
  arm_return: {
    duration: 0.2,
    gain: 0.17,
    tones: [
      { frequency: (p) => 520 - p * 260, type: "triangle", gain: 0.48, duration: 0.13 },
      { frequency: 210, type: "sine", gain: 0.34, delay: 0.1, duration: 0.08 }
    ]
  },
  monster_hit: {
    duration: 0.18,
    gain: 0.2,
    noise: 0.16,
    noiseColor: 0.62,
    tones: [
      { frequency: 168, type: "square", gain: 0.3, duration: 0.08 },
      { frequency: 640, type: "triangle", gain: 0.26, delay: 0.025, duration: 0.07 }
    ]
  },
  monster_clear: {
    duration: 0.34,
    gain: 0.19,
    noise: 0.06,
    noiseColor: 0.76,
    tones: [
      { frequency: 390, type: "triangle", gain: 0.42, duration: 0.1 },
      { frequency: 585, type: "triangle", gain: 0.38, delay: 0.07, duration: 0.12 },
      { frequency: 780, type: "sine", gain: 0.28, delay: 0.15, duration: 0.14 }
    ]
  },
  wrong_key: {
    duration: 0.19,
    gain: 0.15,
    noise: 0.08,
    noiseColor: 0.86,
    tones: [
      { frequency: 142, type: "saw", gain: 0.42, duration: 0.12 },
      { frequency: 96, type: "square", gain: 0.22, delay: 0.05, duration: 0.1 }
    ]
  },
  drift_error: {
    duration: 0.32,
    gain: 0.17,
    noise: 0.12,
    noiseColor: 0.94,
    tones: [
      { frequency: (p) => 180 - p * 70, type: "saw", gain: 0.42, duration: 0.18 },
      { frequency: 73, type: "square", gain: 0.24, delay: 0.08, duration: 0.18 }
    ]
  },
  low_health: {
    duration: 0.42,
    gain: 0.16,
    tones: [
      { frequency: 310, type: "square", gain: 0.42, duration: 0.08, release: 0.03 },
      { frequency: 310, type: "square", gain: 0.42, delay: 0.2, duration: 0.08, release: 0.03 },
      { frequency: 92, type: "sine", gain: 0.24, duration: 0.38 }
    ]
  },
  report_open: {
    duration: 0.44,
    gain: 0.16,
    tones: [
      { frequency: 330, type: "triangle", gain: 0.35, duration: 0.12 },
      { frequency: 495, type: "triangle", gain: 0.34, delay: 0.11, duration: 0.13 },
      { frequency: 660, type: "sine", gain: 0.26, delay: 0.23, duration: 0.16 }
    ]
  },
  projectile_spawn: {
    duration: 0.18,
    gain: 0.17,
    noise: 0.08,
    noiseColor: 0.84,
    tones: [
      { frequency: (p) => 260 + p * 180, type: "triangle", gain: 0.38, duration: 0.12 },
      { frequency: 880, type: "sine", gain: 0.2, delay: 0.035, duration: 0.08 }
    ]
  },
  projectile_close: {
    duration: 0.24,
    gain: 0.15,
    noise: 0.06,
    noiseColor: 0.9,
    tones: [
      { frequency: (p) => 440 + p * 180, type: "saw", gain: 0.28, duration: 0.16 },
      { frequency: 196, type: "triangle", gain: 0.2, delay: 0.08, duration: 0.12 }
    ]
  },
  shield_block: {
    duration: 0.23,
    gain: 0.18,
    noise: 0.08,
    noiseColor: 0.64,
    tones: [
      { frequency: 190, type: "square", gain: 0.25, duration: 0.07 },
      { frequency: 510, type: "triangle", gain: 0.34, delay: 0.035, duration: 0.1 }
    ]
  },
  counter_fire: {
    duration: 0.22,
    gain: 0.19,
    noise: 0.08,
    noiseColor: 0.72,
    tones: [
      { frequency: (p) => 520 + p * 640, type: "triangle", gain: 0.42, duration: 0.1, release: 0.03 },
      { frequency: 260, type: "sine", gain: 0.22, delay: 0.08, duration: 0.1 }
    ]
  },
  timeout_hit: {
    duration: 0.31,
    gain: 0.18,
    noise: 0.16,
    noiseColor: 0.7,
    tones: [
      { frequency: 110, type: "saw", gain: 0.36, duration: 0.18 },
      { frequency: 72, type: "square", gain: 0.22, delay: 0.08, duration: 0.16 }
    ]
  },
  wave_clear: {
    duration: 0.42,
    gain: 0.19,
    noise: 0.04,
    noiseColor: 0.78,
    tones: [
      { frequency: 392, type: "triangle", gain: 0.32, duration: 0.1 },
      { frequency: 587, type: "triangle", gain: 0.34, delay: 0.08, duration: 0.12 },
      { frequency: 880, type: "sine", gain: 0.3, delay: 0.17, duration: 0.18 }
    ]
  }
};

Object.entries(assets).forEach(([name, spec]) => writeWav(name, synth(spec)));

function midiToHz(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function panGains(pan = 0) {
  const angle = (clamp(pan, -1, 1) + 1) * Math.PI * 0.25;
  return [Math.cos(angle), Math.sin(angle)];
}

function noteEnvelope(t, duration, attack = 0.012, release = 0.08) {
  if (t < 0 || t > duration) return 0;
  if (t < attack) return t / attack;
  if (t > duration - release) return Math.max(0, (duration - t) / Math.max(0.001, release));
  return 1;
}

function addToneStereo(left, right, start, duration, frequency, {
  gain = 0.1,
  type = "sine",
  pan = 0,
  attack = 0.01,
  release = 0.08,
  detune = 0,
  vibrato = 0
} = {}) {
  const [leftGain, rightGain] = panGains(pan);
  const startFrame = Math.max(0, Math.floor(start * sampleRate));
  const endFrame = Math.min(left.length, Math.ceil((start + duration) * sampleRate));
  let phase = 0;
  const detuned = frequency * Math.pow(2, detune / 1200);
  for (let i = startFrame; i < endFrame; i += 1) {
    const local = (i - startFrame) / sampleRate;
    const wobble = vibrato ? Math.sin(local * Math.PI * 2 * 5.2) * vibrato : 0;
    phase += (Math.PI * 2 * detuned * (1 + wobble)) / sampleRate;
    const env = noteEnvelope(local, duration, attack, release);
    const value = osc(type, phase) * gain * env;
    left[i] += value * leftGain;
    right[i] += value * rightGain;
  }
}

function addNoiseStereo(left, right, start, duration, {
  gain = 0.05,
  pan = 0,
  color = 0.72,
  attack = 0.004,
  release = 0.06,
  seed = 1
} = {}) {
  const [leftGain, rightGain] = panGains(pan);
  const startFrame = Math.max(0, Math.floor(start * sampleRate));
  const endFrame = Math.min(left.length, Math.ceil((start + duration) * sampleRate));
  let noiseState = 0;
  let randomState = seed >>> 0;
  const random = () => {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return randomState / 0xffffffff;
  };
  for (let i = startFrame; i < endFrame; i += 1) {
    const local = (i - startFrame) / sampleRate;
    const env = noteEnvelope(local, duration, attack, release);
    noiseState = noiseState * color + (random() * 2 - 1) * (1 - color);
    const value = noiseState * gain * env;
    left[i] += value * leftGain;
    right[i] += value * rightGain;
  }
}

function normalizeStereo(left, right, target = 0.86) {
  let peak = 0.001;
  for (let i = 0; i < left.length; i += 1) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const gain = Math.min(8, target / peak);
  for (let i = 0; i < left.length; i += 1) {
    left[i] = clamp(left[i] * gain);
    right[i] = clamp(right[i] * gain);
  }
}

function addChordStereo(left, right, start, duration, root, chord, {
  gain = 0.028,
  panSpread = 0.28,
  type = "sine",
  attack = 0.28,
  release = 0.75
} = {}) {
  chord.forEach((step, index) => {
    const center = (chord.length - 1) / 2;
    addToneStereo(left, right, start, duration, midiToHz(root + step), {
      gain: gain * (index === 0 ? 1 : 0.72),
      type,
      pan: (index - center) * panSpread,
      attack,
      release,
      detune: index === chord.length - 1 ? 4 : 0,
      vibrato: 0.0008
    });
  });
}

function addPulseStereo(left, right, time, frequency, {
  gain = 0.06,
  duration = 0.34,
  pan = 0,
  type = "triangle"
} = {}) {
  addToneStereo(left, right, time, duration, frequency, {
    gain,
    type,
    pan,
    attack: 0.006,
    release: duration * 0.72
  });
}

function makeMusicLoop(spec) {
  // BGM is intentionally sparse: a steady bass pulse, a soft pad, and a short motif.
  // Moment-to-moment feedback belongs to SFX; dense arps/noise here quickly feels chaotic.
  const beat = 60 / spec.bpm;
  const duration = spec.bars ? spec.bars * beat * 4 : spec.duration;
  const length = Math.floor(duration * sampleRate);
  const left = new Float32Array(length);
  const right = new Float32Array(length);
  const root = spec.root;
  const chordCycle = spec.chords || [[0, 3, 7], [-2, 3, 7], [0, 5, 10], [-4, 0, 7]];
  const bars = Math.max(1, spec.bars || Math.round(duration / (beat * 4)));

  for (let bar = 0; bar < bars; bar += 1) {
    const barStart = bar * beat * 4;
    const chord = chordCycle[bar % chordCycle.length];
    addChordStereo(left, right, barStart, beat * 3.86, root + 12, chord, {
      gain: spec.padGain || 0.026,
      type: spec.padType || "sine",
      panSpread: spec.panSpread || 0.18
    });
    if (spec.lowPadGain) {
      addChordStereo(left, right, barStart, beat * 3.9, root, [chord[0], chord[2] || chord[1]], {
        gain: spec.lowPadGain,
        type: "triangle",
        panSpread: 0.12,
        attack: 0.36,
        release: 0.82
      });
    }
  }

  const bassPattern = spec.bass || [0, 0, -2, 0, 3, 0, -2, 0];
  const bassSteps = Math.ceil(duration / beat);
  for (let step = 0; step < bassSteps; step += 1) {
    if (spec.bassMask && !spec.bassMask[step % spec.bassMask.length]) continue;
    const noteStep = bassPattern[step % bassPattern.length];
    const time = step * beat;
    addPulseStereo(left, right, time, midiToHz(root - 24 + noteStep), {
      gain: spec.bassGain || 0.07,
      duration: beat * (spec.bassLength || 0.48),
      pan: -0.04,
      type: "triangle"
    });
  }

  const motif = spec.motif || [];
  motif.forEach((item, index) => {
    const time = item.beat * beat;
    if (time >= duration) return;
    addToneStereo(left, right, time, beat * (item.length || 0.55), midiToHz(root + 12 + item.step), {
      gain: item.gain ?? spec.leadGain ?? 0.032,
      type: item.type || "sine",
      pan: item.pan ?? (index % 2 ? 0.16 : -0.16),
      attack: 0.018,
      release: beat * 0.35,
      vibrato: 0.0006
    });
  });

  if (spec.kickGain) {
    for (let beatIndex = 0; beatIndex < duration / beat; beatIndex += 1) {
      if (!spec.kickMask?.[beatIndex % spec.kickMask.length]) continue;
      const time = beatIndex * beat;
      addPulseStereo(left, right, time, 62, {
        gain: spec.kickGain,
        duration: 0.2,
        type: "sine"
      });
    }
  }

  if (spec.snareGain) {
    for (let beatIndex = 0; beatIndex < duration / beat; beatIndex += 1) {
      if (!spec.snareMask?.[beatIndex % spec.snareMask.length]) continue;
      const time = beatIndex * beat;
      addNoiseStereo(left, right, time, 0.075, {
        gain: spec.snareGain,
        color: 0.72,
        seed: 80 + beatIndex,
        pan: 0.04,
        attack: 0.004,
        release: 0.065
      });
      addToneStereo(left, right, time, 0.09, 156, {
        gain: spec.snareToneGain || 0.018,
        type: "triangle",
        attack: 0.004,
        release: 0.07
      });
    }
  }

  if (spec.tickGain) {
    for (let beatIndex = 0; beatIndex < duration / beat; beatIndex += 1) {
      if (!spec.tickMask?.[beatIndex % spec.tickMask.length]) continue;
      addToneStereo(left, right, beatIndex * beat + beat * 0.5, 0.045, midiToHz(root + 24), {
        gain: spec.tickGain,
        type: "sine",
        pan: beatIndex % 2 ? 0.18 : -0.18,
        attack: 0.002,
        release: 0.035
      });
    }
  }

  normalizeStereo(left, right, spec.normalize || 0.58);
  return [left, right];
}

const bgmTracks = {
  menu: {
    bars: 4,
    bpm: 88,
    root: 43,
    padGain: 0.032,
    lowPadGain: 0.016,
    bassGain: 0.058,
    bassMask: [1, 0, 1, 0],
    bassLength: 0.62,
    leadGain: 0.026,
    motif: [
      { beat: 2.5, step: 7, length: 0.75 },
      { beat: 3.5, step: 10, length: 0.5, pan: 0.12 },
      { beat: 6.5, step: 5, length: 0.7 },
      { beat: 10.5, step: 7, length: 0.65 },
      { beat: 14.5, step: 3, length: 0.95, pan: 0.06 }
    ],
    chords: [[0, 3, 7], [-2, 3, 7], [0, 5, 10], [-4, 0, 7]]
  },
  preflight: {
    bars: 4,
    bpm: 96,
    root: 45,
    padGain: 0.03,
    lowPadGain: 0.014,
    bassGain: 0.066,
    bassMask: [1, 0, 1, 0],
    bassLength: 0.48,
    tickGain: 0.012,
    tickMask: [1, 0, 0, 0],
    leadGain: 0.03,
    bass: [0, 0, 3, 0, -2, 0, 5, 3],
    motif: [
      { beat: 1, step: 7, length: 0.45 },
      { beat: 3, step: 10, length: 0.45, pan: 0.16 },
      { beat: 5, step: 7, length: 0.45 },
      { beat: 7, step: 5, length: 0.7, pan: 0.08 },
      { beat: 11, step: 10, length: 0.45 },
      { beat: 15, step: 7, length: 0.8, pan: 0.12 }
    ],
    chords: [[0, 3, 7], [0, 5, 10], [-2, 3, 7], [0, 3, 10]]
  },
  calibration: {
    bars: 4,
    bpm: 100,
    root: 46,
    padGain: 0.026,
    lowPadGain: 0.012,
    bassGain: 0.06,
    bassMask: [1, 0, 1, 0],
    tickGain: 0.014,
    tickMask: [1, 0, 1, 0],
    leadGain: 0.026,
    bass: [0, 2, 3, 2, 7, 3, 2, 0],
    motif: [
      { beat: 0.5, step: 7, length: 0.35 },
      { beat: 2.5, step: 9, length: 0.35, pan: 0.16 },
      { beat: 4.5, step: 10, length: 0.35 },
      { beat: 6.5, step: 7, length: 0.5, pan: 0.08 },
      { beat: 8.5, step: 5, length: 0.35 },
      { beat: 12.5, step: 7, length: 0.65, pan: 0.12 }
    ],
    chords: [[0, 3, 7], [2, 5, 9], [0, 3, 10], [-2, 2, 7]]
  },
  combat: {
    bars: 4,
    bpm: 112,
    root: 42,
    padGain: 0.024,
    lowPadGain: 0.016,
    bassGain: 0.092,
    bassMask: [1, 1, 0, 1],
    bassLength: 0.42,
    kickGain: 0.12,
    kickMask: [1, 0, 1, 0],
    snareGain: 0.028,
    snareToneGain: 0.012,
    snareMask: [0, 0, 1, 0],
    leadGain: 0.024,
    bass: [0, 0, 3, 0, -2, 0, 5, 3],
    motif: [
      { beat: 1.5, step: 7, length: 0.32 },
      { beat: 3.5, step: 6, length: 0.32, pan: 0.12 },
      { beat: 5.5, step: 10, length: 0.35 },
      { beat: 7.5, step: 7, length: 0.42, pan: 0.08 },
      { beat: 9.5, step: 5, length: 0.32 },
      { beat: 13.5, step: 10, length: 0.5, pan: 0.14 }
    ],
    chords: [[0, 3, 10], [-2, 3, 7], [0, 5, 10], [1, 6, 10]]
  },
  cruise: {
    version: "v07",
    bars: 4,
    bpm: 126,
    root: 43,
    padGain: 0.022,
    lowPadGain: 0.012,
    bassGain: 0.086,
    bassMask: [1, 0, 1, 1],
    bassLength: 0.36,
    kickGain: 0.1,
    kickMask: [1, 0, 0, 1],
    snareGain: 0.022,
    snareToneGain: 0.01,
    snareMask: [0, 0, 1, 0],
    tickGain: 0.01,
    tickMask: [0, 1, 0, 1],
    leadGain: 0.022,
    bass: [0, 3, 0, 5, -2, 3, 0, 7],
    motif: [
      { beat: 0.5, step: 7, length: 0.25 },
      { beat: 2.5, step: 10, length: 0.25, pan: 0.14 },
      { beat: 4.5, step: 5, length: 0.28 },
      { beat: 6.5, step: 12, length: 0.36, pan: 0.1 },
      { beat: 8.5, step: 7, length: 0.25 },
      { beat: 10.5, step: 6, length: 0.24, pan: -0.16 },
      { beat: 12.5, step: 10, length: 0.25 },
      { beat: 14.5, step: 5, length: 0.42, pan: 0.12 }
    ],
    chords: [[0, 3, 10], [0, 5, 10], [-2, 3, 7], [1, 6, 10]]
  },
  report: {
    bars: 4,
    bpm: 82,
    root: 48,
    padGain: 0.036,
    lowPadGain: 0.014,
    bassGain: 0.045,
    bassMask: [1, 0, 0, 0],
    bassLength: 0.88,
    leadGain: 0.022,
    bass: [0, -2, 0, 3, 7, 3, 0, -2],
    motif: [
      { beat: 2, step: 7, length: 0.8 },
      { beat: 6, step: 10, length: 0.75, pan: 0.12 },
      { beat: 10, step: 12, length: 0.65 },
      { beat: 14, step: 7, length: 1.0, pan: 0.08 }
    ],
    chords: [[0, 3, 7], [3, 7, 12], [-2, 3, 10], [0, 5, 10]]
  }
};

Object.entries(bgmTracks).forEach(([id, spec]) => {
  const version = spec.version || "v06";
  const wavPath = path.join(bgmDir, `${id}_loop_${version}.wav`);
  const workPath = path.join(workDir, `${id}_loop_${version}.wav`);
  writeWavFile(wavPath, makeMusicLoop(spec));
  fs.copyFileSync(wavPath, workPath);
});

console.log(`Generated ${Object.keys(assets).length} sfx assets in ${path.relative(root, outDir)}`);
console.log(`Generated ${Object.keys(bgmTracks).length} bgm loops in ${path.relative(root, bgmDir)}`);
