import React, { useState } from 'react';
import { useMetric, useTrace, withTelemetry, TelemetryButton, TelemetryForm } from 'hydropulse';

interface FormData {
  name: string;
  email: string;
  message: string;
  category: string;
}

const UserInteractions: React.FC = () => {
  const { recordMetric } = useMetric();
  const { startTrace, endTrace } = useTrace();
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    message: '',
    category: 'general',
  });
  const [clickCount, setClickCount] = useState(0);
  const [submissions, setSubmissions] = useState<FormData[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    recordMetric('form_field_interaction', 1, 'count', {
      field_name: name,
      field_type: e.target.type || 'text',
      value_length: value.length,
    });
  };

  const handleButtonClick = (buttonType: string) => {
    const traceId = startTrace('button_click', {
      button_type: buttonType,
      click_count: clickCount + 1,
    });

    setClickCount(prev => prev + 1);
    
    recordMetric('button_click', 1, 'count', {
      button_type: buttonType,
      total_clicks: clickCount + 1,
    });

    setTimeout(() => {
      endTrace(traceId, {
        success: true,
        new_click_count: clickCount + 1,
      });
    }, 100);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const traceId = startTrace('form_submission', {
      form_type: 'contact_form',
      category: formData.category,
    });

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSubmissions(prev => [...prev, { ...formData }]);
      
      recordMetric('form_submission_success', 1, 'count', {
        category: formData.category,
        name_length: formData.name.length,
        message_length: formData.message.length,
      });
      
      setFormData({
        name: '',
        email: '',
        message: '',
        category: 'general',
      });
      
      endTrace(traceId, {
        success: true,
        submission_count: submissions.length + 1,
      });
      
    } catch (error) {
      recordMetric('form_submission_error', 1, 'count', {
        error_type: 'processing_failed',
        category: formData.category,
      });
      
      endTrace(traceId, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  const simulateUserJourney = async () => {
    const journeyTraceId = startTrace('user_journey_simulation', {
      journey_type: 'complete_flow',
    });

    try {
      recordMetric('page_view', 1, 'count', {
        page: 'user_interactions',
        journey_step: 1,
      });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      recordMetric('form_interaction_start', 1, 'count', {
        journey_step: 2,
      });
      
      await new Promise(resolve => setTimeout(resolve, 800));
      
      for (let i = 0; i < 3; i++) {
        handleButtonClick('journey_simulation');
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      recordMetric('user_journey_complete', 1, 'count', {
        total_steps: 4,
        duration_ms: 2100,
      });
      
      endTrace(journeyTraceId, {
        success: true,
        steps_completed: 4,
        total_interactions: 7,
      });
      
    } catch (error) {
      endTrace(journeyTraceId, {
        success: false,
        error: error instanceof Error ? error.message : 'Journey failed',
      });
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Interactive Elements</h2>
        <p>Click buttons and interact with form elements to generate telemetry data.</p>
        
        <div style={{ marginBottom: '2rem' }}>
          <h3>Button Interactions (Clicks: {clickCount})</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <TelemetryButton
              onClick={() => handleButtonClick('primary')}
              className="button"
              trackingData={{ button_category: 'primary', page: 'interactions' }}
            >
              Primary Action
            </TelemetryButton>
            
            <TelemetryButton
              onClick={() => handleButtonClick('secondary')}
              className="button"
              trackingData={{ button_category: 'secondary', page: 'interactions' }}
            >
              Secondary Action
            </TelemetryButton>
            
            <TelemetryButton
              onClick={() => handleButtonClick('danger')}
              className="button danger"
              trackingData={{ button_category: 'danger', page: 'interactions' }}
            >
              Danger Action
            </TelemetryButton>
            
            <TelemetryButton
              onClick={simulateUserJourney}
              className="button success"
              trackingData={{ button_category: 'simulation', page: 'interactions' }}
            >
              Simulate User Journey
            </TelemetryButton>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Contact Form</h2>
        <TelemetryForm
          onSubmit={handleFormSubmit}
          trackingData={{ form_type: 'contact', page: 'interactions' }}
        >
          <div className="form-group">
            <label htmlFor="name">Name:</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email:</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="category">Category:</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
            >
              <option value="general">General Inquiry</option>
              <option value="support">Technical Support</option>
              <option value="billing">Billing Question</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="message">Message:</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              rows={4}
              required
            />
          </div>
          
          <button type="submit" className="button">
            Submit Form
          </button>
        </TelemetryForm>
      </div>

      {submissions.length > 0 && (
        <div className="card">
          <h2>Form Submissions ({submissions.length})</h2>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {submissions.map((submission, index) => (
              <div key={index} className="log-entry">
                <strong>{submission.name}</strong> ({submission.email}) - {submission.category}
                <br />
                <em>{submission.message}</em>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default withTelemetry(UserInteractions, {
  componentName: 'UserInteractions',
  trackProps: true,
  trackState: false,
  trackErrors: true,
  trackPerformance: true,
});
