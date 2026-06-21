"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, FileLock2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { loginWithTerminal3 } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const [name, setName] = useState("Rahul Mehta")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function login() {
    setLoading(true)
    setError("")
    try {
      const session = await loginWithTerminal3(name)
      localStorage.setItem("meditrust-session", JSON.stringify(session))
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start session")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-950 px-4 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_20%,rgba(16,185,129,0.16),transparent_32%),linear-gradient(to_bottom,#09090b,#18181b)]" />
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center"
      >
        <div className="grid w-full gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex flex-col justify-center">
            <a href="/" className="mb-10 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-zinc-950">
                <FileLock2 className="h-5 w-5" />
              </span>
              <span className="font-semibold">MediTrust AI</span>
            </a>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Start a trusted agent session.</h1>
            <p className="mt-5 max-w-xl text-zinc-400">
              Terminal3 Agent Auth creates the trusted identity used by the Medical, Privacy, Sharing, and Audit agents.
            </p>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold">Terminal3 Agent Auth</h2>
                <p className="text-sm text-zinc-500">DID-backed workflow identity</p>
              </div>
            </div>
            <label className="text-sm text-zinc-400" htmlFor="name">
              Patient display name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 border-zinc-800 bg-zinc-950 text-white"
            />
            {error && <p className="mt-4 text-sm text-amber-300">{error}</p>}
            <Button
              onClick={login}
              disabled={loading}
              className="shimmer-btn mt-6 h-12 w-full rounded-full bg-white text-zinc-950 hover:bg-zinc-200"
            >
              {loading ? "Authenticating..." : "Continue with Terminal3"}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <div className="mt-6 grid gap-3 text-sm text-zinc-400">
              {["No password stored by MediTrust", "Agent actions get hashed audit envelopes", "Selective sharing stays patient controlled"].map(
                (item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </motion.section>
    </main>
  )
}
