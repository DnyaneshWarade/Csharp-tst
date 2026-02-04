const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8081';
// Rate limiting configuration
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 1000; // max requests per window
const rateLimitStore = new Map();

// Metrics storage
const metrics = {
  requests: {
    total: 0,
    byMethod: {},
    byStatus: {},
    byEndpoint: {}
  },
  responseTime: {
    total: 0,
    count: 0,
    average: 0,
    min: Infinity,
    max: 0
  },
  errors: {
    total: 0,
    byType: {},
    rate: 0
  },
  uptime: Date.now()
};
// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting middleware
const rateLimiter = (req, res, next) => {
  const clientId = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Clean up old entries
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(key);
    }
  }
  
  // Get or create client rate limit data
  if (!rateLimitStore.has(clientId)) {
    rateLimitStore.set(clientId, {
      count: 0,
      windowStart: now
    });
  }
  
  const clientData = rateLimitStore.get(clientId);
  
  // Reset window if expired
  if (now - clientData.windowStart > RATE_LIMIT_WINDOW) {
    clientData.count = 0;
    clientData.windowStart = now;
  }
  
  // Check rate limit
  if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
    res.set({
      'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS,
      'X-RateLimit-Remaining': 0,
      'X-RateLimit-Reset': new Date(clientData.windowStart + RATE_LIMIT_WINDOW).toISOString()
    });
    return res.status(429).json({ 
      error: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((clientData.windowStart + RATE_LIMIT_WINDOW - now) / 1000)
    });
  }
  
  // Increment counter
  clientData.count++;
  
  // Set rate limit headers
  res.set({
    'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS,
    'X-RateLimit-Remaining': RATE_LIMIT_MAX_REQUESTS - clientData.count,
    'X-RateLimit-Reset': new Date(clientData.windowStart + RATE_LIMIT_WINDOW).toISOString()
  });
  
  next();
};

// Metrics middleware
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Track request
  metrics.requests.total++;
  metrics.requests.byMethod[req.method] = (metrics.requests.byMethod[req.method] || 0) + 1;
  metrics.requests.byEndpoint[req.path] = (metrics.requests.byEndpoint[req.path] || 0) + 1;
  
  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Update response time metrics
    metrics.responseTime.total += responseTime;
    metrics.responseTime.count++;
    metrics.responseTime.average = metrics.responseTime.total / metrics.responseTime.count;
    metrics.responseTime.min = Math.min(metrics.responseTime.min, responseTime);
    metrics.responseTime.max = Math.max(metrics.responseTime.max, responseTime);
    
    // Track status codes
    metrics.requests.byStatus[res.statusCode] = (metrics.requests.byStatus[res.statusCode] || 0) + 1;
    
    // Track errors
    if (res.statusCode >= 400) {
      metrics.errors.total++;
      const errorType = res.statusCode >= 500 ? 'server' : 'client';
      metrics.errors.byType[errorType] = (metrics.errors.byType[errorType] || 0) + 1;
    }
    
    // Update error rate
    metrics.errors.rate = (metrics.errors.total / metrics.requests.total * 100).toFixed(2);
    
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${responseTime}ms`);
    originalEnd.apply(this, args);
  };
  
  next();
};

// Apply middleware
app.use(rateLimiter);
app.use(metricsMiddleware);

// Helper function to make HTTP requests to C# backend using axios
async function makeRequest(path, options = {}) {
  try {
    const url = `${BACKEND_URL}${path}`;
    console.log(`Making request to C# backend: ${url}`);
    console.log(`Method: ${options.method || 'GET'}`);
    if (options.body) {
      console.log(`Body:`, JSON.stringify(options.body, null, 2));
    }

    const config = {
      method: options.method || 'GET',
      url: url,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: 10000
    };

    if (options.body) {
      config.data = options.body;
    }

    const response = await axios(config);
    console.log(`C# backend response status: ${response.status}`);
    console.log(`C# backend response data:`, response.data);
    
    return response.data;
  } catch (error) {
    console.log(`C# backend error:`, error.message);
    if (error.response) {
      console.log(`C# backend response status: ${error.response.status}`);
      console.log(`C# backend response data:`, error.response.data);
      
      const errorMessage = error.response.data?.error || 
                          error.response.data?.message || 
                          error.response.data || 
                          `Request failed with status ${error.response.status}`;
      
      const newError = new Error(errorMessage);
      newError.statusCode = error.response.status;
      newError.responseData = error.response.data;
      throw newError;
    } else if (error.request) {
      throw new Error('No response from C# backend. Is it running?');
    } else {
      throw new Error(error.message || 'An unexpected error occurred');
    }
  }
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check C# backend health
    const backendHealth = await makeRequest('/health');
    res.json({ 
      status: 'ok', 
      message: 'Node.js backend is running',
      csharpBackend: backendHealth
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      message: 'Node.js backend is running but C# backend is unavailable',
      error: error.message
    });
  }
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const uptime = Date.now() - metrics.uptime;
  const uptimeSeconds = Math.floor(uptime / 1000);
  const uptimeFormatted = {
    days: Math.floor(uptimeSeconds / 86400),
    hours: Math.floor((uptimeSeconds % 86400) / 3600),
    minutes: Math.floor((uptimeSeconds % 3600) / 60),
    seconds: uptimeSeconds % 60
  };
  
  const currentMetrics = {
    ...metrics,
    uptime: {
      milliseconds: uptime,
      seconds: uptimeSeconds,
      formatted: `${uptimeFormatted.days}d ${uptimeFormatted.hours}h ${uptimeFormatted.minutes}m ${uptimeFormatted.seconds}s`
    },
    rateLimiting: {
      activeClients: rateLimitStore.size,
      windowMs: RATE_LIMIT_WINDOW,
      maxRequests: RATE_LIMIT_MAX_REQUESTS
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(currentMetrics);
});

// Users endpoints
app.get('/api/users', async (req, res) => {
  try {
    const response = await makeRequest('/api/users');
    console.log('Fetched users:', response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await makeRequest(`/api/users/${req.params.id}`);
    res.json(user);
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/api/users', async (req, res) => {
  try {
    console.log('Received user creation request with data:', req.body);
    const response = await makeRequest('/api/users', {
      method: 'POST',
      body: req.body
    });
    res.status(201).json(response);
  } catch (error) {
    const statusCode = error.statusCode || (error.message.includes('400') ? 400 : 500);
    res.status(statusCode).json({ error: error.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    console.log('Received user update request with data:', req.body);
    const response = await makeRequest(`/api/users/${req.params.id}`, {
      method: 'PUT',
      body: req.body
    });
    res.json(response);
  } catch (error) {
    const statusCode = error.statusCode || 
      (error.message.includes('404') || error.message.includes('not found') ? 404 :
       error.message.includes('400') ? 400 : 500);
    res.status(statusCode).json({ error: error.message });
  }
});

// Tasks endpoints
app.get('/api/tasks', async (req, res) => {
  try {
    const { status, userId } = req.query;
    let path = '/api/tasks';
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (userId) params.append('userId', userId);
    if (params.toString()) {
      path += '?' + params.toString();
    }
    const response = await makeRequest(path);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const response = await makeRequest('/api/tasks', {
      method: 'POST',
      body: req.body
    });
    res.status(201).json(response);
  } catch (error) {
    const statusCode = error.statusCode || (error.message.includes('400') ? 400 : 500);
    res.status(statusCode).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const response = await makeRequest(`/api/tasks/${req.params.id}`, {
      method: 'PUT',
      body: req.body
    });
    res.json(response);
  } catch (error) {
    const statusCode = error.statusCode || 
      (error.message.includes('404') || error.message.includes('not found') ? 404 :
       error.message.includes('400') ? 400 : 500);
    res.status(statusCode).json({ error: error.message });
  }
});

// Statistics endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await makeRequest('/api/stats');
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Node.js backend server running on http://localhost:${PORT}`);
  console.log(`Connecting to C# backend at ${BACKEND_URL}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
