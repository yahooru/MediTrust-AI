const { MongoClient, ObjectId } = require("mongodb")
const { randomUUID } = require("crypto")
const { config } = require("./config")

let mongoClient = null
let db = null
let mode = "memory"

const memory = {
  reports: [],
  audits: [],
  shares: [],
  settings: {
    notifications: true,
    abnormalAlerts: true,
    defaultExpiryHours: 24,
    privacyMode: "strict",
  },
}

const seedReport = {
  id: "demo-blood-panel",
  name: "Blood Panel - June 2026",
  category: "Blood Test",
  mimeType: "text/plain",
  size: 1042,
  storage: {
    provider: "demo-seed",
    url: null,
    publicId: null,
    note: "Seed report for local demos and judge walkthroughs.",
  },
  extractedText: [
    "Patient: Rahul Mehta",
    "Address: 42 Lake Road, Bengaluru",
    "Aadhaar: 1234 5678 9012",
    "Fasting glucose 156 mg/dL",
    "HbA1c 7.4%",
    "Blood pressure 142/92 mmHg",
    "Cholesterol 184 mg/dL",
    "Medication: Metformin 500mg twice daily",
    "HIV screening: confidential marker present in separate report",
  ].join("\n"),
  maskedText: [
    "Patient: Rahul Mehta",
    "[redacted:address]",
    "[redacted:aadhaar]",
    "Fasting glucose 156 mg/dL",
    "HbA1c 7.4%",
    "Blood pressure 142/92 mmHg",
    "Cholesterol 184 mg/dL",
    "Medication: Metformin 500mg twice daily",
    "[redacted:hiv]",
  ].join("\n"),
  redactions: [
    { key: "address", label: "Address", sampleLength: 33 },
    { key: "aadhaar", label: "Aadhaar", sampleLength: 14 },
    { key: "hiv", label: "HIV marker", sampleLength: 62 },
  ],
  analysis: {
    summary:
      "This report shows elevated HbA1c, fasting glucose, and blood pressure values. Cholesterol is within the demo reference range. The record is useful for a diabetes or primary-care review.",
    category: "Blood Test",
    vitals: [
      { name: "HbA1c", value: 7.4, unit: "%", status: "attention" },
      { name: "Fasting glucose", value: 156, unit: "mg/dL", status: "attention" },
      { name: "Blood pressure", value: "142/92", unit: "mmHg", status: "attention" },
      { name: "Cholesterol", value: 184, unit: "mg/dL", status: "normal" },
    ],
    alerts: [
      "HbA1c appears above the usual reference range. Review with a licensed clinician.",
      "Fasting glucose appears above the usual reference range. Review with a licensed clinician.",
      "Blood pressure appears above the usual reference range. Review with a licensed clinician.",
    ],
    medications: ["Metformin"],
    nextSteps: [
      "Share HbA1c, fasting glucose, and blood pressure with the doctor.",
      "Keep Aadhaar, address, and sensitive screening details hidden unless clinically required.",
      "Use the expiring share link and review the access audit after the visit.",
    ],
    disclaimer: "MediTrust AI explains records for education and does not replace medical advice.",
    source: "demo-seed",
  },
  ownerDid: null,
}

const seedAudits = [
  {
    id: "demo-audit-identity",
    agent: "Identity Agent",
    action: "terminal3.login",
    target: "demo-session",
    details: "Terminal3 Agent Auth session prepared for MediTrust demo user",
    actor: "MediTrust Agent Mesh",
    severity: "info",
    metadata: { terminal3Authenticated: false, demo: true },
    terminal3: {
      sdk: "@terminal3/t3n-sdk",
      authenticated: false,
      did: null,
      environment: "testnet",
      action: "terminal3.login",
      digest: "demo-terminal3-identity-digest",
      issuedAt: new Date().toISOString(),
    },
  },
  {
    id: "demo-audit-report",
    agent: "Medical Agent",
    action: "report.upload.analyze",
    target: seedReport.id,
    details: "Analyzed demo blood panel and generated privacy-safe explanation",
    actor: "MediTrust Agent Mesh",
    severity: "info",
    metadata: { category: seedReport.category, redactions: seedReport.redactions.length, source: "demo-seed" },
    terminal3: {
      sdk: "@terminal3/t3n-sdk",
      authenticated: false,
      did: null,
      environment: "testnet",
      action: "report.upload.analyze",
      digest: "demo-terminal3-report-digest",
      issuedAt: new Date().toISOString(),
    },
  },
]

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

async function seedDefaults() {
  const now = new Date().toISOString()
  const ownerDid = config.terminal3.did || "did:t3n:demo-user"
  const report = { ...clone(seedReport), ownerDid, createdAt: now, updatedAt: now }
  const audits = clone(seedAudits).map((audit, index) => ({
    ...audit,
    ownerDid,
    createdAt: new Date(Date.now() - index * 4 * 60 * 1000).toISOString(),
    terminal3: {
      ...audit.terminal3,
      did: ownerDid,
    },
  }))

  if (mode === "mongo") {
    const [reportCount, auditCount] = await Promise.all([
      collection("reports").countDocuments({}),
      collection("audits").countDocuments({}),
    ])
    if (reportCount === 0) await collection("reports").insertOne(report)
    if (auditCount === 0) await collection("audits").insertMany(audits)
    return
  }

  if (memory.reports.length === 0) memory.reports = [report]
  if (memory.audits.length === 0) memory.audits = audits
}

function serialize(doc) {
  if (!doc) return null
  const { _id, ...rest } = doc
  return { ...rest, id: doc.id || (_id ? _id.toString() : undefined) }
}

async function initStore() {
  if (!config.mongodb.uri) {
    mode = "memory"
    await seedDefaults()
    return { mode }
  }

  try {
    mongoClient = new MongoClient(config.mongodb.uri, {
      serverSelectionTimeoutMS: 7000,
    })
    await mongoClient.connect()
    db = mongoClient.db(config.mongodb.dbName)
    await Promise.all([
      db.collection("reports").createIndex({ createdAt: -1 }),
      db.collection("audits").createIndex({ createdAt: -1 }),
      db.collection("shares").createIndex({ token: 1 }, { unique: true }),
      db.collection("shares").createIndex({ tokenHash: 1 }, { unique: true, sparse: true }),
      db.collection("shares").createIndex({ expiresAt: 1 }),
    ])
    mode = "mongo"
    await seedDefaults()
    return { mode }
  } catch (error) {
    mode = "memory"
    await seedDefaults()
    return { mode, warning: error.message }
  }
}

function collection(name) {
  if (!db) throw new Error("MongoDB is not connected")
  return db.collection(name)
}

async function insertReport(report) {
  const record = {
    ...report,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (mode === "mongo") {
    await collection("reports").insertOne(record)
  } else {
    memory.reports.unshift(record)
  }
  return record
}

async function listReports(ownerDid) {
  if (mode === "mongo") {
    const docs = await collection("reports").find({ ownerDid }).sort({ createdAt: -1 }).toArray()
    return docs.map(serialize)
  }
  return memory.reports.filter((report) => report.ownerDid === ownerDid)
}

async function getReport(id, ownerDid) {
  if (mode === "mongo") {
    const idQuery = ObjectId.isValid(id) ? { $or: [{ id }, { _id: new ObjectId(id) }] } : { id }
    const query = ownerDid ? { $and: [idQuery, { ownerDid }] } : idQuery
    return serialize(await collection("reports").findOne(query))
  }
  return memory.reports.find((report) => report.id === id && (!ownerDid || report.ownerDid === ownerDid)) || null
}

async function updateReport(id, patch, ownerDid) {
  const update = { ...patch, updatedAt: new Date().toISOString() }
  if (mode === "mongo") {
    const query = ownerDid ? { id, ownerDid } : { id }
    await collection("reports").updateOne(query, { $set: update })
    return getReport(id, ownerDid)
  }
  const index = memory.reports.findIndex((report) => report.id === id && (!ownerDid || report.ownerDid === ownerDid))
  if (index < 0) return null
  memory.reports[index] = { ...memory.reports[index], ...update }
  return memory.reports[index]
}

async function insertAudit(event) {
  const record = {
    ...event,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  }
  if (mode === "mongo") {
    await collection("audits").insertOne(record)
  } else {
    memory.audits.unshift(record)
  }
  return record
}

async function listAudits(limit = 100, ownerDid) {
  if (mode === "mongo") {
    const docs = await collection("audits").find({ ownerDid }).sort({ createdAt: -1 }).limit(limit).toArray()
    return docs.map(serialize)
  }
  return memory.audits.filter((audit) => audit.ownerDid === ownerDid).slice(0, limit)
}

async function insertShare(share) {
  const record = {
    ...share,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    views: 0,
  }
  if (mode === "mongo") {
    await collection("shares").insertOne(record)
  } else {
    memory.shares.unshift(record)
  }
  return record
}

async function getShareByToken(token, tokenHash = token) {
  if (mode === "mongo") {
    return serialize(await collection("shares").findOne({ $or: [{ token }, { tokenHash }] }))
  }
  return memory.shares.find((share) => share.token === token || share.tokenHash === tokenHash) || null
}

async function listShares(ownerDid) {
  if (mode === "mongo") {
    const docs = await collection("shares").find({ ownerDid }).sort({ createdAt: -1 }).toArray()
    return docs.map(serialize)
  }
  return memory.shares.filter((share) => share.ownerDid === ownerDid)
}

async function updateShare(token, patch, tokenHash = token) {
  if (mode === "mongo") {
    await collection("shares").updateOne({ $or: [{ token }, { tokenHash }] }, { $set: patch })
    return getShareByToken(token, tokenHash)
  }
  const index = memory.shares.findIndex((share) => share.token === token || share.tokenHash === tokenHash)
  if (index < 0) return null
  memory.shares[index] = { ...memory.shares[index], ...patch }
  return memory.shares[index]
}

async function updateShareById(id, ownerDid, patch) {
  if (mode === "mongo") {
    await collection("shares").updateOne({ id, ownerDid }, { $set: patch })
    return serialize(await collection("shares").findOne({ id, ownerDid }))
  }
  const index = memory.shares.findIndex((share) => share.id === id && share.ownerDid === ownerDid)
  if (index < 0) return null
  memory.shares[index] = { ...memory.shares[index], ...patch }
  return memory.shares[index]
}

async function getSettings(ownerDid) {
  if (mode === "mongo") {
    const doc = await collection("settings").findOne({ key: "user", ownerDid })
    return doc?.value || memory.settings
  }
  return memory.settings
}

async function updateSettings(patch, ownerDid) {
  const next = { ...(await getSettings(ownerDid)), ...patch }
  if (mode === "mongo") {
    await collection("settings").updateOne(
      { key: "user", ownerDid },
      { $set: { value: next, ownerDid, updatedAt: new Date().toISOString() } },
      { upsert: true },
    )
  } else {
    memory.settings = next
  }
  return next
}

function getStoreMode() {
  return mode
}

module.exports = {
  initStore,
  getStoreMode,
  insertReport,
  listReports,
  getReport,
  updateReport,
  insertAudit,
  listAudits,
  insertShare,
  getShareByToken,
  listShares,
  updateShare,
  updateShareById,
  getSettings,
  updateSettings,
}
