import Phaser from 'phaser'
import { TOUR_MUSIC } from '../data/localMusic.js'

export default class Boot extends Phaser.Scene {
  constructor() { super('Boot') }

  preload() {
    this.load.json('manifest', 'art/manifest.json')
    const bar = this.add.rectangle(640, 360, 4, 10, 0xff5fa2)
    this.load.on('progress', (p) => bar.setSize(600 * p, 10))
  }

  create() {
    const manifest = this.cache.json.get('manifest')
    this.registry.set('manifest', manifest)
    const isJpg = (id) => id.endsWith('_far') || id.endsWith('_ground') || id === 'prologue_bg' || id === 'title_bg'
    Object.keys(manifest).forEach((id) => this.load.image(id, `art/${id}.${isJpg(id) ? 'jpg' : 'png'}`))
    // each world's tour track (src/data/localMusic.js) replaces its original one
    const local = TOUR_MUSIC
    const audio = this.load.audio.bind(this.load)
    this.load.audio = (key, urls) => audio(key, local[key] ? [`music/tour/${local[key]}`] : urls)
    this.load.audio('level_01', ['music/level_01.ogg', 'music/Level_01.mp3'])
    this.load.audio('level_02', ['music/level_02.ogg', 'music/Level_02.mp3'])
    this.load.audio('level_03', ['music/level_03.ogg', 'music/level_03.mp3'])
    this.load.audio('level_04', ['music/level_04.ogg', 'music/level_04.mp3'])
    this.load.audio('level_05', ['music/level_05.ogg', 'music/level_05.mp3'])
    this.load.audio('level_06', ['music/level_06.ogg', 'music/level_06.mp3'])
    this.load.audio('level_07', ['music/level_07.ogg', 'music/level_07.mp3'])
    this.load.audio('level_08', ['music/level_08.ogg', 'music/level_08.mp3'])
    this.load.audio('level_09', ['music/level_09.ogg', 'music/level_09.mp3'])
    this.load.audio('level_10', ['music/level_10.ogg', 'music/level_10.mp3'])
    this.load.audio('level_11', ['music/level_11.ogg', 'music/level_11.mp3'])
    this.load.audio('level_12', ['music/level_12.ogg', 'music/level_12.mp3'])
    this.load.audio('ending_theme', ['music/level_12.ogg', 'music/level_12.mp3']) // the ending's own slot; the deploy reuses the finale track
    this.load.audio('voice_highnote', ['sfx/high_note.mp3']) // Lisa's blitz call
    this.load.audio('title_theme', ['music/title_theme.ogg', 'music/title_theme.mp3'])
    this.load.audio('prologue_theme', ['music/prologue_theme.ogg', 'music/prologue_theme.mp3'])
    this.load.audio = audio
    this.makePageTexture()
    this.load.once('complete', async () => {
      try { await Promise.all([document.fonts.load('40px Bangers'), document.fonts.load('800 20px Nunito')]) } catch { /* offline */ }
      const q = new URLSearchParams(location.search)
      const scene = q.get('scene')
      if (scene) this.scene.start(scene, { level: q.get('level') || 'w1', checkpoint: Number(q.get('cp') || 0) })
      else this.scene.start('Title')
    })
    this.load.start()
  }

  // a torn setlist page, drawn in code
  makePageTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false })
    g.fillStyle(0xfff6e0, 1).fillRect(0, 0, 60, 76)
    g.fillStyle(0xff5fa2, 1).fillRect(0, 0, 60, 8)
    g.lineStyle(2, 0x6b5b8a, 0.8)
    for (let i = 0; i < 6; i++) g.lineBetween(8, 18 + i * 9, 44 + (i % 3) * 5, 18 + i * 9)
    g.fillStyle(0x0b0614, 1).fillTriangle(60, 60, 60, 76, 48, 76)
    g.generateTexture('setlist_page', 60, 76)
    g.destroy()
  }
}
