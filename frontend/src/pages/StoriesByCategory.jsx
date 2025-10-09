import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function StoriesByCategory() {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchStories() {
      try {
        setLoading(true);
        const res = await fetch("http://localhost:5000/api/stories");
        const data = await res.json();
        if (data.success) setStories(data.stories);
        else alert("Failed to fetch stories");
      } catch (err) {
        console.error(err);
        alert("Error fetching stories");
      } finally {
        setLoading(false);
      }
    }
    fetchStories();
  }, []);

  // Group by category
  const categorizedStories = stories.reduce((acc, story) => {
    const category = story.aiAnalysis?.category || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(story);
    return acc;
  }, {});

  // Filter based on search
  const filteredStories = Object.keys(categorizedStories).reduce((acc, category) => {
    const filtered = categorizedStories[category].filter(
      (story) =>
        story.title.toLowerCase().includes(search.toLowerCase()) ||
        story.content?.toLowerCase().includes(search.toLowerCase()) ||
        story.aiAnalysis?.tags?.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
    );
    if (filtered.length > 0) acc[category] = filtered;
    return acc;
  }, {});

  if (loading) return <p className="text-center mt-10">Loading...</p>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold mb-6 text-center font-serif">Family Stories</h1>

      <input
        type="text"
        placeholder="Search categorized stories..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-2 mb-6 border-2 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {Object.keys(filteredStories).length === 0 && (
        <p className="text-center text-gray-500">No stories found.</p>
      )}

      {Object.entries(filteredStories).map(([category, storiesInCategory]) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-semibold mb-4 ">Category: {category}</h2>
          <div className="grid md:grid-cols-2 gap-6 ">
            {storiesInCategory.map((story) => (
              <div
                key={story._id}
                className="bg-white shadow-lg rounded-xl p-4 border border-black border-2 cursor-pointer hover:shadow-xl transition flex flex-col justify-between"
                style={{ height: "350px" }}
                onClick={() => navigate(`/stories/view/${story._id}`)}
              >
                <div>
                  <h3 className="text-xl font-bold mb-1 truncate">{story.title}</h3>
                  <p className="text-gray-500 mb-2 text-sm truncate">By {story.userId?.name || "Unknown"}</p>

                  {story.mediaType === "text" && (
                    <p className="text-gray-700 mb-2 overflow-hidden text-ellipsis" style={{ maxHeight: "100px" }}>
                      {story.content}
                    </p>
                  )}
                  {story.mediaType === "photo" && story.mediaUrl && (
                    <img
                      src={story.mediaUrl}
                      alt={story.title}
                      className="rounded-xl w-full max-h-32 object-cover mb-2"
                    />
                  )}
                  {story.mediaType === "video" && story.mediaUrl && (
                    <video controls className="w-full rounded-xl max-h-32 mb-2">
                      <source src={story.mediaUrl} type="video/mp4" />
                    </video>
                  )}
                  {story.mediaType === "audio" && story.mediaUrl && (
                    <audio controls className="w-full mb-2">
                      <source src={story.mediaUrl} type="audio/mpeg" />
                    </audio>
                  )}
                </div>

                {story.aiAnalysis?.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {story.aiAnalysis.tags.map((tag, i) => (
                      <span key={i} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
