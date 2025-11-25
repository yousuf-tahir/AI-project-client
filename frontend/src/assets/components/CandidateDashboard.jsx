import React, { useMemo, useState } from 'react';
import '../styles/candidate.css';

const CandidateDashboard = ({ onNavigate }) => {
  const [sidebarActive, setSidebarActive] = useState(false);
  const [docPreviewModal, setDocPreviewModal] = useState(null);

  // Get stored user once
  const user = useMemo(() => {
    try {
      const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
      if (!raw) return null;
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch {
      return null;
    }
  }, []);

  const userName = useMemo(() => {
    if (!user) return 'Candidate';
    
    // Try various name fields
    if (user.full_name) return user.full_name.split(' ')[0];
    if (user.name) {
      if (typeof user.name === 'string') return user.name.split(' ')[0];
      if (user.name.first) return user.name.first;
    }
    if (user.email) return user.email.split('@')[0];
    
    return 'Candidate';
  }, [user]);

  const recentScores = useMemo(() => [
    {
      title: 'Practice: Product Designer Role',
      date: 'Jul 20, 2024',
      matchClass: 'high',
      matchPercent: '88%',
      details: 'Q1: 9/10 | Q2: 7/10 | Q3: 8/10',
    },
    {
      title: 'Practice: General Behavioral',
      date: 'Jul 15, 2024',
      matchClass: 'medium',
      matchPercent: '72%',
      details: 'Q1: 6/10 | Q2: 8/10 | Q3: 7/10',
    },
  ], []);

  const documents = useMemo(() => [
    {
      icon: 'picture_as_pdf',
      iconClass: 'icon-blue',
      name: 'Resume_2024.pdf',
      previewUrl: '#',
      canPreview: true,
      canDownload: true,
    },
    {
      icon: 'description',
      iconClass: 'icon-orange',
      name: 'Cover_Letter.docx',
      previewUrl: '',
      canPreview: false,
      canDownload: true,
    },
  ], []);

  const go = (path) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  return (
    <div className="candidate-dashboard-layout">
      <aside className={`candidate-sidebar${sidebarActive ? ' active' : ''}`}>
        <div className="sidebar-header">
          <span className="app-logo-candidate">Candidate</span>
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item active">
              <a href="#" onClick={(e) => e.preventDefault()}>
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
          </ul>
        </nav>
        <div className="sidebar-footer">
          <ul>
            <li className="nav-item">
              <a href="#" onClick={(e) => {
                e.preventDefault();
                if (window.confirm('Are you sure you want to logout?')) {
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                  } catch {}
                  window.location.replace('/');
                }
              }}>
                <span className="material-icons-outlined">logout</span>
                <span className="nav-label">Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      <div className="candidate-main-content">
        <main className="dashboard-main-grid">
          <section className="card welcome-card-candidate">
            <div>
              <h2>Welcome, {userName}!</h2>
              <p>Track your applications and prepare for interviews.</p>
            </div>
            <span className="material-icons-outlined welcome-illustration">waving_hand</span>
          </section>

          <section className="card profile-progress-card">
            <h3>Profile Completion</h3>
            <div className="progress-bar-container">
              <div className="progress-bar" style={{ width: '75%' }}></div>
            </div>
            <div className="progress-text">
              <span>75% Complete</span>
              <a href="#" className="link-subtle" onClick={(e) => { e.preventDefault(); go('/profile'); }}>Complete Profile</a>
            </div>
          </section>

          <section className="card practice-card">
            <h3>Ready to Practice?</h3>
            <p>Sharpen your skills with an AI-powered mock interview.</p>
            <button
              className="button button-primary button-large button-icon"
              onClick={(e) => { e.preventDefault(); go('/practice-interview'); }}
            >
              <span className="material-icons-outlined">mic</span>
              Start Practice Interview
            </button>
          </section>

          <section className="card upcoming-interviews-card">
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <h3 style={{ margin: 0 }}>Upcoming Interviews</h3>
              <button 
                className="button button-secondary button-small"
                onClick={(e) => { e.preventDefault(); go('/interview'); }}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.25rem' 
                }}
              >
                <span>View All</span>
                <span className="material-icons-outlined" style={{ fontSize: '1rem' }}>arrow_forward</span>
              </button>
            </div>
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              backgroundColor: '#f8fafc',
              borderRadius: '0.5rem',
              border: '2px dashed #e2e8f0'
            }}>
              <span className="material-icons-outlined" style={{ 
                fontSize: '3rem', 
                color: '#cbd5e1',
                marginBottom: '0.5rem',
                display: 'block'
              }}>
                event
              </span>
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>
                Check your scheduled interviews
              </p>
              <button 
                className="button button-primary button-small"
                onClick={(e) => { e.preventDefault(); go('/interview'); }}
              >
                Go to My Interviews
              </button>
            </div>
          </section>

          <section className="card recent-scores-card">
            <h3>Recent Practice Scores</h3>
            <div className="score-list">
              {recentScores.map((s, idx) => (
                <div className="score-item" key={idx}>
                  <div className="score-header">
                    <span className="score-job-title">{s.title}</span>
                    <span className="score-date">{s.date}</span>
                  </div>
                  <div className="score-body">
                    <div className="score-match">
                      <span className="match-label">Overall Match:</span>
                      <span className={`match-percent ${s.matchClass}`}>{s.matchPercent}</span>
                    </div>
                    <div className="score-details">{s.details}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card documents-card">
            <h3>My Documents</h3>
            <ul className="document-list">
              {documents.map((d, idx) => (
                <li className="document-item" key={idx}>
                  <span className={`material-icons-outlined doc-icon ${d.iconClass}`}>{d.icon}</span>
                  <span className="doc-name">{d.name}</span>
                  <div className="doc-actions">
                    {d.canDownload && (
                      <button className="icon-button" title="Download">
                        <span className="material-icons-outlined">download</span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </main>
      </div>
    </div>
  );
};

export default CandidateDashboard;