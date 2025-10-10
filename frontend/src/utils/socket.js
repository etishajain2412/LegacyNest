import { io } from "socket.io-client";
const BASE_URL =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_BACKEND_URL
    : "http://localhost:5000";

const socket = io(BASE_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

export default socket;
