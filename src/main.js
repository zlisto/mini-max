import Phaser from 'phaser'
import Boot from './scenes/Boot.js'
import Title from './scenes/Title.js'
import Prologue from './scenes/Prologue.js'
import Street from './scenes/Street.js'
import End from './scenes/End.js'
import Pause from './scenes/Pause.js'
import Ending from './scenes/Ending.js'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#0b0614',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [Boot, Title, Prologue, Street, End, Ending, Pause],
})

// Dev hooks for playtests and critics.
const SCENES = ['Title', 'Prologue', 'Street', 'End', 'Ending']
window.__minimax = {
  game,
  // warp('Street', { level: 'w2', checkpoint: 2 })  checkpoints: 0 start, 1 second wave, 2 elite standoff, 3 wave before the boss, 4 boss
  warp(name, data = {}) {
    ;[...SCENES, 'Pause'].forEach((s) => (game.scene.isActive(s) || game.scene.isPaused(s)) && game.scene.stop(s))
    game.scene.start(name, data)
  },
  active() { return SCENES.filter((s) => game.scene.isActive(s)) },
  scene() { return game.scene.getScene(this.active()[0]) },
  getState() { const s = this.scene(); return s && s.debugState ? s.debugState() : null },
  solve() { const s = this.scene(); return s && s.debugSolve ? s.debugSolve() : 'nothing to solve' },
  heal() { const s = this.scene(); if (s && s.lisa) { s.lisa.hp = s.lisa.maxHp; return s.lisa.hp } },
}
