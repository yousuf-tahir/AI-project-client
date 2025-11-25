import React, { useEffect, useMemo, useState } from 'react';
import 'material-icons/iconfont/material-icons.css';
import '../styles/candidate.css';
import '../styles/adminSetting.css';

const AdminSetting = ({ onNavigate }) => {
  const go = (path) => {
    if (typeof onNavigate === 'function') onNavigate(path);
    else { window.history.pushState({}, '', path); window.dispatchEvent(new PopStateEvent('popstate')); }
  };

  // Active nav helper
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isActive = (p) => currentPath === p;

  // Personal info
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '', avatar: null, avatarPreview: '' });
  // Prefill from stored user
  useEffect(() => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (raw) {
        const u = JSON.parse(raw);
        setProfile((prev) => ({
          ...prev,
          fullName: prev.fullName || u.name || u.fullName || '',
          email: prev.email || u.email || '',
        }));
      }
    } catch {}
  }, []);
  // Validators
  const isValidName = useMemo(() => {
    const n = (profile.fullName || '').trim();
    if (!n) return false;
    // Only letters and spaces, at least 2 characters
    return /^[A-Za-z ]{2,}$/.test(n);
  }, [profile.fullName]);
  const isValidEmail = useMemo(() => {
    if (!profile.email) return false;
    // Require TLD with letters only, allow optional second-level TLD (e.g., .co.uk)
    const re = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})?$/;
    return re.test(profile.email.trim());
  }, [profile.email]);
  const isValidPhone = useMemo(() => {
    if (!profile.phone) return false;
    // Must be +92 followed by exactly 10 digits
    return /^\+92\d{10}$/.test(profile.phone.trim());
  }, [profile.phone]);
  const handleFile = (file) => {
    if (!file) return setProfile((p) => ({ ...p, avatar: null, avatarPreview: '' }));
    const reader = new FileReader();
    reader.onload = (e) => setProfile((p) => ({ ...p, avatar: file, avatarPreview: e.target.result }));
    reader.readAsDataURL(file);
  };

  // Password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const pwValid = useMemo(() => {
    const n = pw.next || '';
    // At least 8 chars, one lowercase, one uppercase, one digit, one special char
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(n);
  }, [pw.next]);
  const canUpdatePassword = pw.current && pw.next && pw.confirm && pw.next === pw.confirm && pwValid;

  // Other toggles
  const [prefs, setPrefs] = useState({ email: true, dark: false, twofa: false });

  return (
    <div className="candidate-dashboard-layout admin-container">
      {/* Sidebar - reuse design from AdminDashboard */}
      <aside className="candidate-sidebar">
        <div className="sidebar-header"><span className="app-logo-candidate">Admin</span> Panel</div>
        <nav className="sidebar-nav">
          <ul>
            <li className={`nav-item ${isActive('/admin') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/admin'); }}>
                <span className="material-icons-outlined">dashboard</span>
                <span className="nav-label">Dashboard</span>
              </a>
            </li>
            <li className={`nav-item ${isActive('/hr-approvals') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/hr-approvals'); }}>
                <span className="material-icons-outlined">verified_user</span>
                <span className="nav-label">HR Approvals</span>
              </a>
            </li>
            <li className={`nav-item ${isActive('/candidates') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/candidates'); }}>
                <span className="material-icons-outlined">people_alt</span>
                <span className="nav-label">Candidates Approvals</span>
              </a>
            </li>
            <li className={`nav-item ${isActive('/interview-questions') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/interview-questions'); }}>
                <span className="material-icons-outlined">quiz</span>
                <span className="nav-label">Interview Questions</span>
              </a>
            </li>
            <li className={`nav-item ${isActive('/system-logs') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/system-logs'); }}>
                <span className="material-icons-outlined">list_alt</span>
                <span className="nav-label">System Logs</span>
              </a>
            </li>
            <li className={`nav-item ${isActive('/feedback') ? 'active' : ''}`}>
              <a href="#" onClick={(e) => { e.preventDefault(); go('/feedback'); }}>
                <span className="material-icons-outlined">feedback</span>
                <span className="nav-label">View Feedback</span>
              </a>
            </li>
          </ul>
        </nav>
        <div className="sidebar-footer">
          <ul>
            <li className="nav-item"><a href="#" onClick={(e) => { e.preventDefault(); go('/settings'); }}><span className="material-icons-outlined">settings</span><span className="nav-label">Settings</span></a></li>
            <li className="nav-item"><a href="#" id="logout-link" className="logout-link" onClick={(e) => { e.preventDefault(); const ok = window.confirm('Are you sure you want to logout?'); if (!ok) return; try { localStorage.removeItem('user'); localStorage.removeItem('token'); sessionStorage.removeItem('user'); sessionStorage.removeItem('token'); } catch(_){} window.location.replace('/'); }}><span className="material-icons-outlined">logout</span><span className="nav-label">Logout</span></a></li>
          </ul>
        </div>
      </aside>

      {/* Main content - Tailwind */}
      <div className="candidate-main-content">
        <main className="settings-main">
          {/* Header */}
          <header className="settings-header">
            <div className="header-title"><h1 className="settings-title">Admin Settings</h1></div>
            <div className="settings-user"><span className="user-name">Admin</span><div className="avatar"><i className="fas fa-user"></i></div></div>
          </header>

          {/* Personal Information */}
          <section className="settings-card">
            <h2>Personal Information</h2>
            <div className="settings-grid two">
              <div>
                <label className="label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="John Doe"
                  className={`input ${profile.fullName && !isValidName ? 'input-error' : ''}`}
                  value={profile.fullName}
                  onChange={(e)=>setProfile({...profile, fullName:e.target.value})}
                />
                {!isValidName && profile.fullName && (<div className="hint hint-error">Use letters and spaces only.</div>)}
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  className={`input ${profile.email && !isValidEmail ? 'input-error' : ''}`}
                  value={profile.email}
                  onChange={(e)=>setProfile({...profile, email:e.target.value})}
                />
                {!isValidEmail && profile.email && (<div className="hint hint-error">Enter a valid email address.</div>)}
              </div>
              <div>
                <label className="label">Phone Number</label>
                <input
                  type="tel"
                  name="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  pattern="\+92\d{10}"
                  placeholder="+92XXXXXXXXXX"
                  className={`input ${profile.phone && !isValidPhone ? 'input-error' : ''}`}
                  value={profile.phone}
                  onChange={(e)=>setProfile({...profile, phone:e.target.value})}
                />
                {!isValidPhone && profile.phone && (<div className="hint hint-error">Format must be +92 followed by exactly 10 digits.</div>)}
              </div>
              <div>
                <label className="label">Profile Picture</label>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div className="avatar-preview">
                    {profile.avatarPreview ? <img src={profile.avatarPreview} alt="avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : null}
                  </div>
                  <label className="btn-upload">
                    <span className="material-icons-outlined" style={{ fontSize:14, marginRight:6 }}>upload</span>
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={(e)=>handleFile(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            </div>
            <div style={{ marginTop:16 }}>
              <button disabled={!(isValidName && isValidEmail && isValidPhone)} className={`btn ${(isValidName && isValidEmail && isValidPhone) ? 'btn-primary' : 'btn-disabled'}`}><span className="material-icons-outlined" style={{ fontSize:14 }}>save</span> Save Changes</button>
            </div>
          </section>

          {/* Password Settings */}
          <section className="settings-card">
            <h2>Password Settings</h2>
            <div className="settings-grid three">
              <div>
                <label className="label">Current Password</label>
                <div className="relative">
                  <input type={show.current ? 'text':'password'} className="input" value={pw.current} onChange={(e)=>setPw({...pw, current:e.target.value})} />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" onClick={()=>setShow(s=>({...s,current:!s.current}))}><span className="material-icons-outlined text-base">{show.current? 'visibility_off':'visibility'}</span></button>
                </div>
              </div>
              <div>
                <label className="label">New Password</label>
                <div className="relative">
                  <input type={show.next ? 'text':'password'} className={`input ${pw.next && !pwValid ? 'input-error' : ''}`} value={pw.next} onChange={(e)=>setPw({...pw, next:e.target.value})} />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" onClick={()=>setShow(s=>({...s,next:!s.next}))}><span className="material-icons-outlined text-base">{show.next? 'visibility_off':'visibility'}</span></button>
                </div>
                <p className="hint">Minimum 8 characters, with at least one uppercase, one lowercase, one digit, and one special character.</p>
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <div className="relative">
                  <input type={show.confirm ? 'text':'password'} className={`input ${pw.confirm && pw.next !== pw.confirm ? 'input-error' : ''}`} value={pw.confirm} onChange={(e)=>setPw({...pw, confirm:e.target.value})} />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500" onClick={()=>setShow(s=>({...s,confirm:!s.confirm}))}><span className="material-icons-outlined text-base">{show.confirm? 'visibility_off':'visibility'}</span></button>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <button disabled={!canUpdatePassword} className={`btn ${canUpdatePassword? 'btn-primary':'btn-disabled'}`}>
                <span className="material-icons-outlined" style={{ fontSize:14 }}>lock_reset</span> Update Password
              </button>
            </div>
          </section>

          {/* Other Settings */}
          <section className="settings-card">
            <h2>Other Settings</h2>
            <div className="settings-grid two">
              <label className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                <div>
                  <div className="font-medium" style={{ color:'#0f172a' }}>Email Notifications</div>
                  <div className="hint">Receive important updates by email.</div>
                </div>
                <input type="checkbox" className="toggle-switch" checked={prefs.email} onChange={(e)=>setPrefs({...prefs, email:e.target.checked})} />
              </label>
              <label className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                <div>
                  <div className="font-medium" style={{ color:'#0f172a' }}>Dark Mode</div>
                  <div className="hint">Reduce eye strain with darker theme.</div>
                </div>
                <input type="checkbox" className="toggle-switch" checked={prefs.dark} onChange={(e)=>setPrefs({...prefs, dark:e.target.checked})} />
              </label>
              <label className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                <div>
                  <div className="font-medium" style={{ color:'#0f172a' }}>Two-Factor Authentication</div>
                  <div className="hint">Extra security on login.</div>
                </div>
                <input type="checkbox" className="toggle-switch" checked={prefs.twofa} onChange={(e)=>setPrefs({...prefs, twofa:e.target.checked})} />
              </label>
            </div>
          </section>

          {/* Danger Zone (optional) */}
          <section className="settings-card">
            <h2 className="danger-title">Danger Zone</h2>
            <button className="btn btn-danger"><span className="material-icons-outlined" style={{ fontSize:14 }}>delete_forever</span> Delete Account</button>
          </section>
        </main>
      </div>
    </div>
  );
};

export default AdminSetting;
