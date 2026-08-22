const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const taskIdValidator = require('../middleware/taskIdValidator');

/**
 * @route   GET /tasks
 * @desc    Retrieve all tasks from MongoDB
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const tasks = await Task.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /tasks/:id
 * @desc    Retrieve a single task by MongoDB ObjectId
 * @access  Public
 */
router.get('/:id', taskIdValidator, async (req, res, next) => {
  try {
    const task = await Task.findById(req.taskId);
    if (!task) {
      return res.status(404).json({
        error: 'Task Not Found',
        message: `No task found with ID ${req.taskId}`
      });
    }
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /tasks
 * @desc    Create a new task in MongoDB
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body;

    const newTask = await Task.create({
      title,
      description,
      completed,
      priority
    });

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /tasks/:id
 * @desc    Update an existing task in MongoDB by ID
 * @access  Public
 */
router.put('/:id', taskIdValidator, async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body;

    const updatedTask = await Task.findByIdAndUpdate(
      req.taskId,
      { title, description, completed, priority },
      { new: true, runValidators: true }
    );

    if (!updatedTask) {
      return res.status(404).json({
        error: 'Task Not Found',
        message: `No task found with ID ${req.taskId}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /tasks/:id
 * @desc    Delete a task from MongoDB by ID
 * @access  Public
 */
router.delete('/:id', taskIdValidator, async (req, res, next) => {
  try {
    const deletedTask = await Task.findByIdAndDelete(req.taskId);

    if (!deletedTask) {
      return res.status(404).json({
        error: 'Task Not Found',
        message: `No task found with ID ${req.taskId}`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: deletedTask
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
