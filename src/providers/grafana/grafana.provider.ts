// import { initializeFaro, getWebInstrumentations, faro } from '@grafana/faro-web-sdk';
import { TelemetryProvider, TelemetryConfig, MetricData, TraceData, LogData } from '../../interfaces/telemetry.interfaces';
import { GrafanaConfig, validateGrafanaConfig } from './grafana.config';

export class GrafanaProvider implements TelemetryProvider {
  private config?: GrafanaConfig;
  private initialized = false;
  private healthy = true;
  private activeSpans: Map<string, any> = new Map();

  async initialize(config: TelemetryConfig): Promise<void> {
    try {
      if (!config.grafana) {
        throw new Error('Grafana configuration is required');
      }

      this.config = validateGrafanaConfig({
        ...config.grafana,
        environment: config.environment,
        serviceName: config.serviceName,
        serviceVersion: config.serviceVersion,
        debug: config.debug,
      });

      if (typeof window !== 'undefined') {
        try {
          const { initializeFaro, getWebInstrumentations } = await import('@grafana/faro-web-sdk');
          initializeFaro({
            url: this.config.url,
            apiKey: this.config.apiKey,
            app: {
              name: this.config.serviceName,
              version: this.config.serviceVersion,
              environment: this.config.environment,
            },
            instrumentations: [
              ...getWebInstrumentations({
                captureConsole: true,
                captureConsoleDisabledLevels: [],
              }),
            ],
          });
        } catch (error) {
          console.warn('Failed to load @grafana/faro-web-sdk, using fallback implementation');
        }
      } else {
        console.log('Grafana Faro initialized for Node.js environment');
      }

      this.initialized = true;
      this.healthy = true;
      
      if (this.config.debug) {
        console.log('Grafana provider initialized successfully');
      }
    } catch (error) {
      this.healthy = false;
      throw new Error(`Failed to initialize Grafana provider: ${error}`);
    }
  }

  async recordMetric(metric: MetricData): Promise<void> {
    if (!this.initialized || !this.healthy) {
      throw new Error('Grafana provider not initialized or unhealthy');
    }

    try {
      if (typeof window !== 'undefined') {
        try {
          const { faro } = await import('@grafana/faro-web-sdk');
          if (faro) {
            faro.api.pushMeasurement({
              type: 'custom',
              values: {
                [metric.name]: metric.value,
              },
              context: metric.attributes || {},
            });
            return;
          }
        } catch (error) {
        }
      }
      
      {
        if (this.config?.debug) {
          console.log('Grafana Metric:', {
            name: metric.name,
            value: metric.value,
            unit: metric.unit,
            attributes: metric.attributes,
            timestamp: metric.timestamp,
          });
        }
      }
    } catch (error) {
      this.healthy = false;
      throw new Error(`Failed to record metric: ${error}`);
    }
  }

  async startTrace(trace: TraceData): Promise<string> {
    if (!this.initialized || !this.healthy) {
      throw new Error('Grafana provider not initialized or unhealthy');
    }

    try {
      const spanId = `grafana-span-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      if (typeof window !== 'undefined') {
        try {
          const { faro } = await import('@grafana/faro-web-sdk');
          if (faro) {
            const span = {
              operationName: trace.operationName,
              startTime: trace.startTime,
              attributes: trace.attributes || {},
              spanId,
              traceId: trace.traceId || `grafana-trace-${Date.now()}`,
            };
            
            this.activeSpans.set(spanId, span);
            return spanId;
          }
        } catch (error) {
        }
      }
      
      {
        if (this.config?.debug) {
          console.log('Grafana Trace Started:', {
            spanId,
            operationName: trace.operationName,
            attributes: trace.attributes,
          });
        }
        
        this.activeSpans.set(spanId, {
          operationName: trace.operationName,
          startTime: trace.startTime,
          attributes: trace.attributes || {},
        });
      }

      return spanId;
    } catch (error) {
      this.healthy = false;
      throw new Error(`Failed to start trace: ${error}`);
    }
  }

  async endTrace(spanId: string, attributes?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.healthy) {
      throw new Error('Grafana provider not initialized or unhealthy');
    }

    try {
      const span = this.activeSpans.get(spanId);
      if (!span) {
        console.warn(`Span ${spanId} not found`);
        return;
      }

      const endTime = Date.now();
      const duration = endTime - span.startTime;

      if (typeof window !== 'undefined') {
        try {
          const { faro } = await import('@grafana/faro-web-sdk');
          if (faro) {
            faro.api.pushMeasurement({
              type: 'custom',
              values: {
                [`${span.operationName}_duration`]: duration,
              },
              context: {
                ...span.attributes,
                ...attributes,
                span_id: spanId,
              },
            });
            this.activeSpans.delete(spanId);
            return;
          }
        } catch (error) {
        }
      }
      
      {
        if (this.config?.debug) {
          console.log('Grafana Trace Ended:', {
            spanId,
            operationName: span.operationName,
            duration,
            attributes: { ...span.attributes, ...attributes },
          });
        }
      }

      this.activeSpans.delete(spanId);
    } catch (error) {
      this.healthy = false;
      throw new Error(`Failed to end trace: ${error}`);
    }
  }

  async recordLog(log: LogData): Promise<void> {
    if (!this.initialized || !this.healthy) {
      throw new Error('Grafana provider not initialized or unhealthy');
    }

    try {
      if (typeof window !== 'undefined') {
        try {
          const { faro } = await import('@grafana/faro-web-sdk');
          if (faro) {
            const logLevel = log.level === 'debug' ? 'log' : log.level;
            faro.api.pushLog([log.message], {
              level: logLevel as any,
              context: {
                ...log.attributes,
                timestamp: (log.timestamp || Date.now()).toString(),
                traceId: log.traceId || '',
                spanId: log.spanId || '',
              },
            });
            return;
          }
        } catch (error) {
        }
      }
      
      {
        if (this.config?.debug) {
          console.log('Grafana Log:', {
            level: log.level,
            message: log.message,
            attributes: log.attributes,
            timestamp: log.timestamp,
            traceId: log.traceId,
            spanId: log.spanId,
          });
        }
      }
    } catch (error) {
      this.healthy = false;
      throw new Error(`Failed to record log: ${error}`);
    }
  }

  async flush(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      if (typeof window !== 'undefined') {
        try {
          const { faro } = await import('@grafana/faro-web-sdk');
          if (faro) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
        }
      }
      
      if (this.config?.debug) {
        console.log('Grafana provider flushed');
      }
    } catch (error) {
      console.warn('Failed to flush Grafana provider:', error);
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.flush();
      this.activeSpans.clear();
      this.initialized = false;
      this.healthy = false;
      
      if (this.config?.debug) {
        console.log('Grafana provider shutdown completed');
      }
    } catch (error) {
      console.warn('Failed to shutdown Grafana provider:', error);
    }
  }

  isHealthy(): boolean {
    return this.healthy && this.initialized;
  }
}
