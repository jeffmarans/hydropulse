import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { TelemetryCore } from '../../core/telemetry.core';
import { TelemetryConfig } from '../../interfaces/telemetry.interfaces';

interface TelemetryContextValue {
  telemetryCore: TelemetryCore | null;
  isInitialized: boolean;
  error: string | null;
}

const TelemetryContext = createContext<TelemetryContextValue>({
  telemetryCore: null,
  isInitialized: false,
  error: null,
});

export interface TelemetryProviderProps {
  config: TelemetryConfig;
  children: ReactNode;
  onError?: (error: Error) => void;
  enableWebVitals?: boolean;
  enableUserInteractionTracking?: boolean;
}

export const TelemetryProvider: React.FC<TelemetryProviderProps> = ({
  config,
  children,
  onError,
  enableWebVitals = true,
  enableUserInteractionTracking = true,
}) => {
  const [telemetryCore, setTelemetryCore] = useState<TelemetryCore | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeTelemetry = async () => {
      try {
        const core = new TelemetryCore(config);
        await core.initialize();
        setTelemetryCore(core);
        setIsInitialized(true);
        setError(null);

        if (enableWebVitals) {
          setupWebVitalsTracking(core);
        }

        if (enableUserInteractionTracking) {
          setupUserInteractionTracking(core);
        }

        setupErrorBoundary(core, onError);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize telemetry';
        setError(errorMessage);
        onError?.(err instanceof Error ? err : new Error(errorMessage));
      }
    };

    initializeTelemetry();

    return () => {
      if (telemetryCore) {
        telemetryCore.shutdown().catch(console.warn);
      }
    };
  }, [config, onError, enableWebVitals, enableUserInteractionTracking]);

  const contextValue: TelemetryContextValue = {
    telemetryCore,
    isInitialized,
    error,
  };

  return (
    <TelemetryContext.Provider value={contextValue}>
      {children}
    </TelemetryContext.Provider>
  );
};

export const useTelemetryContext = (): TelemetryContextValue => {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetryContext must be used within a TelemetryProvider');
  }
  return context;
};

function setupWebVitalsTracking(telemetryCore: TelemetryCore) {
  if (typeof window === 'undefined') return;

  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'navigation') {
        const navEntry = entry as PerformanceNavigationTiming;
        telemetryCore.metrics.recordWebVitals('TTFB', navEntry.responseStart - navEntry.requestStart);
        telemetryCore.metrics.recordWebVitals('FCP', navEntry.domContentLoadedEventEnd - navEntry.fetchStart);
        telemetryCore.metrics.recordWebVitals('LCP', navEntry.loadEventEnd - navEntry.fetchStart);
      }

      if (entry.entryType === 'paint') {
        const paintEntry = entry as PerformancePaintTiming;
        if (paintEntry.name === 'first-contentful-paint') {
          telemetryCore.metrics.recordWebVitals('FCP', paintEntry.startTime);
        }
      }

      if (entry.entryType === 'largest-contentful-paint') {
        const lcpEntry = entry as any;
        telemetryCore.metrics.recordWebVitals('LCP', lcpEntry.startTime);
      }
    }
  });

  try {
    observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
  } catch (error) {
    console.warn('Failed to setup web vitals tracking:', error);
  }

  let clsValue = 0;
  let clsEntries: any[] = [];

  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) {
        const firstSessionEntry = clsEntries[0];
        const lastSessionEntry = clsEntries[clsEntries.length - 1];

        if (!firstSessionEntry || entry.startTime - lastSessionEntry.startTime < 1000) {
          clsEntries.push(entry);
        } else {
          clsValue += clsEntries.reduce((sum, e) => sum + (e as any).value, 0);
          telemetryCore.metrics.recordWebVitals('CLS', clsValue);
          clsEntries = [entry];
        }
      }
    }
  });

  try {
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  } catch (error) {
    console.warn('Failed to setup CLS tracking:', error);
  }
}

function setupUserInteractionTracking(telemetryCore: TelemetryCore) {
  if (typeof window === 'undefined') return;

  const trackInteraction = (event: Event) => {
    const target = event.target as HTMLElement;
    const tagName = target.tagName.toLowerCase();
    const className = target.className;
    const id = target.id;

    telemetryCore.metrics.recordUserInteraction(
      event.type,
      tagName,
      {
        tag_name: tagName,
        class_name: className,
        element_id: id,
        timestamp: Date.now(),
      }
    );
  };

  ['click', 'submit', 'change', 'focus', 'blur'].forEach(eventType => {
    document.addEventListener(eventType, trackInteraction, { passive: true });
  });
}

function setupErrorBoundary(telemetryCore: TelemetryCore, onError?: (error: Error) => void) {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    telemetryCore.logs.logComponentError(
      'Global Error',
      event.error || new Error(event.message),
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    );
    onError?.(event.error || new Error(event.message));
  });

  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
    telemetryCore.logs.logComponentError(
      'Unhandled Promise Rejection',
      error
    );
    onError?.(error);
  });
}
