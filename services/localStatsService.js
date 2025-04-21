const User = require("../models/User");
const logger = require("../utils/logger");

// Get local user statistics
exports.getLocalUserStats = async () => {
  try {
    logger.debug("Fetching local user statistics");
    
    const totalLocalUsers = await User.countDocuments({ provider: "local" });
    const verifiedLocalUsers = await User.countDocuments({ 
      provider: "local", 
      isVerified: true 
    });
    const unverifiedLocalUsers = await User.countDocuments({ 
      provider: "local", 
      isVerified: false 
    });
    const adminLocalUsers = await User.countDocuments({ 
      provider: "local", 
      isAdmin: true 
    });
    
    // Get local user count by role
    const localUsersByRole = await User.aggregate([
      { $match: { provider: "local" } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    
    return {
      totalLocalUsers,
      verifiedLocalUsers,
      unverifiedLocalUsers,
      adminLocalUsers,
      localUsersByRole: localUsersByRole.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };
  } catch (error) {
    logger.error("Error fetching local user statistics:", {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Get verification statistics
exports.getVerificationStats = async () => {
  try {
    logger.debug("Fetching verification statistics");
    
    // Get verification rate
    const totalLocalUsers = await User.countDocuments({ provider: "local" });
    const verifiedLocalUsers = await User.countDocuments({ 
      provider: "local", 
      isVerified: true 
    });
    
    const verificationRate = totalLocalUsers > 0 
      ? (verifiedLocalUsers / totalLocalUsers) * 100 
      : 0;
    
    // Get verification trends by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const verificationTrends = await User.aggregate([
      { 
        $match: { 
          provider: "local",
          isVerified: true,
          updatedAt: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    return {
      totalLocalUsers,
      verifiedLocalUsers,
      unverifiedLocalUsers: totalLocalUsers - verifiedLocalUsers,
      verificationRate: verificationRate.toFixed(2),
      verificationTrends
    };
  } catch (error) {
    logger.error("Error fetching verification statistics:", {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};

// Get local registration statistics by date
exports.getLocalRegistrationStats = async (period = 'month') => {
  try {
    logger.debug(`Fetching local registration statistics for period: ${period}`);
    
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
    
    const localRegistrations = await User.aggregate([
      { 
        $match: { 
          provider: "local",
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
      localRegistrations
    };
  } catch (error) {
    logger.error("Error fetching local registration statistics:", {
      error: error.message,
      stack: error.stack,
      period
    });
    throw error;
  }
};

// Get password reset statistics
exports.getPasswordResetStats = async () => {
  try {
    logger.debug("Fetching password reset statistics");
    
    // Count users with active reset tokens
    const activeResetTokens = await User.countDocuments({
      provider: "local",
      resetPasswordToken: { $exists: true, $ne: null },
      resetPasswordExpires: { $gt: new Date() }
    });
    
    // This would be more useful with a password reset history collection
    // For now, return basic stats
    return {
      activeResetTokens,
      message: "For more detailed password reset statistics, consider implementing a password reset history collection."
    };
  } catch (error) {
    logger.error("Error fetching password reset statistics:", {
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
};