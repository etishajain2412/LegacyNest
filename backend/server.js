const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const cookieParser = require("cookie-parser");
const passport = require("./configs/passport");
const connectDB = require("./configs/db");
const { Server } = require("socket.io");

// Import routes
const authRoutes = require("./routes/authRoutes");
const storyRoutes = require("./routes/storyRoutes");
const profileRoutes = require("./routes/profileRoutes");
const familyCircleRoutes = require("./routes/familyCircleRoutes");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// 🌐 Allow both local and production origins
const allowedOrigins = [
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS not allowed for this origin: " + origin));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

// ✅ Create HTTP server (shared for Express + Socket.IO)
const server = http.createServer(app);

// ⚡ Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// 🧠 Real-Time Socket Events
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Join a family circle room
  socket.on("joinFamilyCircle", ({ familyCircleId, userId, userName }) => {
    socket.join(familyCircleId);
    console.log(`👥 ${userName} joined circle ${familyCircleId}`);

    // Notify all members in that circle
    io.to(familyCircleId).emit("circleNotification", {
      type: "join",
      message: `${userName} joined the room.`,
    });
  });

  // When a user starts editing a story
  socket.on("startEditingStory", ({ familyCircleId, storyTitle, userName }) => {
    socket.to(familyCircleId).emit("circleNotification", {
      type: "edit",
      message: `${userName} is editing "${storyTitle}"`,
    });
  });

  // When a user stops editing
  socket.on("stopEditingStory", ({ familyCircleId, storyTitle, userName }) => {
    socket.to(familyCircleId).emit("circleNotification", {
      type: "edit-stop",
      message: `${userName} stopped editing "${storyTitle}"`,
    });
  });

  // Handle disconnects
  socket.on("disconnect", () => {
    console.log("🔴 User disconnected:", socket.id);
  });
});

// 🧩 API Routes
app.use("/api/auth", authRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/circles", familyCircleRoutes);

// 🏠 Root route
app.get("/", (req, res) => {
  res.send("🚀 Family Story App Backend is running successfully!");
});

// ✅ Start the shared HTTP + WebSocket server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server with Socket.IO running on http://localhost:${PORT}`);
});
