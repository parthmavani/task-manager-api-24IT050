/**
 * Custom 404 Not Found Middleware
 * Catches requests to undefined routes and returns a structured JSON response.
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    error: 'Route Not Found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
};

module.exports = notFoundHandler;
