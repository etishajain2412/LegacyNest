import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Cookies from "js-cookie";
import axiosInstance from "../utils/axiosInstance";
import { Users, Globe, Lock, Home, Filter, Loader2 } from "lucide-react";

const FeedPage = ({ user }) => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState("all");
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (user?.id) {
      fetchFeedStories();
    }
  }, [user, filter]);

  useEffect(() => {
    const urlFilter = searchParams.get("filter");
    if (urlFilter && ["all", "public", "family"].includes(urlFilter)) {
      setFilter(urlFilter);
    }
  }, [searchParams]);


  const fetchFeedStories = async () => {
    setLoading(true);
    try {
      const token = Cookies.get("accessToken");

      const endpoints = {
        all: "/stories/feed/all",
        public: "/stories/feed/public",
        family: "/stories/feed/family",
      };

      const endpoint = endpoints[filter] || endpoints.all;

      const { data } = await axiosInstance.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const feedStories = Array.isArray(data) ? data : data.stories || [];

      setStories(feedStories);

      if (filter === "all") {
        setStats(computeStats(feedStories));
      } else if (!stats) {
        const { data: allData } = await axiosInstance.get(endpoints.all, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allStories = Array.isArray(allData) ? allData : allData.stories || [];
        setStats(computeStats(allStories));
      }
    } catch (error) {
      console.error("Error fetching feed stories:", error);
      setStories([]);
    } finally {
      setLoading(false);
    }
  };


  const computeStats = (stories) => {
    const publicCount = stories.filter((s) => s.visibility === "public").length;
    const familyCount = stories.filter((s) => s.visibility === "family").length;
    const privateCount = stories.filter((s) => s.visibility === "private").length;
    return {
      public: publicCount,
      family: familyCount,
      private: privateCount,
      total: stories.length,
    };
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setSearchParams({ filter: newFilter });
  };

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case "public":
        return <Globe className="w-4 h-4 text-gray-800" />;
      case "family":
        return <Users className="w-4 h-4 text-gray-800" />;
      case "private":
        return <Lock className="w-4 h-4 text-gray-800" />;
      default:
        return <Globe className="w-4 h-4 text-gray-800" />;
    }
  };

  const getVisibilityColor = (visibility) => {
    return "bg-gray-100 text-gray-900 border-gray-300";
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Home className="w-8 h-8 text-gray-800" />
              Story Feed
            </h1>
            <p className="text-gray-500">
              Discover stories from your network and community
            </p>
          </div>

          <div className="flex gap-4 mt-4 sm:mt-0">
            <Link
              to="/timeline"
              className="flex items-center gap-2 bg-black hover:bg-gray-800 text-white font-medium py-2 px-6 rounded-lg transition"
            >
              My Stories
            </Link>
            <Link
              to="/upload"
              className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white font-medium py-2 px-6 rounded-lg transition"
            >
              Upload New Story
            </Link>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            {stats && (
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <Globe className="w-4 h-4 text-gray-800" />
                  <span className="text-sm font-medium text-gray-800">
                    {stats.public} Public
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <Users className="w-4 h-4 text-gray-800" />
                  <span className="text-sm font-medium text-gray-800">
                    {stats.family} Family
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <Lock className="w-4 h-4 text-gray-800" />
                  <span className="text-sm font-medium text-gray-800">
                    {stats.private} Private
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
                  <span className="text-sm font-medium text-gray-800">
                    {stats.total} Total
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleFilterChange("all")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                  filter === "all"
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                <Filter className="w-4 h-4" />
                All Stories
              </button>
              <button
                onClick={() => handleFilterChange("public")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                  filter === "public"
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                <Globe className="w-4 h-4" />
                Public
              </button>
              <button
                onClick={() => handleFilterChange("family")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                  filter === "family"
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                }`}
              >
                <Users className="w-4 h-4" />
                Family
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          {loading ? (
            <div className="flex flex-col items-center py-12">
              <Loader2 className="animate-spin w-12 h-12 text-gray-800" />
              <p className="text-gray-600 mt-4">Loading stories...</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">No Stories Found</h3>
              <p className="text-gray-600 mb-6">
                {filter === "all"
                  ? "There are no stories to display in your feed yet."
                  : `No ${filter} stories available.`}
              </p>
              <Link
                to="/upload"
                className="bg-black hover:bg-gray-800 text-white font-medium py-3 px-8 rounded-lg transition"
              >
                Upload Your First Story
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {stories.map((story) => (
                <div
                  key={story._id}
                  className="bg-gray-50 rounded-xl p-6 border border-gray-200 hover:border-gray-400 transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-gray-800 font-semibold text-sm">
                          {story.userId?.name?.charAt(0)?.toUpperCase() || "U"}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {story.userId?.name || "Unknown User"}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {story.userId?.username || ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getVisibilityColor(
                          story.visibility
                        )}`}
                      >
                        {getVisibilityIcon(story.visibility)}
                        <span className="capitalize">{story.visibility}</span>
                      </div>
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 border border-gray-300">
                        {story.mediaType}
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-xl font-semibold mb-2">
                      {story.title}
                    </h3>

                    {story.content && (
                      <p className="text-gray-600 mb-3 line-clamp-3">
                        {story.content}
                      </p>
                    )}

                    <p className="text-sm text-gray-500 mb-3">
                      {new Date(story.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>

                  {story.mediaUrl && (
                    <div className="mb-4">
                      {story.mediaType === "photo" && (
                        <img
                          src={story.mediaUrl}
                          alt={story.title}
                          className="w-full max-w-md h-48 object-cover rounded-lg grayscale"
                        />
                      )}
                      {story.mediaType === "video" && (
                        <video
                          controls
                          className="w-full max-w-md h-48 rounded-lg"
                        >
                          <source src={story.mediaUrl} type="video/mp4" />
                        </video>
                      )}
                      {story.mediaType === "audio" && (
                        <div className="w-full max-w-md">
                          <audio controls className="w-full">
                            <source src={story.mediaUrl} type="audio/mpeg" />
                          </audio>
                        </div>
                      )}
                    </div>
                  )}

                  {story.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {story.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 rounded bg-white border border-gray-300 text-xs text-gray-600"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500">
                      Created {new Date(story.createdAt).toLocaleDateString()}
                    </span>
                    {story.userId?._id === user?.id && (
                      <span className="text-xs text-black font-medium">
                        Your Story
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
