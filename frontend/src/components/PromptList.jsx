import { useEffect, useState } from "react";
import { fetchPrompts, createDynamicPrompt } from "../api/prompts";
import PromptItem from "./PromptItem";
import socket from "../utils/socket";

const PromptList = () => {
  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadPrompts();

    // Realtime new prompts delivered by backend
    socket.on("prompt:new", (data) => {
      // if server sends the full instance object
      setPrompts((prev) => [data, ...prev]);
    });

    // when a prompt is skipped or responded, server may emit events
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
    // remove skipped prompt from UI (backend also marks skipped)
    setPrompts((prev) => prev.filter((p) => p._id !== id));
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      // call the backend to create a dynamic prompt
      const res = await createDynamicPrompt();
      if (res && res.instance) {
        // prepend the returned instance
        setPrompts((prev) => [res.instance, ...prev]);
      } else {
        // fallback: reload list
        await loadPrompts();
      }
    } catch (err) {
      console.error("Error generating new prompt:", err);
      // show toast / UI feedback if you have one
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      {/* Top control bar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Memory Prompts</h2>
        <div>
          <button
            className="px-4 py-2 bg-[#7b1b1b] text-white rounded mr-2"
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
          <PromptItem key={p._id} prompt={p} onRespond={handleRespond} onSkip={handleSkip} />
        ))
      )}
    </div>
  );
};

export default PromptList;
