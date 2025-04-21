const ApiStat = require("../models/ApiStat");
const logger = require("../utils/logger");

// Record API stat
exports.recordApiStat = async (statData) => {
  try {
    return await ApiStat.create(statData);
  } catch (error) {
    logger.error("Error recording API stat:", {
      error: error.message,
      stack: error.stack,
      route: statData.route
    });
    // Don't throw error to prevent affecting the main request flow
  }
};

// Get stats by route
exports.getStatsByRoute = async (route, startDate, endDate) => {
  try {
    const query = { route };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    return await ApiStat.find(query).sort({ timestamp: -1 });
  } catch (error) {
    logger.error("Error fetching stats by route:", {
      error: error.message,
      stack: error.stack,
      route
    });
    throw error;
  }
};

// Get stats by user
exports.getStatsByUser = async (userId, startDate, endDate) => {
  try {
    const query = { userId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    return await ApiStat.find(query).sort({ timestamp: -1 });
  } catch (error) {
    logger.error("Error fetching stats by user:", {
      error: error.message,
      stack: error.stack,
      userId
    });
    throw error;
  }
};

// Get aggregated stats
exports.getAggregatedStats = async (groupBy, startDate, endDate) => {
  try {
    const matchStage = {};
    if (startDate || endDate) {
      matchStage.timestamp = {};
      if (startDate) matchStage.timestamp.$gte = new Date(startDate);
      if (endDate) matchStage.timestamp.$lte = new Date(endDate);
    }

    let groupStage = {};
    if (groupBy === "route") {
      groupStage = {
        _id: "$route",
        count: { $sum: 1 },
        avgResponseTime: { $avg: "$responseTime" },
        successCount: {
          $sum: {
            $cond: [{ $lt: ["$statusCode", 400] }, 1, 0]
          }
        },
        errorCount: {
          $sum: {
            $cond: [{ $gte: ["$statusCode", 400] }, 1, 0]
          }
        }
      };
    } else if (groupBy === "method") {
      groupStage = {
        _id: "$method",
        count: { $sum: 1 },
        avgResponseTime: { $avg: "$responseTime" },
        successCount: {
          $sum: {
            $cond: [{ $lt: ["$statusCode", 400] }, 1, 0]
          }
        },
        errorCount: {
          $sum: {
            $cond: [{ $gte: ["$statusCode", 400] }, 1, 0]
          }
        }
      };
    } else if (groupBy === "day") {
      groupStage = {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
        count: { $sum: 1 },
        avgResponseTime: { $avg: "$responseTime" },
        successCount: {
          $sum: {
            $cond: [{ $lt: ["$statusCode", 400] }, 1, 0]
          }
        },
        errorCount: {
          $sum: {
            $cond: [{ $gte: ["$statusCode", 400] }, 1, 0]
          }
        }
      };
    } else if (groupBy === "hour") {
      groupStage = {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
          hour: { $hour: "$timestamp" }
        },
        count: { $sum: 1 },
        avgResponseTime: { $avg: "$responseTime" },
        successCount: {
          $sum: {
            $cond: [{ $lt: ["$statusCode", 400] }, 1, 0]
          }
        },
        errorCount: {
          $sum: {
            $cond: [{ $gte: ["$statusCode", 400] }, 1, 0]
          }
        }
      };
    }

    const pipeline = [
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { _id: 1 } }
    ];

    return await ApiStat.aggregate(pipeline);
  } catch (error) {
    logger.error("Error fetching aggregated stats:", {
      error: error.message,
      stack: error.stack,
      groupBy
    });
    throw error;
  }
};