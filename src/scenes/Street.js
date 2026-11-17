import Phaser from 'phaser'
import { Fighter } from '../actors/Fighter.js'
import { Dialogue } from '../ui/Dialogue.js'
import { Standoff } from '../ui/Standoff.js'
import { MixStandoff } from '../ui/MixStandoff.js'
import { BEATS, MOVES } from '../data/games.js'
import { LEVELS } from '../data/levels.js'
import { loadSave, writeSave } from '../systems/save.js'
import { trackPresses } from '../systems/presses.js'
import { playMusic, bindMuteKey, isMuted } from '../systems/audio.js'
import { sfx } from '../systems/sfx.js'

const LANE_TOP = 520
const LANE_BOT = 660
const DEPTH_TOL = 30
const TINT = { punch: 0xff7a7a, kick: 0x8fb4ff, throw: 0xffe27a }
const WALK_CYCLE = ['walk', 'walkpass', 'walk', 'walkb']
const MOVE_COLOR = { punch: 0xff7a7a, kick: 0x8fb4ff, throw: 0xffe27a }
const TINT_CSS = { punch: '#ff7a7a', kick: '#8fb4ff', throw: '#ffe27a' }
const REACH = { punch: 135, kick: 180, throw: 135 }
const E_REACH = { punch: 130, kick: 165, throw: 105 }
const E_DMG = { punch: 1, kick: 2, throw: 2 }
// Power-ups (game fiction, named for the book's ideas)
const POWER = {
  payoff: { key: 'fx_payoff', name: 'PAYOFF +6', color: '#ff5fa2', tip: 'Payoff: a number for how much a player likes an outcome. This one is +6 health. (Orbs are game inventions †.)' },
  nash: { key: 'fx_nash', name: 'EQUILIBRIUM SHIELD', color: '#5ce1d6', tip: 'At a Nash equilibrium no player gains by changing their own move alone. Like that, for 6 seconds no hit gains them anything. †' },
  best: { key: 'fx_best', name: 'BEST RESPONSE', color: '#ffd166', tip: 'A best response is a move that does best against what the other side is playing. For 8 seconds, every move you make is one. †' },
}
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
    Object.assign(this.lisa, { st: 'free', t: 0, habits: [], combo: 0, lastStrikeEnd: -9, invuln: 0, shield: 0, best: 0 })
    this.pickups = []
    this.aura = this.add.ellipse(0, 0, 150, 40).setStrokeStyle(5, 0x5ce1d6).setVisible(false)
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
    this.tipUp = false

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
    const legendX = this.L.habitMeter ? 775 : 640
    this.legend = this.add.text(legendX, 698, 'Kick beats Punch  ·  Punch beats Throw  ·  Throw beats Kick †', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#e8dcff',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(d)
    if (this.L.habitMeter) {
      // the MIX meter: Lisa's last eight moves, as the dealers see them
      this.mixParts = [this.add.text(388, 698, 'MIX', { fontFamily: 'Bangers', fontSize: '22px', color: '#ffd166' }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(d)]
      this.habitBars = MOVES.map((m, i) => {
        const x = 428 + i * 32
        const back = this.add.rectangle(x, 714, 28, 34, 0x2a0f4a).setOrigin(0, 1).setScrollFactor(0).setDepth(d)
        const bar = this.add.rectangle(x, 714, 28, 0, MOVE_COLOR[m]).setOrigin(0, 1).setScrollFactor(0).setDepth(d)
        const lab = this.add.text(x + 14, 697, m === 'punch' ? 'P' : m === 'kick' ? 'K' : 'T', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '13px', color: '#fff', stroke: '#000', strokeThickness: 3 })
          .setOrigin(0.5).setScrollFactor(0).setDepth(d + 1)
        this.mixParts.push(back, bar, lab)
        return { m, bar }
      })
    }
    this.powerLabel = this.add.text(112, 660, '', { fontFamily: 'Bangers', fontSize: '22px', color: '#ffd166', stroke: '#000', strokeThickness: 4 }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(d)
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
    const e = new Fighter(this, prefix, x, y, { hp: kind === 'grunt' ? 5 : 6 })
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
    if (e.moveTag) e.moveTag.setText('')
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
    if (L.invuln > 0 || L.st === 'down' || L.st === 'flip') return
    if (L.shield > 0) {
      this.floatText(L.x, L.y - 270, 'NO GAIN', '#5ce1d6')
      this.spark(L.x, L.y - 160, 0x5ce1d6)
      sfx(this, 'block')
      return
    }
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
    L.shield = Math.max(0, L.shield - dt)
    L.best = Math.max(0, L.best - dt)
    const p = this.presses
    const pPunch = p.take('KeyJ', 'KeyZ'), pKick = p.take('KeyK', 'KeyX'), pThrow = p.take('KeyL', 'KeyC')
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
      this.checkPickups()
      if (pPunch) {
        L.combo = this.elapsed - L.lastStrikeEnd < 0.35 ? (L.combo % 3) + 1 : 1
        this.act('punch')
      } else if (pKick) this.act('kick')
      else if (pThrow) this.act('throw')
    } else if (L.st === 'punch') {
      if (!L.hitDone && L.t > 0.08) { L.hitDone = true; this.lisaHit('punch') }
      if (L.st === 'punch' && L.t > 0.26) { L.lastStrikeEnd = this.elapsed; this.toFree() }
    } else if (L.st === 'kick') {
      if (!L.hitDone && L.t > 0.14) { L.hitDone = true; this.lisaHit('kick') }
      if (L.st === 'kick' && L.t > 0.4) this.toFree()
    } else if (L.st === 'throw') {
      if (!L.hitDone && L.t > 0.1) { L.hitDone = true; this.lisaThrow() }
      if (L.st === 'throw' && L.t > 0.42) this.toFree()
    } else if (L.st === 'flip') {
      if (L.t > 0.75) { L.lift = 0; this.toFree() }
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
    if (move === 'punch') { L.x += 14 * L.facing; sfx(this, 'whoosh') }
    if (move === 'kick') { L.x += 8 * L.facing; sfx(this, 'whooshBig') }
    if (move === 'throw') { L.x += 18 * L.facing; L.whiff = false; sfx(this, 'whoosh') }
  }

  toFree() { const L = this.lisa; L.st = 'free'; L.t = 0; L.lift = 0; L.setPose('idle') }

  // How Lisa's move meets an enemy's: 'win' (counter), 'lose' (his move beats hers), 'clash' (same), or 'open'.
  exchange(move, e) {
    if (!MOVES.includes(e.st) || e.hitDone) return 'open'
    if (this.lisa.best > 0) return 'win' // best response power-up
    if (BEATS[move] === e.st) return 'win'
    if (BEATS[e.st] === move) return 'lose'
    return 'clash'
  }

  // A free enemy may answer her attack on the spot with his own pick (readers and dealers by reading her habits).
  answer(e) {
    if (e.st !== 'free' || this.lisa.best > 0) return
    const p = e.kind === 'grunt' ? 0.25 : 0.55
    if (Math.random() >= p) return
    const mv = this.pickMove(e)
    e.st = mv; e.t = 0.5; e.hitDone = false
  }

  // his move beats hers: his attack lands now
  beaten(e) {
    const mine = this.lisa.st
    e.hitDone = true; e.setPose(e.st); e.tint(null)
    if (this.lisa.invuln > 0 || this.lisa.shield > 0) return this.hurtLisa(E_DMG[e.st], false, e)
    this.floatText(this.lisa.x, this.lisa.y - 285, `${e.st.toUpperCase()} BEATS ${mine.toUpperCase()}`, '#ff7a7a')
    this.hurtLisa(E_DMG[e.st], e.st === 'throw', e)
  }

  clash(e) {
    const L = this.lisa
    if (e.moveTag) e.moveTag.setText('')
    this.spark((L.x + e.x) / 2, L.y - 170, 0xffffff)
    this.floatText(e.x, e.y - 280, 'CLASH', '#ffffff')
    sfx(this, 'clash')
    e.st = 'hurt'; e.t = 0; e.setPose('hurt'); e.tint(null)
    e.x += 40 * L.facing
    L.x -= 30 * L.facing
  }

  lisaHit(move) {
    const L = this.lisa
    let hit = false
    for (const e of this.alive()) {
      if (e.st === 'down' || e.st === 'held' || !this.inReach(L, e, REACH[move])) continue
      this.answer(e)
      const ex = this.exchange(move, e)
      if (ex === 'lose') { this.beaten(e); return }
      if (ex === 'clash') { this.clash(e); continue }
      if (ex === 'win') {
        e.chain = 0
        this.floatText(e.x, e.y - 300, 'COUNTER!', '#7dffb0')
        this.hurtEnemy(e, move === 'kick' ? 3 : 2, 90, true)
      } else {
        // poise: the third hit in a row doesn't stagger him; he reads her move and winds up the one that beats it
        e.chain = this.elapsed - (e.lastHit ?? -9) < 0.9 ? (e.chain || 0) + 1 : 1
        e.lastHit = this.elapsed
        if (e.chain >= 4) {
          e.chain = 0
          e.hp -= 1
          e.flash()
          sfx(this, 'hit')
          this.floatText(e.x, e.y - 270, '-1', '#ffd166')
          if (e.hp <= 0) { this.hurtEnemy(e, 0, 30, true) } else {
            const mv = counterOf(move)
            e.st = mv; e.t = 0.15; e.hitDone = false; e.setPose('idle'); e.tint(TINT[mv])
            this.floatText(e.x, e.y - 310, 'READ YOU!', '#c79bff')
          }
        } else {
          const strong = move === 'kick' || L.combo === 3
          this.hurtEnemy(e, strong ? 2 : 1, strong ? 80 : 25, move === 'punch' && L.combo === 3)
        }
      }
      hit = true
    }
    if (hit) this.cam.shake(60, 0.002)
  }

  // The flip throw: grab, kick up into a handspring, and send him over her head to crash down behind her.
  lisaThrow() {
    const L = this.lisa
    const e = this.alive().filter((f) => f.st !== 'down' && f.st !== 'held' && this.inReach(L, f, REACH.throw)).sort((a, b) => Math.abs(a.x - L.x) - Math.abs(b.x - L.x))[0]
    if (!e) { L.whiff = true; return }
    this.answer(e)
    const ex = this.exchange('throw', e)
    if (ex === 'lose') { this.beaten(e); return }
    if (ex === 'clash') { L.whiff = true; this.clash(e); return }
    const counter = ex === 'win'
    L.st = 'flip'; L.t = 0; L.invuln = Math.max(L.invuln, 0.75)
    e.st = 'held'; e.t = 0; e.tint(null); e.setPose('hurt'); e.hitDone = true
    if (e.moveTag) e.moveTag.setText('')
    e.x = L.x + 70 * L.facing; e.y = L.y + 2
    this.floatText(e.x, e.y - 300, counter ? 'COUNTER THROW!' : 'THROW!', '#ffe27a')
    const lo = this.locked != null ? this.locked + 60 : 30, hi = this.locked != null ? this.locked + 1220 : this.W - 30
    const x0 = e.x, x1 = Phaser.Math.Clamp(L.x - 190 * L.facing, lo, hi)
    this.time.delayedCall(120, () => {
      L.setPose('flip')
      sfx(this, 'whooshBig')
      this.tweens.add({ targets: L, lift: { from: 0, to: 40 }, duration: 250, yoyo: true })
      this.tweens.addCounter({
        from: 0, to: 1, duration: 520, ease: 'Sine.inOut',
        onUpdate: (tw) => { const v = tw.getValue(); e.x = x0 + (x1 - x0) * v; e.lift = Math.sin(v * Math.PI) * 300; e.sprite.setAngle(-360 * v * L.facing) },
        onComplete: () => {
          e.lift = 0; e.sprite.setAngle(0)
          this.cam.shake(160, 0.008)
          this.spark(e.x, e.y - 40, 0xffe27a)
          const f = L.facing; L.facing = -f // knock him away from her
          this.hurtEnemy(e, counter ? 4 : 3, 30, true)
          L.facing = f
        },
      })
    })
  }

  // ---------------------------------------------------------------- power-ups
  dropPickup() {
    if (this.locked == null) return
    const L = this.lisa
    const low = L.hp <= L.maxHp * 0.5
    const r = Math.random()
    const type = low || r < 0.45 ? 'payoff' : r < 0.72 ? 'nash' : 'best'
    let x = this.locked + Phaser.Math.Between(300, 980)
    if (Math.abs(x - L.x) < 200) x = Phaser.Math.Clamp(L.x + (x < L.x ? -260 : 260), this.locked + 200, this.locked + 1080)
    const y = Phaser.Math.Between(LANE_TOP + 20, LANE_BOT - 10)
    const glow = this.add.ellipse(x, y, 90, 22, 0xffffff, 0.35).setDepth(3000.5)
    const img = this.add.image(x, y - 50, POWER[type].key).setDisplaySize(72, 72).setDepth(3001)
    this.tweens.add({ targets: img, y: y - 64, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' })
    this.tweens.add({ targets: glow, alpha: 0.12, duration: 600, yoyo: true, repeat: -1 })
    this.pickups.push({ type, x, y, img, glow })
  }

  checkPickups() {
    const L = this.lisa
    for (const pk of this.pickups.slice()) {
      if (Math.abs(pk.x - L.x) > 60 || Math.abs(pk.y - L.y) > 34) continue
      if (pk.type === 'payoff' && L.hp >= L.maxHp) continue // keep it for later
      this.pickups.splice(this.pickups.indexOf(pk), 1)
      pk.img.destroy(); pk.glow.destroy()
      const P = POWER[pk.type]
      if (pk.type === 'payoff') L.hp = Math.min(L.maxHp, L.hp + 6)
      if (pk.type === 'nash') L.shield = 6
      if (pk.type === 'best') L.best = 8
      sfx(this, 'pick')
      this.floatText(L.x, L.y - 300, P.name, P.color, 4200)
      const seen = `power:${pk.type}`
      if (!this.registry.get(seen)) {
        this.registry.set(seen, true)
        this.caption.show(P.tip)
        this.tipUp = true
        this.time.delayedCall(4500, () => { if (this.tipUp) { this.tipUp = false; this.caption.hide() } })
      }
    }
  }

  clearPickups() { (this.pickups || []).forEach((pk) => { pk.img.destroy(); pk.glow.destroy() }); this.pickups = [] }

  // ---------------------------------------------------------------- enemy ai
  // Readers counter Lisa's favourite move. Dealers best-respond to the frequencies of her last 8 moves, the
  // steady-state reading of section 3.2.2: against an even mix every answer is as good, so they have no read.
  pickMove(e) {
    if (e.kind === 'dealer') {
      const h = this.lisa.habits.slice(-8)
      if (h.length >= 3 && Math.random() < 0.8) {
        const f = { punch: 0, kick: 0, throw: 0 }
        h.forEach((m) => f[m]++)
        const score = (mine) => Object.keys(f).reduce((s, hers) => s + f[hers] * (BEATS[mine] === hers ? 1 : BEATS[hers] === mine ? -1 : 0), 0)
        const vals = MOVES.map((m) => [m, score(m)])
        const top = Math.max(...vals.map((v) => v[1]))
        if (top > 1) return Phaser.Utils.Array.GetRandom(vals.filter((v) => v[1] === top))[0] // a near-even 3/3/2 mix gives no read
      }
      return Phaser.Utils.Array.GetRandom(['punch', 'punch', 'kick', 'throw'])
    }
    if (e.kind === 'reader') {
      const h = this.lisa.habits.slice(-6)
      if (h.length >= 2 && Math.random() < 0.75) {
        const counts = { punch: 0, kick: 0, throw: 0 }
        h.forEach((m) => counts[m]++)
        const top = Math.max(...Object.values(counts))
        const favs = Object.keys(counts).filter((m) => counts[m] === top)
        if (favs.length === 1) return counterOf(favs[0])
      }
      return Phaser.Utils.Array.GetRandom(MOVES)
    }
    const r = Math.random()
    return r < 0.5 ? 'punch' : r < 0.8 ? 'kick' : 'throw'
  }

  updateEnemies(dt) {
    const L = this.lisa
    const alive = this.alive()
    const attackers = alive.filter((e) => MOVES.includes(e.st)).length
    const byDist = alive.filter((e) => e.st !== 'down').sort((a, b) => Math.abs(a.x - L.x) - Math.abs(b.x - L.x))
    for (const e of alive) {
      e.t += dt
      if (e.tag) e.tag.setPosition(e.x, e.y - 265 - e.lift).setDepth(e.y + 1)
      if (e.st === 'held') continue
      if (e.st === 'down') {
        if (e.hp <= 0 && e.t > 0.9) {
          e.st = 'dead'
          if (e.moveTag) e.moveTag.destroy()
          this.tweens.add({ targets: [e.sprite, e.shadow, e.tag].filter(Boolean), alpha: 0, duration: 400, onComplete: () => { e.destroy(); e.tag && e.tag.destroy() } })
        } else if (e.hp > 0 && e.t > 1.0) { e.st = 'free'; e.t = 0; e.sprite.setAngle(0); e.setPose('idle'); e.wait = 0.6 }
        continue
      }
      if (e.st === 'hurt') { if (e.t > 0.4) { e.st = 'free'; e.t = 0; e.setPose('idle'); e.wait = 0.5 + Math.random() * 0.5 } continue }
      if (e.st === 'free') {
        const rank = byDist.indexOf(e)
        const side = Math.sign(e.x - L.x) || 1
        let tx = L.x + side * (rank < 2 ? 120 : 290)
        if (this.locked != null) tx = Phaser.Math.Clamp(tx, this.locked + 70, this.locked + 1210)
        const ty = Phaser.Math.Clamp(L.y + e.laneOff, LANE_TOP, LANE_BOT)
        const dx = tx - e.x, dy = ty - e.y
        if (Math.abs(dx) > 10) e.x += Math.sign(dx) * Math.min(Math.abs(dx), 150 * dt)
        if (Math.abs(dy) > 6) e.y += Math.sign(dy) * Math.min(Math.abs(dy), 100 * dt)
        e.face(L.x > e.x ? 1 : -1)
        e.wait -= dt
        const onScreen = this.locked == null || (e.x > this.locked + 40 && e.x < this.locked + 1240)
        const close = onScreen && Math.abs(e.x - L.x) < 160 && Math.abs(e.y - L.y) < 22
        if (close && e.wait <= 0 && rank < 2) {
          if (attackers >= 1) { e.wait = 0.4; continue } // one attacker at a time
          const mv = this.pickMove(e)
          e.st = mv; e.t = 0; e.hitDone = false
          e.setPose('idle')
          e.tint(TINT[mv])
        }
        continue
      }
      if (MOVES.includes(e.st)) {
        // wind-up (tinted) for 0.5 s, then the move lands; a thrower steps in to reach her
        if (!e.hitDone && e.st === 'throw') {
          const side = Math.sign(e.x - L.x) || 1
          let gx = L.x + side * 85
          if (this.locked != null) gx = Phaser.Math.Clamp(gx, this.locked + 40, this.locked + 1240)
          e.face(L.x > e.x ? 1 : -1)
          if (Math.abs(gx - e.x) > 4) e.x += Math.sign(gx - e.x) * Math.min(Math.abs(gx - e.x), 260 * dt)
        }
        e.moveTag = e.moveTag || this.add.text(0, 0, '', { fontFamily: 'Bangers', fontSize: '26px', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5)
        e.moveTag.setText(e.hitDone ? '' : e.st.toUpperCase()).setColor(TINT_CSS[e.st]).setPosition(e.x, e.y - 300).setDepth(e.y + 2)
        if (!e.hitDone && e.t > 0.5) {
          e.hitDone = true; e.setPose(e.st); e.tint(null)
          sfx(this, e.st === 'punch' ? 'whoosh' : 'whooshBig')
          if (this.inReach(e, L, E_REACH[e.st]) && L.st !== 'down' && L.st !== 'flip' && L.invuln <= 0) {
            if (MOVES.includes(L.st) && !(L.st === 'throw' && L.whiff) && this.inReach(L, e, REACH[L.st]) && (BEATS[L.st] === e.st || L.best > 0)) {
              // her move beats his: he is countered
              this.floatText(e.x, e.y - 300, 'COUNTER!', '#7dffb0')
              this.hurtEnemy(e, 2, 80, true)
            } else {
              if (e.st === 'throw') this.floatText(L.x, L.y - 280, 'THROWN', '#ffe27a')
              this.hurtLisa(E_DMG[e.st], e.st === 'throw', e)
            }
          }
        }
        if (MOVES.includes(e.st) && e.t > 0.95) { e.st = 'free'; e.t = 0; e.setPose('idle'); e.wait = 0.7 + Math.random() * 0.7 }
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
    this.clearPickups()
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
    this.time.delayedCall(500, () => this.dropPickup())
    const w = this.wave
    this.time.delayedCall(9000, () => this.wave === w && this.lisa.hp <= this.lisa.maxHp * 0.6 && this.dropPickup())
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
    if (this.tipUp) { this.tipUp = false; this.caption.hide() }
    this.enemies.forEach((e) => { if (e.moveTag) e.moveTag.setText(''); if (MOVES.includes(e.st) && !e.hitDone) { e.st = 'free'; e.t = 0; e.tint(null); e.wait = 0.8 } })
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
    if (L.invuln > 0 && L.st !== 'flip') L.sprite.setAlpha(Math.sin(this.elapsed * 40) > 0 ? 1 : 0.4); else L.sprite.setAlpha(1)
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
    const pw = [L.shield > 0 && `SHIELD ${Math.ceil(L.shield)}`, L.best > 0 && `BEST RESPONSE ${Math.ceil(L.best)}`].filter(Boolean).join('   ')
    this.powerLabel.setText(pw)
    const auraOn = L.shield > 0 || L.best > 0
    this.aura.setVisible(auraOn)
    if (auraOn) this.aura.setPosition(L.x, L.y - 2).setDepth(L.y - 0.5).setStrokeStyle(5, L.shield > 0 ? 0x5ce1d6 : 0xffd166, 0.6 + 0.4 * Math.sin(this.elapsed * 10))
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
