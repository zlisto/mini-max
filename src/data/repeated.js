// Repeated games (Osborne & Rubinstein, Chapter 8).
// The constituent game is the Prisoner's Dilemma of Figure 134.1: Spar (C) or Cheap shot (D).
// Strategies are machines (Section 8.4): states, an action in each state, and a rule for the next state.
// A stream of payoffs is valued by discounting (Section 8.3): (1 - d) times the sum of d^(t-1) u_t, the
// "per round" payoff profile on p.138. A finitely repeated game is valued by the average (Section 8.10.1).

export const PD = { CC: [3, 3], CD: [0, 4], DC: [4, 0], DD: [1, 1] }
export const ACT = { C: 'Spar', D: 'Cheap shot' }

// a machine: { id, name, desc, states: { s: action }, start, next(s, mine, theirs, t, T) }
const M = {
  allC: { name: 'Always Spar', desc: 'spars every round', states: { S: 'C' }, start: 'S', next: () => 'S' },
  allD: { name: 'Always Cheat', desc: 'takes a cheap shot every round', states: { S: 'D' }, start: 'S', next: () => 'S' },
  // Figure 141.1
  grim: {
    name: 'Grim', desc: 'spars until anyone cheats, then cheats forever',
    states: { C: 'C', D: 'D' }, start: 'C', next: (s, me, th) => (s === 'C' && me === 'C' && th === 'C' ? 'C' : 'D'),
  },
  once: { name: 'One Cheap Shot', desc: 'takes one cheap shot, then spars forever', states: { D: 'D', C: 'C' }, start: 'D', next: () => 'C' },
  tft: { name: 'Copycat', desc: 'spars first, then copies your last move', states: { C: 'C', D: 'D' }, start: 'C', next: (s, me, th) => th },
  // Figure 141.2: punish a cheat for three rounds, then forgive
  m1: {
    name: 'Three and Forgive', desc: 'spars, but if you cheat it cheats for three rounds, then forgives',
    states: { P0: 'C', P1: 'D', P2: 'D', P3: 'D' }, start: 'P0',
    next: (s, me, th) => (s === 'P0' ? (th === 'D' ? 'P1' : 'P0') : s === 'P1' ? 'P2' : s === 'P2' ? 'P3' : 'P0'),
  },
  // a one-round punisher: cheating beats it below 1/2, so punishment length matters
  one: {
    name: 'One and Forgive', desc: 'spars, but if you cheat it cheats back for one round, then forgives',
    states: { P0: 'C', P1: 'D' }, start: 'P0', next: (s, me, th) => (s === 'P0' ? (th === 'D' ? 'P1' : 'P0') : 'P0'),
  },
}
// the finite circuit: Grim, except it cheats anyway in the last k rounds
export function grimLast(k) {
  return {
    name: k === 0 ? 'Grim' : `Grim, ${['', 'Last-Round', 'Last-Two', 'Last-Three'][k]} Cheat`,
    desc: k === 0 ? 'spars until anyone cheats, then cheats forever' : `like Grim, but cheats in the last ${k === 1 ? 'round' : `${k} rounds`} anyway`,
    states: { C: 'C', D: 'D' }, start: 'C', last: k,
    next: (s, me, th) => (s === 'C' && me === 'C' && th === 'C' ? 'C' : 'D'),
  }
}
export function machine(id) {
  if (typeof id === 'object') return id
  const m = M[id]
  return { id, ...m }
}

const act = (m, s, t, T) => (m.last && T && t > T - m.last ? 'D' : m.states[s])

// play two machines; returns the rounds and each side's value per round
export function play(a, b, { delta = null, T = null, show = 8 } = {}) {
  let sa = a.start, sb = b.start
  const rounds = []
  let va = 0, vb = 0, w = 1
  const N = T || 600
  for (let t = 1; t <= N; t++) {
    const x = act(a, sa, t, T), y = act(b, sb, t, T)
    const u = PD[x + y]
    if (T) { va += u[0] / T; vb += u[1] / T } else { va += (1 - delta) * w * u[0]; vb += (1 - delta) * w * u[1]; w *= delta }
    if (t <= show) rounds.push({ t, a: x, b: y, u, sa, sb })
    sa = a.next(sa, x, y, t, T); sb = b.next(sb, y, x, t, T)
  }
  return { rounds, va, vb }
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

// cards: { mode: 'disc', rival, deltas, menu } or { mode: 'finite', T, ks }
export function makeRematchCard(cfg, prev) {
  if (cfg.mode === 'finite') {
    const T = cfg.T || 6
    const k = cfg.k ?? pick(cfg.ks || [0, 1, 2])
    const rival = grimLast(k)
    const menu = [...[0, 1, 2, 3].map(grimLast), { id: 'allD', ...M.allD }]
    return finish({ mode: 'finite', T, k, rival, menu, show: T })
  }
  if (cfg.mode === 'unravel') {
    // which pair of plans is a Nash equilibrium of the six-round circuit? (Prop. 155.1)
    const T = cfg.T || 6
    const mk = (x) => (x === 'D' ? { id: 'allD', ...M.allD } : x === 'C' ? { id: 'allC', ...M.allC } : grimLast(x))
    const pairs = [[1, 1], [2, 2], ['C', 'C'], ['D', 0], ['D', 'D']].map(([a, b]) => ({ a: mk(a), b: mk(b), kind: `${a}${b}` }))
    const card = { mode: 'unravel', T, show: T, pairs, rival: { name: 'both of you', desc: 'play the plan you pick' } }
    card.order = pairs.map((_, i) => i).sort(() => Math.random() - 0.5)
    card.answer = 4
    return card
  }
  const rival = machine(pick(cfg.rival))
  let delta = cfg.sameDelta && prev && prev.delta != null ? prev.delta : cfg.delta ?? pick(cfg.deltas)
  if (cfg.otherSide && prev && prev.delta != null) {
    // the second card lands on the other side of the line, so both answers get seen
    const side = (x) => (x >= cfg.otherSide ? 1 : 0)
    delta = pick(cfg.deltas.filter((x) => side(x) !== side(prev.delta)))
  }
  const menu = (cfg.menu || ['allC', 'allD', 'tft', 'once']).map(machine)
  return finish({ mode: 'disc', delta, rival, menu, show: 8, who: cfg.who })
}

function finish(card) {
  const opts = { delta: card.delta, T: card.mode === 'finite' ? card.T : null, show: card.show }
  card.values = card.menu.map((m) => play(m, card.rival, opts).va)
  card.best = Math.max(...card.values)
  card.order = card.menu.map((_, i) => i).sort(() => Math.random() - 0.5) // menu order shuffled each deal
  return card
}

export const BOOK_NOTES_W7 = [
  ['Repetition can make cooperation stable in the Prisoner’s Dilemma', 'Section 8.1, Figure 134.1, pp.133–134'],
  ['A stream of payoffs is valued with a discount factor', 'Section 8.3, pp.137–138'],
  ['A strategy can be carried out by a machine', 'Section 8.4, Figures 141.1–142.2, pp.140–143'],
  ['Nobody can be held below the minmax payoff', 'minmax payoff (143.2) and Proposition 144.1, pp.143–144'],
  ['Trigger strategies sustain cooperation when the future matters', 'Propositions 144.3 and 145.2, pp.144–145'],
  ['A punishment that hurts the punisher is not credible', 'Figure 146.1, pp.145–146'],
  ['With a known last round, the Prisoner’s Dilemma unravels', 'Propositions 155.1 and 157.2, pp.155–158'],
]
