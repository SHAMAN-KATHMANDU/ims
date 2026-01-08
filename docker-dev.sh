#!/bin/bash

# Docker Development Helper Script

set -e

COMPOSE_FILE="docker-compose.dev.yml"

case "$1" in
  start|up)
    echo "🚀 Starting development environment..."
    docker-compose -f $COMPOSE_FILE up -d
    echo "✅ Services started!"
    echo "📊 View logs: ./docker-dev.sh logs"
    echo "🌐 Web: http://localhost:3000"
    echo "🔧 API: http://localhost:4000"
    ;;
  
  stop|down)
    echo "🛑 Stopping development environment..."
    docker-compose -f $COMPOSE_FILE down
    echo "✅ Services stopped!"
    ;;
  
  restart)
    echo "🔄 Restarting development environment..."
    docker-compose -f $COMPOSE_FILE restart
    echo "✅ Services restarted!"
    ;;
  
  logs)
    docker-compose -f $COMPOSE_FILE logs -f
    ;;
  
  logs-web)
    docker-compose -f $COMPOSE_FILE logs -f web
    ;;
  
  logs-api)
    docker-compose -f $COMPOSE_FILE logs -f api
    ;;
  
  build)
    echo "🔨 Building Docker images..."
    docker-compose -f $COMPOSE_FILE build --no-cache
    echo "✅ Build complete!"
    ;;
  
  rebuild)
    echo "🔨 Rebuilding Docker images..."
    docker-compose -f $COMPOSE_FILE down
    docker-compose -f $COMPOSE_FILE build --no-cache
    docker-compose -f $COMPOSE_FILE up -d
    echo "✅ Rebuild complete!"
    ;;
  
  clean)
    echo "🧹 Cleaning up Docker resources..."
    docker-compose -f $COMPOSE_FILE down -v
    docker system prune -f
    echo "✅ Cleanup complete!"
    ;;
  
  shell-web)
    docker-compose -f $COMPOSE_FILE exec web sh
    ;;
  
  shell-api)
    docker-compose -f $COMPOSE_FILE exec api sh
    ;;
  
  ps|status)
    docker-compose -f $COMPOSE_FILE ps
    ;;
  
  *)
    echo "Docker Development Helper"
    echo ""
    echo "Usage: ./docker-dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  start, up      - Start all services"
    echo "  stop, down     - Stop all services"
    echo "  restart        - Restart all services"
    echo "  logs           - View all logs"
    echo "  logs-web       - View web logs"
    echo "  logs-api       - View API logs"
    echo "  build          - Build images (no cache)"
    echo "  rebuild        - Rebuild and restart"
    echo "  clean          - Stop and remove everything"
    echo "  shell-web      - Open shell in web container"
    echo "  shell-api      - Open shell in api container"
    echo "  ps, status     - Show container status"
    echo ""
    exit 1
    ;;
esac

