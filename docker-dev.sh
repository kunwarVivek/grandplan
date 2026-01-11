#!/bin/bash

# ============================================================================
# Docker Compose Development Helper Script
# ============================================================================
# Simplifies common docker-compose operations for local development
#
# Usage:
#   ./docker-dev.sh up              # Start all services
#   ./docker-dev.sh down            # Stop all services
#   ./docker-dev.sh logs server     # View server logs
#   ./docker-dev.sh shell server    # Interactive shell in server
#   ./docker-dev.sh migrate         # Run database migrations
#   ./docker-dev.sh build           # Rebuild all images
#
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to print colored output
print_info() {
    echo -e "${BLUE}→${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to show usage
show_usage() {
    cat << EOF
GrandPlan Docker Development Helper

Usage: $(basename "$0") <command> [options]

Commands:
  up                  Start all services in foreground
  up -d               Start all services in background
  down                Stop and remove containers
  down -v             Stop and remove containers + volumes
  logs [service]      View logs (all services or specific)
  logs -f [service]   Follow logs (all services or specific)
  shell <service>     Interactive shell in container
  migrate             Run database migrations
  build               Rebuild all images
  rebuild <service>   Rebuild specific service image
  ps                  Show running containers
  status              Show health status of services
  clean               Remove containers, volumes, and images

Services: postgres, redis, server, web, worker

Examples:
  $(basename "$0") up
  $(basename "$0") up -d
  $(basename "$0") logs -f server
  $(basename "$0") shell server
  $(basename "$0") migrate
  $(basename "$0") rebuild server

EOF
    exit 0
}

# Check if docker-compose is available
check_docker_compose() {
    if ! command -v docker-compose &> /dev/null; then
        print_error "docker-compose is not installed or not in PATH"
        echo "Install Docker Desktop or Docker Compose from: https://docs.docker.com/compose/install/"
        exit 1
    fi
}

# Main command handler
case "${1:-help}" in
    up)
        check_docker_compose
        print_info "Starting services..."
        if [ "$2" = "-d" ]; then
            docker-compose up -d
            print_success "Services started in background"
            echo ""
            print_info "View logs: docker-compose logs -f"
            print_info "Services status: $(basename "$0") ps"
        else
            docker-compose up
        fi
        ;;

    down)
        check_docker_compose
        print_info "Stopping services..."
        if [ "$2" = "-v" ]; then
            docker-compose down -v
            print_success "Services stopped and volumes removed"
        else
            docker-compose down
            print_success "Services stopped"
        fi
        ;;

    logs)
        check_docker_compose
        if [ -z "$2" ]; then
            docker-compose logs "${@:2}"
        elif [ "$2" = "-f" ]; then
            docker-compose logs -f "${@:3}"
        else
            docker-compose logs "${@:2}"
        fi
        ;;

    shell)
        check_docker_compose
        SERVICE="${2:-server}"
        print_info "Entering shell in $SERVICE..."
        docker-compose exec -it "$SERVICE" bash
        ;;

    migrate)
        check_docker_compose
        print_info "Running database migrations..."
        docker-compose exec server pnpm migrate
        print_success "Migrations completed"
        ;;

    build)
        check_docker_compose
        print_info "Building all images..."
        docker-compose build
        print_success "Images built successfully"
        ;;

    rebuild)
        check_docker_compose
        SERVICE="${2:-server}"
        print_info "Rebuilding $SERVICE image..."
        docker-compose build --no-cache "$SERVICE"
        print_success "Image rebuilt successfully"
        ;;

    ps|status)
        check_docker_compose
        docker-compose ps
        ;;

    clean)
        check_docker_compose
        print_warning "This will remove all containers, volumes, and images"
        read -p "Continue? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_info "Cleaning up..."
            docker-compose down -v --rmi all
            print_success "Cleanup completed"
        else
            print_info "Cleanup cancelled"
        fi
        ;;

    help|--help|-h)
        show_usage
        ;;

    *)
        print_error "Unknown command: $1"
        echo ""
        show_usage
        ;;
esac
