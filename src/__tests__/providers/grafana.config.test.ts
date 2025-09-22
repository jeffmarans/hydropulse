import { validateGrafanaConfig, GrafanaConfig, defaultGrafanaConfig } from '../../providers/grafana/grafana.config';

describe('GrafanaConfig', () => {
  it('should validate complete Grafana config', () => {
    const config: Partial<GrafanaConfig> = {
      url: 'http://localhost:3000',
      apiKey: 'test-key',
      appKey: 'test-app',
      environment: 'development',
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
    };

    const validatedConfig = validateGrafanaConfig(config);

    expect(validatedConfig).toBeDefined();
    expect(validatedConfig.url).toBe('http://localhost:3000');
    expect(validatedConfig.apiKey).toBe('test-key');
    expect(validatedConfig.appKey).toBe('test-app');
    expect(validatedConfig.debug).toBe(false);
  });

  it('should throw error for missing URL', () => {
    const config: Partial<GrafanaConfig> = {
      apiKey: 'test-key',
      appKey: 'test-app',
      environment: 'development',
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
    };

    expect(() => validateGrafanaConfig(config)).toThrow('Grafana URL is required');
  });

  it('should throw error for missing API key', () => {
    const config: Partial<GrafanaConfig> = {
      url: 'http://localhost:3000',
      appKey: 'test-app',
      environment: 'development',
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
    };

    expect(() => validateGrafanaConfig(config)).toThrow('Grafana API key is required');
  });

  it('should use default config values', () => {
    expect(defaultGrafanaConfig.debug).toBe(false);
  });
});
