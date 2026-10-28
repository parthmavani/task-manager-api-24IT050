const EventEmitter = require('events');

/**
 * TaskEvents - Custom EventEmitter instance for asynchronous background event processing (Practical 10)
 * Uses Node.js native EventEmitter without external dependencies.
 */
class TaskEvents extends EventEmitter {}

module.exports = new TaskEvents();
