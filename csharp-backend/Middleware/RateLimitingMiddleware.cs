using System.Collections.Concurrent;

namespace CsharpBackend.Middleware;

public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private static readonly ConcurrentDictionary<string, ClientRateLimit> _clients = new();
    private const int MaxRequests = 1000;
    private const int WindowMinutes = 15;

    public RateLimitingMiddleware(RequestDelegate next, ILogger<RateLimitingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var clientId = GetClientId(context);
        var now = DateTime.UtcNow;
        
        // Clean expired entries
        CleanExpiredEntries(now);
        
        var clientLimit = _clients.GetOrAdd(clientId, _ => new ClientRateLimit
        {
            WindowStart = now,
            RequestCount = 0
        });
        
        lock (clientLimit)
        {
            // Reset window if expired
            if (now.Subtract(clientLimit.WindowStart).TotalMinutes >= WindowMinutes)
            {
                clientLimit.WindowStart = now;
                clientLimit.RequestCount = 0;
            }
            
            // Check if limit exceeded
            if (clientLimit.RequestCount >= MaxRequests)
            {
                context.Response.StatusCode = 429;
                context.Response.Headers.Add("X-RateLimit-Limit", MaxRequests.ToString());
                context.Response.Headers.Add("X-RateLimit-Remaining", "0");
                context.Response.Headers.Add("X-RateLimit-Reset", 
                    clientLimit.WindowStart.AddMinutes(WindowMinutes).ToString("O"));
                
                _logger.LogWarning("Rate limit exceeded for client {ClientId}", clientId);
                
                return;
            }
            
            clientLimit.RequestCount++;
            
            // Add headers
            context.Response.Headers.Add("X-RateLimit-Limit", MaxRequests.ToString());
            context.Response.Headers.Add("X-RateLimit-Remaining", 
                (MaxRequests - clientLimit.RequestCount).ToString());
            context.Response.Headers.Add("X-RateLimit-Reset", 
                clientLimit.WindowStart.AddMinutes(WindowMinutes).ToString("O"));
        }
        
        await _next(context);
    }
    
    private string GetClientId(HttpContext context)
    {
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
    
    private void CleanExpiredEntries(DateTime now)
    {
        var keysToRemove = new List<string>();
        
        foreach (var kvp in _clients)
        {
            if (now.Subtract(kvp.Value.WindowStart).TotalMinutes >= WindowMinutes * 2)
            {
                keysToRemove.Add(kvp.Key);
            }
        }
        
        foreach (var key in keysToRemove)
        {
            _clients.TryRemove(key, out _);
        }
    }
    
    private class ClientRateLimit
    {
        public DateTime WindowStart { get; set; }
        public int RequestCount { get; set; }
    }
}