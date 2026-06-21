const express = require("express")
const { asyncHandler } = require("../utils/asyncHandler")
const terminal3 = require("../services/terminal3Service")
const { recordAudit } = require("../services/auditService")
const { createSession } = require("../services/sessionService")

const router = express.Router()

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const status = await terminal3.getStatus({ refresh: true })
    const user = {
      name: String(req.body?.name || "MediTrust User").slice(0, 120),
      did: status.did || status.configuredDid || "did:t3n:demo-user",
      role: "patient",
    }
    const session = createSession(user)
    await recordAudit({
      agent: "Identity Agent",
      action: "terminal3.login",
      target: user.did,
      details: status.authenticated ? "Terminal3 agent session authenticated" : "Demo identity session created",
      metadata: { terminal3Authenticated: status.authenticated },
      ownerDid: user.did,
    })

    res.json({
      user,
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      terminal3: status,
    })
  }),
)

module.exports = router
