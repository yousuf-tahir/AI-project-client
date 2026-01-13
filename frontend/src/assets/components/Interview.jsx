import React, { useState, useEffect, useMemo } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/interview.css";
import "../styles/candidate.css";

const Interview = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [realInterviews, setRealInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(true);
  const [interviewModal, setInterviewModal] = useState(null);

  // Get API base URL
  const API_BASE = useMemo(() => {
    return import.meta.env?.VITE_API_BASE || 'http://localhost:8000';
  }, []);

  // Get stored user
  const user = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }, []);

  // Helper function to format field name (convert snake_case to Title Case)
  const formatFieldName = (field) => {
    if (!field) return 'General Interview';
    return field
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Fetch interviews on mount
  useEffect(() => {
    let isMounted = true;

    const fetchInterviews = async () => {
      if (!user) {
        console.error('No user found');
        setLoadingInterviews(false);
        return;
      }

      const candidateId = user._id || user.id || user.user_id;
      if (!candidateId) {
        console.error('No candidate ID found');
        setLoadingInterviews(false);
        return;
      }

      try {
        console.log('Fetching interviews for candidate:', candidateId);
        // Fetch ALL interviews for the candidate (not just upcoming)
        const resp = await fetch(`${API_BASE}/api/interviews?candidate_id=${candidateId}`);

        if (!resp.ok) {
          const errorText = await resp.text();
          console.error('Failed to fetch interviews:', resp.status, errorText);
          throw new Error('Failed to load interviews');
        }

        const data = await resp.json();

        if (isMounted) {
          console.log('Fetched interviews:', data);
          setRealInterviews(Array.isArray(data) ? data : []);
          setLoadingInterviews(false);
        }
      } catch (error) {
        console.error('Error fetching interviews:', error);
        if (isMounted) {
          setRealInterviews([]);
          setLoadingInterviews(false);
        }
      }
    };

    fetchInterviews();

    return () => {
      isMounted = false;
    };
  }, [user, API_BASE]);

  // Format upcoming interviews
  const upcomingInterviews = useMemo(() => {
    if (!realInterviews || realInterviews.length === 0) return [];

    return realInterviews
      .filter(interview => {
        try {
          const interviewDateTime = new Date(`${interview.date}T${interview.time}`);
          // FIXED: Check if interview END time (start + duration) is in the future
          const interviewEndTime = new Date(interviewDateTime.getTime() + (interview.duration || 30) * 60 * 1000);
          return interviewEndTime > new Date();
        } catch {
          return false;
        }
      })
      .map((interview, index) => {
        const interviewDate = new Date(`${interview.date}T${interview.time}`);
        const day = interviewDate.getDate().toString().padStart(2, '0');
        const month = interviewDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();

        const now = new Date();
        const diffMs = interviewDate - now;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        let countdown;
        if (diffDays > 0) {
          countdown = `Starts in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
          countdown = `Starts in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        } else if (diffMs > 0) {
          const diffMinutes = Math.floor(diffMs / (1000 * 60));
          countdown = `Starts in ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
        } else {
          countdown = 'Interview in progress!';
        }

        const colors = [
          'bg-blue-light icon-blue',
          'bg-green-light icon-green',
          'bg-purple-light icon-purple',
          'bg-orange-light icon-orange',
          'bg-pink-light icon-pink'
        ];
        const colorClass = colors[index % colors.length];

        return {
          interviewId: interview._id, // FIXED: Use _id instead of interviewId
          day,
          month,
          jobTitle: interview.jobTitle || 'Interview Session',
          time: interview.time,
          countdown,
          colorClass,
          hasRoom: !!interview.room_id, // FIXED: Check if room_id exists
          roomId: interview.room_id,
          roomStatus: interview.room_status,
          date: interview.date,
          duration: interview.duration,
          type: interview.type,
          field: interview.field,
          joinUrl: interview.joinUrl,
          isPast: false
        };
      });
  }, [realInterviews]);

  // Format past interviews
  const pastInterviews = useMemo(() => {
    if (!realInterviews || realInterviews.length === 0) return [];

    return realInterviews
      .filter(interview => {
        try {
          const interviewDateTime = new Date(`${interview.date}T${interview.time}`);
          // FIXED: Check if interview END time (start + duration) has passed
          const interviewEndTime = new Date(interviewDateTime.getTime() + (interview.duration || 30) * 60 * 1000);
          return interviewEndTime <= new Date();
        } catch {
          return false;
        }
      })
      .map((interview, index) => {
        const interviewDate = new Date(`${interview.date}T${interview.time}`);
        const day = interviewDate.getDate().toString().padStart(2, '0');
        const month = interviewDate.toLocaleString('en-US', { month: 'short' }).toUpperCase();

        const colors = [
          'bg-purple-light icon-purple',
          'bg-blue-light icon-blue',
          'bg-orange-light icon-orange'
        ];
        const colorClass = colors[index % colors.length];

        return {
          interviewId: interview._id, // FIXED: Use _id instead of interviewId
          day,
          month,
          jobTitle: interview.jobTitle || 'Interview Session',
          time: interview.time,
          colorClass,
          date: interview.date,
          duration: interview.duration,
          type: interview.type,
          field: interview.field,
          hasRoom: !!interview.room_id, // FIXED: Check if room_id exists
          roomId: interview.room_id,
          isPast: true
        };
      });
  }, [realInterviews]);

  const handleJoinInterview = (interviewId) => {
    console.log('Joining interview:', interviewId);
    if (typeof onNavigate === 'function') {
      onNavigate(`/interview-room/${interviewId}`);
    } else {
      window.location.href = `/interview-room/${interviewId}`;
    }
  };

  const openInterviewDetails = (interview) => {
    setInterviewModal(interview);
  };

  const closeInterviewModal = () => setInterviewModal(null);

  const go = (path) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  return (
    <div className="candidate-dashboard-layout">
      {/* Sidebar */}
      <aside className="candidate-sidebar">
        <div className="sidebar-header">
          <span className="app-logo-candidate">Candidate</span>
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
            <li className="nav-item active">
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
                <span className="nav-label">Feedback</span>
              </a>
            </li>
            <li className="nav-item">
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
              <a href="#" id="logout-link" className="logout-link" onClick={(e) => {
                e.preventDefault();
                const ok = window.confirm('Are you sure you want to logout?');
                if (!ok) return;
                try {
                  localStorage.removeItem('user');
                  localStorage.removeItem('token');
                  sessionStorage.removeItem('user');
                  sessionStorage.removeItem('token');
                } catch (_) { }
                window.location.replace('/');
              }}>
                <span className="material-icons-outlined">logout</span>
                <span className="nav-label">Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <div className="candidate-main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h2>My Interviews</h2>
          </div>
          <div className="top-bar-right"></div>
        </header>

        {/* Main Tabs */}
        <main className="interviews-main">
          <div className="filter-tabs">
            <button
              className={`tab-button ${activeTab === "upcoming" ? "active" : ""}`}
              onClick={() => setActiveTab("upcoming")}
            >
              Upcoming
            </button>
            <button
              className={`tab-button ${activeTab === "past" ? "active" : ""}`}
              onClick={() => setActiveTab("past")}
            >
              Past
            </button>
          </div>

          <div className="interviews-grid">
            {activeTab === "upcoming" && (
              <div className="interviews-section">
                <h3>Upcoming Interviews</h3>
                {loadingInterviews ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{
                      display: 'inline-block',
                      width: '40px',
                      height: '40px',
                      border: '4px solid #e2e8f0',
                      borderTop: '4px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading interviews...</p>
                  </div>
                ) : upcomingInterviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '4rem', color: '#cbd5e1', marginBottom: '1rem' }}>event_busy</span>
                    <p style={{ color: '#64748b', fontSize: '1.125rem' }}>No upcoming interviews scheduled</p>
                  </div>
                ) : (
                  <div className="interviews-list">
                    {upcomingInterviews.map((interview) => {
                      const interviewDateTime = new Date(`${interview.date}T${interview.time}`);
                      const now = new Date();
                      const isJoinTime = now >= interviewDateTime;

                      return (
                        <div className="interview-card" key={interview.interviewId}>
                          <div className="interview-header">
                            <div className={`interview-date ${interview.colorClass}`}>
                              <span className="day">{interview.day}</span>
                              <span className="month">{interview.month}</span>
                            </div>
                            <div className="interview-details">
                              <h4>{interview.jobTitle}</h4>
                              <div className="interview-field-tag">
                                <span className="material-icons-outlined" style={{ 
                                  fontSize: '0.875rem', 
                                  marginRight: '4px',
                                  verticalAlign: 'middle' 
                                }}>category</span>
                                <span style={{ 
                                  fontSize: '0.875rem',
                                  color: '#6b7280',
                                  fontWeight: '500',
                                  verticalAlign: 'middle'
                                }}>
                                  {formatFieldName(interview.field)}
                                </span>
                              </div>
                              <p className="interview-time">{interview.time}</p>
                              <p className="interview-duration">{interview.duration} minutes</p>
                              <p className="interview-countdown" style={{
                                color: '#6366f1',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                marginTop: '0.25rem'
                              }}>
                                {interview.countdown}
                              </p>
                            </div>
                            <div className="interview-status">
                              {interview.hasRoom ? (
                                <span className="status-badge" style={{
                                  background: '#d1fae5',
                                  color: '#065f46',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}>
                                  <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>check_circle</span>
                                  Room Ready
                                </span>
                              ) : (
                                <span className="status-badge" style={{
                                  background: '#fef3c7',
                                  color: '#92400e'
                                }}>
                                  Waiting for Room
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="interview-actions">
                            {interview.hasRoom && (
                              <button
                                className="button button-primary button-small"
                                onClick={() => isJoinTime && handleJoinInterview(interview.interviewId)}
                                disabled={!isJoinTime}
                                style={{
                                  background: isJoinTime ? '#10b981' : '#9ca3af',
                                  cursor: isJoinTime ? 'pointer' : 'not-allowed',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>meeting_room</span>
                                {isJoinTime ? "Join Interview" : `Available at ${interview.time}`}
                              </button>
                            )}

                            <button
                              className="button button-secondary button-small"
                              onClick={() => openInterviewDetails(interview)}
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "past" && (
              <div className="interviews-section">
                <h3>Past Interviews</h3>
                {loadingInterviews ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{
                      display: 'inline-block',
                      width: '40px',
                      height: '40px',
                      border: '4px solid #e2e8f0',
                      borderTop: '4px solid #3b82f6',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    <p style={{ marginTop: '1rem', color: '#64748b' }}>Loading interviews...</p>
                  </div>
                ) : pastInterviews.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <span className="material-icons-outlined" style={{ fontSize: '4rem', color: '#cbd5e1', marginBottom: '1rem' }}>history</span>
                    <p style={{ color: '#64748b', fontSize: '1.125rem' }}>No past interviews found</p>
                  </div>
                ) : (
                  <div className="interviews-list">
                    {pastInterviews.map((interview) => (
                      <div className="interview-card" key={interview.interviewId}>
                        <div className="interview-header">
                          <div className={`interview-date ${interview.colorClass}`}>
                            <span className="day">{interview.day}</span>
                            <span className="month">{interview.month}</span>
                          </div>
                          <div className="interview-details">
                            <h4>{interview.jobTitle}</h4>
                            <div className="interview-field-tag">
                              <span className="material-icons-outlined" style={{ 
                                fontSize: '0.875rem', 
                                marginRight: '4px',
                                verticalAlign: 'middle' 
                              }}>category</span>
                              <span style={{ 
                                fontSize: '0.875rem',
                                color: '#6b7280',
                                fontWeight: '500',
                                verticalAlign: 'middle'
                              }}>
                                {formatFieldName(interview.field)}
                              </span>
                            </div>
                            <p className="interview-time">{interview.time}</p>
                            <p className="interview-duration">{interview.duration} minutes</p>
                          </div>
                         
                          <div className="interview-status">
                            <span className="status-badge status-completed">Completed</span>
                          </div>
                        </div>
                        <div className="interview-actions">
                          <button
                            className="button button-secondary button-small"
                            onClick={() => openInterviewDetails(interview)}
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Interview Details Modal */}
      {interviewModal && (
        <div className="interview-details-modal modal" onClick={(e) => e.target === e.currentTarget && closeInterviewModal()}>
          <div className="modal-content">
            <h3>Interview Details</h3>
            <div className="modal-body">
              <div className="detail-item">
                <span className="label">Position:</span>
                <span className="value">{interviewModal.jobTitle}</span>
              </div>
              {interviewModal.field && (
                <div className="detail-item">
                  <span className="label">Field:</span>
                  <span className="value">{formatFieldName(interviewModal.field)}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="label">Date:</span>
                <span className="value">{interviewModal.date}</span>
              </div>
              <div className="detail-item">
                <span className="label">Time:</span>
                <span className="value">{interviewModal.time} ({interviewModal.duration} min)</span>
              </div>
              <div className="detail-item">
                <span className="label">Type:</span>
                <span className="value" style={{ textTransform: 'capitalize' }}>{interviewModal.type}</span>
              </div>
              <div className="detail-item">
                <span className="label">Status:</span>
                <span className="value">
                  {interviewModal.isPast ? (
                    <span style={{ color: '#6b7280', fontWeight: '500' }}>
                      <span className="material-icons-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle' }}>check</span>
                      {' '}Interview Completed
                    </span>
                  ) : interviewModal.hasRoom ? (
                    <span style={{ color: '#10b981', fontWeight: '500' }}>
                      <span className="material-icons-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle' }}>check_circle</span>
                      {' '}Room Ready - You can join now
                    </span>
                  ) : (
                    <span style={{ color: '#f59e0b' }}>Waiting for HR to create room</span>
                  )}
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="button button-secondary" onClick={closeInterviewModal}>Close</button>
              {interviewModal.hasRoom && !interviewModal.isPast && (
                <button
                  className="button button-primary"
                  onClick={() => {
                    closeInterviewModal();
                    handleJoinInterview(interviewModal.interviewId);
                  }}
                  style={{ background: '#10b981' }}
                >
                  <span className="material-icons-outlined" style={{ fontSize: '1rem', verticalAlign: 'middle' }}>meeting_room</span>
                  {' '}Join Interview Room
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .interview-field-tag {
          margin: 4px 0;
          display: flex;
          align-items: center;
        }
      `}</style>
    </div>
  );
};

export default Interview;