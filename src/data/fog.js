// Extensive games with imperfect information (Osborne & Rubinstein, Chapter 11).
// plan:   Fig. 202.1's shape. A pure strategy picks one action at each information set (Def. 203.1).
// kuhn:   Fig. 216.1's shape. A mixed strategy and its outcome-equivalent behavioral strategy (Prop. 214.1, Ex. 216.1).
// driver: Fig. 214.1. With imperfect recall a behavioral strategy can beat every mixed one (Section 11.5, p.216).
// bluff:  Exercise 217.3, the card game where player 2 never sees the card.

const pick = (a) => a[Math.floor(Math.random() * a.length)]
export const TENTHS = Array.from({ length: 11 }, (_, i) => i / 10)
const r1 = (x) => Math.round(x * 1000) / 1000

// ---- plan ---------------------------------------------------------------------------------------
// Lisa: walk away (ends, worth `away`) or step in. Smokey then plays high (prob pA) or low, unseen by her.
// In the fog she ducks or swings. u = { hd, hs, ld, ls }: her payoff after high/low and duck/swing.
export const PLANS = [
  { id: 'in-duck', name: 'Step in, then duck', first: 'in', fog: 'duck' },
  { id: 'in-swing', name: 'Step in, then swing', first: 'in', fog: 'swing' },
  { id: 'away-duck', name: 'Walk away, and duck if it ever came to it', first: 'away', fog: 'duck' },
  { id: 'away-swing', name: 'Walk away, and swing if it ever came to it', first: 'away', fog: 'swing' },
  { id: 'peek', name: 'Step in, then duck if he played high and swing if he played low', first: 'in', peek: true },
]

export function planValue(card, id) {
  const { pA, u, away } = card
  const P = PLANS.find((x) => x.id === id)
  if (P.first === 'away') return away
  if (P.peek) return pA * u.hd + (1 - pA) * u.ls
  return P.fog === 'duck' ? pA * u.hd + (1 - pA) * u.ld : pA * u.hs + (1 - pA) * u.ls
}

function makePlan() {
  for (;;) {
    const pA = pick([0.2, 0.3, 0.7, 0.8])
    const u = { hd: 2 + Math.floor(Math.random() * 8), hs: Math.floor(Math.random() * 4), ld: Math.floor(Math.random() * 4), ls: 2 + Math.floor(Math.random() * 8) }
    const away = 1 + Math.floor(Math.random() * 6)
    const card = { mode: 'plan', pA, u, away }
    const vals = Object.fromEntries(PLANS.map((p) => [p.id, r1(planValue(card, p.id))]))
    const real = PLANS.filter((p) => !p.peek).map((p) => vals[p.id])
    const best = Math.max(...real)
    const second = Math.max(...real.filter((v) => v < best - 1e-9))
    if (best - second < 0.5) continue // a clear best plan
    if (vals.peek < best + 1) continue // the impossible plan must tempt
    if (vals['in-duck'] === best && vals['in-swing'] === best) continue
    card.vals = vals
    card.best = PLANS.filter((p) => !p.peek && vals[p.id] > best - 1e-9).map((p) => p.id)
    card.order = PLANS.map((p) => p.id).sort(() => Math.random() - 0.5)
    return card
  }
}

// ---- kuhn ---------------------------------------------------------------------------------------
// Lisa takes the stairs (A, ends at the fog-free exit) or the hall (B); after the hall Smokey moves, and
// then she is in the fog and ducks or swings. Her mixed strategy: (hall, swing) a, (hall, duck) b, (stairs, duck) c.
const KUHN = [[0.4, 0.1], [0.3, 0.3], [0.2, 0.3], [0.1, 0.4], [0.3, 0.2], [0.2, 0.2], [0.6, 0.4], [0.2, 0.6], [0.1, 0.1], [0.4, 0.4], [0.3, 0.7], [0.1, 0.3]]
function makeKuhn(cfg = {}) {
  for (;;) {
    const [a, b] = cfg.book ? [0.4, 0.1] : pick(KUHN) // the book's numbers: (B, r) 0.4, (B, l) 0.1, (A, l) 0.5
    const ans = r1(a / (a + b))
    if (!TENTHS.some((t) => Math.abs(t - ans) < 1e-9)) continue
    return { mode: 'kuhn', a, b, c: r1(1 - a - b), hall: r1(a + b), ans, book: !!cfg.book }
  }
}

// ---- driver -------------------------------------------------------------------------------------
// Each door looks the same, and she can't remember passing one (imperfect recall). At each door she walks on
// with probability p. Payoffs: turn at the first door x, at the second y, walk past both z. The book's is (0, 1, 0).
// each peaks exactly on a tenth: (x, y, 0) at (y − x)/2y and (0, y, z) at y/2(y − z)
export const DRIVER_SETS = [[3, 5, 0], [1, 5, 0], [0, 6, 1], [0, 8, 3]]
export const driverValue = (c, p) => (1 - p) * c.x + p * (1 - p) * c.y + p * p * c.z
function makeDriver(cfg) {
  for (;;) {
    const [x, y, z] = cfg.book ? [0, 1, 0] : pick(DRIVER_SETS)
    const card = { mode: 'driver', x, y, z, book: !!cfg.book }
    const vals = TENTHS.map((p) => driverValue(card, p))
    const best = Math.max(...vals)
    const at = vals.findIndex((v) => v > best - 1e-9)
    if (vals.filter((v) => v > best - 1e-9).length > 1) continue
    if (at === 0 || at === 10) continue // the point is that no pure plan is best
    return { ...card, vals, ans: at, best }
  }
}

// ---- bluff --------------------------------------------------------------------------------------
// Velma draws high or low, each half the time; Lisa never sees it. Low: she may say so and pay Lisa 1, or claim
// high. High: she claims high. To a claim, Lisa concedes (pays 1) or insists (sees the card: low pays Lisa k,
// high costs Lisa k). Lisa insists with probability q; Velma bluffs her low cards iff that pays her.
export function bluffOutcome(k, q) {
  const bluffPays = (1 - q) * 1 + q * -k > -1 + 1e-9
  const indifferent = Math.abs((1 - q) - q * k + 1) < 1e-9
  const lisaIfBluff = -(1 - q) // averaged over high and low cards
  const lisaIfHonest = (q * (1 - k)) / 2
  const lisa = indifferent ? Math.min(lisaIfBluff, lisaIfHonest) : bluffPays ? lisaIfBluff : lisaIfHonest
  return { bluffs: indifferent ? 'either' : bluffPays ? 'always' : 'never', lisa }
}
function makeBluff(cfg) {
  const k = cfg.k ?? pick([9, 19])
  const ans = Math.round((2 / (1 + k)) * 10)
  return { mode: 'bluff', k, ans, value: bluffOutcome(k, ans / 10).lisa }
}

export function makeFogCard(cfg) {
  if (cfg.mode === 'plan') return makePlan()
  if (cfg.mode === 'kuhn') return makeKuhn(cfg)
  if (cfg.mode === 'driver') return makeDriver(cfg)
  return makeBluff(cfg)
}

export const BOOK_NOTES_W9 = [
  ['An information set groups the points a player cannot tell apart', 'Def. 200.1, pp.200–201'],
  ['A game where a player cannot see the move before hers', 'Ex. 202.1, Fig. 202.1, p.202'],
  ['A plan picks one action for each information set', 'Def. 203.1, p.203'],
  ['Perfect recall means never forgetting what you knew or did', 'Def. 203.3, p.203'],
  ['Mixed strategies and behavioral strategies', 'Def. 212.1, pp.212–213'],
  ['With perfect recall, each mixed plan has a behavioral twin', 'Prop. 214.1, pp.214–215'],
  ['Turning a mix of plans into a chance at each point', 'Exercise 216.1, p.216'],
  ['A forgetful player can gain by mixing at every step', 'Fig. 214.1, pp.214, 216'],
  ['A bluffing card game', 'Exercise 217.3, p.217'],
]
