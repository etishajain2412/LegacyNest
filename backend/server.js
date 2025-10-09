const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./configs/db');
const cookieParser = require('cookie-parser');
const passport = require('./configs/passport');
const { Server } = require("socket.io");
const http = require("http");
const jwt = require("jsonwebtoken");

const { setIo, register, unregisterBySocket } = require("./utils/socketManager");
const { startPromptWorker } = require("./worker/promptWorker"); 

// Import routes
const authRoutes = require("./routes/authRoutes");
const storyRoutes = require("./routes/storyRoutes");
const profileRoutes = require("./routes/profileRoutes");
const familyCircleRoutes = require("./routes/familyCircleRoutes");
const promptRoutes = require('./routes/promptRoutes');
const calendarRoutes = require("./routes/calendarRoutes");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

// 📦 Create HTTP server
const server = http.createServer(app);

// ⚡ Attach Socket.IO to server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

setIo(io); // optional if you're using a shared instance via socketManager

// ✅ Socket.IO logic
io.on("connection", (socket) => {
  console.log("🟢 Socket connected:", socket.id);

  socket.on("auth", (data) => {
    try {
      const token = data?.token?.replace("Bearer ", "");
      if (!token) return;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload && payload.id) {
        register(payload.id, socket.id);
        console.log("✅ Socket registered:", payload.id, "->", socket.id);
      }
    } catch (err) {
      console.warn("❌ Socket auth failed:", err.message);
    }
  });

  socket.on("register", (data) => {
    const { userId } = data || {};
    if (userId) {
      register(userId, socket.id);
      console.log("✅ Registered via 'register' event:", userId, "->", socket.id);
    }
  });

  // Custom room & editing events
  socket.on("joinFamilyCircle", ({ familyCircleId, userId, userName }) => {
    socket.join(familyCircleId);
    console.log(`👥 ${userName} joined circle ${familyCircleId}`);
    io.to(familyCircleId).emit("circleNotification", {
      type: "join",
      message: `${userName} joined the room.`,
    });
  });

  socket.on("startEditingStory", ({ familyCircleId, storyTitle, userName }) => {
    socket.to(familyCircleId).emit("circleNotification", {
      type: "edit",
      message: `${userName} is editing "${storyTitle}"`,
    });
  });

  socket.on("stopEditingStory", ({ familyCircleId, storyTitle, userName }) => {
    socket.to(familyCircleId).emit("circleNotification", {
      type: "edit-stop",
      message: `${userName} stopped editing "${storyTitle}"`,
    });
  });

  socket.on("disconnect", () => {
    console.log("🔴 Socket disconnected:", socket.id);
    unregisterBySocket(socket.id);
  });
});

// 🧩 Routes
app.use("/api/auth", authRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/circles", familyCircleRoutes);
app.use("/api/prompts", promptRoutes);
app.use("/api/calendar", calendarRoutes);

// 👋 Root
app.get("/", (req, res) => {
  res.send("🚀 Family Story App Backend is running!");
});

// 🧠 Start background worker
startPromptWorker();

// ✅ Start server (this is crucial)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
