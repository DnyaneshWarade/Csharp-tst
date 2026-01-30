# C# Backend Test Project

This is the **C# (.NET) developer test project** backend. It mirrors the Go backend's API and behavior using **ASP.NET Core minimal APIs**.

## Stack

- .NET 8.0 (SDK)
- ASP.NET Core Minimal APIs

## Project Structure

```
csharp-backend/
├── csharp-backend.csproj
├── Program.cs              # Minimal API setup & endpoints
├── Models/
│   ├── User.cs
│   ├── TaskItem.cs
│   └── Responses.cs
└── Data/
    └── DataStore.cs        # In-memory data store
```

## API Overview

The C# backend exposes the same read-only endpoints as the Go backend:

- `GET /health` – Health check
- `GET /api/users` – Get all users
- `GET /api/users/{id}` – Get a single user by ID
- `GET /api/tasks` – Get tasks, supports filters:
  - `GET /api/tasks?status=pending`
  - `GET /api/tasks?userId=1`
  - `GET /api/tasks?status=pending&userId=1`
- `GET /api/stats` – Aggregate statistics for users and tasks

Data is stored **in-memory** with a thread-safe `DataStore`, matching the Go backend's sample data and behavior.

## Running the C# Backend

From the `csharp-test/` folder:

```bash
cd csharp-backend
dotnet run
```

The backend will start on:

- `http://localhost:8080`

You can override the port with the `PORT` environment variable:

```bash
PORT=8081 dotnet run
```

## For C# Candidates

As a C# developer, you will primarily work in the `csharp-backend/` folder.

Typical test tasks (analogous to the Go test) would be:
- Implement `POST /api/users` – create user
- Implement `POST /api/tasks` – create task
- Implement `PUT /api/tasks/{id}` – update task
- Add structured request logging (middleware or filters)
- (Optionally) add persistence, validation, etc.

Focus on writing clean, idiomatic C# with ASP.NET Core best practices.
