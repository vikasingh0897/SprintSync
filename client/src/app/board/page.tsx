'use client';

import { useState, useEffect } from 'react';
import { Board } from '../../components/Board';
import { sprintsApi } from '../../lib/api';
import { getSocket } from '../../lib/socket';

interface Sprint {
  _id?: string;
  id?: string;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export default function BoardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [sprints, setSprints] = useState<Sprint[]>([
    {
      id: 'sprint-001',
      name: 'Sprint 14 - Foundation & Core',
      goal: 'Complete real-time sprint & employee collaboration flows with email alerting',
      status: 'active',
    },
  ]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>('sprint-001');

  // Create sprint modal state
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [sprintName, setSprintName] = useState('');
  const [sprintGoal, setSprintGoal] = useState('');
  const [sprintStatus, setSprintStatus] = useState('active');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load sprints on mount
  useEffect(() => {
    sprintsApi.getAll()
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setSprints(res.data);
          const active = res.data.find((s: any) => s.status === 'active') || res.data[0];
          setSelectedSprintId(active._id || active.id);
        }
      })
      .catch(() => {});
  }, []);

  // Real-time Socket.IO listeners for Sprints creation/deletion/update
  useEffect(() => {
    const socket = getSocket();

    const handleSprintCreated = (newSprint: Sprint) => {
      setSprints((prev) => {
        const id = newSprint._id || newSprint.id;
        if (prev.some((s) => (s._id || s.id) === id)) return prev;
        return [newSprint, ...prev];
      });
      if (newSprint.status === 'active') {
        setSelectedSprintId(newSprint._id || newSprint.id || '');
      }
    };

    const handleSprintDeleted = ({ id }: { id: string }) => {
      setSprints((prev) => {
        const remaining = prev.filter((s) => (s._id || s.id) !== id);
        if (selectedSprintId === id && remaining.length > 0) {
          setSelectedSprintId(remaining[0]._id || remaining[0].id || '');
        }
        return remaining;
      });
    };

    const handleSprintUpdated = (updatedSprint: Sprint) => {
      setSprints((prev) =>
        prev.map((s) => ((s._id || s.id) === (updatedSprint._id || updatedSprint.id) ? updatedSprint : s))
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

  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprintName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await sprintsApi.create({
        name: sprintName.trim(),
        goal: sprintGoal.trim(),
        startDate,
        endDate,
        status: sprintStatus,
      });

      if (res.success && res.data) {
        const newSprint = res.data;
        const newId = newSprint._id || newSprint.id;
        setSprints((prev) => [newSprint, ...prev.filter((s) => (s._id || s.id) !== newId)]);
        setSelectedSprintId(newId);
        setSprintName('');
        setSprintGoal('');
        setIsSprintModalOpen(false);
      } else {
        alert(res.message || 'Failed to create sprint');
      }
    } catch {
      alert('Error connecting to backend server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSprint = async (sprintId: string) => {
    if (!confirm('Are you sure you want to delete this sprint in real-time? All connected team members will see this change immediately.')) {
      return;
    }

    try {
      const res = await sprintsApi.delete(sprintId);
      if (res.success) {
        setSprints((prev) => prev.filter((s) => (s._id || s.id) !== sprintId));
        const remaining = sprints.filter((s) => (s._id || s.id) !== sprintId);
        if (remaining.length > 0) {
          setSelectedSprintId(remaining[0]._id || remaining[0].id || '');
        }
      }
    } catch {
      alert('Error deleting sprint');
    }
  };

  const currentSprint = sprints.find((s) => (s._id || s.id) === selectedSprintId) || sprints[0];

  return (
    <main className="min-h-screen pb-20 bg-[#0c0e17]">
      {/* Page Header */}
      <div className="max-w-7xl mx-auto px-6 pt-6 pb-2">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-white">Kanban Board</h2>
              {/* Sprint selector badge */}
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
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

                {/* Delete Sprint button */}
                {sprints.length > 1 && (
                  <button
                    onClick={() => handleDeleteSprint(selectedSprintId)}
                    title="Delete Sprint in Real-Time"
                    className="text-gray-500 hover:text-red-400 p-0.5 ml-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-400">
              {currentSprint?.goal ? currentSprint.goal : 'Drag and drop tasks between columns. Real-time WebSockets sync across all tabs.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">search</span>
              <input
                className="bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/40 transition-all w-48 sm:w-56"
                placeholder="Search tasks..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* New Sprint Button */}
            <button
              onClick={() => setIsSprintModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold transition-all shadow-sm"
              title="Create new Sprint in Real-Time"
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
      </div>

      <Board searchQuery={searchQuery} sprintId={selectedSprintId} />

      {/* ── Create Sprint Modal ── */}
      {isSprintModalOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsSprintModalOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-[#1d1f29] border border-white/10 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">timer</span>
                </div>
                <h3 className="text-base font-bold text-white">Create New Sprint (Real-Time)</h3>
              </div>
              <button onClick={() => setIsSprintModalOpen(false)} className="text-gray-400 hover:text-white">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Sprint Name *
                </label>
                <input
                  type="text"
                  required
                  value={sprintName}
                  onChange={(e) => setSprintName(e.target.value)}
                  placeholder="e.g. Sprint 15 - Performance & Analytics"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Sprint Goal
                </label>
                <textarea
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  rows={2}
                  placeholder="What is the core target of this sprint?"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/60 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
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
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Sprint Status
                </label>
                <select
                  value={sprintStatus}
                  onChange={(e) => setSprintStatus(e.target.value)}
                  className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500/60 cursor-pointer"
                >
                  <option value="active">Active (Set as current live sprint)</option>
                  <option value="planning">Planning (Backlog/Future sprint)</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

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
                  className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-1.5"
                >
                  {isSubmitting ? 'Creating...' : 'Launch Sprint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
