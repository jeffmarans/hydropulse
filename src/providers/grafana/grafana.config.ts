export interface GrafanaConfig {
  url: string;
  apiKey: string;
  appKey: string;
  environment: string;
  serviceName: string;
  serviceVersion: string;
  debug?: boolean;
}

export const defaultGrafanaConfig: Partial<GrafanaConfig> = {
  debug: false,
};

export function validateGrafanaConfig(config: Partial<GrafanaConfig>): GrafanaConfig {
  if (!config.url) {
    throw new Error('Grafana URL is required');
  }
  
  if (!config.apiKey) {
    throw new Error('Grafana API key is required');
  }
  
  if (!config.appKey) {
    throw new Error('Grafana app key is required');
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
    ...defaultGrafanaConfig,
    ...config,
  } as GrafanaConfig;
}
