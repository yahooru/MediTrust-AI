const express = require("express")
const multer = require("multer")
const store = require("../store")
const { asyncHandler } = require("../utils/asyncHandler")
const { extractText } = require("../services/extractionService")
const { uploadBuffer } = require("../services/storageService")
const { analyzeReport } = require("../services/aiService")
const { maskSensitiveText, sanitizeReportForClient } = require("../services/privacyService")
const { recordAudit } = require("../services/auditService")
const { requireAuth } = require("../middleware/auth")
const { encryptText, getReportText } = require("../services/cryptoService")

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
})

const router = express.Router()

router.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const reports = await store.listReports(_req.user.did)
    res.json({ reports: reports.map(sanitizeReportForClient) })
  }),
)

router.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const report = await store.getReport(req.params.id, req.user.did)
    if (!report) return res.status(404).json({ error: "Report not found" })
    res.json({ report: sanitizeReportForClient(report) })
  }),
)

router.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: "A report file is required" })

    const [storage, extractedText] = await Promise.all([uploadBuffer(req.file), extractText(req.file)])
    const masked = maskSensitiveText(extractedText)
    const analysis = await analyzeReport({ text: masked.text, name: req.file.originalname })

    const report = await store.insertReport({
      name: req.body.name || req.file.originalname,
      category: req.body.category || analysis.category || "Medical Record",
      mimeType: req.file.mimetype,
      size: req.file.size,
      storage,
      extractedTextEncrypted: encryptText(extractedText),
      maskedText: masked.text,
      redactions: masked.findings,
      analysis,
      ownerDid: req.user.did,
    })

    await recordAudit({
      agent: "Medical Agent",
      action: "report.upload.analyze",
      target: report.id,
      details: `Uploaded and analyzed ${report.name}`,
      metadata: { category: report.category, redactions: masked.findings.length, storage: storage.provider },
      ownerDid: req.user.did,
    })

    res.status(201).json({ report: sanitizeReportForClient(report) })
  }),
)

router.post(
  "/sample",
  requireAuth,
  asyncHandler(async (req, res) => {
    const name = req.body?.name || "Demo Blood Panel"
    const extractedText = [
      "Patient: Rahul Mehta",
      "Address: 42 Lake Road, Bengaluru",
      "Aadhaar: 1234 5678 9012",
      "Fasting glucose 156 mg/dL",
      "HbA1c 7.4%",
      "Blood pressure 142/92 mmHg",
      "Cholesterol 184 mg/dL",
      "Medication: Metformin 500mg twice daily",
      "HIV screening: confidential marker present in separate report",
    ].join("\n")
    const masked = maskSensitiveText(extractedText)
    const analysis = await analyzeReport({ text: masked.text, name })

    const report = await store.insertReport({
      name,
      category: analysis.category || "Blood Test",
      mimeType: "text/plain",
      size: Buffer.byteLength(extractedText),
      storage: {
        provider: "sample",
        url: null,
        publicId: null,
        note: "Created from the built-in MediTrust demo sample.",
      },
      extractedTextEncrypted: encryptText(extractedText),
      maskedText: masked.text,
      redactions: masked.findings,
      analysis,
      ownerDid: req.user.did,
    })

    await recordAudit({
      agent: "Medical Agent",
      action: "report.upload.analyze",
      target: report.id,
      details: `Created and analyzed sample report ${report.name}`,
      metadata: { category: report.category, redactions: masked.findings.length, storage: "sample" },
      ownerDid: req.user.did,
    })

    res.status(201).json({ report: sanitizeReportForClient(report) })
  }),
)

router.post(
  "/:id/analyze",
  requireAuth,
  asyncHandler(async (req, res) => {
    const report = await store.getReport(req.params.id, req.user.did)
    if (!report) return res.status(404).json({ error: "Report not found" })
    const masked = maskSensitiveText(getReportText(report))
    const analysis = await analyzeReport({ text: masked.text, name: report.name })
    const updated = await store.updateReport(report.id, { maskedText: masked.text, redactions: masked.findings, analysis }, req.user.did)

    await recordAudit({
      agent: "Medical Agent",
      action: "report.reanalyze",
      target: report.id,
      details: `Re-analyzed ${report.name}`,
      metadata: { source: analysis.source },
      ownerDid: req.user.did,
    })

    res.json({ report: sanitizeReportForClient(updated) })
  }),
)

module.exports = router
