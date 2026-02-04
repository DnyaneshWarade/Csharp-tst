import { useState, useEffect } from 'react'
import './Metrics.css'

function Metrics() {
  const [nodeMetrics, setNodeMetrics] = useState(null)
  const [csharpMetrics, setCsharpMetrics] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const [nodeResponse, csharpResponse] = await Promise.allSettled([
        fetch('http://localhost:3000/metrics'),
        fetch('http://localhost:8081/metrics')
      ])

      if (nodeResponse.status === 'fulfilled' && nodeResponse.value.ok) {
        const nodeData = await nodeResponse.value.json()
        setNodeMetrics(nodeData)
      }

      if (csharpResponse.status === 'fulfilled' && csharpResponse.value.ok) {
        const csharpData = await csharpResponse.value.json()
        setCsharpMetrics(csharpData)
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const formatNumber = (num) => {
    if (num === undefined || num === null) return 'N/A'
    return typeof num === 'number' ? num.toLocaleString() : num
  }

  const formatDuration = (ms) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  return (
    <div className="metrics-container">
      <div className="metrics-header">
        <h2>System Metrics</h2>
        <button onClick={fetchMetrics} disabled={loading} className="refresh-btn">
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="metrics-grid">
        {/* Node.js Backend Metrics */}
        <div className="metrics-card">
          <h3>Node.js Backend</h3>
          {nodeMetrics ? (
            <>
              <div className="metric-group">
                <h4>Requests</h4>
                <div className="metric-item">
                  <span>Total:</span>
                  <span>{formatNumber(nodeMetrics.requests?.total)}</span>
                </div>
                <div className="metric-item">
                  <span>Error Rate:</span>
                  <span>{nodeMetrics.errors?.rate || 0}%</span>
                </div>
              </div>
              
              <div className="metric-group">
                <h4>Performance</h4>
                <div className="metric-item">
                  <span>Avg Response:</span>
                  <span>{formatDuration(nodeMetrics.responseTime?.average)}</span>
                </div>
                <div className="metric-item">
                  <span>Min/Max:</span>
                  <span>{formatDuration(nodeMetrics.responseTime?.min)} / {formatDuration(nodeMetrics.responseTime?.max)}</span>
                </div>
              </div>

              <div className="metric-group">
                <h4>Rate Limiting</h4>
                <div className="metric-item">
                  <span>Active Clients:</span>
                  <span>{formatNumber(nodeMetrics.rateLimiting?.activeClients)}</span>
                </div>
                <div className="metric-item">
                  <span>Limit:</span>
                  <span>{formatNumber(nodeMetrics.rateLimiting?.maxRequests)}/15min</span>
                </div>
              </div>

              <div className="metric-group">
                <h4>Uptime</h4>
                <div className="metric-item">
                  <span>{nodeMetrics.uptime?.formatted || 'N/A'}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="loading-state">Loading Node.js metrics...</div>
          )}
        </div>

        {/* C# Backend Metrics */}
        <div className="metrics-card">
          <h3>C# Backend</h3>
          {csharpMetrics ? (
            <>
              <div className="metric-group">
                <h4>Requests</h4>
                <div className="metric-item">
                  <span>Total:</span>
                  <span>{formatNumber(Object.values(csharpMetrics.counters || {}).reduce((a, b) => a + b, 0))}</span>
                </div>
              </div>
              
              <div className="metric-group">
                <h4>Response Times</h4>
                {Object.entries(csharpMetrics.histograms || {}).map(([key, data]) => (
                  key.includes('duration') && (
                    <div key={key} className="metric-subgroup">
                      <div className="metric-item">
                        <span>Average:</span>
                        <span>{formatDuration(data.average)}</span>
                      </div>
                      <div className="metric-item">
                        <span>P95:</span>
                        <span>{formatDuration(data.p95)}</span>
                      </div>
                    </div>
                  )
                ))}
              </div>

              <div className="metric-group">
                <h4>Uptime</h4>
                <div className="metric-item">
                  <span>{csharpMetrics.uptime ? formatDuration(csharpMetrics.uptime.totalMilliseconds) : 'N/A'}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="loading-state">Loading C# metrics...</div>
          )}
        </div>
      </div>

      <div className="metrics-footer">
        <small>Last updated: {new Date().toLocaleTimeString()}</small>
      </div>
    </div>
  )
}

export default Metrics