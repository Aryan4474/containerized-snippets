# Dockerized Paste Sharing Platform (PasteBin Clone)

A high-performance, production-style, containerized snippet sharing platform built with **React.js + Vite** on the frontend, **Node.js/Express** on the backend, **MongoDB** for persistence, and **Redis** for in-memory caching. The entire multi-service stack is orchestrated using Docker Compose and automated via GitHub Actions CI/CD workflows.

---

## 🏗️ System Architecture

The platform consists of exactly four networked services running inside an isolated Docker virtual network:

```mermaid
graph TD
    Client[Web Browser / Client] -- Port 3000 --> Frontend[React Nginx Container]
    Client -- API Requests (Port 5050) --> Backend[Express API Container]
    
    subgraph Isolated Docker Network (pastebin_network)
        Frontend -- Proxy /api requests --> Backend
        Backend -- Cache Lookup & Write (Port 6379) --> Redis[Redis Container]
        Backend -- Persistence & Queries (Port 27017) --> MongoDB[MongoDB Container]
    end
    
    subgraph Host Storage
        MongoDB-Data[(Persistent Named Volume: mongodb-data)] <--> MongoDB
        Redis-Data[(Persistent Named Volume: redis-data)] <--> Redis
    end
```

### Key Components:
1. **React Frontend (Port 3000)**: Serves a modern, responsive single-page web UI styled with dark glassmorphism. Highlights code syntax dynamically using Prism.js.
2. **Nginx Web Server**: Embedded in the frontend container, it hosts the static build assets and reverse-proxies `/api/*` endpoints to the backend container.
3. **Express.js API (Port 5050)**: Serves REST endpoints, validates inputs (2MB cap, duration parsing), rate-limits requests, and coordinates database/cache checks.
4. **MongoDB Persistence**: Holds snippets with a unique index on `shortId` and a Time-To-Live (TTL) index on `expiryAt` for automated deletion of expired snippets.
5. **Redis Cache (Port 6379)**: Uses the **Cache-Aside Pattern** to serve active snippets in `<1ms`, offloading the database. Implements **graceful degradation** to fall back to MongoDB directly if Redis restarts or goes offline.

---

## 🛠️ Tech Stack & Configurations

- **Frontend**: React.js, Vite, Nginx (Stage 2 Serve)
- **Backend**: Node.js & Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Caching**: Redis v4 client
- **Orchestration**: Docker & Docker Compose
- **Pipeline Automation**: GitHub Actions CI/CD (Ubuntu runners)

---

## 🚀 Quick Start Guide

### Prerequisites
- **Docker Desktop** installed (macOS, Windows, or Linux)

### Running the Application (Recommended)
1. **Clone the repository and enter the directory**:
   ```bash
   cd pastebin-clone
   ```
2. **Start the multi-container stack**:
   ```bash
   docker compose up --build -d
   ```
   *This command builds the React frontend assets (packing them into Nginx), builds the Express backend container, pulls MongoDB/Redis alpine images, maps persistent volumes, and starts all four containers.*
3. **Verify the containers are healthy**:
   ```bash
   docker compose ps
   ```
4. **Open the web application**:
   - Access the Web UI in your browser: [http://localhost:3000](http://localhost:3000)
   - Access the backend directly: [http://localhost:5050/health](http://localhost:5050/health)
5. **Shutdown the stack**:
   ```bash
   docker compose down
   ```
   *(To wipe all persistent databases as well, add the volume flag: `docker compose down -v`)*

---

## 📖 REST API Reference

All endpoints are prefixed with `/api/pastes`.

| Method | Endpoint | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Verifies API layer health and process uptime | 100/15m |
| `POST` | `/api/pastes` | Creates a new paste snippet | 15/15m |
| `GET` | `/api/pastes/:shortId` | Retrieves a paste snippet | 100/15m |

### Create Snippet Payload Constraints:
- `content`: String (Required, maximum 2MB size).
- `title`: String (Optional, maximum 100 characters).
- `expiresIn`: String (Optional, formats: `10m`, `2h`, `5d`, `4w`, or `never`. Defaults to `never`).

---

## 🧰 DevOps Commands Cheatsheet

### Container Operations
| Description | Command |
| :--- | :--- |
| Build all services | `docker compose build` |
| View active containers | `docker compose ps` |
| Follow unified logs | `docker compose logs -f` |
| View backend-only logs | `docker compose logs backend` |
| View frontend-only logs | `docker compose logs frontend` |

### Service Shell Debugging
| Command | Action |
| :--- | :--- |
| `docker exec -it pastebin_backend sh` | Log inside backend container terminal shell |
| `docker exec -it pastebin_frontend sh` | Log inside Nginx frontend container terminal shell |
| `docker exec -it pastebin_mongodb mongosh` | Open interactive database shell in MongoDB container |
| `docker exec -it pastebin_redis redis-cli` | Open interactive cache CLI inside Redis container |

---

## 🛡️ Security & Best Practices Implemented

- **Non-Root Execution**: Backend runs under the built-in restricted `node` user to prevent directory escape exploits.
- **Nginx API Proxy**: Prevents CORS policy errors in production by proxying requests under a single origin.
- **Input Size Limits**: Enforces a `2MB` max payload cap to protect the process from heap exhaustion attacks.
- **Dynamic Variable Injections**: DB credentials and URIs are injected via environment variables at runtime, preventing hardcoded keys in version control.
- **Active TTL Validation**: Explicitly prevents serving expired posts during the brief lag windows of MongoDB's asynchronous TTL deletion daemon.
- **Multi-layer Rate Limiting**: Global requests are limited to 100/15m, while database writes are restricted to 15/15m per IP.
