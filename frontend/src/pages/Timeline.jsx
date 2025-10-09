import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import domtoimage from "dom-to-image-more";

export default function Timeline({ user }) {
  const [stories, setStories] = useState([]);
  const [view, setView] = useState("mine");
  const [loading, setLoading] = useState(false);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [exportMenu, setExportMenu] = useState(false);
  const navigate = useNavigate();

  const exportStories = (type) => {
    const filtered = stories.filter((s) => s.mediaType === type);

    if (filtered.length === 0) {
      alert(`No ${type} stories to export`);
      return;
    }

    if (["text"].includes(type)) {
      const textContent = filtered
        .map(
          (s) =>
            `Title: ${s.title}\nBy: ${s.userId?.name || "Unknown"}\n\n${s.content}\n\n---\n`
        )
        .join("\n");
      const blob = new Blob([textContent], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${type}_stories.txt`;
      link.click();
    } else {
      const urls = filtered.map(
        (s) => `${s.title} - ${s.mediaUrl || "No URL"}`
      );
      const blob = new Blob([urls.join("\n")], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${type}_stories_links.txt`;
      link.click();
    }
  };

  const exportAsPDF = async () => {
    const input = document.getElementById("timeline-content");
    if (!input) return;

    try {
      const scale = 2;
      const style = {
        transform: "scale(" + scale + ")",
        transformOrigin: "top left",
        width: input.offsetWidth + "px",
        height: input.offsetHeight + "px",
        background: "#ffffff",
      };

      const dataUrl = await domtoimage.toPng(input, {
        width: input.offsetWidth * scale,
        height: input.offsetHeight * scale,
        style,
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("timeline.pdf");
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    async function fetchStories() {
      try {
        setLoading(true);

        const url =
          view === "mine"
            ? `http://localhost:5000/api/stories/mine/${user.id}`
            : `http://localhost:5000/api/stories/`;

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

  async function handleDelete(id) {
    if (!window.confirm("Are you sure you want to delete this story?")) return;

    try {
      const res = await fetch(`http://localhost:5000/api/stories/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setStories((prev) => prev.filter((s) => s._id !== id));
      } else {
        alert("Failed to delete story.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting story.");
    }
  }

  return (
    <div className="relative flex flex-col items-center px-6 py-10 bg-gray-50 min-h-screen">
      <div className="relative w-full max-w-5xl mb-6">
        <h2 className="text-4xl font-serif font-bold text-center absolute left-1/2 transform -translate-x-1/2">
          Timeline
        </h2>

        <div className="absolute right-0 top-0">
          <button
            onClick={() => setExportMenu(!exportMenu)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg shadow hover:bg-gray-700"
          >
            Export Stories
          </button>

          {exportMenu && (
            <div className="absolute right-0 mt-10 w-48 bg-white rounded-lg shadow-lg z-30 border-black border-2">
              <button
                onClick={() => exportStories("text")}
                className="block w-full text-left px-4 py-2 border-black hover:bg-gray-100 border-t"
              >
                Export Text Stories
              </button>
              <button
                onClick={() => exportStories("photo")}
                className="block w-full text-left px-4 py-2 border-black hover:bg-gray-100 border-t"
              >
                Export Image Stories
              </button>
              <button
                onClick={() => exportStories("audio")}
                className="block w-full text-left px-4 py-2 border-black hover:bg-gray-100 border-t"
              >
                Export Audio Stories
              </button>
              <button
                onClick={() => exportStories("video")}
                className="block w-full text-left px-4 py-2 border-black hover:bg-gray-100 border-t"
              >
                Export Video Stories
              </button>
              <button
                onClick={exportAsPDF}
                className="block w-full text-left px-4 py-2 border-black hover:bg-gray-100 border-t"
              >
                Export as PDF Book
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 mt-11 flex gap-4">
        <button
          className={`px-4 py-2 rounded ${view === "mine" ? "bg-gray-900 text-white" : "bg-gray-200"
            }`}
          onClick={() => setView("mine")}
        >
          My Timeline
        </button>
        <button
          className={`px-4 py-2 rounded ${view === "family" ? "bg-gray-900 text-white" : "bg-gray-200"
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
        <div id="timeline-content" className="relative w-full max-w-5xl">
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
                  <div className="bg-white rounded-xl shadow-lg p-6 relative">
                    {view === "mine" && (
                      <div className="absolute top-4 right-4">
                        <button
                          className="text-gray-600 font-bold text-xl cursor-pointer"
                          onClick={() =>
                            setOpenMenuId(
                              openMenuId === story._id ? null : story._id
                            )
                          }
                        >
                          ⋮
                        </button>
                        {openMenuId === story._id && (
                          <div className="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border p-2 z-20">
                            <button
                              onClick={() =>
                                navigate(`/stories/view/${story._id}`)
                              }
                              className="block w-full text-left px-3 py-1 rounded hover:bg-gray-100"
                            >
                              View
                            </button>
                            <button
                              onClick={() =>
                                navigate(`/stories/edit/${story._id}`)
                              }
                              className="block w-full text-left px-3 py-1 rounded hover:bg-gray-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(story._id)}
                              className="block w-full text-left px-3 py-1 text-red-600 rounded hover:bg-gray-100"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}

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
                      </video>
                    )}
                    {story.mediaType === "audio" && story.mediaUrl && (
                      <audio controls className="mt-2 w-full">
                        <source src={story.mediaUrl} type="audio/mpeg" />
                      </audio>
                    )}
                    {story.aiAnalysis?.tags?.length > 0 && (
                      <p className="mt-2 text-sm text-gray-600">
                        Tags: {story.aiAnalysis.tags.join(", ")}
                      </p>
                    )}


                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => navigate(`/stories/ai/${story._id}`)}
                        className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg shadow hover:bg-blue-700 transition flex items-center gap-2"
                      >
                        <span>✨</span> Analyze Story
                      </button>
                    </div>
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
