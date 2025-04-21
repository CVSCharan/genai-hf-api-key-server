const express = require("express");
const router = express.Router();
const huggingfaceController = require("../controllers/huggingfaceController");
const { isAuthenticated } = require("../middleware/authMiddleware");
const logger = require("../utils/logger");

// Log route access
const logRoute = (req, res, next) => {
  logger.info(`Hugging Face route accessed: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
  });
  next();
};

// Apply logging middleware to all routes
router.use(logRoute);
router.use(isAuthenticated);

// Model inference routes
router.post("/creative", huggingfaceController.generateCreativeText);
router.post("/sentiment", huggingfaceController.analyzeSentiment);
router.post("/conversation", huggingfaceController.conversationalResponse);

module.exports = router;
