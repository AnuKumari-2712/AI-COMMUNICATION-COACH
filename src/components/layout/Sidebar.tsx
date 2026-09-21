import { NavLink } from 'react-router-dom';
import { Sparkles, LogOut } from 'lucide-react';
import { primaryNav, secondaryNav } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

export function Sidebar() {
  const { student, logout } = useAuth();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-white/5 bg-base-900/60 lg:flex">
      <div className="flex h-16 items-center gap-2.5 px-6">
        <div className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-azure-500 shadow-soft-md">
          <Sparkles className="size-4.5 text-white" />
        </div>
        <span className="font-display text-sm font-semibold leading-tight text-base-50">
          Communication
          <br />
          Coach
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {primaryNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-ring',
                isActive ? 'bg-accent-500/15 text-accent-300' : 'text-base-300 hover:bg-white/5 hover:text-base-50',
              )
            }
          >
            <item.icon className="size-4.5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/5 px-3 py-4">
        {secondaryNav.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-ring',
                isActive ? 'bg-accent-500/15 text-accent-300' : 'text-base-300 hover:bg-white/5 hover:text-base-50',
              )
            }
          >
            <item.icon className="size-4.5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
        <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5">
          <img
            src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(student.name)}`}
            alt=""
            className="size-8 rounded-full bg-base-700"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-base-50">{student.name}</p>
            <p className="truncate text-[11px] text-base-400">{student.currentLevel}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Log out"
            className="shrink-0 rounded-lg p-1.5 text-base-400 transition-colors hover:bg-white/5 hover:text-danger-400 focus-ring"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
