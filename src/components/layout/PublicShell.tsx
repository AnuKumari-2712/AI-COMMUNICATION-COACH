import { Outlet } from 'react-router-dom';
import { PublicNavbar } from './PublicNavbar';
import { PublicFooter } from './PublicFooter';

export function PublicShell() {
  return (
    <div className="min-h-screen bg-base-950">
      <PublicNavbar />
      <Outlet />
      <PublicFooter />
    </div>
  );
}
