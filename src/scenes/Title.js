import Phaser from 'phaser'
import { playMusic, bindMuteKey } from '../systems/audio.js'
import { sfx } from '../systems/sfx.js'

export default class Title extends Phaser.Scene {
  constructor() { super('Title') }

  create() {
    playMusic(this, 'title_theme', 0.5)
    bindMuteKey(this)
    this.add.image(640, 360, 'title_bg').setDisplaySize(1280, 720)
    this.add.rectangle(640, 360, 1280, 720, 0x0b0614, 0.55)
    const t = this.add.text(640, 190, 'MINI MAX', {
      fontFamily: 'Bangers', fontSize: '150px', color: '#ffffff', stroke: '#ff5fa2', strokeThickness: 10,
      shadow: { offsetX: 6, offsetY: 6, color: '#2a0f4a', fill: true, stroke: true },
    }).setOrigin(0.5)
    this.tweens.add({ targets: t, scale: 1.03, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    this.add.text(640, 290, 'starring Lisa "Mini" Maxobal', { fontFamily: 'Bangers', fontSize: '38px', color: '#ffd166' }).setOrigin(0.5)
    this.add.text(640, 334, 'Every fight is a game. Learn to play it.', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '24px', color: '#e8dcff' }).setOrigin(0.5)

    const start = this.add.text(640, 430, 'PRESS ENTER', { fontFamily: 'Bangers', fontSize: '44px', color: '#fff' }).setOrigin(0.5)
    this.tweens.add({ targets: start, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 })

    const menu = [
      ['Prologue', () => this.scene.start('Prologue')],
      ['Neon Strip', () => this.scene.start('Street', { checkpoint: 0 })],
      ['Brick standoff', () => this.scene.start('Street', { checkpoint: 2 })],
      ['Sadie boss', () => this.scene.start('Street', { checkpoint: 3 })],
    ]
    this.add.text(640, 512, 'LEVEL SELECT', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '16px', color: '#b9a6e0' }).setOrigin(0.5)
    menu.forEach(([label, go], i) => {
      const x = 640 + (i - 1.5) * 230
      const b = this.add.text(x, 548, `${i + 1}  ${label}`, {
        fontFamily: 'Nunito', fontStyle: '800', fontSize: '20px', color: '#fff', backgroundColor: '#2a0f4acc', padding: { x: 12, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
      b.on('pointerdown', () => { sfx(this, 'select'); go() })
      b.on('pointerover', () => { b.setColor('#ffd166'); sfx(this, 'hover') })
      b.on('pointerout', () => b.setColor('#fff'))
      this.input.keyboard.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR'][i]}`, () => { sfx(this, 'select'); go() })
    })
    this.input.keyboard.once('keydown-ENTER', () => { sfx(this, 'select'); this.scene.start('Prologue') })

    this.add.text(640, 690, 'Based on A Course in Game Theory by Martin J. Osborne & Ariel Rubinstein (MIT Press, 1994). A fan-made learning game.', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#b9a6e0', align: 'center', wordWrap: { width: 1200 },
    }).setOrigin(0.5)
    this.add.text(640, 640, 'Move: arrows / WASD    Strike: J    Guard: K (hold)    Grab: L    Talk: Space    Music: M', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5)
  }
}
