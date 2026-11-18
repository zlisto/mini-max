// Implementation theory (Osborne & Rubinstein, Chapter 10).
// A planner writes the rules (a game form) so that the outcome she wants comes out of rational play.
// Here: a costly stage upgrade decided by claims of value (the Groves mechanism, (184.1), Prop. 184.2),
// a three-way vote (Gibbard-Satterthwaite, Prop. 181.2), and Solomon's game form (Example 191.2).

export const COST = 10
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i)
// the others' total can be any amount, in half coins, so a "best whatever they claim" test is a real test
const OTHERS = Array.from({ length: 25 }, (_, i) => i / 2)

// payment rules for the upgrade: the project goes ahead iff the claims add up to at least the cost.
// pay(c, o): what you pay if it is built; fee(o): what you pay either way (negative = you get it back).
// gap, ticket and rebate are Groves mechanisms: the build decision is efficient for the claims, and what you pay
// depends only on the others' claims (184.1). gap is Clarke's version, h = max(0, others - cost) †.
const gap = (c, o) => Math.max(0, COST - o)
export const RULES = {
  even: { name: 'Split It Evenly', desc: 'if it’s built, all three pay a third of the cost', pay: () => COST / 3 },
  claim: { name: 'Pay Your Claim', desc: 'if it’s built, you pay what you claimed', pay: (c) => c },
  half: { name: 'Pay Half Your Claim', desc: 'if it’s built, you pay half of what you claimed', pay: (c) => c / 2 },
  share: { name: 'Pay Your Share', desc: 'if it’s built, you pay your claim’s share of the cost', pay: (c, o) => (COST * c) / Math.max(1e-9, c + o) },
  groves: { name: 'Pay the Gap', desc: 'if it’s built, you pay the part of the cost the others left uncovered', pay: gap },
  cover: { name: 'Cover It or Your Claim', desc: 'if it’s built, you pay the uncovered part or your claim, whichever is more', pay: (c, o) => Math.max(gap(c, o), c) },
  ticket: { name: 'The Door Fee', desc: 'everyone pays a coin either way, plus the uncovered part if it’s built', pay: gap, fee: () => 1 },
  rebate: { name: 'The Kickback', desc: 'pay the uncovered part if it’s built, and get a tenth of their claims back', pay: gap, fee: (o) => -o / 10 },
}
export const RULE_SETS = { 1: ['ticket', 'claim', 'cover', 'even'], 2: ['rebate', 'half', 'share', 'cover'] }
export const GROVES = new Set(['groves', 'ticket', 'rebate'])

// Lisa's payoff from claiming c, with true value v, when the others' claims add up to o
export function payoff(rule, v, c, o) {
  const r = RULES[rule], fee = r.fee ? r.fee(o) : 0
  return (c + o >= COST ? v - r.pay(c, o) : 0) - fee
}

export function bestClaims(rule, v, o) {
  const vals = range(0, 12).map((c) => payoff(rule, v, c, o))
  const best = Math.max(...vals)
  return { best, claims: range(0, 12).filter((c) => vals[c] > best - 1e-9), vals }
}

// claims that are best whatever the others claim (a dominant claim, Def. 181.1)
export function dominantClaims(rule, v) {
  return range(0, 12).filter((c) => OTHERS.every((o) => payoff(rule, v, c, o) >= bestClaims(rule, v, o).best - 1e-9))
}

// a total for the others where claim c does worse than the truth, if there is one
export function whereLieLoses(rule, v, c) {
  for (const o of OTHERS) {
    const t = payoff(rule, v, v, o), l = payoff(rule, v, c, o)
    if (l < t - 1e-9) return { o, truth: t, lie: l }
  }
  return null
}

// a profitable lie under a rule, if there is one (search values, the others' total and lies)
export function findLie(rule) {
  for (const v of [5, 6, 4, 7, 3, 8, 2, 9, 1, 10, 0]) {
    for (const o of [5, 4, 6, 3, 7, 2, 8, 1, 9, 0, 10, 11, 12]) {
      const truth = payoff(rule, v, v, o)
      for (let c = 0; c <= 12; c++) {
        const lie = payoff(rule, v, c, o)
        if (lie - truth > 1e-9) return { v, o, c, truth, lie }
      }
    }
  }
  return null
}

const pick = (a) => a[Math.floor(Math.random() * a.length)]

// ---- the three-way vote ---------------------------------------------------------------------
export const SHOWS = ['Comedy', 'Drama', 'Musical']
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
const maj = (prof, a, b) => (prof.filter((r) => r.indexOf(a) < r.indexOf(b)).length >= 2 ? a : b)
export const VOTE_RULES = {
  plurality: {
    name: 'Most First Places', desc: 'the show ranked first most often wins (ties go to the earlier show)',
    pick: (prof) => { const n = [0, 0, 0]; prof.forEach((r) => n[r[0]]++); return n.indexOf(Math.max(...n)) },
  },
  borda: {
    name: 'Points for Rank', desc: 'two points per first place, one per second (ties go to the earlier)',
    pick: (prof) => { const n = [0, 0, 0]; prof.forEach((r) => { n[r[0]] += 2; n[r[1]] += 1 }); return n.indexOf(Math.max(...n)) },
  },
  dictator: { name: 'The Lead Decides', desc: 'whatever the lead actor (voter one) ranks first is staged', pick: (prof) => prof[0][0] },
  fixed: { name: 'Always the Comedy', desc: 'the comedy is staged whatever anyone says', pick: () => 0 },
  veto: {
    name: 'Fewest Last Places', desc: 'the show ranked last by the fewest wins (ties go to the earlier show)',
    pick: (prof) => { const n = [0, 0, 0]; prof.forEach((r) => n[r[2]]++); return n.indexOf(Math.min(...n)) },
  },
  agenda: {
    name: 'Two Rounds of Pairs', desc: 'a majority picks comedy or drama, then that show or the musical',
    pick: (prof) => maj(prof, maj(prof, 0, 1), 2),
  },
  director: { name: 'The Director Decides', desc: 'whatever the director (voter three) ranks first is staged', pick: (prof) => prof[2][0] },
  majority: {
    name: 'The Majority Decides', desc: 'a show ranked first by two voters wins, or else the lead’s first choice',
    pick: (prof) => { const n = [0, 0, 0]; prof.forEach((r) => n[r[0]]++); const m = n.findIndex((k) => k >= 2); return m >= 0 ? m : prof[0][0] },
  },
  pair: { name: 'Comedy or Drama', desc: 'a majority picks comedy or drama, and the musical is never staged', pick: (prof) => maj(prof, 0, 1) },
}
export const VOTE_SETS = { 1: ['plurality', 'borda', 'dictator', 'fixed'], 2: ['majority', 'agenda', 'director', 'pair'] }
// rules with no profitable lie that still can't stage every show: they fail condition (181.3)
export const NARROW = { fixed: 'the drama and the musical', pair: 'the musical' }

// a profitable misreport under a voting rule: some voter, some profile, some false ranking
export function findVoteLie(id) {
  const rule = VOTE_RULES[id]
  for (const a of PERMS) for (const b of PERMS) for (const c of PERMS) {
    const prof = [a, b, c]
    const out = rule.pick(prof)
    for (let i = 0; i < 3; i++) {
      for (const lie of PERMS) {
        const p2 = prof.slice(); p2[i] = lie
        const o2 = rule.pick(p2)
        if (prof[i].indexOf(o2) < prof[i].indexOf(out)) return { i, prof, lie, out, o2 }
      }
    }
  }
  return null
}

// ---- cards ---------------------------------------------------------------------------------------
export function makeMechCard(cfg) {
  if (cfg.mode === 'claim') {
    if (GROVES.has(cfg.rule)) {
      // the others' claims stay hidden: the claim must be best whatever they turn out to be
      const v = pick([4, 5, 6, 7, 8])
      return { mode: 'claim', rule: cfg.rule, v, hidden: true, claims: dominantClaims(cfg.rule, v) }
    }
    // Lisa's own claim under a rule; the others' claims fall short so her claim can matter
    for (;;) {
      const o = pick([3, 4, 5, 6, 7]), v = pick([4, 5, 6, 7, 8])
      if (v + o < COST) continue // make it worth building
      const b = bestClaims(cfg.rule, v, o)
      if (b.claims.includes(v)) continue // here the lie must pay
      return { mode: 'claim', rule: cfg.rule, v, o, others: split(o), ...b }
    }
  }
  if (cfg.mode === 'rule') {
    const ids = RULE_SETS[cfg.set || 1]
    return { mode: 'rule', order: ids.slice().sort(() => Math.random() - 0.5), lies: Object.fromEntries(ids.map((id) => [id, findLie(id)])) }
  }
  if (cfg.mode === 'vote') {
    const ids = VOTE_SETS[cfg.set || 1]
    return { mode: 'vote', order: ids.slice().sort(() => Math.random() - 0.5), lies: Object.fromEntries(ids.map((id) => [id, findVoteLie(id)])) }
  }
  // Solomon's form: the true owner values the part at vH, the impostor at vL; a new card's
  // working fines (strictly between the values) never overlap the last card's
  for (let tries = 0; ; tries++) {
    const vH = 5 + Math.floor(Math.random() * 7), vL = 1 + Math.floor(Math.random() * (vH - 2))
    if (cfg.avoid && tries < 200 && !(vH - 1 < cfg.avoid[0] || vL + 1 > cfg.avoid[1])) continue // a wide first card can leave no disjoint second one
    return { mode: 'solomon', vH, vL, owner: cfg.owner ?? pick([1, 2]) }
  }
}

function split(o) { const a = Math.floor(o / 2); return [a, o - a] }

// Solomon (Figure 191.1): who gets the part, given the fine M, by backward induction
export function solomonOutcome(vH, vL, owner, M, eps = 0.5) {
  const v2 = owner === 2 ? vH : vL
  const twoSaysYes = v2 - M > 0 // player 2, asked after 1 says yes
  const oneYes = twoSaysYes ? -eps : (owner === 1 ? vH : vL) // player 1's payoff from saying yes
  const oneSaysYes = oneYes > 0
  if (!oneSaysYes) return { gets: 2, path: 'no' }
  return twoSaysYes ? { gets: 2, path: 'yes-yes', fine: true } : { gets: 1, path: 'yes-no' }
}

export const BOOK_NOTES_W8 = [
  ['A planner designs a game form to get the outcome she wants', 'Def. 179.1, pp.178–179'],
  ['Truthful implementation, where telling the truth is a solution', 'Def. 179.2, pp.179–180'],
  ['A dominant strategy is best whatever the others do', 'Def. 181.1, p.181'],
  ['The revelation principle', 'Lemma 181.4, pp.181–182'],
  ['Lie-proof with three outcomes all possible means a dictator', 'Prop. 181.2 with (181.3), p.181'],
  ['A Groves mechanism makes truth dominant for a costly project', '(184.1), Prop. 184.2, pp.183–185'],
  ["Solomon's predicament, and a game form that solves it", 'Ex. 190.1, 191.2, pp.186–192'],
]
