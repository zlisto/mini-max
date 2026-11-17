// Event-based key presses, so a tap that goes down and up inside one frame is never lost.
// Call take(...codes) to consume a press this frame; the scene calls clear() at the end of update().
export function trackPresses(scene) {
  const set = new Set()
  scene.input.keyboard.on('keydown', (ev) => { if (!ev.repeat) set.add(ev.code) })
  return {
    take(...codes) {
      let hit = false
      codes.forEach((c) => { if (set.delete(c)) hit = true })
      return hit
    },
    clear() { set.clear() },
  }
}
