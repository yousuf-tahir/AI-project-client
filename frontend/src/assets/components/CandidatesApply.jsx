import React, { useEffect, useMemo, useState } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";
import { API_BASE_URL as API_BASE } from "../../config";

// Simple HTTP client without credentials (like VoiceRecorder)
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
        // No credentials: 'include' - like VoiceRecorder
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
        // No credentials: 'include'
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
        // No credentials: 'include'
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
  const [modal, setModal] = useState({ open: false, item: null });

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

  // Try official profile endpoint first, then minimal auth fallback, then local storage
  const fetchCandidateProfile = async (id) => {
    const paths = [
      `${API_BASE}/api/profile/${encodeURIComponent(id)}`,
      `${API_BASE}/auth/me?user_id=${encodeURIComponent(id)}`,
    ];
    let lastErr = null;
    for (const url of paths) {
      try {
        const data = await http.get(url);
        if (data) return data;
      } catch (e) { lastErr = e; }
    }
    // Fallback: try localStorage application record or stored user
    try {
      // From applications list
      const raw = localStorage.getItem('applications');
      const arr = raw ? JSON.parse(raw) : [];
      const rec = (Array.isArray(arr) ? arr : []).find(a => String(a.candidate_id||'') === String(id));
      if (rec) {
        return {
          _id: id,
          full_name: rec.candidate_name || '',
          email: rec.candidate_email || '',
          skills: rec.candidate_skills || [],
          importantCertificates: rec.candidate_certificates || '',
        };
      }
    } catch {}
    try {
      // From stored user if this browser belongs to the candidate (only in candidate mode)
      if (!(userRole === 'hr' || modeFromQuery === 'review')) {
        const rawUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        const u = rawUser ? JSON.parse(rawUser) : null;
        if (u && (String(u._id||u.id||u.user_id||'') === String(id))) {
          return u;
        }
      }
    } catch {}
    // As a last resort, return a minimal stub to keep UI functional
    return { _id: id };
  };

  // Try multiple endpoints to get job details since backends differ
  const fetchJobDetails = async (id) => {
    const paths = [
      // Prefer Set Criteria endpoints as requested
      `${API_BASE}/api/job-criteria/${encodeURIComponent(id)}`,
      `${API_BASE}/api/job-criteria?id=${encodeURIComponent(id)}`,
      // Other possible job endpoints
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

  // Identify current candidate user id from storage
  const candidateId = useMemo(() => {
    try {
      // 1) If explicitly provided, use it
      if (candidateIdFromQuery) return candidateIdFromQuery;
      // 2) If HR is reviewing (role hr or mode=review), infer from local applications
      if (userRole === 'hr' || modeFromQuery === 'review') {
        try {
          const raw = localStorage.getItem('applications');
          const arr = raw ? JSON.parse(raw) : [];
          let filtered = Array.isArray(arr) ? arr : [];
          if (jobId) filtered = filtered.filter(a => String(a.job_id||'')===String(jobId));
          if (hrIdFromQuery) filtered = filtered.filter(a => String(a.hr_id||'')===String(hrIdFromQuery));
          // take the most recent
          filtered.sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));
          if (filtered.length) return filtered[0].candidate_id || '';
        } catch {}
        return '';
      }
      // 3) Default to current user (candidate flow)
      const rawUser = localStorage.getItem("user") || sessionStorage.getItem("user");
      const parsed = rawUser ? JSON.parse(rawUser) : null;
      return parsed?._id || parsed?.id || parsed?.user_id || localStorage.getItem("user_id") || sessionStorage.getItem("user_id") || "";
    } catch {
      return "";
    }
  }, [candidateIdFromQuery, userRole, modeFromQuery, jobId, hrIdFromQuery]);

  // Load job (HR) details and candidate details
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        let jobData = null;
        let effectiveJobId = jobId;
        // If jobId not provided, try to infer from localStorage applications
        try {
          const raw = localStorage.getItem('applications');
          const arr = raw ? JSON.parse(raw) : [];
          // find latest application record for this candidate (and hr if provided)
          let filtered = (Array.isArray(arr) ? arr : []).filter(a => String(a.candidate_id||'')===String(candidateId) && (!hrIdFromQuery || String(a.hr_id||'')===String(hrIdFromQuery)));
          // If jobId is already known, narrow down to it so we can bind appRec as well
          if (effectiveJobId) filtered = filtered.filter(a => String(a.job_id||'')===String(effectiveJobId));
          filtered.sort((a,b)=> new Date(b.created_at||0) - new Date(a.created_at||0));
          if (!effectiveJobId && filtered.length) effectiveJobId = filtered[0].job_id;
          if (filtered.length) setAppRec(filtered[0]);
        } catch {}
        if (effectiveJobId) {
          // GET HR job details with fallbacks
          jobData = await fetchJobDetails(effectiveJobId);
          if (!alive) return;
          setJob(jobData);
          const name = jobData?.hr_name || jobData?.hrName || jobData?.owner_name || jobData?.created_by_name || jobData?.hr?.name || hrFromQuery || "";
          setHrName(name);
        } else {
          // No job context available; keep job null and continue without error
          setJob(null);
        }

        // GET Candidate profile
        if (!candidateId) throw new Error("Missing candidate id");
        const cand = await fetchCandidateProfile(candidateId);
        if (!alive) return;
        // Merge with appRec for missing basic fields
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

  // Fetch applications for the logged-in HR
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
        // Simple GET request without credentials - like VoiceRecorder
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

  // Filter applications based on search query and status
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

  // Update application status (Accept/Reject)
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
      const hrName = item.hr_name || item.postedBy?.name || hrNameResolved || hrName || '';
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
      
      // Simple PATCH request without credentials - like VoiceRecorder
      const response = await http.patch(endpoint, payload);
      
      console.log('✅ Response received:', response);
      
      if (response?.success || response?.updated > 0) {
        setApplications(prev => 
          prev.map(a => (a._id === applicationId ? { ...a, status } : a))
        );
        setSuccessMsg(`Application ${status.toLowerCase()} successfully!`);
        setTimeout(() => setSuccessMsg(''), 3000);
        return;
      }
      
      throw new Error(`Update was not successful. Response: ${JSON.stringify(response)}`);
      
    } catch (error) {
      console.error('❌ Update failed with error:', error);
      setError(error.message || 'Failed to update application status');
      setTimeout(() => setError(''), 10000);
    } finally {
      setSubmitting(false);
    }
  }

  // Robust fetch for HR applications: try multiple endpoints
  const fetchApplicationsForHR = async (nameRaw) => {
    const name = String(nameRaw || '').trim();
    const q = encodeURIComponent(name);
    const paths = [
      `${API_BASE}/api/hr/applications?hr_name=${q}`,
    ];
    let lastErr = null;
    for (const url of paths) {
      try {
        const data = await http.get(url);
        if (Array.isArray(data)) return data;
      } catch (e) { lastErr = e; }
    }
    if (lastErr) throw lastErr;
    return [];
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!(userRole === 'hr' || modeFromQuery === 'review')) return;
        setLoading(true);
        setError("");
        const resolved = (hrName || currentUser?.name || currentUser?.full_name || currentUser?.username || hrFromQuery || "eman");
        const data = await fetchApplicationsForHR(resolved);
        if (!alive) return;
        const arr = Array.isArray(data) ? data : [];
        setApplications(arr);
        // Hydrate summary candidate details when appRec exists
        try {
          const emailKey = (appRec?.candidate_email || candidate?.email || '').toLowerCase();
          if (emailKey && arr.length) {
            const hit = arr.find(x => String(x.email||'').toLowerCase() === emailKey);
            if (hit) {
              setCandidate(prev => ({
                ...(prev||{}),
                full_name: hit.name || prev?.full_name || prev?.name,
                name: hit.name || prev?.name,
                email: hit.email || prev?.email,
                skills: hit.skills || prev?.skills,
                experience: hit.experience || prev?.experience,
                cv_url: hit.cv || prev?.cv_url,
                certificates: hit.certificates || prev?.certificates,
                profile_pic: hit.profile_pic || prev?.profile_pic,
              }));
            }
          }
        } catch {}
      } catch (e) {
        if (!alive) return;
        // Don't block the page; show inline error and leave list empty
        setApplications([]);
        setError(e?.message || "Failed to load applications");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [API_BASE, userRole, modeFromQuery, hrName, hrFromQuery, currentUser]);

  // Re-hydrate summary candidate details whenever applications/appRec/candidate update
  useEffect(() => {
    try {
      if (!(userRole === 'hr' || modeFromQuery === 'review')) return;
      const arr = Array.isArray(applications) ? applications : [];
      const emailKey = String(appRec?.candidate_email || candidate?.email || '').toLowerCase();
      if (!emailKey || !arr.length) return;
      const hit = arr.find(x => String(x.email||'').toLowerCase() === emailKey);
      if (!hit) return;
      setCandidate(prev => ({
        ...(prev||{}),
        full_name: hit.name || prev?.full_name || prev?.name,
        name: hit.name || prev?.name,
        email: hit.email || prev?.email,
        skills: hit.skills || prev?.skills,
        experience: hit.experience || prev?.experience,
        cv_url: hit.cv || prev?.cv_url,
        certificates: hit.certificates || prev?.certificates,
        profile_pic: hit.profile_pic || prev?.profile_pic,
      }));
    } catch {}
  }, [applications, appRec, candidate, userRole, modeFromQuery]);

  const handleApply = async () => {
    try {
      setSubmitting(true);
      setSuccessMsg("");
      setError("");
      const payload = {
        candidate_id: candidateId,
        job_id: jobId,
        hr_name: hrName || job?.hr_name || "",
        hr_id: hrIdFromQuery || job?.hr_id || job?.user_id || job?.owner_id || job?.hr?._id || job?.hr?.id || "",
      };
      await http.post(`${API_BASE}/candidate/apply`, payload);
      setSuccessMsg(`Your application has been submitted to ${hrName || "HR"}.`);
    } catch (e) {
      setError(e?.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  // Basic render helpers
  const field = (label, value, icon) => (
    <div style={{ display: "flex", gap: 8, color: "#374151" }}>
      {icon ? <span className="material-icons-outlined" style={{ fontSize: 18 }}>{icon}</span> : null}
      <span><strong>{label}:</strong> {value || "Not provided"}</span>
    </div>
  );

  // Helper: best-effort job title
  const jobTitle = (j) => (j?.job_title || j?.title || "");

  return (
    <div className="dashboard-layout">
      {/* HR-style Sidebar */}
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
                              <button style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, background: '#e5e7eb', color: '#111827' }} onClick={() => setModal({ open: true, item: a })}>View Profile</button>
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
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }} onClick={() => setModal({ open: false, item: null })}>
              <div style={{ width: 'min(700px, 92vw)', background: '#fff', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', padding: 20 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>Candidate Profile</div>
                  <button style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, background: '#f3f4f6', color: '#111827' }} onClick={() => setModal({ open: false, item: null })}>Close</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>{modal.item.name || modal.item.candidate_name || '-'}</div>
                    <div style={{ color: '#6b7280', marginBottom: 10 }}>{modal.item.field || '-'}</div>
                    <div style={{ marginBottom: 6 }}><span style={{ padding: '4px 10px', borderRadius: 9999, fontWeight: 600, fontSize: 12, background: '#eef2ff', color: '#3730a3' }}>Experience:</span> <span>{modal.item.experience || '-'}</span></div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, marginBottom: 6 }}>Skills</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(Array.isArray(modal.item.skills) ? modal.item.skills : String(modal.item.skills || '').split(',').map(s => s.trim()).filter(Boolean)).map((s, i) => (
                          <span key={i} style={{ padding: '4px 10px', borderRadius: 9999, fontWeight: 600, fontSize: 12, background: '#eff6ff', color: '#1d4ed8' }}>{s}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                      {modal.item.cv || modal.item.cv_url ? (
                        <a href={(modal.item.cv_url || modal.item.cv).startsWith('http') ? (modal.item.cv_url || modal.item.cv) : `${API_BASE}${modal.item.cv_url || modal.item.cv}`} target="_blank" rel="noreferrer" style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, background: '#e0f2fe', color: '#075985', textDecoration: 'none', display: 'inline-block' }}>View CV</a>
                      ) : null}
                      {Array.isArray(modal.item.certificates || modal.item.certificates_url) && (modal.item.certificates || modal.item.certificates_url).length > 0 ? (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {(modal.item.certificates || modal.item.certificates_url).map((c, i) => (
                            <a key={i} href={(typeof c === 'string' ? c : c?.url || '').startsWith('http') ? (typeof c === 'string' ? c : c?.url) : `${API_BASE}${typeof c === 'string' ? c : (c?.url || '')}`} target="_blank" rel="noreferrer" style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, background: '#ecfeff', color: '#155e75', textDecoration: 'none' }}>Cert {i+1}</a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default CandidatesApply;