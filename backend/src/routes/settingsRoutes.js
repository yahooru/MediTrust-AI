const express = require("express")
const store = require("../store")
const { asyncHandler } = require("../utils/asyncHandler")
const { recordAudit } = require("../services/auditService")
const { requireAuth } = require("../middleware/auth")

const router = express.Router()

router.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ settings: await store.getSettings(_req.user.did) })
  }),
)

router.patch(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const settings = await store.updateSettings(req.body || {}, req.user.did)
    await recordAudit({
      agent: "Privacy Agent",
      action: "settings.update",
      target: "settings",
      details: "Updated privacy and notification preferences",
      metadata: settings,
      ownerDid: req.user.did,
    })
    res.json({ settings })
  }),
)

module.exports = router
