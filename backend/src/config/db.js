import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

export async function connectDB() {
  const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/medisphere";
  let mongoServer;
  const mongoTimeoutMs = 3000;
  const maskedUri = mongoUri.includes("@")
    ? mongoUri.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")
    : mongoUri;

  let connected = false;
  if (mongoUri && !mongoUri.includes("localhost") && !mongoUri.includes("127.0.0.1")) {
    try {
      console.log(`Connecting to MongoDB Atlas at: ${maskedUri} (timeout: ${mongoTimeoutMs}ms)...`);
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: mongoTimeoutMs,
        dbName: process.env.MONGO_DB_NAME || "medisphere",
        autoIndex: false
      });
      await mongoose.connection.db.admin().ping();
      console.log(`Connected successfully to MongoDB Atlas [Database: ${mongoose.connection.name}]`);
      connected = true;
    } catch (error) {
      console.warn(`MongoDB Atlas connection unverified (${error.message}). Switching gracefully to local in-memory database.`);
      await mongoose.disconnect().catch(() => {});
    }
  }

  if (!connected) {
    try {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri(), {
        dbName: process.env.MONGO_DB_NAME || "medisphere",
        autoIndex: false
      });
      console.log(`Connected to local in-memory MongoDB: ${mongoServer.getUri()}`);
      connected = true;
    } catch (memErr) {
      console.error("Failed to start fallback memory server:", memErr.message);
    }
  }

  mongoose.connection.on("error", (err) => {
    console.warn("MongoDB connection event notice:", err.message);
  });
  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected; awaiting reconnection...");
  });

  return connected;
}
