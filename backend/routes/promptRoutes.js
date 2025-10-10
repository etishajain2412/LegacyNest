
const express = require("express");
const { authenticateToken } = require("../middlewares/authMiddleware");
const promptController = require("../controllers/promptController");


const router = express.Router();

router.post("/dynamic", authenticateToken, promptController.createDynamicPrompt);


router.get("/instances", authenticateToken, promptController.getUserPromptInstances);

router.post("/instances/:id/respond", authenticateToken, promptController.respondToPrompt);


router.post("/instances/:id/skip", authenticateToken, promptController.skipPrompt);




module.exports = router;
