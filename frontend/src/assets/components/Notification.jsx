import React, { useEffect, useState, useMemo } from "react";
import "material-icons/iconfont/material-icons.css";

const Notification = ({ onNavigate }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  const getAuthHeaders = () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      return token ? { 'Authorization': `Bearer ${token}` } : {};
    } catch {
      return {};
    }
  };

  const currentUser = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  }, []);

  const hrNameResolved = useMemo(() => {
    const storedFullName = (typeof localStorage !== 'undefined' && localStorage.getItem('full_name')) || 
                          (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('full_name')) || '';
    if (storedFullName) return String(storedFullName).toLowerCase();
    if (currentUser && currentUser.name) return String(currentUser.name).toLowerCase();
    if (currentUser && currentUser.email) {
      const local = String(currentUser.email).split('@')[0].toLowerCase();
      const firstAlphaToken = (local.replace(/[^a-z]/g, ' ').trim().split(/\s+/)[0]) || local;
      return firstAlphaToken;
    }
    return '';
  }, [currentUser]);

  const handleNavigation = (path) => (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  // Fetch notifications from applications
  useEffect(() => {
    let active = true;
    
    async function fetchNotifications() {
      if (!hrNameResolved) {
        setNotifications([]);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError("");
      
      try {
        const url = `${API_BASE}/api/hr/applications?hr_name=${encodeURIComponent(hrNameResolved)}`;
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            ...getAuthHeaders()
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch applications: ${res.status}`);
        }
        
        const data = await res.json();
        
        if (!active) return;
        
        const apps = Array.isArray(data) ? data : [];
        
        // Transform applications into notifications
        const notifs = apps.map(app => {
          const isPending = (app.status || 'Pending').toLowerCase() === 'pending';
          const isAccepted = (app.status || '').toLowerCase() === 'accepted';
          const isRejected = (app.status || '').toLowerCase() === 'rejected';
          
          let type = 'application';
          let icon = 'person_add';
          let iconBg = 'bg-blue-light';
          let iconColor = 'icon-blue';
          let title = 'New Candidate Application';
          
          if (isAccepted) {
            type = 'accepted';
            icon = 'check_circle';
            iconBg = 'bg-green-light';
            iconColor = 'icon-green';
            title = 'Application Accepted';
          } else if (isRejected) {
            type = 'rejected';
            icon = 'cancel';
            iconBg = 'bg-red-light';
            iconColor = 'icon-red';
            title = 'Application Rejected';
          }
          
          return {
            id: app._id || app.id || Math.random().toString(36),
            type,
            icon,
            iconBg,
            iconColor,
            title,
            candidateName: app.name || app.candidate_name || 'Unknown Candidate',
            candidateEmail: app.email || '',
            jobTitle: app.job_title || 'Position',
            status: app.status || 'Pending',
            appliedAt: app.applied_at || new Date().toISOString(),
            isRead: false, // All notifications start as unread
            candidateId: app.candidate_id,
            jobId: app.job_id,
          };
        });
        
        // Sort by date (newest first)
        notifs.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));
        
        setNotifications(notifs);
        console.log('Loaded notifications:', notifs);
        
      } catch (err) {
        console.error('Error fetching notifications:', err);
        if (active) {
          setError('Failed to load notifications');
          setNotifications([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [API_BASE, hrNameResolved]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let filtered = notifications;
    
    // Filter by type
    if (filterType !== 'all') {
      if (filterType === 'unread') {
        filtered = filtered.filter(n => !n.isRead);
      } else {
        filtered = filtered.filter(n => n.type === filterType);
      }
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.candidateName.toLowerCase().includes(q) ||
        n.candidateEmail.toLowerCase().includes(q) ||
        n.jobTitle.toLowerCase().includes(q)
      );
    }
    
    return filtered;
  }, [notifications, filterType, searchQuery]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.isRead).length;
  }, [notifications]);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    ));
  };

  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all notifications?')) {
      setNotifications([]);
    }
  };

  const getTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const handleViewProfile = (notif) => {
    markAsRead(notif.id);
    onNavigate(`/candidates-apply?candidateId=${notif.candidateId}&jobId=${notif.jobId}&mode=review`);
  };

  const handleScheduleInterview = (notif) => {
    markAsRead(notif.id);
    onNavigate(`/schedule-interview?candidateId=${notif.candidateId}&jobId=${notif.jobId}`);
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar - Same as JobDisplay */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="app-logo">HR</span> Recruit
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/hr')}>
                <span className="material-icons-outlined">dashboard</span>
                <span className="nav-label">Dashboard</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/candidates')}>
                <span className="material-icons-outlined">people_alt</span>
                <span className="nav-label">Candidates</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/set-criteria')}>
                <span className="material-icons-outlined">history</span>
                <span className="nav-label">Set Criteria</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/job-display')}>
                <span className="material-icons-outlined">work</span>
                <span className="nav-label">Job Display</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/candidates-apply')}>
                <span className="material-icons-outlined">how_to_reg</span>
                <span className="nav-label">Candidates Apply</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/hr-profile')}>
                <span className="material-icons-outlined">badge</span>
                <span className="nav-label">Profile</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/interview-questions')}>
                <span className="material-icons-outlined">quiz</span>
                <span className="nav-label">Interview Questions</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/hr-analysis-list')}>
                <span className="material-icons-outlined">analytics</span>
                <span className="nav-label">Interview Analysis</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/schedule-interview')}>
                <span className="material-icons-outlined">event</span>
                <span className="nav-label">Schedule Interviews</span>
              </a>
            </li>
            <li className="nav-item active">
              <a href="#" className="active">
                <span className="material-icons-outlined">notifications</span>
                <span className="nav-label">Notifications</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/feedback')}>
                <span className="material-icons-outlined">rate_review</span>
                <span className="nav-label">Feedback</span>
              </a>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <ul>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/settings'); }}>
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
                    localStorage.removeItem('email');
                    localStorage.removeItem('user_id');
                    localStorage.removeItem('full_name');
                    sessionStorage.removeItem('user');
                    sessionStorage.removeItem('token');
                    sessionStorage.removeItem('email');
                    sessionStorage.removeItem('user_id');
                    sessionStorage.removeItem('full_name');
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

      <div className="main-content">
        {/* Top Bar */}
        <header className="jobdisplay-header">
          <div className="jobdisplay-title">Notifications</div>
          <div className="jobdisplay-stats">
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
          </div>
        </header>

        {/* Notifications Main Content */}
        <main className="dashboard-content" style={{ padding: 24, overflowY: 'auto' }}>
          {/* Search and Actions Bar */}
          <section style={{ background: 'white', padding: 20, borderRadius: 12, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '12px 40px 12px 16px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14 }}
                />
                <span className="material-icons-outlined" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>search</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button 
                onClick={markAllAsRead} 
                disabled={unreadCount === 0}
                className="button button-ghost"
                style={{ opacity: unreadCount === 0 ? 0.5 : 1 }}
              >
                Mark All as Read
              </button>
              <button 
                onClick={clearAll} 
                disabled={notifications.length === 0}
                className="button button-ghost"
                style={{ opacity: notifications.length === 0 ? 0.5 : 1 }}
              >
                Clear All
              </button>
            </div>
          </section>

          {error && (
            <div style={{ padding: 16, marginBottom: 16, background: 'rgba(220,38,38,0.08)', color: '#991b1b', borderRadius: 8 }}>
              {error}
            </div>
          )}

          {/* Notifications List */}
          <section style={{ background: 'white', padding: 20, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Recent Notifications ({filteredNotifications.length})</h3>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="jobdisplay-select"
                style={{ padding: '8px 12px' }}
              >
                <option value="all">All</option>
                <option value="unread">Unread</option>
                <option value="application">Applications</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>
                Loading notifications...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <span className="material-icons-outlined" style={{ fontSize: 64, color: '#d1d5db', marginBottom: 16 }}>notifications_none</span>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 8 }}>No notifications</h3>
                <p style={{ color: '#6b7280' }}>{searchQuery ? 'No notifications match your search' : 'You have no notifications at this time'}</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredNotifications.map((notif) => (
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
                      background: notif.isRead ? 'white' : '#eff6ff',
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
                      background: notif.type === 'accepted' ? '#dcfce7' : notif.type === 'rejected' ? '#fee2e2' : '#dbeafe',
                      color: notif.type === 'accepted' ? '#16a34a' : notif.type === 'rejected' ? '#dc2626' : '#2563eb',
                      flexShrink: 0
                    }}>
                      <span className="material-icons-outlined">{notif.icon}</span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>{notif.title}</span>
                        <span style={{ fontSize: 13, color: '#6b7280', whiteSpace: 'nowrap', marginLeft: 12 }}>{getTimeAgo(notif.appliedAt)}</span>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: 14, color: '#374151', marginBottom: 4 }}>
                          <strong>{notif.candidateName}</strong> {notif.type === 'application' ? 'has applied for' : notif.type === 'accepted' ? 'was accepted for' : 'was rejected for'} the <strong>{notif.jobTitle}</strong> position.
                        </p>
                        {notif.candidateEmail && (
                          <p style={{ fontSize: 13, color: '#6b7280' }}>
                            {notif.candidateEmail}
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewProfile(notif);
                          }}
                          className="button button-ghost"
                          style={{ fontSize: 13 }}
                        >
                          View Profile
                        </button>
                        {notif.type === 'application' && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleScheduleInterview(notif);
                            }}
                            className="button button-primary"
                            style={{ fontSize: 13 }}
                          >
                            Schedule Interview
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

export default Notification;