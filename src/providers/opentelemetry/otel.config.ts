export interface OpenTelemetryConfig {
  endpoint: string;
  headers?: Record<string, string>;
  environment: string;
  serviceName: string;
  serviceVersion: string;
  debug?: boolean;
}

export const defaultOpenTelemetryConfig: Partial<OpenTelemetryConfig> = {
  debug: false,
  headers: {},
};

export function validateOpenTelemetryConfig(config: Partial<OpenTelemetryConfig>): OpenTelemetryConfig {
  if (!config.endpoint) {
    throw new Error('OpenTelemetry endpoint is required');
  }
  
  if (!config.serviceName) {
    throw new Error('Service name is required');
  }
  
  if (!config.serviceVersion) {
    throw new Error('Service version is required');
  }
  
  if (!config.environment) {
    throw new Error('Environment is required');
  }

  return {
    ...defaultOpenTelemetryConfig,
    ...config,
  } as OpenTelemetryConfig;
}
