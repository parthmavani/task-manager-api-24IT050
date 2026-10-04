const validateTask = (req, res, next) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Task title is required and must be a valid string'
    });
  }
  next();
};

module.exports = validateTask;
