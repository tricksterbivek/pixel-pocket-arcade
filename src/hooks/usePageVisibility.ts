import { useEffect } from 'react';

/**
 * Calls `onHidden` when the page is hidden or the window loses focus.
 * Snake uses this to pause automatically. Pass a stable callback.
 */
export function usePageVisibility(onHidden: () => void): void {
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) onHidden();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', onHidden);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', onHidden);
    };
  }, [onHidden]);
}
