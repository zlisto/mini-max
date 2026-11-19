// Level data. Each world is one street (brawl waves) + an elite standoff + a boss with three phases.
// Book refs live in the standoff classes and the end-screen notes; dialogue stays short and in character.
import { BOOK_NOTES } from './games.js'
import { BOOK_NOTES_W2 } from './mix.js'
import { BOOK_NOTES_W3 } from './dominance.js'
import { BOOK_NOTES_W4 } from './knowledge.js'
import { BOOK_NOTES_W5 } from './trees.js'
import { BOOK_NOTES_W6 } from './bargain.js'
import { BOOK_NOTES_W7 } from './repeated.js'
import { BOOK_NOTES_W8 } from './mechanism.js'
import { BOOK_NOTES_W9 } from './fog.js'
import { BOOK_NOTES_W10 } from './masque.js'

export const LEVELS = {
  w1: {
    id: 'w1', title: 'NEON STRIP', chapter: 'Chapter 2: Nash equilibrium', music: 'level_01', width: 4200, page: 1,
    art: {
      far: 'strip_far', mids: ['strip_mid_a', 'strip_mid_b'], ground: 'strip_ground',
      stage: { key: 'strip_stage', x: 3720, scale: 0.95 },
      fg: [['fg_lamp', 980, 0.95], ['fg_crates', 1640, 0.9], ['fg_lamp', 2420, 0.95], ['fg_bin', 3080, 0.85], ['fg_lamp', 3900, 0.95]],
    },
    grunt: 'grunt', habitMeter: false,
    intro: [
      { who: 'tempo', text: "Welcome to the Neon Strip. Zero's crew runs these streets." },
      { who: 'tempo', text: 'Each move beats one and loses to one. Kicks out-reach punches, punches are faster than throws, and throws catch kicks.' },
      { who: 'tempo', text: 'Watch them wind up: red means a punch is coming, blue a kick, yellow a throw. Answer with the move that beats it.' },
      { who: 'lisa', text: 'So J punches, K kicks and L throws. Got it.' },
      { who: 'tempo', text: 'And grab the glowing orbs on the floor. Each one is a game theory power-up.' },
    ],
    readerTalk: [
      { who: 'tempo', text: 'See the purple shadow? That one watches your last few moves and counters your favourite.' },
      { who: 'tempo', text: "Mash one button and it'll read you like a book. Mix it up." },
    ],
    triggers: [
      { id: 'wave1', x: 560, cam: 0, spawn: [['grunt', 1420, 560, 0], ['grunt', 1500, 630, 0.9], ['grunt', -160, 600, 2.2]] },
      { id: 'wave2', x: 1650, cam: 1150, spawn: [['grunt', 2520, 560, 0], ['reader', 2560, 630, 0.6], ['grunt', 1000, 600, 2.4]] },
      { id: 'elite', x: 2650, cam: 2150, standoff: 'elite' },
      { id: 'boss', x: 3420, cam: 4200 - 1280, standoff: 'boss' },
    ],
    elite: {
      prefix: 'brick', name: 'Brick', label: 'BRICK', who: 'brick', kind: 'pure', pronoun: 'he',
      phases: [{ hp: 3, view: 'lisa', fog: false, value: 1 }],
      intro: [
        { who: 'brick', text: 'Nobody gets past Brick.' },
        { who: 'tempo', text: "He's too big to brawl. This is a standoff: you both pick a move at the same moment." },
        { who: 'tempo', text: "The card shows your points for every pair of moves. Brick plays by his own stakes, not the street rules, so read it." },
        { who: 'tempo', text: 'Brick answers whatever you keep doing. So for each move, look for the worst he can do to you.' },
        { who: 'tempo', text: 'Then pick the move whose worst case is best. Get the score the card guarantees you, and your hit lands.' },
      ],
      outro: [
        { who: 'brick', text: '...Fine. You can go.' },
        { who: 'tempo', text: "That's minimax: pick the move with the best guarantee." },
        { who: 'tempo', text: "In a fight where his win is your loss, that's a steady state, because neither of you wants to switch." },
        { who: 'lisa', text: 'Mini... Max. Huh, I guess the name fits.' },
      ],
    },
    boss: {
      prefix: 'sadie', name: 'Sadie', label: 'SADIE POINT', who: 'sadie', kind: 'pure', pronoun: 'she', standY: 520,
      phases: [{ hp: 3, view: 'lisa', fog: false, value: -1 }, { hp: 3, view: 'lisa', fog: true, value: 1 }, { hp: 3, view: 'enemy', fog: false, value: -1 }],
      phaseIntros: [
        [
          { who: 'sadie', text: 'Zero says every fight has a loser. Want to guess who?' },
          { who: 'tempo', text: 'Her card is nasty, because every move can cost you. Find the one whose worst case costs the least.' },
          { who: 'lisa', text: "Let's read the card and find out." },
        ],
        [
          { who: 'sadie', text: "Let's see you read a card you can't see." },
          { who: 'tempo', text: "Some cells are hidden, but you don't need them all. One bad cell is enough to sink a move." },
        ],
        [
          { who: 'sadie', text: "Fine, then read MY card. It shows my winnings, not yours." },
          { who: 'tempo', text: 'Every point she wins, you lose, so her +2 is your −2. Flip the signs in your head.' },
        ],
      ],
      brawl: { who: 'sadie', text: "Fine, you can read a table. Let's see if you can read a punch." },
      taunt: { who: 'sadie', text: 'Crew! Ruin her night.' },
      interludes: [[['grunt', 1400, 560, 0], ['grunt', -140, 630, 0.6]], [['grunt', 1400, 560, 0], ['reader', -140, 630, 0.6]]],
      outro: [
        { who: 'sadie', text: 'Zero said... every fight has a loser.' },
        { who: 'lisa', text: 'This one did. Not every game is a fight, though.' },
        { who: 'tempo', text: 'Page one of the setlist! Hold it up, Lisa.' },
        { who: 'juno', text: "Lisa? I can hear you through the page. Keep going, I'm right here." },
        { who: 'tempo', text: "The next page flew toward the Casino Arcade, and Zero's watching us." },
      ],
    },
    end: {
      title: 'NEON STRIP CLEARED', notes: BOOK_NOTES, chapter: 'Chapter 2',
      dagger: 'The Punch / Kick / Throw triangle, the power-ups and the fight-card numbers are inventions of this game, not from the book.',
      next: { level: 'w2', label: 'Next: Casino Arcade ▶' },
    },
  },

  w2: {
    id: 'w2', title: 'CASINO ARCADE', chapter: 'Chapter 3: Mixed strategies', music: 'level_02', width: 4400, page: 2,
    art: {
      far: 'casino_far', mids: ['casino_mid_a', 'casino_mid_b'], ground: 'casino_ground',
      stage: { key: 'casino_stage', x: 3900, scale: 0.9 },
      fg: [['fg_slot', 900, 0.55], ['fg_rope', 1560, 0.95], ['fg_chips', 2300, 0.9], ['fg_slot', 3000, 0.55], ['fg_rope', 3600, 0.95], ['fg_chips', 4150, 0.9]],
    },
    grunt: 'dealer', habitMeter: true,
    intro: [
      { who: 'tempo', text: 'This is the Casino Arcade. The setlist page fluttered in here somewhere.' },
      { who: 'zero', cue: 'zeroScreen', text: 'Welcome to my house, Lisa, where I make all the rules.' },
      { who: 'zero', text: "If no single move is safe, there's no steady way to play. The house always wins." },
      { who: 'tempo', cue: 'zeroScreenOff', text: 'Every dealer here reads habits like cards. The MIX bars at the bottom show your last eight moves.' },
      { who: 'lisa', text: "So if I lean on one move, they'll counter it. I'll spread it out." },
    ],
    triggers: [
      { id: 'wave1', x: 560, cam: 0, spawn: [['dealer', 1420, 560, 0], ['dealer', 1500, 630, 1.0], ['dealer', -160, 600, 2.4]] },
      { id: 'wave2', x: 1750, cam: 1250, spawn: [['dealer', 2620, 560, 0], ['dealer', 2660, 630, 0.6], ['dealer', 1100, 600, 1.8], ['dealer', 2700, 590, 3.2]] },
      { id: 'elite', x: 2800, cam: 2300, standoff: 'elite' },
      { id: 'boss', x: 3620, cam: 4400 - 1280, standoff: 'boss' },
    ],
    elite: {
      prefix: 'penny', name: 'Penny', label: 'PENNY ANTE', who: 'penny', kind: 'mix', pronoun: 'she',
      phases: [{ hp: 3, size: 2, view: 'lisa', read: 'live' }],
      intro: [
        { who: 'penny', text: 'Heads or tails, sugar? I always know which.' },
        { who: 'tempo', text: "On Sadie's card, one move had a safe worst case. This is like matching pennies, where none does." },
        { who: 'tempo', text: "So don't pick one move. Split the 12 slices of your wheel between your moves, and let the spin pick." },
        { who: 'tempo', text: 'She sees your wheel and picks the answer that hurts you most.' },
        { who: 'tempo', text: 'The bottom row shows your average against each answer. Make them match, and she has nothing to aim at.' },
      ],
      outro: [
        { who: 'penny', text: "...Heads or tails, you kept me guessing." },
        { who: 'tempo', text: "That's a mixed strategy. No single move was safe, but the right mix is, and she couldn't push your average any lower." },
        { who: 'tempo', text: "Here's the big one: every game with finitely many moves has at least one steady mix, called an equilibrium." },
        { who: 'lisa', text: "So Zero's wrong! There's a steady way to play after all, as long as I mix instead of sticking to one move." },
      ],
    },
    boss: {
      prefix: 'lou', name: 'Lou', label: 'LUCKY LOU', who: 'lou', kind: 'mix', pronoun: 'he', standY: 530,
      phases: [{ hp: 3, size: 2, view: 'lisa', read: 'none' }, { hp: 3, size: 2, view: 'enemy', read: 'none' }, { hp: 3, size: 3, view: 'lisa', read: 'after' }],
      phaseIntros: [
        [
          { who: 'lou', text: "Place your bets, kid. My table doesn't do hints." },
          { who: 'tempo', text: "There's no averages row this time, but the goal hasn't changed: find the split where both his answers pay you the same." },
          { who: 'tempo', text: "For your average against an answer, multiply each move's slices by its points there, add it all up, then divide by 12." },
        ],
        [
          { who: 'lou', text: "Now we play the house card, kid, and it shows my winnings. Bets down." },
          { who: 'tempo', text: 'His +2 is your −2. Make both his answers pay HIM the same, so reading your wheel gains him nothing.' },
        ],
        [
          { who: 'lou', text: 'Now you get all three moves and I get all three answers. Spin, little star.' },
          { who: 'tempo', text: "You have three answers to balance now. After each spin I'll show that wheel's averages, so use them." },
        ],
      ],
      brawl: { who: 'lou', text: "Luck's run out on the cards, so I'll just have to deal with you myself." },
      taunt: { who: 'lou', text: 'Dealers! Reshuffle the lady.' },
      interludes: [[['dealer', 1400, 560, 0], ['dealer', -140, 630, 0.6]], [['dealer', 1400, 560, 0], ['dealer', -140, 630, 0.6], ['dealer', 1450, 600, 2]]],
      outro: [
        { who: 'lou', text: 'The house... always wins.' },
        { who: 'lisa', text: 'Not this time. You read my wheel, and every answer still paid the same.' },
        { who: 'zero', cue: 'zeroSweep', text: 'You took one table, Lisa. I own the whole Tour.' },
        { who: 'tempo', text: 'Page two of the setlist! Hold it up.' },
        { who: 'juno', text: "Lisa, you found a mix he can't crack! I'm still here, so please hurry." },
        { who: 'tempo', text: 'The next page blew into the Hall of Mirrors. Zero says no one can predict a rival.' },
      ],
    },
    end: {
      title: 'CASINO ARCADE CLEARED', notes: BOOK_NOTES_W2, chapter: 'Chapter 3',
      dagger: "The wheel, the 12 slices, the power-ups and the card numbers are inventions of this game, not from the book. Card numbers are each table's stakes and can differ from the street's Punch/Kick/Throw rules.",
      next: { level: 'w3', label: 'Next: Hall of Mirrors ▶' },
    },
  },

  w3: {
    id: 'w3', title: 'HALL OF MIRRORS', chapter: 'Chapter 4: Rationalizability', music: 'level_03', width: 4400, page: 3,
    art: {
      far: 'hall_far', mids: ['hall_mid_a', 'hall_mid_b'], ground: 'hall_ground',
      stage: { key: 'hall_stage', x: 3900, scale: 0.9, tint: 0xd8c4ff },
      fg: [['fg_mirror', 900, 0.55, 0.45], ['fg_shards', 1560, 0.95], ['fg_mirror', 2300, 0.55, 0.45], ['fg_shards', 3000, 0.95], ['fg_shards', 3600, 0.95], ['fg_mirror', 4300, 0.55, 0.45]],
    },
    grunt: 'mimic', habitMeter: false, talkKind: 'mimic',
    intro: [
      { who: 'tempo', text: 'This is the Hall of Mirrors. The third page of the setlist drifted in here, somewhere past all that glass.' },
      { who: 'zero', cue: 'zeroScreen', text: 'Look around, my dears. Every face in here belongs to a stranger, and not one will tell you what it plans to do.' },
      { who: 'zero', text: "You can never predict a rival. In Mira's hall all you can do is guess, and guessers don't last long." },
      { who: 'lisa', cue: 'zeroScreenOff', text: "Funny, because I've been reading people since the Neon Strip." },
    ],
    readerTalk: [
      { who: 'tempo', text: "There's a mimic! He's about to copy your last move, so use the move that counters it." },
      { who: 'lisa', text: 'So if I remember my last move, I know his, and I hit back with whatever counters it.' },
    ],
    triggers: [
      { id: 'wave1', x: 560, cam: 0, spawn: [['grunt', 1420, 560, 0], ['mimic', 1180, 630, 1.0], ['grunt', -160, 600, 2.4]] },
      { id: 'wave2', x: 1750, cam: 1250, spawn: [['mimic', 2620, 560, 0], ['mimic', 2660, 630, 0.8], ['grunt', 1100, 600, 2.0], ['mimic', 2700, 590, 3.4]] },
      { id: 'elite', x: 2800, cam: 2300, standoff: 'elite' },
      { id: 'boss', x: 3620, cam: 4400 - 1280, standoff: 'boss' },
    ],
    elite: {
      prefix: 'echo', name: 'Echo', label: 'ECHO', who: 'echo', kind: 'elim', pronoun: 'he', vanish: true,
      phases: [{ hp: 2, size: 3 }],
      intro: [
        { who: 'echo', cue: 'echoMime', text: "(Echo mimes a box around Lisa, taps his temple, and points at a card that isn't there.)" },
        { who: 'tempo', text: "Echo won't say a word, but his card says plenty. Pink numbers are your points, and blue ones are his." },
        { who: 'tempo', text: 'Look along your rows. A move that scores less than another in every column is called strictly dominated.' },
        { who: 'tempo', text: 'No guess about Echo can make that move your best choice, so shatter it.' },
        { who: 'tempo', text: 'For his moves, compare his blue numbers down each column. A rational Echo never plays a strictly dominated move either.' },
        { who: 'tempo', text: 'Every move you shatter shrinks the card and can expose another. Keep going until only one cell is left.' },
      ],
      outro: [
        { who: 'echo', cue: 'echoExit', text: '(Echo bows low, mimes a mirror cracking, and slips away into the glass.)' },
        { who: 'lisa', text: 'Instead of guessing, I ruled out what a rational fighter would never play, and his last move was all that was left.' },
        { who: 'tempo', text: "Shatter only moves that lose everywhere, and the order never matters. You'd have landed on the same cell either way." },
        { who: 'tempo', text: "The moves left standing are the rationalizable ones, each a best answer to some guess about the rival's remaining moves." },
        { who: 'lisa', text: "So if they're thinking straight, I can read them." },
      ],
    },
    boss: {
      prefix: 'mira', name: 'Mira', label: 'MIRA GLASS', who: 'mira', kind: 'elim', pronoun: 'she', standY: 520,
      phases: [{ hp: 2, size: 3, colFirst: true }, { hp: 2, size: 3, mix: true }, { hp: 2, size: 4, weak: true }],
      phaseIntros: [
        [
          { who: 'mira', text: 'Zero promised me this hall for keeps if you lose, darling. Every mirror shows a different rival, and every one is me.' },
          { who: 'tempo', text: "None of your moves can be shattered yet, so start with her side of the card and see what she'd never do." },
        ],
        [
          { who: 'mira', text: "One of your moves can't be outscored by any single other move of yours. Let's see you manage that." },
          { who: 'tempo', text: 'Sometimes a mix of two moves outscores a move that neither one outscores alone. Try half of each.' },
          { who: 'tempo', text: 'Average their points in each column. If the average outscores the third move against all she has left, shatter it.' },
        ],
        [
          { who: 'mira', text: 'Four moves each now, darling, and one of my mirrors is lying to you.' },
          { who: 'tempo', text: "Watch for ties. If another move only ties yours somewhere, that weak kind of domination isn't enough to shatter it." },
          { who: 'tempo', text: "If nothing outscores a tied move everywhere, it's still a best answer to some guess about her, so you can't rule it out." },
        ],
      ],
      brawl: { who: 'mira', text: 'You beat my reflection. Now try the real thing, up close.' },
      taunt: { who: 'mira', text: 'Mimics, show her what she looks like from the outside.' },
      interludes: [[['mimic', 1400, 560, 0], ['mimic', -140, 630, 0.6]], [['mimic', 1400, 560, 0], ['grunt', -140, 630, 0.6], ['mimic', 1450, 600, 2]]],
      outro: [
        { who: 'mira', text: 'You looked past every reflection, darling, and found my last move. Zero will want his hall back.' },
        { who: 'tempo', text: "Not every card cracks like that. On the street no move, and no mix, outscores another, so reason alone can't call it." },
        { who: 'lisa', text: 'Maybe not on the street. But Zero said I could never predict a rival, and a rational one gave herself away.' },
        { who: 'zero', cue: 'zeroSweep', text: "You read one rival, my dears. Next you'll need a partner, and as long as everyone knows the plan, that will be enough." },
        { who: 'tempo', text: "That's page three of the setlist! Hold it up." },
        { who: 'juno', text: "Lisa, I saw you in every mirror at once! They're taking me somewhere high, all lights and signals." },
        { who: 'tempo', text: 'The next page flew up to the Signal Tower, the tallest thing in the city.' },
      ],
    },
    end: {
      title: 'HALL OF MIRRORS CLEARED', notes: BOOK_NOTES_W3, chapter: 'Chapter 4',
      dagger: 'The mirror card, its numbers, the mimics and the Feint move are inventions of this game. On the street triangle no move is dominated, so reason alone never shatters anything there.',
      next: { level: 'w4', label: 'Next: Signal Tower ▶' },
    },
  },

  w4: {
    id: 'w4', title: 'SIGNAL TOWER', chapter: 'Chapter 5: Knowledge and Equilibrium', music: 'level_04', width: 4400, page: 4,
    art: {
      far: 'tower_far', mids: ['tower_mid_a'], ground: 'tower_ground',
      stage: { key: 'tower_stage', x: 3900, scale: 0.9 },
      fg: [['fg_dish', 900, 0.95], ['fg_dish', 1900, 0.95], ['fg_dish', 3000, 0.95], ['fg_dish', 4200, 0.95]],
    },
    grunt: 'signal', habitMeter: false, talkKind: 'signal', tempoAcross: true,
    intro: [
      { who: 'tempo', text: 'This is the Signal Tower district. Page four of the setlist blew up onto these rooftops.' },
      { who: 'tempo', cue: 'tempoAcross', text: "Juno said somewhere high, so this must be it. I'll signal from that far mast, so watch for my green light." },
      { who: 'zero', cue: 'zeroScreen', text: 'Welcome to my tower, my dears. Up here every plan travels by beacon, and I own the static.' },
      { who: 'zero', text: "And as long as everyone knows the plan, that's all any partnership needs. I'd stake my whole Tour on it." },
      { who: 'lisa', cue: 'zeroScreenOff', text: "Everyone already knows my plan. It's the one where I find Juno." },
    ],
    readerTalk: [
      { who: 'tempo', text: "Signalers move in pairs and hide their wind-up. Watch the flare instead, because they'll both use the move it shows." },
      { who: 'lisa', text: 'Everybody sees that flare, me included. So when a pair comes from one side, one move counters both.' },
    ],
    triggers: [
      { id: 'wave1', x: 560, cam: 0, spawn: [['grunt', -160, 600, 0], ['signal', 1180, 630, 1.0], ['signal', 1340, 560, 1.6]] },
      { id: 'wave2', x: 1750, cam: 1250, spawn: [['signal', 2620, 560, 0], ['signal', 2660, 630, 0.4], ['grunt', 1100, 600, 2.0], ['signal', 2700, 590, 3.4], ['signal', 1080, 560, 3.8]] },
      { id: 'elite', x: 2800, cam: 2300, standoff: 'elite' },
      { id: 'boss', x: 3620, cam: 4400 - 1280, standoff: 'boss' },
    ],
    elite: {
      prefix: 'flicker', name: 'Flicker', label: 'FLICKER', who: 'flicker', kind: 'signal', pronoun: 'she', vanish: true,
      phases: [{ hp: 2, cards: [{ mode: 'know', n: 6 }, { mode: 'ck', n: 6, minDepth: 2 }] }],
      intro: [
        { who: 'flicker', cue: 'flickerFlash', text: "Blink and you'll miss it, Lisa. I flash for Vox, and half of what I flash never reaches Tempo." },
        { who: 'tempo', text: 'Each lamp on her card is one way tonight could go. On gold nights the plan works, and on dark nights it fails.' },
        { who: 'tempo', text: "A pink bracket groups the nights you can't tell apart. All your brackets together are your information partition." },
        { who: 'tempo', text: 'You only know the plan works on a night if your whole bracket around it is gold.' },
        { who: 'tempo', text: 'So douse each gold lamp that shares your bracket with a dark one, then choose GO and strike.' },
      ],
      outro: [
        { who: 'flicker', cue: 'flickerExit', text: "So you can read my lamps. Let's see how they read once Vox runs his static through them." },
        { who: 'lisa', text: 'Knowing it myself was easy. Knowing that Tempo knows, and that he knows I know, took some work.' },
        { who: 'tempo', text: "What survives is common knowledge. It's self-evident, because every bracket touching a lit night is all lit." },
      ],
    },
    boss: {
      prefix: 'vox', name: 'Vox', label: 'VOX STATIC', who: 'vox', kind: 'signal', pronoun: 'he', standY: 520,
      phases: [
        { hp: 2, cards: [{ mode: 'ck', n: 8, minDepth: 3 }] },
        { hp: 2, cards: [{ mode: 'ck', n: 10, minDepth: 4, trap: 3, mark: true }] },
        { hp: 2, cards: [{ mode: 'mail', n: 7 }, { mode: 'mail', n: 8, dark: true }] },
      ],
      phaseIntros: [
        [
          { who: 'vox', cue: 'voxOnAir', text: "You're live on the Static Hour! Zero pays me for every partner who charges in alone, and tonight that's you." },
          { who: 'tempo', text: "A joint strike needs common knowledge. Douse wherever either of us doesn't know, until nothing changes." },
        ],
        [
          { who: 'vox', text: "Folks, they both know the plan on almost every night! Surely that's enough for our happy couple?" },
          { who: 'tempo', text: 'Careful, Lisa. First mark the nights we both know, and then watch how many of them still go dark.' },
        ],
        [
          { who: 'vox', text: 'Let me make it easy, my friend. Flash your plan to Tempo, and every flash that lands earns a flash back.' },
          { who: 'vox', cue: 'voxDrop', text: 'Of course my static eats the odd one. Then the line goes quiet, and nobody knows which flash was last.' },
          { who: 'tempo', text: 'Each screen counts the flashes its own beacon sent. Pink brackets are numbers on your screen, and green ones on mine.' },
          { who: 'tempo', text: "Most of the time the plan is off, so the first lamp is by far the likeliest. When it's off, your beacon sends nothing." },
          { who: 'tempo', text: "That off night is the first lamp, and the ladder climbs from there. Is the plan ever common knowledge?" },
        ],
      ],
      brawl: { who: 'vox', text: 'We interrupt this broadcast for a good old-fashioned beating.' },
      taunt: { who: 'vox', text: "Signalers, cut in! We'll be right back after this beating." },
      interludes: [[['signal', 1400, 560, 0], ['signal', 1450, 630, 0.4]], [['signal', 1400, 560, 0], ['signal', -140, 630, 0.6], ['grunt', 1450, 600, 2]]],
      outro: [
        { who: 'vox', text: "However many flashes I let through, you never charged. That's terrible radio, Lisa." },
        { who: 'tempo', text: 'Each flash that lands takes the knowing one step deeper, but nobody can tell whether the last one landed.' },
        { who: 'lisa', text: 'So Zero was wrong. We could both know the plan, and know that we know, and still never move.' },
        { who: 'zero', cue: 'zeroSweep', text: 'Clever, my dears. But next you meet a man with a threat, and threats always work.' },
        { who: 'tempo', cue: 'tempoBack', text: "That's page four of the setlist! Hold it up." },
        { who: 'juno', text: "Lisa, I saw your beacon flashing all night! They're moving me again, past a row of shops that all look alike." },
        { who: 'tempo', text: 'The next page blew down to the Chain Store, a whole block of shops run by one very big bruiser.' },
      ],
    },
    end: {
      title: 'SIGNAL TOWER CLEARED', notes: BOOK_NOTES_W4, chapter: 'Chapter 5',
      dagger: 'The lamps, brackets, beacons, flares and Tempo as your partner are inventions of this game. Dousing until nothing changes is the game\'s way to find the largest self-evident event among the gold nights. Striking only on common knowledge is the game\'s rule. Hold and charge stand for the book\'s A and B, and the HOLD pass retells the proof of Proposition 83.1 in words.',
      next: { level: 'w5', label: 'Next: The Chain Store ▶' },
    },
  },

  w5: {
    id: 'w5', title: 'THE CHAIN STORE', chapter: 'Chapter 6: Extensive Games', music: 'level_05', width: 4400, page: 5, skin: 'lisag',
    art: {
      far: 'store_far', mids: ['store_mid_a'], ground: 'store_ground', overlap: 100,
      stage: { key: 'store_stage', x: 3900, scale: 0.9 },
      fg: [['fg_carts', 900, 0.9], ['fg_boxes', 1900, 0.9], ['fg_carts', 3000, 0.9], ['fg_boxes', 4200, 0.9]],
    },
    grunt: 'bluffer', habitMeter: false, talkKind: 'bluffer',
    intro: [
      { who: 'tempo', text: 'A whole block of shops that look the same, just as Juno said. Page five landed here, and every shop belongs to one man.' },
      { who: 'lisa', text: 'The hoodie is for the long game. Something tells me this one comes in turns.' },
      { who: 'zero', cue: 'zeroScreen', text: 'My dears, meet Mr. Chainsworth. He owns every store here, and he swears he crushes anyone who opens next door.' },
      { who: 'zero', text: 'A threat like that always works. Nobody walks into a fight they know they will lose.' },
      { who: 'lisa', cue: 'zeroScreenOff', text: "Only if he'd really throw that punch when the moment came." },
    ],
    readerTalk: [
      { who: 'tempo', text: "That's a bluffer. He shouts a threat, but he'd never carry it out. Hit him mid-shout." },
      { who: 'lisa', text: 'So if I hang back and believe him, he just walks off and catches his breath. If I call it, he folds.' },
    ],
    triggers: [
      { id: 'wave1', x: 560, cam: 0, spawn: [['grunt', 1420, 560, 0], ['bluffer', 1180, 630, 1.0], ['grunt', -160, 600, 2.4]] },
      { id: 'wave2', x: 1750, cam: 1250, spawn: [['bluffer', 2620, 560, 0], ['bluffer', 2660, 630, 0.8], ['grunt', 1100, 600, 2.0], ['bluffer', 2700, 590, 3.4]] },
      { id: 'elite', x: 2800, cam: 2300, standoff: 'elite' },
      { id: 'boss', x: 3620, cam: 4400 - 1280, standoff: 'boss' },
    ],
    elite: {
      prefix: 'bluster', name: 'Bluster', label: 'BLUSTER', who: 'bluster', kind: 'tree', pronoun: 'he',
      phases: [{ hp: 2, cards: [{ mode: 'tree', depth: 2 }, { mode: 'tree', depth: 2, rootBranch: 3 }] }],
      intro: [
        { who: 'bluster', text: "Mr. Chainsworth pays me to keep this sidewalk clear, kid. One more step and I flatten you, and I keep my promises." },
        { who: 'tempo', text: 'This card is a game tree. You move first from the top and he answers. The numbers at the ends are what you each get.' },
        { who: 'tempo', text: 'Begin at the bottom, at a choice with only payoffs below it, and pick the branch that pays whoever moves there most.' },
        { who: 'tempo', text: 'Then work upward. When you reach his threat, ask whether he would really carry it out once he got there.' },
      ],
      outro: [
        { who: 'bluster', text: "Okay, okay. You worked out which of my threats I'd really carry out." },
        { who: 'lisa', text: "So a threat only counts if he'd still want to carry it out when the time came. Some of his would, and some wouldn't." },
        { who: 'tempo', text: 'Solving from the end is backward induction. It gives a move at every point, even ones play never reaches.' },
        { who: 'tempo', text: 'A plan for every point where you move is a strategy. In a Nash equilibrium, neither side gains by switching alone.' },
        { who: 'tempo', text: 'Plans that trust an empty threat can still be a Nash equilibrium, because the threat is never tested.' },
        { who: 'tempo', text: "But they aren't subgame perfect, because he'd switch when tested. Testing one choice at a time is enough to check it." },
      ],
    },
    boss: {
      prefix: 'chains', name: 'Chainsworth', label: 'MR. CHAINSWORTH', who: 'chains', kind: 'tree', pronoun: 'he', standY: 520,
      phases: [
        { hp: 2, cards: [{ mode: 'tree', depth: 3 }] },
        { hp: 1, cards: [{ mode: 'centipede', T: 6 }] },
        { hp: 1, cards: [{ mode: 'chain', K: 3 }] },
      ],
      phaseIntros: [
        [
          { who: 'chains', cue: 'chainsSlam', text: 'Zero gave me this whole block, little singer, and your page with it. Any shop that opens next to mine gets smashed.' },
          { who: 'tempo', text: 'The trees are taller now, and on some branches you move twice. The rule is the same, so start at the bottom and climb.' },
        ],
        [
          { who: 'chains', text: "Fine, let's deal instead. There's a pile of cash, and every time one of us says go on, the pile grows." },
          { who: 'tempo', text: 'Whoever stops takes the larger share right then. Begin with the very last choice and work back.' },
        ],
        [
          { who: 'chains', text: 'This is my real game. Every town on the block gets a challenger, and I fight the first one so the rest stay out.' },
          { who: 'tempo', text: 'In each town a shop goes In or stays Out, and then he fights or folds. His money adds up over every town.' },
          { who: 'tempo', text: 'Start with the last town, where nobody is left to scare. Then ask what fighting earlier could buy him.' },
        ],
      ],
      brawl: { who: 'chains', text: "Enough threats. This time I'm actually going to do it." },
      taunt: { who: 'chains', text: 'Bluffers, get out there and soften her up. I need a minute.' },
      interludes: [[['bluffer', 1400, 560, 0], ['bluffer', -140, 630, 0.6]], [['bluffer', 1400, 560, 0], ['grunt', -140, 630, 0.6], ['bluffer', 1450, 600, 2]]],
      outro: [
        { who: 'chains', text: 'Every shop on the block opened, and I let them. From the last town back to the first, fighting never paid.' },
        { who: 'lisa', text: "Zero said threats always work. Empty ones only fool people who never check whether they'd be carried out." },
        { who: 'tempo', text: 'The book admits it feels wrong. After nine fights, the logic says the tenth shop should still expect a fold.' },
        { who: 'zero', cue: 'zeroSweep', text: "A tidy little tree, my dears. Next we bargain, and whoever holds out longest wins." },
        { who: 'tempo', text: "That's page five of the setlist! Hold it up." },
        { who: 'juno', text: "Lisa, I heard that whole block go quiet! Now it's raining money here, and every second they argue, more blows away." },
        { who: 'tempo', text: 'The next page blew to the Money Rain plaza, where every deal shrinks while you wait.' },
      ],
    },
    end: {
      title: 'CHAIN STORE CLEARED', notes: BOOK_NOTES_W5, chapter: 'Chapter 6',
      dagger: "The trees, their numbers, the bluffers, the move names and Lisa playing every shop were made up for this game. Fold is the book's C. The cash ladder is Figure 107.1 with a constant added, and the towns keep Figure 105.1's orderings.",
      next: { level: 'w6', label: 'Next: The Money Rain ▶' },
    },
  },

  w6: {
    id: 'w6', title: 'THE MONEY RAIN', chapter: 'Chapter 7: Bargaining Games', music: 'level_06', width: 4400, page: 6, skin: 'lisag',
    art: {
      far: 'rain_far', mids: [], ground: 'rain_ground',
      stage: { key: 'rain_stage', x: 3900, scale: 0.9 },
      fg: [['fg_cash', 900, 0.9], ['fg_umbrella', 1900, 0.9], ['fg_cash', 3000, 0.9], ['fg_umbrella', 4200, 0.9]],
    },
    grunt: 'holdout', habitMeter: false, talkKind: 'holdout', windOrbs: true,
    intro: [
      { who: 'tempo', text: "It's raining money, just like Juno said, and the wind takes it as fast as it falls. Page six is in this storm." },
      { who: 'zero', cue: 'zeroScreen', text: 'Welcome to the Money Rain, my dears. Lady Ledger runs every deal here, and she has never once blinked.' },
      { who: 'zero', text: 'Whoever holds out longest wins, and whoever flinches first gets the crumbs.' },
      { who: 'lisa', cue: 'zeroScreenOff', text: "The funny thing about waiting in a windstorm is that the pile doesn't wait with you." },
    ],
    readerTalk: [
      { who: 'tempo', text: "That's a holdout. He backs off and waits, but the wind chips away at him the whole time." },
      { who: 'tempo', text: 'The power-up orbs shrink in the wind too, so grab them early.' },
      { who: 'lisa', text: "So holding out costs him, and dawdling costs me. I'd better grab what I can while it's still falling." },
    ],
    triggers: [
      { id: 'wave1', x: 560, cam: 0, spawn: [['grunt', 1420, 560, 0], ['holdout', 1180, 630, 1.0], ['grunt', -160, 600, 2.4]] },
      { id: 'wave2', x: 1750, cam: 1250, spawn: [['holdout', 2620, 560, 0], ['holdout', 2660, 630, 0.8], ['grunt', 1100, 600, 2.0], ['holdout', 2700, 590, 3.4]] },
      { id: 'elite', x: 2800, cam: 2300, standoff: 'elite' },
      { id: 'boss', x: 3620, cam: 4400 - 1280, standoff: 'boss' },
    ],
    elite: {
      prefix: 'hank', name: 'Hank', label: 'HANK HOLDOUT', who: 'hank', kind: 'bargain', pronoun: 'he',
      phases: [{ hp: 2, cards: [{ T: 2, first: 0, d: 'equal', delta: 0.5 }, { T: 2, first: 1, d: 'equal', delta: 0.6 }] }],
      intro: [
        { who: 'hank', text: 'Ledger lets me run the haggling out here, friend. I never take a first offer, and I can sit on a deal all night.' },
        { who: 'tempo', text: 'This ladder plays out in rounds. You propose a split of the hundred coins, and he takes it or turns it down.' },
        { who: 'tempo', text: "If he turns it down, he proposes next round, but the wind has eaten part of every share by then." },
        { who: 'tempo', text: 'In the last round a refusal leaves nothing, so start there. Each offer is just what waiting is worth to whoever answers.' },
      ],
      outro: [
        { who: 'hank', text: "I said I'd hold out all night, and I folded on the first offer. Don't tell Ledger." },
        { who: 'lisa', text: "He didn't fold. I offered exactly what waiting was worth to him, so turning it down would only lose coins." },
        { who: 'tempo', text: "'Never take the first offer' was an empty threat. Carrying it out would only have cost him." },
        { who: 'tempo', text: 'Subgame perfect means every offer and answer is a best move from that round on. A deadline game is solved from the end.' },
        { who: 'tempo', text: "Ledger's game never ends, though, and in that kind of game the first proposer has the edge." },
      ],
    },
    boss: {
      prefix: 'ledger', name: 'Ledger', label: 'LADY LEDGER', who: 'ledger', kind: 'bargain', pronoun: 'she', standY: 520,
      phases: [
        { hp: 2, cards: [{ mode: 'endless', d: 'equal' }] },
        { hp: 2, cards: [{ mode: 'endless', d: 'equal', respond: true }] },
        { hp: 2, cards: [{ mode: 'endless', d: 'apart', lisaPatient: true }, { mode: 'endless', d: 'apart', lisaPatient: false }] },
      ],
      phaseIntros: [
        [
          { who: 'ledger', text: 'Zero lent me this plaza and your little page, darling. I keep both unless you can out-haggle a banker.' },
          { who: 'tempo', text: "Her game has no last round, so there's no bottom to start from. But every round looks the same as the one before." },
          { who: 'tempo', text: 'So pick what you keep when you propose and run the chain. The deal is the keep that brings you back where you started.' },
        ],
        [
          { who: 'ledger', cue: 'ledgerPile', text: 'This time I open, and my rate is final. Take my number or stand in the rain forever.' },
          { who: 'tempo', text: 'Close the loop first, so you know what waiting is worth to you. Then judge her real offer against it.' },
        ],
        [
          { who: 'ledger', text: "These are my final terms. The wind charges us different rates now, so let's see whose interest runs out first." },
          { who: 'tempo', text: 'The wind takes a different bite from each of you per round. Close the loop again and see who it favours.' },
        ],
      ],
      brawl: { who: 'ledger', text: 'The talking is over, darling. Now I collect in person.' },
      taunt: { who: 'ledger', text: 'Holdouts, stall her. Let the wind do my bargaining for me.' },
      interludes: [[['holdout', 1400, 560, 0], ['holdout', -140, 630, 0.6]], [['holdout', 1400, 560, 0], ['grunt', -140, 630, 0.6], ['holdout', 1450, 600, 2]]],
      outro: [
        { who: 'ledger', text: 'I was sure I could outwait anyone, darling. You never let a round pass, so there was nothing left to wait for.' },
        { who: 'lisa', text: "Zero said whoever holds out longest wins. Out here, whoever holds out just watches the money blow away." },
        { who: 'zero', cue: 'zeroSweep', text: 'Bargains are for amateurs, my dears. Next you fight the same rivals again and again, and cooperation never lasts.' },
        { who: 'tempo', text: "That's page six of the setlist! Hold it up." },
        { who: 'juno', text: "Lisa, you closed that deal so fast I barely heard the wind! Now they've got me fighting the same rematch every night." },
        { who: 'tempo', text: 'The next page blew to the Rematch Circuit, where nobody ever fights just once.' },
      ],
    },
    end: {
      title: 'MONEY RAIN CLEARED', notes: BOOK_NOTES_W6, chapter: 'Chapter 7',
      dagger: "Hank's deadline ladder, the hundred coins, the wind, the holdouts and the shrinking orbs were made up for this game. The wind stands in for the book's discount factor. Coins are whole, so ladder offers round up and a loop keep counts if it comes back within half a coin. The loop card plays the book's endless game.",
      next: { level: 'w7', label: 'Next: The Rematch Circuit ▶' },
    },
  },

  w7: {
    id: 'w7', title: 'THE REMATCH CIRCUIT', chapter: 'Chapter 8: Repeated Games', music: 'level_07', width: 4400, page: 7, skin: 'lisag',
    art: {
      far: 'gym_far', mids: ['gym_mid_a'], ground: 'gym_ground', overlap: 70,
      stage: { key: 'gym_stage', x: 3900, scale: 0.9 },
      fg: [['fg_bag', 900, 0.7], ['fg_bench', 1900, 0.9], ['fg_bag', 3000, 0.7], ['fg_bench', 4200, 0.9]],
    },
    grunt: 'grudger', habitMeter: false, talkKind: 'grudger', grudgers: true,
    intro: [
      { who: 'tempo', text: "It's the Rematch Circuit, Lisa, where the same crews fight each other every single night." },
      { who: 'zero', cue: 'zeroScreen', text: 'Welcome to the circuit, my dears. Here everyone meets again tomorrow, and the day after that.' },
      { who: 'zero', text: 'Cooperation can never last. Sooner or later someone throws the cheap shot, and that is the end of it.' },
      { who: 'lisa', cue: 'zeroScreenOff', text: "That only works if a cheap shot pays. Around here, tomorrow's rematch could cost more than tonight's win." },
    ],
    readerTalk: [
      { who: 'tempo', text: 'Grudgers fight fair as long as you do. But your flip throw counts as a cheap shot here.' },
      { who: 'lisa', text: "So if I throw one of them, the whole crew holds a grudge. I'd better fight fair." },
    ],
    triggers: [
      { id: 'wave1', x: 560, cam: 0, spawn: [['grunt', 1420, 560, 0], ['grudger', 1180, 630, 1.0], ['grudger', 1340, 560, 1.8]] },
      { id: 'wave2', x: 1750, cam: 1250, spawn: [['grudger', 2620, 560, 0], ['grudger', 2660, 630, 0.8], ['grunt', 1100, 600, 2.0], ['grudger', 2700, 590, 3.4]] },
      { id: 'elite', x: 2800, cam: 2300, standoff: 'elite' },
      { id: 'boss', x: 3620, cam: 4400 - 1280, standoff: 'boss' },
    ],
    elite: {
      prefix: 'tatum', name: 'Tatiana', label: 'TATIANA TAT', who: 'tatum', kind: 'rematch', pronoun: 'she',
      phases: [{ hp: 2, cards: [{ mode: 'disc', rival: ['tft'], deltas: [0.5, 0.6, 0.8, 0.9, 0.2, 0.25], otherSide: 1 / 3 }] }],
      intro: [
        { who: 'tatum', text: "We spar every night, Lisa. I'll match you move for move, so whatever you give me, you get back." },
        { who: 'tempo', text: 'Each round you both spar or cheat. A cheap shot on someone who spars pays four, and two sparrers get three each.' },
        { who: 'tempo', text: 'Her plan is a little machine. Pick your own plan, and the card plays the two of them, round after round.' },
        { who: 'tempo', text: "Later rounds count less, by the card's percentage. 'Earns X a round' means a steady X would be worth just as much." },
      ],
      outro: [
        { who: 'tatum', text: "You worked out what tomorrow was worth before you swung. Grimes hasn't sparred with me since one cheap shot, years ago." },
        { who: 'lisa', text: "When the future counts enough, a cheap shot loses more than it wins. When it doesn't, nothing keeps me honest." },
        { who: 'tempo', text: 'Her machine copies your last move, so a cheap shot comes right back. The threat of that keeps the sparring going.' },
      ],
    },
    boss: {
      prefix: 'grimes', name: 'Grimes', label: 'CHAMP GRIMES', who: 'grimes', kind: 'rematch', pronoun: 'he', standY: 520,
      phases: [
        { hp: 2, cards: [{ mode: 'disc', rival: ['grim'], deltas: [0.5, 0.6, 0.75, 0.9, 0.2, 0.25, 0.3], otherSide: 1 / 3 }] },
        { hp: 3, cards: [{ mode: 'finite', T: 6, k: 0 }, { mode: 'finite', T: 6, k: 1 }, { mode: 'unravel', T: 6 }] },
        { hp: 3, cards: [], mix: { pair: [{ mode: 'disc', rival: ['one'], deltas: [0.4, 0.45], who: 'this rival' }, { mode: 'disc', rival: ['grim'], sameDelta: true, who: 'this rival' }], extra: { mode: 'disc', rival: ['allD'], deltas: [0.5, 0.7, 0.9], who: 'this rival' } } },
      ],
      phaseIntros: [
        [
          { who: 'grimes', cue: 'grimesNoShake', text: "Zero gave me this circuit and your page, kid. I don't shake hands, and I don't forgive. Cross me once and we're done." },
          { who: 'tempo', text: 'Cheating on Grim earns four once, then one a round. That beats three only if tomorrow counts for less than a third.' },
        ],
        [
          { who: 'grimes', text: 'Bad news, kid. Zero says the circuit closes after six more bouts.' },
          { who: 'tempo', text: 'Now there is a last round, and nobody can be punished after it. Your score is the average over the bouts.' },
        ],
        [
          { who: 'grimes', text: 'One more fight, kid. My corner sends a different rival every time, and some of them never spar at all.' },
          { who: 'tempo', text: 'The first two share the same patience. A short punishment and a grim one can give different answers at the same percentage.' },
        ],
      ],
      brawl: { who: 'grimes', text: 'No more rounds on paper, kid. This one goes the distance.' },
      taunt: { who: 'grimes', text: 'Grudgers, remind her what a grudge feels like.' },
      interludes: [[['grudger', 1400, 560, 0], ['grudger', 1450, 630, 0.6]], [['grudger', 1400, 560, 0], ['grunt', -140, 630, 0.6], ['grudger', 1450, 600, 2]]],
      outro: [
        { who: 'grimes', text: "I've held a grudge against everyone on this circuit. Turns out the threat was what kept them in line." },
        { who: 'tempo', text: 'Everyone believed his grudge, because cheating back cost him nothing. If punishing hurt him too, nobody would.' },
        { who: 'lisa', text: 'Zero said cooperation can never last. It lasts while tomorrow matters, and breaks when everyone sees the end coming.' },
        { who: 'zero', cue: 'zeroSweep', text: 'Cute, my dears. Grudges are crude, though. Next I write the rules, and no rule can make liars tell the truth.' },
        { who: 'tempo', text: "That's page seven of the setlist! Hold it up." },
        { who: 'juno', text: "Lisa, they stopped my rematch just to watch yours! Now they've moved me backstage at a theater full of rule books." },
        { who: 'tempo', text: 'The next page blew to the Rulebook Theater, where every show runs on rules somebody wrote.' },
      ],
    },
    end: {
      title: 'REMATCH CIRCUIT CLEARED', notes: BOOK_NOTES_W7, chapter: 'Chapter 8',
      dagger: "The rematch card, the plan names, Copycat, One and Forgive, the six-bout circuit, the grudgers and Lisa's throw as a cheap shot were made up for this game. Payoffs follow Figure 134.1. The book doesn't print the one-third line, which comes from those payoffs, and each value is added up over six hundred rounds.",
      next: { level: 'w8', label: 'Next: The Rulebook Theater ▶' },
    },
  },

  w8: {
    id: 'w8', title: 'THE RULEBOOK THEATER', chapter: 'Chapter 10: Implementation Theory', music: 'level_08', width: 4400, page: 8, skin: 'lisag',
    art: {
      far: 'theater_far', mids: ['theater_mid_a'], ground: 'theater_ground', overlap: 150,
      stage: { key: 'theater_stage', x: 3900, scale: 0.9 },
      fg: [['fg_spot', 180, 0.7], ['fg_trunk', 1900, 0.9], ['fg_spot', 3000, 0.7], ['fg_trunk', 4200, 0.9]],
    },
    grunt: 'fibber', habitMeter: false, talkKind: 'fibber',
    intro: [
      { who: 'tempo', text: 'A theater full of rule books, just like Juno said. Page eight is somewhere behind that curtain.' },
      { who: 'zero', cue: 'zeroScreen', text: 'Welcome to my theater, my dears. Everyone here says one thing and does another.' },
      { who: 'zero', text: 'No rule can make liars tell the truth. People lie whenever lying pays them, and no rule book will change that.' },
      { who: 'lisa', cue: 'zeroScreenOff', text: 'Then I just need rules where lying never pays.' },
    ],
    readerTalk: [
      { who: 'tempo', text: 'Fibbers call their move before they swing, but half the time the call is a lie meant to bait the wrong counter.' },
      { who: 'lisa', text: "So I can't trust what they say. But if I catch one in a lie, it costs him, and he stops lying." },
    ],
    triggers: [
      { id: 'wave1', x: 560, cam: 0, spawn: [['grunt', 1420, 560, 0], ['fibber', 1180, 630, 1.0], ['fibber', 1340, 560, 1.8]] },
      { id: 'wave2', x: 1750, cam: 1250, spawn: [['fibber', 2620, 560, 0], ['fibber', 2660, 630, 0.8], ['grunt', 1100, 600, 2.0], ['fibber', 2700, 590, 3.4]] },
      { id: 'elite', x: 2800, cam: 2300, standoff: 'elite' },
      { id: 'boss', x: 3620, cam: 4400 - 1280, standoff: 'boss' },
    ],
    elite: {
      prefix: 'ham', name: 'Hamish', label: 'HAMISH HAM', who: 'ham', kind: 'rulebook', pronoun: 'he',
      phases: [{ hp: 2, cards: [{ mode: 'claim', rule: 'claim' }, { mode: 'claim', rule: 'groves' }] }],
      intro: [
        { who: 'ham', text: "Ah, a new player! The company votes on a stage upgrade, and each of us declares, hand on heart, what it's worth." },
        { who: 'tempo', text: "You're the planner now. It gets built if the three claims add up to at least its cost, and the card sets what each pays." },
        { who: 'tempo', text: 'You know your true value. Pick the claim that leaves you best off, and watch whether the truth is it.' },
      ],
      outro: [
        { who: 'ham', text: 'Under the first rule I lied like a leading man. Redline writes traps, but the second rule left me no reason to lie.' },
        { who: 'lisa', text: "So the rule decides if truth pays. When I pay just the part the others leave uncovered, the truth is my best claim." },
        { who: 'tempo', text: "A move that's best whatever the others do is called dominant. That second rule is a Groves mechanism." },
      ],
    },
    boss: {
      prefix: 'redline', name: 'Redline', label: 'REDLINE', who: 'redline', kind: 'rulebook', pronoun: 'she', standY: 520,
      phases: [
        { hp: 2, cards: [{ mode: 'rule', set: 1 }, { mode: 'rule', set: 2 }] },
        { hp: 2, cards: [{ mode: 'vote', set: 1 }, { mode: 'vote', set: 2 }] },
        { hp: 2, cards: [{ mode: 'solomon' }] },
      ],
      phaseIntros: [
        [
          { who: 'redline', cue: 'redlineStrike', text: "Zero gave me the house and your page. Write me a rule where nobody gains by lying, and I'll eat my red pen." },
          { who: 'tempo', text: "Pick a payment rule for the upgrade. These aren't Ham's rules, so look at what each one makes you pay, and why." },
        ],
        [
          { who: 'redline', text: "Money makes it easy. This time it's a vote on three shows, and nobody pays anyone a penny." },
          { who: 'tempo', text: "Any rule that works can be rewritten as asking for each ranking. That's the revelation principle, so test each one." },
        ],
        [
          { who: 'redline', text: "Two actors swear the lead is theirs, and one is lying. Solomon had the same trouble, so I borrowed his trick." },
          { who: 'tempo', text: 'Each is asked in turn, and a yes can carry a fine. Work back from the last question, like the deadline games.' },
        ],
      ],
      brawl: { who: 'redline', text: "The rule book says I lost, so I'm tearing out that page and fighting you myself." },
      taunt: { who: 'redline', text: 'Fibbers, places. Tell her whatever she wants to hear.' },
      interludes: [[['fibber', 1400, 560, 0], ['fibber', 1450, 630, 0.6]], [['fibber', 1400, 560, 0], ['grunt', -140, 630, 0.6], ['fibber', 1450, 600, 2]]],
      outro: [
        { who: 'redline', cue: 'redlinePen', text: "Fine, I'll eat the pen. Just remember that a lie-proof vote where every show can win still needs a dictator." },
        { who: 'lisa', text: 'Zero was half right. A lie-proof vote where any show can win needs a dictator, but with money or a fine, truth can pay.' },
        { who: 'zero', cue: 'zeroSweep', text: 'Rules only work in the light, my dears. In my next club nobody sees a thing, and ignorance is just weakness.' },
        { who: 'tempo', text: "That's page eight of the setlist! Hold it up." },
        { who: 'juno', text: "Lisa, I heard the whole theater clap! Now it's so foggy where they've taken me, I can't tell which room I'm in." },
        { who: 'tempo', text: "The next page drifted into the Fog Club, where you never quite know where you're standing." },
      ],
    },
    end: {
      title: 'RULEBOOK THEATER CLEARED', notes: BOOK_NOTES_W8, chapter: 'Chapter 10',
      dagger: "The cards, the rule names, the upgrade's cost of ten, the shows and the fibbers (and catching one turning him honest) were made up for this game. Pay the Gap, The Door Fee and The Kickback are Groves mechanisms (184.1); Pay the Gap is Clarke's version, which works here because claims can't go below zero. Values are whole coins, the others' totals are tested in half coins, the token fine is half a coin, and voters' rankings have no ties, though the book allows them. Solomon's form follows Figure 191.1.",
      next: { level: 'w9', label: 'Next: The Fog Club ▶' },
    },
  },
  w9: {
    id: 'w9', title: 'THE FOG CLUB', chapter: 'Chapter 11: Imperfect Information', music: 'level_09', width: 4400, page: 9, skin: 'lisar',
    art: {
      far: 'fog_far', mids: ['fog_mid_a'], ground: 'fog_ground', overlap: 150, fog: true,
      stage: { key: 'fog_stage', x: 3900, scale: 1.0 },
      fg: [['fg_table', 180, 0.9], ['fg_sax', 1420, 0.75], ['fg_sax', 2860, 0.75], ['fg_table', 3000, 0.9]],
    },
    grunt: 'fogger', habitMeter: false, talkKind: 'fogger',
    intro: [
      { who: 'tempo', text: "There's fog everywhere, just like Juno said. Page nine is somewhere in this club, if we can ever find the club." },
      { who: 'zero', cue: 'zeroScreen', text: 'Welcome to the Fog Club, my dears. In here nobody sees what anyone else just did.' },
      { who: 'zero', text: "Ignorance is just weakness. If you can't see what happened, you can't plan, and you can't win." },
      { who: 'lisa', cue: 'zeroScreenOff', text: "Then I'll have to win without seeing everything." },
      { who: 'lisa', text: 'A new act gets a new coat. In fog this thick, red is the one thing anyone can see.' },
    ],
    readerTalk: [
      { who: 'tempo', text: "In the fog you only see two moves a fogger might use. Pick the answer that's safe against both of them." },
      { who: 'lisa', text: "So one answer has to work for everything I can't tell apart." },
    ],
    triggers: [
      { id: 'wave1', x: 560, cam: 0, spawn: [['grunt', 1420, 560, 0], ['fogger', 1180, 630, 1.0], ['fogger', 1340, 560, 1.8]] },
      { id: 'wave2', x: 1750, cam: 1250, spawn: [['fogger', 2620, 560, 0], ['fogger', 2660, 630, 0.8], ['grunt', 1100, 600, 2.0], ['fogger', 2700, 590, 3.4]] },
      { id: 'elite', x: 2800, cam: 2300, standoff: 'elite' },
      { id: 'boss', x: 3620, cam: 4400 - 1280, standoff: 'boss' },
    ],
    elite: {
      prefix: 'smokey', name: 'Smokey', label: 'SMOKEY BLUE', who: 'smokey', kind: 'fog', pronoun: 'he',
      phases: [{ hp: 2, cards: [{ mode: 'plan' }, { mode: 'kuhn', book: true }] }],
      intro: [
        { who: 'smokey', text: 'Evening, red. I play in the fog, and you never get to see which way I went.' },
        { who: 'tempo', text: "Spots you can't tell apart form an information set. A plan picks one move for each set, not for each spot." },
        { who: 'tempo', text: 'So choose your whole plan up front, using how often he plays high and how often he plays low.' },
      ],
      outro: [
        { who: 'smokey', text: "You never saw my move and still had the answer ready. That's cool, red. Velma has your page, up by the stage." },
        { who: 'lisa', text: 'A plan picks one move for each place I can tell apart. The fog just makes two places into one.' },
        { who: 'tempo', text: 'With perfect recall, a mixed strategy over whole plans and a behavioral one, mixing at each step, come out the same.' },
      ],
    },
    boss: {
      prefix: 'velma', name: 'Velma', label: 'VELMA VAGUE', who: 'velma', kind: 'fog', pronoun: 'she', standY: 520,
      phases: [
        { hp: 2, cards: [{ mode: 'driver', book: true }, { mode: 'driver' }] },
        { hp: 2, cards: [{ mode: 'bluff', k: 4 }, { mode: 'bluff' }] },
      ],
      phaseIntros: [
        [
          { who: 'velma', text: "Zero left your page with me, darling. I hid it behind one of my doors, and now I can't recall which." },
          { who: 'velma', cue: 'velmaDoors', text: 'Every door in my hall looks the same, and I never remember which one I just passed.' },
          { who: 'tempo', text: "That's imperfect recall. The second door pays best, but she can't tell them apart, so pick how often she walks on." },
        ],
        [
          { who: 'velma', text: "Let's play cards instead. I can see my card and you can't, and I just might be bluffing." },
          { who: 'tempo', text: "If she admits a low card she pays you. If she claims it's high, you give in or insist on seeing it." },
        ],
      ],
      taunt: { who: 'velma', text: "Foggers, keep my guest company while I find my way back. It's somewhere around here, I think." },
      brawl: { who: 'velma', text: "I forget why we're fighting, darling, but I'm sure I'll enjoy it." },
      interludes: [[['fogger', 1200, 560, 0], ['fogger', 1240, 630, 0.9], ['grunt', -140, 600, 1.6]]],
      outro: [
        { who: 'velma', text: 'So a head like mine does best by flipping a weighted coin at every door. How very strange, darling.' },
        { who: 'lisa', text: "Zero said ignorance is weakness. I couldn't see her card, but the right rate kept my loss as small as it could be." },
        { who: 'zero', cue: 'zeroSweep', text: "You were clever in the dark, my dears. At my masquerade everyone wears a mask, and beliefs don't matter, only actions." },
        { who: 'tempo', text: "That's page nine of the setlist! Hold it up." },
        { who: 'juno', text: "Lisa, the fog is lifting here, so you must have won! But now everyone around me is wearing a mask." },
        { who: 'tempo', text: 'The next page went to the Masquerade, where nobody is quite who they seem.' },
      ],
    },
    end: {
      title: 'FOG CLUB CLEARED', notes: BOOK_NOTES_W9, chapter: 'Chapter 11',
      dagger: "The cards, the club, Smokey's mix, the payoffs, the foggers and their two-move tags were made up for this game. The doors follow Figure 214.1 and the cards Exercise 217.3, each with the book's numbers first; the insisting and bluffing rates are our solution, and Velma always claims high with a high card.",
      next: { level: 'w10', label: 'Next: The Masquerade ▶' },
    },
  },
  w10: {
    id: 'w10', title: 'THE MASQUERADE', chapter: 'Chapter 12: Sequential Equilibrium', music: 'level_10', width: 4400, page: 10, skin: 'lisar',
    art: {
      far: 'ball_far', mids: ['ball_mid_a'], ground: 'ball_ground', overlap: 1,
      stage: { key: 'ball_stage', x: 3900, scale: 1.0 },
      fg: [['fg_buffet', 40, 0.8], ['fg_candle', 1420, 0.7], ['fg_candle', 2860, 0.7], ['fg_buffet', 3000, 0.9]],
    },
    grunt: 'masker', habitMeter: false, talkKind: 'masker',
    intro: [
      { who: 'tempo', text: 'Juno said everyone here wears a mask. Page ten is somewhere in this ballroom, so keep your eyes open.' },
      { who: 'zero', cue: 'zeroScreen', text: 'Welcome to my masquerade, my dears. Behind every mask is a guest you will never see.' },
      { who: 'zero', text: 'Only what people do matters. Guessing what hides behind a mask is a waste of your time.' },
      { who: 'lisa', cue: 'zeroScreenOff', text: "I can't see under the masks, but I can watch what everyone does." },
    ],
    readerTalk: [
      { who: 'tempo', text: "Every mask looks the same, but each masker sticks to one move. The tally up top shows who's still hiding." },
      { who: 'lisa', text: 'So I answer the move most of them use, and I learn more every time a mask falls.' },
    ],
    triggers: [
      { id: 'wave1', x: 560, cam: 0, spawn: [['masker', 1420, 560, 0], ['masker', 1180, 630, 1.0], ['masker', 1340, 560, 1.8]] },
      { id: 'wave2', x: 1750, cam: 1250, spawn: [['masker', 2620, 560, 0], ['masker', 2760, 630, 0.8], ['masker', 1100, 600, 2.0], ['masker', 2700, 590, 3.4], ['masker', 1020, 560, 4.6]] },
      { id: 'elite', x: 2800, cam: 2300, standoff: 'elite' },
      { id: 'boss', x: 3620, cam: 4400 - 1280, standoff: 'boss' },
    ],
    elite: {
      prefix: 'domino', name: 'Domino', label: 'DOMINO', who: 'domino', kind: 'masque', pronoun: 'he',
      phases: [{ hp: 3, cards: [{ mode: 'bayes' }, { mode: 'never' }, { mode: 'dominated' }] }],
      intro: [
        { who: 'domino', text: "Care to dance, red? I'll step in or bow out, and my mask keeps the rest a secret." },
        { who: 'tempo', text: "When you can't see his step, you hold a belief about it, and Bayes' rule turns his mix into that belief." },
        { who: 'tempo', text: "Then make the move that's best for that belief. That's called sequential rationality." },
      ],
      outro: [
        { who: 'domino', text: 'You read me without seeing a thing. The Contessa has your page, and she is much harder to read.' },
        { who: 'lisa', text: 'A belief tells me where I probably am. Then I play my best move there, even at a spot nobody reaches.' },
        { who: 'tempo', text: 'Your plan and your beliefs together make an assessment.' },
        { who: 'tempo', text: "When every move suits its belief, and every belief is consistent with the plan, that's a sequential equilibrium." },
      ],
    },
    boss: {
      prefix: 'cameo', name: 'Cameo', label: 'CAMEO', who: 'cameo', kind: 'masque', pronoun: 'she', standY: 520,
      phases: [
        { hp: 2, cards: [{ mode: 'posterior', book: true }, { mode: 'posterior' }] },
        { hp: 2, cards: [{ mode: 'intuit' }, { mode: 'tremble' }] },
      ],
      phaseIntros: [
        [
          { who: 'cameo', cue: 'cameoMask', text: "Zero gave me your page, my sweet. Let's see if you can tell my strong guests from my weak ones." },
          { who: 'cameo', text: "Every guest at my buffet swears he's strong. Fight a weak one if you like, but do leave the strong ones be." },
          { who: 'tempo', text: 'Strong guests like beer and weak ones like quiche. In a signalling game like this, the order changes what you believe.' },
        ],
        [
          { who: 'cameo', text: 'My guests have learned a trick. Now they all order the same dish, so nobody can tell them apart.' },
          { who: 'tempo', text: 'When a guest breaks the pattern, ask who could ever gain by it. That tells you what to believe about him.' },
          { who: 'cameo', text: "And then you'll dance with me, my sweet. Do mind my feet, because they have a way of slipping." },
        ],
      ],
      taunt: { who: 'cameo', text: 'Maskers, entertain my guest while I fix my face. A hostess must always look her best.' },
      brawl: { who: 'cameo', text: "Enough cards, my sweet. Let's see how you dance when nobody is dealing." },
      interludes: [[['masker', 1180, 560, 0], ['masker', 1230, 630, 0.9], ['masker', -140, 600, 1.6], ['masker', -100, 560, 2.6]]],
      outro: [
        { who: 'cameo', text: 'You saw through every mask in my house without lifting a single one. How terribly rude, and how clever.' },
        { who: 'lisa', text: 'Zero said only actions matter. But every right move hung on a belief, and I built each belief from what people did.' },
        { who: 'zero', cue: 'zeroSweep', text: 'Masks and beliefs, how quaint. Come to my block party, my dears, and watch every alliance break.' },
        { who: 'tempo', text: "That's page ten of the setlist! Hold it up." },
        { who: 'juno', text: 'Lisa, the masks just fell off everyone here! But I can hear a party outside, and the crews are arguing.' },
        { who: 'tempo', text: 'The next page went to the Block Party. Zero swears every alliance there will break.' },
      ],
    },
    end: {
      title: 'MASQUERADE CLEARED', notes: BOOK_NOTES_W10, chapter: 'Chapter 12',
      dagger: "The ballroom, the guests, Domino's mixes, the variant guest lists, the swapped letters on some trees, the odd-order test run on the book's all-beer equilibrium, the dance names and the maskers were made up for this game. The trees follow Figures 219.1, 220.1 and 244.1, the buffet follows Beer or Quiche (Example 244.2, with the book's numbers first) and the dance follows Figure 248.1.",
      next: null,
    },
  },
}
