const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./configs/db');
const cookieParser = require('cookie-parser');
const passport = require('./configs/passport');
const { Server } = require("socket.io");
const http = require("http");
const jwt = require("jsonwebtoken");
// Utils
const { setIo, register, unregisterBySocket } = require("./utils/socketManager");
const { startPromptWorker } = require("./worker/promptWorker");

// Models
const CollaborativeStory = require("./models/CollaborativeStory");

// Routes
const authRoutes = require("./routes/authRoutes");
const storyRoutes = require("./routes/storyRoutes");
const profileRoutes = require("./routes/profileRoutes");
const familyCircleRoutes = require("./routes/familyCircleRoutes");
const calendarRoutes = require("./routes/calendarRoutes");
const collaborativeStoryRoutes = require("./routes/collaborativeStoryRoutes");
const promptRoutes=require("./routes/promptRoutes")
const matchRoutes=require("./routes/matchRoutes")
const familyChatbotRoutes = require("./routes/familyChatbot");

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

// Allow ALL origins for Express
app.use(cors({
  origin: true, // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// Create HTTP server
const server = http.createServer(app);

// Allow ALL origins for Socket.IO
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for Socket.IO
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  },
});

// Set IO globally
setIo(io);

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Authenticate Socket
  socket.on("auth", (data) => {
    try {
      const token = data?.token?.replace("Bearer ", "");
      if (!token) return;
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      if (payload && payload.id) {
        register(payload.id, socket.id);
        console.log("✅ Authenticated:", payload.id);
      }
    } catch (err) {
      console.warn("❌ Auth failed:", err.message);
    }
  });

  // Join Family Circle Room
  socket.on("joinFamilyCircle", ({ familyCircleId, userId, userName }) => {
    socket.join(familyCircleId);
    console.log(`👥 ${userName} joined circle ${familyCircleId}`);
    io.to(familyCircleId).emit("circleNotification", {
      type: "join",
      message: `${userName} joined the room.`,
    });
  });

  // --- ✍️ Collaborative Editing Events ---

  // Notify start editing
  socket.on("startEditingStory", ({ storyId, userName }) => {
    socket.to(storyId).emit("editingNotification", {
      userName,
      action: "started",
    });
  });

  // Notify stop editing
  socket.on("stopEditingStory", ({ storyId, userName }) => {
    socket.to(storyId).emit("editingNotification", {
      userName,
      action: "stopped",
    });
  });

  // Live Content Update
  socket.on("updateStory", async ({ storyId, content }) => {
    try {
      // Broadcast to other collaborators
      socket.to(storyId).emit("storyUpdated", { content });

      // Save latest changes in DB
      await CollaborativeStory.findByIdAndUpdate(storyId, {
        content,
        lastEditedAt: Date.now(),
      });
    } catch (err) {
      console.error("Error saving live update:", err.message);
    }
  });

  // Join story editing room
  socket.on("joinStory", ({ storyId, userName }) => {
    socket.join(storyId);
    console.log(`📖 ${userName} joined story room: ${storyId}`);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);
    unregisterBySocket(socket.id);
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/circles", familyCircleRoutes);
app.use("/api/prompts", promptRoutes);
app.use("/api/calendar", calendarRoutes);
app.use('/api/matches', matchRoutes); 
app.use("/api/chatbot", familyChatbotRoutes);


app.use("/api/collab-stories", collaborativeStoryRoutes);

// Root Route
app.get("/", (req, res) => {
  res.send("🚀 Family Story App Backend is running!");
});

// Background Worker
startPromptWorker();

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});