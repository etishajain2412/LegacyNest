import { useState } from "react";
import axiosInstance from "../utils/axiosInstance";

export default function FamilyCircles() {
  const [newCircleName, setNewCircleName] = useState("");
  const [newCircleDesc, setNewCircleDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCreateCircle = async (e) => {
    e.preventDefault();
    if (!newCircleName.trim()) return;

    try {
      setLoading(true);
      await axiosInstance.post("/circles/create", {
        name: newCircleName,
        description: newCircleDesc,
      });

      setSuccess("✅ Room created successfully!");
      setNewCircleName("");
      setNewCircleDesc("");
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to create circle"
      );
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Create Family Circle</h2>
      
      {error && <p className="text-red-500">{error}</p>}
      {success && <p className="text-green-600">{success}</p>}
      {loading && <p>Loading...</p>}

      {/* Create Circle */}
      <form onSubmit={handleCreateCircle} className="space-y-3 mb-6">
        <input
          type="text"
          value={newCircleName}
          onChange={(e) => setNewCircleName(e.target.value)}
          placeholder="Enter circle name"
          className="w-full border p-2 rounded"
        />

        <textarea
          value={newCircleDesc}
          onChange={(e) => setNewCircleDesc(e.target.value)}
          placeholder="Enter description (optional)"
          className="w-full border p-2 rounded"
          rows="3"
        ></textarea>

        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Create
        </button>
      </form>
    </div>
  );
}
