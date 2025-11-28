import React, { useEffect, useState } from "react";
import "../styles/candidate.css";
import "../styles/settings.css";

const CandidateSetting = ({ onNavigate }) => {
  const go = (path) => {
    if (typeof onNavigate === 'function') {
      onNavigate(path);
    } else {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const [showDialog, setShowDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [actionType, setActionType] = useState(""); // "delete" or "deactivate"
  // Validation state
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [userName, setUserName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [showCurPwd, setShowCurPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfPwd, setShowConfPwd] = useState(false);
  const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8000';

  const resolveIdentity = () => {
    try {
      const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;
      return { userId: user?._id || user?.id || user?.user_id || null, email: user?.email || null };
    } catch { return { userId: null, email: null }; }
  };

  const authedGet = async (url) => {
    const token = (() => { try { return localStorage.getItem('token') || sessionStorage.getItem('token'); } catch(_) { return null; } })();
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
    if (!res.ok) return null;
    try { return await res.json(); } catch { return null; }
  };

  const postJson = async (url, body) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await res.text(); let data=null; try{ data=JSON.parse(text);}catch{}
    return { ok: res.ok, status: res.status, data, text };
  };

  const patchJson = async (url, body) => {
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const text = await res.text(); let data=null; try{ data=JSON.parse(text);}catch{}
    return { ok: res.ok, status: res.status, data, text };
  };

  // Hydrate user info
  useEffect(() => {
    (async () => {
      try {
        const { userId, email } = resolveIdentity();
        if (!userId && !email) return;
        const qs = userId ? `user_id=${encodeURIComponent(userId)}` : `email=${encodeURIComponent(email)}`;
        const me = await authedGet(`${API_BASE}/auth/me?${qs}`);
        if (me) {
          setUserName(me.full_name || "");
          setEmail(me.email || "");
          if (me.avatar_url) setAvatarUrl(`${API_BASE}${me.avatar_url}`);
        }
      } catch (_) {}
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDialog = (type) => {
    setActionType(type);
    setDialogMessage(
      type === "delete"
        ? "Are you sure you want to delete your account? This action cannot be undone."
        : "Are you sure you want to deactivate your account? You can reactivate it later."
    );
    setShowDialog(true);
  };

  const closeDialog = () => setShowDialog(false);

  const confirmAction = () => {
    alert(actionType === "delete" ? "Account deleted." : "Account deactivated.");
    setShowDialog(false);
  };

  // Validators
  const validateEmail = (value) => /^[^\s@]+@([^\s@.]+\.)+[A-Za-z]{2,}$/.test(value.trim());
  const validatePasswordStrength = (value) => {
    const lengthOk = value.length >= 8;
    const upper = /[A-Z]/.test(value);
    const lower = /[a-z]/.test(value);
    const digit = /[0-9]/.test(value);
    const special = /[^A-Za-z0-9]/.test(value);
    return lengthOk && upper && lower && digit && special;
  };

  const changePassword = async () => {
    let err = "";
    if (!currentPassword) {
      err = "Enter your current password";
    } else if (!validatePasswordStrength(newPassword)) {
      err = "New password must be at least 8 chars and include upper, lower, number and special";
    } else if (newPassword !== confirmPassword) {
      err = "Confirm password does not match";
    }
    setPasswordError(err);
    if (err) return;
    try {
      const { userId, email } = resolveIdentity();
      const body = { user_id: userId, email, current_password: currentPassword, new_password: newPassword };
      const res = await postJson(`${API_BASE}/auth/change-password`, body);
      if (!res.ok) {
        const msg = (res.data && (res.data.detail || res.data.message)) || res.text || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setStatusMsg('Password changed');
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (e) {
      setStatusMsg(e.message || 'Failed to change password');
    }
  };

  const saveSettings = async () => {
    const ok = validateEmail(email);
    setEmailError(ok ? "" : "Please enter a valid email address");
    if (!ok) return;
    try {
      const { userId, email: curEmail } = resolveIdentity();
      const body = { user_id: userId, email: curEmail, new_email: email };
      const res = await patchJson(`${API_BASE}/auth/me`, body);
      if (!res.ok) {
        const msg = (res.data && (res.data.detail || res.data.message)) || res.text || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      setStatusMsg('Settings saved');
    } catch (e) {
      setStatusMsg(e.message || 'Failed to save settings');
    }
  };

  return (
    <div className="candidate-dashboard-layout">
      {/* Sidebar (same as CandidateDashboard) */}
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
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/practice-interview'); }}>
                <span className="material-icons-outlined">videocam</span>
                <span className="nav-label">Practice Interview</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); go('/candidate-feedback'); }}>
                <span className="material-icons-outlined">feedback</span>
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
            <li className="nav-item active">
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
      </aside>

      {/* Main Content (same as Settings.jsx) */}
      <div className="candidate-main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            
            <h2 className="page-title">Settings</h2>
          </div>
          <div className="top-bar-right">
            
          </div>
        </header>

        <main className="settings-main">
          <nav className="mobile-settings-nav">
            <a href="#account-settings" className="mobile-settings-nav-item active">
              <span className="material-icons-outlined">person</span>
              <span className="material-icons-outlined">notifications</span>
            </a>
          </nav>

          <section id="account-settings" className="card settings-section">
            <h3>Account Settings</h3>

            <div className="user-profile">
              <img src={avatarUrl || 'placeholder-avatar.png'} alt="User Avatar" className="user-avatar" />
              <span className="user-name">{userName || '—'}</span>
              <span className="material-icons-outlined dropdown-icon">expand_more</span>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-group">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEmail(value);
                    setEmailError(value ? (validateEmail(value) ? "" : "Please enter a valid email address") : "");
                  }}
                />
                <button className="edit-button" type="button" onClick={saveSettings} title="Save email" disabled={!validateEmail(email)}>
                  <span className="material-icons-outlined">edit</span>
                </button>
              </div>
              {emailError && <div className="form-error">{emailError}</div>}
            </div>

            <div className="settings-group">
              <h4>Change Password</h4>
              <div className="form-group">
                <label htmlFor="current-password">Current Password</label>
                <div className="input-group">
                  <input
                    type={showCurPwd ? 'text' : 'password'}
                    id="current-password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <button type="button" className="edit-button" onClick={() => setShowCurPwd(s => !s)} title={showCurPwd ? 'Hide' : 'Show'}>
                    <span className="material-icons-outlined">{showCurPwd ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <div className="input-group">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    id="new-password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <button type="button" className="edit-button" onClick={() => setShowNewPwd(s => !s)} title={showNewPwd ? 'Hide' : 'Show'}>
                    <span className="material-icons-outlined">{showNewPwd ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
                <small className="form-hint">Min 8 chars, include upper, lower, number and special</small>
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <div className="input-group">
                  <input
                    type={showConfPwd ? 'text' : 'password'}
                    id="confirm-password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button type="button" className="edit-button" onClick={() => setShowConfPwd(s => !s)} title={showConfPwd ? 'Hide' : 'Show'}>
                    <span className="material-icons-outlined">{showConfPwd ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>
              {passwordError && <div className="form-error">{passwordError}</div>}
              <button className="button button-primary" type="button" onClick={changePassword}>Change Password</button>
            </div>
          </section>

          <section id="notifications-settings" className="card settings-section">
            <h3>Notification Preferences</h3>
            <div className="settings-group">
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  Interview Reminders
                </label>
                <p className="description">Receive notifications for upcoming interviews</p>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked />
                  Feedback Notifications
                </label>
                <p className="description">Get notified when new feedback is available</p>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  Practice Interview Updates
                </label>
                <p className="description">Receive notifications about practice interview scores</p>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  System Updates
                </label>
                <p className="description">Get notified about system updates and maintenance</p>
              </div>
            </div>
          </section>

          <section id="privacy-settings" className="card settings-section">
            <h3>Privacy Settings</h3>
            <div className="settings-group">
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  Make Profile Public
                </label>
                <p className="description">Allow other users to view your profile</p>
              </div>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" />
                  Share Practice Data
                </label>
                <p className="description">Contribute your practice interview data to improve the system</p>
              </div>
            </div>

            <div className="settings-group">
              <h4>Account Management</h4>
              <button className="button button-danger" type="button" onClick={() => openDialog('delete')}>Delete Account</button>
              <button className="button button-secondary" type="button" onClick={() => openDialog('deactivate')}>Deactivate Account</button>
            </div>
          </section>

          <div className="save-changes">
            <button className="button button-primary" type="button" onClick={saveSettings}>Save Changes</button>
            {statusMsg && <span className="form-hint" style={{ marginLeft: 12 }}>{statusMsg}</span>}
          </div>
        </main>
      </div>

      {showDialog && (
        <div className="dialog">
          <div className="dialog-content">
            <h3>Confirm Action</h3>
            <p>{dialogMessage}</p>
            <div className="dialog-buttons">
              <button className="button button-secondary" type="button" onClick={closeDialog}>Cancel</button>
              <button className="button button-danger" type="button" onClick={confirmAction}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidateSetting;
