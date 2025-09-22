import { LogsService } from '../../core/logs.service';
import { TelemetryCore } from '../../core/telemetry.core';
import { TelemetryConfig } from '../../interfaces/telemetry.interfaces';

jest.mock('../../core/telemetry.core');

describe('LogsService', () => {
  let logsService: LogsService;
  let mockTelemetryCore: jest.Mocked<TelemetryCore>;

  beforeEach(() => {
    mockTelemetryCore = {
      recordLog: jest.fn().mockResolvedValue(undefined),
      getHealthStatus: jest.fn().mockReturnValue({ healthy: true }),
    } as any;

    logsService = new LogsService(mockTelemetryCore);
  });

  describe('info', () => {
    it('should record info log', async () => {
      await logsService.info('Test info message', { component: 'test' });

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'info',
        message: 'Test info message',
        attributes: { component: 'test' },
        timestamp: expect.any(Number),
      });
    });

    it('should record info log without attributes', async () => {
      await logsService.info('Test info message');

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'info',
        message: 'Test info message',
        attributes: undefined,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('warn', () => {
    it('should record warn log', async () => {
      await logsService.warn('Test warning', { source: 'validation' });

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'warn',
        message: 'Test warning',
        attributes: { source: 'validation' },
        timestamp: expect.any(Number),
      });
    });
  });

  describe('error', () => {
    it('should record error log with Error object', async () => {
      const error = new Error('Test error');
      await logsService.error('Error occurred', error, { userId: '123' });

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'error',
        message: 'Error occurred',
        attributes: {
          error_name: 'Error',
          error_message: 'Test error',
          error_stack: expect.any(String),
          userId: '123',
        },
        timestamp: expect.any(Number),
        spanId: undefined,
        traceId: undefined,
      });
    });

    it('should record error log with Error object', async () => {
      const error = new Error('Test error');
      await logsService.error('Error occurred', error, { userId: '123' });

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'error',
        message: 'Error occurred',
        attributes: {
          error_name: 'Error',
          error_message: 'Test error',
          error_stack: expect.any(String),
          userId: '123',
        },
        timestamp: expect.any(Number),
        spanId: undefined,
        traceId: undefined,
      });
    });

    it('should record error log without error object', async () => {
      await logsService.error('Error occurred');

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'error',
        message: 'Error occurred',
        attributes: undefined,
        timestamp: expect.any(Number),
      });
    });
  });

  describe('debug', () => {
    it('should record debug log', async () => {
      await logsService.debug('Debug message', { step: 'initialization' });

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'debug',
        message: 'Debug message',
        attributes: { step: 'initialization' },
        timestamp: expect.any(Number),
      });
    });
  });

  describe('HTTP request logging', () => {
    it('should log HTTP request', async () => {
      await logsService.logHttpRequest('GET', '/api/users', 200, 150, 'test-agent', '123');

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'info',
        message: 'HTTP Request',
        attributes: {
          http_method: 'GET',
          http_url: '/api/users',
          http_status_code: 200,
          http_duration_ms: 150,
          http_user_agent: 'test-agent',
          user_id: '123',
        },
        timestamp: expect.any(Number),
        traceId: undefined,
        spanId: undefined,
      });
    });
  });

  describe('business events', () => {
    it('should record business event', async () => {
      await logsService.logBusinessEvent('user_registration', 'auth', true, {
        userId: '123',
        email: 'test@example.com',
      });

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'info',
        message: 'Business Event: user_registration',
        attributes: {
          business_event: 'user_registration',
          business_category: 'auth',
          business_success: true,
          userId: '123',
          email: 'test@example.com',
        },
        timestamp: expect.any(Number),
        traceId: undefined,
        spanId: undefined,
      });
    });
  });

  describe('security events', () => {
    it('should record security event', async () => {
      await logsService.logSecurityEvent('authentication', 'Failed login attempt', '123', '192.168.1.1', 'Mozilla/5.0', {
        attempts: 3,
      });

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'warn',
        message: 'Security Event: Failed login attempt',
        attributes: {
          security_event_type: 'authentication',
          user_id: '123',
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
          attempts: 3,
        },
        timestamp: expect.any(Number),
        traceId: undefined,
        spanId: undefined,
      });
    });
  });

  describe('performance events', () => {
    it('should record performance metric', async () => {
      await logsService.logPerformanceMetric('response_time', 150, 'ms', {
        endpoint: '/api/users',
      });

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'info',
        message: 'Performance Metric: response_time',
        attributes: {
          performance_metric: 'response_time',
          performance_value: 150,
          performance_unit: 'ms',
          endpoint: '/api/users',
        },
        timestamp: expect.any(Number),
        traceId: undefined,
        spanId: undefined,
      });
    });
  });

  describe('error handling', () => {
    it('should handle core errors gracefully', async () => {
      mockTelemetryCore.recordLog.mockRejectedValue(new Error('Core error'));

      await expect(logsService.info('Test message')).rejects.toThrow('Core error');
    });

    it('should handle buffer logging', async () => {
      logsService.bufferLog('info', 'Buffered message', { test: true });
      
      await logsService.flushBuffer();
      
      expect(mockTelemetryCore.recordLog).toHaveBeenCalledWith({
        level: 'info',
        message: 'Buffered message',
        attributes: { test: true },
        timestamp: expect.any(Number),
      });
    });
  });

  describe('batch logging', () => {
    it('should handle multiple logs efficiently', async () => {
      const promises = [
        logsService.info('Message 1'),
        logsService.warn('Message 2'),
        logsService.error('Message 3'),
        logsService.debug('Message 4'),
      ];

      await Promise.all(promises);

      expect(mockTelemetryCore.recordLog).toHaveBeenCalledTimes(4);
    });
  });
});
