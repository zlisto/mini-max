import { sfx } from '../systems/sfx.js'
import { makeRematchCard, play } from '../data/repeated.js'

// A rematch standoff (Chapter 8). The card is the repeated Prisoner's Dilemma of Figure 134.1 against a rival
// whose strategy is a machine (Section 8.4). Lisa picks a plan, also a machine, and the card plays the two
// against each other round by round. A plan is right when nothing on the menu does better against that rival:
// a best reply in the repeated game, valued by discounting (Section 8.3) or, on a finite circuit, by the
// average over the rounds (Section 8.10).
// phase = { hp, cards: [{ mode: 'disc', rival: [...], deltas, otherSide } | { mode: 'finite', T, ks }] }
const PINK = '#ff5fa2', BLUE = '#7fd6ff', GOLD = 0xffd166
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight']

export class RematchStandoff {
  constructor(scene, { lisa, enemy, enemyName, pronoun = 'he', phases, onPhaseWin, onLose, say }) {
    Object.assign(this, { scene, lisa, enemy, enemyName, phases, onPhaseWin, onLose, say })
    this.P = pronoun === 'she' ? { sub: 'she', obj: 'her', poss: 'her', Sub: 'She', Poss: 'Her' } : { sub: 'he', obj: 'him', poss: 'his', Sub: 'He', Poss: 'His' }
    this.kind = 'rematch'
    this.phaseIdx = 0
    this.c = scene.add.container(0, 0).setScrollFactor(0).setDepth(4200).setVisible(false)
    this.active = false
    this.waiting = false
  }

  startPhase(i = this.phaseIdx) {
    this.phaseIdx = i
    this.ph = this.phases[i]
    if (this.ph.mix) {
      const pair = Math.random() < 0.5 ? this.ph.mix.pair : [{ ...this.ph.mix.pair[1], sameDelta: false, deltas: this.ph.mix.pair[0].deltas }, { ...this.ph.mix.pair[0], sameDelta: true }]
      const cards = [...pair]
      cards.splice(Math.random() < 0.5 ? 0 : 2, 0, this.ph.mix.extra) // never between the same-patience pair
      this.ph = { ...this.ph, cards }
    }
    this.hp = this.ph.hp
    this.hits = 0
    this.prev = null
    this.active = true
    this.deal()
    this.c.setVisible(true).setAlpha(0)
    this.scene.tweens.add({ targets: this.c, alpha: 1, duration: 250 })
    sfx(this.scene, 'freeze')
  }

  deal() {
    const cfg = this.ph.cards[Math.min(this.hits, this.ph.cards.length - 1)]
    this.card = makeRematchCard(cfg, this.prev)
    this.prev = this.card
    this.cursor = -1 // nothing chosen yet
    this.shown = null // the plan last played out on the card
    this.misses = 0
    this.failed = new Set()
    this.stage = null
    this.armed = false
    this.dealtAt = this.scene.time.now
    this.draw()
    this.waiting = true
    const c = this.card
    if (c.mode === 'unravel') { this.say('This is the last card of the circuit. Which pair of plans could two sensible fighters settle on, with neither wanting to switch?', 16); return }
    this.say(c.mode === 'finite'
      ? `This circuit ends after ${WORD[c.T]} rounds, and your score is your average. Pick the plan that does best against ${this.enemyName}'s.`
      : `Each round counts ${Math.round(c.delta * 100)}% as much as the one before. Pick the plan that does best against ${this.rname()}.`, 16)
    if (this.hits > 0 || this.phaseIdx > 0) sfx(this.scene, 'go') // the bell for another bout
  }

  cap(t) { return t.replace(/^./, (x) => x.toUpperCase()) }

  rname() { return this.card.who || `${this.enemyName}'s machine` }

  pc(x) { return `${Math.round(x * 100)}%` }
  f2(x) { return (Math.round(x * 100) / 100).toFixed(2) }

  // ---- drawing -------------------------------------------------------------
  draw() {
    this.c.removeAll(true)
    const s = this.scene
    const X = 16, Y = 16, W = 540, H = 300
    const g = s.add.graphics()
    g.fillStyle(0x0d0820, 0.95).fillRoundedRect(X, Y, W, H, 14).lineStyle(3, GOLD, 1).strokeRoundedRect(X, Y, W, H, 14)
    this.c.add(g)
    const txt = (x, y, str, o = {}) => s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color: '#fff', ...o })
    const c = this.card, n = this.enemyName
    this.c.add(txt(X + W / 2, Y + 20, 'REMATCH CARD', { fontFamily: 'Bangers', fontSize: '26px', color: '#ffd166' }).setOrigin(0.5))
    this.c.add(txt(X + W / 2, Y + 44, 'both spar 3 each · both cheat 1 each · a cheap shot on a sparrer 4, and the sparrer 0', { fontSize: '13px', color: '#e8dcff' }).setOrigin(0.5))
    this.c.add(txt(X + W / 2, Y + 62, c.mode !== 'disc' ? `${WORD[c.T]} rounds, then the circuit ends · your score is your average per round` : `each round counts ${this.pc(c.delta)} as much as the last · your score is what you earn per round`, { fontSize: '13px', color: '#e8dcff' }).setOrigin(0.5))
    this.c.add(txt(X + 20, Y + 88, c.mode === 'unravel' ? 'Pick the pair where neither of you gains by switching plans.' : `${this.cap(c.who || `${n}'s machine`)}: ${c.rival.name}, which ${c.rival.desc}.`, { color: BLUE, fontSize: '13px', wordWrap: { width: W - 40 } }).setOrigin(0, 0.5))
    // the menu of plans, in a shuffled order
    c.order.forEach((mi, row) => {
      const rh = c.order.length > 4 ? 21 : 26
      const m = c.mode === 'unravel' ? { name: `${c.pairs[mi].a.name}`, desc: `against ${c.pairs[mi].b.name}` } : c.menu[mi], y = Y + 124 + row * rh
      const sel = row === this.cursor && !this.stage
      const r = s.add.rectangle(X + W / 2, y, W - 32, rh - 2, sel ? 0x3a1a5a : 0x1a1030).setStrokeStyle(2, sel ? 0xffffff : 0x4a3f5e)
      r.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.stage) return; this.cursor = row; this.armed = true; this.draw(); this.pickPlan() })
      this.c.add(r)
      this.c.add(txt(X + 28, y, m.name, { color: PINK }).setOrigin(0, 0.5))
      this.c.add(txt(X + (c.mode === 'disc' ? 190 : 222), y, m.desc, { fontSize: '13px', color: '#e8dcff' }).setOrigin(0, 0.5))
    })
    // the rounds of the last plan played out
    if (this.shown) {
      const { rounds, va } = this.shown.res
      const y0 = Y + 242
      const un = c.mode === 'unravel'
      this.c.add(txt(X + 20, y0, un ? 'first' : 'you', { color: PINK }).setOrigin(0, 0.5))
      this.c.add(txt(X + 20, y0 + 22, un ? 'second' : 'rival', { color: BLUE }).setOrigin(0, 0.5))
      rounds.forEach((r, k) => {
        const x = X + 92 + k * 46
        const cell = (yy, a) => {
          this.c.add(s.add.rectangle(x, yy, 40, 18, a === 'C' ? 0x2a5a3a : 0x6a1a2a).setStrokeStyle(1, 0x000000))
          this.c.add(txt(x, yy, a === 'C' ? 'spar' : 'cheat', { fontSize: '12px' }).setOrigin(0.5))
        }
        cell(y0, r.a); cell(y0 + 22, r.b)
        this.c.add(txt(x, y0 - 16, `${r.u[0]}`, { fontSize: '12px', color: PINK }).setOrigin(0.5))
      })
      this.c.add(txt(X + W - 18, y0 + 11, c.mode === 'unravel' ? `${this.f2(va)} · ${this.f2(this.shown.res.vb)}\neach a round` : `${this.f2(va)}\na round`, { fontSize: '13px', color: '#ffd166', align: 'right' }).setOrigin(1, 0.5))
    }
    this.hint = txt(X + W / 2, Y + H - 12, c.mode === 'unravel' ? 'UP/DOWN pick a pair · SPACE play it out' : 'UP/DOWN pick a plan · SPACE play it out', { color: '#e8dcff' }).setOrigin(0.5).setVisible(!this.stage)
    this.c.add(this.hint)
    this.cardBottom = Y + H
    this.prompt = s.add.text(X + W / 2, Y + H + 22, '', { fontFamily: 'Bangers', fontSize: '28px', color: '#ffd166', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setVisible(false)
    this.c.add(this.prompt)
    this.c.each((o) => o.setScrollFactor && o.setScrollFactor(0))
  }

  // ---- logic ---------------------------------------------------------------
  pickPlan() {
    if (!this.active || !this.waiting || this.stage) return
    if (this.scene.time.now - this.dealtAt < 600) return
    if (!this.armed || this.cursor < 0) { this.hint.setColor('#ffd166'); sfx(this.scene, 'hover'); return } // pick one first: the hint lights up
    const c = this.card, mi = c.order[this.cursor]
    if (c.mode === 'unravel') return this.pickPair(mi)
    const m = c.menu[mi]
    const res = play(m, c.rival, { delta: c.delta, T: c.mode === 'finite' ? c.T : null, show: c.show })
    this.shown = { mi, res }
    this.draw()
    const v = c.values[mi]
    if (v >= c.best - 1e-9) return this.right(m, v)
    const key = `${mi}`
    if (this.failed.has(key)) { sfx(this.scene, 'block'); return }
    this.failed.add(key)
    this.say(`${m.name} earns ${this.f2(v)} a round against ${this.rname()}. Another plan on the card earns more, ${this.f2(c.best)}.`, 16)
    this.miss()
  }

  right(m, v) {
    const c = this.card, n = this.enemyName, d = c.delta
    sfx(this.scene, 'clean')
    this.stage = 'busy'
    this.draw()
    let why
    if (c.mode === 'finite') {
      why = c.k === 0
        ? `In the last round a cheap shot costs you nothing, since there's no rematch left to lose. So spar until then and cheat at the end.`
        : `${n} cheats in the last ${c.k === 1 ? 'round' : `${WORD[c.k]} rounds`}, so cheating one round before ${this.P.obj} gains you a point over the circuit. ${this.P.Sub} can play the same trick on you, and step by step the cheating creeps back to round one.`
    } else if (c.rival.id === 'allD') {
      why = 'This rival cheats no matter what, so sparring only earns you zero. Cheating back gets you one a round, your minmax, and nobody can hold you below that.'
    } else {
      // the best cheating plan on the card, against sparring's three
      const cheats = c.menu.map((x, i) => [x, c.values[i]]).filter(([x]) => x.id === 'allD' || x.id === 'once').sort((p, q) => q[1] - p[1])
      const [cm, cv] = cheats[0]
      why = m.id === 'allD' || m.id === 'once'
        ? c.rival.id === 'one'
          ? `${this.cap(this.rname())} forgives after one round, so tonight's four costs you only one round of punishment. At ${this.pc(d)}, a grudge that short can't keep you sparring.`
          : `At ${this.pc(d)} tomorrow counts so little that tonight's four outweighs anything ${this.rname()} can do to you afterward.`
        : `The best cheating plan, ${cm.name}, earns only ${this.f2(cv)} a round, because ${this.rname()} punishes it. Sparring every round earns you three.`
    }
    this.scene.time.delayedCall(1200, () => {
      this.say(`${m.name} earns ${this.f2(v)} a round, as much as anything on the card. ${why}`, 16)
      this.stage = 'hit'
      this.stageAt = this.scene.time.now
      this.prompt.setText('SPACE: land the hit').setVisible(true)
    })
  }

  // the unravel card: which pair of plans is an equilibrium of the finite circuit?
  pickPair(mi) {
    const c = this.card, pr = c.pairs[mi]
    const res = play(pr.a, pr.b, { T: c.T, show: c.T })
    this.shown = { mi, res }
    this.draw()
    if (mi === c.answer) {
      sfx(this.scene, 'clean')
      this.stage = 'busy'
      this.draw()
      this.scene.time.delayedCall(1200, () => {
        this.say('Right. Both cheat and earn only one a round, less than sparring would. But against a cheater, cheating is your best plan too, so neither wants to switch.', 16)
        this.stage = 'hit'
        this.stageAt = this.scene.time.now
        this.prompt.setText('SPACE: land the hit').setVisible(true)
      })
      return
    }
    const key = `pair${mi}`
    if (this.failed.has(key)) { sfx(this.scene, 'block'); return }
    this.failed.add(key)
    const why = pr.kind === 'CC' ? 'either of you could do better by cheating in the last round'
      : pr.kind === 'D0' ? 'the Grim player would do better by cheating from the start'
        : 'either of you could do better by cheating one round sooner'
    this.say(`In that pair, ${why}, so it isn't an equilibrium.`, 16)
    this.miss()
  }

  miss() {
    const sc = this.scene
    this.misses++
    const dmg = this.misses >= 2 ? 3 : 2
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
    const n = this.card.order.length
    if (p.take('ArrowUp', 'KeyW', 'ArrowLeft', 'KeyA')) { this.cursor = this.cursor < 0 ? n - 1 : (this.cursor + n - 1) % n; this.armed = true; sfx(this.scene, 'hover'); this.draw() }
    else if (p.take('ArrowDown', 'KeyS', 'ArrowRight', 'KeyD')) { this.cursor = (this.cursor + 1) % n; this.armed = true; sfx(this.scene, 'hover'); this.draw() }
    else if (p.take('Space', 'Enter', 'KeyJ')) this.pickPlan()
  }

  // dev hook: pick a best plan
  solve() {
    if (!this.waiting || this.stage === 'busy') return
    if (this.stage === 'hit') return this.landHit()
    if (this.stage === 'next') return this.nextCard()
    this.dealtAt = -1e9
    this.armed = true
    const c = this.card
    this.cursor = c.mode === 'unravel' ? c.order.indexOf(c.answer) : c.order.findIndex((mi) => c.values[mi] >= c.best - 1e-9)
    this.pickPlan()
  }
}
