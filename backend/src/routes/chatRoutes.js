const express = require("express")
const store = require("../store")
const { asyncHandler } = require("../utils/asyncHandler")
const { answerQuestion } = require("../services/aiService")
const { recordAudit } = require("../services/auditService")
const { requireAuth } = require("../middleware/auth")

const router = express.Router()

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const question = String(req.body?.question || "").trim()
    if (!question) return res.status(400).json({ error: "Question is required" })

    const reports = req.body?.reportId
      ? [await store.getReport(req.body.reportId, req.user.did)].filter(Boolean)
      : await store.listReports(req.user.did)

    const result = await answerQuestion({ question, reports })

    await recordAudit({
      agent: "Medical Agent",
      action: "ai.chat.answer",
      target: req.body?.reportId || "all-reports",
      details: question.slice(0, 180),
      metadata: { reportCount: reports.length, source: result.source },
      ownerDid: req.user.did,
    })

    res.json(result)
  }),
)

module.exports = router
