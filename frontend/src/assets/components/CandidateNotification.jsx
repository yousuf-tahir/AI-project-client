import React from "react";
import axios from "axios";
import "../styles/candidate.css";
import "../styles/notification.css";

const CandidateNotification = ({ onNavigate }) => {
  const go = (path) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // ================= Main Content State/Logic (sidebar untouched) =================
  const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8000';
  const [items, setItems] = React.useState([]); // {id,title,message,date,status}
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const authHeaders = () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const fetchAll = async () => {
    setLoading(true); setErr("");
    try {
      const res = await axios.get(`${API_BASE}/api/notifications?mine=true`, { headers: { ...authHeaders() } });
      const arr = Array.isArray(res.data) ? res.data : [];
      const norm = arr.map((n) => ({
        id: n.id || n._id || n.notification_id || String(Math.random()),
        title: String(n.title || ""),
        message: String(n.message || ""),
        date: n.date || n.created_at || n.timestamp || null,
        status: n.read_at ? 'read' : ((n.status || "").toLowerCase() === "read" ? "read" : "unread"),
      }));
      setItems(norm);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load notifications");
      setItems([]);
    } finally { setLoading(false); }
  };

  React.useEffect(() => { fetchAll(); }, []);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
  }, [items, search]);

  const formatDate = (d) => {
    if (!d) return "";
    const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    if (isNaN(dt?.getTime())) return "";
    return dt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  const markAsRead = async (id) => {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, status: 'read' } : n));
    try {
      await axios.patch(`${API_BASE}/api/notifications/${encodeURIComponent(id)}/read`, {}, { headers: { ...authHeaders() } });
    } catch (_) {
      // revert on failure
      setItems((prev) => prev.map((n) => n.id === id ? { ...n, status: 'unread' } : n));
    }
  };

  const markAllAsRead = async () => {
    const hadUnread = items.some(n => n.status !== 'read');
    setItems((prev) => prev.map((n) => ({ ...n, status: 'read' })));
    try {
      await axios.post(`${API_BASE}/api/notifications/mark-all-read`, {}, { headers: { ...authHeaders() } });
    } catch (_) {
      if (hadUnread) fetchAll();
    }
  };

  const unreadCount = React.useMemo(() => items.filter(n => n.status !== 'read').length, [items]);

  return (
    <div className="candidate-dashboard-layout">
      {/* Sidebar (same as CandidateDashboard) */}
      <aside className="candidate-sidebar">
        <div className="sidebar-header">
          <span className="app-logo-candidate">App</span> Recruit
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate'); }}>
                <span className="material-icons-outlined">dashboard</span>
                <span className="nav-label">Dashboard</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate-jobs'); }}>
                <span className="material-icons-outlined">work</span>
                <span className="nav-label">Jobs</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/profile'); }}>
                <span className="material-icons-outlined">account_circle</span>
                <span className="nav-label">My Profile</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/interview'); }}>
                <span className="material-icons-outlined">event_note</span>
                <span className="nav-label">My Interviews</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/practice-interview'); }}>
                <span className="material-icons-outlined">videocam</span>
                <span className="nav-label">Practice Interview</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate-feedback'); }}>
                <span className="material-icons-outlined">feedback</span>
                <span className="nav-label">Feedback</span>
              </a>
            </li>
            <li className="nav-item active">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate-notifications'); }}>
                <span className="material-icons-outlined">notifications</span>
                <span className="nav-label">Notifications</span>
              </a>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <ul>
            <li className="nav-item">
            <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate-settings'); }}>
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

      {/* Main Content (dynamic notifications) */}
      <div className="candidate-main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">

            <h2 className="page-title">Notifications</h2>
          </div>
          <div className="top-bar-right">
          </div>
        </header>

        {/* Notifications Main Content */}
        <main className="notifications-main">
          {/* Search and Actions Bar */}
          <section className="card search-bar" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="search-container" style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="search-input"
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%' }}
              />
              <span className="material-icons-outlined" style={{ position: 'absolute', right: 8, top: 8 }}>search</span>
            </div>
            <div className="actions-container" style={{ display: 'flex', gap: 8 }}>
              <button className="button button-secondary" onClick={markAllAsRead} disabled={items.every(n => n.status === 'read')}>
                Mark All as Read
              </button>
            </div>
          </section>

          {/* Notifications List */}
          <section className="card notifications-list" style={{ marginTop: 16 }}>
            <div className="notifications-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h3>Recent Notifications</h3>
              <span className="form-hint">{items.filter(n => n.status !== 'read').length} unread</span>
            </div>

            {loading && (
              <div className="empty-state">
                <span className="material-icons-outlined">hourglass_empty</span>
                <p>Loading notifications...</p>
              </div>
            )}

            {!loading && err && (
              <div className="empty-state">
                <span className="material-icons-outlined">error_outline</span>
                <p>{err}</p>
              </div>
            )}

            {!loading && !err && filtered.length === 0 && (
              <div className="empty-state">
                <span className="material-icons-outlined">notifications_none</span>
                <p>No notifications yet.</p>
              </div>
            )}

            {!loading && !err && filtered.length > 0 && (
              <div className="notifications-list" style={{ display: 'grid', gap: 12 }}>
                {filtered.map((n) => {
                  const isUnread = n.status !== 'read';
                  return (
                    <div
                      key={n.id}
                      className={`notification-item ${isUnread ? 'unread' : ''}`}
                      style={{
                        border: '1px solid',
                        borderColor: isUnread ? '#3b82f6' : 'var(--border-color, #e5e7eb)',
                        borderRadius: 8,
                        padding: 12,
                        background: 'var(--card-bg, #fff)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                        <div>
                          <div className="notification-title" style={{ fontWeight: isUnread ? 700 : 600 }}>
                            {n.title || '(No title)'}
                          </div>
                          <div className="notification-details" style={{ color: 'var(--muted-fg, #6b7280)' }}>
                            {n.message || ''}
                          </div>
                        </div>
                        <div className="notification-time" style={{ whiteSpace: 'nowrap', color: 'var(--muted-fg, #6b7280)' }}>
                          {formatDate(n.date)}
                        </div>
                      </div>

                      <div className="notification-actions" style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                        {isUnread && (
                          <button className="button button-primary" onClick={() => markAsRead(n.id)}>
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
;

export default CandidateNotification;
