const axios = require('axios');
const { config } = require('../config/config');
const logger = require('../utils/logger');

class DiscordService {
    constructor() {
        this.webhookUrl = config.discord.webhookUrl;
        this.rateLimit = {
            lastSent: 0,
            count: 0,
            windowStart: Date.now()
        };
    }

    async sendAlert(alertData, ocrResult = null, aiAnalysis = null) {
        try {
            // Check rate limiting
            if (!this.checkRateLimit()) {
                logger.warn('Discord alert rate limit exceeded, skipping alert');
                return false;
            }

            const embed = this.buildEmbed(alertData, ocrResult, aiAnalysis);
            
            const payload = {
                embeds: [embed]
            };

            // Add additional embeds for complex analysis
            if (aiAnalysis && aiAnalysis.results) {
                const additionalEmbeds = this.buildAIAnalysisEmbeds(aiAnalysis.results);
                payload.embeds.push(...additionalEmbeds);
            }

            const response = await axios.post(this.webhookUrl, payload, {
                timeout: 10000
            });

            if (response.status === 204) {
                this.updateRateLimit();
                logger.info(`Discord alert sent successfully for keywords: ${alertData.keywordsFound.join(', ')}`);
                return true;
            }

            return false;

        } catch (error) {
            logger.error('Discord alert failed:', {
                error: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            return false;
        }
    }

    buildEmbed(alertData, ocrResult, aiAnalysis) {
        const embed = {
            title: '🚨 Intelligence Alert',
            color: this.getAlertColor(alertData, aiAnalysis),
            timestamp: new Date().toISOString(),
            fields: []
        };

        // Keywords found
        embed.fields.push({
            name: '🔍 Keywords Detected',
            value: alertData.keywordsFound.map(k => `\`${k}\``).join(', '),
            inline: false
        });

        // Message content
        const messageText = alertData.messageText || 'No text content';
        embed.fields.push({
            name: '💬 Message Content',
            value: messageText.length > 1000 ? messageText.substring(0, 1000) + '...' : messageText,
            inline: false
        });

        // Source information
        embed.fields.push(
            {
                name: '📍 Chat',
                value: alertData.chatTitle || `Chat ${alertData.chatId}`,
                inline: true
            },
            {
                name: '👤 Sender',
                value: this.formatSender(alertData),
                inline: true
            },
            {
                name: '⏰ Time',
                value: new Date(alertData.timestamp || Date.now()).toLocaleString(),
                inline: true
            }
        );

        // Alert type
        embed.fields.push({
            name: '📂 Content Type',
            value: this.formatAlertType(alertData.alertType),
            inline: true
        });

        // OCR results
        if (ocrResult && ocrResult.extractedText) {
            const ocrText = ocrResult.extractedText.length > 500 
                ? ocrResult.extractedText.substring(0, 500) + '...'
                : ocrResult.extractedText;
            
            embed.fields.push({
                name: '🔤 OCR Extracted Text',
                value: `\`\`\`${ocrText}\`\`\``,
                inline: false
            });

            embed.fields.push({
                name: '📊 OCR Confidence',
                value: `${Math.round(ocrResult.confidenceScore)}%`,
                inline: true
            });
        }

        // AI Threat Analysis Summary
        if (aiAnalysis?.results?.threatIntelligence) {
            const threat = aiAnalysis.results.threatIntelligence.analysis;
            if (threat && !threat.error) {
                embed.fields.push({
                    name: '⚠️ Threat Level',
                    value: this.formatThreatLevel(threat.overallThreatLevel),
                    inline: true
                });

                if (threat.immediateAction) {
                    embed.fields.push({
                        name: '🚨 Action Required',
                        value: '**Immediate attention needed**',
                        inline: true
                    });
                }
            }
        }

        // Footer
        embed.footer = {
            text: 'Telegram Intelligence Monitor',
            icon_url: 'https://telegram.org/img/t_logo.png'
        };

        return embed;
    }

    buildAIAnalysisEmbeds(analysisResults) {
        const embeds = [];

        // Threat Intelligence Embed
        if (analysisResults.threatIntelligence?.analysis && !analysisResults.threatIntelligence.error) {
            const threat = analysisResults.threatIntelligence.analysis;
            
            const threatEmbed = {
                title: '🛡️ Threat Intelligence Analysis',
                color: 0xFF4444,
                fields: [
                    {
                        name: 'Intelligence Value',
                        value: threat.intelligenceValue?.toUpperCase() || 'UNKNOWN',
                        inline: true
                    },
                    {
                        name: 'Confidence',
                        value: `${threat.confidence || 0}%`,
                        inline: true
                    },
                    {
                        name: 'Threat Level',
                        value: `${threat.overallThreatLevel || 0}/100`,
                        inline: true
                    }
                ]
            };

            if (threat.threatIndicators?.length > 0) {
                threatEmbed.fields.push({
                    name: 'Threat Indicators',
                    value: threat.threatIndicators.slice(0, 5).map(t => `• ${t}`).join('\n'),
                    inline: false
                });
            }

            if (threat.recommendedResponse) {
                threatEmbed.fields.push({
                    name: 'Recommended Response',
                    value: threat.recommendedResponse,
                    inline: false
                });
            }

            if (threat.iocs && (threat.iocs.urls?.length > 0 || threat.iocs.domains?.length > 0)) {
                const iocs = [];
                if (threat.iocs.urls?.length > 0) iocs.push(`URLs: ${threat.iocs.urls.length}`);
                if (threat.iocs.domains?.length > 0) iocs.push(`Domains: ${threat.iocs.domains.length}`);
                if (threat.iocs.ips?.length > 0) iocs.push(`IPs: ${threat.iocs.ips.length}`);

                threatEmbed.fields.push({
                    name: 'IOCs Found',
                    value: iocs.join(', '),
                    inline: false
                });
            }

            embeds.push(threatEmbed);
        }

        // Sentiment Analysis Embed
        if (analysisResults.sentiment && !analysisResults.sentiment.error) {
            const sentiment = analysisResults.sentiment;
            
            const sentimentEmbed = {
                title: '😊 Sentiment Analysis',
                color: this.getSentimentColor(sentiment.basic?.score || 0),
                fields: [
                    {
                        name: 'Overall Sentiment',
                        value: this.formatSentimentScore(sentiment.basic?.score || 0),
                        inline: true
                    },
                    {
                        name: 'Comparative Score',
                        value: (sentiment.basic?.comparative || 0).toFixed(3),
                        inline: true
                    }
                ]
            };

            if (sentiment.enhanced) {
                const enhanced = sentiment.enhanced;
                if (enhanced.urgency !== undefined) {
                    sentimentEmbed.fields.push({
                        name: 'Urgency Level',
                        value: `${Math.round(enhanced.urgency * 100)}%`,
                        inline: true
                    });
                }
                if (enhanced.hostility !== undefined) {
                    sentimentEmbed.fields.push({
                        name: 'Hostility Level',
                        value: `${Math.round(enhanced.hostility * 100)}%`,
                        inline: true
                    });
                }
            }

            embeds.push(sentimentEmbed);
        }

        // Translation Embed
        if (analysisResults.translation && !analysisResults.translation.error && !analysisResults.translation.skipped) {
            const translation = analysisResults.translation;
            
            const translationEmbed = {
                title: '🌐 Translation',
                color: 0x4CAF50,
                fields: [
                    {
                        name: `Original (${translation.originalLanguage?.toUpperCase()})`,
                        value: translation.originalText.length > 200 
                            ? translation.originalText.substring(0, 200) + '...'
                            : translation.originalText,
                        inline: false
                    },
                    {
                        name: `Translated (${translation.targetLanguage?.toUpperCase()})`,
                        value: translation.translatedText.length > 200
                            ? translation.translatedText.substring(0, 200) + '...'
                            : translation.translatedText,
                        inline: false
                    },
                    {
                        name: 'Detection Confidence',
                        value: `${Math.round((translation.confidence || 0) * 100)}%`,
                        inline: true
                    }
                ]
            };

            embeds.push(translationEmbed);
        }

        return embeds;
    }

    getAlertColor(alertData, aiAnalysis) {
        // Determine alert color based on threat level and content type
        if (aiAnalysis?.results?.threatIntelligence?.analysis?.overallThreatLevel) {
            const threatLevel = aiAnalysis.results.threatIntelligence.analysis.overallThreatLevel;
            if (threatLevel >= 80) return 0xFF0000; // Red - High threat
            if (threatLevel >= 60) return 0xFF6600; // Orange - Medium-high threat
            if (threatLevel >= 40) return 0xFFCC00; // Yellow - Medium threat
            if (threatLevel >= 20) return 0x99FF00; // Light green - Low-medium threat
        }

        // Default colors based on alert type
        switch (alertData.alertType) {
            case 'image': return 0x9C27B0; // Purple
            case 'pdf': return 0xFF5722; // Deep orange
            case 'ai_analysis': return 0x2196F3; // Blue
            default: return 0xFF6B6B; // Default red
        }
    }

    getSentimentColor(score) {
        if (score > 2) return 0x4CAF50; // Green - Positive
        if (score > 0) return 0x8BC34A; // Light green - Slightly positive
        if (score > -2) return 0xFFC107; // Yellow - Neutral
        if (score > -5) return 0xFF9800; // Orange - Negative
        return 0xF44336; // Red - Very negative
    }

    formatSender(alertData) {
        const parts = [];
        if (alertData.senderUsername) parts.push(`@${alertData.senderUsername}`);
        if (alertData.senderFirstName) parts.push(alertData.senderFirstName);
        if (alertData.senderLastName) parts.push(alertData.senderLastName);
        return parts.length > 0 ? parts.join(' ') : 'Unknown';
    }

    formatAlertType(type) {
        const types = {
            'text': '📝 Text Message',
            'image': '🖼️ Image with OCR',
            'pdf': '📄 PDF Document',
            'ai_analysis': '🤖 AI Analysis'
        };
        return types[type] || '❓ Unknown';
    }

    formatThreatLevel(level) {
        if (level >= 80) return '🔴 **CRITICAL**';
        if (level >= 60) return '🟠 **HIGH**';
        if (level >= 40) return '🟡 **MEDIUM**';
        if (level >= 20) return '🟢 **LOW**';
        return '⚪ **MINIMAL**';
    }

    formatSentimentScore(score) {
        if (score > 2) return '😊 Very Positive';
        if (score > 0) return '🙂 Positive';
        if (score > -2) return '😐 Neutral';
        if (score > -5) return '😟 Negative';
        return '😡 Very Negative';
    }

    checkRateLimit() {
        const now = Date.now();
        
        // Reset window if needed
        if (now - this.rateLimit.windowStart > config.rateLimit.windowMs) {
            this.rateLimit.windowStart = now;
            this.rateLimit.count = 0;
        }

        return this.rateLimit.count < config.rateLimit.maxAlerts;
    }

    updateRateLimit() {
        this.rateLimit.count++;
        this.rateLimit.lastSent = Date.now();
    }

    async sendHealthCheck() {
        try {
            const embed = {
                title: '✅ Bot Health Check',
                color: 0x00FF00,
                description: 'Telegram Intelligence Monitor is running',
                timestamp: new Date().toISOString(),
                fields: [
                    {
                        name: 'Status',
                        value: 'Online',
                        inline: true
                    },
                    {
                        name: 'Features',
                        value: this.getFeatureStatus(),
                        inline: false
                    }
                ]
            };

            await axios.post(this.webhookUrl, { embeds: [embed] });
            logger.info('Health check sent to Discord');
            return true;
        } catch (error) {
            logger.error('Health check failed:', error);
            return false;
        }
    }

    getFeatureStatus() {
        const features = [];
        if (config.ocr.enabled) features.push('📱 OCR');
        if (config.database.enabled) features.push('💾 Database');
        if (config.ai.enabled) features.push('🤖 AI Analysis');
        if (config.ai.translation.enabled) features.push('🌐 Translation');
        
        return features.length > 0 ? features.join(', ') : 'Basic monitoring only';
    }
}

module.exports = new DiscordService();