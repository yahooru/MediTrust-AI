"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"

const plans = [
  {
    name: "Identity",
    description: "Terminal3 agent session and DID-backed action envelopes",
    price: { monthly: 4, yearly: 4 },
    features: ["T3N testnet auth", "Wallet-derived DID", "SDK redaction helpers", "Usage status"],
    cta: "Open Login",
    highlighted: false,
  },
  {
    name: "Protected Actions",
    description: "Every agent workflow gets a signed, hashed audit envelope",
    price: { monthly: 5, yearly: 5 },
    features: [
      "Medical analysis events",
      "Privacy masking events",
      "Selective share events",
      "Revocation and view logs",
      "Terminal3 audit reads",
    ],
    cta: "View Audit",
    highlighted: true,
  },
  {
    name: "Delegation",
    description: "Doctor and insurer access can be narrowed by field and expiry",
    price: { monthly: 3, yearly: 3 },
    features: [
      "Allow/hide field sets",
      "Expiring links",
      "Revocable access",
      "T3N tenant map hooks",
      "Contract-ready config",
    ],
    cta: "Create Share",
    highlighted: false,
  },
]

function BorderBeam() {
  return (
    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
      <div
        className="absolute w-24 h-24 bg-white/20 blur-xl border-beam"
        style={{
          offsetPath: "rect(0 100% 100% 0 round 16px)",
        }}
      />
    </div>
  )
}

export function Pricing() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")

  return (
    <section id="sdk" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "var(--font-instrument-sans)" }}
          >
            SDK integration coverage
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto mb-8">
            The challenge score rewards complete use of Terminal3 Agent Auth, so MediTrust exposes identity, usage,
            audit reads, and tenant-map provisioning paths.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center p-1 rounded-full bg-zinc-900 border border-zinc-800">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                billingCycle === "monthly" ? "text-white" : "text-zinc-400"
              }`}
            >
              {billingCycle === "monthly" && (
                <motion.div
                  layoutId="billing-toggle"
                  className="absolute inset-0 bg-zinc-800 rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10">Runtime</span>
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`relative px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                billingCycle === "yearly" ? "text-white" : "text-zinc-400"
              }`}
            >
              {billingCycle === "yearly" && (
                <motion.div
                  layoutId="billing-toggle"
                  className="absolute inset-0 bg-zinc-800 rounded-full"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10">TEE-ready</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
              className={`relative p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
                plan.highlighted
                  ? "bg-zinc-900 border-zinc-700"
                  : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-600"
              }`}
            >
              {plan.highlighted && <BorderBeam />}

              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-white text-zinc-950 text-xs font-medium rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <p className="text-zinc-400 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{plan.price[billingCycle]}/5</span>
                  <span className="text-zinc-400 text-sm">score focus</span>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Hackathon SDK usage depth</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" strokeWidth={1.5} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full rounded-full ${
                  plan.highlighted
                    ? "shimmer-btn bg-white text-zinc-950 hover:bg-zinc-200"
                    : "bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700"
                }`}
                asChild
              >
                <a href={plan.name === "Identity" ? "/login" : plan.name === "Delegation" ? "/share" : "/audit"}>
                  {plan.cta}
                </a>
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
