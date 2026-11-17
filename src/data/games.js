// Game-theory data and solvers for the prototype.
// Book: Osborne & Rubinstein, A Course in Game Theory (1994). Page refs are printed book pages.

export const MOVES = ['punch', 'kick', 'throw']
export const MOVE_LABEL = { punch: 'Punch', kick: 'Kick', throw: 'Throw' }
export const MOVE_KEY = { punch: 'J', kick: 'K', throw: 'L' }

// Street-brawl rule (game fiction †, not from the book): each move beats one and loses to one.
// Kick beats Punch (longer reach), Punch beats Throw (faster), Throw beats Kick (catch the leg).
export const BEATS = { kick: 'punch', punch: 'throw', throw: 'kick' }

// Prologue: the Prisoner's Dilemma, Example 16.2 / Figure 17.1, p.16-17.
// Book labels: Don't Confess / Confess. Story labels: Stay quiet / Sell out.
export const PD = {
  rows: ['quiet', 'sell'],
  label: { quiet: 'Stay quiet', sell: 'Sell out' },
  bookLabel: { quiet: "Don't confess", sell: 'Confess' },
  // payoff[lisa][juno] = [lisa, juno]
  payoff: {
    quiet: { quiet: [3, 3], sell: [0, 4] },
    sell: { quiet: [4, 0], sell: [1, 1] },
  },
}

const rnd = (n) => Math.floor(Math.random() * n)
const shuffle = (a) => {
  const b = a.slice()
  for (let i = b.length - 1; i > 0; i--) { const j = rnd(i + 1); [b[i], b[j]] = [b[j], b[i]] }
  return b
}
export { shuffle }

// A standoff is a strictly competitive (zero-sum) game, Definition 21.1 p.21: Lisa's payoff u1 = A[r][c],
// the enemy's is -A[r][c]. Rows = Lisa's moves, cols = the enemy's moves (both in MOVES order).
export function rowMin(A, r) { return Math.min(...A[r]) }
export function colMax(A, c) { return Math.max(...A.map((row) => row[c])) }
// Maxminimizer for player 1, Definition 21.2 p.21: the row whose worst case is best.
export function maxminRows(A) {
  const mins = A.map((_, r) => rowMin(A, r))
  const best = Math.max(...mins)
  return mins.map((m, r) => (m === best ? r : -1)).filter((r) => r >= 0)
}
export function minmaxCols(A) {
  const maxs = A[0].map((_, c) => colMax(A, c))
  const best = Math.min(...maxs)
  return maxs.map((m, c) => (m === best ? c : -1)).filter((c) => c >= 0)
}
// Pure Nash equilibria (Definition 14.1 p.14): no player gains by deviating alone.
export function pureNash(A) {
  const out = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if (A[r][c] === rowMin(A, r) && A[r][c] === colMax(A, c)) out.push([r, c])
  }
  return out
}

// Random standoff matrix whose value (Proposition 22.2b, p.22) is `value`, at a unique saddle point
// (pure Nash equilibrium). Design rules, so no shortcut beats actually comparing worst cases:
// - a "greedy" row holds the biggest number (3) but a worse worst case;
// - a "near miss" row's worst case is just one below the value (with value +1 that row has no
//   negatives either; with value -1 the right row contains a minus);
// - every other row beats the saddle row somewhere, so the saddle row never dominates (Chapter 4).
export function makeStandoff(value = 1) {
  for (let tries = 0; tries < 100000; tries++) {
    const A = [0, 1, 2].map(() => [0, 1, 2].map(() => rnd(7) - 3)) // -3..3
    const ne = pureNash(A)
    if (ne.length !== 1) continue
    const [r, c] = ne[0]
    if (A[r][c] !== value) continue
    // unique best responses at the saddle
    if (A[r].some((v, j) => j !== c && v < value + 1)) continue
    if (A.some((row, i) => i !== r && row[c] > value - 1)) continue
    const others = [0, 1, 2].filter((i) => i !== r)
    if (!others.every((i) => A[i].some((v, j) => v > A[r][j]))) continue
    if (!others.some((i) => A[i].includes(3))) continue
    if (!others.some((i) => rowMin(A, i) === value - 1)) continue
    if (value >= 1 && A[r].includes(3)) continue // keep the biggest number off the right row
    return { A, saddle: [r, c], value }
  }
  return { A: [[2, 1, 2], [3, 0, 1], [-2, 0, 3]], saddle: [0, 1], value: 1 } // fallback
}

// Cells to hide in a "fog" phase: never in the saddle row, and each other row keeps its worst cell
// visible, so the answer can always be read off without probing.
export function fogCells(A, saddleRow) {
  const hidden = []
  for (let r = 0; r < 3; r++) {
    if (r === saddleRow) continue
    const m = rowMin(A, r)
    const worst = A[r].indexOf(m)
    const cand = shuffle([0, 1, 2].filter((c) => c !== worst))
    hidden.push(`${r},${cand[0]}`)
    if (Math.random() < 0.5) hidden.push(`${r},${cand[1]}`)
  }
  return new Set(hidden)
}

// The enemy best-responds to Lisa's recent rows (the steady-state reading of Nash equilibrium,
// section 2.1.2 p.13-14: players form expectations from past play). First exchange: its minmax column.
export function enemyPick(A, history) {
  const recent = history.slice(-3)
  if (!recent.length) return minmaxCols(A)[0]
  const freq = [0, 0, 0]
  recent.forEach((r) => freq[r]++)
  let best = 0, bestVal = Infinity
  for (let c = 0; c < 3; c++) {
    const v = freq.reduce((s, f, r) => s + f * A[r][c], 0)
    if (v < bestVal || (v === bestVal && minmaxCols(A).includes(c))) { best = c; bestVal = v }
  }
  return best
}

// Book notes shown at the end of the prototype (attribution).
export const BOOK_NOTES = [
  ['Strategic game: players, actions, preferences', 'Definition 11.1, p.11'],
  ['Nash equilibrium: no one gains by deviating alone', 'Definition 14.1, p.14'],
  ['Best-response function', 'eq. (15.1)–(15.2), p.15'],
  ["Prisoner's Dilemma (your prologue)", 'Example 16.2, Figure 17.1, pp.16–17'],
  ['Strictly competitive (zero-sum) game', 'Definition 21.1, p.21'],
  ['Maxminimizer: best worst case', 'Definition 21.2, p.21'],
  ['In zero-sum games, Nash = both maxminimize', 'Proposition 22.2, p.22'],
]
