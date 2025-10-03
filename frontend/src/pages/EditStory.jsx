import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function EditStory({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [story, setStory] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetchStory() {
      try {
        const res = await fetch(`http://localhost:5000/api/stories/${id}`);
        const data = await res.json();
        if (data.success) {
          setStory(data.story);
          setTitle(data.story.title);
          setContent(data.story.content);
          setTags(data.story.tags.join(", "));
        } else {
          alert("Story not found");
          navigate("/timeline");
        }
      } catch (err) {
        console.error(err);
        alert("Error fetching story");
        navigate("/timeline");
      } finally {
        setLoading(false);
      }
    }

    fetchStory();
  }, [id, navigate]);

  async function handleUpdate(e) {
    e.preventDefault();
    setUpdating(true);

    try {
      const res = await fetch(`http://localhost:5000/api/stories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          tags: tags.split(",").map(t => t.trim())
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Story updated successfully");
        navigate(`/stories/view/${id}`);
      } else {
        alert("Failed to update story");
      }
    } catch (err) {
      console.error(err);
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
          onChange={e => setTitle(e.target.value)}
          placeholder="Title"
          required
        />
        <textarea
          className="border px-4 py-2 rounded"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Content"
          rows={5}
        />
        <input
          type="text"
          className="border px-4 py-2 rounded"
          value={tags}
          onChange={e => setTags(e.target.value)}
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
            onClick={() => navigate(`/timeline`)}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
