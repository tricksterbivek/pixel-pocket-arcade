# Pixel Pocket Arcade - Project Guide

Retro mini-game website with three games: Snake, Memory Match, Reaction Timer.
React + TypeScript (strict) + Vite + Tailwind + React Router + Vitest + RTL + Playwright.

## Commands (verified)

```bash
npm run dev         # vite dev server on http://localhost:5173 (strict port)
npm run build       # tsc --noEmit && vite build  -> outputs dist/
npm run preview     # preview production build on 5173
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npm test            # vitest run (unit + component)
npm run test:watch  # vitest (watch)
npm run e2e         # playwright test
```

Quality gate before any push: `npm run typecheck && npm run lint && npm test && npm run build`, then Playwright for QA/release milestones.

## Architecture

Game rules are pure and deterministic, kept separate from React rendering.

```
src/
  main.tsx                 entry, mounts <App/>
  App.tsx                  router + providers + error boundary
  index.css                Tailwind layers + global tokens
  types/game.ts            GameId, GameDefinition, GameResult, RecentPlay
  data/games.ts            the three GameDefinition records
  lib/
    storage.ts             ArcadeStorageV1, load/save/validate/reset (versioned)
    records.ts             pure record reducers + best comparators (tested)
    audio.ts               Web Audio service singleton (lazy, gesture-gated)
  state/ArcadeProvider.tsx  context: state, recordResult, toggleSound, reset
  hooks/
    useArcade.ts           read context
    usePageVisibility.ts   pause-on-hidden helper
    useReducedMotion.ts
  components/               shared UI: Button, Card, Panel, Stat, StatusBadge,
                           SoundToggle, DPad, GameShell, ErrorBoundary, ConfirmDialog, Layout
  pages/Home.tsx           arcade home
  pages/NotFound.tsx       404 route
  games/
    snake/                 OWNED BY snake agent
    memory/                OWNED BY memory agent
    reaction/              OWNED BY reaction agent
src/test/setup.ts          vitest + jsdom + jest-dom + matchMedia/AudioContext stubs
e2e/                       Playwright specs (QA owns additions)
```

### Routes (React Router v6, game routes lazy-loaded)

- `/` Home
- `/games/snake`, `/games/memory`, `/games/reaction`
- `*` NotFound

Router lazy-imports each game's directory entry: `lazy(() => import('./games/snake'))`.
Each game directory MUST keep `src/games/<id>/index.tsx` with a default-exported
React component (the full game screen). Foundation ships working stubs; game agents
replace the contents but preserve that default-export contract.

### Shared contracts (src/types/game.ts)

```ts
export type GameId = 'snake' | 'memory' | 'reaction';

export interface GameDefinition {
  id: GameId;
  title: string;
  description: string;
  route: string;
  controls: readonly string[];
  scoreLabel: string;
  accent: string; // CSS custom-property name for the game accent, e.g. '--accent-snake'
}

export interface SnakeResult { game: 'snake'; score: number; }
export interface MemoryResult { game: 'memory'; moves: number; elapsedMs: number; }
export interface ReactionResult { game: 'reaction'; averageMs: number; rounds: number[]; }
export type GameResult = SnakeResult | MemoryResult | ReactionResult;

export interface RecentPlay { game: GameId; label: string; at: number; }
```

### Versioned storage (src/lib/storage.ts)

One namespaced key `pixel-pocket-arcade`, shape:

```ts
interface ArcadeStorageV1 {
  version: 1;
  settings: { soundEnabled: boolean };
  records: {
    snakeHighScore: number;
    memoryBest: { moves: number; elapsedMs: number } | null;
    reactionBestAverageMs: number | null;
  };
  recentPlays: RecentPlay[]; // capped at 10, newest first
}
```

- Parsed data is validated; malformed or unsupported data recovers to defaults.
- Reads happen once at provider init, not in render loops.
- Only completed results and settings are persisted.
- `resetArcade()` clears data and restores defaults.

### How games integrate (read this, game agents)

- Call `const { recordResult } = useArcade()` and invoke `recordResult(result)` once on completion.
  Foundation updates records (high score / best) and recentPlays; do not write storage directly.
- Best-result rules live in `lib/records.ts` and are applied by `recordResult`.
  Import `isBetterMemory` / `isBetterReactionAvg` from `lib/records.ts` for in-game "new best" UI if wanted.
- Play sounds with the audio service: `audio.play('select' | 'score' | 'success' | 'error')`.
  Never construct AudioContext yourself. Audio is gesture-gated and respects the global toggle.
- Wrap your screen in `<GameShell game={def} status={...} stats={...} onRestart={...}>{board}</GameShell>`.
- Use shared `<Button>`, `<Stat>`, `<StatusBadge>`, `<DPad>` rather than re-styling primitives.
- Inject randomness/timing for testability: pure logic functions take `rng: () => number`
  (default `Math.random`) and never call timers directly. Components own real timers.

## Ownership and boundaries

- The LEAD owns all shared, config, and Git/release files: package.json, tsconfig, vite/tailwind/
  postcss/vitest/playwright config, src/main.tsx, src/App.tsx, src/index.css, src/types/**,
  src/data/**, src/lib/**, src/state/**, src/hooks/**, src/components/**, src/pages/**, src/test/**,
  e2e/** (QA may add specs via lead), README.md, CLAUDE.md, vercel.json, .gitignore.
- Game agents own ONLY their directory: `src/games/<id>/**`. Nothing else.
- A game agent needing a shared change REPORTS it to the lead; it never edits shared files.

## Git policy

- The LEAD is the only Git writer. Teammates MUST NOT run git add/commit/push/branch/merge/rebase/
  reset/checkout or any state-changing git command.
- Milestone commits: `chore: initialize pixel pocket arcade`, `feat: build arcade foundation`,
  `feat: add three arcade games`, `chore: verify arcade release`.
- Secret scan runs before every push. Never commit .env, .vercel, tokens, or caches.

## Quality and Ponytail constraints

- Strict TypeScript. No `any`, no unsafe assertions, no duplicated game state, no unversioned storage.
- YAGNI: simplest architecture that meets requirements. No speculative abstractions, no backend,
  no database, no auth, no game engine, no analytics, no downloaded assets.
- Never simplify away validation, security, accessibility, or required product behavior.
- Accessibility: WCAG 2.1 AA. One h1 per page, semantic landmarks, visible focus, 44px touch targets,
  live-region status, reduced-motion support, no color-only information, no keyboard trap.
- No em dash in docs or user-facing copy.

## Verification rule

Never claim completion from inspection alone. Run the commands and read the output.
