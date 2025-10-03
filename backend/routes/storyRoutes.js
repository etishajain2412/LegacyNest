const express = require("express");
const multer = require("multer");
const {
  createStory,
  getAllStories,
  getMyStories,
  getOthersStories,
  getStoryById,
  updateStory,
  deleteStory
} = require("../controllers/storyController");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", upload.single("file"), createStory);
router.get("/", getAllStories);
router.get("/mine/:userId", getMyStories);
router.get("/others/:userId", getOthersStories);
router.get("/:id", getStoryById);
router.put("/:id",upload.single("file"), updateStory);
router.delete("/:id", deleteStory);

module.exports = router;
