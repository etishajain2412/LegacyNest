import { useState } from "react";
import { respondToPrompt, skipPrompt } from "../api/prompts";

const PromptItem = ({ prompt, onRespond, onSkip }) => {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRespond = async () => {
    if (!response.trim()) return;
    setLoading(true);
    try {
      const res = await respondToPrompt(prompt._id, { text: response });
      onRespond(res.instance);
      setResponse("");
    } catch (err) {
      console.error("Error responding:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    try {
      await skipPrompt(prompt._id);
      onSkip(prompt._id);
    } catch (err) {
      console.error("Error skipping prompt:", err);
    }
  };

  return (
    <div className="border p-4 rounded-lg mb-4 bg-white shadow">
      <h3 className="font-bold text-lg mb-2">{prompt.promptText}</h3>

      {prompt.status === "responded" ? (
        <p className="text-green-600">✅ Responded</p>
      ) : prompt.status === "skipped" ? (
        <p className="text-gray-500">⏭️ Skipped</p>
      ) : (
        <div>
          <textarea
            className="w-full border rounded p-2"
            placeholder="Write your memory..."
            value={response}
            onChange={(e) => setResponse(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded"
              onClick={handleRespond}
              disabled={loading}
            >
              {loading ? "Sending..." : "Respond"}
            </button>
            <button
              className="px-4 py-2 bg-gray-400 text-white rounded"
              onClick={handleSkip}
              disabled={loading}
            >
              Skip
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptItem;
