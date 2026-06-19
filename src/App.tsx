import { lazy, Suspense } from 'react';
import type { ComponentType } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ArcadeProvider } from './state/ArcadeProvider';
import Layout from './components/Layout';
import Home from './pages/Home';
import NotFound from './pages/NotFound';
import ErrorBoundary from './components/ErrorBoundary';
import Loading from './components/Loading';

// Route-level lazy loading keeps the initial bundle focused on the home page.
const Snake = lazy(() => import('./games/snake'));
const Memory = lazy(() => import('./games/memory'));
const Reaction = lazy(() => import('./games/reaction'));
const Drive = lazy(() => import('./games/drive'));

function lazyRoute(Game: ComponentType) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<Loading />}>
        <Game />
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <ArcadeProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/games/snake" element={lazyRoute(Snake)} />
          <Route path="/games/memory" element={lazyRoute(Memory)} />
          <Route path="/games/reaction" element={lazyRoute(Reaction)} />
          <Route path="/games/drive" element={lazyRoute(Drive)} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </ArcadeProvider>
  );
}
