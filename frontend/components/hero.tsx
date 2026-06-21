"use client"

import { motion, type Variants } from "framer-motion"
import { ArrowRight, Brain, FileCheck2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"

const textRevealVariants: Variants = {
  hidden: { y: "100%" },
  visible: (i: number) => ({
    y: 0,
    transition: {
      duration: 0.8,
      ease: "easeOut",
      delay: i * 0.1,
    },
  }),
}

export function Hero() {
  return (
    <section className="relative min-h-[92svh] flex flex-col items-center justify-center px-4 pt-24 pb-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 pointer-events-none" />
      <motion.img
        src="/meditrust-vault-hero.png"
        alt=""
        aria-hidden="true"
        initial={{ opacity: 0, scale: 1.04, y: 20 }}
        animate={{ opacity: 0.68, scale: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
        className="pointer-events-none absolute inset-x-0 bottom-[-8%] mx-auto w-[min(1120px,112vw)] max-w-none opacity-70 sm:bottom-[-16%] lg:left-auto lg:right-[-8%] lg:bottom-[-10%] lg:w-[980px]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#09090b_0%,rgba(9,9,11,0.88)_32%,rgba(9,9,11,0.28)_100%)] pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-zinc-800 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-glow" />
          <span className="text-sm text-zinc-400">Terminal3 Agent Auth secured</span>
        </motion.div>

        <h1
          className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6"
          style={{ fontFamily: "var(--font-cal-sans), sans-serif" }}
        >
          <span className="block overflow-hidden">
            <motion.span className="block" variants={textRevealVariants} initial="hidden" animate="visible" custom={0}>
              Explain records.
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span
              className="block text-zinc-500"
              variants={textRevealVariants}
              initial="hidden"
              animate="visible"
              custom={1}
            >
              Share less.
            </motion.span>
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          MediTrust AI turns medical reports into plain-language answers, masks sensitive fields, and creates expiring
          links where every agent action is tied to Terminal3 identity.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <Button
            size="lg"
            className="shimmer-btn bg-white text-zinc-950 hover:bg-zinc-200 rounded-full px-8 h-12 text-base font-medium shadow-lg shadow-white/10"
            asChild
          >
            <a href="/login">
              Start Secure Session
              <ArrowRight className="ml-2 w-4 h-4" />
            </a>
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="rounded-full px-8 h-12 text-base font-medium border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white hover:border-zinc-700 bg-transparent"
            asChild
          >
            <a href="/dashboard">View Demo Vault</a>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: FileCheck2, label: "OCR + AI summaries" },
              { icon: ShieldCheck, label: "Selective disclosure" },
              { icon: Brain, label: "Multi-agent audit trail" },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.8 + index * 0.1 }}
                className="flex items-center justify-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-400"
              >
                <item.icon className="h-4 w-4 text-emerald-300" />
                {item.label}
              </motion.div>
            ))}
          </div>
          <p className="text-sm text-zinc-500">
            Built for patients, doctors, labs, and insurers who need less data exposure.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
