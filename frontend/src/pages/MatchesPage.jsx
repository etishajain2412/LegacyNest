// src/pages/MatchesPage.jsx
import React, { useEffect, useState } from "react";
import { fetchMatches } from "../api/matches";
import MatchCard from "../components/MatchCard";

/**
 * MatchesPage - shows cross-generational matches for the logged-in user.
 * Expects `user` to be passed as a prop from App.jsx (you already do that).
 */
export default function MatchesPage({ user }) {
  // userId may be undefined while cookies/auth are being read in App.jsx
  const userId = user?._id || user?.id || null;

  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // load matches only when we have a valid userId
  async function load() {
    if (!userId) {
      // nothing to do until we have a user
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetchMatches(userId);

      // handle different backend shapes gracefully
      if (!res) {
        setError("No response from matches API");
        setMatches([]);
        return;
      }

      if (!res.ok && !res.matches && !Array.isArray(res)) {
        // backend returned an error object like { ok: false, message: ... }
        setError(res.message || res.text || "Matches API returned an error");
        setMatches([]);
        return;
      }

      const data = res.matches || res.data || (Array.isArray(res) ? res : null);
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load matches");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }

  // re-run whenever userId becomes available / changes
  useEffect(() => {
    load();
    // If you want periodic refresh: const id = setInterval(load, 60000); return () => clearInterval(id);
  }, [userId]);

  // Helpful debug output to console — remove in production
  useEffect(() => {
    console.log("MatchesPage user:", user);
  }, [user]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-serif">Cross-Generational Matches</h1>
        <p className="text-sm text-faded">Discover related memories across the family tree.</p>
      </header>

      {/* If there is no logged-in user yet */}
      {!userId && (
        <div className="polaroid p-6 text-faded">
          You are not signed in yet. Please <a href="/login" className="text-blue-600">log in</a> to see matches.
        </div>
      )}

      {/* Loading */}
      {loading && <div className="polaroid p-6">Loading matches…</div>}

      {/* Error */}
      {!loading && error && <div className="polaroid p-6 text-red-600">{error}</div>}

      {/* No matches */}
      {!loading && !error && userId && matches && matches.length === 0 && (
        <div className="polaroid p-6 text-faded">
          No matches yet. Upload more stories for the system to find connections, or ensure the backend endpoint <code>/api/matches/:userId</code> is available.
        </div>
      )}

      {/* Matches grid */}
      {!loading && !error && matches && matches.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {matches.map((m, idx) => (
            <MatchCard key={m.id || m._id || idx} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
