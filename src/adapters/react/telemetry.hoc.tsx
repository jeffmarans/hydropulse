import React, { Component, ComponentType, ErrorInfo, ReactNode } from 'react';
import { useTelemetryContext } from './telemetry.provider';
import { useComponentTelemetry } from './telemetry.hooks';

export interface WithTelemetryOptions {
  componentName?: string;
  trackProps?: boolean;
  trackState?: boolean;
  trackErrors?: boolean;
  trackPerformance?: boolean;
}

export function withTelemetry<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: WithTelemetryOptions = {}
) {
  const {
    componentName = WrappedComponent.displayName || WrappedComponent.name || 'UnknownComponent',
    trackProps = false,
    trackState = false,
    trackErrors = true,
    trackPerformance = true,
  } = options;

  const TelemetryWrapper: React.FC<P> = (props) => {
    const { telemetryCore, isInitialized } = useTelemetryContext();
    const { trackUserAction } = useComponentTelemetry(componentName);

    React.useEffect(() => {
      if (!isInitialized || !telemetryCore || !trackProps) return;

      telemetryCore.logs.info(`Component ${componentName} props updated`, {
        component: componentName,
        props_count: Object.keys(props).length,
        props_keys: Object.keys(props),
      });
    }, [props, telemetryCore, isInitialized]);

    const enhancedProps = {
      ...props,
      trackUserAction,
    } as P & { trackUserAction: typeof trackUserAction };

    if (trackErrors) {
      return (
        <TelemetryErrorBoundary componentName={componentName}>
          <WrappedComponent {...enhancedProps} />
        </TelemetryErrorBoundary>
      );
    }

    return <WrappedComponent {...enhancedProps} />;
  };

  TelemetryWrapper.displayName = `withTelemetry(${componentName})`;

  return TelemetryWrapper;
}

interface TelemetryErrorBoundaryProps {
  componentName: string;
  children: ReactNode;
}

interface TelemetryErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class TelemetryErrorBoundary extends Component<
  TelemetryErrorBoundaryProps,
  TelemetryErrorBoundaryState
> {
  constructor(props: TelemetryErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): TelemetryErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    const telemetryErrorEvent = new CustomEvent('telemetry-error', {
      detail: {
        componentName: this.props.componentName,
        error,
        errorInfo,
      },
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(telemetryErrorEvent);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', border: '1px solid red', borderRadius: '4px' }}>
          <h3>Something went wrong in {this.props.componentName}</h3>
          <details>
            <summary>Error details</summary>
            <pre>{this.state.error?.message}</pre>
            <pre>{this.state.error?.stack}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export interface TelemetryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  telemetryAction?: string;
  telemetryMetadata?: Record<string, any>;
}

export const TelemetryButton: React.FC<TelemetryButtonProps> = ({
  telemetryAction,
  telemetryMetadata,
  onClick,
  children,
  ...props
}) => {
  const { telemetryCore, isInitialized } = useTelemetryContext();

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isInitialized && telemetryCore && telemetryAction) {
      try {
        await telemetryCore.logs.logUserAction(
          telemetryAction,
          'TelemetryButton',
          undefined,
          telemetryMetadata
        );
        await telemetryCore.metrics.recordUserInteraction(
          telemetryAction,
          'TelemetryButton',
          telemetryMetadata
        );
      } catch (error) {
        console.error('Failed to track button click:', error);
      }
    }

    onClick?.(event);
  };

  return (
    <button {...props} onClick={handleClick}>
      {children}
    </button>
  );
};

export interface TelemetryFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  telemetryFormName: string;
  telemetryMetadata?: Record<string, any>;
}

export const TelemetryForm: React.FC<TelemetryFormProps> = ({
  telemetryFormName,
  telemetryMetadata,
  onSubmit,
  children,
  ...props
}) => {
  const { telemetryCore, isInitialized } = useTelemetryContext();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    if (isInitialized && telemetryCore) {
      const formData = new FormData(event.currentTarget);
      const formFields = Array.from((formData as any).keys());

      try {
        await telemetryCore.logs.logUserAction(
          'form_submit',
          'TelemetryForm',
          undefined,
          {
            form_name: telemetryFormName,
            field_count: formFields.length,
            fields: formFields,
            ...telemetryMetadata,
          }
        );
        await telemetryCore.metrics.recordUserInteraction(
          'form_submit',
          'TelemetryForm',
          {
            form_name: telemetryFormName,
            field_count: formFields.length,
            ...telemetryMetadata,
          }
        );
      } catch (error) {
        console.error('Failed to track form submission:', error);
      }
    }

    onSubmit?.(event);
  };

  return (
    <form {...props} onSubmit={handleSubmit}>
      {children}
    </form>
  );
};
