import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { GAMES, GAMES_BY_ID } from '../data/games';
import type { ArcadeStorageV1, GameDefinition } from '../types/game';
import { useArcade } from '../hooks/useArcade';
import { formatElapsed } from '../lib/records';
import { Wordmark } from '../components/Wordmark';
import { Panel } from '../components/Panel';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';

function bestLabel(records: ArcadeStorageV1['records'], id: GameDefinition['id']): string {
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
  }
}

function GameCard({ game, best }: { game: GameDefinition; best: string }) {
  return (
    <Link
      to={game.route}
      style={{ ['--accent']: `var(${game.accent})` } as CSSProperties}
      className="group flex h-full w-full flex-col gap-3 rounded-md border-2 border-border bg-surface p-5 shadow-raised transition-transform duration-150 ease-out hover:border-border-strong active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg" style={{ color: 'var(--accent)' }}>
          {game.title}
        </h3>
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-sm"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      </div>
      <p className="text-sm text-muted">{game.description}</p>
      <p className="text-xs text-muted">
        <span aria-hidden="true">{'> '}</span>
        {game.controls[0]}
      </p>
      <div className="mt-auto flex items-end justify-between pt-2">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.08em] text-muted">Best</p>
          <p className="font-display text-sm font-bold tabular-nums text-fg">{best}</p>
        </div>
        <span className="font-display text-sm font-semibold text-fg transition-colors group-hover:text-[color:var(--accent)]">
          Play <span aria-hidden="true">▸</span>
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const { state, reset } = useArcade();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const hasPlays = state.recentPlays.length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4">
      <section className="py-4 text-center sm:py-8">
        <Wordmark as="h1" className="text-3xl sm:text-4xl" />
        <p className="mx-auto mt-4 max-w-prose text-muted">
          A pocket sized retro arcade. Three quick games, local high scores, and snappy sound. No
          sign in, no downloads, just press start.
        </p>
      </section>

      <section aria-labelledby="games-heading">
        <h2 id="games-heading" className="sr-only">
          Games
        </h2>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GAMES.map((game) => (
            <li key={game.id} className="h-full">
              <GameCard game={game} best={bestLabel(state.records, game.id)} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="recent-heading" className="mt-10">
        <h2 id="recent-heading" className="text-xl text-fg">
          Recent plays
        </h2>
        <Panel className="mt-3">
          {hasPlays ? (
            <ul className="divide-y divide-border">
              {state.recentPlays.map((play, i) => (
                <li key={`${play.at}-${i}`} className="flex items-center justify-between py-2">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: `var(${GAMES_BY_ID[play.game].accent})` }}
                    />
                    <span className="font-semibold text-fg">{GAMES_BY_ID[play.game].title}</span>
                  </span>
                  <span className="font-display text-sm tabular-nums text-muted">{play.label}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted">No games played yet. Pick a game above to start.</p>
          )}
        </Panel>
      </section>

      <section className="mt-10 mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
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
