import { useEffect, useState } from "react";
import axios from "axios";
import socket from "../utils/socket";
import SharedPromptItem from "../components/SharedPromptItem";

const API = axios.create({ baseURL: "http://localhost:5000/api", withCredentials: true });

function FamilyFeed({ familyId }) {
  const [feed, setFeed] = useState([]);

  useEffect(() => {
    let mounted = true;
    API.get(`/shared-prompts/family/${familyId}/feed`).then(res => {
      if (mounted) setFeed(res.data);
    }).catch(console.error);

    socket.on("sharedPrompt:new", data => {
      if (data.sharedPrompt.familyId === familyId) {
        setFeed(prev => [data.sharedPrompt, ...prev]);
      }
    });

    socket.on("sharedPrompt:reply", ({ sharedPromptId, story }) => {
      setFeed(prev => prev.map(s => s._id === sharedPromptId ? { ...s, repliesCount: (s.repliesCount || 0) + 1 } : s));
    });

    return () => {
      mounted = false;
      socket.off("sharedPrompt:new");
      socket.off("sharedPrompt:reply");
    };
  }, [familyId]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Family Feed</h1>
      {feed.map(sp => <SharedPromptItem key={sp._id} sharedPrompt={sp} />)}
    </div>
  );
}

export default FamilyFeed;
