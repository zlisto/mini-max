// Synthesized sound effects (Web Audio, no files). Everything routes through Phaser's master output, so the
// game's mute (M key, localStorage 'minimax-muted') silences these too.
//   import { sfx } from '../systems/sfx.js';  sfx(scene, 'hit')

let noiseBuf = null

function setup(scene) {
  const sm = scene.sound
  const ctx = sm.context
  if (!ctx || !sm.destination || ctx.state !== 'running') return null
  if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  return { ctx, out: sm.destination, t: ctx.currentTime + 0.005 }
}

const vary = (x, amt = 0.08) => x * (1 + (Math.random() * 2 - 1) * amt)

function env(ctx, t, peak, attack, decay) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  return g
}

// pitched tone with an optional glide
function tone({ ctx, out, t }, { type = 'sine', f0, f1 = f0, dur = 0.1, vol = 0.3, attack = 0.004, delay = 0 }) {
  const o = ctx.createOscillator()
  o.type = type
  const s = t + delay
  o.frequency.setValueAtTime(f0, s)
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + dur)
  const g = env(ctx, s, vol, attack, dur)
  o.connect(g).connect(out)
  o.start(s)
  o.stop(s + attack + dur + 0.02)
}

// filtered noise burst with an optional filter sweep
function noise({ ctx, out, t }, { type = 'bandpass', f0 = 1000, f1 = f0, q = 1, dur = 0.1, vol = 0.3, attack = 0.004, delay = 0 }) {
  const src = ctx.createBufferSource()
  src.buffer = noiseBuf
  const f = ctx.createBiquadFilter()
  f.type = type
  f.Q.value = q
  const s = t + delay
  f.frequency.setValueAtTime(f0, s)
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, s + dur)
  const g = env(ctx, s, vol, attack, dur)
  src.connect(f).connect(g).connect(out)
  src.start(s, Math.random() * 0.5)
  src.stop(s + attack + dur + 0.02)
}

const SOUNDS = {
  // combat
  whoosh: (a) => noise(a, { f0: vary(700), f1: vary(2600), q: 1.4, dur: 0.13, vol: 0.32, attack: 0.03 }),
  whooshBig: (a) => noise(a, { f0: vary(2200), f1: vary(500), q: 1.1, dur: 0.24, vol: 0.38, attack: 0.05 }),
  hit: (a) => {
    tone(a, { f0: vary(150), f1: 55, dur: 0.12, vol: 0.7 })
    noise(a, { type: 'highpass', f0: 1800, dur: 0.05, vol: 0.35 })
  },
  hitHeavy: (a) => {
    tone(a, { f0: vary(120), f1: 38, dur: 0.22, vol: 0.85 })
    noise(a, { type: 'lowpass', f0: 2400, f1: 300, dur: 0.16, vol: 0.5 })
    noise(a, { type: 'highpass', f0: 2500, dur: 0.04, vol: 0.3 })
  },
  hurt: (a) => {
    tone(a, { type: 'triangle', f0: vary(260), f1: 90, dur: 0.16, vol: 0.45 })
    noise(a, { type: 'bandpass', f0: 900, q: 0.8, dur: 0.1, vol: 0.4 })
  },
  block: (a) => {
    tone(a, { type: 'square', f0: vary(1250, 0.04), dur: 0.09, vol: 0.12 })
    tone(a, { type: 'sine', f0: vary(1870, 0.04), dur: 0.16, vol: 0.18 })
    noise(a, { type: 'highpass', f0: 3000, dur: 0.03, vol: 0.25 })
  },
  thud: (a) => {
    tone(a, { f0: 95, f1: 32, dur: 0.32, vol: 0.8 })
    noise(a, { type: 'lowpass', f0: 600, f1: 120, dur: 0.25, vol: 0.45 })
  },
  // standoffs
  freeze: (a) => {
    tone(a, { f0: 320, f1: 55, dur: 0.6, vol: 0.5, attack: 0.02 })
    noise(a, { type: 'bandpass', f0: 300, f1: 3500, q: 2, dur: 0.45, vol: 0.18, attack: 0.3 })
    tone(a, { type: 'triangle', f0: 1046, dur: 0.5, vol: 0.06, delay: 0.25 })
  },
  pick: (a) => tone(a, { type: 'triangle', f0: 660, f1: 990, dur: 0.07, vol: 0.18 }),
  clash: (a) => {
    SOUNDS.hit(a)
    tone(a, { type: 'sine', f0: 2093, dur: 0.25, vol: 0.12, delay: 0.01 })
  },
  clean: (a) => [523, 659, 784, 1046].forEach((f, i) => tone(a, { type: 'triangle', f0: f, dur: 0.14, vol: 0.16, delay: i * 0.06 })),
  punished: (a) => [392, 311, 233].forEach((f, i) => tone(a, { type: 'square', f0: f, dur: 0.12, vol: 0.09, delay: i * 0.09 })),
  tick: (a) => {
    tone(a, { type: 'sine', f0: 1600, dur: 0.03, vol: 0.18 })
    noise(a, { type: 'bandpass', f0: 2500, q: 4, dur: 0.02, vol: 0.2 })
  },
  // ui & story
  blip: (a, pitch = 1) => tone(a, { type: 'square', f0: 520 * pitch * vary(1, 0.03), dur: 0.025, vol: 0.05, attack: 0.002 }),
  advance: (a) => {
    tone(a, { type: 'triangle', f0: 880, dur: 0.04, vol: 0.13 })
    tone(a, { type: 'triangle', f0: 1320, dur: 0.06, vol: 0.13, delay: 0.045 })
  },
  select: (a) => [784, 1046, 1568].forEach((f, i) => tone(a, { type: 'triangle', f0: f, dur: 0.08, vol: 0.14, delay: i * 0.04 })),
  hover: (a) => tone(a, { type: 'sine', f0: 1200, dur: 0.03, vol: 0.06 }),
  go: (a) => [523, 659, 784, 1046].forEach((f, i) => tone(a, { type: 'square', f0: f, dur: i === 3 ? 0.3 : 0.08, vol: 0.08, delay: i * 0.08 })),
  page: (a) => [1046, 1318, 1568, 2093, 2637].forEach((f, i) => tone(a, { type: 'sine', f0: f, dur: 0.18, vol: 0.12, delay: i * 0.07 })),
  ko: (a) => {
    SOUNDS.thud(a)
    ;[392, 330, 262, 196].forEach((f, i) => tone(a, { type: 'square', f0: f, dur: 0.18, vol: 0.08, delay: 0.15 + i * 0.16 }))
  },
  sting: (a) => {
    tone(a, { f0: 180, f1: 60, dur: 0.5, vol: 0.5 })
    ;[294, 349, 415].forEach((f, i) => tone(a, { type: 'sawtooth', f0: f, dur: 0.5, vol: 0.05, delay: 0.02 }))
  },
}

// Speaker voices for dialogue blips (pitch multipliers).
export const VOICE = { lisa: 1.25, tempo: 1.7, zero: 0.62, juno: 1.15, sadie: 1.05, brick: 0.5, grunt: 0.75, penny: 0.95, lou: 0.8, dealer: 0.85, echo: 0, mira: 1.0, mimic: 0.75, flicker: 1.3, vox: 0.7, signal: 0.8, bluster: 0.8, chains: 0.45, bluffer: 0.85 }

export function sfx(scene, name, arg) {
  try {
    const a = setup(scene)
    if (a && SOUNDS[name]) SOUNDS[name](a, arg)
  } catch { /* audio is optional */ }
}
