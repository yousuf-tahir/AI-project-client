import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config.js';
import '../styles/HRApplications.css';

const HRApplications = ({ onNavigate }) => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/applications`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch applications');
        }

        const data = await response.json();
        setApplications(data);
      } catch (err) {
        setError('Failed to load applications. Please try again later.');
        console.error('Error fetching applications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApplications();
  }, []);

  const handleViewDetails = (applicationId) => {
    onNavigate(`/application/${applicationId}`);
  };

  if (loading) {
    return <div className="loading">Loading applications...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="hr-applications">
      <h2>Job Applications</h2>
      {applications.length === 0 ? (
        <p>No applications found.</p>
      ) : (
        <div className="applications-list">
          {applications.map((application) => (
            <div key={application.id} className="application-card">
              <h3>{application.jobTitle}</h3>
              <p><strong>Applicant:</strong> {application.applicantName}</p>
              <p><strong>Status:</strong> <span className={`status-${application.status.toLowerCase()}`}>
                {application.status}
              </span></p>
              <p><strong>Applied on:</strong> {new Date(application.appliedDate).toLocaleDateString()}</p>
              <button 
                onClick={() => handleViewDetails(application.id)}
                className="view-details-btn"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HRApplications;
