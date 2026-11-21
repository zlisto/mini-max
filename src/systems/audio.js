// Music + mute. The mute flag persists in localStorage['minimax-muted'] ('1' = muted); playtests set it first.
import { TOUR_MUSIC } from '../data/localMusic.js'
const KEY = 'minimax-muted'

// Where each track lives. Tracks load only when a scene asks for one, and only one stays decoded,
// because a decoded song takes tens of megabytes (too much for a phone to hold all of them).
const TRACKS = { level_01: ['music/level_01.ogg', 'music/Level_01.mp3'] }
Object.entries(TOUR_MUSIC).forEach(([k, f]) => { TRACKS[k] = [`music/tour/${f}`] })
let wanted = null

export function isMuted() {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

export function setMuted(game, muted) {
  try { localStorage.setItem(KEY, muted ? '1' : '0') } catch { /* private mode */ }
  game.sound.mute = muted
}

// Start a looping track unless it is already playing; stop any other music.
export function playMusic(scene, key, volume = 0.45) {
  const sm = scene.sound
  sm.mute = isMuted()
  wanted = key
  sm.getAllPlaying().forEach((s) => { if (s.key !== key && s.isMusic) s.stop() })
  // drop other songs from memory
  Object.keys(TRACKS).forEach((k) => { if (k !== key && scene.cache.audio.exists(k)) { sm.removeByKey(k); scene.cache.audio.remove(k) } })
  let track = sm.get(key)
  if (track && track.isPlaying) return track
  if (!scene.cache.audio.exists(key)) {
    if (!TRACKS[key]) return null
    // fetch it in the background and start it when it arrives, if this scene still wants it
    scene.load.audio(key, TRACKS[key])
    scene.load.once(`filecomplete-audio-${key}`, () => {
      if (wanted !== key || !(scene.sys.isActive() || scene.sys.isPaused())) return
      const t = playMusic(scene, key, volume)
      if (t && scene.sys.isPaused()) t.pause() // Resume brings it in
    })
    scene.load.start()
    return null
  }
  track = track || sm.add(key, { loop: true, volume })
  track.isMusic = true
  track.play()
  return track
}

export function stopMusic(scene) {
  scene.sound.getAllPlaying().forEach((s) => s.isMusic && s.stop())
}

// M toggles mute in any scene that calls this.
export function bindMuteKey(scene) {
  scene.input.keyboard.on('keydown-M', () => setMuted(scene.game, !isMuted()))
}
