"use client"

import { motion } from "framer-motion"
import { AlertTriangle, CheckCircle2, FileText, ShieldOff } from "lucide-react"
import type { Report } from "@/lib/api"
import { formatDate } from "@/lib/format"

export function ReportSummaryPanel({ report }: { report: Report }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 transition-colors hover:border-zinc-700"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{report.name}</h3>
            <p className="mt-1 text-xs text-zinc-500">{report.category}</p>
          </div>
        </div>
        <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
          {formatDate(report.createdAt)}
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-zinc-400">{report.analysis?.summary || "Analysis pending."}</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500">
        {report.storage?.provider && (
          <span className="rounded-full border border-zinc-800 px-2.5 py-1">storage: {report.storage.provider}</span>
        )}
        {Boolean(report.redactions?.length) && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-amber-100">
            <ShieldOff className="h-3 w-3" />
            {report.redactions?.length} redactions
          </span>
        )}
        {report.analysis?.source && (
          <span className="rounded-full border border-zinc-800 px-2.5 py-1">analysis: {report.analysis.source}</span>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {(report.analysis?.vitals || []).map((vital) => (
          <span
            key={`${report.id}-${vital.name}`}
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${
              vital.status === "attention"
                ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                : "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
            }`}
          >
            {vital.status === "attention" ? <AlertTriangle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
            {vital.name}: {vital.value} {vital.unit}
          </span>
        ))}
      </div>
    </motion.article>
  )
}
