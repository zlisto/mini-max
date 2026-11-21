import Phaser from 'phaser'
import { loadArt, needsFor } from '../systems/art.js'
import { bindPauseKey } from './Pause.js'
import { Dialogue, WHO } from '../ui/Dialogue.js'
import { Fighter } from '../actors/Fighter.js'
import { LEVELS } from '../data/levels.js'
import { trackPresses } from '../systems/presses.js'
import { playMusic, bindMuteKey } from '../systems/audio.js'
import { sfx } from '../systems/sfx.js'

// The ending: after the finale, the twelve setlist pages come home, Lisa and Rosie sing the whole setlist,
// Zero gets the last grudging word, and the credits roll. Then the End screen. Space or Enter skips the credits.
const SETLIST = [
  ['w0', 'The Dressing Rooms', "the Prisoner's Dilemma"],
  ['w1', 'Neon Strip', 'Nash equilibrium'],
  ['w2', 'The Casino Arcade', 'mixed strategies'],
  ['w3', 'The Hall of Mirrors', 'rationalizability'],
  ['w4', 'The Signal Tower', 'common knowledge'],
  ['w5', 'The Chain Store', 'credible threats'],
  ['w6', 'The Money Rain', 'bargaining'],
  ['w7', 'The Rematch Circuit', 'repeated games'],
  ['w8', 'The Rulebook Theater', 'implementation'],
  ['w9', 'The Fog Club', 'imperfect information'],
  ['w10', 'The Masquerade', 'sequential equilibrium'],
  ['w11', 'The Block Party', 'the core'],
  ['w12', 'The Grand Finale', 'the Shapley value and the Nash solution'],
]

export default class Ending extends Phaser.Scene {
  constructor() { super('Ending') }

  preload() { loadArt(this, needsFor('Ending')) }

  create() {
    this.pages = null; this.setlistLabel = null; this.credits = false; this.leaving = false
    const outfit = this.registry.get('outfit') || 'lisap'
    this.L = { skin: outfit } // the dialogue box shows Lisa in the outfit she finished in
    this.cameras.main.fadeIn(900)
    playMusic(this, 'ending_theme', 0.4)
    bindMuteKey(this)
    bindPauseKey(this)
    this.presses = trackPresses(this)
    this.add.image(640, 360, 'finale_far').setDisplaySize(1280, 720)
    this.add.image(640, 590, 'finale_stage').setOrigin(0.5, 1).setScale(0.75).setAlpha(0.9)
    this.add.rectangle(640, 690, 1280, 110, 0x0b0614, 0.55)

    // the crowd's light sticks
    this.sticks = Array.from({ length: 70 }, (_, i) => {
      const s = this.add.circle(20 + ((i * 181) % 1240), 400 + ((i * 97) % 150), 3 + (i % 3), [0xff5fa2, 0xffd166, 0x5ce1d6, 0xffffff][i % 4], 0.5)
      this.tweens.add({ targets: s, alpha: { from: 0.25, to: 0.85 }, duration: 600 + (i % 7) * 90, yoyo: true, repeat: -1, delay: (i * 37) % 600 })
      return s
    })

    this.lisa = new Fighter(this, outfit, 470, 660, { artFacing: 1 })
    this.lisa.face(1)
    this.juno = new Fighter(this, 'juno', 820, 660, { artFacing: -1 })
    this.juno.face(-1)
    this.zero = new Fighter(this, 'zero', 1060, 640, { artFacing: -1 })
    this.zero.face(-1)
    this.zero.sprite.setAlpha(0); this.zero.shadow.setAlpha(0)
    ;[this.lisa, this.juno, this.zero].forEach((f) => f.sync())
    this.dlg = new Dialogue(this, { top: true })

    this.time.delayedCall(700, () => this.dlg.play([
      { text: 'The last chord fades, and twelve torn pages drift down from the rafters.', do: () => this.pagesHome() },
      { who: 'juno', text: 'Every page we wrote is back. I thought Zero had torn this song apart for good.' },
      { who: 'lisa', text: 'He tore it into twelve pieces, and every piece taught me something. Let\'s sing the whole thing.' },
      { text: 'Lisa and Rosie sing the setlist from the first page to the last, and the whole stadium sings with them.', do: () => this.duet() },
      { who: 'zero', text: 'Two stars sharing one spotlight. The critics will hate it, my dears.', do: () => this.tweens.add({ targets: [this.zero.sprite, this.zero.shadow], alpha: { from: 0, to: 1 }, duration: 700 }) },
      { who: 'zero', text: 'Although I may have hummed along, just the once.' },
      { who: 'tempo', text: 'The city wants an encore, Lisa. Take a bow with Rosie first, and then give them one.' },
    ], () => this.rollCredits()))
  }

  // the pages fly in from all sides and stack into one setlist
  pagesHome() {
    this.pages = []
    for (let i = 0; i < 12; i++) {
      const fromLeft = i % 2 === 0
      const p = this.add.image(fromLeft ? -60 - i * 20 : 1340 + i * 20, 120 + (i * 53) % 260, 'setlist_page').setScale(1.1).setAngle(Phaser.Math.Between(-40, 40)).setDepth(3000)
      this.tweens.add({ targets: p, x: 640 + (i - 5.5) * 14, y: 300 - Math.abs(i - 5.5) * 3, angle: (i - 5.5) * 3, scale: 1.4, duration: 900, delay: 250 + i * 170, ease: 'Sine.inOut',
        onComplete: () => { sfx(this, 'pick'); if (i === 11) this.setlistDone() } })
      this.pages.push(p)
    }
  }

  setlistDone() {
    if (this.setlistLabel) return
    const t = this.add.text(640, 380, 'THE SETLIST, ALL TWELVE PAGES', { fontFamily: 'Bangers', fontSize: '40px', color: '#ffd166', stroke: '#ff5fa2', strokeThickness: 6 }).setOrigin(0.5).setDepth(3001).setAlpha(0)
    this.tweens.add({ targets: t, alpha: 1, duration: 500 })
    this.tweens.add({ targets: this.pages, scale: 1.55, duration: 300, yoyo: true })
    this.setlistLabel = t
  }

  // the duet: the two step together, notes rise and the light sticks surge
  duet() {
    if (this.pages) {
      // a quick click can start the duet before every page has landed: settle them on the stack first
      this.pages.forEach((p, i) => { this.tweens.killTweensOf(p); p.setPosition(640 + (i - 5.5) * 14, 300 - Math.abs(i - 5.5) * 3).setAngle((i - 5.5) * 3).setScale(1.4) })
      this.tweens.add({ targets: this.pages, alpha: 0.35, y: '-=40', duration: 700 })
    }
    if (this.setlistLabel) this.tweens.add({ targets: this.setlistLabel, alpha: 0, duration: 500 })
    this.tweens.add({ targets: this.lisa, x: 560, duration: 700 })
    this.lisa.setPose('sing'); this.juno.setPose('sing') // falls back to idle if a pose is missing
    this.tweens.add({ targets: this.juno, x: 720, duration: 700 })
    this.sticks.forEach((s, i) => this.tweens.add({ targets: s, y: s.y - 30, duration: 400, yoyo: true, repeat: 5, delay: (i % 10) * 60 }))
    for (let k = 0; k < 16; k++) this.time.delayedCall(200 + k * 260, () => {
      const n = this.add.text(600 + ((k * 47) % 90), 440, k % 3 ? '♪' : '♫', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '42px', color: ['#ff5fa2', '#5ce1d6', '#ffd166'][k % 3], stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(3002)
      this.tweens.add({ targets: n, y: 220, x: n.x + (k % 2 ? 40 : -40), alpha: 0, duration: 1800, onComplete: () => n.destroy() })
    })
    sfx(this, 'sting')
  }

  rollCredits() {
    // a rival's full stage name, as the dialogue box shows it, in title case
    const full = (who) => (WHO[who] ? WHO[who].name : who).toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase())
    this.credits = true
    const shade = this.add.rectangle(640, 360, 1280, 720, 0x0b0614, 0.78).setDepth(3900).setAlpha(0)
    this.tweens.add({ targets: shade, alpha: 1, duration: 900 })
    const lines = [
      ['MINI MAX', 'big'],
      ['starring Lisa "Mini" Maxobal', 'gold'],
      ['with Rosie, Tempo and Impresario Zero', 'plain'],
      ['', 'gap'],
      ['THE SETLIST', 'head'],
      ...SETLIST.map(([id, name, topic], i) => [`${i === 0 ? 'Prologue' : `${i}.`}  ${name}  ·  ${topic}`, 'plain']),
      ['', 'gap'],
      ['THE RIVALS', 'head'],
      ...SETLIST.filter(([id]) => LEVELS[id] && LEVELS[id].elite && LEVELS[id].boss).map(([id, name]) => [`${name}  ·  ${full(LEVELS[id].elite.who)} and ${full(LEVELS[id].boss.who)}`, 'plain']),
      ['', 'gap'],
      ['Based on A Course in Game Theory', 'gold'],
      ['by Martin J. Osborne and Ariel Rubinstein (MIT Press, 1994)', 'plain'],
      ['', 'gap'],
      ['Created by Tauhid Zaman', 'gold'],
      ['for the Arcade of Alexandria', 'plain'],
      ['', 'gap'],
      ['Thanks for playing!', 'big2'],
    ]
    const styles = {
      big: { fontFamily: 'Bangers', fontSize: '84px', color: '#ffd166', stroke: '#ff5fa2', strokeThickness: 8 },
      big2: { fontFamily: 'Bangers', fontSize: '56px', color: '#ffd166', stroke: '#ff5fa2', strokeThickness: 6 },
      head: { fontFamily: 'Bangers', fontSize: '40px', color: '#ff5fa2' },
      gold: { fontFamily: 'Nunito', fontStyle: '800', fontSize: '28px', color: '#ffd166' },
      plain: { fontFamily: 'Nunito', fontStyle: '800', fontSize: '24px', color: '#ffffff' },
    }
    const c = this.add.container(0, 760).setDepth(4000)
    let y = 0
    lines.forEach(([s, k]) => {
      if (k === 'gap') { y += 50; return }
      const t = this.add.text(640, y, s, styles[k]).setOrigin(0.5, 0)
      c.add(t)
      y += t.height + (k === 'big' ? 18 : 10)
    })
    this.skipHint = this.add.text(1250, 700, 'Press Space to skip', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '18px', color: '#c9b8ec' }).setOrigin(1, 1).setDepth(4001)
    this.tweens.add({ targets: c, y: -y - 40, duration: (y + 800) * 14, ease: 'Linear', onComplete: () => this.finish() })
  }

  finish() {
    if (this.leaving) return
    this.leaving = true
    this.cameras.main.fadeOut(900)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('End', { level: 'w12' }))
  }

  update(_, dms) {
    const dt = dms / 1000
    this.dlg.update(dt)
    ;[this.lisa, this.juno, this.zero].forEach((f) => f.sprite.active && f.sync(dt))
    if (this.credits && this.presses.take('Space', 'Enter')) this.finish()
    this.presses.clear()
  }
}
