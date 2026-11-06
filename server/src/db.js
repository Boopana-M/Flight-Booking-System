// STEP 1: import mongoose (MongoDB connector)
const mongoose = require("mongoose");

// Optional: in-memory MongoDB for local dev when no MONGO_URI is provided
let mongoMemoryServer = null;
async function startInMemoryMongo() {
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    mongoMemoryServer = await MongoMemoryServer.create();
    return mongoMemoryServer.getUri();
  } catch (err) {
    console.warn("mongodb-memory-server unavailable:", err.message);
    throw err;
  }
}

// STEP 2: connect function (we call this in server.js)
async function connectDB() {
  // NOTE: MONGO_URI comes from .env file
  let uri = process.env.MONGO_URI;

  // If an explicit URI is provided, try connecting first.
  if (uri) {
    try {
      await mongoose.connect(uri);
      console.log("MongoDB connected ✅ (via MONGO_URI)");
      return;
    } catch (err) {
      console.warn("Failed to connect to MONGO_URI:", err.message);
      // fallthrough to start in-memory DB
    }
  }

  // No URI provided or connection failed — start in-memory MongoDB for dev
  console.log("Starting in-memory MongoDB for development fallback...");
  uri = await startInMemoryMongo();
  await mongoose.connect(uri);
  console.log("MongoDB connected ✅ (in-memory)");
}

module.exports = { connectDB, mongoMemoryServer };

