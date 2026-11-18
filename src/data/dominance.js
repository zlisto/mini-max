// Iterated elimination of strictly dominated actions (Chapter 4). Book: Osborne & Rubinstein (1994).
// A card is a two-player game: U[r][c] = [Lisa's points, rival's points].
// - strictly dominated (Definition 59.2, p.59): some mixed strategy does strictly better against every remaining
//   action of the other side. Here we test pure actions and mixes of two or three remaining actions.
// - Lemma 60.1 (p.60): in a finite game that is the same as never being a best response to any belief.
// - Proposition 61.2 (p.61): what survives the elimination is exactly the set of rationalizable actions, and
//   the order of elimination does not matter.
// - weakly dominated (Definition 62.1, p.62): at least as good everywhere and better somewhere. Not enough here.

import { shuffle } from './games.js'

const rnd = (n) => Math.floor(Math.random() * n)

// payoff of side s (0 = Lisa/rows, 1 = rival/cols) for its action a against the other side's action b
const pay = (U, s, a, b) => (s === 0 ? U[a][b][0] : U[b][a][1])

// Is `a` strictly dominated for side s, given the remaining actions mine (own) and theirs (other side)?
// Returns null, or { by: [[action, weight], ...] } describing a dominating pure action or mix.
export function dominator(U, s, a, mine, theirs) {
  const others = mine.filter((x) => x !== a)
  const beats = (w) => theirs.every((b) => w.reduce((t, [x, p]) => t + p * pay(U, s, x, b), 0) > pay(U, s, a, b) + 1e-9)
  for (const x of others) if (beats([[x, 1]])) return { by: [[x, 1]] }
  // an even split first: it is what Tempo teaches the player to try
  for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) {
    if (beats([[others[i], 0.5], [others[j], 0.5]])) return { by: [[others[i], 0.5], [others[j], 0.5]] }
  }
  // two-way mixes: solve the interval of p exactly
  for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) {
    const x = others[i], y = others[j]
    let lo = 0, hi = 1
    for (const b of theirs) {
      // p*X + (1-p)*Y > A  ->  p*(X-Y) > A - Y
      const X = pay(U, s, x, b), Y = pay(U, s, y, b), A = pay(U, s, a, b)
      const d = X - Y, rhs = A - Y
      if (Math.abs(d) < 1e-12) { if (!(0 > rhs)) { lo = 2; break } } // need Y > A
      else if (d > 0) lo = Math.max(lo, rhs / d + 1e-9)
      else hi = Math.min(hi, rhs / d - 1e-9)
    }
    if (lo <= hi) {
      const p = lo > 0 || hi < 1 ? (Math.max(lo, 0) + Math.min(hi, 1)) / 2 : 0.5
      const nice = [0.5, 1 / 3, 2 / 3, 0.25, 0.75].find((q) => q >= lo && q <= hi)
      const q = nice ?? p
      return { by: [[x, q], [y, 1 - q]] }
    }
  }
  // three-way mixes, exactly: weights (p, q, 1-p-q) live in a triangle, and each of the other side's actions
  // gives one strict linear inequality. The feasible set is open, so if it is not empty, the centroid of the
  // vertices of its closure lies inside it.
  if (others.length >= 3) {
    for (let i = 0; i < others.length; i++) for (let j = i + 1; j < others.length; j++) for (let k = j + 1; k < others.length; k++) {
      const [x, y, z] = [others[i], others[j], others[k]]
      // lines a*p + c*q >= d
      const L = theirs.map((b) => { const Z = pay(U, s, z, b); return [pay(U, s, x, b) - Z, pay(U, s, y, b) - Z, pay(U, s, a, b) - Z] })
      const S = [[1, 0, 0], [0, 1, 0], [-1, -1, -1]] // p >= 0, q >= 0, p + q <= 1
      const all = [...L, ...S]
      const pts = []
      for (let u = 0; u < all.length; u++) for (let v = u + 1; v < all.length; v++) {
        const [a1, c1, d1] = all[u], [a2, c2, d2] = all[v]
        const det = a1 * c2 - a2 * c1
        if (Math.abs(det) < 1e-12) continue
        const p = (d1 * c2 - d2 * c1) / det, q = (a1 * d2 - a2 * d1) / det
        if (all.every(([aa, cc, dd]) => aa * p + cc * q >= dd - 1e-9)) pts.push([p, q])
      }
      if (!pts.length) continue
      const p = pts.reduce((t, v) => t + v[0], 0) / pts.length, q = pts.reduce((t, v) => t + v[1], 0) / pts.length
      const w = [[x, p], [y, q], [z, 1 - p - q]]
      if (p > -1e-12 && q > -1e-12 && p + q < 1 + 1e-12 && beats(w)) return { by: w.filter(([, wt]) => wt > 1e-9) }
    }
  }
  return null
}

// pure-only dominance (used to tell the generator which steps need a mix)
const pureDom = (U, s, a, mine, theirs) => mine.some((x) => x !== a && theirs.every((b) => pay(U, s, x, b) > pay(U, s, a, b)))

export function weaklyOnly(U, s, a, mine, theirs) {
  if (dominator(U, s, a, mine, theirs)) return null
  for (const x of mine) {
    if (x === a) continue
    const ge = theirs.every((b) => pay(U, s, x, b) >= pay(U, s, a, b))
    const gt = theirs.some((b) => pay(U, s, x, b) > pay(U, s, a, b))
    if (ge && gt) return x
  }
  return null
}

// Run the elimination to the end (order does not matter, Prop. 61.2). Returns the survivors and the steps.
export function eliminate(U, n, m) {
  let rows = [...Array(n).keys()], cols = [...Array(m).keys()]
  const steps = []
  for (let guard = 0; guard < 20; guard++) {
    let moved = false
    for (const r of rows) {
      const d = dominator(U, 0, r, rows, cols)
      if (d) { steps.push({ s: 0, a: r, mix: d.by.length > 1, rowsLeft: rows.length, colsLeft: cols.length }); rows = rows.filter((x) => x !== r); moved = true; break }
    }
    if (moved) continue
    for (const c of cols) {
      const d = dominator(U, 1, c, cols, rows)
      if (d) { steps.push({ s: 1, a: c, mix: d.by.length > 1, rowsLeft: rows.length, colsLeft: cols.length }); cols = cols.filter((x) => x !== c); moved = true; break }
    }
    if (!moved) break
  }
  return { rows, cols, steps }
}

// Moves that can be struck right now (the player may use any of them, in any order).
export function strikable(U, rows, cols) {
  return [...rows.filter((r) => dominator(U, 0, r, rows, cols)).map((a) => ({ s: 0, a })),
    ...cols.filter((c) => dominator(U, 1, c, cols, rows)).map((a) => ({ s: 1, a }))]
}

// Every state (moves still standing) the player can reach by shattering in any order.
function reachable(U, n, m) {
  const seen = new Map()
  const key = (rows, cols) => rows.join('') + '|' + cols.join('')
  const stack = [[[...Array(n).keys()], [...Array(m).keys()]]]
  while (stack.length) {
    const [rows, cols] = stack.pop()
    const k = key(rows, cols)
    if (seen.has(k)) continue
    const moves = strikable(U, rows, cols)
    seen.set(k, { rows, cols, moves })
    for (const { s, a } of moves) stack.push(s === 0 ? [rows.filter((x) => x !== a), cols] : [rows, cols.filter((x) => x !== a)])
  }
  return [...seen.values()]
}

const mean = (U, s, a, theirs) => theirs.reduce((t, b) => t + pay(U, s, a, b), 0) / theirs.length

// Make a card that iterated strict elimination solves to one cell, whatever order the player shatters in.
// opts: size (3 or 4); colFirst (no row of Lisa's is dominated at the start, so think about the rival first);
// mix (some move of Lisa's can only ever be shattered by a mix); weak (a row starts weakly but not strictly
// dominated: a trap). Without `weak`, no tie-only (weakly dominated) move ever appears.
export function makeElimCard({ size = 3, colFirst = false, mix = false, weak = false, both = false } = {}) {
  const n = size, m = size
  for (let tries = 0; tries < (globalThis.__ELIM_TRIES || 60000); tries++) {
    const U = [...Array(n)].map(() => [...Array(m)].map(() => [rnd(10), rnd(10)]))
    const all = [...Array(n).keys()], allc = [...Array(m).keys()]
    const res = eliminate(U, n, m)
    if (res.rows.length !== 1 || res.cols.length !== 1) continue
    // alternation: the player must switch sides
    let switches = 0
    for (let i = 1; i < res.steps.length; i++) if (res.steps[i].s !== res.steps[i - 1].s) switches++
    if (switches < (size === 4 ? 3 : 2)) continue
    const rowsNow = all.filter((r) => dominator(U, 0, r, all, allc))
    const colsNow = allc.filter((c) => dominator(U, 1, c, allc, all))
    if (colFirst && rowsNow.length) continue
    if (both && (!rowsNow.length || !colsNow.length)) continue
    // no side can be solved from its own numbers alone
    if (rowsNow.length >= n - 1 || colsNow.length >= m - 1) continue
    // the cheap shortcut "strike the move with the lowest average" must fail at the start, on both sides
    const lowR = Math.min(...all.map((r) => mean(U, 0, r, allc))), lowC = Math.min(...allc.map((c) => mean(U, 1, c, all)))
    if (all.some((r) => mean(U, 0, r, allc) === lowR && rowsNow.includes(r))) continue
    if (allc.some((c) => mean(U, 1, c, all) === lowC && colsNow.includes(c))) continue
    const states = reachable(U, n, m)
    if (states.some((st) => st.moves.length === 0 && (st.rows.length > 1 || st.cols.length > 1))) continue // dead end
    // and it must keep failing: in most states the move with the lowest average (either side) is a decoy
    const open = states.filter((st) => st.rows.length > 1 || st.cols.length > 1)
    const fooled = open.filter((st) => {
      const cand = [...(st.rows.length > 1 ? st.rows.map((a) => [0, a, mean(U, 0, a, st.cols)]) : []), ...(st.cols.length > 1 ? st.cols.map((a) => [1, a, mean(U, 1, a, st.rows)]) : [])]
      const low = Math.min(...cand.map((x) => x[2]))
      return cand.some(([sd, a, v]) => v === low && st.moves.some((mv) => mv.s === sd && mv.a === a))
    })
    if (fooled.length > open.length * 0.4) continue
    // ties: only the weak phase may show a tie-only move, and only on Lisa's side
    const tieOnly = (st, s) => (s === 0 ? st.rows : st.cols).some((a) => weaklyOnly(U, s, a, s === 0 ? st.rows : st.cols, s === 0 ? st.cols : st.rows) != null)
    if (states.some((st) => tieOnly(st, 1))) continue
    if (!weak && states.some((st) => tieOnly(st, 0))) continue
    if (weak && !all.some((r) => r !== res.rows[0] && weaklyOnly(U, 0, r, all, allc) != null)) continue
    // pure or mixed, on every path
    const allPure = states.every((st) => st.moves.every(({ s, a }) => pureDom(U, s, a, s === 0 ? st.rows : st.cols, s === 0 ? st.cols : st.rows)))
    if (!mix && !allPure) continue
    if (mix) {
      // his side stays pure everywhere; some row of Lisa's is never beaten by a single move in any state
      const hisPure = states.every((st) => st.moves.every(({ s, a }) => s === 0 || pureDom(U, 1, a, st.cols, st.rows)))
      if (!hisPure) continue
      // ...and whenever that row can be shattered, an even split of two moves does it (Tempo's method works)
      const half = (r, st) => st.rows.some((x, i) => st.rows.slice(i + 1).some((y) => x !== r && y !== r && st.cols.every((b) => (U[x][b][0] + U[y][b][0]) / 2 > U[r][b][0])))
      const needy = all.filter((r) => r !== res.rows[0] && states.every((st) => !st.rows.includes(r) || (!pureDom(U, 0, r, st.rows, st.cols) && (!dominator(U, 0, r, st.rows, st.cols) || half(r, st)))))
      if (!needy.length) continue
    }
    return { U, n, m, rowOrder: shuffle(all), colOrder: shuffle(allc), survivor: [res.rows[0], res.cols[0]], steps: res.steps }
  }
  throw new Error('no elimination card found')
}

// Book notes for World 3's end screen (attribution).
export const BOOK_NOTES_W3 = [
  ['A rationalizable move answers beliefs about rational rivals', 'Definitions 54.1 and 55.1, pp.54–55'],
  ['Strictly dominated means some mix always does better', 'Definition 59.2, p.59'],
  ['In finite games, never a best response is strictly dominated', 'Definition 59.1, Lemma 60.1, pp.59–60'],
  ['Iterated elimination of strictly dominated actions', 'Definition 60.2, pp.60–61'],
  ['A move beaten only by a mix of two others', 'Example 61.1, Figure 61.1, p.61'],
  ['In a finite game, what survives is the rationalizable set', 'Proposition 61.2, p.61'],
  ['The order of elimination does not change what survives', 'remark after Prop. 61.2, p.62'],
  ['Often rationalizability rules out very little', 'p.56'],
]

// In play, cards come from a precomputed pool (scripts/gen_elim_pool.mjs), relabelled at random:
// shuffling which move is which keeps every property the generator checked.
import { ELIM_POOL } from './elimpool.js'
export function dealElimCard({ size = 3, colFirst = false, mix = false, weak = false } = {}) {
  const key = weak ? 'weak' : mix ? 'mix' : colFirst ? 'colFirst' : 'plain'
  const pool = ELIM_POOL[key]
  const base = pool[rnd(pool.length)]
  const n = base.length, m = base[0].length
  const rp = shuffle([...Array(n).keys()]), cp = shuffle([...Array(m).keys()])
  const U = rp.map((r) => cp.map((c) => base[r][c].slice()))
  const res = eliminate(U, n, m)
  return { U, n, m, rowOrder: shuffle([...Array(n).keys()]), colOrder: shuffle([...Array(m).keys()]), survivor: [res.rows[0], res.cols[0]], steps: res.steps, size }
}
