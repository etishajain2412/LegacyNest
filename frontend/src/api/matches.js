// src/api/matches.js
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export async function fetchMatches(userId) {
  if (!userId) {
    console.warn('fetchMatches called without userId — aborting fetch');
    return { ok: false, message: 'No userId provided' };
  }
  const res = await fetch(`${API_BASE}/api/matches/${userId}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { ok: res.ok, text }; }
}
