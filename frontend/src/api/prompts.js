import axiosInstance from "../utils/axiosInstance"; // ✅ use shared axios instance

// ------------------ Fetch Prompts ------------------
export const fetchPrompts = async () => {
  const { data } = await axiosInstance.get("/prompts/instances");
  return data;
};

// ------------------ Respond to Prompt ------------------
export const respondToPrompt = async (id, payload) => {
  const { data } = await axiosInstance.post(`/prompts/instances/${id}/respond`, payload);
  return data;
};

// ------------------ Schedule Prompt ------------------
export const schedulePrompt = async (payload) => {
  const { data } = await axiosInstance.post("/prompts/instances", payload);
  return data;
};

// ------------------ Skip Prompt ------------------
export const skipPrompt = async (id) => {
  const { data } = await axiosInstance.post(`/prompts/instances/${id}/skip`);
  return data;
};

// ------------------ Dynamic Prompt (Gemini / fallback) ------------------
export const createDynamicPrompt = async (body = {}) => {
  // body can be {} or { userId: "..." } depending on your flow
  const { data } = await axiosInstance.post("/prompts/dynamic", body);
  return data;
};
