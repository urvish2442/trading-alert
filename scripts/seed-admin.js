#!/usr/bin/env node

/**
 * CLI script to seed or reset the single administrator account.
 * Usage:
 *   node scripts/seed-admin.js [email] [password]
 * Example:
 *   node scripts/seed-admin.js admin@trading.local StrongPass123!
 */

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Read .env.local if present
const envLocalPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "trading_alert";

const email = process.argv[2] || "admin@nifty-alert.local";
const password = process.argv[3] || "Admin@123456";

async function runSeed() {
  console.log(`Connecting to MongoDB (${MONGODB_DB_NAME})...`);
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });

  const UserSchema = new mongoose.Schema(
    {
      email: { type: String, required: true, unique: true, lowercase: true },
      passwordHash: { type: String, required: true },
      role: { type: String, default: "admin" },
    },
    { timestamps: true }
  );

  const User = mongoose.models.User || mongoose.model("User", UserSchema);

  const passwordHash = await bcrypt.hash(password, 12);

  const existingUser = await User.findOne();
  if (existingUser) {
    console.log(`Updating existing administrator account (${existingUser.email})...`);
    existingUser.email = email.toLowerCase().trim();
    existingUser.passwordHash = passwordHash;
    existingUser.role = "admin";
    await existingUser.save();
    console.log(`Administrator updated successfully!`);
  } else {
    console.log(`Creating new administrator account (${email})...`);
    await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      role: "admin",
    });
    console.log(`Administrator created successfully!`);
  }

  console.log(`Credentials:`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);

  await mongoose.disconnect();
  console.log(`Done.`);
}

runSeed().catch((err) => {
  console.error("Seed error:", err.message);
  process.exit(1);
});

