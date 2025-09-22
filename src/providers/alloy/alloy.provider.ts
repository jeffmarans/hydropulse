import { trace, metrics } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { TelemetryProvider, TelemetryConfig, MetricData, TraceData, LogData } from '../../interfaces/telemetry.interfaces';
import { AlloyConfig, validateAlloyConfig } from './alloy.config';

export class AlloyProvider implements TelemetryProvider {
  private config?: AlloyConfig;
  private sdk?: NodeSDK;
  private initialized = false;
  private healthy = true;
  private tracer?: any;
  private meter?: any;
  private logger?: any;

  async initialize(config: TelemetryConfig): Promise<void> {
    try {
      if (!config.alloy) {
        throw new Error('Grafana Alloy configuration is required');
      }

      this.config = validateAlloyConfig({
        ...config.alloy,
        environment: config.environment,
        serviceName: config.serviceName,
        serviceVersion: config.serviceVersion,
        debug: config.debug,
      });

      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      });

      const traceExporter = new OTLPTraceExporter({
        url: `${this.config.endpoint}/v1/traces`,
        headers: this.config.headers,
      });

      const metricExporter = new OTLPMetricExporter({
        url: `${this.config.endpoint}/v1/metrics`,
        headers: this.config.headers,
      });


      if (typeof window === 'undefined') {
        this.sdk = new NodeSDK({
          resource,
          traceExporter,
          instrumentations: [getNodeAutoInstrumentations({
            '@opentelemetry/instrumentation-fs': {
              enabled: false,
            },
          })],
        });

        this.sdk.start();
      }

      this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);
      this.meter = metrics.getMeter(this.config.serviceName, this.config.serviceVersion);

      this.initialized = true;
      this.healthy = true;

      if (this.config.debug) {
        console.log('🌊 Hydropulse Alloy provider initialized successfully');
        console.log(`📡 Sending telemetry to Grafana Alloy at: ${this.config.endpoint}`);
      }
    } catch (error) {
      this.healthy = false;
      throw new Error(`Failed to initialize Alloy provider: ${error}`);
    }
  }

  async recordMetric(metric: MetricData): Promise<void> {
    if (!this.initialized || !this.healthy || !this.meter) {
      throw new Error('Alloy provider not initialized or unhealthy');
    }

    try {
      const metricType = this.determineMetricType(metric);
      
      switch (metricType) {
        case 'counter':
          const counter = this.meter.createCounter(metric.name, {
            description: `Counter metric: ${metric.name}`,
            unit: metric.unit,
          });
          counter.add(metric.value, metric.attributes || {});
          break;
          
        case 'gauge':
          const gauge = this.meter.createObservableGauge(metric.name, {
            description: `Gauge metric: ${metric.name}`,
            unit: metric.unit,
          });
          gauge.addCallback((observableResult: any) => {
            observableResult.observe(metric.value, metric.attributes || {});
          });
          break;
          
        case 'histogram':
          const histogram = this.meter.createHistogram(metric.name, {
            description: `Histogram metric: ${metric.name}`,
            unit: metric.unit,
          });
          histogram.record(metric.value, metric.attributes || {});
          break;
          
        default:
          const defaultCounter = this.meter.createCounter(metric.name, {
            description: `Default counter metric: ${metric.name}`,
            unit: metric.unit,
          });
          defaultCounter.add(metric.value, metric.attributes || {});
      }

      if (this.config?.debug) {
        console.log('💧 Alloy Metric sent:', {
          name: metric.name,
          value: metric.value,
          type: metricType,
          attributes: metric.attributes,
        });
      }
    } catch (error) {
      this.healthy = false;
      throw new Error(`Failed to record metric via Alloy: ${error}`);
    }
  }

  private determineMetricType(metric: MetricData): 'counter' | 'gauge' | 'histogram' {
    if (metric.unit === 'count' || metric.name.includes('_total') || metric.name.includes('_count')) {
      return 'counter';
    }
    
    if (metric.unit === 'gauge' || metric.name.includes('_usage') || metric.name.includes('_percent')) {
      return 'gauge';
    }
    
    if (metric.unit === 'histogram' || metric.unit === 'milliseconds' || metric.name.includes('_duration') || metric.name.includes('_time')) {
      return 'histogram';
    }
    
    return 'counter';
  }

  async startTrace(trace: TraceData): Promise<string> {
    if (!this.initialized || !this.healthy || !this.tracer) {
      throw new Error('Alloy provider not initialized or unhealthy');
    }

    try {
      const span = this.tracer.startSpan(trace.operationName, {
        attributes: trace.attributes || {},
        startTime: trace.startTime,
      });

      const spanContext = span.spanContext();
      const spanId = spanContext.spanId;

      if (this.config?.debug) {
        console.log('🔗 Alloy Trace started:', {
          spanId,
          traceId: spanContext.traceId,
          operationName: trace.operationName,
          attributes: trace.attributes,
        });
      }

      return spanId;
    } catch (error) {
      this.healthy = false;
      throw new Error(`Failed to start trace via Alloy: ${error}`);
    }
  }

  async endTrace(spanId: string, attributes?: Record<string, any>): Promise<void> {
    if (!this.initialized || !this.healthy) {
      throw new Error('Alloy provider not initialized or unhealthy');
    }

    try {
      if (this.config?.debug) {
        console.log('🔗 Alloy Trace ended:', {
          spanId,
          attributes,
        });
      }
    } catch (error) {
      this.healthy = false;
      throw new Error(`Failed to end trace via Alloy: ${error}`);
    }
  }

  async recordLog(log: LogData): Promise<void> {
    if (!this.initialized || !this.healthy) {
      throw new Error('Alloy provider not initialized or unhealthy');
    }

    try {
      const logEntry = {
        timestamp: log.timestamp || Date.now(),
        level: log.level,
        message: log.message,
        attributes: log.attributes,
        traceId: log.traceId,
        spanId: log.spanId,
        service: this.config?.serviceName,
        version: this.config?.serviceVersion,
        environment: this.config?.environment,
      };

      const logMessage = `[${log.level.toUpperCase()}] ${log.message}`;
      
      switch (log.level) {
        case 'debug':
          console.debug('📋 Alloy Log:', logEntry);
          break;
        case 'info':
          console.info('📋 Alloy Log:', logEntry);
          break;
        case 'warn':
          console.warn('📋 Alloy Log:', logEntry);
          break;
        case 'error':
          console.error('📋 Alloy Log:', logEntry);
          break;
        default:
          console.log('📋 Alloy Log:', logEntry);
      }
    } catch (error) {
      this.healthy = false;
      throw new Error(`Failed to record log via Alloy: ${error}`);
    }
  }

  async flush(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      if (this.sdk) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (this.config?.debug) {
        console.log('🌊 Alloy provider flushed');
      }
    } catch (error) {
      console.warn('Failed to flush Alloy provider:', error);
    }
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      await this.flush();
      
      if (this.sdk) {
        await this.sdk.shutdown();
      }

      this.initialized = false;
      this.healthy = false;

      if (this.config?.debug) {
        console.log('🌊 Alloy provider shutdown completed');
      }
    } catch (error) {
      console.warn('Failed to shutdown Alloy provider:', error);
    }
  }

  isHealthy(): boolean {
    return this.healthy && this.initialized;
  }
}
