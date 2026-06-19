import { useArcade } from '../hooks/useArcade';
import { audio } from '../lib/audio';

/**
 * Global sound switch. Uses role="switch" with aria-checked, and conveys state
 * with text, thumb position, and a glyph (never color alone). The click is a
 * user gesture, so it is also where we unlock the audio context.
 */
export function SoundToggle() {
  const { state, toggleSound } = useArcade();
  const on = state.settings.soundEnabled;

  const handleClick = () => {
    audio.unlock();
    if (!on) audio.play('select');
    toggleSound();
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={handleClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-md border-2 border-border-strong bg-raised px-3 text-sm font-semibold text-fg shadow-pixel transition-transform duration-150 ease-out active:scale-[0.97]"
    >
      <span aria-hidden="true">{on ? '♪' : '×'}</span>
      <span>{on ? 'Sound on' : 'Sound off'}</span>
      <span
        aria-hidden="true"
        className="relative inline-block h-5 w-9 rounded-full border-2 border-border-strong"
        style={{
          backgroundColor: on ? 'color-mix(in srgb, var(--color-brand) 30%, transparent)' : 'transparent',
        }}
      >
        <span
          className="absolute top-0.5 h-3 w-3 rounded-sm bg-fg transition-[left] duration-150 ease-out"
          style={{ left: on ? '1.125rem' : '0.125rem' }}
        />
      </span>
    </button>
  );
}
