-- Database schema for Telegram Intel Monitor
-- Supports both SQLite and PostgreSQL

-- Alerts table - stores all triggered alerts
CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- SQLite
    -- id SERIAL PRIMARY KEY, -- PostgreSQL (uncomment for PG)
    chat_id TEXT NOT NULL,
    chat_title TEXT,
    message_id TEXT,
    sender_username TEXT,
    sender_first_name TEXT,
    sender_last_name TEXT,
    message_text TEXT,
    keywords_found TEXT NOT NULL, -- JSON array of keywords
    alert_type TEXT NOT NULL DEFAULT 'text', -- text, image, pdf, ai_analysis
    confidence_score REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_chat_id (chat_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_alert_type (alert_type)
);

-- OCR Results table - stores OCR processing results
CREATE TABLE IF NOT EXISTS ocr_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    extracted_text TEXT,
    confidence_score REAL,
    processing_time_ms INTEGER,
    language TEXT DEFAULT 'eng',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    INDEX idx_alert_id (alert_id),
    INDEX idx_file_type (file_type)
);

-- AI Analysis table - stores AI-powered analysis results
CREATE TABLE IF NOT EXISTS ai_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alert_id INTEGER NOT NULL,
    analysis_type TEXT NOT NULL, -- threat, sentiment, translation
    input_text TEXT,
    result TEXT, -- JSON object with analysis results
    confidence_score REAL,
    model_used TEXT,
    processing_time_ms INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    INDEX idx_alert_id (alert_id),
    INDEX idx_analysis_type (analysis_type)
);

-- Keywords Statistics table - tracks keyword performance
CREATE TABLE IF NOT EXISTS keyword_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    hit_count INTEGER DEFAULT 1,
    last_triggered DATETIME DEFAULT CURRENT_TIMESTAMP,
    chat_ids TEXT, -- JSON array of chat IDs where keyword was found
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(keyword),
    INDEX idx_keyword (keyword),
    INDEX idx_hit_count (hit_count)
);

-- Chat Statistics table - tracks per-chat activity
CREATE TABLE IF NOT EXISTS chat_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id TEXT NOT NULL,
    chat_title TEXT,
    total_alerts INTEGER DEFAULT 1,
    last_alert DATETIME DEFAULT CURRENT_TIMESTAMP,
    keywords_found TEXT, -- JSON array of unique keywords found
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(chat_id),
    INDEX idx_chat_id (chat_id),
    INDEX idx_total_alerts (total_alerts)
);

-- System Metrics table - stores system performance metrics
CREATE TABLE IF NOT EXISTS system_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_unit TEXT,
    tags TEXT, -- JSON object for additional metadata
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_metric_name (metric_name),
    INDEX idx_timestamp (timestamp)
);

-- Views for common queries

-- Alert summary view
CREATE VIEW IF NOT EXISTS alert_summary AS
SELECT 
    DATE(timestamp) as date,
    alert_type,
    COUNT(*) as count,
    AVG(confidence_score) as avg_confidence
FROM alerts 
GROUP BY DATE(timestamp), alert_type
ORDER BY date DESC;

-- Top keywords view
CREATE VIEW IF NOT EXISTS top_keywords AS
SELECT 
    keyword,
    hit_count,
    last_triggered,
    JSON_ARRAY_LENGTH(chat_ids) as unique_chats
FROM keyword_stats 
ORDER BY hit_count DESC
LIMIT 50;

-- Chat activity view
CREATE VIEW IF NOT EXISTS chat_activity AS
SELECT 
    cs.chat_id,
    cs.chat_title,
    cs.total_alerts,
    cs.last_alert,
    COUNT(DISTINCT JSON_EXTRACT(cs.keywords_found, '$[*]')) as unique_keywords,
    cs.first_seen
FROM chat_stats cs
ORDER BY cs.total_alerts DESC;

-- Example queries for common operations:

-- Get recent alerts with details
/*
SELECT 
    a.id,
    a.chat_title,
    a.sender_username,
    a.keywords_found,
    a.alert_type,
    a.timestamp,
    ocr.extracted_text,
    ai.result as ai_analysis
FROM alerts a
LEFT JOIN ocr_results ocr ON a.id = ocr.alert_id
LEFT JOIN ai_analysis ai ON a.id = ai.alert_id
WHERE a.timestamp > datetime('now', '-24 hours')
ORDER BY a.timestamp DESC;
*/

-- Get keyword performance over time
/*
SELECT 
    keyword,
    hit_count,
    DATE(last_triggered) as last_date,
    JSON_ARRAY_LENGTH(chat_ids) as chat_count
FROM keyword_stats
WHERE last_triggered > datetime('now', '-7 days')
ORDER BY hit_count DESC;
*/

-- Get chat statistics
/*
SELECT 
    chat_title,
    total_alerts,
    keywords_found,
    DATE(last_alert) as last_alert_date,
    julianday('now') - julianday(first_seen) as days_monitored
FROM chat_stats
ORDER BY total_alerts DESC;
*/