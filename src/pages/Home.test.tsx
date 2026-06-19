import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArcadeProvider } from '../state/ArcadeProvider';
import Home from './Home';

function renderHome() {
  return render(
    <ArcadeProvider>
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    </ArcadeProvider>,
  );
}

describe('Home', () => {
  beforeEach(() => localStorage.clear());

  it('shows one h1 and links to all three games', () => {
    renderHome();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /snake/i })).toHaveAttribute('href', '/games/snake');
    expect(screen.getByRole('link', { name: /memory match/i })).toHaveAttribute(
      'href',
      '/games/memory',
    );
    expect(screen.getByRole('link', { name: /reaction timer/i })).toHaveAttribute(
      'href',
      '/games/reaction',
    );
  });

  it('shows the empty recent-plays state before any game is played', () => {
    renderHome();
    expect(screen.getByText(/no games played yet/i)).toBeInTheDocument();
  });

  it('offers a reset-data control', () => {
    renderHome();
    expect(screen.getByRole('button', { name: /reset data/i })).toBeInTheDocument();
  });
});
