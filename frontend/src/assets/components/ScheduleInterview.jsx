import React, { useEffect, useMemo, useState } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";
import "../styles/schedule-interview.css";

// Simple toast component with icon
function Toast({ type = "success", message }) {
  if (!message) return null;
  const icon = type === 'error' ? 'error' : 'check_circle';
  return (
    <div className={`toast ${type}`} role="status" aria-live="polite">
      <span className="material-icons-outlined toast-icon" aria-hidden>{icon}</span>
      <span>{message}</span>
    </div>
  );
}

export default function ScheduleInterview({ onNavigate }) {
  const [candidate, setCandidate] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState("voice");
  const [duration, setDuration] = useState(30);
  const [field, setField] = useState("web_development");
  const [toast, setToast] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // Track which interview is being deleted
  const [candidates, setCandidates] = useState([{ value: "", label: "Select Candidate" }]);
  const [scheduledInterviews, setScheduledInterviews] = useState([]);
  const [loadingInterviews, setLoadingInterviews] = useState(false);

  const API_BASE = import.meta.env?.VITE_API_BASE || 'http://localhost:8000';

  const jobFields = [
    { value: "web_development", label: "Web Development" },
    { value: "mobile_development", label: "Mobile Development" },
    { value: "data_science", label: "Data Science" },
    { value: "machine_learning", label: "Machine Learning" },
    { value: "backend_development", label: "Backend Development" },
    { value: "frontend_development", label: "Frontend Development" },
    { value: "full_stack_development", label: "Full Stack Development" },
    { value: "devops", label: "DevOps" },
    { value: "cloud_engineering", label: "Cloud Engineering" },
    { value: "cybersecurity", label: "Cybersecurity" },
    { value: "ui_ux_design", label: "UI/UX Design" },
    { value: "product_management", label: "Product Management" },
    { value: "qa_testing", label: "QA Testing" },
    { value: "database_administration", label: "Database Administration" },
    { value: "system_architecture", label: "System Architecture" },
    { value: "blockchain", label: "Blockchain" },
    { value: "game_development", label: "Game Development" },
    { value: "embedded_systems", label: "Embedded Systems" },
    { value: "general", label: "General (All Fields)" }
  ];

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/interviews/candidates/list`);
        if (!resp.ok) throw new Error('Failed to load candidates');
        const data = await resp.json();
        const items = [{ value: "", label: "Select Candidate" }, ...data];
        setCandidates(items);
      } catch (e) {
        showToast('error', e.message || 'Failed to load candidates');
      }
    };
    fetchCandidates();
  }, [API_BASE]);

  useEffect(() => {
    loadScheduledInterviews();
    // Auto-cleanup every 5 minutes
    const interval = setInterval(() => {
      cleanupOldInterviews();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [API_BASE]);

  const loadScheduledInterviews = async () => {
    setLoadingInterviews(true);
    try {
      const hrId = resolveHR();
      if (!hrId) return;

      const resp = await fetch(`${API_BASE}/api/interviews?hr_id=${hrId}`);
      if (!resp.ok) throw new Error('Failed to load interviews');
      const data = await resp.json();
      setScheduledInterviews(data);
    } catch (e) {
      console.error('Error loading interviews:', e);
    } finally {
      setLoadingInterviews(false);
    }
  };

  // Auto-delete interviews older than 24 hours
  const cleanupOldInterviews = async () => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const oldInterviews = scheduledInterviews.filter(interview => {
      if (!interview.date || !interview.time) return false;
      const interviewDateTime = new Date(`${interview.date}T${interview.time}`);
      return interviewDateTime < twentyFourHoursAgo;
    });

    if (oldInterviews.length === 0) return;

    for (const interview of oldInterviews) {
      await deleteInterview(interview._id, true); // silent = true
    }
  };

  const resolveHR = () => {
    const raw = (typeof localStorage !== 'undefined' && localStorage.getItem('user')) ||
                (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('user'));
    try {
      const obj = raw ? JSON.parse(raw) : null;
      return obj && (obj._id || obj.id || obj.user_id) ? (obj._id || obj.id || obj.user_id) : null;
    } catch {
      return null;
    }
  };

  const candidateScore = useMemo(() => {
    const found = candidates.find((c) => c.value === candidate);
    return found?.score || null;
  }, [candidate, candidates]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast({ type: "", message: "" }), 4000);
  };

  const handleSubmit = async () => {
    if (!candidate || !date || !time || !duration || !field) {
      showToast("error", "Please fill in all required fields");
      return;
    }

    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    if (!(selectedDateTime > now)) {
      showToast("error", "Please select a future date and time");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        candidate_id: candidate,
        date,
        time,
        type,
        duration: Number(duration),
        field
      };
      const hrId = resolveHR();
      if (hrId) payload.hr_id = hrId;

      const resp = await fetch(`${API_BASE}/api/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to schedule interview');
      }

      showToast("success", "Interview scheduled successfully!");
      setCandidate("");
      setDate("");
      setTime("");
      setType("voice");
      setDuration(30);
      setField("web_development");

      await loadScheduledInterviews();

    } catch (err) {
      showToast("error", err.message || "Failed to schedule interview");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRoom = async (interviewId) => {
    try {
      const hrId = resolveHR();
      const resp = await fetch(`${API_BASE}/api/interview-rooms/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interview_id: interviewId, hr_id: hrId }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create room');
      }

      const data = await resp.json();
      showToast("success", "Room created successfully!");

      await loadScheduledInterviews();

      setTimeout(() => {
        if (window.confirm(`Room created! Join URL:\n${data.joinUrl}\n\nClick OK to copy to clipboard.`)) {
          navigator.clipboard.writeText(data.joinUrl);
        }
      }, 500);

    } catch (err) {
      showToast("error", err.message || "Failed to create room");
    }
  };

  const handleJoinRoom = (interviewId) => {
    const path = `/interview-room/${interviewId}`;
    if (typeof onNavigate === "function") {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  // Manual delete function
  const deleteInterview = async (interviewId, silent = false) => {
    if (!silent && !window.confirm("Are you sure you want to delete this interview? This cannot be undone.")) {
      return;
    }

    setDeletingId(interviewId);
    try {
      const resp = await fetch(`${API_BASE}/api/interviews/${interviewId}`, {
        method: 'DELETE',
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to delete interview');
      }

      if (!silent) {
        showToast("success", "Interview deleted successfully");
      }

      // Remove from state
      setScheduledInterviews(prev => prev.filter(i => i._id !== interviewId));

    } catch (err) {
      if (!silent) {
        showToast("error", err.message || "Failed to delete interview");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const go = (path, e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof onNavigate === "function") onNavigate(path);
    else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const minDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Helper: Check if interview is older than 24h
  const isOlderThan24h = (interview) => {
    if (!interview.date || !interview.time) return false;
    const interviewDateTime = new Date(`${interview.date}T${interview.time}`);
    const now = new Date();
    return (now - interviewDateTime) > (24 * 60 * 60 * 1000);
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        {/* Sidebar unchanged */}
        <div className="sidebar-header">
          <span className="app-logo">HR</span> Recruit
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item"><a href="#" onClick={(e) => go('/hr', e)}><span className="material-icons-outlined">dashboard</span><span className="nav-label">Dashboard</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/candidates', e)}><span className="material-icons-outlined">people_alt</span><span className="nav-label">Candidates</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/set-criteria', e)}><span className="material-icons-outlined">history</span><span className="nav-label">Set Criteria</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/job-display', e)}><span className="material-icons-outlined">work</span><span className="nav-label">Job Display</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/candidates-apply', e)}><span className="material-icons-outlined">how_to_reg</span><span className="nav-label">Candidates Apply</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/hr-profile', e)}><span className="material-icons-outlined">badge</span><span className="nav-label">Profile</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/interview-questions', e)}><span className="material-icons-outlined">quiz</span><span className="nav-label">Interview Questions</span></a></li>
            <li className="nav-item active"><a href="#" onClick={(e) => go('/schedule-interview', e)}><span className="material-icons-outlined">event</span><span className="nav-label">Schedule Interviews</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/notifications', e)}><span className="material-icons-outlined">notifications</span><span className="nav-label">Notifications</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/feedback', e)}><span className="material-icons-outlined">rate_review</span><span className="nav-label">Feedback</span></a></li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <ul>
            <li className="nav-item"><a href="#" onClick={(e) => go('/settings', e)}><span className="material-icons-outlined">settings</span><span className="nav-label">Settings</span></a></li>
            <li className="nav-item">
              <a href="#" className="logout-link" onClick={(e) => {
                e.preventDefault();
                if (window.confirm('Are you sure you want to logout?')) {
                  try { localStorage.clear(); sessionStorage.clear(); } catch {}
                  window.location.replace('/');
                }
              }}>
                <span className="material-icons-outlined">logout</span><span className="nav-label">Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      <div className="main-content">
        <main className="content-area">
          {/* Schedule Form (unchanged) */}
          <section className="card schedule-interview-card">
            <div className="criteria-form">
              <h3 className="form-title">Schedule New Interview</h3>
              {/* ... all your existing form fields ... */}
              <div className="form-group">
                <label htmlFor="candidate">Candidate</label>
                <div className="input-group">
                  <span className="material-icons-outlined">people_alt</span>
                  <select id="candidate" className="form-control" value={candidate} onChange={(e) => setCandidate(e.target.value)}>
                    {candidates.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
                {candidateScore && (
                  <div className="score-display">Match Score: {candidateScore}%</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="field">Job Field</label>
                <div className="input-group">
                  <span className="material-icons-outlined">work</span>
                  <select id="field" className="form-control" value={field} onChange={(e) => setField(e.target.value)}>
                    {jobFields.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <small style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  Questions will be selected based on this field
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="interviewDate">Interview Date</label>
                <div className="input-group">
                  <span className="material-icons-outlined">calendar_today</span>
                  <input type="date" id="interviewDate" className="form-control" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="interviewTime">Interview Time</label>
                <div className="input-group">
                  <span className="material-icons-outlined">access_time</span>
                  <input type="time" id="interviewTime" className="form-control" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label>Interview Type</label>
                <div className="radio-group">
                  <div className="radio-item">
                    <input type="radio" id="voice" name="interviewType" value="voice" checked={type === "voice"} onChange={(e) => setType(e.target.value)} />
                    <label htmlFor="voice"><span className="material-icons-outlined">mic</span>Voice</label>
                  </div>
                  <div className="radio-item">
                    <input type="radio" id="text" name="interviewType" value="text" checked={type === "text"} onChange={(e) => setType(e.target.value)} />
                    <label htmlFor="text"><span className="material-icons-outlined">textsms</span>Text</label>
                  </div>
                  <div className="radio-item">
                    <input type="radio" id="both" name="interviewType" value="both" checked={type === "both"} onChange={(e) => setType(e.target.value)} />
                    <label htmlFor="both"><span className="material-icons-outlined">mic</span><span className="material-icons-outlined">textsms</span>Both</label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="duration">Interview Duration</label>
                <div className="input-group">
                  <span className="material-icons-outlined">timer</span>
                  <input type="number" id="duration" className="form-control" min={15} max={120} step={15} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
                  <span className="input-suffix">minutes</span>
                </div>
              </div>

              <div className="form-group">
                <button type="button" className="button button-primary" onClick={handleSubmit} disabled={submitting}>
                  <span className="material-icons-outlined">event</span>
                  {submitting ? 'Scheduling...' : 'Schedule Interview'}
                </button>
              </div>
            </div>
          </section>

          {/* Scheduled Interviews List */}
          <section className="card schedule-interview-card" style={{ marginTop: '20px' }}>
            <h3 className="form-title">Scheduled Interviews</h3>

            {loadingInterviews ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>Loading...</div>
            ) : scheduledInterviews.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>No scheduled interviews yet</div>
            ) : (
              <div className="interviews-list">
                {scheduledInterviews.map((interview) => {
                  const isOld = isOlderThan24h(interview);
                  return (
                    <div key={interview._id} className={`interview-card ${isOld ? 'interview-old' : ''}`}>
                      <div className="interview-info">
                        <h4 className="interview-candidate">
                          {interview.candidate_name || `Candidate ${interview.candidate_id.slice(0, 8)}`}
                          {isOld && <small style={{ color: '#ef4444', marginLeft: '8px' }}>(Expired)</small>}
                        </h4>
                        <div className="interview-details">
                          <div className="detail-row">
                            <span className="material-icons-outlined">calendar_today</span>
                            <span>{interview.date} at {interview.time}</span>
                          </div>
                          <div className="detail-row">
                            <span className="material-icons-outlined">timer</span>
                            <span>{interview.duration} minutes</span>
                          </div>
                          <div className="detail-row">
                            <span className="material-icons-outlined">
                              {interview.type === 'voice' ? 'mic' : interview.type === 'text' ? 'textsms' : 'mic'}
                            </span>
                            <span style={{ textTransform: 'capitalize' }}>{interview.type}</span>
                          </div>
                          {interview.field && (
                            <div className="detail-row">
                              <span className="material-icons-outlined">work</span>
                              <span style={{ textTransform: 'capitalize' }}>{interview.field.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="interview-actions">
                        {interview.room_id ? (
                          <>
                            <span className="room-status">
                              <span className="material-icons-outlined">check_circle</span>
                              Room Created
                            </span>
                            <button className="button button-primary button-small" onClick={() => handleJoinRoom(interview._id)}>
                              <span className="material-icons-outlined">meeting_room</span>
                              Join Room
                            </button>
                          </>
                        ) : (
                          <button className="button button-success button-small" onClick={() => handleCreateRoom(interview._id)}>
                            <span className="material-icons-outlined">add</span>
                            Create Room
                          </button>
                        )}

                        {/* Delete Button */}
                        <button
                          className="button button-danger button-small"
                          onClick={() => deleteInterview(interview._id)}
                          disabled={deletingId === interview._id}
                          style={{ marginLeft: '8px' }}
                        >
                          <span className="material-icons-outlined">
                            {deletingId === interview._id ? 'hourglass_empty' : 'delete'}
                          </span>
                          {deletingId === interview._id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>

      <Toast type={toast.type} message={toast.message} />
    </div>
  );
}