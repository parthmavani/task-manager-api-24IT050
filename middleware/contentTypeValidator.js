/**
 * Content-Type Header Validation Middleware
 * Rejects POST and PUT requests if Content-Type is not 'application/json'.
 */
const contentTypeValidator = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Requests with payload (POST/PUT) must include Content-Type: application/json header'
      });
    }
  }
  next();
};

module.exports = contentTypeValidator;
