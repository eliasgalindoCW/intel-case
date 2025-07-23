const OpenAI = require('openai');
const sentiment = require('sentiment');
const natural = require('natural');
const { Translate } = require('@google-cloud/translate').v2;
const { config } = require('../config/config');
const logger = require('../utils/logger');

class AIService {
    constructor() {
        this.openai = null;
        this.translate = null;
        this.sentimentAnalyzer = new sentiment();
        
        if (config.ai.enabled && config.ai.openaiApiKey) {
            this.openai = new OpenAI({
                apiKey: config.ai.openaiApiKey
            });
        }

        if (config.ai.translation.enabled && config.ai.translation.googleCredentials) {
            this.translate = new Translate();
        }
    }

    // SURPRISE FEATURE: Advanced Threat Intelligence Analysis
    async analyzeThreatIntelligence(text, metadata = {}) {
        if (!config.ai.enabled || !config.ai.threatAnalysis || !this.openai) {
            return null;
        }

        const startTime = Date.now();

        try {
            const prompt = this.buildThreatAnalysisPrompt(text, metadata);
            
            const response = await this.openai.chat.completions.create({
                model: config.ai.model,
                messages: [
                    {
                        role: "system",
                        content: "You are a cybersecurity threat intelligence analyst. Analyze the provided message content for potential security threats, suspicious activities, and intelligence indicators. Provide structured analysis with confidence scores."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.1, // Low temperature for consistent analysis
                max_tokens: 1000
            });

            const analysis = this.parseThreatAnalysis(response.choices[0].message.content);
            const processingTime = Date.now() - startTime;

            const result = {
                type: 'threat_intelligence',
                analysis,
                confidence: analysis.overallThreatLevel,
                modelUsed: config.ai.model,
                processingTime,
                inputLength: text.length,
                metadata
            };

            logger.logAIAnalysis(result);
            return result;

        } catch (error) {
            logger.error('Threat intelligence analysis failed:', error);
            return {
                type: 'threat_intelligence',
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    buildThreatAnalysisPrompt(text, metadata) {
        return `
Analyze the following message content for cybersecurity threats and intelligence indicators:

MESSAGE CONTENT:
"${text}"

METADATA:
- Chat ID: ${metadata.chatId || 'Unknown'}
- Sender: ${metadata.sender || 'Unknown'}
- Timestamp: ${metadata.timestamp || 'Unknown'}
- Source Type: ${metadata.sourceType || 'text'}

Please analyze for:

1. THREAT INDICATORS:
   - Malware URLs/domains
   - Phishing attempts
   - Social engineering tactics
   - Credential harvesting
   - Suspicious financial requests
   - Darkweb marketplace references

2. INTELLIGENCE VALUE:
   - Mentions of vulnerabilities (CVEs)
   - Zero-day discussions
   - Attack methodology descriptions
   - Tool/technique references (MITRE ATT&CK)
   - Infrastructure indicators (IPs, domains)

3. BEHAVIORAL PATTERNS:
   - Urgency tactics
   - Authority impersonation
   - Fear-based messaging
   - Reward/incentive offers

4. RISK ASSESSMENT:
   - Overall threat level (0-100)
   - Confidence in assessment (0-100)
   - Immediate action required (yes/no)
   - Recommended response

Respond in JSON format:
{
  "threatIndicators": [],
  "intelligenceValue": "low|medium|high",
  "behavioralFlags": [],
  "overallThreatLevel": 0-100,
  "confidence": 0-100,
  "immediateAction": boolean,
  "recommendedResponse": "",
  "categories": [],
  "iocs": {
    "urls": [],
    "domains": [],
    "ips": [],
    "emails": []
  }
}`;
    }

    parseThreatAnalysis(aiResponse) {
        try {
            // Try to extract JSON from the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            // Fallback: parse manually if JSON extraction fails
            return {
                threatIndicators: [],
                intelligenceValue: 'low',
                behavioralFlags: [],
                overallThreatLevel: 10,
                confidence: 50,
                immediateAction: false,
                recommendedResponse: 'Manual review recommended',
                categories: ['parsing_error'],
                iocs: { urls: [], domains: [], ips: [], emails: [] },
                rawResponse: aiResponse
            };
        } catch (error) {
            logger.error('Failed to parse threat analysis:', error);
            return {
                error: 'Failed to parse AI response',
                rawResponse: aiResponse
            };
        }
    }

    // Enhanced Sentiment Analysis
    async analyzeSentiment(text) {
        if (!config.ai.sentimentAnalysis) {
            return null;
        }

        const startTime = Date.now();

        try {
            // Use basic sentiment analysis
            const basicSentiment = this.sentimentAnalyzer.analyze(text);
            
            // Enhanced analysis with OpenAI if available
            let enhancedAnalysis = null;
            if (this.openai && config.ai.enabled) {
                enhancedAnalysis = await this.getEnhancedSentiment(text);
            }

            const result = {
                type: 'sentiment',
                basic: {
                    score: basicSentiment.score,
                    comparative: basicSentiment.comparative,
                    calculation: basicSentiment.calculation,
                    positive: basicSentiment.positive,
                    negative: basicSentiment.negative
                },
                enhanced: enhancedAnalysis,
                processingTime: Date.now() - startTime
            };

            return result;

        } catch (error) {
            logger.error('Sentiment analysis failed:', error);
            return {
                type: 'sentiment',
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    async getEnhancedSentiment(text) {
        try {
            const response = await this.openai.chat.completions.create({
                model: config.ai.model,
                messages: [
                    {
                        role: "system",
                        content: "Analyze the sentiment and emotional context of the given text. Provide scores for sentiment, urgency, hostility, and deception indicators."
                    },
                    {
                        role: "user",
                        content: `Analyze this text: "${text}"\n\nProvide JSON response with sentiment (-1 to 1), urgency (0-1), hostility (0-1), deception (0-1), and emotional_context (array of emotions).`
                    }
                ],
                temperature: 0.1,
                max_tokens: 200
            });

            const content = response.choices[0].message.content;
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            
            return null;
        } catch (error) {
            logger.error('Enhanced sentiment analysis failed:', error);
            return null;
        }
    }

    // Multi-language Translation
    async translateText(text, targetLanguage = null) {
        if (!config.ai.translation.enabled || !this.translate) {
            return null;
        }

        const target = targetLanguage || config.ai.translation.targetLanguage;
        const startTime = Date.now();

        try {
            // Detect language first
            const [detection] = await this.translate.detect(text);
            const detectedLanguage = detection.language;
            
            // Skip translation if already in target language
            if (detectedLanguage === target) {
                return {
                    type: 'translation',
                    originalLanguage: detectedLanguage,
                    targetLanguage: target,
                    originalText: text,
                    translatedText: text,
                    confidence: detection.confidence,
                    skipped: true,
                    processingTime: Date.now() - startTime
                };
            }

            // Perform translation
            const [translation] = await this.translate.translate(text, target);

            return {
                type: 'translation',
                originalLanguage: detectedLanguage,
                targetLanguage: target,
                originalText: text,
                translatedText: translation,
                confidence: detection.confidence,
                processingTime: Date.now() - startTime
            };

        } catch (error) {
            logger.error('Translation failed:', error);
            return {
                type: 'translation',
                error: error.message,
                processingTime: Date.now() - startTime
            };
        }
    }

    // Text Classification
    classifyText(text) {
        try {
            // Use natural language processing for basic classification
            const tokens = natural.WordTokenizer.tokenize(text.toLowerCase());
            
            // Define classification patterns
            const patterns = {
                technical: ['vulnerability', 'exploit', 'malware', 'backdoor', 'trojan', 'virus'],
                financial: ['payment', 'bitcoin', 'crypto', 'bank', 'card', 'money', 'price'],
                social: ['urgent', 'help', 'emergency', 'please', 'asap', 'immediately'],
                suspicious: ['click here', 'download', 'install', 'verify', 'confirm', 'update'],
                communication: ['meeting', 'call', 'email', 'message', 'contact', 'reply']
            };

            const scores = {};
            for (const [category, keywords] of Object.entries(patterns)) {
                scores[category] = keywords.filter(keyword => 
                    tokens.some(token => token.includes(keyword))
                ).length;
            }

            const topCategory = Object.keys(scores).reduce((a, b) => 
                scores[a] > scores[b] ? a : b
            );

            return {
                type: 'classification',
                category: topCategory,
                scores,
                confidence: scores[topCategory] / Math.max(1, tokens.length)
            };

        } catch (error) {
            logger.error('Text classification failed:', error);
            return {
                type: 'classification',
                error: error.message
            };
        }
    }

    // Comprehensive AI Analysis (combines all features)
    async performComprehensiveAnalysis(text, metadata = {}) {
        if (!config.ai.enabled) {
            return null;
        }

        const startTime = Date.now();
        const results = {};

        try {
            // Run analyses in parallel where possible
            const promises = [];

            if (config.ai.threatAnalysis && this.openai) {
                promises.push(
                    this.analyzeThreatIntelligence(text, metadata)
                        .then(result => results.threatIntelligence = result)
                        .catch(error => results.threatIntelligence = { error: error.message })
                );
            }

            if (config.ai.sentimentAnalysis) {
                promises.push(
                    this.analyzeSentiment(text)
                        .then(result => results.sentiment = result)
                        .catch(error => results.sentiment = { error: error.message })
                );
            }

            if (config.ai.translation.enabled && this.translate) {
                promises.push(
                    this.translateText(text)
                        .then(result => results.translation = result)
                        .catch(error => results.translation = { error: error.message })
                );
            }

            // Always run classification (doesn't require external APIs)
            results.classification = this.classifyText(text);

            // Wait for all analyses to complete
            await Promise.all(promises);

            return {
                type: 'comprehensive_analysis',
                results,
                totalProcessingTime: Date.now() - startTime,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            logger.error('Comprehensive AI analysis failed:', error);
            return {
                type: 'comprehensive_analysis',
                error: error.message,
                partialResults: results,
                totalProcessingTime: Date.now() - startTime
            };
        }
    }

    // Get service status and capabilities
    getServiceStatus() {
        return {
            enabled: config.ai.enabled,
            capabilities: {
                threatAnalysis: config.ai.threatAnalysis && !!this.openai,
                sentimentAnalysis: config.ai.sentimentAnalysis,
                translation: config.ai.translation.enabled && !!this.translate,
                textClassification: true
            },
            models: {
                openai: config.ai.model,
                translation: 'google-translate'
            }
        };
    }
}

module.exports = new AIService();