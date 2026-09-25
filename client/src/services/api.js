export const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function getAuthHeadersJSON() {
  return {
    'Content-Type': 'application/json',
    ...getAuthHeaders()
  };
}

// -------------------------------------------------------------
// Core HTTP Primitives
// -------------------------------------------------------------
export async function apiGet(path, auth = false) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: auth ? getAuthHeaders() : {}
    });
    return await res.json();
  } catch (err) {
    console.error(`apiGet error on ${path}:`, err);
    return null;
  }
}

export async function apiPost(path, body, auth = true) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: auth ? getAuthHeadersJSON() : { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`apiPost error on ${path}:`, err);
    return { ok: false, data: { message: 'Network error. Please try again.' } };
  }
}

export async function apiPut(path, body) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: getAuthHeadersJSON(),
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`apiPut error on ${path}:`, err);
    return { ok: false, data: { message: 'Network error. Please try again.' } };
  }
}

export async function apiDelete(path) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`apiDelete error on ${path}:`, err);
    return { ok: false, data: { message: 'Network error. Please try again.' } };
  }
}

export async function apiUpload(path, formData, method = 'POST') {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: getAuthHeaders(), // Content-Type is set automatically with boundary for FormData
      body: formData
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`apiUpload error on ${path}:`, err);
    return { ok: false, data: { message: 'Upload failed. Please try again.' } };
  }
}

// -------------------------------------------------------------
// Organized Domain Services
// -------------------------------------------------------------

export const authApi = {
  login: (email, password) => apiPost('/auth/login', { email, password }, false),
  register: (formData) => apiUpload('/auth/register', formData, 'POST'),
  getMe: () => apiGet('/auth/me', true),
  updateProfile: (formData) => apiUpload('/auth/me', formData, 'PUT')
};

export const jobsApi = {
  getMine: () => apiGet('/jobs/mine', true),
  getMatched: () => apiGet('/jobs/matched', true),
  getAll: (queryString = '') => apiGet(`/jobs${queryString ? `?${queryString}` : ''}`),
  getById: (id) => apiGet(`/jobs/${id}`),
  create: (jobData) => apiPost('/jobs', jobData, true),
  update: (id, jobData) => apiPut(`/jobs/${id}`, jobData, true),
  delete: (id) => apiDelete(`/jobs/${id}`, true)
};

export const quotesApi = {
  getByJob: (jobId) => apiGet(`/quotes/job/${jobId}`, true),
  getMine: () => apiGet('/quotes/mine', true),
  create: (quoteData) => apiPost('/quotes', quoteData, true),
  accept: (quoteId) => apiPut(`/quotes/${quoteId}/accept`, {}, true),
  decline: (quoteId) => apiPut(`/quotes/${quoteId}/decline`, {}, true)
};

export const bookingsApi = {
  getMine: () => apiGet('/bookings/mine', true),
  create: (bookingData) => apiPost('/bookings', bookingData, true),
  updateStatus: (id, status) => apiPut(`/bookings/${id}`, { status }, true),
  cancel: (id) => apiPut(`/bookings/${id}`, { status: 'declined' }, true)
};

export const reviewsApi = {
  getByProvider: (providerId) => apiGet(`/reviews/provider/${providerId}`),
  getMine: () => apiGet('/reviews/mine', true),
  create: (reviewData) => apiPost('/reviews', reviewData, true)
};

export const messagesApi = {
  getThread: (bookingId) => apiGet(`/messages/${bookingId}`, true),
  send: (bookingId, text) => apiPost(`/messages/${bookingId}`, { text }, true),
  getConversations: () => apiGet('/messages/conversations/mine', true)
};

export const notificationsApi = {
  getAll: (page = 1) => apiGet(`/notifications?page=${page}`, true),
  markAsRead: (id) => apiPut(`/notifications/${id}/read`, {}, true),
  markAllAsRead: () => apiPut('/notifications/read-all', {}, true),
  clearAll: () => apiDelete('/notifications/clear-all', true)
};