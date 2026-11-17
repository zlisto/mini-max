const KEY = 'minimax-save'

export function loadSave() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}

export function writeSave(patch) {
  const s = { ...loadSave(), ...patch }
  try { localStorage.setItem(KEY, JSON.stringify(s)) } catch { /* private mode */ }
  return s
}
