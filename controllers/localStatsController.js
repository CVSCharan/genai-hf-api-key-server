const localStatsService = require("../services/localStatsService");
const logger = require("../utils/logger");

// Get local user statistics
exports.getLocalUserStats = async (req, res) => {
  try {
    logger.info("Local user statistics requested", { userId: req.user._id });
    
    const stats = await localStatsService.getLocalUserStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error("Error fetching local user statistics:", {
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

// Get verification statistics
exports.getVerificationStats = async (req, res) => {
  try {
    logger.info("Verification statistics requested", { userId: req.user._id });
    
    const stats = await localStatsService.getVerificationStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error("Error fetching verification statistics:", {
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

// Get local registration statistics
exports.getLocalRegistrationStats = async (req, res) => {
  try {
    const { period } = req.query;
    logger.info("Local registration statistics requested", { 
      userId: req.user._id,
      period: period || 'month'
    });
    
    const stats = await localStatsService.getLocalRegistrationStats(period);
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error("Error fetching local registration statistics:", {
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

// Get password reset statistics
exports.getPasswordResetStats = async (req, res) => {
  try {
    logger.info("Password reset statistics requested", { userId: req.user._id });
    
    const stats = await localStatsService.getPasswordResetStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error("Error fetching password reset statistics:", {
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