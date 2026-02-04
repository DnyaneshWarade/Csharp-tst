const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

// Middleware
app.use(cors());
app.use(express.json());

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
