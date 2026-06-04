import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  LayoutDashboard, Briefcase, FileText, 
  Trophy, FolderLock, UserRound,
  Lock, KeyRound, LogOut, Menu, X
} from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { api } from '../lib/api';

const navigationLinks = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, short: 'Home' },
  { name: 'Job Feed', href: '/jobs', icon: Briefcase, short: 'Jobs' },
  { name: 'My Applications', href: '/applications', icon: FileText, short: 'Apps' },
  { name: 'Competitions', href: '/competitions', icon: Trophy, short: 'Contests' },
  { name: 'Resume & ATS', href: '/resume', icon: FileText, short: 'Resume' },
  { name: 'Document Vault', href: '/vault', icon: FolderLock, short: 'Vault' },
  { name: 'Profile Settings', href: '/profile', icon: UserRound, short: 'Profile' },
];

const mobileBottomLinks = navigationLinks.filter((l) =>
  ['/', '/jobs', '/applications', '/profile'].includes(l.href)
);

const toasterOptions = {
  style: {
    background: '#1e293b',
    color: '#f8fafc',
    border: '1px solid #334155',
    maxWidth: 'calc(100vw - 2rem)',
  },
};

function NavLinks({ router, onNavigate, compact }) {
  return navigationLinks.map((link) => {
    const isActive =
      router.pathname === link.href ||
      (link.href !== '/' && router.pathname.startsWith(link.href));
    const Icon = link.icon;

    return (
      <Link
        key={link.name}
        href={link.href}
        onClick={onNavigate}
        className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
          compact ? 'flex-col gap-1 px-2 py-2 text-[10px]' : 'px-4 py-3'
        } ${
          isActive
            ? 'bg-indigo-600/15 text-indigo-400 border-l-2 border-indigo-500 shadow-inner'
            : 'text-slate-400 hover:bg-slate-900/50 hover:text-slate-200'
        }`}
      >
        <Icon
          className={`shrink-0 transition-transform duration-200 group-hover:scale-110 ${
            compact ? 'h-5 w-5' : 'h-4 w-4'
          } ${isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'}`}
        />
        <span className={compact ? 'truncate max-w-[4.5rem]' : ''}>
          {compact ? link.short : link.name}
        </span>
      </Link>
    );
  });
}

export default function Layout({ children }) {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [scraperStatus, setScraperStatus] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [authError, setAuthError] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const checkAuthorization = async () => {
    try {
      const profData = await api.getProfile();
      setProfile(profData);
      const status = await api.getScraperStatus();
      setScraperStatus(status);
      setIsAuthorized(true);
      setAuthError('');
    } catch (err) {
      console.error('Authorization check failed:', err);
      setIsAuthorized(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  useEffect(() => {
    checkAuthorization();
  }, [router.pathname]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [router.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileNavOpen]);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!passcode.trim()) {
      setAuthError('Please enter your access key');
      return;
    }
    setUnlocking(true);
    setAuthError('');
    try {
      localStorage.setItem('jobbot_access_key', passcode.trim());
      const profData = await api.getProfile();
      setProfile(profData);
      const status = await api.getScraperStatus();
      setScraperStatus(status);
      setIsAuthorized(true);
      setPasscode('');
    } catch (err) {
      localStorage.removeItem('jobbot_access_key');
      setAuthError('Invalid passcode. Access denied.');
    } finally {
      setUnlocking(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jobbot_access_key');
    setIsAuthorized(false);
    setProfile(null);
    window.location.reload();
  };

  const pageTitle =
    navigationLinks.find(
      (n) =>
        n.href === router.pathname ||
        (n.href !== '/' && router.pathname.startsWith(n.href))
    )?.name || 'Dashboard';

  if (checkingAuth) {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-slate-950 font-sans text-slate-100">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Checking Authorization...
        </p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-slate-950 px-4 font-sans text-slate-100">
        <div className="absolute left-1/4 top-1/4 -z-10 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl animate-pulse sm:h-96 sm:w-96" />
        <div className="absolute right-1/4 bottom-1/4 -z-10 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl animate-pulse sm:h-96 sm:w-96" />

        <Toaster position="top-center" toastOptions={toasterOptions} />

        <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/30 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-600/10 text-indigo-400 sm:h-16 sm:w-16">
              <Lock className="h-7 w-7 animate-bounce sm:h-8 sm:w-8" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-100 sm:text-2xl">
              JobBot AI v2.0
            </h1>
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Single-User Career Terminal
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Enter your access key to open your profile, vault, and job feed.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="mt-8 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Access Passcode
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter secret key..."
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950/50 py-3 pl-10 pr-4 text-base text-slate-100 outline-none transition-all duration-200 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 sm:text-sm"
                  autoComplete="current-password"
                />
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              </div>
              {authError && (
                <p className="text-xs font-semibold text-rose-400">{authError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={unlocking}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all duration-200 hover:bg-indigo-500"
            >
              {unlocking ? 'Verifying Key...' : 'Unlock Dashboard'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full bg-slate-950 font-sans text-slate-100">
      <Toaster position="top-center" toastOptions={toasterOptions} />

      {mobileNavOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col border-r border-slate-900 bg-slate-950/95 p-4 backdrop-blur-md transition-transform duration-300 ease-out lg:relative lg:z-auto lg:w-64 lg:translate-x-0 lg:p-5 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="absolute left-0 top-1/4 -z-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-600/40">
              <span className="text-xl font-extrabold tracking-tight text-white">JB</span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-100">JobBot AI</h1>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                v2.0 Autonomous
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 lg:hidden"
            onClick={() => setMobileNavOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto scrollbar-thin">
          <NavLinks router={router} onNavigate={() => setMobileNavOpen(false)} />
        </nav>

        {profile && (
          <div className="mt-auto space-y-3 border-t border-slate-900 pt-4">
            <div className="flex items-center gap-3">
              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.full_name}
                  className="h-9 w-9 shrink-0 rounded-full border border-slate-800 object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 font-bold text-slate-300">
                  {profile.full_name.charAt(0)}
                </div>
              )}
              <div className="min-w-0 overflow-hidden">
                <p className="truncate text-xs font-bold text-slate-200">{profile.full_name}</p>
                <p className="truncate text-[10px] text-slate-500">{profile.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg border border-slate-900 bg-slate-950 px-3 py-2 text-xs font-bold text-slate-400 transition-all duration-200 hover:border-rose-900/30 hover:bg-rose-950/20 hover:text-rose-400"
            >
              <LogOut className="h-3.5 w-3.5" />
              Lock Console
            </button>
          </div>
        )}
      </aside>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col lg:min-h-0">
        <header className="sticky top-0 z-30 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-900 bg-slate-950/90 px-4 py-2 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              className="rounded-lg border border-slate-800 p-2 text-slate-300 hover:bg-slate-900 lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="truncate text-sm font-bold tracking-tight text-slate-300 sm:text-md">
              {pageTitle}
            </h2>
          </div>

          {scraperStatus && (
            <div className="flex w-full flex-wrap items-center gap-2 text-[10px] text-slate-400 sm:w-auto sm:justify-end sm:text-xs">
              <span className="flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900 px-2.5 py-1 sm:px-3 sm:py-1.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 animate-pulse" />
                <span className="whitespace-nowrap">
                  Scan: {scraperStatus.scan_interval_minutes}m
                </span>
              </span>
              {scraperStatus.last_run_details && (
                <span className="truncate text-slate-500">
                  Last:{' '}
                  {new Date(
                    scraperStatus.last_run_details.finished_at ||
                      scraperStatus.last_run_details.started_at
                  ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          )}
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-slate-950 p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <nav
        aria-label="Mobile primary navigation"
        className="safe-bottom fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-slate-900 bg-slate-950/95 backdrop-blur-md lg:hidden"
      >
        {mobileBottomLinks.map((link) => {
          const isActive =
            router.pathname === link.href ||
            (link.href !== '/' && router.pathname.startsWith(link.href));
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-semibold transition-colors ${
                isActive ? 'text-indigo-400' : 'text-slate-500'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-400' : ''}`} />
              {link.short}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
