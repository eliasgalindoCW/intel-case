# Telegram Intelligence Monitor 🚨

Advanced Telegram intelligence monitoring bot with OCR, database backend, AI-powered threat analysis, and automated Discord alerting. Perfect for security monitoring, threat intelligence, and comprehensive message analysis.

## 🌟 Features

### Core Monitoring
- 🔍 **Advanced Keyword Detection**: Case-sensitive/insensitive keyword monitoring
- 🚨 **Rich Discord Alerts**: Comprehensive Discord embeds with threat analysis
- 🛡️ **Smart Chat Filtering**: Restrict monitoring to specific chats/groups
- ⚙️ **Flexible Configuration**: Environment-based configuration with feature flags

### 🔤 OCR Integration (Optical Character Recognition)
- 📱 **Image Text Extraction**: Scan images (PNG, JPG, GIF, BMP) for keywords
- 📄 **PDF Document Analysis**: Extract and analyze text from PDF documents
- 🎯 **Smart Processing**: Automatic image optimization for better OCR accuracy
- 🌍 **Multi-language Support**: Support for multiple OCR languages
- ⚡ **Confidence Scoring**: OCR confidence metrics and quality assessment

### 💾 Database Backend
- 🗄️ **Dual Database Support**: SQLite (simple) or PostgreSQL (production)
- 📊 **Comprehensive Logging**: Store alerts, OCR results, and AI analysis
- 📈 **Statistical Analysis**: Keyword performance and chat activity tracking
- 🔍 **Advanced Queries**: Built-in views for common analytics
- 🔄 **Automatic Migration**: Database schema management and updates

### 🤖 AI-Powered Analysis (Surprise Feature!)
- 🛡️ **Threat Intelligence Analysis**: Advanced cybersecurity threat detection
- 😊 **Sentiment Analysis**: Emotional context and urgency detection
- 🌐 **Multi-language Translation**: Automatic translation with Google Translate
- 📊 **Text Classification**: Automatic categorization of message content
- 🔍 **IOC Extraction**: Automatic extraction of indicators of compromise
- ⚠️ **Risk Assessment**: Automated threat level scoring and recommendations

### 🚀 Enterprise Features
- 📦 **GCP Deployment Ready**: Cloud Run, Cloud Build, and monitoring setup
- 🔄 **Health Monitoring**: Built-in health checks and metrics endpoints
- 📝 **Structured Logging**: JSON logging with multiple severity levels
- 🛡️ **Rate Limiting**: Configurable alert rate limiting and spam protection
- 🔒 **Security First**: No hardcoded secrets, secure credential management

## 📋 Prerequisites

- Node.js 18+ installed
- A Telegram Bot Token from [@BotFather](https://t.me/botfather)
- A Discord webhook URL
- **Optional**: OpenAI API key (for AI analysis features)
- **Optional**: Google Cloud credentials (for translation features)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd telegram-intel-monitor
npm install
```

### 2. Create Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token provided
4. **Important**: Disable privacy mode with `/setprivacy` → Disable for group monitoring

### 3. Set Up Discord Webhook

1. In your Discord server, go to Server Settings → Integrations → Webhooks
2. Click "Create Webhook"
3. Configure the webhook and copy the webhook URL

### 4. Configure Environment

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. **Basic Configuration** (minimum required):
   ```env
   TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url_here
   KEYWORDS=crypto,bitcoin,ethereum,alert,urgent,malware,phishing
   ```

3. **Enable Optional Features** (recommended):
   ```env
   # OCR for image/PDF scanning
   ENABLE_OCR=true
   
   # Database for persistent storage
   ENABLE_DATABASE=true
   
   # AI analysis (requires OpenAI API key)
   ENABLE_AI_ANALYSIS=true
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Advanced threat intelligence
   ENABLE_THREAT_ANALYSIS=true
   ENABLE_SENTIMENT_ANALYSIS=true
   ```

### 5. Initialize Database (if enabled)

```bash
# Run initial migration
npm run migrate
```

### 6. Add Bot to Telegram

1. Add your bot to the Telegram groups/channels you want to monitor
2. Make sure the bot has permission to read messages
3. Grant admin privileges if monitoring channels
4. Test with a message containing your keywords

### 7. Run the Bot

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start

# With PM2 (recommended for production)
npm install -g pm2
pm2 start src/index.js --name telegram-intel
pm2 startup
pm2 save
```

## ⚙️ Configuration Guide

### Core Configuration

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from BotFather | ✅ | - | `123456:ABC-DEF...` |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL for alerts | ✅ | - | `https://discord.com/api/webhooks/...` |
| `KEYWORDS` | Comma-separated keywords to monitor | ✅ | - | `crypto,bitcoin,alert,malware` |
| `ALLOWED_CHAT_IDS` | Specific chat IDs to monitor | ❌ | All chats | `123456,-987654321` |

### OCR Configuration

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `ENABLE_OCR` | Enable OCR for images/PDFs | `false` | `true/false` |
| `OCR_LANGUAGE` | OCR language code | `eng` | `eng,ara,chi_sim,fra,deu,spa,rus` |
| `OCR_CONFIDENCE` | Minimum OCR confidence score | `60` | `0-100` |
| `OCR_MAX_FILE_SIZE` | Maximum file size for OCR (bytes) | `10485760` | Any number |

### Database Configuration

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `ENABLE_DATABASE` | Enable database storage | `false` | `true/false` |
| `DB_TYPE` | Database type | `sqlite` | `sqlite/postgresql` |
| `DB_FILENAME` | SQLite database file | `./data/alerts.db` | Any path |
| `DB_HOST` | PostgreSQL host | `localhost` | Hostname/IP |
| `DB_PORT` | PostgreSQL port | `5432` | Port number |
| `DB_NAME` | Database name | `telegram_intel` | Database name |
| `DB_USER` | Database username | `postgres` | Username |
| `DB_PASSWORD` | Database password | - | Password |

### AI Analysis Configuration

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `ENABLE_AI_ANALYSIS` | Enable AI-powered analysis | `false` | Requires OpenAI API key |
| `OPENAI_API_KEY` | OpenAI API key | - | Get from [OpenAI](https://platform.openai.com/) |
| `ENABLE_THREAT_ANALYSIS` | Enable threat intelligence | `false` | **Surprise Feature!** |
| `ENABLE_SENTIMENT_ANALYSIS` | Enable sentiment analysis | `false` | Emotional context detection |
| `ENABLE_TRANSLATION` | Enable auto-translation | `false` | Requires Google Cloud |

### System Configuration

| Variable | Description | Default | Notes |
|----------|-------------|---------|-------|
| `ENABLE_SERVER` | Enable health check server | `true` | Recommended for monitoring |
| `PORT` | HTTP server port | `3000` | For health checks |
| `LOG_LEVEL` | Logging level | `info` | `debug/info/warn/error` |
| `RATE_LIMIT_WINDOW` | Rate limit window (ms) | `60000` | 1 minute |
| `MAX_ALERTS_PER_WINDOW` | Max alerts per window | `10` | Prevents spam |

### Finding Chat IDs

- **Private chats**: Positive numbers (e.g., `123456789`)
- **Groups/channels**: Negative numbers (e.g., `-987654321`)
- **Monitor all chats**: Leave `ALLOWED_CHAT_IDS` empty

**Methods to find Chat IDs:**
1. Check console logs when bot receives messages
2. Use [@userinfobot](https://t.me/userinfobot) in the chat
3. Enable health server and check `/stats` endpoint
4. Use Telegram's `getUpdates` API method

## 🔄 How It Works

### Basic Flow
1. **Connection**: Bot connects to Telegram using long polling
2. **Message Receipt**: Receives all messages from monitored chats
3. **Keyword Detection**: Searches for configured keywords (case-insensitive by default)
4. **OCR Processing**: If enabled, extracts text from images and PDFs
5. **AI Analysis**: If enabled, performs threat intelligence and sentiment analysis
6. **Database Storage**: If enabled, stores alerts and analysis results
7. **Discord Alert**: Sends comprehensive alert to Discord with all findings

### Advanced Processing Pipeline

```
Telegram Message → Keyword Check → OCR (if image/PDF) → AI Analysis → Database → Discord Alert
                      ↓                ↓                    ↓            ↓
                  Basic Alert    Extract Text        Threat Intel    Store Data
                                                    Sentiment        Statistics
                                                    Translation
```

### Alert Types
- **Text Alerts**: Standard keyword matches in messages
- **Image Alerts**: OCR-extracted text matches with confidence scores
- **PDF Alerts**: Document text extraction and analysis
- **AI Analysis**: Enhanced alerts with threat intelligence and sentiment

## 🛡️ Security Features

- 🔒 **Zero Hardcoded Secrets**: All credentials via environment variables
- 🎯 **Selective Monitoring**: Optional chat filtering and permissions
- 🔄 **Rate Limiting**: Configurable alert rate limiting prevents spam
- 📝 **Audit Logging**: Comprehensive logging for security analysis
- 🛡️ **Input Validation**: Sanitization of all user inputs and file uploads
- 🔐 **Secure File Handling**: Safe OCR processing with size limits
- 🚨 **Error Resilience**: Graceful error handling prevents crashes

## 🚀 Deployment Options

### Local Development
```bash
# Clone and setup
git clone <repo-url>
cd telegram-intel-monitor
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

### Production Deployment

#### Option 1: PM2 (Recommended)
```bash
npm install -g pm2
pm2 start src/index.js --name telegram-intel
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs telegram-intel
pm2 restart telegram-intel
```

#### Option 2: Docker Compose (Recommended)
```bash
# Quick setup with PostgreSQL database
cp .env.docker .env
# Edit .env with your configuration
./docker-scripts/start.sh

# With database admin interface (pgAdmin)
./docker-scripts/start.sh --with-admin

# Complete setup with monitoring (Grafana + Prometheus)
./docker-scripts/start.sh --with-all --detach

# Stop services
./docker-scripts/stop.sh
```

**Service URLs:**
- Application: http://localhost:3000/health
- pgAdmin: http://localhost:8080 (with --with-admin)
- Grafana: http://localhost:3001 (with monitoring)

#### Option 3: Manual Docker
```bash
# Build image
docker build -t telegram-intel-monitor .

# Run with PostgreSQL
docker run -d --name postgres \
  -e POSTGRES_DB=telegram_intel \
  -e POSTGRES_USER=telegram_user \
  -e POSTGRES_PASSWORD=secure_password \
  postgres:15-alpine

# Run application
docker run -d \
  --name telegram-intel \
  --env-file .env \
  --link postgres:postgres \
  -p 3000:3000 \
  telegram-intel-monitor
```

#### Option 4: Google Cloud Platform (Enterprise)
```bash
# Deploy to Cloud Run
gcloud builds submit --config cloudbuild.yaml

# See deploy/gcp-setup.md for detailed instructions
```

### Health Monitoring & Management

#### Docker Compose Management
```bash
# View service status
docker-compose ps

# View logs
docker-compose logs -f telegram-intel

# Restart services
docker-compose restart telegram-intel

# Update and restart
docker-compose pull && docker-compose up -d

# Clean shutdown
./docker-scripts/stop.sh

# Complete cleanup (removes data)
./docker-scripts/stop.sh --clean
```

#### Health Endpoints
```bash
# Health check
curl http://localhost:3000/health

# Detailed status
curl http://localhost:3000/status

# Metrics (Prometheus format)
curl http://localhost:3000/metrics

# Recent alerts (if database enabled)
curl http://localhost:3000/alerts

# Configuration overview
curl http://localhost:3000/config
```

#### Database Management (Docker)
```bash
# Access PostgreSQL directly
docker-compose exec postgres psql -U telegram_user telegram_intel

# Run database queries
docker-compose exec postgres psql -U telegram_user telegram_intel -c "SELECT COUNT(*) FROM alerts;"

# Database backup
docker-compose exec postgres pg_dump -U telegram_user telegram_intel > backup.sql

# Database restore
docker-compose exec -T postgres psql -U telegram_user telegram_intel < backup.sql
```

## 🔧 Troubleshooting

### Common Issues

#### Bot Not Receiving Messages
- ✅ Ensure bot is added to the chat/group with appropriate permissions
- ✅ Disable privacy mode: `/setprivacy` → Disable in [@BotFather](https://t.me/botfather)
- ✅ Grant admin privileges for channels
- ✅ Check `ALLOWED_CHAT_IDS` configuration if using chat filtering
- ✅ Verify bot token is correct and active

#### Discord Alerts Not Working
- ✅ Verify Discord webhook URL format and permissions
- ✅ Check rate limiting settings (`MAX_ALERTS_PER_WINDOW`)
- ✅ Monitor logs: `pm2 logs telegram-intel` or check `/logs` endpoint
- ✅ Test webhook manually with curl or Discord API

#### OCR Not Working
- ✅ Ensure `ENABLE_OCR=true` in configuration
- ✅ Check file size limits (`OCR_MAX_FILE_SIZE`)
- ✅ Verify supported file formats (PNG, JPG, PDF, GIF, BMP)
- ✅ Check OCR confidence threshold (`OCR_CONFIDENCE`)
- ✅ Monitor OCR processing logs for errors

#### AI Analysis Issues
- ✅ Verify `OPENAI_API_KEY` is valid and has credits
- ✅ Check OpenAI API rate limits and quotas
- ✅ Ensure `ENABLE_AI_ANALYSIS=true`
- ✅ Monitor AI processing logs and response times

#### Database Issues
- ✅ Run migration: `npm run migrate` (local) or `docker-compose exec telegram-intel npm run migrate` (Docker)
- ✅ Check database file permissions (SQLite)
- ✅ Verify PostgreSQL connection: `docker-compose exec postgres pg_isready -U telegram_user`
- ✅ Check database logs: `docker-compose logs postgres`
- ✅ Reset database: `docker-compose down -v && docker-compose up postgres`

### Debug Commands

#### Local/PM2 Deployment
```bash
# View detailed logs
pm2 logs telegram-intel --lines 100

# Check service status
curl http://localhost:3000/status

# View recent alerts
curl http://localhost:3000/alerts?limit=10

# Check health
curl http://localhost:3000/health

# Monitor resource usage
pm2 monit

# Database queries (if SQLite)
sqlite3 ./data/alerts.db "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 10;"
```

#### Docker Deployment
```bash
# View application logs
docker-compose logs -f telegram-intel

# Check all service status
docker-compose ps

# Check service health
curl http://localhost:3000/health

# View recent alerts
curl http://localhost:3000/alerts?limit=10

# Container resource usage
docker stats

# Database queries (PostgreSQL)
docker-compose exec postgres psql -U telegram_user telegram_intel -c "SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 10;"

# Application container shell access
docker-compose exec telegram-intel /bin/sh

# View container logs with timestamps
docker-compose logs -t --since="1h" telegram-intel
```

### Log Analysis

#### Local/PM2 Deployment
```bash
# Search for errors
pm2 logs telegram-intel | grep -i error

# Search for OCR processing
pm2 logs telegram-intel | grep -i ocr

# Search for AI analysis
pm2 logs telegram-intel | grep -i "ai analysis"

# Search for Discord webhook calls
pm2 logs telegram-intel | grep -i discord
```

#### Docker Deployment
```bash
# Search for errors in Docker logs
docker-compose logs telegram-intel | grep -i error

# Search for OCR processing
docker-compose logs telegram-intel | grep -i ocr

# Search for AI analysis
docker-compose logs telegram-intel | grep -i "ai analysis"

# Search for Discord webhook calls
docker-compose logs telegram-intel | grep -i discord

# Monitor logs in real-time
docker-compose logs -f telegram-intel | grep --line-buffered -i "error\|warn"

# Export logs to file
docker-compose logs --no-color telegram-intel > telegram-intel.log
```

## 🤝 API Documentation

### Health Check Endpoints

- `GET /health` - Basic health status
- `GET /status` - Detailed system status
- `GET /metrics` - Prometheus-compatible metrics
- `GET /config` - Current configuration (sanitized)
- `GET /stats` - Database statistics (if enabled)
- `GET /alerts` - Recent alerts (if database enabled)

### Example Responses

```json
// GET /health
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "features": {
    "ocr": true,
    "database": true,
    "ai": true
  }
}

// GET /status
{
  "application": {
    "name": "Telegram Intel Monitor",
    "version": "2.0.0",
    "uptime": 3600
  },
  "services": {
    "ocr": { "enabled": true },
    "ai": { "enabled": true, "capabilities": {...} }
  }
}
```

## 🎯 Advanced Use Cases

### Security Operations Center (SOC)
- Monitor threat intelligence feeds
- Track IOCs (Indicators of Compromise)
- Automated threat classification
- Real-time security alert correlation

### Digital Forensics
- Message archival and analysis
- OCR-based evidence extraction
- Timeline reconstruction
- Multi-language translation support

### Compliance Monitoring
- Keyword-based compliance checking
- Audit trail maintenance
- Automated reporting
- Risk assessment scoring

### Threat Hunting
- Proactive threat detection
- Behavioral analysis
- Pattern recognition
- Intelligence gathering

## 🔬 Technical Details

### Architecture
- **Event-driven**: Asynchronous message processing
- **Modular**: Service-oriented architecture
- **Scalable**: Rate limiting and resource management
- **Observable**: Comprehensive logging and metrics

### Performance
- **OCR Processing**: ~2-5 seconds per image
- **AI Analysis**: ~1-3 seconds per message
- **Database Operations**: <100ms per query
- **Memory Usage**: ~200-500MB (depending on features)

### Dependencies
- **Tesseract.js**: OCR processing
- **OpenAI API**: AI analysis
- **Google Translate**: Multi-language support
- **Sharp**: Image optimization
- **Winston**: Structured logging

## 📁 Project Structure

```
telegram-intel-monitor/
├── src/                           # Application source code
│   ├── config/                   # Configuration management
│   ├── database/                 # Database schema and models
│   ├── services/                 # Core services (OCR, AI, Discord)
│   ├── utils/                    # Utility functions and logging
│   ├── models/                   # Data models
│   └── index.js                  # Main application entry point
├── deploy/                       # Deployment configurations
│   └── gcp-setup.md             # Google Cloud deployment guide
├── docker-scripts/              # Docker management scripts
│   ├── start.sh                 # Start services script
│   └── stop.sh                  # Stop services script
├── monitoring/                   # Monitoring and observability
│   ├── grafana/                 # Grafana configuration
│   └── prometheus/              # Prometheus configuration
├── docker-compose.yml           # Main Docker Compose file
├── docker-compose.override.yml  # Development overrides
├── Dockerfile                   # Application container
├── cloudbuild.yaml             # Google Cloud Build configuration
├── .env.example                # Local environment template
├── .env.docker                 # Docker environment template
├── DOCKER.md                   # Docker deployment guide
└── README.md                   # This file
```

## 📞 Support & Contributing

### Getting Help
1. 📖 **Documentation**: Check this README, DOCKER.md, and deploy/gcp-setup.md
2. 🔍 **Search Issues**: Look through existing GitHub issues
3. 📝 **Check Logs**: Review application logs and error messages
4. 🆕 **Create Issue**: Submit detailed GitHub issue with:
   - Configuration details (sanitized - remove tokens!)
   - Error logs and stack traces
   - Steps to reproduce the problem
   - Expected vs actual behavior
   - Deployment method (local, Docker, GCP)

### Contributing
1. 🍴 Fork the repository
2. 🌿 Create a feature branch (`git checkout -b feature/amazing-feature`)
3. ✨ Make your changes with tests
4. 📝 Update documentation (README, DOCKER.md, code comments)
5. ✅ Ensure all tests pass and linting is clean
6. 🚀 Submit a pull request with detailed description

### Development Setup

#### Local Development
```bash
git clone https://github.com/your-repo/telegram-intel-monitor.git
cd telegram-intel-monitor
npm install
cp .env.example .env
# Configure your .env file with test credentials
npm run dev
```

#### Docker Development
```bash
git clone https://github.com/your-repo/telegram-intel-monitor.git
cd telegram-intel-monitor
cp .env.docker .env
# Configure your .env file
docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

### Contribution Guidelines
- **Code Style**: Follow existing patterns and conventions
- **Security**: Never commit secrets, tokens, or credentials
- **Testing**: Add tests for new features and bug fixes
- **Documentation**: Update relevant documentation
- **Commits**: Use clear, descriptive commit messages
- **Pull Requests**: Include screenshots/demos for UI changes

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Telegram Bot API** for robust messaging platform
- **Tesseract.js** for powerful OCR capabilities
- **OpenAI** for advanced AI analysis features
- **Discord** for flexible webhook integration
- **Google Cloud** for translation and deployment services
- **Docker** for containerization and deployment
- **PostgreSQL** for reliable database backend
- **Grafana & Prometheus** for monitoring and observability
- **Open Source Community** for the amazing libraries and tools

## 📚 Additional Resources

- **[DOCKER.md](DOCKER.md)**: Complete Docker deployment guide
- **[deploy/gcp-setup.md](deploy/gcp-setup.md)**: Google Cloud Platform deployment
- **[Telegram Bot API Documentation](https://core.telegram.org/bots/api)**
- **[Discord Webhook Guide](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)**
- **[OpenAI API Documentation](https://platform.openai.com/docs)**
- **[Docker Compose Reference](https://docs.docker.com/compose/)**

---

## ⚡ Surprise Feature Highlight

**🤖 AI-Powered Threat Intelligence Analysis**

The standout feature goes far beyond simple keyword matching! Our AI analysis engine performs sophisticated cybersecurity analysis including:

### 🛡️ Advanced Threat Detection
- **CVE Reference Detection**: Automatically identifies vulnerability discussions
- **Malware Behavior Analysis**: Recognizes malicious activity patterns
- **Social Engineering Detection**: Spots phishing and manipulation attempts
- **IOC Extraction**: Pulls out URLs, domains, IPs, and file hashes
- **MITRE ATT&CK Mapping**: Links activities to known attack techniques

### 📊 Intelligence Scoring
- **Risk Assessment**: 0-100 threat level scoring
- **Confidence Metrics**: Reliability indicators for analysis
- **Priority Recommendations**: Automated response suggestions
- **Context Analysis**: Understanding of conversation context and urgency

### 🎯 Perfect For
- **Security Operations Centers (SOCs)**
- **Threat Hunting Teams**
- **Digital Forensics Professionals**
- **Incident Response Teams**
- **Cybersecurity Researchers**

This transforms a simple monitoring bot into a comprehensive threat intelligence platform! 🚀# intel-case
