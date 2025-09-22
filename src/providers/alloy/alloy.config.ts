export interface AlloyConfig {
  endpoint: string;
  headers?: Record<string, string>;
  serviceName: string;
  serviceVersion: string;
  environment: string;
  debug?: boolean;
  timeout?: number;
  compression?: 'gzip' | 'none';
}

export function validateAlloyConfig(config: Partial<AlloyConfig>): AlloyConfig {
  if (!config.endpoint) {
    throw new Error('Alloy endpoint is required');
  }

  if (!config.serviceName) {
    throw new Error('Service name is required for Alloy configuration');
  }

  if (!config.serviceVersion) {
    throw new Error('Service version is required for Alloy configuration');
  }

  if (!config.environment) {
    throw new Error('Environment is required for Alloy configuration');
  }

  const validatedConfig: AlloyConfig = {
    endpoint: config.endpoint,
    serviceName: config.serviceName,
    serviceVersion: config.serviceVersion,
    environment: config.environment,
    headers: config.headers || {},
    debug: config.debug || false,
    timeout: config.timeout || 30000,
    compression: config.compression || 'gzip',
  };

  try {
    new URL(validatedConfig.endpoint);
  } catch (error) {
    throw new Error(`Invalid Alloy endpoint URL: ${config.endpoint}`);
  }

  return validatedConfig;
}
