import React, { useEffect, useMemo, useState } from 'react';
import 'material-icons/iconfont/material-icons.css';
import '../styles/candidate.css';

// Status constants
const STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// Backend base URL
const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:8000';

// Utility: get auth token if present
const getAuthToken = () => {
  try {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  } catch (_) {
    return null;
  }
};

// Simple API wrapper with graceful fallback if backend is not ready
const apiRequest = async (path, { method = 'GET', body } = {}) => {
  try {
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
  } catch (err) {
    console.warn('API request failed (using fallback data):', path, err);
    throw err;
  }
};

const HRApprovals = ({ onNavigate }) => {
  const go = (path) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [items, setItems] = useState([]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        // Attempt to fetch from backend. Expected response: [{ id, name, company, email, joinedAt, status }]
        const data = await apiRequest('/api/admin/hr-users');
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch (_) {
        // Fallback demo data when backend route is not available yet
        if (!cancelled) {
          setItems([
            { id: '1', name: 'Rahul Sharma', company: 'Acme Corp', email: 'rahul@acme.com', joinedAt: '2025-07-10', status: STATUS.PENDING },
            { id: '2', name: 'Aisha Khan', company: 'Globex', email: 'aisha@globex.com', joinedAt: '2025-03-22', status: STATUS.APPROVED },
            { id: '3', name: 'Vikram Patel', company: 'Initech', email: 'vikram@initech.com', joinedAt: '2025-01-05', status: STATUS.REJECTED },
            { id: '4', name: 'Neha Gupta', company: 'Hooli', email: 'neha@hooli.com', joinedAt: '2025-04-18', status: STATUS.PENDING },
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

  const updateStatusOptimistic = (id, nextStatus) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: nextStatus } : it)));
  };

  const removeItemOptimistic = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleApprove = async (id) => {
    const prev = items.find((x) => x.id === id);
    updateStatusOptimistic(id, STATUS.APPROVED);
    try {
      await apiRequest(`/api/admin/hr-users/${id}/approve`, { method: 'POST' });
      // On success, HR can log in (backend should toggle auth accordingly)
    } catch (e) {
      // revert on error
      if (prev) updateStatusOptimistic(id, prev.status);
      setError('Failed to approve HR. Please try again.');
    }
  };

  const handleReject = async (id) => {
    // New behavior: Reject removes the HR from database
    const snapshot = items;
    removeItemOptimistic(id);
    try {
      await apiRequest(`/api/admin/hr-users/${id}`, { method: 'DELETE' });
      // On success, HR removed from system
    } catch (e) {
      // revert on error
      setItems(snapshot);
      setError('Failed to reject (remove) HR. Please try again.');
    }
  };

  const handleRemove = async (id) => {
    const snapshot = items;
    removeItemOptimistic(id);
    try {
      await apiRequest(`/api/admin/hr-users/${id}`, { method: 'DELETE' });
      // On success, access revoked and removed from list
    } catch (e) {
      // revert on error
      setItems(snapshot);
      setError('Failed to remove HR. Please try again.');
    }
  };

  const handleDelete = async (id) => {
    const snapshot = items;
    removeItemOptimistic(id);
    try {
      await apiRequest(`/api/admin/hr-users/${id}`, { method: 'DELETE' });
      // Deleted from system
    } catch (e) {
      setItems(snapshot);
      setError('Failed to delete HR. Please try again.');
    }
  };

  const badgeStyles = (status) => {
    switch (status) {
      case STATUS.APPROVED:
        return 'badge badge-green';
      case STATUS.REJECTED:
        return 'badge badge-red';
      default:
        return 'badge badge-yellow';
    }
  };

  // Initials for avatar
  const getInitials = (name = '') => {
    const parts = String(name).trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || '' : '';
    return (first + last).toUpperCase();
  };

  return (
    <div className="candidate-dashboard-layout admin-container">
      {/* Sidebar (reuse same design as AdminDashboard.jsx) */}
      <aside className="candidate-sidebar">
        <div className="sidebar-header">
          <span className="app-logo-candidate">Admin</span> Panel
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/admin'); }}>
                <span className="material-icons-outlined">dashboard</span>
                <span className="nav-label">Dashboard</span>
              </a>
            </li>
            <li className="nav-item active">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/hr-approvals'); }}>
                <span className="material-icons-outlined">verified_user</span>
                <span className="nav-label">HR Approvals</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/candidates'); }}>
                <span className="material-icons-outlined">people_alt</span>
                <span className="nav-label">Candidates Approvals</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/interview-questions'); }}>
                <span className="material-icons-outlined">quiz</span>
                <span className="nav-label">Interview Questions</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/system-logs'); }}>
                <span className="material-icons-outlined">list_alt</span>
                <span className="nav-label">System Logs</span>
              </a>
            </li>
            <li className="nav-item">
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

      {/* Main Content */}
      <div className="candidate-main-content">
        {/* Scoped styles for HR Approvals main content (no Tailwind required) */}
        <style>{`
          .admin-container { min-height: 100vh; }
          .main-content { padding: 24px; overflow-x: hidden; max-width: 1120px; margin: 0 auto; }
          .admin-header { display:flex; justify-content: space-between; align-items: center; background:#fff; padding:18px 20px; border-radius:10px; margin-bottom:20px; box-shadow:0 2px 10px rgba(0,0,0,0.06); }
          .header-title h1 { font-size:22px; color:#111827; }
          .user-profile { display:flex; align-items:center; gap:10px; }
          .user-profile .user-name { font-weight:600; color:#374151; }
          .profile-pic { background:#3b82f6; color:#fff; width:35px; height:35px; border-radius:50%; display:flex; justify-content:center; align-items:center; }

          /* Filters card */
          .filters-card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #f1f5f9; padding:18px; margin-bottom:20px; }
          .filters-row { display:flex; flex-direction:column; gap:12px; }
          @media (min-width: 768px) { .filters-row { flex-direction:row; align-items:center; } }
          .search-input, .select-input { width:100%; border:1px solid #d1d5db; border-radius:10px; height:40px; padding:0 12px; font-size:14px; color:#111827; outline:none; transition: box-shadow .15s, border-color .15s; background:#fff; }
          .search-input::placeholder { color:#9ca3af; }
          .search-input:focus, .select-input:focus { border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.2); }
          .inline-stats { display:flex; flex-wrap:wrap; gap:14px; font-size:13px; color:#6b7280; margin-top:10px; }
          .inline-stats strong { color:#111827; }

          /* Grid and cards */
          .hr-grid { display:grid; grid-template-columns: 1fr; gap:18px; }
          @media (min-width: 640px) { .hr-grid { grid-template-columns: repeat(2, 1fr); } }
          @media (min-width: 1280px) { .hr-grid { grid-template-columns: repeat(3, 1fr); } }
          .hr-card { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #eef2f7; padding:20px; display:flex; flex-direction:column; gap:12px; transition: box-shadow .2s; }
          .hr-card:hover { box-shadow:0 6px 16px rgba(0,0,0,0.08); }
          .hr-top { display:flex; justify-content:space-between; gap:12px; }
          .hr-id { display:flex; gap:12px; align-items:flex-start; }
          .avatar { width:42px; height:42px; border-radius:50%; background:#2563eb; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; }
          .hr-meta h3 { font-size:15px; font-weight:700; color:#111827; line-height:1.2; margin:0 0 2px; }
          .hr-meta .meta-line { font-size:13px; color:#6b7280; display:flex; align-items:center; gap:8px; white-space:nowrap; }
          .hr-meta .dot { width:4px; height:4px; background:#d1d5db; border-radius:50%; display:inline-block; }
          .badge { font-size:12px; font-weight:700; padding:5px 10px; border-radius:999px; display:inline-block; border:1px solid transparent; white-space:nowrap; box-shadow:0 0 0 1px rgba(0,0,0,0.02) inset; }
          .badge-green { background:#ecfdf5; color:#047857; border-color:#d1fae5; }
          .badge-red { background:#fef2f2; color:#b91c1c; border-color:#fee2e2; }
          .badge-yellow { background:#fffbeb; color:#b45309; border-color:#fef3c7; }
          .hr-bottom { display:flex; align-items:center; justify-content:space-between; border-top:1px solid #f1f5f9; padding-top:12px; color:#6b7280; font-size:13px; }

          /* Buttons */
          .btn { display:inline-flex; align-items:center; gap:8px; padding:9px 14px; font-size:12px; font-weight:700; border-radius:10px; border:none; cursor:pointer; transition: background .15s, color .15s, box-shadow .15s; }
          .btn:disabled { opacity:.7; cursor:not-allowed; }
          .btn-blue { background:#2563eb; color:#fff; }
          .btn-blue:hover { background:#1d4ed8; }
          .btn-red { background:#dc2626; color:#fff; }
          .btn-red:hover { background:#b91c1c; }
          .btn-gray { background:#e5e7eb; color:#111827; }
          .btn-gray:hover { background:#d1d5db; }

          /* Skeletons */
          .skeleton { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #f1f5f9; padding:18px; }
          .sk { background:#e5e7eb; border-radius:6px; animation: pulse 1.2s ease-in-out infinite; }
          .sk.round { border-radius:999px; }
          @keyframes pulse { 0%, 100% { opacity: .6 } 50% { opacity: 1 } }

          /* Empty state */
          .empty { background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,0.06); border:1px solid #f1f5f9; padding:28px; text-align:center; }
          .empty .icon { width:48px; height:48px; margin:0 auto 8px; border-radius:50%; background:#f3f4f6; display:flex; align-items:center; justify-content:center; color:#9ca3af; }
        `}</style>

        <main className="main-content">
          {/* Header */}
          <header className="admin-header">
            <div className="header-title">
              <h1>HR Approvals</h1>
            </div>
            <div className="user-profile">
              <span className="user-name">Admin</span>
              <div className="profile-pic">
                <i className="fas fa-user"></i>
              </div>
            </div>
          </header>

          {/* Controls */}
          <div className="filters-card">
            <div className="filters-row">
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by name, company, or email"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div style={{ width: '220px' }}>
                <select
                  className="select-input"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option>All</option>
                  <option>{STATUS.PENDING}</option>
                  <option>{STATUS.APPROVED}</option>
                  <option>{STATUS.REJECTED}</option>
                </select>
              </div>
            </div>
            <div className="inline-stats">
              <span>Total: <strong>{items.length}</strong></span>
              <span>Showing: <strong>{filtered.length}</strong></span>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3">
              {error}
            </div>
          )}

          {/* List */}
          <div className="hr-grid">
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="skeleton">
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'12px' }}>
                    <div className="sk round" style={{ width:40, height:40 }}></div>
                    <div className="sk" style={{ width:80, height:20 }}></div>
                  </div>
                  <div className="sk" style={{ width:'66%', height:14, marginBottom:8 }}></div>
                  <div className="sk" style={{ width:'50%', height:12, marginBottom:8 }}></div>
                  <div className="sk" style={{ width:'33%', height:12, marginBottom:16 }}></div>
                  <div style={{ display:'flex', gap:8 }}>
                    <div className="sk" style={{ width:90, height:36 }}></div>
                    <div className="sk" style={{ width:90, height:36 }}></div>
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="col-span-full">
                <div className="empty">
                  <div className="icon"><span className="material-icons-outlined">group_off</span></div>
                  <div style={{ color:'#111827', fontWeight:600 }}>No HR users found</div>
                  <div style={{ color:'#6b7280', fontSize:13, marginTop:4 }}>Try adjusting your search or filters.</div>
                </div>
              </div>
            ) : (
              filtered.map((hr) => (
                <div key={hr.id} className="hr-card">
                  <div className="hr-top">
                    <div className="hr-id">
                      <div className="avatar">{getInitials(hr.name)}</div>
                      <div className="hr-meta">
                        <h3>{hr.name || 'Unnamed HR'}</h3>
                        <p>{hr.company || '—'}</p>
                        <p style={{ color:'#6b7280' }}>{hr.email}</p>
                      </div>
                    </div>
                    <span className={badgeStyles(hr.status)}>{hr.status}</span>
                  </div>

                  <div className="hr-bottom">
                    <span>Joined: {hr.joinedAt ? new Date(hr.joinedAt).toLocaleDateString() : '—'}</span>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                      {hr.status === STATUS.PENDING && (
                        <>
                          <button onClick={() => handleApprove(hr.id)} className="btn btn-blue">
                            <span className="material-icons-outlined" style={{ fontSize:14 }}>check_circle</span>
                            Approve
                          </button>
                          <button onClick={() => handleReject(hr.id)} className="btn btn-red">
                            <span className="material-icons-outlined" style={{ fontSize:14 }}>cancel</span>
                            Reject
                          </button>
                        </>
                      )}
                      {hr.status === STATUS.APPROVED && (
                        <button onClick={() => handleRemove(hr.id)} className="btn btn-red">
                          <span className="material-icons-outlined" style={{ fontSize:14 }}>block</span>
                          Block HR
                        </button>
                      )}
                      {hr.status === STATUS.REJECTED && (
                        <button onClick={() => handleDelete(hr.id)} className="btn btn-gray">
                          <span className="material-icons-outlined" style={{ fontSize:14 }}>delete</span>
                          Delete HR
                        </button>
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

export default HRApprovals;
