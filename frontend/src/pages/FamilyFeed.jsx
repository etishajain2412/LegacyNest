import { useEffect, useState } from "react";
import socket from "../utils/socket";
import SharedPromptItem from "../components/SharedPromptItem";
import axiosInstance from "../utils/axiosInstance"; // ✅ use your preconfigured instance

function FamilyFeed({ familyId }) {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    let mounted = true;

    axiosInstance
      .get(`/shared-prompts/family/${familyId}/feed`)
      .then((res) => {
        if (mounted) setFeed(res.data);
      })
      .catch(console.error);

    socket.on("sharedPrompt:new", (data) => {
      if (data.sharedPrompt.familyId === familyId) {
        setFeed((prev) => [data.sharedPrompt, ...prev]);
      }
    });

    socket.on("sharedPrompt:reply", ({ sharedPromptId }) => {
      setFeed((prev) =>
        prev.map((s) =>
          s._id === sharedPromptId
            ? { ...s, repliesCount: (s.repliesCount || 0) + 1 }
            : s
        )
      );
    });

    return () => {
      mounted = false;
      socket.off("sharedPrompt:new");
      socket.off("sharedPrompt:reply");
    };
  }, [familyId]);

function EmptyState({ title, subtitle }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Family Feed</h1>
      {feed.map((sp) => (
        <SharedPromptItem key={sp._id} sharedPrompt={sp} />
      ))}
    </div>
  );
}

function SharedPromptCard({ item, onReply, currentUser }) {
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  // Normalize current user id (works with _id or id)
  const currentUserId = currentUser?._id ?? currentUser?.id ?? null;

  // Did the current user already reply to this shared prompt?
  const hasReplied = useMemo(() => {
    if (!item?.responses || !currentUserId) return false;
    return item.responses.some((r) => {
      const uid = r.userId?._id ?? r.userId;
      return String(uid) === String(currentUserId);
    });
  }, [item, currentUserId]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setLoading(true);
    try {
      // respondToSharedPrompt should return the updated shared object or { shared: ... }
      const res = await respondToSharedPrompt(item._id, { text: reply.trim() });
      const updatedShared = res.shared || res;
      onReply && onReply(updatedShared);
      setReply("");
    } catch (err) {
      console.error("Reply error", err);
      alert(err?.response?.data?.message || "Failed to reply");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="bg-white rounded-xl shadow-md p-6 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#7b1b1b]">
            {item.promptInstanceId?.promptText || "Shared prompt"}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Shared by {item.sharedBy?.name || item.sharedBy?.email || "someone"}
            {hasReplied && (
              <span className="ml-3 px-2 py-0.5 text-xs bg-green-50 text-green-800 rounded">You replied</span>
            )}
          </p>
        </div>
        <div className="text-xs text-gray-400">
          {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-800 italic">
          {item.promptInstanceId?.response?.text || "No original answer text available."}
        </p>
        <p className="text-xs text-gray-500 mt-2">
          — {item.promptInstanceId?.userId?.name ?? "Original author"}
        </p>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium mb-2">Family responses</h4>

        {(!item.responses || item.responses.length === 0) && (
          <div className="text-sm text-gray-500 mb-2">No responses yet — be the first to reply.</div>
        )}

        <div className="space-y-3 mb-3">
          {item.responses?.map((r) => (
            <div key={r._id || r.createdAt} className="p-3 bg-white border rounded">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm">{r.text}</p>
                  <p className="text-xs text-gray-500 mt-1">— {r.userId?.name || r.userId || "Member"}</p>
                </div>
                <div className="text-xs text-gray-400 ml-4">
                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ""}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* only show reply box if user exists and hasn't replied yet */}
        {currentUserId ? (
          !hasReplied ? (
            <div className="mt-2">
              <textarea
                className="w-full border rounded p-2 resize-none"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a family response..."
              />
              <div className="mt-2 flex gap-2 justify-end">
                <button
                  className="px-4 py-2 bg-white border rounded text-gray-700"
                  onClick={() => {
                    setReply("");
                    try { document.activeElement?.blur(); } catch (_) {}
                  }}
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  onClick={handleReply}
                  disabled={loading || !reply.trim()}
                  className="px-4 py-2 bg-[#7b1b1b] text-white rounded disabled:opacity-60"
                >
                  {loading ? "Posting…" : "Reply to family"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 mt-2">You’ve already replied to this prompt.</div>
          )
        ) : (
          <div className="text-sm text-gray-500 mt-2">Log in to reply.</div>
        )}
      </div>
    </article>
  );
}

export default function FamilyFeed({ user }) {
  const [circles, setCircles] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState(null);
  const [shared, setShared] = useState([]);
  const [loadingShared, setLoadingShared] = useState(false);
  const [loadingCircles, setLoadingCircles] = useState(true);
  const [error, setError] = useState(null);

  // load user's circles
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingCircles(true);
      try {
        const resp = await fetchMyCircles(); // should return { circles } or an array
        const arr = resp?.circles ?? resp ?? [];
        if (!mounted) return;
        setCircles(arr);
        if (arr.length > 0) setSelectedFamilyId((prev) => prev || arr[0]._id);
      } catch (err) {
        console.error("Failed to load family circles:", err);
        setError("Failed to load your family circles.");
      } finally {
        if (mounted) setLoadingCircles(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  // load feed whenever family changes
  const loadSharedForFamily = useCallback(async (familyId) => {
    if (!familyId) {
      setShared([]);
      return;
    }
    setLoadingShared(true);
    try {
      const data = await fetchFamilySharedPrompts(familyId);
      // defensive: API may return { items } or array
      const arr = data?.items ?? data ?? [];
      setShared(arr);
    } catch (err) {
      console.error("Failed to load family feed:", err);
      setError("Failed to load family feed.");
      setShared([]);
    } finally {
      setLoadingShared(false);
    }
  }, []);

  useEffect(() => {
    loadSharedForFamily(selectedFamilyId);
  }, [selectedFamilyId, loadSharedForFamily]);

  // socket real-time: subscribe to family room updates
  useEffect(() => {
    if (!socket) return;
    if (!selectedFamilyId) return;

    socket.emit("joinFamilyRoom", { familyId: selectedFamilyId });

    const onNewShared = (payload) => {
      setShared((prev) => [payload.sharedPrompt, ...prev]);
    };
    const onRespond = ({ sharedId, response }) => {
      setShared((prev) =>
        prev.map((s) => (String(s._id) === String(sharedId) ? { ...s, responses: [response, ...(s.responses || [])] } : s))
      );
    };

    socket.on("family:sharedPrompt:new", onNewShared);
    socket.on("family:sharedPrompt:response", onRespond);

    return () => {
      socket.off("family:sharedPrompt:new", onNewShared);
      socket.off("family:sharedPrompt:response", onRespond);
      socket.emit("leaveFamilyRoom", { familyId: selectedFamilyId });
    };
  }, [selectedFamilyId]);

  const handleReplyUpdate = (updatedShared) => {
    setShared((prev) => prev.map((s) => (String(s._id) === String(updatedShared._id) ? updatedShared : s)));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Family Feed</h1>
          <p className="text-sm text-gray-500">View prompts shared to your family and reply together.</p>
        </div>

        <div>
          {loadingCircles ? (
            <div className="px-4 py-2 bg-white rounded shadow">Loading circles…</div>
          ) : circles.length === 0 ? (
            <div className="px-4 py-2 bg-yellow-50 text-yellow-700 rounded">You are not in any family circles yet.</div>
          ) : (
            <select
              value={selectedFamilyId || ""}
              onChange={(e) => setSelectedFamilyId(e.target.value)}
              className="border rounded px-3 py-2"
            >
              {circles.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      {!selectedFamilyId ? (
        <EmptyState title="Select a family to view the feed." subtitle="Pick a family from the dropdown to see prompts shared to that family and respond." />
      ) : loadingShared ? (
        <Loader />
      ) : shared.length === 0 ? (
        <EmptyState title="No shared prompts yet" subtitle="When someone shares a prompt and their answer, you'll see it here." />
      ) : (
        <div>
          {shared.map((s) => (
            <SharedPromptCard key={s._id} item={s} onReply={handleReplyUpdate} currentUser={user} />
          ))}
        </div>
      )}
    </div>
  );
}
