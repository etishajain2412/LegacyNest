import axiosInstance from "../utils/axiosInstance"; // ✅ use shared axios instance

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

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

export const createDynamicPrompt = async (body = {}) => {
  const { data } = await API.post("/prompts/dynamic", body);
  return data;
};
