import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { ArcadeStorageV1, GameResult } from '../types/game';
import { loadArcade, resetArcade, saveArcade } from '../lib/storage';
import { applyResult } from '../lib/records';
import { audio } from '../lib/audio';

export interface ArcadeContextValue {
  state: ArcadeStorageV1;
  recordResult: (result: GameResult) => void;
  toggleSound: () => void;
  reset: () => void;
}

export const ArcadeContext = createContext<ArcadeContextValue | null>(null);

export function ArcadeProvider({ children }: { children: ReactNode }) {
  // Read storage exactly once at startup, never inside a render loop.
  const [state, setState] = useState<ArcadeStorageV1>(() => loadArcade());

  // Keep the audio service in sync with the saved sound setting.
  useEffect(() => {
    audio.setEnabled(state.settings.soundEnabled);
  }, [state.settings.soundEnabled]);

  const recordResult = useCallback((result: GameResult) => {
    setState((prev) => {
      const next = applyResult(prev, result, Date.now());
      saveArcade(next);
      return next;
    });
  }, []);

  const toggleSound = useCallback(() => {
    setState((prev) => {
      const next = {
        ...prev,
        settings: { ...prev.settings, soundEnabled: !prev.settings.soundEnabled },
      };
      saveArcade(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setState(resetArcade());
  }, []);

  const value = useMemo(
    () => ({ state, recordResult, toggleSound, reset }),
    [state, recordResult, toggleSound, reset],
  );

  return <ArcadeContext.Provider value={value}>{children}</ArcadeContext.Provider>;
}
