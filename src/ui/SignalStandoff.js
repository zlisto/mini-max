import { sfx } from '../systems/sfx.js'
import { makeSignalCard, dousers } from '../data/knowledge.js'

// A signal standoff (Chapter 5). Each lamp is one way tonight could go (a state). Gold lamps are the nights
// when the plan works (the event E); dark lamps are the nights it fails. Lisa's pink brackets group the nights
// she can't tell apart, and Tempo's green brackets group his (information partitions, Def. 68.2, p.68).
// You know the plan works on a night only if your whole bracket there is gold (K(E), 69.3, p.69).
// Lisa douses every gold lamp where somebody doesn't know what is still lit, until nothing changes. What stays
// lit is a self-evident event, so there the plan is common knowledge (Def. 73.2, Prop. 74.2, p.74).
// The mail ladder (Section 5.5) ends with a HOLD pass that follows the proof of Proposition 83.1 (pp.83-84).
// phase = { hp, cards: [{ mode, n, minDepth, trap, mark }] }  (a card per hit; the last one repeats)
const PINK = '#ff5fa2', GREEN = '#7dffb0'
const PINK_N = 0xff5fa2, GREEN_N = 0x7dffb0
const GOLD = 0xffd166, TEAL = 0x5ce1d6
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']

export class SignalStandoff {
  constructor(scene, { lisa, enemy, enemyName, pronoun = 'he', phases, onPhaseWin, onLose, say }) {
    Object.assign(this, { scene, lisa, enemy, enemyName, phases, onPhaseWin, onLose, say })
    this.kind = 'signal'
    this.phaseIdx = 0
    this.c = scene.add.container(0, 0).setScrollFactor(0).setDepth(4200).setVisible(false)
    this.active = false
    this.waiting = false
    this.prevMode = null
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
    const cards = this.ph.cards
    const cfg = cards[Math.min(this.hits, cards.length - 1)]
    const g = makeSignalCard(cfg)
    Object.assign(this, { card: g, mode: g.mode, n: g.n, parts: g.parts })
    this.players = g.mode === 'know' ? [0] : [0, 1]
    this.lit = new Set(g.E)
    this.chain = {} // dark lamp -> the knowledge chain that fails there ([] = the plan fails that night)
    for (let w = 0; w < g.n; w++) if (!g.E.has(w)) this.chain[w] = []
    // nights where both partners know E at the start (mutual knowledge), for the marking step and the trap line
    this.mutual = new Set([...g.E].filter((w) => this.players.length > 1 && this.players.every((i) => this.cell(i, w).every((u) => g.E.has(u)))))
    this.marks = new Set()
    this.trapSaid = false
    this.misses = 0
    this.failed = new Set()
    this.stage = cfg.mark ? 'mark' : null
    if (cfg.dark) { // already doused: every night's knowledge chain has run out
      for (const w of g.E) this.chain[w] = new Array(g.depth[w]).fill(0)
      this.lit = new Set()
    }
    this.dealtAt = this.scene.time.now
    this.cursor = Math.floor(Math.random() * g.n)
    this.draw()
    this.waiting = true
    if (this.stage === 'mark') this.say('First, mark every gold night where you both know the plan works, meaning both brackets around it are all gold. Then choose GO.', 16)
    else if (g.mode === 'know') this.say("Douse each gold lamp whose pink bracket also holds a dark one, since on those nights you can't be sure. Choose GO when you're done.", 16)
    else if (g.mode === 'ck' && this.prevMode === 'know') this.say("Now Tempo's green brackets count too. Douse a gold lamp if either bracket holds a lamp that's out, and keep going until nothing changes.", 16)
    else if (g.mode === 'ck') this.say("Douse a gold lamp if your bracket or Tempo's holds a lamp that's out. Keep going until nothing changes, then choose GO.", 16)
    else if (cfg.dark) {
      this.stage = 'next-hold'
      this.stageAt = this.scene.time.now
      this.cursorBox.setVisible(false)
      this.hint.setVisible(false)
      this.prompt.setText('SPACE: trace it back from the top').setVisible(true)
      this.say("Here's a longer ladder, and it went dark the same way, night after night. This time, think about the screen with the most flashes.", 16)
    } else this.say("Each bracket is one number on a screen, the flashes its own beacon sent. The plan is on every night but the first. Douse each night where somebody can't be sure it's on.", 16)
    this.prevMode = g.mode
  }

  cell(i, w) { return this.parts[i].find((cl) => cl.includes(w)) }

  // ---- drawing -----------------------------------------------------------
  draw() {
    this.c.removeAll(true)
    const s = this.scene
    const X = 16, Y = 16, W = 540, H = 300
    const g = s.add.graphics()
    g.fillStyle(0x0d0820, 0.95).fillRoundedRect(X, Y, W, H, 14).lineStyle(3, GOLD, 1).strokeRoundedRect(X, Y, W, H, 14)
    this.c.add(g)
    const txt = (x, y, str, o = {}) => s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#fff', ...o }).setOrigin(0.5)
    const mail = this.mode === 'mail'
    this.c.add(txt(X + W / 2, Y + 22, mail ? 'MAIL LADDER' : 'SIGNAL CARD', { fontFamily: 'Bangers', fontSize: '26px', color: '#ffd166' }))
    this.c.add(txt(X + W / 2, Y + 48, mail ? 'gold = the plan is on · dark = it is off · × = doused' : 'gold = a night the plan works · dark = it fails · × = doused', { fontSize: '14px', color: '#e8dcff' }))
    this.c.add(txt(X + W / 2, Y + 66, mail ? 'brackets = what each screen shows (pink you, green Tempo)' : this.players.length > 1 ? "brackets = nights you can't tell apart (pink you, green Tempo)" : "pink brackets = nights you can't tell apart", { fontSize: '14px', color: '#e8dcff' }))
    const left = X + 70, span = W - 96
    this.sp = Math.min(56, span / this.n)
    this.r = Math.min(19, this.sp * 0.4)
    this.lx = (w) => left + this.sp * (w + 0.5)
    this.ly = Y + 150
    this.bY = [this.ly - 40, this.ly + 40]
    this.c.add(txt(X + 36, this.bY[0], 'YOU', { fontFamily: 'Bangers', fontSize: '22px', color: PINK }))
    if (this.players.length > 1) this.c.add(txt(X + 36, this.bY[1], 'TEMPO', { fontFamily: 'Bangers', fontSize: '20px', color: GREEN }))
    // brackets
    const br = s.add.graphics()
    this.bracketLabels = [[], []]
    this.bracketPos = [[], []]
    this.players.forEach((i) => {
      const col = i === 0 ? PINK_N : GREEN_N, y = this.bY[i], dir = i === 0 ? 1 : -1
      this.parts[i].forEach((cell, ci) => {
        const x0 = this.lx(cell[0]) - this.sp / 2 + 4, x1 = this.lx(cell[cell.length - 1]) + this.sp / 2 - 4
        const open = mail && ci === this.parts[i].length - 1 && this.card.openOwner === i
        br.lineStyle(4, col, 1).beginPath()
        br.moveTo(x0, y + 12 * dir).lineTo(x0, y)
        br.lineTo(open ? x1 + 16 : x1, y)
        if (!open) br.lineTo(x1, y + 12 * dir)
        br.strokePath()
        if (open) this.c.add(txt(x1 + 32, y, '…', { fontSize: '22px', color: i === 0 ? PINK : GREEN }))
        this.bracketPos[i][ci] = { x: (x0 + x1) / 2, y: y - 14 * dir, w: x1 - x0 + 8 }
        if (mail) {
          const zone = s.add.rectangle((x0 + x1) / 2, y - 6 * dir, x1 - x0 + 8, 34, 0xffffff, 0.001).setInteractive({ useHandCursor: true })
          zone.on('pointerdown', () => { if (this.stage !== 'hold' || !this.waiting) return; this.hc = { i, ci }; this.paintCursor(); this.holdPick() })
          this.c.add(zone)
        }
        if (mail) {
          const t = txt((x0 + x1) / 2, y - 14 * dir, `${this.card.labels[i][ci]}`, { fontSize: '16px', color: i === 0 ? PINK : GREEN })
          this.c.add(t)
          this.bracketLabels[i][ci] = t
        }
      })
    })
    this.c.add(br)
    if (mail) this.c.add(txt(this.lx(this.n - 1) + 36, this.ly, '…', { fontSize: '26px', color: '#ffd166' }))
    // lamps, numbered as nights
    this.lamps = []
    for (let w = 0; w < this.n; w++) {
      const x = this.lx(w)
      const ring = s.add.circle(x, this.ly, this.r).setStrokeStyle(3, 0x8a7aa8)
      const glow = s.add.circle(x, this.ly, this.r - 4, GOLD)
      const num = txt(x, this.ly, `${w + 1}`, { fontSize: '14px', color: '#2a1a00' })
      const mark = txt(x, this.ly - this.r - 1, '', { fontSize: '22px', color: '#c8d4ff' })
      ring.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.stage === 'hold') return; this.cursor = w; this.paintCursor(); this.act() })
      this.c.add([ring, glow, num, mark])
      this.lamps.push({ ring, glow, num, mark })
    }
    this.go = s.add.rectangle(X + W / 2, Y + 236, 140, 40, 0x2a0f4a).setStrokeStyle(3, GOLD)
    this.goT = txt(X + W / 2, Y + 236, 'GO ▶', { fontFamily: 'Bangers', fontSize: '26px', color: '#ffd166' })
    this.go.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.stage === 'hold') return; this.cursor = this.n; this.paintCursor(); this.act() })
    this.go.setVisible(!mail); this.goT.setVisible(!mail)
    this.c.add([this.go, this.goT])
    this.hint = txt(X + W / 2, Y + H - 18, mail ? 'LEFT/RIGHT pick a lamp · SPACE douse' : this.stage === 'mark' ? 'LEFT/RIGHT pick a lamp or GO · SPACE mark, or GO to check' : 'LEFT/RIGHT pick a lamp or GO · SPACE douse or go', { fontSize: '14px', color: '#e8dcff' })
    this.c.add(this.hint)
    this.cardBottom = Y + H
    this.prompt = s.add.text(X + W / 2, Y + H + 22, '', { fontFamily: 'Bangers', fontSize: '28px', color: '#ffd166', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setVisible(false)
    this.c.add(this.prompt)
    this.cursorBox = s.add.rectangle(0, 0, 10, 10).setStrokeStyle(4, 0xffffff, 1)
    this.c.add(this.cursorBox)
    this.c.each((o) => o.setScrollFactor && o.setScrollFactor(0))
    this.paint()
    this.paintCursor()
  }

  paint() {
    for (let w = 0; w < this.n; w++) {
      const L = this.lamps[w]
      const on = this.lit.has(w), wasE = this.card.E.has(w)
      L.glow.setFillStyle(on ? GOLD : 0x2a2140, 1)
      if (this.marks.has(w)) L.ring.setStrokeStyle(5, TEAL)
      else L.ring.setStrokeStyle(3, on ? 0xfff1c2 : wasE ? 0x9fb4ff : 0x8a7aa8)
      L.num.setColor(on ? '#2a1a00' : '#b9a6e0')
      L.mark.setText(!on && wasE ? '×' : '')
    }
  }

  paintCursor() {
    if (this.stage === 'hold') {
      const b = this.bracketPos[this.hc.i][this.hc.ci]
      this.cursorBox.setVisible(true).setPosition(b.x, b.y).setSize(Math.max(40, b.w), 26).setOrigin(0.5)
      return
    }
    if (this.cursor >= this.n) this.cursorBox.setPosition(this.go.x, this.go.y).setSize(152, 52).setOrigin(0.5)
    else this.cursorBox.setPosition(this.lx(this.cursor), this.ly).setSize(Math.max(30, this.sp - 2), this.r * 2 + 10).setOrigin(0.5)
  }

  flashLamp(w, color = 0xffffff) {
    const L = this.lamps[w]
    if (!L) return
    L.ring.setStrokeStyle(6, color)
    this.scene.time.delayedCall(1400, () => L.ring.active && this.paint())
  }

  // ---- words -------------------------------------------------------------
  // ['you','Tempo','you'] -> "you don't know that Tempo knows that you know the plan works"
  // 'short' ends on "it" once the sentence has already said what the plan does
  chainText(c, named = false, short = false) {
    const mail = this.mode === 'mail'
    const fact = short ? (c.length > 1 ? 'it' : mail ? "it's on" : 'it works') : mail ? 'the plan is on' : 'the plan works'
    if (!c.length) return mail ? 'the plan is off' : 'the plan fails'
    if (c.length >= 4) return short ? `the chain snaps ${WORD[c.length] || 'many'} steps in` : `the chain of who knows what snaps ${WORD[c.length] || 'many'} steps in`
    // "can't be sure X" is "doesn't know that X"
    const parts = c.map((i, k) => {
      const who = i === 0 ? 'you' : named ? 'he' : 'Tempo'
      if (i === 1) named = true
      if (k === 0) return c.length > 1 ? `${who} can't be sure` : i === 0 ? "you don't know" : `${who} doesn't know`
      return i === 0 ? 'you know' : `${who} knows`
    })
    return `${parts.join(' ')} ${fact}`
  }

  // ---- play --------------------------------------------------------------
  act() {
    if (!this.active || !this.waiting) return
    if (this.stage && this.stage !== 'mark') return
    if (this.scene.time.now - this.dealtAt < 600) return
    if (this.stage === 'mark') return this.cursor >= this.n ? this.checkMarks() : this.toggleMark(this.cursor)
    if (this.cursor >= this.n) return this.declare()
    const w = this.cursor
    if (!this.lit.has(w)) { sfx(this.scene, 'hover'); return }
    const by = dousers(this.parts, this.lit, w, this.players)
    if (by.length) return this.douse(w, by)
    this.miss(w)
  }

  // the marking step: which gold nights do you both know?
  toggleMark(w) {
    if (!this.lit.has(w)) { sfx(this.scene, 'hover'); return }
    if (this.marks.has(w)) this.marks.delete(w); else this.marks.add(w)
    sfx(this.scene, 'hover')
    this.paint()
  }

  checkMarks() {
    const missing = [...this.mutual].filter((w) => !this.marks.has(w)), extra = [...this.marks].filter((w) => !this.mutual.has(w))
    if (!missing.length && !extra.length) {
      this.stage = null
      this.dealtAt = this.scene.time.now
      const lit = [...this.lit]
      this.cursor = lit[Math.floor(Math.random() * lit.length)]
      this.paintCursor()
      this.hint.setText('LEFT/RIGHT pick a lamp or GO · SPACE douse or go')
      sfx(this.scene, 'clean')
      this.say('Right, on those nights you both know the plan works. Now douse, and see how many of them stay lit.', 16)
      return
    }
    const key = `mark,${[...this.marks].sort().join('.')}`
    if (this.failed.has(key)) { sfx(this.scene, 'block'); return }
    this.failed.add(key)
    this.misses++
    let line
    if (extra.length) {
      const w = extra[0], i = this.players.find((p) => this.cell(p, w).some((u) => !this.card.E.has(u)))
      line = `Not quite. ${i === 0 ? 'Your' : "Tempo's"} bracket around night ${w + 1} holds a dark lamp, so you don't both know there.`
      this.flashLamp(w, 0xff6b7a)
    } else {
      const w = missing[0]
      line = `Not quite. Both brackets around night ${w + 1} are all gold, so you both know the plan works there.`
      this.flashLamp(w, TEAL)
    }
    this.say(line, 16)
    this.hurt(this.misses >= 2 ? 3 : 2)
  }

  douse(w, by) {
    const sc = this.scene
    // the shortest true chain: player i's bracket holds a dark lamp u whose own chain is c, so w is not in K_i(...)
    let best = null, bestU = null, bestI = null
    for (const i of by) {
      for (const u of this.cell(i, w)) {
        if (this.lit.has(u)) continue
        const c = this.chain[u]
        const nc = c[0] === i ? c : [i, ...c]
        if (!best || nc.length < best.length || (nc.length === best.length && c.length < this.chain[bestU].length)) { best = nc; bestU = u; bestI = i }
      }
    }
    this.lit.delete(w)
    this.chain[w] = best
    sfx(sc, 'block'); sc.time.delayedCall(90, () => sfx(sc, 'clean'))
    this.paint()
    this.flashLamp(bestU, bestI === 0 ? PINK_N : GREEN_N)
    // one hop: who can't tell this night from which, and what fails over there
    const c = this.chain[bestU]
    const who = bestI === 0 ? 'you' : 'Tempo'
    const lead = this.mode === 'mail'
      ? `With ${WORD[this.card.labels[bestI][this.parts[bestI].indexOf(this.cell(bestI, w))]]} on ${bestI === 0 ? 'your' : "Tempo's"} screen, ${bestI === 0 ? 'you' : 'he'} can't`
      : `${bestI === 0 ? 'You' : 'Tempo'} can't`
    // the first time a night you both knew goes dark on this card, say so in its own line
    if (this.mutual.has(w) && !this.trapSaid) {
      this.trapSaid = true
      const at = this.lit.size
      sc.time.delayedCall(4500, () => { if (this.active && this.lit.size === at && !this.stage) this.say('You both knew this one, and it still went dark.', 16) })
    }
    let line
    if (c.length && c[0] === bestI) {
      // the same player's own bracket: whatever he doesn't know on night u, he doesn't know on night w either
      line = `Night ${w + 1} looks like night ${bestU + 1} to ${bestI === 0 ? 'you' : 'Tempo'}, so on both nights ${this.chainText(best, bestI === 1)}.`
    } else if (c.length >= 4) {
      line = `${lead} tell night ${w + 1} from night ${bestU + 1}, so the doubt carries over, one link further. On night ${w + 1} the chain snaps ${WORD[best.length] || 'many'} steps in.`
    } else {
      const there = c.length ? `and on night ${bestU + 1} ${this.chainText(c)}` : this.mode === 'mail' ? 'when the plan is off' : 'when the plan fails'
      line = `${lead} tell night ${w + 1} from night ${bestU + 1}, ${there}. So on night ${w + 1} ${this.chainText(best, bestI === 1 || /Tempo/.test(there), true)}.`
    }
    this.say(line, 16)
    if (this.mode === 'mail' && !this.lit.size) this.allDark()
  }

  hurt(dmg) {
    const sc = this.scene
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

  miss(w) {
    const key = `${w},${this.lit.size}`
    const line = this.players.length > 1
      ? `Both brackets around night ${w + 1} are all gold, so nothing forces it dark yet.`
      : `Your whole bracket around night ${w + 1} is gold, so on that night you know the plan works.`
    if (this.failed.has(key)) { sfx(this.scene, 'block'); this.say(`That one's still lit. ${line}`, 16); return }
    this.failed.add(key)
    this.misses++
    this.flashLamp(w, 0xffd166)
    this.say(`Not that one. ${line}`, 16)
    this.hurt(this.misses >= 2 ? 3 : 2)
  }

  // GO: claim nothing else should go dark
  declare() {
    const open = [...this.lit].filter((x) => dousers(this.parts, this.lit, x, this.players).length)
    if (!open.length) return this.ready()
    const key = `go,${this.lit.size}`
    if (this.failed.has(key)) { sfx(this.scene, 'block'); this.say("Not yet. A gold lamp still shares a bracket with one that's out.", 16); return }
    this.failed.add(key)
    this.misses++
    let line
    if (this.players.length === 1) line = "Not yet. A gold lamp still shares your bracket with a dark one, so you don't know there."
    else {
      // which kind of doubt is left? the shortest failing chain among lit lamps that must still go dark
      const doomed = [...this.lit].filter((x) => !this.card.ck.has(x))
      const d = Math.min(...doomed.map((x) => this.card.depth[x]))
      line = d <= 1 ? "Not yet. A gold lamp still shares a bracket with one that's out, so one of you doesn't know there."
        : d === 2 ? "Not yet. On some gold nights you both know the plan works, but one of you can't be sure the other does."
          : 'Not yet. Some gold nights still hide a doubt further up the chain, where you both know and each knows the other knows.'
    }
    this.say(line, 16)
    this.hurt(this.misses >= 2 ? 3 : 2)
  }

  ready() {
    this.stage = 'hit'
    this.stageAt = this.scene.time.now
    this.cursorBox.setVisible(false)
    this.hint.setVisible(false)
    for (const w of this.lit) this.lamps[w].ring.setStrokeStyle(6, 0xffffff)
    if (this.mode === 'know') this.say('Nothing more goes dark. On these nights you know the plan works, and you know that you know it.', 16)
    else {
      const kept = [...this.mutual].filter((w) => this.lit.has(w)).length
      const nm = this.mutual.size
      const note = !this.marks.size || !nm ? '' : kept === nm ? ' Every night you both knew stayed lit.'
        : ` Of the ${WORD[nm] || nm} ${nm === 1 ? 'night' : 'nights'} you both knew, ${kept ? `only ${WORD[kept] || kept}` : 'none'} stayed lit.`
      this.say(`Nothing more goes dark. On these nights you both know the plan works, you both know that you both know, and so on forever.${note}`, 16)
    }
    this.prompt.setText(this.mode === 'know' ? 'SPACE: strike' : 'SPACE: strike together').setVisible(true)
  }

  // ---- the mail ladder's two passes -------------------------------------
  allDark() {
    this.stage = 'busy'
    this.cursorBox.setVisible(false)
    this.hint.setVisible(false)
    const top = this.card.labels[0][this.card.labels[0].length - 1]
    // let the last douse's caption be read first
    this.scene.time.delayedCall(2600, () => this.say(`Every lamp went out, even at ${WORD[top]} flashes on your screen. However far the ladder goes, the plan is never common knowledge.`, 16))
    this.scene.time.delayedCall(4400, () => {
      this.stage = 'next-hold'
      this.stageAt = this.scene.time.now
      this.prompt.setText('SPACE: so what does each screen do?').setVisible(true)
    })
  }

  // The proof of Proposition 83.1 walks up the same ladder: each screen holds once the screen it might be
  // confused with is known to hold. The player picks the screen that is settled next.
  startHold() {
    this.prompt.setVisible(false)
    this.stage = 'hold'
    this.held = [[], []]
    this.order = []
    // induction order: your 0, Tempo's 0, your 1, Tempo's 1, ...
    const nL = this.parts[0].length, nT = this.parts[1].length
    for (let q = 0; q < Math.max(nL, nT); q++) { if (q < nL) this.order.push([0, q]); if (q < nT) this.order.push([1, q]) }
    // the second ladder runs the argument backward: start at the top screen and trace what it depends on
    this.backward = this.hits >= 1
    this.picks = this.backward ? this.order.slice().reverse() : this.order
    const i = Math.random() < 0.5 ? 0 : 1
    this.hc = { i, ci: Math.floor(Math.random() * this.parts[i].length) }
    this.hint.setText(`UP/DOWN pick a row · LEFT/RIGHT a screen · SPACE ${this.backward ? 'pick' : 'hold'}`).setVisible(true)
    this.say(this.backward
      ? 'Now go the other way. Start at the screen with the most flashes, and pick each screen it depends on, all the way down.'
      : 'Charging alone costs more than a joint strike wins. Pick the screen whose move you can work out first.', 16)
    this.paintCursor()
  }

  heldCount() { return this.held[0].filter(Boolean).length + this.held[1].filter(Boolean).length }

  screenName(i, q) { return i === 0 ? `your screen showing ${WORD[q]}` : `Tempo's screen showing ${WORD[q]}` }

  dependsOn(i, q) { return i === 0 ? `what Tempo does when his shows ${WORD[q - 1]}` : `what you do when yours shows ${WORD[q]}` }

  // why a screen holds, given the one it leans on (the proof of Proposition 83.1, pp.83-84)
  holdReason(i, q) {
    if (i === 0 && q === 0) return 'With zero on your screen, the plan is off, and holding beats charging whatever Tempo does. So you hold.'
    if (i === 1 && q === 0) return "With zero on Tempo's screen, the plan is more likely off, since it's off more often than not to begin with. You hold when it's off, so he holds."
    if (i === 0) return `With ${WORD[q]} on your screen, either your last flash was lost, or it landed and his answer was lost. One loss is likelier than a landing and a loss, so Tempo probably sees ${WORD[q - 1]} and holds. A lone charge isn't worth that, so you hold too.`
    return `With ${WORD[q]} on Tempo's screen, either his last answer was lost, or it landed and your next flash was lost. One loss is likelier, so your screen probably says ${WORD[q]}, where you hold. He holds too.`
  }

  holdPick() {
    const { i, ci } = this.hc
    if (this.held[i][ci]) { sfx(this.scene, 'hover'); return }
    const step = this.heldCount()
    const [ni, nci] = this.picks[step]
    const q = this.card.labels[i][ci]
    const cap = (t) => t.replace(/^./, (c) => c.toUpperCase())
    if (i !== ni || ci !== nci) {
      const key = `hold,${i},${ci},${step}`
      if (this.failed.has(key)) { sfx(this.scene, 'block'); return }
      this.failed.add(key)
      this.misses++
      let line
      if (this.backward) {
        if (step === 0) line = 'Not that one. Start at the top, with the screen that shows the most flashes.'
        else {
          const [pi, pci] = this.picks[step - 1], pq = this.card.labels[pi][pci]
          line = `Not that one. ${cap(this.screenName(pi, pq))} depends on ${this.dependsOn(pi, pq)}.`
        }
      } else {
        line = step === 0 || (i === 0 && q === 0)
          ? 'Not yet. Start with the screen that covers a single night.'
          : `Not yet. To settle ${this.screenName(i, q)}, you first need to know ${this.dependsOn(i, q)}.`
      }
      this.say(line, 16)
      this.hurt(this.misses >= 2 ? 3 : 2)
      return
    }
    this.held[i][ci] = true
    sfx(this.scene, 'clean')
    this.flashLamp(this.parts[i][ci][0], i === 0 ? PINK_N : GREEN_N) // the likelier night in this bracket
    const done = this.heldCount() === this.picks.length
    if (this.backward) {
      this.bracketLabels[i][ci].setText(`${q} ?`).setColor('#c8d4ff')
      this.say(done ? `${this.holdReason(0, 0)} Now every screen above it holds in turn.` : `${cap(this.screenName(i, q))} leans on one of ${i === 0 ? "Tempo's" : 'your'} screens. Which one?`, 16)
      if (done) {
        this.order.forEach(([a, b], k) => this.scene.time.delayedCall(500 + k * 260, () => {
          sfx(this.scene, 'clean')
          this.bracketLabels[a][b].setText(`${this.card.labels[a][b]} HOLD`).setColor('#ffd166').setFontSize(12)
        }))
      }
    } else {
      this.bracketLabels[i][ci].setText(`${q} HOLD`).setColor('#ffd166').setFontSize(12)
      this.say(this.holdReason(i, q), 16)
    }
    if (done) {
      this.stage = 'busy'
      this.cursorBox.setVisible(false)
      this.hint.setVisible(false)
      this.scene.time.delayedCall(this.backward ? 3100 + this.order.length * 260 : 2600, () => {
        this.say("Every screen holds, however high the number. That's Proposition 83.1, which says that in the only equilibrium nobody ever charges.", 16)
        this.stage = 'hit'
        this.stageAt = this.scene.time.now
        this.prompt.setText('SPACE: hold your ground').setVisible(true)
      })
    }
  }

  landHit() {
    const sc = this.scene
    this.stage = 'busy' // no input while the hit plays
    this.prompt.setVisible(false)
    const x0 = this.lisa.x
    const together = this.mode === 'ck'
    if (this.mode === 'mail') {
      // he lunges in, expecting her to charge alone; she holds her ground and counters
      const ex = this.enemy.x
      this.enemy.setPose('strike')
      sc.tweens.add({ targets: this.enemy, x: this.lisa.x + 170, duration: 220, yoyo: true, hold: 220, onComplete: () => { this.enemy.x = ex } })
      sc.time.delayedCall(220, () => this.lisa.setPose('kick'))
    } else {
      this.lisa.setPose('strike')
      sc.tweens.add({ targets: this.lisa, x: this.enemy.x - 150, duration: 160, yoyo: true, hold: 180, onComplete: () => { this.lisa.x = x0 } })
      if (together && sc.tempo) {
        sc.tempoBusy = true
        sc.tweens.add({ targets: sc.tempo, x: this.enemy.x + 60, y: this.enemy.y - 250, duration: 200 })
        sc.time.delayedCall(900, () => { sc.tempoBusy = false })
      }
    }
    sc.time.delayedCall(this.mode === 'mail' ? 260 : 170, () => {
      this.enemy.setPose('hurt')
      sfx(sc, 'clash'); sc.time.delayedCall(100, () => sfx(sc, 'hitHeavy'))
      this.hp -= 1
      this.hits += 1
      this.enemy.flash()
      sc.floatText(this.enemy.x, this.enemy.y - 280, together ? 'TOGETHER!' : this.mode === 'mail' ? 'COUNTER!' : 'HIT!', '#7dffb0', 4400)
      sc.spark(this.enemy.x - 30, this.enemy.y - 170)
      sc.cameras.main.shake(140, 0.006)
    })
    if (this.mode === 'mail') this.say(`${this.enemyName} bet you'd charge alone. You held, and he walked right into your kick.`, 16)
    sc.time.delayedCall(900, () => {
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
    if (this.stage === 'hit' || this.stage === 'next' || this.stage === 'next-hold') {
      if (this.scene.time.now - this.stageAt > 400 && p.take('Space', 'Enter')) {
        if (this.stage === 'hit') this.landHit(); else if (this.stage === 'next') this.nextCard(); else this.startHold()
      }
      return
    }
    if (this.stage === 'hold') {
      if (p.take('ArrowUp', 'KeyW', 'ArrowDown', 'KeyS')) {
        const i = 1 - this.hc.i
        const x = this.bracketPos[this.hc.i][this.hc.ci].x
        let best = 0
        this.bracketPos[i].forEach((b, k) => { if (Math.abs(b.x - x) < Math.abs(this.bracketPos[i][best].x - x)) best = k })
        this.hc = { i, ci: best }; sfx(this.scene, 'hover'); this.paintCursor()
      } else if (p.take('ArrowLeft', 'KeyA')) { const m = this.parts[this.hc.i].length; this.hc.ci = (this.hc.ci + m - 1) % m; sfx(this.scene, 'hover'); this.paintCursor() }
      else if (p.take('ArrowRight', 'KeyD')) { const m = this.parts[this.hc.i].length; this.hc.ci = (this.hc.ci + 1) % m; sfx(this.scene, 'hover'); this.paintCursor() }
      else if (p.take('Space', 'Enter', 'KeyJ')) this.holdPick()
      return
    }
    const max = this.mode === 'mail' ? this.n - 1 : this.n
    if (p.take('ArrowLeft', 'KeyA')) { this.cursor = (this.cursor + max) % (max + 1); sfx(this.scene, 'hover'); this.paintCursor() }
    else if (p.take('ArrowRight', 'KeyD')) { this.cursor = (this.cursor + 1) % (max + 1); sfx(this.scene, 'hover'); this.paintCursor() }
    else if (p.take('Space', 'Enter', 'KeyJ')) this.act()
  }

  // dev hook: take the next correct step
  solve() {
    if (!this.waiting) return
    if (this.stage === 'busy') return
    if (this.stage === 'hit') return this.landHit()
    if (this.stage === 'next') return this.nextCard()
    if (this.stage === 'next-hold') return this.startHold()
    if (this.stage === 'hold') {
      const [i, ci] = this.picks[this.heldCount()]
      this.hc = { i, ci }
      return this.holdPick()
    }
    this.dealtAt = -1e9
    if (this.stage === 'mark') {
      const w = [...this.mutual].find((x) => !this.marks.has(x)) ?? [...this.marks].find((x) => !this.mutual.has(x))
      this.cursor = w ?? this.n
      return this.act()
    }
    const w = [...this.lit].sort((a, b) => a - b).find((x) => dousers(this.parts, this.lit, x, this.players).length)
    this.cursor = w ?? this.n
    this.act()
  }
}
