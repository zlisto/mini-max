import { sfx } from '../systems/sfx.js'
import { makeCoreCard, walkout, members, groupName } from '../data/core.js'

// A block party standoff (Chapter 13, the core): Lisa splits a take so that no group can do better by walking out.
// Each card is one or two steps: a pick, or a split (hand out the take in whole coins, then lock it).
//  walkout:        which group would leave a proposed split (Def. 258.2)
//  split:          set a split nobody leaves (three crews)
//  market:         speakers and amps (Ex. 260.1, Ex. 265.1)
//  owner:          the truck and the dancers (Ex. 259.3)
//  majority, veto: does any split hold? (Ex. 259.1, Ex. 261.1)
// A wrong pick costs health and deals a fresh card of the same kind. A split that someone walks out on costs
// health and stays, with the group that left named, so Lisa fixes it.
// phase = { hp, cards: [{ mode, hard, book }] }
const WORDS = ['nothing', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
const nw = (n) => WORDS[n] ?? String(n) // a number said aloud
const coins = (n) => (n === 0 ? 'nothing' : n === 1 ? 'one coin' : `${nw(n)} coins`)
const RESUME = {} // cards won per foe and phase, so a knockout doesn't replay them
const SEEN_EMPTY = {} // per foe: false once a majority or veto card held, true once an empty core was called
const PINK = '#ff5fa2', BLUE = '#7fd6ff', GOLD = 0xffd166, CREAM = '#ecdcc8', DIM = '#7a6a90', ROSE = '#ff9a8a'

export { nw, coins }

export class CoreStandoff {
  constructor(scene, { lisa, enemy, enemyName, phases, onPhaseWin, onLose, say }) {
    Object.assign(this, { scene, lisa, enemy, enemyName, phases, onPhaseWin, onLose, say })
    this.kind = 'core'
    this.phaseIdx = 0
    this.c = scene.add.container(0, 0).setScrollFactor(0).setDepth(4200).setVisible(false)
    this.active = false
    this.waiting = false
  }

  startPhase(i = this.phaseIdx) {
    this.phaseIdx = i
    this.ph = this.phases[i]
    this.hp = this.ph.hp
    this.hits = 0
    const kept = RESUME[`${this.enemyName}:${i}`] || 0
    if (kept > 0 && kept < this.ph.hp) { this.hits = kept; this.hp = this.ph.hp - kept; this.scene.time.delayedCall(400, () => this.scene.floatText(240 + this.scene.cameras.main.scrollX, 590, `BACK AT CARD ${kept + 1}`, '#ffd166', 4400, 900)) }
    this.misses = 0
    this.active = true
    // step Lisa out from under the card so her head stays in view
    const sx = this.scene.locked ?? this.scene.cameras.main.scrollX, want = sx + 650
    if (this.lisa.x < want && this.enemy.x - want > 180) { this.scene.tweens.killTweensOf(this.lisa); this.scene.tweens.add({ targets: this.lisa, x: want, duration: 300 }) }
    this.deal()
    this.c.setVisible(true).setAlpha(0)
    this.scene.tweens.add({ targets: this.c, alpha: 1, duration: 250 })
    sfx(this.scene, 'freeze')
  }

  makeCard(cfg) { return makeCoreCard(cfg) }

  // ---- names --------------------------------------------------------------
  gname(m) { return groupName(m, this.card.g) }
  cap(s) { return s.charAt(0).toUpperCase() + s.slice(1) }
  xs(m) { return members(m, this.card.g.n).reduce((t, i) => t + this.x[i], 0) }
  label(id) {
    const c = this.card
    if (id === 'none') return 'Nobody walks out'
    if (id === 'holds') return 'Some split holds'
    if (id === 'breaks') return 'Every split breaks'
    if (id.startsWith('g')) { const m = +id.slice(1); return members(m, c.g.n).map((i) => c.g.names[i]).join(' + ') }
    if (id.startsWith('c')) return `${id.slice(1)} coin${id.slice(1) === '1' ? '' : 's'}`
    if (c.mode === 'majority' && c.holds) return { enough: `The pairs need ${3 * c.p} in all, and counting each crew twice there's ${2 * c.g.T}, enough to cover it.`, less: `Each pair needs only ${c.p}, which is less than the take.`, alone: 'A crew alone earns nothing, so nobody walks out.' }[id]
    if (c.mode === 'majority') return { pairs: `The pairs need ${3 * c.p} in all, but counting each crew twice there's only ${2 * c.g.T}.`, take: `The pairs need ${3 * c.p} in all, and the take is only ${c.g.T}.`, half: `Each pair needs ${c.p}, which is more than half the take.` }[id]
    return { noveto: 'Nobody is in every winning group, so there is no veto player and any share can be cut out.', fake: `${this.cap(c.fakeVeto)} ${c.fakeVeto === 'Corazon' ? 'is' : 'are'} in every winning group, which makes ${c.fakeVeto === 'Corazon' ? 'her' : 'them'} a veto player.`, overlap: 'The winning groups overlap, so they fight over the same players.' }[id]
  }

  // the steps a card asks, in order
  stepsFor(c) {
    const pick = (label, opts, ans, wide = false) => ({ type: 'pick', label, opts, ans, wide })
    const split = { type: 'split', label: 'Your split:' }
    switch (c.mode) {
      case 'walkout': return [pick('Who walks out on this split?', c.opts, c.ans)]
      case 'split': case 'market': return [split]
      case 'owner': return [pick('The most one dancer can get, with nobody walking out:', c.capOpts.map((k) => `c${k}`), `c${c.cap}`), { type: 'split', label: 'Pay every dancer as much as you can, with nobody walking out:' }]
      default: return [pick('Can any split keep everyone together?', ['holds', 'breaks'].sort(() => Math.random() - 0.5), c.ans),
        c.holds ? (c.mode === 'majority' ? pick('Why can a split hold?', c.whyHolds, 'enough', true) : split) : pick('Why does every split break?', c.why, c.mode === 'majority' ? 'pairs' : 'noveto', true)]
    }
  }

  deal(again = false) {
    const cfg = this.ph.cards[Math.min(this.hits, this.ph.cards.length - 1)]
    let use = again ? { ...cfg, book: false } : cfg
    if (use.mode === 'veto' && SEEN_EMPTY[this.enemyName] === false) use = { ...use, holds: false }
    this.card = this.makeCard(use)
    this.mode = this.card.mode
    this.steps = this.stepsFor(this.card)
    this.done = []
    this.failed = new Set()
    this.walkouts = 0
    this.stage = null
    this.note = null
    this.dealtAt = this.scene.time.now
    this.beginStep(0)
    this.waiting = true
    const lines = {
      walkout: 'Mural wants to split the take like this. Does any group earn more by walking out on it?',
      split: 'Split the take between the crews so that no group can do better by walking out.',
      market: 'A sound rig needs one speaker and one amp. Split what the rigs earn so that nobody walks out.',
      owner: "Corazon owns the truck, and the dancers can't earn a thing without it. How much can one dancer get?",
      majority: 'Any two crews can run the party without the third. Can any split keep all three together?',
      veto: 'Read the rule for winning the pot. Can any split keep everyone together?',
    }
    this.say(again ? "Here's a fresh one. Start from the top." : (this.dealLine ? this.dealLine() : lines[this.mode]), 16)
  }

  beginStep(i) {
    this.step = i
    const st = this.steps[i]
    this.cursor = -1
    this.touched = false
    if (st.type === 'split') { this.x = Array(this.card.g.n).fill(0); this.cursor = 0 }
    this.draw()
  }

  left() { return this.card.g.T - this.x.reduce((a, b) => a + b, 0) }

  // ---- drawing -------------------------------------------------------------
  draw() {
    this.c.removeAll(true)
    const s = this.scene
    const X = 16, Y = 16, W = 540, H = 512
    const g = s.add.graphics()
    g.fillStyle(0x14100a, 0.95).fillRoundedRect(X, Y, W, H, 14).lineStyle(3, GOLD, 1).strokeRoundedRect(X, Y, W, H, 14)
    this.c.add(g)
    const txt = (x, y, str, o = {}) => s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#fff', wordWrap: { width: W - 40 }, ...o })
    this.txt = txt
    const c = this.card
    const titles = { walkout: 'WHO WALKS OUT?', split: 'SPLIT THE TAKE', market: 'SPEAKERS AND AMPS', owner: 'THE TRUCK AND THE DANCERS', majority: 'ANY TWO CREWS', veto: 'WHO CAN WIN THE POT?' }
    this.c.add(txt(X + W / 2, Y + 20, this.titleFor ? this.titleFor() : titles[this.mode], { fontFamily: 'Bangers', fontSize: '26px', color: '#ffd166' }).setOrigin(0.5))
    const intro = {
      walkout: "Each line gives a group's worth, what it earns on its own. † Mural's split of the take is in pink.",
      split: `The block earns ${c.g.T} coins when all three crews stay together. Each line gives a group's worth, what it earns on its own. †`,
      market: `A group earns ${c.rig} for every rig it can build, and a rig needs one speaker and one amp. †`,
      owner: "With the truck, each extra dancer adds a little less than the one before. Without Corazon's truck, nobody earns anything.",
      majority: 'The block earns 6 when all three crews stay. Any two crews earn the same on their own, and a crew alone earns nothing. †',
      veto: 'Read the rule in the box below. A winning group takes all 6 coins, and a losing group gets nothing. †',
    }[this.mode]
    this.c.add(txt(X + 20, Y + 40, this.introFor ? this.introFor() : intro, { fontSize: '14px', color: CREAM }))
    this.drawWorths(X, Y + 84, W)
    // steps already answered
    let y = Y + 176
    const bads = this.done.map((d, k) => (d.startsWith('✗') ? k : -1)).filter((k) => k >= 0)
    const keep = new Set(bads.slice(-1))
    if (bads.length > 1 && this.done[bads[bads.length - 1]].includes('card is spent')) keep.add(bads[bads.length - 2])
    this.done.forEach((d, k) => { const bad = d.startsWith('✗'); if (bad && !keep.has(k)) return; const tt = txt(X + 20, y, bad ? d : `✓ ${d}`, { fontSize: '14px', color: bad ? '#ff8a8a' : '#7dffb0' }); this.c.add(tt); y += tt.height + 4 })
    const st = this.steps[this.step]
    let bottom = y
    if (!this.stage) {
      const lab = txt(X + 20, y + 4, st.label, { color: PINK })
      this.c.add(lab)
      const y2 = y + lab.height + 10
      if (st.type === 'split') { this.drawSplit(X, y2, W); bottom = y2 + 150 } else { this.drawPick(X, y2 + 18, W, st); bottom = y2 + 18 + this.pickRows * ((st.wide ? 38 : 32) + 6) - 8 }
    }
    if (this.note) this.c.add(txt(X + 20, bottom + 8, this.note, { fontSize: '14px', color: '#ffd166', wordWrap: { width: W - 40 } }))
    const hint = st.type === 'split' ? ((this.splitHint && this.splitHint()) || 'LEFT/RIGHT choose who · UP/DOWN give or take a coin · SPACE lock it') : 'ARROWS choose · SPACE play it (one try per card)'
    this.hint = txt(X + W / 2, Y + H - 13, hint, { color: CREAM, fontSize: '14px' }).setOrigin(0.5).setVisible(!this.stage)
    this.c.add(this.hint)
    this.cardBottom = Y + H
    this.prompt = s.add.text(X + W / 2, Y + H + 22, '', { fontFamily: 'Bangers', fontSize: '28px', color: '#ffd166', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setVisible(false)
    this.prompt.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.waiting && this.scene.time.now - (this.stageAt || 0) > 400) this.advance() })
    this.c.add(this.prompt)
    this.c.each((o) => o.setScrollFactor && o.setScrollFactor(0))
  }

  // what each group earns on its own
  drawWorths(X, top, W) {
    const s = this.scene, c = this.card, g = c.g
    const bg = s.add.graphics().fillStyle(0x2a2010, 1).fillRoundedRect(X + 20, top, W - 40, 82, 8)
    this.c.add(bg)
    const t = (x, y, str, color = '#fff', o = 0) => this.c.add(s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color, wordWrap: { width: W - 64 } }).setOrigin(o, 0.5))
    if (c.mode === 'walkout' || c.mode === 'split' || c.mode === 'majority') {
      const v = g.v, N = g.names
      const alone = [0, 1, 2].map((i) => `${N[i]} ${v[1 << i]}`).join('   ')
      t(X + 34, top + 16, `On their own:  ${alone}`, BLUE)
      t(X + 34, top + 40, `${N[0]} + ${N[1]}: ${v[3]}     ${N[0]} + ${N[2]}: ${v[5]}     ${N[1]} + ${N[2]}: ${v[6]}`, BLUE)
      t(X + 34, top + 64, `All three together: ${v[7]}`, BLUE)
      if (c.mode === 'walkout') t(X + W - 34, top + 64, `Mural's split:  ${c.x.map((k, i) => `${N[i]} ${k}`).join('  ')}`, PINK, 1)
      return
    }
    if (c.mode === 'market') {
      t(X + 34, top + 16, `Speakers: ${g.names.slice(0, c.s).join(', ')}      Amps: ${g.names.slice(c.s).join(', ')}`, BLUE)
      t(X + 34, top + 40, `A speaker with an amp earns ${c.rig}. Either one alone earns nothing.`, BLUE)
      t(X + 34, top + 64, `Everyone together: ${g.T}   (Examples 260.1 and 265.1)`, BLUE)
      return
    }
    if (c.mode === 'owner') {
      const f = c.f
      t(X + 34, top + 16, `Corazon with ${f.slice(1).map((k, i) => `${i + 1} dancer${i ? 's' : ''}: ${k}`).join('    ')}`, BLUE)
      t(X + 34, top + 40, `Dancers: ${g.names.slice(1).join(', ')}. Dancers without Corazon earn nothing.`, BLUE)
      t(X + 34, top + 64, `Everyone together: ${g.T}   (Exercise 259.3)`, BLUE)
      return
    }
    // veto
    t(X + 34, top + 22, `Players: ${g.names.join(', ')}   (Exercise 261.1)`, BLUE)
    t(X + 34, top + 50, c.rule, BLUE)
  }

  drawPick(X, y, W, st) {
    const s = this.scene
    const n = st.opts.length
    const long = st.opts.some((id) => this.label(id).length > 12)
    const cols = st.wide ? 1 : n <= 3 || (n === 4 && !long) ? n : 2
    const rows = Math.ceil(n / cols)
    const bw = (W - 40 - (cols - 1) * 8) / cols, bh = st.wide ? 38 : 32
    st.opts.forEach((id, i) => {
      const col = i % cols, row = Math.floor(i / cols)
      const x = X + 20 + col * (bw + 8) + bw / 2, yy = y + row * (bh + 6)
      const failed = this.failed.has(`${this.step}:${id}`)
      const sel = i === this.cursor && !this.stage
      const r = s.add.rectangle(x, yy, bw, bh, sel ? 0x4a3a1a : 0x1a1408).setStrokeStyle(2, sel ? 0xffffff : 0x5e4f3e)
      r.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.stage || !this.waiting) return
        if (this.cursor === i) { this.act(); return }
        this.cursor = i; this.touched = true; sfx(this.scene, 'hover'); this.draw()
      })
      this.c.add(r)
      this.c.add(s.add.text(x, yy, `${failed ? '✗ ' : ''}${this.label(id)}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: st.wide ? '14px' : '15px', color: failed ? DIM : '#fff', align: 'center', wordWrap: { width: bw - 16 } }).setOrigin(0.5))
    })
    this.pickRows = rows
  }

  // the split: one column per player, coins handed out with UP/DOWN
  drawSplit(X, y, W) {
    const s = this.scene, g = this.card.g, n = g.n
    const cw = (W - 40) / n
    const t = (x, yy, str, o = {}) => { const tt = s.add.text(x, yy, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#fff', ...o }).setOrigin(0.5); this.c.add(tt); return tt }
    for (let i = 0; i < n; i++) {
      const cx = X + 20 + (i + 0.5) * cw
      const sel = i === this.cursor && !this.stage
      const box = s.add.rectangle(cx, y + 52, cw - 10, 114, sel ? 0x4a3a1a : 0x1a1408).setStrokeStyle(2, sel ? 0xffffff : 0x5e4f3e)
      box.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!this.stage && this.waiting) { this.cursor = i; this.touched = true; this.draw() } })
      this.c.add(box)
      t(cx, y + 8, g.names[i])
      t(cx, y + 26, g.roles[i], { fontSize: '14px', color: ROSE })
      const up = t(cx, y + 48, '▲', { fontSize: '18px', color: '#ffd166' })
      const dn = t(cx, y + 94, '▼', { fontSize: '18px', color: '#ffd166' })
      t(cx, y + 71, `${this.x[i]}`, { fontSize: '22px' })
      const hitUp = s.add.rectangle(cx, y + 46, 60, 26, 0xffffff, 0.001), hitDn = s.add.rectangle(cx, y + 96, 60, 26, 0xffffff, 0.001)
      this.c.add([hitUp, hitDn])
      hitUp.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.give(i, 1))
      hitDn.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.give(i, -1))
    }
    const left = this.left()
    t(X + W / 2 - 70, y + 130, (this.leftText && this.leftText(left)) || (left > 0 ? `Coins left to hand out: ${left}` : 'Every coin is handed out.'), { fontSize: '15px', color: left > 0 ? CREAM : '#7dffb0' })
    const lock = s.add.rectangle(X + W - 90, y + 130, 110, 30, left === 0 ? 0x4a3a1a : 0x1a1408).setStrokeStyle(2, left === 0 ? 0xffffff : 0x5e4f3e)
    lock.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (!this.stage && this.waiting) { this.touched = true; this.act() } })
    this.c.add(lock)
    t(X + W - 90, y + 130, 'LOCK IT', { fontSize: '15px', color: left === 0 ? '#fff' : DIM })
  }

  give(i, d) {
    if (this.stage || !this.waiting) return
    const st = this.steps[this.step]
    if (st.type !== 'split') return
    if ((d > 0 && this.left() <= 0) || (d < 0 && this.x[i] <= 0)) { if (!this.holding) sfx(this.scene, 'block'); return }
    this.x[i] += d
    this.cursor = i
    this.touched = true
    sfx(this.scene, 'hover')
    this.draw()
  }

  // ---- logic ---------------------------------------------------------------
  act() {
    if (!this.active || !this.waiting || this.stage) return
    if (this.scene.time.now - this.dealtAt < 600) return
    const st = this.steps[this.step]
    if (st.type === 'split') {
      if (this.left() > 0) { this.hint.setColor('#ffd166'); this.say(`Hand out all ${nw(this.card.g.T)} coins before you lock it.`, 16); sfx(this.scene, 'hover'); return }
      const key = `${this.step}:${this.x.join(',')}`
      if (this.failed.has(key)) { sfx(this.scene, 'block'); this.say('You already tried that exact split. Change something first.', 16); return }
      if (this.exactSplit) { if (this.exactSplit(key)) return } else {
      const out = walkout(this.card.g.v, this.x, this.card.g.n)
      if (out != null) return this.wrongSplit(key, out)
      if (this.mode === 'owner' && this.x.slice(1).some((k) => k !== this.card.cap)) return this.wrongSplit(key, null)
      }
      const fb = this.splitRight()
      this.done.push(fb.done)
      if (this.step < this.steps.length - 1) { this.note = fb.note; this.say(fb.line, 16); this.beginStep(this.step + 1); return }
      return this.right(fb.line, fb.note)
    }
    if (!this.touched || this.cursor < 0) { this.hint.setColor('#ffd166'); sfx(this.scene, 'hover'); return }
    const choice = st.opts[this.cursor]
    if (this.failed.has(`${this.step}:${choice}`)) { sfx(this.scene, 'block'); return }
    const ok = choice === st.ans
    const fb = this.feedback(this.step, choice, ok)
    if (!ok) return this.wrong(`${this.step}:${choice}`, fb.note, fb.line, choice)
    if (this.step < this.steps.length - 1) {
      sfx(this.scene, 'clean')
      this.done.push(fb.done)
      this.note = fb.note
      this.say(fb.line, 16)
      this.beginStep(this.step + 1)
      return
    }
    this.done.push(fb.done)
    this.right(fb.line, fb.note)
  }

  splitRight() {
    const c = this.card
    const done = `Split: ${this.x.map((k, i) => `${c.g.names[i]} ${k}`).join(', ')}`
    if (c.mode === 'market') {
      const scarce = c.scarce, more = scarce === 'speaker' ? 'amp' : 'speaker'
      return { done, line: `That holds. There are more ${more}s than ${scarce}s, so the ${scarce} owners take it all.`,
        note: `Pay a spare ${more} owner anything and ${scarce === 'amp' ? 'an' : 'a'} ${scarce} owner teams up with another ${more} owner instead (Example 260.1).` }
    }
    if (c.mode === 'owner') return { done, line: 'That holds. Each dancer gets what one dancer adds, and Corazon keeps the rest.', note: `Every dancer gets between 0 and ${c.cap}, and Corazon gets what's left. That's the core of Exercise 259.3.` }
    if (c.mode === 'veto') { const vn = c.veto.map((i) => (i === 0 ? 'Corazon' : `the ${c.g.names[i]}`)), one = vn.length === 1 && c.veto[0] === 0
      return { done, line: `That holds. Only ${vn.join(' and ')} ${one ? 'gets' : 'get'} paid, because nobody can win without ${one ? 'her' : 'them'}.`, note: 'Pay anyone else a coin and a winning group without them takes the whole pot (Exercise 261.1).' } }
    if (c.mode === 'majority') return { done, line: 'That holds. Every pair gets at least what it earns without the third crew.', note: `A pair earns ${c.p}, which is two-thirds of the take or less, so the core isn't empty (Example 259.1).` }
    return { done, line: 'Nobody walks out. Every group gets at least what it could earn on its own.',
      note: c.hard ? 'That split is in the core, and here it is the only one. Each crew got exactly the take minus what the other two earn without it (this follows from p.259).'
        : 'That split is in the core. A crew can get at most the take minus what the other two earn without it (this follows from p.259).' }
  }

  // what the card says after a pick: { line (spoken), note (on the card), done (the ticked summary) }
  feedback(step, ch, ok) {
    const c = this.card
    if (c.mode === 'walkout') {
      this.x = c.x
      if (ok && ch === 'none') return { line: 'Right. Every group already gets at least what it could earn on its own.', note: 'So this split is in the core. No group can do better for all its members by leaving (Def. 258.2).', done: 'Nobody walks out' }
      if (ok) { const m = +ch.slice(1); return { line: `Right. ${this.cap(this.gname(m))} earn ${coins(c.g.v[m])} ${members(m, 3).length === 2 ? `without ${this.gname(7 ^ m)}` : 'on their own'}, and this split gives them ${this.xs(m) ? `only ${coins(this.xs(m))}` : 'nothing'}.`, note: "A group walks out when it earns more alone than its members' shares add up to (Def. 258.2).", done: `${this.cap(this.gname(m))} walk out` } }
      if (ch === 'none') return { line: 'Check every group against what it earns on its own. One of them can do better.', note: "Add up each group's shares from the pink split and compare that with its worth." }
      const m = +ch.slice(1)
      return { line: `${this.cap(this.gname(m))} get ${coins(this.xs(m))} here and could only earn ${coins(c.g.v[m])} without ${this.gname(7 ^ m)}, so they stay.`, note: c.ans === 'none' ? 'Check every other group the same way.' : 'Look for a group whose shares add up to less than what it earns on its own.' }
    }
    if (c.mode === 'owner') {
      const f = c.f, w = c.w, k = +ch.slice(1)
      if (ok) return { line: `Yes. Pay a dancer more than ${coins(c.cap)} and the rest walk out, since they earn ${nw(f[w - 1])} without him.`, note: `One dancer adds ${f[w]} − ${f[w - 1]} = ${c.cap} to the rest, so each dancer gets between 0 and ${c.cap}. Now set a split.`, done: `A dancer can get up to ${c.cap}` }
      if (k > c.cap) return { line: `Pay a dancer ${coins(k)} and the rest share only ${nw(f[w] - k)}, but they earn ${nw(f[w - 1])} without him.`, note: `Without one dancer, Corazon and the rest still earn ${f[w - 1]}. What does one dancer add?` }
      return { line: 'A dancer can get more than that and still keep the crew together.', note: `Without one dancer, Corazon and the rest still earn ${f[w - 1]}. What does one dancer add?` }
    }
    if (c.mode === 'majority') {
      if (step === 0) {
        if (ok && c.holds) return { line: `Yes. A pair earns ${nw(c.p)}, and a split can give every pair at least that much.`, note: 'When a pair earns two-thirds of the take or less, the core is not empty (Example 259.1).', done: 'Some split holds' }
        if (ok) return { line: 'Zero will love this. However you split it, some pair can earn more by leaving.', note: 'So the core of this game is empty. Now work out why (Example 259.1).', done: 'Every split breaks' }
        if (c.holds) return { line: 'There is a split that every pair accepts. Look again at what a pair needs.', note: 'Try giving each pair what it earns on its own, and see whether the take covers it.' }
        return { line: `Any two crews earn ${nw(c.p)}. Check whether the take can give every pair that much at once.`, note: 'Add up what the three pairs need, and compare it with twice the take, since each crew sits in two pairs.' }
      }
      if (c.holds) {
        if (ok) return { line: 'Yes. Even counting every crew twice, the pairs can all get their worth at once.', note: `The three pairs share ${2 * c.g.T} coins, counting each crew twice, and need ${3 * c.p}. A pair worth two-thirds of the take or less keeps the core non-empty (Example 259.1).`, done: 'The take covers every pair' }
        if (ch === 'less') return { line: "Every pair earns less than the take in every game here, even when no split holds.", note: 'Look at what all three pairs need at once.' }
        return { line: 'Nobody walks out alone, true, but a pair still could.', note: 'Look at what all three pairs need at once.' }
      }
      if (ok) return { line: 'That\'s it. Each crew sits in two pairs, so the pairs can never all be paid.', note: `Every split gives the three pairs ${2 * c.g.T} in all, counting each crew twice, and they need ${3 * c.p}. So a pair worth more than two-thirds of the take leaves no core.`, done: 'The pairs need more than the take' }
      if (ch === 'take') return { line: 'Those numbers are right, but the pairs overlap. Every crew is counted in two of them.', note: `Each coin a crew gets counts for both of its pairs, so the pairs share ${2 * c.g.T} in all.` }
      return { line: "More than half isn't enough. When each pair earns four out of six, a split still holds.", note: 'Look at what all three pairs need at once.' }
    }
    // veto
    const vn = c.veto.map((i) => (i === 0 ? 'Corazon' : `the ${c.g.names[i]}`)), one = vn.length === 1 && c.veto[0] === 0
    if (step === 0) {
      if (ok && c.holds) return { line: `Yes. ${this.cap(vn.join(' and '))} ${one ? 'is' : 'are'} in every winning group, so nobody wins without ${one ? 'her' : 'them'}. That makes ${one ? 'her a veto player' : vn.length === 1 ? 'them a veto player' : 'them veto players'}.`, note: 'A player in every winning group is a veto player (Exercise 261.1). Now set a split nobody walks out on.', done: 'Some split holds' }
      if (ok) return { line: 'Right. However you split this pot, some winning group can do better. Now say why.', note: 'So the core of this game is empty. Now work out why (Exercise 261.1).', done: 'Every split breaks' }
      if (c.holds) return { line: 'Someone is in every winning group. Could any group win without them?', note: 'Look for a player that every winning group needs.' }
      return { line: 'Is anyone in every winning group? Without that, some group can always cut out a share.', note: 'Try to find a winning group that leaves out each player in turn.' }
    }
    if (ok) return { line: 'Exactly. Whoever you pay, a winning group without them can take the pot.', note: 'Nobody is in every winning group, so there is no veto player and the core is empty (Exercise 261.1).', done: 'No veto player' }
    if (ch === 'fake') return { line: `Check again. A group can win under this rule without ${c.fakeVeto}.`, note: 'Look for a winning group that leaves out each player in turn.' }
    return { line: "Winning groups overlap when there's a veto player too, and those deals still hold.", note: 'Look at who every winning group needs.' }
  }

  // a split someone walks out on costs health and stays, with the group that left named
  wrongSplit(key, m) {
    const c = this.card
    this.failed.add(key)
    if (m == null) { // owner card: it holds, but some dancer is paid less than the most he could get
      this.done.push(`✗ Nobody walked out, but a dancer could get more than that.`)
      this.note = `Pay each dancer the most a dancer can get, ${c.cap}, and Corazon keeps the rest.`
      this.walkouts = (this.walkouts || 0) + 1
      this.redeal = this.walkouts >= 2
      if (this.redeal) { this.stage = 'redealing'; this.lastWrong = 'Two short splits'; this.note = `The split this card asked for: ${this.coreHint()}. Yours held too, but each dancer could get more.` }
      this.draw()
      this.say(this.redeal ? 'That split shortchanged a dancer again, so this card is spent.' : 'That split holds, but you shortchanged a dancer. Pay each one as much as you can.', 16)
      return this.miss()
    }
    const vS = c.g.v[m], xS = this.xs(m), G = this.gname(m)
    const shout = this.enemyName === 'Mural' ? ['TOLD YOU, PINK!', 'THEY WALKED, PINK!', 'MY CREWS KNOW THEIR WORTH!'] : ['WRONG RECORD, HONEY!', 'THE PARTY JUST LEFT, HONEY!', 'SCRATCH THAT RECORD!']
    this.scene.floatText(this.enemy.x, this.enemy.y - 330, shout[Math.floor(Math.random() * shout.length)], this.enemyName === 'Mural' ? '#ffb36b' : '#ffd166', 4100, 600)
    const hints = {
      split: "A crew can't get more than the take minus what the other two earn without it.",
      market: 'A spare owner is easy to replace. Which side is in short supply?',
      owner: `No dancer can get more than ${c.cap}, and Corazon keeps the rest.`,
      majority: `Any two crews earn ${c.p} together, so every pair needs at least ${c.p}.`,
      veto: 'A winning group that leaves someone out can take the whole pot.',
    }
    this.done.push(`✗ ${this.cap(G)} walked out. ${c.g.n === 3 && members(m, 3).length === 2 ? `Without ${this.gname(7 ^ m)}` : members(m, c.g.n).length > 1 ? 'Together' : 'On their own'} they earn ${vS}, and your split gave them ${xS}.`)
    this.note = hints[c.mode]
    this.walkouts = (this.walkouts || 0) + 1
    this.redeal = this.walkouts >= 2
    if (this.redeal) { this.stage = 'redealing'; this.lastWrong = 'Two walkouts'; this.note = `${this.note} ${c.g.core.length === 1 ? 'The only split that holds' : 'One split that holds'}: ${this.coreHint()}.` }
    this.draw()
    this.say(this.redeal ? `${this.cap(G)} walked out. That's a second walkout, so this card is spent. Let's try a fresh one.` : `${this.cap(G)} can do better without the rest, so they walked out. Fix the split and lock it again.`, 16)
    this.miss()
  }

  // a split that holds on this card, for the note when the card is spent
  coreHint() {
    const c = this.card, x = c.mode === 'owner' ? c.g.core.find((y) => y.slice(1).every((k) => k === c.cap)) : c.g.core[0]
    const s = x.map((k, i) => `${c.g.names[i]} ${k}`).join(', ')
    return c.mode === 'split' && c.hard ? `${s} (each crew gets the take, ${c.g.T}, minus what the other two earn: ${[6, 5, 3].map((m) => c.g.v[m]).join(', ')})` : s
  }

  // what the spent card's answer was, so a redeal still teaches it
  reveal() {
    const c = this.card, st = this.steps[this.step]
    if (c.mode === 'walkout') {
      if (c.ans === 'none') return 'On this card, nobody would have walked out.'
      const m = +c.ans.slice(1)
      return `On this card, ${this.gname(m)} would walk out: worth ${c.g.v[m]}, given ${members(m, 3).reduce((t, i) => t + c.x[i], 0)}.`
    }
    if (c.mode === 'owner') return `On this card, a dancer could get up to ${c.cap}.`
    if (c.mode === 'veto' && (st.ans === 'holds' || st.ans === 'breaks')) return st.ans === 'holds' ? `On this card, ${c.vetoName} ${c.veto.length === 1 && c.veto[0] === 0 ? 'was a veto player' : c.veto.length === 1 ? 'were a veto player' : 'were veto players'}, so a split held.` : 'On this card, nobody was in every winning group, so every split broke.'
    if (st.ans === 'holds' || st.ans === 'breaks') return `On this card, ${st.ans === 'holds' ? 'some split held' : 'every split broke'}.`
    return `The right answer: ${this.label(st.ans).charAt(0).toLowerCase()}${this.label(st.ans).slice(1)}`
  }

  // a wrong pick costs health and, once read, deals a fresh card of the same kind
  wrong(key, note, line, choice) {
    this.failed.add(key)
    this.note = `${note} ${this.reveal()}`
    this.redeal = true
    this.stage = 'redealing'
    this.lastWrong = this.label(choice)
    this.draw()
    this.say(line, 16)
    this.miss()
  }

  right(line, note = null) {
    sfx(this.scene, 'clean')
    const c = this.card
    if (c.mode === 'majority' || c.mode === 'veto') {
      if (!c.holds) {
        SEEN_EMPTY[this.enemyName] = true
        if (!this.gloated) { this.gloated = true; this.pendingGloat = true }
      } else if (SEEN_EMPTY[this.enemyName] !== true) SEEN_EMPTY[this.enemyName] = false
    }
    this.stage = 'busy'
    this.misses = 0
    this.note = note
    this.draw()
    this.say(line, 16)
    this.scene.time.delayedCall(1400, () => {
      this.stage = 'hit'
      this.stageAt = this.scene.time.now
      this.prompt.setText('SPACE: land the hit').setVisible(true)
    })
  }

  miss() {
    const sc = this.scene
    this.misses++
    const dmg = this.misses >= 3 ? 4 : this.misses >= 2 ? 3 : 2
    this.waiting = false
    sfx(sc, 'punished')
    this.lisa.hp -= dmg
    this.lisa.flash(); this.lisa.setPose('hurt')
    sc.floatText(this.lisa.x + 40, this.lisa.y - 300, `-${dmg}`, '#ff6b7a', 4400)
    sc.cameras.main.shake(100, 0.004)
    sc.time.delayedCall(900, () => {
      this.lisa.setPose('idle')
      if (this.lisa.hp <= 0) { this.end(); this.onLose(); return }
      this.waiting = true
      if (this.redeal) {
        this.redeal = false
        this.stage = 'redeal'
        const lw = this.lastWrong.length > 30 ? 'That reason' : this.lastWrong
        this.done.push(/^(Two|A wrong) /.test(lw) ? `✗ ${lw}, so this card is spent. A fresh one starts over.` : `✗ ${lw === 'That reason' ? 'That reason' : `"${lw}"`} was wrong, so this card is spent. A fresh one starts over.`)
        this.stageAt = sc.time.now
        this.draw()
        this.prompt.setText('SPACE: new card').setVisible(true)
      }
    })
  }

  landHit() {
    const sc = this.scene
    this.stage = 'busy'
    this.prompt.setVisible(false)
    const x0 = this.lisa.x
    this.lisa.setPose('kick')
    sc.tweens.add({ targets: this.lisa, x: this.enemy.x - 150, duration: 160, yoyo: true, hold: 180, onComplete: () => { this.lisa.x = x0 } })
    sc.time.delayedCall(170, () => {
      this.enemy.setPose('hurt')
      sfx(sc, 'clash'); sc.time.delayedCall(100, () => sfx(sc, 'hitHeavy'))
      this.hp -= 1
      this.hits += 1
      RESUME[`${this.enemyName}:${this.phaseIdx}`] = this.hp > 0 ? this.hits : 0
      this.enemy.flash()
      sc.floatText(this.enemy.x, this.enemy.y - 280, 'HIT!', '#7dffb0', 4400)
      sc.spark(this.enemy.x - 30, this.enemy.y - 170)
      sc.cameras.main.shake(140, 0.006)
    })
    sc.time.delayedCall(1400, () => {
      this.lisa.setPose('idle'); this.enemy.setPose('idle')
      const ready = () => {
        this.c.setAlpha(1)
        this.stage = 'next'
        this.stageAt = sc.time.now
        this.prompt.setText(this.hp <= 0 ? 'SPACE: finish it' : 'SPACE: next card').setVisible(true)
      }
      if (!this.pendingGloat) return ready()
      this.pendingGloat = false
      sc.caption.hide()
      this.c.setAlpha(0.35)
      sc.talk([{ who: 'zero', cue: 'zeroScreen', text: 'You see, my dears? However you deal it, nobody stays.' }, { who: 'zero', cue: 'zeroScreenOff', text: 'Every crew walks in the end.' }], ready)
    })
  }

  nextCard() {
    const sc = this.scene
    this.stage = null
    if (this.hp <= 0) { this.end(); this.onPhaseWin(this.phaseIdx); return }
    sc.floatText(240 + sc.cameras.main.scrollX, this.cardBottom + 70, 'NEW CARD!', '#ffd166', 4400)
    sfx(sc, 'freeze')
    this.deal()
  }

  end() {
    this.active = false
    this.waiting = false
    this.scene.tweens.add({ targets: this.c, alpha: 0, duration: 250, onComplete: () => this.c.setVisible(false) })
  }

  update() {
    if (!this.active || !this.waiting) return
    const p = this.scene.presses
    if (this.stage === 'busy' || this.stage === 'redealing') return
    if (this.stage === 'hit' || this.stage === 'next' || this.stage === 'redeal') {
      if (this.scene.time.now - this.stageAt > 400 && p.take('Space', 'Enter')) this.advance()
      return
    }
    const st = this.steps[this.step]
    if (st.type === 'split') {
      const n = this.card.g.n
      if (p.take('ArrowLeft', 'KeyA')) { this.cursor = (this.cursor + n - 1) % n; this.touched = true; sfx(this.scene, 'hover'); this.draw() }
      else if (p.take('ArrowRight', 'KeyD')) { this.cursor = (this.cursor + 1) % n; this.touched = true; sfx(this.scene, 'hover'); this.draw() }
      else if (p.take('ArrowUp', 'KeyW')) { this.give(this.cursor, 1); this.holdAt = this.scene.time.now + 320 }
      else if (p.take('ArrowDown', 'KeyS')) { this.give(this.cursor, -1); this.holdAt = this.scene.time.now + 320 }
      else if (p.take('Space', 'Enter', 'KeyJ')) this.act()
      else {
        const k = this.scene.keys, up = k && (k.UP.isDown || k.W.isDown), dn = k && (k.DOWN.isDown || k.S.isDown)
        if ((up || dn) && this.scene.time.now > (this.holdAt || 0)) { this.holding = true; this.give(this.cursor, up ? 1 : -1); this.holding = false; this.holdAt = this.scene.time.now + 110 }
      }
      return
    }
    const n = st.opts.length
    if (p.take('ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW')) { this.cursor = this.cursor < 0 ? n - 1 : (this.cursor + n - 1) % n; this.touched = true; sfx(this.scene, 'hover'); this.draw() }
    else if (p.take('ArrowRight', 'KeyD', 'ArrowDown', 'KeyS')) { this.cursor = (this.cursor + 1) % n; this.touched = true; sfx(this.scene, 'hover'); this.draw() }
    else if (p.take('Space', 'Enter', 'KeyJ')) this.act()
  }

  // move on from a prompt: land the hit, deal the next card, or deal a fresh one after a wrong pick
  advance() {
    if (this.stage === 'hit') this.landHit()
    else if (this.stage === 'next') this.nextCard()
    else if (this.stage === 'redeal') { sfx(this.scene, 'freeze'); this.deal(true) }
  }

  // dev hook: take the right answer
  solve() {
    if (!this.waiting || this.stage === 'busy') return
    if (this.stage === 'hit') return this.landHit()
    if (this.stage === 'next') return this.nextCard()
    if (this.stage === 'redeal') { this.deal(true); return }
    this.dealtAt = -1e9
    const st = this.steps[this.step]
    if (st.type === 'split') this.x = (this.target ? this.target() : this.mode === 'owner' ? this.card.g.core.find((x) => x.slice(1).every((k) => k === this.card.cap)) : this.card.g.core[0]).slice()
    else this.cursor = st.opts.indexOf(st.ans)
    this.touched = true
    this.act()
  }
}
