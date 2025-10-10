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
    passport.authenticate("google", { 
      session: false, 
      failureRedirect: "http://localhost:3000/login?error=Authentication failed"
    })(req, res, next);
  }, 
  googleCallback
);

module.exports = router;