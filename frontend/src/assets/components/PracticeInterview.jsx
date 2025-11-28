import React from "react";
import "../styles/practiceinterview.css";
import "../styles/candidate.css";

const PracticeInterview = ({ onNavigate }) => {
  const go = (path) => {
    if (typeof onNavigate === "function") {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  return (
    <div className="candidate-dashboard-layout">
      {/* Navigation Sidebar */}
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
            <li className="nav-item">
            <a href="#" onClick={(e) => { e.preventDefault(); go('/interview'); }}>
                <span className="material-icons-outlined">event_note</span>
                <span className="nav-label">My Interviews</span>
              </a>
            </li>
            <li className="nav-item active">
            <a href="#" onClick={(e) => { e.preventDefault(); go('/practice-interview'); }}>
                <span className="material-icons-outlined">videocam</span>
                <span className="nav-label">Practice Interview</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate-feedback'); }}>
                <span className="material-icons-outlined">rate_review</span>
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
            <a href="#" id="logout-link" className="logout-link" onClick={(e) => { e.preventDefault(); const ok = window.confirm('Are you sure you want to logout?'); if (!ok) return; try { localStorage.removeItem('user'); localStorage.removeItem('token'); sessionStorage.removeItem('user'); sessionStorage.removeItem('token'); } catch(_){} window.location.replace('/'); }}>
                <span className="material-icons-outlined">logout</span>
                <span className="nav-label">Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="candidate-main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <h2 className="page-title">Practice Interview</h2>
          </div>
          <div className="top-bar-right">
          </div>
        </header>

        {/* Practice Interview Content */}
        <main className="practice-main">
          {/* Introduction Section */}
          <section className="card introduction-section">
            <div className="introduction-content">
              <h2>Prepare for Your Next Interview</h2>
              <p>
                Practice with our AI-powered mock interviews to improve your
                interview skills and boost your confidence.
              </p>
              <ul className="features-list">
                <li>
                  <span className="material-icons-outlined">check_circle</span>
                  Real-time feedback on your responses
                </li>
                <li>
                  <span className="material-icons-outlined">check_circle</span>
                  Customizable interview types
                </li>
                <li>
                  <span className="material-icons-outlined">check_circle</span>
                  Track your progress over time
                </li>
              </ul>
            </div>
          </section>

          {/* Interview Setup Section */}
          <section className="card setup-section">
            <h3>Start Your Practice Interview</h3>

            {/* Interview Type Selection */}
            <div className="interview-type-selector">
              <div className="type-option active" data-type="behavioral">
                <span className="material-icons-outlined">psychology</span>
                <h4>Behavioral</h4>
                <p>
                  Common interview questions about your past experiences and
                  behavior
                </p>
              </div>
              <div className="type-option" data-type="technical">
                <span className="material-icons-outlined">code</span>
                <h4>Technical</h4>
                <p>Role-specific technical questions and problem-solving tasks</p>
              </div>
              <div className="type-option" data-type="case">
                <span className="material-icons-outlined">business_center</span>
                <h4>Case Study</h4>
                <p>Real-world business scenarios and problem-solving questions</p>
              </div>
            </div>

            {/* Start Interview Button */}
            <button className="button button-primary button-large start-interview-button">
              <span className="material-icons-outlined">play_arrow</span>
              Start Practice Interview
            </button>
          </section>

          {/* Countdown Section */}
          <section className="card countdown-section" style={{ display: "none" }}>
            <div className="countdown-content">
              <h3>Preparing Your Interview Space</h3>
              <div className="countdown-timer">00:10</div>
              <p>Please ensure:</p>
              <ul className="preparation-list">
                <li>
                  <span className="material-icons-outlined">webcam</span> Webcam
                  is ready
                </li>
                <li>
                  <span className="material-icons-outlined">mic</span>{" "}
                  Microphone is working
                </li>
                <li>
                  <span className="material-icons-outlined">wifi</span> Stable
                  internet connection
                </li>
                <li>
                  <span className="material-icons-outlined">privacy_tip</span>{" "}
                  Private, quiet space
                </li>
              </ul>
            </div>
          </section>

          {/* Past Attempts Section */}
          <section className="card attempts-section">
            <h3>Previous Practice Attempts</h3>
            <div className="attempts-grid">
              {/* Sample Attempt */}
              <div className="attempt-card">
                <div className="attempt-header">
                  <div className="attempt-type">
                    <span className="material-icons-outlined">psychology</span>
                    Behavioral
                  </div>
                  <div className="attempt-date">Jun 20, 2024</div>
                </div>
                <div className="attempt-score">
                  <div className="score-badge">85%</div>
                  <div className="score-details">
                    <p>Great job! Your responses were clear and concise.</p>
                    <p>Areas for improvement: Body language and eye contact.</p>
                  </div>
                </div>
                <div className="attempt-actions">
                  <button className="button button-secondary button-small">
                    <span className="material-icons-outlined">play_arrow</span>
                    Watch Recording
                  </button>
                  <button className="button button-secondary button-small">
                    <span className="material-icons-outlined">feedback</span>
                    View Feedback
                  </button>
                </div>
              </div>

              {/* Sample Attempt */}
              <div className="attempt-card">
                <div className="attempt-header">
                  <div className="attempt-type">
                    <span className="material-icons-outlined">code</span>
                    Technical
                  </div>
                  <div className="attempt-date">Jun 15, 2024</div>
                </div>
                <div className="attempt-score">
                  <div className="score-badge">78%</div>
                  <div className="score-details">
                    <p>Good technical knowledge, but could improve explanations.</p>
                    <p>Areas for improvement: Code organization.</p>
                  </div>
                </div>
                <div className="attempt-actions">
                  <button className="button button-secondary button-small">
                    <span className="material-icons-outlined">play_arrow</span>
                    Watch Recording
                  </button>
                  <button className="button button-secondary button-small">
                    <span className="material-icons-outlined">feedback</span>
                    View Feedback
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default PracticeInterview;