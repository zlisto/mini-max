import Phaser from 'phaser'
import { setManifest, loadArt, needsFor } from '../systems/art.js'

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
    setManifest(manifest)
    // only the art every scene shares and the title's; each scene loads its own (systems/art.js)
    loadArt(this, needsFor('Title'))
    this.load.audio('voice_highnote', ['sfx/high_note.mp3']) // Lisa's blitz call
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
