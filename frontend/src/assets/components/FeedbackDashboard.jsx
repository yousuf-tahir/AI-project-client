import React from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";
import "../styles/feedback.css";

const FeedbackDashboard = ({ onNavigate }) => {
  const [formData, setFormData] = React.useState({
    feedbackType: 'suggestion',
    rating: 5,
    title: '',
    description: '',
    experience: 'excellent',
    improvements: ''
  });
  
  const [feedbackHistory, setFeedbackHistory] = React.useState([]);
  const [toast, setToast] = React.useState({ type: '', text: '' });
  const [inlineStatus, setInlineStatus] = React.useState({ type: '', text: '' });
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  // Auto-hide toast after a short delay
  React.useEffect(() => {
    if (!toast.text) return;
    const t = setTimeout(() => setToast({ type: '', text: '' }), 3000);
    return () => clearTimeout(t);
  }, [toast.text]);

  React.useEffect(() => {
    if (!inlineStatus.text) return;
    const t = setTimeout(() => setInlineStatus({ type: '', text: '' }), 4000);
    return () => clearTimeout(t);
  }, [inlineStatus.text]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRatingClick = (rating) => {
    setFormData(prev => ({
      ...prev,
      rating
    }));
  };

  const fetchFeedback = async () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const resp = await fetch(`${API_BASE}/api/feedback?mine=true`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resp.ok) throw new Error('Failed to load feedback');
      const data = await resp.json();
      setFeedbackHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      setToast({ type: 'error', text: e.message || 'Failed to load feedback' });
    }
  };

  React.useEffect(() => { fetchFeedback(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const resp = await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData)
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to submit feedback');
      }
      setToast({ type: 'success', text: 'Feedback submitted successfully!' });
      setInlineStatus({ type: 'success', text: 'Feedback submitted successfully!' });
      setFormData({
        feedbackType: 'suggestion',
        rating: 5,
        title: '',
        description: '',
        experience: 'excellent',
        improvements: ''
      });
      fetchFeedback();
    } catch (err) {
      const msg = err.message || 'Failed to submit feedback';
      setToast({ type: 'error', text: msg });
      setInlineStatus({ type: 'error', text: msg });
    }
  };

  const toggleFullFeedback = (e) => {
    const fullFeedback = e.currentTarget
      .closest(".feedback-entry")
      .querySelector(".full-feedback");
    if (fullFeedback) {
      fullFeedback.style.display =
        fullFeedback.style.display === "none" || fullFeedback.style.display === ""
          ? "block"
          : "none";
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
      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h2 className="page-title">Feedback</h2>
          </div>
          <div className="top-bar-right">
            <button className="icon-button notification-button">
              <span className="material-icons-outlined">notifications_none</span>
              <span className="notification-badge">2</span>
            </button>
          </div>
        </header>

        <main className="feedback-main">
          {/* Feedback Form */}
          <section className="card feedback-form-section">
            <h3>System Feedback</h3>
            <p className="form-description">
              Please share your feedback about the HR Recruit system. Your input helps us improve our platform.
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
                      <div className="feedback-date">{feedback.created_at ? new Date(feedback.created_at).toLocaleDateString() : ''}</div>
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
      {toast.text && (
        <div className={`toast ${toast.type === 'success' ? 'success' : 'error'}`} role="status" aria-live="polite">
          <span className="material-icons-outlined toast-icon" aria-hidden>{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
};

export default FeedbackDashboard;