const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { config } = require('../config/config');
const logger = require('../utils/logger');

class DatabaseManager {
    constructor() {
        this.db = null;
        this.isConnected = false;
        this.type = config.database.type;
    }

    async connect() {
        if (!config.database.enabled) {
            logger.info('Database disabled in configuration');
            return;
        }

        try {
            if (this.type === 'sqlite') {
                await this.connectSQLite();
            } else if (this.type === 'postgresql') {
                await this.connectPostgreSQL();
            } else {
                throw new Error(`Unsupported database type: ${this.type}`);
            }

            await this.migrate();
            this.isConnected = true;
            logger.info(`Connected to ${this.type} database`);
        } catch (error) {
            logger.error('Database connection failed:', error);
            throw error;
        }
    }

    async connectSQLite() {
        const dbPath = config.database.connection.filename;
        const dbDir = path.dirname(dbPath);
        
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        this.db = new sqlite3.Database(dbPath);
        
        // Enable foreign keys
        await this.runQuery('PRAGMA foreign_keys = ON');
    }

    async connectPostgreSQL() {
        this.db = new Client({
            host: config.database.connection.host,
            port: config.database.connection.port,
            database: config.database.connection.database,
            user: config.database.connection.username,
            password: config.database.connection.password
        });

        await this.db.connect();
    }

    async migrate() {
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        // Split schema by statements and execute
        const statements = schema.split(';').filter(stmt => stmt.trim());
        
        for (const statement of statements) {
            if (statement.trim() && !statement.trim().startsWith('--')) {
                await this.runQuery(statement);
            }
        }

        logger.info('Database migration completed');
    }

    async runQuery(query, params = []) {
        if (!this.isConnected && config.database.enabled) {
            throw new Error('Database not connected');
        }

        if (!config.database.enabled) {
            return null;
        }

        return new Promise((resolve, reject) => {
            if (this.type === 'sqlite') {
                if (query.toLowerCase().startsWith('select') || query.toLowerCase().includes('returning')) {
                    this.db.all(query, params, (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows);
                    });
                } else {
                    this.db.run(query, params, function(err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID, changes: this.changes });
                    });
                }
            } else if (this.type === 'postgresql') {
                this.db.query(query, params, (err, result) => {
                    if (err) reject(err);
                    else resolve(result.rows || result);
                });
            }
        });
    }

    async saveAlert(alertData) {
        if (!config.database.enabled) return null;

        const query = `
            INSERT INTO alerts (
                chat_id, chat_title, message_id, sender_username, 
                sender_first_name, sender_last_name, message_text, 
                keywords_found, alert_type, confidence_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            alertData.chatId,
            alertData.chatTitle,
            alertData.messageId,
            alertData.senderUsername,
            alertData.senderFirstName,
            alertData.senderLastName,
            alertData.messageText,
            JSON.stringify(alertData.keywordsFound),
            alertData.alertType || 'text',
            alertData.confidenceScore || null
        ];

        try {
            const result = await this.runQuery(query, params);
            logger.logDatabaseOperation('saveAlert', { alertId: result.lastID });
            
            // Update keyword stats
            await this.updateKeywordStats(alertData.keywordsFound, alertData.chatId);
            
            // Update chat stats
            await this.updateChatStats(alertData.chatId, alertData.chatTitle, alertData.keywordsFound);
            
            return result.lastID || result.insertId;
        } catch (error) {
            logger.error('Failed to save alert:', error);
            throw error;
        }
    }

    async saveOCRResult(alertId, ocrData) {
        if (!config.database.enabled) return null;

        const query = `
            INSERT INTO ocr_results (
                alert_id, file_type, file_size, extracted_text, 
                confidence_score, processing_time_ms, language
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            alertId,
            ocrData.fileType,
            ocrData.fileSize,
            ocrData.extractedText,
            ocrData.confidenceScore,
            ocrData.processingTime,
            ocrData.language
        ];

        try {
            const result = await this.runQuery(query, params);
            logger.logDatabaseOperation('saveOCRResult', { ocrId: result.lastID });
            return result.lastID || result.insertId;
        } catch (error) {
            logger.error('Failed to save OCR result:', error);
            throw error;
        }
    }

    async saveAIAnalysis(alertId, analysisData) {
        if (!config.database.enabled) return null;

        const query = `
            INSERT INTO ai_analysis (
                alert_id, analysis_type, input_text, result, 
                confidence_score, model_used, processing_time_ms
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            alertId,
            analysisData.type,
            analysisData.inputText,
            JSON.stringify(analysisData.result),
            analysisData.confidenceScore,
            analysisData.modelUsed,
            analysisData.processingTime
        ];

        try {
            const result = await this.runQuery(query, params);
            logger.logDatabaseOperation('saveAIAnalysis', { analysisId: result.lastID });
            return result.lastID || result.insertId;
        } catch (error) {
            logger.error('Failed to save AI analysis:', error);
            throw error;
        }
    }

    async updateKeywordStats(keywords, chatId) {
        if (!config.database.enabled) return;

        for (const keyword of keywords) {
            const existingQuery = 'SELECT id, hit_count, chat_ids FROM keyword_stats WHERE keyword = ?';
            const existing = await this.runQuery(existingQuery, [keyword]);

            if (existing && existing.length > 0) {
                const stats = existing[0];
                const chatIds = JSON.parse(stats.chat_ids || '[]');
                if (!chatIds.includes(chatId)) {
                    chatIds.push(chatId);
                }

                const updateQuery = `
                    UPDATE keyword_stats 
                    SET hit_count = hit_count + 1, 
                        last_triggered = CURRENT_TIMESTAMP,
                        chat_ids = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE keyword = ?
                `;
                await this.runQuery(updateQuery, [JSON.stringify(chatIds), keyword]);
            } else {
                const insertQuery = `
                    INSERT INTO keyword_stats (keyword, hit_count, chat_ids) 
                    VALUES (?, 1, ?)
                `;
                await this.runQuery(insertQuery, [keyword, JSON.stringify([chatId])]);
            }
        }
    }

    async updateChatStats(chatId, chatTitle, keywords) {
        if (!config.database.enabled) return;

        const existingQuery = 'SELECT id, total_alerts, keywords_found FROM chat_stats WHERE chat_id = ?';
        const existing = await this.runQuery(existingQuery, [chatId]);

        if (existing && existing.length > 0) {
            const stats = existing[0];
            const existingKeywords = JSON.parse(stats.keywords_found || '[]');
            const allKeywords = [...new Set([...existingKeywords, ...keywords])];

            const updateQuery = `
                UPDATE chat_stats 
                SET total_alerts = total_alerts + 1,
                    last_alert = CURRENT_TIMESTAMP,
                    keywords_found = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE chat_id = ?
            `;
            await this.runQuery(updateQuery, [JSON.stringify(allKeywords), chatId]);
        } else {
            const insertQuery = `
                INSERT INTO chat_stats (chat_id, chat_title, keywords_found) 
                VALUES (?, ?, ?)
            `;
            await this.runQuery(insertQuery, [chatId, chatTitle, JSON.stringify(keywords)]);
        }
    }

    async getRecentAlerts(limit = 50) {
        if (!config.database.enabled) return [];

        const query = `
            SELECT a.*, ocr.extracted_text, ai.result as ai_analysis
            FROM alerts a
            LEFT JOIN ocr_results ocr ON a.id = ocr.alert_id
            LEFT JOIN ai_analysis ai ON a.id = ai.alert_id
            ORDER BY a.timestamp DESC
            LIMIT ?
        `;

        return await this.runQuery(query, [limit]);
    }

    async getKeywordStats() {
        if (!config.database.enabled) return [];

        const query = 'SELECT * FROM top_keywords';
        return await this.runQuery(query);
    }

    async getChatStats() {
        if (!config.database.enabled) return [];

        const query = 'SELECT * FROM chat_activity';
        return await this.runQuery(query);
    }

    async close() {
        if (this.db && this.isConnected) {
            if (this.type === 'sqlite') {
                this.db.close();
            } else if (this.type === 'postgresql') {
                await this.db.end();
            }
            this.isConnected = false;
            logger.info('Database connection closed');
        }
    }
}

module.exports = new DatabaseManager();