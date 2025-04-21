const apiStatService = require("../services/apiStatService");
const logger = require("../utils/logger");

// Get stats by route
exports.getStatsByRoute = async (req, res) => {
  try {
    const { route, startDate, endDate } = req.query;
    
    if (!route) {
      return res.status(400).json({
        success: false,
        message: "Route parameter is required"
      });
    }
    
    const stats = await apiStatService.getStatsByRoute(route, startDate, endDate);
    
    res.json({
      success: true,
      count: stats.length,
      stats
    });
  } catch (error) {
    logger.error("Error fetching stats by route:", {
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

// Get stats by user
exports.getStatsByUser = async (req, res) => {
  try {
    const { userId, startDate, endDate } = req.query;
    
    // If no userId provided, use the current user's ID
    const targetUserId = userId || req.user._id;
    
    // Only admins can view other users' stats
    if (userId && userId !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view other users' stats"
      });
    }
    
    const stats = await apiStatService.getStatsByUser(targetUserId, startDate, endDate);
    
    res.json({
      success: true,
      count: stats.length,
      stats
    });
  } catch (error) {
    logger.error("Error fetching stats by user:", {
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

// Get aggregated stats
exports.getAggregatedStats = async (req, res) => {
  try {
    const { groupBy, startDate, endDate } = req.query;
    
    if (!groupBy || !["route", "method", "day", "hour"].includes(groupBy)) {
      return res.status(400).json({
        success: false,
        message: "Valid groupBy parameter is required (route, method, day, or hour)"
      });
    }
    
    const stats = await apiStatService.getAggregatedStats(groupBy, startDate, endDate);
    
    res.json({
      success: true,
      count: stats.length,
      stats
    });
  } catch (error) {
    logger.error("Error fetching aggregated stats:", {
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