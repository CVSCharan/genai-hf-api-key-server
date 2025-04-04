/**
 * Authentication and authorization middleware
 * Provides functions to check if a user is authenticated or has admin privileges
 */
const logger = require('../utils/logger');

// Check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    logger.debug('User authenticated successfully', { 
      userId: req.user._id, 
      path: req.originalUrl 
    });
    return next();
  }
  logger.warn('Unauthenticated access attempt', { 
    path: req.originalUrl, 
    ip: req.ip 
  });
  res.status(401).json({
    success: false,
    message: "Authentication required. Please log in.",
  });
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    logger.debug('Admin access granted', { 
      userId: req.user._id, 
      path: req.originalUrl 
    });
    return next();
  }
  logger.warn('Unauthorized admin access attempt', { 
    userId: req.user?._id, 
    path: req.originalUrl, 
    ip: req.ip 
  });
  res.status(403).json({
    success: false,
    message: "Admin access required for this operation.",
  });
};

// Check if user owns the resource or is admin
exports.isOwnerOrAdmin = (resourceField) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('Unauthenticated access attempt to protected resource', { 
        path: req.originalUrl, 
        ip: req.ip 
      });
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please log in.",
      });
    }

    const resourceId = req.params[resourceField];
    logger.debug('Checking resource ownership', { 
      userId: req.user._id, 
      resourceField, 
      resourceId 
    });
    
    if (req.user.isAdmin || req.user._id.toString() === resourceId) {
      logger.debug('Resource access granted', { 
        userId: req.user._id, 
        isAdmin: req.user.isAdmin, 
        resourceId 
      });
      return next();
    }
    
    logger.warn('Unauthorized resource access attempt', { 
      userId: req.user._id, 
      resourceId, 
      path: req.originalUrl 
    });
    res.status(403).json({
      success: false,
      message: "You don't have permission to perform this action.",
    });
  };
};

// Rate limiting middleware for API requests
exports.apiRateLimit = (maxRequests, timeWindow) => {
  const requestCounts = new Map();
  
  return (req, res, next) => {
    const userId = req.user ? req.user._id.toString() : req.ip;
    const now = Date.now();
    
    if (!requestCounts.has(userId)) {
      requestCounts.set(userId, []);
      logger.debug('Initializing rate limit tracking for user', { userId });
    }
    
    // Filter requests within the time window
    const userRequests = requestCounts.get(userId);
    const recentRequests = userRequests.filter(timestamp => now - timestamp < timeWindow);
    
    logger.debug('Rate limit check', { 
      userId, 
      currentCount: recentRequests.length, 
      maxRequests, 
      path: req.originalUrl 
    });
    
    if (recentRequests.length >= maxRequests) {
      const retryAfter = Math.ceil((timeWindow - (now - recentRequests[0])) / 1000);
      logger.warn('Rate limit exceeded', { 
        userId, 
        path: req.originalUrl, 
        requestCount: recentRequests.length, 
        retryAfter 
      });
      return res.status(429).json({
        success: false,
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      });
    }
    
    // Add current request timestamp
    recentRequests.push(now);
    requestCounts.set(userId, recentRequests);
    
    next();
  };
};