import { TelemetryCore } from '../../core/telemetry.core';
import { TelemetryConfig } from '../../interfaces/telemetry.interfaces';

describe('TelemetryCore', () => {
  let telemetryCore: TelemetryCore;
  let mockConfig: TelemetryConfig;

  beforeEach(() => {
    mockConfig = {
      provider: 'auto',
      environment: 'development',
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      debug: false, // Disable debug to reduce console noise
      grafana: {
        url: 'http://localhost:3000/api/traces',
        apiKey: 'test-key',
        appKey: 'test-app',
      },
      openTelemetry: {
        endpoint: 'http://localhost:4318',
      },
      sampling: {
        rate: 1.0,
      },
      batching: {
        maxQueueSize: 100,
        scheduledDelayMillis: 1000,
      },
    };

    telemetryCore = new TelemetryCore(mockConfig);
  });

  describe('constructor', () => {
    it('should create TelemetryCore instance with correct configuration', () => {
      expect(telemetryCore).toBeInstanceOf(TelemetryCore);
      expect(telemetryCore.metrics).toBeDefined();
      expect(telemetryCore.traces).toBeDefined();
      expect(telemetryCore.logs).toBeDefined();
    });

    it('should throw error for invalid configuration', () => {
      const invalidConfig = {
        ...mockConfig,
        serviceName: '',
      };

      expect(() => new TelemetryCore(invalidConfig)).toThrow('serviceName is required in telemetry configuration');
    });
  });

  describe('initialize', () => {
    it('should initialize providers successfully', async () => {
      await expect(telemetryCore.initialize()).resolves.not.toThrow();
      
      expect(telemetryCore.metrics).toBeDefined();
      expect(telemetryCore.traces).toBeDefined();
      expect(telemetryCore.logs).toBeDefined();
    });

    it('should handle multiple initialization calls', async () => {
      await telemetryCore.initialize();
      await expect(telemetryCore.initialize()).resolves.not.toThrow();
    });
  });

  describe('circuit breaker', () => {
    it('should start with closed circuit breaker', () => {
      expect(telemetryCore.getHealthStatus().circuitBreakerState).toBe('closed');
    });

    it('should maintain closed state after successful initialization', async () => {
      await telemetryCore.initialize();
      expect(telemetryCore.getHealthStatus().circuitBreakerState).toBe('closed');
    });
  });

  describe('shutdown', () => {
    it('should shutdown gracefully even when not initialized', async () => {
      await expect(telemetryCore.shutdown()).resolves.not.toThrow();
    });

    it('should handle shutdown errors gracefully', async () => {
      try {
        await telemetryCore.initialize();
      } catch (error) {
      }
      
      await expect(telemetryCore.shutdown()).resolves.not.toThrow();
    });
  });

  describe('health status', () => {
    it('should return false when not initialized', () => {
      const status = telemetryCore.getHealthStatus();
      expect(status.healthy).toBe(false);
      expect(status.queueSize).toBe(0);
      expect(status.circuitBreakerState).toBe('closed');
    });

    it('should return health status structure', () => {
      const status = telemetryCore.getHealthStatus();
      expect(status).toHaveProperty('healthy');
      expect(status).toHaveProperty('provider');
      expect(status).toHaveProperty('queueSize');
      expect(status).toHaveProperty('circuitBreakerState');
    });
  });

  describe('metrics recording', () => {
    it('should record metrics after initialization', async () => {
      await telemetryCore.initialize();
      await expect(telemetryCore.metrics.counter('test_metric', 1)).resolves.not.toThrow();
      
      const status = telemetryCore.getHealthStatus();
      expect(status.queueSize).toBe(0);
    });

    it('should handle metric recording errors gracefully', async () => {
      await expect(telemetryCore.metrics.counter('test', 1)).resolves.not.toThrow();
      await expect(telemetryCore.metrics.gauge('memory', 75.5)).resolves.not.toThrow();
      await expect(telemetryCore.metrics.timing('response_time', 150)).resolves.not.toThrow();
    });
  });

  describe('trace recording', () => {
    it('should handle trace operations after initialization', async () => {
      await telemetryCore.initialize();
      
      const traceData = {
        operationName: 'test-operation',
        startTime: Date.now(),
        attributes: { userId: '123' }
      };
      
      const spanId = await telemetryCore.startTrace(traceData);
      expect(typeof spanId).toBe('string');
      
      await expect(telemetryCore.endTrace(spanId)).resolves.not.toThrow();
    });
  });

  describe('log recording', () => {
    it('should handle log operations after initialization', async () => {
      await telemetryCore.initialize();
      
      const logData = {
        level: 'info' as const,
        message: 'Test log message',
        attributes: { component: 'test' }
      };
      
      await expect(telemetryCore.recordLog(logData)).resolves.not.toThrow();
      
      const status = telemetryCore.getHealthStatus();
      expect(status.queueSize).toBe(0);
    });
  });
});
