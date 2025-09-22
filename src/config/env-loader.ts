import { TelemetryConfig } from '../interfaces/telemetry.interfaces';

export interface HydropulseEnvConfig {
  HYDROPULSE_PROVIDER?: 'auto' | 'grafana' | 'opentelemetry' | 'alloy';
  HYDROPULSE_SERVICE_NAME?: string;
  HYDROPULSE_SERVICE_VERSION?: string;
  HYDROPULSE_ENVIRONMENT?: 'development' | 'staging' | 'production';
  HYDROPULSE_GRAFANA_URL?: string;
  HYDROPULSE_GRAFANA_API_KEY?: string;
  HYDROPULSE_GRAFANA_APP_KEY?: string;
  HYDROPULSE_OTEL_ENDPOINT?: string;
  HYDROPULSE_OTEL_TOKEN?: string;
  HYDROPULSE_ALLOY_ENDPOINT?: string;
  HYDROPULSE_ALLOY_TOKEN?: string;
  HYDROPULSE_DEBUG?: string;
  HYDROPULSE_SAMPLING_RATE?: string;
  HYDROPULSE_BATCH_SIZE?: string;
  HYDROPULSE_BATCH_DELAY?: string;
  HYDROPULSE_CIRCUIT_BREAKER_THRESHOLD?: string;
  HYDROPULSE_CIRCUIT_BREAKER_TIMEOUT?: string;
  HYDROPULSE_RETRY_MAX_ATTEMPTS?: string;
  HYDROPULSE_RETRY_INITIAL_DELAY?: string;
  HYDROPULSE_SANITIZE_PII?: string;
}

export function loadHydropulseConfig(): TelemetryConfig {
  const env = process.env as HydropulseEnvConfig;
  
  const serviceName = env.HYDROPULSE_SERVICE_NAME || 'hydropulse-app';
  const serviceVersion = env.HYDROPULSE_SERVICE_VERSION || '1.0.0';
  
  if (!serviceName) {
    throw new Error('HYDROPULSE_SERVICE_NAME environment variable is required');
  }
  
  if (!serviceVersion) {
    throw new Error('HYDROPULSE_SERVICE_VERSION environment variable is required');
  }

  const config: TelemetryConfig = {
    provider: (env.HYDROPULSE_PROVIDER as any) || 'auto',
    environment: (env.HYDROPULSE_ENVIRONMENT as any) || 'development',
    serviceName,
    serviceVersion,
    debug: env.HYDROPULSE_DEBUG === 'true',
    sampling: {
      rate: parseFloat(env.HYDROPULSE_SAMPLING_RATE || '1.0'),
    },
    batching: {
      maxQueueSize: parseInt(env.HYDROPULSE_BATCH_SIZE || '1000'),
      scheduledDelayMillis: parseInt(env.HYDROPULSE_BATCH_DELAY || '5000'),
    },
    circuitBreaker: {
      failureThreshold: parseInt(env.HYDROPULSE_CIRCUIT_BREAKER_THRESHOLD || '5'),
      resetTimeoutMs: parseInt(env.HYDROPULSE_CIRCUIT_BREAKER_TIMEOUT || '60000'),
    },
    retry: {
      maxAttempts: parseInt(env.HYDROPULSE_RETRY_MAX_ATTEMPTS || '3'),
      backoffMultiplier: 2,
      initialDelayMs: parseInt(env.HYDROPULSE_RETRY_INITIAL_DELAY || '1000'),
    },
    sanitization: {
      enabled: env.HYDROPULSE_SANITIZE_PII !== 'false',
      piiPatterns: [
        /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        /\b\d{3}-\d{2}-\d{4}\b/g,
      ],
    },
  };

  if (env.HYDROPULSE_GRAFANA_URL) {
    config.grafana = {
      url: env.HYDROPULSE_GRAFANA_URL,
      apiKey: env.HYDROPULSE_GRAFANA_API_KEY || '',
      appKey: env.HYDROPULSE_GRAFANA_APP_KEY || serviceName,
    };
  }

  if (env.HYDROPULSE_OTEL_ENDPOINT) {
    config.openTelemetry = {
      endpoint: env.HYDROPULSE_OTEL_ENDPOINT,
      headers: env.HYDROPULSE_OTEL_TOKEN ? {
        'Authorization': `Bearer ${env.HYDROPULSE_OTEL_TOKEN}`,
      } : undefined,
    };
  }

  if (env.HYDROPULSE_ALLOY_ENDPOINT) {
    config.alloy = {
      endpoint: env.HYDROPULSE_ALLOY_ENDPOINT,
      headers: env.HYDROPULSE_ALLOY_TOKEN ? {
        'Authorization': `Bearer ${env.HYDROPULSE_ALLOY_TOKEN}`,
      } : undefined,
    };
  }

  return config;
}

export function validateHydropulseEnvironment(): void {
  const requiredVars = ['HYDROPULSE_SERVICE_NAME', 'HYDROPULSE_SERVICE_VERSION'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Hydropulse environment variables: ${missing.join(', ')}`);
  }
}
