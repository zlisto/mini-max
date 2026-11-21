// Touch controls for phones and tablets. A layer of HTML buttons over the game that presses the same
// keys a keyboard would, so the game itself doesn't know the difference.
//   left thumb: a floating stick (arrow keys); flick the same way twice to dash
//   right thumb: PUNCH (J), KICK (K), THROW (L), BLITZ (→→J), and OK (Space) for cards and talk
//   corners: pause (Esc), sound (M), and the outfit switch (O) in the finale
import { isMuted } from './audio.js'

const KC = { ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40, KeyJ: 74, KeyK: 75, KeyL: 76, KeyO: 79, KeyM: 77, Escape: 27, Space: 32, Enter: 13 }
const KEYNAME = { ArrowLeft: 'ArrowLeft', ArrowUp: 'ArrowUp', ArrowRight: 'ArrowRight', ArrowDown: 'ArrowDown', Escape: 'Escape', Space: ' ', Enter: 'Enter' }

function send(type, code) {
  const ev = new KeyboardEvent(type, { code, key: KEYNAME[code] || code.replace('Key', '').toLowerCase(), bubbles: true, cancelable: true })
  Object.defineProperty(ev, 'keyCode', { get: () => KC[code] })
  Object.defineProperty(ev, 'which', { get: () => KC[code] })
  window.dispatchEvent(ev)
}
const tapKey = (code) => { send('keydown', code); send('keyup', code) }

export function isTouchDevice() {
  return (navigator.maxTouchPoints > 0 || 'ontouchstart' in window) && window.matchMedia('(pointer: coarse)').matches
}

const CSS = `
#touch { position: fixed; inset: 0; pointer-events: none; z-index: 20; font-family: Bangers, sans-serif; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
#touch .zone { position: absolute; left: 0; bottom: 0; width: 46%; height: 72%; pointer-events: auto; touch-action: none; }
#touch .base { position: absolute; width: 132px; height: 132px; margin: -66px 0 0 -66px; border-radius: 50%; border: 3px solid rgba(255,255,255,.35); background: rgba(20,8,30,.28); display: none; }
#touch .knob { position: absolute; left: 50%; top: 50%; width: 60px; height: 60px; margin: -30px 0 0 -30px; border-radius: 50%; background: rgba(255,95,162,.75); border: 3px solid rgba(255,255,255,.7); }
#touch .hint { position: absolute; left: calc(10% + env(safe-area-inset-left)); bottom: calc(14% + env(safe-area-inset-bottom)); width: 96px; height: 96px; border-radius: 50%; border: 3px dashed rgba(255,255,255,.28); color: rgba(255,255,255,.5); font-size: 15px; display: flex; align-items: center; justify-content: center; text-align: center; pointer-events: none; }
#touch .btn { position: absolute; pointer-events: auto; touch-action: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; text-shadow: 0 2px 0 #000; letter-spacing: 1px; border: 3px solid rgba(255,255,255,.65); box-shadow: 0 4px 0 rgba(0,0,0,.35); }
#touch .btn.down { transform: translateY(3px) scale(.94); filter: brightness(1.35); box-shadow: none; }
#touch .btn.off { opacity: .35; }
#touch .act { width: 58px; height: 58px; font-size: 15px; }
#touch .punch { right: calc(76px + env(safe-area-inset-right)); bottom: calc(8px + env(safe-area-inset-bottom)); background: rgba(255,95,162,.5); }
#touch .kick  { right: calc(10px + env(safe-area-inset-right));  bottom: calc(44px + env(safe-area-inset-bottom)); background: rgba(92,225,214,.5); }
#touch .throw { right: calc(70px + env(safe-area-inset-right)); bottom: calc(74px + env(safe-area-inset-bottom)); background: rgba(255,209,102,.58); color: #2a0f4a; text-shadow: none; }
#touch .blitz { right: calc(8px + env(safe-area-inset-right)); bottom: calc(110px + env(safe-area-inset-bottom)); width: 48px; height: 48px; font-size: 12px; background: rgba(160,90,255,.55); }
#touch .ok    { right: calc(12px + env(safe-area-inset-right)); bottom: calc(12px + env(safe-area-inset-bottom)); width: 78px; height: 78px; font-size: 24px; background: rgba(255,209,102,.88); color: #2a0f4a; text-shadow: none; }
#touch .small { width: 42px; height: 42px; font-size: 17px; background: rgba(20,8,30,.6); }
#touch .outfit { font-size: 13px; }
#touch .pad { width: 52px; height: 52px; font-size: 22px; border-radius: 16px; background: rgba(20,8,30,.62); }
#touch .pu { right: calc(68px + env(safe-area-inset-right)); bottom: calc(126px + env(safe-area-inset-bottom)); }
#touch .pd { right: calc(68px + env(safe-area-inset-right)); bottom: calc(6px + env(safe-area-inset-bottom)); }
#touch .pl { right: calc(128px + env(safe-area-inset-right)); bottom: calc(66px + env(safe-area-inset-bottom)); }
#touch .pr { right: calc(8px + env(safe-area-inset-right)); bottom: calc(66px + env(safe-area-inset-bottom)); }
#touch .ok.mid { right: calc(64px + env(safe-area-inset-right)); bottom: calc(62px + env(safe-area-inset-bottom)); width: 60px; height: 60px; font-size: 20px; }
#touch .dash { right: calc(64px + env(safe-area-inset-right)); bottom: calc(142px + env(safe-area-inset-bottom)); width: 48px; height: 48px; font-size: 12px; background: rgba(255,154,92,.55); }
#touch .blitz { --p: 100%; background-image: conic-gradient(rgba(255,255,255,.35) var(--p), transparent 0); }
#touch .hide { display: none !important; }
`

export function installTouch(game) {
  const style = document.createElement('style')
  style.textContent = CSS
  document.head.appendChild(style)
  const root = document.createElement('div')
  root.id = 'touch'
  document.body.appendChild(root)
  const el = (cls, html = '') => { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; root.appendChild(d); return d }

  // ---- the stick
  const zone = el('zone'), base = document.createElement('div'), knob = document.createElement('div'), hint = el('hint', 'SLIDE<br>TO MOVE')
  base.className = 'base'; knob.className = 'knob'; base.appendChild(knob); zone.appendChild(base)
  let stick = null // { id, x, y }
  let usedStick = false
  const held = new Set()
  const setHeld = (want) => {
    held.forEach((c) => { if (!want.has(c)) { send('keyup', c); held.delete(c) } })
    want.forEach((c) => { if (!held.has(c)) { send('keydown', c); held.add(c) } })
  }
  const release = () => { setHeld(new Set()); stick = null; base.style.display = 'none' }
  zone.addEventListener('touchstart', (e) => {
    e.preventDefault()
    if (stick) return
    const t = e.changedTouches[0], r = zone.getBoundingClientRect()
    stick = { id: t.identifier, x: t.clientX, y: t.clientY }
    base.style.left = `${t.clientX - r.left}px`; base.style.top = `${t.clientY - r.top}px`; base.style.display = 'block'
    knob.style.transform = ''
    hint.classList.add('hide'); usedStick = true
  }, { passive: false })
  zone.addEventListener('touchmove', (e) => {
    e.preventDefault()
    if (!stick) return
    const t = [...e.changedTouches].find((q) => q.identifier === stick.id)
    if (!t) return
    let dx = t.clientX - stick.x, dy = t.clientY - stick.y
    const d = Math.hypot(dx, dy), max = 54
    if (d > max) { dx *= max / d; dy *= max / d }
    knob.style.transform = `translate(${dx}px, ${dy}px)`
    const want = new Set()
    if (d > 16) {
      const a = Math.atan2(dy, dx) // 8 directions
      if (Math.cos(a) > 0.38) want.add('ArrowRight')
      if (Math.cos(a) < -0.38) want.add('ArrowLeft')
      if (Math.sin(a) > 0.38) want.add('ArrowDown')
      if (Math.sin(a) < -0.38) want.add('ArrowUp')
    }
    setHeld(want)
  }, { passive: false })
  const end = (e) => { if (stick && [...e.changedTouches].some((q) => q.identifier === stick.id)) release() }
  zone.addEventListener('touchend', end); zone.addEventListener('touchcancel', end)

  // ---- buttons
  const button = (cls, label, onDown, repeat = false) => {
    const b = el(`btn ${cls}`, label)
    let rep = null
    const stop = () => { clearTimeout(rep); clearInterval(rep); rep = null }
    b.addEventListener('touchstart', (e) => {
      e.preventDefault(); b.classList.add('down'); onDown()
      if (repeat) { stop(); rep = setTimeout(() => { rep = setInterval(onDown, 110) }, 380) }
    }, { passive: false })
    const up = (e) => { e.preventDefault(); b.classList.remove('down'); stop() }
    b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false })
    return b
  }
  const scene = () => window.__minimax && window.__minimax.scene()
  const punch = button('act punch', 'PUNCH', () => tapKey('KeyJ'))
  const kick = button('act kick', 'KICK', () => tapKey('KeyK'))
  const thr = button('act throw', 'THROW', () => tapKey('KeyL'))
  const blitz = button('blitz', 'BLITZ', () => {
    const s = scene(); if (!s || !s.lisa || s.blitzCd > 0) return
    const dir = s.lisa.facing < 0 ? 'ArrowLeft' : 'ArrowRight'
    const was = held.has(dir)
    if (was) { send('keyup', dir); held.delete(dir) }
    tapKey(dir); tapKey(dir); tapKey('KeyJ')
    if (was) { send('keydown', dir); held.add(dir) }
  })
  const ok = button('ok', 'OK', () => tapKey('Space'))
  // DASH: the double flick, as one button
  const dash = button('dash', 'DASH', () => {
    const s = scene(); if (!s || !s.lisa) return
    const dir = s.lisa.facing < 0 ? 'ArrowLeft' : 'ArrowRight'
    const was = held.has(dir)
    if (was) { send('keyup', dir); held.delete(dir) }
    tapKey(dir); tapKey(dir)
    if (was) { send('keydown', dir); held.add(dir) }
  })
  // arrows for the cards (they're steered like menus)
  const pads = [['pad pu', '▲', 'ArrowUp'], ['pad pd', '▼', 'ArrowDown'], ['pad pl', '◀', 'ArrowLeft'], ['pad pr', '▶', 'ArrowRight']].map(([c, l, k]) => button(c, l, () => tapKey(k), true))
  const pause = button('small pause', '❚❚', () => { release(); tapKey('Escape') })
  const mute = button('small mute', '♪', () => { tapKey('KeyM'); setTimeout(paintMute, 0) })
  const outfit = button('small outfit', 'LOOK', () => tapKey('KeyO'))
  const paintMute = () => { mute.innerHTML = isMuted() ? '🔇' : '🔊' }
  paintMute()

  // ---- show what the moment needs
  const show = (b, on) => b.classList.toggle('hide', !on)
  let last = ''
  const tick = () => {
    const mm = window.__minimax
    const keys = mm ? mm.active() : []
    const paused = game.scene.isActive('Pause')
    const s = mm && mm.scene()
    const street = keys.includes('Street') && !paused
    const brawl = street && s && s.mode === 'brawl'
    const talk = (street && !brawl) || keys.includes('Ending') || (keys.includes('Prologue') && !paused)
    const cards = street && s && s.mode === 'standoff'
    // the fight cards (World 1) are answered with a punch, kick or throw
    const moves = cards && s.so && s.so.touchMoves
    const choosing = keys.includes('Prologue') && s && s.choosing
    const state = [keys.join('+'), brawl, talk, cards, !!moves, !!choosing, street, paused, !!(s && s.L && s.L.outfits)].join()
    if (state !== last) {
      last = state
      if (!brawl) release()
      show(zone, brawl); show(hint, brawl && !usedStick)
      ;[punch, kick, thr].forEach((b) => show(b, brawl || moves))
      show(blitz, brawl); show(dash, brawl)
      ok.classList.toggle('mid', !!cards && !moves)
      show(ok, talk && !moves && !choosing)
      pads.forEach((b) => show(b, cards && !moves))
      show(pause, (street || keys.includes('Prologue')) && !paused)
      show(mute, !paused && keys.length > 0)
      show(outfit, brawl && !!(s && s.L && s.L.outfits))
    }
    if (brawl && s) { blitz.classList.toggle('off', s.blitzCd > 0); blitz.style.setProperty('--p', `${Math.round(100 * (1 - (s.blitzCd || 0) / (s.blitzMax || 3.5)))}%`) }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
  const layout = () => {
    const c = game.canvas.getBoundingClientRect()
    const margin = window.innerWidth - c.right
    const side = margin >= 46
    ;[pause, mute, outfit].forEach((b, i) => {
      b.style.right = side ? `${Math.max(2, (margin - 42) / 2)}px` : `${8 + i * 50}px`
      b.style.top = side ? `${c.top + 8 + i * 50}px` : `${c.top + c.height * 0.23}px`
    })
  }
  layout()
  game.scale.on('resize', layout)
  window.addEventListener('resize', () => setTimeout(layout, 50))
  // a lost focus mustn't leave Lisa walking; turning the phone upright or leaving the app pauses the fight
  window.addEventListener('blur', release)
  const autoPause = () => {
    release()
    const k = window.__minimax ? window.__minimax.active() : []
    if ((k.includes('Street') || k.includes('Prologue')) && !game.scene.isActive('Pause')) tapKey('Escape')
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause() })
  const portrait = window.matchMedia('(orientation: portrait)')
  const onTurn = () => { if (portrait.matches) autoPause() }
  if (portrait.addEventListener) portrait.addEventListener('change', onTurn); else portrait.addListener(onTurn)
}

// Before the first tap: go fullscreen and sideways where the browser allows it, and wake the sound.
export function installTapToPlay(game) {
  const gate = document.createElement('div')
  gate.id = 'tapgate'
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
  gate.innerHTML = `<div class="t1">MINI MAX</div><div class="t2">TAP TO PLAY</div><div class="t3">Best played sideways.${ios ? ' For full screen, tap Share, then Add to Home Screen.' : ''}</div>`
  const style = document.createElement('style')
  style.textContent = `
#tapgate { position: fixed; inset: 0; z-index: 30; background: #0b0614; color: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; text-align: center; padding: 16px; font-family: Nunito, sans-serif; touch-action: manipulation; }
#tapgate .t1 { font-family: Bangers, sans-serif; font-size: 64px; color: #ff5fa2; letter-spacing: 3px; text-shadow: 0 4px 0 #2a0f4a; }
#tapgate .t2 { font-family: Bangers, sans-serif; font-size: 34px; color: #ffd166; animation: pulse 1.1s ease-in-out infinite; }
#tapgate .t3 { font-weight: 800; font-size: 14px; color: #c9b8e8; max-width: 420px; }
@keyframes pulse { 50% { opacity: .45 } }`
  document.head.appendChild(style)
  document.body.appendChild(gate)
  const go = (e) => {
    e.preventDefault()
    gate.remove()
    const de = document.documentElement
    const fs = de.requestFullscreen || de.webkitRequestFullscreen
    if (fs && !window.matchMedia('(display-mode: standalone)').matches) {
      try { const p = fs.call(de, { navigationUI: 'hide' }); if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {}) } catch { /* not allowed */ }
    }
    try { const ctx = game.sound.context; if (ctx && ctx.state !== 'running') ctx.resume() } catch { /* no web audio */ }
  }
  gate.addEventListener('touchend', go, { passive: false })
  gate.addEventListener('click', go)
}

// On touch screens, words that name keys name the on-screen buttons instead.
const RULES = [
  [/Move: arrows \/ WASD.*$/, ''],
  [/UP\/DOWN or W\/S choose · ENTER or SPACE select · click works too · M music/, 'Tap to choose'],
  [/Press O to switch/g, 'Tap LOOK to switch'],
  [/^PRESS ENTER/, 'TAP HERE'],
  [/LEVEL SELECT {3}←\/→ world {3}1\/2\/3 start/, 'LEVEL SELECT   tap a world, then where to start'],
  [/ Press Enter\./g, ''],
  [/Press Space to skip/g, 'Tap OK to skip'],
  [/with the arrow keys/g, 'with the arrows'],
  [/arrow keys/g, 'arrows'],
  [/[Pp]ress SPACE/g, 'tap OK'],
  [/SPACE/g, 'OK'],
  [/LEFT\/RIGHT ±1 · UP\/DOWN ±10/g, '◀ ▶ change by 1 · ▲ ▼ by 10'],
  [/LEFT\/RIGHT/g, '◀ ▶'],
  [/UP\/DOWN/g, '▲ ▼'],
  [/BLITZ ▶▶J/g, 'BLITZ'],
  [/So J punches, K kicks and L throws\./g, 'So PUNCH, KICK and THROW.'],
  [/\s*\(ESC\)/g, ''],
  [/W\/S/g, '▲ ▼'],
  [/A\/D/g, '◀ ▶'],
  [/LEFT and RIGHT/g, '◀ and ▶'],
  [/ARROWS/g, 'ARROWS ◀▲▼▶'],
  [/^Choose your answer to Zero$/, 'Tap your answer on the card'],
  [/^M: music (on|off)$/, ''],
]
export function touchText(t) {
  if (typeof t !== 'string' || !window.__touch) return t
  return RULES.reduce((s, [re, to]) => s.replace(re, to), t)
}
// small text grows on phones (12 px becomes 16, 14 becomes 18), so card rules stay readable
const floorSize = (v) => {
  const n = parseFloat(v)
  if (!n || n >= 18) return v
  return `${Math.min(18, Math.round(n * 1.3))}px`
}
export function patchTextForTouch(Phaser) {
  const S = Phaser.GameObjects.TextStyle.prototype
  const setStyle = S.setStyle
  S.setStyle = function (style, ...rest) {
    if (style && style.fontSize && !style.noFloor) {
      const f = floorSize(style.fontSize)
      if (f !== style.fontSize) { this._basePx = parseFloat(style.fontSize); this._floorPx = parseFloat(f) } else { this._basePx = 0 }
      style = { ...style, fontSize: f }
    }
    return setStyle.call(this, style, ...rest)
  }
  const setFontSize = S.setFontSize
  S.setFontSize = function (size) { return setFontSize.call(this, typeof size === 'number' ? floorSize(`${size}px`) : floorSize(size)) }
  // a wrapped text grows only as far as it can without needing an extra line, so boxes don't spill
  const T = Phaser.GameObjects.Text.prototype
  const setText = T.setText
  const ctx = document.createElement('canvas').getContext('2d')
  const lines = (text, px, st) => {
    ctx.font = `${st.fontStyle || ''} ${px}px ${st.fontFamily}`
    let n = 0
    String(text).split('\n').forEach((para) => {
      let line = ''; n++
      para.split(' ').forEach((w) => { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > st.wordWrapWidth && line) { n++; line = w } else line = t })
    })
    return n
  }
  T.setText = function (v) {
    const r = setText.call(this, v)
    const st = this.style
    if (st && !st.wordWrapWidth && st._basePx && typeof this._text === 'string' && this._text && !this._text.includes('\n')) {
      ctx.font = `${st.fontStyle || ''} ${st._floorPx}px ${st.fontFamily}`
      const w = ctx.measureText(this._text).width
      const px = w > 500 ? Math.max(st._basePx, Math.floor(st._floorPx * 500 / w)) : st._floorPx
      if (`${px}px` !== st.fontSize) setFontSize.call(st, `${px}px`)
    }
    if (st && st.wordWrapWidth && st._basePx && typeof this._text === 'string' && this._text) {
      const base = lines(this._text, st._basePx, st)
      let px = st._floorPx
      while (px > st._basePx && lines(this._text, px, st) > base) px--
      if (`${px}px` !== st.fontSize) setFontSize.call(st, `${px}px`)
    }
    return r
  }
  const set = T.setText
  T.setText = function (v) { return set.call(this, Array.isArray(v) ? v.map(touchText) : touchText(v)) }
}
