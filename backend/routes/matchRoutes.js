// src/routes/matchRoutes.js
const express = require("express");
const router = express.Router();
const { getCrossGenerationalMatches } = require("../controllers/matchController");

router.get("/:userId", getCrossGenerationalMatches);

module.exports = router;
