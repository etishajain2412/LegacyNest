import { useState } from "react";
import { useNavigate } from "react-router-dom";

function FrontPage({ user }) {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const recentlyAddedPosts = [
    {
      id: 1,
      title: "Autumn Collection",
      description: "Warm hues and cozy fabrics for the season.",
      image:
        "https://i.pinimg.com/736x/99/86/2c/99862c0e0662aa2efa0114dca43a16c4.jpg",
      tags: ["fall", "fashion", "warm", "seasonal"],
    },
    {
      id: 2,
      title: "Summer Collection",
      description: "Bright colors and light textures.",
      image:
        "https://i.pinimg.com/736x/29/dc/22/29dc22bcba28ac2d5acbbafdd2642c54.jpg",
      tags: ["summer", "light", "beach", "vibrant"],
    },
    {
      id: 3,
      title: "Museum Art in Your Home",
      description: "Poster art for every mood.",
      image:
        "https://i.pinimg.com/1200x/57/9f/64/579f64ef67cef27fa1eab073b54ba403.jpg",
      tags: ["art", "poster", "museum", "decor"],
    },
    {
      id: 1,
      title: "Autumn Collection",
      description: "Warm hues and cozy fabrics for the season.",
      image:
        "https://i.pinimg.com/736x/99/86/2c/99862c0e0662aa2efa0114dca43a16c4.jpg",
      tags: ["fall", "fashion", "warm", "seasonal"],
    },
    {
      id: 2,
      title: "Summer Collection",
      description: "Bright colors and light textures.",
      image:
        "https://i.pinimg.com/736x/29/dc/22/29dc22bcba28ac2d5acbbafdd2642c54.jpg",
      tags: ["summer", "light", "beach", "vibrant"],
    },
    {
      id: 3,
      title: "Museum Art in Your Home",
      description: "Poster art for every mood.",
      image:
        "https://i.pinimg.com/1200x/57/9f/64/579f64ef67cef27fa1eab073b54ba403.jpg",
      tags: ["art", "poster", "museum", "decor"],
    },
  ];

  const filteredPosts = recentlyAddedPosts.filter((post) => {
    const query = searchQuery.toLowerCase();
    const inTitle = post.title.toLowerCase().includes(query);
    const inTags = post.tags.some((tag) => tag.toLowerCase().includes(query));
    return inTitle || inTags;
  });

  return (
    <div className="min-h-screen text-black p-6">
      <div className="flex justify-between items-center mb-10 border-2 p-4">
        <h1 className="text-4xl font-bold font-serif">LegacyNest</h1>

        <div className="flex items-center gap-4 relative">
          <p className="text-xl text-gray-800 font-serif">
            Welcome back, {user.name}
          </p>

          <div className="relative">
            <img
              src={user.avatar || "https://i.pravatar.cc/40"}
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-gray-300 cursor-pointer"
              onClick={toggleDropdown}
            />

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded p-2 z-10">
                <p
                  className="p-2 hover:bg-gray-100 border-1 cursor-pointer"
                  onClick={() => navigate("/profile")}
                >
                  Profile
                </p>
                <p
                  className="p-2 hover:bg-gray-100 border-1 cursor-pointer"
                  onClick={() => navigate("/settings")}
                >
                  Settings
                </p>
                <p className="p-2 hover:bg-gray-100 border-1 cursor-pointer">
                  Logout
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
        <div
          onClick={() => navigate("/timeline")}
          className="p-6 border-2 shadow cursor-pointer text-center transition"
        >
          <img
            src="https://i.pinimg.com/736x/d7/ac/53/d7ac537e41fb328cc7c09a48f8c77c5a.jpg"
            alt="Recent"
            className="w-full h-40 object-cover rounded-t-lg mb-4"
          />
          <h2 className="font-semibold text-lg">Show My Timeline</h2>
          <p className="text-gray-400 text-sm">The latest updates.</p>
        </div>

        <div
          onClick={() => navigate("/upload")}
          className="p-6 border-2 shadow cursor-pointer text-center transition"
        >
          <img
            src="https://i.pinimg.com/1200x/58/81/ce/5881ce3a72ed1d557bb446daeb4b60b2.jpg"
            alt="Stories"
            className="w-full h-40 object-cover rounded-t-lg mb-4"
          />
          <h2 className="font-semibold text-lg">Create New Stories</h2>
          <p className="text-gray-400 text-sm">Discover new tales.</p>
        </div>

        <div
          onClick={() => navigate("/timeline")}
          className="p-6 border-2 shadow cursor-pointer text-center transition"
        >
          <img
            src="https://i.pinimg.com/736x/8d/84/22/8d842231a3b501d5c4f72f87e9b989b6.jpg"
            alt="Memories"
            className="w-full h-40 object-cover rounded-t-lg mb-4"
          />
          <h2 className="font-semibold text-lg">Memory Prompts</h2>
          <p className="text-gray-400 text-sm">Reflect on the past.</p>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-serif mb-4">Recently Added</h2>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search posts by title or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 border-2 rounded focus:outline-none focus:ring focus:border-gray-700"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {filteredPosts.length > 0 ? (
            filteredPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white border border-gray-200 shadow-sm rounded overflow-hidden hover:shadow-md transition cursor-pointer"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4 border-2">
                  <h3 className="text-lg font-semibold mb-2">{post.title}</h3>
                  <p className="text-gray-600 text-sm">{post.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-xs text-gray-500">
                    {post.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-gray-100 px-2 py-1 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center col-span-full">
              No posts match your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default FrontPage;
