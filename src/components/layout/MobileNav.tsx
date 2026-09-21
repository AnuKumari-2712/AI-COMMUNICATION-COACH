import { NavLink } from 'react-router-dom';
import { mobileNav } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-base-900/90 backdrop-blur-lg lg:hidden">
      <ul className="flex items-center justify-between px-2 py-1.5">
        {mobileNav.map((item) => (
          <li key={item.path} className="flex-1">
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors focus-ring',
                  isActive ? 'text-accent-300' : 'text-base-400 hover:text-base-100',
                )
              }
            >
              <item.icon className="size-5" />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
