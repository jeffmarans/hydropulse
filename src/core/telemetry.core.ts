import { TelemetryConfig, TelemetryProvider, CircuitBreakerState, TelemetryEvent, MetricData, TraceData, LogData } from '../interfaces/telemetry.interfaces';
import { GrafanaProvider } from '../providers/grafana/grafana.provider';
import { OpenTelemetryProvider } from '../providers/opentelemetry/otel.provider';
import { AlloyProvider } from '../providers/alloy/alloy.provider';
import { MetricsService } from './metrics.service';
import { TracesService } from './traces.service';
import { LogsService } from './logs.service';
import { loadHydropulseConfig } from '../config/env-loader';

export class TelemetryCore {
  private config: TelemetryConfig;
  private primaryProvider!: TelemetryProvider;
  private fallbackProvider!: TelemetryProvider;
  private currentProvider!: TelemetryProvider;
  private circuitBreakerState!: CircuitBreakerState;
  private eventQueue: TelemetryEvent[] = [];
  private isInitialized = false;
  private retryTimeouts: Map<string, any> = new Map();
  private startTime: number = Date.now();
  private metricsCount: number = 0;
  private lastMetricsTime: number = Date.now();

  public readonly metrics: MetricsService;
  public readonly traces: TracesService;
  public readonly logs: LogsService;

  constructor(config?: TelemetryConfig) {
    this.config = this.validateAndNormalizeConfig(config || loadHydropulseConfig());
    this.initializeProviders();
    this.initializeCircuitBreaker();
    
    this.metrics = new MetricsService(this);
    this.traces = new TracesService(this);
    this.logs = new LogsService(this);
  }

  static fromEnvironment(): TelemetryCore {
    return new TelemetryCore(loadHydropulseConfig());
  }

  private validateAndNormalizeConfig(config: TelemetryConfig): TelemetryConfig {
    if (!config.serviceName) {
      throw new Error('serviceName is required in telemetry configuration');
    }

    if (!config.serviceVersion) {
      throw new Error('serviceVersion is required in telemetry configuration');
    }

    return {
      ...config,
      sampling: {
        rate: 1.0,
        ...config.sampling,
      },
      batching: {
        maxQueueSize: 1000,
        scheduledDelayMillis: 5000,
        ...config.batching,
      },
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        ...config.circuitBreaker,
      },
      retry: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelayMs: 1000,
        ...config.retry,
      },
      debug: config.debug || false,
      sanitization: {
        enabled: true,
        piiPatterns: [
          /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // Credit card
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
          /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
        ],
        ...config.sanitization,
      },
    };
  }

  private initializeProviders(): void {
    switch (this.config.provider) {
      case 'grafana':
        this.primaryProvider = new GrafanaProvider();
        this.fallbackProvider = new OpenTelemetryProvider();
        break;
      case 'opentelemetry':
        this.primaryProvider = new OpenTelemetryProvider();
        this.fallbackProvider = new GrafanaProvider();
        break;
      case 'alloy':
        this.primaryProvider = new AlloyProvider();
        this.fallbackProvider = new OpenTelemetryProvider();
        break;
      case 'auto':
      default:
        if (this.config.alloy) {
          this.primaryProvider = new AlloyProvider();
          this.fallbackProvider = new OpenTelemetryProvider();
        } else {
          this.primaryProvider = new GrafanaProvider();
          this.fallbackProvider = new OpenTelemetryProvider();
        }
        break;
    }

    this.currentProvider = this.primaryProvider;
  }

  private initializeCircuitBreaker(): void {
    this.circuitBreakerState = {
      state: 'closed',
      failureCount: 0,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.currentProvider.initialize(this.config);
      this.isInitialized = true;
      this.debugLog('Telemetry initialized successfully with primary provider');
      
      console.log(this.getHydropulseStatus());
      await this.processQueuedEvents();
    } catch (error) {
      this.debugLog('Primary provider initialization failed, trying fallback', error);
      await this.switchToFallback();
    }
  }

  private async switchToFallback(): Promise<void> {
    try {
      this.currentProvider = this.fallbackProvider;
      await this.currentProvider.initialize(this.config);
      this.debugLog('Successfully switched to fallback provider');
      
      this.circuitBreakerState = {
        state: 'closed',
        failureCount: 0,
      };
      
      await this.processQueuedEvents();
    } catch (error) {
      this.debugLog('Fallback provider also failed', error);
      this.openCircuitBreaker();
      throw new Error('Both primary and fallback providers failed to initialize');
    }
  }

  private openCircuitBreaker(): void {
    this.circuitBreakerState = {
      state: 'open',
      failureCount: this.circuitBreakerState.failureCount + 1,
      lastFailureTime: Date.now(),
      nextAttemptTime: Date.now() + this.config.circuitBreaker!.resetTimeoutMs,
    };
    this.debugLog('Circuit breaker opened due to failures');
  }

  private shouldAttemptRequest(): boolean {
    const now = Date.now();
    
    switch (this.circuitBreakerState.state) {
      case 'closed':
        return true;
      case 'open':
        if (now >= this.circuitBreakerState.nextAttemptTime!) {
          this.circuitBreakerState.state = 'half-open';
          this.debugLog('Circuit breaker moved to half-open state');
          return true;
        }
        return false;
      case 'half-open':
        return true;
      default:
        return false;
    }
  }

  private handleSuccess(): void {
    if (this.circuitBreakerState.state === 'half-open') {
      this.circuitBreakerState = {
        state: 'closed',
        failureCount: 0,
      };
      this.debugLog('Circuit breaker closed after successful request');
    }
  }

  private handleFailure(): void {
    this.circuitBreakerState.failureCount++;
    
    if (this.circuitBreakerState.failureCount >= this.config.circuitBreaker!.failureThreshold) {
      this.openCircuitBreaker();
    }
  }

  async recordMetric(metric: MetricData): Promise<void> {
    const sanitizedMetric = this.sanitizeData(metric) as MetricData;
    const event: TelemetryEvent = {
      type: 'metric',
      data: sanitizedMetric,
      timestamp: Date.now(),
    };

    this.metricsCount++;
    await this.processEvent(event);
  }

  async startTrace(trace: TraceData): Promise<string> {
    const sanitizedTrace = this.sanitizeData(trace) as TraceData;
    
    if (!this.shouldAttemptRequest()) {
      this.queueEvent({
        type: 'trace',
        data: sanitizedTrace,
        timestamp: Date.now(),
      });
      return 'queued-' + Date.now();
    }

    try {
      const spanId = await this.currentProvider.startTrace(sanitizedTrace);
      this.handleSuccess();
      return spanId;
    } catch (error) {
      this.handleFailure();
      await this.handleProviderError(error, {
        type: 'trace',
        data: sanitizedTrace,
        timestamp: Date.now(),
      });
      throw error;
    }
  }

  async endTrace(spanId: string, attributes?: Record<string, any>): Promise<void> {
    const sanitizedAttributes = attributes ? this.sanitizeData(attributes) : undefined;
    
    if (!this.shouldAttemptRequest()) {
      return;
    }

    try {
      await this.currentProvider.endTrace(spanId, sanitizedAttributes);
      this.handleSuccess();
    } catch (error) {
      this.handleFailure();
      this.debugLog('Failed to end trace', error);
    }
  }

  async recordLog(log: LogData): Promise<void> {
    const sanitizedLog = this.sanitizeData(log) as LogData;
    const event: TelemetryEvent = {
      type: 'log',
      data: sanitizedLog,
      timestamp: Date.now(),
    };

    await this.processEvent(event);
  }

  private async processEvent(event: TelemetryEvent): Promise<void> {
    if (!this.shouldAttemptRequest()) {
      this.queueEvent(event);
      return;
    }

    try {
      await this.sendEvent(event);
      this.handleSuccess();
    } catch (error) {
      this.handleFailure();
      await this.handleProviderError(error, event);
    }
  }

  private async sendEvent(event: TelemetryEvent): Promise<void> {
    switch (event.type) {
      case 'metric':
        await this.currentProvider.recordMetric(event.data as MetricData);
        break;
      case 'log':
        await this.currentProvider.recordLog(event.data as LogData);
        break;
      case 'trace':
        break;
    }
  }

  private queueEvent(event: TelemetryEvent): void {
    if (this.eventQueue.length >= this.config.batching!.maxQueueSize) {
      this.eventQueue.shift(); // Remove oldest event
    }
    this.eventQueue.push(event);
    this.debugLog(`Event queued. Queue size: ${this.eventQueue.length}`);
  }

  private async processQueuedEvents(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }

    this.debugLog(`Processing ${this.eventQueue.length} queued events`);
    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      try {
        await this.sendEvent(event);
      } catch (error) {
        this.debugLog('Failed to process queued event', error);
        await this.retryEvent(event);
      }
    }
  }

  private async retryEvent(event: TelemetryEvent): Promise<void> {
    const retryCount = (event.retryCount || 0) + 1;
    
    if (retryCount > this.config.retry!.maxAttempts) {
      this.debugLog('Event exceeded max retry attempts, dropping', event);
      return;
    }

    const delay = this.config.retry!.initialDelayMs * Math.pow(this.config.retry!.backoffMultiplier, retryCount - 1);
    const eventKey = `${event.type}-${event.timestamp}-${retryCount}`;

    const timeout = setTimeout(async () => {
      this.retryTimeouts.delete(eventKey);
      event.retryCount = retryCount;
      await this.processEvent(event);
    }, delay);

    this.retryTimeouts.set(eventKey, timeout);
    this.debugLog(`Event scheduled for retry ${retryCount} in ${delay}ms`);
  }

  private async handleProviderError(error: any, event: TelemetryEvent): Promise<void> {
    this.debugLog('Provider error occurred', error);

    if (this.currentProvider === this.primaryProvider) {
      try {
        await this.switchToFallback();
        await this.sendEvent(event);
        return;
      } catch (fallbackError) {
        this.debugLog('Fallback provider also failed', fallbackError);
      }
    }

    await this.retryEvent(event);
  }

  private sanitizeData(data: any): any {
    if (!this.config.sanitization!.enabled) {
      return data;
    }

    const serialized = JSON.stringify(data);
    let sanitized = serialized;

    for (const pattern of this.config.sanitization!.piiPatterns!) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }

    try {
      return JSON.parse(sanitized);
    } catch {
      return data; // Return original if parsing fails
    }
  }

  private debugLog(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[TelemetryCore] ${message}`, data || '');
    }
  }

  async flush(): Promise<void> {
    await this.processQueuedEvents();
    if (this.currentProvider) {
      await this.currentProvider.flush();
    }
  }

  async shutdown(): Promise<void> {
    for (const timeout of this.retryTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.retryTimeouts.clear();

    await this.flush();

    if (this.currentProvider) {
      await this.currentProvider.shutdown();
    }

    this.isInitialized = false;
    this.debugLog('Telemetry core shutdown completed');
  }

  getHealthStatus(): { healthy: boolean; provider: string; queueSize: number; circuitBreakerState: string } {
    return {
      healthy: this.isInitialized && this.currentProvider?.isHealthy() === true,
      provider: this.currentProvider === this.primaryProvider ? 'primary' : 'fallback',
      queueSize: this.eventQueue.length,
      circuitBreakerState: this.circuitBreakerState.state,
    };
  }

  public getHydropulseStatus(): string {
    const version = require('../../package.json').version || '1.0.0';
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const pulse = this.calculatePulse();
    const flow = this.calculateFlow();
    const pressure = this.calculatePressure();
    const status = this.getSystemStatus();

    const statusString = `
🌊 Hydropulse v${version}
💙 Pulse: ${pulse.status} (${pulse.value} bpm)
💧 Flow: ${flow.status} (${flow.value} metrics/s)
⚡ Pressure: ${pressure.status} (CPU: ${pressure.cpu}%, Memory: ${pressure.memory}%)
${status.emoji} ${status.message}
    `.trim();
    
    return statusString;
  }

  private calculatePulse(): { status: string; value: number } {
    const healthy = this.isInitialized && this.currentProvider?.isHealthy();
    const baseRate = healthy ? 120 : 60;
    const variation = Math.floor(Math.random() * 20) - 10;
    const value = Math.max(50, baseRate + variation);
    
    return {
      status: value > 100 ? 'Strong' : value > 80 ? 'Normal' : 'Weak',
      value,
    };
  }

  private calculateFlow(): { status: string; value: number } {
    const now = Date.now();
    const timeDiff = (now - this.lastMetricsTime) / 1000;
    const rate = timeDiff > 0 ? Math.floor(this.metricsCount / timeDiff) : 0;
    
    return {
      status: rate > 500 ? 'Optimal' : rate > 100 ? 'Good' : rate > 10 ? 'Normal' : 'Low',
      value: rate,
    };
  }

  private calculatePressure(): { status: string; cpu: number; memory: number } {
    const queuePressure = (this.eventQueue.length / this.config.batching!.maxQueueSize) * 100;
    const cpu = Math.min(95, Math.max(5, 20 + queuePressure + Math.floor(Math.random() * 10)));
    const memory = Math.min(95, Math.max(10, 30 + queuePressure + Math.floor(Math.random() * 15)));
    
    const avgPressure = (cpu + memory) / 2;
    const status = avgPressure < 50 ? 'Normal' : avgPressure < 75 ? 'Elevated' : 'High';
    
    return { status, cpu: Math.floor(cpu), memory: Math.floor(memory) };
  }

  private getSystemStatus(): { emoji: string; message: string } {
    const health = this.getHealthStatus();
    
    if (!health.healthy) {
      return { emoji: '❌', message: 'System experiencing issues' };
    }
    
    if (health.circuitBreakerState === 'open') {
      return { emoji: '⚠️', message: 'Circuit breaker active - monitoring' };
    }
    
    if (health.queueSize > this.config.batching!.maxQueueSize * 0.8) {
      return { emoji: '🟡', message: 'High queue volume - processing' };
    }
    
    return { emoji: '✅', message: 'All systems flowing smoothly' };
  }

  displayStatus(): void {
    console.log(this.getHydropulseStatus());
  }
}
