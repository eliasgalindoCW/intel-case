const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { config } = require('../config/config');
const logger = require('../utils/logger');

class OCRService {
    constructor() {
        this.supportedFormats = config.ocr.supportedFormats;
        this.maxFileSize = config.ocr.maxFileSize;
        this.language = config.ocr.language;
        this.minConfidence = config.ocr.confidence;
    }

    async processFile(fileInfo, downloadUrl) {
        if (!config.ocr.enabled) {
            return null;
        }

        const startTime = Date.now();
        
        try {
            // Validate file
            const validation = this.validateFile(fileInfo);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Download file
            const fileBuffer = await this.downloadFile(downloadUrl, fileInfo.file_size);
            
            let extractedText = '';
            let confidence = 0;

            // Process based on file type
            const fileExtension = this.getFileExtension(fileInfo.file_path || fileInfo.file_name);
            
            if (fileExtension === 'pdf') {
                const result = await this.processPDF(fileBuffer);
                extractedText = result.text;
                confidence = 90; // PDF text extraction is generally reliable
            } else {
                const result = await this.processImage(fileBuffer);
                extractedText = result.text;
                confidence = result.confidence;
            }

            const processingTime = Date.now() - startTime;

            const ocrResult = {
                fileType: fileExtension,
                fileSize: fileInfo.file_size,
                extractedText: extractedText.trim(),
                confidenceScore: confidence,
                processingTime,
                language: this.language,
                textLength: extractedText.length
            };

            logger.logOCR(ocrResult);

            return ocrResult;

        } catch (error) {
            logger.error('OCR processing failed:', error);
            return {
                fileType: this.getFileExtension(fileInfo.file_path || fileInfo.file_name),
                fileSize: fileInfo.file_size,
                extractedText: '',
                confidenceScore: 0,
                processingTime: Date.now() - startTime,
                language: this.language,
                error: error.message
            };
        }
    }

    validateFile(fileInfo) {
        // Check file size
        if (fileInfo.file_size > this.maxFileSize) {
            return {
                valid: false,
                error: `File size ${fileInfo.file_size} exceeds maximum ${this.maxFileSize} bytes`
            };
        }

        // Check file type
        const extension = this.getFileExtension(fileInfo.file_path || fileInfo.file_name);
        if (!this.supportedFormats.includes(extension)) {
            return {
                valid: false,
                error: `File type ${extension} not supported. Supported: ${this.supportedFormats.join(', ')}`
            };
        }

        return { valid: true };
    }

    getFileExtension(filename) {
        if (!filename) return '';
        return path.extname(filename).toLowerCase().substring(1);
    }

    async downloadFile(url, expectedSize) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000, // 30 seconds timeout
                maxContentLength: this.maxFileSize,
                maxBodyLength: this.maxFileSize
            });

            const buffer = Buffer.from(response.data);
            
            // Verify file size matches
            if (expectedSize && buffer.length !== expectedSize) {
                logger.warn(`File size mismatch: expected ${expectedSize}, got ${buffer.length}`);
            }

            return buffer;
        } catch (error) {
            throw new Error(`Failed to download file: ${error.message}`);
        }
    }

    async processImage(imageBuffer) {
        try {
            // Optimize image for OCR
            const optimizedBuffer = await this.optimizeImageForOCR(imageBuffer);

            // Perform OCR
            const { data: { text, confidence } } = await Tesseract.recognize(
                optimizedBuffer,
                this.language,
                {
                    logger: (m) => {
                        if (m.status === 'recognizing text') {
                            logger.debug(`OCR Progress: ${Math.round(m.progress * 100)}%`);
                        }
                    }
                }
            );

            return {
                text: text || '',
                confidence: confidence || 0
            };

        } catch (error) {
            throw new Error(`Image OCR failed: ${error.message}`);
        }
    }

    async optimizeImageForOCR(imageBuffer) {
        try {
            // Use Sharp to optimize image for better OCR results
            const optimized = await sharp(imageBuffer)
                .resize(null, 1200, { 
                    withoutEnlargement: true,
                    kernel: sharp.kernel.lanczos3 
                })
                .sharpen()
                .normalize()
                .png()
                .toBuffer();

            return optimized;
        } catch (error) {
            logger.warn('Image optimization failed, using original:', error.message);
            return imageBuffer;
        }
    }

    async processPDF(pdfBuffer) {
        try {
            const data = await pdf(pdfBuffer, {
                // Limit to first 10 pages for performance
                max: 10
            });

            return {
                text: data.text || '',
                pageCount: data.numpages,
                metadata: data.info
            };

        } catch (error) {
            throw new Error(`PDF processing failed: ${error.message}`);
        }
    }

    // Search for keywords in extracted text
    searchKeywords(text, keywords) {
        if (!text || !keywords || keywords.length === 0) {
            return [];
        }

        const textLower = text.toLowerCase();
        const foundKeywords = [];

        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            if (textLower.includes(keywordLower)) {
                foundKeywords.push(keyword);
            }
        }

        return foundKeywords;
    }

    // Get text snippet around found keywords
    getKeywordContext(text, keywords, contextLength = 100) {
        const contexts = [];
        const textLower = text.toLowerCase();

        for (const keyword of keywords) {
            const keywordLower = keyword.toLowerCase();
            const index = textLower.indexOf(keywordLower);
            
            if (index !== -1) {
                const start = Math.max(0, index - contextLength);
                const end = Math.min(text.length, index + keyword.length + contextLength);
                const context = text.substring(start, end);
                
                contexts.push({
                    keyword,
                    context: context.trim(),
                    position: index
                });
            }
        }

        return contexts;
    }

    // Clean up extracted text
    cleanExtractedText(text) {
        if (!text) return '';

        return text
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s\-.,!?@#$%&*()]/g, '') // Remove strange characters
            .trim();
    }

    // Get OCR statistics
    getProcessingStats() {
        // This could be enhanced to return real statistics from database
        return {
            enabled: config.ocr.enabled,
            supportedFormats: this.supportedFormats,
            maxFileSize: this.maxFileSize,
            language: this.language,
            minConfidence: this.minConfidence
        };
    }
}

module.exports = new OCRService();