import React, { useState, useEffect } from 'react';
import { getCandidateAnalysis } from '../../api/analysisService';
import 'material-icons/iconfont/material-icons.css';
import '../styles/CandidateAnalysisView.css';

const CandidateAnalysisView = ({ interviewId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  // Get candidate user data
  const getCandidateUser = () => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const candidateUser = getCandidateUser();
  const candidateId = candidateUser?._id || candidateUser?.id;

  // Load analysis on mount
  useEffect(() => {
    if (interviewId && candidateId) {
      loadAnalysis();
    }
  }, [interviewId, candidateId]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getCandidateAnalysis(interviewId, candidateId);
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getVerdictConfig = (verdict) => {
    const lower = verdict.toLowerCase();
    
    if (lower.includes('strong hire')) {
      return {
        icon: 'emoji_events',
        color: '#10b981',
        bg: '#d1fae5',
        message: 'Outstanding Performance! 🎉'
      };
    }
    
    if (lower.includes('hire')) {
      return {
        icon: 'thumb_up',
        color: '#3b82f6',
        bg: '#dbeafe',
        message: 'Great Job! 👏'
      };
    }
    
    if (lower.includes('hold')) {
      return {
        icon: 'schedule',
        color: '#f59e0b',
        bg: '#fef3c7',
        message: 'Room for Growth 💪'
      };
    }
    
    return {
      icon: 'info',
      color: '#64748b',
      bg: '#f1f5f9',
      message: 'Keep Learning! 📚'
    };
  };

  const getScoreConfig = (score) => {
    if (score >= 8) {
      return {
        color: '#10b981',
        bg: '#d1fae5',
        label: 'Excellent',
        icon: 'star'
      };
    }
    
    if (score >= 6) {
      return {
        color: '#f59e0b',
        bg: '#fef3c7',
        label: 'Good',
        icon: 'star_half'
      };
    }
    
    return {
      color: '#64748b',
      bg: '#f1f5f9',
      label: 'Developing',
      icon: 'star_outline'
    };
  };

  if (loading) {
    return (
      <div className="candidate-analysis-container">
        <div className="candidate-loading">
          <div className="loading-spinner"></div>
          <p>Loading your feedback...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="candidate-analysis-container">
        <div className="candidate-error">
          <span className="material-icons-outlined error-icon">sentiment_dissatisfied</span>
          <h3>Feedback Not Available Yet</h3>
          <p>{error.includes('404') ? 'Your interview feedback is being prepared. Please check back later!' : error}</p>
          <button className="cta-button" onClick={() => onBack && onBack()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="candidate-analysis-container">
        <div className="candidate-error">
          <span className="material-icons-outlined">hourglass_empty</span>
          <p>No feedback available yet</p>
        </div>
      </div>
    );
  }

  const verdictConfig = getVerdictConfig(analysis.verdict);
  const scoreConfig = getScoreConfig(analysis.overall_score);

  return (
    <div className="candidate-analysis-layout">
      {/* Fixed Sidebar */}
      <aside className="candidate-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <span className="app-logo-candidate">Candidate</span>
            <span className="logo-subtitle">Feedback Portal</span>
          </div>
        </div>
        
        <div className="sidebar-content">
          <nav className="sidebar-nav">
            <ul>
              <li className="nav-item active">
                <a href="#" onClick={(e) => { e.preventDefault(); onBack && onBack(); }}>
                  <span className="material-icons-outlined nav-icon">dashboard</span>
                  <span className="nav-label">Dashboard</span>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={(e) => { e.preventDefault(); onBack && onBack(); }}>
                  <span className="material-icons-outlined nav-icon">arrow_back</span>
                  <span className="nav-label">Back to Feedback</span>
                </a>
              </li>
           
            
            </ul>
          </nav>
          
          {/* Sidebar Footer */}
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">
                <span className="material-icons-outlined">person</span>
              </div>
              <div className="user-details">
                <span className="user-name">
                  {candidateUser?.name || candidateUser?.email?.split('@')[0] || 'Candidate'}
                </span>
                <span className="user-role">Interview Candidate</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content - Properly spaced from sidebar */}
      <main className="candidate-analysis-main">
        
        {/* Hero Section */}
        <div className="hero-section">
          <div 
            className="hero-icon"
            style={{ 
              background: verdictConfig.bg,
              color: verdictConfig.color 
            }}
          >
            <span className="material-icons-outlined">{verdictConfig.icon}</span>
          </div>
          <div className="hero-content">
            <h1 className="hero-title">{verdictConfig.message}</h1>
            <p className="hero-subtitle">Here's your personalized interview feedback based on your recent performance</p>
          </div>
        </div>

        {/* Score Card */}
        <div 
          className="score-showcase"
          style={{ 
            background: `linear-gradient(135deg, ${scoreConfig.bg} 0%, ${scoreConfig.bg}dd 100%)`,
            borderLeft: `4px solid ${scoreConfig.color}`
          }}
        >
          <div className="score-content">
            <div className="score-label">Your Overall Score</div>
            <div className="score-display">
              <span 
                className="score-number"
                style={{ color: scoreConfig.color }}
              >
                {analysis.overall_score.toFixed(1)}
              </span>
              <span className="score-total">/ 10</span>
            </div>
            <div 
              className="score-rating"
              style={{ color: scoreConfig.color }}
            >
              <span className="material-icons-outlined score-star">{scoreConfig.icon}</span>
              {scoreConfig.label}
            </div>
          </div>
          <div className="score-visual">
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={scoreConfig.color}
                strokeWidth="8"
                strokeDasharray={`${(analysis.overall_score / 10) * 339.292} 339.292`}
                strokeLinecap="round"
                transform="rotate(-90 60 60)"
              />
            </svg>
          </div>
        </div>

        {/* Two Column Layout for Strengths and Improvements */}
        <div className="feedback-columns">
          {/* Strengths Section */}
          <div className="feedback-section strengths-section">
            <div className="section-header">
              <div className="section-icon-container" style={{ background: verdictConfig.bg }}>
                <span className="material-icons-outlined section-icon" style={{ color: verdictConfig.color }}>auto_awesome</span>
              </div>
              <h2>What You Did Well</h2>
              <p className="section-subtitle">Your key strengths from the interview</p>
            </div>
            <div className="strengths-grid">
              {analysis.strengths.map((strength, index) => (
                <div key={index} className="strength-card">
                  <div className="strength-icon-container">
                    <span className="material-icons-outlined strength-icon">check_circle</span>
                  </div>
                  <div className="strength-content">
                    <h3 className="strength-title">Strength {index + 1}</h3>
                    <p className="strength-description">{strength}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Areas to Improve Section */}
          <div className="feedback-section improve-section">
            <div className="section-header">
              <div className="section-icon-container" style={{ background: '#fef3c7' }}>
                <span className="material-icons-outlined section-icon" style={{ color: '#f59e0b' }}>lightbulb</span>
              </div>
              <h2>Opportunities for Growth</h2>
              <p className="section-subtitle">Areas where you can improve</p>
            </div>
            <div className="improve-grid">
              {analysis.areas_to_improve.map((area, index) => (
                <div key={index} className="improve-card">
                  <div className="improve-icon-container">
                    <span className="material-icons-outlined improve-icon">trending_up</span>
                  </div>
                  <div className="improve-content">
                    <h3 className="improve-title">Improvement {index + 1}</h3>
                    <p className="improve-description">{area}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Summary Section */}
        <div className="summary-section">
          <div className="summary-card">
            <div className="summary-header">
              <div className="summary-icon-container">
                <span className="material-icons-outlined">description</span>
              </div>
              <h2>Final Thoughts</h2>
            </div>
            <div className="summary-content">
              <p className="summary-text">{analysis.overall_summary}</p>
              <div className="summary-meta">
                <span className="material-icons-outlined">today</span>
                <span>Feedback generated on {new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Motivational Footer */}
        <div className="motivational-footer">
          <div className="motivational-content">
            <div className="motivational-icon-container">
              <span className="material-icons-outlined motivational-icon">rocket_launch</span>
            </div>
            <div className="motivational-text">
              <h3>Keep Growing!</h3>
              <p>Every interview is a learning opportunity. Use this feedback to sharpen your skills and prepare for your next opportunity.</p>
            </div>
            <button className="action-button" onClick={() => onBack && onBack()}>
              <span className="material-icons-outlined">arrow_forward</span>
              Continue Your Journey
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CandidateAnalysisView;