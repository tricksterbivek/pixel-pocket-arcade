import { Link } from 'react-router-dom';
import { Wordmark } from './Wordmark';
import { SoundToggle } from './SoundToggle';

/** App banner: home link via the wordmark, plus the global sound toggle. */
export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-base/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="rounded-md" aria-label="Pixel Pocket Arcade, home">
          <Wordmark className="text-lg" />
        </Link>
        <SoundToggle />
      </div>
    </header>
  );
}
