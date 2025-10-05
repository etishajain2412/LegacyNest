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
//Routes
const authRoutes=require('./routes/authRoutes')
const storyRoutes = require('./routes/storyRoutes.js');
const profileRoutes = require('./routes/profileRoutes.js');
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

app.get('/', (req, res) => {
  res.send('🚀 Backend server is running!');
});


//apis
app.use('/api/stories', storyRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/profile',profileRoutes);
app.use('/api/prompts', promptRoutes);
app.use('/api/calendar', CalendarEvent);

const server = http.createServer(app);
// --- Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});
setIo(io);

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

const PORT = process.env.PORT || 5000;

// 🚀 Use the HTTP server (not app.listen)
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});



