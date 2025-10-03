// pages/Stories.jsx
import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Cookies from "js-cookie";
import axiosInstance from "../utils/axiosInstance";
import { Trash2, Loader2, PlusCircle } from "lucide-react";

const Stories = ({ user }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const view = searchParams.get("view");

  // delete modal state
  const [deleteModal, setDeleteModal] = useState({ open: false, storyId: null });

  useEffect(() => {
    if (user?.id) {
      fetchStories();
    }
  }, [user, view]);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const token = Cookies.get("accessToken");

      const { data } = await axiosInstance.get(`/stories/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStories(data.stories || []);
    } catch (error) {
      console.error("Error fetching stories:", error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteStory = async () => {
    try {
      const token = Cookies.get("accessToken");

      const { data } = await axiosInstance.delete(
        `/stories/${deleteModal.storyId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (data.success) {
        fetchStories();
      } else {
        throw new Error(data.error || "Failed to delete story");
      }
    } catch (error) {
      console.error("Error deleting story:", error);
      alert("Failed to delete story");
    } finally {
      setDeleteModal({ open: false, storyId: null });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">My Stories</h1>
            <p className="text-gray-600">
              Your personal stories and memories
            </p>
          </div>

          <div className="flex gap-4 mt-4 sm:mt-0">
            <Link
              to="/upload"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-6 rounded-lg transition"
            >
              <PlusCircle className="w-5 h-5" />
              Upload New Story
            </Link>
          </div>
        </div>

        {/* Stories List */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="animate-spin w-12 h-12 text-indigo-600" />
              <p className="text-gray-600 mt-4">Loading stories...</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                No Stories Yet
              </h3>
              <p className="text-gray-600 mb-6">
                Start preserving your memories by uploading your first story.
              </p>
              <Link
                to="/upload"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-8 rounded-lg transition"
              >
                Upload Your First Story
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stories.map((story) => (
                <div
                  key={story._id}
                  className="bg-gray-50 rounded-xl p-6 border hover:border-indigo-300 transition"
                >
                  {/* Badges */}
                  <div className="flex justify-between items-start mb-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        story.mediaType === "photo"
                          ? "bg-blue-100 text-blue-800"
                          : story.mediaType === "video"
                          ? "bg-purple-100 text-purple-800"
                          : story.mediaType === "audio"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {story.mediaType}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        story.visibility === "public"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {story.visibility === "public" ? "Public" : "Private"}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                    {story.title}
                  </h3>

                  {/* Date */}
                  <p className="text-sm text-gray-600 mb-3">
                    {new Date(story.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>

                  {/* Media Preview */}
                  {story.mediaUrl && (
                    <div className="mb-4">
                      {story.mediaType === "photo" && (
                        <img
                          src={story.mediaUrl}
                          alt={story.title}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      {story.mediaType === "video" && (
                        <video controls className="w-full h-32 rounded-lg">
                          <source src={story.mediaUrl} type="video/mp4" />
                        </video>
                      )}
                      {story.mediaType === "audio" && (
                        <audio controls className="w-full">
                          <source src={story.mediaUrl} type="audio/mpeg" />
                        </audio>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  {story.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {story.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded bg-white border text-xs text-gray-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-between items-center">
                    <button
                      onClick={() =>
                        setDeleteModal({ open: true, storyId: story._id })
                      }
                      className="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <span className="text-xs text-gray-500">
                      Created {new Date(story.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-96">
            <h2 className="text-lg font-semibold mb-4">
              Confirm Delete Story
            </h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this story? This action cannot be
              undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteModal({ open: false, storyId: null })}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={deleteStory}
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stories;
