import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true
});

// Interceptor for auto refresh
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      try {
        await axiosInstance.post("/auth/refresh");
        return axiosInstance(error.config);
      } catch (err) {
        console.error("Auto refresh failed:", err);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
