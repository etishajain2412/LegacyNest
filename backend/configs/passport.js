const passport = require("passport");
const GoogleStrategy =
  require("passport-google-oauth20").Strategy;
const User = require("../models/User");

require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,

      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET,

      callbackURL:
        process.env.GOOGLE_CALLBACK_URL,

      passReqToCallback: true,
    },

    async (
      req,
      accessToken,
      refreshToken,
      profile,
      done
    ) => {
      try {
        console.log(
          "=============================="
        );
        console.log("Google authentication started");
        console.log(
          "Google Profile:",
          profile
        );

        // ---------------------------------------------
        // Get email
        // ---------------------------------------------

        const email =
          profile.emails?.[0]?.value;

        if (!email) {
          return done(null, false, {
            message:
              "Unable to get email from Google account",
          });
        }

        console.log(
          "Google Email:",
          email
        );

        // ---------------------------------------------
        // Find existing user
        // ---------------------------------------------

        let user = await User.findOne({
          email,
        });

        // ---------------------------------------------
        // Determine login/register
        // ---------------------------------------------

        const authState =
          req.query.state || "login";

        console.log(
          "Auth State:",
          authState
        );

        // =================================================
        // GOOGLE REGISTER
        // =================================================

        if (authState === "register") {
          // User already exists
          if (user) {
            console.log(
              "Google registration failed: user exists"
            );

            return done(null, false, {
              message:
                "User already exists. Please login instead.",
            });
          }

          // ---------------------------------------------
          // Generate unique username
          // ---------------------------------------------

          const baseUsername =
            email
              .split("@")[0]
              .replace(/[^a-zA-Z0-9]/g, "");

          let username =
            baseUsername || "user";

          let counter = 1;

          while (
            await User.findOne({
              username,
            })
          ) {
            username = `${baseUsername}${counter}`;
            counter++;
          }

          // ---------------------------------------------
          // Create user
          // ---------------------------------------------

          user = new User({
            name:
              profile.displayName ||
              username,

            email,

            username,

            password: null,
          });

          await user.save();

          console.log(
            "Google user registered successfully:",
            user._id
          );

          return done(null, user);
        }

        // =================================================
        // GOOGLE LOGIN
        // =================================================

        if (authState === "login") {
          // User doesn't exist
          if (!user) {
            console.log(
              "Google login failed: user doesn't exist"
            );

            return done(null, false, {
              message:
                "No account found. Please register first.",
            });
          }

          console.log(
            "Google user logged in successfully:",
            user._id
          );

          return done(null, user);
        }

        // =================================================
        // INVALID STATE
        // =================================================

        return done(null, false, {
          message: "Invalid authentication state",
        });

      } catch (error) {
        console.error(
          "Error during Google authentication:",
          error
        );

        return done(error, null);
      }
    }
  )
);

// =====================================================
// SERIALIZATION
// =====================================================

passport.serializeUser((user, done) => {
  done(null, user._id);
});

// =====================================================
// DESERIALIZATION
// =====================================================

passport.deserializeUser(
  async (id, done) => {
    try {
      const user =
        await User.findById(id);

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
);

module.exports = passport;