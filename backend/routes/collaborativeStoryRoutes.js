const express = require("express");
const { authenticateToken } = require("../middlewares/authMiddleware");
const {
  createCollaborativeStory,
  getStoriesByCircle,
  updateStoryContent,
  getStoryById,
} = require("../controllers/collaborativeStoryControllers");

const router = express.Router();

router.post("/create", authenticateToken, createCollaborativeStory);
router.get("/circle/:circleId", authenticateToken, getStoriesByCircle);
router.get("/:storyId", authenticateToken, getStoryById);
router.put("/:storyId", authenticateToken, updateStoryContent);

module.exports = router;
