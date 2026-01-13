// SetCriteria.jsx
import React, { useState, useRef, useEffect } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";
import "../styles/setcriteria.css";
import ErrorBoundary from "./ErrorBoundary";

const SetCriteria = ({ onNavigate, user }) => {
  console.log('SetCriteria component mounted with onNavigate:', onNavigate);
  
  // Debug: Log when component renders
  useEffect(() => {
    console.log('SetCriteria component rendered with props:', {
      onNavigate: typeof onNavigate,
      hasOnNavigate: !!onNavigate,
      user: JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}')
    });
    
    // Check if onNavigate is a function
    if (typeof onNavigate !== 'function') {
      console.error('onNavigate is not a function:', onNavigate);
    }
    
    return () => {
      console.log('SetCriteria component unmounted');
    };
  }, [onNavigate, user]);

  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState({ type: '', text: '' });
  const [inlineStatus, setInlineStatus] = useState({ type: '', text: '' });
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  // Update form data with user ID when user is available
  useEffect(() => {
    if (user?._id) {
      console.log('Setting user ID in form data:', user._id);
      setFormData(prev => ({
        ...prev,
        userId: user._id
      }));
      setIsLoading(false);
    } else {
      console.log('No user ID available, redirecting to login');
      window.location.href = '/login';
    }
  }, [user]);

  const [formData, setFormData] = useState({
    jobTitle: "",
    experienceYears: 0,
    qualification: "",
    description: "",
    userId: "" // Will be set after user data is loaded
  });

  const [inputValue, setInputValue] = useState("");
  const [filteredSkills, setFilteredSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const [allSkills, setAllSkills] = useState([
    'Python', 'JavaScript', 'React', 'Node.js', 'Java', 'HTML', 'CSS',
    'SQL', 'MongoDB', 'Express', 'Django', 'Flask', 'TypeScript', 'AWS',
    'Docker', 'Git', 'REST API', 'GraphQL', 'Redux', 'Project Management'
  ]);
  
  // Auto-hide toasts/banner
  useEffect(() => {
    if (!toast.text) return;
    const t = setTimeout(() => setToast({ type: '', text: '' }), 3000);
    return () => clearTimeout(t);
  }, [toast.text]);

  useEffect(() => {
    if (!inlineStatus.text) return;
    const t = setTimeout(() => setInlineStatus({ type: '', text: '' }), 4000);
    return () => clearTimeout(t);
  }, [inlineStatus.text]);

  // Fetch skills from the backend on component mount
  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/skills/`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setAllSkills(prev => {
              const skillNames = data.map(skill => skill.name);
              // Merge with existing skills and remove duplicates
              return [...new Set([...prev, ...skillNames])];
            });
          }
        }
      } catch (error) {
        console.error('Error fetching skills:', error);
      }
    };
    
    fetchSkills();
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (value) {
      const filtered = allSkills.filter(skill =>
        skill.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSkills(filtered);
      setShowDropdown(true);
    } else {
      setFilteredSkills(allSkills);
      setShowDropdown(true);
    }
  };

  const handleSkillSelect = (skill) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
    setInputValue('');
    setShowDropdown(false);
  };

  const removeSkill = (skillToRemove) => {
    setSelectedSkills(selectedSkills.filter(skill => skill !== skillToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue && !allSkills.includes(inputValue)) {
      e.preventDefault();
      if (!selectedSkills.includes(inputValue)) {
        setSelectedSkills([...selectedSkills, inputValue]);
        setInputValue('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const safeNavigate = (path) => {
      if (typeof onNavigate === 'function') {
        onNavigate(path);
      } else if (window.location.pathname !== path) {
        window.location.href = path;
      }
    };
    
    // Check if user is authenticated
    if (!user?._id) {
      console.error('No user data available');
      safeNavigate('/login');
      return;
    }

    // Validate: at least one skill
    if (selectedSkills.length === 0) {
      setToast({ type: 'error', text: 'Please add at least one skill' });
      setInlineStatus({ type: 'error', text: 'Please add at least one skill' });
      return;
    }

    // Validate: job title format (First upper, remaining lowercase letters/spaces only)
    const title = (formData.jobTitle || '').trim();
    const titleOk = /^[A-Z][a-z ]+$/.test(title);
    if (!titleOk) {
      setToast({ type: 'error', text: 'Title must start with uppercase, remaining lowercase letters. No digits or special characters.' });
      setInlineStatus({ type: 'error', text: 'Title must start with uppercase, remaining lowercase letters. No digits or special characters.' });
      return;
    }

    // Validate: qualification
    if (!String(formData.qualification || '').trim()) {
      setToast({ type: 'error', text: 'Please enter a qualification' });
      setInlineStatus({ type: 'error', text: 'Please enter a qualification' });
      return;
    }

    // Validate: preferred field
    if (!String(formData.preferredField || '').trim()) {
      setToast({ type: 'error', text: 'Please select a preferred field' });
      setInlineStatus({ type: 'error', text: 'Please select a preferred field' });
      return;
    }

    // Validate: experience years non-negative number
    const yrs = Number(formData.experienceYears);
    if (!Number.isFinite(yrs) || yrs < 0) {
      setToast({ type: 'error', text: 'Experience (years) must be a non-negative number' });
      setInlineStatus({ type: 'error', text: 'Experience (years) must be a non-negative number' });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Get the token from storage
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      // Prepare payload for /api/job-criteria (JobCriteriaCreate)
      const skillsNames = selectedSkills.map(s => (typeof s === 'string' ? s : (s.name || s.label || s.value || ''))).filter(Boolean);
      const payload = {
        job_title: formData.jobTitle.trim(),
        experience_years: parseFloat(formData.experienceYears) || 0,
        qualification: formData.qualification || formData.preferredField || 'N/A',
        description: (formData.description || '').trim(),
        skills: skillsNames,
        user_id: user._id,
      };

      console.log('Submitting job criteria:', payload);

      const response = await fetch(`${API_BASE}/api/job-criteria/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Backend error:', responseData);
        throw new Error(responseData.detail || 'Failed to save criteria');
      }

      // Show success message
      setToast({ type: 'success', text: 'Criteria saved successfully!' });
      setInlineStatus({ type: 'success', text: 'Criteria saved successfully!' });
      
      // Reset form
      setFormData(prev => ({
        ...prev,
        jobTitle: "",
        experienceYears: 0,
        preferredField: "",
        jobType: "Full-time",
        importantCertificates: "",
        applicationDeadline: "",
        cvRequired: false,
        coverLetterRequired: false,
        description: ""
      }));
      
      setSelectedSkills([]);
      setInputValue("");
      
    } catch (error) {
      console.error('Error saving criteria:', error);
      alert(`Error: ${error.message || "Failed to save criteria. Please check the console for details."}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle navigation
  const handleNavigation = (path) => (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate(path);
    } else {
      console.error('onNavigate is not available');
      window.location.href = path;
    }
  };

  // Test if component renders
  if (!onNavigate) {
    return <div style={{color: 'red', padding: '20px'}}>Error: onNavigate prop is missing. Make sure the component is properly connected to the router.</div>;
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // If no user is found, don't render anything (will be redirected by useEffect)
  if (!user) {
    return null;
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="app-logo">HR</span> Recruit
        </div>
        <nav className="sidebar-nav">
          <ul>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/hr')}>
                <span className="material-icons-outlined">dashboard</span>
                <span className="nav-label">Dashboard</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/candidates')}>
                <span className="material-icons-outlined">people_alt</span>
                <span className="nav-label">Candidates</span>
              </a>
            </li>
            <li className="nav-item active">
              <a href="#" className="active">
                <span className="material-icons-outlined">history</span>
                <span className="nav-label">Set Criteria</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/job-display')}>
                <span className="material-icons-outlined">work</span>
                <span className="nav-label">Job Display</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/candidates-apply')}>
                <span className="material-icons-outlined">how_to_reg</span>
                <span className="nav-label">Candidates Apply</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/hr-profile')}>
                <span className="material-icons-outlined">badge</span>
                <span className="nav-label">Profile</span>
              </a>
            </li>
            
            <li className="nav-item"><a href="#" onClick={(e) => go("/interview-questions", e)}><span className="material-icons-outlined">quiz</span><span className="nav-label">Interview Questions</span></a></li>
               <li className="nav-item">
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/hr-analysis-list'); }}>
                <span className="material-icons-outlined">analytics</span>
                <span className="nav-label">Interview Analysis</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/schedule-interview')}>
                <span className="material-icons-outlined">event</span>
                <span className="nav-label">Schedule Interviews</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/notifications')}>
                <span className="material-icons-outlined">notifications</span>
                <span className="nav-label">Notifications</span>
              </a>
            </li>
            <li className="nav-item">
              <a href="#" onClick={handleNavigation('/feedback')}>
                <span className="material-icons-outlined">rate_review</span>
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

      {/* Main Content Area */}
      <div className="main-content">
        {/* Top Bar */}
        

        {/* Main Content */}
        <main className="dashboard-content">
          <div className="card">
            <div className="card-header">
              <h3>Set Criteria</h3>
            </div>
            <div className="card-body">
              {inlineStatus.text ? (
                <div className={`inline-status ${inlineStatus.type}`} role="status" aria-live="polite" style={{ marginBottom: 12 }}>
                  <div className="inline-status-left">
                    <span className="material-icons-outlined inline-status-icon" aria-hidden>{inlineStatus.type === 'error' ? 'error_outline' : 'check_circle'}</span>
                    <span>{inlineStatus.text}</span>
                  </div>
                  <button type="button" className="inline-status-close" aria-label="Dismiss" onClick={() => setInlineStatus({ type: '', text: '' })}>
                    <span className="material-icons-outlined" aria-hidden>close</span>
                  </button>
                </div>
              ) : null}
              <form id="criteriaForm" onSubmit={handleSubmit}>
                <input
                  type="hidden"
                  id="selectedSkills"
                  name="selectedSkills"
                  value=""
                />

                <div className="form-group">
                  <label htmlFor="jobTitle">Job Title:</label>
                  <input
                    type="text"
                    id="jobTitle"
                    className="form-control"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="jobDescription">Job Description:</label>
                  <textarea
                    id="jobDescription"
                    className="form-control"
                    rows="5"
                    placeholder="Add a brief description of the role, responsibilities, and expectations"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Required Skills:</label>
                  <div className="skills-container">
                    <div className="skill-input-wrapper" style={{ position: 'relative' }}>
                      <input
                        type="text"
                        ref={inputRef}
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={() => inputValue && setShowDropdown(true)}
                        onKeyDown={handleKeyDown}
                        className="form-control"
                        placeholder="Type or select a skill..."
                      />
                      {showDropdown && filteredSkills.length > 0 && (
                        <div 
                          ref={dropdownRef}
                          className="skills-dropdown"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                            zIndex: 1000,
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}
                        >
                          {filteredSkills.map((skill, index) => (
                            <div
                              key={index}
                              className="dropdown-item"
                              onClick={() => handleSkillSelect(skill)}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #eee',
                                backgroundColor: selectedSkills.includes(skill) ? '#f0f0f0' : 'white',
                                color: selectedSkills.includes(skill) ? '#666' : '#333',
                                fontStyle: selectedSkills.includes(skill) ? 'italic' : 'normal'
                              }}
                            >
                              {skill}
                              {selectedSkills.includes(skill) && ' (selected)'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="selected-skills">
                      {selectedSkills.map((skill, index) => (
                        <span key={index} className="skill-tag">
                          {skill}
                          <span 
                            className="remove-skill"
                            onClick={() => removeSkill(skill)}
                            style={{ marginLeft: '5px', cursor: 'pointer' }}
                          >
                            ×
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Experience Required:</label>
                  <div className="experience-inputs">
                    <div className="input-group">
                      <input
                        type="number"
                        id="experienceYears"
                        className="form-control"
                        value={formData.experienceYears}
                        onChange={(e) => setFormData(prev => ({ ...prev, experienceYears: e.target.value }))}
                        min="0"
                        placeholder="Years"
                      />
                      <span className="input-group-text">years</span>
                    </div>
                    <div className="input-group">
                      <input
                        type="number"
                        id="experienceMonths"
                        className="form-control"
                        min="0"
                        max="11"
                        placeholder="Months"
                      />
                      <span className="input-group-text">months</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="qualification">Qualification:</label>
                  <input
                    type="text"
                    id="qualification"
                    className="form-control"
                    value={formData.qualification}
                    onChange={(e) => setFormData(prev => ({ ...prev, qualification: e.target.value }))}
                    placeholder="e.g., Bachelor's in CS, B.Tech, MSc"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="field">Preferred Field:</label>
                  <select id="field" className="form-control" value={formData.preferredField || ''} onChange={(e) => setFormData(prev => ({ ...prev, preferredField: e.target.value }))} required>
                    <option value="">Select field</option>
                    <option value="software">Software Development</option>
                    <option value="web">Web Development</option>
                    <option value="mobile">Mobile Development</option>
                    <option value="testing">Testing/QA</option>
                    <option value="devops">DevOps</option>
                    <option value="management">Project Management</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Job Type:</label>
                  <div className="job-type-radios">
                    <div className="radio-group">
                      <input
                        type="radio"
                        id="fullTime"
                        name="jobType"
                        value="full-time"
                        defaultChecked
                      />
                      <label htmlFor="fullTime">Full-time</label>
                    </div>
                    <div className="radio-group">
                      <input
                        type="radio"
                        id="partTime"
                        name="jobType"
                        value="part-time"
                      />
                      <label htmlFor="partTime">Part-time</label>
                    </div>
                    <div className="radio-group">
                      <input
                        type="radio"
                        id="remote"
                        name="jobType"
                        value="remote"
                      />
                      <label htmlFor="remote">Remote</label>
                    </div>
                  </div>
                  <input
                    type="date"
                    id="lastDate"
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="certificates">Important Certificates</label>
                  <input
                    type="text"
                    id="certificates"
                    className="form-control"
                    placeholder="e.g., AWS Certified, Google Analytics"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>CV Attachment</label>
                  <div className="toggle-group">
                    <label className="toggle-label">
                      Yes
                      <input
                        type="radio"
                        name="cvRequired"
                        value="yes"
                        required
                      />
                    </label>
                    <label className="toggle-label">
                      No
                      <input
                        type="radio"
                        name="cvRequired"
                        value="no"
                        required
                      />
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Cover Letter</label>
                  <div className="toggle-group">
                    <label className="toggle-label">
                      Yes
                      <input
                        type="radio"
                        name="coverLetterRequired"
                        value="yes"
                        required
                      />
                    </label>
                    <label className="toggle-label">
                      No
                      <input
                        type="radio"
                        name="coverLetterRequired"
                        value="no"
                        required
                      />
                    </label>
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="button button-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Criteria'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>
      {toast.text ? (
        <div className={`toast ${toast.type === 'success' ? 'success' : 'error'}`} role="status" aria-live="polite" style={{ position: 'fixed', right: 20, bottom: 20 }}>
          <span className="material-icons-outlined toast-icon" aria-hidden>{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          <span>{toast.text}</span>
        </div>
      ) : null}
    </div>
  );
};

// Export the component with ErrorBoundary
export default function SetCriteriaWithErrorBoundary(props) {
  return (
    <ErrorBoundary>
      <SetCriteria {...props} />
    </ErrorBoundary>
  );
}