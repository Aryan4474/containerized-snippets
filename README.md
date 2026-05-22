# Dockerized Paste Sharing Platform (PasteBin Clone)

A high-performance, production-style, containerized snippet sharing platform built with Node.js/Express, MongoDB, and Redis caching. The entire stack is fully orchestrated using Docker Compose and validated via GitHub Actions CI/CD pipelines.

---

## 🏗️ System Architecture

The platform consists of exactly three networked services communicating inside a isolated Docker virtual network:

```mermaid
graph TD
    Client[Client / Browser / curl] -- API Requests (Port 5050) --> Backend[Express.js App Container]
    
    subgraph Isolated Docker Network (pastebin_network)
        Backend -- Cache Lookup & Write (Port 6379) --> Redis[Redis Alpine Cache Container]
        Backend -- Persistence & Queries (Port 27017) --> MongoDB[MongoDB Container]
    end
    
    subgraph Host Storage
        MongoDB-Data[(Persistent Named Volume: mongodb-data)] <--> MongoDB
        Redis-Data[(Persistent Named Volume: redis-data)] <--> Redis
    end
```

### Key Architectural Details:
1. **Express.js API Layer**: Serves REST endpoints, validates schemas, enforces rate-limits, and orchestrates the database and caching connections.
2. **MongoDB Store**: Persists paste documents. Includes a unique index on `shortId` for $O(1)$ query lookups and a **Time To Live (TTL) index** on `expiryAt` for automated snippet expiration.
3. **Redis Caching (Cache-Aside)**:
   - **Cache Hits**: Serves snippets directly from memory in `<1ms`, offloading the database and reducing API latency. Views are incremented asynchronously in MongoDB in the background.
   - **Cache Misses**: Fallback queries MongoDB, caches the payload back in Redis with matching TTLs, and returns the response.
   - **Graceful Degradation**: If Redis goes offline, the backend catches the failure and falls back to querying MongoDB directly without crashing.

---

## 🛠️ Tech Stack & Configurations

- **Backend Framework**: Node.js & Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Caching Store**: Redis v4 Client
- **Orchestration**: Docker & Docker Compose
- **Pipeline Automation**: GitHub Actions CI/CD (Ubuntu host)

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have installed:
- **Docker Desktop** (macOS, Windows, or Linux)
- **Node.js LTS (v20+)** (Optional, for local development only)

### Running the Application with Docker (Recommended)
1. **Clone the repository and enter the directory**:
   ```bash
   cd pastebin-clone
   ```
2. **Start the multi-container stack**:
   ```bash
   docker compose up --build -d
   ```
   *This command compiles the custom backend Dockerfile, pulls MongoDB/Redis images, maps persistent volumes, hooks up the bridged network, and starts all containers in detached mode.*
3. **Verify the containers are healthy**:
   ```bash
   docker compose ps
   ```
4. **Shutdown the stack**:
   ```bash
   docker compose down
   ```
   *(To wipe all persistent databases as well, add the volume flag: `docker compose down -v`)*

---

## 📖 REST API Documentation

All endpoints are prefixed with `/api/pastes`.

### 1. Health Check
* **Endpoint**: `GET /health`
* **Description**: Verifies API layer health and process uptime.
* **Response (200 OK)**:
  ```json
  {
    "status": "UP",
    "environment": "production",
    "timestamp": "2026-05-22T08:50:28.102Z",
    "uptime": 12.8
  }
  ```

### 2. Create a Snippet
* **Endpoint**: `POST /api/pastes`
* **Rate Limit**: 15 creations per 15 minutes per IP.
* **Payload Constraints**:
  - `content`: String (Required, maximum 2MB size).
  - `title`: String (Optional, maximum 100 characters).
  - `expiresIn`: String (Optional, formats: `10m`, `2h`, `5d`, `4w`, or `never`. Defaults to `never`).
* **Request Example**:
  ```json
  {
    "title": "Dockerized Snippet",
    "content": "print(\"Hello from Docker Container!\")",
    "expiresIn": "1h"
  }
  ```
* **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Paste created successfully",
    "data": {
      "id": "ABc96o96",
      "title": "Dockerized Snippet",
      "content": "print(\"Hello from Docker Container!\")",
      "views": 0,
      "expiryAt": "2026-05-22T09:51:30.005Z",
      "shareUrl": "http://localhost:5050/api/pastes/ABc96o96",
      "createdAt": "2026-05-22T08:51:30.010Z"
    }
  }
  ```

### 3. Retrieve a Snippet
* **Endpoint**: `GET /api/pastes/:shortId`
* **Rate Limit**: 100 requests per 15 minutes per IP.
* **Response (200 OK - Database Cache Miss)**:
  ```json
  {
    "success": true,
    "source": "database",
    "data": {
      "id": "ABc96o96",
      "title": "Dockerized Snippet",
      "content": "print(\"Hello from Docker Container!\")",
      "views": 1,
      "expiryAt": "2026-05-22T09:51:30.005Z",
      "createdAt": "2026-05-22T08:51:30.010Z"
    }
  }
  ```
* **Response (200 OK - Redis Cache Hit)**:
  ```json
  {
    "success": true,
    "source": "cache",
    "data": {
      "id": "ABc96o96",
      "title": "Dockerized Snippet",
      "content": "print(\"Hello from Docker Container!\")",
      "views": 2,
      "expiryAt": "2026-05-22T09:51:30.005Z",
      "createdAt": "2026-05-22T08:51:30.010Z"
    }
  }
  ```
* **Response (404 Not Found / Expired)**:
  ```json
  {
    "error": "Paste not found"
  }
  ```

---

## 🧰 DevOps Commands Cheatsheet

### Container Operations
| Description | Command |
| :--- | :--- |
| Build backend image | `docker build -t pastebin-backend ./app` |
| View active containers | `docker ps` |
| View all containers | `docker ps -a` |
| View local images | `docker images` |

### Service Debugging
| Command | Action |
| :--- | :--- |
| `docker compose logs -f` | Follow live unified logs across all containers |
| `docker compose logs backend` | View logs specific to the backend server |
| `docker exec -it pastebin_backend sh` | Log inside backend container terminal shell |
| `docker exec -it pastebin_mongodb mongosh` | Open interactive database shell in MongoDB container |
| `docker exec -it pastebin_redis redis-cli` | Open interactive cache CLI inside Redis container |

---

## 🛡️ Security & Best Practices Implemented

- **Non-Root Execution**: Backend process runs as the built-in restricted `node` user instead of system `root` to prevent directory escape exploits.
- **Strict Payload Limits**: Size cap at `2MB` prevents buffer allocation exhaustion attacks.
- **Environment Injections**: DB credentials and URIs are injected dynamically via Compose, preventing hardcoding keys in version control.
- **Active TTL Validation**: Backend explicitly prevents serving expired posts, covering the brief deletion latency windows of MongoDB's asynchronous TTL indexes.
- **Atomic analytics tracking**: View counters are incremented using MongoDB `$inc` updates to prevent state overwriting under high concurrency.
- **Multi-layer Rate Limiting**: Global requests are limited to 100/15m while resource-heavy DB writes are restricted to 15/15m.
- **Secure Error Masking**: Operational errors (like CastError or DuplicateKey) are translated to clean JSON while internal stack traces are disabled in production mode.
