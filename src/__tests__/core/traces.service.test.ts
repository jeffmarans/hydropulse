import { TracesService } from '../../core/traces.service';
import { TelemetryCore } from '../../core/telemetry.core';
import { TelemetryConfig } from '../../interfaces/telemetry.interfaces';

jest.mock('../../core/telemetry.core');

describe('TracesService', () => {
  let tracesService: TracesService;
  let mockTelemetryCore: jest.Mocked<TelemetryCore>;

  beforeEach(() => {
    mockTelemetryCore = {
      startTrace: jest.fn().mockResolvedValue('test-span-id'),
      endTrace: jest.fn().mockResolvedValue(undefined),
      getHealthStatus: jest.fn().mockReturnValue({ healthy: true }),
    } as any;

    tracesService = new TracesService(mockTelemetryCore);
  });

  describe('startSpan', () => {
    it('should start a span with basic parameters', async () => {
      const spanId = await tracesService.startSpan('test-operation', {
        userId: '123',
        component: 'auth',
      });

      expect(spanId).toBe('test-span-id');
      expect(mockTelemetryCore.startTrace).toHaveBeenCalledWith({
        operationName: 'test-operation',
        attributes: { userId: '123', component: 'auth' },
        startTime: expect.any(Number),
        parentSpanId: undefined,
        status: 'ok',
      });
    });

    it('should start a span without attributes', async () => {
      const spanId = await tracesService.startSpan('simple-operation');

      expect(spanId).toBe('test-span-id');
      expect(mockTelemetryCore.startTrace).toHaveBeenCalledWith({
        operationName: 'simple-operation',
        attributes: undefined,
        startTime: expect.any(Number),
        parentSpanId: undefined,
        status: 'ok',
      });
    });
  });

  describe('finishSpan', () => {
    it('should finish a span successfully', async () => {
      const spanId = await tracesService.startSpan('test-operation');
      await tracesService.finishSpan(spanId, { success: true });

      expect(mockTelemetryCore.endTrace).toHaveBeenCalledWith(spanId, {
        success: true,
        duration_ms: expect.any(Number),
      });
    });

    it('should finish a span with error', async () => {
      const spanId = await tracesService.startSpan('test-operation');
      const error = new Error('Test error');
      await tracesService.finishSpan(spanId, {}, error);

      expect(mockTelemetryCore.endTrace).toHaveBeenCalledWith(spanId, {
        duration_ms: expect.any(Number),
        error: true,
        error_message: 'Test error',
        error_stack: expect.any(String),
      });
    });

    it('should handle finishing non-existent span gracefully', async () => {
      await expect(tracesService.finishSpan('non-existent-span')).resolves.not.toThrow();
    });
  });

  describe('recordSpan', () => {
    it('should record a span for async function', async () => {
      const testFunction = jest.fn().mockResolvedValue('result');
      
      const result = await tracesService.recordSpan(
        'async-function',
        testFunction,
        { component: 'test' }
      );

      expect(result).toBe('result');
      expect(testFunction).toHaveBeenCalled();
      expect(mockTelemetryCore.startTrace).toHaveBeenCalledWith({
        operationName: 'async-function',
        attributes: { component: 'test' },
        startTime: expect.any(Number),
        parentSpanId: undefined,
        status: 'ok',
      });
      expect(mockTelemetryCore.endTrace).toHaveBeenCalledWith('test-span-id', {
        component: 'test',
        duration_ms: expect.any(Number),
        success: true,
      });
    });

    it('should handle function errors', async () => {
      const error = new Error('Function error');
      const testFunction = jest.fn().mockRejectedValue(error);
      
      await expect(tracesService.recordSpan('error-function', testFunction))
        .rejects.toThrow('Function error');

      expect(mockTelemetryCore.startTrace).toHaveBeenCalled();
      expect(mockTelemetryCore.endTrace).toHaveBeenCalledWith('test-span-id', {
        duration_ms: expect.any(Number),
        success: false,
        error: true,
        error_message: 'Function error',
        error_stack: expect.any(String),
      });
    });
  });

  describe('traceHttpRequest', () => {
    it('should trace HTTP request', async () => {
      const mockFn = jest.fn().mockResolvedValue({ status: 200, data: { id: 1 } });
      
      const result = await tracesService.traceHttpRequest('GET', '/api/users', mockFn, {
        userAgent: 'test-agent',
      });

      expect(result).toEqual({ status: 200, data: { id: 1 } });
      expect(mockTelemetryCore.startTrace).toHaveBeenCalledWith({
        operationName: 'HTTP GET',
        attributes: {
          http_method: 'GET',
          http_url: '/api/users',
          userAgent: 'test-agent',
        },
        startTime: expect.any(Number),
        parentSpanId: undefined,
        status: 'ok',
      });
      expect(mockTelemetryCore.endTrace).toHaveBeenCalledWith('test-span-id', {
        http_method: 'GET',
        http_url: '/api/users',
        userAgent: 'test-agent',
        duration_ms: expect.any(Number),
        success: true,
      });
    });
  });

  describe('traceDatabaseOperation', () => {
    it('should trace database operation', async () => {
      const mockFn = jest.fn().mockResolvedValue([{ id: 1, name: 'John' }]);
      
      const result = await tracesService.traceDatabaseOperation('SELECT', 'users', mockFn, {
        query: 'SELECT * FROM users',
      });

      expect(result).toEqual([{ id: 1, name: 'John' }]);
      expect(mockTelemetryCore.startTrace).toHaveBeenCalledWith({
        operationName: 'DB SELECT',
        attributes: {
          db_operation: 'SELECT',
          db_table: 'users',
          query: 'SELECT * FROM users',
        },
        startTime: expect.any(Number),
        parentSpanId: undefined,
        status: 'ok',
      });
      expect(mockTelemetryCore.endTrace).toHaveBeenCalledWith('test-span-id', {
        db_operation: 'SELECT',
        db_table: 'users',
        query: 'SELECT * FROM users',
        duration_ms: expect.any(Number),
        success: true,
      });
    });
  });

  describe('traceExternalService', () => {
    it('should trace external service call', async () => {
      const mockFn = jest.fn().mockResolvedValue({ success: true, transactionId: '12345' });
      
      const result = await tracesService.traceExternalService('payment-api', 'process-payment', mockFn, {
        amount: 100,
      });

      expect(result).toEqual({ success: true, transactionId: '12345' });
      expect(mockTelemetryCore.startTrace).toHaveBeenCalledWith({
        operationName: 'External payment-api',
        attributes: {
          external_service: 'payment-api',
          external_operation: 'process-payment',
          amount: 100,
        },
        startTime: expect.any(Number),
        parentSpanId: undefined,
        status: 'ok',
      });
      expect(mockTelemetryCore.endTrace).toHaveBeenCalledWith('test-span-id', {
        external_service: 'payment-api',
        external_operation: 'process-payment',
        amount: 100,
        duration_ms: expect.any(Number),
        success: true,
      });
    });
  });

  describe('error handling', () => {
    it('should handle core errors gracefully', async () => {
      mockTelemetryCore.startTrace.mockRejectedValue(new Error('Core error'));

      await expect(tracesService.startSpan('test-operation')).rejects.toThrow('Core error');
    });

    it('should handle end trace errors gracefully', async () => {
      mockTelemetryCore.endTrace.mockRejectedValue(new Error('End trace error'));

      await expect(tracesService.finishSpan('test-span-id')).resolves.not.toThrow();
    });
  });

  describe('span management', () => {
    it('should handle multiple concurrent spans', async () => {
      mockTelemetryCore.startTrace.mockResolvedValueOnce('span-1');
      mockTelemetryCore.startTrace.mockResolvedValueOnce('span-2');

      const span1 = await tracesService.startSpan('operation-1');
      const span2 = await tracesService.startSpan('operation-2');

      expect(span1).toBe('span-1');
      expect(span2).toBe('span-2');
      expect(mockTelemetryCore.startTrace).toHaveBeenCalledTimes(2);

      await tracesService.finishSpan(span1);
      await tracesService.finishSpan(span2);

      expect(mockTelemetryCore.endTrace).toHaveBeenCalledTimes(2);
    });

    it('should get active spans', async () => {
      mockTelemetryCore.startTrace.mockResolvedValueOnce('active-span-id');
      const spanId = await tracesService.startSpan('test-operation');
      const activeSpans = tracesService.getActiveSpans();
      
      expect(activeSpans).toHaveLength(1);
      expect(activeSpans[0].operationName).toBe('test-operation');
    });

    it('should add span attributes', async () => {
      mockTelemetryCore.startTrace.mockResolvedValueOnce('attr-span-id');
      const spanId = await tracesService.startSpan('test-operation');
      await tracesService.addSpanAttributes(spanId, { userId: '123' });
      
      const span = tracesService.getActiveSpan(spanId);
      expect(span?.attributes).toEqual({ userId: '123' });
    });
  });
});
