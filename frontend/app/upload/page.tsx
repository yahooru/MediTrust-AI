"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { FileUp, Loader2, ShieldCheck, Sparkles } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/page-heading"
import { ReportSummaryPanel } from "@/components/report-summary-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createSampleReport, uploadReport, type Report } from "@/lib/api"

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [category, setCategory] = useState("Blood Test")
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit() {
    if (!file) return setError("Choose a PDF, image, prescription, or text report first.")
    const form = new FormData()
    form.append("file", file)
    form.append("category", category)
    setLoading(true)
    setError("")
    try {
      const result = await uploadReport(form)
      setReport(result.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setLoading(false)
    }
  }

  async function loadSample() {
    setLoading(true)
    setError("")
    try {
      const result = await createSampleReport()
      setReport(result.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the demo report")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <PageHeading title="Upload Report" description="OCR, masking, AI explanation, and Terminal3 audit happen in one protected flow." />

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-dashed border-zinc-700 bg-zinc-900/50 p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
            <FileUp className="h-7 w-7" />
          </div>
          <h2 className="mt-6 text-xl font-semibold">Add a medical file</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Supports PDFs, images, prescriptions, lab reports, and text files. Images are OCR processed on the backend.
          </p>

          <div className="mt-6 space-y-4">
            <Input type="file" accept=".pdf,image/*,.txt" onChange={(event) => setFile(event.target.files?.[0] || null)} className="border-zinc-800 bg-zinc-950 text-zinc-300" />
            <Input value={category} onChange={(event) => setCategory(event.target.value)} className="border-zinc-800 bg-zinc-950 text-white" />
            {error && <p className="text-sm text-amber-300">{error}</p>}
            <div className="flex flex-wrap gap-3">
              <Button onClick={submit} disabled={loading} className="shimmer-btn h-11 rounded-full bg-white px-6 text-zinc-950 hover:bg-zinc-200">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {loading ? "Analyzing..." : "Upload and analyze"}
              </Button>
              <Button onClick={loadSample} disabled={loading} variant="outline" className="h-11 rounded-full border-zinc-800 bg-transparent px-6 text-zinc-300 hover:bg-zinc-900 hover:text-white">
                <Sparkles className="h-4 w-4" />
                Load demo report
              </Button>
            </div>
          </div>
        </motion.div>

        <div>
          {report ? (
            <ReportSummaryPanel report={report} />
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
              <h2 className="text-lg font-semibold">What happens next</h2>
              <div className="mt-5 space-y-4">
                {["Storage agent saves metadata and file URL when Cloudinary is configured.", "Medical Agent extracts report facts with structured AI or a local safety fallback.", "Privacy Agent masks Aadhaar, address, phone, email, and sensitive markers.", "Audit Agent stores a Terminal3 action digest for traceability."].map((step, index) => (
                  <div key={step} className="flex gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs text-zinc-400">{index + 1}</span>
                    <p className="text-sm leading-6 text-zinc-400">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
