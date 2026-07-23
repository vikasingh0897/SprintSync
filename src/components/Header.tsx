'use client';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/',          label: 'Dashboard', icon: 'dashboard'   },
  { href: '/board',     label: 'Board',     icon: 'view_kanban' },
  { href: '/employees', label: 'Employees', icon: 'group'       },
  { href: '/reports',   label: 'Reports',   icon: 'bar_chart'   },
  { href: '/settings',  label: 'Settings',  icon: 'settings'    },
];

export function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    // Use CSS variables so light-mode overrides from settings apply instantly
    <header
      className="w-full top-0 sticky z-[100] backdrop-blur-xl border-b transition-colors duration-200"
      style={{
        backgroundColor: 'var(--header-bg, rgba(12,14,23,0.85))',
        borderColor:      'var(--header-border, rgba(255,255,255,0.06))',
      }}
    >
      {/* Rainbow accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

      <div className="flex justify-between items-center px-6 py-3 w-full max-w-7xl mx-auto">

        {/* ── Logo ── */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent select-none">
            SprintSync
          </span>
        </Link>

        {/* ── Desktop Nav ── */}
        {user && (
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_LINKS.map(({ href, label, icon }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/25'
                      : 'text-[color:var(--nav-text,#9ca3af)] hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[18px]"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {icon}
                  </span>
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* ── User area ── */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              {/* Notification bell */}
              <button className="hidden md:flex w-9 h-9 items-center justify-center rounded-xl text-[color:var(--nav-text,#9ca3af)] hover:text-white hover:bg-white/5 transition-all relative">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-[var(--header-bg,#0c0e17)]" />
              </button>

              {/* Name + avatar */}
              <div className="hidden md:block text-right">
                <p
                  className="text-sm font-semibold leading-none"
                  style={{ color: 'var(--text-base, #f1f5f9)' }}
                >
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-md shrink-0">
                {user.name?.charAt(0).toUpperCase() ?? 'A'}
              </div>

              {/* Logout */}
              <button
                onClick={logout}
                title="Sign out"
                className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="hidden lg:inline text-xs font-medium">Sign out</span>
              </button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium border border-transparent hover:border-white/10 transition-all"
                style={{ color: 'var(--nav-text, #d1d5db)' }}
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
