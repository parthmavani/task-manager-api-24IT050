/**
 * Global Error Handling Middleware
 * Placed at the end of the Express middleware pipeline (4 parameters).
 * Logs stack traces to the console server-side and sends a safe JSON error response to the client.
 */
const errorHandler = (err, req, res, next) => {
  // Log full stack trace server-side for internal debugging
  console.error('[Error Pipeline Caught]', err.stack || err.message);

  // Handle Mongoose Validation Errors (e.g. required field missing, invalid enum value)
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Document validation failed',
      details: errors
    });
  }

  // Handle Mongoose Cast Errors (e.g. invalid ObjectId format)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid ID Format',
      message: `Resource not found with id of ${err.value}`
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  
  // Do NOT send raw stack traces to the client in production for security reasons
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : err.name || 'Error',
    message: err.message || 'Something went wrong on the server'
  });
};

module.exports = errorHandler;

