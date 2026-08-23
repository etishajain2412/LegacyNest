const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./configs/db");
const cookieParser = require("cookie-parser");
const passport = require("./configs/passport");
const { Server } = require("socket.io");
const http = require("http");
const jwt = require("jsonwebtoken");

const {
  setIo,
  register,
  unregisterBySocket,
} = require("./utils/socketManager");

const CollaborativeStory = require("./models/CollaborativeStory");

const authRoutes = require("./routes/authRoutes");
const storyRoutes = require("./routes/storyRoutes");
const profileRoutes = require("./routes/profileRoutes");
const familyCircleRoutes = require("./routes/familyCircleRoutes");
const calendarRoutes = require("./routes/calendarRoutes");
const collaborativeStoryRoutes = require("./routes/collaborativeStoryRoutes");
const promptRoutes = require("./routes/promptRoutes");
const matchRoutes = require("./routes/matchRoutes");
const familyChatbotRoutes = require("./routes/familyChatbot");
const sharedPromptsRoutes = require("./routes/sharedPromptRoutes");

dotenv.config();
connectDB();

const app = express();

const FRONTEND_URL = process.env.FRONTEND_URL;

if (!FRONTEND_URL) {
  throw new Error("FRONTEND_URL is not defined");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(passport.initialize());

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
    ],
    credentials: true,
  })
);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

setIo(io);

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("auth", (data) => {
    try {
      const token = data?.token?.replace("Bearer ", "");

      if (!token) {
        console.warn("Socket authentication: token missing");
        return;
      }

      const payload = jwt.verify(
        token,
        process.env.JWT_ACCESS_SECRET
      );

      if (payload?.id) {
        socket.userId = payload.id;

        register(payload.id, socket.id);

        console.log("Socket authenticated:", payload.id);
      }
    } catch (err) {
      console.warn("Socket authentication failed:", err.message);
    }
  });

  socket.on(
    "joinFamilyCircle",
    ({ familyCircleId, userId, userName }) => {
      socket.join(familyCircleId);

      console.log(
        `${userName} joined circle ${familyCircleId}`
      );

      io.to(familyCircleId).emit(
        "circleNotification",
        {
          type: "join",
          message: `${userName} joined the room.`,
        }
      );
    }
  );

  socket.on(
    "startEditingStory",
    ({ storyId, userName }) => {
      socket
        .to(storyId)
        .emit("editingNotification", {
          userName,
          action: "started",
        });
    }
  );

  socket.on(
    "stopEditingStory",
    ({ storyId, userName }) => {
      socket
        .to(storyId)
        .emit("editingNotification", {
          userName,
          action: "stopped",
        });
    }
  );

  socket.on(
    "toggleStoryLock",
    async ({ storyId, lock, userName }) => {
      try {
        if (!socket.userId) {
          return;
        }

        const story =
          await CollaborativeStory.findById(storyId);

        if (!story) {
          return;
        }

        story.locked = lock;
        story.lockedBy = lock
          ? socket.userId
          : null;

        await story.save();

        io.to(storyId).emit(
          "storyLockChanged",
          {
            storyId,
            locked: lock,
            lockedBy: lock ? userName : null,
          }
        );
      } catch (err) {
        console.error(
          "Story lock error:",
          err.message
        );
      }
    }
  );

  socket.on(
    "updateStory",
    async ({ storyId, content }) => {
      try {
        if (!socket.userId) {
          return;
        }

        socket
          .to(storyId)
          .emit("storyUpdated", {
            content,
          });

        await CollaborativeStory.findByIdAndUpdate(
          storyId,
          {
            content,
            lastEditedAt: Date.now(),
          }
        );
      } catch (err) {
        console.error(
          "Error saving live update:",
          err.message
        );
      }
    }
  );

  socket.on(
    "joinStory",
    ({ storyId, userName }) => {
      socket.join(storyId);

      console.log(
        `${userName} joined story room: ${storyId}`
      );
    }
  );

  socket.on("disconnect", () => {
    console.log(
      "Disconnected:",
      socket.id
    );

    unregisterBySocket(socket.id);
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/circles", familyCircleRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/prompts", promptRoutes);
app.use("/api/prompts", sharedPromptsRoutes);
app.use("/api/chatbot", familyChatbotRoutes);
app.use(
  "/api/collab-stories",
  collaborativeStoryRoutes
);

app.get("/", (req, res) => {
  res.send("Family Story App Backend is running!");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});