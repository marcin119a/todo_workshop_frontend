const BASE = ''

function getToken() {
  return localStorage.getItem('token')
}

function authHeaders(extra = {}) {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function request(method, path, body, params) {
  let url = BASE + path
  if (params) {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== '') q.append(k, v)
    }
    const qs = q.toString()
    if (qs) url += '?' + qs
  }
  const res = await fetch(url, {
    method,
    headers: authHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || JSON.stringify(data))
  return data
}

export const api = {
  // Auth
  async register(email, password) {
    const res = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || JSON.stringify(data))
    return data
  },

  async login(email, password) {
    const body = new URLSearchParams({ username: email, password })
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.detail || JSON.stringify(data))
    localStorage.setItem('token', data.access_token)
    return data
  },

  logout() {
    localStorage.removeItem('token')
  },

  // Tasks
  getTasks(filters = {}) {
    return request('GET', '/tasks/', null, filters)
  },

  createTask(task, useAI = false) {
    return request('POST', '/tasks/', task, useAI ? { use_ai_priority: true } : null)
  },

  updateTask(id, data) {
    return request('PATCH', `/tasks/${id}`, data)
  },

  deleteTask(id) {
    return request('DELETE', `/tasks/${id}`)
  },

  addTag(taskId, name) {
    return request('POST', `/tasks/${taskId}/tags`, { name })
  },

  removeTag(taskId, tagName) {
    return request('DELETE', `/tasks/${taskId}/tags/${tagName}`)
  },

  reanalyzePriority(taskId) {
    return request('POST', `/tasks/${taskId}/reanalyze-priority`)
  },

  getUpcomingTasks(days = 7) {
    return request('GET', '/tasks/upcoming', null, { days })
  },

  // Categories
  getCategories() {
    // There's no GET /categories in the API, but we'll cache from tasks
    return []
  },

  createCategory(name, color) {
    return request('POST', '/categories/', { name, color })
  },

  deleteCategory(id) {
    return request('DELETE', `/categories/${id}`)
  },
}
