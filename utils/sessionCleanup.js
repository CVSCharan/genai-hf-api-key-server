const mongoose = require('mongoose');
const logger = require('./logger');

const cleanupSessions = async () => {
  try {
    // Check if mongoose is connected
    if (mongoose.connection.readyState !== 1) {
      logger.warn('Database connection not ready, skipping session cleanup');
      return;
    }
    
    // Check if the sessions collection exists
    const collections = await mongoose.connection.db.listCollections({ name: 'sessions' }).toArray();
    
    if (collections.length > 0) {
      // Drop the sessions collection
      await mongoose.connection.db.dropCollection('sessions');
      logger.info('Sessions collection dropped successfully');
    } else {
      logger.info('No sessions collection found');
    }
  } catch (error) {
    logger.error('Error cleaning up sessions:', error);
    // Don't throw the error, just log it and continue
  }
};

module.exports = cleanupSessions;