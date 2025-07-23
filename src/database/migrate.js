#!/usr/bin/env node

const database = require('./database');
const logger = require('../utils/logger');

async function migrate() {
    try {
        logger.info('Starting database migration...');
        await database.connect();
        logger.info('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Migration failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    migrate();
}

module.exports = migrate;