require("dotenv").config()

const config = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT || 4000),
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  allowedOrigins: [
    process.env.FRONTEND_URL,
    ...(process.env.ALLOWED_ORIGINS || "").split(","),
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3005",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3005",
    "https://meditrust-ai.vercel.app",
  ]
    .map((origin) => origin && origin.trim())
    .filter(Boolean),
  mongodb: {
    uri: process.env.MONGODB_URI || "",
    dbName: process.env.MONGODB_DB || "meditrust_ai",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
    model: process.env.OPENAI_MODEL || "gpt-5.5",
  },
  security: {
    sessionSecret:
      process.env.SESSION_SECRET ||
      process.env.DATA_ENCRYPTION_KEY ||
      process.env.T3N_API_KEY ||
      process.env.TERMINAL3_API_KEY ||
      "meditrust-local-dev-secret",
    sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 12),
    dataEncryptionKey:
      process.env.DATA_ENCRYPTION_KEY ||
      process.env.SESSION_SECRET ||
      process.env.T3N_API_KEY ||
      process.env.TERMINAL3_API_KEY ||
      "meditrust-local-dev-encryption-key",
    rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 240),
  },
  terminal3: {
    apiKey: process.env.T3N_API_KEY || process.env.TERMINAL3_API_KEY || "",
    did: process.env.TERMINAL3_DID || "",
    environment: process.env.T3N_ENVIRONMENT || "testnet",
    nodeUrl: process.env.T3N_NODE_URL || "",
    contractTail: process.env.T3N_MEDICAL_CONTRACT_TAIL || "meditrust-agent-audit",
    contractVersion: process.env.T3N_MEDICAL_CONTRACT_VERSION || "1.0.0",
    contractId: process.env.T3N_MEDICAL_CONTRACT_ID
      ? Number(process.env.T3N_MEDICAL_CONTRACT_ID)
      : null,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
}

module.exports = { config }
