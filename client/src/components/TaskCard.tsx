'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../data/boardData';
import type { Employee } from '../data/employees';

export function TaskCard({
  task,
  employees = [],
  onClick,
}: {
  task: Task;
  employees?: Employee[];
  onClick?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: 'Task', task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
  };

  const priorityConfig = {
    High: { bar: '#ef4444', badge: 'bg-red-500/15 text-red-400 border-red-500/25' },
    Medium: { bar: '#f59e0b', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    Low: { bar: '#10b981', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
  };

  const config = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.Medium;
  const employee = employees.find((e) => e.id === task.assigneeId || (task.assignee && e.name === task.assignee));
  const fallbackName = task.assignee || '';
  const fallbackInitials = fallbackName
    ? fallbackName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group bg-[#242632] border border-white/[0.06] hover:border-indigo-500/35 rounded-xl p-3.5 sm:p-4 relative cursor-pointer transition-all duration-200 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-0.5"
      onClick={onClick}
    >
      {/* Priority bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
        style={{ backgroundColor: config.bar }}
      />

      {/* Header */}
      <div className="flex justify-between items-start gap-2 mb-2.5 pl-2.5">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.badge}`}>
          {task.priority}
        </span>
        <div className="flex items-center gap-1.5">
          {task.category && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              {task.category}
            </span>
          )}
          <span
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="material-symbols-outlined text-gray-500 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-[18px] touch-none"
            title="Drag task"
          >
            drag_indicator
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-100 mb-2 pl-2.5 line-clamp-2 leading-snug">
        {task.title}
      </h3>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-400 pl-2.5 mb-3 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center gap-2 pl-2.5 pt-2 border-t border-white/[0.05]">
        {/* Assignee */}
        {employee ? (
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ backgroundColor: employee.avatarColor + '33', color: employee.avatarColor }}
            >
              {employee.initials}
            </div>
            <span className="text-xs text-gray-400 truncate max-w-[100px]">{employee.name.split(' ')[0]}</span>
          </div>
        ) : fallbackName ? (
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0">
              {fallbackInitials}
            </div>
            <span className="text-xs text-gray-400 truncate max-w-[100px]">{fallbackName.split(' ')[0]}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className="w-5 h-5 rounded-lg bg-white/5 border border-white/10 inline-flex items-center justify-center">
              <span className="material-symbols-outlined text-[12px]">person</span>
            </span>
            <span>Unassigned</span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {task.dueDate && (
            <div className="flex items-center gap-1 text-gray-400 bg-white/[0.03] px-1.5 py-0.5 rounded-md">
              <span className="material-symbols-outlined text-[12px]">calendar_today</span>
              <span className="text-[10px] font-mono">{task.dueDate.slice(5)}</span>
            </div>
          )}
          {task.storyPoints && (
            <div className="flex items-center gap-1 text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded-md">
              <span className="material-symbols-outlined text-[12px]">auto_stories</span>
              <span className="text-[10px] font-semibold">{task.storyPoints}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
