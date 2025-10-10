import axios from "axios";
const API = axios.create({ baseURL: "http://localhost:5000/api", withCredentials: true });

export const sharePrompt = async ({ promptInstanceId, familyId }) => {
  if (!promptInstanceId) throw new Error("promptInstanceId required");
  if (!familyId) throw new Error("familyId required");
  // POST to /api/prompts/instances/:id/share — because server mounts at /api/prompts
  const { data } = await API.post(`/prompts/instances/${promptInstanceId}/share`, { familyId });
  return data;
};
export const fetchFamilySharedPrompts = async (familyId) => {
  if (!familyId) throw new Error("familyId required");
  const { data } = await API.get(`/prompts/families/${familyId}`);
  return data;
};

export const respondToSharedPrompt = async (sharedId, payload) => {
  const { data } = await API.post(`/prompts/shared/${sharedId}/respond`, payload);
  return data;
};