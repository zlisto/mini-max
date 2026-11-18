// Knowledge and common knowledge (Osborne & Rubinstein, Chapter 5).
// States are lamps 0..n-1 in a row. Each player's information partition (Definitions 68.1-68.2, p.68) is a list
// of cells; the game draws each cell as a bracket over neighbouring lamps (†). A player knows an event E at a
// state when the whole cell around that state lies inside E: K(E) = {w : P(w) ⊆ E} (69.3, p.69).
// E is common knowledge at w when w lies in a self-evident event inside E (Definition 73.2, p.73), which is the
// same as lying in every set K1(E), K2(E), K1(K2(E)), ... (Definition 73.1, Proposition 74.2, p.74).

// cells: array of arrays of states; returns state -> cell index
export function cellOf(cells, n) {
  const at = new Array(n).fill(-1)
  cells.forEach((c, i) => c.forEach((w) => { at[w] = i }))
  return at
}

// K_i(S) for a set S (a Set of states)
export function K(cells, S) {
  const out = new Set()
  for (const c of cells) if (c.every((w) => S.has(w))) c.forEach((w) => out.add(w))
  return out
}

// The largest self-evident event inside E: keep only states where both players know what is left, until stable.
export function ckSet(parts, E) {
  let S = new Set(E)
  for (;;) {
    let next = new Set(S)
    for (const cells of parts) next = new Set([...next].filter((w) => K(cells, S).has(w)))
    if (next.size === S.size) return S
    S = next
  }
}

// Shortest knowledge chain that fails at each state: depth 1 = someone doesn't know E there, 2 = someone doesn't
// know that the other knows, and so on. Infinity = E is common knowledge there. Computed from the alternating
// sequence K1(E), K2(K1(E)), ... of Definition 73.1.
export function depths(parts, E, n) {
  const d = new Array(n).fill(Infinity)
  for (let w = 0; w < n; w++) if (!E.has(w)) d[w] = 0
  for (const start of [0, 1]) {
    let S = new Set(E), i = start
    for (let k = 1; k <= 2 * n + 2; k++) {
      S = K(parts[i], S)
      for (let w = 0; w < n; w++) if (!S.has(w) && d[w] > k) d[w] = k
      i = 1 - i
    }
  }
  return d
}

// A lamp can be doused now if it is lit and some shown player's bracket around it holds a dark lamp.
export function dousers(parts, lit, w, players = [0, 1]) {
  if (!lit.has(w)) return []
  return players.filter((i) => parts[i].find((c) => c.includes(w)).some((u) => !lit.has(u)))
}

const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1))

// random interval partition of 0..n-1 with cell sizes 1..maxCell
function intervals(n, maxCell) {
  const cells = []
  let w = 0
  while (w < n) {
    const s = Math.min(n - w, rint(1, maxCell))
    cells.push(Array.from({ length: s }, (_, k) => w + k))
    w += s
  }
  return cells
}

// A signal card. mode 'know': only Lisa's brackets matter. mode 'ck': both. mode 'mail': the Electronic Mail
// Game ladder of Section 5.5 (pp.82-83).
export function makeSignalCard({ mode = 'ck', n = 6, minDepth = 2, trap = 0 } = {}) {
  if (mode === 'mail') return mailCard(n)
  const inner = mode !== 'know' && Math.random() < 0.5 // half the cards keep their safe lamps away from both ends
  for (let tries = 0; tries < 60000; tries++) {
    const parts = [intervals(n, 3), intervals(n, 3)]
    if (parts.some((p) => p.length < 3)) continue
    const dark = rint(1, Math.max(1, Math.round(n / 4)))
    const E = new Set(Array.from({ length: n }, (_, w) => w))
    const order = Array.from({ length: n }, (_, w) => w).sort(() => Math.random() - 0.5)
    order.slice(0, dark).forEach((w) => E.delete(w))
    if (mode === 'know') {
      const k = K(parts[0], E)
      // some lamps to douse, some that stay, and a gold lamp beside a dark one that stays (read the bracket)
      if (k.size === E.size || k.size < 2) continue
      const nextTo = [...k].some((w) => (w > 0 && !E.has(w - 1)) || (w < n - 1 && !E.has(w + 1)))
      if (!nextTo) continue
      return mirror({ mode, n, parts, E, ck: k, depth: depths([parts[0], parts[0]], E, n) })
    }
    const ck = ckSet(parts, E)
    const d = depths(parts, E, n)
    const maxD = Math.max(...d.filter((x) => x !== Infinity))
    const mutual = d.filter((x) => x >= 2 && x !== Infinity).length
    if (ck.size < 2 || maxD < minDepth || maxD > minDepth + 2) continue
    if (mutual < trap) continue
    if (inner && (ck.has(0) || ck.has(n - 1)) && tries < 50000) continue
    // reading the brackets matters: some lamp that stays lit sits right next to a dark one
    const nextTo = [...ck].some((w) => (w > 0 && !E.has(w - 1)) || (w < n - 1 && !E.has(w + 1)))
    if (!nextTo) continue
    // and no single bracket row does the whole job
    if (K(parts[0], E).size === ck.size || K(parts[1], E).size === ck.size) continue
    return mirror({ mode, n, parts, E, ck, depth: d })
  }
  throw new Error('no signal card')
}

// flip the row half the time, so the safe lamps aren't always at one end
function mirror(c) {
  if (Math.random() < 0.5) return c
  const f = (w) => c.n - 1 - w
  return {
    ...c,
    parts: c.parts.map((cells) => cells.map((cl) => cl.map(f).reverse()).reverse()),
    E: new Set([...c.E].map(f)), ck: new Set([...c.ck].map(f)), depth: c.depth.slice().reverse(),
  }
}

// The ladder of states (0,0), (1,0), (1,1), (2,1), (2,2), ... Lisa's screen shows Q1, Tempo's shows Q2.
// Lisa's cells pair (q,q-1) with (q,q); Tempo's pair (q,q) with (q+1,q) (p.82). The plan is on in every
// state but (0,0). The ladder goes on past the card: the last bracket reaches a state off the edge.
function mailCard(n) {
  const st = []
  for (let k = 0; st.length < n; k++) st.push([Math.ceil(k / 2), Math.floor(k / 2)])
  const lisa = [], tempo = []
  st.forEach(([q1, q2], w) => {
    const a = lisa.find((c) => c.q === q1); if (a) a.c.push(w); else lisa.push({ q: q1, c: [w] })
    const b = tempo.find((c) => c.q === q2); if (b) b.c.push(w); else tempo.push({ q: q2, c: [w] })
  })
  const parts = [lisa.map((x) => x.c), tempo.map((x) => x.c)]
  const labels = [lisa.map((x) => x.q), tempo.map((x) => x.q)]
  const E = new Set(st.map((_, w) => w).filter((w) => w > 0))
  // the ladder continues past the card: the last state's bracket for one player reaches an unseen (lit) state
  const openOwner = st[n - 1][0] === st[n - 1][1] ? 1 : 0
  return { mode: 'mail', n, parts, E, ck: new Set(), depth: depths(parts, E, n), labels, states: st, openOwner }
}

export const BOOK_NOTES_W4 = [
  ['What you can tell apart is your information partition', 'Definitions 68.1 and 68.2, Lemma 68.3, p.68'],
  ['You know an event when your whole cell lies inside it', 'the knowledge function K, (69.3), p.69'],
  ['If you know something, you know that you know it', 'K5, the Axiom of Transparency, p.70'],
  ['Common knowledge means knowing that the other knows, forever', 'Definition 73.1, p.73'],
  ['A self-evident event is common knowledge wherever it occurs', 'Definition 73.2, Example 73.3, pp.73–74'],
  ['Both definitions say the same thing', 'Lemma 74.1, Proposition 74.2, p.74'],
  ['In the Electronic Mail Game, the true game is never common knowledge', 'Section 5.5, pp.82–83'],
  ['In its only equilibrium, nobody ever charges (plays B)', 'Proposition 83.1, pp.83–84'],
]
