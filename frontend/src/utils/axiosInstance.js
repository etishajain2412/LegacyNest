import axios from "axios";

// ✅ Determine API base URL
const API_BASE_URL =
  import.meta.env.MODE === "production"
    ? `${import.meta.env.VITE_BACKEND_URL}/api`
    : "http://localhost:5000/api";


// ✅ Create axios instance
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Include cookies automatically
});

// ✅ Helper: Read cookie by name
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

// ✅ Request Interceptor — attach token if present
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getCookie("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ Response Interceptor — auto refresh token if expired
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle expired token
    if (
      (error.response?.status === 401 || error.response?.status === 403) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        // Refresh access token
        const refreshRes = await axios.post(
          `${API_BASE_URL}/auth/refresh-token`,
          {},
          {
            withCredentials: true,
          }
        );

        const newToken = refreshRes.data.accessToken;

        // ✅ Store refreshed token in cookie (valid 15 mins)
        document.cookie = `accessToken=${newToken}; max-age=900; path=/; ${
          import.meta.env.MODE === "production"
            ? "Secure; SameSite=None"
            : ""
        }`;

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        document.cookie = "accessToken=; max-age=0; path=/";
        document.cookie = "user=; max-age=0; path=/";
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
