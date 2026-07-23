'use client';
import { useState } from 'react';
import { EMPLOYEES, DEPARTMENTS } from '../../data/employees';

const statusColors: Record<string, string> = {
  Active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Remote: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'On Leave': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
};

function PerformanceRing({ value, color }: { value: number; color: string }) {
  const size = 48;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {value}
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const [selectedDept, setSelectedDept] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<typeof EMPLOYEES[0] | null>(null);

  const filtered = EMPLOYEES.filter(emp => {
    const matchesDept = selectedDept === 'All' || emp.department === selectedDept;
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.role.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-[#0c0e17] pb-24">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              <span className="material-symbols-outlined text-indigo-400 align-middle mr-2">group</span>
              Employees
            </h2>
            <p className="text-sm text-gray-400">{EMPLOYEES.length} team members across {DEPARTMENTS.length - 1} departments</p>
          </div>
          {/* Search */}
          <div className="relative w-full md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 transition-all"
            />
          </div>
        </div>

        {/* Department Filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          {DEPARTMENTS.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedDept === dept
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>

        {/* Employee Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(emp => (
            <div
              key={emp.id}
              onClick={() => setSelectedEmployee(emp)}
              className="bg-[#1d1f29] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 group"
            >
              {/* Avatar + Status */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white shadow-lg"
                  style={{ backgroundColor: emp.avatarColor + '33', color: emp.avatarColor, border: `2px solid ${emp.avatarColor}40` }}
                >
                  {emp.initials}
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusColors[emp.status]}`}>
                  {emp.status}
                </span>
              </div>

              {/* Info */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{emp.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{emp.role}</p>
                <p className="text-[10px] text-gray-600 mt-1 font-medium">{emp.department}</p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs text-gray-500">{emp.tasksCompleted} done</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="text-xs text-gray-500">{emp.tasksInProgress} active</span>
                  </div>
                </div>
                <PerformanceRing value={emp.completionRate} color={emp.avatarColor} />
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-gray-500">
              <span className="material-symbols-outlined text-[48px] mb-3 block">person_search</span>
              <p>No employees found</p>
            </div>
          )}
        </div>
      </div>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedEmployee(null); }}
        >
          <div className="w-full max-w-md bg-[#1d1f29] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="relative p-6 pb-4" style={{ background: `linear-gradient(135deg, ${selectedEmployee.avatarColor}20, transparent)` }}>
              <button
                onClick={() => setSelectedEmployee(null)}
                className="absolute top-4 right-4 material-symbols-outlined text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-all"
              >
                close
              </button>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
                  style={{ backgroundColor: selectedEmployee.avatarColor + '33', color: selectedEmployee.avatarColor, border: `2px solid ${selectedEmployee.avatarColor}50` }}
                >
                  {selectedEmployee.initials}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedEmployee.name}</h3>
                  <p className="text-sm text-gray-400">{selectedEmployee.role}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[selectedEmployee.status]}`}>
                      {selectedEmployee.status}
                    </span>
                    <span className="text-[10px] text-gray-500">{selectedEmployee.department}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-4 space-y-5">
              {/* Email */}
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-gray-500 text-[18px]">mail</span>
                <span className="text-gray-300">{selectedEmployee.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-gray-500 text-[18px]">calendar_month</span>
                <span className="text-gray-300">Joined {selectedEmployee.joinedDate}</span>
              </div>

              {/* Performance Stats */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Done', value: selectedEmployee.tasksCompleted, color: 'text-emerald-400' },
                  { label: 'Active', value: selectedEmployee.tasksInProgress, color: 'text-amber-400' },
                  { label: 'Pending', value: selectedEmployee.tasksPending, color: 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-white/3 rounded-xl p-3 text-center">
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Completion Rate */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400">Completion Rate</span>
                  <span className="text-xs font-bold text-white">{selectedEmployee.completionRate}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${selectedEmployee.completionRate}%`, backgroundColor: selectedEmployee.avatarColor }}
                  />
                </div>
              </div>

              {/* Avg Score */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400">Performance Score</span>
                  <span className="text-xs font-bold" style={{ color: selectedEmployee.avatarColor }}>{selectedEmployee.avgScore}/100</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${selectedEmployee.avgScore}%`, backgroundColor: selectedEmployee.avatarColor + 'cc' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
