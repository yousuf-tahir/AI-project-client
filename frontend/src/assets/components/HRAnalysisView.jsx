import React, { useState, useEffect } from 'react';
import { getHRAnalysis, generateAnalysis, deleteAnalysis } from '../../api/analysisService';
import 'material-icons/iconfont/material-icons.css';
import '../styles/HRAnalysisView.css';

const HRAnalysisView = ({ interviewId, onNavigate, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Get HR user data
  const getHRUser = () => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  const hrUser = getHRUser();
  const hrId = hrUser?._id || hrUser?.id;

  // Load analysis on mount
  useEffect(() => {
    if (interviewId && hrId) {
      loadAnalysis();
    }
  }, [interviewId, hrId]);

  const loadAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getHRAnalysis(interviewId, hrId);
      setAnalysis(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate analysis? This will overwrite existing data.')) {
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      await generateAnalysis(interviewId, hrId, true);
      await loadAnalysis();
      alert('Analysis regenerated successfully!');
    } catch (err) {
      setError(err.message);
      alert('Failed to regenerate: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this analysis? This cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteAnalysis(interviewId, hrId);
      alert('Analysis deleted successfully!');
      if (onBack) onBack();
    } catch (err) {
      setError(err.message);
      alert('Failed to delete: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const getVerdictClass = (verdict) => {
    const lower = verdict.toLowerCase();
    if (lower.includes('strong hire')) return 'verdict-strong-hire';
    if (lower.includes('hire')) return 'verdict-hire';
    if (lower.includes('hold')) return 'verdict-hold';
    if (lower.includes('reject')) return 'verdict-reject';
    return 'verdict-hold';
  };

  const getScoreColor = (score) => {
    if (score >= 8) return '#10b981';
    if (score >= 6) return '#f59e0b';
    return '#ef4444';
  };

  if (loading) {
    return (
      <div className="analysis-container">
        <div className="analysis-loading">
          <div className="spinner"></div>
          <p>Loading analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analysis-container">
        <div className="analysis-error">
          <span className="material-icons-outlined error-icon">error_outline</span>
          <h3>Error Loading Analysis</h3>
          <p>{error}</p>
          <button className="button button-primary" onClick={() => onBack && onBack()}>
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="analysis-container">
        <div className="analysis-error">
          <span className="material-icons-outlined">info</span>
          <p>No analysis data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analysis-container">
      {/* Header */}
      <div className="analysis-header">
        <div className="header-left">
          <button className="back-button" onClick={() => onBack && onBack()}>
            <span className="material-icons-outlined">arrow_back</span>
            Back
          </button>
          <h1>Interview Analysis</h1>
        </div>
        <div className="header-actions">
          <button
            className="button button-secondary"
            onClick={handleRegenerate}
            disabled={generating}
          >
            <span className="material-icons-outlined">refresh</span>
            {generating ? 'Regenerating...' : 'Regenerate'}
          </button>
          <button
            className="button button-danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            <span className="material-icons-outlined">delete</span>
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Overall Metrics - REMOVED AI Model Card */}
      <div className="metrics-grid">
        <div className="metric-card score-card">
          <div className="metric-icon" style={{ backgroundColor: `${getScoreColor(analysis.overall_score)}20` }}>
            <span className="material-icons-outlined" style={{ color: getScoreColor(analysis.overall_score) }}>
              grade
            </span>
          </div>
          <div className="metric-content">
            <h3>Overall Score</h3>
            <p className="metric-value" style={{ color: getScoreColor(analysis.overall_score) }}>
              {analysis.overall_score.toFixed(1)} / 10
            </p>
          </div>
        </div>

        <div className="metric-card verdict-card">
          <div className="metric-icon">
            <span className="material-icons-outlined">how_to_reg</span>
          </div>
          <div className="metric-content">
            <h3>Verdict</h3>
            <span className={`verdict-badge ${getVerdictClass(analysis.verdict)}`}>
              {analysis.verdict}
            </span>
          </div>
        </div>

        {/* REMOVED AI Model Card
        <div className="metric-card">
          <div className="metric-icon">
            <span className="material-icons-outlined">psychology</span>
          </div>
          <div className="metric-content">
            <h3>AI Model</h3>
            <p className="metric-value-small">{analysis.ai_model}</p>
          </div>
        </div>
        */}

        <div className="metric-card">
          <div className="metric-icon">
            <span className="material-icons-outlined">schedule</span>
          </div>
          <div className="metric-content">
            <h3>Generated</h3>
            <p className="metric-value-small">
              {new Date(analysis.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Sections */}
      <div className="feedback-grid">
        <div className="feedback-card strengths-card">
          <div className="feedback-header">
            <span className="material-icons-outlined">thumb_up</span>
            <h3>Strengths</h3>
          </div>
          <ul className="feedback-list">
            {analysis.strengths.map((strength, index) => (
              <li key={index}>
                <span className="material-icons-outlined">check_circle</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div className="feedback-card weaknesses-card">
          <div className="feedback-header">
            <span className="material-icons-outlined">thumb_down</span>
            <h3>Areas for Improvement</h3>
          </div>
          <ul className="feedback-list">
            {analysis.weaknesses.map((weakness, index) => (
              <li key={index}>
                <span className="material-icons-outlined">info</span>
                {weakness}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Detailed Feedback */}
      <div className="detail-cards">
        <div className="detail-card">
          <h3>
            <span className="material-icons-outlined">chat</span>
            Communication Feedback
          </h3>
          <p>{analysis.communication_feedback}</p>
        </div>

        <div className="detail-card">
          <h3>
            <span className="material-icons-outlined">code</span>
            Technical Feedback
          </h3>
          <p>{analysis.technical_feedback}</p>
        </div>

        <div className="detail-card summary-card">
          <h3>
            <span className="material-icons-outlined">description</span>
            Overall Summary
          </h3>
          <p>{analysis.overall_summary}</p>
        </div>
      </div>

      {/* Per-Question Analysis Table */}
      <div className="question-analysis-section">
        <h2>
          <span className="material-icons-outlined">quiz</span>
          Question-by-Question Analysis
        </h2>
        <div className="table-container">
          <table className="question-table">
            <thead>
              <tr>
                <th style={{ width: '5%' }}>#</th>
                <th style={{ width: '30%' }}>Question</th>
                <th style={{ width: '25%' }}>Answer</th>
                <th style={{ width: '10%' }}>Score</th>
                <th style={{ width: '10%' }}>Difficulty</th>
                <th style={{ width: '20%' }}>AI Remark</th>
              </tr>
            </thead>
            <tbody>
              {analysis.question_analysis.map((qa, index) => (
                <tr key={index}>
                  <td className="question-number">{index + 1}</td>
                  <td className="question-text">{qa.question_text}</td>
                  <td className="answer-text">
                    <div className="answer-preview">
                      {qa.answer.length > 100 
                        ? `${qa.answer.substring(0, 100)}...` 
                        : qa.answer}
                    </div>
                  </td>
                  <td>
                    <span 
                      className="score-badge"
                      style={{ 
                        backgroundColor: `${getScoreColor(qa.score)}20`,
                        color: getScoreColor(qa.score)
                      }}
                    >
                      {qa.score.toFixed(1)}
                    </span>
                  </td>
                  <td>
                    <span className={`difficulty-badge difficulty-${qa.difficulty}`}>
                      {qa.difficulty}
                    </span>
                  </td>
                  <td className="remark-text">{qa.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HRAnalysisView;