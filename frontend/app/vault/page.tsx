"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/page-heading"
import { ReportSummaryPanel } from "@/components/report-summary-panel"
import { Button } from "@/components/ui/button"
import { createSampleReport, getReports, type Report } from "@/lib/api"

const filters = ["All", "Blood Test", "Prescription", "MRI", "X-ray", "Medical Record"]

export default function VaultPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [filter, setFilter] = useState("All")
  const [error, setError] = useState("")

  useEffect(() => {
    getReports().then((data) => setReports(data.reports)).catch((err) => setError(err instanceof Error ? err.message : "Could not load vault"))
  }, [])

  const visible = filter === "All" ? reports : reports.filter((report) => report.category.toLowerCase().includes(filter.toLowerCase()))

  async function loadSample() {
    const result = await createSampleReport()
    setReports((prev) => [result.report, ...prev.filter((report) => report.id !== result.report.id)])
  }

  return (
    <AppShell>
      <PageHeading title="Medical Vault" description="Reports stay organized by category with AI summaries, redaction findings, and share-ready vitals." />
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => (
          <Button
            key={item}
            onClick={() => setFilter(item)}
            variant="outline"
            className={`rounded-full border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white ${filter === item ? "bg-zinc-900 text-white" : ""}`}
          >
            {item}
          </Button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {error && <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100 lg:col-span-2">{error}</p>}
        {visible.map((report) => (
          <ReportSummaryPanel key={report.id} report={report} />
        ))}
        {!visible.length && !error && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
            <h2 className="text-lg font-semibold">No reports in this category</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Upload a file or create the demo blood panel to test chat, sharing, and audit flows.</p>
            <Button onClick={loadSample} className="mt-4 rounded-full bg-white text-zinc-950 hover:bg-zinc-200">
              Load demo report
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
