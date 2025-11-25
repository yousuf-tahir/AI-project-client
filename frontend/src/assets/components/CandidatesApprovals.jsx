import React, { useEffect, useMemo, useState } from 'react';
import 'material-icons/iconfont/material-icons.css';
import '../styles/candidate.css';

const STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

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

const CandidatesApprovals = ({ onNavigate }) => {
  const go = (path) => {
    if (typeof onNavigate === 'function') onNavigate(path);
    else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await apiRequest('/api/admin/candidates');
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setItems([
            { id: 'c1', name: 'Alex Martin', company: '', email: 'alex@example.com', joinedAt: '2025-06-10', status: STATUS.PENDING },
            { id: 'c2', name: 'Priya Singh', company: '', email: 'priya@example.com', joinedAt: '2025-03-22', status: STATUS.APPROVED },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const matchesQuery = !q ||
        it.name?.toLowerCase().includes(q) ||
        it.company?.toLowerCase().includes(q) ||
        it.email?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'All' || it.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [items, query, statusFilter]);

  const updateStatusOptimistic = (id, next) => setItems((prev) => prev.map((it) => it.id === id ? { ...it, status: next } : it));
  const removeItemOptimistic = (id) => setItems((prev) => prev.filter((it) => it.id !== id));

  const handleApprove = async (id) => {
    const prev = items.find((x) => x.id === id);
    updateStatusOptimistic(id, STATUS.APPROVED);
    try {
      await apiRequest(`/api/admin/candidates/${id}/approve`, { method: 'POST' });
    } catch (e) {
      if (prev) updateStatusOptimistic(id, prev.status);
      setError('Failed to approve candidate. Please try again.');
    }
  };

  // As requested for HR, Reject deletes the candidate record too
  const handleReject = async (id) => {
    const snapshot = items;
    removeItemOptimistic(id);
    try {
      await apiRequest(`/api/admin/candidates/${id}`, { method: 'DELETE' });
    } catch (e) {
      setItems(snapshot);
      setError('Failed to reject (remove) candidate. Please try again.');
    }
  };

  const getInitials = (name = '') => {
    const parts = String(name).trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    return (first + last).toUpperCase();
  };

  const badgeClass = (status) => {
    switch (status) {
      case STATUS.APPROVED: return 'badge badge-green';
      case STATUS.REJECTED: return 'badge badge-red';
      default: return 'badge badge-yellow';
    }
  };

  // Active nav helper
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isActive = (p) => currentPath === p;

  return (
    <div className="candidate-dashboard-layout admin-container">
      <aside className="candidate-sidebar">
        <div className="sidebar-header"><span className="app-logo-candidate">Admin</span> Panel</div>
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
            <li className="nav-item"><a href="#" id="logout-link" className="logout-link" onClick={(e) => { e.preventDefault(); const ok = window.confirm('Are you sure you want to logout?'); if (!ok) return; try { localStorage.removeItem('user'); localStorage.removeItem('token'); sessionStorage.removeItem('user'); sessionStorage.removeItem('token'); } catch(_){} window.location.replace('/'); }}><span className="material-icons-outlined">logout</span><span className="nav-label">Logout</span></a></li>
          </ul>
        </div>
      </aside>

      <div className="candidate-main-content">
        <style>{`
          .admin-container { min-height: 100vh; }
          .main-content { padding: 24px; overflow-x: hidden; max-width: 1120px; margin: 0 auto; }
          .admin-header { display:flex; justify-content: space-between; align-items: center; background:#fff; padding:18px 20px; border-radius:10px; margin-bottom:20px; box-shadow:0 2px 10px rgba(0,0,0,0.06); }
          .header-title h1 { font-size:22px; color:#111827; }
          .user-profile { display:flex; align-items:center; gap:10px; }
          .user-profile .user-name { font-weight:600; color:#374151; }
          .profile-pic { background:#3b82f6; color:#fff; width:35px; height:35px; border-radius:50%; display:flex; justify-content:center; align-items:center; }

          .filters-card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #f1f5f9; padding:18px; margin-bottom:20px; }
          .filters-row { display:flex; flex-direction:column; gap:12px; }
          @media (min-width: 768px) { .filters-row { flex-direction:row; align-items:center; } }
          .search-input, .select-input { width:100%; border:1px solid #d1d5db; border-radius:10px; height:40px; padding:0 12px; font-size:14px; color:#111827; outline:none; transition: box-shadow .15s, border-color .15s; background:#fff; }
          .search-input::placeholder { color:#9ca3af; }
          .search-input:focus, .select-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.2); }
          .inline-stats { display:flex; flex-wrap:wrap; gap:14px; font-size:13px; color:#6b7280; margin-top:10px; }
          .inline-stats strong { color:#111827; }

          .hr-grid { display:grid; grid-template-columns: 1fr; gap:18px; }
          @media (min-width: 640px) { .hr-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (min-width: 1280px) { .hr-grid { grid-template-columns: repeat(3, 1fr); } }
          .hr-card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #eef2f7; padding:20px; display:flex; flex-direction:column; gap:12px; transition: box-shadow .2s; }
          .hr-card:hover { box-shadow:0 6px 16px rgba(0,0,0,0.08); }
          .hr-top { display:flex; justify-content:space-between; gap:12px; }
          .hr-id { display:flex; gap:12px; align-items:flex-start; }
          .avatar { width:42px; height:42px; border-radius:50%; background:#2563eb; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; }
          .hr-meta h3 { font-size:15px; font-weight:700; color:#111827; line-height:1.2; margin:0 0 2px; }
          .hr-meta p { margin:2px 0; font-size:13px; color:#6b7280; }
          .badge { font-size:12px; font-weight:700; padding:5px 10px; border-radius:999px; display:inline-block; border:1px solid transparent; white-space:nowrap; box-shadow:0 0 0 1px rgba(0,0,0,0.02) inset; }
          .badge-green { background:#ecfdf5; color:#047857; border-color:#d1fae5; }
          .badge-red { background:#fef2f2; color:#b91c1c; border-color:#fee2e2; }
          .badge-yellow { background:#fffbeb; color:#b45309; border-color:#fef3c7; }
          .hr-bottom { display:flex; align-items:center; justify-content:space-between; border-top:1px solid #f1f5f9; padding-top:12px; color:#6b7280; font-size:13px; }
          .btn { display:inline-flex; align-items:center; gap:8px; padding:9px 14px; font-size:12px; font-weight:700; border-radius:10px; border:none; cursor:pointer; transition: background .15s, color .15s, box-shadow .15s; }
          .btn-blue { background:#2563eb; color:#fff; }
          .btn-blue:hover { background:#1d4ed8; }
          .btn-red { background:#dc2626; color:#fff; }
          .btn-red:hover { background:#b91c1c; }
          .empty { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #f1f5f9; padding:28px; text-align:center; }
          .empty .icon { width:48px; height:48px; margin:0 auto 8px; border-radius:50%; background:#f3f4f6; display:flex; align-items:center; justify-content:center; color:#9ca3af; }
        `}</style>

        <main className="main-content">
          <header className="admin-header">
            <div className="header-title"><h1>Candidates Approvals</h1></div>
            <div className="user-profile"><span className="user-name">Admin</span><div className="profile-pic"><i className="fas fa-user"></i></div></div>
          </header>

          <div className="filters-card">
            <div className="filters-row">
              <div style={{ flex: 1 }}>
                <input type="text" className="search-input" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
              </div>
              <div style={{ width: '220px' }}>
                <select className="select-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option>All</option>
                  <option>{STATUS.PENDING}</option>
                  <option>{STATUS.APPROVED}</option>
                </select>
              </div>
            </div>
            <div className="inline-stats">
              <span>Total: <strong>{items.length}</strong></span>
              <span>Showing: <strong>{filtered.length}</strong></span>
            </div>
          </div>

          {error && (<div className="mb-4 rounded-md" style={{ border:'1px solid #fecaca', background:'#fef2f2', color:'#b91c1c', padding:'12px 14px' }}>{error}</div>)}

          <div className="hr-grid">
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="hr-card">
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
                    <div className="avatar"></div>
                    <div className="badge badge-yellow">Loading</div>
                  </div>
                  <div className="sk" style={{ width:'66%', height:14, marginBottom:8, background:'#e5e7eb' }}></div>
                  <div className="sk" style={{ width:'50%', height:12, marginBottom:8, background:'#e5e7eb' }}></div>
                  <div className="sk" style={{ width:'33%', height:12, marginBottom:16, background:'#e5e7eb' }}></div>
                  <div style={{ display:'flex', gap:8 }}>
                    <div className="sk" style={{ width:90, height:36, background:'#e5e7eb' }}></div>
                    <div className="sk" style={{ width:90, height:36, background:'#e5e7eb' }}></div>
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="empty">
                <div className="icon"><span className="material-icons-outlined">group_off</span></div>
                <div style={{ color:'#111827', fontWeight:600 }}>No candidates found</div>
                <div style={{ color:'#6b7280', fontSize:13, marginTop:4 }}>Try adjusting your search or filters.</div>
              </div>
            ) : (
              filtered.map((u) => (
                <div key={u.id} className="hr-card">
                  <div className="hr-top">
                    <div className="hr-id">
                      <div className="avatar">{getInitials(u.name)}</div>
                      <div className="hr-meta">
                        <h3>{u.name || 'Unnamed'}</h3>
                        <p>{u.email}</p>
                      </div>
                    </div>
                    <span className={badgeClass(u.status)}>{u.status}</span>
                  </div>
                  <div className="hr-bottom">
                    <span>Joined: {u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '—'}</span>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                      {u.status === STATUS.PENDING && (
                        <>
                          <button onClick={() => handleApprove(u.id)} className="btn btn-blue"><span className="material-icons-outlined" style={{ fontSize:14 }}>check_circle</span>Approve</button>
                          <button onClick={() => handleReject(u.id)} className="btn btn-red"><span className="material-icons-outlined" style={{ fontSize:14 }}>cancel</span>Reject</button>
                        </>
                      )}
                      {u.status === STATUS.APPROVED && (
                        <button onClick={() => handleReject(u.id)} className="btn btn-red"><span className="material-icons-outlined" style={{ fontSize:14 }}>block</span>Block</button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default CandidatesApprovals;
