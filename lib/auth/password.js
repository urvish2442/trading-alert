import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

/**
 * Securely hashes a plain-text password using bcrypt.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password string
 */
export async function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plain-text password against a stored bcrypt hash.
 * @param {string} password - Plain text password input
 * @param {string} hash - Stored password hash
 * @returns {Promise<boolean>} - True if password matches hash
 */
export async function verifyPassword(password, hash) {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

