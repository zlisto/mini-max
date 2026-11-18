import Phaser from 'phaser'
import { playMusic, bindMuteKey } from '../systems/audio.js'
import { sfx } from '../systems/sfx.js'
import { loadSave } from '../systems/save.js'
import { LEVELS } from '../data/levels.js'

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

    // Enter continues a saved game; a fresh player starts with the prologue
    const save = loadSave()
    const canContinue = save.scene === 'Street' && LEVELS[save.level] && (save.level !== 'w1' || save.checkpoint > 0)
    const label = canContinue ? `PRESS ENTER: CONTINUE ${LEVELS[save.level].title}` : 'PRESS ENTER'
    const start = this.add.text(640, 430, label, { fontFamily: 'Bangers', fontSize: '44px', color: '#fff' }).setOrigin(0.5)
    this.tweens.add({ targets: start, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 })

    // Level select, built from the level data: pick a world (←/→ or click), then where to start (1/2/3 or click)
    const go = (level, checkpoint) => () => this.scene.start('Street', { level, checkpoint })
    const worlds = [{ id: 'pro', label: 'Prologue', entries: [['Prologue', () => this.scene.start('Prologue')]] }]
    Object.values(LEVELS).forEach((L, n) => {
      const idx = (k) => L.triggers.findIndex((t) => t.standoff === k)
      worlds.push({ id: L.id, label: `W${n + 1}`, entries: [[L.title, go(L.id, 0)], [L.elite.label, go(L.id, idx('elite'))], [L.boss.label, go(L.id, idx('boss'))]] })
    })
    let sel = Math.max(0, worlds.findIndex((w) => w.id === save.level))
    this.add.text(640, 494, 'LEVEL SELECT   ←/→ world   1/2/3 start', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '16px', color: '#b9a6e0' }).setOrigin(0.5)
    const tabs = worlds.map((w, i) => {
      const x = 640 + (i - (worlds.length - 1) / 2) * Math.min(96, 1180 / worlds.length)
      const b = this.add.text(x, 526, w.label, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '17px', color: '#fff', backgroundColor: '#2a0f4acc', padding: { x: 9, y: 5 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true })
      b.on('pointerdown', () => { sel = i; sfx(this, 'hover'); paint() })
      return b
    })
    const entryBtns = []
    const paint = () => {
      tabs.forEach((b, i) => b.setColor(i === sel ? '#ffd166' : '#fff').setBackgroundColor(i === sel ? '#5a2a8acc' : '#2a0f4acc'))
      entryBtns.forEach((b) => b.destroy()); entryBtns.length = 0
      const E = worlds[sel].entries
      E.forEach(([label, fn], k) => {
        const x = 640 + (k - (E.length - 1) / 2) * 300
        const b = this.add.text(x, 578, `${k + 1}  ${label}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '19px', color: '#fff', backgroundColor: '#2a0f4acc', padding: { x: 12, y: 7 } })
          .setOrigin(0.5).setInteractive({ useHandCursor: true })
        b.on('pointerdown', () => { sfx(this, 'select'); fn() })
        b.on('pointerover', () => { b.setColor('#ffd166'); sfx(this, 'hover') })
        b.on('pointerout', () => b.setColor('#fff'))
        entryBtns.push(b)
      })
    }
    paint()
    this.input.keyboard.on('keydown-LEFT', () => { sel = (sel - 1 + worlds.length) % worlds.length; sfx(this, 'hover'); paint() })
    this.input.keyboard.on('keydown-RIGHT', () => { sel = (sel + 1) % worlds.length; sfx(this, 'hover'); paint() })
    ;['ONE', 'TWO', 'THREE'].forEach((K, k) => this.input.keyboard.on(`keydown-${K}`, () => { const e = worlds[sel].entries[k]; if (e) { sfx(this, 'select'); e[1]() } }))
    this.input.keyboard.once('keydown-ENTER', () => {
      sfx(this, 'select')
      if (canContinue) this.scene.start('Street', { level: save.level, checkpoint: save.checkpoint || 0, bossPhase: save.bossPhase || 0 })
      else this.scene.start('Prologue')
    })

    this.add.text(640, 690, 'Based on A Course in Game Theory by Martin J. Osborne & Ariel Rubinstein (MIT Press, 1994). A fan-made learning game.', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#b9a6e0', align: 'center', wordWrap: { width: 1200 },
    }).setOrigin(0.5)
    this.add.text(640, 640, 'Move: arrows / WASD    Punch: J    Kick: K    Throw: L    Talk: Space    Music: M', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5)
  }
}
