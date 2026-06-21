const crypto = require("crypto")
const { config } = require("../config")

function base64url(value) {
  return Buffer.from(value).toString("base64url")
}

function sign(value) {
  return crypto.createHmac("sha256", config.security.sessionSecret).update(value).digest("base64url")
}

function createSession(user) {
  const now = Math.floor(Date.now() / 1000)
  const expiresAt = now + Math.max(1, config.security.sessionTtlHours) * 60 * 60
  const payload = {
    sub: user.did,
    did: user.did,
    name: user.name || "MediTrust User",
    role: user.role || "patient",
    iat: now,
    exp: expiresAt,
  }
  const encoded = base64url(JSON.stringify(payload))
  return {
    token: `${encoded}.${sign(encoded)}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
    payload,
  }
}

function verifySessionToken(token = "") {
  const [encoded, signature] = String(token).split(".")
  if (!encoded || !signature) return null

  const expected = sign(encoded)
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(signature)
  if (expectedBuffer.length !== actualBuffer.length || !crypto.timingSafeEqual(expectedBuffer, actualBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"))
    if (!payload?.did || !payload?.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

module.exports = { createSession, verifySessionToken }
