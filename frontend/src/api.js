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

export async function getTasks() {
  const response = await fetch('/tasks');
  return parseResponse(response);
}

export async function createTask(payload) {
  const response = await fetch('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function updateTask(id, payload) {
  const response = await fetch('/tasks/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function removeTask(id) {
  const response = await fetch('/tasks/' + id, {
    method: 'DELETE'
  });
  return parseResponse(response);
}

export async function closeWeek() {
  const response = await fetch('/reports/export', {
    method: 'POST'
  });
  return parseResponse(response);
}

export const exportReport = closeWeek;

export async function getReports() {
  const response = await fetch('/reports');
  return parseResponse(response);
}

export async function getReportById(id) {
  const response = await fetch('/reports/' + id);
  return parseResponse(response);
}

export async function getEmployees() {
  const response = await fetch('/employees');
  return parseResponse(response);
}

export async function createEmployee(payload) {
  const response = await fetch('/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function getAiProjects(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const query = params.toString();
  const response = await fetch(query ? '/ai-projects?' + query : '/ai-projects');
  return parseResponse(response);
}

export async function createAiProject(payload) {
  const response = await fetch('/ai-projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function updateAiProject(id, payload) {
  const response = await fetch('/ai-projects/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return parseResponse(response);
}

export async function removeAiProject(id) {
  const response = await fetch('/ai-projects/' + id, {
    method: 'DELETE'
  });
  return parseResponse(response);
}

export async function getAiDashboard() {
  const response = await fetch('/ai-projects/dashboard/summary');
  return parseResponse(response);
}
