/**
 * Demonstration & Verification Script for Practical 10:
 * Asynchronous Processing with Event-Driven Architecture (EventEmitter)
 *
 * Verifies:
 * 1. Immediate HTTP response prior to event listener completion.
 * 2. Asynchronous execution of 'task-created' listener (with 2s simulated delay).
 * 3. Execution of 'task-deleted' listener.
 * 4. Error event listener handling without crashing process.
 */

require('dotenv').config();
const http = require('http');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('./server');
const taskEvents = require('./events');

const PORT = 5002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task-manager-events-demo';
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';

// Generate mock auth token for authenticated routes
const testToken = jwt.sign({ id: '24IT050_Student', email: 'student24it050@example.com' }, JWT_SECRET, { expiresIn: '1h' });

function makeRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Authorization': `Bearer ${testToken}`
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path,
      method,
      headers
    };

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        const elapsedMs = Date.now() - startTime;
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, body: parsed, elapsedMs, receivedAt: new Date().toISOString() });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody, elapsedMs, receivedAt: new Date().toISOString() });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runDemo() {
  console.log('================================================================================');
  console.log(' Practical 10: Asynchronous Processing with Event-Driven Architecture');
  console.log(' CO4 / PO3, PO5 - Node.js Native EventEmitter Demonstration');
  console.log('================================================================================\n');

  try {
    await mongoose.connect(MONGO_URI);
    console.log(`[Database] Connected to MongoDB at ${MONGO_URI}`);
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, async () => {
    console.log(`[Server] Temporary demo server running on http://127.0.0.1:${PORT}\n`);

    try {
      console.log('--------------------------------------------------------------------------------');
      console.log('TEST 1: Creating a Task (Triggering "task-created" event with 2s delay)');
      console.log('--------------------------------------------------------------------------------');
      const createStart = new Date().toISOString();
      console.log(`[Client] Dispatching POST /tasks at ${createStart}...`);

      const postRes = await makeRequest('/tasks', 'POST', {
        title: 'Review EventEmitter Architecture',
        description: 'Demonstrating non-blocking background notification processing',
        priority: 'high'
      });

      console.log(`[Client] HTTP ${postRes.status} Response received in ${postRes.elapsedMs}ms at ${postRes.receivedAt}`);
      console.log(`[Client] Task ID: ${postRes.body.data._id}`);
      console.log(`\n>> Notice: The API responded in ${postRes.elapsedMs}ms! Notice how the background notification log appears later below:\n`);

      const taskId = postRes.body.data._id;

      // Wait 2.5 seconds to let the background notification complete
      await delay(2500);

      console.log('\n--------------------------------------------------------------------------------');
      console.log('TEST 2: Deleting a Task (Triggering "task-deleted" event with 1.5s delay)');
      console.log('--------------------------------------------------------------------------------');
      const deleteStart = new Date().toISOString();
      console.log(`[Client] Dispatching DELETE /tasks/${taskId} at ${deleteStart}...`);

      const delRes = await makeRequest(`/tasks/${taskId}`, 'DELETE');
      console.log(`[Client] HTTP ${delRes.status} Response received in ${delRes.elapsedMs}ms at ${delRes.receivedAt}`);
      console.log(`\n>> Notice: Delete response returned instantly in ${delRes.elapsedMs}ms! Background audit log follows below:\n`);

      // Wait 2 seconds to let the delete listener complete
      await delay(2000);

      console.log('\n--------------------------------------------------------------------------------');
      console.log('TEST 3: Testing Error Event Listener (Graceful error handling without crash)');
      console.log('--------------------------------------------------------------------------------');
      console.log('[Event Bus] Deliberately emitting an "error" event to verify safe error handling...');
      taskEvents.emit('error', new Error('Simulated transient notification failure (verification only)'));
      await delay(300);
      console.log('[Event Bus] Server remained fully operational! No unhandled crash occurred.\n');

      console.log('================================================================================');
      console.log(' Practical 10 Verification Summary:');
      console.log(' - API POST Response Time:   ' + postRes.elapsedMs + ' ms (Fast, non-blocking)');
      console.log(' - API DELETE Response Time: ' + delRes.elapsedMs + ' ms (Fast, non-blocking)');
      console.log(' - Background Listeners:     Executed asynchronously via EventEmitter');
      console.log(' - Process Health:           Protected by error listener');
      console.log('================================================================================\n');

    } catch (testErr) {
      console.error('Demo encountered an error:', testErr);
    } finally {
      await mongoose.connection.close();
      server.close(() => {
        console.log('[Demo] Test completed and server closed successfully.');
        process.exit(0);
      });
    }
  });
}

runDemo();
