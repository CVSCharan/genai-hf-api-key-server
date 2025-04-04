const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User"); // You'll need to create this model
const logger = require("../utils/logger");

// Google OAuth
exports.getGoogleAuthUrl = () => {
  logger.info("Generating Google OAuth URL");
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
  };

  const queryString = new URLSearchParams(options).toString();
  logger.debug("Google OAuth URL generated with options", { redirect_uri: options.redirect_uri });
  return `${rootUrl}?${queryString}`;
};

exports.handleGoogleCallback = async (code) => {
  logger.info("Handling Google OAuth callback");
  
  // Get tokens
  logger.debug("Requesting Google tokens with auth code");
  const { id_token, access_token } = await getGoogleTokens(code);
  
  // Get user with tokens
  logger.debug("Fetching Google user profile");
  const googleUser = await getGoogleUser(id_token, access_token);
  
  if (!googleUser.verified_email) {
    logger.warn("Unverified Google account attempted login", { email: googleUser.email });
    throw new Error("Google account not verified");
  }
  
  // Upsert user
  logger.info("Upserting user from Google profile", { email: googleUser.email });
  const user = await upsertUser({
    email: googleUser.email,
    name: googleUser.name,
    picture: googleUser.picture,
    provider: "google",
    providerId: googleUser.sub,
  });
  
  // Create JWT token
  logger.debug("Creating JWT token for authenticated user", { userId: user._id });
  const token = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  
  logger.info("Google authentication successful", { userId: user._id });
  return { user, token };
};

async function getGoogleTokens(code) {
  const url = "https://oauth2.googleapis.com/token";
  const values = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    grant_type: "authorization_code",
  };

  try {
    logger.debug("Requesting tokens from Google OAuth API");
    const response = await axios.post(url, values, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    logger.debug("Google tokens received successfully");
    return response.data;
  } catch (error) {
    logger.error("Error getting Google tokens:", { 
      error: error.message, 
      response: error.response?.data,
      status: error.response?.status
    });
    throw new Error(error.message);
  }
}

async function getGoogleUser(id_token, access_token) {
  try {
    logger.debug("Fetching user info from Google API");
    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
      {
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      }
    );
    logger.debug("Google user info retrieved successfully");
    return response.data;
  } catch (error) {
    logger.error("Error getting Google user:", { 
      error: error.message, 
      response: error.response?.data,
      status: error.response?.status
    });
    throw new Error(error.message);
  }
}

// GitHub OAuth
exports.getGithubAuthUrl = () => {
  logger.info("Generating GitHub OAuth URL");
  const rootUrl = "https://github.com/login/oauth/authorize";
  const options = {
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_REDIRECT_URI,
    scope: "user:email",
  };

  const queryString = new URLSearchParams(options).toString();
  logger.debug("GitHub OAuth URL generated with options", { redirect_uri: options.redirect_uri });
  return `${rootUrl}?${queryString}`;
};

exports.handleGithubCallback = async (code) => {
  logger.info("Handling GitHub OAuth callback");
  
  // Get token
  logger.debug("Requesting GitHub access token with auth code");
  const token = await getGithubToken(code);
  
  // Get user with token
  logger.debug("Fetching GitHub user profile");
  const githubUser = await getGithubUser(token);
  
  // Get user email
  logger.debug("Fetching GitHub user emails");
  const emails = await getGithubUserEmails(token);
  const primaryEmail = emails.find(email => email.primary)?.email;
  
  if (!primaryEmail) {
    logger.warn("No primary email found for GitHub user", { userId: githubUser.id });
    throw new Error("No primary email found");
  }
  
  // Upsert user
  logger.info("Upserting user from GitHub profile", { email: primaryEmail });
  const user = await upsertUser({
    email: primaryEmail,
    name: githubUser.name || githubUser.login,
    picture: githubUser.avatar_url,
    provider: "github",
    providerId: githubUser.id.toString(),
  });
  
  // Create JWT token
  logger.debug("Creating JWT token for authenticated user", { userId: user._id });
  const jwtToken = jwt.sign(
    { id: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
  
  logger.info("GitHub authentication successful", { userId: user._id });
  return { user, token: jwtToken };
};

async function getGithubToken(code) {
  const url = "https://github.com/login/oauth/access_token";
  const values = {
    code,
    client_id: process.env.GITHUB_CLIENT_ID,
    client_secret: process.env.GITHUB_CLIENT_SECRET,
    redirect_uri: process.env.GITHUB_REDIRECT_URI,
  };

  try {
    logger.debug("Requesting access token from GitHub OAuth API");
    const response = await axios.post(url, values, {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    logger.debug("GitHub access token received successfully");
    return response.data.access_token;
  } catch (error) {
    logger.error("Error getting GitHub token:", { 
      error: error.message, 
      response: error.response?.data,
      status: error.response?.status
    });
    throw new Error(error.message);
  }
}

async function getGithubUser(token) {
  try {
    logger.debug("Fetching user info from GitHub API");
    const response = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    logger.debug("GitHub user info retrieved successfully");
    return response.data;
  } catch (error) {
    logger.error("Error getting GitHub user:", { 
      error: error.message, 
      response: error.response?.data,
      status: error.response?.status
    });
    throw new Error(error.message);
  }
}

async function getGithubUserEmails(token) {
  try {
    logger.debug("Fetching user emails from GitHub API");
    const response = await axios.get("https://api.github.com/user/emails", {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    logger.debug("GitHub user emails retrieved successfully");
    return response.data;
  } catch (error) {
    logger.error("Error getting GitHub user emails:", { 
      error: error.message, 
      response: error.response?.data,
      status: error.response?.status
    });
    throw new Error(error.message);
  }
}

// Helper function to upsert user
async function upsertUser(userData) {
  try {
    logger.debug("Upserting user in database", { email: userData.email });
    const user = await User.findOneAndUpdate(
      { email: userData.email },
      {
        ...userData,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    logger.debug("User upserted successfully", { userId: user._id });
    return user;
  } catch (error) {
    logger.error("Error upserting user:", { 
      error: error.message, 
      stack: error.stack,
      userData: { email: userData.email, provider: userData.provider }
    });
    throw new Error(error.message);
  }
}