import React, { useState } from "react";
import "../styles/auth.css";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userRole, setUserRole] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/[0-9]/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  const validateFullName = (name) => {
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return 'Name can only contain letters and spaces';
    }
    if (name.trim().length < 2) {
      return 'Please enter a valid name';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate full name
    const nameError = validateFullName(fullName);
    if (nameError) {
      showToast(nameError, "error");
      return;
    }

    // Client-side validation
    const passwordError = validatePassword(registerPassword);
    if (passwordError) {
      showToast(passwordError, "error");
      return;
    }

    if (registerPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email: registerEmail,
          password: registerPassword,
          role: userRole
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Handle different error response formats
        let errorMessage = 'Registration failed';
        if (data.detail) {
          errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        } else if (data.message) {
          errorMessage = data.message;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
        throw new Error(errorMessage);
      }
      
      showToast("Registration successful!", "success");
      
      // Reset form
      setFullName("");
      setRegisterEmail("");
      setRegisterPassword("");
      setConfirmPassword("");
      setUserRole("");
      
    } catch (error) {
      console.error('Registration error:', error);
      showToast(error.message || 'Registration failed. Please try again.', 'error');
    }
  };

  const showToast = (message, type) => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: "", type: "" });
    }, 3000);
  };

  return (
    <>
      <div
        className="auth-container"
        style={{ height: "auto", minHeight: "100vh", padding: "1rem 0" }}
      >
        {/* Left Side */}
        <div className="auth-left">
          <div className="auth-info">
            <h1>Smart AI Interview System</h1>
            <p>Transforming recruitment with AI-powered interviews</p>
            <div className="features">
              <div className="feature-item">
                <span className="material-icons">smartphone</span>
                <span>Mobile & Web</span>
              </div>
              <div className="feature-item">
                <span className="material-icons">robot</span>
                <span>AI-Powered</span>
              </div>
              <div className="feature-item">
                <span className="material-icons">security</span>
                <span>Secure</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side */}
        <div className="auth-right">
          <div className="form-container" style={{ padding: "1.5rem" }}>
            <div className="form-header">
              <h2 id="formTitle">Welcome Back</h2>
              <p id="formSubtitle">Please login to continue</p>
            </div>

            {/* Register Form */}
            <form
              id="registerForm"
              className="auth-form"
              style={{
                display: "block",
                fontSize: "0.85rem",
                margin: 0,
                padding: 0
              }}
              onSubmit={handleSubmit}
            >
              <div className="form-group" style={{ marginBottom: "0.8rem" }}>
                <label htmlFor="registerName">
                  <span className="material-icons">person</span> Full Name
                </label>
                <input
                  type="text"
                  id="registerName"
                  required
                  placeholder="Enter your full name (letters only)"
                  value={fullName}
                  onChange={(e) => {
                    // Only update if the input matches the allowed pattern or is empty
                    if (e.target.value === '' || /^[a-zA-Z\s]*$/.test(e.target.value)) {
                      setFullName(e.target.value);
                    }
                  }}
                  pattern="[a-zA-Z\s]+"
                  title="Please enter a valid name (letters and spaces only)"
                />
              </div>

              <div className="form-group" style={{ marginBottom: "0.8rem" }}>
                <label htmlFor="registerEmail">
                  <span className="material-icons">email</span> Email
                </label>
                <input
                  type="email"
                  id="registerEmail"
                  required
                  placeholder="Enter your email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: "0.8rem" }}>
                <label htmlFor="registerPassword">
                  <span className="material-icons">lock</span> Password
                </label>
                <div className="password-field">
                  <input
                    type={showRegisterPassword ? "text" : "password"}
                    id="registerPassword"
                    required
                    minLength={8}
                    placeholder="Create a password (min 8 chars, 1 uppercase, 1 number)"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
                    title="Password must be at least 8 characters long and contain at least one uppercase letter and one number"
                  />
                  <span
                    className="material-icons toggle-password"
                    onClick={() =>
                      setShowRegisterPassword(!showRegisterPassword)
                    }
                  >
                    {showRegisterPassword ? "visibility_off" : "visibility"}
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "0.8rem" }}>
                <label htmlFor="confirmPassword">
                  <span className="material-icons">lock</span> Confirm Password
                </label>
                <div className="password-field">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    required
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <span
                    className="material-icons toggle-password"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  >
                    {showConfirmPassword ? "visibility_off" : "visibility"}
                  </span>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: "0.8rem" }}>
                <label htmlFor="userRole">
                  <span className="material-icons">work</span> Role
                </label>
                <select
                  id="userRole"
                  required
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                >
                  <option value="" disabled>Select your role</option>
                  <option value="candidate">Candidate</option>
                  <option value="hr">HR</option>
                </select>
              </div>

              <button
                type="submit"
                className="submit-btn"
                style={{
                  fontSize: "0.85rem",
                  padding: "0.5rem 1rem",
                  marginTop: "0.5rem"
                }}
              >
                Register
              </button>

              <div
                style={{
                  textAlign: "center",
                  margin: "1rem 0 0",
                  padding: "0.8rem 0 0",
                  borderTop: "1px solid #e0e0e0"
                }}
              >
                <a
                  href="/login"
                  style={{
                    display: "inline-block",
                    padding: "0.4rem 0.8rem",
                    backgroundColor: "#f5f5f5",
                    color: "#1a73e8",
                    textDecoration: "none",
                    fontWeight: 500,
                    fontSize: "0.85rem",
                    borderRadius: "4px",
                    transition: "all 0.2s ease"
                  }}
                >
                  Already have an account? <strong>Login</strong>
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast.show && (
        <div id="toast" className={`toast show ${toast.type}`}>
          <div className="toast-content">{toast.message}</div>
        </div>
      )}
    </>
  );
};

export default Register;