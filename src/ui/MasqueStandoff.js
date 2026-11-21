import { sfx } from '../systems/sfx.js'
import { makeMasqueCard, ev, fmt, F248, lisaPay } from '../data/masque.js'

// A masquerade standoff (Chapter 12): Lisa acts on beliefs about what a mask hides.
// Each card is a short chain of steps: a dial (a belief, in tenths) or a pick (an action or a reason).
//  bayes, never, dominated: Domino's tree (Figs. 220.1, 219.1, 244.1)
//  posterior, intuit:       Beer or Quiche (Ex. 244.2, Fig. 245.1)
//  tremble:                 Fig. 248.1
// A wrong pick costs health and deals a fresh card of the same kind, so options can't be ticked off one by one.
// phase = { hp, cards: [{ mode, book }] }
const PINK = '#ff5fa2', BLUE = '#7fd6ff', GOLD = 0xffd166, CREAM = '#ecdcc8', DIM = '#7a6a90', ROSE = '#ff9a8a'
const ACT = { L: 'L', R: 'R', l: 'ℓ', r: 'r', none: 'No plan needed', tie: 'They tie', fight: 'Fight him', leave: 'Leave him alone',
  M: 'M', either: 'Either one', strong: 'Strong only', weak: 'Weak only', both: 'Both kinds', neither: 'Neither' }

export class MasqueStandoff {
  constructor(scene, { lisa, enemy, enemyName, phases, onPhaseWin, onLose, say }) {
    Object.assign(this, { scene, lisa, enemy, enemyName, phases, onPhaseWin, onLose, say })
    this.kind = 'masque'
    this.phaseIdx = 0
    this.c = scene.add.container(0, 0).setScrollFactor(0).setDepth(4200).setVisible(false)
    this.active = false
    this.waiting = false
  }

  startPhase(i = this.phaseIdx) {
    this.phaseIdx = i
    this.ph = this.phases[i]
    this.hp = this.ph.hp
    this.hits = 0
    this.misses = 0
    this.active = true
    // step Lisa out from under the card so her head stays in view
    const sx = this.scene.locked ?? this.scene.cameras.main.scrollX, want = sx + 650
    if (this.lisa.x < want && this.enemy.x - want > 180) { this.scene.tweens.killTweensOf(this.lisa); this.scene.tweens.add({ targets: this.lisa, x: want, duration: 300 }) }
    this.deal()
    this.c.setVisible(true).setAlpha(0)
    this.scene.tweens.add({ targets: this.c, alpha: 1, duration: 250 })
    sfx(this.scene, 'freeze')
  }

  // the name shown for an action or step: a card may swap the tree's letters
  n(id) { return (this.card.show && this.card.show[id]) || (this.mode === 'tremble' ? this.card.label[id] : ACT[id]) }
  // Domino's own step names (M, R), swapped separately from Lisa's letters
  dn(h) { return (this.card.show && this.card.show[`d${h}`]) || h }

  // the steps a card asks, in order
  stepsFor(c) {
    const yes = (id) => ({ type: 'pick', ...id })
    switch (c.mode) {
      case 'bayes': return [{ type: 'dial', label: 'Chance he danced M:', ans: Math.round(c.mu * 10) }, yes({ label: 'Your move:', opts: ['L', 'R', 'tie'].sort(() => Math.random() - 0.5), ans: c.best })]
      case 'never': return [yes({ label: 'If he ever steps in, you play:', opts: c.opts, ans: c.best })]
      case 'dominated': return [yes({ label: 'Which step could he take on purpose?', opts: c.whyOpts, ans: c.why }), yes({ label: 'Your move:', opts: c.opts, ans: c.best })]
      case 'posterior': return [{ type: 'dial', label: "Chance he's weak:", ans: Math.round(c.mu * 10) }, yes({ label: 'Your move:', opts: c.opts, ans: c.best })]
      case 'intuit': return [yes({ label: `Who could gain by ordering ${c.odd}, if you then left him alone?`, opts: c.whoOpts, ans: c.who }), yes({ label: `He orders ${c.odd}. You:`, opts: c.opts, ans: c.best })]
      default: return [yes({ label: 'Your step:', opts: c.order, ans: c.best })]
    }
  }

  deal(again = false) {
    const cfg = this.ph.cards[Math.min(this.hits, this.ph.cards.length - 1)]
    this.card = makeMasqueCard(again ? { ...cfg, book: false, pooling: !!cfg.book } : cfg)
    this.mode = this.card.mode
    this.steps = this.stepsFor(this.card)
    this.done = []
    this.failed = new Set()
    this.stage = null
    this.note = null
    this.dealtAt = this.scene.time.now
    this.beginStep(0)
    this.waiting = true
    const lines = {
      bayes: 'Domino stepped in, but his mask hides which step he took. That spot is an information set, so how likely is M?',
      never: 'He always bows out, so you never get to move. Pick what you would do if he ever surprised you.',
      dominated: 'He always bows out, but tonight he stepped in anyway. Ask yourself which step he could have taken on purpose.',
      posterior: "A masked guest orders at the buffet. Work out how likely it is that he's weak, then decide whether to fight.",
      intuit: `Every guest orders ${this.card.pool}, and you fight anyone who orders ${this.card.odd}. Tonight one guest orders ${this.card.odd}.`,
      tremble: "Any step you both dance is an equilibrium, but her hand trembles. Pick the step that's safest if she slips.",
    }
    this.say(again ? "Here's a fresh card of the same kind. Read it from the top." : lines[this.mode], 16)
  }

  beginStep(i) {
    this.step = i
    const st = this.steps[i]
    this.cursor = -1
    this.touched = false
    if (st.type === 'dial') this.val = this.startVal(st.ans)
    this.draw()
  }

  // a dial starts on a random tenth at least two away from the answer, so one tap never wins
  startVal(ans) {
    const opts = Array.from({ length: 11 }, (_, i) => i).filter((i) => Math.abs(i - ans) > 1)
    return opts[Math.floor(Math.random() * opts.length)]
  }

  // ---- drawing -------------------------------------------------------------
  draw() {
    this.c.removeAll(true)
    const s = this.scene
    const X = 16, Y = 16, W = 540, H = 396
    const g = s.add.graphics()
    g.fillStyle(0x140814, 0.95).fillRoundedRect(X, Y, W, H, 14).lineStyle(3, GOLD, 1).strokeRoundedRect(X, Y, W, H, 14)
    this.c.add(g)
    const txt = (x, y, str, o = {}) => s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: '#fff', wordWrap: { width: W - 40 }, ...o })
    const c = this.card
    const titles = { bayes: 'BEHIND THE MASK', never: 'THE DOOR NOBODY OPENS', dominated: 'A STEP NOBODY TAKES', posterior: 'BEER OR QUICHE', intuit: 'THE ODD ORDER', tremble: 'THE TREMBLING HAND' }
    this.c.add(txt(X + W / 2, Y + 20, titles[this.mode], { fontFamily: 'Bangers', fontSize: '26px', color: '#ffd166' }).setOrigin(0.5))
    const top = Y + (window.__touch && this.mode === 'bayes' ? 126 : 110) // phones: room for the bigger mix line
    if (this.mode === 'bayes') {
      const m = c.mix
      this.c.add(txt(X + 20, Y + 42, 'Domino bows out, or steps in and dances M or R. You only see that he stepped in, never which step.', { fontSize: '14px', color: CREAM }))
      this.c.add(txt(X + 20, Y + (window.__touch ? 88 : 82), (window.__touch ? `His mix †: out ${fmt(m.out)}, M ${fmt(m.M)}, R ${fmt(m.R)}` : `His mix †:  bows out ${fmt(m.out)},  M ${fmt(m.M)},  R ${fmt(m.R)}`), { color: BLUE, noFloor: true }))
      this.drawTree(X, top, W, c.tree, { out: m.out > 0 ? 'bows out' : '' })
    } else if (this.mode === 'never') {
      this.c.add(txt(X + 20, Y + 42, 'Domino always bows out, so your spot is never reached. A full plan still says what you would do there. His payoffs are in blue.', { fontSize: '14px', color: CREAM }))
      this.c.add(txt(X + 20, Y + 82, `He always bows out. (Figure 219.1${c.show.L ? ', letters swapped †' : ''})`, { color: BLUE }))
      this.drawTree(X, top, W, c.tree, { out: 'always', his: true })
    } else if (this.mode === 'dominated') {
      this.c.add(txt(X + 20, Y + 42, `Domino always bowed out. Tonight he stepped in, and you can't see whether he danced ${this.dn('M')} or ${this.dn('R')}. His payoffs are in blue.`, { fontSize: '14px', color: CREAM }))
      this.c.add(txt(X + 20, Y + 82, `Bowing out gets him 2. (Figure 244.1${c.show.dM ? ', letters swapped †' : ''})`, { color: BLUE }))
      this.drawTree(X, top, W, c.tree, { out: 'bows out', his: true })
    } else if (this.mode === 'posterior' || this.mode === 'intuit') {
      const intro = this.mode === 'posterior'
        ? `You score 1 for fighting a weak guest or leaving a strong one alone, and 0 otherwise. This guest ordered ${c.order}.`
        : 'A guest gets 2 if you leave him alone, plus 1 for the dish he likes. You score 1 for fighting a weak guest or sparing a strong one.'
      this.c.add(txt(X + 20, Y + 42, intro, { fontSize: '14px', color: CREAM }))
      this.drawGuests(X, top - 6, W, c)
    } else {
      this.c.add(txt(X + 20, Y + 42, 'You and the Contessa each pick a step at once. Each box shows your score, then hers. (Figure 248.1)', { fontSize: '14px', color: CREAM }))
      this.drawMatrix(X, top - 22, W, c)
    }
    // steps already answered
    let y = Y + 226
    this.done.forEach((d) => { const bad = d.startsWith('✗'); this.c.add(txt(X + 20, y, bad ? d : `✓ ${d}`, { fontSize: '14px', color: bad ? '#ff8a8a' : '#7dffb0' })); y += 20 })
    const st = this.steps[this.step]
    if (!this.stage) {
      this.c.add(txt(X + 20, y + 14, st.label, { color: PINK }).setOrigin(0, 0.5))
      if (st.type === 'dial') this.drawDial(X + 280, y + 14)
      else this.drawPick(X, y + 48, W, st)
    }
    if (this.note) this.c.add(txt(X + 20, Y + H - 82, this.note, { fontSize: '14px', color: '#ffd166', wordWrap: { width: W - 40 } }))
    const hint = st.type === 'dial' ? 'LEFT/RIGHT change it · SPACE lock it' : 'LEFT/RIGHT choose · SPACE play it'
    this.hint = txt(X + W / 2, Y + H - 13, hint, { color: CREAM }).setOrigin(0.5).setVisible(!this.stage)
    this.c.add(this.hint)
    this.cardBottom = Y + H
    this.prompt = s.add.text(X + W / 2, Y + H + 22, '', { fontFamily: 'Bangers', fontSize: '28px', color: '#ffd166', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setVisible(false)
    this.prompt.setInteractive({ useHandCursor: true }).on('pointerdown', () => { if (this.waiting && this.scene.time.now - (this.stageAt || 0) > 400) this.advance() })
    this.c.add(this.prompt)
    this.c.each((o) => o.setScrollFactor && o.setScrollFactor(0))
  }

  drawDial(x, y) {
    const s = this.scene
    const on = !this.stage
    this.c.add(s.add.rectangle(x, y, 64, 32, on ? 0x4a1a3a : 0x1a1030).setStrokeStyle(2, on ? 0xffffff : GOLD))
    this.c.add(s.add.text(x, y, (this.val / 10).toFixed(1), { fontFamily: 'Nunito', fontStyle: '800', fontSize: '19px', color: '#fff' }).setOrigin(0.5))
    if (on) {
      this.c.add(s.add.text(x - 48, y, '◀', { fontSize: '18px', color: '#ffd166' }).setOrigin(0.5))
      this.c.add(s.add.text(x + 48, y, '▶', { fontSize: '18px', color: '#ffd166' }).setOrigin(0.5))
      this.c.add(s.add.text(x + 72, y, window.__touch ? '0 never · 1 sure' : '0 no chance, 1 certain', { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color: ROSE }).setOrigin(0, 0.5))
    }
  }

  drawPick(X, y, W, st) {
    const s = this.scene
    const n = st.opts.length
    const bw = (W - 40 - (n - 1) * 8) / n
    st.opts.forEach((id, i) => {
      const x = X + 20 + i * (bw + 8) + bw / 2
      const failed = this.failed.has(`${this.step}:${id}`)
      const sel = i === this.cursor && !this.stage
      const r = s.add.rectangle(x, y, bw, 32, sel ? 0x4a1a3a : 0x1a1030).setStrokeStyle(2, sel ? 0xffffff : 0x5e3f4e)
      r.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
        if (this.stage || !this.waiting) return
        if (this.cursor === i) { this.act(); return }
        this.cursor = i; this.touched = true; sfx(this.scene, 'hover'); this.draw()
      })
      this.c.add(r)
      const name = this.mode === 'dominated' && this.step === 0 && (id === 'M' || id === 'R') ? this.dn(id) : this.n(id)
      this.c.add(s.add.text(x, y, `${failed ? '✗ ' : ''}${name}`, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '15px', color: failed ? DIM : '#fff', align: 'center' }).setOrigin(0.5))
    })
  }

  // Domino's tree: he bows out or steps in with M or R; Lisa's two spots are joined by a dashed line
  drawTree(X, top, W, t, o) {
    const s = this.scene, g = s.add.graphics()
    const cx = X + W / 2 - 4
    const acts = this.card.leaves || t.acts || ['L', 'R']
    const xs = this.card.flipX ? [cx + 128, cx - 60] : [cx - 60, cx + 128]
    const root = [cx, top + 4], out = [cx - 196, top + 46], nM = [xs[0], top + 46], nR = [xs[1], top + 46]
    const lo = Math.min(nM[0], nR[0]), hi = Math.max(nM[0], nR[0])
    g.lineStyle(o.out === 'always' ? 5 : 2, 0xffd166, 1).lineBetween(...root, ...out)
    g.lineStyle(2, 0xffd166, 1).lineBetween(...root, ...nM).lineBetween(...root, ...nR)
    g.fillStyle(0xffffff, 1).fillCircle(...root, 6).fillCircle(...nM, 5).fillCircle(...nR, 5)
    for (let x = lo + 8; x < hi - 8; x += 14) g.lineStyle(2, 0xff9a8a, 1).lineBetween(x, nM[1], Math.min(x + 7, hi - 8), nM[1])
    this.c.add(g)
    const lab = (x, y, str, color = '#ffd166', size = '15px') => this.c.add(s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: size, color }).setOrigin(0.5))
    lab(root[0], root[1] - 12, 'Domino', '#ffffff', '14px')
    lab((root[0] + out[0]) / 2 - 8, top + 12, o.out || 'bows out', '#ffd166', '13px')
    lab(out[0], out[1] + 16, `you ${t.out}`, '#ffffff', '14px')
    if (o.his) lab(out[0], out[1] + 32, `him ${t.dom.out}`, BLUE, '14px')
    lab((root[0] + nM[0]) / 2 + (nM[0] < cx ? -10 : 10), top + 20, this.dn('M'), BLUE); lab((root[0] + nR[0]) / 2 + (nR[0] < cx ? -10 : 10), top + 20, this.dn('R'), BLUE)
    lab((nM[0] + nR[0]) / 2, nM[1] + 14, "you can't tell", ROSE, '13px')
    const leaves = (nd, hist) => acts.forEach((a, i) => {
      const lx = nd[0] + (i ? 40 : -40), ly = top + 86
      const gg = s.add.graphics().lineStyle(2, 0xffffff, 0.8).lineBetween(nd[0], nd[1], lx, ly - 12)
      this.c.add(gg)
      lab((nd[0] + lx) / 2 + (i ? 11 : -11), (nd[1] + ly) / 2 - 6, this.n(a), '#ffffff', '15px')
      lab(lx, ly, `you ${t.u[hist][a]}`, '#ffffff', '14px')
      if (o.his) lab(lx, ly + 16, `him ${t.dom[hist][a]}`, BLUE, '14px')
    })
    leaves(nM, 'M'); leaves(nR, 'R')
  }

  // the guest list for Beer or Quiche
  drawGuests(X, top, W, c) {
    const s = this.scene, g = s.add.graphics()
    const cols = [X + 40, X + 210, X + 330, X + 440]
    const beer = c.mode === 'intuit' ? (c.pool === 'beer' ? 1 : 0) : null
    const rows = c.mode === 'intuit'
      ? [['strong', 0.9, beer, 1 - beer], ['weak', 0.1, beer, 1 - beer]]
      : [['strong', 1 - c.pw, c.bs, 1 - c.bs], ['weak', c.pw, c.bw, 1 - c.bw]]
    g.fillStyle(0x2a1028, 1).fillRoundedRect(X + 20, top + 4, W - 40, 92, 8)
    this.c.add(g)
    const t = (x, y, str, color = '#fff', o = 0) => this.c.add(s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color }).setOrigin(o, 0.5))
    t(cols[0], top + 20, 'guest', '#ffd166'); t(cols[1], top + 20, 'how likely', '#ffd166', 0.5); t(cols[2], top + 20, 'beer', '#ffd166', 0.5); t(cols[3], top + 20, 'quiche', '#ffd166', 0.5)
    rows.forEach(([name, p, b, q], i) => {
      const y = top + 48 + i * 28
      t(cols[0], y, `${name}${name === 'strong' ? ' (likes beer)' : ' (likes quiche)'}`, '#fff')
      t(cols[1], y, fmt(p), BLUE, 0.5); t(cols[2], y, fmt(b), BLUE, 0.5); t(cols[3], y, fmt(q), BLUE, 0.5)
    })
    const foot = c.mode === 'intuit'
      ? (c.pool === 'beer' ? "Everyone orders beer and quiche gets a fight. (Ex. 244.2's other equilibrium)" : 'Everyone orders quiche and beer gets a fight. (Ex. 244.2)')
      : c.book ? 'How often each kind orders each dish. (Example 244.2)' : c.pooling ? 'Both kinds order alike, as in Example 244.2. †' : 'How often each kind orders each dish. †'
    this.c.add(s.add.text(X + 20, top + 108, foot, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color: ROSE, wordWrap: { width: W - 40 } }).setOrigin(0, 0.5))
  }

  // Fig. 248.1, with the book's steps A, B, C given dance names
  drawMatrix(X, top, W, c) {
    const s = this.scene, g = s.add.graphics()
    const x0 = X + 140, y0 = top + 44, cw = 110, ch = 28
    g.lineStyle(1, 0x8a6a7a, 1)
    for (let i = 0; i <= 3; i++) { g.lineBetween(x0, y0 + i * ch, x0 + 3 * cw, y0 + i * ch); g.lineBetween(x0 + i * cw, y0, x0 + i * cw, y0 + 3 * ch) }
    this.c.add(g)
    const t = (x, y, str, color = '#fff', o = 0.5) => this.c.add(s.add.text(x, y, str, { fontFamily: 'Nunito', fontStyle: '800', fontSize: '14px', color }).setOrigin(o, 0.5))
    t(x0 + 1.5 * cw, y0 - 30, 'the Contessa dances', ROSE)
    t(x0 - 12, y0 - 12, 'you', ROSE, 1)
    c.order.forEach((col, j) => t(x0 + (j + 0.5) * cw, y0 - 12, c.label[col], '#ffd166'))
    c.order.forEach((row, i) => {
      t(x0 - 12, y0 + (i + 0.5) * ch, c.label[row], '#ffd166', 1)
      c.order.forEach((col, j) => t(x0 + (j + 0.5) * cw, y0 + (i + 0.5) * ch, F248[row][col].join(', ')))
    })
  }

  // ---- logic ---------------------------------------------------------------
  act() {
    if (!this.active || !this.waiting || this.stage) return
    if (this.scene.time.now - this.dealtAt < 600) return
    const st = this.steps[this.step]
    if (!this.touched || (st.type === 'pick' && this.cursor < 0)) { this.hint.setColor('#ffd166'); sfx(this.scene, 'hover'); return }
    const choice = st.type === 'dial' ? this.val : st.opts[this.cursor]
    if (this.failed.has(`${this.step}:${choice}`)) { sfx(this.scene, 'block'); return }
    const ok = choice === st.ans
    const fb = this.feedback(this.step, choice, ok)
    if (!ok) return this.wrong(`${this.step}:${choice}`, fb.note, fb.line, st.type === 'pick')
    if (this.step < this.steps.length - 1) {
      sfx(this.scene, 'clean')
      this.done.push(fb.done)
      this.note = fb.note
      this.say(fb.line, 16)
      this.beginStep(this.step + 1)
      return
    }
    this.done.push(fb.done)
    this.right(fb.line, fb.note)
  }

  // what the card says after an answer: { line (spoken), note (on the card), done (the ticked summary) }
  feedback(step, ch, ok) {
    const c = this.card, n = (id) => this.n(id), d = (h) => this.dn(h)
    const v = typeof ch === 'number' ? ch / 10 : null
    if (c.mode === 'bayes') {
      const m = c.mix, inn = m.M + m.R
      if (step === 0) {
        if (ok) return { line: "That's it. Now pick the move that's best for that belief.", note: `${fmt(m.M)} ÷ ${fmt(inn)} = ${fmt(c.mu)}. Bayes' rule keeps only the times he steps in, so the belief is consistent with his strategy.`, done: `Chance of M: ${fmt(c.mu)}` }
        if (Math.abs(v - m.M) < 1e-9 && Math.abs(inn - 1) > 1e-9) return { line: 'Close, but you only get to move when he steps in.', note: `${fmt(m.M)} is how often he dances M overall. You only reach your spot when he steps in, ${fmt(inn)} of the time.` }
        if (Math.abs(v - m.R / inn) < 1e-9) return { line: "That's the chance he danced R. You want the chance he danced M.", note: 'That share belongs to R. How likely is M?' }
        return { line: "That belief doesn't fit his mix. Use only the times he steps in.", note: `He steps in ${fmt(inn)} of the time. What share of that is M?` }
      }
      const eL = ev(c.tree, 'L', c.mu), eR = ev(c.tree, 'R', c.mu)
      if (ok) return { line: 'Good. Your move has to be the best one for what you believe about where you are.', note: `At that belief, R earns ${fmt(eR)} on average and L earns ${fmt(eL)}. That's sequential rationality.`, done: `Play ${c.best}` }
      if (ch === 'tie') return { line: "They don't tie at that belief. Work out what each move earns you on average.", note: 'Weigh what each move gets after M and after R by your belief.' }
      return { line: 'Weigh each move by your belief before you choose.', note: `With belief ${fmt(c.mu)} in M, ${ch} earns ${fmt(ch === 'L' ? eL : eR)} on average. Weigh what it gets after M and after R.` }
    }
    if (c.mode === 'never') {
      if (ok) return { line: 'Yes. Even at a spot nobody reaches, your plan has to be the best one.', note: `${n('L')} beats ${n('R')} after M, one to nothing, and after R, two to one, so it wins whatever you believe. Bowing out while you plan ${n('R')} is a Nash equilibrium, but it fails sequential rationality.`, done: `Plan ${n('L')}` }
      if (ch === 'none') return { line: 'A strategy names a move at every spot, even one nobody reaches.', note: 'He might slip and step in. Your plan has to say what you do then.' }
      return { line: 'Compare the two moves after each step he might have taken.', note: `Look at what ${n('L')} and ${n('R')} get you after his M, then after his R.` }
    }
    if (c.mode === 'dominated') {
      if (step === 0) {
        if (ok) return { line: `Exactly. ${d('M')} can never pay him more than bowing out, so it must have been ${d('R')}.`, note: `${d('M')} gets him one or nothing, but bowing out gets him two. ${d('R')} might get him five.`, done: `He chose ${d('R')}` }
        if (ch === 'M') return { line: `${d('M')} can never pay him as much as bowing out.`, note: `Compare what ${d('M')} gets him with the two he gets for bowing out.` }
        return { line: "One of those steps can't pay him as much as bowing out.", note: 'Check what each step could ever get him against the two for bowing out.' }
      }
      if (ok) return { line: `That's it. Nobody would choose ${d('M')} on purpose, so you believe it was ${d('R')} and answer that.`, note: `Believing he chose ${d('R')}, ${n('r')} gets you one and ${n('l')} gets nothing. Bowing out with ${n('l')} is still a sequential equilibrium; ruling out its belief is an extra step (Ex. 244.1).`, done: `Play ${n('r')}` }
      return { line: 'That only makes sense if he chose the step he never would.', note: `If he chose ${d('R')}, compare what ${n('l')} and ${n('r')} get you.` }
    }
    if (c.mode === 'posterior') {
      const pk = c.order === 'beer' ? c.bw : 1 - c.bw, ps = c.order === 'beer' ? c.bs : 1 - c.bs
      const a = c.pw * pk, b = (1 - c.pw) * ps
      if (step === 0) {
        if (ok) {
          const note = c.book || c.pooling ? `Both kinds order ${c.order} at the same rate, so his order tells you nothing new and the belief stays at ${fmt(c.pw)}.`
            : `Weak and ${c.order} is ${fmt(c.pw)} × ${fmt(pk)} = ${fmt(a)}, strong and ${c.order} is ${fmt(1 - c.pw)} × ${fmt(ps)} = ${fmt(b)}. Weak is ${fmt(a)} ÷ ${fmt(a + b)} = ${fmt(c.mu)}.`
          return { line: 'Good. Now, do you fight him or not?', note, done: `Chance he's weak: ${fmt(c.mu)}` }
        }
        if (Math.abs(v - c.pw) < 1e-9) return { line: "That's how likely a weak guest was before he ordered. His order tells you more.", note: `Use how often each kind orders ${c.order}.` }
        if (Math.abs(v - pk) < 1e-9) return { line: `That's how often a weak guest orders ${c.order}. You want the chance that this guest is weak.`, note: 'Weigh each kind by how likely it is and how often it orders that dish.' }
        return { line: "That belief doesn't fit the guest list. Weigh both kinds of guest.", note: `For each kind, multiply how likely it is by how often it orders ${c.order}. Then take the weak share.` }
      }
      const eF = c.mu, eN = 1 - c.mu
      if (ok) return { line: c.best === 'fight' ? 'Weak is the better bet, so you fight.' : 'Strong is the better bet, so you leave him alone.', note: `Fighting scores ${fmt(eF)} on average, leaving him alone ${fmt(eN)}.`, done: ACT[c.best] }
      return { line: 'At that belief the other choice scores more on average.', note: `${ACT[ch]} scores ${fmt(ch === 'fight' ? eF : eN)} on average at that belief.` }
    }
    if (c.mode === 'intuit') {
      const quiche = c.pool === 'quiche'
      if (step === 0) {
        if (ok) return quiche
          ? { line: 'Yes. Only a strong guest could ever gain from ordering beer.', note: 'A weak guest gets three now and two at most with beer. A strong guest gets two now, and three with beer if you leave him alone.', done: 'Only a strong guest' }
          : { line: 'Yes. Only a weak guest could ever gain from ordering quiche.', note: 'A strong guest gets three now and two at most with quiche. A weak guest gets two now, and three with quiche if you leave him alone.', done: 'Only a weak guest' }
        if (ch === 'neither') return { line: `Someone could gain if you left him alone after he ordered ${c.odd}.`, note: `Who likes ${c.odd}? What does he get now, and with ${c.odd} if you leave him alone?` }
        return { line: `Check what each kind gets now, and then the most that ${c.odd} could ever get him.`, note: `Everyone has ${c.pool} now and nobody is fought. Compare that with ${c.odd} and no fight.` }
      }
      if (ok) return quiche
        ? { line: 'So beer means strong. You leave him alone, and then every strong guest would rather order beer.', note: 'All-quiche is a sequential equilibrium, but its belief after beer is not reasonable (Ex. 244.2). The book adds a doubt, though. A strange order might just mean a confused guest.', done: 'Leave him alone' }
        : { line: 'So quiche means weak, and you fight him. This time the equilibrium survives the test.', note: 'In the all-beer equilibrium, only a weak guest could gain from quiche, so fighting quiche is reasonable. Running the test on this equilibrium is our step †.', done: 'Fight him' }
      const who = quiche ? 'strong' : 'weak'
      return { line: `If only a ${who} guest would order ${c.odd}, the other choice scores more.`, note: `Against a ${who} guest, fighting scores ${lisaPay(who, true)} and leaving him alone scores ${lisaPay(who, false)}.` }
    }
    // tremble
    const L = c.label, B = L.B
    if (ok) return { line: `Yes. Whatever she slips onto, the ${B} never does worse than the others, and sometimes it does better.`, note: `Each other step is weakly dominated by the ${B}. Only the pair that both dance the ${B} is a trembling hand perfect equilibrium (Def. 248.1).`, done: `Dance the ${B}` }
    if (ch === 'A') return { line: 'That step scores nothing whatever she does.', note: `If she slips even a little onto another step, the ${L.A} still scores nothing. Look for a step that does better against slips.` }
    return { line: 'That only holds up if she never slips.', note: `The ${L.C} scores only when she dances it too. Check what each step scores against every slip she might make.` }
  }

  // a wrong dial costs health and stays; a wrong pick costs health and, once read, deals a fresh card of the same kind
  wrong(key, note, line, redeal) {
    this.failed.add(key)
    this.note = note
    const st = this.steps[this.step]
    if (st.type === 'pick') { st.opts = st.opts.slice().sort(() => Math.random() - 0.5); this.cursor = -1; this.touched = false }
    this.redeal = redeal
    if (redeal) { const id = key.split(':')[1]; this.stage = 'redealing'; this.lastWrong = this.mode === 'dominated' && this.step === 0 && (id === 'M' || id === 'R') ? this.dn(id) : this.n(id) }
    this.draw()
    this.say(line, 16)
    this.miss()
  }

  right(line, note = null) {
    sfx(this.scene, 'clean')
    this.stage = 'busy'
    this.misses = 0
    this.note = note
    this.draw()
    this.say(line, 16)
    this.scene.time.delayedCall(1400, () => {
      this.stage = 'hit'
      this.stageAt = this.scene.time.now
      this.prompt.setText('SPACE: land the hit').setVisible(true)
    })
  }

  miss() {
    const sc = this.scene
    this.misses++
    const dmg = this.misses >= 3 ? 4 : this.misses >= 2 ? 3 : 2
    this.waiting = false
    sfx(sc, 'punished')
    this.lisa.hp -= dmg
    this.lisa.flash(); this.lisa.setPose('hurt')
    sc.floatText(this.lisa.x + 40, this.lisa.y - 300, `-${dmg}`, '#ff6b7a', 4400)
    sc.cameras.main.shake(100, 0.004)
    sc.time.delayedCall(900, () => {
      this.lisa.setPose('idle')
      if (this.lisa.hp <= 0) { this.end(); this.onLose(); return }
      this.waiting = true
      if (this.redeal) {
        this.redeal = false
        this.stage = 'redeal'
        this.done.push(`✗ ${this.lastWrong}. That card is spent, so a fresh one starts over.`)
        this.stageAt = sc.time.now
        this.draw()
        this.prompt.setText('SPACE: new card').setVisible(true)
      }
    })
  }

  landHit() {
    const sc = this.scene
    this.stage = 'busy'
    this.prompt.setVisible(false)
    const x0 = this.lisa.x
    this.lisa.setPose('kick')
    sc.tweens.add({ targets: this.lisa, x: this.enemy.x - 150, duration: 160, yoyo: true, hold: 180, onComplete: () => { this.lisa.x = x0 } })
    sc.time.delayedCall(170, () => {
      this.enemy.setPose('hurt')
      sfx(sc, 'clash'); sc.time.delayedCall(100, () => sfx(sc, 'hitHeavy'))
      this.hp -= 1
      this.hits += 1
      this.enemy.flash()
      sc.floatText(this.enemy.x, this.enemy.y - 280, 'HIT!', '#7dffb0', 4400)
      sc.spark(this.enemy.x - 30, this.enemy.y - 170)
      sc.cameras.main.shake(140, 0.006)
    })
    sc.time.delayedCall(1400, () => {
      this.lisa.setPose('idle'); this.enemy.setPose('idle')
      this.stage = 'next'
      this.stageAt = sc.time.now
      this.prompt.setText(this.hp <= 0 ? 'SPACE: finish it' : 'SPACE: next card').setVisible(true)
    })
  }

  nextCard() {
    const sc = this.scene
    this.stage = null
    if (this.hp <= 0) { this.end(); this.onPhaseWin(this.phaseIdx); return }
    sc.floatText(240 + sc.cameras.main.scrollX, this.cardBottom + 40, 'NEW CARD!', '#ffd166', 4400)
    sfx(sc, 'freeze')
    this.deal()
  }

  end() {
    this.active = false
    this.waiting = false
    this.scene.tweens.add({ targets: this.c, alpha: 0, duration: 250, onComplete: () => this.c.setVisible(false) })
  }

  update() {
    if (!this.active || !this.waiting) return
    const p = this.scene.presses
    if (this.stage === 'busy' || this.stage === 'redealing') return
    if (this.stage === 'hit' || this.stage === 'next' || this.stage === 'redeal') {
      if (this.scene.time.now - this.stageAt > 400 && p.take('Space', 'Enter')) this.advance()
      return
    }
    const st = this.steps[this.step]
    if (st.type === 'dial') {
      if (p.take('ArrowLeft', 'KeyA', 'ArrowDown', 'KeyS')) { this.val = Math.max(0, this.val - 1); this.touched = true; sfx(this.scene, 'hover'); this.draw() }
      else if (p.take('ArrowRight', 'KeyD', 'ArrowUp', 'KeyW')) { this.val = Math.min(10, this.val + 1); this.touched = true; sfx(this.scene, 'hover'); this.draw() }
      else if (p.take('Space', 'Enter', 'KeyJ')) this.act()
      return
    }
    const n = st.opts.length
    if (p.take('ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW')) { this.cursor = this.cursor < 0 ? n - 1 : (this.cursor + n - 1) % n; this.touched = true; sfx(this.scene, 'hover'); this.draw() }
    else if (p.take('ArrowRight', 'KeyD', 'ArrowDown', 'KeyS')) { this.cursor = (this.cursor + 1) % n; this.touched = true; sfx(this.scene, 'hover'); this.draw() }
    else if (p.take('Space', 'Enter', 'KeyJ')) this.act()
  }

  // move on from a prompt: land the hit, deal the next card, or deal a fresh one after a wrong pick
  advance() {
    if (this.stage === 'hit') this.landHit()
    else if (this.stage === 'next') this.nextCard()
    else if (this.stage === 'redeal') { sfx(this.scene, 'freeze'); this.deal(true) }
  }

  // dev hook: take the right answer
  solve() {
    if (!this.waiting || this.stage === 'busy') return
    if (this.stage === 'hit') return this.landHit()
    if (this.stage === 'next') return this.nextCard()
    if (this.stage === 'redeal') { this.deal(true); return }
    this.dealtAt = -1e9
    const st = this.steps[this.step]
    if (st.type === 'dial') this.val = st.ans
    else this.cursor = st.opts.indexOf(st.ans)
    this.touched = true
    this.act()
  }
}
