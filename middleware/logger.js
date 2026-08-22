/**
 * Global Request Logging Middleware
 * Logs HTTP Method, Request URL, and Timestamp for every incoming request.
 */
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl || req.url}`);
  next();
};

module.exports = requestLogger;
