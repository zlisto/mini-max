import { loadArt } from '../systems/art.js'
import Phaser from 'phaser'
import { LEVELS } from '../data/levels.js'
import { bindMuteKey } from '../systems/audio.js'
import { sfx } from '../systems/sfx.js'
import { writeSave } from '../systems/save.js'

export default class End extends Phaser.Scene {
  constructor() { super('End') }

  init(data) { this.L = LEVELS[data.level] || LEVELS.w1 }

  preload() { loadArt(this, new Set([this.L.art.far])) }

  create() {
    this.leaving = false
    const L = this.L, E = L.end
    this.cameras.main.fadeIn(600)
    bindMuteKey(this)
    this.add.image(640, 360, L.art.far).setDisplaySize(1280, 720)
    this.add.rectangle(640, 360, 1280, 720, 0x0b0614, 0.84)
    this.add.image(1170, 112, 'setlist_page').setScale(1.3).setAngle(-8)
    this.add.text(640, 66, E.title, { fontFamily: 'Bangers', fontSize: '68px', color: '#ffd166', stroke: '#ff5fa2', strokeThickness: 6 }).setOrigin(0.5)
    this.add.text(640, 122, L.page === 12 ? 'Lisa and Rosie have their whole setlist back, all twelve pages.' : `Setlist page ${L.page} of 12 recovered`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '24px', color: '#fff' }).setOrigin(0.5)
    this.add.text(150, 168, 'WHAT YOU USED, FROM THE BOOK', { fontFamily: 'Bangers', fontSize: '30px', color: '#ff5fa2' })
    E.notes.forEach(([idea, ref], i) => {
      const y = 200 + i * (E.notes.length > 9 ? 28 : E.notes.length > 8 ? 33 : 36)
      this.add.text(150, y, idea, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '19px', color: '#ffffff', fixedWidth: 660 })
      this.add.text(1130, y, ref, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '18px', color: '#b9a6e0' }).setOrigin(1, 0)
    })
    const gap = E.notes.length > 9 ? 28 : E.notes.length > 8 ? 33 : 36
    const dag = this.add.text(640, (E.notes.length > 9 ? 200 : 208) + E.notes.length * gap + 12, `† ${E.dagger} The blitz, the power-ups and the boss fights are game inventions too.\nThe ideas they illustrate are the book's: Osborne & Rubinstein, A Course in Game Theory (MIT Press, 1994), ${E.chapter}.`, {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: E.notes.length > 8 ? '15px' : '18px', color: '#c9b8ec', align: 'center', wordWrap: { width: 1150 },
    }).setOrigin(0.5, 0)
    let btnY = 640
    const btn = (x, label, go) => {
      const b = this.add.text(x, btnY, label, { fontFamily: 'Bangers', fontSize: '32px', color: '#fff', backgroundColor: '#2a0f4a', padding: { x: 18, y: 8 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true })
      b.on('pointerdown', () => { if (this.leaving) return; this.leaving = true; sfx(this, 'select'); go() }).on('pointerover', () => { b.setColor('#ffd166'); sfx(this, 'hover') }).on('pointerout', () => b.setColor('#fff'))
      return b
    }
    if (E.next) {
      const N = LEVELS[E.next.level]
      this.add.text(640, 580, `Next stop: ${N.title} (${N.chapter}). Press Enter.`, {
        fontFamily: 'Nunito', fontStyle: '800', fontSize: '20px', color: '#ffd166',
      }).setOrigin(0.5)
      btn(320, `Replay ${L.title}`, () => this.scene.start('Street', { level: L.id, checkpoint: 0 }))
      btn(700, E.next.label, () => this.scene.start('Street', { level: E.next.level, checkpoint: 0 }))
      btn(1030, 'Title', () => this.scene.start('Title'))
      this.input.keyboard.once('keydown-ENTER', () => { sfx(this, 'select'); this.scene.start('Street', { level: E.next.level, checkpoint: 0 }) })
    } else {
      const msgY = Math.max(580, dag.y + dag.height + 16)
      btnY = Math.min(688, Math.max(640, msgY + (E.credits ? 82 : 44)))
      if (E.credits) this.add.text(640, msgY + 40, E.credits, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '16px', color: '#c9b8ec' }).setOrigin(0.5)
      if (E.finale) writeSave({ scene: 'Title', level: 'w1', checkpoint: 0, bossPhase: 0, toured: true })
      this.add.text(640, msgY + (E.finale ? 6 : 0), E.finale ? 'THE END. Lisa and Rosie take the stage together. Thanks for playing Mini Max!' : "That's as far as the Tour goes for now. More worlds are on the way.", {
        fontFamily: E.finale ? 'Bangers' : 'Nunito', fontStyle: E.finale ? 'normal' : '800', fontSize: E.finale ? '30px' : '20px', color: '#ffd166',
      }).setOrigin(0.5)
      btn(470, `Replay ${L.title}`, () => this.scene.start('Street', { level: L.id, checkpoint: 0 }))
      btn(820, 'Title', () => this.scene.start('Title'))
      this.input.keyboard.once('keydown-ENTER', () => { sfx(this, 'select'); this.scene.start('Title') })
    }
  }
}
