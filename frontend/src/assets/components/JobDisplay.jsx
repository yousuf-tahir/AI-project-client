  // JobDisplay.jsx
  import React, { useEffect, useState } from "react";
  import "material-icons/iconfont/material-icons.css";
  import "../styles/hrdashboard.css";
  import "../styles/jobdisplay.css";
  import ErrorBoundary from "./ErrorBoundary";

  const JobDisplay = ({ onNavigate, user }) => {
    const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
    const [isLoading, setIsLoading] = useState(true);
    const [jobs, setJobs] = useState([]);
    const [toast, setToast] = useState({ type: '', text: '' });
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("recent");

    useEffect(() => {
      const storedUser = user || JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
      if (!storedUser?._id) {
        if (typeof onNavigate === 'function') onNavigate('/login');
        else window.location.href = '/login';
        return;
      }

      const fetchJobs = async () => {
        try {
          const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
          const url = `${API_BASE}/api/job-criteria/user/${storedUser._id}`;
          const res = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Fetch ${res.status}: ${text || 'Failed to load job posts'} (${url})`);
          }
          const data = await res.json();
          setJobs(Array.isArray(data) ? data : []);
        } catch (e) {
          setToast({ type: 'error', text: e.message || 'Failed to load job posts' });
        } finally {
          setIsLoading(false);
        }
      };

      fetchJobs();
    }, [API_BASE, onNavigate, user]);

    useEffect(() => {
      if (!toast.text) return;
      const t = setTimeout(() => setToast({ type: '', text: '' }), 3000);
      return () => clearTimeout(t);
    }, [toast.text]);

    const resolveId = (job) => job?.id || job?._id || job?.ID || job?.Id;
    const publicUrlFor = (job) => {
      const id = resolveId(job);
      return id ? `${window.location.origin}/public/job/${id}` : '';
    };
    const copyLink = async (job) => {
      try {
        const url = publicUrlFor(job);
        if (!url) throw new Error('Job ID missing');
        await navigator.clipboard.writeText(url);
        setToast({ type: 'success', text: 'Public link copied' });
      } catch (_) {
        setToast({ type: 'error', text: 'Failed to copy link' });
      }
    };

    const handleNavigation = (path) => (e) => {
      e.preventDefault();
      if (onNavigate) onNavigate(path); else window.location.href = path;
    };

    if (!onNavigate) {
      return <div style={{color: 'red', padding: '20px'}}>Error: onNavigate prop is missing. Make sure the component is properly connected to the router.</div>;
    }

    if (isLoading) {
      return (
        <div className="jobdisplay-page">
          <div className="jobdisplay-main">
            <div className="jobs-grid" style={{ paddingTop: 24 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-line" style={{ width: '60%' }}></div>
                  <div className="skeleton-line" style={{ width: '40%' }}></div>
                  <div className="skeleton-line" style={{ width: '80%' }}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    const filtered = jobs.filter(j => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const title = (j.job_title || '').toLowerCase();
      const qual = (j.qualification || '').toLowerCase();
      const desc = (j.description || '').toLowerCase();
      const skills = (j.skills || []).map(s => (s.name || s || '')).join(' ').toLowerCase();
      return title.includes(q) || qual.includes(q) || desc.includes(q) || skills.includes(q);
    }).sort((a, b) => {
      if (sort === 'recent') return new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0);
      if (sort === 'title') return (a.job_title || '').localeCompare(b.job_title || '');
      return 0;
    });

    return (
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <span className="app-logo">HR</span> Recruit
          </div>
          <nav className="sidebar-nav">
            <ul>
              <li className="nav-item">
                <a href="#" onClick={handleNavigation('/hr')}>
                  <span className="material-icons-outlined">dashboard</span>
                  <span className="nav-label">Dashboard</span>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={handleNavigation('/candidates')}>
                  <span className="material-icons-outlined">people_alt</span>
                  <span className="nav-label">Candidates</span>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={handleNavigation('/set-criteria')}>
                  <span className="material-icons-outlined">history</span>
                  <span className="nav-label">Set Criteria</span>
                </a>
              </li>
              <li className="nav-item active">
                <a href="#" className="active">
                  <span className="material-icons-outlined">work</span>
                  <span className="nav-label">Job Display</span>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={handleNavigation('/candidates-apply')}>
                  <span className="material-icons-outlined">how_to_reg</span>
                  <span className="nav-label">Candidates Apply</span>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={handleNavigation('/hr-profile')}>
                  <span className="material-icons-outlined">badge</span>
                  <span className="nav-label">Profile</span>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={handleNavigation('/interview-questions')}>
                  <span className="material-icons-outlined">quiz</span>
                  <span className="nav-label">Interview Questions</span>
                </a>
              </li>
              <li className="nav-item"><a href="#" onClick={(e) => go("/interview-questions", e)}><span className="material-icons-outlined">quiz</span><span className="nav-label">Interview Questions</span></a></li>
                <li className="nav-item">
                <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/hr-analysis-list'); }}>
                  <span className="material-icons-outlined">analytics</span>
                  <span className="nav-label">Interview Analysis</span>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={handleNavigation('/schedule-interview')}>
                  <span className="material-icons-outlined">event</span>
                  <span className="nav-label">Schedule Interviews</span>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={handleNavigation('/notifications')}>
                  <span className="material-icons-outlined">notifications</span>
                  <span className="nav-label">Notifications</span>
                </a>
              </li>
              <li className="nav-item">
                <a href="#" onClick={handleNavigation('/feedback')}>
                  <span className="material-icons-outlined">rate_review</span>
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
                      localStorage.removeItem('email');
                      localStorage.removeItem('user_id');
                      localStorage.removeItem('full_name');
                      sessionStorage.removeItem('user');
                      sessionStorage.removeItem('token');
                      sessionStorage.removeItem('email');
                      sessionStorage.removeItem('user_id');
                      sessionStorage.removeItem('full_name');
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

        <div className="main-content">
          <header className="jobdisplay-header">
            <div className="jobdisplay-title">Your Job Posts</div>
            <div className="jobdisplay-stats">
              <span><span className="material-icons-outlined" style={{fontSize:16,verticalAlign:'middle'}}>work</span> {jobs.length}</span>
            </div>
          </header>
          <div className="jobdisplay-toolbar">
            <div className="jobdisplay-search">
              <span className="material-icons-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>search</span>
              <input placeholder="Search title, qualification, description or skills..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <select className="jobdisplay-select" value={sort} onChange={e=>setSort(e.target.value)}>
              <option value="recent">Sort: Most Recent</option>
              <option value="title">Sort: Title A→Z</option>
            </select>
            <button className="button button-ghost" onClick={() => onNavigate && onNavigate('/set-criteria')}>
              <span className="material-icons-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>add</span>
              <span style={{ marginLeft: 6 }}>New Job</span>
            </button>
          </div>

          <main className="dashboard-content">
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 40, color: '#94a3b8' }}>
                  <span className="material-icons-outlined">work_outline</span>
                </div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>No matching jobs</div>
                <div style={{ fontSize: 13 }}>Try clearing the search or create a new job post.</div>
                <div style={{ marginTop: 12 }}>
                  <button className="button button-primary" onClick={() => onNavigate && onNavigate('/set-criteria')}>Create Job</button>
                </div>
              </div>
            ) : (
              <div className="jobs-grid">
                    {filtered.map((job) => (
                      <div key={job.id} className="job-card">
                        <div className="job-card-header">
                          <div className="job-title">{job.job_title}</div>
                          <div className="job-meta">
                            <span className="material-icons-outlined" title="Experience">schedule</span>
                            <span>{job.experience_years} yrs</span>
                            <span className="material-icons-outlined" title="Qualification" style={{ marginLeft: 12 }}>school</span>
                            <span>{job.qualification}</span>
                          </div>
                        </div>
                        {job.description ? (
                          <p className="job-description" style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
                        ) : null}
                        <div className="job-skills">
                          {(job.skills || []).map((s) => (
                            <span key={s._id || s.name} className="skill-tag">{s.name || s}</span>
                          ))}
                        </div>
                        <div className="job-actions">
                          <button className="button" onClick={() => copyLink(job)}>
                            <span className="material-icons-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>content_copy</span>
                            <span style={{ marginLeft: 6 }}>Copy Public Link</span>
                          </button>
                          <a className="button button-primary" href={publicUrlFor(job) || '#'} target="_blank" rel="noreferrer" onClick={(e) => { if (!publicUrlFor(job)) { e.preventDefault(); setToast({type:'error', text:'Invalid job link'}); } }}>
                            View Public Page
                          </a>
                        </div>
                      </div>
                    ))}
              </div>
            )}
          </main>
        </div>
        {toast.text ? (
          <div className={`toast ${toast.type === 'success' ? 'success' : 'error'}`} role="status" aria-live="polite" style={{ position: 'fixed', right: 20, bottom: 20 }}>
            <span className="material-icons-outlined toast-icon" aria-hidden>{toast.type === 'error' ? 'error' : 'check_circle'}</span>
            <span>{toast.text}</span>
          </div>
        ) : null}
      </div>
    );
  };

  export default function JobDisplayWithErrorBoundary(props) {
    return (
      <ErrorBoundary>
        <JobDisplay {...props} />
      </ErrorBoundary>
    );
  }
