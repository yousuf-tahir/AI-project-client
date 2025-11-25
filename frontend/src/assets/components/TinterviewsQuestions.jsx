import React, { useEffect, useMemo, useState } from 'react';
import 'material-icons/iconfont/material-icons.css';
import '../styles/candidate.css';

// Backend base URL
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:8000';

const getAuthToken = () => {
  try {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  } catch (_) {
    return null;
  }
};

const apiRequest = async (path, { method = 'GET', body } = {}) => {
  const token = getAuthToken();
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await res.json();
  return await res.text();
};

const defaultQuestion = { id: '', question_text: '', category: '', difficulty: 'Easy', question_type: 'technical' };

const TinterviewsQuestions = ({ onNavigate }) => {
  const go = (path) => {
    if (typeof onNavigate === 'function') onNavigate(path);
    else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState(defaultQuestion);

  // Load page
  const loadPage = async (p = 1, l = limit) => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/interview-questions?limit=${l}&page=${p}`);
      setItems(data || []);
      // Heuristic: if fewer than limit returned, no more pages
      setHasMore(Array.isArray(data) && data.length === l);
    } catch (e) {
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  // For search, fetch a larger batch client-side and filter
  const loadForSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest(`/api/interview-questions?limit=1000&page=1`);
      setItems(data || []);
      setHasMore(false);
      setPage(1);
    } catch (e) {
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage(page, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  useEffect(() => {
    const q = query.trim();
    if (q) loadForSearch();
    else loadPage(1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.question_text?.toLowerCase().includes(q) ||
      it.category?.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Add new
  const handleCreate = async (payload) => {
    setError('');
    try {
      const created = await apiRequest('/api/interview-questions/', { method: 'POST', body: payload });
      // If we are in search mode, append to list; else, reload page
      if (query.trim()) {
        setItems((prev) => [created, ...prev]);
      } else {
        loadPage(page, limit);
      }
      setShowAdd(false);
    } catch (e) {
      setError('Failed to create question');
    }
  };

  // Update
  const handleUpdate = async (id, payload) => {
    setError('');
    try {
      const updated = await apiRequest(`/api/interview-questions/${id}`, { method: 'PUT', body: payload });
      setItems((prev) => prev.map((it) => (it.id === id || it._id === id ? updated : it)));
      setShowEdit(false);
    } catch (e) {
      setError('Failed to update question');
    }
  };

  // Delete
  const handleDelete = async (id) => {
    const ok = window.confirm('Delete this question?');
    if (!ok) return;
    const snapshot = items;
    setItems((prev) => prev.filter((x) => x.id !== id && x._id !== id));
    try {
      await apiRequest(`/api/interview-questions/${id}`, { method: 'DELETE' });
    } catch (e) {
      setItems(snapshot);
      setError('Failed to delete question');
    }
  };

  const openEdit = (q) => {
    setEditing({
      id: q.id || q._id,
      question_text: q.question_text || '',
      category: q.category || '',
      difficulty: q.difficulty || 'Easy',
      question_type: q.question_type || 'technical',
    });
    setShowEdit(true);
  };

  const QuestionForm = ({ initial, onSubmit, onCancel }) => {
    const [form, setForm] = useState({ ...initial });
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">{initial?.id ? 'Edit Question' : 'Add New Question'}</h3>
            <button className="text-gray-500 hover:text-gray-700" onClick={onCancel}>
              <span className="material-icons-outlined">close</span>
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
              <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                value={form.question_text}
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                >
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.question_type}
                  onChange={(e) => setForm({ ...form, question_type: e.target.value })}
                >
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="hr">HR</option>
                  <option value="situational">Situational</option>
                </select>
              </div>
            </div>
          </div>
          <div className="px-5 py-3 border-t flex items-center justify-end gap-2">
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg" onClick={onCancel}>Cancel</button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              onClick={() => onSubmit(form)}
            >{initial?.id ? 'Update' : 'Create'}</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="candidate-dashboard-layout admin-container">
      {/* Sidebar (reuse same design) */}
      <aside className="candidate-sidebar">
        <div className="sidebar-header"><span className="app-logo-candidate">Admin</span> Panel</div>
        <nav className="sidebar-nav">
          <ul>
            {/* Active nav helper */}
            {(() => { const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''; const isActive = (p) => currentPath === p;
            return (
            <>
            <li className={`nav-item ${isActive('/admin') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/admin'); }}>
                <span className="material-icons-outlined">dashboard</span>
                <span className="nav-label">Dashboard</span>
              </a>
            </li>
            <li className={`nav-item ${isActive('/hr-approvals') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/hr-approvals'); }}>
                <span className="material-icons-outlined">verified_user</span>
                <span className="nav-label">HR Approvals</span>
              </a>
            </li>
            <li className={`nav-item ${isActive('/candidates') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/candidates'); }}>
                <span className="material-icons-outlined">people_alt</span>
                <span className="nav-label">Candidates Approvals</span>
              </a>
            </li>
            <li className={`nav-item ${isActive('/interview-questions') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/interview-questions'); }}>
                <span className="material-icons-outlined">quiz</span>
                <span className="nav-label">Interview Questions</span>
              </a>
            </li>
            <li className={`nav-item ${isActive('/system-logs') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/system-logs'); }}>
                <span className="material-icons-outlined">list_alt</span>
                <span className="nav-label">System Logs</span>
              </a>
            </li>
            <li className={`nav-item ${isActive('/feedback') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/feedback'); }}>
                <span className="material-icons-outlined">feedback</span>
                <span className="nav-label">View Feedback</span>
              </a>
            </li>
            </> ); })()}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <ul>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/settings'); }}>
                <span className="material-icons-outlined">settings</span>
                <span className="nav-label">Settings</span>
              </a>
            </li>
            <li className="nav-item">
              <a
                href="#"
                id="logout-link"
                className="logout-link"
                onClick={(e) => {
                  e.preventDefault();
                  const ok = window.confirm('Are you sure you want to logout?');
                  if (!ok) return;
                  try {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    sessionStorage.removeItem('token');
                  } catch (_) {}
                  window.location.replace('/');
                }}
              >
                <span className="material-icons-outlined">logout</span>
                <span className="nav-label">Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <div className="candidate-main-content">
        {/* Scoped styles for main content only (sidebar stays from candidate.css) */}
        <style>{`
          .admin-container { min-height: 100vh; }
          .main-content { padding: 24px; overflow-x: hidden; max-width: 1120px; margin: 0 auto; }
          .admin-header { display:flex; justify-content: space-between; align-items: center; background:#fff; padding:18px 20px; border-radius:10px; margin-bottom:20px; box-shadow:0 2px 10px rgba(0,0,0,0.06); }
          .header-title h1 { font-size:22px; color:#111827; }
          .user-profile { display:flex; align-items:center; gap:10px; }
          .user-profile .user-name { font-weight:600; color:#374151; }
          .profile-pic { background:#3b82f6; color:#fff; width:35px; height:35px; border-radius:50%; display:flex; justify-content:center; align-items:center; }

          /* Toolbar */
          .toolbar { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #f1f5f9; padding:18px; margin-bottom:20px; }
          .toolbar-row { display:flex; flex-direction:column; gap:12px; }
          @media (min-width: 768px) { .toolbar-row { flex-direction:row; align-items:center; } }
          .search-input, .select-input { width:100%; border:1px solid #d1d5db; border-radius:10px; height:40px; padding:0 12px; font-size:14px; color:#111827; outline:none; transition: box-shadow .15s, border-color .15s; background:#fff; }
          .search-input::placeholder { color:#9ca3af; }
          .search-input:focus, .select-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.2); }
          .toolbar-actions { display:flex; align-items:center; gap:10px; }
          .btn { display:inline-flex; align-items:center; gap:8px; padding:10px 14px; font-size:13px; font-weight:700; border-radius:10px; border:none; cursor:pointer; transition: background .15s, color .15s, box-shadow .15s; }
          .btn-blue { background:#2563eb; color:#fff; }
          .btn-blue:hover { background:#1d4ed8; }
          .btn-gray { background:#e5e7eb; color:#111827; }
          .btn-gray:hover { background:#d1d5db; }

          /* Table */
          .card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #f1f5f9; overflow:hidden; }
          .table-wrap { overflow:auto; }
          table { width:100%; border-collapse: separate; border-spacing: 0; }
          thead { background:#f9fafb; }
          th, td { padding:12px 14px; text-align:left; border-bottom:1px solid #eef2f7; font-size:14px; }
          th { color:#4b5563; font-weight:700; font-size:12px; text-transform: uppercase; letter-spacing:.02em; }
          tbody tr:hover { background:#f8fafc; }
          .badge { font-size:12px; font-weight:700; padding:4px 8px; border-radius:999px; display:inline-block; border:1px solid transparent; white-space:nowrap; }
          .b-green { background:#ecfdf5; color:#047857; border-color:#d1fae5; }
          .b-yellow { background:#fffbeb; color:#b45309; border-color:#fef3c7; }
          .b-red { background:#fef2f2; color:#b91c1c; border-color:#fee2e2; }
          .actions { display:inline-flex; gap:8px; }
          .btn-sm { padding:7px 10px; font-size:12px; border-radius:8px; font-weight:700; }
          .btn-red { background:#dc2626; color:#fff; }
          .btn-red:hover { background:#b91c1c; }

          /* Pagination */
          .pagination { display:flex; align-items:center; justify-content:space-between; margin-top:14px; }
          .page-info { color:#6b7280; font-size:13px; }
          .pager { display:flex; gap:8px; }
          .pager button { padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; cursor:pointer; font-size:13px; }
          .pager button:disabled { opacity:.6; cursor:not-allowed; }

          /* Alerts */
          .alert { border:1px solid #fecaca; background:#fef2f2; color:#b91c1c; padding:12px 14px; border-radius:10px; }

          /* Modal */
          .modal { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:1000; padding:16px; }
          .modal-card { background:#fff; border-radius:12px; width:min(720px, 100%); box-shadow:0 10px 30px rgba(0,0,0,0.15); }
          .modal-head { padding:14px 16px; border-bottom:1px solid #eef2f7; display:flex; align-items:center; justify-content:space-between; }
          .modal-title { font-size:16px; font-weight:700; }
          .modal-body { padding:16px; }
          .modal-grid { display:grid; grid-template-columns:1fr; gap:12px; }
          @media (min-width: 768px) { .modal-grid { grid-template-columns: repeat(3, 1fr); } }
          .modal-grid .full { grid-column: 1 / -1; }
          .label { display:block; font-size:13px; color:#374151; font-weight:600; margin-bottom:6px; }
          .input, .textarea, .select { width:100%; border:1px solid #d1d5db; border-radius:10px; padding:10px 12px; font-size:14px; outline:none; }
          .textarea { min-height: 100px; resize: vertical; }
          .input:focus, .textarea:focus, .select:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.2); }
          .modal-foot { padding:12px 16px; border-top:1px solid #eef2f7; display:flex; justify-content:flex-end; gap:8px; }
        `}</style>

        <main className="main-content">
          {/* Header */}
          <header className="admin-header">
            <div className="header-title"><h1>Interview Questions</h1></div>
            <div className="user-profile">
              <span className="user-name">Admin</span>
              <div className="profile-pic"><i className="fas fa-user"></i></div>
            </div>
          </header>

          {/* Toolbar */}
          <div className="toolbar">
            <div className="toolbar-row">
              <div style={{ flex: 1 }}>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by text or category" className="search-input" />
              </div>
              <div className="toolbar-actions">
                <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value) || 10)} className="select-input">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <button className="btn btn-blue" onClick={() => { setShowAdd(true); }}>
                  <span className="material-icons-outlined" style={{ fontSize:16 }}>add</span>
                  Add New Question
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Question Text</th>
                    <th>Category</th>
                    <th>Difficulty</th>
                    <th>Date Added</th>
                    <th style={{ textAlign:'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td style={{ padding:'22px', textAlign:'center', color:'#6b7280' }} colSpan={6}>Loading...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td style={{ padding:'22px', textAlign:'center', color:'#6b7280' }} colSpan={6}>No questions found</td></tr>
                  ) : (
                    filtered.map((q) => (
                      <tr key={q.id || q._id}>
                        <td style={{ color:'#374151' }}>{q.id || q._id}</td>
                        <td style={{ color:'#111827', maxWidth:'640px' }}>{q.question_text}</td>
                        <td style={{ color:'#374151' }}>{q.category}</td>
                        <td>
                          <span className={`badge ${q.difficulty === 'Easy' ? 'b-green' : q.difficulty === 'Medium' ? 'b-yellow' : 'b-red'}`}>{q.difficulty}</span>
                        </td>
                        <td style={{ color:'#374151' }}>{q.created_at ? new Date(q.created_at).toLocaleDateString() : '-'}</td>
                        <td style={{ textAlign:'right' }}>
                          <div className="actions">
                            <button className="btn btn-blue btn-sm" onClick={() => openEdit(q)}>
                              <span className="material-icons-outlined" style={{ fontSize:14 }}>edit</span>
                              Edit
                            </button>
                            <button className="btn btn-red btn-sm" onClick={() => handleDelete(q.id || q._id)}>
                              <span className="material-icons-outlined" style={{ fontSize:14 }}>delete</span>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {!query.trim() && (
            <div className="pagination">
              <div className="page-info">Page {page}</div>
              <div className="pager">
                <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
                <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Next</button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (<div className="alert" style={{ marginTop: '14px' }}>{error}</div>)}
        </main>
      </div>

      {/* Modals */}
      {showAdd && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-head">
              <div className="modal-title">Add New Question</div>
              <button className="btn btn-gray" onClick={() => setShowAdd(false)}><span className="material-icons-outlined" style={{ fontSize:16 }}>close</span></button>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="full">
                  <label className="label">Question Text</label>
                  <textarea className="textarea" value={editing.question_text || ''} onChange={(e) => setEditing({ ...editing, question_text: e.target.value })} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <input className="input" value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                </div>
                <div>
                  <label className="label">Difficulty</label>
                  <select className="select" value={editing.difficulty || 'Easy'} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="select" value={editing.question_type || 'technical'} onChange={(e) => setEditing({ ...editing, question_type: e.target.value })}>
                    <option value="technical">Technical</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="hr">HR</option>
                    <option value="situational">Situational</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-gray" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-blue" onClick={() => { handleCreate(editing); }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-head">
              <div className="modal-title">Edit Question</div>
              <button className="btn btn-gray" onClick={() => setShowEdit(false)}><span className="material-icons-outlined" style={{ fontSize:16 }}>close</span></button>
            </div>
            <div className="modal-body">
              <div className="modal-grid">
                <div className="full">
                  <label className="label">Question Text</label>
                  <textarea className="textarea" value={editing.question_text || ''} onChange={(e) => setEditing({ ...editing, question_text: e.target.value })} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <input className="input" value={editing.category || ''} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
                </div>
                <div>
                  <label className="label">Difficulty</label>
                  <select className="select" value={editing.difficulty || 'Easy'} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value })}>
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </div>
                <div>
                  <label className="label">Type</label>
                  <select className="select" value={editing.question_type || 'technical'} onChange={(e) => setEditing({ ...editing, question_type: e.target.value })}>
                    <option value="technical">Technical</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="hr">HR</option>
                    <option value="situational">Situational</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-gray" onClick={() => setShowEdit(false)}>Cancel</button>
              <button className="btn btn-blue" onClick={() => { handleUpdate(editing.id, editing); }}>Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TinterviewsQuestions;
