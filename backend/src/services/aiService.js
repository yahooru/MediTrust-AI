const OpenAI = require("openai")
const { config } = require("../config")
const { sanitizeRedactedText, sanitizeRedactions } = require("./privacyService")

let openai = null

function getOpenAI() {
  if (!config.openai.apiKey) return null
  if (!openai) openai = new OpenAI({ apiKey: config.openai.apiKey })
  return openai
}

function fallbackAnalysis(text = "", name = "Medical report") {
  const lower = text.toLowerCase()
  const vitals = []

  const checks = [
    { name: "HbA1c", regex: /hba1c\D{0,10}(\d+(\.\d+)?)/i, unit: "%", high: 6.5 },
    { name: "Fasting glucose", regex: /(fasting glucose|blood sugar)\D{0,12}(\d+(\.\d+)?)/i, unit: "mg/dL", high: 125, group: 2 },
    { name: "Blood pressure", regex: /(\d{2,3})\s*\/\s*(\d{2,3})\s*mmhg/i, unit: "mmHg", high: 140 },
    { name: "Cholesterol", regex: /cholesterol\D{0,12}(\d+(\.\d+)?)/i, unit: "mg/dL", high: 200 },
  ]

  for (const check of checks) {
    const match = text.match(check.regex)
    if (!match) continue
    const value = check.name === "Blood pressure" ? `${match[1]}/${match[2]}` : Number(match[check.group || 1])
    const numeric = Number(match[check.group || 1])
    vitals.push({
      name: check.name,
      value,
      unit: check.unit,
      status: Number.isFinite(numeric) && numeric >= check.high ? "attention" : "normal",
    })
  }

  const alerts = vitals
    .filter((vital) => vital.status === "attention")
    .map((vital) => `${vital.name} appears above the usual reference range. Review with a licensed clinician.`)

  const medicationMatches = [...text.matchAll(/\b(?:medication|medicine|rx|tab|tablet)\s*[:\-]?\s*([A-Za-z][A-Za-z0-9\s-]{2,40})/gi)]
  const medications = [
    ...new Set([
      ...medicationMatches.map((match) => match[1].replace(/\s{2,}.*/, "").trim()),
      ...(lower.includes("metformin") ? ["Metformin"] : []),
    ]),
  ].filter(Boolean)

  return {
    summary:
      `AI-readable summary for ${name}: this record was parsed and checked for common values. ` +
      "Use this as an educational explanation, not a diagnosis.",
    category: lower.includes("prescription") ? "Prescription" : lower.includes("mri") ? "MRI" : "Blood Test",
    vitals,
    alerts,
    medications,
    nextSteps: [
      "Confirm abnormal values with a doctor.",
      "Share only the selected vitals needed for care.",
      "Keep the original report stored for clinical review.",
    ],
    disclaimer: "MediTrust AI explains records for education and does not replace medical advice.",
    source: "local-fallback",
  }
}

function localAnswer({ question, reports }) {
  const lowerQuestion = question.toLowerCase()
  const allVitals = reports.flatMap((report) =>
    (report.analysis?.vitals || []).map((vital) => ({ ...vital, reportName: report.name })),
  )
  const attentionVitals = allVitals.filter((vital) => vital.status === "attention")
  const medications = [...new Set(reports.flatMap((report) => report.analysis?.medications || []))]
  const alerts = reports.flatMap((report) => report.analysis?.alerts || [])

  if (!reports.length) {
    return "Upload a report first, then I can answer from extracted text, saved summaries, and privacy-safe vitals."
  }

  if (lowerQuestion.includes("share") || lowerQuestion.includes("doctor")) {
    const fields = attentionVitals.length ? attentionVitals : allVitals
    const fieldText = fields.map((vital) => `${vital.name} (${vital.value} ${vital.unit})`).join(", ")
    return [
      fieldText
        ? `For a care visit, share only the relevant clinical values: ${fieldText}.`
        : "For a care visit, share the report summary and any values the doctor requested.",
      "Keep Aadhaar, address, phone, email, and unrelated sensitive markers hidden unless the recipient explicitly needs them.",
      "Use an expiring MediTrust share link so views and revocations are audited.",
    ].join(" ")
  }

  if (lowerQuestion.includes("medicine") || lowerQuestion.includes("medication") || lowerQuestion.includes("prescribed")) {
    return medications.length
      ? `The saved reports mention: ${medications.join(", ")}. Confirm dose and schedule with the prescribing clinician.`
      : "I do not see a clear medication list in the saved report summaries. Upload the prescription image or text for extraction."
  }

  if (lowerQuestion.includes("high") || lowerQuestion.includes("alert") || lowerQuestion.includes("abnormal")) {
    return alerts.length
      ? `${alerts.join(" ")} These are educational flags and should be confirmed by a licensed clinician.`
      : "I do not see flagged values in the saved summaries. Keep the original report available for clinician review."
  }

  const summaries = reports
    .map((report) => `${report.name}: ${report.analysis?.summary || "No summary available."}`)
    .join(" ")
  const vitalText = allVitals
    .map((vital) => `${vital.name} ${vital.value} ${vital.unit} (${vital.status})`)
    .join("; ")

  return [
    summaries,
    vitalText ? `Key values: ${vitalText}.` : "",
    "This is an educational explanation, not a diagnosis.",
  ]
    .filter(Boolean)
    .join(" ")
}

function hardenAnswerPrivacyPolicy(answer = "", question = "") {
  let safeAnswer = String(answer)
    .replace(/\bHIV marker\b/gi, "sensitive medical marker")
    .replace(/\bhuman immunodeficiency virus\b|\bretroviral\b/gi, "sensitive medical marker")

  const lowerQuestion = question.toLowerCase()
  const isSharingQuestion = /\b(share|doctor|cardiologist|clinic|insurer|provider)\b/.test(lowerQuestion)
  const explicitlyAskedForFullReport = /\b(full|complete|entire)\s+report\b/.test(lowerQuestion)

  if (isSharingQuestion && !explicitlyAskedForFullReport) {
    safeAnswer = safeAnswer
      .replace(/\s*unless[^.]*\bfull report\b[^.]*\./gi, ".")
      .replace(/\b(share|send|provide)\s+(the\s+)?(full|complete|entire)\s+report\b/gi, "share a field-limited MediTrust link")
      .replace(/\bfull report\b/gi, "field-limited report view")
  }

  return safeAnswer.replace(/\s+\./g, ".").trim()
}

async function analyzeReport({ text, name }) {
  const client = getOpenAI()
  if (!client) return fallbackAnalysis(text, name)

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: { type: "string" },
      category: { type: "string" },
      vitals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string" },
            value: { type: ["string", "number"] },
            unit: { type: "string" },
            status: { type: "string", enum: ["normal", "attention", "unknown"] },
          },
          required: ["name", "value", "unit", "status"],
        },
      },
      alerts: { type: "array", items: { type: "string" } },
      medications: { type: "array", items: { type: "string" } },
      nextSteps: { type: "array", items: { type: "string" } },
      disclaimer: { type: "string" },
    },
    required: ["summary", "category", "vitals", "alerts", "medications", "nextSteps", "disclaimer"],
  }

  try {
    const response = await client.responses.create({
      model: config.openai.model,
      input: [
        {
          role: "system",
          content:
            "You are MediTrust AI, a careful medical-record explainer. Extract facts, flag abnormal-looking values conservatively, avoid diagnosis, and always include a medical advice disclaimer.",
        },
        {
          role: "user",
          content: `Report name: ${name}\n\nExtracted text:\n${text.slice(0, 12000)}`,
        },
      ],
      reasoning: { effort: "low" },
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "medical_report_analysis",
          strict: true,
          schema,
        },
      },
      max_output_tokens: 1200,
    })

    return { ...JSON.parse(response.output_text), source: "openai-responses" }
  } catch (error) {
    return { ...fallbackAnalysis(text, name), source: "local-fallback", aiError: error.message }
  }
}

async function answerQuestion({ question, reports }) {
  const client = getOpenAI()
  const reportContext = reports
    .map((report) => {
      const vitals = (report.analysis?.vitals || [])
        .map((vital) => `${vital.name}: ${vital.value} ${vital.unit} (${vital.status})`)
        .join("; ")
      const redactions = sanitizeRedactions(report.redactions || []).map((item) => item.label || item.key).filter(Boolean).join(", ")
      return [
        `Report: ${report.name}`,
        `Summary: ${report.analysis?.summary || ""}`,
        vitals ? `Vitals: ${vitals}` : "",
        (report.analysis?.alerts || []).length ? `Alerts: ${(report.analysis?.alerts || []).join(" ")}` : "",
        (report.analysis?.medications || []).length ? `Medications: ${(report.analysis?.medications || []).join(", ")}` : "",
        redactions ? `Redacted fields that must not be revealed: ${redactions}` : "",
        `Privacy-safe text: ${sanitizeRedactedText(report.maskedText || "").slice(0, 2500)}`,
      ]
        .filter(Boolean)
        .join("\n")
    })
    .join("\n\n---\n\n")

  if (!client) {
    return {
      answer: hardenAnswerPrivacyPolicy(localAnswer({ question, reports }), question),
      citations: reports.map((report) => report.name),
      source: "local-fallback",
    }
  }

  try {
    const response = await client.responses.create({
      model: config.openai.model,
      input: [
        {
          role: "system",
          content:
            "Answer as MediTrust AI. Use only the provided privacy-safe report context. Be plain-language, concise, and safe. Do not diagnose. Recommend clinician review for abnormal or urgent findings. For sharing questions, recommend the minimum necessary non-redacted values and an expiring MediTrust share link; do not recommend sharing the full report unless the user explicitly asks. Never reveal, infer, or summarize redacted fields or sensitive markers; if asked, say they are hidden and should only be reviewed from the original report by an authorized clinician.",
        },
        { role: "user", content: `Question: ${question}\n\nReport context:\n${reportContext}` },
      ],
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
      max_output_tokens: 700,
    })

    return {
      answer: hardenAnswerPrivacyPolicy(response.output_text, question),
      citations: reports.map((report) => report.name),
      source: "openai-responses",
    }
  } catch (error) {
    return {
      answer: hardenAnswerPrivacyPolicy(localAnswer({ question, reports }), question),
      citations: reports.map((report) => report.name),
      source: "local-fallback",
      aiError: error.message,
    }
  }
}

module.exports = { analyzeReport, answerQuestion, fallbackAnalysis, localAnswer }
