require("dotenv").config();

const express = require("express");
const cors = require("cors");
const passport = require("passport");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const localAuthRoutes = require("./routes/localAuthRoutes");
const testimonialRoutes = require("./routes/testimonialRoutes");
const huggingfaceRoutes = require("./routes/huggingfaceRoutes");
const apiStatRoutes = require("./routes/apiStatRoutes");
const { configureSession } = require("./controllers/sessionController");
const { trackApiStat } = require("./middleware/apiStatMiddleware");

// Passport config
require("./config/passport")(passport);

const app = express();
const port = process.env.PORT || 4040;

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://genai.charan-cvs.dev",
    ],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  })
);

// Connect to Database
connectDB();

// Session middleware (using session controller)
app.use(configureSession());

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// API stats tracking middleware (apply to all routes)
app.use(trackApiStat);

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to GenAI API Key Project Server");
});

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/local-auth", localAuthRoutes);
app.use("/api/v1/sessions", sessionRoutes);
app.use("/api/v1/testimonials", testimonialRoutes);
app.use("/api/v1/huggingface", huggingfaceRoutes);
app.use("/api/v1/stats", apiStatRoutes);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
