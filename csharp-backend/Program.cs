using CsharpBackend.Data;
using CsharpBackend.Models;
using CsharpBackend.Services;
using CsharpBackend.Middleware;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<DataStore>();
builder.Services.AddSingleton<MetricsService>();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure JSON options for case-insensitive property matching
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
});

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Add custom middleware
app.UseMiddleware<RateLimitingMiddleware>();
app.UseMiddleware<MetricsMiddleware>();

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

const int defaultPort = 8081;
var portEnv = Environment.GetEnvironmentVariable("PORT");
if (!int.TryParse(portEnv, out var port))
{
    port = defaultPort;
}

app.MapGet("/health", () =>
{
    return Results.Json(new HealthResponse
    {
        Status = "ok",
        Message = "C# backend is running"
    });
});

// Metrics endpoint
app.MapGet("/metrics", (MetricsService metrics) =>
{
    var snapshot = metrics.GetSnapshot();
    return Results.Json(snapshot);
});

app.MapGet("/api/users", (DataStore store) =>
{
    var users = store.GetUsers();
    var response = new UsersResponse
    {
        Users = users,
        Count = users.Count
    };
    return Results.Json(response);
});

app.MapGet("/api/users/{id:int}", (int id, DataStore store) =>
{
    var user = store.GetUserById(id);
    return user is null
        ? Results.NotFound(new { error = "User not found" })
        : Results.Json(user);
});

app.MapPost("/api/users", (User userRequest, DataStore store) =>
{
    Console.WriteLine($"Received POST /api/users request");
    Console.WriteLine($"User data - Name: '{userRequest.Name}', Email: '{userRequest.Email}', Role: '{userRequest.Role}'");
    
    if (string.IsNullOrWhiteSpace(userRequest.Name) ||
        string.IsNullOrWhiteSpace(userRequest.Email) ||
        string.IsNullOrWhiteSpace(userRequest.Role))
    {
        Console.WriteLine("Validation failed - missing required fields");
        return Results.BadRequest(new { error = "Name, email, and role are required" });
    }

    try 
    {
        var user = store.CreateUser(userRequest.Name, userRequest.Email, userRequest.Role);
        Console.WriteLine($"Successfully created user with ID: {user.Id}");
        return Results.Created($"/api/users/{user.Id}", user);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error creating user: {ex.Message}");
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapGet("/api/tasks", (string? status, string? userId, DataStore store) =>
{
    var tasks = store.GetTasks(status, userId);
    var response = new TasksResponse
    {
        Tasks = tasks,
        Count = tasks.Count
    };
    return Results.Json(response);
});

app.MapPost("/api/tasks", (TaskItem taskRequest, DataStore store) =>
{
    Console.WriteLine($"Received POST /api/tasks request");
    Console.WriteLine($"Task data - Title: '{taskRequest?.Title}', Status: '{taskRequest?.Status}', UserId: {taskRequest?.UserId}");
    
    if (taskRequest == null || string.IsNullOrWhiteSpace(taskRequest.Title) ||
        string.IsNullOrWhiteSpace(taskRequest.Status) ||
        taskRequest.UserId <= 0)
    {
        Console.WriteLine("Validation failed - missing required fields");
        return Results.BadRequest(new { error = "Title, status, and valid userId are required" });
    }

    try 
    {
        var task = store.CreateTask(taskRequest.Title, taskRequest.Status, taskRequest.UserId);
        Console.WriteLine($"Successfully created task with ID: {task.Id}");
        return Results.Created($"/api/tasks/{task.Id}", task);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error creating task: {ex.Message}");
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapPut("/api/users/{id:int}", (int id, User userRequest, DataStore store) =>
{
    Console.WriteLine($"Received PUT /api/users/{id} request");
    Console.WriteLine($"User data - Name: '{userRequest?.Name}', Email: '{userRequest?.Email}', Role: '{userRequest?.Role}'");
    
    if (userRequest == null || string.IsNullOrWhiteSpace(userRequest.Name) ||
        string.IsNullOrWhiteSpace(userRequest.Email) ||
        string.IsNullOrWhiteSpace(userRequest.Role))
    {
        Console.WriteLine("Validation failed - missing required fields");
        return Results.BadRequest(new { error = "Name, email, and role are required" });
    }

    try 
    {
        var user = store.UpdateUser(id, userRequest.Name, userRequest.Email, userRequest.Role);
        if (user == null)
        {
            Console.WriteLine($"User with ID {id} not found");
            return Results.NotFound(new { error = "User not found" });
        }
        Console.WriteLine($"Successfully updated user with ID: {user.Id}");
        return Results.Ok(user);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error updating user: {ex.Message}");
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapPut("/api/tasks/{id:int}", (int id, TaskItem taskRequest, DataStore store) =>
{
    Console.WriteLine($"Received PUT /api/tasks/{id} request");
    Console.WriteLine($"Task data - Title: '{taskRequest?.Title}', Status: '{taskRequest?.Status}', UserId: {taskRequest?.UserId}");
    
    if (taskRequest == null || string.IsNullOrWhiteSpace(taskRequest.Title) ||
        string.IsNullOrWhiteSpace(taskRequest.Status) ||
        taskRequest.UserId <= 0)
    {
        Console.WriteLine("Validation failed - missing required fields");
        return Results.BadRequest(new { error = "Title, status, and valid userId are required" });
    }

    try 
    {
        var task = store.UpdateTask(id, taskRequest.Title, taskRequest.Status, taskRequest.UserId);
        if (task == null)
        {
            Console.WriteLine($"Task with ID {id} not found");
            return Results.NotFound(new { error = "Task not found" });
        }
        Console.WriteLine($"Successfully updated task with ID: {task.Id}");
        return Results.Ok(task);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error updating task: {ex.Message}");
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapGet("/api/stats", (DataStore store) =>
{
    var stats = store.GetStats();
    return Results.Json(stats);
});

app.MapGet("/api/metrics", (MetricsService metrics) =>
{
    var metricsData = metrics.GetSnapshot();
    return Results.Json(metricsData);
});

app.Run($"http://0.0.0.0:{port}");
