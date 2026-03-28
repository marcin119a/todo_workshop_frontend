import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { api } from './api'

// ── Toast context ──────────────────────────────────────────────────────────────
const ToastCtx = createContext(null)

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const push = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-stack">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

function useToast() { return useContext(ToastCtx) }

// ── Auth page ─────────────────────────────────────────────────────────────────
function AuthPage({ onLogin }) {
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await api.login(email, password)
        onLogin(email)
      } else {
        await api.register(email, password)
        toast('Konto utworzone — zaloguj się!', 'success')
        setTab('login')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>✓ TodoAI</h1>
          <p>Zarządzaj zadaniami z pomocą AI</p>
        </div>
        <div className="auth-tabs">
          <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError('') }}>Logowanie</button>
          <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError('') }}>Rejestracja</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Hasło</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : (tab === 'login' ? 'Zaloguj się' : 'Utwórz konto')}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Task modal ────────────────────────────────────────────────────────────────
function TaskModal({ task, categories, onSave, onClose }) {
  const isEdit = !!task?.id
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState(task?.priority ?? 'medium')
  const [status, setStatus] = useState(task?.status ?? 'todo')
  const [categoryId, setCategoryId] = useState(task?.category?.id ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState(task?.tags ?? [])
  const [dueDate, setDueDate] = useState(task?.due_date?.slice(0, 10) ?? '')
  const [useAI, setUseAI] = useState(false)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')
  const [aiReason, setAiReason] = useState(task?.priority_reason ?? '')
  const toast = useToast()

  async function analyzeAI() {
    if (!title.trim()) return
    setAiLoading(true)
    try {
      const res = await api.reanalyzePriority
        ? null
        : null
      // Use analyze endpoint
      const r = await fetch('/tasks/priority/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ title, description, due_date: dueDate || null }),
      })
      const data = await r.json()
      setPriority(data.priority)
      setAiReason(data.priority_reason)
      toast('AI zasugerowało priorytet: ' + data.priority, 'success')
    } catch {
      toast('Błąd AI', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  function handleTagKey(e) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      const t = tagInput.trim().replace(/,$/, '')
      if (t && !tags.includes(t)) setTags([...tags, t])
      setTagInput('')
    }
    if (e.key === 'Backspace' && !tagInput && tags.length) {
      setTags(tags.slice(0, -1))
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!title.trim()) return
    setError('')
    setLoading(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status,
        category_id: categoryId ? parseInt(categoryId) : null,
        tags,
        due_date: dueDate || null,
      }
      if (isEdit) {
        await onSave(task.id, payload, tags)
      } else {
        await onSave(null, payload, tags, useAI)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? 'Edytuj zadanie' : 'Nowe zadanie'}</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Tytuł *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Co chcesz zrobić?" autoFocus />
          </div>
          <div className="form-group">
            <label>Opis</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Opcjonalny opis…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Priorytet</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="low">Niski</option>
                <option value="medium">Średni</option>
                <option value="high">Wysoki</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="todo">Do zrobienia</option>
                <option value="done">Zrobione</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Termin wykonania</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Kategoria</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)}>
              <option value="">Brak kategorii</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Tagi (Enter aby dodać)</label>
            <div className="tags-container" onClick={e => e.currentTarget.querySelector('input').focus()}>
              {tags.map(t => (
                <span key={t} className="tag-chip">
                  #{t}
                  <button type="button" onClick={() => setTags(tags.filter(x => x !== t))}>×</button>
                </span>
              ))}
              <input
                className="tag-input"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
                placeholder={tags.length ? '' : 'np. praca, dom…'}
              />
            </div>
          </div>
          {aiReason && (
            <div className="priority-reason">
              <span className="ai-badge">✦ AI</span> {aiReason}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={analyzeAI} disabled={!title.trim() || aiLoading}>
              {aiLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '✦'} Sugestia AI
            </button>
            {!isEdit && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={useAI} onChange={e => setUseAI(e.target.checked)} style={{ accentColor: 'var(--accent)' }} />
                Użyj AI przy zapisie
              </label>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Anuluj</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !title.trim()}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (isEdit ? 'Zapisz' : 'Dodaj zadanie')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Category modal ────────────────────────────────────────────────────────────
const COLORS = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ef4444','#ec4899','#8b5cf6','#14b8a6','#f97316','#64748b']

function CategoryModal({ onSave, onClose }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError('')
    try {
      await onSave(name.trim(), color)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h2>Nowa kategoria</h2>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-group">
            <label>Nazwa</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="np. Praca" autoFocus />
          </div>
          <div className="form-group">
            <label>Kolor</label>
            <div className="color-row">
              {COLORS.map(c => (
                <div
                  key={c}
                  className={`color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Anuluj</button>
          <button className="btn btn-primary" onClick={submit} disabled={loading || !name.trim()}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Utwórz'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Task card ─────────────────────────────────────────────────────────────────
function getDueDateStatus(dueDate) {
  if (!dueDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = (due - today) / (1000 * 60 * 60 * 24)
  if (diff < 0) return 'overdue'
  if (diff <= 3) return 'soon'
  return 'ok'
}

function TaskCard({ task, onEdit, onDelete, onToggle }) {
  const priorityLabel = { low: 'Niski', medium: 'Średni', high: 'Wysoki' }
  const date = new Date(task.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
  const dueDateStatus = getDueDateStatus(task.due_date)
  const dueDateLabel = task.due_date
    ? new Date(task.due_date).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
    : null

  return (
    <div className={`task-card ${task.status === 'done' ? 'done' : ''}`} onClick={() => onEdit(task)}>
      <div
        className={`task-check ${task.status === 'done' ? 'checked' : ''}`}
        onClick={e => { e.stopPropagation(); onToggle(task) }}
      />
      <div className="task-body">
        <div className="task-title">{task.title}</div>
        {task.description && <div className="task-desc">{task.description}</div>}
        <div className="task-meta">
          <span className={`badge badge-priority-${task.priority}`}>{priorityLabel[task.priority]}</span>
          {task.category && (
            <span className="badge badge-cat" style={{ background: task.category.color ? task.category.color + '33' : undefined }}>
              {task.category.color && <span style={{ width: 6, height: 6, borderRadius: '50%', background: task.category.color, display: 'inline-block', marginRight: 4 }} />}
              {task.category.name}
            </span>
          )}
          {task.tags?.map(t => <span key={t} className="badge badge-tag">#{t}</span>)}
          {task.ai_override && <span className="ai-badge">✦ AI</span>}
          {dueDateLabel && (
            <span className={`due-date due-${dueDateStatus}`}>
              {dueDateStatus === 'overdue' ? '⚠ ' : '⏰ '}{dueDateLabel}
            </span>
          )}
          <span className="task-date">{date}</span>
        </div>
      </div>
      <div className="task-actions">
        <button className="icon-btn" onClick={e => { e.stopPropagation(); onEdit(task) }} title="Edytuj">✎</button>
        <button className="icon-btn danger" onClick={e => { e.stopPropagation(); onDelete(task.id) }} title="Usuń">🗑</button>
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ userEmail, onLogout }) {
  const [tasks, setTasks] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { type: 'task', task } | { type: 'category' }
  const [filters, setFilters] = useState({ status: '', priority: '', category_id: '', tag: '' })
  const [tagSearch, setTagSearch] = useState('')
  const [view, setView] = useState('all') // 'all' | 'overdue' | 'upcoming'
  const toast = useToast()

  const loadTasks = useCallback(async () => {
    try {
      let data
      if (view === 'overdue') {
        data = await api.getTasks({ ...filters, overdue: true })
      } else if (view === 'upcoming') {
        data = await api.getUpcomingTasks(7)
      } else {
        data = await api.getTasks(filters)
      }
      setTasks(data)
      // Extract categories from tasks
      const cats = {}
      data.forEach(t => { if (t.category) cats[t.category.id] = t.category })
      setCategories(prev => {
        const merged = { ...prev.reduce((a, c) => ({ ...a, [c.id]: c }), {}), ...cats }
        return Object.values(merged)
      })
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [filters, view])

  useEffect(() => { loadTasks() }, [loadTasks])

  async function handleSaveTask(id, payload, tags, useAI) {
    try {
      if (id) {
        await api.updateTask(id, {
          title: payload.title,
          description: payload.description,
          priority: payload.priority,
          status: payload.status,
          category_id: payload.category_id,
          due_date: payload.due_date,
        })
        // Sync tags
        const task = tasks.find(t => t.id === id)
        const oldTags = task?.tags ?? []
        for (const t of tags) if (!oldTags.includes(t)) await api.addTag(id, t)
        for (const t of oldTags) if (!tags.includes(t)) await api.removeTag(id, t)
        toast('Zadanie zaktualizowane', 'success')
      } else {
        await api.createTask(payload, useAI)
        toast('Zadanie dodane', 'success')
      }
      setModal(null)
      loadTasks()
    } catch (err) {
      throw err
    }
  }

  async function handleDelete(id) {
    if (!confirm('Usunąć to zadanie?')) return
    try {
      await api.deleteTask(id)
      toast('Zadanie usunięte', 'success')
      loadTasks()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function handleToggle(task) {
    try {
      await api.updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })
      loadTasks()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function handleSaveCategory(name, color) {
    const cat = await api.createCategory(name, color)
    setCategories(prev => [...prev, cat])
    toast('Kategoria dodana', 'success')
  }

  async function handleDeleteCategory(id) {
    if (!confirm('Usunąć kategorię?')) return
    try {
      await api.deleteCategory(id)
      setCategories(prev => prev.filter(c => c.id !== id))
      toast('Kategoria usunięta', 'success')
      loadTasks()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const todo = tasks.filter(t => t.status === 'todo')
  const done = tasks.filter(t => t.status === 'done')
  const high = tasks.filter(t => t.priority === 'high' && t.status === 'todo')
  const overdue = tasks.filter(t => t.status === 'todo' && getDueDateStatus(t.due_date) === 'overdue')

  function setFilter(key, val) {
    setFilters(f => ({ ...f, [key]: val }))
  }

  return (
    <div className="app-layout">
      <nav className="topbar">
        <span className="topbar-brand">✓ TodoAI</span>
        <div className="topbar-right">
          <span className="topbar-user">{userEmail}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => { api.logout(); onLogout() }}>Wyloguj</button>
        </div>
      </nav>

      <div className="main-content">
        {/* Stats */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-value">{tasks.length}</div>
            <div className="stat-label">Wszystkich</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-h)' }}>{todo.length}</div>
            <div className="stat-label">Do zrobienia</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--green)' }}>{done.length}</div>
            <div className="stat-label">Ukończone</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: 'var(--red)' }}>{high.length}</div>
            <div className="stat-label">Pilne</div>
          </div>
          <div className="stat-card" style={{ cursor: overdue.length ? 'pointer' : 'default' }} onClick={() => overdue.length && setView(v => v === 'overdue' ? 'all' : 'overdue')}>
            <div className="stat-value" style={{ color: 'var(--yellow)' }}>{overdue.length}</div>
            <div className="stat-label">Przeterminowane</div>
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <div className="panel">
            <div className="panel-head">
              <h3>Kategorie</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal({ type: 'category' })}>+ Dodaj</button>
            </div>
            <div className="cat-list">
              <div
                className={`cat-chip ${filters.category_id === '' ? 'active' : ''}`}
                onClick={() => setFilter('category_id', '')}
              >
                Wszystkie
              </div>
              {categories.map(c => (
                <div
                  key={c.id}
                  className={`cat-chip ${filters.category_id == c.id ? 'active' : ''}`}
                  onClick={() => setFilter('category_id', filters.category_id == c.id ? '' : c.id)}
                >
                  {c.color && <span className="cat-dot" style={{ background: c.color }} />}
                  {c.name}
                  <button className="cat-del" onClick={e => { e.stopPropagation(); handleDeleteCategory(c.id) }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View filter */}
        <div className="view-filters">
          <button className={`view-chip ${view === 'all' ? 'active' : ''}`} onClick={() => setView('all')}>Wszystkie</button>
          <button className={`view-chip ${view === 'overdue' ? 'active' : ''}`} onClick={() => setView('overdue')}>⚠ Przeterminowane</button>
          <button className={`view-chip ${view === 'upcoming' ? 'active' : ''}`} onClick={() => setView('upcoming')}>⏰ Nadchodzące (7 dni)</button>
        </div>

        {/* Toolbar */}
        <div className="toolbar">
          <div className="toolbar-filters">
            <select className="filter-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="">Wszystkie statusy</option>
              <option value="todo">Do zrobienia</option>
              <option value="done">Ukończone</option>
            </select>
            <select className="filter-select" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
              <option value="">Wszystkie priorytety</option>
              <option value="high">Wysoki</option>
              <option value="medium">Średni</option>
              <option value="low">Niski</option>
            </select>
            <input
              className="search-input"
              placeholder="Filtruj po tagu…"
              value={tagSearch}
              onChange={e => { setTagSearch(e.target.value); setFilter('tag', e.target.value) }}
            />
          </div>
          <button className="btn btn-primary" onClick={() => setModal({ type: 'task', task: null })}>
            + Nowe zadanie
          </button>
          {categories.length === 0 && (
            <button className="btn btn-secondary" onClick={() => setModal({ type: 'category' })}>
              + Kategoria
            </button>
          )}
        </div>

        {/* Task list */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>Brak zadań</h3>
            <p>Dodaj pierwsze zadanie klikając przycisk powyżej</p>
          </div>
        ) : (
          <>
            {todo.length > 0 && (
              <>
                <div className="section-head">
                  <h2>Do zrobienia ({todo.length})</h2>
                </div>
                <div className="task-grid" style={{ marginBottom: 24 }}>
                  {todo.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onEdit={task => setModal({ type: 'task', task })}
                      onDelete={handleDelete}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </>
            )}
            {done.length > 0 && (
              <>
                <div className="section-head">
                  <h2>Ukończone ({done.length})</h2>
                </div>
                <div className="task-grid">
                  {done.map(t => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      onEdit={task => setModal({ type: 'task', task })}
                      onDelete={handleDelete}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {modal?.type === 'task' && (
        <TaskModal
          task={modal.task}
          categories={categories}
          onSave={handleSaveTask}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'category' && (
        <CategoryModal
          onSave={handleSaveCategory}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

// ── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => {
    const token = localStorage.getItem('token')
    const email = localStorage.getItem('userEmail')
    return token ? { email } : null
  })

  function handleLogin(email) {
    localStorage.setItem('userEmail', email)
    setUser({ email })
  }

  function handleLogout() {
    localStorage.removeItem('userEmail')
    setUser(null)
  }

  return (
    <ToastProvider>
      {user
        ? <Dashboard userEmail={user.email} onLogout={handleLogout} />
        : <AuthPage onLogin={handleLogin} />
      }
    </ToastProvider>
  )
}
