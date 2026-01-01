import React from "react";

const CandidateNotification = ({ onNavigate }) => {
  const go = (path) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8000';
  const [items, setItems] = React.useState([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState("all");

  // Get stored user
  const user = React.useMemo(() => {
    try {
      const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }, []);

  const userName = React.useMemo(() => {
    if (!user) return 'Candidate';
    
    if (user.full_name) return user.full_name.split(' ')[0];
    if (user.name) {
      if (typeof user.name === 'string') return user.name.split(' ')[0];
      if (user.name.first) return user.name.first;
    }
    if (user.email) return user.email.split('@')[0];
    
    return 'Candidate';
  }, [user]);

  const authHeaders = () => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const getCurrentUserId = () => {
    try {
      const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      return user?._id || user?.id || user?.user_id || localStorage.getItem("user_id") || sessionStorage.getItem("user_id") || "";
    } catch {
      return "";
    }
  };

  const getCurrentUserEmail = () => {
    try {
      const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      const user = rawUser ? JSON.parse(rawUser) : null;
      return (user?.email || "").toLowerCase().trim();
    } catch {
      return "";
    }
  };

  const fetchAll = async () => {
  setLoading(true);
  setErr("");
  
  try {
    const candidateId = getCurrentUserId();
    const candidateEmail = getCurrentUserEmail();
    
    if (!candidateId && !candidateEmail) {
      throw new Error("Unable to identify current user");
    }

    console.log('🔍 Fetching applications for candidate:', { candidateId, candidateEmail });

    let apps = [];

    // TRY TO FETCH FROM SERVER FIRST - USE THE HR ENDPOINT!
    try {
      console.log('🌐 Attempting to fetch from server...');
      
      // CHANGE THIS LINE - Use the HR endpoint with candidate_id
      const response = await fetch(`${API_BASE}/api/hr/applications?candidate_id=${candidateId}`, {
        headers: authHeaders()
      });
      
      if (response.ok) {
        const serverApps = await response.json();
        console.log('✅ Fetched from server:', serverApps.length, 'applications');
        console.log('📋 Server application statuses:', serverApps.map(a => ({ job: a.job_title, status: a.status })));
        
        if (Array.isArray(serverApps) && serverApps.length > 0) {
          // Save server data to localStorage
          localStorage.setItem('candidateApplications', JSON.stringify(serverApps));
          apps = serverApps;
          console.log('💾 Saved server data to localStorage');
        }
      } else {
        console.log('⚠️ Server response not OK:', response.status);
      }
    } catch (serverError) {
      console.log('⚠️ Could not fetch from server:', serverError.message);
    }

    // If server fetch failed or returned no data, use localStorage
    if (apps.length === 0) {
      try {
        const candidateApps = localStorage.getItem('candidateApplications');
        if (candidateApps) {
          const parsed = JSON.parse(candidateApps);
          if (Array.isArray(parsed)) {
            apps = parsed;
            console.log('📦 Loaded from candidateApplications:', apps.length, 'applications');
          }
        }
        
        if (apps.length === 0) {
          const raw = localStorage.getItem('applications');
          if (raw) {
            const allApps = JSON.parse(raw);
            if (Array.isArray(allApps)) {
              apps = allApps.filter(app => {
                const matchById = String(app.candidate_id || '') === String(candidateId);
                const matchByEmail = 
                  String(app.email || '').toLowerCase() === candidateEmail ||
                  String(app.candidate_email || '').toLowerCase() === candidateEmail;
                
                return matchById || matchByEmail;
              });
              console.log('📦 Loaded from applications localStorage:', apps.length, 'applications');
            }
          }
        }
        
        console.log('📋 Application statuses:', apps.map(a => ({ job: a.job_title, status: a.status })));
      } catch (e) {
        console.error('❌ Failed to load from localStorage:', e);
      }
    }
    
    console.log('📊 Final applications before transform:', apps.length, 'total');
    
    // Transform applications into notifications
    const notifications = apps.map((app) => {
      const statusRaw = app.status || 'Pending';
      const status = String(statusRaw).toLowerCase();
      const isAccepted = status === 'accepted';
      const isRejected = status === 'rejected';
      const isPending = status === 'pending';
      
      let type = 'application';
      let icon = 'send';
      let iconBg = '#dbeafe';
      let iconColor = '#2563eb';
      let title = 'Application Submitted';
      let message = `Your application for ${app.job_title || 'the position'} has been submitted and is under review.`;
      
      if (isAccepted) {
        type = 'accepted';
        icon = 'check_circle';
        iconBg = '#dcfce7';
        iconColor = '#16a34a';
        title = 'Application Accepted! 🎉';
        message = `Congratulations! Your application for ${app.job_title || 'the position'} has been accepted.`;
      } else if (isRejected) {
        type = 'rejected';
        icon = 'cancel';
        iconBg = '#fee2e2';
        iconColor = '#dc2626';
        title = 'Application Status Update';
        message = `Thank you for your interest in ${app.job_title || 'the position'}. Unfortunately, we have decided to move forward with other candidates.`;
      }
      
      console.log(`✨ Transformed: ${app.job_title} - Status: "${statusRaw}" → Type: "${type}"`);
      
      return {
        id: app._id || app.id || String(Math.random()),
        type,
        icon,
        iconBg,
        iconColor,
        title,
        message,
        jobTitle: app.job_title || 'Position',
        hrName: app.hr_name || 'HR Team',
        date: app.applied_at || app.updated_at || app.created_at || new Date().toISOString(),
        status: 'unread', // All notifications are unread by default
        applicationStatus: statusRaw,
        jobId: app.job_id,
      };
    });
    
    // Sort by date (newest first)
    notifications.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    setItems(notifications);
    
    // Summary log
    const summary = {
      total: notifications.length,
      accepted: notifications.filter(n => n.type === 'accepted').length,
      rejected: notifications.filter(n => n.type === 'rejected').length,
      pending: notifications.filter(n => n.type === 'application').length,
    };
    console.log('📊 Notifications Summary:', summary);
    
  } catch (e) {
    console.error('❌ Error fetching notifications:', e);
    setErr(e?.message || "Failed to load notifications");
    setItems([]);
  } finally {
    setLoading(false);
  }
};

  React.useEffect(() => {
    fetchAll();
    
    // Listen for storage changes from other tabs/windows
    const handleStorageChange = (e) => {
      if (e.key === 'applications' || e.key === 'myApplications') {
        console.log('💾 Storage changed, refreshing...');
        fetchAll();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Poll for updates every 5 seconds
    const interval = setInterval(fetchAll, 5000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const filtered = React.useMemo(() => {
    let result = items;
    
    // Filter by status
    if (filterStatus !== 'all') {
      if (filterStatus === 'unread') {
        result = result.filter(n => n.status === 'unread');
      } else {
        result = result.filter(n => n.type === filterStatus);
      }
    }
    
    // Filter by search query
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter(n => 
        n.title.toLowerCase().includes(q) || 
        n.message.toLowerCase().includes(q) ||
        n.jobTitle.toLowerCase().includes(q)
      );
    }
    
    return result;
  }, [items, search, filterStatus]);

  const formatDate = (d) => {
    if (!d) return "";
    const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
    if (isNaN(dt?.getTime())) return "";
    
    const now = new Date();
    const seconds = Math.floor((now - dt) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    
    return dt.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };

  const markAsRead = async (id) => {
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, status: 'read' } : n));
  };

  const markAllAsRead = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, status: 'read' })));
  };

  const unreadCount = React.useMemo(() => items.filter(n => n.status === 'unread').length, [items]);

  return (
    <div className="candidate-dashboard-layout">
      {/* Sidebar - Same as CandidateDashboard */}
      <div className="sidebar-wrapper">
        <aside className="candidate-sidebar">
          <div className="sidebar-header">
            <span className="app-logo-candidate">Candidate</span> 
          </div>
          <div className="sidebar-content">
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
                  <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate-analysis-list'); }}>
                    <span className="material-icons-outlined">rate_review</span>
                    <span className="nav-label">Interview Feedback</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate-feedback'); }}>
                    <span className="material-icons-outlined">feedback</span>
                    <span className="nav-label">General Feedback</span>
                  </a>
                </li>
                <li className="nav-item active">
                  <a href="#" onClick={(e) => e.preventDefault()}>
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
          </div>
        </aside>
      </div>

      <div className="candidate-main-content">
        {/* Top Bar */}
        <header style={{ background: 'white', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Notifications</h2>
          <div style={{ position: 'relative' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, borderRadius: '50%', position: 'relative' }}>
              <span className="material-icons-outlined">notifications_none</span>
              {unreadCount > 0 && (
                <span style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: 'white', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Notifications Main Content */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          {/* Search and Actions Bar */}
          <section style={{ background: 'white', padding: 20, borderRadius: 12, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: '100%', padding: '12px 40px 12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
                />
                <span className="material-icons-outlined" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>search</span>
              </div>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="application">Submitted</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={markAllAsRead} 
                disabled={unreadCount === 0}
                style={{ padding: '10px 20px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 8, cursor: unreadCount === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: unreadCount === 0 ? 0.5 : 1 }}
              >
                Mark All as Read
              </button>
              <button 
                onClick={fetchAll}
                style={{ padding: '10px 20px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span className="material-icons-outlined" style={{ fontSize: 18 }}>refresh</span>
                Refresh
              </button>
            </div>
          </section>

          {err && (
            <div style={{ padding: 16, marginBottom: 16, background: 'rgba(220,38,38,0.08)', color: '#991b1b', borderRadius: 8 }}>
              {err}
            </div>
          )}

          {/* Notifications List */}
          <section style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
                Your Applications ({filtered.length})
              </h3>
              <span style={{ fontSize: 14, color: '#6b7280' }}>
                {unreadCount} unread
              </span>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                Loading notifications...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <span className="material-icons-outlined" style={{ fontSize: 64, color: '#d1d5db', marginBottom: 16 }}>notifications_none</span>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 8 }}>No notifications</h3>
                <p style={{ color: '#6b7280' }}>
                  {search ? 'No notifications match your search' : 'You have no application updates at this time'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map((notif) => (
                  <div 
                    key={notif.id}
                    onClick={() => markAsRead(notif.id)}
                    style={{ 
                      display: 'flex', 
                      gap: 16, 
                      padding: 16, 
                      border: '1px solid #e5e7eb', 
                      borderRadius: 10, 
                      cursor: 'pointer',
                      background: notif.status === 'unread' ? '#f0f9ff' : 'white',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      background: notif.iconBg,
                      color: notif.iconColor,
                      flexShrink: 0
                    }}>
                      <span className="material-icons-outlined">{notif.icon}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{notif.title}</span>
                        <span style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap', marginLeft: 12 }}>{formatDate(notif.date)}</span>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 14, color: '#374151', marginBottom: 8 }}>
                          {notif.message}
                        </p>
                        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#6b7280' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-icons-outlined" style={{ fontSize: 16 }}>work</span>
                            <span>{notif.jobTitle}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-icons-outlined" style={{ fontSize: 16 }}>person</span>
                            <span>{notif.hrName}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ 
                          padding: '4px 12px', 
                          borderRadius: 12, 
                          fontWeight: 600, 
                          fontSize: 12,
                          color: notif.type === 'accepted' ? '#166534' : 
                                 notif.type === 'rejected' ? '#991b1b' : '#1e40af',
                          background: notif.type === 'accepted' ? '#dcfce7' : 
                                     notif.type === 'rejected' ? '#fee2e2' : '#dbeafe'
                        }}>
                          {notif.applicationStatus}
                        </span>
                        {notif.status === 'unread' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif.id);
                            }}
                            style={{ padding: '6px 12px', border: '1px solid #e5e7eb', background: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
                          >
                            Mark as Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default CandidateNotification;