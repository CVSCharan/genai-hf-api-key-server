const User = require("../models/User");
const logger = require("../utils/logger");

// Get user statistics
exports.getUserStats = async () => {
  try {
    logger.debug("Fetching user statistics");
    
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const adminUsers = await User.countDocuments({ isAdmin: true });
    
    // Get user count by role
    const usersByRole = await User.aggregate([
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    return {
      totalUsers,
      verifiedUsers,
      adminUsers,
      usersByRole: usersByRole.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };
  } catch (error) {
    logger.error("Error fetching user statistics:", {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Get authentication method statistics
exports.getAuthMethodStats = async () => {
  try {
    logger.debug("Fetching authentication method statistics");
    
    const authMethods = await User.aggregate([
      { $group: { _id: "$provider", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    return {
      authMethods: authMethods.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };
  } catch (error) {
    logger.error("Error fetching auth method statistics:", {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Get registration statistics by date
exports.getRegistrationStats = async (period = 'month') => {
  try {
    logger.debug(`Fetching registration statistics for period: ${period}`);
    
    let dateFormat;
    let startDate;
    
    // Set date format and start date based on period
    switch(period) {
      case 'week':
        dateFormat = '%Y-%m-%d';
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        dateFormat = '%Y-%m-%d';
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        dateFormat = '%Y-%m';
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        dateFormat = '%Y-%m-%d';
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
    }
    
    const registrations = await User.aggregate([
      { 
        $match: { 
          createdAt: { $gte: startDate } 
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    return {
      period,
      registrations
    };
  } catch (error) {
    logger.error("Error fetching registration statistics:", {
      error: error.message,
      stack: error.stack,
      period
    });
    throw error;
  }
};

// This would require a login history collection
// For now, we'll return a placeholder
exports.getLoginStats = async (period = 'month') => {
  try {
    logger.debug(`Fetching login statistics for period: ${period}`);
    
    // This would normally query a login history collection
    // For now, return placeholder data
    return {
      period,
      message: "Login statistics require a login history collection. Consider implementing this feature in the future."
    };
  } catch (error) {
    logger.error("Error fetching login statistics:", {
      error: error.message,
      stack: error.stack,
      period
    });
    throw error;
  }
};