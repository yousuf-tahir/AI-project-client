import React from "react";
import "../styles/candidate.css";
import "../styles/feedback.css";

const CandidateFeedback = ({ onNavigate }) => {
  // SPA navigation helper
  const go = (path) => {
    if (typeof onNavigate === "function") {
      onNavigate(path);
    } else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  const [formData, setFormData] = React.useState({
    feedbackType: "suggestion",
    rating: 5,
    title: "",
    description: "",
    experience: "excellent",
    improvements: "",
  });

  const [feedbackHistory, setFeedbackHistory] = React.useState([]);
  const [statusMsg, setStatusMsg] = React.useState("");
  const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8000';

  const getToken = () => {
    try { return localStorage.getItem('token') || sessionStorage.getItem('token'); } catch (_) { return null; }
  };

  const authedPost = async (url, body) => {
    const token = getToken();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    let data = null; try { data = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, data, text };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRatingClick = (rating) => {
    setFormData((prev) => ({
      ...prev,
      rating,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatusMsg("");
    try {
      // Send to backend; role and user_id come from token server-side
      const payload = { ...formData };
      const res = await authedPost(`${API_BASE}/api/feedback`, payload);
      if (!res.ok) {
        const msg = (res.data && (res.data.detail || res.data.message)) || res.text || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const newFeedback = {
        ...formData,
        id: res.data?.id || Date.now(),
        date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      };
      setFeedbackHistory((prev) => [newFeedback, ...prev]);
      setStatusMsg('Feedback submitted successfully');

      setFormData({
        feedbackType: 'suggestion',
        rating: 5,
        title: '',
        description: '',
        experience: 'excellent',
        improvements: ''
      });
    } catch (err) {
      setStatusMsg(err.message || 'Failed to submit feedback');
    }
  };

  return (
    <div className="candidate-dashboard-layout">
      {/* Sidebar (same structure/classes as CandidateDashboard) */}
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
            <li className="nav-item active">
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

      {/* Main Content */}
      <div className="candidate-main-content">
        {/* Top Bar */}
        

        <main className="feedback-main">
          {/* Feedback Form (same as FeedbackDashboard) */}
          <section className="card feedback-form-section">
            <h3>System Feedback</h3>
            <p className="form-description">
              Please share your feedback about the platform. Your input helps us improve our experience.
            </p>

            <form onSubmit={handleSubmit} className="feedback-form">
              <div className="form-group">
                <label htmlFor="feedbackType">Feedback Type</label>
                <select
                  id="feedbackType"
                  name="feedbackType"
                  value={formData.feedbackType}
                  onChange={handleChange}
                  className="form-control"
                  required
                >
                  <option value="suggestion">Suggestion</option>
                  <option value="bug">Bug Report</option>
                  <option value="praise">Praise</option>
                  <option value="feature">Feature Request</option>
                </select>
              </div>

              <div className="form-group">
                <label>Overall Rating</label>
                <div className="rating-container">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`rating-star ${star <= formData.rating ? 'selected' : ''}`}
                      onClick={() => handleRatingClick(star)}
                    >
                      {star <= formData.rating ? '★' : '☆'}
                    </span>
                  ))}
                  <span className="rating-text">
                    {formData.rating === 1 ? 'Poor' :
                     formData.rating === 5 ? 'Excellent' :
                     formData.rating >= 3 ? 'Good' : 'Fair'}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="title">Title</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Briefly describe your feedback"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Detailed Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="form-control"
                  rows="4"
                  placeholder="Please provide as much detail as possible..."
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="experience">How would you rate your experience with the system?</label>
                <select
                  id="experience"
                  name="experience"
                  value={formData.experience}
                  onChange={handleChange}
                  className="form-control"
                  required
                >
                  <option value="excellent">Excellent - Very easy to use</option>
                  <option value="good">Good - Some room for improvement</option>
                  <option value="average">Average - Needs some work</option>
                  <option value="poor">Poor - Difficult to use</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="improvements">What improvements would you suggest?</label>
                <textarea
                  id="improvements"
                  name="improvements"
                  value={formData.improvements}
                  onChange={handleChange}
                  className="form-control"
                  rows="3"
                  placeholder="Your suggestions for improvement..."
                ></textarea>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setFormData({
                      feedbackType: 'suggestion',
                      rating: 5,
                      title: '',
                      description: '',
                      experience: 'excellent',
                      improvements: ''
                    });
                  }}
                >
                  Clear Form
                </button>
                <button type="submit" className="button button-primary">
                  Submit Feedback
                </button>
              </div>
            </form>
          </section>

          {/* Recent Feedback history */}
          <section className="card recent-feedback">
            <div className="section-header">
              <h3>Your Recent Feedback</h3>
              {feedbackHistory.length > 0 && (
                <button
                  className="button button-text"
                  onClick={() => setFeedbackHistory([])}
                >
                  Clear All
                  <span className="material-icons-outlined">clear_all</span>
                </button>
              )}
            </div>

            {feedbackHistory.length === 0 ? (
              <div className="empty-state">
                <span className="material-icons-outlined">feedback</span>
                <p>Your submitted feedback will appear here</p>
              </div>
            ) : (
              <div className="feedback-list">
                {feedbackHistory.map((feedback) => (
                  <div key={feedback.id} className="feedback-item">
                    <div className="feedback-item-header">
                      <div className="feedback-type-badge">
                        {feedback.feedbackType === 'bug' && (
                          <span className="material-icons-outlined">bug_report</span>
                        )}
                        {feedback.feedbackType === 'suggestion' && (
                          <span className="material-icons-outlined">lightbulb</span>
                        )}
                        {feedback.feedbackType === 'praise' && (
                          <span className="material-icons-outlined">thumb_up</span>
                        )}
                        {feedback.feedbackType === 'feature' && (
                          <span className="material-icons-outlined">add_circle</span>
                        )}
                        <span>{feedback.feedbackType}</span>
                      </div>
                      <div className="feedback-date">{feedback.date}</div>
                    </div>
                    <h4>{feedback.title}</h4>
                    <div className="feedback-rating">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={`rating-star ${i < feedback.rating ? 'selected' : ''}`}>
                          {i < feedback.rating ? '★' : '☆'}
                        </span>
                      ))}
                    </div>
                    <p className="feedback-description">{feedback.description}</p>
                    {feedback.improvements && (
                      <div className="feedback-improvements">
                        <strong>Suggestions:</strong> {feedback.improvements}
                      </div>
                    )}
                    <div className="feedback-experience">
                      <span className="material-icons-outlined">person</span>
                      <span>Experience: {feedback.experience.replace('-', ' - ')}</span>
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

export default CandidateFeedback;
