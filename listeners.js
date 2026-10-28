const taskEvents = require('./events');

/**
 * Event Listeners for Asynchronous Processing (Practical 10)
 *
 * Decouples background side-effects (logging, notifications, audit trail)
 * from the main HTTP request-response cycle.
 */

// 1. Error Event Listener (Catches errors thrown in event handlers without crashing process)
taskEvents.on('error', (err) => {
  const timestamp = new Date().toISOString();
  console.error(`[Event Error] [${timestamp}] Unhandled event error caught:`, err.message || err);
});

// 2. Task Created Event Listener
taskEvents.on('task-created', (task) => {
  try {
    const title = task.title || 'Untitled Task';
    const user = task.assignedUser || task.user || 'User-24IT050';
    const taskId = task._id || task.id || 'N/A';

    console.log(`[Notification Listener] 'task-created' event received for Task "${title}" at ${new Date().toISOString()}`);

    // Artificial delay (2000ms) to clearly simulate slow background processing (e.g. email/SMS dispatch)
    setTimeout(() => {
      try {
        const completedAt = new Date().toISOString();
        console.log(`[Notification Listener] Task "${title}" (ID: ${taskId}) background notification processed at ${completedAt} for user "${user}"`);
      } catch (err) {
        taskEvents.emit('error', err);
      }
    }, 2000);
  } catch (err) {
    taskEvents.emit('error', err);
  }
});

// 3. Task Deleted Event Listener (Supplementary Problem)
taskEvents.on('task-deleted', (task) => {
  try {
    const title = task.title || 'Untitled Task';
    const taskId = task._id || task.id || 'N/A';
    const user = task.deletedBy || task.user || 'User-24IT050';

    console.log(`[Audit Listener] 'task-deleted' event received for Task ID: ${taskId} at ${new Date().toISOString()}`);

    // Artificial delay (1500ms) to simulate slow audit logging or external cache purging
    setTimeout(() => {
      try {
        const completedAt = new Date().toISOString();
        console.log(`[Audit Listener] Task "${title}" (ID: ${taskId}) background audit log finalized at ${completedAt} by "${user}"`);
      } catch (err) {
        taskEvents.emit('error', err);
      }
    }, 1500);
  } catch (err) {
    taskEvents.emit('error', err);
  }
});

module.exports = taskEvents;
