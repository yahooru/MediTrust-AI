"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, ExternalLink, Link2, ShieldOff, XCircle } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/page-heading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createShare, getReports, getSettings, getShares, revokeShare, type Report, type ShareRecord } from "@/lib/api"
import { formatDateTime } from "@/lib/format"

const fallbackFields = ["HbA1c", "Blood pressure", "Fasting glucose", "Cholesterol"]
const strictHidden = ["aadhaar", "address", "phone", "email", "sensitive-medical"]
const balancedHidden = ["aadhaar", "address", "sensitive-medical"]

export default function SharePage() {
  const [reports, setReports] = useState<Report[]>([])
  const [reportId, setReportId] = useState("")
  const [recipientName, setRecipientName] = useState("Dr Sharma")
  const [recipientRole, setRecipientRole] = useState("Doctor")
  const [allow, setAllow] = useState(["Blood pressure", "HbA1c"])
  const [hide, setHide] = useState(strictHidden)
  const [expiryHours, setExpiryHours] = useState(24)
  const [share, setShare] = useState<ShareRecord | null>(null)
  const [shares, setShares] = useState<ShareRecord[]>([])
  const [error, setError] = useState("")

  useEffect(() => {
    getReports()
      .then((data) => {
        if (data.reports.length) {
          setReports(data.reports)
          setReportId(data.reports[0].id)
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load reports"))
    getShares().then((data) => setShares(data.shares)).catch(() => {})
    getSettings()
      .then((data) => {
        setExpiryHours(Number(data.settings.defaultExpiryHours || 24))
        setHide(data.settings.privacyMode === "balanced" ? balancedHidden : strictHidden)
      })
      .catch(() => {})
  }, [])

  const selectedReport = reports.find((report) => report.id === reportId)
  const fields = selectedReport?.analysis?.vitals?.length
    ? selectedReport.analysis.vitals.map((vital) => vital.name)
    : fallbackFields
  const shareUrl = useMemo(
    () => (share?.shareUrlPath && typeof window !== "undefined" ? `${window.location.origin}${share.shareUrlPath}` : ""),
    [share],
  )

  function toggle(list: string[], value: string, setter: (value: string[]) => void) {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
  }

  async function submit() {
    setError("")
    if (!reportId) return setError("Create or upload a report before generating a share link.")
    try {
      const result = await createShare({ reportId, recipientName, recipientRole, allow, hide, expiryHours })
      setShare(result.share)
      setShares((prev) => [result.share, ...prev.filter((item) => item.id !== result.share.id)])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share creation failed")
    }
  }

  async function revoke(shareId: string) {
    const result = await revokeShare(shareId)
    setShares((prev) => prev.map((item) => (item.id === shareId ? result.share : item)))
    if (share?.id === shareId) setShare(result.share)
  }

  return (
    <AppShell>
      <PageHeading title="Selective Sharing" description="Create expiring links that reveal only the report fields a recipient actually needs." />
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="space-y-4">
            <select value={reportId} onChange={(event) => setReportId(event.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white">
              {reports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.name}
                </option>
              ))}
            </select>
            <Input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} className="border-zinc-800 bg-zinc-950 text-white" />
            <Input value={recipientRole} onChange={(event) => setRecipientRole(event.target.value)} className="border-zinc-800 bg-zinc-950 text-white" />
            <Input type="number" min={1} value={expiryHours} onChange={(event) => setExpiryHours(Number(event.target.value))} className="border-zinc-800 bg-zinc-950 text-white" />
            <div className="flex flex-wrap gap-2">
              {[24, 72, 168].map((hours) => (
                <button key={hours} onClick={() => setExpiryHours(hours)} className={`rounded-full border px-3 py-1.5 text-xs ${expiryHours === hours ? "border-zinc-500 bg-zinc-800 text-white" : "border-zinc-800 text-zinc-500"}`}>
                  {hours === 24 ? "24 hours" : hours === 72 ? "3 days" : "7 days"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold">Allow fields</h2>
            <div className="flex flex-wrap gap-2">
              {fields.map((field) => (
                <button key={field} onClick={() => toggle(allow, field, setAllow)} className={`rounded-full border px-3 py-1.5 text-xs ${allow.includes(field) ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200" : "border-zinc-800 text-zinc-500"}`}>
                  {field}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold">Always hide</h2>
            <div className="flex flex-wrap gap-2">
              {strictHidden.map((field) => (
                <button key={field} onClick={() => toggle(hide, field, setHide)} className={`rounded-full border px-3 py-1.5 text-xs ${hide.includes(field) ? "border-amber-400/40 bg-amber-400/10 text-amber-100" : "border-zinc-800 text-zinc-500"}`}>
                  {field}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-amber-300">{error}</p>}
          <Button onClick={submit} className="shimmer-btn mt-6 rounded-full bg-white px-6 text-zinc-950 hover:bg-zinc-200">
            <Link2 className="h-4 w-4" />
            Generate secure link
          </Button>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="mb-4 flex items-center gap-2 text-amber-200">
            <ShieldOff className="h-4 w-4" />
            <span className="text-sm font-medium">Privacy preview</span>
          </div>
          {share ? (
            <div>
              <p className="text-sm text-zinc-400">{share.snapshot.summary}</p>
              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">{shareUrl}</div>
              {share.accessCode && (
                <div className="mt-3 rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3 text-sm text-emerald-100">
                  Recipient access code: <span className="font-semibold tracking-widest">{share.accessCode}</span>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <Button onClick={() => navigator.clipboard?.writeText(`${shareUrl}${share.accessCode ? `\nAccess code: ${share.accessCode}` : ""}`)} className="rounded-full bg-zinc-800 text-white hover:bg-zinc-700">
                  <Copy className="h-4 w-4" />
                  Copy link
                </Button>
                {share.token && (
                  <Button variant="outline" className="rounded-full border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white" asChild>
                    <a href={`/share/${share.token}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </a>
                  </Button>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {share.snapshot.redactions.map((item, index) => (
                  <span key={`${item.key}-${index}`} className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs text-amber-100">
                    redacted {item.label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm leading-6 text-zinc-400">
              Choose allowed values and hidden fields. The generated share will include a redacted snapshot, expiry, view count, and an audit event.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
        <h2 className="text-sm font-semibold">Existing share links</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {shares.map((item) => (
            <div key={item.id} className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{item.recipientName}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.recipientRole} · views {item.views || 0} · expires {formatDateTime(item.expiresAt)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs ${item.revoked ? "bg-zinc-800 text-zinc-500" : "bg-emerald-400/10 text-emerald-200"}`}>
                  {item.revoked ? "revoked" : "active"}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.token ? (
                  <Button size="sm" variant="outline" className="rounded-full border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-900 hover:text-white" asChild>
                    <a href={`/share/${item.token}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </a>
                  </Button>
                ) : (
                  <span className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-500">link hidden after creation</span>
                )}
                {!item.revoked && (
                  <Button size="sm" onClick={() => revoke(item.id)} className="rounded-full bg-zinc-800 text-white hover:bg-zinc-700">
                    <XCircle className="h-4 w-4" />
                    Revoke
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!shares.length && <p className="text-sm text-zinc-500">No generated share links yet.</p>}
        </div>
      </div>
    </AppShell>
  )
}
