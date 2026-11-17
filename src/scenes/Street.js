import Phaser from 'phaser'
import { Fighter } from '../actors/Fighter.js'
import { Dialogue } from '../ui/Dialogue.js'
import { Standoff } from '../ui/Standoff.js'
import { MixStandoff } from '../ui/MixStandoff.js'
import { BEATS } from '../data/games.js'
import { LEVELS } from '../data/levels.js'
import { loadSave, writeSave } from '../systems/save.js'
import { trackPresses } from '../systems/presses.js'
import { playMusic, bindMuteKey, isMuted } from '../systems/audio.js'
import { sfx } from '../systems/sfx.js'

const LANE_TOP = 520
const LANE_BOT = 660
const DEPTH_TOL = 30
const TINT = { strike: 0xff7a7a, guard: 0x8fb4ff, grab: 0xffe27a }
const WALK_CYCLE = ['walk', 'walkpass', 'walk', 'walkb']
const MOVE_COLOR = { strike: 0xff5fa2, guard: 0x5ce1d6, grab: 0xffd166 }
const counterOf = (m) => Object.keys(BEATS).find((k) => BEATS[k] === m)

// One street level, driven by LEVELS[id]: brawl waves, an elite standoff, a boss with three phases.
export default class Street extends Phaser.Scene {
  constructor() { super('Street') }

  init(data) {
    const save = loadSave()
    this.levelId = data.level || save.level || 'w1'
    if (!LEVELS[this.levelId]) this.levelId = 'w1'
    this.L = LEVELS[this.levelId]
    this.W = this.L.width
    const sameLevel = (save.level || 'w1') === this.levelId
    this.checkpoint = data.checkpoint ?? (sameLevel ? save.checkpoint : 0) ?? 0
    const bossIdx = this.L.triggers.findIndex((t) => t.standoff === 'boss')
    this.bossPhase = this.checkpoint === bossIdx ? (data.bossPhase ?? (sameLevel ? save.bossPhase : 0) ?? 0) : 0
  }

  create() {
    writeSave({ scene: 'Street', level: this.levelId, checkpoint: this.checkpoint, bossPhase: this.bossPhase })
    playMusic(this, this.L.music)
    bindMuteKey(this)
    this.cameras.main.fadeIn(400)
    this.buildWorld()
    this.enemies = []
    this.lisa = new Fighter(this, 'lisa', 200, 590, { hp: 20 })
    Object.assign(this.lisa, { st: 'free', t: 0, habits: [], combo: 0, lastStrikeEnd: -9, invuln: 0 })
    this.tempo = this.add.image(120, 300, 'tempo_sprite').setScale(0.3).setDepth(2900)
    this.dlg = new Dialogue(this, { top: true })
    this.buildHud()
    this.caption = this.buildCaption()
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,K,X')
    this.presses = trackPresses(this)
    this.cam = this.cameras.main
    this.cam.setBounds(0, 0, this.W, 720)
    this.locked = null
    this.wave = null
    this.mode = 'brawl' // brawl | standoff | cutscene | dead
    this.done = new Set()
    this.elapsed = 0
    // Phaser reuses this scene object on restart: clear anything left from the last run
    this.so = null
    this.boss = null
    this.readerTalked = false

    const cp = this.L.triggers[this.checkpoint]
    this.L.triggers.slice(0, this.checkpoint).forEach((t) => this.done.add(t.id))
    if (this.checkpoint > 0) this.lisa.x = cp.x - 260
    this.cam.scrollX = Phaser.Math.Clamp(this.lisa.x - 400, 0, this.W - 1280)
    if (this.checkpoint === 0) this.showBanner()
    if (this.checkpoint === 0) {
      this.mode = 'cutscene'
      this.time.delayedCall(1700, () => this.dlg.play(this.cued(this.L.intro), () => { this.mode = 'brawl' }))
    }
    this.goArrow = this.add.text(1180, 380, 'GO ▶', { fontFamily: 'Bangers', fontSize: '54px', color: '#ffd166', stroke: '#000', strokeThickness: 6 })
      .setScrollFactor(0).setDepth(5000).setVisible(false)
    this.tweens.add({ targets: this.goArrow, x: 1200, duration: 400, yoyo: true, repeat: -1 })
  }

  showBanner() {
    const t = this.add.text(640, 250, this.L.title, { fontFamily: 'Bangers', fontSize: '84px', color: '#ffd166', stroke: '#2a0f4a', strokeThickness: 10 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(6000).setAlpha(0)
    const s = this.add.text(640, 318, this.L.chapter, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '24px', color: '#ffffff', stroke: '#000', strokeThickness: 5 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(6000).setAlpha(0)
    this.tweens.add({ targets: [t, s], alpha: 1, duration: 300, hold: 900, yoyo: true, onComplete: () => { t.destroy(); s.destroy() } })
  }

  // ---------------------------------------------------------------- world
  buildWorld() {
    const a = this.L.art
    this.add.image(0, 0, a.far).setOrigin(0, 0).setScrollFactor(0.12).setDepth(-1000)
    let x = 0
    for (let i = 0; i < 4; i++) {
      const m = this.add.image(x, 470, a.mids[i % a.mids.length]).setOrigin(0, 1).setScale(0.86).setScrollFactor(0.45).setDepth(-900)
      x += m.displayWidth - 2
    }
    this.add.tileSprite(0, 452, this.W, 270, a.ground).setOrigin(0, 0).setDepth(-800)
    this.add.image(a.stage.x, 520, a.stage.key).setOrigin(0.5, 1).setScale(a.stage.scale).setDepth(-700)
    a.fg.forEach(([k, fx, s]) => this.add.image(fx, 745, k).setOrigin(0.5, 1).setScale(s).setScrollFactor(1.25).setDepth(3000))
  }

  buildHud() {
    const d = 5000
    this.habitBars = null // per level (the scene object is reused between levels)
    this.add.rectangle(0, 676, 1280, 44, 0x0b0614, 0.75).setOrigin(0, 0).setScrollFactor(0).setDepth(d)
    this.add.image(28, 698, 'lisa_portrait').setDisplaySize(40, 40).setScrollFactor(0).setDepth(d)
    this.add.text(56, 686, 'LISA', { fontFamily: 'Bangers', fontSize: '24px', color: '#ff5fa2' }).setScrollFactor(0).setDepth(d)
    this.add.rectangle(112, 698, 260, 16, 0x3a1a5a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(d)
    this.hpBar = this.add.rectangle(112, 698, 260, 16, 0xff5fa2).setOrigin(0, 0.5).setScrollFactor(0).setDepth(d)
    const legendX = this.L.habitMeter ? 735 : 640
    this.legend = this.add.text(legendX, 698, 'Strike ▶ Grab   ·   Grab ▶ Guard   ·   Guard ▶ Strike', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '16px', color: '#e8dcff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d)
    if (this.L.habitMeter) {
      // the MIX meter: Lisa's last eight moves, as the dealers see them
      this.mixParts = [this.add.text(388, 698, 'MIX', { fontFamily: 'Bangers', fontSize: '22px', color: '#ffd166' }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(d)]
      this.habitBars = ['strike', 'guard', 'grab'].map((m, i) => {
        const x = 428 + i * 32
        const back = this.add.rectangle(x, 714, 28, 34, 0x2a0f4a).setOrigin(0, 1).setScrollFactor(0).setDepth(d)
        const bar = this.add.rectangle(x, 714, 28, 0, MOVE_COLOR[m]).setOrigin(0, 1).setScrollFactor(0).setDepth(d)
        const lab = this.add.text(x + 14, 697, m === 'strike' ? 'S' : m === 'guard' ? 'G' : 'Gr', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '13px', color: '#fff', stroke: '#000', strokeThickness: 3 })
          .setOrigin(0.5).setScrollFactor(0).setDepth(d + 1)
        this.mixParts.push(back, bar, lab)
        return { m, bar }
      })
    }
    this.muteLabel = this.add.text(1252, 652, '', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#b9a6e0' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(d)
    this.foeLabel = this.add.text(1252, 686, '', { fontFamily: 'Bangers', fontSize: '24px', color: '#ff9a5c' }).setOrigin(1, 0).setScrollFactor(0).setDepth(d)
    this.foeBack = this.add.rectangle(1000, 698, 160, 16, 0x3a1a5a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(d).setVisible(false)
    this.foeBar = this.add.rectangle(1000, 698, 160, 16, 0xff9a5c).setOrigin(0, 0.5).setScrollFactor(0).setDepth(d).setVisible(false)
  }

  // Tempo's caption: a box that grows to fit its text; y defaults to the top-right slot
  buildCaption() {
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(4300).setVisible(false)
    const g = this.add.graphics()
    const icon = this.add.image(606, 0, 'tempo_sprite').setScale(0.32)
    const t = this.add.text(650, 0, '', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '18px', color: '#fff', wordWrap: { width: 590 }, lineSpacing: 2 })
    c.add([g, icon, t])
    return {
      show: (s, y = 16) => {
        t.setText(s).setY(y + 12)
        const h = Math.max(70, t.height + 24)
        g.clear().fillStyle(0x0d0820, 0.92).fillRoundedRect(560, y, 696, h, 12).lineStyle(2, 0xffd166, 1).strokeRoundedRect(560, y, 696, h, 12)
        icon.setY(y + h / 2)
        c.setVisible(true).setAlpha(1)
      },
      hide: () => c.setVisible(false),
    }
  }

  // ---------------------------------------------------------------- fx
  floatText(x, y, s, color = '#fff', depth = 4100) {
    const t = this.add.text(x, y, s, { fontFamily: 'Bangers', fontSize: '40px', color, stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(depth)
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 900, ease: 'Cubic.out', onComplete: () => t.destroy() })
  }

  spark(x, y, color = 0xffffff) {
    const s = this.add.star(x, y, 8, 10, 34, color).setDepth(4000)
    this.tweens.add({ targets: s, scale: 1.8, alpha: 0, angle: 45, duration: 220, onComplete: () => s.destroy() })
  }

  // ---------------------------------------------------------------- enemies
  spawn(kind, x, y) {
    const prefix = kind === 'dealer' ? 'dealer' : 'grunt'
    const e = new Fighter(this, prefix, x, y, { hp: kind === 'grunt' ? 4 : 5 })
    Object.assign(e, { kind, st: 'free', t: 0, wait: 0.6 + Math.random() * 0.8, laneOff: Phaser.Math.Between(kind === 'dealer' ? -26 : -10, kind === 'dealer' ? 26 : 10) })
    if (kind === 'reader') {
      e.shadow.setFillStyle(0xa25cff, 0.7)
      e.tag = this.add.text(x, y - 270, 'READER', { fontFamily: 'Bangers', fontSize: '22px', color: '#c79bff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5)
    }
    if (kind === 'dealer') e.shadow.setFillStyle(0xa25cff, 0.55)
    e.face(x > this.lisa.x ? -1 : 1)
    this.enemies.push(e)
    return e
  }

  alive() { return this.enemies.filter((e) => e.st !== 'dead') }

  inReach(a, b, reach) {
    const dx = (b.x - a.x) * a.facing
    return dx > 0 && dx < reach && Math.abs(b.y - a.y) < DEPTH_TOL
  }

  hurtEnemy(e, dmg, knock = 30, down = false) {
    e.hp -= dmg
    sfx(this, dmg >= 2 ? 'hitHeavy' : 'hit')
    e.flash()
    e.tint(null)
    this.floatText(e.x, e.y - 260, `-${dmg}`, '#ffd166')
    this.spark(e.x - 20 * this.lisa.facing, e.y - 170)
    e.x = Phaser.Math.Clamp(e.x + knock * this.lisa.facing, 20, this.W - 20)
    if (e.hp <= 0 || down) {
      e.st = 'down'; e.t = 0; e.setPose('hurt')
      this.time.delayedCall(260, () => sfx(this, 'thud'))
      this.tweens.add({ targets: e.sprite, angle: -80 * this.lisa.facing, duration: 250 })
    } else {
      e.st = 'hurt'; e.t = 0; e.setPose('hurt')
    }
  }

  hurtLisa(dmg, down = false, from = null) {
    const L = this.lisa
    if (L.invuln > 0 || L.st === 'down') return
    L.hp -= dmg
    sfx(this, down ? 'hitHeavy' : 'hurt')
    L.flash()
    this.floatText(L.x, L.y - 250, `-${dmg}`, '#ff6b7a')
    this.spark(L.x, L.y - 160, 0xff6b7a)
    this.cam.shake(120, 0.005)
    if (from) L.x += 40 * Math.sign(L.x - from.x || 1)
    L.st = down ? 'down' : 'hurt'
    L.t = 0
    L.setPose('hurt')
    L.tint(null)
    if (L.hp <= 0) this.die()
  }

  // ---------------------------------------------------------------- lisa
  updateLisa(dt) {
    const L = this.lisa, k = this.keys
    L.t += dt
    L.invuln = Math.max(0, L.invuln - dt)
    const p = this.presses
    const pressStrike = p.take('KeyJ', 'KeyZ'), pressGrab = p.take('KeyL', 'KeyC')
    const tapGuard = p.take('KeyK', 'KeyX')
    const holdGuard = k.K.isDown || k.X.isDown || tapGuard
    if (L.st === 'free') {
      let vx = 0, vy = 0
      if (k.LEFT.isDown || k.A.isDown) vx -= 1
      if (k.RIGHT.isDown || k.D.isDown) vx += 1
      if (k.UP.isDown || k.W.isDown) vy -= 1
      if (k.DOWN.isDown || k.S.isDown) vy += 1
      L.x += vx * 300 * dt
      L.y = Phaser.Math.Clamp(L.y + vy * 170 * dt, LANE_TOP, LANE_BOT)
      L.face(vx)
      const minX = this.locked != null ? this.locked + 90 : 40
      const maxX = this.locked != null ? this.locked + 1190 : this.W - 60
      L.x = Phaser.Math.Clamp(L.x, minX, maxX)
      const moving = vx || vy
      if (moving) {
        // 4-frame walk cycle: stride, left knee up, stride, right knee up (~9 frames per second)
        L.walkT = (L.walkT || 0) + dt
        const frame = WALK_CYCLE[Math.floor(L.walkT * 9) % WALK_CYCLE.length]
        if (L.pose !== frame) L.setPose(frame)
      } else {
        L.walkT = 0
        if (L.pose !== 'idle') L.setPose('idle')
      }
      if (pressStrike) {
        L.combo = this.elapsed - L.lastStrikeEnd < 0.35 ? (L.combo % 3) + 1 : 1
        this.act('strike')
      } else if (pressGrab) this.act('grab')
      else if (holdGuard) this.act('guard')
    } else if (L.st === 'strike') {
      if (!L.hitDone && L.t > 0.08) { L.hitDone = true; this.lisaStrike() }
      if (L.t > 0.28) { L.lastStrikeEnd = this.elapsed; this.toFree() }
    } else if (L.st === 'grab') {
      if (!L.hitDone && L.t > 0.14) { L.hitDone = true; this.lisaGrab() }
      if (L.t > 0.45) this.toFree()
    } else if (L.st === 'guard') {
      if (!holdGuard && L.t > 0.15) this.toFree()
    } else if (L.st === 'recoil' && L.t > 0.3) this.toFree()
    else if (L.st === 'hurt' && L.t > 0.35) this.toFree()
    else if (L.st === 'down' && L.t > 1.0) { L.invuln = 0.8; this.toFree() }
  }

  act(move) {
    const L = this.lisa
    L.st = move; L.t = 0; L.hitDone = false
    L.setPose(move)
    L.habits.push(move)
    if (L.habits.length > 8) L.habits.shift()
    if (move === 'strike') { L.x += 14 * L.facing; sfx(this, 'whoosh') }
    if (move === 'grab') sfx(this, 'whooshBig')
  }

  toFree() { const L = this.lisa; L.st = 'free'; L.t = 0; L.setPose('idle') }

  lisaStrike() {
    const L = this.lisa
    let hit = false
    for (const e of this.alive()) {
      if (e.st === 'down' || !this.inReach(L, e, 135)) continue
      if (e.st === 'guard' && e.facing === -L.facing) {
        // Guard beats Strike
        this.spark(e.x - 30 * L.facing, e.y - 180, 0x8fb4ff)
        this.floatText(e.x, e.y - 270, 'BLOCKED', '#8fb4ff')
        sfx(this, 'block')
        L.st = 'recoil'; L.t = 0; L.setPose('hurt')
        if (e.kind === 'dealer') { e.st = 'strike'; e.t = 0.25; e.hitDone = false; e.tint(TINT.strike) } // parry, then riposte (no push-back)
        else L.x -= 30 * L.facing
        return
      }
      const strong = L.combo === 3
      this.hurtEnemy(e, strong ? 2 : 1, strong ? 90 : 25, strong)
      hit = true
    }
    if (hit) this.cam.shake(60, 0.002)
  }

  lisaGrab() {
    const L = this.lisa
    const e = this.alive().filter((f) => f.st !== 'down' && this.inReach(L, f, 100)).sort((a, b) => Math.abs(a.x - L.x) - Math.abs(b.x - L.x))[0]
    if (!e) return
    if (e.st === 'strike') {
      // Strike beats Grab: she walked into his punch
      this.floatText(L.x, L.y - 280, 'COUNTERED', '#ff7a7a')
      this.hurtLisa(2, false, e)
      return
    }
    this.floatText(e.x, e.y - 280, 'THROW!', '#ffe27a')
    this.hurtEnemy(e, 2, 0, true)
    const lo = this.locked != null ? this.locked + 60 : 30, hi = this.locked != null ? this.locked + 1220 : this.W - 30
    this.tweens.add({ targets: e, x: Phaser.Math.Clamp(e.x + 170 * L.facing, lo, hi), duration: 300, ease: 'Quad.out' })
  }

  // ---------------------------------------------------------------- enemy ai
  // Readers counter Lisa's favourite move. Dealers best-respond to the frequencies of her last 8 moves, the
  // steady-state reading of section 3.2.2: against an even mix every answer is as good, so they have no read.
  pickMove(e) {
    if (e.kind === 'dealer') {
      const h = this.lisa.habits.slice(-8)
      if (h.length >= 3 && Math.random() < 0.85) {
        const f = { strike: 0, guard: 0, grab: 0 }
        h.forEach((m) => f[m]++)
        const score = (mine) => Object.keys(f).reduce((s, hers) => s + f[hers] * (BEATS[mine] === hers ? 1 : BEATS[hers] === mine ? -1 : 0), 0)
        const vals = ['strike', 'guard', 'grab'].map((m) => [m, score(m)])
        const top = Math.max(...vals.map((v) => v[1]))
        if (top > 1) return Phaser.Utils.Array.GetRandom(vals.filter((v) => v[1] === top))[0] // a near-even 3/3/2 mix gives no read
      }
      return Phaser.Utils.Array.GetRandom(['strike', 'strike', 'grab', 'guard'])
    }
    if (e.kind === 'reader') {
      const h = this.lisa.habits.slice(-6)
      const sharp = 0.8
      if (h.length >= 2 && Math.random() < sharp) {
        const counts = { strike: 0, guard: 0, grab: 0 }
        h.forEach((m) => counts[m]++)
        const top = Math.max(...Object.values(counts))
        const favs = Object.keys(counts).filter((m) => counts[m] === top)
        if (favs.length === 1) return counterOf(favs[0])
      }
      return Phaser.Utils.Array.GetRandom(['strike', 'guard', 'grab'])
    }
    const r = Math.random()
    return r < 0.55 ? 'strike' : r < 0.78 ? 'guard' : 'grab'
  }

  updateEnemies(dt) {
    const L = this.lisa
    const alive = this.alive()
    const attackers = alive.filter((e) => e.st === 'strike' || e.st === 'grab').length
    const byDist = alive.filter((e) => e.st !== 'down').sort((a, b) => Math.abs(a.x - L.x) - Math.abs(b.x - L.x))
    for (const e of alive) {
      e.t += dt
      if (e.tag) e.tag.setPosition(e.x, e.y - 265).setDepth(e.y + 1)
      if (e.st === 'down') {
        if (e.hp <= 0 && e.t > 0.9) {
          e.st = 'dead'
          this.tweens.add({ targets: [e.sprite, e.shadow, e.tag].filter(Boolean), alpha: 0, duration: 400, onComplete: () => { e.destroy(); e.tag && e.tag.destroy() } })
        } else if (e.hp > 0 && e.t > 1.0) { e.st = 'free'; e.t = 0; e.sprite.setAngle(0); e.setPose('idle'); e.wait = 0.5 }
        continue
      }
      if (e.st === 'hurt') { if (e.t > 0.4) { e.st = 'free'; e.t = 0; e.setPose('idle'); e.wait = 0.4 + Math.random() * 0.5 } continue }
      if (e.st === 'free') {
        const rank = byDist.indexOf(e)
        const side = Math.sign(e.x - L.x) || 1
        let tx = L.x + side * (rank < 2 ? 112 : 280)
        if (this.locked != null) tx = Phaser.Math.Clamp(tx, this.locked + 70, this.locked + 1210)
        const ty = Phaser.Math.Clamp(L.y + e.laneOff, LANE_TOP, LANE_BOT)
        const dx = tx - e.x, dy = ty - e.y
        if (Math.abs(dx) > 10) e.x += Math.sign(dx) * Math.min(Math.abs(dx), 150 * dt)
        if (Math.abs(dy) > 6) e.y += Math.sign(dy) * Math.min(Math.abs(dy), 100 * dt)
        e.face(L.x > e.x ? 1 : -1)
        e.wait -= dt
        const onScreen = this.locked == null || (e.x > this.locked + 40 && e.x < this.locked + 1240)
        const close = onScreen && Math.abs(e.x - L.x) < 150 && Math.abs(e.y - L.y) < 22
        if (close && e.wait <= 0 && rank < 2) {
          if (e.kind === 'dealer') e.wait = 0 // dealers press harder
          const mv = this.pickMove(e)
          if (mv !== 'guard' && attackers >= 1) { e.wait = 0.3; continue }
          e.st = mv; e.t = 0; e.hitDone = false
          e.setPose(mv === 'guard' ? 'guard' : 'idle')
          e.tint(TINT[mv])
        }
        continue
      }
      if (e.st === 'strike') {
        if (!e.hitDone && e.t > 0.45) {
          e.hitDone = true; e.setPose('strike'); e.tint(null)
          sfx(this, 'whoosh')
          if (this.inReach(e, L, 130) && L.st !== 'down' && L.invuln <= 0) {
            if (L.st === 'guard' && L.facing === -e.facing) {
              // Guard beats Strike: he staggers
              this.spark(L.x + 30 * L.facing, L.y - 180, 0x8fb4ff)
              this.floatText(L.x, L.y - 270, 'BLOCK', '#8fb4ff')
              sfx(this, 'block')
              e.st = 'hurt'; e.t = -0.2; e.setPose('hurt')
            } else this.hurtLisa(2, false, e)
          }
        }
        if (e.st === 'strike' && e.t > 0.85) { e.st = 'free'; e.t = 0; e.setPose('idle'); e.wait = 0.6 + Math.random() * 0.7 }
      } else if (e.st === 'grab') {
        if (!e.hitDone && e.t > 0.45) {
          e.hitDone = true; e.setPose('grab'); e.tint(null)
          sfx(this, 'whooshBig')
          if (this.inReach(e, L, 105) && L.st !== 'down' && L.invuln <= 0) {
            if (L.st === 'strike') this.hurtEnemy(e, 1, 30) // Strike beats Grab
            else { this.floatText(L.x, L.y - 280, 'GRABBED', '#ffe27a'); this.hurtLisa(3, true, e) }
          }
        }
        if (e.st === 'grab' && e.t > 0.95) { e.st = 'free'; e.t = 0; e.setPose('idle'); e.wait = 0.7 + Math.random() * 0.6 }
      } else if (e.st === 'guard') {
        if (e.t > 1.1) { e.st = 'free'; e.t = 0; e.tint(null); e.setPose('idle'); e.wait = 0.3 }
      }
    }
  }

  // ---------------------------------------------------------------- triggers
  checkTriggers() {
    const T = this.L.triggers
    for (let i = 0; i < T.length; i++) {
      const tr = T[i]
      if (this.done.has(tr.id) || this.lisa.x < tr.x) continue
      this.done.add(tr.id)
      this.checkpoint = i
      writeSave({ level: this.levelId, checkpoint: i, bossPhase: tr.standoff === 'boss' ? this.bossPhase : 0 })
      this.lockAt(tr.cam)
      if (tr.spawn) this.startWave(tr.spawn)
      else if (tr.standoff === 'elite') this.startElite()
      else this.startBoss()
      return
    }
  }

  lockAt(camX) {
    this.locked = camX
    this.goArrow.setVisible(false)
    this.tweens.add({ targets: this.cam, scrollX: camX, duration: 400, ease: 'Sine.out' })
  }

  unlock() {
    this.locked = null
    this.goArrow.setVisible(true)
    sfx(this, 'go')
    this.time.delayedCall(2500, () => this.goArrow.setVisible(false))
  }

  // spawn: [[kind, x, y, delay]]; x is absolute, or relative to the locked camera when `relative`
  startWave(spawn, onClear, relative = false) {
    this.wave = { onClear: onClear || (() => this.unlock()), count: spawn.length }
    spawn.forEach(([kind, x, y, delay]) => this.time.delayedCall(delay * 1000, () => {
      this.spawn(kind, relative ? this.locked + x : x, y)
      if (kind === 'reader' && this.L.readerTalk && !this.readerTalked) {
        this.readerTalked = true
        this.time.delayedCall(700, () => this.talk(this.L.readerTalk))
      }
    }))
  }

  checkWave() {
    if (!this.wave) return
    const total = this.wave.count
    const dead = this.enemies.filter((e) => e.st === 'dead').length
    if (this.enemies.length >= total && dead >= total) {
      const cb = this.wave.onClear
      this.wave = null
      this.enemies = []
      cb()
    }
  }

  talk(lines, after) {
    const prev = this.mode
    this.mode = 'cutscene'
    this.dlg.play(lines, () => { this.mode = prev === 'cutscene' ? 'brawl' : prev; after && after() })
  }

  // ---------------------------------------------------------------- standoffs
  makeStandoff(cfg, enemy, handlers) {
    const Cls = cfg.kind === 'mix' ? MixStandoff : Standoff
    return new Cls(this, {
      lisa: this.lisa, enemy, enemyName: cfg.name, pronoun: cfg.pronoun, phases: cfg.phases,
      say: (s, y) => this.caption.show(s, y), onLose: () => this.die(), ...handlers,
    })
  }

  placeForStandoff(enemy) {
    const L = this.lisa
    this.toFree()
    const camX = this.locked
    this.tweens.add({ targets: L, x: camX + 470, y: 600, duration: 500 })
    this.tweens.add({ targets: enemy, x: camX + 860, y: 600, duration: 900 })
    L.face(1)
    enemy.face(-1)
  }

  startElite() {
    const cfg = this.L.elite
    this.mode = 'cutscene'
    if (this.lisa.hp < this.lisa.maxHp) { this.lisa.hp = this.lisa.maxHp; this.floatText(this.lisa.x, this.lisa.y - 280, 'FULL HEALTH', '#7dffb0') }
    const b = new Fighter(this, cfg.prefix, this.locked + 1450, 600, { hp: 3 })
    b.face(-1)
    this.boss = b
    this.foeLabel.setText(cfg.label)
    this.placeForStandoff(b)
    this.time.delayedCall(950, () => this.talk(this.once('elite', cfg.intro), () => {
      this.mode = 'standoff'
      this.so = this.makeStandoff(cfg, b, { onPhaseWin: () => this.eliteDown() })
      this.so.startPhase(0)
    }))
  }

  eliteDown() {
    const b = this.boss
    this.caption.hide()
    b.setPose('hurt')
    sfx(this, 'thud')
    this.tweens.add({ targets: b.sprite, angle: 80, alpha: 0, duration: 900, delay: 300 })
    this.tweens.add({ targets: b.shadow, alpha: 0, duration: 900, delay: 300 })
    this.mode = 'cutscene'
    this.time.delayedCall(700, () => this.talk(this.cued(this.L.elite.outro), () => {
      this.boss = null
      this.so = null
      this.foeLabel.setText('')
      this.mode = 'brawl'
      this.unlock()
    }))
  }

  startBoss() {
    const cfg = this.L.boss
    this.mode = 'cutscene'
    this.lisa.hp = this.lisa.maxHp
    const s = new Fighter(this, cfg.prefix, this.locked + 960, cfg.standY, { hp: 3 })
    this.boss = s
    s.face(-1)
    this.foeLabel.setText(cfg.label)
    this.toFree()
    this.so = this.makeStandoff(cfg, s, {
      onPhaseWin: (i) => {
        this.caption.hide()
        if (i === cfg.phases.length - 1) return this.bossDown()
        this.bossPhase = i + 1
        writeSave({ level: this.levelId, checkpoint: this.checkpoint, bossPhase: this.bossPhase }) // saved rounds
        this.mode = 'cutscene'
        s.setPose('hurt')
        sfx(this, 'hitHeavy')
        this.tweens.add({ targets: s, x: this.locked + 1000, y: cfg.standY, duration: 600 })
        this.time.delayedCall(700, () => this.talk([cfg.taunt], () => {
          this.mode = 'brawl'
          s.setPose('idle')
          this.startWave(cfg.interludes[i] || cfg.interludes[0], () => {
            this.lisa.hp = Math.min(this.lisa.maxHp, this.lisa.hp + 6)
            this.floatText(this.lisa.x, this.lisa.y - 280, '+6', '#7dffb0')
            this.beginBossPhase(i + 1)
          }, true)
        }))
      },
    })
    this.time.delayedCall(400, () => this.beginBossPhase(this.bossPhase))
  }

  beginBossPhase(i) {
    this.mode = 'cutscene'
    this.placeForStandoff(this.boss)
    this.time.delayedCall(950, () => this.talk(this.once(`boss${i}`, this.L.boss.phaseIntros[i]), () => {
      this.mode = 'standoff'
      this.so.startPhase(i)
    }))
  }

  bossDown() {
    const s = this.boss
    this.mode = 'cutscene'
    this.foeLabel.setText('')
    s.setPose('hurt')
    this.tweens.add({ targets: s.sprite, angle: 75, duration: 500 })
    const page = this.add.image(s.x, s.y - 200, 'setlist_page').setDepth(4500)
    sfx(this, 'ko')
    this.time.delayedCall(900, () => sfx(this, 'page'))
    this.tweens.add({ targets: page, x: this.lisa.x + 40, y: this.lisa.y - 300, angle: 720, duration: 1200, ease: 'Sine.inOut' })
    this.time.delayedCall(900, () => this.talk(this.cued(this.L.boss.outro), () => {
      this.tweens.add({ targets: page, x: this.locked + 1400, y: 120, duration: 1400, ease: 'Sine.in' })
      const next = this.L.end.next
      writeSave({ level: next ? next.level : this.levelId, checkpoint: 0, bossPhase: 0, [`cleared_${this.levelId}`]: true })
      this.cam.fadeOut(1200)
      this.cam.once('camerafadeoutcomplete', () => this.scene.start('End', { level: this.levelId }))
    }))
  }

  die() {
    if (this.mode === 'dead') return
    this.mode = 'dead'
    if (this.so) this.so.end()
    this.caption.hide()
    this.lisa.setPose('hurt')
    this.tweens.add({ targets: this.lisa.sprite, angle: -80, duration: 400 })
    sfx(this, 'ko')
    const t = this.add.text(640, 300, 'KNOCKED OUT', { fontFamily: 'Bangers', fontSize: '90px', color: '#ff6b7a', stroke: '#000', strokeThickness: 8 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(6000)
    this.add.text(640, 380, 'Back to the last checkpoint...', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '24px', color: '#fff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(6000)
    t.setScale(0.5)
    this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.out' })
    this.time.delayedCall(2000, () => this.scene.restart({ level: this.levelId, checkpoint: this.checkpoint, bossPhase: this.bossPhase }))
  }

  // After a knockout, skip the long explanation and keep just the first line (the enemy's taunt).
  once(key, lines) {
    const k = `seen:${this.levelId}:${key}`
    if (this.registry.get(k)) return [lines[0], { who: 'tempo', text: 'Same rules. You know this one.' }]
    this.registry.set(k, true)
    return this.cued(lines)
  }

  // Lines may carry a `cue`: a small staged moment that shows the villain instead of telling.
  cued(lines) {
    return lines.map((l) => (l.cue ? { ...l, do: () => this.cue(l.cue) } : l))
  }

  cue(name) {
    const cx = (this.locked ?? this.cam.scrollX) + 640
    if (name === 'zeroScreen') {
      // Zero on a giant casino screen above the floor
      const frame = this.add.rectangle(cx, 250, 360, 300, 0x0d0820, 0.9).setStrokeStyle(6, 0xffd166).setDepth(2950)
      const z = this.add.image(cx, 392, 'zero_idle').setOrigin(0.5, 1).setScale(0.5).setDepth(2951)
      const scan = this.add.rectangle(cx, 250, 348, 288, 0x5ce1d6, 0.08).setDepth(2952)
      this.tweens.add({ targets: [z, scan], alpha: { from: 0.55, to: 1 }, duration: 90, yoyo: true, repeat: 5, onComplete: () => { z.setAlpha(1); scan.setAlpha(0.6) } })
      this.zeroScreen = [frame, z, scan]
    } else if (name === 'zeroScreenOff' && this.zeroScreen) {
      const parts = this.zeroScreen
      this.zeroScreen = null
      this.tweens.add({ targets: parts, alpha: 0, scaleY: 0.02, duration: 260, onComplete: () => parts.forEach((p) => p.destroy()) })
      sfx(this, 'block')
    } else if (name === 'zeroSweep') {
      // a ghostly Zero steps out, sweeps the table, and fades
      const z = this.add.image(cx + 380, 600, 'zero_idle').setOrigin(0.5, 1).setScale(0.5).setAlpha(0).setFlipX(true).setDepth(3500)
      this.tweens.add({ targets: z, alpha: 0.75, x: cx + 300, duration: 500 })
      this.tweens.add({ targets: z, alpha: 0, duration: 700, delay: 2600, onComplete: () => z.destroy() })
      sfx(this, 'sting')
    }
  }

  // ---------------------------------------------------------------- loop
  update(_, dms) {
    const dt = Math.min(dms / 1000, 0.05)
    this.elapsed += dt
    this.dlg.update(dt)
    if (this.mode === 'brawl') {
      this.updateLisa(dt)
      this.updateEnemies(dt)
      this.checkWave()
      if (!this.wave && this.locked == null) {
        this.checkTriggers()
        this.cam.scrollX = Phaser.Math.Linear(this.cam.scrollX, Phaser.Math.Clamp(this.lisa.x - 450, 0, this.W - 1280), 0.12)
      }
    } else if (this.mode === 'standoff' && this.so) this.so.update(dt)
    // sync visuals
    const L = this.lisa
    L.sync(dt)
    if (L.pose === 'walkpass' || L.pose === 'walkb') L.sprite.y -= 4 // body rides higher as the leg passes
    if (L.invuln > 0) L.sprite.setAlpha(Math.sin(this.elapsed * 40) > 0 ? 1 : 0.4); else L.sprite.setAlpha(1)
    this.enemies.forEach((e) => e.st !== 'dead' && e.sync(dt))
    if (this.boss) this.boss.sync(dt)
    const tx = L.x - 80 * L.facing, ty = L.y - 300 + Math.sin(this.elapsed * 3) * 8
    this.tempo.x = Phaser.Math.Linear(this.tempo.x, tx, 0.08)
    this.tempo.y = Phaser.Math.Linear(this.tempo.y, ty, 0.08)
    // hud
    this.hpBar.setScale(Math.max(0, L.hp / L.maxHp), 1)
    const foe = this.boss && this.so && this.so.active ? this.so : null
    this.foeBar.setVisible(!!foe); this.foeBack.setVisible(!!foe)
    if (foe) this.foeBar.setScale(Math.max(0, foe.hp / foe.phases[foe.phaseIdx].hp), 1)
    this.foeLabel.setX(foe ? 990 : 1252)
    this.legend.setVisible(!foe) // the brawl triangle does not apply in standoffs
    if (this.mixParts) this.mixParts.forEach((o) => o.setVisible(!foe))
    if (this.habitBars) {
      const h = L.habits
      this.habitBars.forEach(({ m, bar }) => bar.setSize(28, h.length ? (34 * h.filter((x) => x === m).length) / 8 : 0))
    }
    this.muteLabel.setText(isMuted() ? 'M: music off' : 'M: music on')
    this.presses.clear()
  }

  debugState() {
    const so = this.so && this.so.active
      ? { kind: this.so.kind || 'pure', A: this.so.A, saddle: this.so.saddle, value: this.so.value, p: this.so.p, v12: this.so.v12, wheel: this.so.w, view: this.so.view, hp: this.so.hp, phase: this.so.phaseIdx, waiting: this.so.waiting }
      : null
    return {
      scene: 'Street', level: this.levelId, mode: this.mode, checkpoint: this.checkpoint, locked: this.locked,
      lisa: { x: Math.round(this.lisa.x), y: Math.round(this.lisa.y), hp: this.lisa.hp, st: this.lisa.st, habits: this.lisa.habits.join(',') },
      enemies: this.alive().map((e) => ({ kind: e.kind, x: Math.round(e.x), hp: e.hp, st: e.st })),
      standoff: so, dialogue: this.dlg.active,
    }
  }

  debugSolve() {
    if (this.so && this.so.active) { this.so.solve(); return 'played the equilibrium' }
    this.alive().forEach((e) => { e.hp = 0; e.st = 'down'; e.t = 1 })
    return 'cleared enemies'
  }
}
