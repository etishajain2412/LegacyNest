import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function EditStory({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [story, setStory] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [date, setDate] = useState("");
  const [mediaType, setMediaType] = useState("text");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const API_URL =
    import.meta.env.VITE_MODE === "production"
      ? import.meta.env.VITE_BACKEND_URL
      : "http://localhost:5000";

  useEffect(() => {
    async function fetchStory() {
      try {
        const res = await fetch(`${API_URL}/api/stories/${id}`,{
            credentials: 'include'
        });
        const data = await res.json();

        if (data.success) {
          const s = data.story;
          setStory(s);
          setTitle(s.title);
          setContent(s.content);
          setDate(new Date(s.date).toISOString().split("T")[0]);
          setMediaType(s.mediaType);
          setTags((s.aiAnalysis?.tags || []).join(", "));
        } else {
          alert("Story not found");
          navigate("/timeline");
        }
      } catch (err) {
        console.error("Error fetching story:", err);
        alert("Error fetching story");
        navigate("/timeline");
      } finally {
        setLoading(false);
      }
    }

    fetchStory();
  }, [id, navigate, API_URL]);

  async function handleUpdate(e) {
    e.preventDefault();
    setUpdating(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("content", content);
      formData.append("date", date);
      formData.append("mediaType", mediaType);

      if (file) formData.append("file", file);

      formData.append(
        "aiAnalysis[tags]",
        JSON.stringify(tags.split(",").map((t) => t.trim()))
      );

      const res = await fetch(`${API_URL}/api/stories/${id}`, {
        method: "PUT",
        body: formData,
        credentials: 'include'
      });

      const data = await res.json();
      if (data.success) {
        alert("Story updated successfully");
        navigate(`/timeline`);
      } else {
        alert("Failed to update story");
      }
    } catch (err) {
      console.error("Error updating story:", err);
      alert("Error updating story");
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <p>Loading...</p>;
  if (!story) return null;

  return (
    <div className="px-6 py-10 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 font-serif">Edit Story</h2>

      <form onSubmit={handleUpdate} className="flex flex-col gap-4">
        <input
          type="text"
          className="border px-4 py-2 rounded"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          required
        />

        <select
          value={mediaType}
          onChange={(e) => setMediaType(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="text">Text</option>
          <option value="photo">Photo</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
        </select>

        {mediaType === "text" && (
          <textarea
            className="border px-4 py-2 rounded"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Content"
            rows={5}
            required
          />
        )}

        {["photo", "video", "audio"].includes(mediaType) && (
          <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-200 hover:bg-gray-200 transition w-full text-center">
            <span className="text-gray-500">
              {file
                ? file.name
                : `Drag & drop a ${mediaType} or click to select`}
            </span>
            <input
              type="file"
              accept={
                mediaType === "photo"
                  ? "image/*"
                  : mediaType === "video"
                  ? "video/*"
                  : "audio/*"
              }
              onChange={(e) => setFile(e.target.files[0])}
              className="hidden"
            />
          </label>
        )}

        <input
          type="date"
          className="border px-4 py-2 rounded"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />

        <input
          type="text"
          className="border px-4 py-2 rounded"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="Tags (comma separated)"
        />

        <div className="flex gap-4 mt-4">
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white rounded"
            disabled={updating}
          >
            {updating ? "Updating..." : "Update"}
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-gray-300 rounded"
            onClick={() => navigate("/timeline")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
