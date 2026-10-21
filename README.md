# Task Management RESTful API with Express & Mongoose / MongoDB

## Overview
This repository contains a complete Express.js RESTful API implementation for a **Task Management System** connected to **MongoDB** using **Mongoose ODM**. It demonstrates Express middleware pipelines, Mongoose schema validation (required fields, default values, pre-save hooks, enums), centralized error handling, and environment variable configuration using `dotenv`.

---

## Theory & Self-Study Reference (Viva / Key Questions)

### 1. What is the purpose of a schema in a NoSQL database like MongoDB, given that MongoDB itself is schema-less?
While MongoDB is natively schema-less (allowing documents in the same collection to have arbitrary fields), application data integrity requires consistent structure. A **Mongoose schema** defines document shape, data types, required constraints, default values, and custom validators at the application layer. This provides predictability, prevents corrupt data insertions, and simplifies querying.

### 2. Why is it important to define required fields and default values at the schema level rather than relying on frontend validation alone?
Frontend validation can be bypassed easily by tools like Postman, cURL, or compromised client code. Enforcing `required` fields and `default` values at the **Mongoose schema level** guarantees that no invalid data can reach the database regardless of the request source, serving as the ultimate authority for data integrity.

### 3. What happens internally when a document fails Mongoose validation — where is the request stopped?
When `Task.create()` or `save()` is executed, Mongoose runs synchronous/asynchronous schema validation rules **before** serializing and transmitting the BSON document over the wire to MongoDB. If validation fails, Mongoose halts execution locally before making any network call to the database and throws a `ValidationError`. When wrapped in `try/catch` with `next(err)`, Express catches this error and passes it down to the global error handler middleware.

---

## System Architecture

```
Client Request (Postman / Thunder Client)
                 │
                 ▼
     [requestLogger Middleware]
                 │
                 ▼
     [express.json() Body Parser]
                 │
                 ▼
 [contentTypeValidator Middleware]
                 │
                 ▼
        Express Router (/tasks)
    ┌────────────┼────────────┐
 GET /tasks  POST /tasks  PUT /tasks/:id  DELETE /tasks/:id
                 │            │
                 ▼            ▼
             Mongoose Schema & Pre-Save Hook
           (trims title, checks enum priority)
                 │
                 ▼
          MongoDB Database
        └── tasks collection
            { title, description, completed, priority, createdAt }
```

---

## Environment Setup (`.env`)

Create a `.env` file in the root directory (excluded via `.gitignore`):

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/task-manager
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/task-manager?retryWrites=true&w=majority
```

A template file `.env.example` is included in the repository.

---

## Task Schema Specification (`models/Task.js`)

| Field | Type | Rules & Constraints | Default |
| :--- | :--- | :--- | :--- |
| `title` | `String` | **Required**, auto-trimmed pre-save hook | N/A |
| `description` | `String` | Auto-trimmed | `""` |
| `completed` | `Boolean` | Boolean flag | `false` |
| `priority` | `String` | Enum: `['low', 'medium', 'high']` | `'medium'` |
| `createdAt` | `Date` | Timestamp | `Date.now` |

---

## API Endpoints & Usage Guide

### Base URL
`http://localhost:5000`

### 1. Get All Tasks
- **HTTP Method**: `GET`
- **Path**: `/tasks`
- **Status Code**: `200 OK`
- **Response**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64dfc789a1b2c3d4e5f67890",
      "title": "Complete MongoDB Integration",
      "description": "Connect Express to MongoDB using Mongoose",
      "completed": false,
      "priority": "high",
      "createdAt": "2026-08-22T21:00:00.000Z"
    }
  ]
}
```

### 2. Get Task by ID
- **HTTP Method**: `GET`
- **Path**: `/tasks/:id` (24-character hex MongoDB ObjectId)
- **Status Codes**: `200 OK` | `400 Bad Request` (Invalid ObjectId) | `404 Not Found`

### 3. Create Task
- **HTTP Method**: `POST`
- **Path**: `/tasks`
- **Headers**: `Content-Type: application/json`
- **Status Codes**: `201 Created` | `400 Bad Request` (Validation Error)
- **Request Body**:
```json
{
  "title": "   Study Mongoose Validation   ",
  "description": "Learn pre-save hooks and enum fields",
  "priority": "high"
}
```

### 4. Update Task
- **HTTP Method**: `PUT`
- **Path**: `/tasks/:id`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "completed": true,
  "priority": "medium"
}
```

### 5. Delete Task
- **HTTP Method**: `DELETE`
- **Path**: `/tasks/:id`

---

## Running the Application & Automated Verification

### 1. Install Dependencies
```bash
npm install
```

### 2. Run MongoDB & Express Server
Make sure local MongoDB is running (or configure your Atlas `MONGO_URI` in `.env`):
```bash
npm start
```

### 3. Run Automated Tests
```bash
npm test
```
Runs test cases validating Mongoose CRUD operations, enum enforcement, ObjectId validation, 404 responses, and global error handling.

---

## Practical 9: In-Memory Caching & Query Optimization

### 1. Architecture: Cache-Aside Pattern
```
GET /tasks
   │
   ▼
[Cache Check (node-cache)]
   ├── HIT  ──► Return cached tasks immediately from RAM (X-Cache: HIT)
   └── MISS ──► Query MongoDB ──► Store in node-cache (TTL 60s) ──► Return tasks (X-Cache: MISS)

POST / PUT / DELETE /tasks
   │
   ▼
Write to MongoDB ──► Invalidate cache keys (`all_tasks`, `task_:id`) ──► Return response
```

### 2. Implementation Summary
- **Module**: [utils/cache.js](file:///e:/task-manager-api-24IT050/utils/cache.js) manages a shared singleton `NodeCache` instance (`stdTTL: 60`, `checkperiod: 120`).
- **Read Caching**: `GET /tasks` checks the `'all_tasks'` cache key before querying MongoDB. `GET /tasks/:id` checks `'task_:id'`.
- **Cache Invalidation**: Every write operation (`POST /tasks`, `PUT /tasks/:id`, `DELETE /tasks/:id`) evicts affected cache entries to ensure stale data is never served.
- **Debug Route**: `GET /tasks/cache-stats` exposes cache hits, misses, key count, and memory footprint.

### 3. Empirical Response Time Comparison (Lab Journal Data)
Benchmark measured with real network round-trips over Node HTTP client against local MongoDB:

| Metric / Scenario | Uncached (MongoDB Query) | Cached (node-cache RAM) | Latency Reduction |
| :--- | :--- | :--- | :--- |
| **Sample 1** | 13.4 ms | 4.6 ms | **65.7% faster** |
| **Sample 2** | 8.1 ms | 4.5 ms | **44.4% faster** |
| **Average** | **10.7 ms** | **4.5 ms** | **~58% faster** |

*To run the benchmark suite:*
```bash
npm run benchmark
```

### 4. Key Questions & Viva Analysis
1. **Why must the cache be invalidated on every write operation, and what happens if it is not?**
   - Invalidation is essential for cache coherence. If omitted, the server continues returning old cached responses until the TTL expires, presenting a dirty/stale view of data where newly added, edited, or deleted tasks are missing or improperly represented.
2. **What is a reasonable TTL (time-to-live) and what trade-off does it represent?**
   - For a task management API, a TTL of 60 seconds is typical. 
   - **Trade-off:** A longer TTL improves server throughput and reduces database load, but increases stale-data exposure if invalidation is missed. A shorter TTL ensures data freshness at the cost of more frequent database round-trips.
3. **Why is process-local in-memory caching (`node-cache`) not suitable for multi-server deployments?**
   - `node-cache` stores items exclusively in the memory space of a single Node.js process. When horizontal scaling is introduced (e.g., across 3 servers behind an NGINX load balancer), a write handled by Server A invalidates only Server A's local memory. Servers B and C retain stale data. A centralized, shared in-memory datastore such as **Redis** or **Memcached** is required for distributed deployments.

