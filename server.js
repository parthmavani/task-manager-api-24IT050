require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const requestLogger = require('./middleware/logger');
const contentTypeValidator = require('./middleware/contentTypeValidator');
const notFoundHandler = require('./middleware/notFoundHandler');
const errorHandler = require('./middleware/errorHandler');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task-manager';

// 1. Request Logging Middleware (Applied globally at the top)
app.use(requestLogger);

// 2. Built-in JSON Body Parsing Middleware
app.use(express.json());

// 3. Custom Content-Type Validator (Rejects POST/PUT without application/json)
app.use(contentTypeValidator);

// 4. API Routes
app.use('/tasks', taskRoutes);

// Route to demonstrate error handler catching a deliberately thrown error
app.get('/trigger-error', (req, res, next) => {
  const error = new Error('Deliberate internal server error for testing!');
  error.status = 500;
  next(error);
});

// 5. Custom 404 Handler for Undefined Routes (Placed after all valid routes)
app.use(notFoundHandler);

// 6. Global Error Handling Middleware (MUST BE DEFINED LAST in the pipeline)
app.use(errorHandler);

// Database Connection & Server Initialization
if (require.main === module) {
  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log(`Connected to MongoDB at ${MONGO_URI}`);
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to connect to MongoDB:', err.message);
      process.exit(1);
    });
}

module.exports = app;
