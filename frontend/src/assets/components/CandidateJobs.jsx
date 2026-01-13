import React, { useEffect, useMemo, useState } from 'react';
import 'material-icons/iconfont/material-icons.css';
import '../styles/candidate.css';
import '../styles/jobdisplay.css';

const CandidateJobs = ({ onNavigate }) => {
  const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8000';
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [hrCache, setHrCache] = useState({});
  const [appliedJobs, setAppliedJobs] = useState(new Set());

  // Hide global topbar on this page only
  useEffect(() => {
    try { document.body.classList.add('hide-global-topbar'); } catch {}
    return () => { try { document.body.classList.remove('hide-global-topbar'); } catch {} };
  }, []);

  // Load applied jobs from localStorage on mount
  useEffect(() => {
    try {
      const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      const parsed = rawUser ? JSON.parse(rawUser) : null;
      const candidateId = parsed?._id || parsed?.id || parsed?.user_id || '';
      
      if (!candidateId) return;

      const raw = localStorage.getItem('applications');
      const arr = raw ? JSON.parse(raw) : [];
      
      if (Array.isArray(arr)) {
        const appliedJobIds = arr
          .filter(a => String(a.candidate_id) === String(candidateId))
          .map(a => String(a.job_id));
        
        setAppliedJobs(new Set(appliedJobIds));
        console.log('📋 Loaded applied jobs:', appliedJobIds);
      }
    } catch (err) {
      console.error('Failed to load applied jobs:', err);
    }
  }, []);

  // SPA navigation helper
  const go = (path) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const authHeaders = () => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      return token ? { Authorization: `Bearer ${token}` } : {};
    } catch { return {}; }
  };

  useEffect(() => {
    const fetchListAll = async () => {
      setLoading(true); setError('');
      try {
        const res = await fetch(`${API_BASE}/api/job-criteria`, { headers: { Accept: 'application/json', ...authHeaders() } });
        if (res.ok) {
          const data = await res.json();
          const arr = Array.isArray(data) ? data : [];
          setJobs(arr);
          setLoading(false);
          return true;
        }
      } catch (_) {}
      return false;
    };

    const fetchViaHROwners = async () => {
      try {
        // 1) Load all HR users
        const hrsRes = await fetch(`${API_BASE}/api/admin/hr-users`, { headers: { Accept: 'application/json', ...authHeaders() } });
        if (!hrsRes.ok) throw new Error('Failed to load HR users');
        const hrUsers = await hrsRes.json();
        const ids = Array.isArray(hrUsers) ? hrUsers.map(u => u.id).filter(Boolean) : [];
        if (!ids.length) { setJobs([]); return; }
        // 2) For each HR, fetch their job criteria
        const results = await Promise.allSettled(ids.map(async (id) => {
          const r = await fetch(`${API_BASE}/api/job-criteria/user/${encodeURIComponent(id)}`, { headers: { Accept: 'application/json', ...authHeaders() } });
          if (!r.ok) throw new Error('fail');
          return await r.json();
        }));
        const combined = results.flatMap((res) => (res.status === 'fulfilled' && Array.isArray(res.value)) ? res.value : []);
        setJobs(combined);
      } catch (e) {
        setError(e?.message || 'Could not load jobs. Please try again later.');
        setJobs([]);
      } finally {
        setLoading(false);
      }
    };

    (async () => {
      const ok = await fetchListAll();
      if (!ok) await fetchViaHROwners();
    })();
  }, [API_BASE]);

  const resolveHrUserId = (job) => {
    return (
      job?.hr_id || job?.hrId || job?.user_id || job?.userId || job?.owner_id || job?.ownerId || (job?.hr && (job.hr._id || job.hr.id)) || null
    );
  };

  const resolveHrEmail = (job) => {
    return (
      job?.hr_email || job?.email || job?.contact_email || (job?.hr && job.hr.email) || null
    );
  };

  useEffect(() => {
    const controller = new AbortController();
    const need = [];
    for (const j of jobs || []) {
      const hrUserId = resolveHrUserId(j);
      if (!hrUserId) continue;
      if (!hrCache[hrUserId]) need.push(hrUserId);
    }
    if (!need.length) return;
    (async () => {
      const updates = {};
      await Promise.allSettled(need.map(async (uid) => {
        try {
          const res = await fetch(`${API_BASE}/auth/me?user_id=${encodeURIComponent(uid)}`, { signal: controller.signal });
          if (!res.ok) return;
          const data = await res.json();
          updates[uid] = data || {};
        } catch (_) {}
      }));
      if (Object.keys(updates).length) {
        setHrCache((prev) => ({ ...prev, ...updates }));
      }
    })();
    return () => controller.abort();
  }, [jobs, API_BASE]);

  useEffect(() => {
    const controller = new AbortController();
    const needEmails = [];
    for (const j of jobs || []) {
      const uid = resolveHrUserId(j);
      if (uid) continue;
      const em = resolveHrEmail(j);
      if (!em) continue;
      const key = `email:${em.toLowerCase()}`;
      if (!hrCache[key]) needEmails.push(em);
    }
    if (!needEmails.length) return;
    (async () => {
      const updates = {};
      await Promise.allSettled(needEmails.map(async (em) => {
        try {
          const res = await fetch(`${API_BASE}/auth/me?email=${encodeURIComponent(em)}`, { signal: controller.signal });
          if (!res.ok) return;
          const data = await res.json();
          updates[`email:${em.toLowerCase()}`] = data || {};
        } catch (_) {}
      }));
      if (Object.keys(updates).length) setHrCache((prev) => ({ ...prev, ...updates }));
    })();
    return () => controller.abort();
  }, [jobs, API_BASE, hrCache]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = Array.isArray(jobs) ? jobs : [];
    const m = base.filter((j) => {
      const title = String(j.job_title || j.title || '').toLowerCase();
      const qual = String(j.qualification || '').toLowerCase();
      const desc = String(j.description || '').toLowerCase();
      const skills = ((j.skills || []).map(s => (s?.name || s || '')).join(' ')).toLowerCase();
      return !q || title.includes(q) || qual.includes(q) || desc.includes(q) || skills.includes(q);
    });
    if (sort === 'title') return m.sort((a,b) => String(a.job_title||'').localeCompare(String(b.job_title||'')));
    return m.sort((a,b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  }, [jobs, search, sort]);

  const resolveId = (job) => job?.id || job?._id || job?.ID || job?.Id;
  const publicUrlFor = (job) => {
    const id = resolveId(job);
    return id ? `${window.location.origin}/public/job/${id}` : '';
  };

  // Check if job has been applied to
  const hasApplied = (jobId) => {
    return appliedJobs.has(String(jobId));
  };

  return (
    <div className="candidate-dashboard-layout">
      {/* Sidebar with wrapper to prevent scrolling */}
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
                <li className="nav-item active">
                  <a href="#" onClick={(e) => e.preventDefault()}>
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
                <li className="nav-item">
                  <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate-analysis-list'); }}>
                    <span className="material-icons-outlined">rate_review</span>
                    <span className="nav-label">Interview Feedback</span>
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
          </div>
        </aside>
      </div>

      {/* Main Content */}
      <div className="candidate-main-content">
        <main className="dashboard-main-grid">
          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <header className="jobdisplay-header" style={{ padding: '8px 0 0' }}>
              <div className="jobdisplay-title">Available Jobs</div>
              <div className="jobdisplay-stats" title="Total jobs">
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
            </div>

            {loading ? (
              <div className="jobs-grid" style={{ paddingTop: 24 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton-line" style={{ width: '60%' }}></div>
                    <div className="skeleton-line" style={{ width: '40%' }}></div>
                    <div className="skeleton-line" style={{ width: '80%' }}></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="empty-state">
                <div style={{ fontSize: 40, color: '#94a3b8' }}>
                  <span className="material-icons-outlined">error_outline</span>
                </div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>{error}</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 40, color: '#94a3b8' }}>
                  <span className="material-icons-outlined">work_outline</span>
                </div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>No matching jobs</div>
                <div style={{ fontSize: 13 }}>Try clearing the search.</div>
              </div>
            ) : (
              <div className="jobs-grid">
                {filtered.map((job) => {
                  const posted = new Date(job.updated_at || job.created_at || Date.now());
                  const postedStr = isNaN(posted.getTime()) ? '' : posted.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                  const hrUserId = resolveHrUserId(job);
                  const hrEmailKey = (() => { const em = resolveHrEmail(job); return em ? `email:${String(em).toLowerCase()}` : null; })();
                  const hrProfile = (hrUserId && hrCache[hrUserId]) || (hrEmailKey && hrCache[hrEmailKey]) || null;
                  const hrName = job.hr_name || job.hrName || job.owner_name || job.created_by_name || (job.hr && job.hr.name) || hrProfile?.full_name || hrProfile?.name || hrProfile?.user?.full_name || '';
                  const orgName = job.organization_name || job.org_name || job.company || job.company_name || job.organization || job.employer || (job.hr && job.hr.organization) || hrProfile?.organization_name || hrProfile?.organization || hrProfile?.company || hrProfile?.org || '';
                  const orgNumber = job.organization_number || job.org_number || job.organization_no || job.company_number || hrProfile?.organization_number || '';
                  const location = job.location || job.city || job.address || hrProfile?.location || hrProfile?.city || hrProfile?.address || '';
                  const email = job.hr_email || job.email || job.contact_email || (job.hr && job.hr.email) || hrProfile?.email || hrProfile?.user?.email || '';
                  const phone = job.hr_phone || job.phone || job.contact_phone || (job.hr && job.hr.phone) || hrProfile?.phone || hrProfile?.user?.phone || '';
                  const jobId = resolveId(job);
                  const alreadyApplied = hasApplied(jobId);
                  
                  return (
                    <div key={jobId} className="job-card" style={{ borderRadius: 12, border: '1px solid var(--border-color,#e5e7eb)' }}>
                      <div className="job-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div className="job-title" style={{ fontSize: 18, fontWeight: 700 }}>{job.job_title}</div>
                          <div className="job-meta" style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#6b7280', marginTop: 6 }}>
                            <span className="material-icons-outlined" title="Experience">schedule</span>
                            <span>{job.experience_years} yrs</span>
                            <span className="material-icons-outlined" title="Qualification">school</span>
                            <span>{job.qualification}</span>
                          </div>
                        </div>
                        <div className="form-hint" style={{ whiteSpace: 'nowrap' }}>{postedStr}</div>
                      </div>
                      {job.description ? (
                        <p className="job-description" style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{job.description}</p>
                      ) : null}
                      <div className="job-skills" style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(job.skills || []).map((s, idx) => (
                          <span key={s._id || s.name || idx} className="skill-tag" style={{ borderRadius: 20 }}>{s.name || s}</span>
                        ))}
                      </div>
                      <div className="job-contact" style={{
                        marginTop: 12,
                        padding: '10px 12px',
                        background: 'var(--card-bg,#f9fafb)',
                        borderRadius: 8,
                        border: '1px solid var(--border-color,#e5e7eb)'
                      }}>
                        <div style={{ fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="material-icons-outlined" style={{ fontSize: 18 }}>info</span>
                          <span>Offered by</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', rowGap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151' }}>
                            <span className="material-icons-outlined" style={{ fontSize: 18 }}>person</span>
                            <span>HR: {hrName || 'Not provided'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151' }}>
                            <span className="material-icons-outlined" style={{ fontSize: 18 }}>apartment</span>
                            <span>Organization: {orgName || 'Not provided'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151' }}>
                            <span className="material-icons-outlined" style={{ fontSize: 18 }}>place</span>
                            <span>{location || 'Not provided'}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151' }}>
                            <span className="material-icons-outlined" style={{ fontSize: 18 }}>mail</span>
                            {email ? (
                              <a href={`mailto:${email}`} style={{ color: 'inherit', textDecoration: 'underline dotted' }}>Email: {email}</a>
                            ) : (
                              <span>Email: Not provided</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151' }}>
                            <span className="material-icons-outlined" style={{ fontSize: 18 }}>call</span>
                            {phone ? (
                              <a href={`tel:${phone}`} style={{ color: 'inherit', textDecoration: 'underline dotted' }}>Phone: {phone}</a>
                            ) : (
                              <span>Phone: Not provided</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="job-actions" style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <a className="button" href={publicUrlFor(job) || '#'} target="_blank" rel="noreferrer">
                          View Details
                        </a>
                        <button
                          className="button button-primary"
                          style={alreadyApplied ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                          onClick={async (e) => {
                            e.preventDefault();
                            
                            // Check if already applied
                            if (alreadyApplied) {
                              alert('Already applied for this job');
                              return;
                            }
                            
                            const hrId = resolveHrUserId(job) || (job?.hr && (job.hr._id || job.hr.id)) || job?.user_id || job?.owner_id || '';
                            let candidateId = '';
                            let candidateName = '';
                            let candidateEmail = '';
                            
                            try {
                              const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');
                              const parsed = rawUser ? JSON.parse(rawUser) : null;
                              candidateId = parsed?._id || parsed?.id || parsed?.user_id || localStorage.getItem('user_id') || sessionStorage.getItem('user_id') || '';
                              candidateName = parsed?.full_name || parsed?.name || parsed?.user?.full_name || '';
                              candidateEmail = parsed?.email || parsed?.user?.email || localStorage.getItem('email') || sessionStorage.getItem('email') || '';
                            } catch {}

                            if (!candidateId || !jobId) {
                              alert('Missing required information to apply');
                              return;
                            }

                            const payload = {
                              candidate_id: candidateId,
                              job_id: jobId,
                              hr_name: hrName || '',
                            };

                            console.log('📤 Submitting application:', payload);

                            // Try to submit to backend first
                            const endpoints = [
                              `${API_BASE}/api/applications`,
                              `${API_BASE}/applications`,
                            ];
                            
                            let backendSuccess = false;
                            for (const url of endpoints) {
                              try {
                                const res = await fetch(url, { 
                                  method: 'POST', 
                                  headers: { 
                                    'Content-Type': 'application/json',
                                    ...authHeaders()
                                  }, 
                                  body: JSON.stringify(payload) 
                                });
                                if (res.ok) {
                                  backendSuccess = true;
                                  console.log('✅ Application submitted to backend');
                                  break;
                                }
                              } catch (e) {
                                console.warn('Backend submission failed:', e);
                              }
                            }

                            // Always save to localStorage regardless of backend success
                            try {
                              const now = new Date().toISOString();
                              const applicationRecord = {
                                _id: `local_${Date.now()}_${candidateId}_${jobId}`,
                                candidate_id: candidateId,
                                candidate_name: candidateName,
                                candidate_email: candidateEmail,
                                job_id: jobId,
                                job_title: job?.job_title || job?.title || '',
                                hr_id: hrId || '',
                                hr_name: hrName || '',
                                organization: orgName || '',
                                status: 'Pending',
                                applied_at: now,
                                created_at: now,
                                field: job?.qualification || '',
                                experience: `${job?.experience_years || 0} years`,
                                skills: (job?.skills || []).map(s => s.name || s),
                              };

                              console.log('💾 Saving application to localStorage:', applicationRecord);

                              const raw = localStorage.getItem('applications');
                              const arr = raw ? JSON.parse(raw) : [];
                              
                              // Add new application
                              arr.push(applicationRecord);
                              console.log('➕ Added new application');

                              localStorage.setItem('applications', JSON.stringify(arr));
                              console.log('✅ localStorage updated successfully');

                              // Update applied jobs state
                              setAppliedJobs(prev => new Set([...prev, String(jobId)]));

                              alert(backendSuccess 
                                ? 'Application submitted successfully!' 
                                : 'Application saved locally. It will be synced when the server is available.'
                              );
                            } catch (err) {
                              console.error('❌ Failed to save application:', err);
                              alert('Failed to save application. Please try again.');
                            }
                          }}
                        >
                          {alreadyApplied ? 'Applied ✓' : 'Apply Now'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};

export default CandidateJobs;