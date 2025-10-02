import { useState } from "react";
import { useNavigate } from "react-router-dom";

function FrontPage() {
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <div className="min-h-screen text-black p-6">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-bold font-serif">LegacyNest</h1>

        <div className="flex items-center gap-4 relative">
          <p className="text-xl text-gray-800 font-serif">Welcome back, Test User</p>

          <div className="relative">
            <img
              src="https://i.pravatar.cc/40"
              alt="Profile"
              className="w-10 h-10 rounded-full border-2 border-gray-300 cursor-pointer"
              onClick={toggleDropdown}
            />

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-40 bg-white shadow-lg rounded  p-2 z-10">
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
                <p className="p-2 hover:bg-gray-100 border-1 cursor-pointer">Logout</p>
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
      </div>
    </div>
  );
}

export default FrontPage;
