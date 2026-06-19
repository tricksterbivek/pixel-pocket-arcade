import { Outlet } from 'react-router-dom';
import { Header } from './Header';

/** App frame: banner header plus the single main landmark for every page. */
export default function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1 py-6">
        <Outlet />
      </main>
    </div>
  );
}
