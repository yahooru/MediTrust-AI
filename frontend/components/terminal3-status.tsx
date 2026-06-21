"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Activity, Fingerprint, KeyRound, Network, ShieldCheck, TriangleAlert } from "lucide-react"
import { getTerminal3Status } from "@/lib/api"

export function Terminal3Status() {
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    getTerminal3Status()
      .then(setStatus)
      .catch((error) => setStatus({ authenticated: false, error: error.message }))
  }, [])

  const ok = Boolean(status?.authenticated)
  const balance = status?.usage?.balance?.available ?? status?.usage?.balance?.total ?? null
  const teeVerified = Boolean(status?.teeAttestation?.verified)
  const auditAvailable = Boolean(status?.terminalAudit && !status?.terminalAudit?.error)

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {ok ? <ShieldCheck className="h-4 w-4 text-emerald-400" /> : <TriangleAlert className="h-4 w-4 text-amber-300" />}
            <p className="text-sm font-medium text-white">{ok ? "Terminal3 authenticated" : "Terminal3 demo fallback"}</p>
          </div>
          <p className="mt-2 line-clamp-2 text-xs text-zinc-500">
            {status?.did || status?.reason || status?.error || "Checking Terminal3 Agent Auth session..."}
          </p>
        </div>
        <span className={`mt-1 h-2 w-2 rounded-full ${ok ? "bg-emerald-400 pulse-glow" : "bg-amber-300"}`} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          <Network className="h-3.5 w-3.5" />
          {status?.environment || "testnet"}
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <KeyRound className="h-3.5 w-3.5" />
          {status?.walletAddress ? `${status.walletAddress.slice(0, 6)}...${status.walletAddress.slice(-4)}` : "wallet pending"}
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Activity className="h-3.5 w-3.5" />
          {balance ? `${balance} credits` : "usage pending"}
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <Fingerprint className="h-3.5 w-3.5" />
          {teeVerified ? "TEE verified" : auditAvailable ? "audit readable" : "TEE pending"}
        </div>
      </div>
    </motion.div>
  )
}
