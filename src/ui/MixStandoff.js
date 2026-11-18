import { sfx } from '../systems/sfx.js'
import { MOVES, MOVE_LABEL } from '../data/games.js'
import { makeMixGame, colAverages12, startingWheel } from '../data/mix.js'

const SLICE_COLORS = [0xff5fa2, 0x5ce1d6, 0xffd166]
const fmt12 = (n12) => { const v = n12 / 12; const s = Math.abs(v - Math.round(v)) < 1e-9 ? `${Math.round(v)}` : v.toFixed(2); return v > 0 ? `+${s}` : s }
const fmt = (n) => (n > 0 ? `+${n}` : `${n}`)
const PRONOUN = { she: { subj: 'she', obj: 'her', poss: 'her' }, he: { subj: 'he', obj: 'him', poss: 'his' } }

// A mixed standoff (Chapter 3): no single move is safe, so Lisa sets a 12-slice wheel (a mixed strategy, p.32).
// The enemy reads the wheel and answers with the move that is worst for her. The wheel's guarantee is its worst
// column average; the hit lands when that equals the game's value. That happens only at the equilibrium mix,
// which leaves every answer the enemy uses paying the same (Lemma 33.2 applied to the enemy, pp.33-34), so
// reading the wheel gains the enemy nothing (pp.37-38). A new card is dealt after every hit.
// phase = { hp, size: 2|3, view: 'lisa'|'enemy', read: 'live'|'after'|'none', timer?: seconds }
export class MixStandoff {
  constructor(scene, { lisa, enemy, enemyName, pronoun = 'she', phases, onPhaseWin, onLose, say }) {
    Object.assign(this, { scene, lisa, enemy, enemyName, phases, onPhaseWin, onLose, say })
    this.pr = PRONOUN[pronoun] || PRONOUN.she
    this.phaseIdx = 0
    this.c = scene.add.container(0, 0).setScrollFactor(0).setDepth(4200).setVisible(false)
    this.active = false
    this.kind = 'mix'
  }

  startPhase(i = this.phaseIdx) {
    this.phaseIdx = i
    const ph = this.phases[i]
    this.hp = ph.hp
    this.view = ph.view || 'lisa'
    this.read = ph.read || 'none'
    this.timeMax = ph.timer || null
    this.deal(ph)
    this.active = true
    this.c.setVisible(true).setAlpha(0)
    this.scene.tweens.add({ targets: this.c, alpha: 1, duration: 250 })
    sfx(this.scene, 'freeze')
    this.say('Set your wheel, then SPIN.', this.captionY)
    this.ask()
  }

  // a fresh card and a fresh (wrong) starting wheel
  deal(ph = this.phases[this.phaseIdx]) {
    const g = makeMixGame(ph.size || 2)
    Object.assign(this, { A: g.A, rows: g.rows, cols: g.cols, p: g.p, v12: g.v12 })
    this.n = this.A.length
    this.w = startingWheel(this.n, this.p)
    this.lastW = null
    this.sel = 0
    this.draw()
  }

  // ---- drawing ---------------------------------------------------------------
  draw() {
    this.c.removeAll(true)
    const s = this.scene
    const txt = (x, y, str, o = {}) => s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '18px', color: '#fff', ...o }).setOrigin(0.5)
    const n = this.n, P = this.pr, Name = this.enemyName
    // card
    const X = 24, Y = 16, W = 520, cellW = n === 3 ? 92 : 120, cellH = 54
    const showRow = this.read !== 'none'
    const H = 120 + n * cellH + (showRow ? 54 : 0)
    const g = s.add.graphics()
    g.fillStyle(0x0d0820, 0.93).fillRoundedRect(X, Y, W, H, 14)
    g.lineStyle(3, this.view === 'enemy' ? 0xf4f4ff : 0xffd166, 1).strokeRoundedRect(X, Y, W, H, 14)
    this.c.add(g)
    const title = this.view === 'enemy' ? `${Name.toUpperCase()}'S CARD: ${P.poss.toUpperCase()} points` : 'FIGHT CARD: your points for each pair'
    this.c.add(txt(X + W / 2, Y + 22, title, { fontFamily: 'Bangers', fontSize: '25px', color: this.view === 'enemy' ? '#f4f4ff' : '#ffd166' }))
    const gx = X + 196 + (n === 3 ? 0 : 20), gy = Y + 86
    this.c.add(txt(gx + ((n - 1) * cellW) / 2, Y + 50, `${Name} plays`, { color: '#ff9a5c', fontSize: '15px' }))
    this.colHead = this.cols.map((m, j) => { const t = txt(gx + j * cellW, Y + 70, MOVE_LABEL[MOVES[m]], { color: '#ff9a5c' }); this.c.add(t); return t })
    this.cells = []
    this.rows.forEach((m, r) => {
      const y = gy + r * cellH + cellH / 2
      this.c.add(s.add.rectangle(X + 22, y, 14, 14, SLICE_COLORS[r]))
      this.c.add(txt(X + 100, y, `Lisa: ${MOVE_LABEL[MOVES[m]]}`, { color: '#ff5fa2' }))
      this.cells[r] = this.cols.map((_, c) => {
        const x = gx + c * cellW
        const v = this.view === 'enemy' ? -this.A[r][c] : this.A[r][c]
        const rect = s.add.rectangle(x, y, cellW - 6, cellH - 6, 0x2a0f4a).setStrokeStyle(2, 0x6b5b8a)
        this.c.add(rect)
        this.c.add(s.add.text(x, y, fmt(v), { fontFamily: 'Bangers', fontSize: '32px', color: '#fff' }).setOrigin(0.5))
        return rect
      })
    })
    // the averages row: Lisa's (or, on the enemy's card, the enemy's) average against each enemy answer
    this.readTexts = []
    if (showRow) {
      const y = gy + n * cellH + 24
      const who = this.view === 'enemy' ? `${P.poss.toUpperCase()} average` : 'YOUR average'
      this.readLabel = txt(X + 100, y, this.read === 'live' ? `${who} if\n${P.subj} plays this:` : `Last spin's\n${this.view === 'enemy' ? P.poss : 'your'} averages:`, { fontSize: '14px', color: '#ffd166', align: 'center' })
      this.c.add(this.readLabel)
      this.cols.forEach((_, c) => {
        const t = s.add.text(gx + c * cellW, y, '', { fontFamily: 'Bangers', fontSize: '26px', color: '#ffd166' }).setOrigin(0.5)
        this.readTexts.push(t)
        this.c.add(t)
      })
    }
    // wheel panel (top right, sized to the number of moves so heads stay clear below it)
    const PX = 560, PY = 16, PW = 696, PH = 64 + n * 46 + 58
    this.captionY = PY + PH + 10
    const pg = s.add.graphics()
    pg.fillStyle(0x0d0820, 0.93).fillRoundedRect(PX, PY, PW, PH, 14).lineStyle(3, 0xff5fa2, 1).strokeRoundedRect(PX, PY, PW, PH, 14)
    this.c.add(pg)
    this.c.add(txt(PX + 300, PY + 22, 'YOUR WHEEL: 12 slices, the spin picks your move', { fontFamily: 'Bangers', fontSize: '22px', color: '#ff5fa2' }))
    const R = Math.min(70, (PH - 60) / 2)
    this.wheelR = R
    const wy = PY + 40 + (PH - 40) / 2
    this.wheelG = s.add.graphics()
    this.wheelC = s.add.container(PX + 100, wy, [this.wheelG])
    this.pointer = s.add.triangle(PX + 100, wy - R - 8, 0, 0, 16, 0, 8, 14, 0xffffff)
    this.c.add([this.wheelC, this.pointer])
    this.rowUi = []
    this.rows.forEach((m, r) => {
      const y = PY + 62 + r * 46
      const bg = s.add.rectangle(PX + 440, y, 460, 40, 0xffffff, 0.0).setStrokeStyle(2, SLICE_COLORS[r], 0.9)
      const name = s.add.text(PX + 222, y, MOVE_LABEL[MOVES[m]], { fontFamily: 'Nunito', fontStyle: '800', fontSize: '20px', color: '#fff' }).setOrigin(0, 0.5)
      const minus = s.add.text(PX + 400, y, '−', { fontFamily: 'Bangers', fontSize: '32px', color: '#fff', backgroundColor: '#2a0f4a', padding: { x: 12, y: 0 } }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      const count = s.add.text(PX + 462, y, '', { fontFamily: 'Bangers', fontSize: '28px', color: '#fff' }).setOrigin(0.5)
      const plus = s.add.text(PX + 524, y, '+', { fontFamily: 'Bangers', fontSize: '32px', color: '#fff', backgroundColor: '#2a0f4a', padding: { x: 10, y: 0 } }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      const pct = s.add.text(PX + 610, y, '', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '18px', color: '#b9a6e0' }).setOrigin(0.5)
      minus.on('pointerdown', () => { this.sel = r; this.adjust(-1) })
      plus.on('pointerdown', () => { this.sel = r; this.adjust(+1) })
      bg.setInteractive().on('pointerdown', () => { this.sel = r; this.refresh() })
      this.rowUi.push({ bg, count, pct })
      this.c.add([bg, name, minus, count, plus, pct])
    })
    const by = PY + 62 + n * 46 + 2
    this.poolText = s.add.text(PX + 360, by, '', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '16px', color: '#ffd166' }).setOrigin(0.5)
    this.spinBtn = s.add.text(PX + 590, by, 'SPIN ▶', { fontFamily: 'Bangers', fontSize: '30px', color: '#fff', backgroundColor: '#ff5fa2', padding: { x: 14, y: 2 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true })
    this.spinBtn.on('pointerdown', () => this.spin())
    this.c.add([this.poolText, this.spinBtn])
    const hint = n === 3 ? 'W/S pick · A/D remove/add a slice (adding takes from your biggest other move) · SPACE spin'
      : 'W/S pick a move · A/D move a slice across · SPACE spin'
    this.c.add(txt(PX + 410, PY + PH - 13, hint, { fontSize: '13px', color: '#b9a6e0' }))
    this.timerBar = s.add.rectangle(PX + 20, PY + PH - 3, PW - 40, 5, 0xff5fa2).setOrigin(0, 0.5)
    this.c.add(this.timerBar)
    this.c.each((o) => o.setScrollFactor && o.setScrollFactor(0)) // clickable on a scrolled camera
    this.refresh()
  }

  drawWheel() {
    const g = this.wheelG, R = this.wheelR
    g.clear()
    let a = -Math.PI / 2
    const sliceA = (Math.PI * 2) / 12
    const paint = (fill, line) => {
      g.fillStyle(fill, 1).slice(0, 0, R, a, a + sliceA, false).fillPath()
      g.lineStyle(2, line, 1).slice(0, 0, R, a, a + sliceA, false).strokePath()
      a += sliceA
    }
    this.w.forEach((k, r) => { for (let i = 0; i < k; i++) paint(SLICE_COLORS[r], 0x0d0820) })
    const free = 12 - this.w.reduce((x, y) => x + y, 0)
    for (let i = 0; i < free; i++) paint(0x2a0f4a, 0x6b5b8a)
    g.fillStyle(0x0d0820, 1).fillCircle(0, 0, 12)
  }

  refresh() {
    const free = 12 - this.w.reduce((x, y) => x + y, 0)
    this.rowUi.forEach((u, r) => {
      u.count.setText(`${this.w[r]}`)
      u.pct.setText(`${Math.round((this.w[r] / 12) * 100)}%`)
      u.bg.setFillStyle(0xffffff, r === this.sel ? 0.12 : 0.0)
    })
    this.poolText.setText(free > 0 ? `${free} slice${free > 1 ? 's' : ''} left to place` : 'Wheel full')
    this.spinBtn.setAlpha(free === 0 && this.waiting ? 1 : 0.4)
    const src = this.read === 'live' ? (free ? null : this.w) : this.read === 'after' ? this.lastW : null
    if (this.readTexts.length) {
      if (!src) this.readTexts.forEach((t) => t.setText(this.read === 'live' ? '…' : '?').setColor('#8a7aa8'))
      else {
        const avg = colAverages12(this.A, src)
        const lo = Math.min(...avg)
        const even = avg.every((a) => a === avg[0])
        avg.forEach((a12, c) => {
          const shown = this.view === 'enemy' ? -a12 : a12
          // green when every answer pays the same (the equilibrium), red marks the answer the enemy will pick
          this.readTexts[c].setText(fmt12(shown)).setColor(even ? '#7dffb0' : a12 === lo ? '#ff6b7a' : '#ffd166')
        })
      }
    }
    this.drawWheel()
  }

  adjust(d) {
    if (!this.waiting) return
    const free = 12 - this.w.reduce((x, y) => x + y, 0)
    if (d > 0) {
      if (free === 0) {
        // take a slice from the biggest other move so the wheel stays at 12
        const donor = [...Array(this.n).keys()].filter((r) => r !== this.sel && this.w[r] > 0).sort((a, b) => this.w[b] - this.w[a])[0]
        if (donor == null) return
        this.w[donor]--
      }
      this.w[this.sel]++
    } else {
      if (this.w[this.sel] === 0) return
      this.w[this.sel]--
      if (this.n === 2) this.w[1 - this.sel]++ // two moves: a slice always moves across
    }
    sfx(this.scene, 'hover')
    this.refresh()
  }

  // ---- rounds ------------------------------------------------------------------
  ask() {
    this.waiting = true
    this.timeLeft = this.timeMax
    this.timerBar.setVisible(!!this.timeMax)
    this.colHead.forEach((t) => t.setColor('#ff9a5c'))
    this.cells.forEach((row) => row.forEach((rect) => rect.setStrokeStyle(2, 0x6b5b8a)))
    this.refresh()
  }

  spin() {
    if (!this.active || !this.waiting) return
    if (this.w.reduce((x, y) => x + y, 0) !== 12) { sfx(this.scene, 'punished'); this.say('Place all 12 slices first.', this.captionY); return }
    this.waiting = false
    sfx(this.scene, 'pick')
    const avg = colAverages12(this.A, this.w)
    const g12 = Math.min(...avg)
    // the enemy reads the wheel and plays a column that is worst for Lisa (ties: any of them)
    const worst = avg.map((a, c) => (a === g12 ? c : -1)).filter((c) => c >= 0)
    const c = worst[Math.floor(Math.random() * worst.length)]
    // the wheel picks Lisa's actual move
    let roll = Math.floor(Math.random() * 12), r = 0
    while (roll >= this.w[r]) { roll -= this.w[r]; r++ }
    const s = this.scene
    let start = 0
    for (let i = 0; i < r; i++) start += this.w[i]
    const target = 360 * 3 + (360 - (start * 30 + (roll + 0.5) * 30))
    this.wheelC.setAngle(0)
    s.tweens.add({ targets: this.wheelC, angle: target, duration: 1100, ease: 'Cubic.out', onUpdate: () => { if (Math.random() < 0.18) sfx(s, 'tick') } })
    this.lastW = this.w.slice()
    s.time.delayedCall(1150, () => this.reveal(r, c, g12, avg))
  }

  reveal(r, c, g12, avg) {
    const s = this.scene, P = this.pr, Name = this.enemyName
    const mv = MOVES[this.rows[r]], ev = MOVES[this.cols[c]]
    this.lisa.setPose(mv)
    this.enemy.setPose(ev)
    // show what happened on the card: the enemy's answer (column) and the cell the spin landed on
    this.colHead[c].setColor('#ffffff')
    this.cells.forEach((row) => row[c].setStrokeStyle(3, 0xff9a5c))
    this.cells[r][c].setStrokeStyle(5, 0xffffff)
    this.refresh()
    s.tweens.add({ targets: this.lisa, x: this.lisa.x + 50, duration: 120, yoyo: true })
    s.tweens.add({ targets: this.enemy, x: this.enemy.x - 50, duration: 120, yoyo: true })
    const got = this.A[r][c]
    const clean = g12 >= this.v12
    const allEqual = avg.every((a) => a === avg[0])
    const pure = this.w.some((k) => k === 12)
    const midX = (this.lisa.x + this.enemy.x) / 2
    s.time.delayedCall(140, () => {
      s.cameras.main.shake(120, 0.004)
      sfx(s, 'clash')
      s.time.delayedCall(120, () => sfx(s, clean ? 'clean' : 'punished'))
      s.floatText(midX, 430, `this spin ${fmt(this.view === 'enemy' ? -got : got)}`, '#ffffff', 4300)
      if (clean) {
        this.hp -= 1
        this.enemy.flash()
        s.floatText(this.enemy.x, 470, 'HIT!', '#7dffb0', 4300)
        s.spark(this.enemy.x - 30, this.enemy.y - 170)
      } else {
        const dmg = Math.min(4, 1 + Math.ceil((this.v12 - g12) / 6))
        this.lisa.hp -= dmg
        this.lisa.flash()
        s.floatText(this.lisa.x, 470, `-${dmg}`, '#ff6b7a', 4300)
        s.spark(this.lisa.x + 30, this.lisa.y - 150)
      }
    })
    // Tempo explains, after the spin, in facts only
    const evName = MOVE_LABEL[ev]
    const enemyCard = this.view === 'enemy'
    const avgTxt = enemyCard ? `${P.subj} averages ${fmt12(-g12)}` : `you average ${fmt12(g12)}`
    const best = enemyCard ? `the least you can hold ${P.obj} to is ${fmt12(-this.v12)}` : `the best this card can guarantee you is ${fmt12(this.v12)}`
    let line
    if (clean) {
      const bound = enemyCard ? `At most ${avgTxt}, the least this card allows. ` : `At worst ${avgTxt}, the best this card allows. `
      line = `This spin: ${fmt(enemyCard ? -got : got)}, just luck. ${bound}`
        + (allEqual ? `Every answer pays the same: reading your wheel gains ${P.obj} nothing. Hit!` : 'Hit!')
    } else if (pure) {
      line = `One sure move? ${Name} read it and played ${evName}. Against that, ${avgTxt}; ${best}. No single move is safe here.`
    } else {
      line = `This spin: ${fmt(enemyCard ? -got : got)}, luck either way. ${Name} read your wheel and played ${evName}. Against that answer, ${avgTxt}; ${best}.`
    }
    this.say(line, this.captionY)
    s.time.delayedCall(1700, () => {
      this.lisa.setPose('idle')
      this.enemy.setPose('idle')
      if (this.lisa.hp <= 0) { this.end(); this.onLose(); return }
      if (this.hp <= 0) { this.end(); this.onPhaseWin(this.phaseIdx); return }
      if (clean) {
        // a new card after every hit, so each hit is earned
        this.deal()
        s.floatText(284 + s.cameras.main.scrollX, 180, 'NEW CARD!', '#ffd166', 4300)
        this.say('New card. Set your wheel, then SPIN.', this.captionY)
        sfx(s, 'freeze')
      }
      this.ask()
    })
  }

  timeout() {
    this.waiting = false
    this.lisa.hp -= 2
    this.scene.floatText(this.lisa.x, 470, '-2  too slow!', '#ff6b7a', 4300)
    this.scene.time.delayedCall(700, () => { if (this.lisa.hp <= 0) { this.end(); this.onLose() } else this.ask() })
  }

  end() {
    this.active = false
    this.waiting = false
    this.scene.tweens.add({ targets: this.c, alpha: 0, duration: 250, onComplete: () => this.c.setVisible(false) })
  }

  update(dt) {
    if (!this.active || !this.waiting) return
    const p = this.scene.presses
    if (p.take('KeyW', 'ArrowUp')) { this.sel = (this.sel + this.n - 1) % this.n; this.refresh() }
    if (p.take('KeyS', 'ArrowDown')) { this.sel = (this.sel + 1) % this.n; this.refresh() }
    if (p.take('KeyA', 'ArrowLeft')) this.adjust(-1)
    if (p.take('KeyD', 'ArrowRight')) this.adjust(+1)
    if (p.take('Space', 'Enter')) this.spin()
    if (this.timeMax) {
      this.timeLeft -= dt
      this.timerBar.setScale(Math.max(0, this.timeLeft / this.timeMax), 1)
      if (this.timeLeft <= 0) this.timeout()
    }
  }

  // dev hook: set the equilibrium wheel and spin
  solve() { if (this.waiting) { this.w = this.p.slice(); this.refresh(); this.spin() } }
}
