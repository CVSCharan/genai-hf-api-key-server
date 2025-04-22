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
  const htmlResponse = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GenAI API Key Server</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 40px;
                background-color: #f4f4f4;
                color: #333;
                line-height: 1.6;
            }
            .container {
                max-width: 800px;
                margin: auto;
                background: #fff;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            }
            h1 {
                color: #0056b3;
                text-align: center;
                border-bottom: 2px solid #eee;
                padding-bottom: 10px;
            }
            p {
                text-align: center;
                font-size: 1.1em;
            }
            footer {
                text-align: center;
                margin-top: 30px;
                font-size: 0.9em;
                color: #777;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Welcome to the GenAI API Key Project Server</h1>
            <p>This server manages API keys and provides access to various Generative AI models.</p>
            <p>Explore the available API endpoints to integrate AI capabilities into your applications.</p>
            <footer>
                &copy; ${new Date().getFullYear()} CVS GenAI Platform. All rights reserved.
            </footer>
        </div>
    </body>
    </html>
  `;
  res.setHeader('Content-Type', 'text/html');
  res.send(htmlResponse);
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
