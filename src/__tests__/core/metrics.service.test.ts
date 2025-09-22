import { MetricsService } from '../../core/metrics.service';
import { TelemetryCore } from '../../core/telemetry.core';
import { TelemetryConfig } from '../../interfaces/telemetry.interfaces';

jest.mock('../../core/telemetry.core');

describe('MetricsService', () => {
  let metricsService: MetricsService;
  let mockTelemetryCore: jest.Mocked<TelemetryCore>;

  beforeEach(() => {
    mockTelemetryCore = {
      recordMetric: jest.fn(),
      startTrace: jest.fn(),
      endTrace: jest.fn(),
      recordLog: jest.fn(),
      initialize: jest.fn(),
      flush: jest.fn(),
      shutdown: jest.fn(),
      getHealthStatus: jest.fn().mockReturnValue({ healthy: true, provider: 'primary', queueSize: 0, circuitBreakerState: 'closed' }),
    } as any;

    metricsService = new MetricsService(mockTelemetryCore);
  });

  describe('counter', () => {
    it('should record a basic counter metric', async () => {
      await metricsService.counter('test_metric', 42);

      expect(mockTelemetryCore.recordMetric).toHaveBeenCalledWith({
        name: 'test_metric',
        value: 42,
        unit: 'count',
        timestamp: expect.any(Number),
      });
    });

    it('should record a counter with attributes', async () => {
      const attributes = { user_id: '123', action: 'click' };
      
      await metricsService.counter('user_action', 1, attributes);

      expect(mockTelemetryCore.recordMetric).toHaveBeenCalledWith({
        name: 'user_action',
        value: 1,
        unit: 'count',
        attributes,
        timestamp: expect.any(Number),
      });
    });

    it('should handle core errors gracefully', async () => {
      mockTelemetryCore.recordMetric.mockRejectedValue(new Error('Core error'));

      await expect(metricsService.counter('test', 1)).rejects.toThrow('Core error');
    });
  });

  describe('recordWebVitals', () => {
    it('should record web vitals metrics', async () => {
      await metricsService.recordWebVitals('FCP', 1200);

      expect(mockTelemetryCore.recordMetric).toHaveBeenCalledWith({
        name: 'web_vitals_fcp',
        value: 1200,
        unit: 'gauge',
        attributes: {
          metric_type: 'web_vital',
        },
        timestamp: expect.any(Number),
      });
    });
  });

  describe('recordUserInteraction', () => {
    it('should record user interaction metrics', async () => {
      await metricsService.recordUserInteraction('click', 'button');

      expect(mockTelemetryCore.recordMetric).toHaveBeenCalledWith({
        name: 'user_interactions_total',
        value: 1,
        unit: 'count',
        attributes: {
          action: 'click',
          component: 'button',
        },
        timestamp: expect.any(Number),
      });
    });

    it('should record user interaction with custom attributes', async () => {
      const metadata = { button_id: 'submit', page: '/contact' };
      
      await metricsService.recordUserInteraction('click', 'button', metadata);

      expect(mockTelemetryCore.recordMetric).toHaveBeenCalledWith({
        name: 'user_interactions_total',
        value: 1,
        unit: 'count',
        attributes: {
          action: 'click',
          component: 'button',
          button_id: 'submit',
          page: '/contact',
        },
        timestamp: expect.any(Number),
      });
    });
  });

  describe('recordBusinessMetric', () => {
    it('should record business metrics', async () => {
      await metricsService.recordBusinessMetric('revenue', 1000);

      expect(mockTelemetryCore.recordMetric).toHaveBeenCalledWith({
        name: 'business_revenue',
        value: 1000,
        attributes: {
          category: undefined,
        },
        timestamp: expect.any(Number),
      });
    });

    it('should record business metrics with category and attributes', async () => {
      const attributes = { currency: 'USD', region: 'US' };
      
      await metricsService.recordBusinessMetric('revenue', 1000, 'sales', attributes);

      expect(mockTelemetryCore.recordMetric).toHaveBeenCalledWith({
        name: 'business_revenue',
        value: 1000,
        attributes: {
          category: 'sales',
          currency: 'USD',
          region: 'US',
        },
        timestamp: expect.any(Number),
      });
    });
  });

  describe('gauge', () => {
    it('should record gauge metrics', async () => {
      await metricsService.gauge('memory_usage', 75.5);

      expect(mockTelemetryCore.recordMetric).toHaveBeenCalledWith({
        name: 'memory_usage',
        value: 75.5,
        unit: 'gauge',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('timing', () => {
    it('should record timing metrics', async () => {
      await metricsService.timing('api_response_time', 150);

      expect(mockTelemetryCore.recordMetric).toHaveBeenCalledWith({
        name: 'api_response_time',
        value: 150,
        unit: 'milliseconds',
        timestamp: expect.any(Number),
      });
    });
  });

  describe('increment and decrement', () => {
    it('should increment counter', async () => {
      await metricsService.increment('page_views');

      expect(mockTelemetryCore.recordMetric).toHaveBeenCalledWith({
        name: 'page_views',
        value: 1,
        unit: 'count',
        timestamp: expect.any(Number),
      });
    });

    it('should decrement counter', async () => {
      await metricsService.decrement('active_connections');

      expect(mockTelemetryCore.recordMetric).toHaveBeenCalledWith({
        name: 'active_connections',
        value: -1,
        unit: 'count',
        timestamp: expect.any(Number),
      });
    });
  });
});
