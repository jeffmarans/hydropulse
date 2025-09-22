#!/bin/bash


set -e

echo "🌊 Building Hydropulse To-Do App..."

cd ../../../
echo "📦 Building Hydropulse library..."
npm run build

cd examples/todo-observability/

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building To-Do app..."
npm run build

echo "✅ Build complete! Ready to run."
echo ""
echo "🚀 To start the app:"
echo "  npm start"
echo ""
echo "🐳 To start with Docker:"
echo "  docker-compose up -d"
echo "  npm start"
