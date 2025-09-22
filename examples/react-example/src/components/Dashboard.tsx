import React, { useState, useEffect } from 'react';
import { useMetric, useTrace, useTelemetryContext } from 'hydropulse';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface MetricData {
  timestamp: string;
  value: number;
  name: string;
}

interface SystemMetrics {
  memoryUsage: number;
  cpuUsage: number;
  activeUsers: number;
  requestsPerMinute: number;
  errorRate: number;
  responseTime: number;
}

const Dashboard: React.FC = () => {
  const { isInitialized } = useTelemetryContext();
  const { recordMetric } = useMetric();
  const { startTrace, endTrace } = useTrace();
  
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    memoryUsage: 0,
    cpuUsage: 0,
    activeUsers: 0,
    requestsPerMinute: 0,
    errorRate: 0,
    responseTime: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isInitialized) return;

    const traceId = startTrace('dashboard_load', {
      component: 'Dashboard',
      action: 'initial_load',
    });

    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const now = Date.now();
        const sampleMetrics: MetricData[] = [];
        
        for (let i = 23; i >= 0; i--) {
          const timestamp = new Date(now - i * 60000).toLocaleTimeString();
          sampleMetrics.push({
            timestamp,
            value: Math.floor(Math.random() * 100) + 50,
            name: 'requests_per_minute',
          });
        }
        
        setMetrics(sampleMetrics);
        
        const newSystemMetrics: SystemMetrics = {
          memoryUsage: Math.floor(Math.random() * 40) + 30, // 30-70%
          cpuUsage: Math.floor(Math.random() * 30) + 10, // 10-40%
          activeUsers: Math.floor(Math.random() * 500) + 100, // 100-600
          requestsPerMinute: Math.floor(Math.random() * 200) + 50, // 50-250
          errorRate: Math.random() * 5, // 0-5%
          responseTime: Math.floor(Math.random() * 200) + 100, // 100-300ms
        };
        
        setSystemMetrics(newSystemMetrics);
        
        recordMetric('dashboard_load_time', Date.now() - now, 'milliseconds', {
          component: 'Dashboard',
        });
        
        recordMetric('system_memory_usage', newSystemMetrics.memoryUsage, 'percent');
        recordMetric('system_cpu_usage', newSystemMetrics.cpuUsage, 'percent');
        recordMetric('active_users_count', newSystemMetrics.activeUsers, 'count');
        
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        recordMetric('dashboard_load_error', 1, 'count', {
          error_type: 'data_fetch_failed',
        });
      } finally {
        setIsLoading(false);
        endTrace(traceId, {
          success: true,
          metrics_loaded: metrics.length,
        });
      }
    };

    loadDashboardData();
    
    const interval = setInterval(() => {
      const now = new Date();
      const newMetric: MetricData = {
        timestamp: now.toLocaleTimeString(),
        value: Math.floor(Math.random() * 100) + 50,
        name: 'requests_per_minute',
      };
      
      setMetrics(prev => [...prev.slice(-23), newMetric]);
      
      setSystemMetrics(prev => ({
        ...prev,
        memoryUsage: Math.max(0, Math.min(100, prev.memoryUsage + (Math.random() - 0.5) * 10)),
        cpuUsage: Math.max(0, Math.min(100, prev.cpuUsage + (Math.random() - 0.5) * 15)),
        activeUsers: Math.max(0, prev.activeUsers + Math.floor((Math.random() - 0.5) * 20)),
        requestsPerMinute: Math.max(0, prev.requestsPerMinute + Math.floor((Math.random() - 0.5) * 30)),
        errorRate: Math.max(0, Math.min(10, prev.errorRate + (Math.random() - 0.5) * 2)),
        responseTime: Math.max(50, Math.min(1000, prev.responseTime + (Math.random() - 0.5) * 50)),
      }));
      
      recordMetric('dashboard_refresh', 1, 'count');
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [isInitialized, recordMetric, startTrace, endTrace]);

  if (!isInitialized) {
    return (
      <div className="card">
        <h2>Dashboard</h2>
        <p>Initializing telemetry...</p>
        <div className="loading"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>System Overview</h2>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading"></div>
            <p>Loading dashboard data...</p>
          </div>
        ) : (
          <div className="grid">
            <div className="metric-card">
              <div className="metric-label">Memory Usage</div>
              <div className="metric-value">{systemMetrics.memoryUsage.toFixed(1)}%</div>
              <div className={`status-indicator ${systemMetrics.memoryUsage > 80 ? 'offline' : systemMetrics.memoryUsage > 60 ? 'pending' : 'online'}`}></div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">CPU Usage</div>
              <div className="metric-value">{systemMetrics.cpuUsage.toFixed(1)}%</div>
              <div className={`status-indicator ${systemMetrics.cpuUsage > 70 ? 'offline' : systemMetrics.cpuUsage > 40 ? 'pending' : 'online'}`}></div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Active Users</div>
              <div className="metric-value">{systemMetrics.activeUsers.toLocaleString()}</div>
              <div className="status-indicator online"></div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Requests/Min</div>
              <div className="metric-value">{systemMetrics.requestsPerMinute}</div>
              <div className="status-indicator online"></div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Error Rate</div>
              <div className="metric-value">{systemMetrics.errorRate.toFixed(2)}%</div>
              <div className={`status-indicator ${systemMetrics.errorRate > 3 ? 'offline' : systemMetrics.errorRate > 1 ? 'pending' : 'online'}`}></div>
            </div>
            
            <div className="metric-card">
              <div className="metric-label">Response Time</div>
              <div className="metric-value">{systemMetrics.responseTime}ms</div>
              <div className={`status-indicator ${systemMetrics.responseTime > 500 ? 'offline' : systemMetrics.responseTime > 200 ? 'pending' : 'online'}`}></div>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <h2>Real-time Metrics</h2>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer>
            <LineChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#667eea" 
                strokeWidth={2}
                dot={{ fill: '#667eea', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>Performance Metrics</h2>
        <div style={{ height: '250px', width: '100%' }}>
          <ResponsiveContainer>
            <BarChart data={[
              { name: 'Memory', value: systemMetrics.memoryUsage },
              { name: 'CPU', value: systemMetrics.cpuUsage },
              { name: 'Error Rate', value: systemMetrics.errorRate * 10 }, // Scale for visibility
              { name: 'Response Time', value: systemMetrics.responseTime / 10 }, // Scale for visibility
            ]}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
