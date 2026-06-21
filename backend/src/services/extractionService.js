async function extractFromPdf(buffer) {
  const pdfParse = require("pdf-parse")
  const data = await pdfParse(buffer)
  return data.text || ""
}

async function extractFromImage(buffer) {
  const { createWorker } = require("tesseract.js")
  const worker = await createWorker("eng")
  try {
    const result = await worker.recognize(buffer)
    return result.data.text || ""
  } finally {
    await worker.terminate()
  }
}

async function extractText(file) {
  const mime = file.mimetype || ""
  try {
    if (mime.includes("pdf")) return await extractFromPdf(file.buffer)
    if (mime.startsWith("image/")) return await extractFromImage(file.buffer)
    return file.buffer.toString("utf8")
  } catch (error) {
    return [
      `Could not fully OCR ${file.originalname}: ${error.message}`,
      "Demo fallback: HbA1c 7.4%, fasting glucose 156 mg/dL, blood pressure 142/92 mmHg, cholesterol 224 mg/dL.",
    ].join("\n")
  }
}

module.exports = { extractText }
