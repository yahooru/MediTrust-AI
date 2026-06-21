"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/page-heading"
import { Terminal3Status } from "@/components/terminal3-status"
import { getAuditLogs, getTerminal3Agents, type AuditEvent } from "@/lib/api"
import { formatDateTime } from "@/lib/format"

export default function AuditPage() {
  const [audits, setAudits] = useState<AuditEvent[]>([])
  const [manifest, setManifest] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getAuditLogs().then((data) => setAudits(data.audits)).catch((err) => setError(err instanceof Error ? err.message : "Could not load audit logs"))
    getTerminal3Agents().then(setManifest).catch(() => {})
  }, [])

  return (
    <AppShell>
      <PageHeading title="Audit Logs" description="Track analysis, masking, sharing, viewing, revocation, and Terminal3 action envelopes." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60">
          {error && <p className="p-5 text-sm text-amber-100">{error}</p>}
          {!audits.length && !error && <p className="p-5 text-sm text-zinc-500">No protected actions recorded for this session yet.</p>}
          {audits.map((audit, index) => (
            <div key={audit.id} className={`p-5 ${index !== audits.length - 1 ? "border-b border-zinc-800" : ""}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium text-white">{audit.agent}</p>
                  <p className="mt-1 text-sm text-zinc-400">{audit.details}</p>
                </div>
                <span className="text-xs text-zinc-500">{formatDateTime(audit.createdAt)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-400">{audit.action}</span>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-emerald-200">
                  {audit.terminal3?.authenticated ? "T3N signed" : "demo envelope"}
                </span>
                {audit.terminal3?.digest && <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-zinc-500">{audit.terminal3.digest.slice(0, 18)}...</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Terminal3Status />
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="text-sm font-semibold">Agent Auth SDK coverage</h2>
            <div className="mt-4 flex flex-col gap-3">
              {(manifest?.agents || []).map((agent: any) => (
                <div key={agent.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                  <p className="text-sm font-medium text-white">{agent.name}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{agent.purpose}</p>
                  <p className="mt-2 text-[11px] text-emerald-200">{agent.terminal3Use?.join(" · ")}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
