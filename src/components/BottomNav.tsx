'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: 'dashboard' },
  { href: '/board', label: 'Board', icon: 'view_kanban' },
  { href: '/employees', label: 'Team', icon: 'group' },
  { href: '/reports', label: 'Reports', icon: 'bar_chart' },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-stretch bg-[#0c0e17]/95 backdrop-blur-xl border-t border-white/5 pb-safe">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

      {NAV_LINKS.map(({ href, label, icon }) => {
        const isActive = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center justify-center px-3 py-3 min-w-0 flex-1 transition-all active:scale-95 ${
              isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <div className={`w-10 h-7 rounded-full flex items-center justify-center mb-1 transition-all ${
              isActive ? 'bg-indigo-500/20' : ''
            }`}>
              <span className="material-symbols-outlined text-[22px]" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {icon}
              </span>
            </div>
            <span className={`text-[10px] font-semibold tracking-wide ${isActive ? 'text-indigo-400' : ''}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
