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
npm install @jeffmarans/hydropulse
```

### Environment Variables Setup

Create a `.env` file with your Hydropulse configuration:

```bash
# Required
HYDROPULSE_SERVICE_NAME=my-app
HYDROPULSE_SERVICE_VERSION=1.0.0

# Provider Configuration
HYDROPULSE_PROVIDER=auto
HYDROPULSE_ENVIRONMENT=production

# Grafana Configuration
HYDROPULSE_GRAFANA_URL=https://your-grafana.com/api/traces
HYDROPULSE_GRAFANA_API_KEY=your-api-key
HYDROPULSE_GRAFANA_APP_KEY=my-app

# OpenTelemetry Configuration
HYDROPULSE_OTEL_ENDPOINT=https://your-otel-collector.com
HYDROPULSE_OTEL_TOKEN=your-token
```

### NestJS Usage

```typescript
import { TelemetryModule } from '@jeffmarans/hydropulse';

@Module({
  imports: [
    TelemetryModule.forEnvironment(), // Automatically loads from HYDROPULSE_ env vars
  ],
})
export class AppModule {}
```

### React Usage

```tsx
import { ReactTelemetryProvider, useMetric } from '@jeffmarans/hydropulse';

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

### Visual Status Output

When Hydropulse initializes, you'll see a beautiful status display:

```
🌊 Hydropulse v1.0.0
💙 Pulse: Strong (120 bpm)
💧 Flow: Optimal (1000 metrics/s)
⚡ Pressure: Normal (CPU: 23%, Memory: 45%)
✅ All systems flowing smoothly
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
telemetry-lib/
├── src/
│   ├── core/              # Core telemetry services
│   ├── providers/         # Grafana & OpenTelemetry providers
│   ├── adapters/          # NestJS & React adapters
│   └── interfaces/        # TypeScript interfaces
├── examples/              # Functional examples
├── docs/                  # Complete documentation
└── config/                # Environment configurations
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