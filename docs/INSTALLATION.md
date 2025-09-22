# Installation Guide

## Prerequisites

- Node.js 16.x or higher
- npm, yarn, or pnpm package manager
- TypeScript 4.5+ (for TypeScript projects)

## Installation

### NPM
```bash
npm install @jeffmarans/hydropulse
```

### Yarn
```bash
yarn add @jeffmarans/hydropulse
```

### PNPM
```bash
pnpm add @jeffmarans/hydropulse
```

## Peer Dependencies

The library requires different peer dependencies based on your framework:

### For NestJS Applications
```bash
npm install @nestjs/common @nestjs/core rxjs reflect-metadata
```

### For React Applications
```bash
npm install react react-dom
```

## Framework-Specific Setup

### NestJS Setup

1. **Import the TelemetryModule in your app module:**

```typescript
import { Module } from '@nestjs/common';
import { TelemetryModule } from '@jeffmarans/hydropulse';

@Module({
  imports: [
    TelemetryModule.forRoot({
      provider: 'auto', // Will try Grafana first, fallback to OpenTelemetry
      environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
      serviceName: 'my-nestjs-app',
      serviceVersion: '1.0.0',
      grafana: {
        url: process.env.GRAFANA_URL || 'http://localhost:3000/api/traces',
        apiKey: process.env.GRAFANA_API_KEY || '',
        appKey: process.env.GRAFANA_APP_KEY || 'my-app',
      },
      openTelemetry: {
        endpoint: process.env.OTEL_ENDPOINT || 'http://localhost:4318',
        headers: {
          'Authorization': `Bearer ${process.env.OTEL_TOKEN || ''}`,
        },
      },
    }),
  ],
})
export class AppModule {}
```

2. **Use decorators in your controllers:**

```typescript
import { Controller, Get } from '@nestjs/common';
import { TrackMetric, TrackTrace } from '@jeffmarans/hydropulse';

@Controller('users')
export class UsersController {
  @Get()
  @TrackTrace('get_users')
  @TrackMetric('user_requests')
  async getUsers() {
    // Your controller logic
  }
}
```

### React Setup

1. **Wrap your app with TelemetryProvider:**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { TelemetryProvider } from '@jeffmarans/hydropulse';
import App from './App';

const telemetryConfig = {
  provider: 'auto' as const,
  environment: (process.env.NODE_ENV as any) || 'development',
  serviceName: 'my-react-app',
  serviceVersion: '1.0.0',
  grafana: {
    url: process.env.REACT_APP_GRAFANA_URL || 'http://localhost:3000/api/traces',
    apiKey: process.env.REACT_APP_GRAFANA_API_KEY || '',
    appKey: process.env.REACT_APP_GRAFANA_APP_KEY || 'my-app',
  },
  openTelemetry: {
    endpoint: process.env.REACT_APP_OTEL_ENDPOINT || 'http://localhost:4318',
    headers: {
      'Authorization': `Bearer ${process.env.REACT_APP_OTEL_TOKEN || ''}`,
    },
  },
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <TelemetryProvider config={telemetryConfig}>
      <App />
    </TelemetryProvider>
  </React.StrictMode>
);
```

2. **Use hooks in your components:**

```typescript
import React from 'react';
import { useMetric, useTrace, useError } from '@jeffmarans/hydropulse';

function MyComponent() {
  const { recordMetric } = useMetric();
  const { startTrace, endTrace } = useTrace();
  const { logError } = useError();

  const handleClick = async () => {
    const traceId = startTrace('button_click', { component: 'MyComponent' });
    
    try {
      recordMetric('button_clicks', 1, 'count');
      // Your logic here
      endTrace(traceId, { success: true });
    } catch (error) {
      logError(error as Error, { component: 'MyComponent' });
      endTrace(traceId, { success: false });
    }
  };

  return <button onClick={handleClick}>Click me</button>;
}
```

## Environment Variables

Create environment files for different stages:

### Development (.env.development)
```bash
# Grafana Configuration
GRAFANA_URL=http://localhost:3000/api/traces
GRAFANA_API_KEY=your-dev-api-key
GRAFANA_APP_KEY=my-app-dev

# OpenTelemetry Configuration
OTEL_ENDPOINT=http://localhost:4318
OTEL_TOKEN=your-dev-token

# General Configuration
NODE_ENV=development
```

### Staging (.env.staging)
```bash
# Grafana Configuration
GRAFANA_URL=https://your-grafana-staging.com/api/traces
GRAFANA_API_KEY=your-staging-api-key
GRAFANA_APP_KEY=my-app-staging

# OpenTelemetry Configuration
OTEL_ENDPOINT=https://your-otel-staging.com
OTEL_TOKEN=your-staging-token

# General Configuration
NODE_ENV=staging
```

### Production (.env.production)
```bash
# Grafana Configuration
GRAFANA_URL=https://your-grafana-prod.com/api/traces
GRAFANA_API_KEY=your-prod-api-key
GRAFANA_APP_KEY=my-app-prod

# OpenTelemetry Configuration
OTEL_ENDPOINT=https://your-otel-prod.com
OTEL_TOKEN=your-prod-token

# General Configuration
NODE_ENV=production
```

## Verification

### Test Installation
```bash
# Run the library's built-in tests
npm test

# Check if the library can be imported
node -e "console.log(require('@jeffmarans/hydropulse'))"
```

### Test NestJS Integration
```bash
# Navigate to your NestJS project
cd your-nestjs-project

# Start the application
npm run start:dev

# Check logs for telemetry initialization messages
```

### Test React Integration
```bash
# Navigate to your React project
cd your-react-project

# Start the development server
npm start

# Open browser console to see telemetry initialization logs
```

## Troubleshooting

### Common Issues

#### 1. Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 2. TypeScript Compilation Errors
```bash
# Ensure TypeScript is installed
npm install -D typescript

# Check tsconfig.json includes the necessary compiler options:
# - "experimentalDecorators": true
# - "emitDecoratorMetadata": true
```

#### 3. Grafana Connection Issues
- Verify your Grafana URL and API key
- Check network connectivity to Grafana instance
- Ensure CORS is configured if running from browser

#### 4. OpenTelemetry Fallback Not Working
- Check OpenTelemetry endpoint configuration
- Verify authentication headers
- Check console for fallback activation logs

#### 5. No Telemetry Data Appearing
- Enable debug mode: `debug: true` in configuration
- Check browser/server console for error messages
- Verify sampling rate is not too low
- Check if circuit breaker is open due to previous failures

### Debug Mode

Enable debug mode to see detailed logs:

```typescript
const config = {
  // ... other config
  debug: true, // Enable verbose logging
};
```

### Health Check

The library provides health check endpoints:

```typescript
// Check if telemetry is working
const isHealthy = telemetryCore.isHealthy();
console.log('Telemetry health:', isHealthy);
```

## Next Steps

- [Configuration Guide](./CONFIGURATION.md) - Detailed configuration options
- [API Reference](./API.md) - Complete API documentation
- [Examples](../examples/) - Working examples for NestJS and React

## Support

If you encounter issues not covered in this guide:

1. Check the [GitHub Issues](https://github.com/your-org/telemetry-lib/issues)
2. Review the [API Documentation](./API.md)
3. Look at the [example applications](../examples/)
4. Create a new issue with detailed reproduction steps
