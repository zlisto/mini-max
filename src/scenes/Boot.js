import Phaser from 'phaser'

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
    const jpg = new Set(['strip_far', 'strip_ground', 'casino_far', 'casino_ground', 'prologue_bg', 'title_bg'])
    Object.keys(manifest).forEach((id) => this.load.image(id, `art/${id}.${jpg.has(id) ? 'jpg' : 'png'}`))
    this.load.audio('level_01', ['music/level_01.ogg', 'music/Level_01.mp3'])
    this.load.audio('level_02', ['music/level_02.ogg', 'music/Level_02.mp3'])
    this.load.audio('title_theme', ['music/title_theme.ogg', 'music/title_theme.mp3'])
    this.load.audio('prologue_theme', ['music/prologue_theme.ogg', 'music/prologue_theme.mp3'])
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
