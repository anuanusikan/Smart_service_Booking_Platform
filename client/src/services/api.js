export const API_BASE_URL = 'http://localhost:5000/api';

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

export async function apiGet(path, auth = false) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: auth ? getAuthHeaders() : {}
  });
  return res.json();
}

export async function apiPost(path, body, auth = true) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: auth ? getAuthHeadersJSON() : { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function apiPut(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: getAuthHeadersJSON(),
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function apiDelete(path) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

export async function apiUpload(path, formData, method = 'POST') {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: getAuthHeaders(), // no Content-Type: browser sets it for FormData
    body: formData
  });
  const data = await res.json();
  return { ok: res.ok, data };
}