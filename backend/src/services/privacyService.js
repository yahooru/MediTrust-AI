const sensitivePatterns = [
  { key: "aadhaar", label: "Aadhaar", pattern: /\b\d{4}\s?\d{4}\s?\d{4}\b/g },
  { key: "phone", label: "Phone", pattern: /\b(?:\+91[-\s]?)?[6-9]\d{9}\b/g },
  { key: "email", label: "Email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  {
    key: "sensitive-medical",
    label: "Sensitive medical marker",
    aliases: ["hiv"],
    pattern: /\b(HIV|human immunodeficiency virus|retroviral)\b[\s\S]{0,80}/gi,
  },
  { key: "address", label: "Address", pattern: /\b(address|addr)\s*[:\-]\s*.+/gi },
]

function maskSensitiveText(text = "", options = {}) {
  const hidden = new Set((options.hide || []).map((item) => item.toLowerCase()))
  const shouldMaskAll = options.strict !== false
  const findings = []
  let masked = text

  for (const item of sensitivePatterns) {
    const aliases = item.aliases || []
    if (
      !shouldMaskAll &&
      !hidden.has(item.key) &&
      !hidden.has(item.label.toLowerCase()) &&
      !aliases.some((alias) => hidden.has(alias))
    ) {
      continue
    }
    masked = masked.replace(item.pattern, (match) => {
      findings.push({ key: item.key, label: item.label, sampleLength: match.length })
      return `[redacted:${item.key}]`
    })
  }

  return { text: masked, findings }
}

function sanitizeRedactedText(text = "") {
  return text.replace(/\[redacted:hiv\]/gi, "[redacted:sensitive-medical]")
}

function sanitizeRedactions(redactions = []) {
  return redactions.map((item) => {
    if (item.key === "hiv" || /hiv|immunodeficiency|retroviral/i.test(item.label || "")) {
      return { ...item, key: "sensitive-medical", label: "Sensitive medical marker" }
    }
    return item
  })
}

function sanitizeReportForClient(report) {
  if (!report) return report
  const { extractedText: _extractedText, extractedTextEncrypted: _extractedTextEncrypted, ...safeReport } = report
  return {
    ...safeReport,
    storage: safeReport.storage
      ? {
          provider: safeReport.storage.provider,
          publicId: safeReport.storage.publicId || null,
          resourceType: safeReport.storage.resourceType,
          protected: Boolean(safeReport.storage.protected || safeReport.storage.url),
          note: safeReport.storage.note,
        }
      : undefined,
    maskedText: sanitizeRedactedText(safeReport.maskedText || ""),
    redactions: sanitizeRedactions(safeReport.redactions || []),
  }
}

function sanitizeShareForClient(share, options = {}) {
  if (!share?.snapshot) return share
  const {
    token,
    tokenHash: _tokenHash,
    accessCodeHash: _accessCodeHash,
    accessCode,
    shareUrlPath,
    ownerDid: _ownerDid,
    ...safeShare
  } = share
  return {
    ...safeShare,
    ...(options.includeToken && token ? { token, shareUrlPath } : {}),
    ...(options.includeAccessCode && accessCode ? { accessCode } : {}),
    snapshot: {
      ...share.snapshot,
      redactedText: sanitizeRedactedText(share.snapshot.redactedText || ""),
      redactions: sanitizeRedactions(share.snapshot.redactions || []),
    },
  }
}

function buildShareSnapshot(report, permissions, sourceTextOverride) {
  const allow = new Set((permissions.allow || []).map((item) => item.toLowerCase()))
  const hide = permissions.hide || []
  const sourceText = sourceTextOverride || report.extractedText || report.analysis?.summary || ""
  const masked = maskSensitiveText(sourceText, { hide, strict: permissions.strict !== false })

  const vitals = report.analysis?.vitals || []
  const allowedVitals = vitals.filter((vital) => allow.size === 0 || allow.has(vital.name.toLowerCase()))
  const omittedVitals = vitals.filter((vital) => !allowedVitals.includes(vital)).map((vital) => vital.name)

  return {
    reportId: report.id,
    reportName: report.name,
    category: report.category,
    summary: report.analysis?.summary || "No AI summary is available yet.",
    vitals: allowedVitals,
    omittedVitals,
    alerts: report.analysis?.alerts || [],
    redactedText: masked.text,
    redactions: sanitizeRedactions(masked.findings),
    permissions: {
      allow: permissions.allow || [],
      hide,
    },
  }
}

module.exports = {
  maskSensitiveText,
  buildShareSnapshot,
  sanitizeRedactedText,
  sanitizeRedactions,
  sanitizeReportForClient,
  sanitizeShareForClient,
}
