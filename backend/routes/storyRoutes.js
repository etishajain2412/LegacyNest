const express = require("express");
const multer = require("multer");
const { authenticateToken } = require("../middlewares/authMiddleware");
const {
  createStory,
  getAllStories,
  getMyStories,
  getOthersStories,
  getStoryById,
  updateStory,
  deleteStory,
  getFeedStories,
  getPublicStories,
  getFamilyStories,
} = require("../controllers/storyController");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", authenticateToken, upload.single("file"), createStory);
router.get("/", authenticateToken, getAllStories);
router.get("/mine/:userId", authenticateToken, getMyStories);
router.get("/others/:userId", authenticateToken, getOthersStories);
router.get("/feed/all", authenticateToken, getFeedStories);
router.get("/feed/public", authenticateToken, getPublicStories);
router.get("/feed/family", authenticateToken, getFamilyStories);
router.get("/:id", authenticateToken, getStoryById);
router.put("/:id", authenticateToken, upload.single("file"), updateStory);
router.delete("/:id", authenticateToken, deleteStory);

module.exports = router;
