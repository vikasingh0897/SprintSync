'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import type { Employee } from '../data/employees';
import type { Task } from '../data/boardData';
import { boardApi, sprintsApi, employeesApi, notificationsApi } from '../lib/api';
import { getSocket } from '../lib/socket';

interface ActiveSprint {
  id: string;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

interface ActivityItem {
  id: string;
  title: string;
  message: string;
  type?: string;
  createdAt?: string;
}

export default function Home() {
  const { user } = useAuth();

  const [activeSprint, setActiveSprint] = useState<ActiveSprint | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [sprintRes, boardRes, empRes, notifRes] = await Promise.all([
        sprintsApi.getActive().catch(() => ({ success: false })),
        boardApi.getBoard().catch(() => ({ success: false })),
        employeesApi.getAll().catch(() => ({ success: false })),
        notificationsApi.getAll().catch(() => ({ success: false })),
      ]);

      if (sprintRes.success && sprintRes.data) {
        setActiveSprint({
          id: sprintRes.data._id || sprintRes.data.id,
          name: sprintRes.data.name,
          goal: sprintRes.data.goal,
          startDate: sprintRes.data.startDate,
          endDate: sprintRes.data.endDate,
          status: sprintRes.data.status,
        });
      } else {
        setActiveSprint(null);
      }

      if (boardRes.success && boardRes.data?.columns) {
        setTasks(boardRes.data.columns.flatMap((c: any) => c.tasks || []));
      } else {
        setTasks([]);
      }

      if (empRes.success && Array.isArray(empRes.data)) {
        setEmployees(
          empRes.data.map((e: any) => ({
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

      if (notifRes.success && Array.isArray(notifRes.data)) {
        setActivities(
          notifRes.data.slice(0, 8).map((n: any) => ({
            id: n._id || n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            createdAt: n.createdAt,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Load live data from backend
  useEffect(() => {
    loadDashboardData();
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
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          status: sprint.status,
        });
      } else {
        sprintsApi.getActive().then((res) => {
          setActiveSprint(
            res.success && res.data
              ? {
                  id: res.data._id || res.data.id,
                  name: res.data.name,
                  goal: res.data.goal,
                  startDate: res.data.startDate,
                  endDate: res.data.endDate,
                  status: res.data.status,
                }
              : null
          );
        }).catch(() => {});
      }
    };

    const handleSprintDeleted = ({ id }: { id: string }) => {
      setActiveSprint((curr) => (curr && curr.id === id ? null : curr));
      boardApi.getBoard().then((res) => {
        if (res.success && res.data?.columns) {
          setTasks(res.data.columns.flatMap((c: any) => c.tasks || []));
        }
      }).catch(() => {});
    };

    const handleTaskChange = () => {
      boardApi.getBoard().then((res) => {
        if (res.success && res.data?.columns) {
          setTasks(res.data.columns.flatMap((c: any) => c.tasks || []));
        }
      }).catch(() => {});
    };

    const handleEmployeeChange = () => {
      employeesApi.getAll().then((res) => {
        if (res.success && Array.isArray(res.data)) {
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
      }).catch(() => {});
    };

    const handleNewNotification = (notif: any) => {
      setActivities((prev) => [
        {
          id: notif._id || notif.id || `act-${Date.now()}`,
          title: notif.title,
          message: notif.message,
          type: notif.type,
          createdAt: notif.createdAt || new Date().toISOString(),
        },
        ...prev.slice(0, 7),
      ]);
    };

    socket.on('sprint:created', handleSprintUpdated);
    socket.on('sprint:updated', handleSprintUpdated);
    socket.on('sprint:deleted', handleSprintDeleted);
    socket.on('task:created', handleTaskChange);
    socket.on('task:moved', handleTaskChange);
    socket.on('task:updated', handleTaskChange);
    socket.on('task:deleted', handleTaskChange);
    socket.on('employee:created', handleEmployeeChange);
    socket.on('employee:confirmed', handleEmployeeChange);
    socket.on('employee:deleted', handleEmployeeChange);
    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('sprint:created', handleSprintUpdated);
      socket.off('sprint:updated', handleSprintUpdated);
      socket.off('sprint:deleted', handleSprintDeleted);
      socket.off('task:created', handleTaskChange);
      socket.off('task:moved', handleTaskChange);
      socket.off('task:updated', handleTaskChange);
      socket.off('task:deleted', handleTaskChange);
      socket.off('employee:created', handleEmployeeChange);
      socket.off('employee:confirmed', handleEmployeeChange);
      socket.off('employee:deleted', handleEmployeeChange);
      socket.off('notification:new', handleNewNotification);
    };
  }, []);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.columnId === 'col-done').length;
  const inProgressTasks = tasks.filter((t) => t.columnId === 'col-inprogress').length;
  const reviewTasks = tasks.filter((t) => t.columnId === 'col-review').length;
  const backlogTasks = tasks.filter((t) => t.columnId === 'col-backlog').length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const topPerformers = [...employees].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5);

  const upcomingDeadlines = tasks
    .filter((t) => t.dueDate)
    .sort((a, b) => ((a.dueDate || '') < (b.dueDate || '') ? -1 : 1))
    .slice(0, 6);

  const activityColor = (type?: string) => {
    if (type === 'task_assigned') return '#f59e0b';
    if (type === 'employee_confirmed') return '#10b981';
    if (type === 'sprint_update') return '#6366f1';
    return '#8b5cf6';
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
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  activeSprint ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              {activeSprint ? `Live · ${activeSprint.name}` : loading ? 'Syncing workspace...' : 'No Active Sprint'}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},&nbsp;
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                {user?.name?.split(' ')[0] ?? 'there'}
              </span>
              &nbsp;👋
            </h1>
            <p className="text-gray-400 mt-1 text-sm max-w-lg">
              {activeSprint ? (
                <>
                  Your team has completed <strong className="text-white">{completedTasks}</strong> of{' '}
                  <strong className="text-white">{totalTasks}</strong> tasks this sprint.{' '}
                  {totalTasks === 0
                    ? 'Add tasks on the Board to get started.'
                    : completionPct >= 70
                    ? "You're on track! 🚀"
                    : 'Keep pushing — deadlines ahead.'}
                </>
              ) : (
                'Create your first sprint iteration and invite your team to start tracking real-time progress.'
              )}
            </p>
          </div>

          <Link
            href="/board"
            className="shrink-0 flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm hover:from-indigo-600 hover:to-violet-700 shadow-xl shadow-indigo-500/30 active:scale-[0.97] transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">
              {activeSprint ? 'add' : 'timer'}
            </span>
            {activeSprint ? 'Open Sprint Board' : 'Create First Sprint'}
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* ── Sprint progress bar ── */}
        <div className="bg-[#1d1f29] rounded-2xl border border-white/5 px-6 py-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-bold text-white">
                {activeSprint ? `${activeSprint.name} Progress` : 'Sprint Progress'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {activeSprint
                  ? activeSprint.goal || 'Active iteration in progress'
                  : 'No active sprint yet — go to Board to create a sprint iteration'}
              </p>
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
          <div className="flex gap-6 mt-3 flex-wrap">
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
                  { label: 'Sprints & Board', icon: 'view_kanban', href: '/board', from: 'from-indigo-500', to: 'to-violet-600', shadow: 'shadow-indigo-500/25' },
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

            {/* Live Activity Feed */}
            <div className="bg-[#1d1f29] border border-white/5 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-violet-400 text-[18px]">history</span>
                  Recent Activity
                </p>
                <span className="text-xs text-gray-500">Live sync</span>
              </div>
              <div className="space-y-4">
                {activities.length === 0 ? (
                  <p className="text-xs text-gray-500 py-4 text-center">
                    No recent activity yet. Sprints, employee invites, and task updates will appear here in real time.
                  </p>
                ) : (
                  activities.map((act) => {
                    const color = activityColor(act.type);
                    return (
                      <div key={act.id} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
                            style={{ backgroundColor: color + '25', color }}
                          >
                            <span className="material-symbols-outlined text-[16px]">bolt</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-white truncate">{act.title}</p>
                            <p className="text-gray-400 truncate">{act.message}</p>
                          </div>
                        </div>
                        <span className="text-gray-500 shrink-0 ml-2">
                          {act.createdAt
                            ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'Just now'}
                        </span>
                      </div>
                    );
                  })
                )}
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
                  Team Members
                </p>
                <Link href="/employees" className="text-xs text-indigo-400 hover:text-indigo-300">
                  Manage
                </Link>
              </div>
              <div className="space-y-3">
                {topPerformers.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500 mb-2">No team members added yet.</p>
                    <Link href="/employees" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                      + Invite first member
                    </Link>
                  </div>
                ) : (
                  topPerformers.map((emp, i) => (
                    <div key={emp.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-gray-500 w-4">#{i + 1}</span>
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ backgroundColor: emp.avatarColor + '33', color: emp.avatarColor }}
                        >
                          {emp.initials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{emp.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{emp.role}</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400 shrink-0">{emp.avgScore}</span>
                    </div>
                  ))
                )}
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
