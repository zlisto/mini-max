// Music + mute. The mute flag persists in localStorage['minimax-muted'] ('1' = muted); playtests set it first.
const KEY = 'minimax-muted'

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
  sm.getAllPlaying().forEach((s) => { if (s.key !== key && s.isMusic) s.stop() })
  let track = sm.get(key)
  if (track && track.isPlaying) return track
  if (!scene.cache.audio.exists(key)) return null
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
