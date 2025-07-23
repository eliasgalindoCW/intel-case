require('dotenv').config();

const config = {
    // Core Telegram Bot Configuration
    telegram: {
        token: process.env.TELEGRAM_BOT_TOKEN,
        allowedChatIds: process.env.ALLOWED_CHAT_IDS ? 
            process.env.ALLOWED_CHAT_IDS.split(',').map(id => id.trim()) : []
    },

    // Discord Configuration
    discord: {
        webhookUrl: process.env.DISCORD_WEBHOOK_URL
    },

    // Monitoring Configuration
    monitoring: {
        keywords: process.env.KEYWORDS ? 
            process.env.KEYWORDS.split(',').map(k => k.trim().toLowerCase()) : [],
        enableCaseSensitive: process.env.ENABLE_CASE_SENSITIVE === 'true'
    },

    // OCR Configuration (Optional)
    ocr: {
        enabled: process.env.ENABLE_OCR === 'true',
        language: process.env.OCR_LANGUAGE || 'eng',
        confidence: parseInt(process.env.OCR_CONFIDENCE) || 60,
        maxFileSize: parseInt(process.env.OCR_MAX_FILE_SIZE) || 10485760, // 10MB
        supportedFormats: ['jpg', 'jpeg', 'png', 'pdf', 'gif', 'bmp']
    },

    // Database Configuration (Optional)
    database: {
        enabled: process.env.ENABLE_DATABASE === 'true',
        type: process.env.DB_TYPE || 'sqlite', // sqlite, postgresql
        connection: {
            // SQLite
            filename: process.env.DB_FILENAME || './data/alerts.db',
            // PostgreSQL
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'telegram_intel',
            username: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || ''
        },
        pool: {
            min: parseInt(process.env.DB_POOL_MIN) || 2,
            max: parseInt(process.env.DB_POOL_MAX) || 10
        }
    },

    // AI Analysis Configuration (Surprise Feature)
    ai: {
        enabled: process.env.ENABLE_AI_ANALYSIS === 'true',
        openaiApiKey: process.env.OPENAI_API_KEY,
        model: process.env.AI_MODEL || 'gpt-3.5-turbo',
        threatAnalysis: process.env.ENABLE_THREAT_ANALYSIS === 'true',
        sentimentAnalysis: process.env.ENABLE_SENTIMENT_ANALYSIS === 'true',
        translation: {
            enabled: process.env.ENABLE_TRANSLATION === 'true',
            targetLanguage: process.env.TRANSLATION_TARGET_LANG || 'en',
            googleCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS
        }
    },

    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableFileLogging: process.env.ENABLE_FILE_LOGGING === 'true',
        logDir: process.env.LOG_DIR || './logs',
        maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
        maxSize: process.env.LOG_MAX_SIZE || '10m'
    },

    // Server Configuration (for health checks and metrics)
    server: {
        enabled: process.env.ENABLE_SERVER === 'true',
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || '0.0.0.0'
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000, // 1 minute
        maxAlerts: parseInt(process.env.MAX_ALERTS_PER_WINDOW) || 10
    }
};

function validateConfig() {
    const errors = [];

    if (!config.telegram.token) {
        errors.push('TELEGRAM_BOT_TOKEN is required');
    }

    if (!config.discord.webhookUrl) {
        errors.push('DISCORD_WEBHOOK_URL is required');
    }

    if (config.monitoring.keywords.length === 0) {
        errors.push('KEYWORDS must be specified');
    }

    if (config.database.enabled && config.database.type === 'postgresql') {
        if (!config.database.connection.host || !config.database.connection.database) {
            errors.push('PostgreSQL configuration incomplete');
        }
    }

    if (config.ai.enabled && !config.ai.openaiApiKey) {
        errors.push('OPENAI_API_KEY is required when AI analysis is enabled');
    }

    if (errors.length > 0) {
        throw new Error(`Configuration errors:\n${errors.join('\n')}`);
    }
}

module.exports = { config, validateConfig };