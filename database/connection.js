const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

class DatabaseConnection {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      if (this.isConnected) {
        console.log('Database already connected');
        return this.connection;
      }

      const mongoUri = process.env.NODE_ENV === 'test' 
        ? process.env.MONGODB_TEST_URI 
        : process.env.MONGODB_URI;

      if (!mongoUri) {
        throw new Error('MongoDB URI not provided in environment variables');
      }

      // Connection options
      const options = {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        maxPoolSize: 10,
        minPoolSize: 5,
        maxIdleTimeMS: 30000,
        heartbeatFrequencyMS: 10000,
      };

      // Connect to MongoDB
      this.connection = await mongoose.connect(mongoUri, options);
      this.isConnected = true;

      console.log(`✅ Connected to MongoDB: ${this.connection.connection.name}`);
      
      // Handle connection events
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('🔌 MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected');
        this.isConnected = true;
      });

      return this.connection;
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error.message);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.disconnect();
        this.isConnected = false;
        console.log('🔌 Disconnected from MongoDB');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  isConnectionReady() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  async healthCheck() {
    try {
      if (!this.isConnectionReady()) {
        return { status: 'disconnected', message: 'Database not connected' };
      }

      // Ping the database
      await mongoose.connection.db.admin().ping();
      
      return {
        status: 'connected',
        message: 'Database connection healthy',
        database: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'Database health check failed',
        error: error.message
      };
    }
  }
}

// Create a singleton instance
const dbConnection = new DatabaseConnection();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
  await dbConnection.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
  await dbConnection.disconnect();
  process.exit(0);
});

module.exports = dbConnection;

