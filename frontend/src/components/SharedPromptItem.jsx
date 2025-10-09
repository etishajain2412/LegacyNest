import { useState } from "react";
import axios from "axios";

const API = axios.create({ baseURL: "http://localhost:5000/api", withCredentials: true });

function SharedPromptItem({ sharedPrompt }) {
  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(false);

  const loadReplies = async () => {
    const res = await API.get(`/shared-prompts/${sharedPrompt._id}/replies`);
    setReplies(res.data.replies || []);
    setShowReplies(true);
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setLoading(true);
    try {
      const res = await API.post(`/shared-prompts/${sharedPrompt._id}/reply`, { text: replyText });
      setReplies(prev => [...prev, res.data.story]);
      setReplyText("");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border p-4 mb-4 rounded">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{sharedPrompt.title}</div>
          <div className="text-sm text-gray-600">{sharedPrompt.promptText}</div>
          <div className="text-xs text-muted mt-2">Shared by {sharedPrompt.sharedBy?.name || "Someone"} • {new Date(sharedPrompt.sharedAt).toLocaleString()}</div>
        </div>
        <div className="text-sm text-muted">{sharedPrompt.repliesCount || 0} replies</div>
      </div>

      <div className="mt-3">
        <button className="text-sm text-primary mr-3" onClick={loadReplies}>View replies</button>
      </div>

      {showReplies && (
        <div className="mt-3">
          {replies.map(r => (
            <div key={r._id} className="border rounded p-2 mb-2">
              <div className="text-sm font-medium">{r.userId?.name || "Unknown"}</div>
              <div>{r.content}</div>
            </div>
          ))}

          <textarea className="w-full border p-2 rounded" value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Write a reply..." />
          <div className="mt-2">
            <button onClick={handleReply} disabled={loading} className="px-3 py-2 bg-[#7b1b1b] text-white rounded">
              {loading ? "Replying..." : "Reply"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SharedPromptItem;
