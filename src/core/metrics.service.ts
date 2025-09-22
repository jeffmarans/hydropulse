import { MetricData } from '../interfaces/telemetry.interfaces';
import { TelemetryCore } from './telemetry.core';

export class MetricsService {
  constructor(private core: TelemetryCore) {}

  async counter(name: string, value: number = 1, attributes?: Record<string, any>): Promise<void> {
    const metric: MetricData = {
      name,
      value,
      unit: 'count',
      attributes,
      timestamp: Date.now(),
    };

    await this.core.recordMetric(metric);
  }

  async gauge(name: string, value: number, attributes?: Record<string, any>): Promise<void> {
    const metric: MetricData = {
      name,
      value,
      unit: 'gauge',
      attributes,
      timestamp: Date.now(),
    };

    await this.core.recordMetric(metric);
  }

  async histogram(name: string, value: number, attributes?: Record<string, any>): Promise<void> {
    const metric: MetricData = {
      name,
      value,
      unit: 'histogram',
      attributes,
      timestamp: Date.now(),
    };

    await this.core.recordMetric(metric);
  }

  async timing(name: string, durationMs: number, attributes?: Record<string, any>): Promise<void> {
    const metric: MetricData = {
      name,
      value: durationMs,
      unit: 'milliseconds',
      attributes,
      timestamp: Date.now(),
    };

    await this.core.recordMetric(metric);
  }

  async increment(name: string, attributes?: Record<string, any>): Promise<void> {
    await this.counter(name, 1, attributes);
  }

  async decrement(name: string, attributes?: Record<string, any>): Promise<void> {
    await this.counter(name, -1, attributes);
  }

  async recordResponseTime(endpoint: string, method: string, statusCode: number, durationMs: number): Promise<void> {
    await this.timing('http_request_duration', durationMs, {
      endpoint,
      method,
      status_code: statusCode,
    });

    await this.counter('http_requests_total', 1, {
      endpoint,
      method,
      status_code: statusCode,
    });
  }

  async recordErrorRate(service: string, operation: string, isError: boolean): Promise<void> {
    await this.counter('operation_total', 1, {
      service,
      operation,
      status: isError ? 'error' : 'success',
    });
  }

  async recordResourceUsage(cpuPercent: number, memoryMB: number, heapUsedMB?: number): Promise<void> {
    await this.gauge('system_cpu_usage_percent', cpuPercent);
    await this.gauge('system_memory_usage_mb', memoryMB);
    
    if (heapUsedMB !== undefined) {
      await this.gauge('nodejs_heap_used_mb', heapUsedMB);
    }
  }

  async recordBusinessMetric(name: string, value: number, category?: string, attributes?: Record<string, any>): Promise<void> {
    const metric: MetricData = {
      name: `business_${name}`,
      value,
      attributes: {
        category,
        ...attributes,
      },
      timestamp: Date.now(),
    };

    await this.core.recordMetric(metric);
  }

  async recordComponentRender(componentName: string, renderTimeMs: number, props?: Record<string, any>): Promise<void> {
    await this.timing('react_component_render_time', renderTimeMs, {
      component: componentName,
      props_count: props ? Object.keys(props).length : 0,
    });
  }

  async recordUserInteraction(action: string, component: string, metadata?: Record<string, any>): Promise<void> {
    await this.counter('user_interactions_total', 1, {
      action,
      component,
      ...metadata,
    });
  }

  async recordWebVitals(metric: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB', value: number): Promise<void> {
    await this.gauge(`web_vitals_${metric.toLowerCase()}`, value, {
      metric_type: 'web_vital',
    });
  }
}
