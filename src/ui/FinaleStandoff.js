import { CoreStandoff, nw, coins } from './CoreStandoff.js'
import { makeFinaleCard, orders, marginal } from '../data/finale.js'

// The Grand Finale standoff (Ch. 14.4 and 15.2): fair division instead of "the strongest takes all".
// It reuses the block party card (picks, the coin editor, redeals, misses) with its own cards:
//  margin, shapley: marginal contributions and the Shapley value (Def. 291.2)
//  seller:          the Shapley value against the core (Example 294.3)
//  weighted:        a big party in a weighted majority game (Example 294.1, Example 295.3)
//  axiom:           a dummy and two interchangeable players (SYM and DUM, p.292)
//  nash, risk:      the Nash bargaining split (Prop. 302.1) and risk aversion (Prop. 304.1)
// A split must match the answer exactly. A wrong split costs health and stays; a second one spends the card.
const BLUE = '#7fd6ff', PINK = '#ff5fa2'

export class FinaleStandoff extends CoreStandoff {
  constructor(scene, opts) {
    super(scene, opts)
    this.kind = 'finale'
  }

  makeCard(cfg) { return makeFinaleCard(cfg) }

  nm(i) { return this.card.g.names[i] }

  label(id) {
    const c = this.card
    if (/^p\d$/.test(id)) return this.nm(+id.slice(1))
    if (/^c\d+$/.test(id)) return coins(+id.slice(1)).replace(/^nothing$/, 'Nothing').replace(/^(\w)/, (a) => a.toUpperCase())
    return {
      all: `Everything to ${this.nm(0)}, the seller`, same: 'The same as the Shapley value', even: 'An even split',
      down: 'His share goes down', up: 'His share goes up', stay: 'His share stays the same',
    }[id] || id
  }

  stepsFor(c) {
    const pick = (label, opts, ans, wide = false) => ({ type: 'pick', label, opts, ans, wide })
    const cc = (a) => a.map((k) => `c${k}`)
    const split = (label = 'Your split:') => ({ type: 'split', label })
    switch (c.mode) {
      case 'margin': return [pick(`In this order, what does ${this.nm(c.who)} add on arrival?`, cc(c.opts), `c${c.d}`), pick(`Averaged over all six orders, what does ${this.nm(c.who)} add?`, cc(c.avgOpts), `c${c.g.phi[c.who]}`)]
      case 'shapley': return [split('Split the take by the Shapley value:')]
      case 'seller': return [split('Split the money by the Shapley value:'), pick('And what does the core give?', c.coreOpts, 'all', true)]
      case 'weighted': return [pick("Big Top's Shapley value:", cc(c.bigOpts), `c${c.big}`), split('Now split the whole pot by the Shapley value:')]
      case 'axiom': return [pick('Which act only ever adds her own worth to a group?', ['p0', 'p1', 'p2'].sort(() => Math.random() - 0.5), `p${c.d}`), pick(`What does ${this.nm(c.d)} get by the Shapley value?`, cc(c.dumOpts), `c${c.c}`), split('Now split the whole take by the Shapley value:')]
      case 'nash': return [split('Your settlement with Zero:')]
      default: return [pick(c.dir === 'down' ? 'Zero now fears a breakdown more. What happens to his Nash share?' : 'Zero now fears a breakdown less. What happens to his Nash share?', c.dirOpts, c.dir, true), split('Your new settlement with Zero:')]
    }
  }

  dealLine() {
    return {
      margin: 'Marquee lines the band up in an order. Work out what each player adds when they arrive.',
      shapley: 'Split the take so each player gets what they add, on average over every order of arrival.',
      seller: 'Sal has one ticket and every buyer wants it. Split the money by the Shapley value.',
      weighted: 'Big Top has the most seats, and Zero says the strongest takes all. Work out its fair share.',
      axiom: 'Look at what each act adds to every group it joins before you decide anything.',
      nash: "Zero's ready to settle. Read both tables and find the split that holds.",
      risk: "Zero's nerves about walking away with nothing have changed. Watch what that does to his share.",
    }[this.mode]
  }

  titleFor() {
    return { margin: 'WHAT DOES EACH ONE ADD?', shapley: 'THE SHAPLEY SPLIT', seller: 'ONE SELLER, TWO BUYERS', weighted: 'THE BIG PARTY', axiom: 'THREE ACTS', nash: 'SETTLE WITH ZERO', risk: 'A NERVOUS ZERO' }[this.mode]
      .replace('TWO BUYERS', this.card.buyers === 3 ? 'THREE BUYERS' : 'TWO BUYERS')
  }

  introFor() {
    const c = this.card
    return {
      margin: "Each line gives a group's worth, what it earns on its own. † A player's marginal contribution is what the group gains when he arrives.",
      shapley: `The band earns ${c.g.T} coins together. Each line gives a group's worth, what it earns on its own. †`,
      seller: `Any group with ${this.nm(0)} and at least one buyer earns ${c.g.T}, because a buyer values her ticket at that much. Anyone else earns nothing. †`,
      weighted: `A group with ${c.m} seats wins ${c.g.T} coins. Big Top earns its share of the orders where its arrival tips a loser into a winner. †`,
      axiom: "Each line gives a group's worth, what it earns on its own. †",
      nash: 'No deal means nothing for either of you. Find the split whose two happiness numbers multiply to the most. †',
      risk: c.dir === 'down' ? 'Before, you both felt every coin alike, so the split was even. Now each extra coin matters less to Zero, so a breakdown scares him more. †' : 'Before, each extra coin mattered less to Zero, and to you as well. Now every coin counts the same to him, and your table is unchanged. †',
    }[this.mode]
  }

  drawWorths(X, top, W) {
    const s = this.scene, c = this.card, g = c.g
    this.c.add(s.add.graphics().fillStyle(0x2a2010, 1).fillRoundedRect(X + 20, top, W - 40, 82, 8))
    const t = (x, y, str, color = BLUE, o = 0) => this.c.add(s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color, wordWrap: { width: W - 64 } }).setOrigin(o, 0.5))
    if (c.mode === 'margin' || c.mode === 'shapley' || c.mode === 'axiom') {
      const v = g.v, N = g.names
      t(X + 34, top + 16, `On their own:  ${[0, 1, 2].map((i) => `${N[i]} ${v[1 << i]}`).join('   ')}`)
      t(X + 34, top + 40, `${N[0]} + ${N[1]}: ${v[3]}     ${N[0]} + ${N[2]}: ${v[5]}     ${N[1]} + ${N[2]}: ${v[6]}`)
      t(X + 34, top + 64, `All three together: ${v[7]}`)
      if (c.mode === 'margin') t(X + W - 34, top + 64, `Arrival order:  ${c.order.map((i) => N[i]).join(', ')}`, PINK, 1)
      return
    }
    if (c.mode === 'seller') {
      t(X + 34, top + 16, `Seller: ${g.names[0]}      Buyers: ${g.names.slice(1).join(', ')}`)
      t(X + 34, top + 40, `${g.names[0]} with any buyer: ${g.T}. Buyers without ${g.names[0]}: nothing.`)
      t(X + 34, top + 64, c.buyers === 2 ? '(Example 294.3, scaled to whole coins †)' : '(Example 294.3 with a third buyer †)')
      return
    }
    if (c.mode === 'weighted') {
      t(X + 34, top + 16, `Seats:  ${g.names.map((n, i) => `${n} ${g.w[i]}`).join('   ')}`)
      t(X + 34, top + 40, `Winning needs ${c.m} seats. A winning group takes ${g.T}.`)
      t(X + 34, top + 64, c.book ? '(Example 294.1, scaled to whole coins †)' : '(A weighted majority game, Exercise 289.2 †)')
      return
    }
    // nash and risk: Zero's happiness for each number of coins he gets
    const x0 = X + 130, dx = Math.min(36, (W - 165) / c.P)
    const rows = [['Coins', null, '#ffd166'], ['Lisa feels', c.uL, PINK], [c.mode === 'risk' ? 'Zero now' : 'Zero feels', c.uZ, BLUE]]
    if (c.mode === 'risk') rows.push(['Zero before', c.old.uZ, '#9a8ab0'])
    const ys = rows.length === 4 ? [12, 31, 50, 69] : [16, 40, 64]
    rows.forEach(([name, u, col], r) => {
      t(X + 30, top + ys[r], name, col)
      for (let y = 0; y <= c.P; y++) t(x0 + y * dx, top + ys[r], `${u ? u[y] : y}`, col, 0.5)
    })
  }

  leftText(left) {
    const c = this.card
    if (c.mode !== 'nash' && c.mode !== 'risk') return null
    if (left > 0) return `Coins left to hand out: ${left}`
    return `Product now: Lisa ${c.uL[this.x[0]]} × Zero ${c.uZ[this.x[1]]} = ${c.uL[this.x[0]] * c.uZ[this.x[1]]}`
  }

  splitHint() { return this.mode === 'nash' || this.mode === 'risk' ? 'LEFT/RIGHT who · UP/DOWN a coin · SPACE lock it (one try)' : null }

  target() {
    const c = this.card
    return c.mode === 'nash' || c.mode === 'risk' ? [c.lisa, c.zero] : c.g.phi
  }

  // a split must match the answer; a wrong one costs health, stays, and twice spends the card
  exactSplit(key) {
    const c = this.card, goal = this.target()
    if (this.x.every((k, i) => k === goal[i])) return false
    this.failed.add(key)
    this.walkouts = (this.walkouts || 0) + 1
    this.redeal = this.walkouts >= (c.mode === 'nash' || c.mode === 'risk' ? 1 : 2)
    if (c.mode === 'nash' || c.mode === 'risk') {
      const L = this.x[0], Zc = this.x[1], prod = c.uL[L] * c.uZ[Zc]
      this.done.push(`✗ Lisa's ${c.uL[L]} × Zero's ${c.uZ[Zc]} = ${prod}. Another split makes a bigger product.`)
      this.note = "Multiply your happiness by Zero's for each split. The Nash split makes that product as big as it can be (Prop. 302.1)."
      this.say('One of you could push for another coin from here, and the other would rather give in. This card is spent.', 16)
    } else {
      const i = this.x.findIndex((k, j) => k !== goal[j])
      this.done.push(`✗ Your split gives ${this.nm(i)} too ${this.x[i] > goal[i] ? 'much' : 'little'} for what ${this.nm(i)} adds on average.`)
      this.note = 'Take one player at a time. List the orders, write down what that player adds in each, and average them.'
      this.say(this.redeal ? "That's two misses, so this card is spent." : "That isn't what each one adds on average. Fix the split and lock it again.", 16)
    }
    if (this.redeal) { this.stage = 'redealing'; this.lastWrong = c.mode === 'nash' || c.mode === 'risk' ? 'A wrong split' : 'Two wrong splits'; this.note = `${this.note} The split this card wanted: ${goal.map((k, j) => `${this.nm(j)} ${k}`).join(', ')}.` }
    this.draw()
    this.miss()
    return true
  }

  splitRight() {
    const c = this.card, g = c.g
    const done = `Split: ${this.x.map((k, i) => `${g.names[i]} ${k}`).join(', ')}`
    if (c.mode === 'nash') return { done, line: "That's the Nash split. Your happiness times Zero's is as big as it gets here.", note: `Products as your coins go from one to ${nw(c.P - 1)}: ${c.prods.slice(1, -1).join(', ')}. The Nash solution maximizes the product of the gains over disagreement (Prop. 302.1).` }
    if (c.mode === 'risk' && c.dir === 'up') return { done, line: `Zero's share rose from ${nw(c.old.zero)} coins to ${nw(c.zero)}. Calmer about a breakdown, he can press harder.`, note: 'A less risk-averse bargainer does no worse (Prop. 304.1, read the other way round).' }
    if (c.mode === 'risk') return { done, line: `Zero's share fell from ${nw(c.P / 2)} coins to ${nw(c.zero)}. His fear of a breakdown cost him.`, note: 'Before, you both felt every coin alike, so the split was even, as symmetry demands (p.305). A bent table means more fear of a breakdown, and he does no better (Prop. 304.1).' }
    if (c.mode === 'seller') return { done, line: `That's it. ${g.names[0]} adds the whole take whenever a buyer is already there, so she gets most of it.`, note: `Shapley value: ${g.names[0]} ${g.phi[0]}, each buyer ${g.phi[1]}. A buyer adds the take only when ${g.names[0]} is already there and no other buyer came before him (Example 294.3).` }
    if (c.mode === 'weighted') return { done, line: c.book ? 'That holds up. Every small party gets the same, and Big Top gets what it adds on average.' : 'That holds up. Every party gets what it adds on average, and Big Top still falls short of the whole pot.', note: 'Big Top is strong, but it still needs partners, so it gets its average contribution and not the whole pot.' }
    if (c.mode === 'axiom') return { done, line: `And ${this.nm(c.tw[0])} and ${this.nm(c.tw[1])} add the same to every group, so symmetry splits the rest evenly.`, note: 'SYM and DUM (p.292), together with ADD, pin the Shapley value down (Prop. 293.1).' }
    return { done, line: "That's the Shapley value. Everyone gets what they add, on average over every order.", note: `Each share is an average over the six orders, and together they make the whole take (p.291). Shapley value: ${g.phi.map((k, i) => `${g.names[i]} ${k}`).join(', ')}.` }
  }

  feedback(step, ch, ok) {
    const c = this.card, g = c.g, k = /^c\d+$/.test(ch) ? +ch.slice(1) : null
    if (c.mode === 'margin') {
      const i = c.who, n = this.nm(i), S = c.before, before = c.order.slice(0, c.order.indexOf(i)).map((j) => this.nm(j)).join(' and ')
      if (step === 0) {
        if (ok) return { line: `Right. ${before} ${c.order.indexOf(i) === 1 ? `earns ${nw(g.v[S])} alone` : `earn ${nw(g.v[S])} together`}, and that grows to ${nw(g.v[S | (1 << i)])} once ${n} arrives.`, note: `Marginal contribution: ${g.v[S | (1 << i)]} − ${g.v[S]} = ${c.d} (p.291).`, done: `${n} adds ${c.d} in this order` }
        if (k === g.v[S | (1 << i)]) return { line: `That's what the whole group earns once ${n} is in. Take away what they had before.`, note: `Before ${n} arrives, ${before} already earn ${g.v[S]}.` }
        if (k === g.v[1 << i]) return { line: `That's what ${n} earns alone. Here ${n} joins a group that's already playing.`, note: 'Compare what the group earns with and without the newcomer.' }
        return { line: `Work out what the group earns with ${n}, then without.`, note: `${n} arrives after ${before}.` }
      }
      if (ok) return { line: `Yes. Averaged over every order, ${n} adds ${nw(g.phi[i])}. That's ${n}'s Shapley value.`, note: `Definition 291.2: add up what ${n} adds in each of the six orders and divide by six.`, done: `${n}'s Shapley value: ${g.phi[i]}` }
      if (k === c.d) return { line: "That's just this one order. The Shapley value averages all six.", note: `Write down what ${n} adds in each of the six orders, then take the average.` }
      return { line: `List the six orders and what ${n} adds in each one, then average them.`, note: `In each order, ${n} adds the group's worth with ${n}, minus its worth without.` }
    }
    if (c.mode === 'seller') {
      if (ok) return { line: `Exactly. In the core a buyer gets nothing, because ${this.nm(0)} could always sell to another buyer.`, note: 'Example 294.3: the core gives the seller everything, but the Shapley value still pays each buyer a little.', done: `The core: all to ${this.nm(0)}` }
      if (ch === 'same') return { line: 'The core is stricter. Could a buyer keep a coin when the seller can always turn to another buyer?', note: 'Check which groups could walk out on the Shapley split.' }
      return { line: 'An even split gives the seller far less than she earns with any one buyer.', note: 'Check which groups could walk out on that split.' }
    }
    if (c.mode === 'weighted') {
      if (ok) return { line: c.book ? `Yes. Big Top adds the whole pot unless it arrives first or last, so it gets ${nw(c.big)} of the ${nw(c.g.T)} coins.` : `Yes. Big Top adds the pot only in orders where it tips a losing group into a winner, so it gets ${nw(c.big)}.`, note: c.book ? 'Example 294.1: with seats (2, 1, 1, 1) and a quota of three, the big party gets half.' : 'A weighted majority game (Exercise 289.2): even the biggest party gets only what it adds on average.', done: `Big Top's value: ${c.big}` }
      if (k === g.T) return { line: "That's Zero's answer. Big Top still needs a partner to win, so it can't claim the whole pot.", note: 'Count the orders where Big Top turns a losing group into a winner.' }
      return { line: 'Count the orders where Big Top turns a losing group into a winning one.', note: 'Big Top adds nothing when it arrives first, or when the others already won without it.' }
    }
    if (c.mode === 'axiom' && step === 0) {
      const n = this.nm(c.d)
      if (ok) return { line: `Right. Whoever ${n} joins gains exactly what ${n} earns alone. That makes ${n} a dummy.`, note: 'A dummy adds only her own worth to every group (p.292).', done: `${n} is the dummy` }
      return { line: 'Compare each group with and without that act. Does she ever add more than her own worth?', note: 'Check the pairs and the whole band against each act alone.' }
    }
    if (c.mode === 'axiom') {
      if (ok) return { line: `So ${this.nm(c.d)} gets exactly her own worth, since that's all she ever adds.`, note: 'The dummy axiom (DUM, p.292): a player who only ever adds her own worth gets her own worth.', done: `${this.nm(c.d)} gets ${c.c}` }
      return { line: `Look at what ${this.nm(c.d)} adds to each group. Is it ever more than she earns alone?`, note: `Compare each group with and without ${this.nm(c.d)}.` }
    }
    // risk
    if (ok && c.dir === 'up') return { line: 'Right. With less to fear from a breakdown, he can press harder, so his share grows.', note: 'Prop. 304.1 works both ways: the more risk-averse side does no better, so the calmer side does no worse.', done: 'His share goes up' }
    if (ok) return { line: 'Right. The more he fears a breakdown, the less he dares to press, so his share shrinks.', note: 'Prop. 304.1: a more risk-averse bargainer ends up with an agreement no better for him than before.', done: 'His share goes down' }
    if (ch === 'stay') return { line: 'His feelings about a breakdown change the risks he will take, so the split has to move.', note: 'Think about who is more willing to risk walking away.' }
    return { line: c.dir === 'down' ? 'Fear makes a bargainer give ground. Would a nervous Zero hold out for more?' : 'A calmer bargainer can push harder. Would he settle for less now?', note: 'Think about who is more willing to risk walking away.' }
  }

  reveal() {
    const c = this.card, st = this.steps[this.step]
    if (c.mode === 'margin') {
      if (st.ans === `c${c.d}`) return `On this card, ${this.nm(c.who)} added ${c.d}.`
      const ini = (o) => o.map((j) => this.nm(j)[0]).join('')
      const rows = orders(3).map((o) => `${ini(o)} ${marginal(c.g.v, o, c.who)}`).join(', ')
      return `What ${this.nm(c.who)} adds in each order: ${rows}. The average is ${c.g.phi[c.who]}.`
    }
    if (c.mode === 'seller') return `The core gives ${this.nm(0)} everything.`
    if (c.mode === 'weighted') { const os = orders(c.g.n), k = os.filter((o) => marginal(c.g.v, o, 0) > 0).length; return `Big Top tips the vote in ${k} of ${os.length} orders, so it gets ${k}/${os.length} of ${c.g.T}, which is ${c.big}.` }
    if (c.mode === 'axiom') return st.ans.startsWith('p') ? `On this card, ${this.nm(c.d)} was the dummy: she adds exactly ${c.c} to every group she joins.` : `On this card, ${this.nm(c.d)} got ${c.c}.`
    return c.dir === 'up' ? 'His share goes up.' : 'His share goes down.'
  }
}
