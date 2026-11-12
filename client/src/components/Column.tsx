'use client';
import { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import type { Task } from '../data/boardData';
import type { Employee } from '../data/employees';

interface ColumnProps {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
  employees?: Employee[];
  onAddTask: (columnId: string) => void;
  onTaskClick?: (task: Task) => void;
  onTitleChange: (newTitle: string) => void;
  onDeleteColumn: () => void;
}

export function Column({
  id,
  title,
  color,
  tasks,
  employees = [],
  onAddTask,
  onTaskClick,
  onTitleChange,
  onDeleteColumn,
}: ColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { setNodeRef } = useDroppable({ id, data: { type: 'Column', title } });

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle.trim() !== title) {
      onTitleChange(editTitle.trim());
    } else {
      setEditTitle(title);
    }
    setIsEditing(false);
  };

  return (
    <div className="kanban-column snap-start flex flex-col gap-3 shrink-0 h-full max-h-full bg-[#151722]/80 border border-white/[0.06] rounded-2xl p-3">
      {/* Column Header */}
      <div className="flex items-center justify-between px-1 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Color Dot */}
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />

          {isEditing ? (
            <input
              ref={inputRef}
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') { setEditTitle(title); setIsEditing(false); }
              }}
              className="flex-1 min-w-0 bg-white/10 border border-indigo-500/40 rounded-lg px-2 py-1 text-sm font-bold text-white outline-none"
            />
          ) : (
            <h2 className="font-bold text-white text-sm truncate">{title}</h2>
          )}

          <span className="bg-white/10 text-gray-400 px-2 py-0.5 rounded-full text-xs font-semibold shrink-0">
            {tasks.length}
          </span>
        </div>

        {/* Column Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(v => !v)}
            className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
          >
            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 z-50 bg-[#282933] border border-white/10 rounded-xl shadow-xl overflow-hidden w-44">
              <button
                onClick={() => { setIsEditing(true); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Rename Column
              </button>
              <button
                onClick={() => { onAddTask(id); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Add Task
              </button>
              <div className="border-t border-white/5" />
              <button
                onClick={() => { onDeleteColumn(); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                Delete Column
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tasks Area */}
      <div
        ref={setNodeRef}
        className="flex flex-col gap-2 min-h-[120px] flex-1 overflow-y-auto custom-scrollbar rounded-xl transition-colors pb-2"
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} employees={employees} onClick={() => onTaskClick?.(task)} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center rounded-xl border-2 border-dashed border-white/5 text-gray-600 text-sm min-h-[100px]">
            Drop tasks here
          </div>
        )}
      </div>

      {/* Add Task Button */}
      <button
        onClick={() => onAddTask(id)}
        className="flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-white/10 rounded-xl text-gray-500 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all shrink-0 text-sm"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Add Task
      </button>
    </div>
  );
}
