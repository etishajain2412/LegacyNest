const express = require('express');
const passport = require("passport");
const {
  register,
  login,
  refreshAccessToken,
  googleCallback,
  logout
} = require('../controllers/authController');

const router = express.Router();

// Get frontend URL based on environment
const getFrontendUrl = () => {
  return process.env.FRONTEND_URL || 'http://localhost:3000';
};

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshAccessToken);
router.post('/logout', logout);

router.get("/google", (req, res, next) => {
  const state = req.query.state || 'login';
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    state: state
  })(req, res, next);
});

router.get("/google/callback", 
  (req, res, next) => {
    const frontendUrl = getFrontendUrl();
    passport.authenticate("google", { 
      session: false, 
      failureRedirect: `${frontendUrl}/login?error=Authentication failed`
    })(req, res, next);
  }, 
  googleCallback
);

module.exports = router;