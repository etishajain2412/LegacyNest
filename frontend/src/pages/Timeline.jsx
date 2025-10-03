import React, { useEffect, useState } from "react";

export default function Timeline({ user }) {
  const [stories, setStories] = useState([]);
  const [view, setView] = useState("mine"); 
  //view mine-> mine stories , family-> family stories
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return; 

    async function fetchStories() {
      try {
        setLoading(true);

        let url = "";
        if (view === "mine") {
          url = `http://localhost:5000/api/stories/mine/${user.id}`;
        } else if (view === "family") {
          url = `http://localhost:5000/api/stories/`;
        }

        const res = await fetch(url);
        const data = await res.json();

        if (data.success) {
          setStories(data.stories);
        } else {
          console.error("Failed to fetch stories", data);
          setStories([]);
        }
      } catch (err) {
        console.error("Error fetching stories:", err);
        setStories([]);
      } finally {
        setLoading(false);
      }
    }

    fetchStories();
  }, [view, user]);

  return (
    <div className="relative flex flex-col items-center px-6 py-10 bg-gray-50 min-h-screen">
      <h2 className="text-4xl font-serif font-bold mb-6">Timeline</h2>

      <div className="mb-6 flex gap-4">
        <button
          className={`px-4 py-2 rounded ${
            view === "mine" ? "bg-gray-900 text-white" : "bg-gray-200"
          }`}
          onClick={() => setView("mine")}
        >
          My Timeline
        </button>
        <button
          className={`px-4 py-2 rounded ${
            view === "family" ? "bg-gray-900 text-white" : "bg-gray-200"
          }`}
          onClick={() => setView("family")}
        >
          Family Timeline
        </button>
      </div>

      {loading ? (
        <p>Loading stories...</p>
      ) : stories.length === 0 ? (
        <p>No stories yet...</p>
      ) : (
        <div className="relative w-full max-w-5xl">
          <div className="absolute left-1/4 top-0 h-full w-1 bg-gray-700"></div>

          <div className="flex flex-col gap-16">
            {stories.map((story) => (
              <div key={story._id} className="relative flex items-start">
                <div className="w-1/4 pr-6 text-right">
                  <p className="text-2xl font-serif font-bold text-gray-700">
                    {new Date(story.date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="relative z-10 -ml-2">
                  <div className="w-5 h-5 bg-gray-800 border-4 border-white rounded-full shadow"></div>
                </div>

                <div className="w-3/4 pl-6">
                  <div className="bg-white rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold">{story.title}</h3>
                    <p className="text-gray-500 text-sm mb-3">
                      By {story.userId?.name || "Unknown"}
                    </p>

                    {story.mediaType === "text" && <p>{story.content}</p>}
                    {story.mediaType === "photo" && story.mediaUrl && (
                      <img
                        src={story.mediaUrl}
                        alt={story.title}
                        className="mt-2 rounded-xl w-full max-h-80 object-cover"
                      />
                    )}
                    {story.mediaType === "video" && story.mediaUrl && (
                      <video
                        controls
                        className="mt-2 w-full rounded-xl max-h-80 object-cover"
                      >
                        <source src={story.mediaUrl} type="video/mp4" />
                        Your browser does not support video.
                      </video>
                    )}
                    {story.mediaType === "audio" && story.mediaUrl && (
                      <audio controls className="mt-2 w-full">
                        <source src={story.mediaUrl} type="audio/mpeg" />
                        Your browser does not support audio.
                      </audio>
                    )}
                    {story.tags?.length > 0 && (
                      <p className="mt-2 text-sm text-gray-600">
                        Tags: {story.tags.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
