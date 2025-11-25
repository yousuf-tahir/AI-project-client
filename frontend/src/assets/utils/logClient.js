// Simple client for posting system log entries
export async function logEvent({ user = '', role = '', action = '', status = '' }) {
  try {
    const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8000';
    const res = await fetch(`${API_BASE}/api/system-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user, role, action, status })
    });
    // Best-effort, ignore failures
    return res.ok;
  } catch (_) {
    return false;
  }
}
