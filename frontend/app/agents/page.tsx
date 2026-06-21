"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Activity, Fingerprint, ShieldCheck } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/page-heading"
import { Terminal3Status } from "@/components/terminal3-status"
import { getTerminal3Agents } from "@/lib/api"

export default function AgentsPage() {
  const [manifest, setManifest] = useState<any>(null)

  useEffect(() => {
    getTerminal3Agents().then(setManifest).catch(() => {})
  }, [])

  return (
    <AppShell>
      <PageHeading
        title="Agent Mesh"
        description="Separate Medical, Privacy, Sharing, Identity, and Audit agents with Terminal3-scoped action envelopes."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 md:grid-cols-2">
          {(manifest?.agents || []).map((agent: any, index: number) => (
            <motion.article
              key={agent.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-emerald-200">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-semibold text-white">{agent.name}</h2>
                    <p className="mt-1 text-xs text-zinc-500">{agent.didRole}</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-100">
                  T3N scoped
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">{agent.purpose}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {agent.scope?.map((scope: string) => (
                  <span key={scope} className="rounded-full border border-zinc-800 px-2.5 py-1 text-xs text-zinc-500">
                    {scope}
                  </span>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-medium text-zinc-300">
                  <Activity className="h-3.5 w-3.5" />
                  SDK surfaces
                </div>
                <p className="text-xs leading-5 text-emerald-100">{agent.terminal3Use?.join(" · ")}</p>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <Terminal3Status />
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Fingerprint className="h-4 w-4 text-emerald-300" />
              Protected action flow
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {(manifest?.protectedActionFlow || []).map((step: string, index: number) => (
                <div key={step} className="flex gap-3 text-sm leading-6 text-zinc-400">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] text-zinc-500">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
