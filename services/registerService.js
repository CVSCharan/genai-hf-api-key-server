const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const logger = require("../utils/logger");
const { sendEmail } = require("../utils/emailService");

// Register new user
exports.registerUser = async (name, email, password) => {
  logger.info("Registering new user", { email });

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    logger.warn("Registration failed: Email already in use", { email });
    throw new Error("Email already in use");
  }

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    provider: "local",
    role: "user",
    verificationToken,
    isVerified: false,
  });

  // Send verification email
  const verificationUrl = `${
    process.env.API_URL || "http://localhost:4040"
  }/api/v1/auth/verify/${verificationToken}`;

  try {
    await sendEmail({
      to: email,
      subject: "Verify Your Email",
      text: `Please verify your email by clicking on the following link: ${verificationUrl}`,
      html: `<p>Please verify your email by clicking on the following link: <a href="${verificationUrl}">Verify Email</a></p>`,
    });

    logger.info("Verification email sent", { email });
  } catch (error) {
    logger.error("Error sending verification email", {
      error: error.message,
      email,
    });
    // Continue with registration even if email fails
  }

  logger.info("User registered successfully", { userId: user._id });
  return { user };
};

// Get Google OAuth URL for registration
exports.getGoogleAuthUrl = () => {
  logger.info("Generating Google OAuth URL for registration");
  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    client_id: process.env.GOOGLE_CLIENT_ID,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" "),
    state: "register", // Indicate this is a registration attempt
  };

  const queryString = new URLSearchParams(options).toString();
  logger.debug("Google OAuth URL generated for registration", {
    redirect_uri: options.redirect_uri,
  });
  return `${rootUrl}?${queryString}`;
};

// Get GitHub OAuth URL for registration
exports.getGithubAuthUrl = () => {
  logger.info("Generating GitHub OAuth URL for registration");
  const rootUrl = "https://github.com/login/oauth/authorize";
  const options = {
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_REDIRECT_URI,
    scope: "user:email",
    state: "register", // Indicate this is a registration attempt
  };

  const queryString = new URLSearchParams(options).toString();
  logger.debug("GitHub OAuth URL generated for registration", {
    redirect_uri: options.redirect_uri,
  });
  return `${rootUrl}?${queryString}`;
};

// Verify email
exports.verifyEmail = async (token) => {
  logger.info("Verifying email with token");

  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    logger.warn("Email verification failed: Invalid token");
    throw new Error("Invalid verification token");
  }

  user.isVerified = true;
  user.verificationToken = undefined;
  await user.save();

  logger.info("Email verified successfully", { userId: user._id });
  return { user };
};
