import Phaser from 'phaser'
import { loadArt, needsFor } from '../systems/art.js'
import { bindPauseKey } from './Pause.js'
import { Dialogue } from '../ui/Dialogue.js'
import { Fighter } from '../actors/Fighter.js'
import { PD, shuffle } from '../data/games.js'
import { trackPresses } from '../systems/presses.js'
import { playMusic, bindMuteKey } from '../systems/audio.js'
import { sfx } from '../systems/sfx.js'

// Prologue: the Prisoner's Dilemma (Example 16.2, Figure 17.1, pp.16-17).
export default class Prologue extends Phaser.Scene {
  constructor() { super('Prologue') }

  preload() { loadArt(this, needsFor('Prologue')) }

  create() {
    this.cameras.main.fadeIn(500)
    playMusic(this, 'prologue_theme', 0.4)
    bindMuteKey(this)
    bindPauseKey(this)
    this.add.image(640, 360, 'prologue_bg').setDisplaySize(1280, 720)
    this.lisa = new Fighter(this, 'lisa', 300, 650, { artFacing: 1 })
    this.lisa.face(1)
    this.juno = new Fighter(this, 'juno', 990, 650, { artFacing: -1 })
    this.juno.face(-1)
    this.zero = new Fighter(this, 'zero', 640, 690, { artFacing: 1 })
    this.zero.face(-1)
    this.zero.sprite.setAlpha(0)
    this.zero.shadow.setAlpha(0)
    ;[this.lisa, this.juno, this.zero].forEach((f) => f.sync())
    this.dlg = new Dialogue(this, { top: true })
    this.cardC = null
    this.cells = {}
    this.choosing = false
    this.presses = trackPresses(this)

    this.dlg.play([
      { text: 'Opening night of the Grand Tour, in the city of Equilibria. The curtain goes up in ten minutes.' },
      { who: 'juno', text: 'Lisa? Why did they put us in separate rooms?' },
      { who: 'zero', text: "Because I wanted a word with each of you alone, my dears. Don't bother shouting; the walls are very thick.", do: () => this.tweens.add({ targets: [this.zero.sprite, this.zero.shadow], alpha: { from: 0, to: 1 }, duration: 600 }) },
      { who: 'zero', text: "I'm making you both the same offer, and neither of you will hear what the other says." },
      { who: 'zero', text: "You can stay quiet, or you can sell your partner out. Decide before the curtain goes up." },
      { who: 'tempo', text: "Lisa, I drew his deal as a card for you. Your points are in pink and Rosie's are in teal, and bigger is better.", do: () => this.showCard() },
    ], () => this.startChoice())
  }

  showCard() {
    const c = this.add.container(640, 395).setDepth(4000)
    const g = this.add.graphics()
    g.fillStyle(0x0d0820, 0.94).fillRoundedRect(-300, -150, 600, 300, 16)
    g.lineStyle(3, 0xffd166, 1).strokeRoundedRect(-300, -150, 600, 300, 16)
    c.add(g)
    const txt = (x, y, s, o = {}) => this.add.text(x, y, s, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '20px', color: '#fff', ...o }).setOrigin(0.5)
    c.add(txt(0, -128, "ZERO'S DEAL", { fontFamily: 'Bangers', fontSize: '30px', color: '#ffd166' }))
    c.add(txt(100, -90, `Rosie:\n${PD.label.quiet}`, { color: '#5ce1d6', fontSize: '17px', align: 'center' }))
    c.add(txt(225, -90, `Rosie:\n${PD.label.sell}`, { color: '#5ce1d6', fontSize: '17px', align: 'center' }))
    this.rowOrder = shuffle(PD.rows)
    this.rowY = {}
    this.rowHit = {}
    this.rowOrder.forEach((r, i) => {
      const y = -30 + i * 100
      this.rowY[r] = y
      const key = window.__touch ? '' : i === 0 ? 'J' : 'L'
      const hit = this.add.rectangle(-150, y, 280, 84, 0xff5fa2, 0.0).setStrokeStyle(2, 0xff5fa2, 0.6)
      hit.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.choose(r))
      this.rowHit[r] = hit
      c.add(hit)
      c.add(txt(-150, y - 12, `Lisa: ${PD.label[r]}`, { color: '#ff5fa2', fontSize: '22px' }))
      if (key) c.add(txt(-150, y + 18, `[${key}]`, { color: '#ffd166', fontSize: '16px' }))
      ;['quiet', 'sell'].forEach((col, j) => {
        const x = 100 + j * 125
        const cell = this.add.rectangle(x, y, 118, 84, 0x2a0f4a, 1).setStrokeStyle(2, 0x6b5b8a)
        const [a, b] = PD.payoff[r][col]
        const ta = this.add.text(x - 8, y, `${a}`, { fontFamily: 'Bangers', fontSize: '40px', color: '#ff5fa2' }).setOrigin(1, 0.5)
        const tc = this.add.text(x, y, ',', { fontFamily: 'Bangers', fontSize: '40px', color: '#fff' }).setOrigin(0.5)
        const tb = this.add.text(x + 10, y, `${b}`, { fontFamily: 'Bangers', fontSize: '40px', color: '#5ce1d6' }).setOrigin(0, 0.5)
        c.add([cell, ta, tc, tb])
        this.cells[`${r},${col}`] = cell
      })
    })
    c.setAlpha(0)
    this.tweens.add({ targets: c, alpha: 1, duration: 300 })
    this.cardC = c
  }

  startChoice() {
    this.choosing = true
    this.prompt = this.add.text(640, 600, 'Choose your answer to Zero', {
      fontFamily: 'Bangers', fontSize: '32px', color: '#fff', stroke: '#000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(4001)
  }

  choose(r) {
    if (!this.choosing) return
    this.choosing = false
    sfx(this, 'select')
    this.prompt.destroy()
    this.rowHit[r].setFillStyle(0xff5fa2, 0.25)
    const juno = 'sell' // each player's dominant action (p.16): whatever the other does, Confess is better
    const [a, b] = PD.payoff[r][juno]
    this.cells[`${r},${juno}`].setStrokeStyle(5, 0xffd166)
    const hl = (col, on) => PD.rows.forEach((row) => this.cells[`${row},${col}`].setFillStyle(on ? 0x4a2a7a : 0x2a0f4a))
    const lines = [
      { who: 'lisa', text: r === 'quiet' ? "I'm staying quiet." : "...I'm selling her out." },
      { who: 'juno', text: 'I sold you out. I\'m sorry, Lisa.' },
      { who: 'tempo', text: `You got ${a} points and Rosie got ${b}.` },
      { who: 'tempo', text: 'Look at the card. If Rosie stays quiet, selling out gets you 4 and staying quiet gets you 3.', do: () => hl('quiet', true) },
      { who: 'tempo', text: 'And if Rosie sells out, selling out gets you 1 and staying quiet gets you 0.', do: () => { hl('quiet', false); hl('sell', true) } },
      { who: 'tempo', text: 'Whatever she does, selling out pays you more. Her card works the same way.', do: () => hl('sell', false) },
      { who: 'tempo', text: 'So if you both play it safe, you both sell out and get 1 each, when staying quiet would have paid 3 each.' },
      { who: 'zero', text: 'Spoken like a pair of rational players. I do love those.' },
      { who: 'zero', text: "For me to win, somebody has to lose. That's how every game works, my dears." },
      { who: 'juno', text: 'Lisa, the setlist! Don\'t let him take our songs!', do: () => this.takeJuno() },
      { who: 'lisa', text: 'Rosie!' },
      { who: 'tempo', text: "He tore up your setlist, and the pages are scattered all over his Tour." },
      { who: 'lisa', text: "Then I'll win back every page, and next time I'll read the game before I play it." },
    ]
    this.time.delayedCall(500, () => this.dlg.play(lines, () => this.leave()))
  }

  takeJuno() {
    sfx(this, 'sting')
    this.time.delayedCall(400, () => sfx(this, 'whooshBig'))
    if (this.cardC) this.tweens.add({ targets: this.cardC, alpha: 0, duration: 300 })
    // move the fighters themselves (sync() puts their sprites back at f.x every frame), and fade their sprites separately
    this.tweens.add({ targets: [this.juno, this.zero], x: '+=260', duration: 900, delay: 300 })
    this.tweens.add({ targets: [this.juno.sprite, this.juno.shadow, this.zero.sprite, this.zero.shadow], alpha: 0, duration: 900, delay: 300 })
    for (let i = 0; i < 6; i++) {
      const p = this.add.image(900, 520, 'setlist_page').setDepth(4500).setScale(0.8)
      this.tweens.add({
        targets: p, x: 900 + Phaser.Math.Between(-500, 500), y: Phaser.Math.Between(-120, 200), angle: Phaser.Math.Between(-400, 400),
        alpha: 0, duration: 1600 + i * 150, ease: 'Cubic.out',
      })
    }
  }

  leave() {
    this.cameras.main.fadeOut(700)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Street', { level: 'w1', checkpoint: 0 }))
  }

  update(_, dms) {
    const dt = dms / 1000
    this.dlg.update(dt)
    ;[this.lisa, this.juno, this.zero].forEach((f) => f.sprite.active && f.sync(dt))
    if (this.choosing) {
      if (this.presses.take('KeyJ')) this.choose(this.rowOrder[0])
      else if (this.presses.take('KeyL')) this.choose(this.rowOrder[1])
    }
    this.presses.clear()
  }

  debugState() { return { scene: 'Prologue', choosing: this.choosing } }
  debugSolve() { if (this.choosing) this.choose('sell'); return 'chose sell' }
}
