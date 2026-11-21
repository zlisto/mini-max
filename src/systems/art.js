// Load art per scene instead of all at once, so phones don't run out of memory.
// Each scene's preload() calls loadArt(this, needs): it queues only the missing textures,
// and once the scene is up, drops textures nothing on screen needs any more.
import { LEVELS } from '../data/levels.js'

// art every scene may use: Lisa's black outfit, Rosie, Zero, Tempo, power-ups, the fallback grunt
const ALWAYS = new Set(['lisa', 'juno', 'zero', 'tempo', 'fx', 'grunt'])
const prefixOf = (id) => id.split('_')[0]
const isJpg = (id) => id.endsWith('_far') || id.endsWith('_ground') || id === 'prologue_bg' || id === 'title_bg'

let manifest = {}
export function setManifest(m) { manifest = m }

const byPrefix = (prefixes) => Object.keys(manifest).filter((id) => prefixes.has(prefixOf(id)))

// Everything one world uses: its scenery by key, plus every character its data names
// (enemy kinds, elites, bosses, speakers, Lisa's outfit). Over-matching a word only loads a little extra.
const levelCache = {}
function levelArt(levelId) {
  if (levelCache[levelId]) return levelCache[levelId]
  const L = LEVELS[levelId] || LEVELS.w1
  const a = L.art || L
  const ids = new Set()
  ;[a.far, a.ground, ...(a.mids || []), a.stage && a.stage.key, ...(a.fg || []).map((f) => f[0])].forEach((k) => k && ids.add(k))
  const words = new Set(JSON.stringify(L).match(/[a-z][a-z0-9]*/g))
  const chars = new Set([...new Set(Object.keys(manifest).map(prefixOf))].filter((p) => words.has(p) && !SCENERY.has(p)))
  byPrefix(chars).forEach((id) => ids.add(id))
  return (levelCache[levelId] = ids)
}
const SCENERY = new Set(['fg', ...Object.values(LEVELS).map((L) => prefixOf((L.art || L).far || ''))])

// What each scene needs (on top of ALWAYS)
export function needsFor(key, data = {}) {
  if (key === 'Street') return levelArt(data.level || 'w1')
  if (key === 'Title') return new Set(byPrefix(new Set(['title'])))
  if (key === 'Prologue') return new Set(byPrefix(new Set(['prologue'])))
  if (key === 'Ending') return new Set(['finale_far', 'finale_stage', ...byPrefix(new Set(['lisag', 'lisar', 'lisap']))])
  return new Set()
}

export function alwaysArt() { return new Set(byPrefix(ALWAYS)) }

export function loadArt(scene, needs) {
  const want = new Set([...alwaysArt(), ...needs])
  want.forEach((id) => { if (manifest[id] && !scene.textures.exists(id)) scene.load.image(id, `art/${id}.${isJpg(id) ? 'jpg' : 'png'}`) })
  // a thin bar while a world's art comes in
  if (scene.load.list.size) {
    const bar = scene.add.rectangle(340, 360, 4, 10, 0xff5fa2).setOrigin(0, 0.5)
    const label = scene.add.text(640, 330, 'LOADING…', { fontFamily: 'Bangers', fontSize: '34px', color: '#ffd166' }).setOrigin(0.5)
    const onProgress = (p) => { if (bar.active) bar.setSize(600 * p, 10) }
    scene.load.on('progress', onProgress)
    scene.load.once('complete', () => { scene.load.off('progress', onProgress); bar.destroy(); label.destroy() })
  }
  // once this scene is drawn, free what nothing here uses
  scene.events.once('create', () => scene.time.delayedCall(0, () => {
    Object.keys(manifest).forEach((id) => { if (!want.has(id) && scene.textures.exists(id)) scene.textures.remove(id) })
  }))
}
