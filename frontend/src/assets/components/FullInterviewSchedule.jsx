import React from "react";
import "../styles/fullinterviewschedule.css"

const FullInterviewSchedule = () => {
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="app-logo">HR</span> Recruit
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item">
              <a href="Hr-dash.html">
                <span className="material-icons-outlined">dashboard</span>
                <span className="nav-label">Dashboard</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="candidates.html">
                <span className="material-icons-outlined">people_alt</span>
                <span className="nav-label">Candidates</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="set-criteria.html">
                <span className="material-icons-outlined">history</span>
                <span className="nav-label">Set Criteria</span>
              </a>
            </li>
            <li className="nav-item active">
              <a href="schedule-interview.html">
                <span className="material-icons-outlined">event</span>
                <span className="nav-label">Schedule Interviews</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="interview-questions.html">
                <span className="material-icons-outlined">quiz</span>
                <span className="nav-label">Interview Questions</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="notifications.html">
                <span className="material-icons-outlined">notifications</span>
                <span className="nav-label">Notifications</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="feedback.html">
                <span className="material-icons-outlined">rate_review</span>
                <span className="nav-label">Feedback</span>
              </a>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <ul>
            <li className="nav-item">
              <a href="settings.html">
                <span className="material-icons-outlined">settings</span>
                <span className="nav-label">Settings</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#">
                <span className="material-icons-outlined">logout</span>
                <span className="nav-label">Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      <div className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h2>Full Interview Schedule</h2>
          </div>
          <div className="top-bar-right">
            <button className="icon-button notification-button">
              <span className="material-icons-outlined">notifications</span>
              <span className="notification-badge">3</span>
            </button>
            <div className="user-profile">
              <img
                src="placeholder-avatar.png"
                alt="User Avatar"
                className="user-avatar"
              />
              <span className="user-name">Alice Johnson</span>
              <span className="material-icons-outlined dropdown-icon">
                expand_more
              </span>
            </div>
          </div>
        </header>

        <main className="content-area">
          <section className="card">
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Position</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>{/* Rows will be populated dynamically */}</tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Delete Confirmation Overlay */}
      <div className="delete-confirm-overlay" style={{ display: "none" }}>
        <div className="delete-confirm-content">
          <h3>Confirm Delete</h3>
          <p>Are you sure you want to delete the interview?</p>
          <div className="delete-confirm-buttons">
            <button className="button button-danger" id="confirmDelete">
              Delete
            </button>
            <button className="button button-secondary" id="cancelDelete">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullInterviewSchedule;