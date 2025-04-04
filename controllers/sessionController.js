const session = require("express-session");
const MongoStore = require("connect-mongo");
const sessionService = require("../services/sessionService");
const logger = require("../utils/logger");

// Configure session middleware
exports.configureSession = () => {
  logger.info("Configuring session middleware");
  return session({
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      stringify: false,
      autoRemove: "interval",
      autoRemoveInterval: 60, // In minutes
      ttl: 24 * 60 * 60, // 1 day in seconds
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
    },
  });
};

// Get all active sessions
exports.getAllSessions = async (req, res) => {
  logger.info("Request to get all active sessions");
  try {
    // Check if user is admin (you might want to add middleware for this)
    if (!req.user || !req.user.isAdmin) {
      logger.warn(`Unauthorized access attempt to get all sessions by user: ${req.user ? req.user._id : 'unauthenticated'}`);
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const sessions = await sessionService.getAllActiveSessions();
    logger.info(`Retrieved ${sessions.length} active sessions`);
    res.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    logger.error("Error getting sessions:", { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Delete session by ID
exports.deleteSession = async (req, res) => {
  const sessionId = req.params.id;
  logger.info(`Request to delete session with ID: ${sessionId}`);
  
  try {
    // Check if user is admin or the session belongs to the user
    if (!req.user || (!req.user.isAdmin && req.sessionID !== sessionId)) {
      logger.warn(`Unauthorized attempt to delete session ${sessionId} by user: ${req.user ? req.user._id : 'unauthenticated'}`);
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const result = await sessionService.deleteSessionById(sessionId);

    if (!result) {
      logger.warn(`Session not found: ${sessionId}`);
      return res.status(404).json({
        success: false,
        message: "Session not found",
      });
    }

    logger.info(`Session deleted successfully: ${sessionId}`);
    res.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    logger.error(`Error deleting session ${sessionId}:`, { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Delete all sessions for a user
exports.deleteUserSessions = async (req, res) => {
  const userId = req.params.userId;
  logger.info(`Request to delete all sessions for user: ${userId}`);
  
  try {
    // Check if user is admin or the user is deleting their own sessions
    if (
      !req.user ||
      (!req.user.isAdmin && req.user._id.toString() !== userId)
    ) {
      logger.warn(`Unauthorized attempt to delete sessions for user ${userId} by user: ${req.user ? req.user._id : 'unauthenticated'}`);
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    const count = await sessionService.deleteUserSessions(userId);
    logger.info(`Deleted ${count} sessions for user: ${userId}`);

    res.json({
      success: true,
      message: `${count} sessions deleted successfully`,
    });
  } catch (error) {
    logger.error(`Error deleting sessions for user ${userId}:`, { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
