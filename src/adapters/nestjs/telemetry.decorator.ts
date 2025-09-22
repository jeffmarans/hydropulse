import { SetMetadata } from '@nestjs/common';
import { TelemetryCore } from '../../core/telemetry.core';

export const TRACK_METRIC_KEY = 'track_metric';
export const TRACK_TRACE_KEY = 'track_trace';

export interface TrackMetricOptions {
  name: string;
  value?: number;
  unit?: string;
  attributes?: Record<string, any>;
}

export interface TrackTraceOptions {
  operationName: string;
  attributes?: Record<string, any>;
}

export const TrackMetric = (options: TrackMetricOptions) =>
  SetMetadata(TRACK_METRIC_KEY, options);

export const TrackTrace = (options: TrackTraceOptions) =>
  SetMetadata(TRACK_TRACE_KEY, options);

export function createMethodDecorator(telemetryCore: TelemetryCore) {
  return function MethodTelemetry(
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const className = target.constructor.name;
      const operationName = `${className}.${propertyName}`;
      
      return await telemetryCore.traces.recordSpan(
        operationName,
        async () => {
          const startTime = Date.now();
          try {
            const result = await method.apply(this, args);
            const endTime = Date.now();
            
            await telemetryCore.metrics.timing(
              `method_execution_time`,
              endTime - startTime,
              {
                class: className,
                method: propertyName,
                success: true,
              }
            );
            
            return result;
          } catch (error) {
            const endTime = Date.now();
            
            await telemetryCore.metrics.timing(
              `method_execution_time`,
              endTime - startTime,
              {
                class: className,
                method: propertyName,
                success: false,
              }
            );
            
            await telemetryCore.logs.logErrorWithContext(error as Error, {
              operation: operationName,
              additionalData: {
                class: className,
                method: propertyName,
                args_count: args.length,
              },
            });
            
            throw error;
          }
        },
        {
          class: className,
          method: propertyName,
        }
      );
    };

    return descriptor;
  };
}

export function Telemetry(telemetryCore: TelemetryCore) {
  return createMethodDecorator(telemetryCore);
}

export function BusinessMetric(name: string, category?: string) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      let success = true;
      let error: Error | undefined;

      try {
        const result = await method.apply(this, args);
        return result;
      } catch (err) {
        success = false;
        error = err as Error;
        throw err;
      } finally {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const telemetryCore = (this as any).telemetryCore as TelemetryCore;
        if (telemetryCore) {
          await telemetryCore.metrics.recordBusinessMetric(
            name,
            success ? 1 : 0,
            category,
            {
              method: propertyName,
              class: target.constructor.name,
              duration_ms: duration,
              success,
            }
          );

          await telemetryCore.logs.logBusinessEvent(
            name,
            category || 'default',
            success,
            {
              method: propertyName,
              class: target.constructor.name,
              duration_ms: duration,
              error_message: error?.message,
            }
          );
        }
      }
    };

    return descriptor;
  };
}
