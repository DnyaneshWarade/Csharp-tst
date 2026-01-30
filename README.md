# C# Developer Test Project

This project is designed to test **C# (.NET) developers'** skills in building an ASP.NET Core backend that powers a React + Node.js application.

## 📚 Documentation

- **[Getting Started](./GETTING_STARTED.md)** – C# test setup guide
- **[Test Requirements](./TEST_REQUIREMENTS.md)** – Complete C# test requirements and evaluation criteria
- **[Test Summary](./TEST_SUMMARY.md)** – Quick overview of required tasks
- **[Candidate Checklist](./CANDIDATE_CHECKLIST.md)** – Track your progress

## Project Structure

```
csharp-test/
├── csharp-backend/   # ASP.NET Core minimal API (data source)
├── node-backend/     # Node.js Express API server (calls C# backend)
└── react-frontend/   # React frontend (calls Node.js backend)
```

## Architecture Flow

```
React Frontend (port 5173)
    ↓
Node.js Backend (port 3000)
    ↓
C# Backend (port 8080)
```

## Quick Start

**Important:** Start services in this order (inside `csharp-test/`):

### 1. Start C# Backend (Data Source)

```bash
cd csharp-backend
dotnet run
```

The C# backend will run on `http://localhost:8080` and serves as the data source.

### 2. Start Node.js Backend (API Gateway)

```bash
cd node-backend
npm install
npm start
```

The Node.js backend will run on `http://localhost:3000` and proxies requests to the C# backend.

### 3. Start React Frontend

```bash
cd react-frontend
npm install
npm run dev
```

The React frontend will run on `http://localhost:5173` and calls the Node.js backend.

## Project Overview

### C# Backend (Data Source)
An ASP.NET Core minimal API server that:
- Serves as the primary data source
- Stores users and tasks in-memory
- Exposes REST endpoints (`/api/users`, `/api/tasks`, `/api/stats`)
- Handles JSON requests/responses
- Implements thread-safe data access

### Node.js Backend (API Gateway)
A RESTful API server built with Express that:
- Acts as a proxy/gateway between React and C#
- Calls the C# backend for all data operations
- Provides the same API interface to the frontend
- Handles error propagation and status codes

### React Frontend
A modern React application that:
- Consumes the Node.js backend API
- Displays users and tasks
- Provides filtering and search capabilities
- Shows real-time statistics
- Features a modern, responsive UI

## Test Requirements

**📋 See [TEST_REQUIREMENTS.md](./TEST_REQUIREMENTS.md) for detailed C# test requirements and evaluation criteria.**

The test includes:
- **Phase 1**: Setup and understanding (30 min)
- **Phase 2**: Core requirements – Add POST/PUT endpoints, logging in C# backend (2–3 hours)
- **Phase 3**: Advanced features – Persistence, caching, middleware (2–3 hours)
- **Phase 4**: Code quality – Testing, documentation, best practices
- **Phase 5**: Bonus tasks – Authentication, rate limiting, metrics

## Requirements

- .NET 8 SDK
- Node.js 16+ and npm
