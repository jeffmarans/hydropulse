import { GrafanaProvider } from '../../providers/grafana/grafana.provider';
import { TelemetryConfig } from '../../interfaces/telemetry.interfaces';

jest.mock('@grafana/faro-web-sdk', () => ({
  initializeFaro: jest.fn(),
  faro: {
    api: {
      pushMeasurement: jest.fn(),
      pushLog: jest.fn(),
    },
    tracing: {
      getTracer: jest.fn(() => ({
        startSpan: jest.fn(() => ({
          spanContext: () => ({ spanId: 'test-span-id', traceId: 'test-trace-id' }),
          end: jest.fn(),
          setAttributes: jest.fn(),
          setStatus: jest.fn(),
        })),
      })),
    },
  },
}));

describe('GrafanaProvider', () => {
  let grafanaProvider: GrafanaProvider;
  let mockConfig: TelemetryConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfig = {
      provider: 'grafana',
      environment: 'development',
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      debug: true,
      grafana: {
        url: 'http://localhost:3000/api/traces',
        apiKey: 'test-key',
        appKey: 'test-app',
      },
    };

    grafanaProvider = new GrafanaProvider();
  });

  describe('initialize', () => {
    it('should initialize successfully with valid config', async () => {
      await expect(grafanaProvider.initialize(mockConfig)).resolves.not.toThrow();
      expect(grafanaProvider.isHealthy()).toBe(true);
    });

    it('should throw error with invalid config', async () => {
      const invalidConfig = {
        ...mockConfig,
        grafana: undefined,
      };

      await expect(grafanaProvider.initialize(invalidConfig)).rejects.toThrow('Grafana configuration is required');
    });

    it('should handle initialization gracefully', async () => {
      await expect(grafanaProvider.initialize(mockConfig)).resolves.not.toThrow();
      expect(grafanaProvider.isHealthy()).toBe(true);
    });
  });

  describe('recordMetric', () => {
    beforeEach(async () => {
      await grafanaProvider.initialize(mockConfig);
    });

    it('should record metric successfully', async () => {
      const metric = {
        name: 'test_metric',
        value: 42,
        unit: 'count',
        timestamp: Date.now(),
      };

      await expect(grafanaProvider.recordMetric(metric)).resolves.not.toThrow();
    });

    it('should record metric with attributes', async () => {
      const metric = {
        name: 'user_action',
        value: 1,
        unit: 'count',
        attributes: { action: 'click', page: 'dashboard' },
        timestamp: Date.now(),
      };

      await expect(grafanaProvider.recordMetric(metric)).resolves.not.toThrow();
    });

    it('should handle metric recording gracefully', async () => {
      const metric = {
        name: 'test_metric',
        value: 42,
        unit: 'count',
        timestamp: Date.now(),
      };

      await expect(grafanaProvider.recordMetric(metric)).resolves.not.toThrow();
    });
  });

  describe('startTrace', () => {
    beforeEach(async () => {
      await grafanaProvider.initialize(mockConfig);
    });

    it('should start trace successfully', async () => {
      const trace = {
        operationName: 'test_operation',
        attributes: { component: 'test' },
        startTime: Date.now(),
      };

      const spanId = await grafanaProvider.startTrace(trace);

      expect(typeof spanId).toBe('string');
      expect(spanId).toMatch(/^grafana-span-\d+-[a-z0-9]+$/);
    });

    it('should handle trace start gracefully', async () => {
      const trace = {
        operationName: 'test_operation',
        startTime: Date.now(),
      };

      const spanId = await grafanaProvider.startTrace(trace);
      expect(typeof spanId).toBe('string');
      expect(spanId.length).toBeGreaterThan(0);
    });
  });

  describe('endTrace', () => {
    beforeEach(async () => {
      await grafanaProvider.initialize(mockConfig);
    });

    it('should end trace successfully', async () => {
      const trace = {
        operationName: 'test_operation',
        startTime: Date.now(),
      };

      const spanId = await grafanaProvider.startTrace(trace);
      await expect(grafanaProvider.endTrace(spanId, { success: true })).resolves.not.toThrow();
    });

    it('should handle ending non-existent trace gracefully', async () => {
      await expect(grafanaProvider.endTrace('non-existent-span', {})).resolves.not.toThrow();
    });
  });

  describe('recordLog', () => {
    beforeEach(async () => {
      await grafanaProvider.initialize(mockConfig);
    });

    it('should record log successfully', async () => {
      const log = {
        level: 'info' as const,
        message: 'Test log message',
        attributes: { component: 'test' },
        timestamp: Date.now(),
      };

      await expect(grafanaProvider.recordLog(log)).resolves.not.toThrow();
    });

    it('should handle log recording gracefully', async () => {
      const log = {
        level: 'error' as const,
        message: 'Test error',
        timestamp: Date.now(),
      };

      await expect(grafanaProvider.recordLog(log)).resolves.not.toThrow();
    });
  });

  describe('flush', () => {
    beforeEach(async () => {
      await grafanaProvider.initialize(mockConfig);
    });

    it('should flush successfully', async () => {
      await expect(grafanaProvider.flush()).resolves.not.toThrow();
    });
  });

  describe('shutdown', () => {
    beforeEach(async () => {
      await grafanaProvider.initialize(mockConfig);
    });

    it('should shutdown successfully', async () => {
      await expect(grafanaProvider.shutdown()).resolves.not.toThrow();
      expect(grafanaProvider.isHealthy()).toBe(false);
    });
  });

  describe('isHealthy', () => {
    it('should return false when not initialized', () => {
      expect(grafanaProvider.isHealthy()).toBe(false);
    });

    it('should return true when initialized and healthy', async () => {
      await grafanaProvider.initialize(mockConfig);
      expect(grafanaProvider.isHealthy()).toBe(true);
    });

    it('should return false after shutdown', async () => {
      await grafanaProvider.initialize(mockConfig);
      await grafanaProvider.shutdown();
      expect(grafanaProvider.isHealthy()).toBe(false);
    });
  });
});
