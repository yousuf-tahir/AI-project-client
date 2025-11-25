import React from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";
import "../styles/notification.css";

const Notification = ({ onNavigate }) => {
  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="app-logo">HR</span> Recruit
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/hr'); }}>
                <span className="material-icons-outlined">dashboard</span>
                <span className="nav-label">Dashboard</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/candidates'); }}>
                <span className="material-icons-outlined">people_alt</span>
                <span className="nav-label">Candidates</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/set-criteria'); }}>
                <span className="material-icons-outlined">history</span>
                <span className="nav-label">Set Criteria</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/job-display'); }}>
                <span className="material-icons-outlined">work</span>
                <span className="nav-label">Job Display</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/candidates-apply'); }}>
                <span className="material-icons-outlined">how_to_reg</span>
                <span className="nav-label">Candidates Apply</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/hr-profile'); }}>
                <span className="material-icons-outlined">badge</span>
                <span className="nav-label">Profile</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/interview-questions'); }}>
                <span className="material-icons-outlined">quiz</span>
                <span className="nav-label">Interview Questions</span>
              </a>
            </li>
            <li className="nav-item">
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/schedule-interview'); }}>
                <span className="material-icons-outlined">event</span>
                <span className="nav-label">Schedule Interviews</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/notifications'); }}>
                <span className="material-icons-outlined">notifications</span>
                <span className="nav-label">Notifications</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/feedback'); }}>
                <span className="material-icons-outlined">feedback</span>
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
              <a href="#" id="logout-link" className="logout-link" onClick={(e) => { e.preventDefault(); const ok = window.confirm('Are you sure you want to logout?'); if (!ok) return; try { localStorage.removeItem('user'); localStorage.removeItem('token'); localStorage.removeItem('email'); localStorage.removeItem('user_id'); localStorage.removeItem('full_name'); sessionStorage.removeItem('user'); sessionStorage.removeItem('token'); sessionStorage.removeItem('email'); sessionStorage.removeItem('user_id'); sessionStorage.removeItem('full_name'); } catch(_){} window.location.replace('/'); }}>
                <span className="material-icons-outlined">logout</span>
                <span className="nav-label">Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <button className="icon-button mobile-menu-toggle">
              <span className="material-icons-outlined">menu</span>
            </button>
            <h2 className="page-title">Notifications</h2>
          </div>
          <div className="top-bar-right">
            <button className="icon-button notification-button">
              <span className="material-icons-outlined">notifications_none</span>
              <span className="notification-badge">2</span>
            </button>
          </div>
        </header>

        {/* Notifications Main Content */}
        <main className="notifications-main">
          {/* Search and Actions Bar */}
          <section className="card search-bar">
            <div className="search-container">
              <input
                type="text"
                className="search-input"
                placeholder="Search notifications..."
              />
              <span className="material-icons-outlined">search</span>
            </div>
            <div className="actions-container">
              <button className="button button-secondary">Mark All as Read</button>
              <button className="button button-secondary">Clear All</button>
            </div>
          </section>

          {/* Notifications List */}
          <section className="card notifications-list">
            <div className="notifications-header">
              <h3>Recent Notifications</h3>
              <div className="filters">
                <select className="filter-select">
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="interviews">Interviews</option>
                  <option value="feedback">Feedback</option>
                  <option value="practice">Practice</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>

            {/* Sample Notification */}
            <div className="notification-item unread">
              <div className="notification-icon">
                <span className="material-icons-outlined">event_note</span>
              </div>
            </div>

            <div className="notifications-list">
              {/* Notification Item */}
              <div className="notification-item unread">
                <div className="notification-icon bg-blue-light icon-blue">
                  <span className="material-icons-outlined">person_add</span>
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <span className="notification-title">
                      New Candidate Application
                    </span>
                    <span className="notification-time">2 minutes ago</span>
                  </div>
                  <div className="notification-details">
                    <p>
                      John Doe has applied for the Senior Developer position.
                    </p>
                  </div>
                  <div className="notification-actions">
                    <button className="button button-secondary">
                      View Profile
                    </button>
                    <button className="button button-primary">
                      <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/schedule-interview'); }}>
                        Schedule Interview
                      </a>
                    </button>
                  </div>
                </div>
              </div>

              {/* Notification Item */}
              <div className="notification-item unread">
                <div className="notification-icon bg-green-light icon-green">
                  <span className="material-icons-outlined">event</span>
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <span className="notification-title">Interview Scheduled</span>
                    <span className="notification-time">1 hour ago</span>
                  </div>
                  <div className="notification-details">
                    <p>
                      Interview with Sarah Johnson is scheduled for tomorrow at
                      10:00 AM.
                    </p>
                  </div>
                  <div className="notification-actions">
                    <button className="button button-secondary">
                      View Details
                    </button>
                    <button className="button button-primary">Reschedule</button>
                  </div>
                </div>
              </div>

              {/* Notification Item */}
              <div className="notification-item">
                <div className="notification-icon bg-orange-light icon-orange">
                  <span className="material-icons-outlined">feedback</span>
                </div>
                <div className="notification-content">
                  <div className="notification-header">
                    <span className="notification-title">Feedback Received</span>
                    <span className="notification-time">3 hours ago</span>
                  </div>
                  <div className="notification-details">
                    <p>
                      New feedback received for the last interview with Michael
                      Brown.
                    </p>
                  </div>
                  <div className="notification-actions">
                    <button className="button button-primary">
                      View Feedback
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* No Notifications Message */}
            <div className="no-notifications" style={{ display: "none" }}>
              <div className="card">
                <div className="no-notifications-content">
                  <span className="material-icons-outlined">
                    notifications_none
                  </span>
                  <h3>No new notifications</h3>
                  <p>All your notifications have been read.</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Notification;