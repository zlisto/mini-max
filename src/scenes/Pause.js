import Phaser from 'phaser'
import { sfx } from '../systems/sfx.js'
import { bindMuteKey } from '../systems/audio.js'

// The pause menu: Esc in a level freezes it and opens this on top. Esc (or Resume) goes back; Title Menu leaves the level.
export default class Pause extends Phaser.Scene {
  constructor() { super('Pause') }

  init(data) { this.from = data.from; this.leaving = false }

  create() {
    this.add.rectangle(640, 360, 1280, 720, 0x0b0614, 0.72)
    this.add.rectangle(640, 360, 460, 330, 0x1a0f2e, 0.96).setStrokeStyle(4, 0xff5fa2)
    this.add.text(640, 248, 'PAUSED', { fontFamily: 'Bangers', fontSize: '64px', color: '#ffd166', stroke: '#ff5fa2', strokeThickness: 6 }).setOrigin(0.5)
    const items = [
      { label: 'RESUME  (ESC)', go: () => this.resume() },
      { label: 'TITLE MENU', go: () => this.toTitle() },
    ]
    this.cursor = 0
    this.buttons = items.map((it, i) => {
      const b = this.add.text(640, 350 + i * 70, it.label, { fontFamily: 'Bangers', fontSize: '38px', color: '#fff', backgroundColor: '#2a0f4a', padding: { x: 22, y: 8 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true })
      b.on('pointerover', () => { this.cursor = i; this.refresh(); sfx(this, 'hover') })
      b.on('pointerdown', () => { sfx(this, 'select'); it.go() })
      return b
    })
    this.items = items
    this.add.text(640, 496, 'UP/DOWN or W/S choose · ENTER or SPACE select · click works too · M music', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '20px', color: '#e8dcff', align: 'center', wordWrap: { width: 420 } }).setOrigin(0.5)
    this.refresh()
    bindMuteKey(this)
    const kb = this.input.keyboard
    // held keys auto-repeat; only a fresh press counts, so holding Esc or Enter can't flicker the menu
    const fresh = (fn) => (ev) => { if (!ev.repeat) fn() }
    kb.on('keydown-ESC', fresh(() => this.resume()))
    const move = (d) => { this.cursor = (this.cursor + d + items.length) % items.length; this.refresh(); sfx(this, 'hover') }
    kb.on('keydown-UP', fresh(() => move(-1))); kb.on('keydown-W', fresh(() => move(-1)))
    kb.on('keydown-DOWN', fresh(() => move(1))); kb.on('keydown-S', fresh(() => move(1)))
    const pick = () => { sfx(this, 'select'); items[this.cursor].go() }
    kb.on('keydown-ENTER', fresh(pick)); kb.on('keydown-SPACE', fresh(pick))
  }

  refresh() { this.buttons.forEach((b, i) => b.setColor(i === this.cursor ? '#ffd166' : '#fff').setBackgroundColor(i === this.cursor ? '#5a2a8a' : '#2a0f4a').setScale(i === this.cursor ? 1.08 : 1)) }

  resume() {
    if (this.leaving) return
    this.leaving = true
    this.sound.resumeAll()
    this.scene.resume(this.from)
    this.scene.stop()
  }

  toTitle() {
    if (this.leaving) return
    this.leaving = true
    this.sound.stopAll()
    this.scene.stop(this.from)
    this.scene.start('Title')
  }
}

// Esc in a playable scene opens the pause menu
export function bindPauseKey(scene) {
  scene.input.keyboard.on('keydown-ESC', (ev) => {
    if (ev.repeat || !scene.scene.isActive() || scene.scene.isActive('Pause')) return
    scene.sound.pauseAll()
    scene.scene.pause()
    scene.scene.launch('Pause', { from: scene.scene.key })
  })
}
