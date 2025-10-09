// src/pages/MatchesPage.jsx
import React, { useEffect, useState, useCallback } from "react";
import { fetchMatches } from "../api/matches";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Loader2 } from "lucide-react";

/**
 * MatchesPage - shows cross-generational matches for the logged-in user.
 * Expects `user` to be passed as a prop from App.jsx.
 */
export default function MatchesPage({ user }) {
  const navigate = useNavigate();
  const userId = user?._id || user?.id || null;

  const [matches, setMatches] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!userId) {
      setMatches(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchMatches(userId);
      if (!res) {
        setError("No response from matches API");
        setMatches([]);
        return;
      }
      if (res.ok === false) {
        setError(res.message || "Matches API returned an error");
        setMatches([]);
        return;
      }
      const data = res.matches || res.data || (Array.isArray(res) ? res : []);
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Failed to load matches");
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
    // refresh every 2 minutes (optional)
    const id = setInterval(() => {
      if (userId) load();
    }, 120000);
    return () => clearInterval(id);
  }, [userId, load]);

  // helper: friendly thumbnail (or placeholder)
  function Thumb({ url, size = 80 }) {
    return url ? (
      <img
        src={url}
        alt="thumb"
        style={{ width: size, height: size, objectFit: "cover" }}
        className="rounded"
      />
    ) : (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center bg-gray-900 text-gray-200 rounded"
      >
        no image
      </div>
    );
  }

  function openStory(id) {
    if (!id) return;
    navigate(`/stories/view/${id}`);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-serif font-semibold">Cross-Generational Matches</h1>
          <p className="text-sm text-gray-400 mt-1">Discover related memories across the family tree.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-3 py-2 border rounded bg-white hover:bg-gray-50"
            title="Refresh matches"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Not logged in */}
      {!userId && (
        <div className="rounded-lg border p-6 text-center text-gray-600">
          You are not signed in. Please <a className="text-blue-600 underline" href="/login">log in</a> to see matches.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-lg border p-6 flex items-center justify-center">
          <Loader2 className="animate-spin mr-2" /> Loading matches...
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg border p-6 text-red-600">
          {error}
        </div>
      )}

      {/* No matches */}
      {!loading && !error && userId && matches && matches.length === 0 && (
        <div className="rounded-lg border p-6 text-center text-gray-600">
          No matches yet. Upload more stories or add descriptions/transcripts so the system can find connections.
        </div>
      )}

      {/* Matches grid */}
      {!loading && !error && matches && matches.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 mt-4">
          {matches.map((m, idx) => {
            // normalize fields (backend may vary)
            const left = m.left || {};
            const right = m.right || {};
            const score = typeof m.score === "number" ? m.score : Number(m.score || 0);

            return (
              <article
                key={m.id || m._id || idx}
                className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
              >
                <div className="p-4 md:p-5 flex flex-col md:flex-row gap-4">
                  {/* Left: user's story */}
                  <div className="flex items-start gap-4 md:w-1/2">
                    <Thumb url={left.mediaUrl} size={92} />
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        {left.userName || "You"} • {left.birthYear ?? "—"}
                      </div>
                      <h3 className="font-serif font-semibold text-lg">{left.title || "Untitled"}</h3>
                      <p className="text-gray-700 text-sm mt-2 line-clamp-3">{left.summary || left.content || ""}</p>
                      {Array.isArray(left.tags) && left.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {left.tags.slice(0,6).map((t, i) => (
                            <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: matched story */}
                  <div className="flex items-start gap-4 md:w-1/2 border-t md:border-t-0 md:border-l md:pl-4 pt-4 md:pt-0">
                    <Thumb url={right.mediaUrl} size={92} />
                    <div className="flex-1">
                      <div className="text-xs text-gray-500 mb-1">
                        {right.userName || "Unknown"} • {right.birthYear ?? "—"}
                      </div>
                      <h3 className="font-serif font-semibold text-lg">{right.title || "Untitled"}</h3>
                      <p className="text-gray-700 text-sm mt-2 line-clamp-3">{right.summary || right.content || ""}</p>
                      {Array.isArray(right.tags) && right.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {right.tags.slice(0,6).map((t, i) => (
                            <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    <strong>Why:</strong> <span className="text-gray-600">{m.explanation}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-500 mr-2">score</div>
                    <div className="text-lg font-semibold text-gray-800 mr-4">{score.toFixed(2)}</div>
                    
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
