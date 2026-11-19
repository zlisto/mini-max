import { sfx } from '../systems/sfx.js'
import { dealElimCard, dominator, weaklyOnly } from '../data/dominance.js'

// An elimination standoff (Chapter 4). The card is a two-player game: Lisa's points (pink) and the rival's
// (blue). Lisa shatters any move, hers or the rival's, that is strictly dominated among the moves still
// standing (Definition 59.2, p.59). A rational player never uses one, because it is never a best response to
// any belief (Lemma 60.1, p.60); a rival who knows she is rational rules out hers too, and so on (Definition
// 60.2). When one cell is left, the rival's play is pinned down. Any order works (Prop. 61.2, remark p.62).
// phase = { hp, size: 3 | 4, colFirst?, mix?, weak? }
const NAMES = ['Punch', 'Kick', 'Throw', 'Feint']
const POSE = ['punch', 'kick', 'throw', 'kick']
const PINK = '#ff5fa2', BLUE = '#7fd6ff'

export class ElimStandoff {
  constructor(scene, { lisa, enemy, enemyName, pronoun = 'he', phases, onPhaseWin, onLose, say }) {
    Object.assign(this, { scene, lisa, enemy, enemyName, phases, onPhaseWin, onLose, say })
    this.P = pronoun === 'she'
      ? { sub: 'she', obj: 'her', poss: 'her', own: 'hers', Poss: 'Her' }
      : { sub: 'he', obj: 'him', poss: 'his', own: 'his', Poss: 'His' }
    this.kind = 'elim'
    this.phaseIdx = 0
    this.c = scene.add.container(0, 0).setScrollFactor(0).setDepth(4200).setVisible(false)
    this.active = false
    this.waiting = false
  }

  startPhase(i = this.phaseIdx) {
    this.phaseIdx = i
    const ph = this.phases[i]
    this.ph = ph
    this.hp = ph.hp
    this.active = true
    this.deal()
    this.c.setVisible(true).setAlpha(0)
    this.scene.tweens.add({ targets: this.c, alpha: 1, duration: 250 })
    sfx(this.scene, 'freeze')
  }

  deal() {
    const g = dealElimCard(this.ph)
    Object.assign(this, { U: g.U, n: g.n, m: g.m, rowOrder: g.rowOrder, colOrder: g.colOrder, survivor: g.survivor })
    this.rows = g.rowOrder.slice()
    this.cols = g.colOrder.slice()
    this.gone = { 0: [], 1: [] } // shattered moves, in order: the chain of reasoning so far
    this.depth = {} // how many levels of 'knows the other is rational' each shatter needed
    this.misses = 0
    this.failed = new Set() // a header that already failed, in this same state, costs nothing to try again
    this.stage = null
    this.dealtAt = this.scene.time.now
    this.cursor = { s: 1, a: this.cols[0] }
    this.draw()
    this.waiting = true
    const by = this.ph.mix ? 'another move or a mix of moves' : 'another move'
    this.say(`Shatter any move of yours or ${this.P.own} if ${by} outscores it against everything left on the card.`, 16)
  }

  // ---- drawing -----------------------------------------------------------
  draw() {
    this.c.removeAll(true)
    const s = this.scene
    const X = 16, Y = 16, headW = 118, cw = 100, chh = 58
    const W = headW + this.m * cw + 24, H = 112 + this.n * chh + 40
    const g = s.add.graphics()
    g.fillStyle(0x0d0820, 0.95).fillRoundedRect(X, Y, W, H, 14).lineStyle(3, 0xc79bff, 1).strokeRoundedRect(X, Y, W, H, 14)
    this.c.add(g)
    const txt = (x, y, str, o = {}) => s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '17px', color: '#fff', ...o }).setOrigin(0.5)
    this.c.add(txt(X + W / 2, Y + 22, 'MIRROR CARD', { fontFamily: 'Bangers', fontSize: '26px', color: '#c79bff' }))
    this.c.add(txt(X + W / 2, Y + 48, `pink = your points · blue = ${this.enemyName}'s points`, { fontSize: '14px', color: '#e8dcff' }))
    this.gx = X + headW + cw / 2 + 8
    this.gy = Y + 112
    this.cw = cw; this.chh = chh
    this.head = {}
    this.cells = {}
    this.colOrder.forEach((c, j) => {
      const x = this.gx + j * cw
      const r = s.add.rectangle(x, Y + 84, cw - 8, 40, 0x7fd6ff, 0.12).setStrokeStyle(2, 0x7fd6ff, 0.6)
      r.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.cursor = { s: 1, a: c }; this.paintCursor(); this.strike() })
      const t = txt(x, Y + 76, `${this.enemyName}:`, { fontSize: '12px', color: BLUE })
      const t2 = txt(x, Y + 93, NAMES[c], { color: BLUE })
      this.c.add([r, t, t2])
      this.head[`1,${c}`] = { box: r, parts: [t, t2], x, y: Y + 84 }
    })
    this.rowOrder.forEach((rw, i) => {
      const y = this.gy + i * chh + chh / 2
      const r = s.add.rectangle(X + 12 + headW / 2, y, headW - 8, chh - 8, 0xff5fa2, 0.12).setStrokeStyle(2, 0xff5fa2, 0.6)
      r.setInteractive({ useHandCursor: true }).on('pointerdown', () => { this.cursor = { s: 0, a: rw }; this.paintCursor(); this.strike() })
      const t = txt(X + 12 + headW / 2, y, `Lisa: ${NAMES[rw]}`, { color: PINK })
      this.c.add([r, t])
      this.head[`0,${rw}`] = { box: r, parts: [t], x: X + 12 + headW / 2, y }
      this.colOrder.forEach((c, j) => {
        const x = this.gx + j * cw
        const rect = s.add.rectangle(x, y, cw - 8, chh - 8, 0x2a0f4a).setStrokeStyle(2, 0x6b5b8a)
        const a = s.add.text(x - 10, y, `${this.U[rw][c][0]}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '28px', color: PINK }).setOrigin(1, 0.5)
        const dot = txt(x, y, ',', { fontSize: '20px', color: '#b9a6e0' })
        const b = s.add.text(x + 10, y, `${this.U[rw][c][1]}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '28px', color: BLUE }).setOrigin(0, 0.5)
        this.c.add([rect, a, dot, b])
        this.cells[`${rw},${c}`] = { rect, a, dot, b, dead: false }
      })
    })
    // controls, inside the panel where they can be read
    this.hint = txt(X + W / 2, Y + H - 18, `UP/DOWN yours · LEFT/RIGHT ${this.P.own} · SPACE shatter`, { fontSize: '15px', color: '#e8dcff' })
    this.c.add(this.hint)
    this.cardBottom = Y + H
    this.prompt = s.add.text(X + W / 2, Y + H + 22, '', { fontFamily: 'Bangers', fontSize: '28px', color: '#ffd166', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setVisible(false)
    this.c.add(this.prompt)
    this.cursorBox = s.add.rectangle(0, 0, 10, 10).setStrokeStyle(4, 0xffd166, 1)
    this.c.add(this.cursorBox)
    // the whole card is fixed to the screen, so its buttons must be too (or clicks miss once the camera moves)
    this.c.each((o) => o.setScrollFactor && o.setScrollFactor(0))
    this.paintCursor()
  }

  // The cursor's side decides which numbers matter: rows compare pink, columns compare blue.
  paintCursor() {
    const h = this.head[`${this.cursor.s},${this.cursor.a}`]
    if (!h) return
    this.cursorBox.setPosition(h.x, h.y).setSize(h.box.width + 8, h.box.height + 8).setOrigin(0.5)
    Object.values(this.cells).forEach((cl) => {
      if (cl.dead) return
      cl.a.setAlpha(this.cursor.s === 0 ? 1 : 0.35)
      cl.b.setAlpha(this.cursor.s === 1 ? 1 : 0.35)
    })
  }

  flashCell(r, c, color = 0xffffff) {
    const cl = this.cells[`${r},${c}`]
    if (!cl) return
    cl.rect.setStrokeStyle(5, color)
    this.scene.time.delayedCall(1400, () => cl.rect.active && !cl.dead && cl.rect.setStrokeStyle(2, 0x6b5b8a))
  }

  shatterVisual(s, a) {
    const sc = this.scene
    const h = this.head[`${s},${a}`]
    h.box.setFillStyle(0x000000, 0.4).setStrokeStyle(2, 0x555555, 0.5).disableInteractive()
    h.parts.forEach((p) => p.setAlpha(0.3))
    const keys = s === 0 ? this.colOrder.map((c) => `${a},${c}`) : this.rowOrder.map((r) => `${r},${a}`)
    keys.forEach((k) => { const cl = this.cells[k]; cl.dead = true; [cl.rect, cl.a, cl.dot, cl.b].forEach((o) => o.setAlpha(0.18)) })
    // a jagged crack across the shattered line
    const gr = sc.add.graphics().lineStyle(4, 0xe8dcff, 0.9).setScrollFactor(0)
    if (s === 0) {
      const y = h.y, x0 = 24, x1 = this.gx + (this.m - 0.5) * this.cw
      gr.beginPath(); gr.moveTo(x0, y)
      for (let x = x0; x < x1; x += 26) { gr.lineTo(x + 13, y + (Math.random() < 0.5 ? -8 : 8)); gr.lineTo(x + 26, y) }
      gr.strokePath()
    } else {
      const x = h.x, y0 = h.y - 20, y1 = this.gy + this.n * this.chh
      gr.beginPath(); gr.moveTo(x, y0)
      for (let y = y0; y < y1; y += 24) { gr.lineTo(x + (Math.random() < 0.5 ? -8 : 8), y + 12); gr.lineTo(x, y + 24) }
      gr.strokePath()
    }
    this.c.add(gr)
  }

  // ---- play --------------------------------------------------------------
  strike() {
    if (!this.active || !this.waiting || this.stage) return
    if (this.scene.time.now - this.dealtAt < 600) return // a press meant for the last card
    const { s: side, a } = this.cursor
    const mine = side === 0 ? this.rows : this.cols, theirs = side === 0 ? this.cols : this.rows
    if (!mine.includes(a)) return
    const sc = this.scene
    const P = this.P
    const d = dominator(this.U, side, a, mine, theirs)
    const whose = side === 0 ? 'your' : P.poss, Whose = side === 0 ? 'Your' : P.Poss
    const otherWhose = side === 0 ? P.poss : 'your'
    const val = (x, b) => (side === 0 ? this.U[x][b][0] : this.U[b][x][1])
    const num = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? `${Math.round(v)}` : v.toFixed(1))
    if (d) {
      sfx(sc, 'block'); sc.time.delayedCall(90, () => sfx(sc, 'clean'))
      this.shatterVisual(side, a)
      if (side === 0) this.rows = this.rows.filter((x) => x !== a); else this.cols = this.cols.filter((x) => x !== a)
      const by = d.by
      const theirOrder = (side === 0 ? this.colOrder : this.rowOrder).filter((b) => theirs.includes(b))
      const items = theirOrder.map((b, i) => `${num(by.reduce((t, [x, p]) => t + p * val(x, b), 0))} to ${val(a, b)} against ${i === 0 ? `${otherWhose} ` : ''}${NAMES[b]}`)
      const comps = items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0]
      let who
      if (by.length === 1) who = `${Whose} ${NAMES[by[0][0]]} outscores ${whose} ${NAMES[a]}`
      else {
        const pct = by.map(([, p]) => Math.round(p * 100))
        pct[pct.length - 1] = 100 - pct.slice(0, -1).reduce((t, v) => t + v, 0) // shares add up to 100
        const parts = by.map(([x], i) => `${pct[i]}% ${NAMES[x]}`)
        const even = by.every(([, p]) => Math.abs(p - by[0][1]) < 0.02)
        const names = by.map(([x]) => NAMES[x])
        who = even && by.length === 2 ? `Half ${names[0]} and half ${names[1]} outscores ${whose} ${NAMES[a]}`
          : even ? `An even mix of ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} outscores ${whose} ${NAMES[a]}`
          : `A mix of ${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]} outscores ${whose} ${NAMES[a]}`
      }
      // the chain of knowledge: this step may only work because of moves already shattered on the other side
      const before = this.gone[1 - side]
      const fullOther = before.length ? [...theirs, ...before] : theirs
      let depth = 1, needed = []
      if (before.length && !dominator(this.U, side, a, mine, fullOther)) {
        // which gone moves does this step lean on? (each one, put back alone, would break it)
        needed = before.filter((b) => !dominator(this.U, side, a, mine, [...theirs, b]))
        if (!needed.length) needed = before.slice()
        depth = 1 + Math.max(...needed.map((b) => this.depth[`${1 - side},${b}`] || 1))
      }
      this.depth[`${side},${a}`] = depth
      const chain = depth > 1
        ? ` It only does because ${this.list(needed, side === 0 ? P.poss : 'your')} ${needed.length > 1 ? 'are' : 'is'} gone, and ${this.knows(side, depth)}.`
        : ''
      const why = side === 0 ? " So it's never your best answer." : ` So ${this.enemyName} would never play it.`
      this.gone[side].push(a)
      this.say(`${who}, ${comps}.${chain}${why}`, 16)
      if (this.rows.length === 1 && this.cols.length === 1) this.forced()
      else this.moveCursorOff(side, a)
      return
    }
    // not strictly dominated: the mirror holds, and Lisa pays (more for a second miss on the same card)
    const fkey = `${side},${a},${this.rows.length},${this.cols.length}`
    if (this.failed.has(fkey)) { sfx(sc, 'block'); this.say(`That mirror already held. ${Whose} ${NAMES[a]} isn't outscored everywhere yet.`, 16); return }
    this.failed.add(fkey)
    this.waiting = false
    this.misses++
    const dmg = this.misses >= 2 ? 3 : 2
    sfx(sc, 'punished')
    this.lisa.hp -= dmg
    this.lisa.flash(); this.lisa.setPose('hurt')
    sc.floatText(this.lisa.x + 40, this.lisa.y - 300, `-${dmg}`, '#ff6b7a', 4400)
    sc.cameras.main.shake(100, 0.004)
    const weak = weaklyOnly(this.U, side, a, mine, theirs)
    let line
    if (weak != null) {
      const tie = theirs.find((b) => val(weak, b) === val(a, b))
      line = `The mirror holds. ${Whose} ${NAMES[weak]} only ties ${whose} ${NAMES[a]} against ${otherWhose} ${NAMES[tie]}, ${val(weak, tie)} to ${val(a, tie)}, and weak domination can't shatter a move.` + (mine.every((x) => val(a, tie) >= val(x, tie)) ? ` If ${side === 0 ? `${P.sub} plays` : 'you play'} ${NAMES[tie]}, ${whose} ${NAMES[a]} is still a best answer.` : ' A move has to lose everywhere to be shattered.')
      if (side === 0) { this.flashCell(a, tie); this.flashCell(weak, tie, 0xffd166) } else { this.flashCell(tie, a); this.flashCell(tie, weak, 0xffd166) }
    } else {
      const b = theirs.find((bb) => mine.every((x) => val(a, bb) >= val(x, bb)))
      if (b != null) {
        line = `The mirror holds. Against ${otherWhose} ${NAMES[b]}, ${whose} ${NAMES[a]} pays ${val(a, b)}, at least as much as ${whose} other moves, so it could be ${side === 0 ? 'your' : P.poss} best answer.`
        if (side === 0) this.flashCell(a, b); else this.flashCell(b, a)
      } else line = `The mirror holds. No move, and no mix of moves, outscores ${whose} ${NAMES[a]} against everything left.`
    }
    this.say(line, 16)
    sc.time.delayedCall(900, () => {
      this.lisa.setPose('idle')
      if (this.lisa.hp <= 0) { this.end(); this.onLose(); return }
      this.waiting = true
    })
  }

  // 'you know he knows you're rational', as deep as the step needs (each level is one more round of elimination)
  knows(side, depth) {
    if (depth >= 4) return `you each know the other is rational, ${depth - 1} levels deep`
    const who = (k) => ((side + k) % 2 === 0 ? 'you' : this.P.sub)
    const parts = []
    for (let k = 0; k < depth - 1; k++) parts.push(`${who(k)} ${who(k) === 'you' ? 'know' : 'knows'}`)
    const last = who(depth - 1)
    return `${parts.join(' ')} ${last === 'you' ? "you're" : `${last}'s`} rational`
  }

  list(moves, owner) {
    const names = moves.map((x) => NAMES[x])
    const s = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    return `${owner} ${s}`
  }

  // after a shatter, stay on the same side at the same place in the list
  moveCursorOff(side, a) {
    const order = side === 0 ? this.rowOrder : this.colOrder
    const live = order.filter((x) => (side === 0 ? this.rows : this.cols).includes(x))
    if (live.length) {
      const idx = order.indexOf(a)
      const next = order.slice(idx + 1).find((x) => live.includes(x)) ?? live[live.length - 1]
      this.cursor = { s: side, a: next }
    } else {
      const other = (side === 0 ? this.colOrder : this.rowOrder).filter((x) => (side === 0 ? this.cols : this.rows).includes(x))
      this.cursor = { s: 1 - side, a: other[0] }
    }
    this.paintCursor()
  }

  // The last cell: the player reads the reasoning, then presses SPACE to land the hit, then SPACE for the next card.
  forced() {
    const r = this.rows[0], c = this.cols[0]
    this.cursorBox.setVisible(false)
    const cell = this.cells[`${r},${c}`]
    cell.rect.setFillStyle(0x6a3aa0).setStrokeStyle(5, 0xffd166)
    cell.a.setAlpha(1); cell.b.setAlpha(1)
    this.stage = 'hit'
    this.stageAt = this.scene.time.now
    this.prompt.setText('SPACE: land the hit').setVisible(true)
    this.hint.setVisible(false)
  }

  landHit() {
    const sc = this.scene
    const r = this.rows[0], c = this.cols[0]
    this.stage = null
    this.prompt.setVisible(false)
    const x0 = this.lisa.x
    this.lisa.setPose(POSE[r])
    sc.tweens.add({ targets: this.lisa, x: this.enemy.x - 150, duration: 160, yoyo: true, hold: 180, onComplete: () => { this.lisa.x = x0 } })
    sc.time.delayedCall(170, () => {
      this.enemy.setPose('hurt')
      sfx(sc, 'clash'); sc.time.delayedCall(100, () => sfx(sc, 'hitHeavy'))
      this.hp -= 1
      this.enemy.flash()
      sc.floatText(this.enemy.x, this.enemy.y - 280, 'HIT!', '#7dffb0', 4400)
      sc.spark(this.enemy.x - 30, this.enemy.y - 170)
      sc.cameras.main.shake(140, 0.006)
    })
    this.say(`Only your ${NAMES[r]} and ${this.P.poss} ${NAMES[c]} are left. If ${this.enemyName} is rational and knows you are, and so on all the way down, ${this.P.sub} has to play ${NAMES[c]}.`, 16)
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
    if (this.stage) {
      if (this.scene.time.now - this.stageAt > 400 && p.take('Space', 'Enter')) (this.stage === 'hit' ? this.landHit() : this.nextCard())
      return
    }
    const step = (list, cur, d) => list[(list.indexOf(cur) + d + list.length) % list.length]
    const rowsV = this.rowOrder.filter((r) => this.rows.includes(r)), colsV = this.colOrder.filter((c) => this.cols.includes(c))
    const mv = (side, d) => {
      const list = side === 0 ? rowsV : colsV
      if (!list.length) return
      this.cursor = this.cursor.s === side ? { s: side, a: step(list, this.cursor.a, d) } : { s: side, a: list[0] }
      sfx(this.scene, 'hover')
      this.paintCursor()
    }
    if (p.take('ArrowUp', 'KeyW')) mv(0, -1)
    else if (p.take('ArrowDown', 'KeyS')) mv(0, 1)
    else if (p.take('ArrowLeft', 'KeyA')) mv(1, -1)
    else if (p.take('ArrowRight', 'KeyD')) mv(1, 1)
    else if (p.take('Space', 'Enter', 'KeyJ')) this.strike()
  }

  // dev hook: shatter the next dominated move
  solve() {
    if (!this.waiting) return
    if (this.stage === 'hit') return this.landHit()
    if (this.stage === 'next') return this.nextCard()
    this.dealtAt = -1e9
    for (const r of this.rows) if (dominator(this.U, 0, r, this.rows, this.cols)) { this.cursor = { s: 0, a: r }; return this.strike() }
    for (const c of this.cols) if (dominator(this.U, 1, c, this.cols, this.rows)) { this.cursor = { s: 1, a: c }; return this.strike() }
  }
}
