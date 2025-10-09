const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./configs/db');
const cookieParser=require('cookie-parser')
const passport=require('./configs/passport')
const { Server } = require("socket.io");
const http = require("http");


const { setIo, register, unregisterBySocket } = require("./utils/socketManager");
const { startPromptWorker } = require("./worker/promptWorker"); 
// Import routes
const authRoutes = require("./routes/authRoutes");
const storyRoutes = require("./routes/storyRoutes");
const profileRoutes = require("./routes/profileRoutes");
const familyCircleRoutes = require("./routes/familyCircleRoutes");
const promptRoutes = require('./routes/promptRoutes')
const CalendarEvent = require("./routes/calendarRoutes.js");

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
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

const server = http.createServer(app);

// ⚡ Socket.IO setup
const allowedOrigins="http://localhost:3000"
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
app.use('/api/prompts', promptRoutes);
app.use('/api/calendar', CalendarEvent);

io.on("connection", (socket) => {
  console.log("socket connected", socket.id);

  // Optional: Accept JWT in connection query to authenticate immediately
  // client should connect with: io(`${BASE_URL}`, { auth: { token: "Bearer <token>" } })
  socket.on("auth", (data) => {
    try {
      const token = data?.token?.replace("Bearer ", "") || null;
      if (!token) return;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload && payload.id) {
        register(payload.id, socket.id);
        console.log("socket registered user", payload.id, "->", socket.id);
      }
    } catch (err) {
      console.warn("socket auth failed", err?.message || err);
    }
  });

  // Also allow client to send a simple register (userId) if they prefer
  socket.on("register", (data) => {
    const { userId } = data || {};
    if (userId) {
      register(userId, socket.id);
      console.log("socket registered via register event", userId, "->", socket.id);
    }
  });

  socket.on("disconnect", () => {
    console.log("socket disconnected", socket.id);
    unregisterBySocket(socket.id);
  });
});

// start the worker (always start; if you prefer conditional use an env flag)
startPromptWorker();

// 🏠 Root route
app.get("/", (req, res) => {
  res.send("🚀 Family Story App Backend is running successfully!");
});

// ✅ Start the shared HTTP + WebSocket server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
