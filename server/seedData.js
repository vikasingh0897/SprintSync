// Structural default workflow columns (no dummy employees, sprints, or tasks)
const INITIAL_COLUMNS = [
  { columnId: 'col-backlog', title: 'Backlog', color: '#6366f1', order: 0 },
  { columnId: 'col-inprogress', title: 'In Progress', color: '#f59e0b', order: 1 },
  { columnId: 'col-review', title: 'In Review', color: '#a855f7', order: 2 },
  { columnId: 'col-done', title: 'Done', color: '#10b981', order: 3 },
];

const INITIAL_EMPLOYEES = [];
const INITIAL_TASKS = [];

module.exports = {
  INITIAL_COLUMNS,
  INITIAL_EMPLOYEES,
  INITIAL_TASKS,
};
