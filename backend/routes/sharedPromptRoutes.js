const express = require("express");
const { authenticateToken } = require("../middlewares/authMiddleware");
const {
  sharePromptToFamily,
  getFamilyFeed,
  replyToSharedPrompt,
  getSharedPromptReplies
} = require("../controllers/sharedPromptController");

const router = express.Router();

// Share a prompt (the user must belong to the family)
router.post("/share", authenticateToken, sharePromptToFamily);

// Family feed: list shared prompts for a family (or for all families user belongs to)
router.get("/family/:familyId/feed", authenticateToken, getFamilyFeed);

// Reply to a shared prompt
router.post("/:sharedPromptId/reply", authenticateToken, replyToSharedPrompt);

// Get replies for a shared prompt
router.get("/:sharedPromptId/replies", authenticateToken, getSharedPromptReplies);

module.exports = router;
