#!/bin/bash

# Telegram Intel Monitor - Docker Stop Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Parse command line arguments
REMOVE_VOLUMES=""
REMOVE_IMAGES=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --volumes|-v)
            REMOVE_VOLUMES="--volumes"
            shift
            ;;
        --rmi)
            REMOVE_IMAGES="--rmi all"
            shift
            ;;
        --clean)
            REMOVE_VOLUMES="--volumes"
            REMOVE_IMAGES="--rmi all"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --volumes, -v    Remove named volumes"
            echo "  --rmi           Remove images"
            echo "  --clean         Remove volumes and images"
            echo "  --help, -h      Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0              # Stop services only"
            echo "  $0 --volumes    # Stop services and remove volumes"
            echo "  $0 --clean      # Stop services, remove volumes and images"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

print_status "Stopping Telegram Intel Monitor..."

# Check if services are running
if ! docker-compose ps -q | grep -q .; then
    print_warning "No services appear to be running"
else
    print_status "Stopping Docker Compose services..."
    
    # Stop services
    CMD="docker-compose down $REMOVE_VOLUMES $REMOVE_IMAGES"
    
    if eval $CMD; then
        print_success "Services stopped successfully!"
    else
        print_error "Failed to stop some services"
        exit 1
    fi
fi

# Additional cleanup if requested
if [ -n "$REMOVE_VOLUMES" ]; then
    print_warning "Named volumes have been removed"
    print_warning "All data has been deleted!"
fi

if [ -n "$REMOVE_IMAGES" ]; then
    print_status "Docker images have been removed"
fi

print_success "Telegram Intel Monitor stopped!"