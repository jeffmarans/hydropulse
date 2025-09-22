# 🌊 Hydropulse

A robust Node.js telemetry library for NestJS and React applications, utilizing Grafana as the primary solution and OpenTelemetry as a fallback.

## Features

- 🚀 **Automatic Fallback**: Grafana primary with OpenTelemetry fallback
- 🔄 **Circuit Breaker**: Prevents repeated failures
- 📊 **Unified Telemetry**: Metrics, traces, and logs in one library
- 🎯 **Framework Adapters**: Ready-to-use adapters for NestJS and React
- 🛡️ **Data Sanitization**: Automatic PII removal
- 📦 **Batching**: Optimized data transmission
- 🔧 **Multi-Environment**: Development, staging, production configs

## Quick Start

### Installation

```bash
npm install hydropulse
```

### Environment Variables Setup

Create a `.env` file with your Hydropulse configuration:

```bash
# Required
HYDROPULSE_SERVICE_NAME=my-app
HYDROPULSE_SERVICE_VERSION=1.0.0

# Provider Configuration
HYDROPULSE_PROVIDER=auto  # Options: auto, grafana, opentelemetry, alloy
HYDROPULSE_ENVIRONMENT=production

# Grafana Configuration
HYDROPULSE_GRAFANA_URL=https://your-grafana.com/api/traces
HYDROPULSE_GRAFANA_API_KEY=your-api-key
HYDROPULSE_GRAFANA_APP_KEY=my-app

# OpenTelemetry Configuration
HYDROPULSE_OTEL_ENDPOINT=https://your-otel-collector.com
HYDROPULSE_OTEL_TOKEN=your-token

# Grafana Alloy Configuration
HYDROPULSE_ALLOY_ENDPOINT=https://your-alloy-instance.com/v1/traces
HYDROPULSE_ALLOY_TOKEN=your-alloy-api-token  # Optional: only if authentication is required

# Optional Configuration
HYDROPULSE_DEBUG=false
HYDROPULSE_SAMPLING_RATE=1.0
HYDROPULSE_BATCH_SIZE=1000
HYDROPULSE_BATCH_DELAY=5000
HYDROPULSE_CIRCUIT_BREAKER_THRESHOLD=5
HYDROPULSE_CIRCUIT_BREAKER_TIMEOUT=60000
HYDROPULSE_RETRY_MAX_ATTEMPTS=3
HYDROPULSE_RETRY_INITIAL_DELAY=1000
HYDROPULSE_SANITIZE_PII=true
```

### NestJS Usage

```typescript
import { TelemetryModule } from 'hydropulse';

@Module({
  imports: [
    TelemetryModule.forEnvironment(), // Automatically loads from HYDROPULSE_ env vars
  ],
})
export class AppModule {}
```

### React Usage

```tsx
import { ReactTelemetryProvider, useMetric } from 'hydropulse';

function App() {
  return (
    <ReactTelemetryProvider config={telemetryConfig}>
      <Dashboard />
    </ReactTelemetryProvider>
  );
}

function Dashboard() {
  const { recordMetric } = useMetric();
  
  const handleClick = () => {
    recordMetric('button_click', 1, { component: 'dashboard' });
  };
  
  return <button onClick={handleClick}>Track Click</button>;
}
```

## Provider Configuration

Hydropulse supports multiple telemetry providers. You can configure them using environment variables or programmatically.

### Grafana Alloy Configuration

Grafana Alloy is a vendor-neutral distribution of the OpenTelemetry Collector. To use Alloy:

1. **Set up your Alloy instance** following the [Grafana Alloy documentation](https://grafana.com/docs/alloy/)

2. **For internal/private installations (no authentication required):**
```bash
HYDROPULSE_PROVIDER=alloy  # or 'auto' for automatic fallback
HYDROPULSE_ALLOY_ENDPOINT=http://your-internal-alloy:12345/v1/traces
# No token needed for internal installations
```

3. **For cloud/authenticated installations:**
```bash
HYDROPULSE_PROVIDER=alloy  
HYDROPULSE_ALLOY_ENDPOINT=https://your-alloy-instance.com/v1/traces
HYDROPULSE_ALLOY_TOKEN=your-alloy-api-token
```

4. **Programmatic configuration** (alternative to environment variables):
```typescript
import { TelemetryModule } from 'hydropulse';

// Internal installation (no auth)
@Module({
  imports: [
    TelemetryModule.forRoot({
      provider: 'alloy',
      serviceName: 'my-app',
      serviceVersion: '1.0.0',
      environment: 'production',
      alloy: {
        endpoint: 'http://alloy.internal:12345/v1/traces'
        // No headers needed for internal installations
      }
    }),
  ],
})
export class AppModule {}

// Cloud installation (with auth)
@Module({
  imports: [
    TelemetryModule.forRoot({
      provider: 'alloy',
      serviceName: 'my-app',
      serviceVersion: '1.0.0',
      environment: 'production',
      alloy: {
        endpoint: 'https://your-alloy-instance.com/v1/traces',
        headers: {
          'Authorization': 'Bearer your-alloy-api-token'
        }
      }
    }),
  ],
})
export class AppModule {}
```

### Provider Priority

When using `HYDROPULSE_PROVIDER=auto`, Hydropulse will try providers in this order:
1. **Grafana** (if `HYDROPULSE_GRAFANA_URL` is configured)
2. **Alloy** (if `HYDROPULSE_ALLOY_ENDPOINT` is configured)  
3. **OpenTelemetry** (if `HYDROPULSE_OTEL_ENDPOINT` is configured)

### Alloy Endpoint Examples

**Internal/Private installations (no authentication):**
- **Local development**: `http://localhost:12345/v1/traces`
- **Docker Compose**: `http://alloy:12345/v1/traces`
- **Kubernetes**: `http://alloy-service.monitoring.svc.cluster.local:12345/v1/traces`
- **Internal network**: `http://alloy.internal.company.com:12345/v1/traces`

**Cloud/Authenticated installations:**
- **Grafana Cloud**: `https://alloy-prod-us-central-0.grafana.net/v1/traces`
- **Self-hosted HTTPS**: `https://alloy.your-domain.com/v1/traces`
- **Load balanced**: `https://alloy-lb.company.com/v1/traces`

### Docker & Kubernetes Configuration

**Docker Compose example:**
```yaml
# docker-compose.yml
services:
  app:
    image: my-app:latest
    environment:
      - HYDROPULSE_PROVIDER=alloy
      - HYDROPULSE_ALLOY_ENDPOINT=http://alloy:12345/v1/traces
      - HYDROPULSE_SERVICE_NAME=my-app
      - HYDROPULSE_SERVICE_VERSION=1.0.0
    depends_on:
      - alloy

  alloy:
    image: grafana/alloy:latest
    ports:
      - "12345:12345"
    volumes:
      - ./alloy.yml:/etc/alloy/config.alloy
```

**Kubernetes ConfigMap example:**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hydropulse-config
data:
  HYDROPULSE_PROVIDER: "alloy"
  HYDROPULSE_ALLOY_ENDPOINT: "http://alloy-service.monitoring.svc.cluster.local:12345/v1/traces"
  HYDROPULSE_SERVICE_NAME: "my-app"
  HYDROPULSE_SERVICE_VERSION: "1.0.0"
  HYDROPULSE_ENVIRONMENT: "production"
```

### Visual Status Output

When Hydropulse initializes, you'll see a beautiful status display:

```
🌊 Hydropulse v1.0.0
💙 Pulse: Strong (120 bpm)
💧 Flow: Optimal (1000 metrics/s)
⚡ Pressure: Normal (CPU: 23%, Memory: 45%)
✅ All systems flowing smoothly
```

## Troubleshooting

### Alloy Connection Issues

If you're having trouble connecting to Alloy:

1. **Verify endpoint URL**: Make sure your Alloy instance is running and accessible
```bash
# For internal installations (no auth)
curl -X POST http://your-alloy-instance.com:12345/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"test": "connection"}'

# For cloud installations (with auth)
curl -X POST https://your-alloy-instance.com/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"test": "connection"}'
```

2. **Test authentication** (only for cloud/authenticated installations):
```bash
# Test with authentication token
curl -X POST https://your-alloy-instance.com/v1/traces \
  -H "Authorization: Bearer your-alloy-api-token" \
  -H "Content-Type: application/json"
```

3. **For internal installations**, ensure network connectivity:
```bash
# Test basic connectivity
ping alloy.internal.company.com
telnet alloy.internal.company.com 12345

# Test HTTP endpoint
curl http://alloy.internal.company.com:12345/health
```

4. **Enable debug mode** to see detailed logs:
```bash
HYDROPULSE_DEBUG=true
```

5. **Common Alloy ports**:
   - HTTP: `12345` (default)
   - HTTPS: `443`
   - gRPC: `4317`

### Debug Environment Variables

Enable verbose logging to troubleshoot issues:
```bash
HYDROPULSE_DEBUG=true
HYDROPULSE_PROVIDER=alloy  # Force specific provider
```

## Test Coverage

- **49.6% overall coverage** with 89/89 tests passing
- Comprehensive unit tests for all core functionality
- Integration tests for both Grafana and OpenTelemetry providers
- Fallback and error recovery testing

## Documentation

- [Installation Guide](./docs/INSTALLATION.md)
- [Configuration Reference](./docs/CONFIGURATION.md)
- [API Documentation](./docs/API.md)

## Examples

- [NestJS Example](./examples/nestjs-example/) - Complete REST API with CRUD operations
- [React Example](./examples/react-example/) - Interactive dashboard with metrics

## Architecture

```
hydropulse/
├── src/
│   ├── core/              # Core telemetry services
│   ├── providers/         # Provider implementations
│   │   ├── grafana/       # Grafana Faro integration
│   │   ├── alloy/         # Grafana Alloy integration  
│   │   └── opentelemetry/ # OpenTelemetry integration
│   ├── adapters/          # Framework adapters
│   │   ├── nestjs/        # NestJS decorators & modules
│   │   └── react/         # React hooks & providers
│   └── interfaces/        # TypeScript interfaces
├── examples/              # Functional examples
├── docs/                  # Complete documentation
└── config/                # Environment configurations
```

### Provider Flow

```mermaid
graph TD
    A[Hydropulse] --> B{Provider Selection}
    B -->|auto| C[Try Grafana]
    B -->|alloy| D[Alloy Provider]
    B -->|grafana| E[Grafana Provider]
    B -->|opentelemetry| F[OpenTelemetry Provider]
    
    C -->|success| E
    C -->|fail| G[Try Alloy]
    G -->|success| D
    G -->|fail| H[Try OpenTelemetry]
    H -->|success| F
    H -->|fail| I[Fallback Mode]
    
    D --> J[Grafana Alloy Collector]
    E --> K[Grafana Cloud/On-Premise]
    F --> L[OpenTelemetry Collector]
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

Created by Jefferson Maran (@jeffmarans)

---