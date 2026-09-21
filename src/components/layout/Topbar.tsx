import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Menu, Sparkles, X } from 'lucide-react';
import { primaryNav, secondaryNav } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const notifications = [
  { id: 'n1', title: 'New personalized plan ready', time: '5m ago' },
  { id: 'n2', title: 'You hit a 12-day streak!', time: '2h ago' },
  { id: 'n3', title: 'Grammar score improved by 6%', time: '1d ago' },
];

export function Topbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { student, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-white/5 bg-base-950/80 px-4 backdrop-blur-lg sm:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-base-200 hover:bg-white/5 focus-ring"
        >
          <Menu className="size-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-azure-500">
            <Sparkles className="size-3.5 text-white" />
          </div>
          <span className="font-display text-sm font-semibold text-base-50">Comm Coach</span>
        </div>
      </div>

      <div className="hidden lg:block" />

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((o) => !o);
              setProfileOpen(false);
            }}
            aria-label="View notifications"
            className="relative rounded-lg p-2 text-base-200 hover:bg-white/5 focus-ring"
          >
            <Bell className="size-5" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-accent-400" />
          </button>
          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="glass absolute right-0 mt-2 w-72 rounded-xl p-2 shadow-soft-lg"
              >
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-base-400">Notifications</p>
                {notifications.map((n) => (
                  <div key={n.id} className="rounded-lg px-2 py-2 hover:bg-white/5">
                    <p className="text-sm text-base-50">{n.title}</p>
                    <p className="text-[11px] text-base-400">{n.time}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen((o) => !o);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-white/5 focus-ring"
          >
            <img
              src={`https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(student.name)}`}
              alt=""
              className="size-8 rounded-full bg-base-700"
            />
            <span className="hidden text-sm font-medium text-base-100 sm:inline">{student.name.split(' ')[0]}</span>
          </button>
          <AnimatePresence>
            {profileOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="glass absolute right-0 mt-2 w-52 rounded-xl p-1.5 shadow-soft-lg"
              >
                <NavLink to="/app/profile" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-base-100 hover:bg-white/5">
                  My Profile
                </NavLink>
                <NavLink to="/app/settings" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-base-100 hover:bg-white/5">
                  Settings
                </NavLink>
                <button onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-danger-400 hover:bg-white/5">
                  Log out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-base-950/70 backdrop-blur-sm lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-base-900 p-4 lg:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="font-display text-sm font-semibold text-base-50">Menu</span>
                <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="rounded-lg p-1.5 text-base-300 hover:bg-white/5 focus-ring">
                  <X className="size-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {[...primaryNav, ...secondaryNav].map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                        isActive ? 'bg-accent-500/15 text-accent-300' : 'text-base-300 hover:bg-white/5',
                      )
                    }
                  >
                    <item.icon className="size-4.5" />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
