using System.Collections.Concurrent;
using System.Diagnostics;

namespace CsharpBackend.Services;

public class MetricsService
{
    private readonly ConcurrentDictionary<string, long> _counters = new();
    private readonly ConcurrentDictionary<string, List<double>> _histograms = new();
    private readonly DateTime _startTime = DateTime.UtcNow;
    
    public void IncrementCounter(string name, string[]? labels = null)
    {
        var key = CreateKey(name, labels);
        _counters.AddOrUpdate(key, 1, (_, current) => current + 1);
    }
    
    public void RecordValue(string name, double value, string[]? labels = null)
    {
        var key = CreateKey(name, labels);
        _histograms.AddOrUpdate(key, new List<double> { value }, (_, current) =>
        {
            current.Add(value);
            // Keep only last 1000 values to prevent memory issues
            if (current.Count > 1000)
            {
                current.RemoveAt(0);
            }
            return current;
        });
    }
    
    public MetricsSnapshot GetSnapshot()
    {
        var snapshot = new MetricsSnapshot
        {
            Timestamp = DateTime.UtcNow,
            Uptime = DateTime.UtcNow.Subtract(_startTime),
            Counters = new Dictionary<string, long>(_counters),
            Histograms = new Dictionary<string, HistogramData>()
        };
        
        foreach (var kvp in _histograms)
        {
            var values = kvp.Value.ToArray();
            if (values.Length > 0)
            {
                snapshot.Histograms[kvp.Key] = new HistogramData
                {
                    Count = values.Length,
                    Sum = values.Sum(),
                    Average = values.Average(),
                    Min = values.Min(),
                    Max = values.Max(),
                    P50 = CalculatePercentile(values, 0.5),
                    P95 = CalculatePercentile(values, 0.95),
                    P99 = CalculatePercentile(values, 0.99)
                };
            }
        }
        
        return snapshot;
    }
    
    private string CreateKey(string name, string[]? labels = null)
    {
        if (labels == null || labels.Length == 0)
            return name;
        
        return $"{name}_{string.Join("_", labels)}";
    }
    
    private double CalculatePercentile(double[] values, double percentile)
    {
        if (values.Length == 0) return 0;
        if (values.Length == 1) return values[0];
        
        var sorted = values.OrderBy(x => x).ToArray();
        var index = (int)Math.Ceiling(percentile * sorted.Length) - 1;
        return sorted[Math.Max(0, Math.Min(index, sorted.Length - 1))];
    }
}

public class MetricsSnapshot
{
    public DateTime Timestamp { get; set; }
    public TimeSpan Uptime { get; set; }
    public Dictionary<string, long> Counters { get; set; } = new();
    public Dictionary<string, HistogramData> Histograms { get; set; } = new();
}

public class HistogramData
{
    public int Count { get; set; }
    public double Sum { get; set; }
    public double Average { get; set; }
    public double Min { get; set; }
    public double Max { get; set; }
    public double P50 { get; set; }
    public double P95 { get; set; }
    public double P99 { get; set; }
}