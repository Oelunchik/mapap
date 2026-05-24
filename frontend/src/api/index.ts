const BASE = (import.meta.env.VITE_API_URL as string) || '/api';

function token() {
  return localStorage.getItem('token');
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...(opts.headers || {}),
    },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Ошибка запроса');
  return json.data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    request<{ token: string; user: import('../types').User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<import('../types').User>('/auth/me'),

  // Tasks
  getTasks: (params: Record<string, string | number | boolean | undefined> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v !== undefined && q.set(k, String(v)));
    return request<import('../types').Task[]>(`/tasks?${q}`);
  },
  getTask: (id: number) => request<import('../types').Task>(`/tasks/${id}`),
  createTask: (body: Partial<import('../types').Task>) =>
    request<import('../types').Task>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: number, body: Partial<import('../types').Task>) =>
    request<import('../types').Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateStatus: (id: number, status: string, comment?: string) =>
    request<import('../types').Task>(`/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, comment }),
    }),
  deleteTask: (id: number) => request<{ id: number }>(`/tasks/${id}`, { method: 'DELETE' }),

  // Users
  getUsers: () => request<import('../types').User[]>('/users'),

  // Directions
  getDirections: () => request<import('../types').Direction[]>('/directions'),
  getTaskTypes: () => request<import('../types').TaskType[]>('/directions/task-types'),

  // Reports
  getSummary: () => request<import('../types').SummaryRow[]>('/reports/summary'),
  getOverdue: () => request<import('../types').Task[]>('/reports/overdue'),
  getInternationalTracks: () => request<import('../types').InternationalTrack[]>('/reports/international-tracks'),
  updateTrack: (id: number, body: { status?: string; notes?: string }) =>
    request<import('../types').InternationalTrack>(`/reports/international-tracks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  getQuarterly: () =>
    request<{
      generated_at: string;
      summary: import('../types').SummaryRow[];
      by_direction: { direction: string; total: number; done: number; in_progress: number; overdue: number }[];
      international_tracks: import('../types').InternationalTrack[];
    }>('/reports/quarterly'),
};
