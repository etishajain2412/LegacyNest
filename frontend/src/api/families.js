// src/api/families.js
import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api",
  withCredentials: true,
});

/**
 * Fetch all family circles for the logged-in user.
 * Returns an object with `data` containing the array of circles.
 */
export const fetchMyCircles = async () => {
  try {
    const { data } = await API.get("/circles/my"); 
    return data; 
  } catch (err) {
    console.error("Error fetching user circles:", err);
    throw err;
  }
};
