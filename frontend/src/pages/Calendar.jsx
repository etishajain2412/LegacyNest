import React, { useState, useEffect } from "react";

export default function CalendarPage({ user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [message, setMessage] = useState("");
  const [visibility, setVisibility] = useState("me");
  const [pinnedEvents, setPinnedEvents] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (user && user._id) fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/calendar/${user.id}`);
      const data = await res.json();
      if (data.success) setPinnedEvents(data.events);
    } catch (err) {
      console.error("Error fetching events:", err);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handlePin = async () => {
    if (!selectedDate || !message.trim()) return;

    const newEvent = {
      userId: user.id,
      date: selectedDate.toDateString(),
      message,
      visibility,
    };
    console.log("Saving event:", newEvent);

    try {
      let res;
      if (editingId) {
        res = await fetch(`http://localhost:5000/api/calendar/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEvent),
        });
      } else {
        res = await fetch("http://localhost:5000/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newEvent),
        });
      }

      const data = await res.json();
      if (data.success) {
        fetchEvents();
        setMessage("");
        setSelectedDate(null);
        setEditingId(null);
      }
    } catch (err) {
      console.error("Error saving:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`http://localhost:5000/api/calendar/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) fetchEvents();
    } catch (err) {
      console.error("Error deleting:", err);
    }
  };

  const handleEdit = (event) => {
    setSelectedDate(new Date(event.date));
    setMessage(event.message);
    setVisibility(event.visibility);
    setEditingId(event._id);
  };

  const getEventsForDay = (day) => {
    const dateStr = new Date(year, month, day).toDateString();
    return pinnedEvents.filter((e) => e.date === dateStr);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col items-center py-10 px-6">
      <h1 className="text-3xl font-serif font-bold text-gray-800 mb-8">My Calendar</h1>

      <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-5xl border-2 border-black">
        <div className="flex justify-between items-center mb-6">
          <button onClick={handlePrevMonth} className="text-gray-600 hover:text-gray-900 text-2xl">⬅</button>
          <h2 className="text-2xl font-semibold text-gray-800 font-serif">
            {currentDate.toLocaleString("default", { month: "long" })} {year}
          </h2>
          <button onClick={handleNextMonth} className="text-gray-600 hover:text-gray-900 text-2xl">➡</button>
        </div>

        <div className="grid grid-cols-7 text-center font-medium text-gray-600 mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d}>{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-2 text-center">
          {Array(firstDayIndex).fill(null).map((_, i) => <div key={"empty-" + i}></div>)}
          {days.map((day) => {
            const events = getEventsForDay(day);
            return (
              <div
                key={day}
                onClick={() => setSelectedDate(new Date(year, month, day))}
                className={`h-24 flex flex-col justify-center rounded-lg cursor-pointer border transition
                  ${selectedDate && selectedDate.toDateString() === new Date(year, month, day).toDateString()
                    ? "bg-gray-900 text-white border-black border-2"
                    : events.length
                    ? "bg-yellow-100 border-yellow-400 text-gray-800"
                    : "hover:bg-gray-200 border-gray-200"
                  }`}
              >
                <span className="font-semibold">{day}</span>
                {events.map((e) => (
                  <span key={e._id} className="text-xs mt-1 px-1 py-0.5  bg-yellow-300 text-black">
                    {e.message.length > 12 ? e.message.slice(0, 12) + "..." : e.message}
                  </span>
                ))}
              </div>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-8 p-4 border-t border-gray-200">
            <h3 className="font-semibold text-gray-700 mb-2">
              {editingId ? "Edit Note" : "Add Note"} for {selectedDate.toDateString()}
            </h3>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write something..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            ></textarea>

            <div className="flex items-center gap-6 mt-4">
              <label className="flex items-center gap-2 text-gray-700">
                <input type="radio" value="me" checked={visibility === "me"} onChange={(e) => setVisibility(e.target.value)} />
                <span>Visible to Me</span>
              </label>
              <label className="flex items-center gap-2 text-gray-700">
                <input type="radio" value="all" checked={visibility === "all"} onChange={(e) => setVisibility(e.target.value)} />
                <span>Visible to All</span>
              </label>
              <button
                onClick={handlePin}
                className="ml-auto bg-gray-900 hover:bg-gray-700 text-white px-5 py-2 rounded-lg transition"
              >
                {editingId ? "Update" : "Pin Date"}
              </button>
            </div>
          </div>
        )}

        {pinnedEvents.length > 0 && (
          <div className="mt-8">
            <h3 className="text-2xl font-semibold text-gray-700 mb-3 font-serif">Pinned Dates</h3>
            <ul className="space-y-3">
              {pinnedEvents.map((e) => (
                <li key={e._id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <p className="font-medium text-gray-900">{e.date}</p>
                    <p className="text-gray-600">{e.message}</p>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium ${e.visibility === "me" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                      {e.visibility === "me" ? "Private" : "Public"}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2 md:mt-0">
                    <button onClick={() => handleEdit(e)} className="text-blue-600 hover:underline text-sm">Edit</button>
                    <button onClick={() => handleDelete(e._id)} className="text-red-600 hover:underline text-sm">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
