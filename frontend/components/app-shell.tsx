"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  Activity,
  Bot,
  FileLock2,
  Home,
  LogOut,
  Settings,
  Share2,
  ShieldCheck,
  Upload,
  Vault,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { clearStoredSession, getStoredSession } from "@/lib/api"

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/agents", label: "Agents", icon: ShieldCheck },
  { href: "/upload", label: "Upload", icon: Upload },
  { href: "/vault", label: "Vault", icon: Vault },
  { href: "/chat", label: "AI Chat", icon: Bot },
  { href: "/share", label: "Share", icon: Share2 },
  { href: "/audit", label: "Audit", icon: Activity },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!getStoredSession()) {
      router.replace("/login")
      return
    }
    setReady(true)
  }, [pathname, router])

  function logout() {
    clearStoredSession()
    router.replace("/login")
  }

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-zinc-950 text-sm text-zinc-400">
        Checking trusted session...
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(255,255,255,0.08),transparent_24%)]" />
      <div className="relative flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-zinc-800/80 bg-zinc-950/80 px-4 py-5 backdrop-blur-xl lg:block">
          <Link href="/" className="mb-8 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-zinc-950">
              <FileLock2 className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold leading-none">MediTrust AI</p>
              <p className="mt-1 text-xs text-zinc-500">Terminal3 protected</p>
            </div>
          </Link>

          <nav className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition-colors hover:text-white",
                    active && "text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="app-nav-active"
                      className="absolute inset-0 rounded-lg bg-zinc-900"
                      transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    />
                  )}
                  <item.icon className="relative h-4 w-4" strokeWidth={1.7} />
                  <span className="relative">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="mt-8 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-sm font-medium">Agent Auth Live</span>
            </div>
            <p className="text-xs leading-5 text-zinc-400">
              Medical, Privacy, Sharing, and Audit agents sign protected actions through Terminal3 envelopes.
            </p>
          </div>
        </aside>

        <section className="min-w-0 flex-1 overflow-x-hidden">
          <header className="sticky top-0 z-30 border-b border-zinc-800/70 bg-zinc-950/70 px-4 py-3 backdrop-blur-xl lg:hidden">
            <div className="flex items-center justify-between">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-zinc-950">
                  <FileLock2 className="h-4 w-4" />
                </div>
                <span className="font-semibold">MediTrust AI</span>
              </Link>
              <button type="button" onClick={logout} className="text-zinc-500" aria-label="Log out">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400",
                    pathname === item.href && "border-zinc-600 bg-zinc-900 text-white",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              ))}
            </div>
          </header>

          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        </section>
      </div>
    </main>
  )
}
