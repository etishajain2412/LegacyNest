import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

export const fetchPrompts = async () => {
  const { data } = await API.get("/prompts/instances");
  return data;
};

export const respondToPrompt = async (id, payload) => {
  const { data } = await API.post(`/prompts/instances/${id}/respond`, payload);
  return data;
};

export const schedulePrompt = async (payload) => {
  const { data } = await API.post("/prompts/instances", payload);
  return data;
};

export const skipPrompt = async (id) => {
  const { data } = await API.post(`/prompts/instances/${id}/skip`);
  return data;
};

export const createDynamicPrompt = async (body = {}) => {
  const { data } = await API.post("/prompts/dynamic", body);
  return data;
};
