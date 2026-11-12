'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: 'dashboard' },
  { href: '/board', label: 'Board', icon: 'view_kanban' },
  { href: '/employees', label: 'Team', icon: 'group' },
  { href: '/reports', label: 'Reports', icon: 'bar_chart' },
  { href: '/settings', label: 'Settings', icon: 'settings' },
];

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-stretch bg-[#0c0e17]/95 backdrop-blur-xl border-t border-white/10 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.45)]">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/45 to-transparent" />

      {NAV_LINKS.map(({ href, label, icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center px-1.5 py-2.5 min-w-0 flex-1 transition-all active:scale-95 ${
              isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div
              className={`w-10 h-7 rounded-full flex items-center justify-center mb-0.5 transition-all ${
                isActive ? 'bg-indigo-500/20 shadow-inner shadow-indigo-500/20' : ''
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {icon}
              </span>
            </div>
            <span className={`text-[10px] font-semibold tracking-wide truncate ${isActive ? 'text-indigo-300' : ''}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
