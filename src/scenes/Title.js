import Phaser from 'phaser'
import { loadArt, needsFor } from '../systems/art.js'
import { playMusic, bindMuteKey } from '../systems/audio.js'
import { sfx } from '../systems/sfx.js'
import { loadSave, writeSave } from '../systems/save.js'
import { LEVELS } from '../data/levels.js'

export default class Title extends Phaser.Scene {
  constructor() { super('Title') }

  preload() { loadArt(this, needsFor('Title')) }

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
    const start = this.add.text(640, window.__touch ? 404 : 430, label, { fontFamily: 'Bangers', fontSize: '44px', color: '#fff' }).setOrigin(0.5)
    this.tweens.add({ targets: start, alpha: 0.3, duration: 600, yoyo: true, repeat: -1 })
    start.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.input.keyboard.emit('keydown-ENTER', { repeat: false }))

    // Level select, built from the level data: pick a world (←/→ or click), then where to start (1/2/3 or click)
    const go = (level, checkpoint) => () => { writeSave({ eliteFight: null, bossPhase: 0 }); this.scene.start('Street', { level, checkpoint }) }
    const worlds = [{ id: 'pro', label: 'Prologue', entries: [['Prologue', () => this.scene.start('Prologue')]] }]
    Object.values(LEVELS).forEach((L, n) => {
      const idx = (k) => L.triggers.findIndex((t) => t.standoff === k)
      worlds.push({ id: L.id, label: `W${n + 1}`, entries: [[L.title, go(L.id, 0)], [L.elite.label, go(L.id, idx('elite'))], [L.boss.label, go(L.id, idx('boss'))]] })
    })
    worlds.push({ id: 'end', label: 'Ending', entries: [['Ending', () => this.scene.start('Ending')]] })
    let sel = Math.max(0, worlds.findIndex((w) => w.id === save.level))
    this.add.text(640, window.__touch ? 456 : 494, 'LEVEL SELECT   ←/→ world   1/2/3 start', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '16px', color: '#b9a6e0' }).setOrigin(0.5)
    const perRow = window.__touch ? Math.ceil(worlds.length / 2) : worlds.length
    const tabs = worlds.map((w, i) => {
      const row = Math.floor(i / perRow), col = i % perRow
      const x = 640 + (col - (perRow - 1) / 2) * Math.min(window.__touch ? 172 : 96, 1180 / perRow)
      const b = this.add.text(x, window.__touch ? 500 + row * 60 : 526, w.label, { fontFamily: 'Nunito', fontStyle: '800', fontSize: window.__touch ? '26px' : '17px', color: '#fff', backgroundColor: '#2a0f4acc', padding: { x: window.__touch ? 16 : 9, y: window.__touch ? 13 : 5 } })
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
        const b = this.add.text(x, window.__touch ? 628 : 578, window.__touch ? label : `${k + 1}  ${label}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '19px', color: '#fff', backgroundColor: '#2a0f4acc', padding: { x: 14, y: window.__touch ? 14 : 7 } })
          .setOrigin(0.5).setInteractive({ useHandCursor: true })
        b.on('pointerdown', () => { if (this.leaving) return; this.leaving = true; sfx(this, 'select'); fn() })
        b.on('pointerover', () => { b.setColor('#ffd166'); sfx(this, 'hover') })
        b.on('pointerout', () => b.setColor('#fff'))
        entryBtns.push(b)
      })
    }
    paint()
    this.input.keyboard.on('keydown-LEFT', () => { sel = (sel - 1 + worlds.length) % worlds.length; sfx(this, 'hover'); paint() })
    this.input.keyboard.on('keydown-RIGHT', () => { sel = (sel + 1) % worlds.length; sfx(this, 'hover'); paint() })
    // a held key (say Enter from the pause menu) auto-repeats into the Title; only a fresh press starts anything
    this.leaving = false
    ;['ONE', 'TWO', 'THREE'].forEach((K, k) => this.input.keyboard.on(`keydown-${K}`, (ev) => { const e = worlds[sel].entries[k]; if (e && !ev.repeat && !this.leaving) { this.leaving = true; sfx(this, 'select'); e[1]() } }))
    this.input.keyboard.on('keydown-ENTER', (ev) => {
      if (ev.repeat || this.leaving) return
      this.leaving = true
      sfx(this, 'select')
      if (canContinue) this.scene.start('Street', { level: save.level, checkpoint: save.checkpoint || 0, bossPhase: save.bossPhase || 0 })
      else this.scene.start('Prologue')
    })

    this.add.text(640, 690, 'Based on A Course in Game Theory by Martin J. Osborne & Ariel Rubinstein (MIT Press, 1994). A fan-made learning game.', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#b9a6e0', align: 'center', wordWrap: { width: 1200 },
    }).setOrigin(0.5)
    this.add.text(640, 640, 'Move: arrows / WASD    Punch: J    Kick: K    Throw: L    Dash: →→    Blitz: →→J    Talk: Space    Music: M    Pause: Esc', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5)
  }
}
