import React, { useState, useEffect } from 'react';
import { checkAnalysisExists } from '../../api/analysisService';
import 'material-icons/iconfont/material-icons.css';
import '../styles/AnalysisListPage.css';

const CandidateAnalysisList = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [feedbackAvailable, setFeedbackAvailable] = useState({});

  const getUser = () => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const user = getUser();
  const candidateId = user?._id || user?.id;

  // Get API base URL
  const API_BASE = import.meta.env?.VITE_API_BASE || 'http://localhost:8000';

  useEffect(() => {
    if (candidateId) {
      loadInterviews();
    }
  }, [candidateId]);

  const loadInterviews = async () => {
    setLoading(true);
    try {
      console.log('[CANDIDATE ANALYSIS] Loading interviews for:', candidateId);
      
      // FIXED: Use the same API call as HR - directly fetch from backend
      const response = await fetch(
        `${API_BASE}/api/interviews?candidate_id=${candidateId}&status=completed`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch completed interviews');
      }

      const data = await response.json();
      console.log('[CANDIDATE ANALYSIS] Raw API response:', data);
      
      // Format the data
      const formattedInterviews = data.map(interview => ({
        interviewId: interview._id,
        jobTitle: interview.jobTitle || 'Interview Session',
        field: interview.field || 'general',
        date: interview.created_at || interview.date,
        type: interview.type || 'voice',
        duration: interview.duration || 30
      }));

      console.log('[CANDIDATE ANALYSIS] Formatted interviews:', formattedInterviews);
      setInterviews(formattedInterviews);

      // Check feedback availability
      const feedbackChecks = await Promise.all(
        formattedInterviews.map(async (interview) => {
          try {
            const status = await checkAnalysisExists(interview.interviewId);
            return { id: interview.interviewId, available: status.exists };
          } catch {
            return { id: interview.interviewId, available: false };
          }
        })
      );

      const feedbackMap = {};
      feedbackChecks.forEach(check => {
        feedbackMap[check.id] = check.available;
      });
      console.log('[CANDIDATE ANALYSIS] Feedback availability:', feedbackMap);
      setFeedbackAvailable(feedbackMap);
    } catch (error) {
      console.error('[CANDIDATE ANALYSIS] Error loading:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const go = (path) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  return (
    <div className="analysis-list-page candidate-page">
      {/* Sidebar - Matching Candidate Dashboard */}
      <div className="sidebar-wrapper">
        <aside className="candidate-sidebar">
          <div className="sidebar-header">
            <span className="app-logo-candidate">Candidate</span>
          </div>
          <div className="sidebar-content">
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
                  <a href="#" onClick={(e) => e.preventDefault()}>
                    <span className="material-icons-outlined">rate_review</span>
                    <span className="nav-label">Interview Feedback</span>
                  </a>
                </li>
                <li className="nav-item">
                  <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate-feedback'); }}>
                    <span className="material-icons-outlined">feedback</span>
                    <span className="nav-label"> Feedback</span>
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
                  <a href="#" className="logout-link" onClick={(e) => {
                    e.preventDefault();
                    const ok = window.confirm('Are you sure you want to logout?');
                    if (!ok) return;
                    try {
                      localStorage.clear();
                      sessionStorage.clear();
                    } catch (_) {}
                    window.location.replace('/');
                  }}>
                    <span className="material-icons-outlined">logout</span>
                    <span className="nav-label">Logout</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      {/* Main Content */}
      <div className="main-content-area">
        <header className="page-header candidate-header">
          <div className="header-left">
            <h1>Interview Feedback</h1>
            <p>View your interview performance and AI feedback</p>
          </div>
        </header>

        <main className="content-section">
          {loading ? (
            <div className="loading-card">
              <div className="spinner"></div>
              <p>Loading your interviews...</p>
            </div>
          ) : interviews.length === 0 ? (
            <div className="empty-card">
              <span className="material-icons-outlined empty-icon">event_busy</span>
              <h3>No Completed Interviews</h3>
              <p>Complete an interview to receive AI-powered feedback!</p>
              <button 
                className="cta-button"
                onClick={() => go('/interview')}
              >
                View My Interviews
              </button>
            </div>
          ) : (
            <div className="interview-cards-grid">
              {interviews.map((interview) => (
                <div key={interview.interviewId} className="interview-feedback-card">
                  <div className="card-header-section">
                    <div className="interview-icon-wrapper">
                      <span className="material-icons-outlined">psychology</span>
                    </div>
                    <div className="interview-meta">
                      <h3>{interview.jobTitle || 'Interview Session'}</h3>
                      <p className="interview-date-text">{formatDate(interview.date)}</p>
                      <span className="interview-field-badge">
                        {interview.field?.replace(/_/g, ' ') || 'General'}
                      </span>
                    </div>
                  </div>

                  <div className="card-status-section">
                    {feedbackAvailable[interview.interviewId] ? (
                      <>
                        <div className="status-ready">
                          <span className="material-icons-outlined">check_circle</span>
                          <span>Feedback Ready</span>
                        </div>
                        <button
                          className="view-feedback-btn"
                          onClick={() => go(`/candidate-analysis/${interview.interviewId}`)}
                        >
                          <span className="material-icons-outlined">visibility</span>
                          View Feedback
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="status-pending">
                          <span className="material-icons-outlined">pending</span>
                          <span>Feedback Pending</span>
                        </div>
                        <p className="pending-message">
                          Your interviewer will generate feedback soon. Check back later!
                        </p>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default CandidateAnalysisList;