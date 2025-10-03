import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function ViewStory({ user }) {
  const { id } = useParams();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchStory() {
      try {
        const res = await fetch(`http://localhost:5000/api/stories/${id}`);
        const data = await res.json();
        if (data.success) {
          setStory(data.story);
        } else {
          alert("Story not found.");
          navigate("/timeline");
        }
      } catch (err) {
        console.error(err);
        alert("Error fetching story.");
        navigate("/timeline");
      } finally {
        setLoading(false);
      }
    }

    fetchStory();
  }, [id, navigate]);

  if (loading) return <p>Loading...</p>;
  if (!story) return null;

  return (
    <div className="px-6 py-10 max-w-3xl mx-auto border-2 mt-15">
      <h2 className="text-3xl font-bold mb-4 font-serif">{story.title}</h2>
      <p className="text-gray-500 mb-4">By {story.userId?.name || "Unknown"}</p>
      <p className="text-gray-600 mb-4">
        {new Date(story.date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}
      </p>

      {story.mediaType === "text" && <p>{story.content}</p>}
      {story.mediaType === "photo" && story.mediaUrl && (
        <img
          src={story.mediaUrl}
          alt={story.title}
          className="rounded-lg w-full max-h-96 object-cover"
        />
      )}
      {story.mediaType === "video" && story.mediaUrl && (
        <video controls className="w-full rounded-lg max-h-96 mt-4">
          <source src={story.mediaUrl} type="video/mp4" />
        </video>
      )}
      {story.mediaType === "audio" && story.mediaUrl && (
        <audio controls className="w-full mt-4">
          <source src={story.mediaUrl} type="audio/mpeg" />
        </audio>
      )}

      {story.tags?.length > 0 && (
        <p className="mt-4 text-sm text-gray-600">Tags: {story.tags.join(", ")}</p>
      )}

      <div className="mt-6 flex gap-4">
        <button
          onClick={() => navigate(`/stories/edit/${story._id}`)}
          className="px-4 py-2 bg-gray-900 text-white rounded"
        >
          Edit
        </button>
        <button
          onClick={() => navigate("/timeline")}
          className="px-4 py-2 bg-gray-300 rounded"
        >
          Back
        </button>
      </div>
    </div>
  );
}
