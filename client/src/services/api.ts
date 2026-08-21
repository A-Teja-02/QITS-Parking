import type { Reservation, ReservationCreate, User, Floor, ParkingSlot, ManagerRelease } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('auth_token');
}

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { ...headers, ...(options?.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body.detail || body.message || message;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    login: (data: any) => request<{token: string, user: User}>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    me: () => request<User>('/auth/me'),

    // Activation (first-time signup) — 3-step flow
    activateRequest: (data: { email: string }) =>
      request<{ message: string }>('/auth/activate/request', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    activateVerify: (data: { email: string; otp: string }) =>
      request<{ message: string }>('/auth/activate/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    activateComplete: (data: { name: string; email: string; otp: string; password: string; confirm_password: string }) =>
      request<{ message: string }>('/auth/activate/complete', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    // Password management
    forgotPassword: (data: { email: string }) =>
      request<{ message: string }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    resetPassword: (data: { email: string; otp: string; new_password: string; confirm_password: string }) =>
      request<{ message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    changePassword: (data: { current_password: string; new_password: string; confirm_password: string }) =>
      request<{ message: string }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateProfile: (data: { name: string; department: string; vehicle_number: string; mobile_number: string }) =>
      request<User>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    uploadProfilePicture: (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = getToken();
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      return fetch(`${BASE_URL}/auth/profile/picture`, {
        method: 'POST',
        headers,
        body: formData
      }).then(async (res) => {
        if (!res.ok) {
          let message = `HTTP ${res.status}`;
          try {
            const body = await res.json();
            message = body.detail || body.message || message;
          } catch {}
          throw new Error(message);
        }
        return res.json() as Promise<User>;
      });
    },
  },
  
  // ─── Parking APIs (UNTOUCHED) ─────────────────────────────────────────────
  
  users: {
    list: () => request<User[]>('/users'),
    create: (data: any) => request<User>('/users', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
    toggleStatus: (id: string, is_active: boolean) => request(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
  },
  
  floors: {
    list: () => request<Floor[]>('/floors'),
    toggleStatus: (id: string, is_active: boolean) => request(`/floors/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),
  },
  
  slots: {
    list: (floorId?: string) => request<ParkingSlot[]>(floorId ? `/slots?floor_id=${floorId}` : '/slots'),
    create: (data: any) => request<ParkingSlot>('/slots', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: any) => request<ParkingSlot>(`/slots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/slots/${id}`, { method: 'DELETE' }),
    setStatus: (id: string, status: string) => request(`/slots/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    assignManager: (id: string, manager_id: string) => request(`/slots/${id}/assign-manager`, { method: 'POST', body: JSON.stringify({ manager_id }) }),
    removeManager: (id: string) => request(`/slots/${id}/assign-manager`, { method: 'DELETE' }),
    release: (id: string, data: any) => request<ManagerRelease>(`/slots/${id}/release`, { method: 'POST', body: JSON.stringify(data) }),
    cancelRelease: (id: string, data: { date?: string; start_date?: string; end_date?: string }) => request<void>(`/slots/${id}/release`, { method: 'DELETE', body: JSON.stringify(data) }),
    getReserved: () => request<any[]>('/slots/reserved'),
    getReleases: (date: string) => request<ManagerRelease[]>(`/manager-releases?date=${date}`)
  },
  
  reservations: {
    list: (date?: string) => request<Reservation[]>(date ? `/reservations?date=${date}` : '/reservations'),
    create: (data: ReservationCreate) => request<Reservation>('/reservations', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: string) => request<void>(`/reservations/${id}`, { method: 'DELETE' }),
    history: (userId: string) => request<Reservation[]>(`/reservations/history/${userId}`),
  },

  status: {
    getSlotStatus: () => request<{ tomorrow: string; is_weekend: boolean }>('/slots/status'),
  }
};
