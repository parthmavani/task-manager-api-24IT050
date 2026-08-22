const express = require('express');
const router = express.Router();
const taskIdValidator = require('../middleware/taskIdValidator');

// In-memory Task Storage
let tasks = [
  {
    id: 1,
    title: 'Complete Lab Assignment',
    description: 'Build Express REST API with middleware pipeline',
    status: 'in-progress',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Submit GitHub Repository',
    description: 'Push task-manager-api repository to GitHub',
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

let nextId = 3;

/**
 * @route   GET /tasks
 * @desc    Retrieve all tasks
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

/**
 * @route   GET /tasks/:id
 * @desc    Retrieve a single task by ID
 * @access  Public
 */
router.get('/:id', taskIdValidator, (req, res) => {
  const task = tasks.find(t => t.id === req.taskId);
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
});

/**
 * @route   POST /tasks
 * @desc    Create a new task
 * @access  Public
 */
router.post('/', (req, res, next) => {
  try {
    const { title, description, status } = req.body;

    if (!title || typeof title !== 'string' || title.trim() === '') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Task title is required and must be a non-empty string'
      });
    }

    const newTask = {
      id: nextId++,
      title: title.trim(),
      description: description ? description.trim() : '',
      status: status || 'pending',
      createdAt: new Date().toISOString()
    };

    tasks.push(newTask);

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
 * @desc    Update an existing task by ID
 * @access  Public
 */
router.put('/:id', taskIdValidator, (req, res, next) => {
  try {
    const taskIndex = tasks.findIndex(t => t.id === req.taskId);

    if (taskIndex === -1) {
      return res.status(404).json({
        error: 'Task Not Found',
        message: `No task found with ID ${req.taskId}`
      });
    }

    const { title, description, status } = req.body;

    if (title !== undefined && (typeof title !== 'string' || title.trim() === '')) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Task title cannot be empty'
      });
    }

    const updatedTask = {
      ...tasks[taskIndex],
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(status !== undefined && { status: status.trim() }),
      updatedAt: new Date().toISOString()
    };

    tasks[taskIndex] = updatedTask;

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
 * @desc    Delete a task by ID
 * @access  Public
 */
router.delete('/:id', taskIdValidator, (req, res, next) => {
  try {
    const taskIndex = tasks.findIndex(t => t.id === req.taskId);

    if (taskIndex === -1) {
      return res.status(404).json({
        error: 'Task Not Found',
        message: `No task found with ID ${req.taskId}`
      });
    }

    const deletedTask = tasks.splice(taskIndex, 1)[0];

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
