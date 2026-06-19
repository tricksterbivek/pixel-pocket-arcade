# 🕹️ PIXEL POCKET ARCADE

```
  ____  _          _   ____            _        _
 |  _ \(_)_  _____| | |  _ \ ___   ___| | _____| |_
 | |_) | \ \/ / _ \ | | |_) / _ \ / __| |/ / _ \ __|
 |  __/| |>  <  __/ | |  __/ (_) | (__|   <  __/ |_
 |_|   |_/_/\_\___|_| |_|   \___/ \___|_|\_\___|\__|
                A R C A D E
```

> **▶ INSERT COIN ▶** A polished retro mini-game website with five quick games, local high scores, and snappy generated sound, all client side. No sign in, no backend, no downloads.

### ⭐ `PRESS START` ⭐ → **[▶ TRY IT LIVE ◀](https://pixel-pocket-arcade.vercel.app/)**

![React](https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![Players](https://img.shields.io/badge/PLAYERS-1-ff0066?style=flat-square)
![High Scores](https://img.shields.io/badge/HIGH_SCORES-LOCAL-00ff99?style=flat-square)

---

## 🎮 SELECT YOUR GAME

```
 ╔════════════════╗  ╔════════════════╗  ╔════════════════╗  ╔════════════════╗  ╔════════════════╗
 ║   🐍 SNAKE     ║  ║ 🃏 MEMORY      ║  ║ ⚡ REACTION    ║  ║ 🚗 MINI DRIVE  ║  ║ 🚀 STAR GUNNER ║
 ║                ║  ║    MATCH       ║  ║    TIMER       ║  ║    (3D)        ║  ║    (3D)        ║
 ║  Eat. Grow.    ║  ║  Flip & pair   ║  ║  Fast fingers  ║  ║  Dodge the     ║  ║  Blast real    ║
 ║  Don't crash.  ║  ║  every card.   ║  ║  win the day.  ║  ║  traffic.      ║  ║  NASA rocks.   ║
 ╚════════════════╝  ╚════════════════╝  ╚════════════════╝  ╚════════════════╝  ╚════════════════╝
```

| Game | Objective | Score |
| :--- | :--- | :--- |
| 🐍 **Snake** | Eat, grow, and survive | High score |
| 🃏 **Memory Match** | Match every pair | Fewest moves, then fastest time |
| ⚡ **Reaction Timer** | React on the green light | Best average |
| 🚗 **Mini Drive** | Dodge oncoming traffic in 3D | Best distance |
| 🚀 **Star Gunner** | Blast real near-Earth asteroids in 3D | High score |

---

## 🪙 INSERT COIN - `REQUIREMENTS`

- 🟢 Node.js **20** or newer
- 🟢 npm **10** or newer

## 💾 LOAD GAME - `INSTALLATION`

```bash
npm install
```

## ▶️ START - `DEVELOPMENT`

```bash
npm run dev
```

Open http://localhost:5173 and let the games begin. 🚀

## 🧪 CHEAT CODES - `TEST COMMANDS`

```bash
npm test           # ↑↑↓↓ unit & component tests (Vitest, single run)
npm run test:watch # Vitest in watch mode
npm run typecheck  # TypeScript strict type check
npm run lint       # ESLint
npm run e2e        # Playwright end-to-end tests (desktop & mobile)
```

## 📦 SHIP IT - `PRODUCTION BUILD`

```bash
npm run build   # type checks, then builds to dist/
npm run preview # serves the production build on http://localhost:5173
```

---

## 🎯 CONTROLS - `HOW TO PLAY`

### 🐍 SNAKE
- ⬆️⬇️⬅️➡️ Arrow keys or `W` `A` `S` `D` to steer
- 📱 On-screen D-pad for touch
- ⏸️ `Space` or `P` to pause and resume

### 🃏 MEMORY MATCH
- 👆 Click or tap a card to flip it
- ⌨️ `Tab` to move between cards, `Enter` or `Space` to flip
- 🏆 Match every pair to finish

### ⚡ REACTION TIMER
- 💥 Click, tap, or press `Space` to react
- 🚫 Do **not** move before the green light
- 🔁 Five valid rounds per session

### 🚗 MINI DRIVE (3D)
- ⬅️➡️ Arrow keys or `A` `D` to steer between lanes
- 📱 On-screen steer buttons for touch
- 🏁 Dodge the oncoming cars and go the distance

### 🚀 STAR GUNNER (3D)
- 🖱️ Move the mouse or your finger to aim
- 💥 Click, tap, or press `Space` to fire (arrow keys nudge your aim)
- ☄️ Targets are real near-Earth asteroids pulled live from NASA

---

## 🏗️ INSIDE THE CABINET - `ARCHITECTURE`

Built with **React**, **TypeScript** (strict), **Vite**, **Tailwind CSS v4**, **React Router**, and **three.js** (for the 3D games, Mini Drive and Star Gunner).

- 🚗 Mini Drive renders in 3D with three.js. Its route and the three.js bundle are lazy loaded, so they only download when you open that game; the rest of the arcade stays light.

- 🚀 Star Gunner also renders in 3D with three.js and is the only game that talks to the network. It pulls a roster of real near-Earth objects from NASA's public NeoWs API, caches the result briefly, and falls back to a built-in set so it always works offline. Pure hit detection and scoring live in `gunnerLogic.ts`; the network layer is isolated in `neo.ts`.

- Deterministic game rules are pure and live in `src/games/<id>/<id>Logic.ts`, separate from the React components that render them and own real timers and input. This keeps the rules unit testable without waiting on timers.
- Routing is in `src/App.tsx`. Game routes are lazy loaded with a visible loading fallback and wrapped in an error boundary with a recovery action.
- Shared, render-agnostic data lives in `src/types/game.ts` (the `GameDefinition` contract and the `GameResult` union) and `src/data/games.ts`.
- Arcade state (settings, records, recent plays) is held in one React context, `src/state/ArcadeProvider.tsx`. Storage is read once at startup, never inside a render loop.
- Shared UI is in `src/components` (GameShell, Button, Panel, Stat, StatusBadge, SoundToggle, DPad, ConfirmDialog, ErrorBoundary, Layout, Header, Wordmark).

## 🏆 HIGH SCORE TABLE - `STORAGE BEHAVIOR`

- All data is kept in one namespaced, versioned localStorage document under the key `pixel-pocket-arcade` (`ArcadeStorage`, currently version 3, with forward migration from older versions).
- Parsed data is validated on read. Malformed or unsupported data falls back to safe defaults rather than crashing.
- Only completed results and your sound setting are saved. Recent plays are capped at 10.
- Records: Snake high score, Memory best (fewer moves, then faster time), Reaction best average, Mini Drive best distance, and Star Gunner high score.
- The home page has a **Reset data** action, behind a confirmation, that clears everything and restores defaults.

## 🔊 8-BIT SOUND - `AUDIO BEHAVIOR`

- Short sound effects are generated with the Web Audio API. There are no audio files and no background music.
- The audio context is created or resumed only after a user interaction, per browser autoplay rules.
- A global sound toggle in the header turns effects on or off, and the choice is saved.
- The app stays fully usable if Web Audio is unavailable.

## ♿ EVERYONE PLAYS - `ACCESSIBILITY`

- One logical `h1` per page, semantic landmarks, and visible focus states.
- Full keyboard operation, with no keyboard trap.
- Touch targets are at least 44 × 44 CSS pixels.
- Status is announced through live regions and is never conveyed by color alone.
- Reduced motion is respected: animations collapse to instant state changes and gameplay still works.

---

## 🆕 ADD A NEW CARTRIDGE - `GAMEDEFINITION`

1. Create `src/games/<id>/index.tsx` with a default exported screen component that wraps its content in `GameShell`. Keep pure rules in `src/games/<id>/<id>Logic.ts` with their own tests.
2. Add a `GameDefinition` entry to `src/data/games.ts` (id, title, description, route, controls, scoreLabel, accent). Add an accent color token in `src/index.css` if you want a new hue.
3. Add a lazy route in `src/App.tsx` at `/games/<id>`.
4. If the game keeps a persistent best, extend `ArcadeStorage` in `src/types/game.ts`, the reducer and comparator in `src/lib/records.ts`, and the validator in `src/lib/storage.ts`. Bump the storage version and handle migration if you change the shape.

## ⚠️ GAME OVER? - `KNOWN LIMITATIONS`

- Records and settings are stored per browser and per device. They do not sync across devices, and clearing site data removes them.
- Single player only, by design. There are no online leaderboards, accounts, or analytics.
- Sound effects need a browser that supports the Web Audio API. Everything else degrades gracefully.

## 🛰 DATA AND CREDITS

- Star Gunner targets come from NASA's public NeoWs near-Earth object API. NASA data is in the public domain. See https://api.nasa.gov for details.
- All in-game and card art is generated for this project. There are no paid, copyrighted, or hotlinked assets.

---

```
        ╔══════════════════════════════════╗
        ║   GAME OVER?  PRESS START AGAIN   ║
        ║         ▶  INSERT COIN  ◀         ║
        ╚══════════════════════════════════╝
```

<p align="center"><strong>★ THANKS FOR PLAYING ★</strong></p>
