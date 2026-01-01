import React, { useEffect, useMemo, useState } from "react";
import "material-icons/iconfont/material-icons.css";
import axios from "axios";
import "../styles/hrdashboard.css";
import "../styles/candidate.css";

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const API_URL = `${API_BASE}/api/admin/candidates`;
const PROFILE_API = `${API_BASE}/api/profile`;

const Candidate = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fieldFilter, setFieldFilter] = useState("");
  const [perfFilter, setPerfFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const staticFields = [
    'Software Development',
    'Web Development',
    'Mobile Development',
    'Testing/QA',
    'DevOps',
    'Project Management',
    'Data Science',
    'UI/UX Design',
  ];

  const getToken = () => {
    try {
      return localStorage.getItem('token') || sessionStorage.getItem('token');
    } catch (_) {
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    const token = getToken();
    axios
      .get(API_URL, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((res) => {
        if (!mounted) return;
        setData(Array.isArray(res.data) ? res.data : res.data?.data || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.response?.data?.detail || err.message || "Failed to load candidates");
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch detailed profile when a candidate is selected
  useEffect(() => {
    if (!selected) {
      setSelectedProfile(null);
      return;
    }

    const fetchProfile = async () => {
      setProfileLoading(true);
      try {
        const userId = selected.user_id || selected._id || selected.id;
        if (!userId) {
          setSelectedProfile(selected);
          setProfileLoading(false);
          return;
        }

        const token = getToken();
        const response = await axios.get(`${PROFILE_API}/${userId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        // Merge candidate data with profile data
        setSelectedProfile({
          ...selected,
          ...response.data,
          profileData: response.data
        });
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        // Fallback to candidate data if profile fetch fails
        setSelectedProfile(selected);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchProfile();
  }, [selected]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim().toLowerCase()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const toNumber = (val) => {
    if (val === undefined || val === null || val === "") return NaN;
    const n = Number(val);
    return Number.isFinite(n) ? n : NaN;
  };

  const pickScore = (u) => u.score ?? u.match ?? u.match_percent ?? u.match_percentage ?? u.match_score;
  const pickTitle = (u) => u.title || u.position || u.role_title || u.designation || u.headline || "";
  const pickField = (u) => (u.field || u.domain || u.category || u.position || '').toString();
  const pickYears = (u) => u.years || u.experience || u.experience_years || u.years_of_experience || null;
  const pickTech = (u) => u.technical_score ?? u.tech_score ?? u.tech ?? null;
  const pickComm = (u) => u.communication_score ?? u.comm_score ?? u.communication ?? null;

  const filtered = useMemo(() => {
    const s = debouncedSearch;
    let out = data.filter((u) => {
      const name = (u.name || u.full_name || "").toLowerCase();
      const field = (u.field || u.domain || u.category || u.position || "").toLowerCase();
      const scoreVal = pickScore(u);
      const scoreStr = scoreVal !== undefined && scoreVal !== null ? String(scoreVal).toLowerCase() : "";
      const textMatch = !s || name.includes(s) || field.includes(s) || scoreStr.includes(s);
      if (!textMatch) return false;
      if (fieldFilter && pickField(u).toLowerCase() !== fieldFilter.toLowerCase()) return false;
      if (perfFilter) {
        const min = Number(perfFilter);
        const n = Number(scoreVal);
        if (Number.isFinite(min)) {
          if (!Number.isFinite(n) || n < min) return false;
        }
      }
      return true;
    });
    out = [...out].sort((a, b) => {
      const sa = toNumber(pickScore(a));
      const sb = toNumber(pickScore(b));
      if (Number.isFinite(sa) && Number.isFinite(sb)) return sb - sa;
      if (Number.isFinite(sa)) return -1;
      if (Number.isFinite(sb)) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
    return out;
  }, [data, debouncedSearch, fieldFilter, perfFilter]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize), [filtered, currentPage]);

  const go = (path, e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof onNavigate === "function") onNavigate(path);
    else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
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
            <li className="nav-item"><a href="#" onClick={(e) => go("/hr", e)}><span className="material-icons-outlined">dashboard</span><span className="nav-label">Dashboard</span></a></li>
            <li className="nav-item active"><a href="#" onClick={(e) => go("/candidates", e)}><span className="material-icons-outlined">people_alt</span><span className="nav-label">Candidates</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go("/set-criteria", e)}><span className="material-icons-outlined">history</span><span className="nav-label">Set Criteria</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go("/job-display", e)}><span className="material-icons-outlined">work</span><span className="nav-label">Job Display</span></a></li>
            <li className="nav-item">
              <a href="#" onClick={(e) => go("/candidates-apply", e)}>
                <span className="material-icons-outlined">how_to_reg</span>
                <span className="nav-label">Candidates Apply</span>
              </a>
            </li>
            <li className="nav-item"><a href="#" onClick={(e) => go("/hr-profile", e)}><span className="material-icons-outlined">badge</span><span className="nav-label">Profile</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go("/interview-questions", e)}><span className="material-icons-outlined">quiz</span><span className="nav-label">Interview Questions</span></a></li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/hr-analysis-list'); }}>
                <span className="material-icons-outlined">analytics</span>
                <span className="nav-label">Interview Analysis</span>
              </a>
            </li>
            <li className="nav-item"><a href="#" onClick={(e) => go("/schedule-interview", e)}><span className="material-icons-outlined">event</span><span className="nav-label">Schedule Interviews</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go("/notifications", e)}><span className="material-icons-outlined">notifications</span><span className="nav-label">Notifications</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go("/feedback", e)}><span className="material-icons-outlined">feedback</span><span className="nav-label">Feedback</span></a></li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <ul>
            <li className="nav-item"><a href="#" onClick={(e) => go("/settings", e)}><span className="material-icons-outlined">settings</span><span className="nav-label">Settings</span></a></li>
            <li className="nav-item">
              <a href="#" onClick={(e) => {
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
                } catch (_) { }
                window.location.replace('/');
              }}>
                <span className="material-icons-outlined">logout</span><span className="nav-label">Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <div className="top-bar">
          <div className="top-bar-left"><h2 className="page-title">Candidates</h2></div>
          <div className="top-bar-right"></div>
        </div>

        <main className="dashboard-grid">
          {/* Filters + Search */}
          <section className="card" style={{ padding: 16 }}>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: '1fr 1fr 2fr' }}>
              <div className="input-group">
                <span className="material-icons-outlined">category</span>
                <select className="form-control" value={fieldFilter} onChange={(e) => setFieldFilter((e.target.value || '').toLowerCase())}>
                  <option value="">All Fields</option>
                  {staticFields.map((label) => {
                    const valLower = label.toLowerCase();
                    return <option key={valLower} value={valLower}>{label}</option>;
                  })}
                </select>
              </div>
              <div className="input-group">
                <span className="material-icons-outlined">speed</span>
                <select className="form-control" value={perfFilter} onChange={(e) => setPerfFilter(e.target.value)}>
                  <option value="">All Scores</option>
                  <option value="50">Score ≥ 50</option>
                  <option value="70">Score ≥ 70</option>
                  <option value="85">Score ≥ 85</option>
                  <option value="90">Score ≥ 90</option>
                </select>
              </div>
              <div className="input-group" style={{ width: "100%" }}>
                <span className="material-icons-outlined">search</span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, field, or skills…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                Showing <strong>{Math.min(total, (currentPage - 1) * pageSize + paged.length)}</strong> of <strong>{total}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {(search || fieldFilter || perfFilter) && (
                  <button className="button button-secondary" onClick={() => { setSearch(''); setFieldFilter(''); setPerfFilter(''); setPage(1); }}>
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Card grid */}
          <section className="card" style={{ padding: 0 }}>
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18, padding: 18 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, background: '#fff' }}>
                    <div style={{ height: 16, width: '60%', background: '#e5e7eb', borderRadius: 6, marginBottom: 8 }}></div>
                    <div style={{ height: 12, width: '40%', background: '#eef2f7', borderRadius: 6, marginBottom: 16 }}></div>
                    <div style={{ height: 10, width: '80%', background: '#f1f5f9', borderRadius: 6 }}></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div style={{ padding: 24, color: "#ef4444", display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{error}</span>
                <button className="button button-secondary" onClick={() => {
                  setLoading(true);
                  const token = getToken();
                  axios.get(API_URL, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
                    .then(res => { setData(Array.isArray(res.data) ? res.data : res.data?.data || []); setError(''); })
                    .catch(e => setError(e?.response?.data?.detail || e.message || 'Failed to load candidates'))
                    .finally(() => setLoading(false));
                }}>
                  Retry
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 32, color: '#64748b', textAlign: 'center' }}>
                <span className="material-icons-outlined" style={{ fontSize: 36, color: '#94a3b8' }}>person_search</span>
                <div style={{ marginTop: 8, fontWeight: 600 }}>No candidates found</div>
                <div style={{ fontSize: 13 }}>Try adjusting filters or clearing the search.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18, padding: 18 }}>
                {paged.map((c) => {
                  const initials = (c.name || c.full_name || c.email || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
                  const score = pickScore(c);
                  const title = pickTitle(c);
                  const years = pickYears(c);
                  const tech = pickTech(c);
                  const comm = pickComm(c);
                  const skills = (c.skills || c.raw?.skills || []).map(s => typeof s === 'string' ? s : (s.name || s.title || '')).filter(Boolean).slice(0, 6);
                  return (
                    <div key={c._id || c.id || c.email} className="candidate-card" style={{
                      border: '1px solid #e2e8f0', borderRadius: 14, padding: 16, background: '#fff',
                      display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 8px 20px rgba(2,6,23,0.06)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                          {initials}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600 }}>{c.name || c.full_name || '-'}</div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{title || (c.email || '-')}</div>
                        </div>
                        <div style={{ marginLeft: 'auto' }}>
                          <span title="Overall Score" style={{ background: '#10b981', color: 'white', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                            {Number.isFinite(toNumber(score)) ? `Overall ${score}%` : 'Overall N/A'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
                        <span className="material-icons-outlined" style={{ fontSize: 18, color: '#94a3b8' }}>work_outline</span>
                        <span style={{ fontSize: 13 }}>{c.field || c.domain || c.category || c.position || '—'}</span>
                        {Number.isFinite(Number(years)) && (
                          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{years}+ years</span>
                        )}
                      </div>
                      {(Number.isFinite(Number(tech)) || Number.isFinite(Number(comm))) && (
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: '#0f172a' }}>
                          {Number.isFinite(Number(tech)) && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              <span className="material-icons-outlined" style={{ fontSize: 16, color: '#ef4444' }}>memory</span>
                              Technical: {tech}%
                            </span>
                          )}
                          {Number.isFinite(Number(comm)) && (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                              <span className="material-icons-outlined" style={{ fontSize: 16, color: '#0ea5e9' }}>forum</span>
                              Communication: {comm}%
                            </span>
                          )}
                        </div>
                      )}
                      {skills.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {skills.map((sk, idx) => (
                            <span key={idx} style={{ background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0', borderRadius: 999, fontSize: 11, padding: '3px 8px' }}>{sk}</span>
                          ))}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <button className="button button-secondary" onClick={() => setSelected(c)} style={{ padding: '6px 10px' }}>
                          <span className="material-icons-outlined" style={{ fontSize: 16, marginRight: 6, verticalAlign: 'middle' }}>expand_more</span>
                          View Detailed Results
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Pagination */}
          <section className="card" style={{ padding: 12, display: total > pageSize ? 'block' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: '#64748b' }}>Page {currentPage} of {totalPages}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="button" disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</button>
                <button className="button" disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* Fixed Enhanced Details Modal */}
      {selected && (
        <div className="modal" style={{ background: 'rgba(0, 0, 0, 0.5)' }} onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ 
            maxWidth: 700, 
            maxHeight: '90vh', 
            overflow: 'auto',
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}>
            <div className="modal-head" style={{ 
              padding: '20px 24px', 
              borderBottom: '1px solid #e2e8f0',
              background: 'white'
            }}>
              <div className="modal-title" style={{ fontWeight: 600, fontSize: '18px' }}>Candidate Profile</div>
              <button className="btn btn-gray" onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none' }}>
                <span className="material-icons-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px', background: 'white' }}>
              {profileLoading ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <div style={{ display: 'inline-block', width: 40, height: 40, border: '4px solid #f3f4f6', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  <div style={{ marginTop: 12, color: '#64748b' }}>Loading profile...</div>
                </div>
              ) : selectedProfile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Header with Avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 20, borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#e0f2fe', color: '#0369a1', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 28 }}>
                      {(selectedProfile.name || selectedProfile.full_name || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selectedProfile.name || selectedProfile.full_name || '-'}</h3>
                      <div style={{ color: '#64748b', marginTop: 4, fontSize: '14px' }}>{selectedProfile.headline || selectedProfile.title || selectedProfile.position || '-'}</div>
                      <div style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>{selectedProfile.email || '-'}</div>
                    </div>
                  </div>

                  {/* Basic Info */}
                  <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Contact Information</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Email</div>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{selectedProfile.email || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Phone</div>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{selectedProfile.phone || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Location</div>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{selectedProfile.location || '-'}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Field</div>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{selectedProfile.field || selectedProfile.domain || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Experience */}
                  {(selectedProfile.experience_years || selectedProfile.experience_months) && (
                    <div>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Experience</h4>
                      <div style={{ fontWeight: 500, color: '#0f172a', fontSize: '15px' }}>
                        {selectedProfile.experience_years || 0} years {selectedProfile.experience_months || 0} months
                      </div>
                    </div>
                  )}

                  {/* Skills - Removed Scores section as requested */}
                  {selectedProfile.skills && selectedProfile.skills.length > 0 && (
                    <div>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Skills</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {selectedProfile.skills.map((skill, idx) => (
                          <span key={idx} style={{ 
                            background: '#f1f5f9', 
                            color: '#0f172a', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '6px', 
                            fontSize: 13, 
                            padding: '6px 12px',
                            fontWeight: 500
                          }}>
                            {typeof skill === 'string' ? skill : (skill.name || skill.title || '')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resume */}
                  {selectedProfile.resume_url && (
                    <div>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Resume</h4>
                      <a href={API_BASE + selectedProfile.resume_url} target="_blank" rel="noopener noreferrer" 
                         style={{ 
                           display: 'inline-flex', 
                           alignItems: 'center', 
                           gap: 8, 
                           padding: '10px 18px', 
                           background: '#3b82f6', 
                           color: 'white', 
                           borderRadius: '8px', 
                           textDecoration: 'none', 
                           fontWeight: 500,
                           fontSize: '14px',
                           transition: 'all 0.2s'
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
                         onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}>
                        <span className="material-icons-outlined" style={{ fontSize: 20 }}>description</span>
                        View Resume
                      </a>
                    </div>
                  )}

                  {/* Certificates */}
                  {selectedProfile.certificates && selectedProfile.certificates.length > 0 && (
                    <div>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Certificates</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {selectedProfile.certificates.map((cert, idx) => (
                          <a key={idx} href={API_BASE + cert.url} target="_blank" rel="noopener noreferrer"
                             style={{ 
                               display: 'flex', 
                               alignItems: 'center', 
                               gap: 12, 
                               padding: 14, 
                               background: '#f9fafb', 
                               border: '1px solid #e5e7eb', 
                               borderRadius: '8px', 
                               textDecoration: 'none', 
                               color: '#0f172a',
                               transition: 'all 0.2s'
                             }}
                             onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                             onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}>
                            <span className="material-icons-outlined" style={{ fontSize: 24, color: '#0ea5e9' }}>workspace_premium</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 500, fontSize: '15px' }}>{cert.name || 'Certificate'}</div>
                            </div>
                            <span className="material-icons-outlined" style={{ fontSize: 20, color: '#94a3b8' }}>open_in_new</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional Details */}
                  <div>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 600, color: '#0f172a' }}>Additional Information</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Candidate ID</div>
                        <div style={{ 
                          fontWeight: 500, 
                          fontSize: 13, 
                          wordBreak: 'break-all',
                          color: '#0f172a',
                          fontFamily: 'monospace',
                          background: '#f8fafc',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0'
                        }}>
                          {selectedProfile._id || selectedProfile.id || selectedProfile.user_id || '-'}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Role</div>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{selectedProfile.role || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 24, color: '#64748b' }}>
                  <span className="material-icons-outlined" style={{ fontSize: 48, color: '#94a3b8' }}>error_outline</span>
                  <div style={{ marginTop: 12, fontWeight: 600 }}>Failed to load profile</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Profile data is not available</div>
                </div>
              )}
            </div>
            <div className="modal-foot" style={{ 
              padding: '20px 24px', 
              borderTop: '1px solid #e2e8f0',
              background: 'white',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button className="btn btn-blue" onClick={() => setSelected(null)} style={{ 
                padding: '10px 20px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2563eb'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3b82f6'}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Modal backdrop styling */
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        
        .modal-card {
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modalFadeIn 0.3s ease-out;
        }
        
        @keyframes modalFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default Candidate;