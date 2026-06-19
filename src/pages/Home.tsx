import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { GAMES, GAMES_BY_ID } from '../data/games';
import type { ArcadeStorage, GameDefinition, GameId } from '../types/game';
import { useArcade } from '../hooks/useArcade';
import { formatElapsed } from '../lib/records';
import { Panel } from '../components/Panel';
import { Button, buttonClasses } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import heroArt from '../assets/hero.jpg';
import snakeArt from '../assets/snake.jpg';
import memoryArt from '../assets/memory.jpg';
import reactionArt from '../assets/reaction.jpg';
import driveArt from '../assets/drive.jpg';

const ART: Record<GameId, string> = {
  snake: snakeArt,
  memory: memoryArt,
  reaction: reactionArt,
  drive: driveArt,
};

function bestLabel(records: ArcadeStorage['records'], id: GameId): string {
  switch (id) {
    case 'snake':
      return records.snakeHighScore > 0 ? `Score ${records.snakeHighScore}` : 'No record yet';
    case 'memory':
      return records.memoryBest
        ? `${records.memoryBest.moves} moves, ${formatElapsed(records.memoryBest.elapsedMs)}`
        : 'No record yet';
    case 'reaction':
      return records.reactionBestAverageMs !== null
        ? `Avg ${Math.round(records.reactionBestAverageMs)} ms`
        : 'No record yet';
    case 'drive':
      return records.driveHighScore > 0 ? `${records.driveHighScore} m` : 'No record yet';
  }
}

function GameCard({ game, best }: { game: GameDefinition; best: string }) {
  return (
    <Link
      to={game.route}
      style={{ ['--accent']: `var(${game.accent})` } as CSSProperties}
      className="group flex h-full w-full flex-col overflow-hidden rounded-xl border border-border bg-surface/70 shadow-raised backdrop-blur transition-all duration-200 ease-out hover:-translate-y-1 hover:border-[color:var(--accent)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={ART[game.id]}
          alt=""
          loading="lazy"
          width={800}
          height={600}
          className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-surface via-surface/20 to-transparent" aria-hidden="true" />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
          {game.title}
        </h3>
        <p className="text-sm text-muted">{game.description}</p>
        <p className="text-xs text-muted">
          <span aria-hidden="true">{'› '}</span>
          {game.controls[0]}
        </p>
        <div className="mt-auto flex items-end justify-between pt-3">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted">Best</p>
            <p className="font-mono text-sm font-bold tabular-nums text-fg">{best}</p>
          </div>
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold"
            style={{
              color: 'var(--accent)',
              backgroundColor: 'color-mix(in srgb, var(--accent) 16%, transparent)',
            }}
          >
            Play <span aria-hidden="true">▸</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function Home() {
  const { state, reset } = useArcade();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasPlays = state.recentPlays.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <section className="grid items-center gap-8 py-8 sm:py-12 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-snake" aria-hidden="true" />
            Four games, zero downloads
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-fg">Pixel Pocket </span>
            <span className="text-gradient">Arcade</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-lg text-muted lg:mx-0">
            A pocket sized arcade. Four quick games, local high scores, and snappy sound. No sign
            in, no downloads, just press start.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
            <a href="#games" className={buttonClasses('primary', 'lg')}>
              Start playing
            </a>
          </div>
        </div>
        <div className="order-first lg:order-last">
          <img
            src={heroArt}
            alt=""
            width={1600}
            height={900}
            className="w-full rounded-xl border border-border shadow-raised"
          />
        </div>
      </section>

      <section id="games" aria-labelledby="games-heading" className="scroll-mt-24">
        <h2 id="games-heading" className="text-2xl font-bold text-fg">
          Pick a game
        </h2>
        <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {GAMES.map((game) => (
            <li key={game.id} className="h-full">
              <GameCard game={game} best={bestLabel(state.records, game.id)} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="recent-heading" className="mt-12">
        <h2 id="recent-heading" className="text-2xl font-bold text-fg">
          Recent plays
        </h2>
        <Panel className="mt-4">
          {hasPlays ? (
            <ul className="divide-y divide-border">
              {state.recentPlays.map((play, i) => (
                <li key={`${play.at}-${i}`} className="flex items-center justify-between py-2.5">
                  <span className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: `var(${GAMES_BY_ID[play.game].accent})` }}
                    />
                    <span className="font-semibold text-fg">{GAMES_BY_ID[play.game].title}</span>
                  </span>
                  <span className="font-mono text-sm tabular-nums text-muted">{play.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No games played yet. Pick a game above to start.</p>
          )}
        </Panel>
      </section>

      <section className="mt-10 mb-12 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Records and your sound setting are saved on this device only.
        </p>
        <Button variant="danger" onClick={() => setConfirmOpen(true)}>
          Reset data
        </Button>
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Reset arcade data?"
        message="This clears your high scores, best results, recent plays, and sound setting on this device. This cannot be undone."
        confirmLabel="Reset everything"
        danger
        onConfirm={() => {
          reset();
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
