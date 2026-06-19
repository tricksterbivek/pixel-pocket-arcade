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
  {
    id: 'drive',
    title: 'Mini Drive',
    description:
      'Weave your mini car through oncoming traffic and go the distance. The longer you last, the faster it gets.',
    route: '/games/drive',
    controls: [
      'Arrow keys or A and D to steer',
      'On-screen pad or swipe on touch',
      'Dodge the traffic and go far',
    ],
    scoreLabel: 'Distance',
    accent: '--color-drive',
  },
  {
    id: 'gunner',
    title: 'Star Gunner',
    description:
      'Blast incoming asteroids in a 3D shooting gallery. The targets are real near-Earth objects streamed live from NASA, so every rock carries its true name.',
    route: '/games/gunner',
    controls: [
      'Move the mouse or finger to aim',
      'Click, tap, or press Space to fire',
      'Hazardous rocks are worth more points',
    ],
    scoreLabel: 'Score',
    accent: '--color-gunner',
  },
] as const;

export const GAMES_BY_ID: Readonly<Record<GameId, GameDefinition>> = Object.freeze(
  Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<GameId, GameDefinition>,
);

export function getGame(id: GameId): GameDefinition {
  return GAMES_BY_ID[id];
}
