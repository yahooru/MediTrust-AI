"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { AlertTriangle, Bot, FileText, Share2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/page-heading"
import { ReportSummaryPanel } from "@/components/report-summary-panel"
import { Terminal3Status } from "@/components/terminal3-status"
import { getAuditLogs, getReports, getShares, type AuditEvent, type Report, type ShareRecord } from "@/lib/api"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DashboardPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [audits, setAudits] = useState<AuditEvent[]>([])
  const [shares, setShares] = useState<ShareRecord[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    setError("")
    getReports().then((data) => setReports(data.reports)).catch((err) => setError(err instanceof Error ? err.message : "Could not load reports"))
    getAuditLogs().then((data) => setAudits(data.audits)).catch(() => {})
    getShares().then((data) => setShares(data.shares)).catch(() => {})
  }, [])

  const attention = useMemo(
    () => reports.flatMap((report) => report.analysis?.alerts || []).length,
    [reports],
  )

  return (
    <AppShell>
      <PageHeading
        title="Patient Command Center"
        description="A complete view of reports, AI findings, selective shares, and Terminal3-authenticated agent activity."
      />

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Reports", value: reports.length, icon: FileText },
          { label: "Attention alerts", value: attention, icon: AlertTriangle },
          { label: "Agent actions", value: audits.length, icon: Bot },
          { label: "Active shares", value: shares.filter((share) => !share.revoked && new Date(share.expiresAt).getTime() > Date.now()).length, icon: Share2 },
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.07 }}
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4"
          >
            <metric.icon className="mb-4 h-5 w-5 text-zinc-500" />
            <p className="text-3xl font-bold">{metric.value}</p>
            <p className="mt-1 text-sm text-zinc-500">{metric.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent reports</h2>
          {error && <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">{error}</p>}
          {reports.slice(0, 3).map((report) => (
            <ReportSummaryPanel key={report.id} report={report} />
          ))}
          {!reports.length && !error && (
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
              <h2 className="text-lg font-semibold">No reports yet</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Upload a medical file or create the built-in demo report to start the protected workflow.</p>
              <Button asChild className="mt-4 rounded-full bg-white text-zinc-950 hover:bg-zinc-200">
                <Link href="/upload">Add report</Link>
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <Terminal3Status />
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="mb-4 text-sm font-semibold text-white">Latest protected actions</h2>
            <div className="space-y-4">
              {audits.slice(0, 5).map((audit) => (
                <div key={audit.id} className="border-l border-zinc-700 pl-4">
                  <p className="text-sm text-white">{audit.agent}</p>
                  <p className="mt-1 text-xs text-zinc-500">{audit.details}</p>
                  <p className="mt-1 text-[11px] text-zinc-600">{audit.terminal3?.digest || audit.action}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
