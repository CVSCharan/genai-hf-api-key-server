const passport = require("passport");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require("../utils/logger");

/**
 * Middleware to check if user is authenticated
 */
exports.isAuthenticated = (req, res, next) => {
  // First check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Find the user
      User.findById(decoded.id)
        .then(user => {
          if (!user) {
            logger.warn("JWT authentication failed: User not found", {
              userId: decoded.id,
              ip: req.ip
            });
            return res.status(401).json({
              success: false,
              message: "Unauthorized - Invalid token"
            });
          }
          
          // Add user to request object
          req.user = user;
          logger.info("User authenticated via JWT", {
            userId: user._id,
            ip: req.ip
          });
          next();
        })
        .catch(err => {
          logger.error("Error finding user for JWT authentication", {
            error: err.message,
            stack: err.stack,
            ip: req.ip
          });
          return res.status(500).json({
            success: false,
            message: "Server error during authentication"
          });
        });
      
      return;
    } catch (error) {
      logger.warn("JWT authentication failed: Invalid token", {
        error: error.message,
        ip: req.ip
      });
      // Continue to session-based auth if JWT fails
    }
  }
  
  // Fall back to session-based authentication
  if (req.isAuthenticated()) {
    logger.info("User authenticated via session", {
      userId: req.user._id,
      ip: req.ip
    });
    return next();
  }
  
  logger.warn("Authentication failed: No valid session or token", {
    ip: req.ip,
    path: req.originalUrl
  });
  
  res.status(401).json({
    success: false,
    message: "Unauthorized - Please log in"
  });
};

/**
 * Middleware to check if user is an admin
 */
exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    logger.warn("Admin check failed: No user in request", {
      ip: req.ip,
      path: req.originalUrl
    });
    return res.status(401).json({
      success: false,
      message: "Unauthorized - Please log in"
    });
  }
  
  if (req.user.isAdmin) {
    logger.info("Admin access granted", {
      userId: req.user._id,
      ip: req.ip,
      path: req.originalUrl
    });
    return next();
  }
  
  logger.warn("Admin access denied", {
    userId: req.user._id,
    ip: req.ip,
    path: req.originalUrl
  });
  
  res.status(403).json({
    success: false,
    message: "Forbidden - Admin access required"
  });
};

/**
 * Generate JWT token for user
 */
exports.generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

/**
 * Set JWT token in cookie
 */
exports.setTokenCookie = (res, token, isAdmin = false) => {
  const cookieName = isAdmin ? "admin_token" : "auth_token";
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  };
  
  res.cookie(cookieName, JSON.stringify(token), cookieOptions);
  logger.debug(`Set ${cookieName} cookie`);
};

/**
 * Clear auth cookies
 */
exports.clearAuthCookies = (res) => {
  res.clearCookie("auth_token");
  res.clearCookie("admin_token");
  logger.debug("Cleared auth cookies");
};

/**
 * Middleware to handle API key authentication
 */
exports.apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers["x-api-key"];
  
  if (!apiKey) {
    logger.warn("API key authentication failed: No API key provided", {
      ip: req.ip,
      path: req.originalUrl
    });
    return res.status(401).json({
      success: false,
      message: "API key is required"
    });
  }
  
  // Here you would validate the API key against your database
  // This is a placeholder for your actual API key validation logic
  
  // For now, we'll just check if it matches an environment variable
  if (apiKey === process.env.API_KEY) {
    logger.info("API key authentication successful", {
      ip: req.ip,
      path: req.originalUrl
    });
    return next();
  }
  
  logger.warn("API key authentication failed: Invalid API key", {
    ip: req.ip,
    path: req.originalUrl
  });
  
  res.status(401).json({
    success: false,
    message: "Invalid API key"
  });
};