// PublicJob.jsx
import React, { useEffect, useState } from "react";
import "material-icons/iconfont/material-icons.css";
import "../styles/hrdashboard.css";

export default function PublicJob({ jobIdFromProps, onApply }) {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
  const [job, setJob] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Try to get job id from URL pattern /public/job/:id when no prop provided
  const getJobId = () => {
    if (jobIdFromProps) return jobIdFromProps;
    const m = window.location.pathname.match(/\/public\/job\/([^/]+)/);
    return m ? m[1] : '';
  };

  useEffect(() => {
    const id = getJobId();
    if (!id) {
      setError('Invalid job link');
      setIsLoading(false);
      return;
    }

    const fetchJob = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/job-criteria/${id}`);
        if (!res.ok) throw new Error('Job not found');
        const data = await res.json();
        setJob(data);
      } catch (e) {
        setError(e.message || 'Failed to load job');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [API_BASE, jobIdFromProps]);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div style={{ maxWidth: 800, margin: '40px auto', color: 'crimson' }}>{error}</div>;
  }

  if (!job) return null;

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 20px' }}>
      <div className="card">
        <div className="card-header">
          <h2 style={{ margin: 0 }}>{job.job_title}</h2>
          <div style={{ color: '#666', marginTop: 6 }}>
            <span className="material-icons-outlined" style={{ fontSize: 18, verticalAlign: 'text-bottom' }}>schedule</span>
            <span style={{ marginLeft: 6 }}>{job.experience_years} years experience</span>
            <span className="material-icons-outlined" style={{ fontSize: 18, verticalAlign: 'text-bottom', marginLeft: 16 }}>school</span>
            <span style={{ marginLeft: 6 }}>{job.qualification}</span>
          </div>
        </div>
        <div className="card-body">
          {job.description ? (
            <>
              <h4>Description</h4>
              <p style={{ whiteSpace: 'pre-wrap' }}>{job.description}</p>
            </>
          ) : null}

          {(job.skills && job.skills.length) ? (
            <>
              <h4>Required Skills</h4>
              <div className="selected-skills">
                {job.skills.map((s) => (
                  <span key={s._id || s.name} className="skill-tag">{s.name || s}</span>
                ))}
              </div>
            </>
          ) : null}

          <div style={{ display:'flex', gap:10, marginTop:16, flexWrap:'wrap' }}>
            <button
              className="button button-primary"
              onClick={() => {
                if (typeof onApply === 'function') onApply(job.id);
                else alert('Applied! (hook up onApply to implement real flow)');
              }}
            >
              Apply Now
            </button>
            <button
              className="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(()=>setCopied(false), 2000);
                } catch {}
              }}
            >
              {copied ? 'Link Copied' : 'Copy Link'}
            </button>
            {/* Share links */}
            <a
              className="button"
              href={`https://wa.me/?text=${encodeURIComponent(window.location.href)}`}
              target="_blank" rel="noreferrer"
            >
              Share WhatsApp
            </a>
            <a
              className="button"
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
              target="_blank" rel="noreferrer"
            >
              Share Facebook
            </a>
            <a
              className="button"
              href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Check this job!')}`}
              target="_blank" rel="noreferrer"
            >
              Share Twitter
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
