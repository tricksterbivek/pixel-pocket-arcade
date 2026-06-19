import type { GameDefinition, GameId } from '../types/game';

export const GAMES: readonly GameDefinition[] = [
  {
    id: 'snake',
    title: 'Snake',
    description:
      'Steer the snake, eat the fruit, and grow longer without crashing into the walls or your own tail.',
    route: '/games/snake',
    controls: [
      'Arrow keys or WASD to steer',
      'On-screen D-pad for touch',
      'Space or P to pause and resume',
    ],
    scoreLabel: 'Score',
    accent: '--color-snake',
  },
  {
    id: 'memory',
    title: 'Memory Match',
    description:
      'Flip two cards at a time and clear all eight pairs. Fewer moves and a faster time win.',
    route: '/games/memory',
    controls: [
      'Click or tap a card to flip it',
      'Tab to move, Enter or Space to flip',
      'Match every pair to finish',
    ],
    scoreLabel: 'Moves',
    accent: '--color-memory',
  },
  {
    id: 'reaction',
    title: 'Reaction Timer',
    description:
      'Wait for the green light, then react as fast as you can. Five valid rounds set your average.',
    route: '/games/reaction',
    controls: [
      'Click, tap, or press Space to react',
      'Do not move before the green light',
      'Five valid rounds per session',
    ],
    scoreLabel: 'Avg ms',
    accent: '--color-reaction',
  },
] as const;

export const GAMES_BY_ID: Readonly<Record<GameId, GameDefinition>> = Object.freeze(
  Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<GameId, GameDefinition>,
);

export function getGame(id: GameId): GameDefinition {
  return GAMES_BY_ID[id];
}
