'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { EMPLOYEES as DEFAULT_EMPLOYEES, Employee } from '../data/employees';
import { INITIAL_BOARD_DATA, Task } from '../data/boardData';
import { boardApi, sprintsApi, employeesApi } from '../lib/api';
import { getSocket } from '../lib/socket';

export default function Home() {
  const { user } = useAuth();

  const [activeSprint, setActiveSprint] = useState<{ id: string; name: string; goal?: string; endDate?: string }>({
    id: 'sprint-001',
    name: 'Sprint 14',
    goal: 'Foundation & Core',
  });

  const [tasks, setTasks] = useState<Task[]>(INITIAL_BOARD_DATA.columns.flatMap((c) => c.tasks));
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPLOYEES);

  // Load live data from backend
  useEffect(() => {
    sprintsApi.getActive()
      .then((res) => {
        if (res.success && res.data) {
          setActiveSprint({
            id: res.data._id || res.data.id,
            name: res.data.name,
            goal: res.data.goal,
            endDate: res.data.endDate,
          });
        }
      })
      .catch(() => {});

    boardApi.getBoard()
      .then((res) => {
        if (res.success && res.data?.columns) {
          const all = res.data.columns.flatMap((c: any) => c.tasks || []);
          if (all.length > 0) setTasks(all);
        }
      })
      .catch(() => {});

    employeesApi.getAll()
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setEmployees(
            res.data.map((e: any) => ({
              id: e._id || e.id,
              name: e.name,
              email: e.email,
              role: e.role,
              department: e.department,
              avatarColor: e.avatarColor || '#6366f1',
              initials: e.initials || 'EM',
              tasksCompleted: e.tasksCompleted || 0,
              tasksInProgress: e.tasksInProgress || 0,
              tasksPending: e.tasksPending || 0,
              completionRate: e.completionRate || 0,
              avgScore: e.avgScore || 85,
              joinedDate: e.joinedDate || '',
              status: e.status || 'Active',
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Listen to real-time events on Dashboard
  useEffect(() => {
    const socket = getSocket();

    const handleSprintUpdated = (sprint: any) => {
      if (sprint.status === 'active') {
        setActiveSprint({
          id: sprint._id || sprint.id,
          name: sprint.name,
          goal: sprint.goal,
          endDate: sprint.endDate,
        });
      }
    };

    const handleTaskChange = () => {
      boardApi.getBoard().then((res) => {
        if (res.success && res.data?.columns) {
          setTasks(res.data.columns.flatMap((c: any) => c.tasks || []));
        }
      }).catch(() => {});
    };

    socket.on('sprint:created', handleSprintUpdated);
    socket.on('sprint:updated', handleSprintUpdated);
    socket.on('task:created', handleTaskChange);
    socket.on('task:moved', handleTaskChange);
    socket.on('task:updated', handleTaskChange);
    socket.on('task:deleted', handleTaskChange);

    return () => {
      socket.off('sprint:created', handleSprintUpdated);
      socket.off('sprint:updated', handleSprintUpdated);
      socket.off('task:created', handleTaskChange);
      socket.off('task:moved', handleTaskChange);
      socket.off('task:updated', handleTaskChange);
      socket.off('task:deleted', handleTaskChange);
    };
  }, []);

  const totalTasks = tasks.length || 1;
  const completedTasks = tasks.filter((t) => t.columnId === 'col-done').length;
  const inProgressTasks = tasks.filter((t) => t.columnId === 'col-inprogress').length;
  const reviewTasks = tasks.filter((t) => t.columnId === 'col-review').length;
  const backlogTasks = tasks.filter((t) => t.columnId === 'col-backlog').length;
  const completionPct = Math.round((completedTasks / totalTasks) * 100);

  const topPerformers = [...employees].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate)
    .sort((a, b) => ((a.dueDate || '') < (b.dueDate || '') ? -1 : 1))
    .slice(0, 6);

  const recentActivity = [
    { id: 1, user: 'Aanya Sharma', action: 'completed', task: 'Migrate to TypeScript strict mode', time: '2h ago', color: '#6366f1' },
    { id: 2, user: 'Rohan Mehta', action: 'moved to review', task: 'API documentation update', time: '3h ago', color: '#8b5cf6' },
    { id: 3, user: 'Priya Nair', action: 'created', task: 'Design new onboarding flow', time: '5h ago', color: '#ec4899' },
    { id: 4, user: 'Vikram Singh', action: 'completed', task: 'Set up monitoring with Datadog', time: '1d ago', color: '#14b8a6' },
    { id: 5, user: 'Sneha Patel', action: 'started', task: 'User research interviews', time: '1d ago', color: '#f59e0b' },
  ];

  const actionColor: Record<string, string> = {
    completed: 'text-emerald-400',
    'moved to review': 'text-violet-400',
    created: 'text-indigo-400',
    started: 'text-amber-400',
  };

  return (
    <main className="min-h-screen bg-[#0c0e17] pb-28">
      {/* ── Hero strip ── */}
      <div className="relative overflow-hidden border-b border-white/5 bg-[#111320]">
        <div className="pointer-events-none absolute -top-20 -right-20 w-72 h-72 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-violet-600/15 blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Live · {activeSprint.name}
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
        {/* ── Sprint progress bar ── */}
        <div className="bg-[#1d1f29] rounded-2xl border border-white/5 px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white">{activeSprint.name} Progress</p>
              <p className="text-xs text-gray-500 mt-0.5">{activeSprint.goal || 'Sprint in progress'}</p>
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
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>
          <div className="flex gap-6 mt-3">
            {[
              { label: 'Done', count: completedTasks, color: '#10b981' },
              { label: 'In Progress', count: inProgressTasks, color: '#f59e0b' },
              { label: 'In Review', count: reviewTasks, color: '#8b5cf6' },
              { label: 'Backlog', count: backlogTasks, color: '#6366f1' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs font-bold text-white">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── KPI cards row ── */}
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
              value: employees.length,
              sub: `${employees.filter((e) => e.status === 'Active').length} active members`,
              icon: 'group',
              color: '#6366f1',
              bg: 'from-indigo-500/15 to-blue-500/5',
              border: 'border-indigo-500/20',
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`relative bg-gradient-to-br ${card.bg} border ${card.border} rounded-2xl p-5 overflow-hidden hover:scale-[1.02] transition-transform duration-200`}
            >
              <div className="relative z-10">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: card.color + '25' }}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ color: card.color }}>
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

        {/* ── Main 3-col grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="bg-[#1d1f29] border border-white/5 rounded-2xl p-6">
              <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-[18px]">flash_on</span>
                Quick Actions
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'New Task', icon: 'add_task', href: '/board', from: 'from-indigo-500', to: 'to-violet-600', shadow: 'shadow-indigo-500/25' },
                  { label: 'Reports', icon: 'bar_chart', href: '/reports', from: 'from-emerald-500', to: 'to-teal-600', shadow: 'shadow-emerald-500/25' },
                  { label: 'Employees', icon: 'group', href: '/employees', from: 'from-pink-500', to: 'to-rose-600', shadow: 'shadow-pink-500/25' },
                  { label: 'Settings', icon: 'settings', href: '/settings', from: 'from-amber-500', to: 'to-orange-600', shadow: 'shadow-amber-500/25' },
                ].map((a) => (
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
                <span className="text-xs text-gray-500">Live sync</span>
              </div>
              <div className="space-y-4">
                {recentActivity.map((act) => (
                  <div key={act.id} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0"
                        style={{ backgroundColor: act.color + '33', color: act.color }}
                      >
                        {act.user.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <span className="font-semibold text-white">{act.user}</span>{' '}
                        <span className={actionColor[act.action] || 'text-gray-400'}>{act.action}</span>{' '}
                        <span className="text-gray-300 font-medium">&ldquo;{act.task}&rdquo;</span>
                      </div>
                    </div>
                    <span className="text-gray-500 shrink-0 ml-2">{act.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT — Top Performers & Deadlines */}
          <div className="space-y-6">
            {/* Top Performers */}
            <div className="bg-[#1d1f29] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">military_tech</span>
                  Top Performers
                </p>
                <Link href="/employees" className="text-xs text-indigo-400 hover:text-indigo-300">
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {topPerformers.map((emp, i) => (
                  <div key={emp.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-500 w-4">#{i + 1}</span>
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: emp.avatarColor + '33', color: emp.avatarColor }}
                      >
                        {emp.initials}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{emp.name}</p>
                        <p className="text-[10px] text-gray-500">{emp.role}</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{emp.avgScore}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Deadlines */}
            <div className="bg-[#1d1f29] border border-white/5 rounded-2xl p-6">
              <p className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-red-400 text-[18px]">event</span>
                Upcoming Deadlines
              </p>
              <div className="space-y-3">
                {upcomingDeadlines.length === 0 ? (
                  <p className="text-xs text-gray-500">No upcoming deadlines.</p>
                ) : (
                  upcomingDeadlines.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                      <div className="truncate pr-2">
                        <p className="font-medium text-gray-200 truncate">{t.title}</p>
                        <span className="text-[10px] text-gray-500">{t.assignee || 'Unassigned'}</span>
                      </div>
                      <span className="font-mono text-[10px] text-amber-400 shrink-0">{t.dueDate}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
