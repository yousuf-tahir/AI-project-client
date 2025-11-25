import React from 'react';
import 'material-icons/iconfont/material-icons.css';
import '../styles/candidate.css';
import { logEvent } from "../utils/logClient";

const AdminDashboard = ({ onNavigate }) => {
  const go = (path) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="candidate-dashboard-layout admin-container">
      {/* Sidebar (same styling as CandidateDashboard.jsx) */}
      <aside className="candidate-sidebar">
        <div className="sidebar-header">
          <span className="app-logo-candidate">Admin</span> Panel
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item active">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/hr'); }}>
                <span className="material-icons-outlined">dashboard</span>
                <span className="nav-label">Dashboard</span>
              </a>
            </li>
            <li className="nav-item">
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
                onClick={async (e) => {
                  e.preventDefault();
                  const ok = window.confirm('Are you sure you want to logout?');
                  if (!ok) return;
                  try {
                    // Best-effort logout log
                    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
                    const u = stored ? JSON.parse(stored) : {};
                    await logEvent({ user: u?.email || '', role: (u?.role || 'admin'), action: 'Logout', status: 'Success' });
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
        {/* Scoped styles for admin main content (sidebar remains from candidate.css) */}
        <style>{`
          .admin-container {
            min-height: 100vh;
          }
          .main-content { padding: 20px; overflow-x: hidden; }
          .admin-header { display:flex; justify-content: space-between; align-items: center; background:#fff; padding:15px 20px; border-radius:8px; margin-bottom:20px; box-shadow:0 2px 6px rgba(0,0,0,0.05); }
          .header-title h1 { font-size:22px; color:#111827; }
          .user-profile { display:flex; align-items:center; gap:10px; }
          .user-profile .user-name { font-weight:600; color:#374151; }
          .profile-pic { background:#3b82f6; color:#fff; width:35px; height:35px; border-radius:50%; display:flex; justify-content:center; align-items:center; }
          .stats-grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:20px; margin-bottom:30px; }
          .stat-card { background:#fff; padding:20px; border-radius:10px; display:flex; align-items:center; gap:15px; box-shadow:0 2px 6px rgba(0,0,0,0.05); transition: transform .2s ease; }
          .stat-card:hover { transform: translateY(-3px); }
          .stat-icon { font-size:28px; color:#3b82f6; }
          .stat-info h3 { font-size:16px; font-weight:600; margin-bottom:5px; }
          .stat-info p { color:#6b7280; font-size:14px; }
          .activities-section { background:#fff; padding:20px; border-radius:10px; box-shadow:0 2px 6px rgba(0,0,0,0.05); }
          .activities-section h2 { margin-bottom:15px; font-size:18px; font-weight:600; color:#111827; }
          .activity-table table { width:100%; border-collapse: collapse; }
          .activity-table thead { background:#f9fafb; }
          .activity-table th, .activity-table td { padding:12px 15px; text-align:left; border-bottom:1px solid #e5e7eb; font-size:14px; }
          .activity-table th { font-weight:600; color:#374151; }
          .activity-table tbody tr:hover { background:#f3f4f6; }
        `}</style>

        <main className="main-content">
          {/* Header */}
          <header className="admin-header">
            <div className="header-title">
              <h1>Admin Dashboard</h1>
            </div>
            <div className="user-profile">
              <span className="user-name">Admin</span>
              <div className="profile-pic">
                <i className="fas fa-user"></i>
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <div className="dashboard-content">
            {/* Stats Cards */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-user-check"></i>
                </div>
                <div className="stat-info">
                  <h3>HR Approvals</h3>
                  <p>12 Pending</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-users"></i>
                </div>
                <div className="stat-info">
                  <h3>Candidates</h3>
                  <p>154 Total</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-question"></i>
                </div>
                <div className="stat-info">
                  <h3>Questions</h3>
                  <p>245 Total</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <i className="fas fa-comments"></i>
                </div>
                <div className="stat-info">
                  <h3>Feedback</h3>
                  <p>32 New</p>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="activities-section">
              <h2>Recent Activities</h2>
              <div className="activity-table">
                <table>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>User</th>
                      <th>Type</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>12:34 PM</td>
                      <td>John Smith</td>
                      <td>HR</td>
                      <td>Scheduled Interview</td>
                    </tr>
                    <tr>
                      <td>11:45 AM</td>
                      <td>Jane Doe</td>
                      <td>Candidate</td>
                      <td>Registered</td>
                    </tr>
                    <tr>
                      <td>10:15 AM</td>
                      <td>Mike Johnson</td>
                      <td>HR</td>
                      <td>Updated Profile</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
