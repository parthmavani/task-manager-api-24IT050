const request = require('supertest');
const app = require('../server');

describe('API Health and Middleware Automated Test Suite (Practical 12 - CI/CD)', () => {

  // Test 1: Verify Root endpoint health check (FIXED: Expected 200)
  test('GET / returns HTTP 200 and API health status', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('healthy');
    expect(res.body.author).toContain('Parth Mavani (24IT050)');
  });

  // Test 2: Verify custom 404 Not Found handler middleware
  test('GET /unknown-route triggers custom 404 handler and returns JSON error', async () => {
    const res = await request(app).get('/unknown-route');
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe('Route Not Found');
    expect(res.body.message).toContain('Cannot GET /unknown-route');
  });

  // Test 3: Verify Content-Type Validator middleware rejects non-JSON POST
  test('POST /tasks without application/json Content-Type returns HTTP 400', async () => {
    const res = await request(app)
      .post('/tasks')
      .set('Content-Type', 'text/plain')
      .send('plain text payload');

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Bad Request');
  });

});
