'use client';

import { useState, useEffect } from 'react';
import { EMPLOYEES as DEFAULT_EMPLOYEES, DEPARTMENTS, Employee } from '../../data/employees';
import { employeesApi, API_URL } from '../../lib/api';
import { getSocket } from '../../lib/socket';

const statusColors: Record<string, string> = {
  Active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  Remote: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  'On Leave': 'bg-amber-500/15 text-amber-400 border-amber-500/20',
  'Pending Confirmation': 'bg-violet-500/15 text-violet-400 border-violet-500/20 animate-pulse',
};

const AVATAR_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#10b981', '#f43f5e'];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(DEFAULT_EMPLOYEES);
  const [selectedDept, setSelectedDept] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [avatarColor, setAvatarColor] = useState(AVATAR_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ message: string; link?: string; previewUrl?: string } | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Load from backend on mount
  useEffect(() => {
    employeesApi.getAll()
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          const mapped = res.data.map((e: any) => ({
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
            joinedDate: e.joinedDate || new Date().toISOString().split('T')[0],
            status: e.status || 'Active',
          }));
          setEmployees(mapped);
        }
      })
      .catch(() => {});
  }, []);

  // Real-time socket listeners
  useEffect(() => {
    const socket = getSocket();

    const handleCreated = (emp: any) => {
      const newEmp: Employee = {
        id: emp._id || emp.id,
        name: emp.name,
        email: emp.email,
        role: emp.role,
        department: emp.department,
        avatarColor: emp.avatarColor || '#6366f1',
        initials: emp.initials || 'EM',
        tasksCompleted: 0,
        tasksInProgress: 0,
        tasksPending: 0,
        completionRate: 0,
        avgScore: 85,
        joinedDate: emp.joinedDate || new Date().toISOString().split('T')[0],
        status: emp.status || 'Pending Confirmation',
      };
      setEmployees((prev) => [newEmp, ...prev.filter((e) => e.id !== newEmp.id && e.email !== newEmp.email)]);
    };

    const handleConfirmed = (emp: any) => {
      setEmployees((prev) =>
        prev.map((e) => (e.id === (emp._id || emp.id) || e.email === emp.email ? { ...e, status: 'Active' } : e))
      );
      if (selectedEmployee && (selectedEmployee.id === (emp._id || emp.id) || selectedEmployee.email === emp.email)) {
        setSelectedEmployee((prev) => (prev ? { ...prev, status: 'Active' } : null));
      }
    };

    const handleUpdated = (emp: any) => {
      setEmployees((prev) =>
        prev.map((e) => (e.id === (emp._id || emp.id) ? { ...e, ...emp } : e))
      );
    };

    const handleDeleted = ({ id }: { id: string }) => {
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      if (selectedEmployee?.id === id) setSelectedEmployee(null);
    };

    socket.on('employee:created', handleCreated);
    socket.on('employee:confirmed', handleConfirmed);
    socket.on('employee:updated', handleUpdated);
    socket.on('employee:deleted', handleDeleted);

    return () => {
      socket.off('employee:created', handleCreated);
      socket.off('employee:confirmed', handleConfirmed);
      socket.off('employee:updated', handleUpdated);
      socket.off('employee:deleted', handleDeleted);
    };
  }, [selectedEmployee]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !role) return;

    setIsSubmitting(true);
    setInviteFeedback(null);
    try {
      const res = await employeesApi.invite({
        name,
        email,
        role,
        department,
        avatarColor,
      });

      if (res.success) {
        setInviteFeedback({
          message: `${name} has been set up! Confirmation email dispatched to ${email}.`,
          link: res.confirmationLink,
          previewUrl: res.emailPreviewUrl,
        });
        setName('');
        setEmail('');
        setRole('');
        setTimeout(() => setIsInviteModalOpen(false), 4000);
      } else {
        alert(res.message || 'Failed to invite employee.');
      }
    } catch (err: any) {
      alert(`Error connecting to backend server (${API_URL}):\n${err?.message || 'Network connection failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async (empId: string) => {
    setResendingId(empId);
    try {
      const res = await employeesApi.resendConfirmation(empId);
      if (res.success) {
        alert(`Confirmation email resent!\nConfirmation Link: ${res.confirmationLink}`);
      } else {
        alert(res.message || 'Failed to resend confirmation email.');
      }
    } catch (err: any) {
      alert(`Error connecting to backend server (${API_URL}):\n${err?.message || 'Network connection failed'}`);
    } finally {
      setResendingId(null);
    }
  };

  const filtered = employees.filter((emp) => {
    const matchesDept = selectedDept === 'All' || emp.department === selectedDept;
    const matchesSearch =
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.role.toLowerCase().includes(search.toLowerCase()) ||
      emp.department.toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <main className="min-h-screen bg-[#0c0e17] pb-24">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-6">
        {/* Real-time Confirmation Link Banner if available */}
        {inviteFeedback && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-200">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-indigo-400 text-[24px]">mark_email_read</span>
              <div>
                <p className="text-sm font-semibold text-white">{inviteFeedback.message}</p>
                {inviteFeedback.link && (
                  <p className="text-xs text-indigo-300 font-mono mt-0.5 truncate max-w-xl">
                    Invite URL: {inviteFeedback.link}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {inviteFeedback.link && (
                <a
                  href={inviteFeedback.link}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
                >
                  Test Confirm Link ↗
                </a>
              )}
              <button
                onClick={() => setInviteFeedback(null)}
                className="text-gray-400 hover:text-white p-1"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">
              <span className="material-symbols-outlined text-indigo-400 align-middle mr-2">group</span>
              Employees
            </h2>
            <p className="text-sm text-gray-400">
              {employees.length} team members across {DEPARTMENTS.length - 1} departments · Real-time setup & email confirmation
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-full md:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search employees..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 transition-all"
              />
            </div>

            {/* Invite Button */}
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20 shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>Invite Member</span>
            </button>
          </div>
        </div>

        {/* Department Filters */}
        <div className="flex gap-2 flex-wrap mb-6">
          {DEPARTMENTS.map((dept) => (
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
          {filtered.map((emp) => (
            <div
              key={emp.id}
              onClick={() => setSelectedEmployee(emp)}
              className="bg-[#1d1f29] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5 group relative"
            >
              {/* Avatar + Status */}
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold text-white shadow-lg"
                  style={{
                    backgroundColor: emp.avatarColor + '33',
                    color: emp.avatarColor,
                    border: `2px solid ${emp.avatarColor}40`,
                  }}
                >
                  {emp.initials}
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusColors[emp.status] || statusColors.Active}`}>
                  {emp.status}
                </span>
              </div>

              {/* Info */}
              <div className="mb-4">
                <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{emp.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{emp.role}</p>
                <p className="text-[10px] text-gray-600 mt-1 font-medium">{emp.department}</p>
              </div>

              {/* Status footer / Resend action */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-500">
                <span className="truncate max-w-[130px] font-mono text-[11px]">{emp.email}</span>
                {emp.status === 'Pending Confirmation' ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResend(emp.id);
                    }}
                    disabled={resendingId === emp.id}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
                  >
                    {resendingId === emp.id ? 'Sending...' : 'Resend'}
                  </button>
                ) : (
                  <span className="text-[11px] text-emerald-400 font-semibold">Score: {emp.avgScore}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Invite Employee Modal ── */}
      {isInviteModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsInviteModalOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-[#1d1f29] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">person_add</span>
                </div>
                <h3 className="text-base font-bold text-white">Invite New Employee</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Hayes"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan.hayes@sprintsync.io"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
                />
                <p className="text-[11px] text-gray-500 mt-1">A real-time confirmation link will be sent to this email.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Role *
                  </label>
                  <input
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Staff Engineer"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60 cursor-pointer"
                  >
                    {DEPARTMENTS.filter((d) => d !== 'All').map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Badge Color
                </label>
                <div className="flex gap-2">
                  {AVATAR_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setAvatarColor(col)}
                      style={{ backgroundColor: col }}
                      className={`w-7 h-7 rounded-lg transition-transform ${
                        avatarColor === col ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Sending Invite...' : 'Send Setup Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Employee Detail Modal ── */}
      {selectedEmployee && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedEmployee(null);
          }}
        >
          <div className="w-full max-w-md bg-[#1d1f29] border border-white/10 rounded-2xl shadow-2xl shadow-black/50 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div
              className="relative p-6 pb-4"
              style={{ background: `linear-gradient(135deg, ${selectedEmployee.avatarColor}20, transparent)` }}
            >
              <button
                onClick={() => setSelectedEmployee(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
                  style={{
                    backgroundColor: selectedEmployee.avatarColor + '33',
                    color: selectedEmployee.avatarColor,
                    border: `2px solid ${selectedEmployee.avatarColor}50`,
                  }}
                >
                  {selectedEmployee.initials}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedEmployee.name}</h3>
                  <p className="text-sm text-gray-400">{selectedEmployee.role}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[selectedEmployee.status] || statusColors.Active}`}>
                      {selectedEmployee.status}
                    </span>
                    <span className="text-[10px] text-gray-500">{selectedEmployee.department}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 pt-4 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-gray-500 text-[18px]">mail</span>
                <span className="text-gray-300 font-mono text-xs">{selectedEmployee.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined text-gray-500 text-[18px]">calendar_month</span>
                <span className="text-gray-300">Joined {selectedEmployee.joinedDate}</span>
              </div>

              {selectedEmployee.status === 'Pending Confirmation' ? (
                <div className="p-3.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
                  <p className="text-xs text-violet-300 font-medium mb-2">
                    Awaiting employee email confirmation & password setup.
                  </p>
                  <button
                    onClick={() => handleResend(selectedEmployee.id)}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold transition-all shadow-md"
                  >
                    Resend Confirmation Email
                  </button>
                </div>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
