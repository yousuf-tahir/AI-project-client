import React, { useEffect, useRef, useState } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";
import "../styles/candidate.css";

// HR Profile page
// Sidebar matches HR pages like Settings/JobDisplay (className: sidebar)
// Persists core fields via PATCH /auth/me. Avatar via POST /auth/upload-avatar

const HRprofile = ({ onNavigate }) => {
  const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8000';

  // SPA navigation helper
  const go = (path) => {
    if (typeof onNavigate === 'function') onNavigate(path);
    else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  // State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [status, setStatus] = useState("");
  const saveTimerRef = useRef(null);

  // Validation state
  const [emailError, setEmailError] = useState("");
  const [orgError, setOrgError] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const validateEmail = (value) => /^[^\s@]+@([^\s@.]+\.)+[A-Za-z]{2,}$/.test(String(value).trim());
  const validateOrg = (v) => !v || /^[A-Za-z ]+$/.test(String(v).trim());
  const validatePhone = (v) => !v || /^[0-9+\-() ]{7,}$/.test(String(v));

  // Identity
  const resolveIdentity = () => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      const u = raw ? JSON.parse(raw) : null;
      return { userId: u?._id || u?.id || u?.user_id || null, email: u?.email || null };
    } catch { return { userId: null, email: null }; }
  };

  // Hydrate from /auth/me
  useEffect(() => {
    (async () => {
      try {
        const { userId, email } = resolveIdentity();
        const qs = userId ? `user_id=${encodeURIComponent(userId)}` : (email ? `email=${encodeURIComponent(email)}` : '');
        if (!qs) return;
        const res = await fetch(`${API_BASE}/auth/me?${qs}`);
        if (!res.ok) return;
        const me = await res.json();
        setFullName(me.full_name || "");
        setEmail(me.email || "");
        setOrgName(me.organization_name || "");
        setPhone(me.phone || "");
        setLocation(me.location || "");
        if (me.avatar_url) setAvatarUrl(me.avatar_url.startsWith('http') ? me.avatar_url : `${API_BASE}${me.avatar_url}`);
      } catch {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onUploadAvatar = async (file) => {
    if (!file) return;
    try {
      const { userId } = resolveIdentity();
      if (!userId) throw new Error('Missing user');
      const form = new FormData();
      form.append('user_id', userId);
      form.append('file', file);
      const res = await fetch(`${API_BASE}/auth/upload-avatar`, { method: 'POST', body: form });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out?.detail || 'Upload failed');
      const rel = out?.avatar_url || '';
      setAvatarUrl(rel.startsWith('http') ? rel : `${API_BASE}${rel}`);
      setStatus('Profile picture updated');
    } catch (e) {
      setStatus(e.message || 'Failed to upload');
    }
  };

  // Debounced auto-save helper
  const scheduleAutoSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      // silent save, without blocking on validation errors other than email format
      void saveProfile(true);
    }, 700);
  };

  const saveProfile = async (silent = false) => {
    if (!silent) setStatus('');
    // basic validations
    if (!fullName.trim()) { if (!silent) setStatus('Full name is required'); return; }
    if (!validateEmail(email)) { setEmailError('Invalid email'); if (!silent) setStatus('Invalid email'); return; }
    if (!validateOrg(orgName)) { setOrgError('Only letters and spaces allowed'); if (!silent) setStatus('Invalid organization'); return; }
    if (!validatePhone(phone)) { setPhoneError('Invalid phone'); if (!silent) setStatus('Invalid phone'); return; }
    try {
      const { userId, email: curEmail } = resolveIdentity();
      const body = {
        full_name: fullName,
        location: location || undefined,
        organization_name: orgName || undefined,
        phone: phone || undefined,
      };
      if (userId) body.user_id = userId; else if (curEmail) body.email = curEmail;
      if (email && curEmail && email.toLowerCase() !== curEmail.toLowerCase()) body.new_email = email;
      const res = await fetch(`${API_BASE}/auth/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const out = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(out?.detail || 'Failed to save');
      if (!silent) setStatus('Profile saved');
    } catch (e) {
      if (!silent) setStatus(e.message || 'Failed to save');
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar (HR) */}
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
              <a href="#" onClick={(e) => go("/candidates-apply", e)}>
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
             <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/hr-analysis-list'); }}>
                <span className="material-icons-outlined">analytics</span>
                <span className="nav-label">Interview Analysis</span>
              </a>
            </li>
            <li className="nav-item">
            <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/schedule-interview'); }}>
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
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/settings'); }}>
                <span className="material-icons-outlined">settings</span>
                <span className="nav-label">Settings</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" id="logout-link" className="logout-link" onClick={(e) => { e.preventDefault(); const ok = window.confirm('Are you sure you want to logout?'); if (!ok) return; try { localStorage.removeItem('user'); localStorage.removeItem('token'); localStorage.removeItem('email'); localStorage.removeItem('user_id'); localStorage.removeItem('full_name'); sessionStorage.removeItem('user'); sessionStorage.removeItem('token'); sessionStorage.removeItem('email'); sessionStorage.removeItem('user_id'); sessionStorage.removeItem('full_name'); } catch(_){} window.location.replace('/'); }}>
                <span className="material-icons-outlined">logout</span>
                <span className="nav-label">Logout</span>
              </a>
            </li>
          </ul>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h2 className="page-title">HR Profile</h2>
          </div>
          <div className="top-bar-right"></div>
        </header>

        <main className="dashboard-content">
          {status && (
            <div className="toast success" role="status" aria-live="polite" style={{ marginBottom: 12 }}>
              <span className="material-icons-outlined toast-icon">check_circle</span>
              <span>{status}</span>
            </div>
          )}

          <div className="card" style={{ maxWidth: 920 }}>
            <div className="user-profile" style={{ gap: 16 }}>
              <input id="hrprof-avatar-input" type="file" accept="image/*" style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; onUploadAvatar(f); e.target.value=''; }} />
              <img src={avatarUrl || 'placeholder-avatar.png'} alt="Avatar" className="user-avatar" onClick={() => document.getElementById('hrprof-avatar-input')?.click()} title="Click to upload/change avatar" style={{ cursor: 'pointer' }} />
              <input type="text" className="user-name" value={fullName} onChange={(e)=>setFullName(e.target.value)} placeholder="Full name" style={{ border: 'none', outline: 'none', fontWeight: 600 }} />
            </div>

            <div className="form-grid" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" className="form-control" value={email} onChange={(e)=>{ setEmail(e.target.value); setEmailError(e.target.value && !validateEmail(e.target.value) ? 'Invalid email' : ''); scheduleAutoSave(); }} placeholder="name@example.com" />
                {emailError && <div className="form-error">{emailError}</div>}
              </div>
              <div className="form-group">
                <label>Organization Name</label>
                <input type="text" className="form-control" value={orgName} onChange={(e)=>{ setOrgName(e.target.value); setOrgError(!validateOrg(e.target.value) ? 'Only letters and spaces allowed' : ''); scheduleAutoSave(); }} placeholder="e.g., Acme Corporation" />
                {orgError && <div className="form-error">{orgError}</div>}
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" className="form-control" value={phone} onChange={(e)=>{ setPhone(e.target.value); setPhoneError(!validatePhone(e.target.value) ? 'Invalid phone' : ''); scheduleAutoSave(); }} placeholder="e.g., +1 555 0100" />
                {phoneError && <div className="form-error">{phoneError}</div>}
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" className="form-control" value={location} onChange={(e)=>{ setLocation(e.target.value); scheduleAutoSave(); }} placeholder="City, Country" />
              </div>
            </div>

            <div className="action-buttons">
              <button className="button" type="button" onClick={() => window.history.back()}>Cancel</button>
              <button className="button button-primary" type="button" onClick={saveProfile}>Save Changes</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HRprofile;
