import mongoose from "mongoose";
import { env } from "@/lib/validation/env";

/**
 * Global cache for Mongoose connection across serverless invocations.
 * Prevents multiple connections during hot reloading in development
 * and function reuse in Vercel serverless environments.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB using Mongoose with reusable connection caching.
 * @returns {Promise<typeof mongoose>}
 */
export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI || env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || env.MONGODB_DB_NAME || "trading_alert";

  if (!uri) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: dbName,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

/**
 * Check the current MongoDB connection state.
 * @returns {{ isConnected: boolean, state: string, dbName: string }}
 */
export function getDatabaseConnectionStatus() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
    99: "uninitialized",
  };

  const stateCode = mongoose.connection.readyState;
  return {
    isConnected: stateCode === 1,
    state: states[stateCode] || "unknown",
    dbName: mongoose.connection.name || process.env.MONGODB_DB_NAME || "trading_alert",
  };
}
