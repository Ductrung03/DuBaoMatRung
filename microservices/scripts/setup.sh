#!/bin/bash

# setup.sh - Initial setup script for microservices

echo "🚀 DuBaoMatRung Microservices Setup"
echo "===================================="

# Check prerequisites
echo ""
echo "📋 Checking prerequisites..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
echo "✅ Docker found: $(docker --version)"

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
echo "✅ Docker Compose found: $(docker-compose --version)"

# Create .env file
echo ""
echo "📝 Creating .env file..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env file created. Please review and update if needed."
else
    echo "⚠️  .env file already exists. Skipping..."
fi

# Create log directories
echo ""
echo "📁 Creating log directories..."
mkdir -p logs/{gateway,auth-service,user-service,gis-service,report-service,admin-service,search-service}
echo "✅ Log directories created"

# Pull Docker images
echo ""
echo "🐳 Pulling Docker images..."
docker-compose pull

# Build services
echo ""
echo "🔨 Building services..."
docker-compose build

# Start services
echo ""
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check health
echo ""
echo "🏥 Checking service health..."

services=("gateway" "auth-service" "user-service" "gis-service" "postgres" "redis")

for service in "${services[@]}"; do
    if docker-compose ps | grep -q "${service}.*Up"; then
        echo "✅ ${service} is running"
    else
        echo "❌ ${service} is not running"
    fi
done

# Show access information
echo ""
echo "✅ Setup completed!"
echo ""
echo "📡 Access URLs:"
echo "   - API Gateway: http://localhost:3000"
echo "   - Auth Service: http://localhost:3001"
echo "   - Prometheus: http://localhost:9090"
echo "   - Grafana: http://localhost:3100 (admin/admin)"
echo ""
echo "🧪 Test the API:"
echo "   curl http://localhost:3000/health"
echo ""
echo "📚 View logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
