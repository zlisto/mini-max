import { sfx } from '../systems/sfx.js'
import { makeFogCard, PLANS, planValue, driverValue, bluffOutcome } from '../data/fog.js'

// A fog standoff (Chapter 11): Lisa plans and mixes when she can't see, or can't remember.
//  plan:   pick a pure strategy, one action per information set (Def. 203.1); a plan that peeks is refused
//  kuhn:   dial the behavioral chance at the fog patch that matches a mixed strategy (Prop. 214.1, Ex. 216.1)
//  driver: dial how often the forgetful hostess walks on at each door (Fig. 214.1)
//  bluff:  dial how often Lisa insists on seeing the card (Exercise 217.3)
// phase = { hp, cards: [{ mode, book, k }] }
const PINK = '#ff5fa2', BLUE = '#7fd6ff', GOLD = 0xffd166, CREAM = '#e8dcff', DIM = '#7a6a90', FOG = '#b8c4dc'
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const num = (x) => (Math.abs(x - Math.round(x)) < 1e-9 ? `${Math.round(x)}` : (Math.round(x * 100) / 100).toString()).replace('-', '−')
const tenth = (i) => (i === 0 ? 'never' : i === 10 ? 'always' : `${WORD[i]} times in ten`)
const pct = (p) => `${Math.round(p * 10)} in 10`

export class FogStandoff {
  constructor(scene, { lisa, enemy, enemyName, phases, onPhaseWin, onLose, say }) {
    Object.assign(this, { scene, lisa, enemy, enemyName, phases, onPhaseWin, onLose, say })
    this.kind = 'fog'
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
    this.active = true
    this.deal()
    this.c.setVisible(true).setAlpha(0)
    this.scene.tweens.add({ targets: this.c, alpha: 1, duration: 250 })
    sfx(this.scene, 'freeze')
  }

  deal() {
    const cfg = this.ph.cards[Math.min(this.hits, this.ph.cards.length - 1)]
    this.card = makeFogCard(cfg)
    this.mode = this.card.mode
    this.cursor = -1
    this.val = this.startVal(this.card.mode === 'kuhn' ? this.card.hall : this.card.mode === 'driver' || this.card.mode === 'bluff' ? this.card.ans / 10 : -1)
    this.step = 0 // the kuhn card asks two things: how often you take the hall, then how often you swing in the fog
    this.hallDone = null
    this.touched = false
    this.misses = 0
    this.failed = new Set()
    this.stage = null
    this.armed = this.mode !== 'plan'
    this.note = null
    this.dealtAt = this.scene.time.now
    this.draw()
    this.waiting = true
    if (this.mode === 'plan') this.say("In the fog, high and low look the same: they're one information set. Pick a whole plan with one move for it.", 16)
    else if (this.mode === 'kuhn') this.say('That mix picks whole plans. Turn it into a behavioral strategy, a chance at each point you might reach, that comes out the same.', 16)
    else if (this.mode === 'driver') this.say('The doors look alike, and she forgets which one she passed. How often should she walk on at each door?', 16)
    else this.say("You can't see her card. How often should you insist on seeing it when she claims it's high?", 16)
  }

  // a dial starts on a random tenth that isn't the answer, so one tap never wins
  startVal(ans) {
    const opts = Array.from({ length: 11 }, (_, i) => i).filter((i) => Math.abs(i - Math.round(ans * 10)) > 1)
    return opts[Math.floor(Math.random() * opts.length)]
  }

  // ---- drawing -------------------------------------------------------------
  draw() {
    this.c.removeAll(true)
    const s = this.scene
    const X = 16, Y = 16, W = 540
    const H = this.mode === 'plan' ? 350 : 330
    const g = s.add.graphics()
    g.fillStyle(0x0d0820, 0.95).fillRoundedRect(X, Y, W, H, 14).lineStyle(3, GOLD, 1).strokeRoundedRect(X, Y, W, H, 14)
    this.c.add(g)
    const txt = (x, y, str, o = {}) => s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#fff', wordWrap: { width: W - 40 }, ...o })
    const c = this.card
    const titles = { plan: 'FOG PLAN', kuhn: 'MIX IN THE FOG', driver: 'THE HALL OF DOORS', bluff: 'FOG POKER' }
    this.c.add(txt(X + W / 2, Y + 20, titles[this.mode], { fontFamily: 'Bangers', fontSize: '26px', color: '#ffd166' }).setOrigin(0.5))
    const dial = (x, y, label, value = this.val, live = true) => {
      this.c.add(txt(X + 20, y, label, { color: PINK }).setOrigin(0, 0.5))
      const on = live && !this.stage
      this.c.add(s.add.rectangle(x, y, 64, 32, on ? 0x3a1a5a : 0x1a1030).setStrokeStyle(2, on ? 0xffffff : GOLD))
      this.c.add(txt(x, y, (value / 10).toFixed(1), { fontSize: '19px' }).setOrigin(0.5))
      if (on) {
        this.c.add(txt(x - 48, y, '◀', { fontSize: '18px', color: '#ffd166' }).setOrigin(0.5))
        this.c.add(txt(x + 48, y, '▶', { fontSize: '18px', color: '#ffd166' }).setOrigin(0.5))
        this.c.add(txt(x + 72, y, '0 never, 1 always', { fontSize: '14px', color: FOG }).setOrigin(0, 0.5))
      }
    }
    const noteAt = (y, width = W - 40) => { if (this.note) this.c.add(txt(X + 20, y, this.note, { fontSize: '14px', color: '#ffd166', wordWrap: { width } })) }
    if (this.mode === 'plan') {
      const u = c.u
      this.c.add(txt(X + 20, Y + 44, `Walk away: you get ${c.away}. Step in: Smokey plays high (${pct(c.pA)}) or low (${pct(1 - c.pA)}), and you can't see which.`, { color: CREAM }))
      this.c.add(txt(X + 20, Y + 88, `After high: duck ${u.hd}, swing ${u.hs}.    After low: duck ${u.ld}, swing ${u.ls}.`, { color: FOG }))
      c.order.forEach((id, row) => {
        const y = Y + 128 + row * 34
        const P = PLANS.find((p) => p.id === id)
        const failed = this.failed.has(`r${id}`)
        const sel = row === this.cursor && !this.stage
        const r = s.add.rectangle(X + W / 2, y, W - 32, 30, sel ? 0x3a1a5a : 0x1a1030).setStrokeStyle(2, sel ? 0xffffff : 0x4a3f5e)
        r.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
          if (this.stage || !this.waiting) return
          if (this.cursor === row) { this.act(); return }
          this.cursor = row; this.armed = true; sfx(this.scene, 'hover'); this.draw()
        })
        this.c.add(r)
        this.c.add(txt(X + 28, y, `${failed ? '✗ ' : ''}${P.name}`, { fontSize: '14px', color: failed ? DIM : PINK }).setOrigin(0, 0.5))
      })
      noteAt(Y + 290)
    } else if (this.mode === 'kuhn') {
      this.c.add(txt(X + 20, Y + 44, 'Take the stairs and you never meet the fog. Take the hall, Smokey moves, and then you duck or swing in the fog without knowing his move.', { fontSize: '14px', color: CREAM }))
      this.c.add(txt(X + 20, Y + 100, `Your mix of whole plans${c.book ? ' (Exercise 216.1)' : ' †'}:`, { color: BLUE }))
      this.c.add(txt(X + 20, Y + 122, `hall then swing ${c.a}    hall then duck ${c.b}    stairs ${c.c}`, { color: BLUE }))
      dial(X + 230, Y + 168, 'Take the hall:', this.step === 0 ? this.val : this.hallDone, this.step === 0)
      if (this.step === 1) dial(X + 230, Y + 208, 'Swing in the fog:')
      noteAt(Y + 236)
    } else if (this.mode === 'driver') {
      this.c.add(txt(X + 20, Y + 44, "Velma walks a hall of two identical doors. At each door she turns in or walks on, and she can't remember whether she already passed one.", { fontSize: '14px', color: CREAM }))
      this.c.add(txt(X + 20, Y + 100, `Turn in at the first door: ${c.x}. At the second door: ${c.y}. Walk past both: ${c.z}.${c.book ? '' : ' †'}`, { color: BLUE }))
      this.c.add(txt(X + 20, Y + 124, 'Walking on with chance p at each door, she expects (1−p)·first + p(1−p)·second + p·p·past both.', { fontSize: '14px', color: FOG }))
      dial(X + 160, Y + 182, 'Walk on, p:')
      noteAt(Y + 210, W - 200)
      this.drawDoors(X + 446, Y + 228, c)
    } else {
      this.c.add(txt(X + 20, Y + 44, 'Velma draws high or low, each half the time. With low she can admit it and pay you 1, or claim high. With high she always claims high †.', { fontSize: '14px', color: CREAM }))
      this.c.add(txt(X + 20, Y + 100, `When she claims high, you give in and pay her 1, or insist on seeing it, and then a low card pays you ${c.k} and a high card costs you ${c.k}.${c.k === 4 ? '' : ' †'}`, { fontSize: '14px', color: BLUE }))
      dial(X + 160, Y + 182, 'Insist, q:')
      noteAt(Y + 210, W - 200)
      this.drawCard(X + 440, Y + 200)
    }
    const hints = { plan: 'UP/DOWN pick a plan · SPACE play it', kuhn: 'LEFT/RIGHT change it · SPACE lock it', driver: 'LEFT/RIGHT change p · SPACE lock it', bluff: 'LEFT/RIGHT change q · SPACE lock it' }
    this.hint = txt(X + W / 2, Y + H - 13, hints[this.mode], { color: CREAM }).setOrigin(0.5).setVisible(!this.stage)
    this.c.add(this.hint)
    this.cardBottom = Y + H
    this.prompt = s.add.text(X + W / 2, Y + H + 22, '', { fontFamily: 'Bangers', fontSize: '28px', color: '#ffd166', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setVisible(false)
    this.c.add(this.prompt)
    this.c.each((o) => o.setScrollFactor && o.setScrollFactor(0))
  }

  // two identical arched doors, with what turning in at each pays
  drawDoors(x, y, c) {
    const s = this.scene, g = s.add.graphics()
    const door = (dx, label, v) => {
      g.fillStyle(0x5a1a2a, 1).fillRoundedRect(dx - 34, y - 70, 68, 100, { tl: 34, tr: 34, bl: 0, br: 0 }).lineStyle(3, 0xc9a8ff, 1).strokeRoundedRect(dx - 34, y - 70, 68, 100, { tl: 34, tr: 34, bl: 0, br: 0 })
      this.c.add(s.add.text(dx, y - 10, '?', { fontFamily: 'Bangers', fontSize: '30px', color: '#c9a8ff' }).setOrigin(0.5))
      this.c.add(s.add.text(dx, y + 44, `${label}: ${v}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '13px', color: '#7fd6ff' }).setOrigin(0.5))
    }
    this.c.add(g)
    door(x - 44, 'first', c.x); door(x + 44, 'second', c.y)
    this.c.add(s.add.text(x, y + 60, `past both: ${c.z}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '13px', color: '#7fd6ff' }).setOrigin(0.5))
  }

  // Velma's card, face down
  drawCard(x, y) {
    const s = this.scene, g = s.add.graphics()
    g.fillStyle(0x2a1a4a, 1).fillRoundedRect(x - 40, y - 56, 80, 112, 10).lineStyle(3, 0xc9a8ff, 1).strokeRoundedRect(x - 40, y - 56, 80, 112, 10)
    g.lineStyle(2, 0x7a6a90, 1).strokeRoundedRect(x - 30, y - 46, 60, 92, 6)
    this.c.add(g)
    this.c.add(s.add.text(x, y, '?', { fontFamily: 'Bangers', fontSize: '44px', color: '#c9a8ff' }).setOrigin(0.5))
    this.c.add(s.add.text(x, y + 72, 'high or low?', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '13px', color: '#b8c4dc' }).setOrigin(0.5))
  }

  // ---- logic ---------------------------------------------------------------
  act() {
    if (!this.active || !this.waiting || this.stage) return
    if (this.scene.time.now - this.dealtAt < 600) return
    // an untouched dial is not an answer: flash the hint instead of charging a miss
    if (!this.armed || (this.cursor < 0 && this.mode === 'plan') || (this.mode !== 'plan' && !this.touched)) { this.hint.setColor('#ffd166'); sfx(this.scene, 'hover'); return }
    const c = this.card
    if (this.mode === 'plan') {
      const id = c.order[this.cursor], P = PLANS.find((p) => p.id === id)
      if (P.peek) return this.wrong(`r${id}`, 'That plan needs to know his move, but in the fog high and low look the same. A plan picks one action for the whole information set.', "You can't see his move in the fog, so your plan can't depend on it.")
      if (c.best.includes(id)) return this.right('Right. Without seeing through the fog, no plan averages more than that one.', `That plan averages ${num(c.vals[id])}.`)
      const note = P.first === 'away'
        ? `Walking away gets ${c.away} whatever he does. A plan still names a fog move, though you never reach the fog. Another plan averages more.`
        : `That plan averages ${num(c.vals[id])}. Weigh each result by how often he plays high and low. Another plan averages more.`
      return this.wrong(`r${id}`, note, P.first === 'away' ? 'Walking away is safe, but stepping in pays more on average here.' : 'Another plan does better on average. Weigh high and low by how often he plays them.', true)
    }
    if (this.mode === 'kuhn') {
      if (this.step === 0) {
        if (this.val === Math.round(c.hall * 10)) {
          sfx(this.scene, 'clean')
          this.step = 1; this.hallDone = this.val; this.val = this.startVal(c.ans); this.touched = false
          this.note = `Right, the plans that take the hall add up to ${c.hall}. Now, once you're in the fog, how often do you swing?`
          this.draw()
          this.say('Right. Now pick how often you swing once you reach the fog.', 16)
          return
        }
        return this.wrong(`h${this.val}`, `Add up every plan in the mix that takes the hall. Taking it ${(this.val / 10).toFixed(1)} of the time doesn't match.`, "That isn't how often your mix takes the hall. Add up the plans that do.")
      }
      if (this.val === Math.round(c.ans * 10)) return this.right("Right. You only swing when you reach the fog, so you count just the times you take the hall.", `Hall then swing comes out ${c.hall} × ${(this.val / 10).toFixed(1)} = ${c.a}, and hall then duck ${c.hall} × ${(1 - this.val / 10).toFixed(1)} = ${c.b}, as in the mix. With perfect recall every mix has a twin like this (Prop. 214.1).`)
      const note = Math.abs(this.val / 10 - c.a) < 1e-9
        ? `${c.a} is how often you swing overall. But you only reach the fog when you take the hall, ${c.hall} of the time.`
        : `Swinging ${(this.val / 10).toFixed(1)} of the time in the fog gives hall then swing ${num(c.hall * this.val / 10)}, not ${c.a}.`
      return this.wrong(`k${this.val}`, note, 'That mix comes out different. Count only the times you actually reach the fog.')
    }
    if (this.mode === 'driver') {
      const v = c.vals[this.val]
      if (this.val === c.ans) return this.right("Right. Walking on at that rate beats always and never, because she can't remember which door she's at.",
        `She expects ${num(v)}. A coin tossed once to pick always or never ${c.vals[0] === c.vals[10] ? `gets only ${num(c.vals[0])}` : `averages between ${num(Math.min(c.vals[0], c.vals[10]))} and ${num(Math.max(c.vals[0], c.vals[10]))}`}, so only tossing at every door gets ${num(v)}. That's imperfect recall.`)
      return this.wrong(`d${this.val}`, `At p = ${(this.val / 10).toFixed(1)} she expects ${num(v)}. Walking on more risks walking past both doors, and walking on less turns her in too early. Balance the two.`, "She can do better than that rate. Work out what she'd expect at a few others.")
    }
    // bluff
    const q = this.val / 10, out = bluffOutcome(c.k, q), herBluff = (1 - q) - q * c.k
    if (this.val === c.ans) return this.right("Right. At that rate bluffing gains her nothing, so she can't make you lose any more than this.",
      `A bluff now gets her exactly −1, the same as admitting. In equilibrium she bluffs ${num((c.k - 1) / (c.k + 1))} of her low cards †, and you still lose ${num(-c.value)} a round: the card is hers to see.`)
    const sums = `A bluff gets her ${num(1 - q)} − ${num(q * c.k)} = ${num(herBluff)}, and admitting gets her −1.`
    const note = out.bluffs === 'always'
      ? `${sums} So she bluffs every low card, and you lose ${num(-out.lisa)} a round.`
      : `${sums} So she never bluffs, and you pay the showdown on her high cards. You lose ${num(-out.lisa)} a round.`
    return this.wrong(`q${this.val}`, note, "At that rate she has a reply that costs you more. Look at her sums on the card.")
  }

  wrong(key, note, line, reshuffle = false) {
    if (this.failed.has(key)) { sfx(this.scene, 'block'); return }
    this.failed.add(key)
    this.note = note
    if (reshuffle) { const id = this.card.order[this.cursor]; this.card.order.sort(() => Math.random() - 0.5); this.cursor = -1; this.armed = false; this.failed.add(`r${id}`) } // a miss reshuffles the rows
    this.draw()
    this.say(line, 16)
    this.miss()
  }

  right(line, note = null) {
    sfx(this.scene, 'clean')
    this.stage = 'busy'
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
    if (this.mode !== 'plan') {
      if (p.take('ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS')) { this.val = Math.max(0, this.val - 1); this.armed = true; this.touched = true; sfx(this.scene, 'hover'); this.draw() }
      else if (p.take('ArrowRight', 'KeyD', 'ArrowUp', 'KeyW')) { this.val = Math.min(10, this.val + 1); this.armed = true; this.touched = true; sfx(this.scene, 'hover'); this.draw() }
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
    if (this.mode === 'plan') this.cursor = c.order.indexOf(c.best[0])
    else if (this.mode === 'kuhn') this.val = Math.round((this.step === 0 ? c.hall : c.ans) * 10)
    else this.val = c.ans
    this.touched = true
    this.act()
  }
}
