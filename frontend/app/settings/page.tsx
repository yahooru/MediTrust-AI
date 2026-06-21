"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/page-heading"
import { Terminal3Status } from "@/components/terminal3-status"
import { Button } from "@/components/ui/button"
import { provisionTerminal3, getSettings, getTerminal3Attestation, updateSettings } from "@/lib/api"

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({ notifications: true, abnormalAlerts: true, defaultExpiryHours: 24, privacyMode: "strict" })
  const [provision, setProvision] = useState<any>(null)
  const [attestation, setAttestation] = useState<any>(null)
  const [settingsError, setSettingsError] = useState("")

  useEffect(() => {
    getSettings().then((data) => setSettings(data.settings)).catch(() => {})
  }, [])

  async function patch(next: any) {
    setSettings(next)
    setSettingsError("")
    try {
      const result = await updateSettings(next)
      setSettings(result.settings)
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Settings could not be saved.")
    }
  }

  async function runProvision() {
    const result = await provisionTerminal3()
    setProvision(result)
  }

  async function runAttestation() {
    const result = await getTerminal3Attestation(true)
    setAttestation(result)
  }

  return (
    <AppShell>
      <PageHeading title="Settings" description="Tune notifications, expiry defaults, privacy posture, and Terminal3 tenant readiness." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="space-y-5">
            {[
              { key: "notifications", label: "Notification preferences" },
              { key: "abnormalAlerts", label: "AI health alerts" },
            ].map((item) => (
              <label key={item.key} className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-5 text-sm">
                <span>{item.label}</span>
                <input type="checkbox" checked={Boolean(settings[item.key])} onChange={(event) => patch({ ...settings, [item.key]: event.target.checked })} className="h-4 w-4 accent-emerald-400" />
              </label>
            ))}
            <label className="block text-sm">
              Default share expiry
              <input
                type="number"
                min={1}
                value={settings.defaultExpiryHours}
                onChange={(event) => patch({ ...settings, defaultExpiryHours: Number(event.target.value) })}
                className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              Privacy mode
              <select value={settings.privacyMode} onChange={(event) => patch({ ...settings, privacyMode: event.target.value })} className="mt-2 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-white">
                <option value="strict">Strict masking</option>
                <option value="balanced">Balanced masking</option>
              </select>
            </label>
            {settingsError && <p className="text-sm text-amber-300">{settingsError}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <Terminal3Status />
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="text-sm font-semibold">Terminal3 tenant resources</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Provisioning checks auth and creates contract-locked maps when a Terminal3 tenant contract id is configured.
            </p>
            <Button onClick={runProvision} className="mt-4 rounded-full bg-white text-zinc-950 hover:bg-zinc-200">
              Provision / verify
            </Button>
            {provision && <pre className="mt-4 max-h-52 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400">{JSON.stringify(provision, null, 2)}</pre>}
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <h2 className="text-sm font-semibold">TEE attestation</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Fetches the node ML-KEM key digest and DKG quote verification status when the Terminal3 node exposes them.
            </p>
            <Button onClick={runAttestation} className="mt-4 rounded-full bg-zinc-800 text-white hover:bg-zinc-700">
              Check attestation
            </Button>
            {attestation && <pre className="mt-4 max-h-52 overflow-auto rounded-lg bg-zinc-950 p-3 text-xs text-zinc-400">{JSON.stringify(attestation, null, 2)}</pre>}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
