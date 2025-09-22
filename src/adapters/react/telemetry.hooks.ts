import { useCallback, useEffect, useRef } from 'react';
import { useTelemetryContext } from './telemetry.provider';

export function useMetric() {
  const { telemetryCore, isInitialized } = useTelemetryContext();

  const recordMetric = useCallback(
    async (name: string, value: number, attributes?: Record<string, any>) => {
      if (!isInitialized || !telemetryCore) {
        console.warn('Telemetry not initialized, metric not recorded');
        return;
      }

      try {
        await telemetryCore.metrics.counter(name, value, attributes);
      } catch (error) {
        console.error('Failed to record metric:', error);
      }
    },
    [telemetryCore, isInitialized]
  );

  const recordGauge = useCallback(
    async (name: string, value: number, attributes?: Record<string, any>) => {
      if (!isInitialized || !telemetryCore) {
        console.warn('Telemetry not initialized, gauge not recorded');
        return;
      }

      try {
        await telemetryCore.metrics.gauge(name, value, attributes);
      } catch (error) {
        console.error('Failed to record gauge:', error);
      }
    },
    [telemetryCore, isInitialized]
  );

  const recordTiming = useCallback(
    async (name: string, durationMs: number, attributes?: Record<string, any>) => {
      if (!isInitialized || !telemetryCore) {
        console.warn('Telemetry not initialized, timing not recorded');
        return;
      }

      try {
        await telemetryCore.metrics.timing(name, durationMs, attributes);
      } catch (error) {
        console.error('Failed to record timing:', error);
      }
    },
    [telemetryCore, isInitialized]
  );

  const increment = useCallback(
    async (name: string, attributes?: Record<string, any>) => {
      await recordMetric(name, 1, attributes);
    },
    [recordMetric]
  );

  const decrement = useCallback(
    async (name: string, attributes?: Record<string, any>) => {
      await recordMetric(name, -1, attributes);
    },
    [recordMetric]
  );

  return {
    recordMetric,
    recordGauge,
    recordTiming,
    increment,
    decrement,
    isInitialized,
  };
}

export function useTrace() {
  const { telemetryCore, isInitialized } = useTelemetryContext();

  const startTrace = useCallback(
    async (operationName: string, attributes?: Record<string, any>) => {
      if (!isInitialized || !telemetryCore) {
        console.warn('Telemetry not initialized, trace not started');
        return null;
      }

      try {
        return await telemetryCore.traces.startSpan(operationName, attributes);
      } catch (error) {
        console.error('Failed to start trace:', error);
        return null;
      }
    },
    [telemetryCore, isInitialized]
  );

  const endTrace = useCallback(
    async (spanId: string, attributes?: Record<string, any>, error?: Error) => {
      if (!isInitialized || !telemetryCore) {
        console.warn('Telemetry not initialized, trace not ended');
        return;
      }

      try {
        await telemetryCore.traces.finishSpan(spanId, attributes, error);
      } catch (err) {
        console.error('Failed to end trace:', err);
      }
    },
    [telemetryCore, isInitialized]
  );

  const recordTrace = useCallback(
    async <T>(
      operationName: string,
      fn: () => Promise<T>,
      attributes?: Record<string, any>
    ): Promise<T> => {
      if (!isInitialized || !telemetryCore) {
        console.warn('Telemetry not initialized, executing function without tracing');
        return await fn();
      }

      try {
        return await telemetryCore.traces.recordSpan(operationName, fn, attributes);
      } catch (error) {
        console.error('Failed to record trace:', error);
        throw error;
      }
    },
    [telemetryCore, isInitialized]
  );

  return {
    startTrace,
    endTrace,
    recordTrace,
    isInitialized,
  };
}

export function useError() {
  const { telemetryCore, isInitialized } = useTelemetryContext();

  const logError = useCallback(
    async (error: Error, context?: {
      component?: string;
      operation?: string;
      userId?: string;
      additionalData?: Record<string, any>;
    }) => {
      if (!isInitialized || !telemetryCore) {
        console.warn('Telemetry not initialized, error not logged');
        return;
      }

      try {
        await telemetryCore.logs.logErrorWithContext(error, {
          operation: context?.operation || 'React Component',
          userId: context?.userId,
          additionalData: {
            component: context?.component,
            ...context?.additionalData,
          },
        });
      } catch (err) {
        console.error('Failed to log error:', err);
      }
    },
    [telemetryCore, isInitialized]
  );

  const logComponentError = useCallback(
    async (
      componentName: string,
      error: Error,
      props?: Record<string, any>,
      state?: Record<string, any>
    ) => {
      if (!isInitialized || !telemetryCore) {
        console.warn('Telemetry not initialized, component error not logged');
        return;
      }

      try {
        await telemetryCore.logs.logComponentError(componentName, error, props, state);
      } catch (err) {
        console.error('Failed to log component error:', err);
      }
    },
    [telemetryCore, isInitialized]
  );

  return {
    logError,
    logComponentError,
    isInitialized,
  };
}

export function useComponentTelemetry(componentName: string) {
  const { telemetryCore, isInitialized } = useTelemetryContext();
  const mountTimeRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);

  useEffect(() => {
    if (!isInitialized || !telemetryCore) return;

    const mountTime = Date.now();
    mountTimeRef.current = mountTime;

    telemetryCore.metrics.recordComponentRender(
      componentName,
      0,
      { lifecycle: 'mount' }
    );

    telemetryCore.logs.info(`Component ${componentName} mounted`, {
      component: componentName,
      mount_time: mountTime,
    });

    return () => {
      const unmountTime = Date.now();
      const totalMountDuration = unmountTime - mountTimeRef.current;

      telemetryCore.metrics.recordComponentRender(
        componentName,
        totalMountDuration,
        { 
          lifecycle: 'unmount',
          total_render_count: renderCountRef.current,
        }
      );

      telemetryCore.logs.info(`Component ${componentName} unmounted`, {
        component: componentName,
        unmount_time: unmountTime,
        total_mount_duration: totalMountDuration,
        total_render_count: renderCountRef.current,
      });
    };
  }, [componentName, telemetryCore, isInitialized]);

  useEffect(() => {
    if (!isInitialized || !telemetryCore) return;

    renderCountRef.current += 1;
    const renderStartTime = performance.now();

    requestAnimationFrame(() => {
      const renderEndTime = performance.now();
      const renderDuration = renderEndTime - renderStartTime;

      telemetryCore.metrics.recordComponentRender(
        componentName,
        renderDuration,
        { 
          lifecycle: 'render',
          render_count: renderCountRef.current,
        }
      );
    });
  });

  const trackUserAction = useCallback(
    async (action: string, metadata?: Record<string, any>) => {
      if (!isInitialized || !telemetryCore) return;

      try {
        await telemetryCore.logs.logUserAction(action, componentName, undefined, metadata);
        await telemetryCore.metrics.recordUserInteraction(action, componentName, metadata);
      } catch (error) {
        console.error('Failed to track user action:', error);
      }
    },
    [componentName, telemetryCore, isInitialized]
  );

  return {
    trackUserAction,
    renderCount: renderCountRef.current,
    isInitialized,
  };
}
