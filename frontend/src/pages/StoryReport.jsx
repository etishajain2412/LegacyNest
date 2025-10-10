import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance"; // ✅ use centralized instance

export default function StoryReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [story, setStory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStory = async () => {
      try {
        setLoading(true);
        const { data } = await axiosInstance.get(`/stories/${id}`);
        if (data.success) {
          setStory(data.story);
        } else {
          alert("Story not found");
          navigate(-1);
        }
      } catch (err) {
        console.error("Error fetching story:", err);
        alert("Error fetching story");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };

    fetchStory();
  }, [id, navigate]);

  if (loading) return <p className="text-center mt-10">Loading...</p>;
  if (!story) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="bg-white shadow-lg rounded-xl p-6 border-black border-2">
        <h2 className="text-2xl font-bold mb-2 font-serif">{story.title}</h2>
        <p className="text-gray-500 mb-4">By {story.userId?.name || "Unknown"}</p>

        {story.mediaType === "text" && (
          <p className="text-gray-700 mb-4">{story.content}</p>
        )}

        {story.mediaType === "photo" && story.mediaUrl && (
          <img
            src={story.mediaUrl}
            alt={story.title}
            className="rounded-xl w-full max-h-96 object-cover mb-4"
          />
        )}

        {story.mediaType === "video" && story.mediaUrl && (
          <video controls className="w-full rounded-xl max-h-96 mb-4">
            <source src={story.mediaUrl} type="video/mp4" />
          </video>
        )}

        {story.mediaType === "audio" && story.mediaUrl && (
          <audio controls className="w-full mb-4">
            <source src={story.mediaUrl} type="audio/mpeg" />
          </audio>
        )}

        {story.aiAnalysis && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
            <p className="mb-2 text-gray-700">
              <span className="font-semibold">Summary:</span>{" "}
              {story.aiAnalysis.summary}
            </p>
            <p className="mb-2 text-gray-700">
              <span className="font-semibold">Category:</span>{" "}
              {story.aiAnalysis.category}
            </p>
            {story.aiAnalysis.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {story.aiAnalysis.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
