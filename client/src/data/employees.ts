export interface Employee {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarColor: string;
  initials: string;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksPending: number;
  completionRate: number;
  avgScore: number;
  joinedDate: string;
  status: 'Active' | 'On Leave' | 'Remote' | 'Pending Confirmation';
}

// No static dummy employees — loaded dynamically from MongoDB backend
export const EMPLOYEES: Employee[] = [];

export const DEPARTMENTS = [
  'All',
  'Engineering',
  'Design',
  'Product',
  'Marketing',
  'Analytics',
  'Human Resources',
  'Finance',
  'Sales',
  'Leadership',
];
