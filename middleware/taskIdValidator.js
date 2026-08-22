/**
 * Route-Specific Task ID Validation Middleware
 * Ensures the :id route parameter is a positive integer before reaching route handlers.
 */
const taskIdValidator = (req, res, next) => {
  const { id } = req.params;
  const numericId = Number(id);

  if (!id || isNaN(numericId) || !Number.isInteger(numericId) || numericId <= 0) {
    return res.status(400).json({
      error: 'Invalid Task ID',
      message: 'Task ID must be a positive integer'
    });
  }

  req.taskId = numericId;
  next();
};

module.exports = taskIdValidator;
