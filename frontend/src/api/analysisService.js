/**
 * Interview Analysis API Service
 * Handles all API calls for interview analysis functionality
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

/**
 * Get authorization headers with token
 */
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
};

/**
 * Generate AI analysis for a completed interview (HR only)
 */
export const generateAnalysis = async (interviewId, hrId, forceRegenerate = false) => {
  try {
    console.log('[ANALYSIS API] Generating analysis for interview:', interviewId);
    
    const response = await fetch(
      `${API_BASE}/api/interview-analysis/${interviewId}/generate`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          hr_id: hrId,
          force_regenerate: forceRegenerate
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to generate analysis: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ANALYSIS API] Analysis generated successfully:', data);
    return data;

  } catch (error) {
    console.error('[ANALYSIS API] Error generating analysis:', error);
    throw error;
  }
};

/**
 * Get full analysis for HR (includes per-question breakdown)
 */
export const getHRAnalysis = async (interviewId, hrId) => {
  try {
    console.log('[ANALYSIS API] Fetching HR analysis for interview:', interviewId);
    
    const response = await fetch(
      `${API_BASE}/api/interview-analysis/${interviewId}/hr?hr_id=${encodeURIComponent(hrId)}`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to fetch HR analysis: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ANALYSIS API] HR analysis fetched successfully');
    return data;

  } catch (error) {
    console.error('[ANALYSIS API] Error fetching HR analysis:', error);
    throw error;
  }
};

/**
 * Get filtered analysis for Candidate (no per-question breakdown)
 */
export const getCandidateAnalysis = async (interviewId, candidateId) => {
  try {
    console.log('[ANALYSIS API] Fetching candidate analysis for interview:', interviewId);
    
    const response = await fetch(
      `${API_BASE}/api/interview-analysis/${interviewId}/candidate?candidate_id=${encodeURIComponent(candidateId)}`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to fetch candidate analysis: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ANALYSIS API] Candidate analysis fetched successfully');
    return data;

  } catch (error) {
    console.error('[ANALYSIS API] Error fetching candidate analysis:', error);
    throw error;
  }
};

/**
 * Check if analysis exists for an interview
 */
export const checkAnalysisExists = async (interviewId) => {
  try {
    const response = await fetch(
      `${API_BASE}/api/interview-analysis/${interviewId}/exists`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to check analysis existence: ${response.status}`);
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('[ANALYSIS API] Error checking analysis existence:', error);
    throw error;
  }
};

/**
 * Delete analysis for an interview (HR only)
 */
export const deleteAnalysis = async (interviewId, hrId) => {
  try {
    console.log('[ANALYSIS API] Deleting analysis for interview:', interviewId);
    
    const response = await fetch(
      `${API_BASE}/api/interview-analysis/${interviewId}?hr_id=${encodeURIComponent(hrId)}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Failed to delete analysis: ${response.status}`);
    }

    const data = await response.json();
    console.log('[ANALYSIS API] Analysis deleted successfully');
    return data;

  } catch (error) {
    console.error('[ANALYSIS API] Error deleting analysis:', error);
    throw error;
  }
};

/**
 * Get completed interviews for HR - FIXED to use working endpoint
 */
export const getCompletedInterviews = async (hrId) => {
  try {
    // Use the working endpoint from your logs
    const response = await fetch(
      `${API_BASE}/api/interviews?hr_id=${hrId}`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch interviews: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter for completed interviews only
    const completed = data.filter(interview => interview.status === 'completed');
    console.log('[ANALYSIS API] Fetched HR completed interviews:', completed.length);
    
    return completed;

  } catch (error) {
    console.error('[ANALYSIS API] Error fetching completed interviews:', error);
    throw error;
  }
};

/**
 * Get candidate's completed interviews - USES WORKING ENDPOINT
 */
export const getCandidateCompletedInterviews = async (candidateId) => {
  try {
    // This endpoint is working based on your logs
    const response = await fetch(
      `${API_BASE}/api/interview-rooms/candidate/${candidateId}/upcoming`,
      {
        method: 'GET',
        headers: getAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch candidate interviews: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter for completed interviews
    const completed = data.filter(interview => 
      interview.roomStatus === 'completed' || interview.status === 'completed'
    );
    
    console.log('[ANALYSIS API] Fetched candidate completed interviews:', completed.length);
    return completed;

  } catch (error) {
    console.error('[ANALYSIS API] Error fetching candidate interviews:', error);
    throw error;
  }
};