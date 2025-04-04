const express = require("express");
const router = express.Router();
const sessionController = require("../controllers/sessionController");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

// Get all sessions (admin only)
router.get("/", 
  (req, res, next) => {
    logger.info("Request to get all sessions", { ip: req.ip });
    next();
  },
  isAuthenticated, 
  isAdmin, 
  sessionController.getAllSessions
);

// Delete session by ID
router.delete("/:id", 
  (req, res, next) => {
    logger.info(`Request to delete session: ${req.params.id}`, { 
      ip: req.ip,
      sessionId: req.params.id
    });
    next();
  },
  isAuthenticated, 
  sessionController.deleteSession
);

// Delete all sessions for a user
router.delete(
  "/user/:userId",
  (req, res, next) => {
    logger.info(`Request to delete all sessions for user: ${req.params.userId}`, { 
      ip: req.ip,
      userId: req.params.userId,
      requestingUser: req.user ? req.user._id : 'unauthenticated'
    });
    next();
  },
  isAuthenticated,
  sessionController.deleteUserSessions
);

module.exports = router;
