const express = require("express");
const router = express.Router();
const { authenticateToken } = require("../middlewares/authMiddleware");
const { sharePrompt, getSharedPromptsForFamily,respondToSharedPrompt} = require("../controllers/sharedPromptController");


router.post("/instances/:id/share", authenticateToken, sharePrompt);
router.get("/families/:familyId", authenticateToken, getSharedPromptsForFamily);

router.post("/shared/:sharedId/respond", authenticateToken, respondToSharedPrompt);

module.exports = router;
