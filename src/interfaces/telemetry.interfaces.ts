export interface TelemetryConfig {
  provider: 'grafana' | 'opentelemetry' | 'alloy' | 'auto';
  environment: 'development' | 'staging' | 'production';
  serviceName: string;
  serviceVersion: string;
  grafana?: {
    url: string;
    apiKey: string;
    appKey: string;
  };
  openTelemetry?: {
    endpoint: string;
    headers?: Record<string, string>;
  };
  alloy?: {
    endpoint: string;
    headers?: Record<string, string>;
  };
  sampling?: {
    rate: number;
    rules?: SamplingRule[];
  };
  batching?: {
    maxQueueSize: number;
    scheduledDelayMillis: number;
  };
  circuitBreaker?: {
    failureThreshold: number;
    resetTimeoutMs: number;
  };
  retry?: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialDelayMs: number;
  };
  debug?: boolean;
  sanitization?: {
    enabled: boolean;
    piiPatterns?: RegExp[];
  };
}

export interface SamplingRule {
  name: string;
  rate: number;
  conditions?: {
    service?: string;
    operation?: string;
    attributes?: Record<string, any>;
  };
}

export interface MetricData {
  name: string;
  value: number;
  unit?: string;
  attributes?: Record<string, any>;
  timestamp?: number;
}

export interface TraceData {
  operationName: string;
  spanId?: string;
  traceId?: string;
  parentSpanId?: string;
  startTime: number;
  endTime?: number;
  attributes?: Record<string, any>;
  status?: 'ok' | 'error' | 'timeout';
  error?: Error;
}

export interface LogData {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  attributes?: Record<string, any>;
  timestamp?: number;
  traceId?: string;
  spanId?: string;
}

export interface TelemetryProvider {
  initialize(config: TelemetryConfig): Promise<void>;
  recordMetric(metric: MetricData): Promise<void>;
  startTrace(trace: TraceData): Promise<string>;
  endTrace(spanId: string, attributes?: Record<string, any>): Promise<void>;
  recordLog(log: LogData): Promise<void>;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
  isHealthy(): boolean;
}

export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
}

export interface TelemetryEvent {
  type: 'metric' | 'trace' | 'log';
  data: MetricData | TraceData | LogData;
  timestamp: number;
  retryCount?: number;
}

export interface BatchProcessor {
  add(event: TelemetryEvent): void;
  flush(): Promise<void>;
  size(): number;
}
