// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');
// const connectDB = require('./configs/db');
// const cookieParser=require('cookie-parser')
// const passport=require('./configs/passport')
// const { Server } = require("socket.io");
// const http = require("http");


// const { setIo, register, unregisterBySocket } = require("./utils/socketManager");
// const { startPromptWorker } = require("./worker/promptWorker"); 
// //Routes
// const authRoutes=require('./routes/authRoutes')
// const storyRoutes = require('./routes/storyRoutes.js');
// const profileRoutes = require('./routes/profileRoutes.js');
// const promptRoutes = require('./routes/promptRoutes')


// dotenv.config();
// connectDB();

// const app = express();
// app.use(express.json());
// app.use(express.urlencoded({ extended: true })); 
// app.use(cookieParser());
// app.use(passport.initialize());
// app.use(cors({
//   origin: 'http://localhost:3000',
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   credentials: true,
//   allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
// }));

// app.get('/', (req, res) => {
//   res.send('🚀 Backend server is running!');
// });


// //apis
// app.use('/api/stories', storyRoutes);
// app.use('/api/auth', authRoutes);
// app.use('/api/profile',profileRoutes);
// app.use('/api/prompts', promptRoutes);

// const server = http.createServer(app);
// // --- Socket.IO
// const io = new Server(server, {
//   cors: {
//     origin: process.env.CLIENT_URL || "http://localhost:3000",
//     methods: ["GET", "POST"],
//   },
// });
// setIo(io);

// io.on("connection", (socket) => {
//   console.log("socket connected", socket.id);

//   // Optional: Accept JWT in connection query to authenticate immediately
//   // client should connect with: io(`${BASE_URL}`, { auth: { token: "Bearer <token>" } })
//   socket.on("auth", (data) => {
//     try {
//       const token = data?.token?.replace("Bearer ", "") || null;
//       if (!token) return;
//       const payload = jwt.verify(token, process.env.JWT_SECRET);
//       if (payload && payload.id) {
//         register(payload.id, socket.id);
//         console.log("socket registered user", payload.id, "->", socket.id);
//       }
//     } catch (err) {
//       console.warn("socket auth failed", err?.message || err);
//     }
//   });

//   // Also allow client to send a simple register (userId) if they prefer
//   socket.on("register", (data) => {
//     const { userId } = data || {};
//     if (userId) {
//       register(userId, socket.id);
//       console.log("socket registered via register event", userId, "->", socket.id);
//     }
//   });

//   socket.on("disconnect", () => {
//     console.log("socket disconnected", socket.id);
//     unregisterBySocket(socket.id);
//   });
// });

// // start the worker (always start; if you prefer conditional use an env flag)
// startPromptWorker();

// const PORT = process.env.PORT || 5000;

// // 🚀 Use the HTTP server (not app.listen)
// server.listen(PORT, () => {
//   console.log(`✅ Server running on http://localhost:${PORT}`);
// });

// server.js (replace your existing file with this)
// or paste into the same filename you currently use for your server entry point

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./configs/db');
const cookieParser = require('cookie-parser');
const passport = require('./configs/passport');
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');



// Routes
const authRoutes = require('./routes/authRoutes');
const storyRoutes = require('./routes/storyRoutes.js');
const profileRoutes = require('./routes/profileRoutes.js');
const promptRoutes = require('./routes/promptRoutes');
const matchRoutes = require('./routes/matchRoutes'); 
const sharedPromptRoutes = require('./routes/sharedPromptRoutes');


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
app.use('/api/matches', matchRoutes); 
app.use('/api/shared-prompts', sharedPromptRoutes);


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
