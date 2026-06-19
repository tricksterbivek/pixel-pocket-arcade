import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { buttonClasses } from './Button';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Wraps each game route so a crash shows a recovery action instead of a blank page. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Surface the real error; do not swallow it.
    console.error('A game crashed:', error, info.componentStack);
  }

  private handleReset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-md px-4 py-12 text-center">
          <h1 className="text-2xl text-fg">Something went wrong</h1>
          <p className="mt-3 text-muted">
            This game hit an unexpected error. You can try again or head back to the arcade.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button type="button" className={buttonClasses('primary')} onClick={this.handleReset}>
              Try again
            </button>
            <Link to="/" className={buttonClasses('secondary')}>
              Back to arcade
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
