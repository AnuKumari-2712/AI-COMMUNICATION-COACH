import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Menu, Sparkles, X, AlertTriangle } from 'lucide-react';
import { primaryNav, secondaryNav } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { getBackendHealth, type SystemHealth } from '@/services/apiClient';

const notifications = [
  { id: 'n1', title: 'New personalized plan ready', time: '5m ago' },
  { id: 'n2', title: 'You hit a streak milestone!', time: '2h ago' },
  { id: 'n3', title: 'Grammar score improved by 6%', time: '1d ago' },
];

export function Topbar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [engineOpen, setEngineOpen] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const { student, logout, profileError } = useAuth();

  useEffect(() => {
    let cancelled = false;
    getBackendHealth()
      .then((h) => {
        if (!cancelled) setHealth(h);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Derive display name safely — never fall back to a hardcoded demo name.
  const displayName = student?.name ?? '…';
  const firstName = student?.name ? student.name.split(' ')[0] : '…';
  const avatarSeed = student?.name ? encodeURIComponent(student.name) : 'user';

  return (
    <>
      {/* Backend-unreachable / profile-error banner */}
      {profileError && (
        <div className="sticky top-0 z-40 flex items-center gap-2 bg-warning-500/15 px-4 py-2 text-xs text-warning-300">
          <AlertTriangle className="size-3.5 shrink-0" />
          <span>
            Could not load your profile from the backend.{' '}
            <span className="font-medium text-warning-200">{profileError}</span>{' '}
            — please refresh or{' '}
            <button onClick={logout} className="underline hover:no-underline">
              log out and log back in
            </button>
            .
          </span>
        </div>
      )}

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

        <div className="hidden lg:flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => {
                setEngineOpen((o) => !o);
                setNotifOpen(false);
                setProfileOpen(false);
              }}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-base-300 hover:bg-white/[0.08] hover:border-white/20 transition-all focus-ring"
              title="Click to view AI Engine health status"
            >
              <span className={cn('size-2 rounded-full', health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400')} />
              <span className="font-medium text-base-200">
                {health?.engines?.claude ? 'Claude AI' : 'Honest AI Active'}
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-accent-400/80 bg-accent-500/10 px-1.5 py-0.5 rounded">
                Real Engines
              </span>
            </button>

            <AnimatePresence>
              {engineOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="glass absolute left-0 mt-2 w-72 rounded-xl p-3 shadow-soft-lg z-50 border border-white/10"
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                    <span className="text-xs font-semibold uppercase tracking-wider text-base-300">AI Engine Status</span>
                    <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      Honest AI Mode
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-base-300">Claude 3.5 Sonnet:</span>
                      <span className={cn('font-medium', health?.engines?.claude ? 'text-emerald-400' : 'text-base-400')}>
                        {health?.engines?.claude ? '● Connected' : '○ Standby / Fallback'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-base-300">Whisper Speech STT:</span>
                      <span className={cn('font-medium', health?.engines?.whisper ? 'text-emerald-400' : 'text-base-400')}>
                        {health?.engines?.whisper ? '● Active' : '○ Browser STT'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-base-300">spaCy NLP (POS / Syntax):</span>
                      <span className={cn('font-medium', health?.engines?.spacy ? 'text-emerald-400' : 'text-base-400')}>
                        {health?.engines?.spacy ? '● Active' : '○ Heuristic'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-base-300">T5 GEC Neural Model:</span>
                      <span className={cn('font-medium', health?.engines?.t5 ? 'text-emerald-400' : 'text-base-400')}>
                        {health?.engines?.t5 ? '● Loaded' : '○ Rule Fallback'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/10 text-[11px] text-base-400 flex items-center justify-between">
                    <span>Deterministic scoring</span>
                    <NavLink to="/app/settings" onClick={() => setEngineOpen(false)} className="text-accent-400 hover:underline">
                      Configure →
                    </NavLink>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

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
                src={`https://api.dicebear.com/9.x/notionists/svg?seed=${avatarSeed}`}
                alt=""
                className="size-8 rounded-full bg-base-700"
              />
              <span className="hidden text-sm font-medium text-base-100 sm:inline">{firstName}</span>
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
                  {student && (
                    <div className="mb-1 border-b border-white/5 px-3 py-2">
                      <p className="truncate text-xs font-semibold text-base-50">{displayName}</p>
                      <p className="truncate text-[11px] text-base-400">{student.email}</p>
                    </div>
                  )}
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
    </>
  );
}
