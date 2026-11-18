// Level data. Each world is one street (brawl waves) + an elite standoff + a boss with three phases.
// Book refs live in the standoff classes and the end-screen notes; dialogue stays short and in character.
import { BOOK_NOTES } from './games.js'
import { BOOK_NOTES_W2 } from './mix.js'
import { BOOK_NOTES_W3 } from './dominance.js'

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
      next: null,
    },
  },
}
