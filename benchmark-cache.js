const http = require('http');
const mongoose = require('mongoose');
const app = require('./server');

const PORT = 5002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/task-manager';

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const duration = (performance.now() - startTime).toFixed(2);
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, timeMs: parseFloat(duration) });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body, timeMs: parseFloat(duration) });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function runBenchmark() {
  console.log('='.repeat(65));
  console.log('  PRACTICAL 9: IN-MEMORY CACHING & BENCHMARK SUITE');
  console.log('='.repeat(65));

  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }

  const server = app.listen(PORT, async () => {
    try {
      const email = `bench_${Date.now()}@test.com`;
      const password = 'password123';

      // 1. Register test user
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/auth/register',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { email, password });

      // 2. Login to get JWT Token
      const loginRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { email, password });

      const token = loginRes.body.token;
      console.log('✅ Authenticated successfully. JWT acquired.');

      const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      };

      // 3. Ensure sample tasks exist
      for (let i = 1; i <= 3; i++) {
        await request({
          hostname: 'localhost',
          port: PORT,
          path: '/tasks',
          method: 'POST',
          headers: authHeaders
        }, {
          title: `Benchmark Task ${i}`,
          description: `Testing performance sample ${i}`,
          priority: 'medium'
        });
      }
      console.log('✅ Seeded sample tasks into database.\n');

      // 4. Benchmark GET /tasks
      console.log('--- Benchmarking GET /tasks ---');
      
      // Request 1: Cache MISS (queries DB and caches)
      const r1 = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/tasks',
        method: 'GET',
        headers: authHeaders
      });
      console.log(`Request 1 (MISS - DB Read): ${r1.timeMs} ms | X-Cache: ${r1.headers['x-cache']} | cached: ${r1.body.cached}`);

      // Request 2: Cache HIT (served from RAM)
      const r2 = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/tasks',
        method: 'GET',
        headers: authHeaders
      });
      console.log(`Request 2 (HIT - Memory) : ${r2.timeMs} ms | X-Cache: ${r2.headers['x-cache']} | cached: ${r2.body.cached}`);

      // Request 3: Cache HIT (served from RAM)
      const r3 = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/tasks',
        method: 'GET',
        headers: authHeaders
      });
      console.log(`Request 3 (HIT - Memory) : ${r3.timeMs} ms | X-Cache: ${r3.headers['x-cache']} | cached: ${r3.body.cached}`);

      // 5. Test Cache Invalidation on POST
      console.log('\n--- Testing Cache Invalidation on Write (POST) ---');
      await request({
        hostname: 'localhost',
        port: PORT,
        path: '/tasks',
        method: 'POST',
        headers: authHeaders
      }, {
        title: 'New Invalidation Task',
        description: 'Should clear cache',
        priority: 'high'
      });
      console.log('✅ POST /tasks executed -> Cache invalidated.');

      // Request 4 right after write: should be a Cache MISS with updated count
      const r4 = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/tasks',
        method: 'GET',
        headers: authHeaders
      });
      console.log(`Request 4 (After Write)  : ${r4.timeMs} ms | X-Cache: ${r4.headers['x-cache']} | cached: ${r4.body.cached} | Count: ${r4.body.count}`);

      // 6. Inspect Cache Stats
      const statsRes = await request({
        hostname: 'localhost',
        port: PORT,
        path: '/tasks/cache-stats',
        method: 'GET',
        headers: authHeaders
      });
      console.log('\n--- Cache Debug Statistics ---');
      console.log(JSON.stringify(statsRes.body, null, 2));

      // 7. Print summary table
      console.log('\n' + '='.repeat(65));
      console.log('               LAB JOURNAL OBSERVATION TABLE');
      console.log('='.repeat(65));
      console.log('| Metric           | Uncached (MongoDB) | Cached (node-cache) |');
      console.log('|------------------|--------------------|---------------------|');
      console.log(`| Sample 1         | ${r1.timeMs.toFixed(1)} ms            | ${r2.timeMs.toFixed(1)} ms             |`);
      console.log(`| Sample 2         | ${r4.timeMs.toFixed(1)} ms            | ${r3.timeMs.toFixed(1)} ms             |`);
      const avgUncached = ((r1.timeMs + r4.timeMs) / 2).toFixed(1);
      const avgCached = ((r2.timeMs + r3.timeMs) / 2).toFixed(1);
      const speedup = (((avgUncached - avgCached) / avgUncached) * 100).toFixed(1);
      console.log(`| Average Time     | ${avgUncached} ms            | ${avgCached} ms             |`);
      console.log(`| Performance Gain | ${speedup}% faster                              |`);
      console.log('='.repeat(65) + '\n');

    } catch (e) {
      console.error('Benchmark error:', e);
    } finally {
      await mongoose.connection.close();
      server.close(() => {
        console.log('Server and DB connection closed.');
        process.exit(0);
      });
    }
  });
}

runBenchmark();
