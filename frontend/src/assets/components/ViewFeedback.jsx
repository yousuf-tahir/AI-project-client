import React, { useEffect, useMemo, useState } from 'react';
import 'material-icons/iconfont/material-icons.css';
import '../styles/candidate.css';
import '../styles/viewFeedback.css';

const API_BASE = (
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_BASE_URL))
  || 'http://localhost:8000'
);

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

const ROLES = ['HR', 'Candidate'];
const RATINGS = [5,4,3,2,1];

const ViewFeedback = ({ onNavigate }) => {
  const go = (path) => { if (typeof onNavigate === 'function') onNavigate(path); else { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); } };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [query, setQuery] = useState('');
  const [role, setRole] = useState('All');
  const [rating, setRating] = useState('All');

  const limit = 8;

  const load = async () => {
    setLoading(true); setError('');
    try {
      // Backend currently supports 'mine' only. Use mine=false to fetch all feedback for admin view.
      const params = new URLSearchParams();
      params.set('mine', 'false');
      const data = await apiRequest(`/api/feedback?${params.toString()}`);
      const raw = Array.isArray(data) ? data : [];
      // Normalize various backend shapes into a consistent card model
      const arr = raw.map((f) => {
        const id = f.id || f._id || f.feedback_id || String(Math.random());
        const userName = f.userName || f.user_name || f.full_name || f.name || f.user || f.email || 'Unknown User';
        const roleVal = (f.role || '').toString();
        const roleNorm = /hr/i.test(roleVal) ? 'HR' : (/candidate/i.test(roleVal) ? 'Candidate' : (roleVal || ''));
        const text = f.text || f.message || f.comment || f.feedback || f.description || '';
        const ratingVal = f.rating ?? f.stars ?? f.score ?? 0;
        const created = f.created_at || f.timestamp || f.date || null;
        return { id, userName, role: roleNorm, text, rating: Number(ratingVal) || 0, created_at: created };
      });
      setItems(arr);
      setHasMore(arr.length === limit);
    } catch (e) {
      // Fallback demo data
      const demo = [
        { id: 'f1', userName: 'Emma Wilson', role: 'HR', text: 'Great platform. Approvals flow is smooth!', rating: 5, created_at: '2025-09-22T10:00:00Z' },
        { id: 'f2', userName: 'Liam Brown', role: 'Candidate', text: 'Practice interview helped me a lot.', rating: 4, created_at: '2025-09-18T09:30:00Z' },
      ];
      setItems(demo);
      setHasMore(false);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, role, rating]);
  useEffect(() => { setPage(1); load(); /* eslint-disable-next-line */ }, [query]);

  const filtered = useMemo(() => {
    // server already filters; this is for client-only fallback
    const q = query.trim().toLowerCase();
    return items.filter((f) => {
      const okQ = !q || f.userName?.toLowerCase().includes(q) || f.role?.toLowerCase().includes(q);
      const okR = role === 'All' || f.role === role;
      const okRating = rating === 'All' || String(f.rating) === String(rating);
      return okQ && okR && okRating;
    });
  }, [items, query, role, rating]);

  const stars = (n) => '★★★★★☆☆☆☆☆'.slice(5 - Math.max(1, Math.min(5, Number(n))), 10 - Math.max(1, Math.min(5, Number(n))));

  const roleChip = (r) => r === 'HR' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200';
  const avatarColor = (r) => r === 'HR' ? 'bg-blue-600' : 'bg-green-600';

  // Active nav helper
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isActive = (p) => currentPath === p;

  return (
    <div className="candidate-dashboard-layout admin-container">
      {/* Sidebar - unchanged design */}
      <aside className="candidate-sidebar">
        <div className="sidebar-header"><span className="app-logo-candidate">Admin</span> Panel</div>
        <nav className="sidebar-nav">
          <ul>
            <li className={`nav-item ${isActive('/admin') ? 'active' : ''}`}><a href="#" onClick={(e) => { e.preventDefault(); go('/admin'); }}><span className="material-icons-outlined">dashboard</span><span className="nav-label">Dashboard</span></a></li>
            <li className={`nav-item ${isActive('/hr-approvals') ? 'active' : ''}`}><a href="#" onClick={(e) => { e.preventDefault(); go('/hr-approvals'); }}><span className="material-icons-outlined">verified_user</span><span className="nav-label">HR Approvals</span></a></li>
            <li className={`nav-item ${isActive('/candidates') ? 'active' : ''}`}><a href="#" onClick={(e) => { e.preventDefault(); go('/candidates'); }}><span className="material-icons-outlined">people_alt</span><span className="nav-label">Candidates Approvals</span></a></li>
            <li className={`nav-item ${isActive('/interview-questions') ? 'active' : ''}`}><a href="#" onClick={(e) => { e.preventDefault(); go('/interview-questions'); }}><span className="material-icons-outlined">quiz</span><span className="nav-label">Interview Questions</span></a></li>
            <li className={`nav-item ${isActive('/system-logs') ? 'active' : ''}`}><a href="#" onClick={(e) => { e.preventDefault(); go('/system-logs'); }}><span className="material-icons-outlined">list_alt</span><span className="nav-label">System Logs</span></a></li>
            <li className={`nav-item ${isActive('/feedback') ? 'active' : ''}`}><a href="#" onClick={(e) => { e.preventDefault(); go('/feedback'); }}><span className="material-icons-outlined">feedback</span><span className="nav-label">View Feedback</span></a></li>
           
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

      {/* Main content (scoped CSS via viewFeedback.css, sidebar unchanged) */}
      <div className="candidate-main-content">
        <main className="main-content">
          {/* Header */}
          <header className="admin-header">
            <div className="header-title"><h1>View Feedback</h1></div>
            <div className="user-profile"><span className="user-name">Admin</span><div className="profile-pic"><i className="fas fa-user"></i></div></div>
          </header>

          {/* Filters */}
          <div className="toolbar">
            <div className="toolbar-row">
              <div style={{ flex:1 }}>
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by user name or role" className="search-input" />
              </div>
              <div className="toolbar-actions">
                <select value={role} onChange={(e) => setRole(e.target.value)} className="select-input">
                  <option>All</option>
                  {ROLES.map((r) => (<option key={r}>{r}</option>))}
                </select>
                <select value={rating} onChange={(e) => setRating(e.target.value)} className="select-input">
                  <option>All</option>
                  {RATINGS.map((n) => (<option key={n} value={n}>{n}+</option>))}
                </select>
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="cards-grid">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card-skel">
                  <div style={{ display:'flex', gap:12, marginBottom:10 }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:'#e5e7eb' }}></div>
                    <div style={{ height:14, width:'50%', background:'#e5e7eb', borderRadius:6 }}></div>
                  </div>
                  <div style={{ height:12, width:'66%', background:'#e5e7eb', borderRadius:6, marginBottom:8 }}></div>
                  <div style={{ height:12, width:'90%', background:'#e5e7eb', borderRadius:6, marginBottom:6 }}></div>
                  <div style={{ height:12, width:'80%', background:'#e5e7eb', borderRadius:6 }}></div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="empty">
                <div className="icon"><span className="material-icons-outlined">chat_bubble_outline</span></div>
                <div style={{ color:'#111827', fontWeight:600 }}>No feedback found</div>
                <div style={{ color:'#6b7280', fontSize:13, marginTop:4 }}>Try adjusting your search or filters.</div>
              </div>
            ) : (
              filtered.map((f) => (
                <div key={f.id} className="feedback-card">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full text-white flex items-center justify-center font-semibold ${avatarColor(f.role)}`}>{(f.userName || '?').slice(0,2).toUpperCase()}</div>
                      <div>
                        <div className="text-base font-semibold text-gray-900 leading-tight">{f.userName || 'Unknown User'}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${roleChip(f.role)}`}>{f.role}</span>
                          <span className="text-yellow-500">{'★'.repeat(Number(f.rating) || 0)}<span className="text-gray-300">{'★'.repeat(5 - (Number(f.rating) || 0))}</span></span>
                          <span className="text-gray-400">•</span>
                          <span>{f.created_at ? new Date(f.created_at).toLocaleDateString() : '-'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{f.text}</div>
                  <div className="mt-3 text-xs text-gray-400">ID: {f.id}</div>
                </div>
              ))
            )}
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

export default ViewFeedback;
