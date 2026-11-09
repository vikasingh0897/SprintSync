// SprintSync API Client
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Robust response handler for JSON and HTML/plain text error pages
 * Handles Render 503 (Suspended / Cold start), 404, 502, and unexpected responses cleanly
 */
async function handleResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await res.json();
    } catch {
      return { success: false, message: 'Invalid JSON response received from backend.' };
    }
  }

  // Handle non-JSON responses (Render error pages, 503 suspended, cold start delays)
  const text = await res.text();
  if (res.status === 503) {
    return {
      success: false,
      message: `Backend service is unavailable or suspended (HTTP 503). Please verify your backend service is running on Render and that NEXT_PUBLIC_API_URL is configured to your active backend URL (attempted: ${API_URL}).`,
    };
  }
  if (res.status === 502 || res.status === 504) {
    return {
      success: false,
      message: `Backend gateway timeout (${res.status}). If the service was sleeping on Render free tier, it takes ~50 seconds to spin up. Please retry in 30 seconds.`,
    };
  }
  if (res.status === 404) {
    return {
      success: false,
      message: `Backend API route not found (HTTP 404) at ${res.url}. Please verify your backend URL in Render environment settings.`,
    };
  }

  return {
    success: false,
    message: `Backend returned HTTP ${res.status}: ${text.slice(0, 100) || res.statusText}`,
  };
}

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
    return await handleResponse(res);
  },
  async getActive() {
    const res = await fetchWithAuth('/sprints/active');
    return await handleResponse(res);
  },
  async create(data: { name: string; goal?: string; startDate?: string; endDate?: string; status?: string }) {
    const res = await fetchWithAuth('/sprints', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },
  async update(id: string, data: any) {
    const res = await fetchWithAuth(`/sprints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },
  async delete(id: string) {
    const res = await fetchWithAuth(`/sprints/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(res);
  },
};

// ── Employees API ──────────────────────────────────────────
export const employeesApi = {
  async getAll() {
    const res = await fetchWithAuth('/employees');
    return await handleResponse(res);
  },
  async invite(data: { name: string; email: string; role: string; department: string; avatarColor?: string }) {
    const res = await fetchWithAuth('/employees/invite', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },
  async verifyInvite(token: string) {
    const res = await fetch(`${API_URL}/employees/verify-invite?token=${encodeURIComponent(token)}`);
    return await handleResponse(res);
  },
  async confirmInvite(data: { token: string; password: string }) {
    const res = await fetch(`${API_URL}/employees/confirm-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },
  async resendConfirmation(id: string) {
    const res = await fetchWithAuth(`/employees/${id}/resend-confirmation`, {
      method: 'POST',
    });
    return await handleResponse(res);
  },
  async update(id: string, data: any) {
    const res = await fetchWithAuth(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },
  async delete(id: string) {
    const res = await fetchWithAuth(`/employees/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(res);
  },
};

// ── Tasks API ──────────────────────────────────────────────
export const tasksApi = {
  async getAll(params?: { sprintId?: string; columnId?: string }) {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await fetchWithAuth(`/tasks${query ? `?${query}` : ''}`);
    return await handleResponse(res);
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
    return await handleResponse(res);
  },
  async update(id: string, data: any) {
    const res = await fetchWithAuth(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },
  async move(id: string, columnId: string, order: number) {
    const res = await fetchWithAuth(`/tasks/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ columnId, order }),
    });
    return await handleResponse(res);
  },
  async delete(id: string) {
    const res = await fetchWithAuth(`/tasks/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(res);
  },
};

// ── Board API ──────────────────────────────────────────────
export const boardApi = {
  async getBoard(sprintId?: string) {
    const query = sprintId ? `?sprintId=${sprintId}` : '';
    const res = await fetchWithAuth(`/board${query}`);
    return await handleResponse(res);
  },
  async addColumn(title: string, color?: string) {
    const res = await fetchWithAuth('/board/columns', {
      method: 'POST',
      body: JSON.stringify({ title, color }),
    });
    return await handleResponse(res);
  },
  async updateColumn(id: string, data: { title?: string; color?: string }) {
    const res = await fetchWithAuth(`/board/columns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await handleResponse(res);
  },
  async deleteColumn(id: string) {
    const res = await fetchWithAuth(`/board/columns/${id}`, {
      method: 'DELETE',
    });
    return await handleResponse(res);
  },
};

// ── Notifications API ──────────────────────────────────────
export const notificationsApi = {
  async getAll() {
    const res = await fetchWithAuth('/notifications');
    return await handleResponse(res);
  },
  async markRead(id: string) {
    const res = await fetchWithAuth(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
    return await handleResponse(res);
  },
  async markAllRead() {
    const res = await fetchWithAuth('/notifications/read-all', {
      method: 'PATCH',
    });
    return await handleResponse(res);
  },
};
