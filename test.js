const app = require('./server');
const http = require('http');

let server;
const PORT = 5001;

function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: { ...headers }
    };

    let postData = '';
    if (body !== null) {
      postData = typeof body === 'string' ? body : JSON.stringify(body);
      if (!options.headers['Content-Type'] && !options.headers['content-type']) {
        options.headers['Content-Type'] = 'application/json';
      }
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseBody);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: responseBody });
        }
      });
    });

    req.on('error', reject);
    if (body !== null) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTests() {
  server = app.listen(PORT, async () => {
    console.log(`\n========================================`);
    console.log(` Starting Express Task API Test Suite`);
    console.log(`========================================\n`);

    let passed = 0;
    let failed = 0;

    const assertTest = (description, condition, details = '') => {
      if (condition) {
        console.log(`✅ [PASS] ${description}`);
        passed++;
      } else {
        console.error(`❌ [FAIL] ${description} ${details}`);
        failed++;
      }
    };

    try {
      // Test 1: GET /tasks
      const res1 = await makeRequest('/tasks', 'GET');
      assertTest('GET /tasks returns HTTP 200 with task list', res1.status === 200 && Array.isArray(res1.body.data));

      // Test 2: POST /tasks (Valid payload)
      const res2 = await makeRequest('/tasks', 'POST', { title: 'New Test Task', description: 'Testing POST endpoint' });
      assertTest('POST /tasks creates task and returns HTTP 201', res2.status === 201 && res2.body.data.id !== undefined);

      // Test 3: POST /tasks without Content-Type header
      const res3 = await makeRequest('/tasks', 'POST', JSON.stringify({ title: 'No Header' }), { 'Content-Type': 'text/plain' });
      assertTest('POST /tasks without application/json returns HTTP 400 Bad Request', res3.status === 400 && res3.body.error === 'Bad Request');

      // Test 4: GET /tasks/:id (Valid numeric ID)
      const res4 = await makeRequest('/tasks/1', 'GET');
      assertTest('GET /tasks/1 returns HTTP 200 with correct task', res4.status === 200 && res4.body.data.id === 1);

      // Test 5: GET /tasks/:id (Invalid non-numeric ID validator test)
      const res5 = await makeRequest('/tasks/abc', 'GET');
      assertTest('GET /tasks/abc triggers task ID validator returning HTTP 400', res5.status === 400 && res5.body.error === 'Invalid Task ID');

      // Test 6: GET /tasks/:id (Non-existent task ID)
      const res6 = await makeRequest('/tasks/9999', 'GET');
      assertTest('GET /tasks/9999 returns HTTP 404 Task Not Found', res6.status === 404 && res6.body.error === 'Task Not Found');

      // Test 7: PUT /tasks/:id (Update task)
      const res7 = await makeRequest('/tasks/1', 'PUT', { status: 'completed' });
      assertTest('PUT /tasks/1 updates task status and returns HTTP 200', res7.status === 200 && res7.body.data.status === 'completed');

      // Test 8: DELETE /tasks/:id
      const res8 = await makeRequest('/tasks/2', 'DELETE');
      assertTest('DELETE /tasks/2 deletes task and returns HTTP 200', res8.status === 200 && res8.body.data.id === 2);

      // Test 9: Undefined route 404 Handler
      const res9 = await makeRequest('/non-existent-endpoint', 'GET');
      assertTest('GET /non-existent-endpoint triggers 404 Handler with JSON error', res9.status === 404 && res9.body.error === 'Route Not Found');

      // Test 10: Global Error Handler trigger
      const res10 = await makeRequest('/trigger-error', 'GET');
      assertTest('GET /trigger-error triggers Global Error Handler returning HTTP 500 JSON', res10.status === 500 && res10.body.error === 'Internal Server Error');

    } catch (err) {
      console.error('Test execution error:', err);
    } finally {
      server.close(() => {
        console.log(`\n========================================`);
        console.log(` Results: ${passed} Passed, ${failed} Failed`);
        console.log(`========================================\n`);
        process.exit(failed > 0 ? 1 : 0);
      });
    }
  });
}

runTests();
