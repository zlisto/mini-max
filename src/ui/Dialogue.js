import Phaser from 'phaser'
import { sfx, VOICE } from '../systems/sfx.js'

const WHO = {
  lisa: { name: 'LISA', key: 'lisa_portrait', side: 'left', color: '#ff5fa2' },
  tempo: { name: 'TEMPO', key: 'tempo_sprite', side: 'left', color: '#ffd166' },
  zero: { name: 'IMPRESARIO ZERO', key: 'zero_portrait', side: 'right', color: '#e8e8e8' },
  juno: { name: 'JUNO', key: 'juno_portrait', side: 'right', color: '#5ce1d6' },
  sadie: { name: 'SADIE POINT', key: 'sadie_portrait', side: 'right', color: '#f4f4ff' },
  brick: { name: 'BRICK', key: 'brick_idle', side: 'right', color: '#ff9a5c' },
  grunt: { name: 'GRUNT', key: 'grunt_idle', side: 'right', color: '#cccccc' },
  penny: { name: 'PENNY ANTE', key: 'penny_portrait', side: 'right', color: '#ffd166' },
  lou: { name: 'LUCKY LOU', key: 'lou_portrait', side: 'right', color: '#ff6b7a' },
  echo: { name: 'ECHO', key: 'echo_portrait', side: 'right', color: '#e8dcff' },
  mira: { name: 'MIRA GLASS', key: 'mira_portrait', side: 'right', color: '#c79bff' },
  flicker: { name: 'FLICKER', key: 'flicker_portrait', side: 'right', color: '#ffd166' },
  vox: { name: 'VOX STATIC', key: 'vox_portrait', side: 'right', color: '#ff9ad5' },
  bluster: { name: 'BLUSTER', key: 'bluster_portrait', side: 'right', color: '#ffd166' },
  chains: { name: 'MR. CHAINSWORTH', key: 'chains_portrait', side: 'right', color: '#ff8a8a' },
  hank: { name: 'HANK HOLDOUT', key: 'hank_portrait', side: 'right', color: '#e8c08a' },
  ledger: { name: 'LADY LEDGER', key: 'ledger_portrait', side: 'right', color: '#7dffb0' },
  tatum: { name: 'TATIANA TAT', key: 'tatum_portrait', side: 'right', color: '#5ce1d6' },
  grimes: { name: 'CHAMP GRIMES', key: 'grimes_portrait', side: 'right', color: '#c9b8ec' },
  ham: { name: 'HAMISH HAM', key: 'ham_portrait', side: 'right', color: '#e8c08a' },
  redline: { name: 'REDLINE', key: 'redline_portrait', side: 'right', color: '#ff6b7a' },
  dealer: { name: 'DEALER', key: 'dealer_idle', side: 'right', color: '#ff9a5c' },
}

// Bottom (or top) dialogue box with portrait and typewriter text. Lines: [{who, text}] (who omitted = caption).
export class Dialogue {
  constructor(scene, { top = false } = {}) {
    this.scene = scene
    this.active = false
    const y = top ? 14 : 572
    this.y = y
    this.c = scene.add.container(0, 0).setScrollFactor(0).setDepth(5000).setVisible(false)
    this.box = scene.add.graphics()
    this.box.fillStyle(0x0d0820, 0.92).fillRoundedRect(20, y, 1240, 134, 14)
    this.box.lineStyle(3, 0xff5fa2, 1).strokeRoundedRect(20, y, 1240, 134, 14)
    this.portrait = scene.add.image(0, 0, 'tempo_sprite')
    this.name = scene.add.text(0, y + 12, '', { fontFamily: 'Bangers', fontSize: '28px', color: '#fff', letterSpacing: 1 })
    this.text = scene.add.text(0, y + 46, '', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '25px', color: '#ffffff', wordWrap: { width: 1000 }, lineSpacing: 4,
    })
    this.hint = scene.add.text(1240, y + 108, '▼', { fontFamily: 'Nunito', fontSize: '20px', color: '#ff5fa2' }).setOrigin(1, 0)
    this.c.add([this.box, this.portrait, this.name, this.text, this.hint])
    scene.tweens.add({ targets: this.hint, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 })
    this._onPointer = () => this.active && this.advance()
    scene.input.on('pointerdown', this._onPointer)
  }

  play(lines, onDone) {
    this.lines = lines.slice()
    this.onDone = onDone
    this.active = true
    this.c.setVisible(true)
    this.cooldown = 0.25
    this.next()
  }

  next() {
    const line = this.lines.shift()
    if (!line) { this.close(); return }
    if (line.do) line.do()
    const base = WHO[line.who]
    const skin = line.who === 'lisa' && this.scene.L && this.scene.L.skin
    const who = skin ? { ...base, key: `${skin}_portrait` } : base
    this.voice = VOICE[line.who] ?? 0.9 // 0 = silent (the mime)
    const hasP = who && this.scene.textures.exists(who.key)
    this.portrait.setVisible(!!hasP)
    let tx = 44
    if (hasP) {
      this.portrait.setTexture(who.key)
      const s = 118 / Math.max(this.portrait.width, this.portrait.height)
      this.portrait.setScale(s).setOrigin(0.5, 0.5)
      if (who.side === 'left') { this.portrait.setPosition(90, this.y + 67); tx = 168 }
      else { this.portrait.setPosition(1190, this.y + 67); tx = 44 }
      this.portrait.setFlipX(false)
    }
    this.name.setText(who ? who.name : '').setColor(who ? who.color : '#fff').setX(tx)
    this.text.setX(tx).setY(who ? this.y + 46 : this.y + 40).setFontStyle(who ? '800' : 'italic 800')
    this.full = line.text
    this.shown = 0
    this.text.setText('')
  }

  advance() {
    if (this.cooldown > 0) return
    this.cooldown = 0.12
    if (this.shown < this.full.length) { this.shown = this.full.length; this.text.setText(this.full); return }
    sfx(this.scene, 'advance')
    this.next()
  }

  close() {
    this.active = false
    this.c.setVisible(false)
    const cb = this.onDone
    this.onDone = null
    if (cb) this.scene.time.delayedCall(60, cb)
  }

  update(dt) {
    if (!this.active) return
    this.cooldown -= dt
    if (this.shown < this.full.length) {
      const before = Math.floor(this.shown)
      this.shown = Math.min(this.full.length, this.shown + dt * 70)
      const now = Math.floor(this.shown)
      this.text.setText(this.full.slice(0, now))
      // a blip every third letter, pitched to the speaker
      if (Math.floor(now / 3) > Math.floor(before / 3) && this.voice > 0 && /\S/.test(this.full[now - 1] || '')) sfx(this.scene, 'blip', this.voice)
    }
    const p = this.scene.presses
    if (p && p.take('Space', 'Enter')) this.advance() // not the attack keys: mashing J mid-fight mustn't skip a lesson
  }

  destroy() { this.scene.input.off('pointerdown', this._onPointer) }
}
