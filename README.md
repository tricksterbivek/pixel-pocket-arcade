# Pixel Pocket Arcade

**[Try it live here](https://pixel-pocket-arcade.vercel.app/)**

A polished retro mini-game website. Three quick games, local high scores, and snappy generated
sound, all client side. No sign in, no backend, no downloads.

Live games: **Snake**, **Memory Match**, and **Reaction Timer**.

## Requirements

- Node.js 20 or newer
- npm 10 or newer

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open http://localhost:5173.

## Test commands

```bash
npm test          # unit and component tests (Vitest, single run)
npm run test:watch # Vitest in watch mode
npm run typecheck # TypeScript strict type check
npm run lint      # ESLint
npm run e2e       # Playwright end to end tests (desktop and mobile)
```

## Production build

```bash
npm run build     # type checks, then builds to dist/
npm run preview   # serves the production build on http://localhost:5173
```

## Controls

### Snake
- Arrow keys or WASD to steer
- On-screen D-pad for touch
- Space or P to pause and resume

### Memory Match
- Click or tap a card to flip it
- Tab to move between cards, Enter or Space to flip
- Match every pair to finish

### Reaction Timer
- Click, tap, or press Space to react
- Do not move before the green light
- Five valid rounds per session

## Architecture

- React, TypeScript (strict), Vite, Tailwind CSS v4, and React Router.
- Deterministic game rules are pure and live in `src/games/<id>/<id>Logic.ts`, separate from the
  React components that render them and own real timers and input. This keeps the rules unit
  testable without waiting on timers.
- Routing is in `src/App.tsx`. Game routes are lazy loaded with a visible loading fallback and are
  wrapped in an error boundary with a recovery action.
- Shared, render agnostic data lives in `src/types/game.ts` (the `GameDefinition` contract and the
  `GameResult` union) and `src/data/games.ts`.
- Arcade state (settings, records, recent plays) is held in one React context,
  `src/state/ArcadeProvider.tsx`. Storage is read once at startup, never inside a render loop.
- Shared UI is in `src/components` (GameShell, Button, Panel, Stat, StatusBadge, SoundToggle, DPad,
  ConfirmDialog, ErrorBoundary, Layout, Header, Wordmark).

## Storage behavior

- All data is kept in one namespaced, versioned localStorage document under the key
  `pixel-pocket-arcade` (`ArcadeStorageV1`).
- Parsed data is validated on read. Malformed or unsupported data falls back to safe defaults rather
  than crashing.
- Only completed results and your sound setting are saved. Recent plays are capped at 10.
- Records: Snake high score, Memory best (fewer moves, then faster time), and Reaction best average.
- The home page has a Reset data action, behind a confirmation, that clears everything and restores
  defaults.

## Audio behavior

- Short sound effects are generated with the Web Audio API. There are no audio files and no
  background music.
- The audio context is created or resumed only after a user interaction, per browser autoplay rules.
- A global sound toggle in the header turns effects on or off, and the choice is saved.
- The app stays fully usable if Web Audio is unavailable.

## Accessibility

- One logical h1 per page, semantic landmarks, and visible focus states.
- Full keyboard operation, with no keyboard trap.
- Touch targets are at least 44 by 44 CSS pixels.
- Status is announced through live regions and is never conveyed by color alone.
- Reduced motion is respected: animations collapse to instant state changes and gameplay still works.

## Adding another game with GameDefinition

1. Create `src/games/<id>/index.tsx` with a default exported screen component that wraps its content
   in `GameShell`. Keep pure rules in `src/games/<id>/<id>Logic.ts` with their own tests.
2. Add a `GameDefinition` entry to `src/data/games.ts` (id, title, description, route, controls,
   scoreLabel, accent). Add an accent color token in `src/index.css` if you want a new hue.
3. Add a lazy route in `src/App.tsx` at `/games/<id>`.
4. If the game keeps a persistent best, extend `ArcadeStorageV1` in `src/types/game.ts`, the
   reducer and comparator in `src/lib/records.ts`, and the validator in `src/lib/storage.ts`. Bump
   the storage version and handle migration if you change the shape.

## Known limitations

- Records and settings are stored per browser and per device. They do not sync across devices and
  clearing site data removes them.
- Single player only, by design. There are no online leaderboards, accounts, or analytics.
- Sound effects need a browser that supports the Web Audio API. Everything else degrades gracefully.
