const crypto = require("crypto")
const { config } = require("../config")
const { canonicalJson } = require("../utils/canonicalJson")

let sdk = null
let session = null
let sessionPromise = null
let lastProvision = null
let teeAttestationCache = null

const agentRegistry = [
  {
    id: "identity-agent",
    name: "Identity Agent",
    didRole: "session-controller",
    scope: ["terminal3.login", "terminal3.provision", "terminal3.attestation.check"],
    terminal3Use: ["handshake", "authenticate", "getUsage"],
    purpose: "Starts a DID-backed agent session and checks Terminal3 readiness.",
  },
  {
    id: "medical-agent",
    name: "Medical Agent",
    didRole: "record-analyzer",
    scope: ["report.upload.analyze", "report.reanalyze", "ai.chat.answer"],
    terminal3Use: ["redactSecrets", "protected-action-digest", "audit-envelope"],
    purpose: "Extracts report facts, explains results, and flags values for clinician review.",
  },
  {
    id: "privacy-agent",
    name: "Privacy Agent",
    didRole: "sensitive-data-minimizer",
    scope: ["privacy.mask", "settings.update"],
    terminal3Use: ["tenant-private-maps", "secrets-map-ready", "audit-envelope"],
    purpose: "Masks Aadhaar, address, contact data, and sensitive medical markers.",
  },
  {
    id: "sharing-agent",
    name: "Sharing Agent",
    didRole: "delegation-controller",
    scope: ["share.create", "share.revoke"],
    terminal3Use: ["permissioned-action", "expiry-policy", "audit-envelope"],
    purpose: "Creates and revokes expiring selective-disclosure links.",
  },
  {
    id: "audit-agent",
    name: "Audit Agent",
    didRole: "trace-writer",
    scope: ["share.view", "audit.read"],
    terminal3Use: ["getAuditEvents", "canonical-digest", "tee-attestation"],
    purpose: "Records who did what, when, and under which Terminal3 identity.",
  },
]

function normalizeDid(value) {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object") {
    return value.did || value.value || value.id || JSON.stringify(value)
  }
  return String(value)
}

async function loadSdk() {
  if (sdk) return sdk
  sdk = await import("@terminal3/t3n-sdk")
  return sdk
}

function disabledStatus(reason = "T3N_API_KEY is not configured") {
  return {
    enabled: false,
    authenticated: false,
    environment: config.terminal3.environment,
    did: config.terminal3.did || null,
    reason,
    agents: agentRegistry,
  }
}

async function ensureSession({ force = false } = {}) {
  if (!config.terminal3.apiKey) return disabledStatus()
  if (session && !force) return session
  if (sessionPromise && !force) return sessionPromise

  sessionPromise = (async () => {
    const t3n = await loadSdk()
    t3n.setEnvironment(config.terminal3.environment)

    const wasmComponent = await t3n.loadWasmComponent()
    const address = t3n.eth_get_address(config.terminal3.apiKey)
    const client = new t3n.T3nClient({
      ...(config.terminal3.nodeUrl ? { baseUrl: config.terminal3.nodeUrl } : {}),
      wasmComponent,
      handlers: {
        EthSign: t3n.metamask_sign(address, undefined, config.terminal3.apiKey),
      },
    })

    const handshake = await client.handshake()
    const did = normalizeDid(await client.authenticate(t3n.createEthAuthInput(address)))
    const tenantClient = new t3n.TenantClient({
      environment: config.terminal3.environment,
      t3n: client,
      tenantDid: config.terminal3.did || did,
      ...(config.terminal3.nodeUrl ? { baseUrl: config.terminal3.nodeUrl, endpoint: config.terminal3.nodeUrl } : {}),
    })

    session = {
      enabled: true,
      authenticated: true,
      environment: config.terminal3.environment,
      did: did || config.terminal3.did,
      configuredDid: config.terminal3.did || null,
      address,
      client,
      tenantClient,
      handshake,
      authenticatedAt: new Date().toISOString(),
    }
    return session
  })()

  try {
    return await sessionPromise
  } finally {
    sessionPromise = null
  }
}

function digestValue(value) {
  if (!value) return null
  return crypto.createHash("sha256").update(String(value)).digest("hex")
}

async function getTeeAttestation({ refresh = false } = {}) {
  if (teeAttestationCache && !refresh) return teeAttestationCache

  const t3n = sdk || (await loadSdk())
  t3n.setEnvironment(config.terminal3.environment)
  const nodeUrl = t3n.getNodeUrl(config.terminal3.nodeUrl || undefined)

  const attestation = {
    nodeUrl,
    mlKemPublicKeyDigest: null,
    dkg: null,
    verified: false,
    checkedAt: new Date().toISOString(),
  }

  try {
    const encapsKey = await t3n.fetchMlKemPublicKey(nodeUrl)
    attestation.mlKemPublicKeyDigest = digestValue(encapsKey)

    const dkg = await t3n.fetchDkgAttestation(nodeUrl)
    if (dkg) {
      const verification = await t3n.verifyDkgAttestation(
        encapsKey,
        dkg.attestation_msg,
        dkg.peer_ids,
        dkg.quotes,
      )
      attestation.dkg = {
        peerCount: dkg.peer_ids.length,
        validCount: verification.valid_count,
        expectedCount: verification.expected_count,
        valid: verification.valid,
        error: verification.error,
      }
      attestation.verified = Boolean(verification.valid)
    }
  } catch (error) {
    attestation.error = error.message
  }

  teeAttestationCache = attestation
  return attestation
}

async function getStatus({ refresh = false } = {}) {
  if (!config.terminal3.apiKey) return disabledStatus()
  try {
    const current = await ensureSession({ force: refresh })
    const [usage, audit, teeAttestation] = await Promise.all([
      current.client.getUsage({ limit: 8 }).catch((error) => ({ error: error.message })),
      current.client.getAuditEvents({ limit: 8 }).catch((error) => ({ error: error.message })),
      getTeeAttestation({ refresh }).catch((error) => ({ error: error.message })),
    ])

    return {
      enabled: true,
      authenticated: true,
      environment: current.environment,
      did: current.did,
      configuredDid: current.configuredDid,
      walletAddress: current.address,
      authenticatedAt: current.authenticatedAt,
      usage,
      terminalAudit: audit,
      teeAttestation,
      provision: lastProvision,
      agents: agentRegistry,
    }
  } catch (error) {
    return {
      enabled: true,
      authenticated: false,
      environment: config.terminal3.environment,
      did: config.terminal3.did || null,
      error: error.message,
      agents: agentRegistry,
    }
  }
}

function getAgentByAction(action, agentName) {
  return (
    agentRegistry.find((agent) => agent.name === agentName) ||
    agentRegistry.find((agent) => agent.scope.includes(action)) ||
    agentRegistry.find((agent) => agent.id === "audit-agent")
  )
}

async function createProtectedAction(action, payload = {}) {
  let status = await getStatus()
  const t3n = sdk || (await loadSdk().catch(() => null))
  const redactedPayload = t3n?.redactSecrets ? t3n.redactSecrets(payload) : payload
  const agent = getAgentByAction(action, payload.agent)
  const issuedAt = new Date().toISOString()
  const body = {
    action,
    agent: agent.name,
    policyScope: agent.scope,
    payload: redactedPayload,
    actorDid: status.did || config.terminal3.did || "did:t3n:demo",
    environment: config.terminal3.environment,
    issuedAt,
  }
  const digest = crypto.createHash("sha256").update(canonicalJson(body)).digest("hex")

  return {
    id: crypto.randomUUID(),
    sdk: "@terminal3/t3n-sdk",
    authenticated: Boolean(status.authenticated),
    did: body.actorDid,
    environment: body.environment,
    agent: {
      id: agent.id,
      name: agent.name,
      didRole: agent.didRole,
      terminal3Use: agent.terminal3Use,
    },
    action,
    digest,
    issuedAt,
    payloadRedacted: redactedPayload,
    t3nAuditAvailable: Boolean(status.terminalAudit && !status.terminalAudit.error),
    teeVerified: Boolean(status.teeAttestation?.verified),
  }
}

async function provisionTenantMaps() {
  const current = await ensureSession()
  if (!current.authenticated) return current

  if (!config.terminal3.contractId) {
    lastProvision = {
      ok: true,
      mode: "session-only",
      message:
        "Terminal3 auth, token usage, and encrypted audit reads are active. Set T3N_MEDICAL_CONTRACT_ID after publishing a tenant contract to lock maps to that contract.",
      at: new Date().toISOString(),
    }
    return lastProvision
  }

  const writers = { only: [config.terminal3.contractId] }
  const readers = { only: [config.terminal3.contractId] }
  const operations = []

  for (const tail of ["secrets", "meditrust-reports", "meditrust-shares", "meditrust-audit"]) {
    try {
      const result = await current.tenantClient.maps.create({
        tail,
        visibility: "private",
        writers,
        readers,
      })
      operations.push({ tail, ok: true, result })
    } catch (error) {
      const alreadyExists = /already|exists/i.test(error.message)
      operations.push({ tail, ok: alreadyExists, existed: alreadyExists, error: alreadyExists ? undefined : error.message })
    }
  }

  lastProvision = {
    ok: operations.some((operation) => operation.ok),
    mode: "tenant-maps",
    contractId: config.terminal3.contractId,
    operations,
    at: new Date().toISOString(),
  }
  return lastProvision
}

function getAgentManifest() {
  return {
    sdk: "@terminal3/t3n-sdk",
    environment: config.terminal3.environment,
    configuredDid: config.terminal3.did || null,
    agents: agentRegistry,
    protectedActionFlow: [
      "SDK session authenticates with Ethereum challenge",
      "Workflow payload is redacted with Terminal3 helpers",
      "Canonical JSON digest is stored with DID and agent role",
      "Tenant maps can be contract-locked after TEE contract publication",
      "Audit page reads local events plus Terminal3 audit availability",
    ],
  }
}

module.exports = {
  ensureSession,
  getStatus,
  getTeeAttestation,
  createProtectedAction,
  provisionTenantMaps,
  getAgentManifest,
}
