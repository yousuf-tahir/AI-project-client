import React, { useEffect, useState, useCallback } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";

const HrDashboard = ({ onNavigate }) => {
  const [hrName, setHrName] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [candidateCount, setCandidateCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [matchingCandidates, setMatchingCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(true);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  const tryParseUser = (raw) => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // Enhanced function to fetch full candidate profile details
  const fetchCandidateProfile = async (candidateId) => {
    const paths = [
      `${API_BASE}/api/profile/${encodeURIComponent(candidateId)}`,
      `${API_BASE}/auth/me?user_id=${encodeURIComponent(candidateId)}`,
    ];
    
    let lastErr = null;
    for (const url of paths) {
      try {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (!response.ok) continue;
        
        const data = await response.json();
        if (data && Object.keys(data).length > 0) {
          console.log('Fetched candidate profile:', data);
          return data;
        }
      } catch (e) { 
        lastErr = e; 
      }
    }
    
    // Fallback: try localStorage
    try {
      const raw = localStorage.getItem('applications');
      const arr = raw ? JSON.parse(raw) : [];
      const rec = (Array.isArray(arr) ? arr : []).find(a => String(a.candidate_id||'') === String(candidateId));
      if (rec) {
        return {
          _id: candidateId,
          full_name: rec.candidate_name || rec.name || '',
          email: rec.candidate_email || rec.email || '',
          field: rec.field || '',
          location: rec.location || '',
          experience: rec.experience || '',
          skills: rec.candidate_skills || rec.skills || [],
          certificates: rec.candidate_certificates || rec.certificates || '',
          cv_url: rec.cv || '',
          profile_pic: rec.profile_pic || '',
        };
      }
    } catch {}
    
    return { _id: candidateId };
  };

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

      const count = data.hr_interviews_count || data.alt_hr_count || data.total_interviews || 0;
      setInterviewCount(count);

    } catch (error) {
      console.error('Error in fetchInterviewCount:', error);
      setInterviewCount(-1);
    }
  };

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

      setCandidateCount(data.total || 0);
    } catch (error) {
      console.error('Error fetching candidate count:', error);
      setCandidateCount(0);
    }
  };

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

      setFeedbackCount(data.total_feedback || 0);

    } catch (error) {
      console.error('Error in fetchFeedbackCount:', error);
      setFeedbackCount(-1);
    }
  }, [API_BASE]);

  const fetchMatchingCandidates = useCallback(async () => {
    try {
      setLoadingCandidates(true);
      const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
      console.log('Fetching matching candidates from:', `${API_BASE}/api/admin/candidates`);

      const response = await fetch(`${API_BASE}/api/admin/candidates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Candidates data:', data);

      const candidates = Array.isArray(data) ? data : data?.data || [];
      
      // Take top 3 candidates
      const topCandidates = candidates.slice(0, 3);
      
      // Fetch full profile details for each candidate to get field and location
      const enrichedCandidates = await Promise.all(
        topCandidates.map(async (candidate) => {
          const candidateId = candidate._id || candidate.id || candidate.candidate_id;
          if (!candidateId) return candidate;
          
          try {
            const profile = await fetchCandidateProfile(candidateId);
            return {
              ...candidate,
              field: profile.field || candidate.field || candidate.domain || candidate.category || candidate.position || candidate.title || 'N/A',
              location: profile.location || candidate.location || 'N/A',
              full_name: profile.full_name || candidate.name || candidate.full_name || 'Unknown',
              email: profile.email || candidate.email || '',
            };
          } catch (err) {
            console.error(`Failed to fetch profile for candidate ${candidateId}:`, err);
            return candidate;
          }
        })
      );

      console.log('Enriched candidates for display:', enrichedCandidates);
      setMatchingCandidates(enrichedCandidates);
    } catch (error) {
      console.error('Error fetching matching candidates:', error);
      setMatchingCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([
        fetchCandidateCount(),
        fetchInterviewCount(),
        fetchFeedbackCount(),
        fetchMatchingCandidates()
      ]);
    };
    fetchData();
  }, [fetchFeedbackCount, fetchMatchingCandidates]);

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
        if (!url) return;

        const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!resp.ok) return;
        const data = await resp.json();
        if (data && typeof data.full_name === 'string' && data.full_name.trim()) {
          setHrName(data.full_name.trim());
        }
        if (data && data._id) {
          const fromApi = data.avatar_url;
          if (fromApi && typeof fromApi === 'string' && fromApi.trim()) {
            const absolute = fromApi.startsWith('http') ? fromApi : `${API_BASE}${fromApi}`;
            setAvatarUrl(absolute);
          } else {
            setAvatarUrl(`${API_BASE}/auth/avatar/${data._id}`);
          }
        }
      } catch (e) {
        // Silently ignore
      }
    };

    fetchName();
  }, []);

  const handleNavigation = (path) => (e) => {
    if (e) e.preventDefault();
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const go = (path, e) => {
    if (e) e.preventDefault();
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const getCandidateName = (candidate) => {
    return candidate.full_name || candidate.name || 'Unknown';
  };

  const getCandidateField = (candidate) => {
    return candidate.field || 'N/A';
  };

  const getCandidateLocation = (candidate) => {
    return candidate.location || 'N/A';
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
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/hr-analysis-list'); }}>
                <span className="material-icons-outlined">analytics</span>
                <span className="nav-label">Interview Analysis</span>
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
              <input
                id="avatar-upload-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  try {
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
                      setAvatarUrl(absolute + `?t=${Date.now()}`);
                    }
                  } catch (_) {
                  } finally {
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

        <main className="dashboard-grid">
          <section className="card welcome-card">
            <span className="material-icons-outlined welcome-icon">
              waving_hand
            </span>
            <div>
              <h2>Welcome, {hrName ? hrName : 'HR Manager'}!</h2>
              <p>Here's what's happening with your recruitment pipeline today.</p>
            </div>
          </section>

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
                <p>{matchingCandidates.length}</p>
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

          <section className="card list-card candidates-table-card">
            <h3>Matching Candidates</h3>
            <div className="table-responsive">
              {loadingCandidates ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                  Loading candidates...
                </div>
              ) : matchingCandidates.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>
                  No matching candidates found
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Candidate Name</th>
                      <th>Field</th>
                      <th>Location</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchingCandidates.map((candidate, index) => {
                      const initials = getCandidateName(candidate)
                        .split(' ')
                        .map(p => p[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();
                      
                      return (
                        <tr key={candidate._id || candidate.id || index}>
                          <td>
                            <div className="candidate-info">
                              <div 
                                className="candidate-avatar" 
                                style={{ 
                                  width: '36px', 
                                  height: '36px', 
                                  borderRadius: '50%', 
                                  background: '#e0f2fe', 
                                  color: '#0369a1', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  fontWeight: 700,
                                  fontSize: '14px'
                                }}
                              >
                                {initials}
                              </div>
                              <span>{getCandidateName(candidate)}</span>
                            </div>
                          </td>
                          <td>{getCandidateField(candidate)}</td>
                          <td>
                            <span style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '6px',
                              color: '#475569' 
                            }}>
                              <span className="material-icons-outlined" style={{ fontSize: '16px' }}>
                                location_on
                              </span>
                              {getCandidateLocation(candidate)}
                            </span>
                          </td>
                          <td>
                            <button 
                              className="button button-secondary"
                              onClick={() => onNavigate && onNavigate('/candidates')}
                            >
                              View Profile
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>

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