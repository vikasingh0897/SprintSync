'use client';

import { useState, useEffect } from 'react';
import { TASK_CATEGORIES } from '../data/boardData';
import type { Task, Column } from '../data/boardData';
import type { Employee } from '../data/employees';
import { employeesApi } from '../lib/api';

interface NewTaskModalProps {
  onClose: () => void;
  onSuccess: (task: Task) => void;
  initialColumnId?: string;
  columns: Column[];
  employees?: Employee[];
}

export function NewTaskModal({
  onClose,
  onSuccess,
  initialColumnId = '',
  columns = [],
  employees: passedEmployees,
}: NewTaskModalProps) {
  const [employees, setEmployees] = useState<Employee[]>(passedEmployees || []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [columnId, setColumnId] = useState(initialColumnId || columns[0]?.id || '');
  const [assigneeId, setAssigneeId] = useState('');
  const [category, setCategory] = useState(TASK_CATEGORIES[0]);
  const [dueDate, setDueDate] = useState('');
  const [storyPoints, setStoryPoints] = useState(3);

  useEffect(() => {
    if (!passedEmployees || passedEmployees.length === 0) {
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
    }
  }, [passedEmployees]);

  const handleSave = () => {
    if (!title.trim()) return alert('Title is required');
    const employee = employees.find((e) => e.id === assigneeId);
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: title.trim(),
      description: description || null,
      priority,
      assignee: employee?.name || null,
      assigneeId: assigneeId || null,
      order: 0,
      columnId,
      category,
      dueDate: dueDate || undefined,
      storyPoints,
    };
    onSuccess(newTask);
    onClose();
  };

  const selectedEmployee = employees.find((e) => e.id === assigneeId);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg bg-[#181a26] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/60 animate-in zoom-in-95 duration-200 max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-indigo-400 text-[18px]">add_task</span>
            </div>
            <h3 className="text-lg font-bold text-white">New Task</h3>
          </div>
          <button
            onClick={onClose}
            className="material-symbols-outlined text-gray-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-all"
          >
            close
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Real-time Email Assignment Notice */}
          {selectedEmployee && (
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2.5 text-xs text-indigo-300 animate-in fade-in duration-200">
              <span className="material-symbols-outlined text-indigo-400 text-[18px] shrink-0">forward_to_inbox</span>
              <span>
                Real-time email alert will be sent to <strong>{selectedEmployee.email}</strong> upon creation.
              </span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Redesign Dashboard"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about this task..."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'Low' | 'Medium' | 'High')}
                className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                <option value="Low">🟢 Low</option>
                <option value="Medium">🟡 Medium</option>
                <option value="High">🔴 High</option>
              </select>
            </div>

            {/* Column */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Column</label>
              <select
                value={columnId}
                onChange={(e) => setColumnId(e.target.value)}
                className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>{col.title}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Assignee</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                <option value="">Unassigned</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                {TASK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
              />
            </div>

            {/* Story Points */}
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Story Points</label>
              <select
                value={storyPoints}
                onChange={(e) => setStoryPoints(Number(e.target.value))}
                className="w-full bg-[#181a26] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                {[1, 2, 3, 5, 8, 13, 21].map((pt) => (
                  <option key={pt} value={pt}>{pt} pts</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white/2 border-t border-white/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:text-white border border-white/10 hover:border-white/20 rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 rounded-xl hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
          >
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}
