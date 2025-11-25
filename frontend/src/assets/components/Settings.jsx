import React, { useEffect, useState } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";
import "../styles/settings.css"

function Settings({ onNavigate }) {
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [actionType, setActionType] = useState(""); // "delete" or "deactivate"
  // Validation state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  // Identify current user from storage
  const resolveIdentity = () => {
    const raw = (typeof localStorage !== 'undefined' && localStorage.getItem('user')) ||
                (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('user'));
    let userObj = null;
    try { userObj = raw ? JSON.parse(raw) : null; } catch { userObj = null; }
    const storedEmail = (typeof localStorage !== 'undefined' && localStorage.getItem('email')) || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('email')) || null;
    const storedId = (typeof localStorage !== 'undefined' && localStorage.getItem('user_id')) || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('user_id')) || null;
    return {
      email: storedEmail || (userObj && (userObj.email || userObj.user?.email)) || null,
      userId: storedId || (userObj && (userObj._id || userObj.id || userObj.user_id)) || null,
    };
  };

  useEffect(() => {
    const { email: em, userId } = resolveIdentity();
    const fetchProfile = async () => {
      try {
        let url = null;
        if (em) url = `${API_BASE}/auth/me?email=${encodeURIComponent(em)}`;
        else if (userId) url = `${API_BASE}/auth/me?user_id=${encodeURIComponent(userId)}`;
        if (!url) return;
        const resp = await fetch(url);
        if (!resp.ok) return;
        const data = await resp.json();
        setFullName((data.full_name || '').trim());
        setEmail((data.email || '').trim());
        const fromApi = data.avatar_url;
        if (fromApi && typeof fromApi === 'string' && fromApi.trim()) {
          const absolute = fromApi.startsWith('http') ? fromApi : `${API_BASE}${fromApi}`;
          setAvatarUrl(absolute);
        } else if (data._id) {
          setAvatarUrl(`${API_BASE}/auth/avatar/${data._id}`);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchProfile();
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
    // Implement delete or deactivate logic here
    alert(
      actionType === "delete"
        ? "Account deleted."
        : "Account deactivated."
    );
    setShowDialog(false);
  };

  // Validators
  const validateEmail = (value) => /^[^\s@]+@([^\s@.]+\.)+[A-Za-z]{2,}$/.test(value.trim());
  const validatePasswordStrength = (value) => {
    // Min 8, upper, lower, digit, special
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
      const { email: em, userId } = resolveIdentity();
      const payload = {
        current_password: currentPassword,
        new_password: newPassword,
      };
      if (userId) payload.user_id = userId; else if (em) payload.email = em;
      const resp = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j.detail || 'Failed to change password');
      }
      alert('Password changed!');
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      setPasswordError(e.message || 'Failed to change password');
    }
  };

  const saveSettings = async () => {
    // Validate email before saving
    const ok = validateEmail(email);
    setEmailError(ok ? "" : "Please enter a valid email address");
    if (!ok) return;
    try {
      const { email: em, userId } = resolveIdentity();
      const body = { full_name: fullName };
      if (em) body.email = em;
      if (userId) body.user_id = userId;
      // If email changed, send as new_email
      if (em && email && em.toLowerCase() !== email.toLowerCase()) {
        body.new_email = email;
      }
      const resp = await fetch(`${API_BASE}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to save settings');
      }
      alert('Settings saved!');
    } catch (e) {
      alert(e.message || 'Failed to save settings');
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
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/hr'); }}>
                <span className="material-icons-outlined">dashboard</span>
                <span className="nav-label">Dashboard</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/hr-profile'); }}>
                <span className="material-icons-outlined">badge</span>
                <span className="nav-label">Profile</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/candidates'); }}>
                <span className="material-icons-outlined">people_alt</span>
                <span className="nav-label">Candidates</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/set-criteria'); }}>
                <span className="material-icons-outlined">history</span>
                <span className="nav-label">Set Criteria</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/job-display'); }}>
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
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/interview-questions'); }}>
                <span className="material-icons-outlined">quiz</span>
                <span className="nav-label">Interview Questions</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/schedule-interview'); }}>
                <span className="material-icons-outlined">event</span>
                <span className="nav-label">Schedule Interviews</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/notifications'); }}>
                <span className="material-icons-outlined">notifications</span>
                <span className="nav-label">Notifications</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate && onNavigate('/feedback'); }}>
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

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Bar */}
        <header className="top-bar">
          <div className="top-bar-left">
            <button className="icon-button mobile-menu-toggle">
              <span className="material-icons-outlined">menu</span>
            </button>
            <h2 className="page-title">Settings</h2>
          </div>
          <div className="top-bar-right">
            <button className="icon-button notification-button">
              <span className="material-icons-outlined">notifications_none</span>
              <span className="notification-badge">2</span>
            </button>
          </div>
        </header>

        {/* Settings Main Content */}
        <main className="settings-main">
          {/* Mobile Settings Navigation */}
          <nav className="mobile-settings-nav">
            <a href="#account-settings" className="mobile-settings-nav-item active" title="Account">
              <span className="material-icons-outlined">person</span>
              <span className="mobile-settings-label">Account</span>
            </a>
            <a href="#notifications-settings" className="mobile-settings-nav-item" title="Notifications">
              <span className="material-icons-outlined">notifications</span>
              <span className="mobile-settings-label">Notifications</span>
            </a>
            <a href="#privacy-settings" className="mobile-settings-nav-item" title="Privacy">
              <span className="material-icons-outlined">shield</span>
              <span className="mobile-settings-label">Privacy</span>
            </a>
          </nav>

          {/* Account Settings Section */}
          <section id="account-settings" className="card settings-section">
            <h3>Account Settings</h3>

            <div className="user-profile">
              <input
                id="settings-avatar-input"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  try {
                    const { userId, email: em } = resolveIdentity();
                    const form = new FormData();
                    form.append('user_id', userId || '');
                    form.append('file', file);
                    const res = await fetch(`${API_BASE}/auth/upload-avatar`, { method: 'POST', body: form });
                    if (!res.ok) return;
                    const out = await res.json();
                    if (out && out.avatar_url) {
                      const absolute = out.avatar_url.startsWith('http') ? out.avatar_url : `${API_BASE}${out.avatar_url}`;
                      setAvatarUrl(absolute + `?t=${Date.now()}`);
                    }
                  } catch (_) {
                  } finally {
                    e.target.value = '';
                  }
                }}
              />
              <img src={avatarUrl || "placeholder-avatar.png"} alt="User Avatar" className="user-avatar" onClick={() => { const el = document.getElementById('settings-avatar-input'); if (el) el.click(); }} title="Click to upload/change avatar" style={{ cursor: 'pointer' }} />
              <input
                type="text"
                className="user-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                style={{ border: 'none', outline: 'none', fontWeight: 600 }}
              />
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
                <button className="edit-button" type="button" onClick={saveSettings} title="Save profile" disabled={!validateEmail(email) || !fullName.trim()}>
                  <span className="material-icons-outlined">edit</span>
                </button>
              </div>
              {emailError && <div className="form-error">{emailError}</div>}
            </div>

            {/* Password */}
            <div className="settings-group">
              <h4>Change Password</h4>
              <div className="form-group">
                <label htmlFor="current-password">Current Password</label>
                <div className="password-field">
                  <input
                    type={showCurrent ? "text" : "password"}
                    id="current-password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  <span
                    className="material-icons toggle-password"
                    onClick={() => setShowCurrent((v) => !v)}
                    title={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? "visibility_off" : "visibility"}
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <div className="password-field">
                  <input
                    type={showNew ? "text" : "password"}
                    id="new-password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <span
                    className="material-icons toggle-password"
                    onClick={() => setShowNew((v) => !v)}
                    title={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? "visibility_off" : "visibility"}
                  </span>
                </div>
                <small className="form-hint">Min 8 chars, include upper, lower, number and special</small>
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <div className="password-field">
                  <input
                    type={showConfirm ? "text" : "password"}
                    id="confirm-password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <span
                    className="material-icons toggle-password"
                    onClick={() => setShowConfirm((v) => !v)}
                    title={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? "visibility_off" : "visibility"}
                  </span>
                </div>
              </div>
              {passwordError && <div className="form-error">{passwordError}</div>}
              <button className="button button-primary" type="button" onClick={changePassword}>
                Change Password
              </button>
            </div>
          </section>

          {/* Notifications Settings */}
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

          {/* Privacy Settings */}
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
                <p className="description">
                  Contribute your practice interview data to improve the system
                </p>
              </div>
            </div>

            {/* Account Management */}
            <div className="settings-group">
              <h4>Account Management</h4>
              <button
                className="button button-danger"
                type="button"
                onClick={() => openDialog("delete")}
              >
                Delete Account
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={() => openDialog("deactivate")}
              >
                Deactivate Account
              </button>
            </div>
          </section>

          {/* Save Changes Button */}
          <div className="save-changes">
            <button className="button button-primary" type="button" onClick={saveSettings}>
              Save Changes
            </button>
          </div>
        </main>
      </div>

      {/* Confirmation Dialog */}
      {showDialog && (
        <div className="dialog">
          <div className="dialog-content">
            <h3>Confirm Action</h3>
            <p>{dialogMessage}</p>
            <div className="dialog-buttons">
              <button
                className="button button-secondary"
                type="button"
                onClick={closeDialog}
              >
                Cancel
              </button>
              <button
                className="button button-danger"
                type="button"
                onClick={confirmAction}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Settings;