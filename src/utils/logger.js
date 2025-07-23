const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { config } = require('../config/config');

// Ensure log directory exists
if (config.logging.enableFileLogging && !fs.existsSync(config.logging.logDir)) {
    fs.mkdirSync(config.logging.logDir, { recursive: true });
}

// Create logger configuration
const loggerConfig = {
    level: config.logging.level,
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ timestamp, level, message, stack }) => {
                    return `${timestamp} [${level}]: ${stack || message}`;
                })
            )
        })
    ]
};

// Add file transport if enabled
if (config.logging.enableFileLogging) {
    loggerConfig.transports.push(
        new winston.transports.File({
            filename: path.join(config.logging.logDir, 'error.log'),
            level: 'error',
            maxsize: config.logging.maxSize,
            maxFiles: config.logging.maxFiles
        }),
        new winston.transports.File({
            filename: path.join(config.logging.logDir, 'combined.log'),
            maxsize: config.logging.maxSize,
            maxFiles: config.logging.maxFiles
        })
    );
}

const logger = winston.createLogger(loggerConfig);

// Add custom methods for structured logging
logger.logAlert = (alertData) => {
    logger.info('Alert triggered', {
        type: 'alert',
        chatId: alertData.chatId,
        keywords: alertData.keywords,
        messageId: alertData.messageId,
        timestamp: new Date().toISOString()
    });
};

logger.logOCR = (ocrData) => {
    logger.info('OCR processing completed', {
        type: 'ocr',
        fileType: ocrData.fileType,
        confidence: ocrData.confidence,
        extractedTextLength: ocrData.textLength,
        processingTime: ocrData.processingTime
    });
};

logger.logAIAnalysis = (analysisData) => {
    logger.info('AI analysis completed', {
        type: 'ai_analysis',
        analysisType: analysisData.type,
        confidence: analysisData.confidence,
        result: analysisData.result
    });
};

logger.logDatabaseOperation = (operation, details) => {
    logger.debug('Database operation', {
        type: 'database',
        operation,
        details
    });
};

module.exports = logger;