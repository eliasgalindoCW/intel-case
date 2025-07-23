# Docker Deployment Guide

Complete Docker setup for Telegram Intel Monitor with PostgreSQL database and optional monitoring services.

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose (if not included)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Configuration
```bash
# Copy environment template
cp .env.docker .env

# Edit configuration (required)
nano .env
```

**Minimum required configuration:**
```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url_here
KEYWORDS=crypto,bitcoin,ethereum,alert,urgent,malware,phishing
```

### 3. Start Services

#### Basic Setup (Application + PostgreSQL)
```bash
# Using helper script (recommended)
./docker-scripts/start.sh

# Or directly with docker-compose
docker-compose up -d
```

#### With Database Admin Interface
```bash
./docker-scripts/start.sh --with-admin
```

#### With Monitoring (Grafana + Prometheus)
```bash
./docker-scripts/start.sh --with-monitoring
```

#### Complete Setup (All Services)
```bash
./docker-scripts/start.sh --with-all --detach
```

## 📊 Service Overview

### Core Services
- **telegram-intel**: Main application
- **postgres**: PostgreSQL database
- **redis**: Redis cache (optional)

### Admin Services (--profile admin)
- **pgadmin**: Database administration interface

### Monitoring Services (--profile monitoring)
- **grafana**: Monitoring dashboards
- **prometheus**: Metrics collection

## 🔗 Service URLs

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| Application Health | http://localhost:3000/health | - |
| Application Status | http://localhost:3000/status | - |
| Application Metrics | http://localhost:3000/metrics | - |
| pgAdmin | http://localhost:8080 | See .env file |
| Grafana | http://localhost:3001 | See .env file |
| Prometheus | http://localhost:9090 | - |

## 🗂️ Directory Structure

```
telegram-intel-monitor/
├── docker-compose.yml              # Main compose file
├── docker-compose.override.yml     # Development overrides
├── .env.docker                     # Environment template
├── Dockerfile                      # Application container
├── docker-scripts/
│   ├── start.sh                   # Start services script
│   └── stop.sh                    # Stop services script
├── monitoring/
│   ├── grafana/
│   │   ├── dashboards/           # Grafana dashboard configs
│   │   └── datasources/          # Grafana datasource configs
│   └── prometheus/
│       └── prometheus.yml        # Prometheus configuration
├── data/                         # Application data (created automatically)
├── logs/                         # Application logs (created automatically)
└── credentials/                  # Google Cloud credentials (optional)
```

## 💾 Data Persistence

### Volumes
- `postgres_data`: PostgreSQL database files
- `redis_data`: Redis persistence files
- `telegram_data`: Application data files
- `telegram_logs`: Application log files
- `grafana_data`: Grafana dashboards and settings
- `prometheus_data`: Prometheus metrics data

### Backup & Restore

#### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U telegram_user telegram_intel > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U telegram_user telegram_intel < backup.sql
```

#### Volume Backup
```bash
# Backup all data
docker run --rm -v telegram-intel-monitor_postgres_data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore data
docker run --rm -v telegram-intel-monitor_postgres_data:/data -v $(pwd):/backup ubuntu tar xzf /backup/postgres_backup.tar.gz -C /data
```

## ⚙️ Configuration Options

### Environment Variables

All configuration is done through the `.env` file. Key variables:

#### Core Configuration
```env
TELEGRAM_BOT_TOKEN=required
DISCORD_WEBHOOK_URL=required
KEYWORDS=required
ALLOWED_CHAT_IDS=optional
```

#### Database Configuration
```env
DB_PASSWORD=secure_password
REDIS_PASSWORD=secure_password
```

#### Feature Flags
```env
ENABLE_OCR=true
ENABLE_AI_ANALYSIS=true
ENABLE_THREAT_ANALYSIS=true
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_TRANSLATION=false
```

#### Admin Interface Passwords
```env
PGADMIN_EMAIL=admin@telegram-intel.local
PGADMIN_PASSWORD=secure_password
GRAFANA_PASSWORD=secure_password
```

### Docker Compose Profiles

- **Default**: Core services only (app + database)
- **admin**: Adds pgAdmin for database management
- **monitoring**: Adds Grafana and Prometheus
- **dev**: Development overrides with hot reload

## 🔧 Management Commands

### Service Management
```bash
# Start services
./docker-scripts/start.sh [OPTIONS]

# Stop services
./docker-scripts/stop.sh [OPTIONS]

# View logs
docker-compose logs -f [service_name]

# Restart a service
docker-compose restart telegram-intel

# Scale services
docker-compose up -d --scale telegram-intel=2
```

### Container Management
```bash
# Execute commands in container
docker-compose exec telegram-intel /bin/sh

# View container stats
docker stats

# Access PostgreSQL
docker-compose exec postgres psql -U telegram_user telegram_intel

# Access Redis
docker-compose exec redis redis-cli -a $REDIS_PASSWORD
```

### Development Mode
```bash
# Start in development mode (hot reload)
docker-compose -f docker-compose.yml -f docker-compose.override.yml up

# View development logs
docker-compose logs -f telegram-intel
```

## 🛠️ Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check logs
docker-compose logs

# Check container status
docker-compose ps

# Rebuild containers
docker-compose up --build
```

#### Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test database connection
docker-compose exec postgres pg_isready -U telegram_user

# Reset database
docker-compose down -v
docker-compose up postgres
```

#### Permission Issues
```bash
# Fix data directory permissions
sudo chown -R 1001:1001 data logs

# Fix Docker socket permissions (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

#### Out of Disk Space
```bash
# Clean up Docker system
docker system prune -a

# Remove unused volumes
docker volume prune

# Check disk usage
docker system df
```

### Health Checks

```bash
# Application health
curl http://localhost:3000/health

# Database health
docker-compose exec postgres pg_isready

# Redis health
docker-compose exec redis redis-cli ping
```

### Resource Monitoring

```bash
# Container resource usage
docker stats

# System resource usage
docker system df

# Container processes
docker-compose exec telegram-intel ps aux
```

## 🔒 Security Considerations

### Network Security
- Services communicate through isolated Docker network
- Only necessary ports are exposed to host
- Database and Redis are not exposed externally by default

### Secrets Management
- All secrets stored in `.env` file
- `.env` file should not be committed to version control
- Consider using Docker secrets for production

### Container Security
- Application runs as non-root user
- Read-only filesystem where possible
- Minimal base images (Alpine Linux)
- Regular security updates

### Data Protection
- Database and application data in named volumes
- Regular backups recommended
- Encryption at rest for sensitive data

## 🚀 Production Deployment

### Resource Requirements
```yaml
# Minimum recommended resources
telegram-intel:
  mem_limit: 1g
  cpus: '1.0'

postgres:
  mem_limit: 512m
  cpus: '0.5'

redis:
  mem_limit: 256m
  cpus: '0.25'
```

### Production Configuration
```env
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_FILE_LOGGING=true
RATE_LIMIT_WINDOW=60000
MAX_ALERTS_PER_WINDOW=5
```

### Health Monitoring
```bash
# Setup health check monitoring
curl -f http://localhost:3000/health || exit 1

# Log monitoring
docker-compose logs --tail=100 telegram-intel | grep ERROR

# Resource monitoring
docker stats --no-stream
```

## 📝 Example Workflows

### Daily Operations
```bash
# Morning health check
./docker-scripts/start.sh --detach
curl http://localhost:3000/health

# View recent alerts
curl http://localhost:3000/alerts?limit=10

# Check logs for errors
docker-compose logs --since="24h" telegram-intel | grep -i error
```

### Weekly Maintenance
```bash
# Backup database
docker-compose exec postgres pg_dump -U telegram_user telegram_intel > weekly_backup.sql

# Update containers
docker-compose pull
docker-compose up -d

# Clean up unused resources
docker system prune
```

### Troubleshooting Workflow
```bash
# 1. Check service status
docker-compose ps

# 2. Check application health
curl http://localhost:3000/health

# 3. Check recent logs
docker-compose logs --tail=50 telegram-intel

# 4. Check resource usage
docker stats --no-stream

# 5. Restart if needed
docker-compose restart telegram-intel
```