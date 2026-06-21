export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

export type Vital = {
  name: string
  value: string | number
  unit: string
  status: "normal" | "attention" | "unknown"
}

export type Report = {
  id: string
  name: string
  category: string
  createdAt: string
  storage?: {
    provider: string
    url?: string | null
    note?: string
  }
  redactions?: Array<{ key: string; label: string; sampleLength?: number }>
  analysis?: {
    summary: string
    category: string
    vitals: Vital[]
    alerts: string[]
    medications: string[]
    nextSteps: string[]
    disclaimer: string
    source?: string
  }
}

export type AuditEvent = {
  id: string
  agent: string
  action: string
  target: string
  details: string
  severity: string
  createdAt: string
  terminal3?: {
    authenticated: boolean
    did: string
    digest: string
    environment: string
  }
}

export type ShareRecord = {
  id: string
  token?: string
  accessCode?: string
  reportId: string
  recipientName: string
  recipientRole: string
  expiresAt: string
  views: number
  snapshot: {
    reportName: string
    summary: string
    vitals: Vital[]
    omittedVitals?: string[]
    alerts: string[]
    redactedText: string
    redactions: Array<{ key: string; label: string }>
    permissions: { allow: string[]; hide: string[] }
  }
  revoked?: boolean
  lastViewedAt?: string
  shareUrlPath?: string
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 30000)
  const session = getStoredSession()
  const baseHeaders =
    options.body instanceof FormData ? { ...(options.headers || {}) } : { "Content-Type": "application/json", ...(options.headers || {}) }
  const headers = {
    ...baseHeaders,
    ...(session?.sessionToken ? { Authorization: `Bearer ${session.sessionToken}` } : {}),
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    signal: options.signal || controller.signal,
  })
  window.clearTimeout(timeout)

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error || `Request failed: ${response.status}`)
  }

  return response.json()
}

export type MediTrustSession = {
  user: { name: string; did: string; role: string }
  sessionToken: string
  expiresAt: string
  terminal3: unknown
}

export function getStoredSession(): MediTrustSession | null {
  if (typeof window === "undefined") return null
  try {
    const parsed = JSON.parse(window.localStorage.getItem("meditrust-session") || "null")
    if (!parsed?.sessionToken || !parsed?.expiresAt) return null
    if (new Date(parsed.expiresAt).getTime() < Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

export function clearStoredSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem("meditrust-session")
}

export function loginWithTerminal3(name?: string) {
  return request<MediTrustSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ name }),
  })
}

export function getTerminal3Status() {
  return request<any>("/t3/status")
}

export function provisionTerminal3() {
  return request<any>("/t3/provision", { method: "POST", body: JSON.stringify({}) })
}

export function getTerminal3Agents() {
  return request<any>("/t3/agents")
}

export function getTerminal3Attestation(refresh = false) {
  return request<any>(`/t3/attestation${refresh ? "?refresh=true" : ""}`)
}

export function getReports() {
  return request<{ reports: Report[] }>("/reports")
}

export function uploadReport(form: FormData) {
  return request<{ report: Report }>("/reports/upload", { method: "POST", body: form })
}

export function createSampleReport() {
  return request<{ report: Report }>("/reports/sample", {
    method: "POST",
    body: JSON.stringify({ name: "Demo Blood Panel" }),
  })
}

export function askQuestion(question: string, reportId?: string) {
  return request<{ answer: string; citations: string[]; source: string }>("/chat", {
    method: "POST",
    body: JSON.stringify({ question, reportId }),
  })
}

export function createShare(input: {
  reportId: string
  recipientName: string
  recipientRole: string
  allow: string[]
  hide: string[]
  expiryHours: number
}) {
  return request<{ share: ShareRecord }>("/share", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function getShares() {
  return request<{ shares: ShareRecord[] }>("/share")
}

export function getPublicShare(token: string, accessCode?: string) {
  return request<{ share: ShareRecord }>(`/share/public/${token}`, {
    headers: accessCode ? { "x-share-access-code": accessCode } : undefined,
  })
}

export function revokeShare(id: string) {
  return request<{ share: ShareRecord }>(`/share/${id}/revoke`, {
    method: "POST",
    body: JSON.stringify({}),
  })
}

export function getAuditLogs() {
  return request<{ audits: AuditEvent[]; terminal3: any }>("/audit")
}

export function getSettings() {
  return request<{ settings: any }>("/settings")
}

export function updateSettings(settings: any) {
  return request<{ settings: any }>("/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  })
}
