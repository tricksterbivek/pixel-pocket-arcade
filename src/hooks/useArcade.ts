import { useContext } from 'react';
import { ArcadeContext } from '../state/ArcadeProvider';
import type { ArcadeContextValue } from '../state/ArcadeProvider';

export function useArcade(): ArcadeContextValue {
  const ctx = useContext(ArcadeContext);
  if (!ctx) throw new Error('useArcade must be used within an ArcadeProvider');
  return ctx;
}
