import React, { useState, useEffect, useCallback } from 'react';
import { useMetric, useTrace, withTelemetry } from '@jeffmarans/hydropulse';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  componentMounts: number;
  reRenders: number;
  apiCallDuration: number;
}

const PerformanceDemo: React.FC = () => {
  const { recordMetric } = useMetric();
  const { startTrace, endTrace } = useTrace();
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    componentMounts: 0,
    reRenders: 0,
    apiCallDuration: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    const mountTraceId = startTrace('component_mount', {
      component: 'PerformanceDemo',
      mount_time: Date.now(),
    });

    setMetrics(prev => ({ ...prev, componentMounts: prev.componentMounts + 1 }));
    
    recordMetric('component_mount', 1, 'count', {
      component: 'PerformanceDemo',
    });

    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo.usedJSHeapSize / 1024 / 1024; // MB
      setMetrics(prev => ({ ...prev, memoryUsage }));
      
      recordMetric('memory_usage', memoryUsage, 'megabytes', {
        component: 'PerformanceDemo',
        heap_limit: memoryInfo.jsHeapSizeLimit / 1024 / 1024,
      });
    }

    endTrace(mountTraceId, {
      success: true,
      component: 'PerformanceDemo',
    });

    return () => {
      recordMetric('component_unmount', 1, 'count', {
        component: 'PerformanceDemo',
        total_renders: renderCount,
      });
    };
  }, []);

  useEffect(() => {
    setRenderCount(prev => prev + 1);
    setMetrics(prev => ({ ...prev, reRenders: prev.reRenders + 1 }));
    
    recordMetric('component_render', 1, 'count', {
      component: 'PerformanceDemo',
      render_count: renderCount + 1,
    });
  });

  const simulateHeavyComputation = useCallback(() => {
    const traceId = startTrace('heavy_computation', {
      computation_type: 'fibonacci_calculation',
    });

    const startTime = performance.now();
    
    const fibonacci = (n: number): number => {
      if (n <= 1) return n;
      return fibonacci(n - 1) + fibonacci(n - 2);
    };
    
    const result = fibonacci(35); // This will take some time
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    setMetrics(prev => ({ ...prev, renderTime: duration }));
    
    recordMetric('heavy_computation_duration', duration, 'milliseconds', {
      computation_type: 'fibonacci',
      input_value: 35,
      result_value: result,
    });
    
    endTrace(traceId, {
      success: true,
      duration_ms: duration,
      result,
    });
    
    return result;
  }, [startTrace, endTrace, recordMetric]);

  const simulateApiCall = useCallback(async () => {
    const traceId = startTrace('api_call_simulation', {
      api_type: 'data_fetch',
    });

    setIsLoading(true);
    const startTime = performance.now();
    
    try {
      const delay = Math.random() * 2000 + 500; // 500-2500ms
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.floor(Math.random() * 1000),
        timestamp: new Date().toISOString(),
      }));
      
      setData(mockData);
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setMetrics(prev => ({ ...prev, apiCallDuration: duration }));
      
      recordMetric('api_call_duration', duration, 'milliseconds', {
        api_endpoint: 'mock_data_fetch',
        response_size: mockData.length,
        success: true,
      });
      
      recordMetric('api_call_success', 1, 'count', {
        api_endpoint: 'mock_data_fetch',
      });
      
      endTrace(traceId, {
        success: true,
        duration_ms: duration,
        response_size: mockData.length,
      });
      
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      recordMetric('api_call_error', 1, 'count', {
        api_endpoint: 'mock_data_fetch',
        error_type: error instanceof Error ? error.name : 'unknown',
      });
      
      endTrace(traceId, {
        success: false,
        duration_ms: duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [startTrace, endTrace, recordMetric]);

  const measureWebVitals = useCallback(() => {
    const traceId = startTrace('web_vitals_measurement', {
      measurement_type: 'manual_trigger',
    });

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigation) {
      const metrics = {
        dns_lookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcp_connection: navigation.connectEnd - navigation.connectStart,
        request_response: navigation.responseEnd - navigation.requestStart,
        dom_processing: navigation.domContentLoadedEventEnd - navigation.responseEnd,
        load_complete: navigation.loadEventEnd - navigation.fetchStart,
      };
      
      Object.entries(metrics).forEach(([metric, value]) => {
        recordMetric(`web_vital_${metric}`, value, 'milliseconds', {
          measurement_source: 'navigation_timing',
        });
      });
      
      endTrace(traceId, {
        success: true,
        metrics_measured: Object.keys(metrics).length,
        total_load_time: metrics.load_complete,
      });
    }
  }, [startTrace, endTrace, recordMetric]);

  const clearData = () => {
    const traceId = startTrace('clear_data', {
      action_type: 'data_reset',
    });

    setData([]);
    setMetrics(prev => ({ ...prev, apiCallDuration: 0 }));
    
    recordMetric('data_cleared', 1, 'count', {
      items_cleared: data.length,
    });
    
    endTrace(traceId, {
      success: true,
      items_cleared: data.length,
    });
  };

  return (
    <div>
      <div className="card">
        <h2>Performance Metrics</h2>
        <div className="grid">
          <div className="metric-card">
            <div className="metric-label">Render Time</div>
            <div className="metric-value">{metrics.renderTime.toFixed(2)}ms</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Memory Usage</div>
            <div className="metric-value">{metrics.memoryUsage.toFixed(2)}MB</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Component Mounts</div>
            <div className="metric-value">{metrics.componentMounts}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Re-renders</div>
            <div className="metric-value">{metrics.reRenders}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">API Call Duration</div>
            <div className="metric-value">{metrics.apiCallDuration.toFixed(2)}ms</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Data Items</div>
            <div className="metric-value">{data.length}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Performance Tests</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <button
            onClick={simulateHeavyComputation}
            className="button"
          >
            Heavy Computation
          </button>
          
          <button
            onClick={simulateApiCall}
            className="button"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Simulate API Call'}
          </button>
          
          <button
            onClick={measureWebVitals}
            className="button"
          >
            Measure Web Vitals
          </button>
          
          {data.length > 0 && (
            <button
              onClick={clearData}
              className="button danger"
            >
              Clear Data
            </button>
          )}
        </div>
        
        {isLoading && (
          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
            <div className="loading"></div>
            <p>Simulating API call...</p>
          </div>
        )}
      </div>

      {data.length > 0 && (
        <div className="card">
          <h2>Loaded Data ({data.length} items)</h2>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e1e5e9' }}>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>ID</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Value</th>
                  <th style={{ padding: '0.5rem', textAlign: 'left' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 20).map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '0.5rem' }}>{item.id}</td>
                    <td style={{ padding: '0.5rem' }}>{item.name}</td>
                    <td style={{ padding: '0.5rem' }}>{item.value}</td>
                    <td style={{ padding: '0.5rem', fontSize: '0.8rem' }}>
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.length > 20 && (
              <p style={{ textAlign: 'center', margin: '1rem 0', color: '#666' }}>
                Showing first 20 of {data.length} items
              </p>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Performance Monitoring Info</h2>
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
          <h3>Tracked Metrics:</h3>
          <ul>
            <li><strong>Component Lifecycle:</strong> Mount, unmount, and render times</li>
            <li><strong>Memory Usage:</strong> JavaScript heap size and memory consumption</li>
            <li><strong>API Performance:</strong> Request duration, success/failure rates</li>
            <li><strong>Computation Time:</strong> Heavy operations and processing duration</li>
            <li><strong>Web Vitals:</strong> DNS lookup, TCP connection, DOM processing</li>
          </ul>
          
          <h3>Performance Insights:</h3>
          <ul>
            <li>Monitor component re-render frequency to identify optimization opportunities</li>
            <li>Track memory usage to detect potential memory leaks</li>
            <li>Measure API call performance to optimize user experience</li>
            <li>Use Web Vitals to understand page load performance</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default withTelemetry(PerformanceDemo, {
  componentName: 'PerformanceDemo',
  trackProps: false,
  trackState: true,
  trackErrors: true,
  trackPerformance: true,
});
