import { Link } from 'react-router-dom';
import { Wordmark } from './Wordmark';
import { SoundToggle } from './SoundToggle';

/** App banner: home link via the wordmark, plus the global sound toggle. */
export function Header() {
  return (
    <header className="border-b-2 border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="rounded-md" aria-label="Pixel Pocket Arcade, home">
          <Wordmark className="text-base sm:text-lg" />
        </Link>
        <SoundToggle />
      </div>
    </header>
  );
}
