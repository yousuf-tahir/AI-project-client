import React, { useEffect, useMemo, useState } from 'react';
import 'material-icons/iconfont/material-icons.css';
import '../styles/candidate.css';

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:8000';

const getAuthToken = () => {
  try { return localStorage.getItem('token') || sessionStorage.getItem('token'); } catch (_) { return null; }
};

const apiRequest = async (path, { method = 'GET', body } = {}) => {
  const token = getAuthToken();
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') || '';
  return type.includes('application/json') ? res.json() : res.text();
};

const ROLES = ['Admin', 'HR', 'Candidate'];
const STATUSES = ['Success', 'Failed', 'Error'];

const SystemLogs = ({ onNavigate }) => {
  const go = (path) => { if (typeof onNavigate === 'function') onNavigate(path); else { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); } };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('All');
  const [status, setStatus] = useState('All');
  const [sort, setSort] = useState('date_desc');

  const limit = 10;

  const load = async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (query.trim()) params.set('q', query.trim());
      if (role !== 'All') params.set('role', role);
      if (status !== 'All') params.set('status', status);
      params.set('sort_by', sort);
      const data = await apiRequest(`/api/system-logs?${params.toString()}`);
      setItems(Array.isArray(data) ? data : []);
      setHasMore(Array.isArray(data) && data.length === limit);
    } catch (e) {
      setError('Failed to load logs');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, role, status, sort]);
  useEffect(() => { setPage(1); load(); /* eslint-disable-next-line */ }, [query]);

  const clearLogs = async () => {
    const ok = window.confirm('Clear all logs? This cannot be undone.');
    if (!ok) return;
    try { await apiRequest('/api/system-logs', { method: 'DELETE' }); setItems([]); setHasMore(false); }
    catch (e) { setError('Failed to clear logs'); }
  };

  const badgeClass = (status) => {
    switch (status) {
      case 'Success': return 'bg-green-100 text-green-700';
      case 'Failed': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-700';
    }
  };

  // Active nav helper
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isActive = (p) => currentPath === p;

  return (
    <div className="candidate-dashboard-layout admin-container">
      <aside className="candidate-sidebar">
        <div className="sidebar-header">
          <span className="app-logo-candidate">Admin</span> Panel
        </div>
        <nav className="sidebar-nav">
          <ul>
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

      <div className="candidate-main-content">
        {/* Scoped styles for main content only (sidebar comes from candidate.css) */}
        <style>{`
          .admin-container { min-height: 100vh; }
          .main-content { padding: 24px; overflow-x: hidden; max-width: 1120px; margin: 0 auto; }
          .admin-header { display:flex; justify-content: space-between; align-items: center; background:#fff; padding:18px 20px; border-radius:10px; margin-bottom:20px; box-shadow:0 2px 10px rgba(0,0,0,0.06); }
          .header-title h1 { font-size:22px; color:#111827; }
          .user-profile { display:flex; align-items:center; gap:10px; }
          .user-profile .user-name { font-weight:600; color:#374151; }
          .profile-pic { background:#3b82f6; color:#fff; width:35px; height:35px; border-radius:50%; display:flex; justify-content:center; align-items:center; }

          /* Controls */
          .toolbar { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #f1f5f9; padding:18px; margin-bottom:20px; }
          .toolbar-row { display:flex; flex-direction:column; gap:12px; }
          @media (min-width: 768px) { .toolbar-row { flex-direction:row; align-items:center; } }
          .search-input, .select-input { width:100%; border:1px solid #d1d5db; border-radius:10px; height:40px; padding:0 12px; font-size:14px; color:#111827; outline:none; transition: box-shadow .15s, border-color .15s; background:#fff; }
          .search-input::placeholder { color:#9ca3af; }
          .search-input:focus, .select-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.2); }
          .toolbar-actions { display:flex; gap:10px; align-items:center; }
          .btn { display:inline-flex; align-items:center; gap:8px; padding:10px 14px; font-size:13px; font-weight:700; border-radius:10px; border:1px solid transparent; cursor:pointer; transition: background .15s, color .15s; }
          .btn-red { background:#dc2626; color:#fff; }
          .btn-red:hover { background:#b91c1c; }

          /* Table */
          .card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #f1f5f9; overflow:hidden; }
          .table-wrap { overflow:auto; }
          table { width:100%; border-collapse: separate; border-spacing: 0; }
          thead { background:#f9fafb; }
          th, td { padding:12px 14px; text-align:left; border-bottom:1px solid #eef2f7; font-size:14px; }
          th { color:#4b5563; font-weight:700; font-size:12px; text-transform: uppercase; letter-spacing:.02em; }
          tbody tr:hover { background:#f8fafc; }
          .badge { display:inline-flex; align-items:center; padding:4px 8px; border-radius:999px; font-size:12px; font-weight:700; }
          .b-green { background:#ecfdf5; color:#047857; }
          .b-yellow { background:#fffbeb; color:#b45309; }
          .b-red { background:#fef2f2; color:#b91c1c; }

          /* Pagination */
          .pagination { display:flex; align-items:center; justify-content:space-between; margin-top:14px; }
          .page-info { color:#6b7280; font-size:13px; }
          .pager { display:flex; gap:8px; }
          .pager button { padding:8px 12px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; cursor:pointer; font-size:13px; }
          .pager button:disabled { opacity:.6; cursor:not-allowed; }

          .alert { border:1px solid #fecaca; background:#fef2f2; color:#b91c1c; padding:12px 14px; border-radius:10px; margin-top:14px; }
        `}</style>

        <main className="main-content">
          {/* Header */}
          <header className="admin-header">
            <div className="header-title"><h1>System Logs</h1></div>
            <div className="user-profile">
              <span className="user-name">Admin</span>
              <div className="profile-pic"><i className="fas fa-user"></i></div>
            </div>
          </header>

          {/* Controls */}
          <div className="toolbar">
            <div className="toolbar-row">
              <div style={{ flex: 1 }}>
                <input type="text" className="search-input" placeholder="Search by user, role, or action" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div className="toolbar-actions">
                <select className="select-input" value={role} onChange={(e) => setRole(e.target.value)}>
                  <option>All</option>
                  {ROLES.map((r) => (<option key={r}>{r}</option>))}
                </select>
                <select className="select-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option>All</option>
                  {STATUSES.map((s) => (<option key={s}>{s}</option>))}
                </select>
                <select className="select-input" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="status_asc">Status A→Z</option>
                  <option value="status_desc">Status Z→A</option>
                </select>
                <button className="btn btn-red" onClick={clearLogs}>
                  <span className="material-icons-outlined" style={{ fontSize:16 }}>delete_sweep</span>
                  Clear Logs
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
                    <th>Log ID</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Status</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td style={{ padding:'22px', textAlign:'center', color:'#6b7280' }} colSpan={6}>Loading...</td></tr>
                  ) : items.length === 0 ? (
                    <tr><td style={{ padding:'22px', textAlign:'center', color:'#6b7280' }} colSpan={6}>No logs found</td></tr>
                  ) : (
                    items.map((log) => (
                      <tr key={log.id}>
                        <td style={{ color:'#374151' }}>{log.id}</td>
                        <td style={{ color:'#111827' }}>{log.user || '-'}</td>
                        <td style={{ color:'#374151' }}>{log.role}</td>
                        <td style={{ color:'#374151' }}>{log.action}</td>
                        <td>
                          <span className={`badge ${log.status === 'Success' ? 'b-green' : log.status === 'Failed' ? 'b-yellow' : 'b-red'}`}>{log.status}</span>
                        </td>
                        <td style={{ color:'#374151' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="pagination">
            <div className="page-info">Page {page}</div>
            <div className="pager">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
              <button disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>

          {error && (<div className="alert">{error}</div>)}
        </main>
      </div>
    </div>
  );
};

export default SystemLogs;
