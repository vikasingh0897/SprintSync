'use client';

import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Column as ColumnComponent } from './Column';
import { TaskCard } from './TaskCard';
import { NewTaskModal } from './NewTaskModal';
import { INITIAL_BOARD_DATA } from '../data/boardData';
import type { Board as BoardType, Task, Column as ColumnType } from '../data/boardData';
import type { Employee } from '../data/employees';
import { boardApi, tasksApi, employeesApi } from '../lib/api';
import { getSocket } from '../lib/socket';

export type { Task };

interface BoardProps {
  searchQuery?: string;
  sprintId?: string;
}

export function Board({ searchQuery = '', sprintId }: BoardProps) {
  const [boardData, setBoardData] = useState<BoardType>(INITIAL_BOARD_DATA);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [initialColumnForNewTask, setInitialColumnForNewTask] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load board and employees from backend
  useEffect(() => {
    boardApi.getBoard(sprintId)
      .then((res) => {
        if (res.success && res.data?.columns?.length > 0) {
          setBoardData(res.data);
        }
      })
      .catch(() => {});

    employeesApi.getAll()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
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
  }, [sprintId]);

  // Real-time socket listeners for tasks and columns
  useEffect(() => {
    const socket = getSocket();

    const handleTaskCreated = (newTask: any) => {
      if (sprintId && newTask.sprintId && String(newTask.sprintId) !== String(sprintId)) {
        return;
      }
      const task: Task = {
        id: newTask._id || newTask.id,
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        assignee: newTask.assignee,
        assigneeId: newTask.assigneeId,
        order: newTask.order || 0,
        columnId: newTask.columnId,
        category: newTask.category,
        dueDate: newTask.dueDate,
        storyPoints: newTask.storyPoints,
      };

      setBoardData((prev) => {
        const newData = JSON.parse(JSON.stringify(prev));
        const col = newData.columns.find((c: ColumnType) => c.id === task.columnId);
        if (col && !col.tasks.some((t: Task) => t.id === task.id)) {
          col.tasks.push(task);
        }
        return newData;
      });
    };

    const handleTaskMoved = (data: { id: string; columnId: string; order?: number }) => {
      setBoardData((prev) => {
        const newData = JSON.parse(JSON.stringify(prev));
        let movedTask: Task | null = null;

        for (const col of newData.columns) {
          const idx = col.tasks.findIndex((t: Task) => t.id === data.id);
          if (idx !== -1) {
            movedTask = col.tasks.splice(idx, 1)[0];
            break;
          }
        }

        if (movedTask) {
          movedTask.columnId = data.columnId;
          const targetCol = newData.columns.find((c: ColumnType) => c.id === data.columnId);
          if (targetCol) {
            const insertIdx = data.order !== undefined ? data.order : targetCol.tasks.length;
            targetCol.tasks.splice(insertIdx, 0, movedTask);
          }
        }
        return newData;
      });
    };

    const handleTaskUpdated = (updatedTask: any) => {
      const task: Task = {
        id: updatedTask._id || updatedTask.id,
        title: updatedTask.title,
        description: updatedTask.description,
        priority: updatedTask.priority,
        assignee: updatedTask.assignee,
        assigneeId: updatedTask.assigneeId,
        order: updatedTask.order || 0,
        columnId: updatedTask.columnId,
        category: updatedTask.category,
        dueDate: updatedTask.dueDate,
        storyPoints: updatedTask.storyPoints,
      };

      setBoardData((prev) => {
        const newData = JSON.parse(JSON.stringify(prev));
        for (const col of newData.columns) {
          const idx = col.tasks.findIndex((t: Task) => t.id === task.id);
          if (idx !== -1) {
            if (col.id === task.columnId) {
              col.tasks[idx] = task;
            } else {
              col.tasks.splice(idx, 1);
              const targetCol = newData.columns.find((c: ColumnType) => c.id === task.columnId);
              if (targetCol) targetCol.tasks.push(task);
            }
            break;
          }
        }
        return newData;
      });

      setSelectedTask((current) => (current && current.id === task.id ? task : current));
    };

    const handleTaskDeleted = ({ id }: { id: string }) => {
      setBoardData((prev) => {
        const newData = JSON.parse(JSON.stringify(prev));
        for (const col of newData.columns) {
          col.tasks = col.tasks.filter((t: Task) => t.id !== id);
        }
        return newData;
      });
      setSelectedTask((current) => (current && current.id === id ? null : current));
    };

    const handleColumnCreated = (newCol: any) => {
      setBoardData((prev) => ({
        ...prev,
        columns: [
          ...prev.columns,
          {
            id: newCol.columnId || newCol.id,
            title: newCol.title,
            color: newCol.color || '#6366f1',
            tasks: [],
          },
        ],
      }));
    };

    const handleColumnDeleted = ({ id }: { id: string }) => {
      setBoardData((prev) => ({
        ...prev,
        columns: prev.columns.filter((c) => c.id !== id),
      }));
    };

    socket.on('task:created', handleTaskCreated);
    socket.on('task:moved', handleTaskMoved);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('column:created', handleColumnCreated);
    socket.on('column:deleted', handleColumnDeleted);

    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:moved', handleTaskMoved);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('column:created', handleColumnCreated);
      socket.off('column:deleted', handleColumnDeleted);
    };
  }, [sprintId]);

  const findTask = (taskId: string): Task | null => {
    for (const col of boardData.columns) {
      const task = col.tasks.find((t) => t.id === taskId);
      if (task) return task;
    }
    return null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTask(String(event.active.id));
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const isActiveTask = active.data.current?.type === 'Task';
    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    if (!isActiveTask) return;

    if (isOverColumn || isOverTask) {
      setBoardData((prev) => {
        const activeColumnIndex = prev.columns.findIndex((c) => c.tasks.some((t) => t.id === activeId));
        const overColumnIndex = isOverColumn
          ? prev.columns.findIndex((c) => c.id === overId)
          : prev.columns.findIndex((c) => c.tasks.some((t) => t.id === overId));

        if (activeColumnIndex === -1 || overColumnIndex === -1) return prev;
        if (activeColumnIndex === overColumnIndex) return prev;

        const newData = JSON.parse(JSON.stringify(prev));
        const activeTaskIndex = newData.columns[activeColumnIndex].tasks.findIndex((t: Task) => t.id === activeId);
        const taskObj = newData.columns[activeColumnIndex].tasks.splice(activeTaskIndex, 1)[0];
        taskObj.columnId = newData.columns[overColumnIndex].id;

        if (isOverTask) {
          const overTaskIndex = newData.columns[overColumnIndex].tasks.findIndex((t: Task) => t.id === overId);
          newData.columns[overColumnIndex].tasks.splice(
            overTaskIndex >= 0 ? overTaskIndex : newData.columns[overColumnIndex].tasks.length,
            0,
            taskObj
          );
        } else {
          newData.columns[overColumnIndex].tasks.push(taskObj);
        }
        return newData;
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);

    const isOverTask = over.data.current?.type === 'Task';
    const isOverColumn = over.data.current?.type === 'Column';

    let targetColId = '';
    let targetOrder = 0;

    setBoardData((prev) => {
      const activeColumnIndex = prev.columns.findIndex((c) => c.tasks.some((t) => t.id === activeId));
      const overColumnIndex = isOverColumn
        ? prev.columns.findIndex((c) => c.id === overId)
        : prev.columns.findIndex((c) => c.tasks.some((t) => t.id === overId));

      if (activeColumnIndex === -1 || overColumnIndex === -1) return prev;

      targetColId = prev.columns[overColumnIndex].id;

      const newData = JSON.parse(JSON.stringify(prev));
      const activeTaskIndex = newData.columns[activeColumnIndex].tasks.findIndex((t: Task) => t.id === activeId);

      if (activeColumnIndex === overColumnIndex && isOverTask) {
        const overTaskIndex = newData.columns[overColumnIndex].tasks.findIndex((t: Task) => t.id === overId);
        const item = newData.columns[activeColumnIndex].tasks.splice(activeTaskIndex, 1)[0];
        newData.columns[activeColumnIndex].tasks.splice(overTaskIndex, 0, item);
        targetOrder = overTaskIndex;
      } else {
        targetOrder = newData.columns[overColumnIndex].tasks.length;
      }
      return newData;
    });

    // Sync with backend API
    if (targetColId) {
      tasksApi.move(activeId, targetColId, targetOrder).catch(() => {});
    }
  };

  const handleTaskAdded = (newTask: Task) => {
    // Add locally for instant response
    setBoardData((prev: BoardType) => {
      const newData = JSON.parse(JSON.stringify(prev));
      const col = newData.columns.find((c: ColumnType) => c.id === newTask.columnId);
      if (col) col.tasks.push(newTask);
      return newData;
    });
    setIsNewTaskModalOpen(false);

    // Persist to backend which sends task assignment email alert
    tasksApi.create({
      title: newTask.title,
      description: newTask.description || undefined,
      priority: newTask.priority,
      assignee: newTask.assignee || undefined,
      assigneeId: newTask.assigneeId || undefined,
      columnId: newTask.columnId,
      category: newTask.category,
      dueDate: newTask.dueDate,
      storyPoints: newTask.storyPoints,
      sprintId,
    }).then((res) => {
      if (res.success && res.data) {
        const realId = res.data._id || res.data.id;
        setBoardData((prev: BoardType) => {
          const newData = JSON.parse(JSON.stringify(prev));
          for (const col of newData.columns) {
            const tempIdx = col.tasks.findIndex((t: Task) => t.id === newTask.id);
            if (tempIdx !== -1) {
              // Remove duplicate if socket event already inserted realId
              const hasReal = col.tasks.some((t: Task) => t.id === realId);
              if (hasReal) {
                col.tasks.splice(tempIdx, 1);
              } else {
                col.tasks[tempIdx].id = realId;
              }
            }
          }
          return newData;
        });
      }
    }).catch(() => {});
  };

  const updateSelectedTask = (field: string, value: string) => {
    if (!selectedTask) return;
    const updated = { ...selectedTask, [field]: value };
    setSelectedTask(updated);

    setBoardData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      for (const col of newData.columns) {
        col.tasks = col.tasks.filter((t: Task) => t.id !== selectedTask.id);
      }
      const targetCol = newData.columns.find((c: ColumnType) => c.id === updated.columnId);
      if (targetCol) targetCol.tasks.push(updated);
      return newData;
    });

    tasksApi.update(selectedTask.id, { [field]: value }).catch(() => {});
  };

  const deleteSelectedTask = () => {
    if (!selectedTask) return;
    if (!confirm('Are you sure you want to delete this task?')) return;

    const taskId = selectedTask.id;
    setBoardData((prev) => {
      const newData = JSON.parse(JSON.stringify(prev));
      for (const col of newData.columns) {
        col.tasks = col.tasks.filter((t: Task) => t.id !== taskId);
      }
      return newData;
    });
    setSelectedTask(null);

    tasksApi.delete(taskId).catch(() => {});
  };

  const updateColumnTitle = (colId: string, newTitle: string) => {
    setBoardData((prev) => ({
      ...prev,
      columns: prev.columns.map((c) => (c.id === colId ? { ...c, title: newTitle } : c)),
    }));
    boardApi.updateColumn(colId, { title: newTitle }).catch(() => {});
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
    setBoardData((prev) => ({ ...prev, columns: [...prev.columns, newCol] }));
    boardApi.addColumn(title).catch(() => {});
  };

  const deleteColumn = (colId: string) => {
    if (!confirm('Delete this column and all its tasks?')) return;
    setBoardData((prev) => ({ ...prev, columns: prev.columns.filter((c) => c.id !== colId) }));
    boardApi.deleteColumn(colId).catch(() => {});
  };

  const priorityColors: Record<string, string> = {
    High: 'bg-red-500/15 text-red-400 border-red-500/20',
    Medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    Low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <section className="max-w-full px-4 sm:px-6 overflow-x-auto snap-x snap-mandatory sm:snap-none custom-scrollbar flex items-stretch gap-4 sm:gap-5 pb-8 min-h-[60dvh] lg:h-[calc(100dvh-235px)] mt-3">
          {boardData.columns.map((col) => {
            const filteredTasks = col.tasks.filter((t) =>
              t.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return (
              <ColumnComponent
                key={col.id}
                id={col.id}
                title={col.title}
                color={col.color}
                tasks={filteredTasks}
                employees={employees}
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
          <div
            className="kanban-column snap-start flex flex-col items-center justify-center h-40 border-2 border-dashed border-white/10 hover:border-indigo-500/40 rounded-2xl bg-white/[0.015] opacity-60 hover:opacity-100 transition-all shrink-0 cursor-pointer"
            onClick={addColumn}
          >
            <button
              id="new-column-btn"
              className="flex flex-col items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[32px]">add_circle</span>
              <span className="text-sm font-medium">New Column</span>
            </button>
          </div>
        </section>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} employees={employees} /> : null}
        </DragOverlay>
      </DndContext>

      {isNewTaskModalOpen && (
        <NewTaskModal
          columns={boardData.columns}
          initialColumnId={initialColumnForNewTask}
          employees={employees}
          onClose={() => setIsNewTaskModalOpen(false)}
          onSuccess={handleTaskAdded}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div
          className="fixed inset-0 z-[200] flex justify-end bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedTask(null);
          }}
        >
          <div className="w-full max-w-xl bg-[#181a26] border-l border-white/10 h-full overflow-y-auto animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#181a26]/95 backdrop-blur-md z-10 border-b border-white/5 px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <select
                  value={selectedTask.priority}
                  onChange={(e) => updateSelectedTask('priority', e.target.value)}
                  className={`px-3 py-1 rounded-full text-xs font-bold outline-none cursor-pointer border ${
                    priorityColors[selectedTask.priority] || 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
                  }`}
                >
                  <option value="Low">🟢 Low Priority</option>
                  <option value="Medium">🟡 Medium Priority</option>
                  <option value="High">🔴 High Priority</option>
                </select>
                <span className="text-gray-500 text-xs font-mono truncate">
                  TASK-{selectedTask.id.substring(0, 6).toUpperCase()}
                </span>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={deleteSelectedTask}
                  className="material-symbols-outlined text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition-colors"
                  title="Delete"
                >
                  delete
                </button>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="material-symbols-outlined text-gray-400 hover:text-white hover:bg-white/5 p-2 rounded-lg transition-colors"
                >
                  close
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-5 flex-1">
              {/* Title input */}
              <div>
                <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Title</label>
                <input
                  type="text"
                  value={selectedTask.title}
                  onChange={(e) => updateSelectedTask('title', e.target.value)}
                  className="w-full bg-transparent text-lg sm:text-xl font-bold text-white border-b border-white/10 focus:border-indigo-500 focus:outline-none pb-2 mt-1"
                />
              </div>

              {/* Status / Column Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Column / Status</label>
                  <select
                    value={selectedTask.columnId}
                    onChange={(e) => updateSelectedTask('columnId', e.target.value)}
                    className="w-full bg-[#1d1f2d] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 mt-1 cursor-pointer"
                  >
                    {boardData.columns.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Assignee</label>
                  <select
                    value={selectedTask.assigneeId || ''}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const emp = employees.find((emp) => emp.id === empId);
                      if (emp) {
                        updateSelectedTask('assigneeId', emp.id);
                        updateSelectedTask('assignee', emp.name);
                      } else {
                        updateSelectedTask('assigneeId', '');
                        updateSelectedTask('assignee', '');
                      }
                    }}
                    className="w-full bg-[#1d1f2d] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 mt-1 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assignee Email Notification note */}
              {selectedTask.assignee && (
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px] shrink-0">email</span>
                  <span>
                    Assigned to <strong>{selectedTask.assignee}</strong>. Real-time email alert is dispatched on assignment.
                  </span>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Description</label>
                <textarea
                  value={selectedTask.description || ''}
                  onChange={(e) => updateSelectedTask('description', e.target.value)}
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 mt-1 resize-none"
                  placeholder="Add a more detailed description..."
                />
              </div>

              {/* Due Date & Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Due Date</label>
                  <input
                    type="date"
                    value={selectedTask.dueDate || ''}
                    onChange={(e) => updateSelectedTask('dueDate', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-gray-400 tracking-wider">Story Points</label>
                  <input
                    type="number"
                    value={selectedTask.storyPoints || 3}
                    onChange={(e) => updateSelectedTask('storyPoints', e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/50 mt-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
