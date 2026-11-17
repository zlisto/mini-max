// Mixed-strategy standoffs (Chapter 3). Book: Osborne & Rubinstein (1994).
// A mixed strategy is a probability distribution over actions (p.32). Lisa's is a 12-slice wheel, so every
// probability is a whole number of twelfths and all the arithmetic below is exact (scaled by 12).
import { MOVES, shuffle } from './games.js'
import { MIX3_POOL } from './mix3pool.js'

const rnd = (n) => Math.floor(Math.random() * n)

// 12 x (Lisa's average payoff) against each enemy column, for slice counts `w` (summing to 12).
export function colAverages12(A, w) {
  return A[0].map((_, c) => A.reduce((s, row, r) => s + w[r] * row[c], 0))
}

// What the wheel guarantees: the dealer reads it and plays the column that is worst for Lisa.
export function guarantee12(A, w) { return Math.min(...colAverages12(A, w)) }

// 2x2 game with no pure saddle point (so no single move is safe) and a mixed equilibrium in twelfths.
// rows/cols are indices into MOVES. Returns { A, rows, cols, p (twelfths), v12 }.
function make2() {
  for (let t = 0; t < 50000; t++) {
    const [a, b, c, d] = [0, 1, 2, 3].map(() => rnd(7) - 3)
    const A = [[a, b], [c, d]]
    const saddle = [0, 1].some((r) => [0, 1].some((k) => A[r][k] === Math.min(...A[r]) && A[r][k] === Math.max(A[0][k], A[1][k])))
    if (saddle) continue
    const den = a - b - c + d
    if (den === 0) continue
    const p12 = (12 * (d - c)) / den // slices on row 0 at equilibrium (Lemma 33.2: columns pay the same)
    if (!Number.isInteger(p12) || p12 < 2 || p12 > 10) continue
    if (p12 === 6 && Math.random() < 0.8) continue // keep 50/50 answers rare, so guessing an even split rarely works
    const v12 = p12 * a + (12 - p12) * c
    if (v12 !== p12 * b + (12 - p12) * d) continue
    if (Math.max(a, b, c, d) - Math.min(a, b, c, d) < 3) continue
    const rows = shuffle([0, 1, 2]).slice(0, 2)
    const cols = shuffle([0, 1, 2]).slice(0, 2)
    return { A, rows, cols, p: [p12, 12 - p12], v12 }
  }
  return { A: [[2, -1], [-1, 1]], rows: [0, 2], cols: [0, 1], p: [4, 8], v12: 4 } // fallback
}

function make3() {
  // even 4/4/4 answers are rare picks, so 'spread it evenly' is not a shortcut
  const uneven = MIX3_POOL.filter((g) => !g.p.every((x) => x === 4))
  const pool = Math.random() < 0.15 ? MIX3_POOL : uneven
  const g = pool[rnd(pool.length)]
  // relabel which move each row stands for; the columns use the same move order as the rows
  const rows = shuffle([0, 1, 2]), cols = rows.slice()
  return { A: g.A, rows, cols, p: g.p, v12: g.v12 }
}

export function makeMixGame(size = 2) { return size === 3 ? make3() : make2() }

// A starting wheel that is NOT the equilibrium, so the player has to set it.
export function startingWheel(n, p) {
  for (let t = 0; t < 100; t++) {
    const w = new Array(n).fill(0)
    for (let i = 0; i < 12; i++) w[rnd(n)]++
    if (w.some((x, i) => x !== p[i])) return w
  }
  return n === 2 ? [12, 0] : [12, 0, 0]
}

export const moveName = (i) => MOVES[i]

// Book notes for the World 2 end screen.
export const BOOK_NOTES_W2 = [
  ['Mixed strategy: a probability distribution over your actions', 'p.32'],
  ['Mixed strategy Nash equilibrium', 'Definition 32.3, p.32'],
  ['Every finite strategic game has at least one', 'Proposition 33.1, p.33'],
  ['At equilibrium your mix leaves every answer the other side uses paying the same', 'Lemma 33.2, pp.33–34; Ex. 34.1'],
  ['In a zero-sum game, seeing your equilibrium mix gains the other side nothing', 'pp.37–38'],
  ['Matching Pennies has no pure equilibrium', 'Example 17.1, p.17'],
  ['Zero-sum: equilibrium mixes = maxminimizers', 'p.36 (Prop. 22.2 applied)'],
  ['Mixed equilibrium as a steady state of frequencies', 'Section 3.2.2, pp.38–39'],
]
