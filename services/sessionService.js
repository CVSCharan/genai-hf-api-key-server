const Session = require('../models/Session');
const logger = require('../utils/logger');

// Get all active sessions
exports.getAllActiveSessions = async () => {
  try {
    logger.info('Retrieving all active sessions');
    const sessions = await Session.find({ expires: { $gt: new Date() } });
    logger.info(`Found ${sessions.length} active sessions`);
    return sessions;
  } catch (error) {
    logger.error('Error getting active sessions:', { error: error.message, stack: error.stack });
    throw error;
  }
};

// Delete session by ID
exports.deleteSessionById = async (sessionId) => {
  try {
    logger.info(`Attempting to delete session with ID: ${sessionId}`);
    const result = await Session.findOneAndDelete({ sessionId });
    
    if (result) {
      logger.info(`Successfully deleted session: ${sessionId}`);
    } else {
      logger.warn(`Session not found for deletion: ${sessionId}`);
    }
    
    return result;
  } catch (error) {
    logger.error(`Error deleting session ${sessionId}:`, { error: error.message, stack: error.stack });
    throw error;
  }
};

// Delete all sessions for a user
exports.deleteUserSessions = async (userId) => {
  try {
    logger.info(`Attempting to delete all sessions for user: ${userId}`);
    const sessions = await Session.find();
    logger.debug(`Found ${sessions.length} total sessions to filter for user ${userId}`);
    
    const userSessions = sessions.filter(session => {
      const sessionData = session.session;
      return sessionData.passport && sessionData.passport.user === userId;
    });
    
    logger.info(`Found ${userSessions.length} sessions belonging to user ${userId}`);
    
    for (const session of userSessions) {
      logger.debug(`Deleting session ${session._id} for user ${userId}`);
      await Session.findByIdAndDelete(session._id);
    }
    
    logger.info(`Successfully deleted ${userSessions.length} sessions for user ${userId}`);
    return userSessions.length;
  } catch (error) {
    logger.error(`Error deleting sessions for user ${userId}:`, { error: error.message, stack: error.stack });
    throw error;
  }
};