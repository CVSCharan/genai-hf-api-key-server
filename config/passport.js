const GoogleStrategy = require("passport-google-oauth20").Strategy;
const GitHubStrategy = require("passport-github2").Strategy;
const User = require("../models/User");

module.exports = function (passport) {
  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/v1/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ 
            provider: "google", 
            providerId: profile.id 
          });

          if (user) {
            return done(null, user);
          }

          // If not, create new user
          user = await User.create({
            provider: "google",
            providerId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            picture: profile.photos[0].value,
          });

          done(null, user);
        } catch (err) {
          console.error("Error in Google strategy:", err);
          done(err, null);
        }
      }
    )
  );

  // GitHub Strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL || "/api/v1/auth/github/callback",
        scope: ["user:email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ 
            provider: "github", 
            providerId: profile.id 
          });

          if (user) {
            return done(null, user);
          }

          // Get primary email
          const primaryEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          
          if (!primaryEmail) {
            return done(new Error("No email found from GitHub profile"), null);
          }

          // If not, create new user
          user = await User.create({
            provider: "github",
            providerId: profile.id,
            name: profile.displayName || profile.username,
            email: primaryEmail,
            picture: profile.photos[0].value,
          });

          done(null, user);
        } catch (err) {
          console.error("Error in GitHub strategy:", err);
          done(err, null);
        }
      }
    )
  );
};