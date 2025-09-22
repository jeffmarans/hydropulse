# API Reference

## Overview

The telemetry library provides a comprehensive API for collecting metrics, traces, and logs across NestJS and React applications. This document covers all available classes, methods, and interfaces.

## Core Classes

### TelemetryCore

The main orchestrator class that manages providers, fallback, and circuit breaker functionality.

```typescript
class TelemetryCore {
  constructor(config: TelemetryConfig)
  
  async initialize(): Promise<void>
  async shutdown(): Promise<void>
  isHealthy(): boolean
  
  readonly metrics: MetricsService
  readonly traces: TracesService
  readonly logs: LogsService
}
```

#### Methods

##### `constructor(config: TelemetryConfig)`
Creates a new TelemetryCore instance with the provided configuration.

**Parameters:**
- `config`: TelemetryConfig - Configuration object

**Example:**
```typescript
const telemetryCore = new TelemetryCore({
  provider: 'auto',
  environment: 'production',
  serviceName: 'my-app',
  serviceVersion: '1.0.0',
  grafana: {
    url: 'https://grafana.example.com/api/traces',
    apiKey: 'your-api-key',
    appKey: 'my-app',
  },
});
```

##### `async initialize(): Promise<void>`
Initializes the telemetry system and establishes connections to providers.

**Throws:**
- `Error` - If initialization fails

**Example:**
```typescript
try {
  await telemetryCore.initialize();
  console.log('Telemetry initialized successfully');
} catch (error) {
  console.error('Failed to initialize telemetry:', error);
}
```

##### `async shutdown(): Promise<void>`
Gracefully shuts down the telemetry system and flushes pending data.

**Example:**
```typescript
process.on('SIGTERM', async () => {
  await telemetryCore.shutdown();
  process.exit(0);
});
```

##### `isHealthy(): boolean`
Returns the current health status of the telemetry system.

**Returns:**
- `boolean` - True if healthy, false otherwise

### MetricsService

Handles metric collection and recording.

```typescript
class MetricsService {
  async recordMetric(name: string, value: number, unit: string, attributes?: Record<string, any>): Promise<void>
  async recordWebVitals(metric: string, value: number, attributes?: Record<string, any>): Promise<void>
  async recordUserInteraction(type: string, element: string, attributes?: Record<string, any>): Promise<void>
  async recordBusinessMetric(name: string, value: number, attributes?: Record<string, any>): Promise<void>
}
```

#### Methods

##### `async recordMetric(name, value, unit, attributes?): Promise<void>`
Records a generic metric.

**Parameters:**
- `name`: string - Metric name
- `value`: number - Metric value
- `unit`: string - Unit of measurement ('count', 'milliseconds', 'bytes', etc.)
- `attributes?`: Record<string, any> - Optional metadata

**Example:**
```typescript
await metricsService.recordMetric('api_requests', 1, 'count', {
  endpoint: '/api/users',
  method: 'GET',
  status_code: 200,
});
```

##### `async recordWebVitals(metric, value, attributes?): Promise<void>`
Records web performance metrics.

**Parameters:**
- `metric`: string - Web vital metric name ('FCP', 'LCP', 'CLS', 'TTFB')
- `value`: number - Metric value
- `attributes?`: Record<string, any> - Optional metadata

**Example:**
```typescript
await metricsService.recordWebVitals('FCP', 1200, {
  page: '/dashboard',
  user_agent: navigator.userAgent,
});
```

##### `async recordUserInteraction(type, element, attributes?): Promise<void>`
Records user interaction events.

**Parameters:**
- `type`: string - Interaction type ('click', 'submit', 'focus', etc.)
- `element`: string - Target element
- `attributes?`: Record<string, any> - Optional metadata

**Example:**
```typescript
await metricsService.recordUserInteraction('click', 'button', {
  button_id: 'submit-form',
  page: '/contact',
});
```

### TracesService

Manages distributed tracing functionality.

```typescript
class TracesService {
  async startTrace(operationName: string, attributes?: Record<string, any>): Promise<string>
  async endTrace(traceId: string, attributes?: Record<string, any>): Promise<void>
  async addTraceEvent(traceId: string, eventName: string, attributes?: Record<string, any>): Promise<void>
}
```

#### Methods

##### `async startTrace(operationName, attributes?): Promise<string>`
Starts a new trace span.

**Parameters:**
- `operationName`: string - Name of the operation being traced
- `attributes?`: Record<string, any> - Optional span attributes

**Returns:**
- `string` - Unique trace ID

**Example:**
```typescript
const traceId = await tracesService.startTrace('user_registration', {
  user_type: 'premium',
  source: 'web_app',
});
```

##### `async endTrace(traceId, attributes?): Promise<void>`
Ends a trace span.

**Parameters:**
- `traceId`: string - Trace ID returned from startTrace
- `attributes?`: Record<string, any> - Optional final attributes

**Example:**
```typescript
await tracesService.endTrace(traceId, {
  success: true,
  user_id: '12345',
  duration_ms: 1500,
});
```

### LogsService

Handles structured logging with different severity levels.

```typescript
class LogsService {
  async logInfo(message: string, attributes?: Record<string, any>): Promise<void>
  async logWarn(message: string, attributes?: Record<string, any>): Promise<void>
  async logError(message: string, error?: Error, attributes?: Record<string, any>): Promise<void>
  async logDebug(message: string, attributes?: Record<string, any>): Promise<void>
  async logUserAction(action: string, attributes?: Record<string, any>): Promise<void>
  async logComponentError(componentName: string, error: Error, attributes?: Record<string, any>): Promise<void>
}
```

#### Methods

##### `async logInfo(message, attributes?): Promise<void>`
Logs an informational message.

**Parameters:**
- `message`: string - Log message
- `attributes?`: Record<string, any> - Optional metadata

**Example:**
```typescript
await logsService.logInfo('User logged in successfully', {
  user_id: '12345',
  login_method: 'oauth',
});
```

##### `async logError(message, error?, attributes?): Promise<void>`
Logs an error message with optional Error object.

**Parameters:**
- `message`: string - Error message
- `error?`: Error - Optional Error object
- `attributes?`: Record<string, any> - Optional metadata

**Example:**
```typescript
try {
  // Some operation
} catch (error) {
  await logsService.logError('Failed to process payment', error, {
    user_id: '12345',
    payment_amount: 99.99,
  });
}
```

## NestJS Integration

### TelemetryModule

NestJS module for telemetry integration.

```typescript
@Module({})
export class TelemetryModule {
  static forRoot(config: TelemetryConfig): DynamicModule
  static forRootAsync(options: TelemetryAsyncOptions): DynamicModule
}
```

#### Methods

##### `static forRoot(config: TelemetryConfig): DynamicModule`
Synchronous module configuration.

**Example:**
```typescript
@Module({
  imports: [
    TelemetryModule.forRoot({
      provider: 'auto',
      environment: 'production',
      serviceName: 'my-nestjs-app',
      serviceVersion: '1.0.0',
      // ... other config
    }),
  ],
})
export class AppModule {}
```

##### `static forRootAsync(options: TelemetryAsyncOptions): DynamicModule`
Asynchronous module configuration with dependency injection.

**Example:**
```typescript
@Module({
  imports: [
    TelemetryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        provider: 'auto',
        environment: configService.get('NODE_ENV'),
        serviceName: configService.get('SERVICE_NAME'),
        // ... other config
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### Decorators

#### `@TrackMetric(metricName: string, attributes?: Record<string, any>)`
Decorator to automatically track method execution as a metric.

**Parameters:**
- `metricName`: string - Name of the metric
- `attributes?`: Record<string, any> - Optional static attributes

**Example:**
```typescript
@Controller('users')
export class UsersController {
  @Get()
  @TrackMetric('user_list_requests', { endpoint: 'GET /users' })
  async getUsers() {
    // Controller logic
  }
}
```

#### `@TrackTrace(operationName: string, attributes?: Record<string, any>)`
Decorator to automatically trace method execution.

**Parameters:**
- `operationName`: string - Name of the operation
- `attributes?`: Record<string, any> - Optional static attributes

**Example:**
```typescript
@Injectable()
export class UsersService {
  @TrackTrace('create_user')
  async createUser(userData: CreateUserDto) {
    // Service logic
  }
}
```

### TelemetryInterceptor

Interceptor for automatic request/response tracking.

```typescript
@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any>
}
```

**Usage:**
```typescript
@Controller('api')
@UseInterceptors(TelemetryInterceptor)
export class ApiController {
  // All methods will be automatically tracked
}
```

## React Integration

### TelemetryProvider

React context provider for telemetry integration.

```typescript
interface TelemetryProviderProps {
  config: TelemetryConfig
  children: ReactNode
  onError?: (error: Error) => void
  enableWebVitals?: boolean
  enableUserInteractionTracking?: boolean
}

export const TelemetryProvider: React.FC<TelemetryProviderProps>
```

**Example:**
```typescript
function App() {
  return (
    <TelemetryProvider
      config={telemetryConfig}
      enableWebVitals={true}
      enableUserInteractionTracking={true}
      onError={(error) => console.error('Telemetry error:', error)}
    >
      <MyApp />
    </TelemetryProvider>
  );
}
```

### Hooks

#### `useTelemetryContext()`
Hook to access telemetry context.

**Returns:**
```typescript
interface TelemetryContextValue {
  telemetryCore: TelemetryCore | null
  isInitialized: boolean
  error: string | null
}
```

**Example:**
```typescript
function MyComponent() {
  const { telemetryCore, isInitialized, error } = useTelemetryContext();
  
  if (!isInitialized) {
    return <div>Loading telemetry...</div>;
  }
  
  // Use telemetryCore
}
```

#### `useMetric()`
Hook for metric recording.

**Returns:**
```typescript
interface UseMetricReturn {
  recordMetric: (name: string, value: number, unit: string, attributes?: Record<string, any>) => Promise<void>
  recordWebVitals: (metric: string, value: number, attributes?: Record<string, any>) => Promise<void>
  recordUserInteraction: (type: string, element: string, attributes?: Record<string, any>) => Promise<void>
}
```

**Example:**
```typescript
function MyComponent() {
  const { recordMetric } = useMetric();
  
  const handleClick = () => {
    recordMetric('button_clicks', 1, 'count', { button_id: 'my-button' });
  };
  
  return <button onClick={handleClick}>Click me</button>;
}
```

#### `useTrace()`
Hook for distributed tracing.

**Returns:**
```typescript
interface UseTraceReturn {
  startTrace: (operationName: string, attributes?: Record<string, any>) => Promise<string>
  endTrace: (traceId: string, attributes?: Record<string, any>) => Promise<void>
  addTraceEvent: (traceId: string, eventName: string, attributes?: Record<string, any>) => Promise<void>
}
```

**Example:**
```typescript
function MyComponent() {
  const { startTrace, endTrace } = useTrace();
  
  const handleAsyncOperation = async () => {
    const traceId = await startTrace('async_operation');
    
    try {
      // Async operation
      await endTrace(traceId, { success: true });
    } catch (error) {
      await endTrace(traceId, { success: false, error: error.message });
    }
  };
}
```

#### `useError()`
Hook for error logging.

**Returns:**
```typescript
interface UseErrorReturn {
  logError: (error: Error, attributes?: Record<string, any>) => Promise<void>
  logComponentError: (componentName: string, error: Error, attributes?: Record<string, any>) => Promise<void>
}
```

**Example:**
```typescript
function MyComponent() {
  const { logError } = useError();
  
  const handleError = (error: Error) => {
    logError(error, { component: 'MyComponent', action: 'user_action' });
  };
}
```

### Higher-Order Components

#### `withTelemetry(Component, options?)`
HOC for automatic component telemetry.

**Parameters:**
- `Component`: React component to wrap
- `options?`: WithTelemetryOptions

```typescript
interface WithTelemetryOptions {
  componentName?: string
  trackProps?: boolean
  trackState?: boolean
  trackErrors?: boolean
  trackPerformance?: boolean
}
```

**Example:**
```typescript
const EnhancedComponent = withTelemetry(MyComponent, {
  componentName: 'MyComponent',
  trackProps: true,
  trackErrors: true,
  trackPerformance: true,
});
```

### Telemetry Components

#### `TelemetryButton`
Button component with automatic interaction tracking.

```typescript
interface TelemetryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  trackingData?: Record<string, any>
}

export const TelemetryButton: React.FC<TelemetryButtonProps>
```

**Example:**
```typescript
<TelemetryButton
  onClick={handleClick}
  trackingData={{ button_type: 'primary', page: 'dashboard' }}
>
  Click me
</TelemetryButton>
```

#### `TelemetryForm`
Form component with automatic submission tracking.

```typescript
interface TelemetryFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  trackingData?: Record<string, any>
}

export const TelemetryForm: React.FC<TelemetryFormProps>
```

**Example:**
```typescript
<TelemetryForm
  onSubmit={handleSubmit}
  trackingData={{ form_type: 'contact', page: 'contact' }}
>
  {/* Form fields */}
</TelemetryForm>
```

## Configuration Interfaces

### TelemetryConfig

Main configuration interface.

```typescript
interface TelemetryConfig {
  provider: 'grafana' | 'opentelemetry' | 'auto'
  environment: 'development' | 'staging' | 'production'
  serviceName: string
  serviceVersion: string
  debug?: boolean
  grafana?: GrafanaConfig
  openTelemetry?: OpenTelemetryConfig
  sampling?: SamplingConfig
  batching?: BatchingConfig
  circuitBreaker?: CircuitBreakerConfig
  retry?: RetryConfig
  sanitization?: SanitizationConfig
}
```

### GrafanaConfig

Grafana-specific configuration.

```typescript
interface GrafanaConfig {
  url: string
  apiKey: string
  appKey: string
  headers?: Record<string, string>
  timeout?: number
  maxRetries?: number
  retryDelay?: number
}
```

### OpenTelemetryConfig

OpenTelemetry-specific configuration.

```typescript
interface OpenTelemetryConfig {
  endpoint: string
  headers?: Record<string, string>
  resourceAttributes?: Record<string, string>
  exporterConfig?: {
    timeout?: number
    compression?: 'gzip' | 'none'
  }
}
```

### SamplingConfig

Sampling configuration for traces and metrics.

```typescript
interface SamplingConfig {
  rate: number // 0.0 to 1.0
  rules?: SamplingRule[]
}

interface SamplingRule {
  service: string
  operation: string
  attributes?: Record<string, any>
  rate: number
}
```

### BatchingConfig

Batching configuration for performance optimization.

```typescript
interface BatchingConfig {
  maxQueueSize: number
  scheduledDelayMillis: number
  maxBatchSize?: number
  maxWaitTime?: number
  compression?: boolean
}
```

### CircuitBreakerConfig

Circuit breaker configuration for fault tolerance.

```typescript
interface CircuitBreakerConfig {
  failureThreshold: number
  recoveryTimeout: number
  monitoringPeriod?: number
}
```

## Provider Interfaces

### TelemetryProvider

Base interface for telemetry providers.

```typescript
interface TelemetryProvider {
  initialize(config: TelemetryConfig): Promise<void>
  recordMetric(metric: MetricData): Promise<void>
  startTrace(trace: TraceData): Promise<string>
  endTrace(spanId: string, attributes?: Record<string, any>): Promise<void>
  recordLog(log: LogData): Promise<void>
  flush(): Promise<void>
  shutdown(): Promise<void>
  isHealthy(): boolean
}
```

### MetricData

Metric data structure.

```typescript
interface MetricData {
  name: string
  value: number
  unit: string
  attributes?: Record<string, any>
  timestamp?: number
}
```

### TraceData

Trace data structure.

```typescript
interface TraceData {
  operationName: string
  attributes?: Record<string, any>
  startTime?: number
  parentSpanId?: string
}
```

### LogData

Log data structure.

```typescript
interface LogData {
  level: 'debug' | 'info' | 'warn' | 'error'
  message: string
  attributes?: Record<string, any>
  timestamp?: number
  traceId?: string
  spanId?: string
}
```

## Error Handling

### TelemetryError

Base error class for telemetry-related errors.

```typescript
class TelemetryError extends Error {
  constructor(message: string, public code?: string, public context?: any)
}
```

### Common Error Codes

- `INITIALIZATION_FAILED` - Failed to initialize telemetry system
- `PROVIDER_UNAVAILABLE` - Primary provider is unavailable
- `FALLBACK_FAILED` - Fallback provider also failed
- `CIRCUIT_BREAKER_OPEN` - Circuit breaker is open
- `CONFIGURATION_INVALID` - Invalid configuration provided
- `NETWORK_ERROR` - Network connectivity issues
- `AUTHENTICATION_FAILED` - Authentication with provider failed

## Utility Functions

### `validateTelemetryConfig(config: TelemetryConfig): TelemetryConfig`
Validates and normalizes telemetry configuration.

**Parameters:**
- `config`: TelemetryConfig - Configuration to validate

**Returns:**
- `TelemetryConfig` - Validated configuration

**Throws:**
- `TelemetryError` - If configuration is invalid

### `createTelemetryCore(config: TelemetryConfig): TelemetryCore`
Factory function to create TelemetryCore instance.

**Parameters:**
- `config`: TelemetryConfig - Configuration object

**Returns:**
- `TelemetryCore` - Configured telemetry core instance

## Best Practices

### Metric Naming
- Use snake_case for metric names
- Include units in metric names when appropriate
- Use consistent prefixes for related metrics

```typescript
// Good
await recordMetric('api_request_duration_ms', 150, 'milliseconds');
await recordMetric('api_request_count', 1, 'count');

// Avoid
await recordMetric('ApiRequestTime', 150, 'milliseconds');
```

### Trace Naming
- Use descriptive operation names
- Include service and operation type
- Keep names consistent across services

```typescript
// Good
const traceId = await startTrace('user_service.create_user');
const traceId = await startTrace('payment_service.process_payment');

// Avoid
const traceId = await startTrace('create');
```

### Attribute Guidelines
- Use consistent attribute names across metrics and traces
- Include relevant context without sensitive data
- Use structured data for complex attributes

```typescript
// Good
await recordMetric('user_action', 1, 'count', {
  action_type: 'button_click',
  page: 'dashboard',
  user_role: 'admin',
});

// Avoid
await recordMetric('user_action', 1, 'count', {
  user_password: 'secret123', // Never include sensitive data
});
```

### Error Handling
- Always handle telemetry errors gracefully
- Don't let telemetry failures affect application functionality
- Use appropriate log levels for telemetry issues

```typescript
try {
  await recordMetric('api_request', 1, 'count');
} catch (error) {
  // Log but don't throw - telemetry should not break the app
  console.warn('Failed to record telemetry metric:', error);
}
```

## Performance Considerations

### Batching
- Use batching for high-throughput applications
- Configure appropriate batch sizes and delays
- Monitor queue sizes to prevent memory issues

### Sampling
- Use appropriate sampling rates for different environments
- Implement smart sampling rules for critical operations
- Monitor sampling effectiveness

### Resource Usage
- Monitor memory usage with large queue sizes
- Use compression for large payloads
- Implement proper cleanup in shutdown handlers

## Migration Guide

### From Version 0.x to 1.x
- Update configuration structure
- Replace deprecated methods
- Update import paths

### From Other Libraries
- Map existing metric names to new format
- Update trace context propagation
- Migrate configuration files

## Troubleshooting

### Common Issues
1. **No data appearing**: Check sampling rates and provider health
2. **High memory usage**: Reduce batch sizes or increase flush frequency
3. **Authentication errors**: Verify API keys and endpoints
4. **Fallback not working**: Check OpenTelemetry configuration

### Debug Mode
Enable debug mode for detailed logging:

```typescript
const config = {
  debug: true,
  // ... other config
};
```

### Health Checks
Monitor telemetry system health:

```typescript
const isHealthy = telemetryCore.isHealthy();
if (!isHealthy) {
  console.warn('Telemetry system is unhealthy');
}
```

## Examples

See the [examples directory](../examples/) for complete working examples:
- [NestJS Example](../examples/nestjs-example/) - Full NestJS application with telemetry
- [React Example](../examples/react-example/) - Complete React dashboard with telemetry

## Support

For additional help:
- Check the [Installation Guide](./INSTALLATION.md)
- Review the [Configuration Guide](./CONFIGURATION.md)
- Look at the example applications
- Create an issue on GitHub
