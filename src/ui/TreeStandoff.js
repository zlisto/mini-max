import { sfx } from '../systems/sfx.js'
import { makeTreeCard, solve, isLeaf, allNodes } from '../data/trees.js'

// A tree standoff (Chapter 6). The card is an extensive game: moves in turn, payoffs at the ends (pink Lisa,
// blue the rival). Lisa settles the choices from the bottom up: at a point where every later choice is already
// settled, she picks the branch that pays whoever moves there the most (backward induction, Prop. 99.2, p.99).
// A threat is empty when, at that point, another move pays him more (Example 95.2, p.95); it is credible when
// carrying it out is his best move there. When the top is settled the plan is the subgame perfect equilibrium
// (Def. 97.2, p.97).
// phase = { hp, cards: [{ mode: 'tree'|'centipede'|'chain', depth, rootBranch, T, K }] }
const PINK = '#ff5fa2', BLUE = '#7fd6ff', GOLD = 0xffd166
const WORD = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const w = (v) => WORD[v] ?? `${v}`

export class TreeStandoff {
  constructor(scene, { lisa, enemy, enemyName, pronoun = 'he', phases, onPhaseWin, onLose, say }) {
    Object.assign(this, { scene, lisa, enemy, enemyName, phases, onPhaseWin, onLose, say })
    this.P = pronoun === 'she' ? { sub: 'she', obj: 'her', poss: 'her' } : { sub: 'he', obj: 'him', poss: 'his' }
    this.kind = 'tree'
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
    // the second card of a phase shows the other kind of threat, so both get seen
    this.card = makeTreeCard(this.hits === 1 && this.prevThreat ? { ...cfg, credible: this.prevThreat.empty } : cfg)
    this.prevThreat = this.card.threat
    this.mode = this.card.mode
    this.roots = this.card.roots
    this.byId = new Map()
    this.roots.forEach((r) => allNodes(r).forEach((n) => this.byId.set(n.id, n)))
    this.answer = new Map()
    this.roots.forEach((r) => solve(r, this.answer))
    this.chosen = new Map() // node id -> edge index the player settled
    this.misses = 0
    this.failed = new Set()
    this.earlyFree = true // the first too-early pick on a card is a free lesson
    this.armed = false // SPACE only counts after the player has picked a branch on this card
    this.stage = null
    this.dealtAt = this.scene.time.now
    this.layout()
    this.cursor = Math.floor(Math.random() * this.choices().length)
    this.draw()
    this.waiting = true
    const P = this.P
    if (this.mode === 'tree') this.say(`Top numbers are yours and bottom ones are ${this.P.poss}. Settle the lowest choices first, then climb.`, 16)
    else if (this.mode === 'centipede') this.say('Stop ends the game with the split shown there, and Go on hands the move to the other side.', 16)
    else this.say('You play every shop, so settle the last town first and work back toward town one.', 16)
  }

  // ---- geometry ------------------------------------------------------------
  layout() {
    const X0 = 40, X1 = 540, Y0 = 108, Y1 = this.mode === 'chain' ? 224 : 238
    this.pos = new Map()
    if (this.mode === 'centipede') {
      const spine = []
      let n = this.roots[0]
      while (!isLeaf(n)) { spine.push(n); n = n.edges[1].child }
      const step = (X1 - X0 - 50) / spine.length
      spine.forEach((s, k) => {
        const x = X0 + 14 + k * step
        this.pos.set(s.id, { x, y: Y0 + 22 })
        this.pos.set(s.edges[0].child.id, { x, y: Y1 - 10 })
      })
      this.pos.set(n.id, { x: X0 + 14 + spine.length * step, y: Y0 + 22 })
      return
    }
    const band = (X1 - X0) / this.roots.length
    const top = this.mode === 'chain' ? Y0 + 22 : Y0
    this.roots.forEach((root, ri) => {
      const leaves = []
      const depthOf = new Map()
      const walk = (m, d) => { depthOf.set(m.id, d); if (isLeaf(m)) leaves.push(m); else m.edges.forEach((e) => walk(e.child, d + 1)) }
      walk(root, 0)
      const maxD = Math.max(...depthOf.values())
      const bx0 = X0 + ri * band + 8, bx1 = X0 + (ri + 1) * band - 8
      const slot = (bx1 - bx0) / leaves.length
      leaves.forEach((lf, k) => this.pos.set(lf.id, { x: bx0 + slot * (k + 0.5), y: top + (Y1 - top) * (depthOf.get(lf.id) / maxD) }))
      const place = (m) => {
        if (isLeaf(m)) return this.pos.get(m.id).x
        const xs = m.edges.map((e) => place(e.child))
        const x = xs.reduce((a, b) => a + b, 0) / xs.length
        this.pos.set(m.id, { x, y: top + (Y1 - top) * (depthOf.get(m.id) / maxD) })
        return x
      }
      place(root)
    })
  }

  // every branch of an unsettled choice, left to right
  choices() {
    const out = []
    for (const n of this.byId.values()) {
      if (this.chosen.has(n.id)) continue
      n.edges.forEach((e, k) => {
        const a = this.pos.get(n.id), b = this.pos.get(e.child.id)
        out.push({ n, k, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
      })
    }
    return out.sort((p, q) => p.x - q.x || p.y - q.y)
  }

  // ---- drawing -------------------------------------------------------------
  draw() {
    this.c.removeAll(true)
    const s = this.scene
    const X = 16, Y = 16, W = 540, H = 300
    const g = s.add.graphics()
    g.fillStyle(0x0d0820, 0.95).fillRoundedRect(X, Y, W, H, 14).lineStyle(3, GOLD, 1).strokeRoundedRect(X, Y, W, H, 14)
    this.c.add(g)
    const txt = (x, y, str, o = {}) => s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#fff', ...o }).setOrigin(0.5)
    const title = this.mode === 'centipede' ? 'CASH LADDER' : this.mode === 'chain' ? 'CHAIN OF TOWNS' : 'GAME TREE'
    this.c.add(txt(X + W / 2, Y + 20, title, { fontFamily: 'Bangers', fontSize: '26px', color: '#ffd166' }))
    this.c.add(txt(X + W / 2, Y + 44, `pink dot = your move · blue = ${this.enemyName}'s · top number yours, bottom ${this.P.poss}`, { fontSize: '14px', color: '#e8dcff' }))
    const lines = s.add.graphics()
    this.c.add(lines)
    const path = this.stage ? this.playPath() : null
    this.labels = new Map()
    // edges
    for (const n of this.byId.values()) {
      const a = this.pos.get(n.id)
      n.edges.forEach((e, k) => {
        const b = this.pos.get(e.child.id)
        const settled = this.chosen.has(n.id)
        const picked = settled && this.chosen.get(n.id) === k
        const offPath = path && picked && !path.has(e.child.id)
        lines.lineStyle(picked ? 5 : 2, offPath ? 0x8a6a2a : picked ? GOLD : settled ? 0x4a3f5e : 0xb9a6e0, 1).lineBetween(a.x, a.y, b.x, b.y)
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
        const right = b.x >= a.x
        const lab = txt(mx + (right ? 7 : -7), my - 8, e.label, { fontSize: '13px', color: offPath ? '#8a6a2a' : picked ? '#ffd166' : settled ? '#6b5b8a' : '#fff' })
        lab.setOrigin(right ? 0 : 1, 0.5)
        if (this.mode === 'centipede' && e.label === 'Go on') lab.setOrigin(0.5, 1).setPosition(mx, a.y - 6)
        this.c.add(lab)
        this.labels.set(`${n.id},${k}`, lab)
      })
    }
    // leaves: pink over blue, so neighbouring pairs never run together
    for (const r of this.roots) {
      const walk = (m) => {
        if (isLeaf(m)) {
          const p = this.pos.get(m.id)
          this.c.add(s.add.text(p.x, p.y + 10, `${m.pay[0]}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '18px', color: PINK }).setOrigin(0.5))
          this.c.add(s.add.text(p.x, p.y + 28, `${m.pay[1]}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '18px', color: BLUE }).setOrigin(0.5))
        } else m.edges.forEach((e) => walk(e.child))
      }
      walk(r)
    }
    // decision points, with the settled value beside each (in the same pink and blue)
    for (const n of this.byId.values()) {
      const p = this.pos.get(n.id)
      const dot = s.add.circle(p.x, p.y, 11, n.mover === 0 ? 0xff5fa2 : 0x7fd6ff).setStrokeStyle(2, 0xffffff)
      this.c.add(dot)
      if (this.pulse === n.id) this.scene.tweens.add({ targets: dot, scale: 1.5, duration: 260, yoyo: true, repeat: 2 })
      if (this.chosen.has(n.id) && this.mode !== 'centipede') {
        const v = this.valueOf(n), dx = n.mover === 0 ? -16 : 16
        this.c.add(s.add.text(p.x + dx, p.y - 8, `${v[0]}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color: PINK, stroke: '#000', strokeThickness: 3 }).setOrigin(dx < 0 ? 1 : 0, 0.5))
        this.c.add(s.add.text(p.x + dx, p.y + 8, `${v[1]}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color: BLUE, stroke: '#000', strokeThickness: 3 }).setOrigin(dx < 0 ? 1 : 0, 0.5))
      }
    }
    if (this.mode === 'chain') {
      this.roots.forEach((r) => { const p = this.pos.get(r.id); this.c.add(txt(p.x, p.y - 22, `TOWN ${r.town}`, { fontFamily: 'Bangers', fontSize: '17px', color: '#ffd166' })) })
      // his running total over the towns settled so far (the store's payoff is the sum, p.106)
      const done = this.roots.filter((r) => this.chosen.has(r.id)).sort((a, b) => a.town - b.town)
      const sum = done.reduce((t, r) => t + this.valueOf(r)[1], 0)
      if (done.length) this.c.add(txt(X + W / 2, Y + H - 34, `${this.enemyName}'s total so far: ${done.length > 1 ? `${done.map((r) => this.valueOf(r)[1]).join(' + ')} = ` : ''}${sum}`, { fontSize: '14px', color: BLUE }))
    }
    // the rival's threat: spoken in the header, and a ! by the point it's about
    if (this.card.threat && !this.chosen.has(this.card.threat.node)) {
      const tn = this.byId.get(this.card.threat.node), p = this.pos.get(tn.id)
      const parent = this.mode === 'chain' ? null : this.roots[0].edges.find((e) => e.child.id === tn.id)
      const say = this.mode === 'chain' ? `${this.enemyName}: "Open in the first town and I fight, so nobody else dares!"` : `${this.enemyName}: "${parent.label} and I fight you!"`
      this.c.add(txt(X + W / 2, Y + 64, say, { fontSize: '14px', color: '#ffb36b' }))
      const par = [...this.byId.values()].find((m) => m.edges.some((e) => e.child.id === tn.id))
      const away = par && this.pos.get(par.id).x > p.x ? -1 : 1
      this.c.add(txt(p.x + 20 * away, p.y, '!', { fontFamily: 'Bangers', fontSize: '24px', color: '#ffb36b', stroke: '#000', strokeThickness: 4 }))
    }
    this.hint = txt(X + W / 2, Y + H - 14, 'LEFT/RIGHT pick a branch · SPACE choose it', { fontSize: '14px', color: '#e8dcff' }).setVisible(!this.stage)
    this.c.add(this.hint)
    this.cardBottom = Y + H
    this.prompt = s.add.text(X + W / 2, Y + H + 22, '', { fontFamily: 'Bangers', fontSize: '28px', color: '#ffd166', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setVisible(false)
    this.c.add(this.prompt)
    this.cursorBox = s.add.rectangle(0, 0, 10, 10).setStrokeStyle(2, 0xffffff, 1)
    this.c.add(this.cursorBox)
    for (const ch of this.choices()) {
      const z = s.add.rectangle(ch.x, ch.y, 46, 30, 0xffffff, 0.001).setInteractive({ useHandCursor: true })
      z.on('pointerdown', () => { const list = this.choices(); const i = list.findIndex((q) => q.n === ch.n && q.k === ch.k); if (i >= 0) { this.cursor = i; this.armed = true; this.paintCursor(); this.act() } })
      this.c.add(z)
    }
    this.c.each((o) => o.setScrollFactor && o.setScrollFactor(0))
    this.paintCursor()
  }

  // the box frames the branch's label, so the label itself stays readable
  paintCursor() {
    const list = this.choices()
    if (!list.length || this.stage) { this.cursorBox.setVisible(false); return }
    this.cursor = Math.min(this.cursor, list.length - 1)
    const ch = list[this.cursor]
    const b = this.labels.get(`${ch.n.id},${ch.k}`).getBounds()
    this.cursorBox.setVisible(true).setPosition(b.centerX, b.centerY).setSize(b.width + 10, b.height + 6).setOrigin(0.5)
  }

  // ---- logic ---------------------------------------------------------------
  valueOf(n) { return isLeaf(n) ? n.pay : this.valueOf(n.edges[this.chosen.get(n.id)].child) }

  playPath() {
    const on = new Set()
    for (const r of this.roots) { let n = r; on.add(n.id); while (!isLeaf(n)) { n = n.edges[this.chosen.get(n.id)].child; on.add(n.id) } }
    return on
  }

  ready(n) {
    if (!n.edges.every((e) => isLeaf(e.child) || this.chosen.has(e.child.id))) return 'later'
    if (this.mode === 'chain' && this.roots.some((r) => r.town > this.townOf(n) && !this.chosen.has(r.id))) return 'town'
    return null
  }

  townOf(n) { return this.roots.find((r) => allNodes(r).includes(n)).town }

  act() {
    if (!this.active || !this.waiting || this.stage) return
    if (this.scene.time.now - this.dealtAt < 600) return
    if (!this.armed) { this.say('Pick a branch with LEFT and RIGHT first, then press SPACE.', 16); return }
    const ch = this.choices()[this.cursor]
    if (!ch) return
    const { n, k } = ch
    const why = this.ready(n)
    const key = `${n.id},${k},${this.chosen.size}`
    if (why) {
      if (this.failed.has(key)) { sfx(this.scene, 'block'); return }
      this.failed.add(key)
      // show where to look: a point that can be settled now
      const ready = [...this.byId.values()].find((m) => !this.chosen.has(m.id) && !this.ready(m))
      this.pulse = ready && ready.id
      this.draw()
      this.pulse = null
      this.say(why === 'town' ? 'Not yet. Settle the last town first. The pulsing dot is one you can settle now.'
        : 'Not yet. Something is still undecided below this point. The pulsing dot is one you can settle now.', 16)
      if (this.earlyFree) { this.earlyFree = false; sfx(this.scene, 'block'); return }
      return this.miss()
    }
    const vals = n.edges.map((e) => this.valueOf(e.child)[n.mover])
    const best = vals.indexOf(Math.max(...vals))
    const mine = n.mover === 0
    const others = n.edges.map((e, j) => [e.label, vals[j]]).filter((_, j) => j !== best)
    const list2 = (a) => a.map(([l, v]) => `${w(v)} from ${l}`).join(' and ')
    if (k !== best) {
      if (this.failed.has(key)) { sfx(this.scene, 'block'); return }
      this.failed.add(key)
      this.say(mine
        ? `With the later moves settled, ${n.edges[k].label} pays you ${w(vals[k])} here, but ${n.edges[best].label} pays ${w(vals[best])}.`
        : `At this point ${this.enemyName} wouldn't ${n.edges[k].label.toLowerCase()}, since that pays ${this.P.obj} ${w(vals[k])} and ${n.edges[best].label} pays ${this.P.obj} ${w(vals[best])}.`, 16)
      return this.miss()
    }
    // settled
    this.chosen.set(n.id, k)
    sfx(this.scene, 'clean')
    let line = mine
      ? `You'd pick ${n.edges[k].label} here. With the later moves settled, it pays you ${w(vals[k])}, more than ${list2(others)}.`
      : `${this.enemyName} picks ${n.edges[k].label} here, since it pays ${this.P.obj} ${w(vals[k])}, more than ${list2(others)}.`
    const th = this.card.threat
    if (this.mode === 'chain' && !mine) {
      line += th && th.node === n.id ? ' So his threat is empty, because later towns play out the same either way.'
        : this.townOf(n) === this.card.K ? ' No one is left to scare.' : ' Later towns play out the same either way.'
    } else if (th && th.node === n.id) {
      line += th.edge !== k ? ` So ${this.P.poss} threat to ${n.edges[th.edge].label.toLowerCase()} is empty.`
        : ` So ${this.P.poss} threat is real, and ${this.P.sub}'d carry it out.`
    }
    if (this.mode === 'chain' && !mine) {
      const sc = this.scene
      if (n.edges[k].label === 'Fold') sc.floatText(sc.cameras.main.scrollX + 700 + Math.random() * 400, 300, 'OPEN!', '#7dffb0', 2900, 500) // a shop lights up
    }
    this.say(line, 16)
    this.draw()
    if (this.roots.every((r) => this.chosen.has(r.id))) this.done()
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

  done() {
    this.stage = 'busy'
    this.cursorBox.setVisible(false)
    this.hint.setVisible(false)
    this.draw() // dim the settled choices off the path of play
    const v = this.roots.map((r) => this.valueOf(r))
    let line
    if (this.mode === 'tree') {
      const th = this.card.threat
      line = th.empty
        ? `This is the subgame perfect plan, worth ${w(v[0][0])} to you. Believing the threat, you'd have picked ${this.roots[0].edges[this.card.believed].label} instead.`
        : `This is the subgame perfect plan, worth ${w(v[0][0])} to you. His threat was real, so you were right to steer clear.`
    } else if (this.mode === 'centipede') {
      line = "Backward induction says stop at once. But if you'd both gone on again and again, would you still bet he stops next? The book doubts it."
    } else {
      const s = this.card.store, K = this.card.K
      line = `If one fight scared off every later shop, he'd end with ${w((K - 1) * s[0])} rather than ${w(K * s[1])}. But he folds in the last town anyway, so no fight scares anyone.`
    }
    this.scene.time.delayedCall(2200, () => {
      this.say(line, 16)
      this.stage = 'hit'
      this.stageAt = this.scene.time.now
      this.prompt.setText(this.mode === 'centipede' ? 'SPACE: stop now' : 'SPACE: land the hit').setVisible(true)
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
      sc.floatText(this.enemy.x, this.enemy.y - 280, this.mode === 'tree' ? 'CALLED IT!' : 'HIT!', '#7dffb0', 4400)
      sc.spark(this.enemy.x - 30, this.enemy.y - 170)
      sc.cameras.main.shake(140, 0.006)
    })
    // the idea the card leaves behind
    const th = this.card.threat
    if (this.mode === 'tree') {
      this.say(th.empty
        ? 'The plan that believes him is still a Nash equilibrium, since the threat is never tested. It just isn\'t subgame perfect.'
        : "The dull gold choices are off the path of play, but the plans still cover them. Each side's full plan is a strategy.", 16)
    } else if (this.mode === 'chain') {
      this.say(`Every shop goes In and ${this.enemyName} folds each time. That's the only subgame perfect equilibrium.`, 16)
    }
    sc.time.delayedCall(this.mode === 'centipede' ? 900 : 2600, () => {
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
    if (this.stage) {
      if (this.scene.time.now - this.stageAt > 400 && p.take('Space', 'Enter')) (this.stage === 'hit' ? this.landHit() : this.nextCard())
      return
    }
    const n = this.choices().length
    if (p.take('ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW')) { this.armed = true; this.cursor = (this.cursor + n - 1) % n; sfx(this.scene, 'hover'); this.paintCursor() }
    else if (p.take('ArrowRight', 'KeyD', 'ArrowDown', 'KeyS')) { this.armed = true; this.cursor = (this.cursor + 1) % n; sfx(this.scene, 'hover'); this.paintCursor() }
    else if (p.take('Space', 'Enter', 'KeyJ')) this.act()
  }

  // dev hook: settle the next ready choice correctly
  solve() {
    if (!this.waiting || this.stage === 'busy') return
    if (this.stage === 'hit') return this.landHit()
    if (this.stage === 'next') return this.nextCard()
    this.dealtAt = -1e9
    this.armed = true
    const list = this.choices()
    const i = list.findIndex((ch) => !this.ready(ch.n) && ch.k === this.answer.get(ch.n.id))
    if (i >= 0) { this.cursor = i; this.act() }
  }
}
