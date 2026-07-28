const mongoose = require('mongoose');
const { env } = require('./env');
const { logger } = require('../utils/logger');

// A cold Atlas cluster or a container starting alongside its database often
// isn't reachable on the very first attempt. Retrying with backoff turns that
// from a crash loop into a short delay.
const MAX_ATTEMPTS = 5;

function wait(ms) {
  return new Promise(resolve => { setTimeout(resolve, ms); });
}

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  // Later disconnects (failover, network blip) are reported rather than
  // silently swallowed — /ready reflects readyState so traffic is withheld
  // while this is the case.
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  mongoose.connection.on('error', error => logger.error('MongoDB error', { err: error }));

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
      logger.info('connected to MongoDB');
      return mongoose.connection;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        logger.error('MongoDB connection failed', { attempts: MAX_ATTEMPTS, err: error });
        throw error;
      }
      const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
      logger.warn('MongoDB connection attempt failed — retrying', { attempt, delay, reason: error.message });
      await wait(delay);
    }
  }
}

module.exports = { connectDatabase };
