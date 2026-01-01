import React, { useEffect, useMemo, useState } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";
import { API_BASE_URL as API_BASE } from "../../config";

// Simple HTTP client without credentials
const getAuthHeaders = () => {
  try {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const http = {
  async get(url) {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    console.log(`🌐 GET ${fullUrl}`);
    try {
      const res = await fetch(fullUrl, { 
        headers: { 
          'Accept': 'application/json',
          ...getAuthHeaders()
        }
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`GET ${fullUrl} failed (${res.status} ${res.statusText}): ${errorText}`);
      }
      return res.json();
    } catch (error) {
      console.error('GET request failed:', error);
      throw error;
    }
  },

  async post(url, payload) {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    console.log(`📤 POST ${fullUrl}`, payload);
    try {
      const res = await fetch(fullUrl, { 
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(`POST ${fullUrl} failed (${res.status}): ${JSON.stringify(data)}`);
      }
      return data;
    } catch (error) {
      console.error('POST request failed:', error);
      throw error;
    }
  },

  async patch(url, payload) {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
    console.log(`🔄 PATCH ${fullUrl}`, payload);
    try {
      const res = await fetch(fullUrl, { 
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(`PATCH ${fullUrl} failed (${res.status}): ${JSON.stringify(data)}`);
      }
      return data;
    } catch (error) {
      console.error('PATCH request failed:', error);
      throw error;
    }
  },
};

function CandidatesApply({ onNavigate }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const jobId = params.get("jobId") || "";
  const hrFromQuery = params.get("hr") || "";
  const hrIdFromQuery = params.get("hrId") || "";
  const candidateIdFromQuery = params.get("candidateId") || "";
  const modeFromQuery = (params.get("mode") || "").toLowerCase();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [job, setJob] = useState(null);
  const [hrName, setHrName] = useState(hrFromQuery || "");
  const [candidate, setCandidate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [appRec, setAppRec] = useState(null);
  const [applications, setApplications] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [modal, setModal] = useState({ open: false, item: null, profile: null });

  // Identify current user and role
  const currentUser = useMemo(() => {
    try {
      const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      return rawUser ? JSON.parse(rawUser) : null;
    } catch {
      return null;
    }
  }, []);
  const userRole = (currentUser?.role || "").toLowerCase();

  const hrNameResolved = useMemo(() => {
    const storedFullName = (typeof localStorage !== 'undefined' && localStorage.getItem('full_name')) || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('full_name')) || '';
    if (storedFullName) return String(storedFullName).toLowerCase();
    if (hrName) return String(hrName).toLowerCase();
    if (currentUser && currentUser.name) return String(currentUser.name).toLowerCase();
    if (currentUser && currentUser.email) {
      const local = String(currentUser.email).split('@')[0].toLowerCase();
      const firstAlphaToken = (local.replace(/[^a-z]/g, ' ').trim().split(/\s+/)[0]) || local;
      return firstAlphaToken;
    }
    return '';
  }, [currentUser, hrName]);

  const go = (path, e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof onNavigate === "function") onNavigate(path);
    else {
      window.history.pushState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };

  // Fetch candidate profile with full details
  const fetchCandidateProfile = async (id) => {
    const paths = [
      `${API_BASE}/api/profile/${encodeURIComponent(id)}`,
      `${API_BASE}/auth/me?user_id=${encodeURIComponent(id)}`,
    ];
    let lastErr = null;
    for (const url of paths) {
      try {
        const data = await http.get(url);
        if (data && Object.keys(data).length > 0) return data;
      } catch (e) { lastErr = e; }
    }
    // Fallback: try localStorage
    try {
      const raw = localStorage.getItem('applications');
      const arr = raw ? JSON.parse(raw) : [];
      const rec = (Array.isArray(arr) ? arr : []).find(a => String(a.candidate_id||'') === String(id));
      if (rec) {
        return {
          _id: id,
          full_name: rec.candidate_name || rec.name || '',
          email: rec.candidate_email || rec.email || '',
          field: rec.field || '',
          experience: rec.experience || '',
          skills: rec.candidate_skills || rec.skills || [],
          certificates: rec.candidate_certificates || rec.certificates || '',
          cv_url: rec.cv || '',
          profile_pic: rec.profile_pic || '',
        };
      }
    } catch {}
    return { _id: id };
  };

  const fetchJobDetails = async (id) => {
    const paths = [
      `${API_BASE}/api/job-criteria/${encodeURIComponent(id)}`,
      `${API_BASE}/api/job-criteria?id=${encodeURIComponent(id)}`,
      `${API_BASE}/hr/jobs/${encodeURIComponent(id)}`,
      `${API_BASE}/api/hr/jobs/${encodeURIComponent(id)}`,
      `${API_BASE}/api/jobs/${encodeURIComponent(id)}`,
    ];
    let lastErr = null;
    for (const url of paths) {
      try {
        const data = await http.get(url);
        if (data) return data;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('Job not found');
  };

  const candidateId = useMemo(() => {
    try {
      if (candidateIdFromQuery) return candidateIdFromQuery;
      if (userRole === 'hr' || modeFromQuery === 'review') {
        try {
          const raw = localStorage.getItem('applications');
          const arr = raw ? JSON.parse(raw) : [];
          let filtered = Array.isArray(arr) ? arr : [];
          if (jobId) filtered = filtered.filter(a => String(a.job_id||'')===String(jobId));
          if (hrIdFromQuery) filtered = filtered.filter(a => String(a.hr_id||'')===String(hrIdFromQuery));
          filtered.sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));
          if (filtered.length) return filtered[0].candidate_id || '';
        } catch {}
        return '';
      }
      const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      const parsed = rawUser ? JSON.parse(rawUser) : null;
      return parsed?._id || parsed?.id || parsed?.user_id || localStorage.getItem("user_id") || sessionStorage.getItem("user_id") || "";
    } catch {
      return "";
    }
  }, [candidateIdFromQuery, userRole, modeFromQuery, jobId, hrIdFromQuery]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        let jobData = null;
        let effectiveJobId = jobId;
        try {
          const raw = localStorage.getItem('applications');
          const arr = raw ? JSON.parse(raw) : [];
          let filtered = (Array.isArray(arr) ? arr : []).filter(a => String(a.candidate_id||'')===String(candidateId) && (!hrIdFromQuery || String(a.hr_id||'')===String(hrIdFromQuery)));
          if (effectiveJobId) filtered = filtered.filter(a => String(a.job_id||'')===String(effectiveJobId));
          filtered.sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));
          if (!effectiveJobId && filtered.length) effectiveJobId = filtered[0].job_id;
          if (filtered.length) setAppRec(filtered[0]);
        } catch {}
        if (effectiveJobId) {
          jobData = await fetchJobDetails(effectiveJobId);
          if (!alive) return;
          setJob(jobData);
          const name = jobData?.hr_name || jobData?.hrName || jobData?.owner_name || jobData?.created_by_name || jobData?.hr?.name || hrFromQuery || "";
          setHrName(name);
        } else {
          setJob(null);
        }

        if (!candidateId) throw new Error("Missing candidate id");
        const cand = await fetchCandidateProfile(candidateId);
        if (!alive) return;
        const merged = { ...cand };
        if (!merged.full_name && appRec?.candidate_name) merged.full_name = appRec.candidate_name;
        if (!merged.email && appRec?.candidate_email) merged.email = appRec.candidate_email;
        setCandidate(merged);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || "Failed to load details");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [API_BASE, jobId, candidateId, hrFromQuery]);

  useEffect(() => {
    let active = true;
    
    async function fetchData() {
      if (!hrNameResolved) { 
        setApplications([]); 
        return; 
      }
      
      setLoading(true);
      setError("");
      
      try {
        const url = `${API_BASE}/api/hr/applications?hr_name=${encodeURIComponent(hrNameResolved)}`;
        const data = await http.get(url);
        
        if (!active) return;
        
        const apps = Array.isArray(data) ? data : [];
        setApplications(apps);
        console.log('Fetched applications:', apps);
        
      } catch (err) {
        console.error('Error fetching applications:', err);
        if (active) {
          setError('Failed to load applications. Please try again.');
          setApplications([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    
    fetchData();
    return () => { active = false; };
  }, [API_BASE, hrNameResolved]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (applications || []).filter(a => {
      const okStatus = statusFilter === 'All' || String(a.status || 'Pending').toLowerCase() === statusFilter.toLowerCase();
      if (!okStatus) return false;
      if (!q) return true;
      const name = String(a.name || a.candidate_name || '').toLowerCase();
      const email = String(a.email || '').toLowerCase();
      const skills = Array.isArray(a.skills) ? a.skills.join(' ').toLowerCase() : String(a.skills || '').toLowerCase();
      return name.includes(q) || email.includes(q) || skills.includes(q);
    });
  }, [applications, query, statusFilter]);

  async function updateStatus(item, status) {
  const endpoint = `${API_BASE}/api/hr/update-status`;
  const applicationId = item._id || item.id;
  
  if (!applicationId) {
    setError('Missing application ID');
    return;
  }
  
  try {
    setSubmitting(true);
    setError('');
    
    const candidateId = item.candidate_id || item.candidateId || item.user?._id;
    const candidateEmail = (item.email || item.candidate_email || item.user?.email || '').toLowerCase().trim();
    const hrName = item.hr_name || item.postedBy?.name || hrNameResolved || '';
    const jobId = item.job_id || item.job?._id || item.jobId || '';
    
    const payload = {
      candidate_id: candidateId,
      candidate_email: candidateEmail,
      hr_name: hrName,
      job_id: jobId,
      status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    };
    
    console.log('📤 Sending update request to:', endpoint);
    console.log('📦 Payload:', JSON.stringify(payload, null, 2));
    
    const response = await http.patch(endpoint, payload);
    
    console.log('✅ Response received:', response);
    
    // Check for various success indicators
    const isSuccess = 
      response?.success === true || 
      response?.success === 'true' ||
      (typeof response?.updated !== 'undefined') ||
      (typeof response?.matched !== 'undefined') ||
      response?.message?.toLowerCase().includes('success') ||
      response?.status === 'success';
    
    if (isSuccess) {
      // Update local component state immediately
      setApplications(prev => 
        prev.map(a => (a._id === applicationId || a.id === applicationId ? { ...a, status } : a))
      );
      
      console.log('🔄 Updating localStorage...');
      
      // CRITICAL: Update localStorage so candidate can see the status change
      try {
        const raw = localStorage.getItem('applications');
        console.log('📦 Current localStorage applications:', raw ? JSON.parse(raw).length : 0);
        
        if (raw) {
          const allApps = JSON.parse(raw);
          let updateCount = 0;
          
          const updatedApps = allApps.map(a => {
            // Multiple matching strategies
            const matchById = a._id === applicationId || a.id === applicationId;
            const matchByCombo = (
              String(a.candidate_id) === String(candidateId) && 
              String(a.job_id) === String(jobId)
            );
            const matchByEmail = (
              candidateEmail && 
              String(a.candidate_email || '').toLowerCase() === candidateEmail &&
              String(a.job_id) === String(jobId)
            );
            
            const isMatch = matchById || matchByCombo || matchByEmail;
            
            if (isMatch) {
              updateCount++;
              console.log(`✏️  Updating application #${updateCount}:`, {
                old: { id: a._id, status: a.status },
                new: { id: a._id, status }
              });
              return { ...a, status, updated_at: new Date().toISOString() };
            }
            return a;
          });
          
          localStorage.setItem('applications', JSON.stringify(updatedApps));
          console.log(`💾 localStorage updated! Changed ${updateCount} application(s)`);
          
          if (updateCount === 0) {
            console.warn('⚠️  No matching applications found in localStorage to update');
            console.warn('Searched for:', { candidateId, jobId, applicationId });
          }
        } else {
          console.warn('⚠️  No applications in localStorage');
        }
      } catch (e) {
        console.error('❌ Failed to update localStorage:', e);
      }
      
      // Also try to update myApplications if it exists
      try {
        const myApps = localStorage.getItem('myApplications');
        if (myApps) {
          const parsed = JSON.parse(myApps);
          const updatedMyApps = parsed.map(a => {
            const isMatch = 
              a._id === applicationId || 
              a.id === applicationId || 
              (a.candidate_id === candidateId && a.job_id === jobId);
            
            return isMatch ? { ...a, status, updated_at: new Date().toISOString() } : a;
          });
          localStorage.setItem('myApplications', JSON.stringify(updatedMyApps));
          console.log('💾 myApplications updated successfully');
        }
      } catch (e) {
        console.warn('Failed to update myApplications:', e);
      }
      
      // Force a storage event for other tabs/components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'applications',
        newValue: localStorage.getItem('applications'),
        url: window.location.href
      }));
      
      setSuccessMsg(`Application ${status.toLowerCase()} successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }
    
    console.warn('⚠️  Unexpected response format:', response);
    throw new Error(`Unexpected response format: ${JSON.stringify(response)}`);
    
  } catch (error) {
    console.error('❌ Update failed with error:', error);
    setError(error.message || 'Failed to update application status');
    setTimeout(() => setError(''), 10000);
  } finally {
    setSubmitting(false);
  }
}

  // Enhanced view profile handler
  const handleViewProfile = async (item) => {
    try {
      setModal({ open: true, item, profile: null });
      const candidateId = item.candidate_id || item.candidateId || item.user?._id;
      if (!candidateId) {
        console.warn('No candidate ID found for profile fetch');
        return;
      }
      
      // Fetch full profile details
      const profile = await fetchCandidateProfile(candidateId);
      console.log('Fetched profile for modal:', profile);
      
      setModal({ open: true, item, profile });
    } catch (err) {
      console.error('Failed to fetch profile details:', err);
      setModal({ open: true, item, profile: null });
    }
  };

  const formatExperience = (exp) => {
    if (typeof exp === 'string') return exp;
    return exp || 'Not specified';
  };

  const formatSkills = (skills) => {
    if (Array.isArray(skills)) return skills;
    if (typeof skills === 'string') return skills.split(',').map(s => s.trim()).filter(Boolean);
    return [];
  };

  const formatCertificates = (certs) => {
    if (!certs) return [];
    if (Array.isArray(certs)) {
      return certs.map((c, i) => {
        if (typeof c === 'string') return { name: `Certificate ${i+1}`, url: c };
        if (typeof c === 'object') return { name: c.name || `Certificate ${i+1}`, url: c.url || c.path || c.link || c.file || '' };
        return { name: `Certificate ${i+1}`, url: String(c) };
      }).filter(c => c.url);
    }
    return [];
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="app-logo">HR</span> Recruit
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item"><a href="#" onClick={(e) => go('/hr', e)}><span className="material-icons-outlined">dashboard</span><span className="nav-label">Dashboard</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/candidates', e)}><span className="material-icons-outlined">people_alt</span><span className="nav-label">Candidates</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/set-criteria', e)}><span className="material-icons-outlined">history</span><span className="nav-label">Set Criteria</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/job-display', e)}><span className="material-icons-outlined">work</span><span className="nav-label">Job Display</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/candidates-apply', e)}><span className="material-icons-outlined">how_to_reg</span><span className="nav-label">Candidates Apply</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/hr-profile', e)}><span className="material-icons-outlined">badge</span><span className="nav-label">Profile</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/interview-questions', e)}><span className="material-icons-outlined">quiz</span><span className="nav-label">Interview Questions</span></a></li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/hr-analysis-list'); }}>
                <span className="material-icons-outlined">analytics</span>
                <span className="nav-label">Interview Analysis</span>
              </a>
            </li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/schedule-interview', e)}><span className="material-icons-outlined">event</span><span className="nav-label">Schedule Interviews</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/notifications', e)}><span className="material-icons-outlined">notifications</span><span className="nav-label">Notifications</span></a></li>
            <li className="nav-item"><a href="#" onClick={(e) => go('/feedback', e)}><span className="material-icons-outlined">rate_review</span><span className="nav-label">Feedback</span></a></li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <ul>
            <li className="nav-item"><a href="#" onClick={(e) => go('/settings', e)}><span className="material-icons-outlined">settings</span><span className="nav-label">Settings</span></a></li>
            <li className="nav-item"><a href="#" id="logout-link" className="logout-link" onClick={(e) => { e.preventDefault(); try { localStorage.clear(); sessionStorage.clear(); } catch(_) {}; window.location.replace('/'); }}><span className="material-icons-outlined">logout</span><span className="nav-label">Logout</span></a></li>
          </ul>
        </div>
      </aside>

      <div className="main-content">
        <main className="dashboard-content">
          <section className="card" style={{ gridColumn: '1 / -1' }}>
            <header className="jobdisplay-header" style={{ padding: '8px 0 12px' }}>
              <div className="jobdisplay-title">Candidate Applications</div>
              <div className="jobdisplay-stats" title="Total applications">
                <span><span className="material-icons-outlined" style={{fontSize:16,verticalAlign:'middle'}}>inbox</span> {filtered.length}</span>
              </div>
            </header>

            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, email or skill" style={{ flex: 1, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }} />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                <option>All</option>
                <option>Pending</option>
                <option>Accepted</option>
                <option>Rejected</option>
              </select>
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(220,38,38,0.08)', color: '#991b1b', borderRadius: 8, fontWeight: 600 }}>{error}</div>
            )}

            {successMsg && (
              <div style={{ marginBottom: 16, padding: 12, background: 'rgba(34,197,94,0.08)', color: '#166534', borderRadius: 8, fontWeight: 600 }}>{successMsg}</div>
            )}

            {loading ? (
              <div style={{ padding: 24 }}>Loading...</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>No applications found</div>
            ) : (
              <div style={{ width: '100%', overflowX: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#374151', background: '#f8fafc', fontWeight: 600 }}>Candidate</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#374151', background: '#f8fafc', fontWeight: 600 }}>Field</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#374151', background: '#f8fafc', fontWeight: 600 }}>Job Title</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#374151', background: '#f8fafc', fontWeight: 600 }}>Applied On</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#374151', background: '#f8fafc', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#374151', background: '#f8fafc', fontWeight: 600 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, idx) => {
                      const name = a.name || a.candidate_name || '-';
                      const email = a.email || '';
                      const pic = a.profile_pic || a.profile_picture || '';
                      const imgSrc = pic ? (String(pic).startsWith('http') ? pic : `${API_BASE}${pic}`) : '';
                      const applied = a.applied_at ? new Date(a.applied_at).toLocaleDateString() : '-';
                      const status = String(a.status || 'Pending');
                      const statusLc = status.toLowerCase();
                      const color = statusLc === 'accepted' ? '#16a34a' : statusLc === 'rejected' ? '#dc2626' : '#f59e0b';
                      const bg = statusLc === 'accepted' ? 'rgba(22,163,74,0.1)' : statusLc === 'rejected' ? 'rgba(220,38,38,0.1)' : 'rgba(245,158,11,0.1)';
                      return (
                        <tr key={(a.candidate_id || email || '') + idx}>
                          <td style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#111827' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', background: '#e5e7eb' }}>
                                {imgSrc ? (
                                  <img src={imgSrc} alt="profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : null}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{name}</div>
                                <div style={{ fontSize: 12, color: '#6b7280' }}>{email}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#111827' }}>{a.field || '-'}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#111827' }}>{a.job_title || '-'}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#111827' }}>{applied}</td>
                          <td style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#111827' }}>
                            <span style={{ padding: '4px 10px', borderRadius: 9999, color, backgroundColor: bg, fontWeight: 600, fontSize: 12 }}>{status}</span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #eee', fontSize: 14, color: '#111827' }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, background: '#e5e7eb', color: '#111827' }} onClick={() => handleViewProfile(a)}>View Profile</button>
                              <button 
                                style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, background: '#dcfce7', color: '#166534', opacity: submitting ? 0.6 : 1 }} 
                                onClick={() => updateStatus(a, 'Accepted')}
                                disabled={submitting}
                              >
                                {submitting ? 'Updating...' : 'Accept'}
                              </button>
                              <button 
                                style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 600, background: '#fee2e2', color: '#991b1b', opacity: submitting ? 0.6 : 1 }} 
                                onClick={() => updateStatus(a, 'Rejected')}
                                disabled={submitting}
                              >
                                {submitting ? 'Updating...' : 'Reject'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {modal.open && modal.item && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setModal({ open: false, item: null, profile: null })}>
              <div style={{ width: 'min(800px, 92vw)', maxHeight: '85vh', overflowY: 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', padding: 24 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>Candidate Profile</div>
                  <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, background: '#f3f4f6', color: '#111827', transition: 'background 0.2s' }} onClick={() => setModal({ open: false, item: null, profile: null })}>Close</button>
                </div>

                {!modal.profile ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading profile details...</div>
                ) : (
                  <div>
                    {/* Profile Header Section */}
                    <div style={{ display: 'flex', alignItems: 'start', gap: 20, marginBottom: 24, padding: 20, background: '#f8fafc', borderRadius: 12 }}>
                      <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', background: '#e5e7eb', flexShrink: 0 }}>
                        {(modal.profile.profile_pic || modal.profile.avatar_url || modal.item.profile_pic) ? (
                          <img 
                            src={
                              (modal.profile.profile_pic || modal.profile.avatar_url || modal.item.profile_pic).startsWith('http') 
                                ? (modal.profile.profile_pic || modal.profile.avatar_url || modal.item.profile_pic) 
                                : `${API_BASE}${modal.profile.profile_pic || modal.profile.avatar_url || modal.item.profile_pic}`
                            } 
                            alt="profile" 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#9ca3af' }}>
                            <span className="material-icons-outlined">person</span>
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6, color: '#111827' }}>
                          {modal.profile.full_name || modal.profile.name || modal.item.name || modal.item.candidate_name || 'N/A'}
                        </h2>
                        <p style={{ fontSize: 18, color: '#6b7280', marginBottom: 12 }}>
                          {modal.profile.field || modal.profile.headline || modal.item.field || 'Not specified'}
                        </p>
                        <div style={{ display: 'flex', gap: 16, fontSize: 14, color: '#374151' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="material-icons-outlined" style={{ fontSize: 18 }}>email</span>
                            <span>{modal.profile.email || modal.item.email || 'N/A'}</span>
                          </div>
                          {(modal.profile.phone || modal.profile.contact) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="material-icons-outlined" style={{ fontSize: 18 }}>phone</span>
                              <span>{modal.profile.phone || modal.profile.contact}</span>
                            </div>
                          )}
                          {(modal.profile.location) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span className="material-icons-outlined" style={{ fontSize: 18 }}>location_on</span>
                              <span>{modal.profile.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Two Column Layout */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      
                      {/* Left Column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        
                        {/* Experience Section */}
                        <div style={{ padding: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-icons-outlined" style={{ fontSize: 20 }}>work_history</span>
                            Experience
                          </h3>
                          <p style={{ fontSize: 14, color: '#374151' }}>
                            {formatExperience(modal.profile.experience || modal.item.experience)}
                          </p>
                        </div>

                        {/* Skills Section */}
                        <div style={{ padding: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-icons-outlined" style={{ fontSize: 20 }}>emoji_objects</span>
                            Skills
                          </h3>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {formatSkills(modal.profile.skills || modal.item.skills).length > 0 ? (
                              formatSkills(modal.profile.skills || modal.item.skills).map((skill, i) => (
                                <span key={i} style={{ padding: '6px 14px', borderRadius: 20, fontWeight: 600, fontSize: 13, background: '#dbeafe', color: '#1e40af' }}>
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: 14, color: '#6b7280' }}>No skills listed</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        
                        {/* Documents Section */}
                        <div style={{ padding: 16, background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-icons-outlined" style={{ fontSize: 20 }}>description</span>
                            Documents
                          </h3>
                          
                          {/* Resume/CV */}
                          {(modal.profile.cv_url || modal.profile.resume_url || modal.item.cv) ? (
                            <div style={{ marginBottom: 12 }}>
                              <a 
                                href={
                                  (modal.profile.cv_url || modal.profile.resume_url || modal.item.cv).startsWith('http') 
                                    ? (modal.profile.cv_url || modal.profile.resume_url || modal.item.cv) 
                                    : `${API_BASE}${modal.profile.cv_url || modal.profile.resume_url || modal.item.cv}`
                                } 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{ 
                                  display: 'inline-flex', 
                                  alignItems: 'center', 
                                  gap: 8, 
                                  padding: '10px 16px', 
                                  borderRadius: 8, 
                                  border: 'none', 
                                  cursor: 'pointer', 
                                  fontWeight: 600, 
                                  background: '#e0f2fe', 
                                  color: '#075985', 
                                  textDecoration: 'none',
                                  fontSize: 14,
                                  transition: 'background 0.2s'
                                }}
                              >
                                <span className="material-icons-outlined" style={{ fontSize: 18 }}>picture_as_pdf</span>
                                View Resume/CV
                              </a>
                            </div>
                          ) : (
                            <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 12 }}>No resume uploaded</p>
                          )}

                          {/* Certificates */}
                          {formatCertificates(modal.profile.certificates || modal.item.certificates).length > 0 && (
                            <div>
                              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#374151' }}>Certificates:</h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {formatCertificates(modal.profile.certificates || modal.item.certificates).map((cert, i) => (
                                  <a 
                                    key={i} 
                                    href={cert.url.startsWith('http') ? cert.url : `${API_BASE}${cert.url}`} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    style={{ 
                                      display: 'inline-flex', 
                                      alignItems: 'center', 
                                      gap: 8, 
                                      padding: '8px 12px', 
                                      borderRadius: 8, 
                                      border: '1px solid #e5e7eb', 
                                      cursor: 'pointer', 
                                      fontWeight: 500, 
                                      background: '#fff', 
                                      color: '#374151', 
                                      textDecoration: 'none',
                                      fontSize: 13,
                                      transition: 'background 0.2s'
                                    }}
                                  >
                                    <span className="material-icons-outlined" style={{ fontSize: 16 }}>verified</span>
                                    {cert.name}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Application Info Section */}
                        <div style={{ padding: 16, background: '#fef3c7', borderRadius: 10, border: '1px solid #fcd34d' }}>
                          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className="material-icons-outlined" style={{ fontSize: 20 }}>info</span>
                            Application Details
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
                            <div><strong>Job Title:</strong> {modal.item.job_title || 'N/A'}</div>
                            <div><strong>Applied On:</strong> {modal.item.applied_at ? new Date(modal.item.applied_at).toLocaleDateString() : 'N/A'}</div>
                            <div>
                              <strong>Status:</strong> 
                              <span style={{ 
                                marginLeft: 8,
                                padding: '4px 10px', 
                                borderRadius: 12, 
                                fontWeight: 600, 
                                fontSize: 12,
                                color: modal.item.status?.toLowerCase() === 'accepted' ? '#166534' : 
                                       modal.item.status?.toLowerCase() === 'rejected' ? '#991b1b' : '#92400e',
                                background: modal.item.status?.toLowerCase() === 'accepted' ? '#dcfce7' : 
                                           modal.item.status?.toLowerCase() === 'rejected' ? '#fee2e2' : '#fef3c7'
                              }}>
                                {modal.item.status || 'Pending'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default CandidatesApply;