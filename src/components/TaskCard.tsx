'use client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Task } from '../data/boardData';
import { EMPLOYEES } from '../data/employees';

export function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
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
    opacity: isDragging ? 0.4 : 1,
  };

  const priorityConfig = {
    High: { bar: '#ef4444', badge: 'bg-red-500/15 text-red-400 border-red-500/20' },
    Medium: { bar: '#f59e0b', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
    Low: { bar: '#10b981', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  };

  const config = priorityConfig[task.priority as keyof typeof priorityConfig] || priorityConfig.Medium;
  const employee = EMPLOYEES.find(e => e.id === task.assigneeId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group bg-[#282933] border border-white/5 hover:border-indigo-500/30 rounded-xl p-4 relative cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5"
      onClick={onClick}
    >
      {/* Priority bar */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
        style={{ backgroundColor: config.bar }}
      />

      {/* Header */}
      <div className="flex justify-between items-start mb-3 pl-3">
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${config.badge}`}>
          {task.priority}
        </span>
        <div className="flex items-center gap-1">
          {task.category && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/15">
              {task.category}
            </span>
          )}
          <span
            {...attributes}
            {...listeners}
            className="material-symbols-outlined text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-[18px] ml-1"
          >
            drag_indicator
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-200 mb-3 pl-3 line-clamp-2">{task.title}</h3>

      {/* Description preview */}
      {task.description && (
        <p className="text-xs text-gray-500 pl-3 mb-3 line-clamp-1">{task.description}</p>
      )}

      {/* Footer */}
      <div className="flex justify-between items-center pl-3">
        {/* Assignee */}
        {employee ? (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
              style={{ backgroundColor: employee.avatarColor + '33', color: employee.avatarColor }}
            >
              {employee.initials}
            </div>
            <span className="text-xs text-gray-500 truncate max-w-[80px]">{employee.name.split(' ')[0]}</span>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/10" />
        )}

        <div className="flex items-center gap-2">
          {task.dueDate && (
            <div className="flex items-center gap-1 text-gray-500">
              <span className="material-symbols-outlined text-[12px]">calendar_today</span>
              <span className="text-[10px]">{task.dueDate.slice(5)}</span>
            </div>
          )}
          {task.storyPoints && (
            <div className="flex items-center gap-1 text-gray-500">
              <span className="material-symbols-outlined text-[12px]">auto_stories</span>
              <span className="text-[10px]">{task.storyPoints}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
