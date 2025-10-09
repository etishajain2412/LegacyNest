import React, { useState, useEffect } from "react";

export default function CircleRoomPanel({ circle, user, socket }) {
  const [notifications, setNotifications] = useState([]);
  const [editingStory, setEditingStory] = useState(null);

  useEffect(() => {
    socket.emit("joinFamilyCircle", {
      familyCircleId: circle._id,
      userId: user._id,
      userName: user.name,
    });

    socket.on("circleNotification", (data) => {
      setNotifications((prev) => [
        ...prev,
        { id: Date.now(), message: data.message, type: data.type },
      ]);
    });

    return () => {
      socket.off("circleNotification");
    };
  }, [circle._id, user, socket]);

  // Handle start/stop editing
  const startEditing = (storyTitle) => {
    setEditingStory(storyTitle);
    socket.emit("startEditingStory", {
      familyCircleId: circle._id,
      storyTitle,
      userName: user.name,
    });
  };

  const stopEditing = (storyTitle) => {
    setEditingStory(null);
    socket.emit("stopEditingStory", {
      familyCircleId: circle._id,
      storyTitle,
      userName: user.name,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <h2 className="text-2xl font-bold font-serif text-gray-900 mb-1">
        🏠 {circle.name}
      </h2>
      <p className="text-gray-600 mb-4 italic">
        {circle.description || "No description available."}
      </p>

      {/* Activity Feed */}
      <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-48 overflow-y-auto">
        <h4 className="font-semibold text-gray-800 mb-2">Live Activity</h4>
        {notifications.length === 0 ? (
          <p className="text-gray-500 text-sm">No activity yet...</p>
        ) : (
          notifications.map((note) => (
            <div
              key={note.id}
              className={`text-sm mb-1 ${
                note.type === "edit"
                  ? "text-yellow-700"
                  : note.type === "edit-stop"
                  ? "text-green-700"
                  : "text-blue-700"
              }`}
            >
              {note.message}
            </div>
          ))
        )}
      </div>

      {/* Simulated Editing Buttons */}
      <div className="mb-6">
        {!editingStory ? (
          <button
            onClick={() => startEditing("Family Summer Trip")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            ✏️ Start Editing “Family Summer Trip”
          </button>
        ) : (
          <button
            onClick={() => stopEditing(editingStory)}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            ✅ Stop Editing
          </button>
        )}
      </div>

      {/* Members */}
      <div>
        <h4 className="font-semibold text-gray-800 mb-2">Members</h4>
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {circle.members.map((member) => (
            <li
              key={member.user._id}
              className="border border-gray-200 rounded-lg p-2 bg-gray-50 flex justify-between items-center"
            >
              <span className="text-sm font-medium text-gray-800">
                {member.user.name}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  member.role === "admin"
                    ? "bg-blue-100 text-blue-700"
                    : member.role === "contributor"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {member.role}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
