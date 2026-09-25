export const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api';

// -------------------------------------------------------------
// Authentication Helpers
// -------------------------------------------------------------

export function getAuthHeaders() {
  const token = localStorage.getItem('token');

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
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
      method: 'GET',
      headers: auth ? getAuthHeaders() : {}
    });

    const data = await res.json();

    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err) {
    console.error(`apiGet error on ${path}:`, err);

    return {
      ok: false,
      status: 0,
      data: {
        message: 'Network error. Please try again.'
      }
    };
  }
}

export async function apiPost(path, body, auth = true) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: auth
        ? getAuthHeadersJSON()
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err) {
    console.error(`apiPost error on ${path}:`, err);

    return {
      ok: false,
      status: 0,
      data: {
        message: 'Network error. Please try again.'
      }
    };
  }
}

export async function apiPut(path, body, auth = true) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: auth
        ? getAuthHeadersJSON()
        : { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await res.json();

    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err) {
    console.error(`apiPut error on ${path}:`, err);

    return {
      ok: false,
      status: 0,
      data: {
        message: 'Network error. Please try again.'
      }
    };
  }
}

export async function apiDelete(path, auth = true) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: auth ? getAuthHeaders() : {}
    });

    const data = await res.json();

    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err) {
    console.error(`apiDelete error on ${path}:`, err);

    return {
      ok: false,
      status: 0,
      data: {
        message: 'Network error. Please try again.'
      }
    };
  }
}

export async function apiUpload(path, formData, method = 'POST') {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: getAuthHeaders(),
      // Do NOT manually set Content-Type.
      // Browser automatically adds multipart/form-data boundary.
      body: formData
    });

    const data = await res.json();

    return {
      ok: res.ok,
      status: res.status,
      data
    };
  } catch (err) {
    console.error(`apiUpload error on ${path}:`, err);

    return {
      ok: false,
      status: 0,
      data: {
        message: 'Upload failed. Please try again.'
      }
    };
  }
}

// -------------------------------------------------------------
// Authentication API
// -------------------------------------------------------------

export const authApi = {
  login: (email, password, role) =>
    apiPost(
      '/auth/login',
      {
        email,
        password,
        role
      },
      false
    ),

  register: (formData) =>
    apiPost('/auth/register', formData, false),

  getMe: () =>
    apiGet('/auth/me', true),

  updateProfile: (formData) =>
    apiUpload('/auth/me', formData, 'PUT'),

  getProvider: (id) =>
    apiGet(`/auth/provider/${id}`)
};

// -------------------------------------------------------------
// Jobs API
// -------------------------------------------------------------

export const jobsApi = {
  getMine: () =>
    apiGet('/jobs/mine', true),

  getMatched: () =>
    apiGet('/jobs/matched', true),

  getAll: (queryString = '') =>
    apiGet(
      `/jobs${queryString ? `?${queryString}` : ''}`
    ),

  getById: (id) =>
    apiGet(`/jobs/${id}`),

  create: (jobData) =>
    apiPost('/jobs', jobData, true),

  update: (id, jobData) =>
    apiPut(`/jobs/${id}`, jobData, true),

  delete: (id) =>
    apiDelete(`/jobs/${id}`, true)
};

// -------------------------------------------------------------
// Quotes API
// -------------------------------------------------------------

export const quotesApi = {
  getByJob: (jobId) =>
    apiGet(`/quotes/job/${jobId}`, true),

  getMine: () =>
    apiGet('/quotes/mine', true),

  create: (quoteData) =>
    apiPost('/quotes', quoteData, true),

  accept: (quoteId) =>
    apiPut(`/quotes/${quoteId}/accept`, {}, true),

  decline: (quoteId) =>
    apiPut(`/quotes/${quoteId}/decline`, {}, true)
};

// -------------------------------------------------------------
// Bookings API
// -------------------------------------------------------------

export const bookingsApi = {
  getMine: () =>
    apiGet('/bookings/mine', true),

  create: (bookingData) =>
    apiPost('/bookings', bookingData, true),

  updateStatus: (id, status) =>
    apiPut(`/bookings/${id}`, { status }, true),

  // Provider cancellation
  cancel: (id) =>
    apiDelete(`/bookings/${id}/cancel`, true),

  // Remove booking from history
  removeFromHistory: (id) =>
    apiDelete(`/bookings/${id}`, true)
};

// -------------------------------------------------------------
// Reviews API
// -------------------------------------------------------------

export const reviewsApi = {
  getByProvider: (providerId) =>
    apiGet(`/reviews/provider/${providerId}`),

  getMine: () =>
    apiGet('/reviews/mine', true),

  create: (reviewData) =>
    apiPost('/reviews', reviewData, true)
};

// -------------------------------------------------------------
// Messages API
// -------------------------------------------------------------

export const messagesApi = {
  getThread: (bookingId) =>
    apiGet(`/messages/${bookingId}`, true),

  send: (bookingId, text) =>
    apiPost(
      `/messages/${bookingId}`,
      { text },
      true
    ),

  getConversations: () =>
    apiGet('/messages/conversations/mine', true)
};

// -------------------------------------------------------------
// Notifications API
// -------------------------------------------------------------

export const notificationsApi = {
  getNotifications: (page = 1) =>
    apiGet(`/notifications?page=${page}`, true),

  getAll: (page = 1) =>
    apiGet(`/notifications?page=${page}`, true),

  markAsRead: (id) =>
    apiPut(`/notifications/${id}/read`, {}, true),

  markAllAsRead: () =>
    apiPut('/notifications/read-all', {}, true),

  clearAll: () =>
    apiDelete('/notifications/clear-all', true)
};