import { useState, useEffect } from "react";
import { respondToPrompt, skipPrompt } from "../api/prompts";
import { sharePrompt } from "../api/sharedPrompts";
import { fetchMyCircles } from "../api/families"; // you'll create this small helper if not done yet

/**
 * Props:
 *  - prompt: PromptInstance object from API
 *  - onRespond(updatedInstance): callback to update parent state when responded
 *  - onSkip(promptId): callback when prompt skipped
 *  - familyId (optional): id of the family to share to (if missing, we fetch user's circles)
 */
const PromptItem = ({ prompt, onRespond, onSkip, familyId: propFamilyId }) => {
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [familyId, setFamilyId] = useState(propFamilyId || "");
  const [families, setFamilies] = useState([]);

  // 🔹 If no familyId provided by parent, fetch user's circles
  useEffect(() => {
    async function loadFamilies() {
      if (propFamilyId) return; // parent already passed one
      try {
        const res = await fetchMyCircles();
        const myCircles = res.data?.circles || res.data || [];
        setFamilies(myCircles);
        if (myCircles.length) setFamilyId(myCircles[0]._id);
      } catch (err) {
        console.error("Error fetching user circles:", err);
      }
    }
    loadFamilies();
  }, [propFamilyId]);

  // ✅ Handle responding to a prompt
  const handleRespond = async () => {
    if (!response.trim()) return;
    setLoading(true);
    try {
      const res = await respondToPrompt(prompt._id, { text: response });
      const updatedInstance = res.instance ?? res;
      onRespond?.(updatedInstance);
      setResponse("");
    } catch (err) {
      console.error("Error responding:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle skipping a prompt
  const handleSkip = async () => {
    setLoading(true);
    try {
      await skipPrompt(prompt._id);
      onSkip?.(prompt._id);
    } catch (err) {
      console.error("Error skipping prompt:", err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Handle sharing a prompt to family
  const handleShare = async () => {
    const targetFamilyId = propFamilyId || familyId || prompt.familyId;
    if (!targetFamilyId) {
      console.error("No familyId available to share the prompt.");
      alert("Please select a family before sharing.");
      return;
    }

    setSharing(true);
    try {
      await sharePrompt({ promptInstanceId: prompt._id, familyId: targetFamilyId });
      setShared(true);
    } catch (err) {
      console.error("Error sharing prompt:", err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="border p-4 rounded-lg mb-4 bg-white shadow">
      <h3 className="font-bold text-lg mb-2">{prompt.promptText}</h3>

      {prompt.status === "responded" ? (
        <div className="space-y-2">
          <p className="text-green-600">✅ Responded</p>

          {!shared ? (
            <div className="mt-3">
              {/* Family selector if no propFamilyId */}
              {!propFamilyId && families.length > 0 && (
                <div className="mb-2">
                  <label className="text-sm font-medium mr-2">Select Family:</label>
                  <select
                    value={familyId}
                    onChange={(e) => setFamilyId(e.target.value)}
                    className="border rounded p-1"
                  >
                    {families.map((fam) => (
                      <option key={fam._id} value={fam._id}>
                        {fam.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                className="mt-2 px-4 py-2 bg-[#7b1b1b] text-white rounded"
                onClick={handleShare}
                disabled={sharing}
              >
                {sharing ? "Sharing..." : "Share to Family"}
              </button>
              <p className="text-sm text-gray-500 mt-1">
                Share this answered prompt with your family so they can reply too.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">📤 Shared to family</p>
          )}
        </div>
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
