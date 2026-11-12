'use client';

import { useState, useEffect, useMemo } from 'react';
import type { Employee } from '../../data/employees';
import type { Column } from '../../data/boardData';
import { INITIAL_BOARD_DATA } from '../../data/boardData';
import { employeesApi, boardApi } from '../../lib/api';
import { getSocket } from '../../lib/socket';

const RANGE_OPTIONS = ['This Week', 'This Month', 'This Sprint', 'All Time'];

export default function ReportsPage() {
  const [selectedRange, setSelectedRange] = useState('This Sprint');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [columns, setColumns] = useState<Column[]>(INITIAL_BOARD_DATA.columns);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReportsData = async () => {
    try {
      const [empRes, boardRes] = await Promise.all([
        employeesApi.getAll().catch(() => ({ success: false })),
        boardApi.getBoard().catch(() => ({ success: false })),
      ]);

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

      if (boardRes.success && Array.isArray(boardRes.data?.columns)) {
        setColumns(boardRes.data.columns);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportsData();
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const refresh = () => loadReportsData();

    socket.on('employee:created', refresh);
    socket.on('employee:confirmed', refresh);
    socket.on('employee:updated', refresh);
    socket.on('employee:deleted', refresh);
    socket.on('task:created', refresh);
    socket.on('task:moved', refresh);
    socket.on('task:updated', refresh);
    socket.on('task:deleted', refresh);

    return () => {
      socket.off('employee:created', refresh);
      socket.off('employee:confirmed', refresh);
      socket.off('employee:updated', refresh);
      socket.off('employee:deleted', refresh);
      socket.off('task:created', refresh);
      socket.off('task:moved', refresh);
      socket.off('task:updated', refresh);
      socket.off('task:deleted', refresh);
    };
  }, []);

  const allTasks = useMemo(() => columns.flatMap((c) => c.tasks || []), [columns]);

  const doneCount = columns.find((c) => c.id === 'col-done' || c.title.toLowerCase() === 'done')?.tasks.length || 0;
  const inProgressCount = columns.find((c) => c.id === 'col-inprogress' || c.title.toLowerCase() === 'in progress')?.tasks.length || 0;
  const pendingCount = allTasks.length - doneCount - inProgressCount;

  const avgCompletion = useMemo(() => {
    if (allTasks.length > 0) return Math.round((doneCount / allTasks.length) * 100);
    if (employees.length === 0) return 0;
    return Math.round(employees.reduce((acc, e) => acc + e.completionRate, 0) / employees.length);
  }, [allTasks.length, doneCount, employees]);

  const avgScore = useMemo(() => {
    if (employees.length === 0) return 0;
    return Math.round(employees.reduce((acc, e) => acc + e.avgScore, 0) / employees.length);
  }, [employees]);

  const departmentStats = useMemo(() => {
    const deptMeta = [
      { name: 'Engineering', color: '#6366f1' },
      { name: 'Design', color: '#ec4899' },
      { name: 'Product', color: '#f59e0b' },
      { name: 'Marketing', color: '#10b981' },
      { name: 'Analytics', color: '#06b6d4' },
      { name: 'Sales', color: '#8b5cf6' },
    ];
    return deptMeta.map((dept) => {
      const members = employees.filter((e) => e.department === dept.name);
      return {
        ...dept,
        employees: members,
        avgScore: members.length > 0 ? Math.round(members.reduce((acc, e) => acc + e.avgScore, 0) / members.length) : 0,
        tasksCompleted: members.reduce((acc, e) => acc + e.tasksCompleted, 0),
      };
    });
  }, [employees]);

  const taskDistribution = useMemo(
    () =>
      columns.map((col) => ({
        name: col.title,
        count: col.tasks.length,
        color: col.color,
      })),
    [columns]
  );

  const topPerformers = useMemo(
    () => [...employees].sort((a, b) => b.avgScore - a.avgScore).slice(0, 10),
    [employees]
  );

  const maxDeptScore = Math.max(1, ...departmentStats.map((d) => d.avgScore));
  const maxTaskDist = Math.max(1, ...taskDistribution.map((t) => t.count));
  const taskCompletionPct = allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#0c0e17] pb-24 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 sm:pt-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-1 tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400">bar_chart</span>
              Performance Reports
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              {loading ? 'Loading live analytics...' : 'Real-time team performance, task completion, and individual metrics.'}
            </p>
          </div>
          {/* Date Range */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar sm:flex-wrap pb-1">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  selectedRange === r
                    ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/5'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total Completed', value: doneCount, icon: 'check_circle', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { label: 'In Progress', value: inProgressCount, icon: 'pending_actions', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            { label: 'Pending / Backlog', value: Math.max(0, pendingCount), icon: 'hourglass_empty', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
            { label: 'Avg Completion', value: `${avgCompletion}%`, icon: 'donut_large', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
            { label: 'Avg Score', value: `${avgScore}/100`, icon: 'star', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
          ].map((stat, idx) => (
            <div
              key={stat.label}
              className={`${stat.bg} ${stat.border} border rounded-2xl p-4 ${
                idx === 4 ? 'col-span-2 sm:col-span-1' : ''
              }`}
            >
              <span className={`material-symbols-outlined ${stat.color} text-[20px] mb-2 block`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {stat.icon}
              </span>
              <p className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 mb-6">
          {/* Department Performance Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-5 sm:p-6">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-[20px]">business</span>
              Department Performance
            </h3>
            <div className="space-y-4">
              {departmentStats.map((dept) => (
                <div key={dept.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                      <span className="text-sm text-gray-300">{dept.name}</span>
                      <span className="text-xs text-gray-600">({dept.employees.length} members)</span>
                    </div>
                    <span className="text-sm font-bold text-white">{dept.avgScore}/100</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(dept.avgScore / maxDeptScore) * 100}%`, backgroundColor: dept.color }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{dept.tasksCompleted} tasks completed</p>
                </div>
              ))}
            </div>
          </div>

          {/* Task Distribution */}
          <div className="glass-card rounded-2xl p-5 sm:p-6">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-400 text-[20px]">view_kanban</span>
              Task Distribution
            </h3>
            <div className="space-y-4">
              {taskDistribution.map((col) => (
                <div key={col.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-gray-300">{col.name}</span>
                    <span className="text-sm font-bold text-white">{col.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(col.count / maxTaskDist) * 100}%`, backgroundColor: col.color }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Donut-like visual */}
            <div className="mt-6 pt-5 border-t border-white/5">
              <p className="text-xs text-gray-500 mb-3">Task Completion Rate</p>
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray={`${taskCompletionPct} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {taskCompletionPct}%
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">
                    {doneCount} / {allTasks.length}
                  </p>
                  <p className="text-xs text-gray-500">Tasks completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers Table */}
        <div className="glass-card rounded-2xl p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5 sm:mb-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-[20px]">emoji_events</span>
              Team Performance Rankings
            </h3>
            <span className="text-xs text-gray-400">Tap a row for details</span>
          </div>

          {topPerformers.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-8">
              No employees added yet. Invite team members to track real-time performance rankings.
            </p>
          ) : (
            <div className="overflow-x-auto custom-scrollbar -mx-2 px-2">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="text-left border-b border-white/5">
                    {['Rank', 'Employee', 'Department', 'Done', 'Active', 'Pending', 'Rate', 'Score'].map((h) => (
                      <th key={h} className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider pr-4 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/3">
                  {topPerformers.map((emp, i) => (
                    <tr
                      key={emp.id}
                      onClick={() => setSelectedEmployee(emp)}
                      className="hover:bg-white/3 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 pr-4">
                        <span className="text-sm font-bold text-gray-500">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ backgroundColor: emp.avatarColor + '33', color: emp.avatarColor }}
                          >
                            {emp.initials}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">{emp.name}</p>
                            <p className="text-xs text-gray-500">{emp.role}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-xs text-gray-400">{emp.department}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm font-bold text-emerald-400">{emp.tasksCompleted}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm font-bold text-amber-400">{emp.tasksInProgress}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm font-bold text-red-400">{emp.tasksPending}</span>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${emp.completionRate}%` }} />
                          </div>
                          <span className="text-xs text-gray-400">{emp.completionRate}%</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-sm font-bold" style={{ color: emp.avatarColor }}>
                          {emp.avgScore}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Employee Detail Drawer */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEmployee(null);
          }}
        >
          <div className="w-full max-w-sm bg-[#1d1f29] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6" style={{ background: `linear-gradient(135deg, ${selectedEmployee.avatarColor}20, transparent)` }}>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold"
                    style={{ backgroundColor: selectedEmployee.avatarColor + '33', color: selectedEmployee.avatarColor }}
                  >
                    {selectedEmployee.initials}
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{selectedEmployee.name}</h3>
                    <p className="text-xs text-gray-400">{selectedEmployee.role}</p>
                    <p className="text-xs text-gray-600">{selectedEmployee.department}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="material-symbols-outlined text-gray-400 hover:text-white p-1 rounded transition-colors"
                >
                  close
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-emerald-400">{selectedEmployee.tasksCompleted}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Done</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-400">{selectedEmployee.tasksInProgress}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Active</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-red-400">{selectedEmployee.tasksPending}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">Pending</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Completion Rate</span>
                    <span className="font-bold text-white">{selectedEmployee.completionRate}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                      style={{ width: `${selectedEmployee.completionRate}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Performance Score</span>
                    <span className="font-bold" style={{ color: selectedEmployee.avatarColor }}>
                      {selectedEmployee.avgScore}/100
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${selectedEmployee.avgScore}%`, backgroundColor: selectedEmployee.avatarColor }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
