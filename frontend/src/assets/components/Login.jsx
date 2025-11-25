import React, { useState } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/auth.css";
import { logEvent } from "../utils/logClient";

// Simple fetch wrapper for API calls
const api = {
  post: async (url, data) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || 'Something went wrong');
    }
    return response.json();
  }
};

const Login = ({ onNavigate, setUser }) => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://127.0.0.1:8000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    console.log('Login attempt with:', { email: loginEmail });

    try {
      const url = `${API_BASE}/auth/login`;
      console.log(`Sending request to: ${url}`);
      
      const requestBody = {
        email: loginEmail.trim(),
        password: loginPassword
      };
      
      console.log('Request body:', requestBody);
      
      // Create URLSearchParams for form data
      const formData = new URLSearchParams();
      formData.append('username', loginEmail.trim());
      formData.append('password', loginPassword);
      
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: formData
      });

      console.log('Response status:', response.status);
      
      let data;
      try {
        data = await response.json();
        console.log('Response data:', data);
      } catch (jsonError) {
        console.error('Failed to parse JSON response:', jsonError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        console.error('Login failed with status:', response.status);
        throw new Error(data.detail || 'Login failed. Please check your credentials.');
      }

      if (!data || !data.role) {
        console.error('Invalid response format:', data);
        throw new Error('Invalid response from server');
      }

      // Store user data
      const userData = {
        email: data.email || loginEmail,
        role: data.role,
        _id: data.user_id || data._id, // Handle both response formats
        token: data.access_token
      };

      console.log('Login successful, user data:', userData);
      
      // Store in both state and storage
      setUser(userData);

      // Store in appropriate storage based on rememberMe
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("user", JSON.stringify(userData));
      storage.setItem("token", data.access_token);

      console.log('Stored in', rememberMe ? 'localStorage' : 'sessionStorage');

      // Navigate based on role from the backend response
      const rolePath = data.role.toLowerCase();
      let targetPath = '/';
      
      // Map backend roles to frontend routes
      const roleRoutes = {
        'candidate': '/candidate',
        'hr': '/hr',
        'admin': '/admin'
      };
      
      targetPath = roleRoutes[rolePath] || '/';
      console.log('Navigating to:', targetPath);
      
      if (typeof onNavigate === 'function') {
        onNavigate(targetPath);
      } else {
        window.location.href = targetPath;
      }

    } catch (err) {
      console.error("Login error details:", {
        message: err.message,
        name: err.name,
        stack: err.stack,
        response: err.response
      });
      
      let errorMessage = "Failed to login. Please try again.";
      
      // Handle specific error cases
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (err.response.status === 401) {
          errorMessage = "Invalid email or password";
        } else if (err.response.status === 403) {
          errorMessage = "Your account is pending approval. Please contact support.";
        } else if (err.response.data && err.response.data.detail) {
          errorMessage = err.response.data.detail;
        }
      } else if (err.request) {
        // The request was made but no response was received
        errorMessage = "Cannot connect to the server. Please check your internet connection.";
      }
      
      console.error("Login error:", errorMessage);
      setError(errorMessage);

      // Show error in toast
      const toast = document.getElementById("toast");
      const toastContent = document.querySelector(".toast-content");
      if (toast && toastContent) {
        toastContent.textContent = errorMessage;
        toast.classList.add("show");
        setTimeout(() => {
          toast.classList.remove("show");
          setError(""); // Clear error after hiding toast
        }, 5000);
      }
    }
  };

  return (
    <>
      <section className="login">
        <div className="auth-container">
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

          <div className="auth-right">
            <div className="form-container">
              <div className="form-header">
                <h2 id="formTitle">Welcome Back</h2>
                <p id="formSubtitle">Please login to continue</p>
              </div>

              <form id="loginForm" className="auth-form active" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="loginEmail">
                    <span className="material-icons">email</span> Email
                  </label>
                  <input
                    type="email"
                    id="loginEmail"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="loginPassword">
                    <span className="material-icons">lock</span> Password
                  </label>
                  <div className="password-field">
                    <input
                      type={showPassword ? "text" : "password"}
                      id="loginPassword"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      placeholder="Enter your password"
                    />
                    <span
                      className="material-icons toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </div>
                </div>

                <div className="form-group remember-me">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    Remember me
                  </label>
                </div>

                <button type="submit" className="submit-btn">
                  Login
                </button>
                {error && (
                  <div className="error-message">
                    <span className="material-icons">error_outline</span>
                    {error}
                  </div>
                )}

                <div className="form-links">
                  <a href="#" className="forgot-password">
                    Forgot Password?
                  </a>
                  <a 
                    href="#" 
                    className="toggle-link"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('/register');
                    }}
                  >
                    Don't have an account? Register
                  </a>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div id="toast" className="toast">
          <div className="toast-content"></div>
        </div>
      </section>
    </>
  );
};

export default Login;