import React, { useState } from 'react';
import { useError, useMetric, useTrace } from 'hydropulse';

interface ErrorLog {
  timestamp: string;
  type: string;
  message: string;
  stack?: string;
}

const ErrorTesting: React.FC = () => {
  const { logError, logComponentError } = useError();
  const { recordMetric } = useMetric();
  const { startTrace, endTrace } = useTrace();
  
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const addErrorLog = (type: string, message: string, stack?: string) => {
    const errorLog: ErrorLog = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      stack,
    };
    
    setErrorLogs(prev => [errorLog, ...prev.slice(0, 9)]); // Keep last 10 errors
  };

  const simulateJavaScriptError = () => {
    const traceId = startTrace('simulate_js_error', {
      error_type: 'javascript_error',
    });

    try {
      (window as any).nonExistentFunction();
    } catch (error) {
      const err = error as Error;
      logError(err, {
        error_source: 'manual_simulation',
        component: 'ErrorTesting',
        action: 'simulate_js_error',
      });
      
      recordMetric('simulated_error', 1, 'count', {
        error_type: 'javascript_error',
        error_name: err.name,
      });
      
      addErrorLog('JavaScript Error', err.message, err.stack);
      
      endTrace(traceId, {
        success: false,
        error_type: 'javascript_error',
        error_message: err.message,
      });
    }
  };

  const simulateNetworkError = async () => {
    const traceId = startTrace('simulate_network_error', {
      error_type: 'network_error',
    });

    setIsProcessing(true);
    
    try {
      const response = await fetch('https://httpstat.us/500', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      const err = error as Error;
      logError(err, {
        error_source: 'network_request',
        component: 'ErrorTesting',
        action: 'simulate_network_error',
        url: 'https://httpstat.us/500',
      });
      
      recordMetric('simulated_error', 1, 'count', {
        error_type: 'network_error',
        error_name: err.name,
      });
      
      addErrorLog('Network Error', err.message);
      
      endTrace(traceId, {
        success: false,
        error_type: 'network_error',
        error_message: err.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateAsyncError = async () => {
    const traceId = startTrace('simulate_async_error', {
      error_type: 'async_error',
    });

    setIsProcessing(true);
    
    try {
      await new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Simulated async operation failed'));
        }, 1000);
      });
    } catch (error) {
      const err = error as Error;
      logError(err, {
        error_source: 'async_operation',
        component: 'ErrorTesting',
        action: 'simulate_async_error',
        operation_type: 'promise_rejection',
      });
      
      recordMetric('simulated_error', 1, 'count', {
        error_type: 'async_error',
        error_name: err.name,
      });
      
      addErrorLog('Async Error', err.message);
      
      endTrace(traceId, {
        success: false,
        error_type: 'async_error',
        error_message: err.message,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const simulateComponentError = () => {
    const traceId = startTrace('simulate_component_error', {
      error_type: 'component_error',
    });

    try {
      const error = new Error('Simulated component rendering error');
      
      logComponentError('ErrorTesting', error, {
        error_source: 'component_simulation',
        render_phase: 'manual_trigger',
        component_props: JSON.stringify({}),
      });
      
      recordMetric('simulated_error', 1, 'count', {
        error_type: 'component_error',
        error_name: error.name,
      });
      
      addErrorLog('Component Error', error.message, error.stack);
      
      endTrace(traceId, {
        success: false,
        error_type: 'component_error',
        error_message: error.message,
      });
    } catch (error) {
      console.error('Failed to simulate component error:', error);
    }
  };

  const simulateValidationError = () => {
    const traceId = startTrace('simulate_validation_error', {
      error_type: 'validation_error',
    });

    try {
      const validationError = new Error('Invalid input: Email format is incorrect');
      validationError.name = 'ValidationError';
      
      logError(validationError, {
        error_source: 'form_validation',
        component: 'ErrorTesting',
        action: 'simulate_validation_error',
        field_name: 'email',
        field_value: 'invalid-email-format',
      });
      
      recordMetric('simulated_error', 1, 'count', {
        error_type: 'validation_error',
        error_name: validationError.name,
      });
      
      addErrorLog('Validation Error', validationError.message);
      
      endTrace(traceId, {
        success: false,
        error_type: 'validation_error',
        error_message: validationError.message,
      });
    } catch (error) {
      console.error('Failed to simulate validation error:', error);
    }
  };

  const clearErrorLogs = () => {
    setErrorLogs([]);
    recordMetric('error_logs_cleared', 1, 'count', {
      cleared_count: errorLogs.length,
    });
  };

  return (
    <div>
      <div className="card">
        <h2>Error Simulation</h2>
        <p>Test different types of errors to see how they are captured and reported by the telemetry system.</p>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
          <button
            onClick={simulateJavaScriptError}
            className="button danger"
            disabled={isProcessing}
          >
            JavaScript Error
          </button>
          
          <button
            onClick={simulateNetworkError}
            className="button danger"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Network Error'}
          </button>
          
          <button
            onClick={simulateAsyncError}
            className="button danger"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Async Error'}
          </button>
          
          <button
            onClick={simulateComponentError}
            className="button danger"
            disabled={isProcessing}
          >
            Component Error
          </button>
          
          <button
            onClick={simulateValidationError}
            className="button danger"
            disabled={isProcessing}
          >
            Validation Error
          </button>
          
          {errorLogs.length > 0 && (
            <button
              onClick={clearErrorLogs}
              className="button"
            >
              Clear Logs ({errorLogs.length})
            </button>
          )}
        </div>
        
        {isProcessing && (
          <div style={{ textAlign: 'center', margin: '1rem 0' }}>
            <div className="loading"></div>
            <p>Processing error simulation...</p>
          </div>
        )}
      </div>

      {errorLogs.length > 0 && (
        <div className="card">
          <h2>Error Logs</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {errorLogs.map((errorLog, index) => (
              <div key={index} className="log-entry error">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <strong>{errorLog.type}</strong>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{errorLog.timestamp}</span>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>
                  {errorLog.message}
                </div>
                {errorLog.stack && (
                  <details style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    <summary>Stack Trace</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                      {errorLog.stack}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h2>Error Handling Best Practices</h2>
        <div style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
          <h3>What gets tracked:</h3>
          <ul>
            <li><strong>JavaScript Errors:</strong> Runtime errors, reference errors, type errors</li>
            <li><strong>Network Errors:</strong> Failed API calls, timeout errors, connection issues</li>
            <li><strong>Async Errors:</strong> Promise rejections, async/await failures</li>
            <li><strong>Component Errors:</strong> React component rendering errors, lifecycle errors</li>
            <li><strong>Validation Errors:</strong> Form validation failures, data validation errors</li>
          </ul>
          
          <h3>Error Context Captured:</h3>
          <ul>
            <li>Error message and stack trace</li>
            <li>Component name and action</li>
            <li>User agent and browser information</li>
            <li>Timestamp and session information</li>
            <li>Custom attributes and metadata</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ErrorTesting;
