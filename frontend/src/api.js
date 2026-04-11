const API_BASE = import.meta.env.VITE_API_BASE || '/project-tracking/_api';

function apiPath(path) {
  return `${API_BASE}${path}`;
}

async function parseResponse(response) {
  if (response.ok) {
    if (response.status === 204) {
      return null;
    }
    return response.json();
  }

  let message = 'Yeu cau that bai';
  try {
    const data = await response.json();
    message = data.error || (data.errors && data.errors.join(', ')) || message;
  } catch {
    message = response.statusText || message;
  }

  throw new Error(message);
}

async function jsonFetch(path, options = {}) {
  const response = await fetch(apiPath(path), {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  return parseResponse(response);
}

export async function getTasks() {
  return jsonFetch('/tasks', { headers: {} });
}

export async function createTask(payload) {
  return jsonFetch('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateTask(id, payload) {
  return jsonFetch(`/tasks/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function removeTask(id) {
  const response = await fetch(apiPath('/tasks/' + id), { method: 'DELETE' });
  return parseResponse(response);
}

export async function closeWeek() {
  return jsonFetch('/reports/export', { method: 'POST' });
}

export async function getReports() {
  return jsonFetch('/reports', { headers: {} });
}

export async function getReportById(id) {
  return jsonFetch(`/reports/${id}`, { headers: {} });
}

export async function getEmployees() {
  return jsonFetch('/employees', { headers: {} });
}

export async function createEmployee(payload) {
  return jsonFetch('/employees', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function getAiInitiatives(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }
  const query = params.toString();
  return jsonFetch(query ? `/ai-initiatives?${query}` : '/ai-initiatives', { headers: {} });
}

export async function getAiInitiativeDetail(id) {
  return jsonFetch(`/ai-initiatives/${id}`, { headers: {} });
}

export async function createAiInitiative(payload) {
  return jsonFetch('/ai-initiatives', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAiInitiative(id, payload) {
  return jsonFetch(`/ai-initiatives/${id}/request-form`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function updateFeasibility(id, payload) {
  return jsonFetch(`/ai-initiatives/${id}/feasibility`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function submitGateReview(id, payload) {
  return jsonFetch(`/ai-initiatives/${id}/gate-review`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateSolutionDesign(id, payload) {
  return jsonFetch(`/ai-initiatives/${id}/solution-design`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function updateDelivery(id, payload) {
  return jsonFetch(`/ai-initiatives/${id}/delivery`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function updateApprovals(id, payload) {
  return jsonFetch(`/ai-initiatives/${id}/approvals`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function updateOperations(id, payload) {
  return jsonFetch(`/ai-initiatives/${id}/operations`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function getAiDashboard() {
  return jsonFetch('/ai-initiatives/dashboard/summary', { headers: {} });
}
