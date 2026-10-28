/**
 * Comprehensive Live Backend Test Suite
 * Tests all endpoints, middleware, authentication, validation,
 * in-memory caching, and error handling against live server on port 5000.
 */

const http = require('http');

const BASE_URL = 'localhost';
const PORT = 5000;

let authToken = '';
let testUserId = '';
let createdTaskId = '';

const results = [];

function makeRequest(path, method = 'GET', body = null, headers = {}, withAuth = true) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const reqHeaders = { ...headers };

    if (withAuth && authToken && !reqHeaders['Authorization']) {
      reqHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    if (body) {
      if (!reqHeaders['Content-Type'] && !reqHeaders['content-type']) {
        reqHeaders['Content-Type'] = 'application/json';
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const options = {
      hostname: BASE_URL,
      port: PORT,
      path,
      method,
      headers: reqHeaders
    };

    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => { responseBody += chunk; });
      res.on('end', () => {
        const elapsed = Date.now() - startTime;
        let parsed = null;
        try {
          parsed = JSON.parse(responseBody);
        } catch (e) {
          parsed = responseBody;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: parsed,
          elapsed
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

function assert(description, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${passed ? 'PASS' : 'FAIL'}] ${description} ${details ? '(' + details + ')' : ''}`);
  results.push({ description, passed, details });
}

async function runLiveTests() {
  console.log('======================================================================');
  console.log(' Starting Comprehensive Live Backend Test Suite (http://localhost:5000)');
  console.log('======================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 1. AUTHENTICATION PIPELINE
    // -------------------------------------------------------------------------
    console.log('--- 1. Testing Authentication Pipeline ---');

    const testEmail = `student_${Date.now()}@charusat.edu.in`;
    const testPassword = 'Password@123';

    // Test 1: Register User
    const regRes = await makeRequest('/auth/register', 'POST', {
      email: testEmail,
      password: testPassword
    });
    assert(
      'POST /auth/register creates user and returns HTTP 201',
      regRes.status === 201 && regRes.body.success === true,
      `Status: ${regRes.status}`
    );

    // Test 2: Login User
    const loginRes = await makeRequest('/auth/login', 'POST', {
      email: testEmail,
      password: testPassword
    });
    const hasToken = loginRes.status === 200 && loginRes.body.token;
    if (hasToken) {
      authToken = loginRes.body.token;
      testUserId = loginRes.body.user.id;
    }
    assert(
      'POST /auth/login returns HTTP 200 with valid JWT token',
      hasToken,
      `Token acquired: ${hasToken ? 'Yes' : 'No'}`
    );

    // Test 3: Rejection on Wrong Password
    const badLoginRes = await makeRequest('/auth/login', 'POST', {
      email: testEmail,
      password: 'WrongPassword999'
    });
    assert(
      'POST /auth/login with wrong password correctly returns HTTP 400',
      badLoginRes.status === 400 && badLoginRes.body.success === false,
      `Status: ${badLoginRes.status}`
    );

    // Test 4: Protected GET /auth/me with valid Bearer Token
    const meRes = await makeRequest('/auth/me', 'GET');
    assert(
      'GET /auth/me with Bearer token returns HTTP 200 and excludes password field',
      meRes.status === 200 && meRes.body.user && meRes.body.user.password === undefined,
      `User Email: ${meRes.body?.user?.email || 'N/A'}`
    );

    // Test 5: Rejection of GET /auth/me without Token
    const unauthRes = await makeRequest('/auth/me', 'GET', null, {}, false);
    assert(
      'GET /auth/me without token correctly returns HTTP 401 Unauthorized',
      unauthRes.status === 401 && unauthRes.body.success === false,
      `Status: ${unauthRes.status}`
    );

    // -------------------------------------------------------------------------
    // 2. MIDDLEWARE & VALIDATION PIPELINE
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing Middleware & Validation Pipeline ---');

    // Test 6: Content-Type Validator (Rejects non-JSON)
    const ctRes = await makeRequest('/tasks', 'POST', 'Plain Text String', { 'Content-Type': 'text/plain' });
    assert(
      'POST /tasks with non-JSON Content-Type returns HTTP 400 Bad Request',
      ctRes.status === 400 && ctRes.body.error === 'Bad Request',
      `Error: ${ctRes.body.error}`
    );

    // Test 7: validateTask Middleware (Missing Title)
    const noTitleRes = await makeRequest('/tasks', 'POST', { description: 'Missing title task' });
    assert(
      'POST /tasks without title returns HTTP 400 Validation Error',
      noTitleRes.status === 400 && noTitleRes.body.success === false,
      `Message: ${noTitleRes.body.message}`
    );

    // Test 8: Mongoose Schema Validation (Invalid Enum Priority)
    const badEnumRes = await makeRequest('/tasks', 'POST', {
      title: 'Invalid Priority Task',
      priority: 'super-urgent'
    });
    assert(
      'POST /tasks with invalid priority enum returns HTTP 400 Validation Error',
      badEnumRes.status === 400 && badEnumRes.body.error === 'Validation Error',
      `Error: ${badEnumRes.body.error}`
    );

    // -------------------------------------------------------------------------
    // 3. TASK CRUD & ASYNCHRONOUS EVENT PROCESSING
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Task CRUD & Event Architecture ---');

    // Test 9: Create Task (POST /tasks) - Title should be trimmed, Priority high
    const createRes = await makeRequest('/tasks', 'POST', {
      title: '   Parth Mavani Final Verification Task   ',
      description: 'Testing full backend pipeline & EventEmitter',
      priority: 'high'
    });

    const isCreated = createRes.status === 201 && createRes.body.data && createRes.body.data.title === 'Parth Mavani Final Verification Task';
    if (isCreated) {
      createdTaskId = createRes.body.data._id;
    }
    assert(
      'POST /tasks creates task, automatically trims whitespace, and returns HTTP 201',
      isCreated,
      `Task ID: ${createdTaskId}, Title: "${createRes.body.data?.title}"`
    );

    // Test 10: Fetch Single Task by ID (GET /tasks/:id)
    const getSingleRes = await makeRequest(`/tasks/${createdTaskId}`, 'GET');
    assert(
      'GET /tasks/:id returns HTTP 200 with the exact created task document',
      getSingleRes.status === 200 && getSingleRes.body.data._id === createdTaskId,
      `Status: ${getSingleRes.status}`
    );

    // Test 11: Task ID Validator (Invalid 123invalid non-ObjectId)
    const invalidIdRes = await makeRequest('/tasks/invalid-id-xyz', 'GET');
    assert(
      'GET /tasks/:id with malformed ObjectId returns HTTP 400 Invalid Task ID',
      invalidIdRes.status === 400 && invalidIdRes.body.error === 'Invalid Task ID',
      `Status: ${invalidIdRes.status}`
    );

    // Test 12: Non-existent 24-hex ObjectId
    const nonExistentId = '507f1f77bcf86cd799439011';
    const notFoundTaskRes = await makeRequest(`/tasks/${nonExistentId}`, 'GET');
    assert(
      'GET /tasks/:id with non-existent valid ObjectId returns HTTP 404 Task Not Found',
      notFoundTaskRes.status === 404 && notFoundTaskRes.body.error === 'Task Not Found',
      `Status: ${notFoundTaskRes.status}`
    );

    // Test 13: Update Task (PUT /tasks/:id)
    const updateRes = await makeRequest(`/tasks/${createdTaskId}`, 'PUT', {
      title: 'Parth Mavani Verification Task (Completed)',
      description: 'Updated successfully in test suite',
      completed: true,
      priority: 'medium'
    });
    assert(
      'PUT /tasks/:id updates fields and returns HTTP 200',
      updateRes.status === 200 && updateRes.body.data.completed === true && updateRes.body.data.priority === 'medium',
      `Completed: ${updateRes.body.data?.completed}`
    );

    // -------------------------------------------------------------------------
    // 4. IN-MEMORY CACHING & INVALIDATION
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing In-Memory Caching & Cache Invalidation ---');

    // Test 14: GET /tasks Request 1 (Cache MISS)
    const cacheMissRes = await makeRequest('/tasks', 'GET');
    assert(
      'GET /tasks (First Request) yields Cache MISS (X-Cache: MISS header)',
      cacheMissRes.status === 200 && cacheMissRes.headers['x-cache'] === 'MISS',
      `Header X-Cache: ${cacheMissRes.headers['x-cache']}, Response Time: ${cacheMissRes.elapsed}ms`
    );

    // Test 15: GET /tasks Request 2 (Cache HIT)
    const cacheHitRes = await makeRequest('/tasks', 'GET');
    assert(
      'GET /tasks (Second Request) yields Cache HIT served directly from RAM (X-Cache: HIT)',
      cacheHitRes.status === 200 && cacheHitRes.headers['x-cache'] === 'HIT',
      `Header X-Cache: ${cacheHitRes.headers['x-cache']}, Response Time: ${cacheHitRes.elapsed}ms`
    );

    // Test 16: Inspect Cache Statistics Endpoint
    const statsRes = await makeRequest('/tasks/cache-stats', 'GET');
    assert(
      'GET /tasks/cache-stats returns HTTP 200 with hit/miss counters and memory metrics',
      statsRes.status === 200 && statsRes.body.stats && statsRes.body.stats.hits >= 1,
      `Hits: ${statsRes.body.stats?.hits}, Misses: ${statsRes.body.stats?.misses}, Keys: ${statsRes.body.stats?.keysCount}`
    );

    // -------------------------------------------------------------------------
    // 5. DELETE & CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Deletion & Cleanup ---');

    // Test 17: DELETE /tasks/:id
    const deleteRes = await makeRequest(`/tasks/${createdTaskId}`, 'DELETE');
    assert(
      'DELETE /tasks/:id deletes document and returns HTTP 200',
      deleteRes.status === 200 && deleteRes.body.data._id === createdTaskId,
      `Status: ${deleteRes.status}`
    );

    // Test 18: Confirm deletion via GET
    const confirmDeleteRes = await makeRequest(`/tasks/${createdTaskId}`, 'GET');
    assert(
      'GET /tasks/:id after deletion returns HTTP 404',
      confirmDeleteRes.status === 404,
      `Status: ${confirmDeleteRes.status}`
    );

    // -------------------------------------------------------------------------
    // 6. ROUTE NOT FOUND & GLOBAL ERROR HANDLER
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing 404 & Centralized Error Handlers ---');

    // Test 19: Undefined Route 404
    const notFoundRouteRes = await makeRequest('/api/undefined-endpoint-check', 'GET');
    assert(
      'Undefined route triggers Custom 404 Handler returning structured JSON',
      notFoundRouteRes.status === 404 && notFoundRouteRes.body.error === 'Route Not Found',
      `Error: ${notFoundRouteRes.body.error}`
    );

    // Test 20: Deliberate 500 error handler trigger
    const error500Res = await makeRequest('/trigger-error', 'GET');
    assert(
      'GET /trigger-error triggers Global Centralized Error Handler returning HTTP 500 JSON without process crash',
      error500Res.status === 500 && error500Res.body.error === 'Internal Server Error',
      `Error: ${error500Res.body.error}`
    );

  } catch (err) {
    console.error('Unexpected test execution failure:', err);
  }

  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log('\n======================================================================');
  console.log(` Backend Live Verification Summary: ${passedCount} Passed, ${failedCount} Failed (${results.length} Total)`);
  console.log('======================================================================\n');

  if (failedCount === 0) {
    console.log('🎉 ALL BACKEND SUBSYSTEMS ARE FUNCTIONING 100% CORRECTLY!');
  } else {
    console.error(`⚠️ Some tests failed. Please review the output above.`);
  }

  process.exit(failedCount > 0 ? 1 : 0);
}

runLiveTests();
