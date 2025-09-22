#!/bin/bash

echo "🌊 Starting Hydropulse To-Do App Observability Demo"
echo "=================================================="

if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ docker-compose not found. Please install Docker Compose."
    exit 1
fi

echo "📦 Starting observability stack..."
docker-compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 30

echo "🔍 Checking service health..."
services=("postgres:5432" "alloy:4318" "prometheus:9090" "loki:3100" "tempo:3200" "grafana:3000")

for service in "${services[@]}"; do
    IFS=':' read -r name port <<< "$service"
    if nc -z localhost "$port" 2>/dev/null; then
        echo "✅ $name is ready on port $port"
    else
        echo "⚠️  $name is not ready on port $port"
    fi
done

echo ""
echo "🚀 Demo is ready! Access the following services:"
echo "================================================"
echo "🌐 To-Do App:     http://localhost:3001"
echo "📊 Grafana:       http://localhost:3000 (admin/admin)"
echo "📈 Prometheus:    http://localhost:9090"
echo "📋 Loki:          http://localhost:3100"
echo "🔗 Tempo:         http://localhost:3200"
echo "🔥 Pyroscope:     http://localhost:4040"
echo "🔄 Alloy:         http://localhost:12345"
echo ""
echo "📚 Quick Start Commands:"
echo "========================"
echo "# Generate normal traffic:"
echo "npm run simulate:normal"
echo ""
echo "# Generate error scenarios:"
echo "npm run simulate:errors"
echo ""
echo "# Generate burst traffic:"
echo "npm run simulate:burst"
echo ""
echo "# Start continuous traffic (5 minutes):"
echo "npm run simulate:continuous"
echo ""
echo "# View logs:"
echo "docker-compose logs -f"
echo ""
echo "# Stop the demo:"
echo "docker-compose down"
echo ""
echo "🎉 Happy observing!"
