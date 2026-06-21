const { verifySessionToken } = require("../services/sessionService")

function getBearerToken(req) {
  const header = req.get("authorization") || ""
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim()
  return req.get("x-meditrust-session") || ""
}

function requireAuth(req, res, next) {
  const session = verifySessionToken(getBearerToken(req))
  if (!session) {
    return res.status(401).json({ error: "A valid MediTrust session is required" })
  }
  req.user = {
    did: session.did,
    name: session.name,
    role: session.role || "patient",
  }
  return next()
}

module.exports = { requireAuth }
