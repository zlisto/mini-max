import { sfx } from '../systems/sfx.js'
import { makeBargainCard, endlessKeeps, PIE } from '../data/bargain.js'

// A bargaining standoff (Chapter 7).
// Hank's cards: a ladder of alternating offers with a deadline (†), settled from the last round up, where each
// offer is just what waiting is worth to whoever answers (backward induction).
// The boss's cards: the book's endless game on a loop. Lisa picks what she keeps when she proposes, runs the
// chain (what the rival must then offer her, what she must offer back), and it closes only at the subgame
// perfect split of (122.2), Example 125.1 (p.125). `respond` cards then judge the rival's real opening offer
// by the acceptance rule of Prop. 122.1.
// phase = { hp, cards: [{ mode, T, first, d, respond }] }
const PINK = '#ff5fa2', BLUE = '#7fd6ff', GOLD = 0xffd166

export class BargainStandoff {
  constructor(scene, { lisa, enemy, enemyName, pronoun = 'he', phases, onPhaseWin, onLose, say }) {
    Object.assign(this, { scene, lisa, enemy, enemyName, phases, onPhaseWin, onLose, say })
    this.P = pronoun === 'she' ? { sub: 'she', obj: 'her', poss: 'her', Sub: 'She', Poss: 'Her' } : { sub: 'he', obj: 'him', poss: 'his', Sub: 'He', Poss: 'His' }
    this.kind = 'bargain'
    this.phaseIdx = 0
    this.c = scene.add.container(0, 0).setScrollFactor(0).setDepth(4200).setVisible(false)
    this.active = false
    this.waiting = false
    this.lastDelta = null
  }

  startPhase(i = this.phaseIdx) {
    this.phaseIdx = i
    this.ph = this.phases[i]
    this.hp = this.ph.hp
    this.hits = 0
    this.active = true
    this.deal()
    this.c.setVisible(true).setAlpha(0)
    this.scene.tweens.add({ targets: this.c, alpha: 1, duration: 250 })
    sfx(this.scene, 'freeze')
  }

  deal() {
    const cfg = this.ph.cards[Math.min(this.hits, this.ph.cards.length - 1)]
    this.used = this.used || []
    this.card = makeBargainCard({ ...cfg, avoid: this.used })
    this.used.push(this.card.d[0])
    this.misses = 0
    this.failed = new Set()
    this.stage = null
    this.armed = false
    this.choice = null
    this.dealtAt = this.scene.time.now
    const d = this.card.d
    const wind = d[0] === d[1]
      ? `Each round you wait, a coin shrinks to ${this.pc(d[0])} of its worth now, for both of you.`
      : `Each round you wait, a coin shrinks to ${this.pc(d[0])} of its worth for you and ${this.pc(d[1])} for ${this.enemyName}.`
    if (this.card.mode === 'endless') {
      this.a = Math.floor(Math.random() * 60) + 20
      this.runs = 0
      this.tried = null
      this.draw()
      this.waiting = true
      this.say(`${wind} This game has no last round, so pick your keep and press SPACE to run the chain.`, 16)
      return
    }
    this.rows = this.card.rows
    this.T = this.rows.length
    this.set = new Array(this.T).fill(null)
    this.cur = this.T - 1
    this.val = Math.floor(Math.random() * 60) + 20
    this.draw()
    this.waiting = true
    this.say(`${wind} This ladder has a deadline †. Start at the last round and work up.`, 16)
  }

  pc(x) { return `${Math.round(x * 100)}%` }
  fmt(x) { const r = Math.round(x * 10) / 10; return Math.abs(r - Math.round(r)) < 1e-9 ? `${Math.round(r)}` : r.toFixed(1) }

  // ---- drawing -------------------------------------------------------------
  frame(title) {
    this.c.removeAll(true)
    const s = this.scene
    const X = 16, Y = 16, W = 540, H = 300
    const g = s.add.graphics()
    g.fillStyle(0x0d0820, 0.95).fillRoundedRect(X, Y, W, H, 14).lineStyle(3, GOLD, 1).strokeRoundedRect(X, Y, W, H, 14)
    this.c.add(g)
    const txt = (x, y, str, o = {}) => s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#fff', ...o }).setOrigin(0.5)
    const d = this.card.d
    this.c.add(txt(X + W / 2, Y + 20, title, { fontFamily: 'Bangers', fontSize: '26px', color: '#ffd166' }))
    this.c.add(txt(X + W / 2, Y + 44, `after a round's wait a coin is worth ${this.pc(d[0])} to you and ${this.pc(d[1])} to ${this.enemyName}`, { fontSize: '14px', color: '#e8dcff' }))
    return { s, X, Y, W, H, txt }
  }

  finish(X, Y, W, H, txt, hint) {
    this.hint = txt(X + W / 2, Y + H - 12, hint, { fontSize: '14px', color: '#e8dcff' }).setVisible(!this.stage || this.stage === 'respond')
    this.c.add(this.hint)
    this.cardBottom = Y + H
    this.prompt = this.scene.add.text(X + W / 2, Y + H + 22, '', { fontFamily: 'Bangers', fontSize: '28px', color: '#ffd166', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setVisible(false)
    this.c.add(this.prompt)
    this.c.each((o) => o.setScrollFactor && o.setScrollFactor(0))
  }

  draw() { return this.card.mode === 'endless' ? this.drawLoop() : this.drawLadder() }

  drawLadder() {
    const { s, X, Y, W, H, txt } = this.frame('BARGAINING LADDER')
    const top = Y + 70, rh = Math.min(38, 172 / this.T)
    this.rows.forEach((r, t) => {
      const y = top + rh * (t + 0.5)
      const mine = r.proposer === 0
      this.c.add(txt(X + 44, y, `ROUND ${t + 1}`, { fontFamily: 'Bangers', fontSize: '17px', color: '#ffd166' }))
      this.c.add(s.add.circle(X + 92, y, 8, mine ? 0xff5fa2 : 0x7fd6ff).setStrokeStyle(2, 0xffffff))
      this.c.add(s.add.text(X + 106, y, mine ? `you offer ${this.enemyName}` : `${this.enemyName} offers you`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color: mine ? PINK : BLUE }).setOrigin(0, 0.5))
      const live = t === this.cur && !this.stage
      const shown = this.set[t] != null ? this.set[t] : live ? this.val : null
      this.c.add(s.add.rectangle(X + 330, y, 58, rh - 8, live ? 0x3a1a5a : 0x1a1030).setStrokeStyle(2, this.set[t] != null ? GOLD : live ? 0xffffff : 0x4a3f5e))
      this.c.add(txt(X + 330, y, shown == null ? '?' : `${shown}`, { fontSize: '18px', color: this.set[t] != null ? '#ffd166' : '#fff' }))
      this.c.add(s.add.text(X + 368, y, shown == null ? '' : `${mine ? 'you keep' : `${this.P.sub} keeps`} ${PIE - shown}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color: mine ? PINK : BLUE }).setOrigin(0, 0.5))
      if (t === this.T - 1) this.c.add(s.add.text(X + W - 12, y, 'last', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color: '#b9a6e0' }).setOrigin(1, 0.5))
    })
    this.finish(X, Y, W, H, txt, 'LEFT/RIGHT ±1 · UP/DOWN ±10 · SPACE lock the offer')
  }

  // the chain round the loop, for a keep a
  chain(a) {
    const d = this.card.d
    const v = d[0] * a // what waiting is worth to Lisa, so what the rival must offer her
    const herKeep = PIE - v
    const w = d[1] * herKeep // what waiting is worth to the rival, so what Lisa must offer her
    return { v, herKeep, w, back: PIE - w }
  }

  drawLoop() {
    const { s, X, Y, W, H, txt } = this.frame('BARGAINING LOOP')
    const n = this.enemyName, P = this.P, d = this.card.d
    const box = (x, y, v, live) => {
      this.c.add(s.add.rectangle(x, y, 60, 28, live ? 0x3a1a5a : 0x1a1030).setStrokeStyle(2, live ? 0xffffff : GOLD))
      this.c.add(txt(x, y, v, { fontSize: '17px', color: live ? '#fff' : '#ffd166' }))
    }
    const line = (y, str, color) => this.c.add(s.add.text(X + 20, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color }).setOrigin(0, 0.5))
    // the chain is shown for the keep the player last ran, not live, so it has to be worked out
    const t = this.tried
    const ch = t != null ? this.chain(t) : null
    const q = (x) => (ch ? this.fmt(x) : '?')
    if (this.stage !== 'respond') {
      line(Y + 80, 'When you propose, you keep', PINK); box(X + 330, Y + 80, `${this.a}`, !this.stage)
      line(Y + 120, t != null ? `With a keep of ${t}, ${n} then offers you ${this.pc(d[0])} of it,` : `Then when ${n} proposes, ${P.sub} offers you ${this.pc(d[0])} of your keep,`, BLUE); box(X + 470, Y + 120, q(ch && ch.v), false)
      line(Y + 160, `${P.Sub} keeps the rest, and you offer ${P.obj} ${this.pc(d[1])} of that. You keep`, PINK); box(X + 470, Y + 160, q(ch && ch.back), false)
      line(Y + 200, t != null ? 'The loop closes when the last box is within half a coin of the first.' : 'Press SPACE to run the chain for your keep.', '#e8dcff')
    } else {
      line(Y + 80, `When you propose, you keep ${this.a}.`, PINK)
      line(Y + 120, `When ${n} opens, ${P.sub} must offer what waiting is worth to you.`, BLUE)
      this.c.add(txt(X + W / 2, Y + 176, `${n} actually offers you ${this.card.offer}.`, { fontSize: '16px', color: BLUE }))
      ;['ACCEPT', 'REJECT'].forEach((lab, k) => {
        const bx = X + W / 2 + (k === 0 ? -70 : 70)
        const r = s.add.rectangle(bx, Y + 222, 110, 30, this.choice === k ? 0x5a2a8a : 0x2a0f4a).setStrokeStyle(3, this.choice === k ? 0xffffff : 0x6b5b8a)
        r.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.choice = k; this.answer() })
        this.c.add([r, txt(bx, Y + 222, lab, { fontFamily: 'Bangers', fontSize: '22px', color: '#ffd166' })])
      })
    }
    this.finish(X, Y, W, H, txt, this.stage === 'respond' ? 'LEFT/RIGHT choose · SPACE answer' : 'LEFT/RIGHT ±1 · UP/DOWN ±10 · SPACE run the chain')
  }

  // ---- the ladder ----------------------------------------------------------
  lock() {
    if (!this.active || !this.waiting || this.stage) return
    if (this.scene.time.now - this.dealtAt < 600) return
    if (!this.armed) { this.say('Set the number with the arrow keys first, then press SPACE.', 16); return }
    const t = this.cur, r = this.rows[t], v = this.val, n = this.enemyName
    const mine = r.proposer === 0 // Lisa proposes, the rival answers
    const last = t === this.T - 1
    if (v === r.offer) {
      this.set[t] = v
      sfx(this.scene, 'clean')
      this.say(last
        ? mine ? `Right. If ${n} turns down the last offer ${this.P.sub} gets nothing, so ${this.P.sub}'ll take whatever you give, even nothing.`
          : `Right. Turn down the last offer and you get nothing, so ${n} can offer you nothing and you'd still take it.`
        : mine ? `Right. Waiting would get ${n} ${r.next} next round, worth ${this.fmt(r.worth)} now after the wind, so offering ${v} matches it.`
          : `Right. Waiting would get you ${r.next} next round, worth ${this.fmt(r.worth)} now, so ${n} offers you ${v} to match it.`, 16)
      this.cur -= 1
      this.val = this.cur >= 0 ? Math.floor(Math.random() * 60) + 20 : v
      this.armed = false
      this.draw()
      if (this.cur < 0) this.ladderDone()
      return
    }
    const key = `${t},${v}`
    if (this.failed.has(key)) { sfx(this.scene, 'block'); return }
    this.failed.add(key)
    let line
    if (last) line = mine ? `That's too generous. If ${n} turns down the last offer ${this.P.sub} gets nothing, so offering nothing is enough.`
      : `${n} wouldn't offer that much. In the last round a refusal leaves you with nothing, so ${this.P.sub} can offer nothing.`
    else if (v < r.offer) line = mine ? `${n} would turn down ${v}. Waiting gets ${this.P.obj} ${r.next} next round, worth ${this.fmt(r.worth)} now.`
      : `You'd turn down ${v}. Waiting gets you ${r.next} next round, worth ${this.fmt(r.worth)} now, so ${n} has to offer more.`
    else line = mine ? `That's too generous. Waiting is only worth ${this.fmt(r.worth)} to ${n}, so any coin above that is one you give away.`
      : `${n} wouldn't go that high. Waiting is only worth ${this.fmt(r.worth)} to you, so ${this.P.sub} only needs to offer ${r.offer}.`
    this.say(line, 16)
    this.miss()
  }

  ladderDone() {
    this.stage = 'busy'
    this.draw()
    const r0 = this.rows[0]
    const myKeep = r0.proposer === 0 ? r0.keep : r0.offer
    let line = `${r0.proposer === 0 ? `${this.enemyName} takes your first offer` : `You take ${this.enemyName}'s first offer`}, so no coins blow away. You end with ${myKeep}, the subgame perfect deal.`
    const lastMine = this.rows[this.T - 1].proposer === 0
    if (myKeep === PIE / 2) line += ' Here the deadline splits it evenly.'
    else line += ` Here, whoever proposes in the last round has the edge, and that's ${lastMine ? 'you' : this.enemyName}.`
    this.scene.time.delayedCall(1400, () => this.toHit(line))
  }

  // ---- the loop ------------------------------------------------------------
  runLoop() {
    if (!this.active || !this.waiting || this.stage) return
    if (this.scene.time.now - this.dealtAt < 600) return
    if (!this.armed) { this.say('Set your keep with the arrow keys first, then press SPACE.', 16); return }
    const k = this.card.keeps.lisa, a = this.a
    this.tried = a
    this.runs++
    const ch = this.chain(a)
    // with whole coins, the loop closes for a keep that comes back within half a coin (compare Exercise 128.1)
    if (Math.abs(ch.back - a) <= 0.5) {
      sfx(this.scene, 'clean')
      const d = this.card.d
      this.say(`Keeping ${a} brings you back to ${this.fmt(ch.back)}, which is within half a coin, so the loop closes.`, 16)
      if (this.card.respond) {
        this.stage = 'respond'
        this.choice = null
        this.card.offer = Math.max(0, Math.min(PIE, Math.round(d[0] * a) + [-7, -3, -1, 0, 1, 2, 6][Math.floor(Math.random() * 7)]))
        this.draw()
        this.say(`That's what you keep whenever you propose. This time ${this.enemyName} opens, so do you accept ${this.P.poss} offer or reject it?`, 16)
        return
      }
      this.stage = 'busy'
      this.draw()
      if (d[0] !== d[1]) {
        const same = endlessKeeps([d[1], d[1]]).lisa
        const s2 = Math.round(same), line = `So you keep ${a} when you propose. With ${this.enemyName}'s patience you'd keep ${s2}, so ${a > s2 ? `being more patient earns you ${a - s2} coins` : `your impatience costs you ${s2 - a} coins`}.`
        this.scene.time.delayedCall(1400, () => this.toHit(line))
        return
      }
      this.scene.time.delayedCall(1400, () => this.toHit(`With coins cut finer you'd keep exactly ${this.fmt(k)}, and every other keep drifts toward it. ${this.P.Sub} accepts at once, and you keep more than half because you proposed first.`))
      return
    }
    // a run that doesn't close shows where the chain sends you. The first is free; after that the wind costs a point of health.
    this.draw()
    sfx(this.scene, 'block')
    this.say(`Keeping ${a} brings you back to ${this.fmt(ch.back)}, so the same split can't work every round. Read the chain and try again.`, 16)
    if (this.runs > 1) this.miss(1)
  }

  // ---- answering the rival's real opening offer ------------------------------
  answer() {
    if (this.stage !== 'respond' || !this.waiting) return
    if (this.choice == null) { this.say('Pick ACCEPT or REJECT with the arrow keys first, then press SPACE.', 16); return }
    const x = this.card.offer, worth = this.card.d[0] * this.a
    const good = x >= worth - 1e-9, right = (this.choice === 0) === good
    const wv = this.fmt(worth)
    if (!right) {
      this.say(this.choice === 0
        ? `You accepted too soon. Next round you'd propose and keep ${this.a}, so waiting is worth ${wv} to you, more than ${x}.`
        : `Rejecting costs you. Waiting is worth only ${wv} to you, and ${this.P.sub} offered ${x}.`, 16)
      if (this.choice === 1 && this.scene.cue) this.scene.cue('ledgerPile') // holding out: the wind takes some of the pile
      // a new offer, so a wrong guess doesn't hand over the answer
      this.card.offer = Math.max(0, Math.min(PIE, Math.round(worth) + [-6, -2, -1, 0, 1, 3, 5][Math.floor(Math.random() * 7)]))
      this.choice = null
      this.miss()
      this.scene.time.delayedCall(950, () => this.stage === 'respond' && this.draw())
      return
    }
    this.stage = 'busy'
    this.draw()
    sfx(this.scene, 'clean')
    this.scene.time.delayedCall(400, () => this.toHit(good
      ? `Right. An offer of ${x} covers the ${wv} that waiting is worth, so you take it now. Holding out would only feed the wind.`
      : `Right. An offer of ${x} falls short of the ${wv} that waiting is worth. ${this.P.Poss} threat not to budge is empty, since next round you propose and keep ${this.a}.`))
  }

  // ---- shared --------------------------------------------------------------
  miss(dmg = this.misses >= 1 ? 3 : 2) {
    const sc = this.scene
    this.misses++
    this.waiting = false
    sfx(sc, 'punished')
    this.lisa.hp -= dmg
    this.lisa.flash(); this.lisa.setPose('hurt')
    sc.floatText(this.lisa.x + 110, this.lisa.y - 150, `-${dmg}`, '#ff6b7a', 4400)
    sc.cameras.main.shake(100, 0.004)
    sc.time.delayedCall(900, () => {
      this.lisa.setPose('idle')
      if (this.lisa.hp <= 0) { this.end(); this.onLose(); return }
      this.waiting = true
    })
  }

  toHit(line) {
    this.say(line, 16)
    this.stage = 'hit'
    this.stageAt = this.scene.time.now
    this.prompt.setText('SPACE: close the deal').setVisible(true)
  }

  landHit() {
    const sc = this.scene
    this.stage = 'busy'
    this.prompt.setVisible(false)
    const x0 = this.lisa.x
    this.lisa.setPose('strike')
    sc.tweens.add({ targets: this.lisa, x: this.enemy.x - 150, duration: 160, yoyo: true, hold: 180, onComplete: () => { this.lisa.x = x0 } })
    sc.time.delayedCall(170, () => {
      this.enemy.setPose('hurt')
      sfx(sc, 'clash'); sc.time.delayedCall(100, () => sfx(sc, 'hitHeavy'))
      this.hp -= 1
      this.hits += 1
      this.enemy.flash()
      sc.floatText(this.enemy.x, this.enemy.y - 280, 'DEAL!', '#ffffff', 4400)
      sc.spark(this.enemy.x - 30, this.enemy.y - 170)
      sc.cameras.main.shake(140, 0.006)
    })
    sc.time.delayedCall(1400, () => {
      this.lisa.setPose('idle'); this.enemy.setPose('idle')
      this.stage = 'next'
      this.stageAt = sc.time.now
      this.prompt.setText(this.hp <= 0 ? 'SPACE: finish it' : 'SPACE: next card').setVisible(true)
    })
  }

  nextCard() {
    const sc = this.scene
    this.stage = null
    if (this.hp <= 0) { this.end(); this.onPhaseWin(this.phaseIdx); return }
    sc.floatText(240 + sc.cameras.main.scrollX, this.cardBottom + 40, 'NEW CARD!', '#ffd166', 4400)
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
    if (this.stage === 'busy') return
    if (this.stage === 'hit' || this.stage === 'next') {
      if (this.scene.time.now - this.stageAt > 400 && p.take('Space', 'Enter')) (this.stage === 'hit' ? this.landHit() : this.nextCard())
      return
    }
    if (this.stage === 'respond') {
      if (p.take('ArrowLeft', 'KeyA')) { this.choice = 0; sfx(this.scene, 'hover'); this.draw() }
      else if (p.take('ArrowRight', 'KeyD')) { this.choice = 1; sfx(this.scene, 'hover'); this.draw() }
      else if (p.take('Space', 'Enter', 'KeyJ')) this.answer()
      return
    }
    const loop = this.card.mode === 'endless'
    const bump = (dv) => { if (loop) this.a = Math.max(0, Math.min(PIE, this.a + dv)); else this.val = Math.max(0, Math.min(PIE, this.val + dv)); this.armed = true; sfx(this.scene, 'hover'); this.draw() }
    if (p.take('ArrowLeft', 'KeyA')) bump(-1)
    else if (p.take('ArrowRight', 'KeyD')) bump(1)
    else if (p.take('ArrowDown', 'KeyS')) bump(-10)
    else if (p.take('ArrowUp', 'KeyW')) bump(10)
    else if (p.take('Space', 'Enter', 'KeyJ')) (loop ? this.runLoop() : this.lock())
  }

  // dev hook: take the next correct step
  solve() {
    if (!this.waiting || this.stage === 'busy') return
    if (this.stage === 'hit') return this.landHit()
    if (this.stage === 'next') return this.nextCard()
    this.dealtAt = -1e9
    this.armed = true
    if (this.stage === 'respond') { this.choice = this.card.offer >= this.card.d[0] * this.a - 1e-9 ? 0 : 1; return this.answer() }
    if (this.card.mode === 'endless') { this.a = Math.round(this.card.keeps.lisa); if (Math.abs(this.chain(this.a).back - this.a) > 0.5) this.a = Math.floor(this.card.keeps.lisa); return this.runLoop() }
    this.val = this.rows[this.cur].offer
    this.lock()
  }
}
