const mongoose = require('mongoose');
const { env } = require('./env');

// A cold Atlas cluster or a container starting alongside its database often
// isn't reachable on the very first attempt. Retrying with backoff turns that
// from a crash loop into a short delay.
const MAX_ATTEMPTS = 5;

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectDatabase() {
  mongoose.set('strictQuery', true);

  // Later disconnects (failover, network blip) are reported rather than
  // silently swallowed — /ready reflects readyState so traffic is withheld
  // while this is the case.
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));
  mongoose.connection.on('error', error => console.error('MongoDB error:', error.message));

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      await mongoose.connect(env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });
      console.log('Connected to MongoDB');
      return mongoose.connection;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        console.error(`MongoDB connection failed after ${MAX_ATTEMPTS} attempts: ${error.message}`);
        throw error;
      }
      const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
      console.warn(`MongoDB connection attempt ${attempt} failed (${error.message}) — retrying in ${delay}ms`);
      await wait(delay);
    }
  }
}

module.exports = { connectDatabase };
