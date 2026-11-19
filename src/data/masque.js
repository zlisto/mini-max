// World 10 (Chapter 12, sequential equilibrium): beliefs at an information set, Bayes' rule,
// signalling (Beer or Quiche) and trembling hands. Every answer is computed from the book's definitions.
//
//  bayes:     Fig. 220.1. Domino bows out (L) or dances M or R behind his mask. Lisa can't tell M from R.
//             She derives her belief from his strategy by Bayes' rule (p.221), then plays the best reply to it
//             (sequential rationality, Def. 224.1). His mix is ours †.
//  never:     Fig. 219.1. Domino always bows out, so her information set is never reached. L is still better
//             than R whatever she believes, so the Nash equilibrium (L,R) is ruled out (p.219-220).
//  dominated: Fig. 244.1, Ex. 244.1. M is strictly dominated for Domino, so a reasonable belief puts nothing on it.
//  posterior: Ex. 244.2, Fig. 245.1 (Beer or Quiche). Lisa sees the order, works out the chance the guest is weak
//             (Bayesian updating, Def. 232.1) and fights only if weak is at least as likely as strong.
//  intuit:    Ex. 244.2, the second pooling equilibrium (everyone eats quiche). Who could gain from beer?
//  tremble:   Fig. 248.1. Three Nash equilibria; only (B,B) survives slips (Def. 248.1).

const pick = (a) => a[Math.floor(Math.random() * a.length)]
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1])
const near = (a, b) => Math.abs(a - b) < 1e-9
export const d1 = (x) => (Math.round(x * 100) / 100).toString()
export const fmt = (x) => d1(x).replace('-', '−')

// ---- Fig. 220.1 / 219.1 / 244.1: Lisa's payoffs at her information set {M, R} ------------------------------
// u[history][action] for Lisa (player 2); dom[history][action] for Domino (player 1)
export const TREES = {
  f220: { fig: 'Figure 220.1', out: 2, u: { M: { L: 1, R: 2 }, R: { L: 2, R: 1 } }, dom: { out: 2, M: { L: 3, R: 0 }, R: { L: 0, R: 1 } } },
  f219: { fig: 'Figure 219.1', out: 2, u: { M: { L: 1, R: 0 }, R: { L: 2, R: 1 } }, dom: { out: 2, M: { L: 3, R: 0 }, R: { L: 0, R: 1 } } },
  f244: { fig: 'Figure 244.1', out: 2, acts: ['l', 'r'], u: { M: { l: 3, r: 0 }, R: { l: 0, r: 1 } }, dom: { out: 2, M: { l: 1, r: 0 }, R: { l: 0, r: 5 } } },
}

// expected payoff to Lisa of an action, given her belief mu that the history was M
export const ev = (t, act, mu) => mu * t.u.M[act] + (1 - mu) * t.u.R[act]

// Domino's mixes (bow out, M, R) whose belief lands on a tenth that isn't the tie at one half †
const MIXES = [
  [0.5, 0.1, 0.4], [0.5, 0.2, 0.3], [0.5, 0.3, 0.2], [0.5, 0.4, 0.1],
  [0.75, 0.05, 0.2], [0.75, 0.15, 0.1], [0.75, 0.2, 0.05], [0.75, 0.1, 0.15],
  [0, 0.3, 0.7], [0, 0.8, 0.2], [0.2, 0.08, 0.72], [0.2, 0.56, 0.24],
]

// ---- Fig. 245.1: Beer or Quiche ---------------------------------------------------------------------------
// guest's payoff: 2 if Lisa doesn't fight, plus 1 for his favourite breakfast (beer if strong, quiche if weak)
export const guestPay = (type, order, fight) => (fight ? 0 : 2) + ((type === 'strong') === (order === 'beer') ? 1 : 0)
// Lisa's payoff: 1 for fighting a weak guest or leaving a strong one alone
export const lisaPay = (type, fight) => ((type === 'weak') === fight ? 1 : 0)

// all variant guest lists †: chance weak pw, beer rates for each type, the order seen; the belief lands on a tenth
const SIGNALS = (() => {
  const out = []
  for (let w = 1; w <= 9; w++) for (let s = 0; s <= 10; s++) for (let k = 0; k <= 10; k++) for (const order of ['beer', 'quiche']) {
    const pw = w / 10, bs = s / 10, bw = k / 10
    const ps = order === 'beer' ? bs : 1 - bs, pk = order === 'beer' ? bw : 1 - bw
    const tot = (1 - pw) * ps + pw * pk
    if (tot < 0.05) continue
    const mu = (pw * pk) / tot
    if (!near(mu * 10, Math.round(mu * 10)) || near(mu, 0.5)) continue
    if (near(mu, pw)) continue // the order has to move the belief, or the card repeats the book's pooling card
    if ((near(mu, 0) || near(mu, 1)) && Math.random() < 0.97) continue // keep certain beliefs rare
    if ((pw > 0.5) === (mu > 0.5) && Math.random() < 0.5) continue // favour orders that flip the decision
    out.push({ pw, bs, bw, order, mu })
  }
  return out
})()

// ---- Fig. 248.1 ---------------------------------------------------------------------------------------------
// row = Lisa, column = the Contessa; [Lisa, Contessa]
export const F248 = { A: { A: [0, 0], B: [0, 0], C: [0, 0] }, B: { A: [0, 0], B: [1, 1], C: [2, 0] }, C: { A: [0, 0], B: [0, 2], C: [2, 2] } }
const STEPS = ['waltz', 'tango', 'minuet']

// ---- the cards ----------------------------------------------------------------------------------------------
export function makeMasqueCard(cfg) {
  const mode = cfg.mode
  if (mode === 'bayes') {
    const t = TREES.f220
    const [o, m, r] = pick(MIXES)
    const mu = m / (m + r)
    const best = ev(t, 'R', mu) > ev(t, 'L', mu) ? 'R' : 'L'
    return { mode, tree: t, mix: { out: o, M: m, R: r }, mu, best }
  }
  // the never and dominated cards sometimes swap the letters on the tree, so the answer isn't always the same letter †
  if (mode === 'never') return { mode, tree: TREES.f219, best: 'L', opts: shuffle(['L', 'R', 'none']), show: Math.random() < 0.5 ? { L: 'R', R: 'L' } : {}, leaves: shuffle(['L', 'R']), flipX: Math.random() < 0.5 }
  if (mode === 'dominated') return { mode, tree: TREES.f244, best: 'r', why: 'R', whyOpts: shuffle(['M', 'R', 'either']), opts: shuffle(['l', 'r']), show: Math.random() < 0.5 ? { dM: 'R', dR: 'M', l: 'r', r: 'ℓ' } : {}, leaves: shuffle(['l', 'r']), flipX: Math.random() < 0.5 }
  if (mode === 'posterior') {
    // a pooling variant †: both kinds order alike, so the belief stays at the prior
    const pool = () => { const pw = pick([0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9]), r = pick([0.6, 0.8, 1]); return { pw, bs: r, bw: r, order: 'beer', mu: pw } }
    const s = cfg.book ? { pw: 0.1, bs: 1, bw: 1, order: 'beer', mu: 0.1 } : cfg.pooling ? pool() : pick(SIGNALS)
    return { mode, book: !!cfg.book, pooling: !!cfg.pooling, ...s, best: s.mu > 0.5 ? 'fight' : 'leave', opts: shuffle(['fight', 'leave']) }
  }
  // intuit: the book's all-quiche equilibrium (beer is the odd order), or its all-beer twin (quiche is the odd order) †
  if (mode === 'intuit') {
    const pool = cfg.pool || pick(['quiche', 'beer'])
    return pool === 'quiche'
      ? { mode, pool, odd: 'beer', who: 'strong', whoOpts: shuffle(['strong', 'weak', 'both', 'neither']), best: 'leave', opts: shuffle(['fight', 'leave']) }
      : { mode, pool, odd: 'quiche', who: 'weak', whoOpts: shuffle(['strong', 'weak', 'both', 'neither']), best: 'fight', opts: shuffle(['fight', 'leave']) }
  }
  // tremble: the book's game with its three steps given dance names in a random order
  const names = shuffle(STEPS)
  const label = { A: names[0], B: names[1], C: names[2] }
  return { mode: 'tremble', label, order: shuffle(['A', 'B', 'C']), best: 'B' }
}

export const BOOK_NOTES_W10 = [
  ['A belief says which spot you think you are in', 'Sec. 12.1, p.220'],
  ['An assessment is strategies plus beliefs', 'Def. 222.1, p.222'],
  ['Sequential rationality means the best move at every information set', 'Def. 224.1'],
  ["Consistent beliefs are limits of Bayes' rule under tiny slips", 'p.221, Def. 224.2'],
  ['A plan for a spot nobody reaches still counts', 'Fig. 219.1, p.219'],
  ['A refinement puts no belief on a strictly dominated move', 'Ex. 244.1'],
  ['In a signalling game, a message can change beliefs about types', 'Sec. 12.3.1'],
  ['Beer or Quiche, and which beliefs are reasonable', 'Ex. 244.2, Fig. 245.1'],
  ['Trembling hand perfect equilibrium', 'Def. 248.1, Fig. 248.1'],
]
