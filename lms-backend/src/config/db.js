/**
 * config/db.js
 * Single responsibility: open a Mongoose connection.
 * The URI is injected so the same code can point at a test database.
 */
const mongoose = require('mongoose');

const connectDB = async (uri = process.env.MONGO_URI) => {
  if (!uri) {
    throw new Error('MONGO_URI is not defined. Copy .env.example to .env first.');
  }

  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });

    // eslint-disable-next-line no-console
    console.log(`[db] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    if (error && /ECONNREFUSED/.test(error.message || '')) {
      throw new Error(`MongoDB connection refused. Start MongoDB or update MONGO_URI (${uri}).`);
    }
    throw error;
  }
};

const disconnectDB = async () => {
  await mongoose.connection.close();
};

module.exports = { connectDB, disconnectDB };
