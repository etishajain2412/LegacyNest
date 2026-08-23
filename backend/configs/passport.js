const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

require("dotenv").config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google authentication started");
        console.log("Google Profile:", profile);

        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(null, false, {
            message: "Unable to get email from Google account",
          });
        }

        let user = await User.findOne({ email });

        const authState = req.query.state || "login";

        console.log("Google Email:", email);
        console.log("Auth State:", authState);

        if (authState === "register") {
          if (user) {
            return done(null, false, {
              message: "User already exists. Please login instead.",
            });
          }

          const baseUsername =
            email
              .split("@")[0]
              .replace(/[^a-zA-Z0-9]/g, "") || "user";

          let username = baseUsername;
          let counter = 1;

          while (await User.findOne({ username })) {
            username = `${baseUsername}${counter}`;
            counter++;
          }

          user = new User({
            name: profile.displayName || username,
            email,
            username,
            password: null,
          });

          await user.save();

          console.log("Google user registered:", user._id);

          return done(null, user);
        }

        if (authState === "login") {
          if (!user) {
            return done(null, false, {
              message: "No account found. Please register first.",
            });
          }

          console.log("Google user logged in:", user._id);

          return done(null, user);
        }

        return done(null, false, {
          message: "Invalid authentication state",
        });
      } catch (error) {
        console.error("Google authentication error:", error);
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;