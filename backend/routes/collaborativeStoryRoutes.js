const express = require("express");
const { authenticateToken } = require("../middlewares/authMiddleware");
const {
  createCollaborativeStory,
  getStoriesByCircle,
  updateStoryContent,
  getStoryById,
  toggleLockStory,
} = require("../controllers/collaborativeStoryControllers");

const router = express.Router();

router.post("/create", authenticateToken, createCollaborativeStory);
router.get("/circle/:circleId", authenticateToken, getStoriesByCircle);
router.get("/:storyId", authenticateToken, getStoryById);
router.put("/:storyId", authenticateToken, updateStoryContent);
router.put("/:storyId/lock", authenticateToken, toggleLockStory);

module.exports = router;
