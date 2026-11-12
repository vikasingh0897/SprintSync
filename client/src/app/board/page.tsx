'use client';

import { useState, useEffect, useMemo } from 'react';
import { Board } from '../../components/Board';
import { sprintsApi, API_URL } from '../../lib/api';
import { getSocket } from '../../lib/socket';

interface Sprint {
  _id?: string;
  id?: string;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status?: 'active' | 'planning' | 'completed' | string;
}

const DURATION_PRESETS = [
  { label: '1 Week', days: 7 },
  { label: '2 Weeks', days: 14 },
  { label: '3 Weeks', days: 21 },
  { label: '4 Weeks', days: 28 },
];

function addDaysToIso(startIso: string, days: number): string {
  const base = startIso ? new Date(startIso) : new Date();
  if (Number.isNaN(base.getTime())) return new Date(Date.now() + days * 86400000).toISOString().split('T')[0];
  base.setDate(base.getDate() + days);
  return base.toISOString().split('T')[0];
}

function formatShortDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getDaysRemainingLabel(endIso?: string, status?: string): string {
  if (status === 'completed') return 'Completed';
  if (!endIso) return '';
  const diffMs = new Date(endIso).getTime() - Date.now();
  const days = Math.ceil(diffMs / 86400000);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Ends today';
  return `${days}d left`;
}

export default function BoardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loadingSprints, setLoadingSprints] = useState(true);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  // Create / Edit sprint modal state (GitHub Iterations style)
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [sprintStatus, setSprintStatus] = useState<'active' | 'planning' | 'completed'>('active');
  const [durationDays, setDurationDays] = useState<number | 'custom'>(14);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => addDaysToIso(new Date().toISOString().split('T')[0], 14));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manage all sprints modal (GitHub Milestones/Iterations drawer)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [sprintFilterTab, setSprintFilterTab] = useState<'all' | 'active' | 'planning' | 'completed'>('all');

  // Brevo Email notification modal & feedback banner
  const [notifyTeamOnCreate, setNotifyTeamOnCreate] = useState(true);
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyTargetSprint, setNotifyTargetSprint] = useState<Sprint | null>(null);
  const [notifyTitle, setNotifyTitle] = useState('');
  const [notifyMessage, setNotifyMessage] = useState('');
  const [isSendingNotify, setIsSendingNotify] = useState(false);
  const [emailToast, setEmailToast] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  // Load sprints on mount (zero dummy fallback)
  useEffect(() => {
    sprintsApi.getAll()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setSprints(res.data);
          if (res.data.length > 0) {
            const active = res.data.find((s: Sprint) => s.status === 'active') || res.data[0];
            setSelectedSprintId(active._id || active.id || '');
          } else {
            setSelectedSprintId('');
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingSprints(false));
  }, []);

  // Real-time Socket.IO listeners for Sprints creation/deletion/update
  useEffect(() => {
    const socket = getSocket();

    const handleSprintCreated = (newSprint: Sprint) => {
      const id = newSprint._id || newSprint.id || '';
      setSprints((prev) => {
        if (prev.some((s) => (s._id || s.id) === id)) return prev;
        const updatedPrev =
          newSprint.status === 'active'
            ? prev.map((s) => (s.status === 'active' ? { ...s, status: 'planning' } : s))
            : prev;
        return [newSprint, ...updatedPrev];
      });
      if (newSprint.status === 'active' || !selectedSprintId) {
        setSelectedSprintId(id);
      }
    };

    const handleSprintDeleted = ({ id }: { id: string }) => {
      setSprints((prev) => {
        const remaining = prev.filter((s) => (s._id || s.id) !== id);
        if (selectedSprintId === id) {
          setSelectedSprintId(remaining.length > 0 ? (remaining[0]._id || remaining[0].id || '') : '');
        }
        return remaining;
      });
    };

    const handleSprintUpdated = (updatedSprint: Sprint) => {
      const updId = updatedSprint._id || updatedSprint.id;
      setSprints((prev) =>
        prev.map((s) => {
          const id = s._id || s.id;
          if (id === updId) return updatedSprint;
          if (updatedSprint.status === 'active' && s.status === 'active') {
            return { ...s, status: 'planning' };
          }
          return s;
        })
      );
    };

    socket.on('sprint:created', handleSprintCreated);
    socket.on('sprint:deleted', handleSprintDeleted);
    socket.on('sprint:updated', handleSprintUpdated);

    return () => {
      socket.off('sprint:created', handleSprintCreated);
      socket.off('sprint:deleted', handleSprintDeleted);
      socket.off('sprint:updated', handleSprintUpdated);
    };
  }, [selectedSprintId]);

  const openCreateSprintModal = () => {
    const today = new Date().toISOString().split('T')[0];
    setEditingSprintId(null);
    setSprintName(`Sprint ${sprints.length + 1}`);
    setSprintGoal('');
    setSprintStatus(sprints.some((s) => s.status === 'active') ? 'planning' : 'active');
    setDurationDays(14);
    setStartDate(today);
    setEndDate(addDaysToIso(today, 14));
    setNotifyTeamOnCreate(true);
    setIsSprintModalOpen(true);
  };

  const openEditSprintModal = (sprint: Sprint) => {
    const start = sprint.startDate ? new Date(sprint.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const end = sprint.endDate ? new Date(sprint.endDate).toISOString().split('T')[0] : addDaysToIso(start, 14);
    setEditingSprintId(sprint._id || sprint.id || null);
    setSprintName(sprint.name);
    setSprintGoal(sprint.goal || '');
    setSprintStatus((sprint.status as 'active' | 'planning' | 'completed') || 'active');
    setDurationDays('custom');
    setStartDate(start);
    setEndDate(end);
    setIsSprintModalOpen(true);
  };

  const openNotifyModal = (sprint: Sprint) => {
    setNotifyTargetSprint(sprint);
    setNotifyTitle(`Sprint Update: ${sprint.name}`);
    setNotifyMessage(
      sprint.status === 'completed'
        ? ''
        : `Hi Team, please review and update your assigned tasks in "${sprint.name}"${sprint.endDate ? ` before ${formatShortDate(sprint.endDate)}` : ''}.`
    );
    setIsNotifyModalOpen(true);
  };

  const handleSendNotifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyTargetSprint) return;
    const id = notifyTargetSprint._id || notifyTargetSprint.id || '';
    if (!id) return;

    setIsSendingNotify(true);
    try {
      const res = await sprintsApi.notify(id, {
        title: notifyTitle.trim() || undefined,
        message: notifyMessage.trim() || undefined,
      });
      if (res.success) {
        setIsNotifyModalOpen(false);
        setEmailToast({
          type: res.emailSent === false ? 'warning' : 'success',
          text:
            res.emailSent === false
              ? `In-app notification sent, but Brevo email failed: ${res.emailError || 'Check email configuration.'}`
              : `${res.message || 'Sprint notification email sent'}${res.emailProvider ? ` (${res.emailProvider})` : ''}.`,
        });
        setTimeout(() => setEmailToast(null), 6000);
      } else {
        alert(res.message || 'Failed to send sprint notification');
      }
    } catch (err: any) {
      alert(`Error connecting to backend server (${API_URL}):\n${err?.message || 'Network connection failed'}`);
    } finally {
      setIsSendingNotify(false);
    }
  };

  const handleStartDateChange = (newStart: string) => {
    setStartDate(newStart);
    if (typeof durationDays === 'number') {
      setEndDate(addDaysToIso(newStart, durationDays));
    }
  };

  const handleDurationSelect = (days: number | 'custom') => {
    setDurationDays(days);
    if (typeof days === 'number') {
      setEndDate(addDaysToIso(startDate, days));
    }
  };

  const handleSaveSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingSprintId) {
        const res = await sprintsApi.update(editingSprintId, {
          name: sprintName.trim(),
          goal: sprintGoal.trim(),
          startDate,
          endDate,
          status: sprintStatus,
        });

        if (res.success && res.data) {
          const updated = res.data;
          const updId = updated._id || updated.id;
          setSprints((prev) =>
            prev.map((s) => {
              const id = s._id || s.id;
              if (id === updId) return updated;
              if (updated.status === 'active' && s.status === 'active') {
                return { ...s, status: 'planning' };
              }
              return s;
            })
          );
          if (sprintStatus === 'completed' && res.emailSent !== undefined) {
            setEmailToast({
              type: res.emailSent ? 'success' : 'warning',
              text: res.emailSent
                ? `Sprint completed! End summary email dispatched via ${res.emailProvider || 'email service'}.`
                : `Sprint completed, but summary email failed: ${res.emailError || 'Check Brevo configuration.'}`,
            });
            setTimeout(() => setEmailToast(null), 6000);
          }
          setIsSprintModalOpen(false);
        } else {
          alert(res.message || 'Failed to update sprint');
        }
      } else {
        const res = await sprintsApi.create({
          name: sprintName.trim(),
          goal: sprintGoal.trim(),
          startDate,
          endDate,
          status: sprintStatus,
          notifyTeam: notifyTeamOnCreate,
        });

        if (res.success && res.data) {
          const newSprint = res.data;
          const newId = newSprint._id || newSprint.id;
          setSprints((prev) => {
            const base =
              newSprint.status === 'active'
                ? prev.map((s) => (s.status === 'active' ? { ...s, status: 'planning' } : s))
                : prev;
            return [newSprint, ...base.filter((s) => (s._id || s.id) !== newId)];
          });
          setSelectedSprintId(newId);
          if (notifyTeamOnCreate && res.emailSent !== undefined) {
            setEmailToast({
              type: res.emailSent ? 'success' : 'warning',
              text: res.emailSent
                ? `Sprint "${newSprint.name}" created & team notified via ${res.emailProvider || 'Brevo'}.`
                : `Sprint created, but team email failed: ${res.emailError || 'Check Brevo configuration.'}`,
            });
            setTimeout(() => setEmailToast(null), 6000);
          }
          setIsSprintModalOpen(false);
        } else {
          alert(res.message || 'Failed to create sprint');
        }
      }
    } catch (err: any) {
      alert(`Error connecting to backend server (${API_URL}):\n${err?.message || 'Network connection failed'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickStatusChange = async (sprintId: string, status: 'active' | 'planning' | 'completed') => {
    try {
      const res = await sprintsApi.update(sprintId, { status });
      if (res.success && res.data) {
        const updated = res.data;
        setSprints((prev) =>
          prev.map((s) => {
            const id = s._id || s.id;
            if (id === sprintId) return updated;
            if (status === 'active' && s.status === 'active') return { ...s, status: 'planning' };
            return s;
          })
        );
        if (status === 'active') setSelectedSprintId(sprintId);
        if (status === 'completed' && res.emailSent !== undefined) {
          setEmailToast({
            type: res.emailSent ? 'success' : 'warning',
            text: res.emailSent
              ? `Sprint marked Completed! End summary email sent via ${res.emailProvider || 'Brevo'}.`
              : `Sprint marked Completed, but summary email failed: ${res.emailError || 'Check Brevo configuration.'}`,
          });
          setTimeout(() => setEmailToast(null), 6000);
        }
      } else {
        alert(res.message || 'Failed to update sprint status');
      }
    } catch (err: any) {
      alert(`Error updating sprint (${API_URL}):\n${err?.message || 'Network connection failed'}`);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm('Are you sure you want to delete this sprint and its tasks? Connected team members will see this immediately.')) {
      return;
    }

    try {
      const res = await sprintsApi.delete(sprintId);
      if (res.success) {
        const remaining = sprints.filter((s) => (s._id || s.id) !== sprintId);
        setSprints(remaining);
        if (selectedSprintId === sprintId) {
          setSelectedSprintId(remaining.length > 0 ? (remaining[0]._id || remaining[0].id || '') : '');
        }
      } else {
        alert(res.message || 'Failed to delete sprint');
      }
    } catch (err: any) {
      alert(`Error deleting sprint (${API_URL}):\n${err?.message || 'Network connection failed'}`);
    }
  };

  const currentSprint = sprints.find((s) => (s._id || s.id) === selectedSprintId) || sprints[0];

  const filteredModalSprints = useMemo(() => {
    if (sprintFilterTab === 'all') return sprints;
    return sprints.filter((s) => (s.status || 'planning') === sprintFilterTab);
  }, [sprints, sprintFilterTab]);

  const statusBadgeStyle = (status?: string) => {
    if (status === 'active') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (status === 'completed') return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
    return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
  };

  return (
    <main className="min-h-screen pb-20 bg-[#0c0e17]">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-1.5">
              <h2 className="text-2xl font-bold text-white">Kanban Board</h2>

              {sprints.length > 0 && currentSprint && (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      currentSprint.status === 'active'
                        ? 'bg-emerald-400 animate-pulse'
                        : currentSprint.status === 'completed'
                        ? 'bg-violet-400'
                        : 'bg-amber-400'
                    }`}
                  />
                  <select
                    value={selectedSprintId}
                    onChange={(e) => setSelectedSprintId(e.target.value)}
                    className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                  >
                    {sprints.map((s) => {
                      const id = s._id || s.id || '';
                      return (
                        <option key={id} value={id} className="bg-[#181a26] text-white">
                          {s.name} ({s.status || 'active'})
                        </option>
                      );
                    })}
                  </select>

                  <button
                    onClick={() => openEditSprintModal(currentSprint)}
                    title="Edit Sprint"
                    className="text-gray-400 hover:text-indigo-400 p-0.5 ml-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteSprint(currentSprint._id || currentSprint.id || '')}
                    title="Delete Sprint"
                    className="text-gray-400 hover:text-red-400 p-0.5 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[15px]">delete</span>
                  </button>
                </div>
              )}

              {currentSprint && (
                <div className="flex items-center gap-2 text-[11px] text-gray-400 bg-white/[0.03] border border-white/5 rounded-lg px-2.5 py-1">
                  <span className="material-symbols-outlined text-[14px] text-indigo-400">calendar_today</span>
                  <span>
                    {formatShortDate(currentSprint.startDate)} → {formatShortDate(currentSprint.endDate)}
                  </span>
                  {getDaysRemainingLabel(currentSprint.endDate, currentSprint.status) && (
                    <span className="text-indigo-300 font-semibold">
                      · {getDaysRemainingLabel(currentSprint.endDate, currentSprint.status)}
                    </span>
                  )}
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400">
              {currentSprint?.goal
                ? currentSprint.goal
                : sprints.length === 0 && !loadingSprints
                ? 'Create your first sprint iteration to organize work just like GitHub Projects.'
                : 'Drag and drop tasks between columns. Real-time WebSockets sync across all tabs.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">search</span>
              <input
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 transition-all w-44 sm:w-52"
                placeholder="Search tasks..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Manage All Sprints Button */}
            {sprints.length > 0 && (
              <button
                onClick={() => setIsManageModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-xl text-xs font-semibold transition-all"
                title="View and manage all sprint iterations"
              >
                <span className="material-symbols-outlined text-[17px]">view_timeline</span>
                <span>Iterations ({sprints.length})</span>
              </button>
            )}

            {/* Notify Team via Brevo Email */}
            {currentSprint && (
              <button
                onClick={() => openNotifyModal(currentSprint)}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold transition-all"
                title="Send Sprint Notification / Summary Email via Brevo"
              >
                <span className="material-symbols-outlined text-[17px]">mail</span>
                <span>Notify Team</span>
              </button>
            )}

            {/* New Sprint Button */}
            <button
              onClick={openCreateSprintModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-300 rounded-xl text-xs font-semibold transition-all shadow-sm"
              title="Create new Sprint Iteration in Real-Time"
            >
              <span className="material-symbols-outlined text-[18px]">timer</span>
              <span>New Sprint</span>
            </button>

            {/* New Column */}
            <button
              onClick={() => document.getElementById('new-column-btn')?.click()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl text-xs font-semibold hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Column</span>
            </button>
          </div>
        </div>

        {emailToast && (
          <div
            className={`mt-3 px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
              emailToast.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">
                {emailToast.type === 'success' ? 'mark_email_read' : 'warning'}
              </span>
              <span>{emailToast.text}</span>
            </div>
            <button onClick={() => setEmailToast(null)} className="text-gray-400 hover:text-white">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}
      </div>

      {/* Empty State Banner when user has 0 sprints */}
      {!loadingSprints && sprints.length === 0 ? (
        <div className="max-w-7xl mx-auto px-6 mt-6">
          <div className="bg-[#161824] border border-indigo-500/25 rounded-2xl p-10 text-center relative overflow-hidden">
            <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-indigo-600/10 blur-3xl" />
            <div className="relative">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <span className="material-symbols-outlined text-[30px]">sprint</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Sprints Created Yet</h3>
              <p className="text-sm text-gray-400 max-w-lg mx-auto mb-6">
                Create your first time-boxed Sprint Iteration (1 week, 2 weeks, or custom dates) just like GitHub Projects to start planning tasks, assigning employees, and tracking real-time progress.
              </p>
              <button
                onClick={openCreateSprintModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-500/25"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                Create First Sprint
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Board searchQuery={searchQuery} sprintId={selectedSprintId || undefined} />
      )}

      {/* ── GitHub-Style Create / Edit Sprint Modal ── */}
      {isSprintModalOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSprintModalOpen(false);
          }}
        >
          <div className="w-full max-w-lg bg-[#1d1f29] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px]">timer</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingSprintId ? 'Edit Sprint Iteration' : 'New Sprint Iteration'}
                  </h3>
                  <p className="text-[11px] text-gray-400">GitHub-style time-boxed sprint with real-time sync</p>
                </div>
              </div>
              <button onClick={() => setIsSprintModalOpen(false)} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveSprint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Sprint Title *
                </label>
                <input
                  type="text"
                  required
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  placeholder="e.g. Sprint 1 - Authentication & Core"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              {/* GitHub Iterations-style Duration Presets */}
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Iteration Duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => handleDurationSelect(preset.days)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        durationDays === preset.days
                          ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm'
                          : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleDurationSelect('custom')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      durationDays === 'custom'
                        ? 'bg-indigo-500 text-white border-indigo-400 shadow-sm'
                        : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    Custom
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setDurationDays('custom');
                      setEndDate(e.target.value);
                    }}
                    className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Sprint Goal / Milestone Description
                </label>
                <textarea
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  rows={2}
                  placeholder="What does the team aim to ship in this iteration?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={sprintStatus}
                  onChange={(e) => setSprintStatus(e.target.value as 'active' | 'planning' | 'completed')}
                  className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/60 cursor-pointer"
                >
                  <option value="active">Active (Current live iteration)</option>
                  <option value="planning">Upcoming / Planning</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {!editingSprintId && (
                <label className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 cursor-pointer hover:bg-white/[0.06] transition">
                  <input
                    type="checkbox"
                    checked={notifyTeamOnCreate}
                    onChange={(e) => setNotifyTeamOnCreate(e.target.checked)}
                    className="rounded border-white/20 bg-[#181a26] text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-gray-300">
                    Notify all team members via Brevo email when sprint starts
                  </span>
                </label>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSprintModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Saving...' : editingSprintId ? 'Save Sprint Changes' : 'Create Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── GitHub Iterations Management Modal ── */}
      {isManageModalOpen && (
        <div
          className="fixed inset-0 z-[290] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsManageModalOpen(false);
          }}
        >
          <div className="w-full max-w-2xl bg-[#1d1f29] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-400">view_timeline</span>
                  Sprint Iterations
                </h3>
                <p className="text-xs text-gray-400">Switch, start, complete, edit, or remove sprints in real-time</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setIsManageModalOpen(false);
                    openCreateSprintModal();
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  New Sprint
                </button>
                <button onClick={() => setIsManageModalOpen(false)} className="text-gray-400 hover:text-white p-1">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-4">
              {(['all', 'active', 'planning', 'completed'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSprintFilterTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    sprintFilterTab === tab
                      ? 'bg-indigo-500 text-white'
                      : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {tab === 'planning' ? 'Upcoming' : tab}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto space-y-2.5 pr-1 flex-1">
              {filteredModalSprints.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-8">No sprints in this category.</p>
              ) : (
                filteredModalSprints.map((s) => {
                  const id = s._id || s.id || '';
                  const isSelected = id === selectedSprintId;
                  return (
                    <div
                      key={id}
                      className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500/35'
                          : 'bg-white/[0.03] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white truncate">{s.name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${statusBadgeStyle(s.status)}`}>
                            {s.status || 'planning'}
                          </span>
                        </div>
                        {s.goal && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{s.goal}</p>}
                        <p className="text-[11px] text-gray-500 mt-1">
                          {formatShortDate(s.startDate)} → {formatShortDate(s.endDate)}
                          {getDaysRemainingLabel(s.endDate, s.status) ? ` · ${getDaysRemainingLabel(s.endDate, s.status)}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedSprintId(id);
                            setIsManageModalOpen(false);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-200 transition"
                        >
                          Open Board
                        </button>
                        {s.status !== 'active' && (
                          <button
                            onClick={() => handleQuickStatusChange(id, 'active')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-semibold transition"
                          >
                            Set Active
                          </button>
                        )}
                        {s.status !== 'completed' && (
                          <button
                            onClick={() => handleQuickStatusChange(id, 'completed')}
                            className="px-2.5 py-1.5 rounded-lg bg-violet-500/15 hover:bg-violet-500/25 text-violet-400 text-xs font-semibold transition"
                          >
                            Complete
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setIsManageModalOpen(false);
                            openNotifyModal(s);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                          title="Notify Team via Email"
                        >
                          <span className="material-symbols-outlined text-[16px]">mail</span>
                        </button>
                        <button
                          onClick={() => {
                            setIsManageModalOpen(false);
                            openEditSprintModal(s);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-400 hover:bg-white/5 transition"
                          title="Edit"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteSprint(id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition"
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Notify Team via Brevo Modal ── */}
      {isNotifyModalOpen && notifyTargetSprint && (
        <div
          className="fixed inset-0 z-[310] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsNotifyModalOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-[#1d1f29] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">mail</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Notify Team</h3>
                  <p className="text-[11px] text-gray-400">{notifyTargetSprint.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsNotifyModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleSendNotifyEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Email Subject / Title
                </label>
                <input
                  type="text"
                  value={notifyTitle}
                  onChange={(e) => setNotifyTitle(e.target.value)}
                  placeholder={`Sprint Update: ${notifyTargetSprint.name}`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Message for Team Members
                </label>
                <textarea
                  rows={3}
                  value={notifyMessage}
                  onChange={(e) => setNotifyMessage(e.target.value)}
                  placeholder={
                    notifyTargetSprint.status === 'completed'
                      ? 'Leave blank to send automatic Sprint End completion summary stats, or type a custom note.'
                      : 'Enter reminder or status update...'
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/60 resize-none"
                />
              </div>

              <p className="text-[11px] text-gray-400">
                Dispatched via Brevo email + real-time in-app notification to all team members.
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNotifyModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingNotify}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-emerald-500/20"
                >
                  {isSendingNotify ? 'Sending...' : 'Send Email Notification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
