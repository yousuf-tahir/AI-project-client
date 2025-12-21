import React from 'react';
import CompletedInterviewsList from './CompletedInterviewsList';
import 'material-icons/iconfont/material-icons.css';
import '../styles/AnalysisListPage.css';

const HRAnalysisList = ({ onNavigate }) => {
  return (
    <div className="analysis-list-page">
      {/* Sidebar - Matching HR Dashboard */}
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
            <li className="nav-item active">
              <a href="#" onClick={(e) => e.preventDefault()}>
                <span className="material-icons-outlined">analytics</span>
                <span className="nav-label">Interview Analysis</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/schedule-interview'); }}>
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
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/settings'); }}>
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
      <div className="main-content-area">
        <header className="page-header">
          <div className="header-left">
            <h1>Interview Analysis</h1>
            <p>View AI-powered analysis of completed interviews</p>
          </div>
        </header>

        <main className="content-section">
          <CompletedInterviewsList 
            onNavigate={onNavigate}
            onViewAnalysis={(interviewId) => onNavigate(`/hr-analysis/${interviewId}`)}
          />
        </main>
      </div>
    </div>
  );
};

export default HRAnalysisList;