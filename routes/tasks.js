const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const taskIdValidator = require('../middleware/taskIdValidator');
const authMiddleware = require('../middleware/authMiddleware');
const validateTask = require('../middleware/validateTask');
const cache = require('../utils/cache');
const taskEvents = require('../events');

// Apply auth middleware to all routes below
router.use(authMiddleware);

/**
 * @route   GET /tasks/cache-stats (and /tasks/debug/cache-stats)
 * @desc    Retrieve in-memory cache statistics (hits, misses, keys, memory usage)
 * @access  Private
 */
router.get(['/cache-stats', '/debug/cache-stats'], (req, res) => {
  const stats = cache.getStats();
  const keys = cache.keys();
  res.status(200).json({
    success: true,
    message: 'Cache statistics retrieved successfully',
    stats: {
      hits: stats.hits,
      misses: stats.misses,
      keysCount: stats.keys,
      ksize: stats.ksize,
      vsize: stats.vsize
    },
    activeKeys: keys
  });
});

/**
 * @route   GET /tasks
 * @desc    Retrieve all tasks from MongoDB (with In-Memory Caching)
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const cacheKey = 'all_tasks';

    // 1. Check if tasks exist in cache
    const cachedResponse = cache.get(cacheKey);
    if (cachedResponse) {
      res.set('X-Cache', 'HIT');
      return res.status(200).json({
        ...cachedResponse,
        cached: true
      });
    }

    // 2. Cache MISS: Query MongoDB
    const tasks = await Task.find().sort({ createdAt: -1 });
    const responsePayload = {
      success: true,
      count: tasks.length,
      data: tasks
    };

    // 3. Store in cache (stdTTL: 60s)
    cache.set(cacheKey, responsePayload);

    res.set('X-Cache', 'MISS');
    res.status(200).json({
      ...responsePayload,
      cached: false
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /tasks/:id
 * @desc    Retrieve a single task by MongoDB ObjectId (with In-Memory Caching)
 * @access  Private
 */
router.get('/:id', taskIdValidator, async (req, res, next) => {
  try {
    const cacheKey = `task_${req.taskId}`;

    // 1. Check single-task cache
    const cachedTask = cache.get(cacheKey);
    if (cachedTask) {
      res.set('X-Cache', 'HIT');
      return res.status(200).json({
        ...cachedTask,
        cached: true
      });
    }

    // 2. Cache MISS: Query MongoDB
    const task = await Task.findById(req.taskId);
    if (!task) {
      return res.status(404).json({
        error: 'Task Not Found',
        message: `No task found with ID ${req.taskId}`
      });
    }

    const responsePayload = {
      success: true,
      data: task
    };

    // 3. Store single task in cache
    cache.set(cacheKey, responsePayload);

    res.set('X-Cache', 'MISS');
    res.status(200).json({
      ...responsePayload,
      cached: false
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /tasks
 * @desc    Create a new task in MongoDB & invalidate cache
 * @access  Private
 */
router.post('/', validateTask, async (req, res, next) => {
  try {
    const { title, description, completed, priority } = req.body;

    const newTask = await Task.create({
      title,
      description,
      completed,
      priority
    });

    // Invalidate all tasks cache so newly created task is included on next fetch
    cache.del('all_tasks');

    console.log(`[API] Response sent at ${new Date().toISOString()}`);
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask
    });

    // Emit 'task-created' event asynchronously without blocking the response (Practical 10)
    taskEvents.emit('task-created', {
      ...newTask.toObject(),
      assignedUser: req.user ? (req.user.email || req.user.id || 'User-24IT050') : 'User-24IT050'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PUT /tasks/:id
 * @desc    Update an existing task in MongoDB by ID & invalidate cache
 * @access  Private
 */
router.put('/:id', taskIdValidator, validateTask, async (req, res, next) => {
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

    // Invalidate both all-tasks cache and this specific task's cache
    cache.del('all_tasks');
    cache.del(`task_${req.taskId}`);

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
 * @desc    Delete a task from MongoDB by ID & invalidate cache
 * @access  Private
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

    // Invalidate both all-tasks cache and this specific task's cache
    cache.del('all_tasks');
    cache.del(`task_${req.taskId}`);

    console.log(`[API] Task deleted response sent at ${new Date().toISOString()}`);
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: deletedTask
    });

    // Emit 'task-deleted' event asynchronously without blocking the response (Practical 10)
    taskEvents.emit('task-deleted', {
      ...deletedTask.toObject(),
      deletedBy: req.user ? (req.user.email || req.user.id || 'User-24IT050') : 'User-24IT050'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

