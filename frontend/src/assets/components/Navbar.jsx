import React from "react";
import '@fortawesome/fontawesome-free/css/all.min.css';
import "../styles/navbar.css"; // put your navbar styles here

const NavBar = ({ user, onNavigate }) => {
  const go = (path, e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (typeof onNavigate === 'function') onNavigate(path);
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-brand" onClick={(e) => go('/home', e)} style={{ cursor: 'pointer' }}>
          <i className="fas fa-robot"></i>
          <span>Smart AI Interview System</span>
        </div>
        <ul className="nav-links">
          <li><a href="#" onClick={(e) => go('/home', e)}>Home</a></li>
          {/* Show role-based quick links if user exists */}
          {user?.role?.toLowerCase() === 'candidate' && (
            <li><a href="#" onClick={(e) => go('/candidate', e)}>Candidate Portal</a></li>
          )}
          {user?.role?.toLowerCase() === 'hr' && (
            <li><a href="#" onClick={(e) => go('/hr', e)}>HR Dashboard</a></li>
          )}
          {user?.role?.toLowerCase() === 'admin' && (
            <li><a href="#" onClick={(e) => go('/admin', e)}>Admin</a></li>
          )}
          {/* Useful app pages */}
          <li><a href="#" onClick={(e) => go('/interview-questions', e)}>Interview Questions</a></li>
          <li><a href="#" onClick={(e) => go('/feedback', e)}>Feedback</a></li>
          <li><a href="#" onClick={(e) => go('/notifications', e)}>Notifications</a></li>
          <li><a href="#" onClick={(e) => go('/settings', e)}>Settings</a></li>
        </ul>
      </div>
    </nav>
  );
};

export default NavBar;
