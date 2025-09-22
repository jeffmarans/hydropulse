import { LogData } from '../interfaces/telemetry.interfaces';
import { TelemetryCore } from './telemetry.core';

export class LogsService {
  constructor(private core: TelemetryCore) {}

  async debug(message: string, attributes?: Record<string, any>, traceId?: string, spanId?: string): Promise<void> {
    await this.log('debug', message, attributes, traceId, spanId);
  }

  async info(message: string, attributes?: Record<string, any>, traceId?: string, spanId?: string): Promise<void> {
    await this.log('info', message, attributes, traceId, spanId);
  }

  async warn(message: string, attributes?: Record<string, any>, traceId?: string, spanId?: string): Promise<void> {
    await this.log('warn', message, attributes, traceId, spanId);
  }

  async error(message: string, error?: Error, attributes?: Record<string, any>, traceId?: string, spanId?: string): Promise<void> {
    const errorAttributes = error ? {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack,
      ...attributes,
    } : attributes;

    await this.log('error', message, errorAttributes, traceId, spanId);
  }

  private async log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    attributes?: Record<string, any>,
    traceId?: string,
    spanId?: string
  ): Promise<void> {
    const logData: LogData = {
      level,
      message,
      attributes,
      timestamp: Date.now(),
      traceId,
      spanId,
    };

    await this.core.recordLog(logData);
  }

  async logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    durationMs: number,
    userAgent?: string,
    userId?: string
  ): Promise<void> {
    await this.info('HTTP Request', {
      http_method: method,
      http_url: url,
      http_status_code: statusCode,
      http_duration_ms: durationMs,
      http_user_agent: userAgent,
      user_id: userId,
    });
  }

  async logDatabaseQuery(
    operation: string,
    table: string,
    durationMs: number,
    rowsAffected?: number,
    query?: string
  ): Promise<void> {
    await this.info('Database Query', {
      db_operation: operation,
      db_table: table,
      db_duration_ms: durationMs,
      db_rows_affected: rowsAffected,
      db_query: query,
    });
  }

  async logExternalServiceCall(
    serviceName: string,
    operation: string,
    success: boolean,
    durationMs: number,
    statusCode?: number,
    errorMessage?: string
  ): Promise<void> {
    const level = success ? 'info' : 'error';
    const message = `External Service Call: ${serviceName}`;
    
    await this.log(level, message, {
      external_service: serviceName,
      external_operation: operation,
      external_success: success,
      external_duration_ms: durationMs,
      external_status_code: statusCode,
      external_error_message: errorMessage,
    });
  }

  async logBusinessEvent(
    eventName: string,
    category: string,
    success: boolean,
    metadata?: Record<string, any>
  ): Promise<void> {
    const level = success ? 'info' : 'warn';
    const message = `Business Event: ${eventName}`;
    
    await this.log(level, message, {
      business_event: eventName,
      business_category: category,
      business_success: success,
      ...metadata,
    });
  }

  async logSecurityEvent(
    eventType: 'authentication' | 'authorization' | 'data_access' | 'suspicious_activity',
    message: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    additionalData?: Record<string, any>
  ): Promise<void> {
    await this.warn(`Security Event: ${message}`, {
      security_event_type: eventType,
      user_id: userId,
      ip_address: ipAddress,
      user_agent: userAgent,
      ...additionalData,
    });
  }

  async logPerformanceMetric(
    metricName: string,
    value: number,
    unit: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.info(`Performance Metric: ${metricName}`, {
      performance_metric: metricName,
      performance_value: value,
      performance_unit: unit,
      ...context,
    });
  }

  async logErrorWithContext(
    error: Error,
    context: {
      operation?: string;
      userId?: string;
      requestId?: string;
      additionalData?: Record<string, any>;
    }
  ): Promise<void> {
    await this.error(
      `Error in ${context.operation || 'unknown operation'}: ${error.message}`,
      error,
      {
        user_id: context.userId,
        request_id: context.requestId,
        ...context.additionalData,
      }
    );
  }

  async logComponentError(
    componentName: string,
    error: Error,
    props?: Record<string, any>,
    state?: Record<string, any>
  ): Promise<void> {
    await this.error(
      `React Component Error in ${componentName}`,
      error,
      {
        component: componentName,
        props_count: props ? Object.keys(props).length : 0,
        state_keys: state ? Object.keys(state) : [],
      }
    );
  }

  async logUserAction(
    action: string,
    component: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.info(`User Action: ${action}`, {
      user_action: action,
      component,
      user_id: userId,
      ...metadata,
    });
  }

  private logBuffer: LogData[] = [];
  private flushTimeout?: any;

  async logBatch(logs: LogData[]): Promise<void> {
    for (const log of logs) {
      await this.core.recordLog(log);
    }
  }

  bufferLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, attributes?: Record<string, any>): void {
    this.logBuffer.push({
      level,
      message,
      attributes,
      timestamp: Date.now(),
    });

    if (this.logBuffer.length >= 100) {
      this.flushBuffer();
    } else if (!this.flushTimeout) {
      this.flushTimeout = setTimeout(() => this.flushBuffer(), 5000);
    }
  }

  async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];
    
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = undefined;
    }

    await this.logBatch(logsToFlush);
  }
}
