const express = require('express');
const cors = require('cors');
const { config } = require('./config/config');
const logger = require('./utils/logger');
const database = require('./database/database');
const ocrService = require('./services/ocrService');
const aiService = require('./services/aiService');

class HealthServer {
    constructor() {
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        
        // Request logging
        this.app.use((req, res, next) => {
            logger.debug(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                features: {
                    ocr: config.ocr.enabled,
                    database: config.database.enabled,
                    ai: config.ai.enabled,
                    translation: config.ai.translation.enabled
                }
            };

            res.status(200).json(health);
        });

        // Detailed status endpoint
        this.app.get('/status', async (req, res) => {
            try {
                const status = {
                    application: {
                        name: 'Telegram Intel Monitor',
                        version: '2.0.0',
                        environment: process.env.NODE_ENV || 'development',
                        uptime: process.uptime(),
                        memory: process.memoryUsage(),
                        cpu: process.cpuUsage()
                    },
                    database: {
                        enabled: config.database.enabled,
                        type: config.database.type,
                        connected: database.isConnected
                    },
                    services: {
                        ocr: ocrService.getProcessingStats(),
                        ai: aiService.getServiceStatus()
                    },
                    configuration: {
                        keywordCount: config.monitoring.keywords.length,
                        allowedChats: config.telegram.allowedChatIds.length,
                        rateLimit: config.rateLimit
                    }
                };

                res.status(200).json(status);
            } catch (error) {
                logger.error('Status endpoint error:', error);
                res.status(500).json({
                    status: 'error',
                    message: error.message
                });
            }
        });

        // Metrics endpoint (for monitoring systems)
        this.app.get('/metrics', async (req, res) => {
            try {
                let metrics = {
                    telegram_bot_uptime_seconds: process.uptime(),
                    telegram_bot_memory_usage_bytes: process.memoryUsage().heapUsed,
                    telegram_bot_features_enabled: {
                        ocr: config.ocr.enabled ? 1 : 0,
                        database: config.database.enabled ? 1 : 0,
                        ai: config.ai.enabled ? 1 : 0
                    }
                };

                // Add database metrics if available
                if (config.database.enabled && database.isConnected) {
                    try {
                        const recentAlerts = await database.getRecentAlerts(1);
                        metrics.telegram_bot_database_connected = 1;
                        metrics.telegram_bot_last_alert_timestamp = recentAlerts.length > 0 
                            ? new Date(recentAlerts[0].timestamp).getTime() / 1000 
                            : 0;
                    } catch (error) {
                        metrics.telegram_bot_database_connected = 0;
                    }
                }

                res.set('Content-Type', 'text/plain');
                res.status(200).send(this.formatPrometheusMetrics(metrics));
            } catch (error) {
                logger.error('Metrics endpoint error:', error);
                res.status(500).json({
                    status: 'error',
                    message: error.message
                });
            }
        });

        // Statistics endpoint (if database enabled)
        this.app.get('/stats', async (req, res) => {
            if (!config.database.enabled) {
                return res.status(404).json({
                    error: 'Database not enabled'
                });
            }

            try {
                const [recentAlerts, keywordStats, chatStats] = await Promise.all([
                    database.getRecentAlerts(10),
                    database.getKeywordStats(),
                    database.getChatStats()
                ]);

                res.status(200).json({
                    recentAlerts: recentAlerts.length,
                    topKeywords: keywordStats.slice(0, 10),
                    activeChatCount: chatStats.length,
                    totalAlerts: chatStats.reduce((sum, chat) => sum + chat.total_alerts, 0)
                });
            } catch (error) {
                logger.error('Stats endpoint error:', error);
                res.status(500).json({
                    error: error.message
                });
            }
        });

        // Recent alerts endpoint (if database enabled)
        this.app.get('/alerts', async (req, res) => {
            if (!config.database.enabled) {
                return res.status(404).json({
                    error: 'Database not enabled'
                });
            }

            try {
                const limit = Math.min(parseInt(req.query.limit) || 50, 100);
                const alerts = await database.getRecentAlerts(limit);
                
                res.status(200).json({
                    alerts: alerts.map(alert => ({
                        id: alert.id,
                        chatTitle: alert.chat_title,
                        keywords: JSON.parse(alert.keywords_found || '[]'),
                        alertType: alert.alert_type,
                        timestamp: alert.timestamp,
                        confidenceScore: alert.confidence_score
                    })),
                    count: alerts.length
                });
            } catch (error) {
                logger.error('Alerts endpoint error:', error);
                res.status(500).json({
                    error: error.message
                });
            }
        });

        // Configuration endpoint (read-only)
        this.app.get('/config', (req, res) => {
            const safeConfig = {
                features: {
                    ocr: config.ocr.enabled,
                    database: config.database.enabled,
                    ai: config.ai.enabled,
                    translation: config.ai.translation.enabled
                },
                monitoring: {
                    keywordCount: config.monitoring.keywords.length,
                    allowedChatCount: config.telegram.allowedChatIds.length
                },
                ocr: config.ocr.enabled ? {
                    language: config.ocr.language,
                    supportedFormats: config.ocr.supportedFormats,
                    maxFileSize: config.ocr.maxFileSize
                } : null,
                rateLimit: config.rateLimit
            };

            res.status(200).json(safeConfig);
        });

        // Catch-all for undefined routes
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.method} ${req.originalUrl} not found`
            });
        });

        // Error handler
        this.app.use((error, req, res, next) => {
            logger.error('Express error:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message
            });
        });
    }

    formatPrometheusMetrics(metrics) {
        let output = '';
        
        for (const [key, value] of Object.entries(metrics)) {
            if (typeof value === 'object') {
                for (const [subKey, subValue] of Object.entries(value)) {
                    output += `${key}{feature="${subKey}"} ${subValue}\n`;
                }
            } else {
                output += `${key} ${value}\n`;
            }
        }
        
        return output;
    }

    start() {
        if (!config.server.enabled) {
            logger.info('HTTP server disabled in configuration');
            return;
        }

        const server = this.app.listen(config.server.port, config.server.host, () => {
            logger.info(`Health server running on ${config.server.host}:${config.server.port}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger.info('HTTP server closed');
            });
        });

        return server;
    }
}

module.exports = HealthServer;