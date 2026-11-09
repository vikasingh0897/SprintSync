// SprintSync API Client
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ss_token') : null;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
}

// ── Sprints API ────────────────────────────────────────────
export const sprintsApi = {
  async getAll() {
    const res = await fetchWithAuth('/sprints');
    return await res.json();
  },
  async getActive() {
    const res = await fetchWithAuth('/sprints/active');
    return await res.json();
  },
  async create(data: { name: string; goal?: string; startDate?: string; endDate?: string; status?: string }) {
    const res = await fetchWithAuth('/sprints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async update(id: string, data: any) {
    const res = await fetchWithAuth(`/sprints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async delete(id: string) {
    const res = await fetchWithAuth(`/sprints/${id}`, {
      method: 'DELETE',
    });
    return await res.json();
  },
};

// ── Employees API ──────────────────────────────────────────
export const employeesApi = {
  async getAll() {
    const res = await fetchWithAuth('/employees');
    return await res.json();
  },
  async invite(data: { name: string; email: string; role: string; department: string; avatarColor?: string }) {
    const res = await fetchWithAuth('/employees/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async verifyInvite(token: string) {
    const res = await fetch(`${API_URL}/employees/verify-invite?token=${encodeURIComponent(token)}`);
    return await res.json();
  },
  async confirmInvite(data: { token: string; password: string }) {
    const res = await fetch(`${API_URL}/employees/confirm-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async resendConfirmation(id: string) {
    const res = await fetchWithAuth(`/employees/${id}/resend-confirmation`, {
      method: 'POST',
    });
    return await res.json();
  },
  async update(id: string, data: any) {
    const res = await fetchWithAuth(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async delete(id: string) {
    const res = await fetchWithAuth(`/employees/${id}`, {
      method: 'DELETE',
    });
    return await res.json();
  },
};

// ── Tasks API ──────────────────────────────────────────────
export const tasksApi = {
  async getAll(params?: { sprintId?: string; columnId?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await fetchWithAuth(`/tasks${query ? `?${query}` : ''}`);
    return await res.json();
  },
  async create(data: {
    title: string;
    description?: string;
    priority?: string;
    assignee?: string;
    assigneeId?: string;
    columnId?: string;
    category?: string;
    dueDate?: string;
    storyPoints?: number;
    sprintId?: string;
  }) {
    const res = await fetchWithAuth('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async update(id: string, data: any) {
    const res = await fetchWithAuth(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async move(id: string, columnId: string, order: number) {
    const res = await fetchWithAuth(`/tasks/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ columnId, order }),
    });
    return await res.json();
  },
  async delete(id: string) {
    const res = await fetchWithAuth(`/tasks/${id}`, {
      method: 'DELETE',
    });
    return await res.json();
  },
};

// ── Board API ──────────────────────────────────────────────
export const boardApi = {
  async getBoard(sprintId?: string) {
    const query = sprintId ? `?sprintId=${sprintId}` : '';
    const res = await fetchWithAuth(`/board${query}`);
    return await res.json();
  },
  async addColumn(title: string, color?: string) {
    const res = await fetchWithAuth('/board/columns', {
      method: 'POST',
      body: JSON.stringify({ title, color }),
    });
    return await res.json();
  },
  async updateColumn(id: string, data: { title?: string; color?: string }) {
    const res = await fetchWithAuth(`/board/columns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await res.json();
  },
  async deleteColumn(id: string) {
    const res = await fetchWithAuth(`/board/columns/${id}`, {
      method: 'DELETE',
    });
    return await res.json();
  },
};

// ── Notifications API ──────────────────────────────────────
export const notificationsApi = {
  async getAll() {
    const res = await fetchWithAuth('/notifications');
    return await res.json();
  },
  async markRead(id: string) {
    const res = await fetchWithAuth(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
    return await res.json();
  },
  async markAllRead() {
    const res = await fetchWithAuth('/notifications/read-all', {
      method: 'PATCH',
    });
    return await res.json();
  },
};
