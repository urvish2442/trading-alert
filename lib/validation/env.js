import { z } from "zod";

/**
 * Server-side environment variables schema.
 * Defines and validates all required configuration parameters.
 */
export const serverEnvSchema = z.object({
  // Database configuration
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required").default("mongodb://localhost:27017"),
  MONGODB_DB_NAME: z.string().min(1, "MONGODB_DB_NAME is required").default("trading_alert"),

  // Market Data Provider: "yahoo" (free demo) or "kite" (Zerodha production)
  MARKET_DATA_PROVIDER: z.enum(["yahoo", "kite"]).default("yahoo"),

  // Zerodha Kite Connect credentials (Milestone 3+)
  KITE_API_KEY: z.string().optional().default(""),
  KITE_API_SECRET: z.string().optional().default(""),
  KITE_REDIRECT_URL: z.string().url("KITE_REDIRECT_URL must be a valid URL").optional().default("http://localhost:3000/api/kite/callback"),

  // Scheduled processing security (Milestone 7+)
  CRON_SECRET: z.string().min(16, "CRON_SECRET should be at least 16 characters for security").optional().default("default_dev_cron_secret_min_16_chars"),

  // Application encryption key (32 bytes hex or 32 chars min for AES-256)
  APP_ENCRYPTION_KEY: z.string().min(32, "APP_ENCRYPTION_KEY must be at least 32 characters long").optional().default("0123456789abcdef0123456789abcdef"),

  // Authentication secret for JWT / session tokens
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET should be at least 16 characters").default("development_auth_secret_minimum_16_chars"),

  // Web Push VAPID credentials (Milestone 6+)
  VAPID_PUBLIC_KEY: z.string().optional().default(""),
  VAPID_PRIVATE_KEY: z.string().optional().default(""),
  VAPID_SUBJECT: z.string().optional().default("mailto:admin@trading-alert.local"),

  // Public application URL
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Node environment
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

/**
 * Validates the runtime environment variables against the schema.
 * @returns {z.infer<typeof serverEnvSchema>} Validated environment object
 */
export function validateEnv() {
  const parsed = serverEnvSchema.safeParse(process.env);

  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => ` - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    console.warn(`[Environment Warning] Missing or invalid environment variables:\n${errorDetails}`);
    // In production, we log structured warnings without exposing values
    return serverEnvSchema.parse({
      ...process.env,
      MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017",
      MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || "trading_alert",
      AUTH_SECRET: process.env.AUTH_SECRET || "development_auth_secret_minimum_16_chars",
    });
  }

  return parsed.data;
}

/**
 * Access validated environment variables safely
 */
export const env = validateEnv();

