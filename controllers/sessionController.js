const session = require("express-session");
const MongoStore = require("connect-mongo");
const logger = require("../utils/logger");

// Configure session middleware
exports.configureSession = () => {
  logger.info("Configuring session middleware");
  return session({
    secret: process.env.SESSION_SECRET || "keyboard cat",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 24 * 60 * 60, // 1 day in seconds
      autoRemove: 'native',
      // Disable crypto to avoid decryption issues
      crypto: undefined,
      // Add error handling for serialization
      stringify: false,
      serialize: (obj) => {
        try {
          // Ensure cookie has all required properties
          if (obj && obj.cookie) {
            // Make sure expires is a Date object
            if (obj.cookie.expires && typeof obj.cookie.expires === 'string') {
              obj.cookie.expires = new Date(obj.cookie.expires);
            }
            // Ensure all required properties exist
            obj.cookie = {
              originalMaxAge: obj.cookie.originalMaxAge || 86400000,
              expires: obj.cookie.expires || new Date(Date.now() + 86400000),
              secure: obj.cookie.secure || false,
              httpOnly: obj.cookie.httpOnly || true,
              path: obj.cookie.path || '/',
              sameSite: obj.cookie.sameSite || 'lax',
              domain: obj.cookie.domain || null
            };
          }
          return JSON.stringify(obj);
        } catch (err) {
          logger.error('Session serialization error:', err);
          return '{}';
        }
      },
      // Add error handling for deserialization
      unserialize: (str) => {
        try {
          const obj = JSON.parse(str);
          // Ensure cookie has all required properties
          if (obj && obj.cookie) {
            // Convert expires string to Date object
            if (obj.cookie.expires && typeof obj.cookie.expires === 'string') {
              obj.cookie.expires = new Date(obj.cookie.expires);
            }
          }
          return obj;
        } catch (err) {
          logger.error('Session deserialization error:', str, err);
          return {};
        }
      }
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    }
  });
};
