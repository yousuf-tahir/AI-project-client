import React, { useState, useEffect } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";
import "../styles/interviewquestions.css";

const InterviewQuestions = ({ onNavigate }) => {
  const [formData, setFormData] = useState({
    question_text: "",
    question_type: "technical",
    difficulty: "medium",
    category: "programming",
    field: "web_development",
    tags: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [toast, setToast] = useState({ text: "", type: "" });
  const [selectedField, setSelectedField] = useState("all"); // For filtering
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
  const [questions, setQuestions] = useState([]);

  // Available job fields
  const jobFields = [
    { value: "web_development", label: "Web Development" },
    { value: "mobile_development", label: "Mobile Development" },
    { value: "data_science", label: "Data Science" },
    { value: "machine_learning", label: "Machine Learning" },
    { value: "backend_development", label: "Backend Development" },
    { value: "frontend_development", label: "Frontend Development" },
    { value: "full_stack_development", label: "Full Stack Development" },
    { value: "devops", label: "DevOps" },
    { value: "cloud_engineering", label: "Cloud Engineering" },
    { value: "cybersecurity", label: "Cybersecurity" },
    { value: "ui_ux_design", label: "UI/UX Design" },
    { value: "product_management", label: "Product Management" },
    { value: "qa_testing", label: "QA Testing" },
    { value: "database_administration", label: "Database Administration" },
    { value: "system_architecture", label: "System Architecture" },
    { value: "blockchain", label: "Blockchain" },
    { value: "game_development", label: "Game Development" },
    { value: "embedded_systems", label: "Embedded Systems" },
    { value: "general", label: "General (All Fields)" }
  ];

  const fetchQuestions = async (field = null) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      let url = `${API_BASE}/api/interview-questions?limit=100&page=1`;
      if (field && field !== 'all') {
        url += `&field=${field}`;
      }
      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resp.ok) throw new Error('Failed to load questions');
      const data = await resp.json();
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setToast({ text: e.message || 'Failed to load questions', type: 'error' });
    }
  };

  useEffect(() => {
    fetchQuestions(selectedField);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedField]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFieldFilterChange = (e) => {
    setSelectedField(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: "", type: "" });
    setToast({ text: "", type: "" });

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      const tags = formData.tags.split(",").map(tag => tag.trim()).filter(tag => tag);
      
      const response = await fetch(`${API_BASE}/api/interview-questions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          tags
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Failed to save question");
      }

      const successMsg = "Question saved successfully!";
      setMessage({ text: successMsg, type: "success" });
      setToast({ text: successMsg, type: "success" });
      // Reset form
      setFormData({
        question_text: "",
        question_type: "technical",
        difficulty: "medium",
        category: "programming",
        field: "web_development",
        tags: ""
      });
      fetchQuestions(selectedField);
    } catch (error) {
      console.error("Error saving question:", error);
      const errMsg = error.message || "Failed to save question";
      setMessage({ text: errMsg, type: "error" });
      setToast({ text: errMsg, type: "error" });
    } finally {
      setIsSubmitting(false);
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
              <a href="#" onClick={(e) => { e.preventDefault(); onNavigate('/candidates-apply'); }}>
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
            <li className="nav-item active">
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

      {/* Main content */}
      <div className="main-content">
        {/* Dashboard grid */}
        <main className="dashboard-grid">
          {/* Question Form */}
          <section className="card">
            <h3>Add New Question</h3>
            <form className="question-form" onSubmit={handleSubmit}>
              {message.text && (
                <div className={`inline-status ${message.type === 'success' ? 'success' : 'error'}`} role="status" aria-live="polite">
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

              {/* NEW: Field Selection */}
              <div className="form-group">
                <label htmlFor="field">Job Field</label>
                <select 
                  id="field" 
                  name="field"
                  className="form-control"
                  value={formData.field}
                  onChange={handleChange}
                  required
                >
                  {jobFields.map(field => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <small style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
                  Select the job field this question applies to
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="question_text">Question Text</label>
                <textarea
                  id="question_text"
                  name="question_text"
                  className="form-control"
                  rows="3"
                  placeholder="Enter your question here..."
                  value={formData.question_text}
                  onChange={handleChange}
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="question_type">Question Type</label>
                <select 
                  id="question_type" 
                  name="question_type"
                  className="form-control"
                  value={formData.question_type}
                  onChange={handleChange}
                  required
                >
                  <option value="technical">Technical</option>
                  <option value="behavioral">Behavioral</option>
                  <option value="situational">Situational</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="category">Category</label>
                <input
                  type="text"
                  id="category"
                  name="category"
                  className="form-control"
                  value={formData.category}
                  onChange={handleChange}
                  placeholder="e.g., programming, databases, system design"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="difficulty">Difficulty Level</label>
                <select 
                  id="difficulty" 
                  name="difficulty"
                  className="form-control"
                  value={formData.difficulty}
                  onChange={handleChange}
                  required
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  className="form-control"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="e.g., javascript, react, hooks"
                />
              </div>

              <button 
                type="submit" 
                className="button button-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : 'Save Question'}
              </button>
            </form>
          </section>

          {/* Questions List with Filter */}
          <section className="card">
            <div className="table-header">
              <h3>Questions</h3>
              <div className="filter-group">
                <label htmlFor="fieldFilter" style={{ marginRight: '8px', fontWeight: '500', color: 'var(--text-secondary)' }}>
                  Filter by Field:
                </label>
                <select 
                  id="fieldFilter" 
                  className="form-control" 
                  style={{ width: 'auto', display: 'inline-block' }}
                  value={selectedField}
                  onChange={handleFieldFilterChange}
                >
                  <option value="all">All Fields</option>
                  {jobFields.map(field => (
                    <option key={field.value} value={field.value}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Question</th>
                    <th>Field</th>
                    <th>Type</th>
                    <th>Difficulty</th>
                    <th>Category</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', color: '#94a3b8' }}>
                        {selectedField === 'all' 
                          ? 'No questions found' 
                          : `No questions found for ${jobFields.find(f => f.value === selectedField)?.label || 'this field'}`
                        }
                      </td>
                    </tr>
                  ) : (
                    questions.map((q) => (
                      <tr key={q._id || q.id}>
                        <td style={{ maxWidth: '300px' }}>{q.question_text}</td>
                        <td>
                          <span className="field-badge">
                            {jobFields.find(f => f.value === q.field)?.label || q.field}
                          </span>
                        </td>
                        <td>{q.question_type}</td>
                        <td>
                          <span className={`difficulty-badge ${q.difficulty}`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td>{q.category}</td>
                        <td>{q.created_at ? new Date(q.created_at).toISOString().split('T')[0] : ''}</td>
                        <td>
                          <button className="icon-button action-button" title="Edit" onClick={(e) => { e.preventDefault(); /* wire later */ }}>
                            <span className="material-icons-outlined">edit</span>
                          </button>
                          <button className="icon-button action-button" title="Delete" onClick={async (e) => {
                            e.preventDefault();
                            const ok = window.confirm('Delete this question?');
                            if (!ok) return;
                            try {
                              const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                              const resp = await fetch(`${API_BASE}/api/interview-questions/${q._id || q.id}`, {
                                method: 'DELETE',
                                headers: token ? { Authorization: `Bearer ${token}` } : {}
                              });
                              if (!resp.ok) {
                                const er = await resp.json().catch(() => ({}));
                                throw new Error(er.detail || 'Failed to delete');
                              }
                              setToast({ text: 'Question deleted', type: 'success' });
                              fetchQuestions(selectedField);
                            } catch (err) {
                              setToast({ text: err.message || 'Delete failed', type: 'error' });
                            }
                          }}>
                            <span className="material-icons-outlined">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
      {toast.text && (
        <div className={`toast ${toast.type === 'success' ? 'success' : 'error'}`} role="status" aria-live="polite" onAnimationEnd={() => setToast({ text: '', type: '' })}>
          <span className="material-icons-outlined toast-icon" aria-hidden>{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          <span>{toast.text}</span>
        </div>
      )}
    </div>
  );
};

export default InterviewQuestions;