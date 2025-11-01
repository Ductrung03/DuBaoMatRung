// gateway/src/services/mongodb.js - MongoDB Connection Service
const { MongoClient } = require('mongodb');

let client = null;
let db = null;

/**
 * Initialize MongoDB connection
 * @returns {Promise<Db>} MongoDB database instance
 */
async function connectMongoDB() {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logging_db';

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 60000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    await client.connect();

    // Extract database name from URI or use default
    const dbName = uri.split('/').pop().split('?')[0] || 'logging_db';
    db = client.db(dbName);

    // Create indexes for better query performance
    await db.collection('activity_logs').createIndexes([
      { key: { timestamp: -1 } },
      { key: { userId: 1 } },
      { key: { service: 1 } },
      { key: { action: 1 } },
      { key: { timestamp: -1, service: 1 } }
    ]);

    console.log('MongoDB connected successfully:', dbName);
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get MongoDB database instance
 * @returns {Promise<Db>} MongoDB database instance
 */
async function getDB() {
  if (!db) {
    return await connectMongoDB();
  }
  return db;
}

/**
 * Close MongoDB connection
 */
async function closeMongoDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    console.log('MongoDB connection closed');
  }
}

module.exports = {
  connectMongoDB,
  getDB,
  closeMongoDB
};
