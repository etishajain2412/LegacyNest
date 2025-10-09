import React, { useState, useEffect } from "react";
import axiosInstance from "../utils/axiosInstance";
import io from "socket.io-client";
import CircleRoomPanel from "../components/CircleRoomPanel";

const socket = io("http://localhost:5000");

export default function FamilyRoom({ user }) {
  const [circles, setCircles] = useState([]);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserCircles();
  }, []);

  const fetchUserCircles = async () => {
    try {
      const res = await axiosInstance.get("/circles/my-circles");
      setCircles(res.data.circles);
    } catch (err) {
      console.error("Error fetching circles:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar: Family Circles List */}
      <aside className="w-72 bg-white border-r border-gray-200 p-4 flex flex-col">
        <h2 className="text-2xl font-serif font-bold mb-4 text-gray-900">
          👨‍👩‍👧 Family Circles
        </h2>

        {loading ? (
          <p className="text-gray-500">Loading circles...</p>
        ) : circles.length === 0 ? (
          <p className="text-gray-500 text-sm">You are not part of any circles.</p>
        ) : (
          <ul className="space-y-2 overflow-y-auto flex-grow">
            {circles.map((circle) => (
              <li
                key={circle._id}
                onClick={() => setSelectedCircle(circle)}
                className={`p-3 rounded-lg cursor-pointer border ${
                  selectedCircle?._id === circle._id
                    ? "bg-blue-100 border-blue-400"
                    : "hover:bg-gray-100 border-gray-200"
                }`}
              >
                <h4 className="font-semibold text-gray-900">{circle.name}</h4>
                <p className="text-xs text-gray-600 line-clamp-1">
                  {circle.description || "No description"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main Room Section */}
      <main className="flex-grow p-6 overflow-y-auto">
        {selectedCircle ? (
          <CircleRoomPanel
            circle={selectedCircle}
            user={user}
            socket={socket}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 italic">
            Select a family circle to open its room.
          </div>
        )}
      </main>
    </div>
  );
}
