import React, { useEffect, useState } from "react";
import "../styles/profile.css"
import "../styles/candidate.css";

const Profile = ({ onNavigate }) => {
  const [profilePreview, setProfilePreview] = useState(null);
  const [resumeName, setResumeName] = useState('');
  const [certificates, setCertificates] = useState([]);
  const [certError, setCertError] = useState('');
  const [expYears, setExpYears] = useState(0);
  const [expMonths, setExpMonths] = useState(0);
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [email, setEmail] = useState('chloe@example.com');
  const [emailError, setEmailError] = useState('');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [fullName, setFullName] = useState('Chloe Smith');
  const [fullNameError, setFullNameError] = useState('');
  const [location, setLocation] = useState('');
  const [locationError, setLocationError] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [saving, setSaving] = useState(false);
  const [headline, setHeadline] = useState('');
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
  const PROFILE_ENDPOINT_BASE = (import.meta.env.VITE_PROFILE_ENDPOINT || `${API_BASE}/api/profile`).replace(/\/$/, '');

  const authedGet = async (url) => {
    const token = (() => { try { return localStorage.getItem('token') || sessionStorage.getItem('token'); } catch(_) { return null; } })();
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!res.ok) return null;
    try { return await res.json(); } catch { return null; }
  };

  const authedPost = async (url, body) => {
    const token = (() => { try { return localStorage.getItem('token') || sessionStorage.getItem('token'); } catch(_) { return null; } })();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body || {})
    });
    const text = await res.text();
    let data = null; try { data = JSON.parse(text); } catch { /* keep text */ }
    return { ok: res.ok, status: res.status, data, text };
  };

  const resolveIdentity = () => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      let userObj = null;
      try { userObj = raw ? JSON.parse(raw) : null; } catch { userObj = null; }
      const emailStored = localStorage.getItem('email') || sessionStorage.getItem('email') || null;
      const idStored = localStorage.getItem('user_id') || sessionStorage.getItem('user_id') || null;
      return {
        email: emailStored || (userObj && (userObj.email || userObj.user?.email)) || null,
        userId: idStored || (userObj && (userObj._id || userObj.id || userObj.user_id)) || null,
      };
    } catch (_) {
      return { email: null, userId: null };
    }
  };

  const skillOptions = [
    'JavaScript', 'TypeScript', 'React', 'Redux', 'Next.js', 'Node.js', 'Express', 'NestJS',
    'HTML', 'CSS', 'Sass', 'Tailwind', 'Bootstrap', 'Material UI',
    'Python', 'Django', 'Flask', 'FastAPI',
    'Java', 'Spring',
    'C#', '.NET',
    'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'
  ];

  const handleProfileImageChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const tempUrl = URL.createObjectURL(file);
    setProfilePreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return tempUrl;
    });

    try {
      const { userId } = resolveIdentity();
      if (!userId) throw new Error('Missing user id');
      const token = (() => { try { return localStorage.getItem('token') || sessionStorage.getItem('token'); } catch(_) { return null; } })();
      const form = new FormData();
      form.append('user_id', userId);
      form.append('file', file);
      const res = await fetch(`${API_BASE}/auth/upload-avatar`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.detail || 'Failed to upload avatar');
      }
      const data = await res.json();
      const avatarRel = data.avatar_url || null;
      const url = avatarRel ? `${API_BASE}${avatarRel}` : null;
      if (url) {
        setProfilePreview((prev) => {
          if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
          return url;
        });
        try { await authedPost(`${PROFILE_ENDPOINT_BASE}`, { user_id: userId, avatar_url: avatarRel }); } catch (_) {}
        setMessage({ text: 'Profile picture uploaded', type: 'success' });
      }
    } catch (err) {
      setMessage({ text: err.message || 'Failed to upload picture', type: 'error' });
    }
  };

  const go = (path) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.location.href = path;
    }
  };

  const handleFullNameChange = (e) => {
    const v = e.target.value;
    setFullName(v);
    const valid = /^[A-Za-z ]+$/.test(v.trim());
    setFullNameError(v && !valid ? 'Full name can only contain letters and spaces' : '');
  };

  const handleLocationChange = (e) => {
    const v = e.target.value;
    setLocation(v);
    setLocationError('');
  };

  const addSkill = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (skills.find((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
    setSkills((prev) => [...prev, trimmed]);
    setSkillInput('');
  };

  const removeSkill = (idx) => {
    setSkills((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSkillKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillInput);
    }
  };

  const validateEmail = (value) => {
    const re = /^[^\s@]+@([^\s@.]+\.)+[A-Za-z]{2,}$/;
    return re.test(value.trim());
  };

  const handleEmailChange = (e) => {
    const v = e.target.value;
    setEmail(v);
    setEmailError(v && !validateEmail(v) ? 'Please enter a valid email address' : '');
  };

  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '');
    const local = digits.startsWith('92') ? digits.slice(2) : digits;
    const limited = local.slice(0, 10);
    setPhoneLocal(limited);
    setPhoneError(limited.length === 10 ? '' : 'Phone must be +92 followed by exactly 10 digits');
  };

  const handleResumeChange = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const { userId } = resolveIdentity();
      if (!userId) throw new Error('Missing user id');
      const token = (() => { try { return localStorage.getItem('token') || sessionStorage.getItem('token'); } catch(_) { return null; } })();
      const form = new FormData();
      form.append('file', file);
      const res = await fetch(`${API_BASE}/api/profile/${encodeURIComponent(userId)}/upload-resume`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form
      });
      if (!res.ok) {
        const err = await res.json().catch(()=>({}));
        throw new Error(err.detail || 'Failed to upload resume');
      }
      const data = await res.json();
      setResumeName(data.name || file.name);
      setMessage({ text: 'Resume uploaded', type: 'success' });
    } catch (err) {
      setMessage({ text: err.message || 'Failed to upload resume', type: 'error' });
    }
  };

  const handleCertificatesChange = async (e) => {
    setCertError('');
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const { userId } = resolveIdentity();
    if (!userId) { setCertError('Missing user id'); return; }
    const remainingSlots = Math.max(0, 5 - certificates.length);
    const toUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setCertError('You can upload up to 5 certificates. Extra files were ignored.');
    }
    const token = (() => { try { return localStorage.getItem('token') || sessionStorage.getItem('token'); } catch(_) { return null; } })();
    for (const f of toUpload) {
      try {
        const form = new FormData();
        form.append('file', f);
        form.append('name', f.name);
        const res = await fetch(`${API_BASE}/api/profile/${encodeURIComponent(userId)}/upload-certificate`, {
          method: 'POST',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: form,
        });
        if (!res.ok) {
          const err = await res.json().catch(()=>({}));
          throw new Error(err.detail || `Failed to upload ${f.name}`);
        }
        const data = await res.json();
        setCertificates((prev) => [...prev, { name: data.name || f.name, url: `${API_BASE}${data.url}` }]);
      } catch (err) {
        setCertError(err.message || 'Failed to upload certificates');
      }
    }
    e.target.value = '';
  };

  const removeCertificate = (idx) => {
    setCertificates((prev) => {
      const next = [...prev];
      const item = next[idx];
      if (item?.url) URL.revokeObjectURL(item.url);
      next.splice(idx, 1);
      return next;
    });
  };

  useEffect(() => {
    return () => {
      if (profilePreview) URL.revokeObjectURL(profilePreview);
    };
  }, [profilePreview]);

  useEffect(() => {
    (async () => {
      try {
        const { userId, email: storedEmail } = resolveIdentity();
        if (!userId && !storedEmail) return;
        let prof = null;
        if (userId) {
          prof = await authedGet(`${PROFILE_ENDPOINT_BASE}/${encodeURIComponent(userId)}`);
        }
        let me = null;
        if (!prof || Object.keys(prof).length === 0) {
          const qs = userId ? `user_id=${encodeURIComponent(userId)}` : (storedEmail ? `email=${encodeURIComponent(storedEmail)}` : '');
          me = await authedGet(`${API_BASE}/auth/me?${qs}`);
        }

        if (prof && Object.keys(prof).length) {
          if (prof.full_name) setFullName(String(prof.full_name));
          if (prof.email) setEmail(String(prof.email));
          // Load field/headline with proper fallback chain
          if (prof.field || prof.headline || prof.title || prof.position) {
            setHeadline(String(prof.field || prof.headline || prof.title || prof.position));
          }
          if (prof.phone && /^\+?\d{12}$/.test(prof.phone)) {
            const local = prof.phone.replace(/\D/g, '').replace(/^92/, '');
            setPhoneLocal(local.slice(0,10));
          }
          if (typeof prof.location === 'string') setLocation(prof.location);

          const years = prof.experience_years ?? prof.experienceYears ?? prof.years ?? prof.exp_years ?? 0;
          const months = prof.experience_months ?? prof.experienceMonths ?? prof.months ?? prof.exp_months ?? 0;
          if (Number.isFinite(Number(years))) setExpYears(Number(years));
          if (Number.isFinite(Number(months))) setExpMonths(Number(months));

          if (Array.isArray(prof.skills)) {
            setSkills(prof.skills.filter(Boolean).map(String));
          } else if (typeof prof.key_skills === 'string' && prof.key_skills.trim()) {
            setSkills(prof.key_skills.split(',').map(s => s.trim()).filter(Boolean));
          } else if (typeof prof.skills_csv === 'string' && prof.skills_csv.trim()) {
            setSkills(prof.skills_csv.split(',').map(s => s.trim()).filter(Boolean));
          }
          if (prof.resume_name) setResumeName(String(prof.resume_name));
          if (Array.isArray(prof.certificates)) {
            const toAbs = (u) => (typeof u === 'string' && u.startsWith('http')) ? u : (u ? `${API_BASE}${u}` : '');
            setCertificates(prof.certificates.map(c => ({ name: c.name, url: toAbs(c.url) })).slice(0,5));
          }
          if (prof.avatar_url) setProfilePreview(`${API_BASE}${prof.avatar_url}`);
          return;
        }

        if (me) {
          if (me.full_name) setFullName(String(me.full_name));
          if (me.email) setEmail(String(me.email));
          if (me.avatar_url) setProfilePreview(`${API_BASE}${me.avatar_url}`);
        }
      } catch (_) { /* ignore autofill failures */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildPayload = () => {
    const phone = `+92${phoneLocal}`;
    const skillsNormalized = skills.map((s) => String(s).trim()).filter(Boolean);
    return {
      full_name: fullName,
      headline: headline,  // ✅ Send headline
      field: headline,     // ✅ Also send as 'field' for consistency
      email,
      phone,
      location,
      experience_years: Number(expYears) || 0,
      experience_months: Number(expMonths) || 0,
      skills: skillsNormalized,
      resume_name: resumeName || null,
      certificates: certificates.map((c) => ({ name: c.name, url: c.url })).slice(0, 5),
    };
  };

  const saveProfile = async () => {
    if (fullNameError || emailError || phoneError) {
      setMessage({ text: 'Fix validation errors before saving', type: 'error' });
      return;
    }
    if (!fullName.trim()) { setMessage({ text: 'Full name is required', type: 'error' }); return; }
    if (!email.trim() || !validateEmail(email)) { setMessage({ text: 'Valid email is required', type: 'error' }); return; }
    if (phoneLocal.length !== 10) { setMessage({ text: 'Phone must be +92 followed by exactly 10 digits', type: 'error' }); return; }

    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const { userId, email: em } = resolveIdentity();
      if (!userId && !em) throw new Error('Missing user identity. Please log in again.');
      const payload = buildPayload();
      payload.user_id = userId || undefined;

      console.log('💾 Saving profile with payload:', payload); // Debug log

      const res = await authedPost(`${PROFILE_ENDPOINT_BASE}`, payload);
      if (!res.ok) {
        const msg = (res.data && (res.data.detail || res.data.message)) || res.text || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setMessage({ text: (res.data && res.data.message) || 'Profile saved successfully!', type: 'success' });
      
      // Refresh profile data after save
      try {
        const { userId } = resolveIdentity();
        if (userId) {
          const prof = await authedGet(`${PROFILE_ENDPOINT_BASE}/${encodeURIComponent(userId)}`);
          if (prof && Object.keys(prof).length) {
            console.log('📥 Reloaded profile after save:', prof); // Debug log
            
            // Reload all fields to confirm save
            if (prof.field || prof.headline) setHeadline(String(prof.field || prof.headline));
            if (Array.isArray(prof.skills)) setSkills(prof.skills.filter(Boolean));
            if (Number.isFinite(Number(prof.experience_years))) setExpYears(Number(prof.experience_years));
            if (Number.isFinite(Number(prof.experience_months))) setExpMonths(Number(prof.experience_months));
            if (Array.isArray(prof.certificates)) {
              const toAbs = (u) => (typeof u === 'string' && u.startsWith('http')) ? u : (u ? `${API_BASE}${u}` : '');
              setCertificates(prof.certificates.map(c => ({ name: c.name, url: toAbs(c.url) })).slice(0,5));
            }
          }
        }
      } catch (e) { 
        console.error('Failed to reload profile after save:', e);
      }
    } catch (e) {
      console.error('Save profile error:', e); // Debug log
      setMessage({ text: e.message || 'Failed to save profile', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="candidate-dashboard-layout">
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
                <li className="nav-item">
                  <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate-jobs'); }}>
                    <span className="material-icons-outlined">work</span>
                    <span className="nav-label">Jobs</span>
                  </a>
                </li>
                <li className="nav-item active">
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
                  <a href="#" id="logout-link" className="logout-link" onClick={(e) => { e.preventDefault(); const ok = window.confirm('Are you sure you want to logout?'); if (!ok) return; try { localStorage.removeItem('user'); localStorage.removeItem('token'); sessionStorage.removeItem('user'); sessionStorage.removeItem('token'); } catch(_){} window.location.replace('/'); }}>
                    <span className="material-icons-outlined">logout</span>
                    <span className="nav-label">Logout</span>
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </aside>
      </div>

      <div className="candidate-main-content">
        <main className="profile-main">
          {message.text && (
            <div className={`inline-status ${message.type === 'success' ? 'success' : 'error'}`} role="status" aria-live="polite" style={{ marginBottom: 12 }}>
              <div className="inline-status-left">
                <span className="material-icons-outlined inline-status-icon" aria-hidden>
                  {message.type === 'success' ? 'check_circle' : 'error_outline'}
                </span>
                <span>{message.text}</span>
              </div>
              <button type="button" className="inline-status-close" aria-label="Dismiss message" onClick={() => setMessage({ text: '', type: '' })}>
                <span className="material-icons-outlined" aria-hidden>close</span>
              </button>
            </div>
          )}
          <div className="profile-header">
            <div className="profile-image-container">
              <div className="profile-image-placeholder">
                {profilePreview ? (
                  <img src={profilePreview} alt="Profile preview" className="profile-image" />
                ) : (
                  <span className="material-icons-outlined">account_circle</span>
                )}
              </div>
              <label htmlFor="profile-image" className="upload-label">
                <span className="material-icons-outlined">cloud_upload</span>
                <span>Upload Profile Picture</span>
              </label>
              <input
                type="file"
                id="profile-image"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleProfileImageChange}
              />
            </div>
            <div className="profile-info">
              <h2>{fullName || '—'}</h2>
              <p className="profile-subtitle">{headline || 'Add your field in the form below'}</p>
            </div>
          </div>

          <div className="profile-sections">
            <div className="card profile-section">
              <h3>Personal Information</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={fullName}
                    onChange={handleFullNameChange}
                    placeholder="Enter your full name"
                  />
                  {fullNameError && <div className="form-error">{fullNameError}</div>}
                </div>
                <div className="form-group">
                  <label>Field</label>
                  <input
                    type="text"
                    className="form-control"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g., Software Engineer, Data Analyst"
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder="name@example.com"
                  />
                  {emailError && <div className="form-error">{emailError}</div>}
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    className="form-control"
                    value={`+92${phoneLocal}`}
                    onChange={handlePhoneChange}
                    placeholder="+921234567890"
                  />
                  <small className="form-hint">Format: +92 followed by exactly 10 digits</small>
                  {phoneError && <div className="form-error">{phoneError}</div>}
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input
                    type="text"
                    className="form-control"
                    value={location}
                    onChange={handleLocationChange}
                    placeholder="Area, City"
                  />
                  <small className="form-hint">Format: Area, City</small>
                </div>
              </div>
            </div>

            <div className="card profile-section">
              <h3>Skills & Experience</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Experience</label>
                  <div className="experience-row">
                    <div className="exp-field">
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        value={expYears}
                        onChange={(e) => setExpYears(Math.max(0, Number(e.target.value)))}
                      />
                      <span className="exp-unit">Years</span>
                    </div>
                    <div className="exp-field">
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        max="11"
                        value={expMonths}
                        onChange={(e) => {
                          const v = Math.max(0, Math.min(11, Number(e.target.value)));
                          setExpMonths(v);
                        }}
                      />
                      <span className="exp-unit">Months</span>
                    </div>
                  </div>
                  <div className="experience-display">
                    {`${expYears || 0} year${(expYears||0) === 1 ? '' : 's'} ${expMonths || 0} month${(expMonths||0) === 1 ? '' : 's'}`}
                  </div>
                </div>
                <div className="form-group">
                  <label>Key Skills</label>
                  <div className="skills-container">
                    <input
                      type="text"
                      className="form-control skill-input"
                      placeholder="Type and press Enter (or click a suggestion)"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={onSkillKeyDown}
                    />
                    {skillInput && (
                      <ul className="skill-suggestions">
                        {skillOptions
                          .filter((opt) =>
                            opt.toLowerCase().includes(skillInput.toLowerCase()) &&
                            !skills.some((s) => s.toLowerCase() === opt.toLowerCase())
                          )
                          .slice(0, 6)
                          .map((opt) => (
                            <li key={opt}>
                              <button type="button" onClick={() => addSkill(opt)}>{opt}</button>
                            </li>
                          ))}
                      </ul>
                    )}
                    <div className="skills-tags">
                      {skills.map((s, idx) => (
                        <span key={`${s}-${idx}`} className="skill-tag">
                          {s}
                          <button
                            type="button"
                            className="remove-skill-btn"
                            onClick={() => removeSkill(idx)}
                            title="Remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card profile-section">
              <h3>Resume</h3>
              <div className="form-grid">
                <div className="form-group">
                  <div className="file-upload-container">
                    <input
                      type="file"
                      id="resume-upload"
                      accept=".pdf,.doc,.docx"
                      style={{ display: "none" }}
                      onChange={handleResumeChange}
                    />
                    <label htmlFor="resume-upload" className="file-upload-label">
                      <span className="material-icons-outlined">upload_file</span>
                      <span>Upload Resume</span>
                    </label>
                    <p className="file-info">{resumeName ? `Selected file: ${resumeName}` : 'No file selected'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card profile-section certificates-section">
              <h3>Important Certificates</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Add up to 5 documents</label>
                  <div className="cert-upload-container">
                    <input
                      type="file"
                      id="certificates-upload"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      multiple
                      style={{ display: 'none' }}
                      onChange={handleCertificatesChange}
                    />
                    <label htmlFor="certificates-upload" className="file-upload-label">
                      <span className="material-icons-outlined">upload_file</span>
                      <span>Upload Certificates</span>
                    </label>
                    <div className="cert-meta">
                      <span className="file-info">{certificates.length}/5 uploaded</span>
                      {certError && <span className="cert-error">{certError}</span>}
                    </div>
                    {certificates.length > 0 && (
                      <ul className="cert-list">
                        {certificates.map((c, idx) => (
                          <li key={`${c.name}-${idx}`} className="cert-item">
                            <span className="material-icons-outlined cert-icon">description</span>
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="cert-name">{c.name}</a>
                            <button type="button" className="remove-cert-btn" onClick={() => removeCertificate(idx)}>
                              <span className="material-icons-outlined">close</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button className="button button-secondary">Cancel</button>
            <button className="button button-primary" onClick={saveProfile} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Profile;