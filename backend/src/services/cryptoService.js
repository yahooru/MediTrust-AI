const crypto = require("crypto")
const { config } = require("../config")

const ENCRYPTION_PREFIX = "enc:v1"

function encryptionKey() {
  return crypto.createHash("sha256").update(config.security.dataEncryptionKey).digest()
}

function encryptText(value = "") {
  if (!value) return ""
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(value), "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return [ENCRYPTION_PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":")
}

function decryptText(value = "") {
  if (!value) return ""
  if (!String(value).startsWith(`${ENCRYPTION_PREFIX}:`)) return String(value)

  const [, , ivValue, tagValue, encryptedValue] = String(value).split(":")
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"))
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"))
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8")
}

function getReportText(report = {}) {
  return decryptText(report.extractedTextEncrypted || report.extractedText || "")
}

function digestSecret(value = "") {
  return crypto.createHash("sha256").update(String(value)).digest("hex")
}

function verifyDigest(value = "", digest = "") {
  if (!value || !digest) return false
  const expected = Buffer.from(digestSecret(value))
  const actual = Buffer.from(String(digest))
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

module.exports = { encryptText, decryptText, getReportText, digestSecret, verifyDigest }
