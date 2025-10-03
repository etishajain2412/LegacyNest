const express = require("express");
const router = express.Router();
const { createFamilyCircle } = require("../controllers/familyCircleController");
const { authenticateToken } = require("../middlewares/authMiddleware");

// Create Circle
router.post("/create", authenticateToken, createFamilyCircle);

module.exports = router;
