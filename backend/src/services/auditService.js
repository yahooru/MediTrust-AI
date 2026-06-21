const store = require("../store")
const terminal3 = require("./terminal3Service")

async function recordAudit({
  agent,
  action,
  target,
  details,
  actor = "MediTrust Agent Mesh",
  severity = "info",
  metadata = {},
  ownerDid,
}) {
  const envelope = await terminal3.createProtectedAction(action, {
    agent,
    target,
    details,
    severity,
    metadata,
  })

  return store.insertAudit({
    agent,
    action,
    target,
    details,
    actor,
    severity,
    metadata,
    ownerDid,
    terminal3: envelope,
  })
}

module.exports = { recordAudit }
