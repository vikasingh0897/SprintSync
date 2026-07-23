'use client';

import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { EMPLOYEES } from '../data/employees';
import { INITIAL_BOARD_DATA } from '../data/boardData';

// ── derived stats ──────────────────────────────────────────────────────────
const allTasks        = INITIAL_BOARD_DATA.columns.flatMap(c => c.tasks);
const totalTasks      = allTasks.length;
const completedTasks  = INITIAL_BOARD_DATA.columns.find(c => c.id === 'col-done')?.tasks.length ?? 0;
const inProgressTasks = INITIAL_BOARD_DATA.columns.find(c => c.id === 'col-inprogress')?.tasks.length ?? 0;
const reviewTasks     = INITIAL_BOARD_DATA.columns.find(c => c.id === 'col-review')?.tasks.length ?? 0;
const backlogTasks    = INITIAL_BOARD_DATA.columns.find(c => c.id === 'col-backlog')?.tasks.length ?? 0;
const completionPct   = Math.round((completedTasks / totalTasks) * 100);

const topPerformers = [...EMPLOYEES].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

const upcomingDeadlines = allTasks
  .filter(t => t.dueDate)
  .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
  .slice(0, 6)
  .map(t => ({
    ...t,
    columnTitle: INITIAL_BOARD_DATA.columns.find(c => c.tasks.some(ct => ct.id === t.id))?.title ?? '',
  }));

const recentActivity = [
  { id: 1, user: 'Aanya Sharma',   action: 'completed',      task: 'Migrate to TypeScript strict mode', time: '2h ago',  color: '#6366f1' },
  { id: 2, user: 'Rohan Mehta',    action: 'moved to review', task: 'API documentation update',          time: '3h ago',  color: '#8b5cf6' },
  { id: 3, user: 'Priya Nair',     action: 'created',         task: 'Design new onboarding flow',        time: '5h ago',  color: '#ec4899' },
  { id: 4, user: 'Vikram Singh',   action: 'completed',       task: 'Set up monitoring with Datadog',    time: '1d ago',  color: '#14b8a6' },
  { id: 5, user: 'Sneha Patel',    action: 'started',         task: 'User research interviews',          time: '1d ago',  color: '#f59e0b' },
  { id: 6, user: 'Divya Menon',    action: 'completed',       task: 'Brand guidelines documentation',    time: '2d ago',  color: '#db2777' },
];

const actionColor: Record<string, string> = {
  'completed':       'text-emerald-400',
  'moved to review': 'text-violet-400',
  'created':         'text-indigo-400',
  'started':         'text-amber-400',
};

function priorityBadge(p: string) {
  if (p === 'High')   return 'bg-red-500/15 text-red-400 border border-red-500/20';
  if (p === 'Medium') return 'bg-amber-500/15 text-amber-400 border border-amber-500/20';
  return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20';
}

// ── tiny donut component ───────────────────────────────────────────────────
function Donut({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={6} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={circ - (pct / 100) * circ} strokeLinecap="round" />
    </svg>
  );
}

export default function Home() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-[#0c0e17] pb-28">

      {/* ── Hero strip ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-white/5 bg-[#111320]">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Live · Sprint 14
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},&nbsp;
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                {user?.name?.split(' ')[0] ?? 'there'}
              </span>
              &nbsp;👋
            </h1>
            <p className="text-gray-400 mt-1 text-sm max-w-lg">
              Your team has completed <strong className="text-white">{completedTasks}</strong> of{' '}
              <strong className="text-white">{totalTasks}</strong> tasks this sprint.{' '}
              {completionPct >= 70 ? "You're on track! 🚀" : 'Keep pushing — deadlines ahead.'}
            </p>
          </div>

          <Link
            href="/board"
            className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/30 active:scale-[0.97] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            New Task
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Sprint progress bar ────────────────────────────────────────── */}
        <div className="bg-[#1d1f29] rounded-2xl border border-white/5 px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white">Sprint 14 Progress</p>
              <p className="text-xs text-gray-500 mt-0.5">2 weeks remaining · ends Aug 5</p>
            </div>
            <span className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              {completionPct}%
            </span>
          </div>
          <div className="h-3 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 transition-all duration-1000 relative overflow-hidden"
              style={{ width: `${completionPct}%` }}
            >
              {/* shimmer */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>
          {/* column mini stats below bar */}
          <div className="flex gap-6 mt-3">
            {[
              { label: 'Done',        count: completedTasks,  color: '#10b981' },
              { label: 'In Progress', count: inProgressTasks, color: '#f59e0b' },
              { label: 'In Review',   count: reviewTasks,     color: '#8b5cf6' },
              { label: 'Backlog',     count: backlogTasks,    color: '#6366f1' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── KPI cards row ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Tasks Completed',
              value: completedTasks,
              sub: `${completionPct}% of sprint`,
              icon: 'check_circle',
              color: '#10b981',
              bg: 'from-emerald-500/15 to-teal-500/5',
              border: 'border-emerald-500/20',
            },
            {
              label: 'In Progress',
              value: inProgressTasks,
              sub: 'Active right now',
              icon: 'pending_actions',
              color: '#f59e0b',
              bg: 'from-amber-500/15 to-orange-500/5',
              border: 'border-amber-500/20',
            },
            {
              label: 'In Review',
              value: reviewTasks,
              sub: 'Awaiting approval',
              icon: 'rate_review',
              color: '#8b5cf6',
              bg: 'from-violet-500/15 to-purple-500/5',
              border: 'border-violet-500/20',
            },
            {
              label: 'Team Members',
              value: EMPLOYEES.length,
              sub: `${EMPLOYEES.filter(e => e.status === 'Active').length} active today`,
              icon: 'group',
              color: '#6366f1',
              bg: 'from-indigo-500/15 to-blue-500/5',
              border: 'border-indigo-500/20',
            },
          ].map(card => (
            <div
              key={card.label}
              className={`relative bg-gradient-to-br ${card.bg} border ${card.border} rounded-2xl p-5 overflow-hidden hover:scale-[1.02] transition-transform duration-200`}
            >
              {/* bg icon watermark */}
              <span
                className="material-symbols-outlined absolute -bottom-2 -right-2 text-[72px] opacity-[0.06] select-none"
                style={{ color: card.color, fontVariationSettings: "'FILL' 1" }}
              >
                {card.icon}
              </span>
              <div className="relative z-10">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: card.color + '25' }}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ color: card.color, fontVariationSettings: "'FILL' 1" }}>
                    {card.icon}
                  </span>
                </div>
                <p className="text-3xl font-black text-white">{card.value}</p>
                <p className="text-sm font-semibold text-gray-300 mt-0.5">{card.label}</p>
                <p className="text-xs text-gray-500 mt-1">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main 3-col grid ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* LEFT — Quick actions + Activity */}
          <div className="md:col-span-2 space-y-6">

            {/* Quick Actions */}
            <div className="bg-[#1d1f29] border border-white/5 rounded-2xl p-6">
              <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-[18px]">flash_on</span>
                Quick Actions
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'New Task',    icon: 'add_task',  href: '/board',     from: 'from-indigo-500',  to: 'to-violet-600',  shadow: 'shadow-indigo-500/25' },
                  { label: 'Reports',     icon: 'bar_chart', href: '/reports',   from: 'from-emerald-500', to: 'to-teal-600',    shadow: 'shadow-emerald-500/25' },
                  { label: 'Employees',   icon: 'group',     href: '/employees', from: 'from-pink-500',    to: 'to-rose-600',    shadow: 'shadow-pink-500/25' },
                  { label: 'Settings',    icon: 'settings',  href: '/settings',  from: 'from-amber-500',   to: 'to-orange-600',  shadow: 'shadow-amber-500/25' },
                ].map(a => (
                  <Link
                    key={a.label}
                    href={a.href}
                    className={`group flex flex-col items-center justify-center gap-2 py-5 px-3 rounded-2xl bg-gradient-to-br ${a.from} ${a.to} shadow-lg ${a.shadow} hover:scale-105 active:scale-95 transition-all duration-200`}
                  >
                    <span className="material-symbols-outlined text-white text-[28px] group-hover:scale-110 transition-transform">
                      {a.icon}
                    </span>
                    <span className="text-white text-xs font-semibold tracking-wide">{a.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-[#1d1f29] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-violet-400 text-[18px]">history</span>
                  Recent Activity
                </p>
                <span className="text-xs text-gray-500">Last 7 days</span>
              </div>
              <div className="space-y-1">
                {recentActivity.map((a, i) => (
                  <div
                    key={a.id}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/3 transition-colors group"
                  >
                    {/* Avatar */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
                      style={{ backgroundColor: a.color + '28', color: a.color }}
                    >
                      {a.user.charAt(0)}
                    </div>

                    {/* Timeline line */}
                    <div className="relative flex flex-col items-center shrink-0">
                      <div className="w-2 h-2 rounded-full mt-1.5" style={{ backgroundColor: a.color }} />
                      {i < recentActivity.length - 1 && (
                        <div className="w-px flex-1 bg-white/5 mt-1 min-h-[24px]" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pb-3">
                      <p className="text-sm text-gray-300 leading-snug">
                        <span className="font-semibold text-white">{a.user}</span>
                        {' '}
                        <span className={`font-medium ${actionColor[a.action] ?? 'text-gray-400'}`}>{a.action}</span>
                        {' '}
                        <span className="text-gray-300">&quot;{a.task}&quot;</span>
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT column */}
          <div className="space-y-6">

            {/* Completion donut */}
            <div className="bg-gradient-to-br from-indigo-500/15 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-6">
              <p className="text-sm font-bold text-white mb-5 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-[18px]">donut_large</span>
                Completion Overview
              </p>
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <Donut pct={completionPct} color="#6366f1" size={80} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-base font-black text-white">{completionPct}%</span>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  {[
                    { label: 'Done',     val: completedTasks,  color: '#10b981' },
                    { label: 'Active',   val: inProgressTasks, color: '#f59e0b' },
                    { label: 'Review',   val: reviewTasks,     color: '#8b5cf6' },
                    { label: 'Backlog',  val: backlogTasks,    color: '#6366f1' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-gray-400">{label}</span>
                      </div>
                      <span className="font-bold text-white">{val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-[#1d1f29] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">schedule</span>
                  Upcoming Deadlines
                </p>
                <Link href="/board" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">View all</Link>
              </div>
              <div className="space-y-2">
                {upcomingDeadlines.map(task => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-white/3 hover:bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className={`w-1 self-stretch rounded-full shrink-0 ${task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-200 line-clamp-1">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-500">{task.columnTitle}</span>
                        <span className="text-gray-600">·</span>
                        <span className="text-[10px] text-gray-500">{task.dueDate}</span>
                      </div>
                    </div>
                    <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${priorityBadge(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Performers */}
            <div className="bg-[#1d1f29] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">emoji_events</span>
                  Top Performers
                </p>
                <Link href="/reports" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">Full report</Link>
              </div>
              <div className="space-y-3">
                {topPerformers.map((emp, i) => (
                  <div key={emp.id} className="flex items-center gap-3 group">
                    <span className="text-sm w-5 text-center shrink-0">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-xs text-gray-600 font-bold">#{i + 1}</span>}
                    </span>
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: emp.avatarColor + '28', color: emp.avatarColor }}
                    >
                      {emp.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-200 truncate group-hover:text-white transition-colors">{emp.name}</p>
                      {/* score bar */}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${emp.avgScore}%`, backgroundColor: emp.avatarColor }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 shrink-0">{emp.avgScore}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>{/* end RIGHT */}
        </div>{/* end main grid */}
      </div>
    </main>
  );
}
