const express = require("express")
const { asyncHandler } = require("../utils/asyncHandler")
const terminal3 = require("../services/terminal3Service")
const { recordAudit } = require("../services/auditService")
const { requireAuth } = require("../middleware/auth")

const router = express.Router()

router.get(
  "/status",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await terminal3.getStatus())
  }),
)

router.get(
  "/agents",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(terminal3.getAgentManifest())
  }),
)

router.get(
  "/attestation",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await terminal3.getTeeAttestation({ refresh: req.query.refresh === "true" }))
  }),
)

router.post(
  "/provision",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const result = await terminal3.provisionTenantMaps()
    await recordAudit({
      agent: "Terminal3 Control Agent",
      action: "terminal3.provision",
      target: "tenant-maps",
      details: "Provisioned or checked Terminal3 tenant resources for MediTrust AI",
      metadata: result,
      ownerDid: _req.user.did,
    })
    res.json(result)
  }),
)

module.exports = router
