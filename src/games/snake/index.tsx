import { GameShell } from '../../components/GameShell';
import { StatusBadge } from '../../components/StatusBadge';
import { getGame } from '../../data/games';

// Stub. The snake agent replaces this file's contents but keeps the
// default-exported component contract that the router lazy-imports.
export default function SnakeGame() {
  const game = getGame('snake');
  return (
    <GameShell game={game} status={<StatusBadge status="idle" />}>
      <div className="flex aspect-square w-full max-w-md items-center justify-center rounded-md border-2 border-border bg-surface font-display text-muted">
        Snake coming soon
      </div>
    </GameShell>
  );
}
