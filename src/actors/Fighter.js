// A side-scrolling fighter drawn from posed cutout sprites (<prefix>_<pose>).
// Lisa's art faces right; enemy art faces left.
export const SPRITE_SCALE = 0.5

export class Fighter {
  constructor(scene, prefix, x, y, { artFacing = 1, hp = 5 } = {}) {
    this.scene = scene
    this.prefix = prefix
    this.x = x
    this.y = y
    this.artFacing = artFacing
    this.facing = artFacing
    this.hp = hp
    this.maxHp = hp
    this.state = 'free'
    this.t = 0
    this.pose = 'idle'
    this.shadow = scene.add.ellipse(x, y, prefix === 'brick' ? 170 : 120, 26, 0x000000, 0.38)
    this.sprite = scene.add.image(x, y, `${prefix}_idle`).setScale(SPRITE_SCALE)
    this.setPose('idle')
    this.bob = Math.random() * 6
  }

  setPose(pose) {
    const key = `${this.prefix}_${pose}`
    if (!this.scene.textures.exists(key)) return
    this.pose = pose
    this.sprite.setTexture(key)
    this.applyOrigin()
  }

  applyOrigin() {
    const m = this.scene.registry.get('manifest')[`${this.prefix}_${this.pose}`] || { ax: 0.5 }
    const flipped = this.facing !== this.artFacing
    this.sprite.setFlipX(flipped)
    this.sprite.setOrigin(flipped ? 1 - m.ax : m.ax, 1)
  }

  face(dir) {
    if (dir === 0 || dir === this.facing) return
    this.facing = dir
    this.applyOrigin()
  }

  tint(color) {
    if (color == null) this.sprite.clearTint()
    else this.sprite.setTint(color)
  }

  flash() {
    this.sprite.setTintFill(0xffffff)
    this.scene.time.delayedCall(70, () => this.sprite && this.sprite.active && this.sprite.clearTint())
  }

  sync(dt = 0) {
    this.bob += dt * 5
    const breathe = this.pose === 'idle' && this.state === 'free' ? Math.sin(this.bob) * 0.008 : 0
    this.sprite.setPosition(this.x, this.y)
    this.sprite.setScale(SPRITE_SCALE * (1 - breathe * 0.5), SPRITE_SCALE * (1 + breathe))
    this.sprite.setDepth(this.y)
    this.shadow.setPosition(this.x, this.y).setDepth(this.y - 1)
  }

  destroy() {
    this.sprite.destroy()
    this.shadow.destroy()
  }
}
