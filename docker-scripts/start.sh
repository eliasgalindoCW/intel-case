#!/bin/bash

# Telegram Intel Monitor - Docker Start Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_warning ".env file not found. Creating from template..."
    cp .env.docker .env
    print_warning "Please edit .env file with your configuration before continuing."
    exit 1
fi

# Parse command line arguments
PROFILE=""
DETACH=""
BUILD=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --profile)
            PROFILE="--profile $2"
            shift 2
            ;;
        --with-admin)
            PROFILE="--profile admin"
            shift
            ;;
        --with-monitoring)
            PROFILE="--profile monitoring"
            shift
            ;;
        --with-all)
            PROFILE="--profile admin --profile monitoring"
            shift
            ;;
        --detach|-d)
            DETACH="-d"
            shift
            ;;
        --build)
            BUILD="--build"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --profile PROFILE     Specify Docker Compose profile"
            echo "  --with-admin         Start with pgAdmin interface"
            echo "  --with-monitoring    Start with Grafana and Prometheus"
            echo "  --with-all           Start with all optional services"
            echo "  --detach, -d         Run in detached mode"
            echo "  --build              Force rebuild of containers"
            echo "  --help, -h           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                              # Start basic services"
            echo "  $0 --with-admin                 # Start with database admin"
            echo "  $0 --with-monitoring --detach   # Start with monitoring in background"
            echo "  $0 --with-all --build           # Start all services and rebuild"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

print_status "Starting Telegram Intel Monitor..."

# Check Docker and Docker Compose
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed or not in PATH"
    exit 1
fi

# Check if Docker daemon is running
if ! docker info &> /dev/null; then
    print_error "Docker daemon is not running"
    exit 1
fi

# Create necessary directories
print_status "Creating data directories..."
mkdir -p data logs temp credentials dev-data dev-logs

# Build command
CMD="docker-compose up $BUILD $DETACH $PROFILE"

print_status "Running: $CMD"

# Execute docker-compose
if eval $CMD; then
    print_success "Telegram Intel Monitor started successfully!"
    
    if [ -z "$DETACH" ]; then
        print_status "Running in foreground mode. Press Ctrl+C to stop."
    else
        print_status "Running in detached mode."
        echo ""
        print_status "Service URLs:"
        echo "  • Application Health: http://localhost:3000/health"
        echo "  • Application Status:  http://localhost:3000/status"
        
        if [[ $PROFILE == *"admin"* ]]; then
            echo "  • pgAdmin:            http://localhost:8080"
        fi
        
        if [[ $PROFILE == *"monitoring"* ]]; then
            echo "  • Grafana:            http://localhost:3001"
            echo "  • Prometheus:         http://localhost:9090"
        fi
        
        echo ""
        print_status "View logs with: docker-compose logs -f"
        print_status "Stop services with: docker-compose down"
    fi
else
    print_error "Failed to start services"
    exit 1
fi