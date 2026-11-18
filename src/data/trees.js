// Extensive games with perfect information (Osborne & Rubinstein, Chapter 6).
// A tree card: decision nodes owned by Lisa (0) or the rival (1); leaves carry payoffs [lisa, rival].
// Backward induction (the proof of Kuhn's theorem, Prop. 99.2, p.99) picks, at every node whose later moves
// are settled, the branch that is best for whoever moves there. With no ties (no indifference, p.100) the
// result is the unique subgame perfect equilibrium (Def. 97.2, p.97).
// node: { id, mover, edges: [{ label, child }], town? }   leaf: { id, pay: [l, r] }

let uid = 0
const leaf = (l, r) => ({ id: uid++, pay: [l, r] })
const node = (mover, edges, extra = {}) => ({ id: uid++, mover, edges, ...extra })
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }

export const isLeaf = (n) => !!n.pay

// backward induction value of a subtree, and the chosen edge index at every node
export function solve(n, pick = new Map()) {
  if (isLeaf(n)) return { pay: n.pay, pick }
  let best = -1, bestPay = null
  n.edges.forEach((e, k) => {
    const v = solve(e.child, pick).pay
    if (!bestPay || v[n.mover] > bestPay[n.mover]) { best = k; bestPay = v }
  })
  pick.set(n.id, best)
  return { pay: bestPay, pick }
}

// Zero's way: assume the rival does whatever hurts you most (the W1 maxmin habit), and best-respond to that
function pessimistic(n) {
  if (isLeaf(n)) return n.pay[0]
  const vals = n.edges.map((e) => pessimistic(e.child))
  return n.mover === 0 ? Math.max(...vals) : Math.min(...vals)
}

export function allNodes(n, out = []) { if (!isLeaf(n)) { out.push(n); n.edges.forEach((e) => allNodes(e.child, out)) } return out }
function allLeaves(n, out = []) { if (isLeaf(n)) out.push(n); else n.edges.forEach((e) => allLeaves(e.child, out)); return out }

const L_ACT = ['Rush', 'Wait', 'Feint']
const R_ACT = ['Fight', 'Fold', 'Stall']

// distinct payoffs per player across leaves, so nobody is ever indifferent
function payLeaves(leaves) {
  const a = shuffle([...Array(10).keys()]).slice(0, leaves.length)
  const b = shuffle([...Array(10).keys()]).slice(0, leaves.length)
  leaves.forEach((lf, i) => { lf.pay = [a[i], b[i]] })
}

function randomTree(depth, rootBranch) {
  // Lisa moves first; the rival answers; at depth 3 Lisa moves once more on some branches
  const lisaActs = shuffle(L_ACT.slice()).slice(0, rootBranch)
  const edges = lisaActs.map((label, k) => {
    if (k === 0 && depth === 2 && Math.random() < 0.5) return { label, child: leaf(0, 0) } // an outside option
    const rActs = shuffle(R_ACT.slice(0, 2))
    return {
      label,
      child: node(1, rActs.map((rl) => {
        if (depth === 3 && Math.random() < 0.55) {
          const again = shuffle(L_ACT.slice()).slice(0, 2)
          return { label: rl, child: node(0, again.map((l2) => ({ label: l2, child: leaf(0, 0) }))) }
        }
        return { label: rl, child: leaf(0, 0) }
      })),
    }
  })
  return node(0, edges)
}

// the rival's threats: at a rival node, the move that hurts Lisa most, when it isn't his best move there
function threats(root) {
  const { pick } = solve(root)
  return allNodes(root).filter((n) => n.mover === 1).map((n) => {
    const worst = n.edges.reduce((w, e, k) => (solve(e.child).pay[0] < solve(n.edges[w].child).pay[0] ? k : w), 0)
    return { node: n.id, edge: worst, empty: worst !== pick.get(n.id) }
  })
}

// backward induction, except that at the nodes in `override` the given edge is played
function solveWith(n, override) {
  if (isLeaf(n)) return n.pay
  if (override.has(n.id)) return solveWith(n.edges[override.get(n.id)].child, override)
  let best = null
  for (const e of n.edges) { const v = solveWith(e.child, override); if (!best || v[n.mover] > best[n.mover]) best = v }
  return best
}

let greedyLeft = 0 // spread the rare greedy-friendly card out (about one in seven)

function treeCard({ depth = 2, rootBranch = 2, credible: force }) {
  // Half the threats are real. A real threat guards a branch you should avoid; an empty one guards the branch
  // you should take. So neither 'go where he threatens' nor 'keep away' works without checking it.
  const credible = force ?? Math.random() < 0.5
  for (let tries = 0; tries < 20000; tries++) {
    uid = 0
    const root = randomTree(depth, rootBranch)
    payLeaves(allLeaves(root))
    const nodes = allNodes(root)
    // at each rival node, the move that hurts Lisa most is called Fight, so a threat always sounds like one
    nodes.filter((n) => n.mover === 1).forEach((n) => {
      const order = n.edges.map((e, k) => [k, solve(e.child).pay[0]]).sort((a, b) => a[1] - b[1])
      order.forEach(([k], r) => { n.edges[k].label = R_ACT[r] })
    })
    if (depth === 3 && !nodes.some((n) => n.mover === 0 && n !== root)) continue
    const { pick, pay } = solve(root)
    const spe = pick.get(root.id)
    // the threat shown sits on a rival node right under the top choice
    const cands = threats(root).filter((t) => root.edges.some((e) => e.child.id === t.node) && t.empty !== credible)
    if (!cands.length) continue
    const th = cands[Math.floor(Math.random() * cands.length)]
    const branch = root.edges.findIndex((e) => e.child.id === th.node)
    if (credible && branch === spe) continue
    // believing the shown threat (and nothing else) leads to this first move
    const believed = root.edges.reduce((b, e, k) => (solveWith(e.child, new Map([[th.node, th.edge]]))[0] > solveWith(root.edges[b].child, new Map([[th.node, th.edge]]))[0] ? k : b), 0)
    if (!credible && believed === spe) continue // an empty threat must matter: believing it costs you
    // grabbing the branch with the biggest pink number is rarely the answer
    const greedy = root.edges.reduce((b, e, k) => (Math.max(...allLeaves(e.child).map((l) => l.pay[0])) > Math.max(...allLeaves(root.edges[b].child).map((l) => l.pay[0])) ? k : b), 0)
    if (isLeaf(root.edges[spe].child) && Math.random() < 0.8) continue
    if (greedy === spe) { if (greedyLeft > 0 || Math.random() < 0.5) continue; greedyLeft = 6 } else greedyLeft = Math.max(0, greedyLeft - 1)
    return { mode: 'tree', roots: [root], threat: th, believed, value: pay }
  }
  throw new Error('no tree card')
}

// The centipede game (Section 6.5.2, Figure 107.1): players alternate Stop or Go on; T periods.
function centipedeCard({ T = 6 }) {
  uid = 0
  const base = T === 6 ? [[1, 0], [0, 2], [3, 1], [2, 4], [5, 3], [4, 6], [6, 5]] : [[1, 0], [0, 2], [3, 1], [2, 4], [4, 3]]
  const off = rint(0, 3)
  const pays = base.map(([a, b]) => [a + off, b + off])
  let next = leaf(...pays[T]) // everyone went on to the end
  for (let t = T - 1; t >= 0; t--) {
    next = node(t % 2, [{ label: 'Stop', child: leaf(...pays[t]) }, { label: 'Go on', child: next }], { period: t + 1 })
  }
  return { mode: 'centipede', roots: [next], T, value: solve(next).pay }
}

// The chain-store game (Section 6.5.1, Figure 105.1): in town k a challenger (Lisa, for each shop) chooses
// In or Out; after In the chain store Fights or Folds (cooperates). The store's total is the sum over towns.
function chainCard({ K = 3 }) {
  uid = 0
  // keep the book's orderings: store Out > Fold > Fight; challenger Fold > Out > Fight (p.105)
  const s = [rint(5, 6), rint(2, 3), 0], c = [rint(1, 2), rint(3, 4), 0] // [out, fold, fight]; (K-1)*out > K*fold
  const roots = []
  for (let k = 1; k <= K; k++) {
    const fight = node(1, shuffle([{ label: 'Fold', child: leaf(c[1], s[1]) }, { label: 'Fight', child: leaf(c[2], s[2]) }]))
    roots.push(node(0, shuffle([{ label: 'In', child: fight }, { label: 'Out', child: leaf(c[0], s[0]) }]), { town: k }))
  }
  // his threat, said about the first town: fight there and nobody opens next door
  const fn = roots[0].edges.find((e) => e.label === 'In').child
  const threat = { node: fn.id, edge: fn.edges.findIndex((e) => e.label === 'Fight'), empty: true }
  return { mode: 'chain', roots, K, threat, store: s, shop: c }
}

export function makeTreeCard(cfg) {
  if (cfg.mode === 'centipede') return centipedeCard(cfg)
  if (cfg.mode === 'chain') return chainCard(cfg)
  return treeCard(cfg)
}

export const BOOK_NOTES_W5 = [
  ['An extensive game is a tree of moves made in turn', 'Definition 89.1, Example 91.1, pp.89–91'],
  ['A strategy plans a move at every point, even unreached ones', 'Definition 92.1, p.92'],
  ['A Nash equilibrium can rest on a threat that is not credible', 'Example 95.2, Figure 96.2, pp.95–96'],
  ['Subgame perfect means a best move after every history', 'Definition 97.2, p.97'],
  ['Checking one change at a time is enough', 'Lemma 98.2, the one deviation property, p.98'],
  ['Backward induction finds a subgame perfect equilibrium in every finite game', "Kuhn's theorem, Proposition 99.2, p.99"],
  ['In subgame perfect play the chain store never fights', 'Section 6.5.1, pp.105–106'],
  ['In the centipede game, each player plans to stop at every turn', 'Section 6.5.2, Figure 107.1, pp.106–107'],
]
