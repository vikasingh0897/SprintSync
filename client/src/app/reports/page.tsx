'use client';
import { useState } from 'react';
import { EMPLOYEES } from '../../data/employees';
import { INITIAL_BOARD_DATA } from '../../data/boardData';

const topPerformers = [...EMPLOYEES].sort((a, b) => b.avgScore - a.avgScore).slice(0, 10);

const totalCompleted = EMPLOYEES.reduce((acc, e) => acc + e.tasksCompleted, 0);
const totalInProgress = EMPLOYEES.reduce((acc, e) => acc + e.tasksInProgress, 0);
const totalPending = EMPLOYEES.reduce((acc, e) => acc + e.tasksPending, 0);
const avgCompletion = Math.round(EMPLOYEES.reduce((acc, e) => acc + e.completionRate, 0) / EMPLOYEES.length);
const avgScore = Math.round(EMPLOYEES.reduce((acc, e) => acc + e.avgScore, 0) / EMPLOYEES.length);

const departmentStats = [
  { name: 'Engineering', employees: EMPLOYEES.filter(e => e.department === 'Engineering'), color: '#6366f1' },
  { name: 'Design', employees: EMPLOYEES.filter(e => e.department === 'Design'), color: '#ec4899' },
  { name: 'Product', employees: EMPLOYEES.filter(e => e.department === 'Product'), color: '#f59e0b' },
  { name: 'Marketing', employees: EMPLOYEES.filter(e => e.department === 'Marketing'), color: '#10b981' },
  { name: 'Analytics', employees: EMPLOYEES.filter(e => e.department === 'Analytics'), color: '#06b6d4' },
  { name: 'Sales', employees: EMPLOYEES.filter(e => e.department === 'Sales'), color: '#8b5cf6' },
].map(dept => ({
  ...dept,
  avgScore: Math.round(dept.employees.reduce((acc, e) => acc + e.avgScore, 0) / (dept.employees.length || 1)),
  tasksCompleted: dept.employees.reduce((acc, e) => acc + e.tasksCompleted, 0),
}));

const taskDistribution = INITIAL_BOARD_DATA.columns.map(col => ({
  name: col.title,
  count: col.tasks.length,
  color: col.color,
}));

const RANGE_OPTIONS = ['This Week', 'This Month', 'Q3 2026', 'All Time'];

export default function ReportsPage() {
  const [selectedRange, setSelectedRange] = useState('This Month');
  const [selectedEmployee, setSelectedEmployee] = useState<typeof EMPLOYEES[0] | null>(null);

  const maxDeptScore = Math.max(...departmentStats.map(d => d.avgScore));
  const maxTaskDist = Math.max(...taskDistribution.map(t => t.count));

  return (
    <main className="min-h-screen bg-[#0c0e17] pb-24">
      <div className="max-w-7xl mx-auto px-6 pt-6">

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              <span className="material-symbols-outlined text-indigo-400 align-middle mr-2">bar_chart</span>
              Performance Reports
            </h2>
            <p className="text-sm text-gray-400">Track team performance, task completion, and individual metrics.</p>
          </div>
          {/* Date Range */}
          <div className="flex gap-2">
            {RANGE_OPTIONS.map(r => (
              <button
                key={r}
                onClick={() => setSelectedRange(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Completed', value: totalCompleted, icon: 'check_circle', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15' },
            { label: 'In Progress', value: totalInProgress, icon: 'pending_actions', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/15' },
            { label: 'Pending', value: totalPending, icon: 'hourglass_empty', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/15' },
            { label: 'Avg Completion', value: `${avgCompletion}%`, icon: 'donut_large', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/15' },
            { label: 'Avg Score', value: `${avgScore}/100`, icon: 'star', color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/15' },
          ].map(stat => (
            <div key={stat.label} className={`${stat.bg} ${stat.border} border rounded-2xl p-4`}>
              <span className={`material-symbols-outlined ${stat.color} text-[20px] mb-2 block`} style={{ fontVariationSettings: "'FILL' 1" }}>
                {stat.icon}
              </span>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Department Performance Chart */}
          <div className="md:col-span-2 bg-[#1d1f29] border border-white/5 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-[20px]">business</span>
              Department Performance
            </h3>
            <div className="space-y-4">
              {departmentStats.map(dept => (
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
          <div className="bg-[#1d1f29] border border-white/5 rounded-2xl p-6">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-violet-400 text-[20px]">view_kanban</span>
              Task Distribution
            </h3>
            <div className="space-y-4">
              {taskDistribution.map(col => (
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
                      cx="18" cy="18" r="15.9155"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      strokeDasharray={`${(taskDistribution.find(t => t.name === 'Done')?.count || 0) / INITIAL_BOARD_DATA.columns.flatMap(c => c.tasks).length * 100} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                    {Math.round((taskDistribution.find(t => t.name === 'Done')?.count || 0) / INITIAL_BOARD_DATA.columns.flatMap(c => c.tasks).length * 100)}%
                  </div>
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{taskDistribution.find(t => t.name === 'Done')?.count} / {INITIAL_BOARD_DATA.columns.flatMap(c => c.tasks).length}</p>
                  <p className="text-xs text-gray-500">Tasks completed</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Top Performers Table */}
        <div className="bg-[#1d1f29] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-[20px]">emoji_events</span>
              Individual Performance Rankings
            </h3>
            <span className="text-xs text-gray-500">Click a row to view details</span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-white/5">
                  {['Rank', 'Employee', 'Department', 'Done', 'Active', 'Pending', 'Rate', 'Score'].map(h => (
                    <th key={h} className="pb-3 text-xs font-semibold text-gray-500 uppercase tracking-wider pr-4">{h}</th>
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
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${emp.completionRate}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{emp.completionRate}%</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <span
                        className="text-sm font-bold"
                        style={{ color: emp.avatarColor }}
                      >
                        {emp.avgScore}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Employee Detail Drawer */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedEmployee(null); }}
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
                <button onClick={() => setSelectedEmployee(null)} className="material-symbols-outlined text-gray-400 hover:text-white p-1 rounded transition-colors">close</button>
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
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${selectedEmployee.completionRate}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">Performance Score</span>
                    <span className="font-bold" style={{ color: selectedEmployee.avatarColor }}>{selectedEmployee.avgScore}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${selectedEmployee.avgScore}%`, backgroundColor: selectedEmployee.avatarColor }} />
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
