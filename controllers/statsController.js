const statsService = require("../services/statsService");
const logger = require("../utils/logger");

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    logger.info("User statistics requested", { userId: req.user._id });
    
    const stats = await statsService.getUserStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error("Error fetching user statistics:", {
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get authentication method statistics
exports.getAuthMethodStats = async (req, res) => {
  try {
    logger.info("Auth method statistics requested", { userId: req.user._id });
    
    const stats = await statsService.getAuthMethodStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error("Error fetching auth method statistics:", {
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get registration statistics
exports.getRegistrationStats = async (req, res) => {
  try {
    const { period } = req.query;
    logger.info("Registration statistics requested", { 
      userId: req.user._id,
      period: period || 'month'
    });
    
    const stats = await statsService.getRegistrationStats(period);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error("Error fetching registration statistics:", {
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// Get login statistics
exports.getLoginStats = async (req, res) => {
  try {
    const { period } = req.query;
    logger.info("Login statistics requested", { 
      userId: req.user._id,
      period: period || 'month'
    });
    
    const stats = await statsService.getLoginStats(period);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error("Error fetching login statistics:", {
      error: error.message,
      stack: error.stack,
      userId: req.user._id
    });
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};