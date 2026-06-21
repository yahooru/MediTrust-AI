const { app } = require("./server")
const store = require("./store")
const { config } = require("./config")

async function run() {
  await store.initStore()
  const server = app.listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  const port = server.address().port
  const base = `http://127.0.0.1:${port}`

  const health = await fetch(`${base}/health`).then((res) => res.json())
  if (!health.ok) throw new Error("Health check failed")

  const unauthenticatedReports = await fetch(`${base}/api/reports`)
  if (unauthenticatedReports.status !== 401) throw new Error("Reports route should require authentication")

  const login = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Smoke Test" }),
  }).then((res) => res.json())
  if (!login.sessionToken) throw new Error("Login did not return a session token")
  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${login.sessionToken}`,
  }

  const settings = await fetch(`${base}/api/settings`, { headers: authHeaders }).then((res) => res.json())
  if (!settings.settings) throw new Error("Settings route failed")

  const sample = await fetch(`${base}/api/reports/sample`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ name: "Smoke Blood Panel" }),
  }).then((res) => res.json())
  if (!sample.report?.id || sample.report.extractedText || sample.report.extractedTextEncrypted) {
    throw new Error("Sample report did not return a sanitized report")
  }

  const chat = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({ question: "What should I share with my doctor?", reportId: sample.report.id }),
  }).then((res) => res.json())
  if (!chat.answer) throw new Error("Chat route failed")

  const createdShare = await fetch(`${base}/api/share`, {
    method: "POST",
    headers: authHeaders,
    body: JSON.stringify({
      reportId: sample.report.id,
      recipientName: "Dr Smoke",
      recipientRole: "Doctor",
      allow: ["HbA1c"],
      hide: ["aadhaar", "address", "sensitive-medical"],
      expiryHours: 24,
    }),
  }).then((res) => res.json())
  if (!createdShare.share?.token || !createdShare.share?.accessCode) {
    throw new Error("Share creation did not return one-time link credentials")
  }

  const shares = await fetch(`${base}/api/share`, { headers: authHeaders }).then((res) => res.json())
  if (shares.shares.some((share) => share.token || share.accessCode || share.accessCodeHash || share.tokenHash)) {
    throw new Error("Share list exposed bearer credentials")
  }

  const blockedPublicShare = await fetch(`${base}/api/share/public/${createdShare.share.token}`)
  if (blockedPublicShare.status !== 401) throw new Error("Public share should require the recipient access code")

  const publicShare = await fetch(`${base}/api/share/public/${createdShare.share.token}`, {
    headers: { "x-share-access-code": createdShare.share.accessCode },
  }).then((res) => res.json())
  if (!publicShare.share?.snapshot?.vitals) throw new Error("Public share route failed with access code")

  const audits = await fetch(`${base}/api/audit`, { headers: authHeaders }).then((res) => res.json())
  if (!Array.isArray(audits.audits) || !audits.audits.length) throw new Error("Audit route did not return user-scoped events")

  server.close()
  console.log(`Smoke checks passed for ${config.env} mode`)
}

run().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
