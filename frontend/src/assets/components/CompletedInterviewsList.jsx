import React, { useState, useEffect } from 'react';
import { getCompletedInterviews, checkAnalysisExists, generateAnalysis } from '../../api/analysisService';
import 'material-icons/iconfont/material-icons.css';
import '../styles/CompletedInterviewsList.css';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const CANDIDATES_API = `${API_BASE}/api/admin/candidates`;

const CompletedInterviewsList = ({ onNavigate, onViewAnalysis }) => {
  const [loading, setLoading] = useState(true);
  const [interviews, setInterviews] = useState([]);
  const [analysisStatus, setAnalysisStatus] = useState({});
  const [generating, setGenerating] = useState({});
  const [candidateMap, setCandidateMap] = useState({});

  // Fetch candidates - moved to top so it runs unconditionally
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const token =
          localStorage.getItem('token') || sessionStorage.getItem('token');

        const res = await axios.get(CANDIDATES_API, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        const candidates = Array.isArray(res.data)
          ? res.data
          : res.data?.data || [];

        const map = {};
        candidates.forEach((c) => {
          const id = c._id || c.id || c.user_id;
          if (id) {
            map[id] = c.name || c.full_name || c.email || 'Unknown Candidate';
          }
        });

        setCandidateMap(map);
      } catch (err) {
        console.error('[COMPLETED INTERVIEWS] Failed to fetch candidates', err);
      }
    };

    fetchCandidates();
  }, []);

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

  useEffect(() => {
    if (hrId) {
      loadInterviews();
    }
  }, [hrId]);

  const loadInterviews = async () => {
    setLoading(true);
    try {
      console.log('[COMPLETED INTERVIEWS] Loading for HR:', hrId);
      const data = await getCompletedInterviews(hrId);
      console.log('[COMPLETED INTERVIEWS] Loaded:', data);
      setInterviews(data);

      // Check analysis status for each interview
      const statusPromises = data.map(interview =>
        checkAnalysisExists(interview._id || interview.interviewId)
          .then(result => ({ interviewId: interview._id || interview.interviewId, ...result }))
          .catch(() => ({ interviewId: interview._id || interview.interviewId, exists: false }))
      );

      const statuses = await Promise.all(statusPromises);
      const statusMap = {};
      statuses.forEach(status => {
        statusMap[status.interviewId] = status;
      });
      setAnalysisStatus(statusMap);
    } catch (error) {
      console.error('Error loading completed interviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAnalysis = async (interviewId) => {
    setGenerating(prev => ({ ...prev, [interviewId]: true }));

    try {
      console.log('[COMPLETED INTERVIEWS] Generating analysis for:', interviewId);
      await generateAnalysis(interviewId, hrId, false);
      alert('Analysis generated successfully! Click "View Analysis" to see results.');

      // Refresh analysis status
      const status = await checkAnalysisExists(interviewId);
      setAnalysisStatus(prev => ({
        ...prev,
        [interviewId]: status
      }));
    } catch (error) {
      console.error('[COMPLETED INTERVIEWS] Generate failed:', error);
      alert('Failed to generate analysis: ' + error.message);
    } finally {
      setGenerating(prev => ({ ...prev, [interviewId]: false }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="completed-interviews-card">
        <h3>Completed Interviews</h3>
        <div className="loading-state">
          <div className="spinner-small"></div>
          <p>Loading interviews...</p>
        </div>
      </div>
    );
  }

  if (interviews.length === 0) {
    return (
      <div className="completed-interviews-card">
        <h3>Completed Interviews</h3>
        <div className="empty-state">
          <span className="material-icons-outlined empty-icon">event_busy</span>
          <p>No completed interviews yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="completed-interviews-card">
      <div className="card-header">
        <h3>Completed Interviews</h3>
        <span className="interview-count">{interviews.length}</span>
      </div>

      <div className="interviews-list">
        {interviews.map((interview) => {
          const interviewId = interview._id || interview.interviewId;
          const status = analysisStatus[interviewId] || {};
          const isGenerating = generating[interviewId];

          return (
            <div key={interviewId} className="interview-item">
              <div className="interview-info">
                <div className="interview-header-row">
                  <span className="candidate-name">
                    {candidateMap[interview.candidate_id] || 'Candidate'}
                  </span>
                  <span className="interview-date">
                    {formatDate(interview.completed_at || interview.date)}
                  </span>
                </div>
                <div className="interview-details">
                  <span className="interview-field">
                    {interview.field?.replace(/_/g, ' ') || 'General'}
                  </span>
                  <span className="interview-type">
                    {interview.type || 'Voice'}
                  </span>
                </div>
              </div>

              <div className="interview-actions">
                {status.exists ? (
                  <button
                    className="action-btn view-btn"
                    onClick={() => onViewAnalysis && onViewAnalysis(interviewId)}
                    title="View Analysis"
                  >
                    <span className="material-icons-outlined">visibility</span>
                    View Analysis
                  </button>
                ) : (
                  <button
                    className="action-btn generate-btn"
                    onClick={() => handleGenerateAnalysis(interviewId)}
                    disabled={isGenerating}
                    title="Generate AI Analysis"
                  >
                    <span className="material-icons-outlined">
                      {isGenerating ? 'hourglass_empty' : 'auto_awesome'}
                    </span>
                    {isGenerating ? 'Generating...' : 'Generate Analysis'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompletedInterviewsList;