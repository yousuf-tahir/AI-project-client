import React, { useEffect, useState, useCallback } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";

const HrDashboard = ({ onNavigate }) => {
  const [hrName, setHrName] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [candidateCount, setCandidateCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  // In Vite, use import.meta.env for environment variables
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  // Helper function to parse user data from storage
  const tryParseUser = (raw) => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Fetch interview count for the current HR
  const fetchInterviewCount = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      console.log('Fetching interview count from:', `${API_BASE}/api/interviews/count/hr`);

      const response = await fetch(`${API_BASE}/api/interviews/count/hr`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }

      const data = await response.json();
      console.log('Interview count response:', data);

      // Use the correct property from the response
      const count = data.hr_interviews_count || data.alt_hr_count || data.total_interviews || 0;
      setInterviewCount(count);

    } catch (error) {
      console.error('Error in fetchInterviewCount:', error);
      // Set to a negative number to indicate error state
      setInterviewCount(-1);
    }
  };

  // Fetch candidate count
  const fetchCandidateCount = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      console.log('Fetching candidate count from:', `${API_BASE}/api/admin/candidates/count`);

      const response = await fetch(`${API_BASE}/api/admin/candidates/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Candidate count data:', data);

      // Set the total candidate count
      setCandidateCount(data.total || 0);
    } catch (error) {
      console.error('Error fetching candidate count:', error);
      setCandidateCount(0);
    }
  };

  // Fetch feedback count
  const fetchFeedbackCount = useCallback(async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      console.log('Fetching feedback count from:', `${API_BASE}/api/feedback/count`);

      const response = await fetch(`${API_BASE}/api/feedback/count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, ${errorText}`);
      }

      const data = await response.json();
      console.log('Feedback count response:', data);

      // Set the total feedback count
      setFeedbackCount(data.total_feedback || 0);

    } catch (error) {
      console.error('Error in fetchFeedbackCount:', error);
      // Set to a negative number to indicate error state
      setFeedbackCount(-1);
    }
  }, [API_BASE]);

  useEffect(() => {
    // Fetch all required data
    const fetchData = async () => {
      await Promise.all([
        fetchCandidateCount(),
        fetchInterviewCount(),
        fetchFeedbackCount()
      ]);
    };
    fetchData();
  }, [fetchCandidateCount, fetchInterviewCount, fetchFeedbackCount]);

  // Attempt to fetch the logged-in HR's name and avatar
  useEffect(() => {
    const storedFullName =
      (typeof localStorage !== 'undefined' && localStorage.getItem('full_name')) ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('full_name')) ||
      null;
    const storedEmail =
      (typeof localStorage !== 'undefined' && localStorage.getItem('email')) ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('email')) ||
      null;
    const storedUserId =
      (typeof localStorage !== 'undefined' && localStorage.getItem('user_id')) ||
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('user_id')) ||
      null;

    const userObj =
      tryParseUser(typeof localStorage !== 'undefined' ? localStorage.getItem('user') : null) ||
      tryParseUser(typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('user') : null);

    const nameFromUserObj = userObj && (userObj.full_name || userObj.name || userObj.user?.full_name);
    const email = storedEmail || (userObj && (userObj.email || userObj.user?.email));
    const userId = storedUserId || (userObj && (userObj._id || userObj.id || userObj.user_id));

    const initialName = storedFullName || nameFromUserObj;
    if (initialName && typeof initialName === 'string' && initialName.trim()) {
      setHrName(initialName.trim());
      return;
    }

    const fetchName = async () => {
      try {
        let url = null;
        if (email) {
          url = `${API_BASE}/auth/me?email=${encodeURIComponent(email)}`;
        } else if (userId) {
          url = `${API_BASE}/auth/me?user_id=${encodeURIComponent(userId)}`;
        }
        if (!url) return; // nothing to query with; keep default text

        const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data && typeof data.full_name === 'string' && data.full_name.trim()) {
          setHrName(data.full_name.trim());
        }
        // Set avatar if available
        if (data && data._id) {
          const fromApi = data.avatar_url;
          if (fromApi && typeof fromApi === 'string' && fromApi.trim()) {
            const absolute = fromApi.startsWith('http') ? fromApi : `${API_BASE}${fromApi}`;
            setAvatarUrl(absolute);
          } else {
            // fallback to avatar endpoint by user id
            setAvatarUrl(`${API_BASE}/auth/avatar/${data._id}`);
          }
        }
      } catch (e) {
        // Silently ignore and fallback to default
      }
    };

    fetchName();
  }, []);

  // Local navigation helper used by sidebar links
  const handleNavigation = (path) => (e) => {
    if (e) e.preventDefault();
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  // Navigation handler for the go function
  const go = (path, e) => {
    if (e) e.preventDefault();
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

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
              <a href="#" onClick={(e) => go("/candidates-apply", e)}>
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
              <a href="#" id="logout-link" className="logout-link" onClick={(e) => { e.preventDefault(); const ok = window.confirm('Are you sure you want to logout?'); if (!ok) return; try { localStorage.removeItem('user'); localStorage.removeItem('token'); localStorage.removeItem('email'); localStorage.removeItem('user_id'); localStorage.removeItem('full_name'); sessionStorage.removeItem('user'); sessionStorage.removeItem('token'); sessionStorage.removeItem('email'); sessionStorage.removeItem('user_id'); sessionStorage.removeItem('full_name'); } catch (_) { } window.location.replace('/'); }}>
                <span className="material-icons-outlined">logout</span>
                <span className="nav-label">Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h2>Dashboard Overview</h2>
          </div>
          <div className="top-bar-right">
            <button className="icon-button notification-button">
              <span className="material-icons-outlined">notifications</span>
              <span className="notification-badge">3</span>
            </button>
            <div className="user-profile">
              {/* Hidden file input for avatar upload */}
              <input
                id="avatar-upload-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  try {
                    // Resolve user id from storage again
                    const raw = (typeof localStorage !== 'undefined' && localStorage.getItem('user')) ||
                      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('user'));
                    let uid = null;
                    try { uid = raw ? (JSON.parse(raw)._id || JSON.parse(raw).id || JSON.parse(raw).user_id) : null; } catch { }
                    const resolvedId = uid || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('user_id')) || (typeof localStorage !== 'undefined' && localStorage.getItem('user_id'));
                    if (!resolvedId) return;

                    const form = new FormData();
                    form.append('user_id', resolvedId);
                    form.append('file', file);
                    const res = await fetch(`${API_BASE}/auth/upload-avatar`, { method: 'POST', body: form });
                    if (!res.ok) return;
                    const out = await res.json();
                    if (out && out.avatar_url) {
                      const absolute = out.avatar_url.startsWith('http') ? out.avatar_url : `${API_BASE}${out.avatar_url}`;
                      setAvatarUrl(absolute + `?t=${Date.now()}`); // bust cache
                    }
                  } catch (_) {
                    // ignore errors silently
                  } finally {
                    // reset input value to allow re-uploading same file
                    e.target.value = '';
                  }
                }}
              />
              <img
                src={avatarUrl || "placeholder-avatar.png"}
                alt="User Avatar"
                className="user-avatar"
                onClick={() => {
                  const el = document.getElementById('avatar-upload-input');
                  if (el) el.click();
                }}
                title="Click to upload/change avatar"
                style={{ cursor: 'pointer' }}
              />
              <span className="user-name">{hrName || 'User'}</span>
              <span className="material-icons-outlined dropdown-icon">
                expand_more
              </span>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <main className="dashboard-grid">
          {/* Welcome Card */}
          <section className="card welcome-card">
            <span className="material-icons-outlined welcome-icon">
              waving_hand
            </span>
            <div>
              <h2>Welcome, {hrName ? hrName : 'HR Manager'}!</h2>
              <p>Here's what's happening with your recruitment pipeline today.</p>
            </div>
          </section>

          {/* Stats Section */}
          <section className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <span className="material-icons-outlined">groups</span>
              </div>
              <div className="stat-content">
                <h3>Total Candidates</h3>
                <p>{candidateCount}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <span className="material-icons-outlined">event_available</span>
              </div>
              <div className="stat-content">
                <h3>My Scheduled Interviews</h3>
                <p>{interviewCount}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <span className="material-icons-outlined">person_search</span>
              </div>
              <div className="stat-content">
                <h3>Matches Found</h3>
                <p>105</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon-wrapper">
                <span className="material-icons-outlined">rate_review</span>
              </div>
              <div className="stat-content">
                <h3>Feedbacks</h3>
                <p>{feedbackCount >= 0 ? feedbackCount : 'N/A'}</p>
              </div>
            </div>
          </section>

          {/* Candidates Table */}
          <section className="card list-card candidates-table-card">
            <h3>Matching Candidates</h3>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate Name</th>
                    <th>Field</th>
                    <th>Match %</th>
                    <th>Score</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="candidate-info">
                        <img
                          src="placeholder-avatar-1.png"
                          alt="Candidate Avatar"
                          className="candidate-avatar"
                        />
                        <span>Ben Carter</span>
                      </div>
                    </td>
                    <td>Software Engineer</td>
                    <td>
                      <span className="match-percent high">92%</span>
                    </td>
                    <td>8.5 / 10</td>
                    <td>
                      <button className="button button-secondary">
                        View Profile
                      </button>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="candidate-info">
                        <img
                          src="placeholder-avatar-2.png"
                          alt="Candidate Avatar"
                          className="candidate-avatar"
                        />
                        <span>Olivia Green</span>
                      </div>
                    </td>
                    <td>UX Designer</td>
                    <td>
                      <span className="match-percent medium">78%</span>
                    </td>
                    <td>7.2 / 10</td>
                    <td>
                      <button className="button button-secondary">
                        View Profile
                      </button>
                    </td>
                  </tr>

                  <tr>
                    <td>
                      <div className="candidate-info">
                        <img
                          src="placeholder-avatar-3.png"
                          alt="Candidate Avatar"
                          className="candidate-avatar"
                        />
                        <span>Mark Roberts</span>
                      </div>
                    </td>
                    <td>Data Scientist</td>
                    <td>
                      <span className="match-percent high">89%</span>
                    </td>
                    <td>8.1 / 10</td>
                    <td>
                      <button className="button button-secondary">
                        View Profile
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Upcoming Interviews */}
          <section className="card list-card calendar-widget-card">
            <h3>Upcoming Interviews</h3>
            <ul className="interview-list">
              <li className="interview-item">
                <div className="interview-date bg-blue-light icon-blue">
                  <span className="day">15</span>
                  <span className="month">JUL</span>
                </div>
                <div className="interview-details">
                  <span className="candidate-name">David Lee</span>
                  <span className="interview-time">
                    10:00 AM - 10:45 AM
                  </span>
                  <span className="interview-position">
                    Senior Frontend Dev
                  </span>
                </div>
                <button className="icon-button">
                  <span className="material-icons-outlined">more_vert</span>
                </button>
              </li>

              <li className="interview-item">
                <div className="interview-date bg-green-light icon-green">
                  <span className="day">15</span>
                  <span className="month">JUL</span>
                </div>
                <div className="interview-details">
                  <span className="candidate-name">Sophia Miller</span>
                  <span className="interview-time">
                    02:00 PM - 02:30 PM
                  </span>
                  <span className="interview-position">
                    Product Manager
                  </span>
                </div>
                <button className="icon-button">
                  <span className="material-icons-outlined">more_vert</span>
                </button>
              </li>

              <li className="interview-item">
                <div className="interview-date bg-orange-light icon-orange">
                  <span className="day">16</span>
                  <span className="month">JUL</span>
                </div>
                <div className="interview-details">
                  <span className="candidate-name">Ethan Garcia</span>
                  <span className="interview-time">
                    11:00 AM - 12:00 PM
                  </span>
                  <span className="interview-position">
                    Backend Engineer
                  </span>
                </div>
                <button className="icon-button">
                  <span className="material-icons-outlined">more_vert</span>
                </button>
              </li>
            </ul>
            <a href="full-schedule.html" className="view-all-link">
              View Full Schedule
            </a>
          </section>
        </main>
      </div>
    </div>
  );
};

export default HrDashboard;