import crypto from "crypto";
import { env } from "@/lib/validation/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard 96-bit IV for AES-GCM

/**
 * Derives a consistent 32-byte key from APP_ENCRYPTION_KEY using SHA-256
 */
function getDerivedKey() {
  const rawKey = process.env.APP_ENCRYPTION_KEY || env.APP_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef";
  return crypto.createHash("sha256").update(rawKey).digest();
}

/**
 * Encrypts sensitive string data using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted string in format iv:authTag:ciphertext
 */
export function encrypt(text) {
  if (!text) return null;

  const key = getDerivedKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM cipher string
 * @param {string} encryptedString - Format iv:authTag:ciphertext
 * @returns {string} - Decrypted plain text
 */
export function decrypt(encryptedString) {
  if (!encryptedString) return null;

  const parts = encryptedString.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted format. Expected iv:authTag:ciphertext");
  }

  const [ivHex, authTagHex, cipherTextHex] = parts;
  const key = getDerivedKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherTextHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

