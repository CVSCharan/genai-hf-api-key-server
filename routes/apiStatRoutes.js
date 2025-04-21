const express = require("express");
const router = express.Router();
const apiStatController = require("../controllers/apiStatController");
const { isAuthenticated, isAdmin } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

// Log route access
const logRoute = (req, res, next) => {
  logger.info(`API stat route accessed: ${req.method} ${req.originalUrl}`, { ip: req.ip });
  next();
};

// Apply middleware
router.use(logRoute);
router.use(isAuthenticated);

// Routes
router.get("/by-route", apiStatController.getStatsByRoute);
router.get("/by-user", apiStatController.getStatsByUser);
router.get("/aggregated", isAdmin, apiStatController.getAggregatedStats);

module.exports = router;