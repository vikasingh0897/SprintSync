import Link from 'next/link';

export function Footer() {
  return (
    <footer
      className="relative w-full border-t border-white/[0.06] mt-auto pb-24 md:pb-8"
      style={{ backgroundColor: 'var(--bg-page, #0c0e17)' }}
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Brand & Description */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-sm">
            <Link href="/" className="flex items-center gap-2.5 mb-2 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white fill-current">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-base font-bold tracking-tight bg-gradient-to-r from-indigo-300 via-violet-300 to-purple-300 bg-clip-text text-transparent">
                SprintSync
              </span>
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed">
              Modern real-time sprint planning, Kanban workflows, and team performance analytics.
            </p>
          </div>

          {/* Links & Copyright */}
          <div className="flex flex-col items-center md:items-end gap-3">
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-medium text-gray-400">
              <Link href="/" className="hover:text-indigo-400 transition-colors">Dashboard</Link>
              <Link href="/board" className="hover:text-indigo-400 transition-colors">Board</Link>
              <Link href="/employees" className="hover:text-indigo-400 transition-colors">Team</Link>
              <Link href="/reports" className="hover:text-indigo-400 transition-colors">Reports</Link>
              <Link href="/settings" className="hover:text-indigo-400 transition-colors">Settings</Link>
            </div>
            <p className="text-[11px] text-gray-500/80">
              © {new Date().getFullYear()} SprintSync · Built for real-time agile teams.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
