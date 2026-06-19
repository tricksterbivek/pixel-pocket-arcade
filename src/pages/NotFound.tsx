import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <p className="font-display text-5xl font-bold text-brand">404</p>
      <h1 className="mt-3 text-2xl text-fg">Page not found</h1>
      <p className="mt-3 text-muted">That screen is not part of the arcade.</p>
      <Link to="/" className={buttonClasses('primary', 'md', 'mt-6')}>
        Back to arcade
      </Link>
    </div>
  );
}
