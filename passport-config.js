// passport-config.js
const LocalStrategy = require("passport-local").Strategy;
const User = require("./models/User");

function initialize(passport) {
  const authenticateUser = async (username, password, done) => {
    const user = await User.findOne({ username });
    if (!user) return done(null, false, { message: "No user with that username" });

    if (user.password === password) return done(null, user); // plain-text check
    return done(null, false, { message: "Password incorrect" });
  };

  passport.use(new LocalStrategy(authenticateUser));

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
  });
}

module.exports = initialize;
