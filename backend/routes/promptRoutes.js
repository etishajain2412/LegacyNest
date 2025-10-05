// backend/routes/promptRoutes.js
const express = require("express");
const { authenticateToken } = require("../middlewares/authMiddleware");
const promptController = require("../controllers/promptController");

const router = express.Router();

// ✅ Dynamic prompt (Gemini)
router.post("/dynamic", authenticateToken, promptController.createDynamicPrompt);

// ✅ Get all prompts for logged-in user
router.get("/instances", authenticateToken, promptController.getUserPromptInstances);

// ✅ Respond to a prompt
router.post("/instances/:id/respond", authenticateToken, promptController.respondToPrompt);

// ✅ Skip a prompt and get a new one immediately
router.post("/instances/:id/skip", authenticateToken, promptController.skipPrompt);

// ✅ Optional: force deliver now (for testing)
//router.post("/instances/:id/deliver-now", authenticateToken, promptController.triggerDeliverNow);

module.exports = router;
