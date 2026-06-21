"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { motion } from "framer-motion"
import { AlertTriangle, Eye, FileLock2, ShieldCheck, ShieldOff } from "lucide-react"
import { getPublicShare, type ShareRecord } from "@/lib/api"
import { formatDateTime } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function PublicSharePage() {
  const params = useParams<{ token: string }>()
  const [share, setShare] = useState<ShareRecord | null>(null)
  const [error, setError] = useState("")
  const [accessCode, setAccessCode] = useState("")
  const [codeRequired, setCodeRequired] = useState(false)
  const [loading, setLoading] = useState(false)

  async function loadShare(code?: string) {
    if (!params.token) return
    setLoading(true)
    setError("")
    try {
      const data = await getPublicShare(params.token, code)
      setShare(data.share)
      setCodeRequired(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Share link unavailable"
      setError(message)
      setCodeRequired(/code/i.test(message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadShare()
  }, [params.token])

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-10 text-white">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
        <a href="/" className="mb-8 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-950">
            <FileLock2 className="h-4 w-4" />
          </span>
          <span className="font-semibold">MediTrust AI</span>
        </a>

        {codeRequired && !share ? (
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-6">
            <div className="mb-5 flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm">Recipient verification</span>
            </div>
            <h1 className="text-2xl font-bold">Enter the access code</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              The patient generated a separate code for this selective-disclosure link.
            </p>
            <div className="mt-5 flex gap-3">
              <Input
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                className="border-zinc-800 bg-zinc-950 text-white"
                inputMode="numeric"
                placeholder="6-digit code"
              />
              <Button onClick={() => loadShare(accessCode)} disabled={loading || accessCode.length < 4} className="bg-white text-zinc-950 hover:bg-zinc-200">
                Open
              </Button>
            </div>
            {error && <p className="mt-4 text-sm text-amber-300">{error}</p>}
          </section>
        ) : error ? (
          <div className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-6 text-amber-100">{error}</div>
        ) : share ? (
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-6">
            <div className="mb-5 flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm">Selective disclosure for {share.recipientName}</span>
            </div>
            <h1 className="text-3xl font-bold">{share.snapshot.reportName}</h1>
            <p className="mt-4 leading-7 text-zinc-400">{share.snapshot.summary}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {share.snapshot.vitals.map((vital) => (
                <span key={vital.name} className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-300">
                  {vital.name}: {vital.value} {vital.unit}
                </span>
              ))}
            </div>
            {Boolean(share.snapshot.alerts.length) && (
              <div className="mt-6 rounded-lg border border-amber-400/20 bg-amber-400/10 p-4">
                <div className="mb-2 flex items-center gap-2 text-amber-100">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">Clinical review flags</span>
                </div>
                <ul className="flex flex-col gap-2 text-sm leading-6 text-amber-50/80">
                  {share.snapshot.alerts.map((alert) => (
                    <li key={alert}>{alert}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-400">
              {share.snapshot.redactedText.slice(0, 1800)}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {share.snapshot.redactions.map((item, index) => (
                <span key={`${item.key}-${index}`} className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">
                  <ShieldOff className="h-3 w-3" />
                  hidden {item.label}
                </span>
              ))}
              {share.snapshot.omittedVitals?.map((name) => (
                <span key={name} className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-500">
                  omitted {name}
                </span>
              ))}
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-zinc-500">
              <Eye className="h-3.5 w-3.5" />
              Expires {formatDateTime(share.expiresAt)} · views {share.views}
            </p>
          </section>
        ) : (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-6 text-zinc-400">Loading secure share...</div>
        )}
      </motion.div>
    </main>
  )
}
