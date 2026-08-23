const express = require("express");
const passport = require("passport");

const {
  register,
  login,
  refreshAccessToken,
  googleCallback,
  logout,
} = require("../controllers/authController");

const router = express.Router();

// =====================================================
// NORMAL AUTH
// =====================================================

router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logout);

// =====================================================
// GOOGLE AUTH START
// =====================================================

router.get("/google", (req, res, next) => {
  const state = req.query.state || "login";

  passport.authenticate("google", {
    scope: ["profile", "email"],
    state,
  })(req, res, next);
});

// =====================================================
// GOOGLE CALLBACK
// =====================================================

router.get(
  "/google/callback",
  (req, res, next) => {
    passport.authenticate(
      "google",
      {
        session: false,
      },
      (err, user, info) => {
        if (err) {
          console.error(
            "Google Passport Error:",
            err
          );

          return res.status(500).json({
            message: "Google authentication failed",
          });
        }

        if (!user) {
          const message =
            info?.message ||
            "Authentication failed";

          console.log(
            "Google authentication failed:",
            message
          );

          const frontendUrl =
            process.env.NODE_ENV === "production"
              ? process.env.FRONTEND_URL_PROD
              : process.env.FRONTEND_URL_DEV ||
                "http://localhost:3000";

          return res.redirect(
            `${frontendUrl}/login?error=${encodeURIComponent(
              message
            )}`
          );
        }

        // Manually attach authenticated user
        req.user = user;

        return next();
      }
    )(req, res, next);
  },
  googleCallback
);

module.exports = router;