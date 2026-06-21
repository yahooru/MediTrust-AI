const express = require("express")
const cors = require("cors")
const helmet = require("helmet")
const rateLimit = require("express-rate-limit")
const { config } = require("./config")
const store = require("./store")
const terminal3 = require("./services/terminal3Service")

const authRoutes = require("./routes/authRoutes")
const t3Routes = require("./routes/t3Routes")
const reportRoutes = require("./routes/reportRoutes")
const chatRoutes = require("./routes/chatRoutes")
const shareRoutes = require("./routes/shareRoutes")
const auditRoutes = require("./routes/auditRoutes")
const settingsRoutes = require("./routes/settingsRoutes")

const app = express()

app.disable("x-powered-by")
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
  }),
)
app.use(
  rateLimit({
    windowMs: config.security.rateLimitWindowMs,
    max: config.security.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  }),
)
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
  }),
)
app.use(express.json({ limit: "2mb" }))

app.get("/health", async (_req, res) => {
  res.json({
    ok: true,
    service: "meditrust-ai-backend",
    store: store.getStoreMode(),
    terminal3: {
      enabled: Boolean(config.terminal3.apiKey),
      environment: config.terminal3.environment,
      didConfigured: Boolean(config.terminal3.did),
    },
    now: new Date().toISOString(),
  })
})

app.use("/api/auth", authRoutes)
app.use("/api/t3", t3Routes)
app.use("/api/reports", reportRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/share", shareRoutes)
app.use("/api/audit", auditRoutes)
app.use("/api/settings", settingsRoutes)

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
})

app.use((error, _req, res, _next) => {
  const status = error.status || 500
  res.status(status).json({
    error: status === 500 ? "Internal server error" : error.message,
    detail: config.env === "development" ? error.message : undefined,
  })
})

async function start() {
  const storeStatus = await store.initStore()
  app.listen(config.port, () => {
    console.log(`MediTrust AI API listening on ${config.port} (${storeStatus.mode} store)`)
  })
}

if (require.main === module) {
  start()
}

module.exports = { app, start }
