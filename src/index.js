const TelegramBot = require('node-telegram-bot-api');
const { config, validateConfig } = require('./config/config');
const logger = require('./utils/logger');
const database = require('./database/database');
const ocrService = require('./services/ocrService');
const aiService = require('./services/aiService');
const discordService = require('./services/discordService');
const HealthServer = require('./server');

class TelegramIntelMonitor {
    constructor() {
        this.bot = null;
        this.healthServer = null;
        this.isShuttingDown = false;
        
        // Initialize components
        this.init();
    }

    async init() {
        try {
            // Validate configuration
            validateConfig();
            logger.info('Configuration validated successfully');

            // Connect to database if enabled
            if (config.database.enabled) {
                await database.connect();
            }

            // Initialize Telegram bot
            this.bot = new TelegramBot(config.telegram.token, { polling: true });
            this.setupBotHandlers();

            // Start health server if enabled
            if (config.server.enabled) {
                this.healthServer = new HealthServer();
                this.healthServer.start();
            }

            // Setup graceful shutdown
            this.setupGracefulShutdown();

            // Send startup notification
            await discordService.sendHealthCheck();

            logger.info('Telegram Intel Monitor started successfully');
            logger.info(`Monitoring ${config.monitoring.keywords.length} keywords`);
            logger.info(`Features enabled: OCR(${config.ocr.enabled}), DB(${config.database.enabled}), AI(${config.ai.enabled})`);

        } catch (error) {
            logger.error('Failed to initialize bot:', error);
            process.exit(1);
        }
    }

    setupBotHandlers() {
        // Message handler
        this.bot.on('message', async (msg) => {
            if (this.isShuttingDown) return;
            await this.handleMessage(msg);
        });

        // Photo handler
        this.bot.on('photo', async (msg) => {
            if (this.isShuttingDown) return;
            await this.handlePhoto(msg);
        });

        // Document handler
        this.bot.on('document', async (msg) => {
            if (this.isShuttingDown) return;
            await this.handleDocument(msg);
        });

        // Error handlers
        this.bot.on('polling_error', (error) => {
            logger.error('Telegram polling error:', error);
        });

        this.bot.on('error', (error) => {
            logger.error('Telegram bot error:', error);
        });

        logger.info('Bot handlers configured');
    }

    async handleMessage(msg) {
        try {
            const chatId = msg.chat.id.toString();
            const messageText = msg.text || msg.caption || '';
            
            // Check if chat is allowed
            if (!this.isChatAllowed(chatId)) {
                return;
            }

            // Check for keywords in text
            const foundKeywords = this.findKeywords(messageText);
            
            if (foundKeywords.length > 0) {
                await this.processAlert(msg, foundKeywords, 'text');
            }

        } catch (error) {
            logger.error('Error handling message:', error);
        }
    }

    async handlePhoto(msg) {
        if (!config.ocr.enabled) return;

        try {
            const chatId = msg.chat.id.toString();
            
            if (!this.isChatAllowed(chatId)) {
                return;
            }

            // Get the highest resolution photo
            const photo = msg.photo[msg.photo.length - 1];
            const fileLink = await this.bot.getFileLink(photo.file_id);
            
            // Process with OCR
            const ocrResult = await ocrService.processFile({
                file_size: photo.file_size,
                file_path: `photo_${photo.file_id}.jpg`
            }, fileLink);

            if (ocrResult && ocrResult.extractedText) {
                // Check for keywords in extracted text
                const foundKeywords = this.findKeywords(ocrResult.extractedText);
                
                if (foundKeywords.length > 0) {
                    await this.processAlert(msg, foundKeywords, 'image', ocrResult);
                }
            }

        } catch (error) {
            logger.error('Error handling photo:', error);
        }
    }

    async handleDocument(msg) {
        if (!config.ocr.enabled) return;

        try {
            const chatId = msg.chat.id.toString();
            
            if (!this.isChatAllowed(chatId)) {
                return;
            }

            const document = msg.document;
            const fileName = document.file_name || '';
            const fileExtension = fileName.split('.').pop()?.toLowerCase();

            // Check if it's a supported format
            if (!config.ocr.supportedFormats.includes(fileExtension)) {
                return;
            }

            const fileLink = await this.bot.getFileLink(document.file_id);
            
            // Process with OCR
            const ocrResult = await ocrService.processFile({
                file_size: document.file_size,
                file_path: fileName,
                file_name: fileName
            }, fileLink);

            if (ocrResult && ocrResult.extractedText) {
                const foundKeywords = this.findKeywords(ocrResult.extractedText);
                
                if (foundKeywords.length > 0) {
                    await this.processAlert(msg, foundKeywords, 'pdf', ocrResult);
                }
            }

        } catch (error) {
            logger.error('Error handling document:', error);
        }
    }

    async processAlert(msg, foundKeywords, alertType, ocrResult = null) {
        try {
            // Prepare alert data
            const alertData = {
                chatId: msg.chat.id.toString(),
                chatTitle: msg.chat.title || msg.chat.username,
                messageId: msg.message_id.toString(),
                senderUsername: msg.from.username,
                senderFirstName: msg.from.first_name,
                senderLastName: msg.from.last_name,
                messageText: msg.text || msg.caption || '',
                keywordsFound: foundKeywords,
                alertType,
                timestamp: new Date(msg.date * 1000).toISOString()
            };

            // Enhanced text for AI analysis
            const textForAnalysis = ocrResult 
                ? `${alertData.messageText}\n\nExtracted from ${alertType}: ${ocrResult.extractedText}`
                : alertData.messageText;

            // Perform AI analysis if enabled
            let aiAnalysis = null;
            if (config.ai.enabled && textForAnalysis.trim()) {
                aiAnalysis = await aiService.performComprehensiveAnalysis(textForAnalysis, {
                    chatId: alertData.chatId,
                    sender: alertData.senderUsername || `${alertData.senderFirstName} ${alertData.senderLastName}`.trim(),
                    timestamp: alertData.timestamp,
                    sourceType: alertType
                });
            }

            // Save to database if enabled
            let alertId = null;
            if (config.database.enabled) {
                alertId = await database.saveAlert(alertData);
                
                if (ocrResult && alertId) {
                    await database.saveOCRResult(alertId, ocrResult);
                }
                
                if (aiAnalysis && alertId) {
                    await database.saveAIAnalysis(alertId, aiAnalysis);
                }
            }

            // Send Discord alert
            await discordService.sendAlert(alertData, ocrResult, aiAnalysis);

            // Log the alert
            logger.logAlert({
                alertId,
                chatId: alertData.chatId,
                keywords: foundKeywords,
                messageId: alertData.messageId,
                alertType
            });

        } catch (error) {
            logger.error('Error processing alert:', error);
        }
    }

    isChatAllowed(chatId) {
        if (config.telegram.allowedChatIds.length === 0) {
            return true; // Allow all chats if none specified
        }
        return config.telegram.allowedChatIds.includes(chatId);
    }

    findKeywords(text) {
        if (!text || config.monitoring.keywords.length === 0) {
            return [];
        }

        const textToSearch = config.monitoring.enableCaseSensitive 
            ? text 
            : text.toLowerCase();

        return config.monitoring.keywords.filter(keyword => {
            const keywordToSearch = config.monitoring.enableCaseSensitive 
                ? keyword 
                : keyword.toLowerCase();
            return textToSearch.includes(keywordToSearch);
        });
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            if (this.isShuttingDown) return;
            this.isShuttingDown = true;

            logger.info(`Received ${signal}, shutting down gracefully...`);

            try {
                // Stop Telegram polling
                if (this.bot) {
                    await this.bot.stopPolling();
                    logger.info('Telegram bot stopped');
                }

                // Close database connection
                if (config.database.enabled) {
                    await database.close();
                }

                logger.info('Shutdown completed');
                process.exit(0);
            } catch (error) {
                logger.error('Error during shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
            shutdown('UNCAUGHT_EXCEPTION');
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection at:', promise, 'reason:', reason);
            shutdown('UNHANDLED_REJECTION');
        });
    }
}

// Initialize the bot
if (require.main === module) {
    new TelegramIntelMonitor();
}

module.exports = TelegramIntelMonitor;