// World 11: the core (Osborne & Rubinstein, Chapter 13).
// A coalitional game with transferable payoff gives every group S of players a worth v(S) (Def. 257.1).
// A split x of v(N) is in the core when no group S earns more on its own: v(S) <= x(S) for every S (Def. 258.2, p.259).
// Players are numbered 0..n-1 and a group is a bitmask.

const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const rint = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1))
const bits = (m) => { let c = 0; while (m) { c += m & 1; m >>= 1 } return c }
export const members = (m, n) => Array.from({ length: n }, (_, i) => i).filter((i) => m & (1 << i))

// every group's worth, as an array indexed by bitmask (index 0 unused)
function table(n, worth) { const v = [0]; for (let m = 1; m < 1 << n; m++) v.push(worth(m)); return v }

// the group that walks out on split x: the one that loses most by staying (ties go to the smaller group), or null
export function walkout(v, x, n) {
  let best = null, gap = 0
  for (let m = 1; m < (1 << n) - 1; m++) {
    const g = v[m] - members(m, n).reduce((s, i) => s + x[i], 0)
    if (g > gap || (g === gap && g > 0 && best != null && bits(m) < bits(best))) { best = m; gap = g }
  }
  return best
}

// every whole-number split of v(N) that nobody walks out on
export function coreSplits(v, n) {
  const T = v[(1 << n) - 1], out = []
  const rec = (i, left, x) => {
    if (i === n - 1) { const y = [...x, left]; if (walkout(v, y, n) == null) out.push(y); return }
    for (let k = 0; k <= left; k++) rec(i + 1, left - k, [...x, k])
  }
  rec(0, T, [])
  return out
}

const CREWS = ['Sprays', 'Beats', 'Wheels']
const CREW_ROLE = ['graffiti crew', 'DJ crew', 'skate crew']

// three crews: singles l, the take T, and the most each crew can get, u_k = T - v(the other two) (p.259 rewritten)
function threeCrews({ slack, singles, cores }) {
  for (let tries = 0; tries < 4000; tries++) {
    const T = rint(8, 12)
    const l = [0, 1, 2].map(() => (singles ? pick([0, 1, 1, 2]) : 0))
    const u = [0, 1, 2].map((k) => rint(Math.max(l[k], 1), T - 2))
    if (u.reduce((a, b) => a + b, 0) !== T + slack) continue
    const pair = [0, 1, 2].map((k) => T - u[k]) // pair[k] is the worth of the two crews other than k
    const v = table(3, (m) => {
      if (m === 7) return T
      if (bits(m) === 1) return l[Math.log2(m)]
      const k = [0, 1, 2].find((i) => !(m & (1 << i)))
      return pair[k]
    })
    // cohesive and superadditive (p.258): a pair is worth more than its members alone
    if ([0, 1, 2].some((k) => { const [i, j] = [0, 1, 2].filter((z) => z !== k); return pair[k] <= l[i] + l[j] || pair[k] + l[k] > T })) continue
    if (new Set(pair).size < 3) continue
    const cs = coreSplits(v, 3)
    if (cs.length < cores[0] || cs.length > cores[1]) continue
    // the most even split never holds, so "share it equally" isn't a free answer
    const even = [0, 1, 2].map((i) => Math.floor(T / 3) + (i < T % 3 ? 1 : 0))
    if (walkout(v, even, 3) == null) continue
    return { n: 3, T, v, l, u, names: CREWS, roles: CREW_ROLE, core: cs }
  }
  throw new Error('no crew game')
}

// which crews' names go in a group, in words: "the Sprays and the Beats"
export function groupName(m, g) {
  const ms = members(m, g.n).map((i) => g.names[i])
  if (ms.length === g.n) return 'everyone'
  const th = (s) => (CREWS.includes(s) ? `the ${s}` : s)
  if (ms.length === 1) return th(ms[0])
  const w = ms.map(th)
  return w.length === 2 ? `${w[0]} and ${w[1]}` : `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}`
}

export function makeCoreCard(cfg) {
  const m = cfg.mode
  if (m === 'walkout') {
    const g = threeCrews({ slack: rint(1, 3), singles: Math.random() < 0.5, cores: [2, 12] })
    const stable = Math.random() < 0.25
    // groups that are options: the three pairs, plus any crew that earns something alone
    const groups = [3, 5, 6, ...[1, 2, 4].filter((s) => g.v[s] > 0)]
    for (let tries = 0; tries < 3000; tries++) {
      const a = rint(0, g.T), b = rint(0, g.T - a), x = shuffle([a, b, g.T - a - b])
      const blockers = groups.filter((s) => g.v[s] > members(s, 3).reduce((t, i) => t + x[i], 0))
      if (stable ? blockers.length !== 0 : blockers.length !== 1) continue
      if (x.some((xi) => xi === 0) && Math.random() < 0.7) continue
      return { mode: m, g, x, ans: stable ? 'none' : `g${blockers[0]}`, opts: shuffle([...groups.map((s) => `g${s}`), 'none']) }
    }
  }
  if (m === 'split') {
    const g = cfg.hard ? threeCrews({ slack: 0, singles: true, cores: [1, 1] }) : threeCrews({ slack: 2, singles: false, cores: [2, 8] })
    return { mode: m, g, hard: !!cfg.hard }
  }
  if (m === 'market') {
    // Ex. 260.1 / 265.1: a rig needs one speaker and one amp; a group earns `rig` for every pair it can build †
    const [s, a] = pick([[2, 3], [3, 2], [1, 3], [3, 1], [1, 2], [2, 1]])
    const rig = pick([1, 2, 3])
    const names = [...['Ace', 'Bo', 'Cy'].slice(0, s), ...['Dee', 'Eli', 'Fay'].slice(0, a)]
    const roles = [...Array(s).fill('speaker'), ...Array(a).fill('amp')]
    const n = s + a
    const v = table(n, (mm) => rig * Math.min(members(mm, n).filter((i) => i < s).length, members(mm, n).filter((i) => i >= s).length))
    return { mode: m, g: { n, T: v[(1 << n) - 1], v, names, roles, core: coreSplits(v, n) }, s, a, rig, scarce: s < a ? 'speaker' : 'amp' }
  }
  if (m === 'owner') {
    // Ex. 259.3: Corazon owns the truck; any group with her and k dancers earns f(k); without her, nothing
    const w = pick([2, 3, 3])
    let inc
    do { inc = Array.from({ length: w }, () => rint(2, 7)).sort((p, q) => q - p) } while (new Set(inc).size < w)
    const f = [0]; inc.forEach((d) => f.push(f[f.length - 1] + d))
    const n = w + 1
    const names = ['Corazon', ...['Jojo', 'Kiki', 'Lulu'].slice(0, w)]
    const roles = ['truck owner', ...Array(w).fill('dancer')]
    const v = table(n, (mm) => (mm & 1 ? f[members(mm, n).length - 1] : 0))
    const cap = f[w] - f[w - 1]
    // the cap's place among the options is random, so "smallest" or "second smallest" gives nothing away
    const below = [cap - 1, cap - 2, cap - 3].filter((k) => k >= 1)
    const above = shuffle([...new Set([f[1], Math.round(f[w] / n), cap + 1, cap + 2, cap + 3])].filter((k) => k > cap))
    const r = rint(0, Math.min(3, below.length))
    const capOpts = [cap, ...shuffle(below).slice(0, r), ...above.slice(0, 3 - r)]
    return { mode: m, g: { n, T: f[w], v, names, roles, core: coreSplits(v, n) }, f, w, cap, capOpts: shuffle(capOpts.slice(0, 4)) }
  }
  if (m === 'majority') {
    // Ex. 259.1 with the take scaled to 6 †: any two crews earn p, all three earn 6, a crew alone earns nothing.
    // The core is nonempty exactly when p <= 4, two-thirds of the take.
    const p = cfg.book ? pick([4, 5]) : pick([3, 4, 5, 5])
    const T = 6
    const v = table(3, (mm) => (mm === 7 ? T : bits(mm) === 2 ? p : 0))
    const holds = p * 3 <= 2 * T
    return { mode: m, p, holds, g: { n: 3, T, v, names: CREWS, roles: CREW_ROLE, core: coreSplits(v, 3) }, ans: holds ? 'holds' : 'breaks',
      why: shuffle(['pairs', 'take', 'half']), whyHolds: shuffle(['enough', 'less', 'alone']) }
  }
  // veto (Exercise 261.1): a simple game; a winning group takes the whole pot, scaled to 6 †, and a losing one gets nothing.
  // The rule is generated, and the veto players (in every winning group) are worked out from it.
  const names = ['Corazon', 'Sprays', 'Beats', 'Wheels']
  const roles = ['the DJ', 'graffiti crew', 'DJ crew', 'skate crew']
  const nm = (i) => (i === 0 ? 'Corazon' : `the ${names[i]}`)
  const has = (mm, i) => (mm & (1 << i)) !== 0
  const [A, B, C, D] = shuffle([0, 1, 2, 3])
  // holding and breaking rules both use "or", "any three" and plain lists, so the wording alone gives nothing away.
  // Every rule is cohesive (p.258): no two separate groups can both win.
  const holdsRules = [
    () => ({ text: `A group wins the pot if it has ${nm(A)} and at least one other player.`, win: (mm) => has(mm, A) && bits(mm) >= 2 }),
    () => ({ text: `A group wins the pot if it has ${nm(A)} and at least two other players.`, win: (mm) => has(mm, A) && bits(mm) >= 3 }),
    () => ({ text: `A group wins the pot if it has both ${nm(A)} and ${nm(B)}.`, win: (mm) => has(mm, A) && has(mm, B) }),
    () => ({ text: `A group wins the pot if it has ${nm(A)} and ${nm(B)}, or ${nm(A)}, ${nm(C)} and ${nm(D)}.`, win: (mm) => has(mm, A) && (has(mm, B) || (has(mm, C) && has(mm, D))) }),
    () => ({ text: `A group wins the pot if it has any three of the four players, as long as ${nm(A)} ${A === 0 ? 'is' : 'are'} one of them.`, win: (mm) => has(mm, A) && bits(mm) >= 3 }),
  ]
  const breaksRules = [
    () => ({ text: 'A group wins the pot if it has any three of the four players.', win: (mm) => bits(mm) >= 3 }),
    () => ({ text: `A group wins the pot if it has ${nm(A)} and one other player, or all three of the others.`, win: (mm) => (has(mm, A) && bits(mm) >= 2) || (bits(mm) >= 3) }),
    () => ({ text: `A group wins the pot if it has at least two of ${nm(B)}, ${nm(C)} and ${nm(D)}.`, win: (mm) => [B, C, D].filter((i) => has(mm, i)).length >= 2 }),
    () => ({ text: `A group wins the pot if it has ${nm(A)} and ${nm(B)}, or ${nm(A)} and ${nm(C)}, or ${nm(B)}, ${nm(C)} and ${nm(D)}.`, win: (mm) => (has(mm, A) && (has(mm, B) || has(mm, C))) || (has(mm, B) && has(mm, C) && has(mm, D)) }),
  ]
  const want = cfg.holds === true ? true : cfg.holds === false ? false : Math.random() < 0.5
  const r = pick(want ? holdsRules : breaksRules)()
  const T = 6
  const v = table(4, (mm) => (r.win(mm) ? T : 0))
  const winners = Array.from({ length: 15 }, (_, i) => i + 1).filter((mm) => v[mm] > 0)
  const veto = [0, 1, 2, 3].filter((i) => winners.every((mm) => has(mm, i)))
  const holds = veto.length > 0
  const others = [0, 1, 2, 3].filter((i) => !veto.includes(i))
  const fakeVeto = nm(pick(others.length ? others : [0, 1, 2, 3]))
  const vetoName = veto.map(nm).join(' and ')
  return { mode: 'veto', rule: r.text, veto, vetoName, holds, fakeVeto, g: { n: 4, T, v, names, roles, core: coreSplits(v, 4) }, ans: holds ? 'holds' : 'breaks',
    why: shuffle(['noveto', 'fake', 'overlap']) }
}

export const BOOK_NOTES_W11 = [
  ['A coalitional game gives every group a worth to split', 'Def. 257.1, p.257'],
  ['The core: no group can do better for all its members alone', 'Def. 258.2, p.258'],
  ['Equivalently, every group gets at least its worth', 'p.259'],
  ['A pair worth over two-thirds of the take empties a three-player core', 'Example 259.1'],
  ["A worker gets no more than what he adds to the rest", 'Exercise 259.3'],
  ['In these markets, the shorter side takes everything', 'Examples 260.1 and 265.1'],
  ['When a bare majority takes the whole unit, the core is empty', 'Example 260.3'],
  ['A simple game has a core only if it has a veto player', 'Exercise 261.1'],
  ["A market's core is never empty", 'Prop. 264.2'],
]
