const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const { sharePrompt, getSharedPromptsForFamily,respondToSharedPrompt} = require("../controllers/sharedPromptController");

// POST /api/prompts/instances/:id/share
router.post("/instances/:id/share", authenticateToken, sharePrompt);
router.get("/families/:familyId", authenticateToken, getSharedPromptsForFamily);
// respond to a shared prompt (thread reply)
router.post("/shared/:sharedId/respond", authenticateToken, respondToSharedPrompt);

module.exports = router;
