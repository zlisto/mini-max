import Phaser from 'phaser'
import { sfx } from '../systems/sfx.js'
import { MOVES, MOVE_LABEL, MOVE_KEY, makeStandoff, fogCells, enemyPick, maxminRows, rowMin, shuffle } from '../data/games.js'

// A standoff: one strictly competitive game per phase (Definition 21.1, p.21). Lisa picks a row; the enemy
// best-responds to her recent play. Playing the maxminimizer row (Definition 21.2) guarantees the value.
// phase = { hp, view: 'lisa' | 'enemy', fog: bool, value, timer?: seconds }  (no timer = take your time)
export class Standoff {
  constructor(scene, { lisa, enemy, enemyName, phases, onPhaseWin, onLose, say }) {
    Object.assign(this, { scene, lisa, enemy, enemyName, phases, onPhaseWin, onLose, say })
    this.phaseIdx = 0
    this.c = scene.add.container(0, 0).setScrollFactor(0).setDepth(4200).setVisible(false)
    this.active = false
  }

  startPhase(i = this.phaseIdx) {
    this.phaseIdx = i
    const ph = this.phases[i]
    const g = makeStandoff(ph.value ?? 1)
    this.A = g.A
    this.saddle = g.saddle
    this.value = g.value
    this.hp = ph.hp
    this.view = ph.view
    this.timeMax = ph.timer || null
    this.hidden = ph.fog ? fogCells(this.A, this.saddle[0]) : new Set()
    this.rowOrder = shuffle([0, 1, 2]) // shuffled layout on every mount
    this.colOrder = shuffle([0, 1, 2])
    this.history = []
    this.round = 0
    this.drawCard()
    this.active = true
    this.c.setVisible(true).setAlpha(0)
    this.scene.tweens.add({ targets: this.c, alpha: 1, duration: 250 })
    sfx(this.scene, 'freeze')
    this.ask()
  }

  // ---- card -------------------------------------------------------------
  drawCard() {
    this.c.removeAll(true)
    const s = this.scene
    const X = 24, Y = 16, W = 520, H = 330
    const g = s.add.graphics()
    g.fillStyle(0x0d0820, 0.93).fillRoundedRect(X, Y, W, H, 14)
    g.lineStyle(3, this.view === 'enemy' ? 0xf4f4ff : 0xffd166, 1).strokeRoundedRect(X, Y, W, H, 14)
    this.c.add(g)
    const txt = (x, y, str, o = {}) => s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '18px', color: '#fff', ...o }).setOrigin(0.5)
    const title = this.view === 'enemy' ? `${this.enemyName.toUpperCase()}'S CARD: HER winnings` : `FIGHT CARD: your points for each pair`
    this.c.add(txt(X + W / 2, Y + 22, title, { fontFamily: 'Bangers', fontSize: '25px', color: this.view === 'enemy' ? '#f4f4ff' : '#ffd166' }))
    this.cellW = 104; this.cellH = 58
    this.gx = X + 196; this.gy = Y + 92
    this.c.add(txt(this.gx + 1.5 * this.cellW - this.cellW / 2, Y + 50, `${this.enemyName} plays`, { color: '#ff9a5c', fontSize: '15px' }))
    this.colOrder.forEach((c, j) => this.c.add(txt(this.gx + j * this.cellW, Y + 70, MOVE_LABEL[MOVES[c]], { color: '#ff9a5c' })))
    this.cellObj = {}
    this.rowHit = {}
    this.rowOrder.forEach((r, i) => {
      const y = this.gy + i * this.cellH + this.cellH / 2
      const hit = s.add.rectangle(X + 92, y, 150, this.cellH - 6, 0xff5fa2, 0.12).setStrokeStyle(2, 0xff5fa2, 0.7)
      hit.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.pick(r))
      this.rowHit[r] = hit
      this.c.add(hit)
      this.c.add(txt(X + 92, y - 9, `Lisa: ${MOVE_LABEL[MOVES[r]]}`, { color: '#ff5fa2' }))
      this.c.add(txt(X + 92, y + 13, `[${MOVE_KEY[MOVES[r]]}]`, { color: '#ffd166', fontSize: '14px' }))
      this.colOrder.forEach((c, j) => {
        const x = this.gx + j * this.cellW
        const rect = s.add.rectangle(x, y, this.cellW - 6, this.cellH - 6, 0x2a0f4a).setStrokeStyle(2, 0x6b5b8a)
        const t = s.add.text(x, y, '', { fontFamily: 'Bangers', fontSize: '34px', color: '#fff' }).setOrigin(0.5)
        this.c.add([rect, t])
        this.cellObj[`${r},${c}`] = { rect, t }
        this.paintCell(r, c)
      })
    })
    this.timerBar = s.add.rectangle(X + 20, Y + H - 20, W - 40, 8, 0xff5fa2).setOrigin(0, 0.5)
    this.c.add(this.timerBar)
    this.c.each((o) => o.setScrollFactor && o.setScrollFactor(0)) // clickable on a scrolled camera
  }

  paintCell(r, c, hot = false) {
    const o = this.cellObj[`${r},${c}`]
    if (this.hidden.has(`${r},${c}`)) { o.t.setText('?').setColor('#8a7aa8'); o.rect.setFillStyle(0x1a0a30); return }
    const v = this.view === 'enemy' ? -this.A[r][c] : this.A[r][c]
    o.t.setText(v > 0 ? `+${v}` : `${v}`).setColor('#ffffff') // no colour coding: it would point at the answer
    o.rect.setFillStyle(hot ? 0x6a3aa0 : 0x2a0f4a).setStrokeStyle(hot ? 5 : 2, hot ? 0xffd166 : 0x6b5b8a)
  }

  // ---- rounds -------------------------------------------------------------
  ask() {
    this.waiting = true
    this.timeLeft = this.timeMax
    this.lastTick = null
    this.timerBar.setVisible(!!this.timeMax)
  }

  pick(r) {
    if (!this.active || !this.waiting) return
    this.waiting = false
    sfx(this.scene, 'pick')
    const c = enemyPick(this.A, this.history)
    this.history.push(r)
    this.reveal(r, c)
  }

  timeout() {
    this.waiting = false
    this.lisa.hp -= 2
    this.scene.floatText(this.lisa.x, this.lisa.y - 260, '-2  too slow!', '#ff6b7a')
    this.lisa.setPose('hurt')
    this.scene.time.delayedCall(700, () => { this.lisa.setPose('idle'); this.after() })
  }

  reveal(r, c) {
    const s = this.scene
    const mv = MOVES[r], ev = MOVES[c]
    this.lisa.setPose(mv)
    this.enemy.setPose(ev)
    this.rowHit[r].setFillStyle(0xff5fa2, 0.35)
    s.tweens.add({ targets: this.lisa, x: this.lisa.x + 50, duration: 120, yoyo: true })
    s.tweens.add({ targets: this.enemy, x: this.enemy.x - 50, duration: 120, yoyo: true })
    const wasHidden = this.hidden.delete(`${r},${c}`)
    this.paintCell(r, c, true)
    // Lisa's points this exchange, and the value of the game: what her maxminimizer guarantees
    // (Definition 21.2 and Proposition 22.2, pp.21-22). A hit lands when she scores at least the value.
    const got = this.A[r][c]
    const val = this.value
    const clean = got >= val
    const fmt = (n) => (n > 0 ? `+${n}` : `${n}`)
    s.time.delayedCall(140, () => {
      s.cameras.main.shake(120, 0.004)
      const mid = (this.lisa.x + this.enemy.x) / 2
      s.floatText(mid, this.lisa.y - 330, `${fmt(this.view === 'enemy' ? -got : got)}`, '#ffffff')
      sfx(s, 'clash')
      s.time.delayedCall(120, () => sfx(s, clean ? 'clean' : 'punished'))
      if (clean) {
        this.hp -= 1
        this.enemy.flash()
        s.floatText(this.enemy.x, this.enemy.y - 280, 'HIT!', '#7dffb0')
        s.spark(this.enemy.x - 30, this.enemy.y - 170)
      } else {
        const dmg = Math.min(4, val - got + 1)
        this.lisa.hp -= dmg
        this.lisa.flash()
        s.floatText(this.lisa.x, this.lisa.y - 260, `-${dmg}`, '#ff6b7a')
        s.spark(this.lisa.x + 30, this.lisa.y - 150)
      }
    })
    // Tempo's read on the exchange, after the fact (never before the pick)
    const worst = rowMin(this.A, r)
    const isMaxmin = maxminRows(this.A).includes(r)
    const w = this.view === 'enemy'
      ? `Her best against ${MOVE_LABEL[mv]} is ${fmt(-worst)}`
      : `${MOVE_LABEL[mv]}'s worst case is ${fmt(worst)}`
    const guarantee = this.view === 'enemy'
      ? `the least you can hold her to is ${fmt(-val)}`
      : `the most this card can guarantee you is ${fmt(val)}`
    let line
    if (isMaxmin && val < 0) line = `${w}, and ${guarantee}. A minus, but nobody beats it. Hit!`
    else if (isMaxmin) line = `${w}, and ${guarantee}. Nothing ${this.enemyName} does pushes you lower. Hit!`
    else if (clean) line = `Lucky. ${w}. ${this.enemyName} will find that.`
    else line = `${w}, but ${guarantee}. ${this.enemyName} found the gap.`
    if (wasHidden) line = `Hidden cell: ${fmt(this.view === 'enemy' ? -got : got)}. ` + line
    this.say(line)
    s.time.delayedCall(1300, () => {
      this.paintCell(r, c, false)
      this.rowHit[r].setFillStyle(0xff5fa2, 0.12)
      this.lisa.setPose('idle')
      this.enemy.setPose('idle')
      this.after()
    })
  }

  after() {
    if (this.lisa.hp <= 0) { this.end(); this.onLose(); return }
    if (this.hp <= 0) { this.end(); this.onPhaseWin(this.phaseIdx); return }
    this.round++
    this.ask()
  }

  end() {
    this.active = false
    this.waiting = false
    this.scene.tweens.add({ targets: this.c, alpha: 0, duration: 250, onComplete: () => this.c.setVisible(false) })
  }

  update(dt) {
    if (!this.active || !this.waiting) return
    if (this.timeMax) {
      this.timeLeft -= dt
      this.timerBar.setScale(Math.max(0, this.timeLeft / this.timeMax), 1)
      const sec = Math.ceil(this.timeLeft)
      if (sec <= 3 && sec !== this.lastTick) { this.lastTick = sec; sfx(this.scene, 'tick') }
    }
    const p = this.scene.presses
    if (p.take('KeyJ', 'KeyZ')) this.pick(0)
    else if (p.take('KeyK', 'KeyX')) this.pick(1)
    else if (p.take('KeyL', 'KeyC')) this.pick(2)
    else if (this.timeMax && this.timeLeft <= 0) this.timeout()
  }

  solve() { if (this.waiting) this.pick(maxminRows(this.A)[0]) }
}
