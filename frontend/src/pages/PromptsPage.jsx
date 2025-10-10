import { useEffect, useState } from "react";
import PromptList from "../components/PromptList";
import { fetchMyCircles } from "../api/families";

const PromptsPage = ({ user }) => {
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState(null);

  useEffect(() => {
    const loadFamilies = async () => {
      try {
        const data = await fetchMyCircles();
        setFamilies(data);
        if (data.length > 0) setSelectedFamilyId(data[0]._id);
      } catch (err) {
        console.error("Failed to load family circles:", err);
      }
    };
    loadFamilies();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-semibold mb-4">Daily Memory Prompts</h2>

      {families.length === 0 ? (
        <p className="text-gray-600 mb-4">
          You’re not part of any family circle yet.
        </p>
      ) : (
        <div className="mb-4">
          <label className="block mb-2">Choose family to share to:</label>
          <select
            value={selectedFamilyId || ""}
            onChange={(e) => setSelectedFamilyId(e.target.value)}
            className="border px-2 py-1 rounded"
          >
            {families.map((f) => (
              <option key={f._id} value={f._id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <PromptList familyId={selectedFamilyId} />
    </div>
  );
};

export default PromptsPage;
