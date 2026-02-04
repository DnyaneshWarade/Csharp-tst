using CsharpBackend.Services;
using System.Diagnostics;

namespace CsharpBackend.Middleware
{
    public class MetricsMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly MetricsService _metricsService;
        private readonly ILogger<MetricsMiddleware> _logger;

        public MetricsMiddleware(RequestDelegate next, MetricsService metricsService, ILogger<MetricsMiddleware> logger)
        {
            _next = next;
            _metricsService = metricsService;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var stopwatch = Stopwatch.StartNew();
            var path = context.Request.Path.ToString();
            var method = context.Request.Method;

            // Increment request counter
            _metricsService.IncrementCounter("http_requests_total", new[] { method, path });

            try
            {
                await _next(context);

                // Record successful response
                stopwatch.Stop();
                _metricsService.RecordValue("http_request_duration_ms", 
                    stopwatch.ElapsedMilliseconds, 
                    new[] { method, path });
                
                _metricsService.IncrementCounter("http_responses_total", 
                    new[] { method, path, context.Response.StatusCode.ToString() });
                
                _logger.LogInformation("Request {Method} {Path} completed in {ElapsedMs}ms with status {StatusCode}", 
                    method, path, stopwatch.ElapsedMilliseconds, context.Response.StatusCode);
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                _metricsService.RecordValue("http_request_duration_ms", 
                    stopwatch.ElapsedMilliseconds, 
                    new[] { method, path });
                
                _metricsService.IncrementCounter("http_errors_total", new[] { method, path });
                
                _logger.LogError(ex, "Request {Method} {Path} failed after {ElapsedMs}ms", 
                    method, path, stopwatch.ElapsedMilliseconds);
                
                throw;
            }
        }
    }
}