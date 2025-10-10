import { useEffect, useState } from "react";
import { fetchPrompts, createDynamicPrompt } from "../api/prompts";
import PromptItem from "./PromptItem";
import socket from "../utils/socket";

const PromptList = ({ familyId }) => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPrompts();

    socket.on("prompt:new", (data) => {
      setPrompts((prev) => [data, ...prev]);
    });

    socket.on("prompt:skipped", ({ promptId }) => {
      setPrompts((prev) => prev.filter((p) => p._id !== promptId));
    });

    socket.on("prompt:responded", ({ promptId, storyId }) => {
      setPrompts((prev) =>
        prev.map((p) => (p._id === promptId ? { ...p, status: "responded" } : p))
      );
    });

    return () => {
      socket.off("prompt:new");
      socket.off("prompt:skipped");
      socket.off("prompt:responded");
    };
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      const data = await fetchPrompts();
      setPrompts(data);
    } catch (err) {
      console.error("Error fetching prompts:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = (updatedInstance) => {
    setPrompts((prev) =>
      prev.map((p) => (p._id === updatedInstance._id ? updatedInstance : p))
    );
  };

  const handleSkip = (id) => {
    setPrompts((prev) => prev.filter((p) => p._id !== id));
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await createDynamicPrompt();
      if (res && res.instance) {
        setPrompts((prev) => [res.instance, ...prev]);
      } else {
        await loadPrompts();
      }
    } catch (err) {
      console.error("Error generating new prompt:", err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Memory Prompts</h2>
        <div>
          <button
            className="px-4 py-2 bg-gray-900 text-white rounded mr-2"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating…" : "Generate new prompt"}
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading prompts…</p>
      ) : prompts.length === 0 ? (
        <p>No prompts yet</p>
      ) : (
        prompts.map((p) => (
          <PromptItem key={p._id} prompt={p} onRespond={handleRespond} onSkip={handleSkip} familyId={familyId}/>
        ))
      )}
    </div>
  );
};

export default PromptList;
