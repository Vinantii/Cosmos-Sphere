// app.js
const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("connect-flash");

const app = express();
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// -----------------
// Connect to MongoDB
// -----------------
mongoose.connect("mongodb://127.0.0.1:27017/qnaApp")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB Error:", err));

// -----------------
// Models
// -----------------
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // plain text
  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

const questionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  user: { type: String, required: true }, // who posted the question
  answers: [
    {
      text: { type: String, required: true },
      user: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }
  ],
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
const Question = mongoose.model("Question", questionSchema);

// -----------------
// Passport Config
// -----------------
passport.use(new LocalStrategy(async (username, password, done) => {
  const user = await User.findOne({ username });
  if (!user) return done(null, false, { message: "No user with that username" });
  if (user.password !== password) return done(null, false, { message: "Password incorrect" });
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// -----------------
// Middleware
// -----------------
app.use(session({
  secret: "secretKey",
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// Make user available in all views
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

// Protect routes
function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// -----------------
// Routes
// -----------------
app.get("/landing", (req,res)=>res.render("landing"));

// -------- Auth Routes --------
app.get("/register", (req, res) => {
  res.render("register", { messages: req.flash() });
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  const exists = await User.findOne({ username });
  if (exists) {
    req.flash("error", "User already exists");
    return res.redirect("/register");
  }

  await User.create({ username, password });
  req.flash("success", "Account created! You can now login.");
  res.redirect("/login");
});


app.get("/login", (req, res) => {
  res.render("login", { messages: req.flash() });
});

app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/view-questions",
    failureRedirect: "/login",
    failureFlash: true
  })
);

app.get("/logout", (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect("/login");
  });
});

// -------- Question Routes --------
// Post a new question
app.get("/post-question", checkAuthenticated, (req, res) => res.render("post-question"));
app.post("/post-question", checkAuthenticated, async (req, res) => {
  await Question.create({ question: req.body.question, user: req.user.username });
  res.redirect("/view-questions");
});

// View all questions
app.get("/view-questions", async (req, res) => {
  const questions = await Question.find().sort({ createdAt: -1 });
  res.render("view-questions", { questions });
});

// Get form to answer a question
app.get("/answer-question/:id", checkAuthenticated, async (req, res) => {
  const question = await Question.findById(req.params.id);
  res.render("answer-question", { question });
});

// Submit answer
app.post("/answer-question/:id", checkAuthenticated, async (req, res) => {
  const newAnswer = { text: req.body.answer, user: req.user.username };
  await Question.findByIdAndUpdate(req.params.id, { $push: { answers: newAnswer } });
  res.redirect("/view-questions");
});

// Like a question
app.post("/like/:id", checkAuthenticated, async (req, res) => {
  await Question.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
  res.redirect("/view-questions");
});

//check auth

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

// Example: protect posting a question
app.get("/post-question", checkAuthenticated, (req, res) => res.render("post-question"));
app.post("/post-question", checkAuthenticated, async (req, res) => {
  await Question.create({ question: req.body.question, user: req.user.username });
  res.redirect("/view-questions");
});


// -----------------
// Start Server
// -----------------
app.listen(8080, () => console.log("Server running on port 8080"));
