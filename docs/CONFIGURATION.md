# Configuration Guide

## Overview

The telemetry library supports comprehensive configuration for different environments, providers, and use cases. This guide covers all available configuration options and best practices.

## Configuration Structure

```typescript
interface TelemetryConfig {
  provider: 'grafana' | 'opentelemetry' | 'auto';
  environment: 'development' | 'staging' | 'production';
  serviceName: string;
  serviceVersion: string;
  debug?: boolean;
  grafana?: GrafanaConfig;
  openTelemetry?: OpenTelemetryConfig;
  sampling?: SamplingConfig;
  batching?: BatchingConfig;
  circuitBreaker?: CircuitBreakerConfig;
  retry?: RetryConfig;
  sanitization?: SanitizationConfig;
}
```

## Core Configuration

### Provider Selection

```typescript
{
  provider: 'auto', // Recommended: tries Alloy first (if configured), then Grafana, falls back to OpenTelemetry
  // provider: 'alloy', // Use Grafana Alloy (OTEL Collector)
  // provider: 'grafana', // Use only Grafana
  // provider: 'opentelemetry', // Use only OpenTelemetry
}
```

**Recommendations:**
- Use `'auto'` for production environments to ensure reliability
- Use `'alloy'` for complete observability stack with Prometheus, Loki, Tempo, and Pyroscope
- Use specific providers only for testing or when you have guaranteed availability

### Grafana Alloy Provider (Recommended)

Grafana Alloy is the modern OTEL collector that routes telemetry data to the complete Grafana observability stack:

```typescript
{
  provider: 'alloy',
  alloy: {
    endpoint: 'http://localhost:4318',
    headers: {
      'Authorization': 'Bearer your-token',
    },
  }
}
```

**Environment Variables:**
```bash
HYDROPULSE_PROVIDER=alloy
HYDROPULSE_ALLOY_ENDPOINT=http://localhost:4318
HYDROPULSE_ALLOY_TOKEN=your-token
```

**Benefits:**
- Single endpoint for all telemetry data (metrics, logs, traces)
- Automatic routing to Prometheus, Loki, Tempo, and Pyroscope
- Built-in batching and retry logic
- Reduced complexity in application configuration

### Service Information

```typescript
{
  serviceName: 'my-application', // Required: unique service identifier
  serviceVersion: '1.2.3', // Required: semantic version
  environment: 'production', // Required: deployment environment
}
```

### Debug Mode

```typescript
{
  debug: true, // Enable verbose logging (disable in production)
}
```

## Grafana Configuration

### Basic Setup

```typescript
{
  grafana: {
    url: 'https://your-grafana-instance.com/api/traces',
    apiKey: 'your-api-key',
    appKey: 'your-application-key',
  }
}
```

### Advanced Grafana Configuration

```typescript
{
  grafana: {
    url: 'https://your-grafana-instance.com/api/traces',
    apiKey: 'your-api-key',
    appKey: 'your-application-key',
    
    // Optional: Custom headers
    headers: {
      'X-Custom-Header': 'value',
    },
    
    // Optional: Timeout configuration
    timeout: 30000, // 30 seconds
    
    // Optional: Retry configuration
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  }
}
```

### Grafana Cloud Setup

```typescript
{
  grafana: {
    url: 'https://traces-prod-us-central1.grafana.net/tempo/api/traces',
    apiKey: 'your-grafana-cloud-api-key',
    appKey: 'your-app-name',
    
    // Grafana Cloud specific headers
    headers: {
      'X-Scope-OrgID': 'your-org-id',
    },
  }
}
```

## OpenTelemetry Configuration

### Basic Setup

```typescript
{
  openTelemetry: {
    endpoint: 'http://localhost:4318', // OTLP HTTP endpoint
    headers: {
      'Authorization': 'Bearer your-token',
    },
  }
}
```

### Advanced OpenTelemetry Configuration

```typescript
{
  openTelemetry: {
    endpoint: 'https://your-otel-collector.com',
    
    // Authentication headers
    headers: {
      'Authorization': 'Bearer your-token',
      'X-API-Key': 'your-api-key',
    },
    
    // Resource attributes
    resourceAttributes: {
      'service.namespace': 'production',
      'service.instance.id': 'instance-1',
      'deployment.environment': 'production',
    },
    
    // Exporter configuration
    exporterConfig: {
      timeout: 30000,
      compression: 'gzip',
    },
  }
}
```

### Popular OTLP Endpoints

#### Jaeger
```typescript
{
  openTelemetry: {
    endpoint: 'http://localhost:14268/api/traces',
  }
}
```

#### Zipkin
```typescript
{
  openTelemetry: {
    endpoint: 'http://localhost:9411/api/v2/spans',
  }
}
```

#### Honeycomb
```typescript
{
  openTelemetry: {
    endpoint: 'https://api.honeycomb.io/v1/traces',
    headers: {
      'X-Honeycomb-Team': 'your-api-key',
      'X-Honeycomb-Dataset': 'your-dataset',
    },
  }
}
```

#### New Relic
```typescript
{
  openTelemetry: {
    endpoint: 'https://otlp.nr-data.net:4318/v1/traces',
    headers: {
      'Api-Key': 'your-new-relic-license-key',
    },
  }
}
```

## Sampling Configuration

### Basic Sampling

```typescript
{
  sampling: {
    rate: 0.1, // Sample 10% of traces
  }
}
```

### Advanced Sampling Rules

```typescript
{
  sampling: {
    rate: 0.1, // Default sampling rate
    
    rules: [
      {
        service: 'my-service',
        operation: 'GET /health',
        rate: 0.01, // Lower sampling for health checks
      },
      {
        service: 'my-service',
        operation: 'POST /api/critical',
        rate: 1.0, // Sample all critical operations
      },
      {
        service: 'my-service',
        operation: '*',
        attributes: {
          'http.status_code': '5xx',
        },
        rate: 1.0, // Sample all errors
      },
    ],
  }
}
```

### Environment-Based Sampling

```typescript
const getSamplingRate = () => {
  switch (process.env.NODE_ENV) {
    case 'development': return 1.0; // Sample everything in dev
    case 'staging': return 0.5; // Sample 50% in staging
    case 'production': return 0.1; // Sample 10% in production
    default: return 0.1;
  }
};

{
  sampling: {
    rate: getSamplingRate(),
  }
}
```

## Batching Configuration

### Basic Batching

```typescript
{
  batching: {
    maxQueueSize: 100, // Maximum events in queue
    scheduledDelayMillis: 5000, // Send batch every 5 seconds
  }
}
```

### Advanced Batching

```typescript
{
  batching: {
    maxQueueSize: 500,
    scheduledDelayMillis: 2000,
    
    // Send batch when it reaches this size
    maxBatchSize: 50,
    
    // Maximum time to wait before sending incomplete batch
    maxWaitTime: 10000,
    
    // Compression for large batches
    compression: true,
  }
}
```

## Circuit Breaker Configuration

```typescript
{
  circuitBreaker: {
    failureThreshold: 5, // Open circuit after 5 failures
    recoveryTimeout: 60000, // Try to recover after 1 minute
    monitoringPeriod: 10000, // Monitor for 10 seconds
  }
}
```

## Retry Configuration

```typescript
{
  retry: {
    maxAttempts: 3,
    initialDelay: 1000, // Start with 1 second delay
    maxDelay: 30000, // Maximum 30 seconds delay
    backoffMultiplier: 2, // Exponential backoff
    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'],
  }
}
```

## Data Sanitization

```typescript
{
  sanitization: {
    // Remove sensitive data from logs and traces
    sensitiveFields: [
      'password',
      'token',
      'apiKey',
      'creditCard',
      'ssn',
      'email', // Optional: remove emails
    ],
    
    // Custom sanitization function
    customSanitizer: (data: any) => {
      // Your custom sanitization logic
      return sanitizedData;
    },
    
    // Enable/disable different sanitization features
    removePII: true,
    maskCreditCards: true,
    hashEmails: true,
  }
}
```

## Environment-Specific Configurations

### Development Configuration

```typescript
const developmentConfig: TelemetryConfig = {
  provider: 'auto',
  environment: 'development',
  serviceName: 'my-app',
  serviceVersion: '1.0.0',
  debug: true, // Enable debug logs
  
  grafana: {
    url: 'http://localhost:3000/api/traces',
    apiKey: 'dev-api-key',
    appKey: 'my-app-dev',
  },
  
  openTelemetry: {
    endpoint: 'http://localhost:4318',
  },
  
  sampling: {
    rate: 1.0, // Sample everything in development
  },
  
  batching: {
    maxQueueSize: 10, // Smaller batches for faster feedback
    scheduledDelayMillis: 1000,
  },
};
```

### Staging Configuration

```typescript
const stagingConfig: TelemetryConfig = {
  provider: 'auto',
  environment: 'staging',
  serviceName: 'my-app',
  serviceVersion: '1.0.0',
  debug: false,
  
  grafana: {
    url: 'https://staging-grafana.company.com/api/traces',
    apiKey: process.env.GRAFANA_STAGING_API_KEY!,
    appKey: 'my-app-staging',
  },
  
  openTelemetry: {
    endpoint: 'https://staging-otel.company.com',
    headers: {
      'Authorization': `Bearer ${process.env.OTEL_STAGING_TOKEN}`,
    },
  },
  
  sampling: {
    rate: 0.5, // Sample 50% in staging
  },
  
  batching: {
    maxQueueSize: 100,
    scheduledDelayMillis: 3000,
  },
  
  circuitBreaker: {
    failureThreshold: 3,
    recoveryTimeout: 30000,
  },
};
```

### Production Configuration

```typescript
const productionConfig: TelemetryConfig = {
  provider: 'auto',
  environment: 'production',
  serviceName: 'my-app',
  serviceVersion: process.env.APP_VERSION || '1.0.0',
  debug: false,
  
  grafana: {
    url: 'https://grafana.company.com/api/traces',
    apiKey: process.env.GRAFANA_API_KEY!,
    appKey: 'my-app-prod',
    timeout: 30000,
    maxRetries: 3,
  },
  
  openTelemetry: {
    endpoint: 'https://otel.company.com',
    headers: {
      'Authorization': `Bearer ${process.env.OTEL_TOKEN}`,
    },
    resourceAttributes: {
      'service.namespace': 'production',
      'deployment.environment': 'production',
    },
  },
  
  sampling: {
    rate: 0.1, // Sample 10% in production
    rules: [
      {
        service: 'my-app',
        operation: 'GET /health',
        rate: 0.01, // Very low sampling for health checks
      },
      {
        service: 'my-app',
        operation: '*',
        attributes: {
          'http.status_code': '5xx',
        },
        rate: 1.0, // Always sample errors
      },
    ],
  },
  
  batching: {
    maxQueueSize: 500,
    scheduledDelayMillis: 5000,
    compression: true,
  },
  
  circuitBreaker: {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    monitoringPeriod: 10000,
  },
  
  retry: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
  
  sanitization: {
    removePII: true,
    sensitiveFields: ['password', 'token', 'apiKey', 'creditCard'],
  },
};
```

## Configuration Loading

### Environment-Based Loading

```typescript
import { TelemetryConfig } from 'hydropulse';

const loadConfig = (): TelemetryConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  const baseConfig = {
    serviceName: process.env.SERVICE_NAME || 'my-app',
    serviceVersion: process.env.SERVICE_VERSION || '1.0.0',
    environment: env as 'development' | 'staging' | 'production',
  };
  
  switch (env) {
    case 'production':
      return { ...baseConfig, ...productionConfig };
    case 'staging':
      return { ...baseConfig, ...stagingConfig };
    default:
      return { ...baseConfig, ...developmentConfig };
  }
};

export const telemetryConfig = loadConfig();
```

### Configuration Validation

```typescript
import { validateTelemetryConfig } from 'hydropulse';

const config = loadConfig();

try {
  const validatedConfig = validateTelemetryConfig(config);
  // Use validatedConfig
} catch (error) {
  console.error('Invalid telemetry configuration:', error);
  process.exit(1);
}
```

## Performance Tuning

### High-Throughput Applications

```typescript
{
  batching: {
    maxQueueSize: 1000, // Larger queue
    scheduledDelayMillis: 1000, // More frequent sends
    maxBatchSize: 100, // Larger batches
    compression: true, // Enable compression
  },
  
  sampling: {
    rate: 0.01, // Lower sampling rate
  },
  
  circuitBreaker: {
    failureThreshold: 10, // Higher threshold
    recoveryTimeout: 30000, // Faster recovery
  },
}
```

### Low-Latency Applications

```typescript
{
  batching: {
    maxQueueSize: 50, // Smaller queue
    scheduledDelayMillis: 500, // Very frequent sends
    maxBatchSize: 10, // Smaller batches
  },
  
  retry: {
    maxAttempts: 1, // Minimal retries
    initialDelay: 100,
  },
}
```

### Resource-Constrained Environments

```typescript
{
  sampling: {
    rate: 0.001, // Very low sampling
  },
  
  batching: {
    maxQueueSize: 20, // Small queue
    scheduledDelayMillis: 10000, // Less frequent sends
  },
  
  sanitization: {
    removePII: false, // Disable expensive sanitization
  },
}
```

## Best Practices

1. **Use Environment Variables**: Never hardcode sensitive information
2. **Enable Circuit Breaker**: Prevent cascading failures
3. **Configure Appropriate Sampling**: Balance observability with performance
4. **Use Batching**: Reduce network overhead
5. **Enable Sanitization**: Protect sensitive data
6. **Monitor Configuration**: Use debug mode during development
7. **Test Fallback**: Ensure OpenTelemetry fallback works
8. **Version Your Config**: Track configuration changes

## Troubleshooting Configuration

### Common Issues

1. **High Memory Usage**: Reduce `maxQueueSize` or increase `scheduledDelayMillis`
2. **Missing Data**: Check sampling rate and circuit breaker status
3. **High Network Traffic**: Increase batching delays or enable compression
4. **Authentication Errors**: Verify API keys and endpoints
5. **Fallback Not Working**: Check OpenTelemetry configuration

### Debug Configuration

```typescript
{
  debug: true, // Enable debug logs
  
  // Add custom debug handler
  onDebug: (message: string, data?: any) => {
    console.log(`[TELEMETRY DEBUG] ${message}`, data);
  },
  
  // Add error handler
  onError: (error: Error, context?: any) => {
    console.error(`[TELEMETRY ERROR] ${error.message}`, context);
  },
}
```

## Next Steps

- [API Reference](./API.md) - Complete API documentation
- [Installation Guide](./INSTALLATION.md) - Setup instructions
- [Examples](../examples/) - Working examples
