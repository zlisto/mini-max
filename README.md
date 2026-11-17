# Mini Max

A 2D beat 'em up that teaches game theory. Lisa "Mini" Maxobal fights through the neon city of Equilibria, where every fight is a game: brawls run on a Strike / Guard / Grab triangle, and standoffs are zero-sum payoff-matrix games won by finding the move with the best guarantee.

**Play:** https://zlisto.github.io/mini-max/

Playable so far: the prologue (the Prisoner's Dilemma), World 1, the Neon Strip (Nash equilibrium and maxminimizers in strictly competitive games), and World 2, the Casino Arcade (mixed strategies: set a roulette wheel so that no answer gains the house anything).

## Source

Based on *A Course in Game Theory* by Martin J. Osborne and Ariel Rubinstein (MIT Press, 1994), Chapters 1–3. Every game-theory idea in the game cites its definition and page in the book on the end screen. The Strike / Guard / Grab triangle and the fight-card numbers are inventions of the game, not from the book. No text from the book is included here.

Part of the [Arcade of Alexandria](https://github.com/zlisto/arcade_of_alexandria), which turns textbooks into games that teach them. A fan-made learning game; not affiliated with the authors or publisher.

## Controls

Arrows / WASD move · J strike · K guard (hold) · L grab · Space talk · M music · Wheel standoffs: W/S pick a move, A/D move slices, Space spin

## Run locally

```
npm ci
npm run dev
```

Built with Phaser 3 and Vite. Art generated with Google Gemini; the game is built into `docs/` for GitHub Pages (`npx vite build --outDir docs`).
