const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
      passReqToCallback: true,
      scope: ['profile', 'email'],
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google Profile:', profile);

        const email = profile.emails[0].value;
        let user = await User.findOne({ email });

        const authState = req.query.state || 'login';
        console.log('Auth State:', authState);

        if (authState === 'register') {
          // Registration Flow
          if (user) {
            return done(null, false, { message: 'User already exists. Please login instead.' });
          } else {

            const baseUsername = email.split('@')[0];
            let username = baseUsername;
            let counter = 1;
            
            // Check if username exists and make it unique
            while (await User.findOne({ username })) {
              username = `${baseUsername}${counter}`;
              counter++;
            }

            user = new User({
              name: profile.displayName,
              email,
              username: username,
              password: null,
            });

            await user.save();
            console.log('User registered successfully via Google');
            return done(null, user);
          }
        } else {
          // Login Flow
          if (!user) {
            return done(null, false, { message: 'No account found. Please register first.' });
          }
          console.log('User logged in successfully via Google');
          return done(null, user);
        }
      } catch (err) {
        console.error('Error during Google authentication:', err);
        return done(err, null);
      }
    }
  )
);

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;