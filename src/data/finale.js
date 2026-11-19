// World 12: fair division (Osborne & Rubinstein, Ch. 14.4 and 15.2).
// Shapley value (Def. 291.2): each player's marginal contribution v(S ∪ {i}) − v(S), averaged over every order of arrival.
// Nash solution (Prop. 302.1a): the agreement that maximizes the product of the two players' utilities, with u(D) = 0.
// Players are numbered 0..n-1 and a group is a bitmask, as in core.js.

const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const rint = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1))
const bits = (m) => { let c = 0; while (m) { c += m & 1; m >>= 1 } return c }
// a pick's options: the answer at a random rank among plausible distractors
function rankOpts(ans, cands) {
  const below = shuffle([...new Set(cands)].filter((k) => k >= 0 && k < ans)), above = shuffle([...new Set(cands)].filter((k) => k > ans))
  const r = rint(Math.max(0, 3 - above.length), Math.min(3, below.length))
  return shuffle([ans, ...below.slice(0, r), ...above.slice(0, 3 - r)])
}
const table = (n, worth) => { const v = [0]; for (let m = 1; m < 1 << n; m++) v.push(worth(m)); return v }

export function orders(n) {
  const out = []
  const rec = (pre, left) => { if (!left.length) { out.push(pre); return } left.forEach((x, k) => rec([...pre, x], left.filter((_, j) => j !== k))) }
  rec([], Array.from({ length: n }, (_, i) => i))
  return out
}

// what i adds when he arrives after the players before him in this order
export function marginal(v, order, i) {
  const before = order.slice(0, order.indexOf(i)).reduce((m, j) => m | (1 << j), 0)
  return v[before | (1 << i)] - (before ? v[before] : 0)
}

// the Shapley value, exactly, as numerator over n! (Def. 291.2)
export function shapley(v, n) {
  const os = orders(n)
  return Array.from({ length: n }, (_, i) => os.reduce((s, o) => s + marginal(v, o, i), 0) / os.length)
}

const BAND = ['Dex', 'Gil', 'Ivy']
const BAND_ROLE = ['drums', 'guitar', 'vocals']

// three musicians with a superadditive game whose Shapley value is in whole coins and isn't an even split
function bandGame(maxT = 12) {
  for (let t = 0; t < 5000; t++) {
    const l = [0, 1, 2].map(() => pick([0, 0, 1, 2]))
    const T = rint(6, maxT)
    const pair = [3, 5, 6].map((m) => { const [a, b] = [0, 1, 2].filter((i) => m & (1 << i)); return rint(l[a] + l[b] + 1, T - 1) })
    const v = table(3, (m) => (m === 7 ? T : bits(m) === 1 ? l[Math.log2(m)] : pair[[3, 5, 6].indexOf(m)]))
    if ([0, 1, 2].some((k) => v[7 ^ (1 << k)] + l[k] > T)) continue
    const phi = shapley(v, 3)
    if (phi.some((x) => !Number.isInteger(x) || x < 0)) continue
    if (new Set(phi).size < 3) continue
    return { n: 3, T, v, names: BAND, roles: BAND_ROLE, phi }
  }
  throw new Error('no band game')
}

// a concave happiness table for k coins out of P (0 if they don't agree): each extra coin is worth no more than the last
function bent(P) {
  const inc = Array.from({ length: P }, () => rint(1, 12)).sort((a, b) => b - a)
  const u = [0]; inc.forEach((d) => u.push(u[u.length - 1] + d))
  return inc[0] - inc[P - 1] >= 3 ? u : null
}
const flat = (P) => Array.from({ length: P + 1 }, (_, k) => k)

export function nashSplit(P, uL, uZ) {
  const prods = Array.from({ length: P + 1 }, (_, x) => uL[x] * uZ[P - x])
  const x = prods.indexOf(Math.max(...prods))
  return { lisa: x, zero: P - x, prods }
}

// Lisa and Zero split P coins; the nervous one has a bent table and the Nash split gives them less than half, but not nothing †
function nashGame(nervous) {
  const P = pick([8, 10, 12]), found = {}
  for (let t = 0; t < 3000; t++) {
    const u = bent(P), u2 = nervous === 'both' ? bent(P) : flat(P)
    if (!u || !u2) continue
    const uL = nervous === 'lisa' ? u : u2, uZ = nervous === 'lisa' ? u2 : u
    const r = nashSplit(P, uL, uZ)
    if (r.prods.filter((p) => p === r.prods[r.lisa]).length !== 1) continue
    const share = nervous === 'lisa' ? r.lisa : nervous === 'zero' ? r.zero : Math.min(r.lisa, r.zero)
    if (share < 1 || share >= P / 2 || found[share]) continue
    found[share] = { P, uL, uZ, nervous, ...r }
  }
  const keys = Object.keys(found)
  if (!keys.length) return nashGame(nervous)
  return found[pick(keys)]
}

export function makeFinaleCard(cfg) {
  const m = cfg.mode
  if (m === 'margin') {
    const g = bandGame(10)
    const order = pick(orders(3))
    const who = order[rint(1, 2)]
    const d = marginal(g.v, order, who)
    const before = order.slice(0, order.indexOf(who)).reduce((s, j) => s | (1 << j), 0)
    const opts = [...new Set([d, g.v[before | (1 << who)], g.v[1 << who], g.phi[who]])]
    while (opts.length < 4) { const k = rint(0, g.T); if (!opts.includes(k)) opts.push(k) }
    const phiW = g.phi[who]
    const avgOpts = rankOpts(phiW, [d, phiW - 2, phiW - 1, phiW + 1, phiW + 2, ...g.phi, Math.round(g.T / 3), g.v[1 << who]])
    return { mode: m, g, order, who, d, before, opts: shuffle(opts.slice(0, 4)), avgOpts }
  }
  if (m === 'shapley') return { mode: m, g: bandGame(12) }
  if (m === 'seller') {
    // Ex. 294.3: a seller and buyers who each value her one unit; scaled so the value is in whole coins †
    const buyers = cfg.book ? 2 : pick([2, 3])
    const n = buyers + 1, T = cfg.book ? 6 : 12
    const v = table(n, (mm) => ((mm & 1) && bits(mm) >= 2 ? T : 0))
    const names = ['Sal', ...['Bea', 'Ben', 'Bo'].slice(0, buyers)]
    const roles = ['seller', ...Array(buyers).fill('buyer')]
    return { mode: m, buyers, g: { n, T, v, names, roles, phi: shapley(v, n) }, coreOpts: shuffle(['all', 'same', 'even']) }
  }
  if (m === 'weighted') {
    // Ex. 294.1 and Ex. 295.3: one big party with m−1 seats and m one-seat parties; a majority (m seats) takes the pot
    let mm, n, T, w, v, phi
    for (let t = 0; t < 2000; t++) {
      if (cfg.book) { n = 4; T = 6; w = [2, 1, 1, 1]; mm = 3 } else {
        n = pick([4, 5]); T = pick([6, 10, 12]); w = [rint(2, 4), ...Array.from({ length: n - 1 }, () => rint(1, 2))].sort((a, b) => b - a)
        mm = Math.floor(w.reduce((a, b) => a + b, 0) / 2) + 1
      }
      v = table(n, (s) => (Array.from({ length: n }, (_, i) => (s & (1 << i) ? w[i] : 0)).reduce((a, b) => a + b, 0) >= mm ? T : 0))
      phi = shapley(v, n)
      if (cfg.book) break
      if (phi.some((x) => !Number.isInteger(x)) || w[0] === w[1] || phi[0] >= T || phi[0] <= phi[1] || phi[0] * 2 === T) continue
      if (n === 4 && T === 6 && w.join() === '2,1,1,1') continue
      break
    }
    const names = ['Big Top', ...['Ace', 'Bix', 'Cal', 'Dot'].slice(0, n - 1)]
    const roles = w.map((k) => `${k} seat${k > 1 ? 's' : ''}`)
    const big = phi[0]
    let bigOpts = rankOpts(big, [big - 2, big - 1, big + 1, big + 2, Math.round((T * (mm - 1)) / (2 * mm - 1)), Math.round(T / n)])
    if (!bigOpts.includes(T)) bigOpts = shuffle([...bigOpts.filter((k) => k !== big).slice(0, 2), big, T])
    return { mode: m, m: mm, g: { n, T, v, names, roles, phi, w }, big, bigOpts, book: !!cfg.book }
  }
  if (m === 'axiom') {
    // SYM and DUM (p.292): two interchangeable players and a dummy who adds exactly her own worth to every group
    for (;;) {
      const a = rint(0, 2), b = 2 * rint(3, 5), c = a >= 1 && Math.random() < 0.6 ? a : rint(1, 3)
      if (b < 2 * a + 1 || b / 2 === c) continue
      const d = rint(0, 2), tw = [0, 1, 2].filter((i) => i !== d), tm = (1 << tw[0]) | (1 << tw[1])
      const v = table(3, (s) => { const ab = s & tm; return (ab === tm ? b : ab ? a : 0) + (s & (1 << d) ? c : 0) })
      const names = ['Rae', 'Kit', 'Dee'], roles = ['act', 'act', 'act']
      const phi = shapley(v, 3)
      const dumOpts = rankOpts(c, [0, c - 1, a, c + 1, c + 2, c + 3, Math.round((b + c) / 3), b / 2])
      return { mode: m, g: { n: 3, T: b + c, v, names, roles, phi }, a, b, c, d, tw, dumOpts }
    }
  }
  if (m === 'nash') {
    const ng = nashGame(pick(['zero', 'lisa', 'both']))
    return { mode: m, ...ng, g: { n: 2, T: ng.P, names: ['Lisa', 'Zero'], roles: ['you', 'the villain'] } }
  }
  // risk (Prop. 304.1): before, both felt every coin alike and split evenly (p.305); now Zero's table bends and his share falls
  const dir = pick(['down', 'up'])
  let now, old
  if (dir === 'down') {
    now = nashGame('zero')
    old = { P: now.P, uL: flat(now.P), uZ: flat(now.P), ...nashSplit(now.P, flat(now.P), flat(now.P)) }
  } else {
    // Lisa's table stays bent; Zero goes from bent to flat, and his share rises (but not simply to even)
    for (let t = 0; t < 5000 && !now; t++) {
      const P = pick([8, 10, 12]), uL = bent(P), zb = bent(P)
      if (!uL || !zb) continue
      const a = nashSplit(P, uL, zb), b = nashSplit(P, uL, flat(P))
      const uniq = (r) => r.prods.filter((p) => p === r.prods[r.lisa]).length === 1
      if (!uniq(a) || !uniq(b) || b.zero <= a.zero || b.zero === P / 2) continue
      old = { P, uL, uZ: zb, ...a }; now = { P, uL, uZ: flat(P), ...b }
    }
  }
  const ng = now
  return { mode: 'risk', dir, ...now, old, g: { n: 2, T: ng.P, names: ['Lisa', 'Zero'], roles: ['you', 'the villain'] }, dirOpts: shuffle(['down', 'up', 'stay']) }
}

export const BOOK_NOTES_W12 = [
  ['A value gives every game one split of its whole worth', 'Sec. 14.4.1, p.290'],
  ["A player's marginal contribution is what he adds on arrival", 'p.291'],
  ['The Shapley value averages it over every order', 'Def. 291.2'],
  ['Symmetry, dummy and additivity pin the Shapley value down', 'Prop. 293.1'],
  ['A big party gets its average contribution, not the whole pot', 'Example 294.1, Example 295.3'],
  ['The Shapley value can differ from the core', 'Example 294.3'],
  ['The Nash solution maximizes the product of the gains', 'Prop. 302.1'],
  ['An objection risks a breakdown to demand more', 'Def. 301.2, p.302'],
  ['A more risk-averse bargainer does no better', 'Prop. 304.1'],
  ['Two bargainers who feel every coin alike split evenly', 'p.305, Lemma 306.1'],
]
