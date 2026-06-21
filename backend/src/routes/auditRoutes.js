const express = require("express")
const store = require("../store")
const terminal3 = require("../services/terminal3Service")
const { asyncHandler } = require("../utils/asyncHandler")
const { requireAuth } = require("../middleware/auth")

const router = express.Router()

router.get(
  "/",
  requireAuth,
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit || 100), 200)
    const [audits, terminal3Status] = await Promise.all([store.listAudits(limit, req.user.did), terminal3.getStatus()])
    res.json({ audits, terminal3: terminal3Status })
  }),
)

module.exports = router
