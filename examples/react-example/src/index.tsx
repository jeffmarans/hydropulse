import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { TelemetryProvider } from 'hydropulse';

const telemetryConfig = {
  provider: 'auto' as const,
  environment: (process.env.NODE_ENV as any) || 'development',
  serviceName: process.env.REACT_APP_HYDROPULSE_SERVICE_NAME || 'react-hydropulse-example',
  serviceVersion: process.env.REACT_APP_HYDROPULSE_SERVICE_VERSION || '1.0.0',
  debug: process.env.REACT_APP_HYDROPULSE_DEBUG === 'true',
  grafana: {
    url: process.env.REACT_APP_HYDROPULSE_GRAFANA_URL || 'http://localhost:3000/api/traces',
    apiKey: process.env.REACT_APP_HYDROPULSE_GRAFANA_API_KEY || 'demo-key',
    appKey: process.env.REACT_APP_HYDROPULSE_GRAFANA_APP_KEY || 'react-example',
  },
  openTelemetry: {
    endpoint: process.env.REACT_APP_HYDROPULSE_OTEL_ENDPOINT || 'http://localhost:4318',
    headers: {
      'Authorization': `Bearer ${process.env.REACT_APP_HYDROPULSE_OTEL_TOKEN || 'demo-token'}`,
    },
  },
  sampling: {
    rate: parseFloat(process.env.REACT_APP_HYDROPULSE_SAMPLING_RATE || '0.1'),
    rules: [
      {
        service: process.env.REACT_APP_HYDROPULSE_SERVICE_NAME || 'react-hydropulse-example',
        operation: 'page_view',
        rate: 0.5,
      },
    ],
  },
  batching: {
    maxQueueSize: parseInt(process.env.REACT_APP_HYDROPULSE_BATCH_SIZE || '50'),
    scheduledDelayMillis: parseInt(process.env.REACT_APP_HYDROPULSE_BATCH_DELAY || '3000'),
  },
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <TelemetryProvider 
      config={telemetryConfig}
      enableWebVitals={true}
      enableUserInteractionTracking={true}
      onError={(error: any) => {
        console.error('Telemetry initialization error:', error);
      }}
    >
      <App />
    </TelemetryProvider>
  </React.StrictMode>
);
