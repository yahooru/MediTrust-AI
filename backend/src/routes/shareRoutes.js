const express = require("express")
const crypto = require("crypto")
const store = require("../store")
const { asyncHandler } = require("../utils/asyncHandler")
const { buildShareSnapshot, sanitizeShareForClient } = require("../services/privacyService")
const { recordAudit } = require("../services/auditService")
const { requireAuth } = require("../middleware/auth")
const { digestSecret, getReportText, verifyDigest } = require("../services/cryptoService")

const router = express.Router()

function normalizeList(value) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => String(item).trim()).filter(Boolean))]
    : []
}

router.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const shares = await store.listShares(_req.user.did)
    res.json({ shares: shares.map(sanitizeShareForClient) })
  }),
)

router.post(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const report = await store.getReport(req.body?.reportId, req.user.did)
    if (!report) return res.status(404).json({ error: "Report not found" })

    const expiryHours = Math.min(Math.max(Number(req.body?.expiryHours || 24), 1), 24 * 30)
    const token = crypto.randomBytes(24).toString("base64url")
    const accessCode = String(crypto.randomInt(100000, 1000000))
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString()
    const allow = normalizeList(req.body?.allow)
    const hide = normalizeList(req.body?.hide)
    const settings = await store.getSettings(req.user.did)
    const snapshot = buildShareSnapshot(report, {
      allow,
      hide,
      strict: settings.privacyMode !== "balanced",
    }, getReportText(report))

    const share = await store.insertShare({
      token: `hash:${digestSecret(token)}`,
      tokenHash: digestSecret(token),
      accessCodeHash: digestSecret(accessCode),
      reportId: report.id,
      ownerDid: req.user.did,
      recipientName: String(req.body?.recipientName || "Care provider").slice(0, 120),
      recipientRole: String(req.body?.recipientRole || "Doctor").slice(0, 80),
      expiresAt,
      expiryHours,
      snapshot,
      revoked: false,
    })

    await recordAudit({
      agent: "Sharing Agent",
      action: "share.create",
      target: report.id,
      details: `Created selective access link for ${share.recipientName}`,
      metadata: {
        tokenDigest: crypto.createHash("sha256").update(token).digest("hex"),
        allow,
        hide,
        expiresAt,
      },
      ownerDid: req.user.did,
    })

    res.status(201).json({
      share: sanitizeShareForClient(
        {
          ...share,
          token,
          accessCode,
          shareUrlPath: `/share/${token}`,
        },
        { includeToken: true, includeAccessCode: true },
      ),
    })
  }),
)

router.get(
  "/public/:token",
  asyncHandler(async (req, res) => {
    const tokenHash = digestSecret(req.params.token)
    const share = await store.getShareByToken(req.params.token, tokenHash)
    if (!share || share.revoked) return res.status(404).json({ error: "Share link is unavailable" })
    if (new Date(share.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ error: "Share link has expired" })
    }
    if (share.accessCodeHash) {
      const accessCode = req.get("x-share-access-code") || String(req.query.code || "")
      if (!verifyDigest(accessCode, share.accessCodeHash)) {
        return res.status(401).json({ error: "Recipient access code is required", codeRequired: true })
      }
    }

    const updated = await store.updateShare(req.params.token, {
      views: Number(share.views || 0) + 1,
      lastViewedAt: new Date().toISOString(),
    }, tokenHash)

    await recordAudit({
      agent: "Audit Agent",
      action: "share.view",
      target: share.reportId,
      details: `${share.recipientName} viewed a selective disclosure link`,
      actor: share.recipientName,
      metadata: { tokenDigest: crypto.createHash("sha256").update(req.params.token).digest("hex") },
      ownerDid: share.ownerDid,
    })

    res.json({ share: sanitizeShareForClient(updated) })
  }),
)

router.post(
  "/:id/revoke",
  requireAuth,
  asyncHandler(async (req, res) => {
    const share = await store.updateShareById(req.params.id, req.user.did, { revoked: true, revokedAt: new Date().toISOString() })
    if (!share) return res.status(404).json({ error: "Share link not found" })
    await recordAudit({
      agent: "Sharing Agent",
      action: "share.revoke",
      target: share.reportId,
      details: `Revoked selective access link for ${share.recipientName}`,
      ownerDid: req.user.did,
    })
    res.json({ share: sanitizeShareForClient(share) })
  }),
)

module.exports = router
