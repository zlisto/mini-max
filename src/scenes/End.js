import Phaser from 'phaser'
import { BOOK_NOTES } from '../data/games.js'
import { bindMuteKey } from '../systems/audio.js'
import { sfx } from '../systems/sfx.js'

export default class End extends Phaser.Scene {
  constructor() { super('End') }

  create() {
    this.cameras.main.fadeIn(600)
    bindMuteKey(this)
    this.add.image(640, 360, 'title_bg').setDisplaySize(1280, 720)
    this.add.rectangle(640, 360, 1280, 720, 0x0b0614, 0.82)
    this.add.image(1110, 140, 'setlist_page').setScale(1.6).setAngle(-8)
    this.add.text(640, 70, 'NEON STRIP CLEARED', { fontFamily: 'Bangers', fontSize: '72px', color: '#ffd166', stroke: '#ff5fa2', strokeThickness: 6 }).setOrigin(0.5)
    this.add.text(640, 128, 'Setlist page 1 of 12 recovered', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '24px', color: '#fff' }).setOrigin(0.5)
    this.add.text(150, 180, 'WHAT YOU USED, FROM THE BOOK', { fontFamily: 'Bangers', fontSize: '30px', color: '#ff5fa2' })
    BOOK_NOTES.forEach(([idea, ref], i) => {
      const y = 226 + i * 40
      this.add.text(150, y, idea, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '21px', color: '#ffffff' })
      this.add.text(1130, y, ref, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '19px', color: '#b9a6e0' }).setOrigin(1, 0)
    })
    this.add.text(640, 528, '† The Strike / Guard / Grab triangle and the fight-card numbers are inventions of this game, not from the book.\nThe ideas they illustrate are the book\'s: Osborne & Rubinstein, A Course in Game Theory (MIT Press, 1994), Chapter 2.', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '16px', color: '#b9a6e0', align: 'center',
    }).setOrigin(0.5)
    this.add.text(640, 590, 'End of the prototype. Next stop: the Casino Arcade (mixed strategies, Chapter 3).', {
      fontFamily: 'Nunito', fontStyle: '800', fontSize: '20px', color: '#ffd166',
    }).setOrigin(0.5)
    const btn = (x, label, go) => {
      const b = this.add.text(x, 650, label, { fontFamily: 'Bangers', fontSize: '32px', color: '#fff', backgroundColor: '#2a0f4a', padding: { x: 18, y: 8 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true })
      b.on('pointerdown', () => { sfx(this, 'select'); go() }).on('pointerover', () => b.setColor('#ffd166')).on('pointerout', () => b.setColor('#fff'))
    }
    btn(500, 'Replay Neon Strip', () => this.scene.start('Street', { checkpoint: 0 }))
    btn(800, 'Title', () => this.scene.start('Title'))
  }
}
