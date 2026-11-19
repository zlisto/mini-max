import { sfx } from '../systems/sfx.js'
import { makeMechCard, RULES, VOTE_RULES, SHOWS, COST, NARROW, solomonOutcome, whereLieLoses } from '../data/mechanism.js'

// A rulebook standoff (Chapter 10). Lisa is the planner who writes the rules.
//  claim:   Lisa as one claimant: pick her best claim under the posted rule (does lying pay?). Under a Groves
//           rule the others' claims are hidden, and only a claim that is best whatever they claim passes.
//  rule:    pick the payment rule for the stage upgrade under which nobody ever gains by lying (Prop. 184.2)
//  vote:    pick a rule for a three-way vote that leaves nobody a profitable lie and lets every show win
//           (Gibbard-Satterthwaite, Prop. 181.2 with condition 181.3)
//  solomon: set the fine in Solomon's game form so the true owner gets the part either way (Example 191.2)
// phase = { hp, cards: [{ mode, rule, set }] }
const PINK = '#ff5fa2', BLUE = '#7fd6ff', GOLD = 0xffd166, CREAM = '#e8dcff', DIM = '#7a6a90'
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const ORD = ['one', 'two', 'three']
const num = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? `${Math.round(x)}` : x.toFixed(2))
const say = (x) => (Math.abs(x - Math.round(x)) < 1e-9 && x >= 0 && x <= 12 ? WORD[Math.round(x)] : num(x))
const sh = (r) => r.map((k) => SHOWS[k]).join(', ')

export class RulebookStandoff {
  constructor(scene, { lisa, enemy, enemyName, pronoun = 'she', phases, onPhaseWin, onLose, say: speak }) {
    Object.assign(this, { scene, lisa, enemy, enemyName, phases, onPhaseWin, onLose, say: speak })
    this.kind = 'rulebook'
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
    this.lastSol = null
    this.active = true
    this.deal()
    this.c.setVisible(true).setAlpha(0)
    this.scene.tweens.add({ targets: this.c, alpha: 1, duration: 250 })
    sfx(this.scene, 'freeze')
  }

  deal() {
    const cfg = this.ph.cards[Math.min(this.hits, this.ph.cards.length - 1)]
    this.card = makeMechCard({ ...cfg, avoid: cfg.mode === 'solomon' ? this.lastSol : null })
    this.mode = this.card.mode
    if (this.mode === 'solomon') this.lastSol = [this.card.vL + 1, this.card.vH - 1]
    this.cursor = -1
    this.val = 0
    this.misses = 0
    this.failed = new Set()
    this.stage = null
    this.armed = this.mode === 'claim' || this.mode === 'solomon' // a dial's starting value can be locked as it is
    this.note = null
    this.dealtAt = this.scene.time.now
    this.draw()
    this.waiting = true
    const c = this.card
    if (this.mode === 'claim' && c.hidden) this.say(`Your true value is ${WORD[c.v]}, and this time you can't see the others' claims. Pick the claim that's best whatever they claim.`, 16)
    else if (this.mode === 'claim') this.say(`The upgrade costs ${WORD[COST]}. It's worth ${WORD[c.v]} to you, and the other two claim ${WORD[c.o]} between them. What claim pays you best?`, 16)
    else if (this.mode === 'rule') this.say('Pick the payment rule where nobody ever gains by lying about what the upgrade is worth to them.', 16)
    else if (this.mode === 'vote') this.say('Pick the vote rule where nobody ever gains by lying about their ranking, and any of the three shows can still win.', 16)
    else this.say('Set the fine so the real owner gets the part, whichever of the two claimants that turns out to be.', 16)
  }

  // ---- drawing -------------------------------------------------------------
  draw() {
    this.c.removeAll(true)
    const s = this.scene
    const X = 16, Y = 16, W = 540
    const H = this.mode === 'solomon' ? 350 : this.mode === 'claim' ? 320 : 340
    const g = s.add.graphics()
    g.fillStyle(0x0d0820, 0.95).fillRoundedRect(X, Y, W, H, 14).lineStyle(3, GOLD, 1).strokeRoundedRect(X, Y, W, H, 14)
    this.c.add(g)
    const txt = (x, y, str, o = {}) => s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#fff', wordWrap: { width: W - 40 }, ...o })
    const c = this.card
    const titles = { claim: 'CLAIM CARD', rule: 'RULEBOOK', vote: 'BALLOT', solomon: "SOLOMON'S RULE" }
    this.c.add(txt(X + W / 2, Y + 20, titles[this.mode], { fontFamily: 'Bangers', fontSize: '26px', color: '#ffd166' }).setOrigin(0.5))
    const dial = (x, y) => {
      this.c.add(s.add.rectangle(x, y, 64, 32, this.stage ? 0x1a1030 : 0x3a1a5a).setStrokeStyle(2, this.stage ? GOLD : 0xffffff))
      this.c.add(txt(x, y, `${this.val}`, { fontSize: '19px' }).setOrigin(0.5))
      if (!this.stage) {
        this.c.add(txt(x - 48, y, '◀', { fontSize: '18px', color: '#ffd166' }).setOrigin(0.5))
        this.c.add(txt(x + 48, y, '▶', { fontSize: '18px', color: '#ffd166' }).setOrigin(0.5))
      }
      this.c.add(txt(x + 72, y, 'from 0 to 12', { fontSize: '13px', color: DIM }).setOrigin(0, 0.5))
    }
    if (this.mode === 'claim') {
      const r = RULES[c.rule]
      this.c.add(txt(X + 20, Y + 46, `Rule: ${r.name}. The upgrade is built if the three claims add up to at least ${COST}, and ${r.desc}.`, { color: CREAM }))
      this.c.add(txt(X + 20, Y + 112, `Your true value: ${c.v}`, { color: PINK }))
      this.c.add(txt(X + 20, Y + 138, c.hidden ? "The others' claims: hidden until you lock yours" : `The others' claims: ${c.others[0]} and ${c.others[1]}`, { color: BLUE }))
      this.c.add(txt(X + 20, Y + 178, 'Your claim:', { color: PINK }))
      dial(X + 190, Y + 188)
      if (this.note) this.c.add(txt(X + 20, Y + 218, this.note, { fontSize: '14px', color: '#ffd166' }))
    } else if (this.mode === 'solomon') {
      this.c.add(txt(X + 20, Y + 44, "Two claimants want the lead part. The first is asked if it's hers: if she says no, the second gets it. If she says yes, the second is asked: if he says no, she gets it. If he says yes, he gets it and pays your fine, and she pays a token fine.", { fontSize: '14px', color: CREAM }))
      this.c.add(txt(X + 20, Y + 130, `The real owner values the part at ${c.vH}. An impostor values it at ${c.vL}.`, { color: BLUE }))
      this.c.add(txt(X + 20, Y + 166, 'Fine:', { color: PINK }))
      dial(X + 130, Y + 174)
      if (this.note) this.c.add(txt(X + 20, Y + 196, this.note, { fontSize: '14px', color: '#ffd166' }))
      this.drawTree(X, Y + 262)
    } else {
      const ids = c.order, R = this.mode === 'rule' ? RULES : VOTE_RULES
      if (this.mode === 'vote') this.c.add(txt(X + 20, Y + 44, `Shows: ${SHOWS.join(', ')}. Each voter ranks all three, with no ties †.`, { fontSize: '14px', color: CREAM }))
      ids.forEach((id, row) => {
        const y = Y + (this.mode === 'vote' ? 84 : 76) + row * 42
        const failed = this.failed.has(`r${id}`)
        const sel = row === this.cursor && !this.stage
        const r = s.add.rectangle(X + W / 2, y, W - 32, 38, sel ? 0x3a1a5a : 0x1a1030).setStrokeStyle(2, sel ? 0xffffff : 0x4a3f5e)
        r.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (this.stage || !this.waiting) return
          if (this.cursor === row) { this.act(); return } // a second click on the chosen rule tests it
          this.cursor = row; this.armed = true; sfx(this.scene, 'hover'); this.draw()
        })
        this.c.add(r)
        this.c.add(txt(X + 28, y - 9, `${failed ? '✗ ' : ''}${R[id].name}`, { color: failed ? DIM : PINK }).setOrigin(0, 0.5))
        this.c.add(txt(X + 28, y + 9, R[id].desc, { fontSize: '14px', color: failed ? DIM : CREAM, wordWrap: { width: W - 44 } }).setOrigin(0, 0.5))
      })
      if (this.note) this.c.add(txt(X + 20, Y + (this.mode === 'vote' ? 250 : 242), this.note, { fontSize: '14px', color: '#ffd166' }))
    }
    const hints = { claim: 'LEFT/RIGHT change your claim · SPACE lock it', solomon: 'LEFT/RIGHT change the fine · SPACE lock it', rule: 'UP/DOWN pick a rule · SPACE test it', vote: 'UP/DOWN pick a rule · SPACE test it' }
    this.hint = txt(X + W / 2, Y + H - 13, hints[this.mode], { color: CREAM }).setOrigin(0.5).setVisible(!this.stage)
    this.c.add(this.hint)
    this.cardBottom = Y + H
    this.prompt = s.add.text(X + W / 2, Y + H + 22, '', { fontFamily: 'Bangers', fontSize: '28px', color: '#ffd166', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setVisible(false)
    this.c.add(this.prompt)
    this.c.each((o) => o.setScrollFactor && o.setScrollFactor(0))
  }

  // Figure 191.1 in small: who moves, and where each answer leads
  drawTree(X, y) {
    const s = this.scene, g = s.add.graphics()
    const box = (x, yy, w, str, col) => {
      g.fillStyle(0x1a1030, 1).fillRoundedRect(x - w / 2, yy - 14, w, 28, 8).lineStyle(2, col, 1).strokeRoundedRect(x - w / 2, yy - 14, w, 28, 8)
      this.c.add(s.add.text(x, yy, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '13px', color: '#fff', align: 'center' }).setOrigin(0.5))
    }
    const lab = (x, yy, str) => this.c.add(s.add.text(x, yy, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color: '#ffd166' }).setOrigin(0.5))
    const A = [X + 80, y], B = [X + 260, y], a = [X + 80, y + 46], b = [X + 260, y + 46], c = [X + 440, y]
    g.lineStyle(2, 0x9a8ab8, 1)
    g.lineBetween(A[0] + 58, A[1], B[0] - 62, B[1]); g.lineBetween(B[0] + 62, B[1], c[0] - 84, c[1])
    g.lineBetween(A[0], A[1] + 14, a[0], a[1] - 14); g.lineBetween(B[0], B[1] + 14, b[0], b[1] - 14)
    this.c.add(g)
    lab((A[0] + B[0]) / 2, y - 12, 'yes'); lab((B[0] + c[0]) / 2 + 10, y - 12, 'yes'); lab(A[0] + 22, y + 30, 'no'); lab(B[0] + 22, y + 30, 'no')
    box(A[0], A[1], 116, 'First: mine?', 0xff5fa2)
    box(B[0], B[1], 124, 'Second: mine?', 0x7fd6ff)
    // after a right fine, light where each kind of owner ends up: a real second owner via no, a real first owner via yes then no
    const lit = this.stage ? 0x7dffb0 : 0x4a3f5e
    box(a[0] + 12, a[1], 152, this.stage ? 'real owner 2nd: gets it' : 'second gets it', lit)
    box(b[0] + 12, b[1], 152, this.stage ? 'real owner 1st: gets it' : 'first gets it', lit)
    box(c[0], c[1], 168, this.stage ? 'never reached' : `second gets it, pays ${this.val}`, 0x4a3f5e)
  }

  // ---- logic ---------------------------------------------------------------
  act() {
    if (!this.active || !this.waiting || this.stage) return
    if (this.scene.time.now - this.dealtAt < 600) return
    if (!this.armed || (this.cursor < 0 && (this.mode === 'rule' || this.mode === 'vote'))) { this.hint.setColor('#ffd166'); sfx(this.scene, 'hover'); return }
    const c = this.card
    if (this.mode === 'claim') return this.lockClaim()
    if (this.mode === 'solomon') return this.lockFine()
    const id = c.order[this.cursor], lie = c.lies[id]
    if (this.mode === 'rule') {
      if (!lie) return this.right(`Right. Under ${RULES[id].name}, you pay just what the others left uncovered, plus a charge your claim can't change, so the truth is best.`)
      return this.wrong(id,
        `If it's worth ${lie.v} to you and the others claim ${lie.o}, the truth leaves you ${num(lie.truth)}, but claiming ${lie.c} leaves you ${num(lie.lie)}.`,
        `Under ${RULES[id].name}, claiming ${WORD[lie.c]} beats the truth when it's worth ${WORD[lie.v]} and the others claim ${WORD[lie.o]}.`)
    }
    // vote
    if (!lie && NARROW[id]) return this.wrong(id, `Nobody gains by lying here, but ${NARROW[id]} can never win, whatever anyone ranks. The rule has to let every show win.`, `Nobody gains by lying under ${VOTE_RULES[id].name}, but ${NARROW[id]} can never win, so it doesn't let every show win.`)
    if (!lie) return this.right(`Right, a dictator. With three shows that can each win, a rule with no profitable lie has to be one. That's the Gibbard–Satterthwaite theorem.`)
    const others = [0, 1, 2].filter((k) => k !== lie.i).map((k) => `Voter ${ORD[k]}: ${sh(lie.prof[k])}.`).join(' ')
    return this.wrong(id,
      `${others} Voter ${ORD[lie.i]}: ${sh(lie.prof[lie.i])}, so ${SHOWS[lie.out]} wins. Voter ${ORD[lie.i]} claims ${sh(lie.lie)} instead and gets ${SHOWS[lie.o2]}.`,
      `Under ${VOTE_RULES[id].name}, voter ${ORD[lie.i]} would rather have ${SHOWS[lie.o2]} than ${SHOWS[lie.out]}, and a false ballot gets it.`)
  }

  lockClaim() {
    const c = this.card, v = this.val
    if (c.claims.includes(v)) {
      return this.right(c.hidden
        ? `Right, the truth. Your claim only decides whether it's built, and the truth gets that right whatever the others claim. Truth is dominant here.`
        : `Right, a lie pays here. Claiming ${WORD[v]} is just enough to get it built, and it costs you less than the truth would.`)
    }
    const key = `c${v}`
    if (this.failed.has(key)) { sfx(this.scene, 'block'); return }
    this.failed.add(key)
    if (c.hidden) {
      const w = whereLieLoses(c.rule, c.v, v)
      this.note = `If the others had claimed ${num(w.o)} in total, your claim of ${v} would leave you ${num(w.lie)}, while the truth would leave you ${num(w.truth)}.`
      this.say(`Your claim of ${WORD[v]} can backfire. Look at the card for a case where it does worse than the truth.`, 16)
    } else {
      const built = v + c.o >= COST
      this.note = built
        ? `A claim of ${v} gets it built, and you pay ${num(RULES[c.rule].pay(v, c.o))}, so you're left with ${num(c.vals[v])}. Another claim leaves you ${num(c.best)}.`
        : `A claim of ${v} brings the total to ${v + c.o}, short of ${COST}, so nothing gets built and you're left with 0. Another claim leaves you ${num(c.best)}.`
      this.say(built ? `Claiming ${WORD[v]} gets it built, but it isn't your best move here. A different claim leaves you more.` : `With a claim of ${WORD[v]}, the total falls short and nothing gets built.`, 16)
    }
    this.draw()
    this.miss()
  }

  lockFine() {
    const c = this.card, M = this.val
    const a = solomonOutcome(c.vH, c.vL, 1, M), b = solomonOutcome(c.vH, c.vL, 2, M)
    const ok = a.gets === 1 && b.gets === 2 && M > c.vL && M < c.vH
    if (ok) return this.right(`Right. With a fine of ${WORD[M]}, the second says yes only if the part is really his. Knowing that, the first says yes only if it's really hers.`)
    const key = `m${M}`
    if (this.failed.has(key)) { sfx(this.scene, 'block'); return }
    this.failed.add(key)
    if (M === c.vL || M === c.vH) {
      const who = M === c.vL ? 'the impostor' : 'the real owner'
      this.note = `At a fine of ${M}, ${who} is exactly indifferent and could go either way, so you can't count on the right answer.`
      this.say(`At a fine of ${WORD[M]}, ${who} could go either way. Look at the tree and work back from the end.`, 16)
    } else if (M < c.vL) {
      this.note = `With a fine of ${M}, an impostor who values the part at ${c.vL} would still say yes and take it.`
      this.say(`A fine of ${WORD[M]} is too cheap. Even an impostor would pay it.`, 16)
    } else {
      this.note = `With a fine of ${M}, even the real owner, who values the part at ${c.vH}, would say no and give it up.`
      this.say(`A fine of ${WORD[M]} is too steep. Even the real owner would back down.`, 16)
    }
    this.draw()
    this.miss()
  }

  wrong(id, note, line) {
    const key = `r${id}`
    if (this.failed.has(key)) { sfx(this.scene, 'block'); return }
    this.failed.add(key)
    this.note = note
    this.draw()
    this.say(line, 16)
    this.miss()
  }

  right(line) {
    sfx(this.scene, 'clean')
    this.stage = 'busy'
    this.note = null
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
    const dmg = this.misses >= 2 ? 3 : 2
    this.waiting = false
    sfx(sc, 'punished')
    this.lisa.hp -= dmg
    this.lisa.flash(); this.lisa.setPose('hurt')
    sc.floatText(this.lisa.x + 40, this.lisa.y - 300, `-${dmg}`, '#ff6b7a', 4400)
    sc.cameras.main.shake(100, 0.004)
    if (this.enemy && this.enemy.prefix === 'redline') sc.cue && sc.cue('redlineSlash')
    sc.time.delayedCall(900, () => {
      this.lisa.setPose('idle')
      if (this.lisa.hp <= 0) { this.end(); this.onLose(); return }
      this.waiting = true
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
      this.enemy.flash()
      sc.floatText(this.enemy.x, this.enemy.y - 280, 'HIT!', '#7dffb0', 4400)
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
    const dial = this.mode === 'claim' || this.mode === 'solomon'
    if (dial) {
      if (p.take('ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS')) { this.val = Math.max(0, this.val - 1); this.armed = true; sfx(this.scene, 'hover'); this.draw() }
      else if (p.take('ArrowRight', 'KeyD', 'ArrowUp', 'KeyW')) { this.val = Math.min(12, this.val + 1); this.armed = true; sfx(this.scene, 'hover'); this.draw() }
      else if (p.take('Space', 'Enter', 'KeyJ')) this.act()
      return
    }
    const n = this.card.order.length
    if (p.take('ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA')) { this.cursor = this.cursor < 0 ? n - 1 : (this.cursor + n - 1) % n; this.armed = true; sfx(this.scene, 'hover'); this.draw() }
    else if (p.take('ArrowDown', 'KeyS', 'ArrowRight', 'KeyD')) { this.cursor = (this.cursor + 1) % n; this.armed = true; sfx(this.scene, 'hover'); this.draw() }
    else if (p.take('Space', 'Enter', 'KeyJ')) this.act()
  }

  // dev hook: take the right answer
  solve() {
    if (!this.waiting || this.stage === 'busy') return
    if (this.stage === 'hit') return this.landHit()
    if (this.stage === 'next') return this.nextCard()
    this.dealtAt = -1e9
    this.armed = true
    const c = this.card
    if (this.mode === 'claim') this.val = c.claims.includes(c.v) ? c.v : c.claims[0]
    else if (this.mode === 'solomon') this.val = Math.floor((c.vH + c.vL) / 2)
    else this.cursor = c.order.findIndex((id) => !c.lies[id] && !NARROW[id])
    this.act()
  }
}
