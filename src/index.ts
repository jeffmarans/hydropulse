export { TelemetryCore } from './core/telemetry.core';
export { MetricsService } from './core/metrics.service';
export { TracesService } from './core/traces.service';
export { LogsService } from './core/logs.service';

export { GrafanaProvider } from './providers/grafana/grafana.provider';
export { OpenTelemetryProvider } from './providers/opentelemetry/otel.provider';
export { AlloyProvider } from './providers/alloy/alloy.provider';

export { TelemetryModule } from './adapters/nestjs/telemetry.module';
export { TelemetryInterceptor } from './adapters/nestjs/telemetry.interceptor';
export { TrackMetric, TrackTrace } from './adapters/nestjs/telemetry.decorator';

export { TelemetryProvider as ReactTelemetryProvider } from './adapters/react/telemetry.provider';
export { useMetric, useTrace, useError } from './adapters/react/telemetry.hooks';
export { withTelemetry } from './adapters/react/telemetry.hoc';

export { loadHydropulseConfig, validateHydropulseEnvironment } from './config/env-loader';

export * from './interfaces/telemetry.interfaces';
