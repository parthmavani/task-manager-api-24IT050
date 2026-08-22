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
Runs 11 test cases validating Mongoose CRUD operations, enum enforcement, ObjectId validation, 404 responses, and global error handling.
