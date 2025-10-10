import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import axiosInstance from "../utils/axiosInstance";
import { Users, Loader2, PlusCircle, XCircle, Save } from "lucide-react";

// Determine backend URL dynamically
const BACKEND_URL =
  import.meta.env.MODE === "development"
    ? "http://localhost:5000"
    : import.meta.env.VITE_BACKEND_URL;

// Initialize socket connection
const socket = io(BACKEND_URL, {
  withCredentials: true,
  transports: ["websocket"],
});

export default function FamilyRoom({ user }) {
  const [families, setFamilies] = useState([]);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [stories, setStories] = useState([]);
  const [editingStory, setEditingStory] = useState(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [joinId, setJoinId] = useState("");
  const timeoutRef = useRef(null);

  // ---------------- Fetch Families ----------------
  useEffect(() => {
    const fetchFamilies = async () => {
      try {
        const res = await axiosInstance.get("/circles/my-circles");
        setFamilies(res.data.circles || []);
      } catch (err) {
        console.error("Error fetching families:", err);
      }
    };
    fetchFamilies();
  }, []);

  // ---------------- Fetch Stories ----------------
  const fetchStories = async (familyId) => {
    try {
      const res = await axiosInstance.get(`/collab-stories/circle/${familyId}`);
      setStories(res.data.stories);
    } catch (err) {
      console.error("Error fetching stories:", err);
    }
  };

  // ---------------- Select Family ----------------
  const handleSelectFamily = (family) => {
    setSelectedFamily(family);
    setEditingStory(null);
    fetchStories(family._id);
  };

  // ---------------- Create Story ----------------
  const handleCreateStory = async () => {
    if (!title.trim()) return;
    try {
      await axiosInstance.post("/collab-stories/create", {
        title,
        familyCircle: selectedFamily._id,
      });
      setTitle("");
      fetchStories(selectedFamily._id);
    } catch (err) {
      console.error("Error creating story:", err);
    }
  };

  // ---------------- Join Story ----------------
  const handleJoinStory = async () => {
    try {
      const res = await axiosInstance.get(`/collab-stories/${joinId}`);
      const story = res.data;
      if (story) {
        setEditingStory(story);
        setContent(story.content || "");
        socket.emit("joinStory", { storyId: story._id, userName: user.name });
      }
    } catch (err) {
      console.error("Error joining story:", err);
    }
  };

  // ---------------- Collaborative Editing ----------------
  const handleChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    // Emit real-time update
    socket.emit("updateStory", {
      storyId: editingStory._id,
      content: newContent,
    });

    // Auto-save with debounce
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => handleAutoSave(newContent), 1000);
  };

  const handleAutoSave = async (newContent) => {
    try {
      setSaving(true);
      await axiosInstance.put(`/collab-stories/${editingStory._id}`, {
        content: newContent,
      });
      socket.emit("stopEditingStory", {
        storyId: editingStory._id,
        userName: user.name,
      });
    } catch (err) {
      console.error("Error saving:", err);
    } finally {
      setSaving(false);
    }
  };

  // ---------------- Socket Listeners ----------------
  useEffect(() => {
    socket.on("storyUpdated", ({ content }) => {
      setContent(content);
    });

    socket.on("editingNotification", ({ userName, action }) => {
      setStatus(`${userName} ${action} editing`);
      setTimeout(() => setStatus(""), 3000);
    });

    return () => {
      socket.off("storyUpdated");
      socket.off("editingNotification");
    };
  }, []);

  // ---------------- UI ----------------
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 bg-gray-100 border-r p-4 overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-4 mt-12 font-serif">Family Circles</h2>
        {families.map((family) => (
          <div
            key={family._id}
            onClick={() => handleSelectFamily(family)}
            className={`p-3 mb-2 rounded-lg cursor-pointer ${
              selectedFamily?._id === family._id
                ? "bg-green-600 text-white"
                : "bg-white hover:bg-gray-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>{family.name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        {!selectedFamily ? (
          <p className="text-gray-500">Select a family to view stories</p>
        ) : !editingStory ? (
          <>
            <h1 className="text-2xl font-semibold mb-4">
              {selectedFamily.name} — Stories
            </h1>

            {/* Create or Join */}
            <div className="flex items-center gap-2 mb-6">
              <input
                placeholder="New story title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="border px-3 py-1 rounded-lg"
              />
              <button
                onClick={handleCreateStory}
                className="bg-green-600 text-white px-3 py-1 rounded-lg flex items-center gap-1"
              >
                <PlusCircle size={16} /> Create
              </button>

              <input
                placeholder="Enter Story ID..."
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                className="border px-3 py-1 rounded-lg ml-4"
              />
              <button
                onClick={handleJoinStory}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg"
              >
                Join
              </button>
            </div>

            {/* Story List */}
            {stories.length === 0 ? (
              <p>No stories yet.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4 ">
                {stories.map((story) => (
                  <div
                    key={story._id}
                    onClick={() => {
                      setEditingStory(story);
                      setContent(story.content || "");
                      socket.emit("joinStory", {
                        storyId: story._id,
                        userName: user.name,
                      });
                    }}
                    className="bg-white p-4 rounded-xl shadow cursor-pointer hover:shadow-md border-black border-2"
                  >
                    <h3 className="font-semibold text-lg">{story.title}</h3>
                    <p className="text-sm text-gray-500">
                      Created by {story.createdBy?.name || "Unknown"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          // Collaborative Editor
          <div className="bg-white p-5 rounded-2xl shadow relative">
            <button
              onClick={() => setEditingStory(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-red-500"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xl font-semibold text-gray-800">
                Editing: {editingStory.title}
              </h2>
              <div className="flex items-center gap-2 text-gray-600">
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                <span>{saving ? "Saving..." : "Saved"}</span>
              </div>
            </div>

            <textarea
              value={content}
              onChange={handleChange}
              className="w-full h-[70vh] border rounded-xl p-4 resize-none focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="Start writing collaboratively..."
            />

            {status && (
              <div className="text-center mt-3 text-sm text-green-600">
                {status}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
