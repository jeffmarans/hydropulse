import * as TelemetryLib from '../index';

describe('Telemetry Library Exports', () => {
  it('should export core services', () => {
    expect(TelemetryLib.TelemetryCore).toBeDefined();
    expect(TelemetryLib.MetricsService).toBeDefined();
    expect(TelemetryLib.TracesService).toBeDefined();
    expect(TelemetryLib.LogsService).toBeDefined();
  });

  it('should export providers', () => {
    expect(TelemetryLib.GrafanaProvider).toBeDefined();
    expect(TelemetryLib.OpenTelemetryProvider).toBeDefined();
  });

  it('should export NestJS adapters', () => {
    expect(TelemetryLib.TelemetryModule).toBeDefined();
    expect(TelemetryLib.TelemetryInterceptor).toBeDefined();
    expect(TelemetryLib.TrackMetric).toBeDefined();
    expect(TelemetryLib.TrackTrace).toBeDefined();
  });

  it('should export React adapters', () => {
    expect(TelemetryLib.ReactTelemetryProvider).toBeDefined();
    expect(TelemetryLib.useMetric).toBeDefined();
    expect(TelemetryLib.useTrace).toBeDefined();
    expect(TelemetryLib.useError).toBeDefined();
    expect(TelemetryLib.withTelemetry).toBeDefined();
  });

  it('should export all required components', () => {
    expect(typeof TelemetryLib).toBe('object');
    expect(Object.keys(TelemetryLib).length).toBeGreaterThan(0);
  });
});
