import Phaser from 'phaser'
import { Fighter } from '../actors/Fighter.js'
import { Dialogue } from '../ui/Dialogue.js'
import { Standoff } from '../ui/Standoff.js'
import { BEATS } from '../data/games.js'
import { loadSave, writeSave } from '../systems/save.js'
import { trackPresses } from '../systems/presses.js'
import { playMusic, bindMuteKey, isMuted } from '../systems/audio.js'

const LEVEL_W = 4200
const LANE_TOP = 520
const LANE_BOT = 660
const DEPTH_TOL = 30
const TINT = { strike: 0xff7a7a, guard: 0x8fb4ff, grab: 0xffe27a }
const WALK_CYCLE = ['walk', 'walkpass', 'walk', 'walkb']
const counterOf = (m) => Object.keys(BEATS).find((k) => BEATS[k] === m)

// Checkpoints are indices into TRIGGERS.
const TRIGGERS = [
  { id: 'wave1', x: 560, cam: 0, spawn: [['grunt', 1420, 560, 0], ['grunt', 1500, 630, 0.9], ['grunt', -160, 600, 2.2]] },
  { id: 'wave2', x: 1650, cam: 1150, spawn: [['grunt', 2520, 560, 0], ['reader', 2560, 630, 0.6], ['grunt', 1000, 600, 2.4]] },
  { id: 'brick', x: 2650, cam: 2150, standoff: 'brick' },
  { id: 'sadie', x: 3420, cam: LEVEL_W - 1280, standoff: 'sadie' },
]

export default class Street extends Phaser.Scene {
  constructor() { super('Street') }

  init(data) {
    const save = loadSave()
    this.checkpoint = data.checkpoint ?? save.checkpoint ?? 0
    this.bossPhase = this.checkpoint === 3 ? (data.bossPhase ?? save.bossPhase ?? 0) : 0
  }

  create() {
    writeSave({ scene: 'Street', checkpoint: this.checkpoint, bossPhase: this.bossPhase })
    playMusic(this, 'level_01')
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
    this.cam.setBounds(0, 0, LEVEL_W, 720)
    this.locked = null
    this.wave = null
    this.mode = 'brawl' // brawl | standoff | cutscene | dead
    this.done = new Set()
    this.elapsed = 0

    // resume from checkpoint
    const cp = TRIGGERS[this.checkpoint]
    TRIGGERS.slice(0, this.checkpoint).forEach((t) => this.done.add(t.id))
    if (this.checkpoint > 0) this.lisa.x = cp.x - 260
    this.cam.scrollX = Phaser.Math.Clamp(this.lisa.x - 400, 0, LEVEL_W - 1280)
    if (this.checkpoint === 0) {
      this.mode = 'cutscene'
      this.dlg.play([
        { who: 'tempo', text: "Neon Strip. Zero's crew runs these streets." },
        { who: 'tempo', text: 'Every move beats one and loses to one: Strike beats Grab, Grab beats Guard, Guard beats Strike.' },
        { who: 'tempo', text: 'Watch them wind up: red means a strike is coming, blue is a guard, yellow is a grab.' },
        { who: 'lisa', text: 'J to strike, K to guard, L to grab. Got it.' },
      ], () => { this.mode = 'brawl' })
    }
    this.goArrow = this.add.text(1180, 380, 'GO ▶', { fontFamily: 'Bangers', fontSize: '54px', color: '#ffd166', stroke: '#000', strokeThickness: 6 })
      .setScrollFactor(0).setDepth(5000).setVisible(false)
    this.tweens.add({ targets: this.goArrow, x: 1200, duration: 400, yoyo: true, repeat: -1 })
  }

  // ---------------------------------------------------------------- world
  buildWorld() {
    this.add.image(0, 0, 'strip_far').setOrigin(0, 0).setScrollFactor(0.12).setDepth(-1000)
    const midScale = 0.86
    let x = 0
    ;['strip_mid_a', 'strip_mid_b', 'strip_mid_a', 'strip_mid_b'].forEach((k) => {
      const m = this.add.image(x, 470, k).setOrigin(0, 1).setScale(midScale).setScrollFactor(0.45).setDepth(-900)
      x += m.displayWidth - 2
    })
    this.add.tileSprite(0, 452, LEVEL_W, 270, 'strip_ground').setOrigin(0, 0).setDepth(-800)
    this.stage = this.add.image(3560 + 160, 520, 'strip_stage').setOrigin(0.5, 1).setScale(0.95).setDepth(-700)
    const fg = [['fg_lamp', 980, 0.95], ['fg_crates', 1640, 0.9], ['fg_lamp', 2420, 0.95], ['fg_bin', 3080, 0.85], ['fg_lamp', 3900, 0.95]]
    fg.forEach(([k, fx, s]) => this.add.image(fx, 745, k).setOrigin(0.5, 1).setScale(s).setScrollFactor(1.25).setDepth(3000))
  }

  buildHud() {
    const d = 5000
    this.add.rectangle(0, 676, 1280, 44, 0x0b0614, 0.75).setOrigin(0, 0).setScrollFactor(0).setDepth(d)
    this.add.image(28, 698, 'lisa_portrait').setDisplaySize(40, 40).setScrollFactor(0).setDepth(d)
    this.add.text(56, 686, 'LISA', { fontFamily: 'Bangers', fontSize: '24px', color: '#ff5fa2' }).setScrollFactor(0).setDepth(d)
    this.add.rectangle(112, 698, 260, 16, 0x3a1a5a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(d)
    this.hpBar = this.add.rectangle(112, 698, 260, 16, 0xff5fa2).setOrigin(0, 0.5).setScrollFactor(0).setDepth(d)
    this.add.text(640, 698, 'Strike ▶ Grab   ·   Grab ▶ Guard   ·   Guard ▶ Strike', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '16px', color: '#e8dcff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d)
    this.muteLabel = this.add.text(1252, 652, '', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#b9a6e0' })
      .setOrigin(1, 0).setScrollFactor(0).setDepth(d)
    this.foeLabel = this.add.text(1252, 686, '', { fontFamily: 'Bangers', fontSize: '24px', color: '#ff9a5c' }).setOrigin(1, 0).setScrollFactor(0).setDepth(d)
    this.foeBack = this.add.rectangle(1000, 698, 160, 16, 0x3a1a5a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(d).setVisible(false)
    this.foeBar = this.add.rectangle(1000, 698, 160, 16, 0xff9a5c).setOrigin(0, 0.5).setScrollFactor(0).setDepth(d).setVisible(false)
  }

  buildCaption() {
    const c = this.add.container(0, 0).setScrollFactor(0).setDepth(4300).setVisible(false)
    const g = this.add.graphics()
    g.fillStyle(0x0d0820, 0.9).fillRoundedRect(560, 16, 696, 96, 12).lineStyle(2, 0xffd166, 1).strokeRoundedRect(560, 16, 696, 96, 12)
    const icon = this.add.image(606, 64, 'tempo_sprite').setScale(0.36)
    const t = this.add.text(650, 30, '', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '21px', color: '#fff', wordWrap: { width: 590 } })
    c.add([g, icon, t])
    return {
      show: (s) => { t.setText(s); c.setVisible(true).setAlpha(1) },
      hide: () => c.setVisible(false),
    }
  }

  // ---------------------------------------------------------------- fx
  floatText(x, y, s, color = '#fff') {
    const t = this.add.text(x, y, s, { fontFamily: 'Bangers', fontSize: '40px', color, stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(4100)
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 900, ease: 'Cubic.out', onComplete: () => t.destroy() })
  }

  spark(x, y, color = 0xffffff) {
    const s = this.add.star(x, y, 8, 10, 34, color).setDepth(4000)
    this.tweens.add({ targets: s, scale: 1.8, alpha: 0, angle: 45, duration: 220, onComplete: () => s.destroy() })
  }

  // ---------------------------------------------------------------- enemies
  spawn(kind, x, y) {
    const prefix = kind === 'reader' ? 'grunt' : kind
    const e = new Fighter(this, prefix, x, y, { hp: kind === 'reader' ? 5 : 4 })
    Object.assign(e, { kind, st: 'free', t: 0, wait: 0.6 + Math.random() * 0.8, laneOff: Phaser.Math.Between(-10, 10) })
    if (kind === 'reader') {
      e.shadow.setFillStyle(0xa25cff, 0.7)
      e.tag = this.add.text(x, y - 270, 'READER', { fontFamily: 'Bangers', fontSize: '22px', color: '#c79bff', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5)
    }
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
    e.flash()
    e.tint(null)
    this.floatText(e.x, e.y - 260, `-${dmg}`, '#ffd166')
    this.spark(e.x - 20 * this.lisa.facing, e.y - 170)
    e.x = Phaser.Math.Clamp(e.x + knock * this.lisa.facing, 20, LEVEL_W - 20)
    if (e.hp <= 0 || down) {
      e.st = 'down'; e.t = 0; e.setPose('hurt')
      this.tweens.add({ targets: e.sprite, angle: -80 * this.lisa.facing, duration: 250 })
    } else {
      e.st = 'hurt'; e.t = 0; e.setPose('hurt')
    }
  }

  hurtLisa(dmg, down = false, from = null) {
    const L = this.lisa
    if (L.invuln > 0 || L.st === 'down') return
    L.hp -= dmg
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
    const JD = Phaser.Input.Keyboard.JustDown
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
      const minX = this.locked != null ? this.locked + 50 : 40
      const maxX = this.locked != null ? this.locked + 1230 : LEVEL_W - 60
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
    if (move === 'strike') { L.x += 14 * L.facing }
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
        L.st = 'recoil'; L.t = 0; L.setPose('hurt')
        L.x -= 30 * L.facing
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
    const lo = this.locked != null ? this.locked + 60 : 30, hi = this.locked != null ? this.locked + 1220 : LEVEL_W - 30
    this.tweens.add({ targets: e, x: Phaser.Math.Clamp(e.x + 170 * L.facing, lo, hi), duration: 300, ease: 'Quad.out' })
  }

  // ---------------------------------------------------------------- enemy ai
  pickMove(e) {
    if (e.kind === 'reader') {
      const h = this.lisa.habits.slice(-6)
      if (h.length >= 2 && Math.random() < 0.8) {
        const counts = { strike: 0, guard: 0, grab: 0 }
        h.forEach((m) => counts[m]++)
        const fav = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]
        return counterOf(fav)
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
        const tx = L.x + side * (rank < 2 ? 112 : 280)
        const ty = Phaser.Math.Clamp(L.y + e.laneOff, LANE_TOP, LANE_BOT)
        const dx = tx - e.x, dy = ty - e.y
        if (Math.abs(dx) > 10) e.x += Math.sign(dx) * Math.min(Math.abs(dx), 150 * dt)
        if (Math.abs(dy) > 6) e.y += Math.sign(dy) * Math.min(Math.abs(dy), 100 * dt)
        e.face(L.x > e.x ? 1 : -1)
        e.wait -= dt
        const close = Math.abs(e.x - L.x) < 150 && Math.abs(e.y - L.y) < 22
        if (close && e.wait <= 0 && rank < 2) {
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
          if (this.inReach(e, L, 130) && L.st !== 'down' && L.invuln <= 0) {
            if (L.st === 'guard' && L.facing === -e.facing) {
              // Guard beats Strike: he staggers
              this.spark(L.x + 30 * L.facing, L.y - 180, 0x8fb4ff)
              this.floatText(L.x, L.y - 270, 'BLOCK', '#8fb4ff')
              e.st = 'hurt'; e.t = -0.2; e.setPose('hurt')
            } else this.hurtLisa(2, false, e)
          }
        }
        if (e.t > 0.85) { e.st = 'free'; e.t = 0; e.setPose('idle'); e.wait = 0.6 + Math.random() * 0.7 }
      } else if (e.st === 'grab') {
        if (!e.hitDone && e.t > 0.45) {
          e.hitDone = true; e.setPose('grab'); e.tint(null)
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
    for (let i = 0; i < TRIGGERS.length; i++) {
      const tr = TRIGGERS[i]
      if (this.done.has(tr.id) || this.lisa.x < tr.x) continue
      this.done.add(tr.id)
      this.checkpoint = i
      writeSave({ checkpoint: i, bossPhase: i === 3 ? this.bossPhase : 0 })
      this.lockAt(tr.cam)
      if (tr.spawn) this.startWave(tr)
      else if (tr.standoff === 'brick') this.startBrick()
      else this.startSadie()
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
    this.time.delayedCall(2500, () => this.goArrow.setVisible(false))
  }

  startWave(tr, onClear) {
    this.wave = { onClear: onClear || (() => this.unlock()) }
    tr.spawn.forEach(([kind, x, y, delay]) => this.time.delayedCall(delay * 1000, () => {
      const e = this.spawn(kind, x, y)
      if (kind === 'reader' && !this.readerTalked) {
        this.readerTalked = true
        this.time.delayedCall(700, () => this.talk([
          { who: 'tempo', text: 'Purple shadow! That one watches your last few moves and counters your favourite.' },
          { who: 'tempo', text: "Mash one button and it'll read you like a book. Mix it up." },
        ]))
      }
      return e
    }))
    this.wave.count = tr.spawn.length
    this.wave.spawned = () => this.enemies.length
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
  placeForStandoff(enemy) {
    const L = this.lisa
    this.toFree()
    const camX = this.locked
    this.tweens.add({ targets: L, x: camX + 470, y: 600, duration: 500 })
    this.tweens.add({ targets: enemy, x: camX + 860, y: 600, duration: 900 })
    L.face(1)
    enemy.face(-1)
  }

  startBrick() {
    this.mode = 'cutscene'
    const b = new Fighter(this, 'brick', this.locked + 1450, 600, { hp: 3 })
    this.boss = b
    this.foeLabel.setText('BRICK')
    this.placeForStandoff(b)
    this.time.delayedCall(950, () => this.talk([
      { who: 'brick', text: 'Nobody gets past Brick.' },
      { who: 'tempo', text: "He's too big to brawl. This is a standoff: you both pick a move at the same moment." },
      { who: 'tempo', text: 'The card shows your points for every pair of moves.' },
      { who: 'tempo', text: 'Brick answers whatever you keep doing. So for each move, look for the worst he can do to you.' },
      { who: 'tempo', text: 'Then pick the move whose worst case is best. Score what the card can guarantee you, and your hit lands.' },
    ], () => {
      this.mode = 'standoff'
      this.so = new Standoff(this, {
        lisa: this.lisa, enemy: b, enemyName: 'Brick', phases: [{ hp: 3, view: 'lisa', fog: false, value: 1 }],
        say: (s) => this.caption.show(s),
        onLose: () => this.die(),
        onPhaseWin: () => this.brickDown(),
      })
      this.so.startPhase(0)
    }))
  }

  brickDown() {
    const b = this.boss
    this.caption.hide()
    b.setPose('hurt')
    this.tweens.add({ targets: b.sprite, angle: 80, alpha: 0, duration: 900, delay: 300 })
    this.tweens.add({ targets: b.shadow, alpha: 0, duration: 900, delay: 300 })
    this.mode = 'cutscene'
    this.time.delayedCall(700, () => this.talk([
      { who: 'brick', text: '...Fine. Go.' },
      { who: 'tempo', text: "That's minimax: pick the move with the best guarantee." },
      { who: 'tempo', text: "In a fight where his win is your loss, that's a steady state. Neither of you wants to switch." },
      { who: 'lisa', text: 'Mini... Max. Huh. Guess the name fits.' },
    ], () => {
      this.boss = null
      this.foeLabel.setText('')
      this.mode = 'brawl'
      this.unlock()
    }))
  }

  startSadie() {
    this.mode = 'cutscene'
    this.lisa.hp = this.lisa.maxHp
    const s = new Fighter(this, 'sadie', this.locked + 960, 520, { hp: 3 })
    this.boss = s
    s.face(-1)
    this.foeLabel.setText('SADIE POINT')
    this.toFree()
    const PH = [
      [
        { who: 'sadie', text: 'Zero says every fight has a loser. Want to guess who?' },
        { who: 'tempo', text: "Her card is nasty. Every move can cost you. Find the one that costs the least, worst case." },
        { who: 'lisa', text: "Let's read the card and find out." },
      ],
      [
        { who: 'sadie', text: "Let's see you read a card you can't see." },
        { who: 'tempo', text: "Some cells are hidden. You don't need them all. One bad cell is enough to sink a move." },
      ],
      [
        { who: 'sadie', text: "Fine. Here's MY card. My winnings, not yours." },
        { who: 'tempo', text: 'Every point she wins, you lose. Her +2 is your −2. Flip it in your head.' },
      ],
    ]
    this.so = new Standoff(this, {
      lisa: this.lisa, enemy: s, enemyName: 'Sadie',
      phases: [{ hp: 3, view: 'lisa', fog: false, value: -1 }, { hp: 3, view: 'lisa', fog: true, value: 1 }, { hp: 3, view: 'enemy', fog: false, value: -1 }],
      say: (t) => this.caption.show(t),
      onLose: () => this.die(),
      onPhaseWin: (i) => {
        this.caption.hide()
        if (i === 2) return this.sadieDown()
        this.bossPhase = i + 1
        writeSave({ checkpoint: 3, bossPhase: this.bossPhase }) // saved rounds
        this.mode = 'cutscene'
        s.setPose('hurt')
        this.tweens.add({ targets: s, x: this.locked + 1000, y: 520, duration: 600 })
        this.time.delayedCall(700, () => this.talk([{ who: 'sadie', text: 'Crew! Ruin her night.' }], () => {
          this.mode = 'brawl'
          s.setPose('idle')
          const cx = this.locked
          this.startWave({ spawn: [['grunt', cx + 1400, 560, 0], [i === 0 ? 'grunt' : 'reader', cx - 140, 630, 0.6]] }, () => {
            this.lisa.hp = Math.min(this.lisa.maxHp, this.lisa.hp + 6)
            this.floatText(this.lisa.x, this.lisa.y - 280, '+6', '#7dffb0')
            this.beginSadiePhase(i + 1, PH)
          })
        }))
      },
    })
    this.time.delayedCall(400, () => this.beginSadiePhase(this.bossPhase, PH))
  }

  beginSadiePhase(i, PH) {
    this.mode = 'cutscene'
    this.placeForStandoff(this.boss)
    this.time.delayedCall(950, () => this.talk(PH[i], () => {
      this.mode = 'standoff'
      this.so.startPhase(i)
    }))
  }

  sadieDown() {
    const s = this.boss
    this.mode = 'cutscene'
    s.setPose('hurt')
    this.tweens.add({ targets: s.sprite, angle: 75, duration: 500 })
    const page = this.add.image(s.x, s.y - 200, 'setlist_page').setDepth(4500)
    this.tweens.add({ targets: page, x: this.lisa.x + 40, y: this.lisa.y - 300, angle: 720, duration: 1200, ease: 'Sine.inOut' })
    this.time.delayedCall(900, () => this.talk([
      { who: 'sadie', text: 'Zero said... every fight has a loser.' },
      { who: 'lisa', text: 'This one did. Not every game is a fight, though.' },
      { who: 'tempo', text: 'Page one of the setlist! Hold it up, Lisa.' },
      { who: 'juno', text: 'Lisa? I can hear you through the song. Keep going.' },
      { who: 'tempo', text: "The next page flew toward the Casino Arcade. Zero's watching." },
    ], () => {
      this.tweens.add({ targets: page, x: this.locked + 1400, y: 120, duration: 1400, ease: 'Sine.in' })
      writeSave({ checkpoint: 0, bossPhase: 0, cleared1: true })
      this.cam.fadeOut(1200)
      this.cam.once('camerafadeoutcomplete', () => this.scene.start('End'))
    }))
  }

  die() {
    if (this.mode === 'dead') return
    this.mode = 'dead'
    if (this.so) this.so.end()
    this.caption.hide()
    this.lisa.setPose('hurt')
    this.tweens.add({ targets: this.lisa.sprite, angle: -80, duration: 400 })
    const t = this.add.text(640, 300, 'KNOCKED OUT', { fontFamily: 'Bangers', fontSize: '90px', color: '#ff6b7a', stroke: '#000', strokeThickness: 8 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(6000)
    this.add.text(640, 380, 'Back to the last checkpoint...', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '24px', color: '#fff' })
      .setOrigin(0.5).setScrollFactor(0).setDepth(6000)
    t.setScale(0.5)
    this.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.out' })
    this.time.delayedCall(2000, () => this.scene.restart({ checkpoint: this.checkpoint, bossPhase: this.bossPhase }))
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
        this.cam.scrollX = Phaser.Math.Linear(this.cam.scrollX, Phaser.Math.Clamp(this.lisa.x - 450, 0, LEVEL_W - 1280), 0.12)
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
    this.muteLabel.setText(isMuted() ? 'M: music off' : 'M: music on')
    this.presses.clear()
  }

  debugState() {
    const so = this.so && this.so.active ? { A: this.so.A, saddle: this.so.saddle, value: this.so.value, view: this.so.view, hp: this.so.hp, phase: this.so.phaseIdx, waiting: this.so.waiting } : null
    return {
      scene: 'Street', mode: this.mode, checkpoint: this.checkpoint, locked: this.locked,
      lisa: { x: Math.round(this.lisa.x), y: Math.round(this.lisa.y), hp: this.lisa.hp, st: this.lisa.st },
      enemies: this.alive().map((e) => ({ kind: e.kind, x: Math.round(e.x), hp: e.hp, st: e.st })),
      standoff: so, dialogue: this.dlg.active,
    }
  }

  debugSolve() {
    if (this.so && this.so.active) { this.so.solve(); return 'picked maxmin row' }
    this.alive().forEach((e) => { e.hp = 0; e.st = 'down'; e.t = 1 })
    return 'cleared enemies'
  }
}
