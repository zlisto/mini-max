// Bargaining games of alternating offers (Osborne & Rubinstein, Chapter 7).
// A pile of 100 coins. In round t one side proposes a split and the other accepts or rejects (Section 7.2).
// Each round of waiting, the wind takes a share of what each side will get: a coin a round later is worth
// d_i of a coin now (preferences d_i^t x_i, Example 125.1, p.125). The game's ladder has a last round (†):
// refuse the last offer and the pile is gone. Solved from the bottom up, the proposer offers exactly what the
// responder would get by waiting, the responder accepts, and the deal is struck at once (Prop. 122.1, p.122).
// Coins are whole (†): an offer has to reach what waiting is worth, so it is rounded up.

export const PIE = 100

// rounds: [{ proposer, offer, keep }] from round 0 down, where offer goes to the responder
export function solveLadder({ T, first, d }) {
  const rows = new Array(T)
  for (let t = T - 1; t >= 0; t--) {
    const p = (first + t) % 2, r = 1 - p
    const next = t === T - 1 ? 0 : rows[t + 1].keep // what the responder keeps when he proposes next round
    const worth = d[r] * next // that, after one round of wind
    const offer = Math.ceil(worth - 1e-9)
    rows[t] = { t, proposer: p, responder: r, next, worth, offer, keep: PIE - offer }
  }
  return rows
}

// The book's endless game with these winds: the first proposer keeps (1 - d2)/(1 - d1 d2) of the pie,
// written for whoever proposes first (Example 125.1, p.125)
export function endlessShare({ first, d }) {
  const me = d[first], them = d[1 - first]
  return (PIE * (1 - them)) / (1 - me * them)
}

const pick = (a) => a[Math.floor(Math.random() * a.length)]

// The endless game (Section 7.2): the shares each side keeps when it proposes, from (122.2) in coins:
// the rival is offered d_r times what she keeps when she proposes, and Lisa is offered d_l times hers.
export function endlessKeeps(d) {
  const lisa = (PIE * (1 - d[1])) / (1 - d[0] * d[1]) // Lisa's keep when Lisa proposes
  const rival = (PIE * (1 - d[0])) / (1 - d[0] * d[1]) // the rival's keep when she proposes
  return { lisa, rival }
}

// card configs: { mode: 'ladder' | 'endless', T, first: 0 (Lisa) | 1 (rival) | 'any', d: 'equal' | 'apart', respond? }
export function makeBargainCard(cfg) {
  if (cfg.mode === 'endless') return endlessCard(cfg)
  const first = cfg.first === 'any' ? (Math.random() < 0.5 ? 0 : 1) : cfg.first
  let d
  if (cfg.d === 'apart') {
    const [a, b] = pick([[0.9, 0.5], [0.9, 0.6], [0.8, 0.5], [0.5, 0.9], [0.6, 0.9], [0.5, 0.8]])
    d = [a, b]
  } else {
    const x = cfg.delta ?? pick([0.5, 0.6, 0.75, 0.8, 0.9].filter((v) => !(cfg.avoid || []).includes(v)))
    d = [x, x]
  }
  const rows = solveLadder({ T: cfg.T, first, d })
  let offer = null
  if (cfg.respond) {
    // the rival's actual opening offer to Lisa, a little off the equilibrium one either way
    const eq = rows[0].offer
    const deltaX = pick([-12, -9, -6, -4, 4, 7, 10])
    offer = Math.max(0, Math.min(PIE, eq + deltaX))
    if (offer === eq) offer = Math.max(0, eq - 5)
  }
  return { ...cfg, first, d, rows, offer, endless: endlessShare({ first, d }) }
}

function endlessCard(cfg) {
  let d
  // apart: the card says whether Lisa is the more patient side, so a phase can play both directions
  if (cfg.d === 'apart') d = pick(cfg.lisaPatient === false ? [[0.6, 0.9], [0.5, 0.8], [0.75, 0.9]] : [[0.9, 0.6], [0.8, 0.5], [0.9, 0.75]])
  else {
    // 0.9 is left out: with whole coins its loop band dips to an even split, and going first should visibly pay
    const pool = [0.5, 0.6, 0.75, 0.8], fresh = pool.filter((v) => !(cfg.avoid || []).includes(v))
    const x = cfg.delta ?? pick(fresh.length ? fresh : pool); d = [x, x]
  }
  const keeps = endlessKeeps(d)
  let offer = null
  if (cfg.respond) {
    // the rival opens; Lisa should accept exactly when the offer reaches what waiting is worth to her
    const worth = d[0] * keeps.lisa
    offer = Math.max(0, Math.min(PIE, Math.round(worth) + pick([-7, -3, -1, 0, 1, 2, 6])))
  }
  return { ...cfg, mode: 'endless', first: cfg.respond ? 1 : 0, d, keeps, offer }
}

export const BOOK_NOTES_W6 = [
  ['Players take turns proposing, and the other accepts or rejects', 'Section 7.2, Figure 120.1, pp.118–120'],
  ['Time is valuable, so a deal later is worth less', 'Section 7.2, p.119'],
  ['Splitting a pie when both sides are impatient', 'Examples 120.1 and 125.1, pp.120 and 125'],
  ['Nash equilibria can rest on a threat to reject that is not credible', 'Section 7.2, p.121'],
  ['The subgame perfect deal is reached at once', 'Proposition 122.1, pp.122–125'],
  ['Each side offers just what the other gets by waiting', 'Proposition 122.1 and (122.2), p.122'],
  ['The first proposer has an advantage', 'First mover advantage, p.126'],
  ['The more impatient side does worse', 'Proposition 126.1, p.126'],
]
