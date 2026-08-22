# Task Management RESTful API with Express Middleware Pipeline

## Overview
This repository contains a complete Express.js RESTful API implementation for a **Task Management System** built as part of the backend development lab exercise. It demonstrates an Express middleware pipeline including global request logging, JSON header validation, route-specific ID validation, custom 404 handler, in-memory CRUD operations, and centralized global error handling.

---

## Key Questions & Theoretical Analysis (Viva / Lab Reference)

### 1. Why must the error handling middleware be defined last in the middleware chain?
Express identifies middleware functions based on the number of parameters declared in their signature. An error-handling middleware **must accept 4 arguments**: `(err, req, res, next)`.

Express executes middleware sequentially in the order they are mounted using `app.use()`. When an error is passed via `next(err)` or thrown in an async route, Express skips all standard 3-parameter middleware (`(req, res, next)`) and jumps straight down to the next registered 4-parameter error handler. 

If the error handler is defined **before** the routes, Express will register it prior to route processing. Consequently, when a route handler encounters an error later down the chain, Express cannot look backward in the pipeline to find an error handler, causing the request to either crash or rely on Express's default fallback HTML error response.

---

### 2. What is the difference between `app.use()` and a route-specific middleware?

| Feature | `app.use()` (Global Middleware) | Route-Specific Middleware |
| :--- | :--- | :--- |
| **Scope** | Applies to **all** incoming requests across the entire application (or all routes under a base path prefix). | Applies **only** to specific HTTP endpoints or router methods where it is explicitly passed. |
| **Use Cases** | Global logging, parsing body (`express.json()`), CORS, authentication checks across all routes. | Route-specific input validation (e.g., checking if `:id` is a number), payload authorization, schema validation. |
| **Declaration Example** | `app.use(loggerMiddleware)` | `router.get('/:id', taskIdValidator, getTaskById)` |

---

### 3. Why is it considered bad practice to send raw error stack traces to the client?
Sending raw error stack traces (`err.stack`) directly to client applications in API responses is a severe security vulnerability (Information Disclosure) and bad UX practice for the following reasons:
1. **Security & Information Leakage**: Stack traces expose internal file paths, module structures, database schemas, framework versions, and code logic. Malicious actors can exploit this sensitive data to discover vulnerabilities.
2. **Poor User Experience**: End users and frontend consumers need predictable, clean JSON error objects with actionable message strings and HTTP status codes, not unformatted technical tracebacks.
3. **Best Practice**: Log full stack traces **server-side** (e.g., via `console.error` or logging services like Winston) for developer debugging, while returning sanitized JSON errors like `{ "error": "Internal Server Error", "message": "Something went wrong" }` to the client.

---

## Middleware Pipeline Architecture

```
                  Client Request (Postman / Curl)
                                │
                                ▼
         1. [requestLogger] (Global Logging Middleware)
            Logs HTTP Method, URL, & ISO Timestamp
                                │
                                ▼
         2. [express.json()] (Body Parser Middleware)
            Parses JSON payloads into req.body
                                │
                                ▼
     3. [contentTypeValidator] (Header Check Middleware)
        Rejects POST/PUT missing Content-Type: application/json
                                │
                                ▼
                         Express Router (/tasks)
   ┌──────────────────┬─────────────────┬──────────────────┐
   │                  │                 │                  │
GET /tasks      POST /tasks       PUT /tasks/:id     DELETE /tasks/:id
Retrieve All    Create Task       Update Task        Delete Task
                                       │                  │
                             [taskIdValidator]   [taskIdValidator]
                             Validates :id format Validates :id format
                                │                         │
                                └────────────┬────────────┘
                                             │
                                             ▼
                       4. [notFoundHandler] (404 Handler)
                          Catches unmapped routes & returns 404 JSON
                                             │
                                             ▼
                       5. [errorHandler] (Global 4-Param Error Handler)
                          Catches unhandled errors & returns 500 JSON
```

---

## API Endpoints & Usage Guide

### Base URL
`http://localhost:5000`

### 1. Get All Tasks
- **HTTP Method**: `GET`
- **Path**: `/tasks`
- **Status Code**: `200 OK`
- **Example Response**:
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": 1,
      "title": "Complete Lab Assignment",
      "description": "Build Express REST API with middleware pipeline",
      "status": "in-progress",
      "createdAt": "2026-08-22T20:30:00.000Z"
    }
  ]
}
```

### 2. Get Single Task by ID
- **HTTP Method**: `GET`
- **Path**: `/tasks/:id`
- **Status Code**: `200 OK` (if found) | `400 Bad Request` (invalid ID) | `404 Not Found` (missing)
- **Example Response**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Complete Lab Assignment",
    "status": "in-progress"
  }
}
```

### 3. Create Task
- **HTTP Method**: `POST`
- **Path**: `/tasks`
- **Headers**: `Content-Type: application/json`
- **Status Code**: `201 Created`
- **Request Body**:
```json
{
  "title": "Build Node Backend",
  "description": "Implement Express middleware",
  "status": "pending"
}
```
- **Example Response**:
```json
{
  "success": true,
  "message": "Task created successfully",
  "data": {
    "id": 3,
    "title": "Build Node Backend",
    "description": "Implement Express middleware",
    "status": "pending",
    "createdAt": "2026-08-22T20:34:00.000Z"
  }
}
```

### 4. Update Task
- **HTTP Method**: `PUT`
- **Path**: `/tasks/:id`
- **Headers**: `Content-Type: application/json`
- **Status Code**: `200 OK`
- **Request Body**:
```json
{
  "status": "completed"
}
```

### 5. Delete Task
- **HTTP Method**: `DELETE`
- **Path**: `/tasks/:id`
- **Status Code**: `200 OK`

---

## Troubleshooting Guide

| Symptom | Likely Cause | Fix |
| :--- | :--- | :--- |
| **Request hangs indefinitely** | Middleware missing `next()` call or not returning a response (`res.json()`). | Ensure every middleware calls `next()` or finishes response with `res.send()` / `res.json()`. |
| **`req.body` is `undefined`** | `express.json()` middleware missing or declared after routes. | Place `app.use(express.json())` before task routes in `server.js`. |
| **Global error handler never triggers** | Error handler defined before routes, or errors not passed via `next(err)`. | Move error handler to be the last `app.use()` call in `server.js` and call `next(err)` inside catch blocks. |
| **`Cannot GET /tasks`** | Route path mismatch or server not restarted. | Verify route path spelling (`/tasks`) and restart server (`node server.js`). |

---

## Running the Application & Automated Verification

### Prerequisites
- Node.js (v18+ installed)
- npm

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Express Server
```bash
npm start
```
Server runs on `http://localhost:5000`.

### 3. Run Automated Tests
```bash
npm test
```
Runs 10 comprehensive tests verifying all CRUD operations, HTTP status codes, Content-Type validation, ID format validation, 404 handler, and global error handling.
