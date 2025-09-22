import { TraceData } from '../interfaces/telemetry.interfaces';
import { TelemetryCore } from './telemetry.core';

export class TracesService {
  private activeSpans: Map<string, TraceData> = new Map();

  constructor(private core: TelemetryCore) {}

  async startSpan(operationName: string, attributes?: Record<string, any>, parentSpanId?: string): Promise<string> {
    const trace: TraceData = {
      operationName,
      startTime: Date.now(),
      attributes,
      parentSpanId,
      status: 'ok',
    };

    const spanId = await this.core.startTrace(trace);
    this.activeSpans.set(spanId, { ...trace, spanId });
    
    return spanId;
  }

  async finishSpan(spanId: string, attributes?: Record<string, any>, error?: Error): Promise<void> {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      console.warn(`Attempted to finish unknown span: ${spanId}`);
      return;
    }

    const endTime = Date.now();
    const finalAttributes: Record<string, any> = {
      ...span.attributes,
      ...attributes,
      duration_ms: endTime - span.startTime,
    };

    if (error) {
      finalAttributes.error = true;
      finalAttributes.error_message = error.message;
      finalAttributes.error_stack = error.stack;
    }

    await this.core.endTrace(spanId, finalAttributes);
    this.activeSpans.delete(spanId);
  }

  async recordSpan(operationName: string, fn: () => Promise<any>, attributes?: Record<string, any>): Promise<any> {
    const spanId = await this.startSpan(operationName, attributes);
    
    try {
      const result = await fn();
      await this.finishSpan(spanId, { success: true });
      return result;
    } catch (error) {
      await this.finishSpan(spanId, { success: false }, error as Error);
      throw error;
    }
  }

  recordSyncSpan<T>(operationName: string, fn: () => T, attributes?: Record<string, any>): T {
    const startTime = Date.now();
    let result: T;
    let error: Error | undefined;

    try {
      result = fn();
    } catch (err) {
      error = err as Error;
      throw err;
    } finally {
      const endTime = Date.now();
      const finalAttributes: Record<string, any> = {
        ...attributes,
        duration_ms: endTime - startTime,
        success: !error,
      };

      if (error) {
        finalAttributes.error = true;
        finalAttributes.error_message = error.message;
      }

      this.core.startTrace({
        operationName,
        startTime,
        endTime,
        attributes: finalAttributes,
        status: error ? 'error' : 'ok',
        error,
      }).catch(err => {
        console.warn('Failed to record sync span:', err);
      });
    }

    return result!;
  }

  async traceHttpRequest(
    method: string,
    url: string,
    fn: () => Promise<{ status: number; data?: any }>,
    attributes?: Record<string, any>
  ): Promise<{ status: number; data?: any }> {
    return this.recordSpan(
      `HTTP ${method}`,
      fn,
      {
        http_method: method,
        http_url: url,
        ...attributes,
      }
    );
  }

  async traceDatabaseOperation(
    operation: string,
    table: string,
    fn: () => Promise<any>,
    attributes?: Record<string, any>
  ): Promise<any> {
    return this.recordSpan(
      `DB ${operation}`,
      fn,
      {
        db_operation: operation,
        db_table: table,
        ...attributes,
      }
    );
  }

  async traceExternalService(
    serviceName: string,
    operation: string,
    fn: () => Promise<any>,
    attributes?: Record<string, any>
  ): Promise<any> {
    return this.recordSpan(
      `External ${serviceName}`,
      fn,
      {
        external_service: serviceName,
        external_operation: operation,
        ...attributes,
      }
    );
  }

  async traceComponentLifecycle(
    componentName: string,
    lifecycle: 'mount' | 'update' | 'unmount',
    fn: () => Promise<any>,
    props?: Record<string, any>
  ): Promise<any> {
    return this.recordSpan(
      `React ${componentName} ${lifecycle}`,
      fn,
      {
        component: componentName,
        lifecycle,
        props_count: props ? Object.keys(props).length : 0,
      }
    );
  }

  async traceBusinessProcess(
    processName: string,
    fn: () => Promise<any>,
    attributes?: Record<string, any>
  ): Promise<any> {
    return this.recordSpan(
      `Process ${processName}`,
      fn,
      {
        process_type: 'business',
        ...attributes,
      }
    );
  }

  getActiveSpan(spanId: string): TraceData | undefined {
    return this.activeSpans.get(spanId);
  }

  getActiveSpans(): TraceData[] {
    return Array.from(this.activeSpans.values());
  }

  async addSpanAttributes(spanId: string, attributes: Record<string, any>): Promise<void> {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.attributes = { ...span.attributes, ...attributes };
    }
  }

  async setSpanStatus(spanId: string, status: 'ok' | 'error' | 'timeout'): Promise<void> {
    const span = this.activeSpans.get(spanId);
    if (span) {
      span.status = status;
    }
  }
}
