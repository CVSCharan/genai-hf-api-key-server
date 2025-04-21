const apiStatService = require("../services/apiStatService");

// Middleware to track API stats
const trackApiStat = (req, res, next) => {
  // Record start time
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function
  res.end = function (chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Restore original end function
    res.end = originalEnd;

    // Call original end function
    res.end(chunk, encoding);

    // Record API stat
    const statData = {
      route: req.originalUrl,
      method: req.method,
      statusCode: res.statusCode,
      responseTime,
      userIp: req.ip,
      userName: req.user ? req.user.name : undefined,
      userId: req.user ? req.user._id : undefined,
    };

    apiStatService.recordApiStat(statData);
  };

  next();
};

module.exports = { trackApiStat };
