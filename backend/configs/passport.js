const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { getBackendUrl } = require('../utils/getFrontendUrl');
require('dotenv').config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${getBackendUrl()}/api/auth/google/callback`,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        let user = await User.findOne({ email });
        const authState = req.query.state || 'login';

        if (authState === 'register') {
          if (user)
            return done(null, false, { message: 'User already exists. Please login instead.' });

          const baseUsername = email.split('@')[0];
          let username = baseUsername;
          let counter = 1;
          while (await User.findOne({ username })) {
            username = `${baseUsername}${counter++}`;
          }

          user = new User({
            name: profile.displayName,
            email,
            username,
            password: null,
          });

          await user.save();
          return done(null, user);
        } else {
          if (!user)
            return done(null, false, { message: 'No account found. Please register first.' });

          return done(null, user);
        }
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
