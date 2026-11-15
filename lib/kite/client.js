/**
 * Zerodha Kite Connect Client Architecture
 * Ready for activation when official Kite API subscription is configured.
 */

import { env } from "@/lib/validation/env";
import { connectToDatabase } from "@/lib/mongodb/connection";
import BrokerSession from "@/lib/mongodb/models/BrokerSession";
import { decrypt } from "@/lib/security/encryption";

export const KITE_BASE_URL = "https://kite.zerodha.com";
export const KITE_API_BASE_URL = "https://api.kite.trade";

/**
 * Returns the Zerodha OAuth login URL for user authentication
 * @returns {string}
 */
export function getKiteLoginUrl() {
  const apiKey = process.env.KITE_API_KEY || env.KITE_API_KEY;
  if (!apiKey) {
    return null;
  }
  return `${KITE_BASE_URL}/connect/login?v=3&api_key=${encodeURIComponent(apiKey)}`;
}

/**
 * Fetches the active decrypted access token from MongoDB
 * @returns {Promise<string | null>}
 */
export async function getActiveKiteAccessToken() {
  try {
    await connectToDatabase();
    const session = await BrokerSession.findOne({ provider: "zerodha", connected: true });

    if (!session || !session.accessTokenEncrypted) {
      return null;
    }

    // Check token expiry if set
    if (session.tokenExpiry && new Date(session.tokenExpiry) < new Date()) {
      return null;
    }

    return decrypt(session.accessTokenEncrypted);
  } catch (err) {
    console.error("Error retrieving Kite access token:", err);
    return null;
  }
}

/**
 * Checks Zerodha Kite session status
 * @returns {Promise<{ configured: boolean, connected: boolean, lastAuthenticatedAt: Date | null }>}
 */
export async function getKiteSessionStatus() {
  const apiKey = process.env.KITE_API_KEY || env.KITE_API_KEY;
  const apiSecret = process.env.KITE_API_SECRET || env.KITE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return {
      configured: false,
      connected: false,
      lastAuthenticatedAt: null,
      message: "Kite credentials not configured in environment.",
    };
  }

  const token = await getActiveKiteAccessToken();
  return {
    configured: true,
    connected: Boolean(token),
    lastAuthenticatedAt: null,
    message: token ? "Kite session active" : "Authentication required for Kite Connect.",
  };
}

