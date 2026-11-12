export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'High' | 'Medium' | 'Low';
  assignee: string | null;
  assigneeId: string | null;
  order: number;
  columnId: string;
  category: string;
  dueDate?: string;
  storyPoints?: number;
}

export interface Column {
  id: string;
  title: string;
  color: string;
  tasks: Task[];
}

export interface Board {
  id: string;
  title: string;
  columns: Column[];
}

// Empty default workflow columns (zero dummy tasks)
export const INITIAL_BOARD_DATA: Board = {
  id: 'board-main',
  title: 'SprintSync Main Board',
  columns: [
    { id: 'col-backlog', title: 'Backlog', color: '#6366f1', tasks: [] },
    { id: 'col-inprogress', title: 'In Progress', color: '#f59e0b', tasks: [] },
    { id: 'col-review', title: 'In Review', color: '#a855f7', tasks: [] },
    { id: 'col-done', title: 'Done', color: '#10b981', tasks: [] },
  ],
};

export const TASK_CATEGORIES = [
  'Feature',
  'Bug Fix',
  'Design',
  'Backend',
  'Frontend',
  'DevOps',
  'Security',
  'QA',
  'Documentation',
  'Research',
  'Planning',
  'Marketing',
  'Content',
  'Analytics',
  'ML',
  'Mobile',
  'HR',
  'Finance',
  'Sales',
  'Infrastructure',
  'Refactor',
  'Performance',
  'Accessibility',
];
