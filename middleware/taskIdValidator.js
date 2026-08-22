const mongoose = require('mongoose');

/**
 * Route-Specific Task ID Validation Middleware
 * Ensures the :id route parameter is a valid MongoDB ObjectId before reaching route handlers.
 */
const taskIdValidator = (req, res, next) => {
  const { id } = req.params;

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      error: 'Invalid Task ID',
      message: 'Task ID must be a valid 24-character hex MongoDB ObjectId'
    });
  }

  req.taskId = id;
  next();
};

module.exports = taskIdValidator;

