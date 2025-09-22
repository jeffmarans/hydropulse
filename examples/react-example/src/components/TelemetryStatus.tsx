import React, { useState, useEffect } from 'react';
import { useTelemetryContext, useMetric } from '@jeffmarans/hydropulse';

interface TelemetryStats {
  totalMetrics: number;
  totalTraces: number;
  totalLogs: number;
  totalErrors: number;
  uptime: number;
  lastActivity: string;
}

const TelemetryStatus: React.FC = () => {
  const { telemetryCore, isInitialized, error } = useTelemetryContext();
  const { recordMetric } = useMetric();
  
  const [stats, setStats] = useState<TelemetryStats>({
    totalMetrics: 0,
    totalTraces: 0,
    totalLogs: 0,
    totalErrors: 0,
    uptime: 0,
    lastActivity: 'Never',
  });
  const [providerHealth, setProviderHealth] = useState<{
    primary: boolean;
    fallback: boolean;
    current: string;
  }>({
    primary: false,
    fallback: false,
    current: 'unknown',
  });

  useEffect(() => {
    if (!isInitialized || !telemetryCore) return;

    const updateStats = () => {
      setStats(prev => ({
        totalMetrics: prev.totalMetrics + Math.floor(Math.random() * 5),
        totalTraces: prev.totalTraces + Math.floor(Math.random() * 3),
        totalLogs: prev.totalLogs + Math.floor(Math.random() * 2),
        totalErrors: prev.totalErrors + (Math.random() < 0.1 ? 1 : 0),
        uptime: prev.uptime + 5,
        lastActivity: new Date().toLocaleTimeString(),
      }));

      const primaryHealthy = telemetryCore.isHealthy();
      setProviderHealth({
        primary: primaryHealthy,
        fallback: true, // Assume fallback is always available
        current: primaryHealthy ? 'grafana' : 'opentelemetry',
      });

      recordMetric('telemetry_status_check', 1, 'count', {
        primary_healthy: primaryHealthy,
        current_provider: primaryHealthy ? 'grafana' : 'opentelemetry',
      });
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, [isInitialized, telemetryCore, recordMetric]);

  const testTelemetryConnection = async () => {
    if (!telemetryCore) return;

    try {
      await telemetryCore.metrics.recordMetric('connection_test', 1, 'count', {
        test_type: 'manual_connection_test',
        timestamp: Date.now(),
      });

      const traceId = await telemetryCore.traces.startTrace('connection_test', {
        test_type: 'manual_connection_test',
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await telemetryCore.traces.endTrace(traceId, {
        success: true,
        test_completed: true,
      });

      await telemetryCore.logs.logInfo('Connection test completed successfully', {
        test_type: 'manual_connection_test',
        component: 'TelemetryStatus',
      });

      recordMetric('connection_test_success', 1, 'count');
      
    } catch (error) {
      console.error('Telemetry connection test failed:', error);
      recordMetric('connection_test_failure', 1, 'count', {
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const forceFallback = async () => {
    if (!telemetryCore) return;

    try {
      recordMetric('manual_fallback_trigger', 1, 'count', {
        trigger_source: 'user_action',
        component: 'TelemetryStatus',
      });
      
      setProviderHealth(prev => ({
        ...prev,
        primary: false,
        current: 'opentelemetry',
      }));
      
    } catch (error) {
      console.error('Failed to trigger fallback:', error);
    }
  };

  const resetProviders = () => {
    setProviderHealth({
      primary: true,
      fallback: true,
      current: 'grafana',
    });
    
    recordMetric('provider_reset', 1, 'count', {
      reset_source: 'user_action',
      component: 'TelemetryStatus',
    });
  };

  if (!isInitialized) {
    return (
      <div className="card">
        <h2>Telemetry Status</h2>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading"></div>
          <p>Initializing telemetry system...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <h2>Telemetry Status</h2>
        <div className="log-entry error">
          <strong>Initialization Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <h2>Telemetry System Status</h2>
        <div className="grid">
          <div className="metric-card">
            <div className="metric-label">System Status</div>
            <div className="metric-value">
              <span className={`status-indicator ${isInitialized ? 'online' : 'offline'}`}></span>
              {isInitialized ? 'Online' : 'Offline'}
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Current Provider</div>
            <div className="metric-value">{providerHealth.current}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Uptime</div>
            <div className="metric-value">{Math.floor(stats.uptime / 60)}m {stats.uptime % 60}s</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Last Activity</div>
            <div className="metric-value" style={{ fontSize: '1rem' }}>{stats.lastActivity}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Provider Health</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ 
            padding: '1rem', 
            border: '2px solid #e1e5e9', 
            borderRadius: '8px',
            borderColor: providerHealth.primary ? '#38a169' : '#e53e3e'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center' }}>
              <span className={`status-indicator ${providerHealth.primary ? 'online' : 'offline'}`}></span>
              Grafana (Primary)
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              Status: {providerHealth.primary ? 'Healthy' : 'Unavailable'}
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
              Endpoint: {process.env.REACT_APP_GRAFANA_URL || 'http://localhost:3000/api/traces'}
            </p>
          </div>
          
          <div style={{ 
            padding: '1rem', 
            border: '2px solid #e1e5e9', 
            borderRadius: '8px',
            borderColor: providerHealth.fallback ? '#38a169' : '#e53e3e'
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center' }}>
              <span className={`status-indicator ${providerHealth.fallback ? 'online' : 'offline'}`}></span>
              OpenTelemetry (Fallback)
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
              Status: {providerHealth.fallback ? 'Healthy' : 'Unavailable'}
            </p>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#666' }}>
              Endpoint: {process.env.REACT_APP_OTEL_ENDPOINT || 'http://localhost:4318'}
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Telemetry Statistics</h2>
        <div className="grid">
          <div className="metric-card">
            <div className="metric-label">Total Metrics</div>
            <div className="metric-value">{stats.totalMetrics.toLocaleString()}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Total Traces</div>
            <div className="metric-value">{stats.totalTraces.toLocaleString()}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Total Logs</div>
            <div className="metric-value">{stats.totalLogs.toLocaleString()}</div>
          </div>
          
          <div className="metric-card">
            <div className="metric-label">Total Errors</div>
            <div className="metric-value">{stats.totalErrors.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>System Controls</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={testTelemetryConnection}
            className="button"
          >
            Test Connection
          </button>
          
          <button
            onClick={forceFallback}
            className="button danger"
            disabled={!providerHealth.primary}
          >
            Force Fallback
          </button>
          
          <button
            onClick={resetProviders}
            className="button success"
          >
            Reset Providers
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Configuration</h2>
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
          <h3>Current Configuration:</h3>
          <ul>
            <li><strong>Service Name:</strong> react-telemetry-example</li>
            <li><strong>Service Version:</strong> 1.0.0</li>
            <li><strong>Environment:</strong> {process.env.NODE_ENV || 'development'}</li>
            <li><strong>Provider Strategy:</strong> Auto (Grafana → OpenTelemetry)</li>
            <li><strong>Sampling Rate:</strong> 10%</li>
            <li><strong>Batch Size:</strong> 50 events</li>
            <li><strong>Batch Delay:</strong> 3000ms</li>
          </ul>
          
          <h3>Features Enabled:</h3>
          <ul>
            <li>✅ Web Vitals Tracking</li>
            <li>✅ User Interaction Tracking</li>
            <li>✅ Error Boundary Integration</li>
            <li>✅ Performance Monitoring</li>
            <li>✅ Automatic Fallback</li>
            <li>✅ Circuit Breaker</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TelemetryStatus;
