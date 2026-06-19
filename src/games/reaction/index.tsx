import { GameShell } from '../../components/GameShell';
import { StatusBadge } from '../../components/StatusBadge';
import { getGame } from '../../data/games';

// Stub. The reaction agent replaces this file's contents but keeps the
// default-exported component contract that the router lazy-imports.
export default function ReactionGame() {
  const game = getGame('reaction');
  return (
    <GameShell game={game} status={<StatusBadge status="idle" />}>
      <div className="flex aspect-square w-full max-w-md items-center justify-center rounded-md border-2 border-border bg-surface font-display text-muted">
        Reaction Timer coming soon
      </div>
    </GameShell>
  );
}
