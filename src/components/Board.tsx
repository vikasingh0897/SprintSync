'use client';
import { useState } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Column as ColumnComponent } from './Column';
import { TaskCard } from './TaskCard';
import { NewTaskModal } from './NewTaskModal';
import { INITIAL_BOARD_DATA } from '../data/boardData';
import type { Board as BoardType, Task, Column as ColumnType } from '../data/boardData';
import { EMPLOYEES } from '../data/employees';

export type { Task };

export function Board({ searchQuery = '' }: { searchQuery?: string }) {
  const [boardData, setBoardData] = useState<BoardType>(INITIAL_BOARD_DATA);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [initialColumnForNewTask, setInitialColumnForNewTask] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: any) => {
    const task = findTask(event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    if (isOverColumn || isOverTask) {
      setBoardData(prev => {
        const activeColumnIndex = prev.columns.findIndex(c => c.tasks.some(t => t.id === activeId));
        const overColumnIndex = isOverColumn
          ? prev.columns.findIndex(c => c.id === overId)
          : prev.columns.findIndex(c => c.tasks.some(t => t.id === overId));

        if (activeColumnIndex === -1 || overColumnIndex === -1) return prev;
        if (activeColumnIndex === overColumnIndex) return prev;

        const newData = JSON.parse(JSON.stringify(prev));
        const activeTaskIndex = newData.columns[activeColumnIndex].tasks.findIndex((t: any) => t.id === activeId);
        const taskObj = newData.columns[activeColumnIndex].tasks.splice(activeTaskIndex, 1)[0];
        taskObj.columnId = newData.columns[overColumnIndex].id;

        if (isOverTask) {
          const overTaskIndex = newData.columns[overColumnIndex].tasks.findIndex((t: any) => t.id === overId);
          newData.columns[overColumnIndex].tasks.splice(overTaskIndex >= 0 ? overTaskIndex : newData.columns[overColumnIndex].tasks.length, 0, taskObj);
        } else {
          newData.columns[overColumnIndex].tasks.push(taskObj);
        }
        return newData;
      });
    }
  };

  const handleDragEnd = (event: any) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    setBoardData(prev => {
      const activeColumnIndex = prev.columns.findIndex(c => c.tasks.some(t => t.id === activeId));
      const overColumnIndex = isOverColumn
        ? prev.columns.findIndex(c => c.id === overId)
        : prev.columns.findIndex(c => c.tasks.some(t => t.id === overId));

      if (activeColumnIndex === -1 || overColumnIndex === -1) return prev;

      const newData = JSON.parse(JSON.stringify(prev));
      const activeTaskIndex = newData.columns[activeColumnIndex].tasks.findIndex((t: any) => t.id === activeId);

      if (activeColumnIndex === overColumnIndex && isOverTask) {
        const overTaskIndex = newData.columns[overColumnIndex].tasks.findIndex((t: any) => t.id === overId);
        const item = newData.columns[activeColumnIndex].tasks.splice(activeTaskIndex, 1)[0];
        newData.columns[activeColumnIndex].tasks.splice(overTaskIndex, 0, item);
      }
      return newData;
    });
  };

  const findTask = (taskId: string): Task | null => {
    for (const col of boardData.columns) {
      const task = col.tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return null;
  };

  const handleTaskAdded = (newTask: Task) => {
    setBoardData((prev: BoardType) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const col = newData.columns.find((c: ColumnType) => c.id === newTask.columnId);
      if (col) col.tasks.push(newTask);
      return newData;
    });
    setIsNewTaskModalOpen(false);
  };

  const updateSelectedTask = (field: string, value: string) => {
    if (!selectedTask) return;
    const updated = { ...selectedTask, [field]: value };
    setSelectedTask(updated);

    setBoardData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      for (const col of newData.columns) {
        col.tasks = col.tasks.filter((t: Task) => t.id !== selectedTask.id);
      }
      const targetCol = newData.columns.find((c: ColumnType) => c.id === updated.columnId);
      if (targetCol) targetCol.tasks.push(updated);
      return newData;
    });
  };

  const deleteSelectedTask = () => {
    if (!selectedTask) return;
    if (!confirm('Are you sure you want to delete this task?')) return;

    setBoardData(prev => {
      const newData = JSON.parse(JSON.stringify(prev));
      for (const col of newData.columns) {
        col.tasks = col.tasks.filter((t: Task) => t.id !== selectedTask.id);
      }
      return newData;
    });
    setSelectedTask(null);
  };

  const updateColumnTitle = (colId: string, newTitle: string) => {
    setBoardData(prev => ({
      ...prev,
      columns: prev.columns.map(c => c.id === colId ? { ...c, title: newTitle } : c)
    }));
  };

  const addColumn = () => {
    const title = prompt('Enter column title:');
    if (!title?.trim()) return;
    const newCol: ColumnType = {
      id: `col-${Date.now()}`,
      title,
      color: '#6366f1',
      tasks: [],
    };
    setBoardData(prev => ({ ...prev, columns: [...prev.columns, newCol] }));
  };

  const deleteColumn = (colId: string) => {
    if (!confirm('Delete this column and all its tasks?')) return;
    setBoardData(prev => ({ ...prev, columns: prev.columns.filter(c => c.id !== colId) }));
  };

  const priorityColors: Record<string, string> = {
    High: 'bg-red-500/15 text-red-400 border-red-500/20',
    Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <section className="max-w-full px-6 overflow-x-auto custom-scrollbar flex items-start gap-5 pb-8 h-[calc(100vh-200px)] mt-4">
          {boardData.columns.map((col) => {
            const filteredTasks = col.tasks.filter(t =>
              t.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return (
              <ColumnComponent
                key={col.id}
                id={col.id}
                title={col.title}
                color={col.color}
                tasks={filteredTasks}
                onAddTask={(colId) => {
                  setInitialColumnForNewTask(colId);
                  setIsNewTaskModalOpen(true);
                }}
                onTaskClick={(task) => setSelectedTask(task)}
                onTitleChange={(newTitle) => updateColumnTitle(col.id, newTitle)}
                onDeleteColumn={() => deleteColumn(col.id)}
              />
            );
          })}

          {/* Add Column */}
          <div className="kanban-column flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/10 rounded-2xl opacity-40 hover:opacity-70 transition-all shrink-0 cursor-pointer" onClick={addColumn}>
            <button id="new-column-btn" className="flex flex-col items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-[32px]">add_circle</span>
              <span className="text-sm font-medium">New Column</span>
            </button>
          </div>
        </section>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>

      {isNewTaskModalOpen && (
        <NewTaskModal
          columns={boardData.columns}
          initialColumnId={initialColumnForNewTask}
          onClose={() => setIsNewTaskModalOpen(false)}
          onSuccess={handleTaskAdded}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setSelectedTask(null); }}>
          <div className="w-full max-w-xl bg-[#1d1f29] border-l border-white/5 h-full overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#1d1f29]/90 backdrop-blur-md z-10 border-b border-white/5 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <select
                  value={selectedTask.priority}
                  onChange={(e) => updateSelectedTask('priority', e.target.value)}
                  className={`px-3 py-1 rounded-full text-xs font-bold outline-none appearance-none cursor-pointer border ${priorityColors[selectedTask.priority] || 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'}`}
                >
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
                <span className="text-gray-500 text-xs font-mono">TASK-{selectedTask.id.substring(0, 4).toUpperCase()}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={deleteSelectedTask} className="material-symbols-outlined text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors" title="Delete">delete</button>
                <button onClick={() => setSelectedTask(null)} className="material-symbols-outlined text-gray-400 hover:text-white hover:bg-white/5 p-2 rounded-lg transition-colors">close</button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex-1">
              <input
                type="text"
                value={selectedTask.title}
                onChange={(e) => updateSelectedTask('title', e.target.value)}
                className="w-full text-2xl font-bold text-white mb-5 bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500/30 rounded-lg p-1 -ml-1"
              />

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Status</span>
                  <div className="relative">
                    <select
                      value={selectedTask.columnId}
                      onChange={(e) => updateSelectedTask('columnId', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-sm text-white outline-none appearance-none cursor-pointer transition-all"
                    >
                      {boardData.columns.map(col => (
                        <option key={col.id} value={col.id}>{col.title}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[16px]">expand_more</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Assignee</span>
                  <div className="relative">
                    <select
                      value={selectedTask.assigneeId || ''}
                      onChange={(e) => {
                        const emp = EMPLOYEES.find(em => em.id === e.target.value);
                        updateSelectedTask('assigneeId', e.target.value);
                        updateSelectedTask('assignee', emp?.name || '');
                      }}
                      className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-sm text-white outline-none appearance-none cursor-pointer transition-all"
                    >
                      <option value="">Unassigned</option>
                      {EMPLOYEES.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[16px]">expand_more</span>
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Category</span>
                  <input
                    type="text"
                    value={selectedTask.category}
                    onChange={(e) => updateSelectedTask('category', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-sm text-white outline-none transition-all"
                  />
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">Due Date</span>
                  <input
                    type="date"
                    value={selectedTask.dueDate || ''}
                    onChange={(e) => updateSelectedTask('dueDate', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-sm text-white outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white mb-3">Description</h3>
                <textarea
                  value={selectedTask.description || ''}
                  onChange={(e) => updateSelectedTask('description', e.target.value)}
                  placeholder="Add a detailed description..."
                  rows={6}
                  className="w-full bg-white/3 hover:bg-white/5 focus:bg-white/5 border border-white/5 focus:border-indigo-500/30 text-gray-300 text-sm p-4 rounded-xl outline-none transition-all resize-y"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
