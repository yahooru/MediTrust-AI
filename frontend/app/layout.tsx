import type React from "react"
import type { Metadata, Viewport } from "next"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL("https://meditrust-ai.vercel.app"),
  title: "MediTrust AI - Terminal3 Protected Medical Vault",
  description:
    "A privacy-first medical assistant for AI report explanations, selective sharing, Terminal3 Agent Auth, and auditability.",
  applicationName: "MediTrust AI",
  creator: "MediTrust AI",
  publisher: "MediTrust AI",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-dark-32x32.png", sizes: "32x32", media: "(prefers-color-scheme: dark)" },
      { url: "/icon-light-32x32.png", sizes: "32x32", media: "(prefers-color-scheme: light)" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "MediTrust AI - Terminal3 Protected Medical Vault",
    description:
      "Upload reports, get privacy-safe AI explanations, generate access-code protected share links, and inspect Terminal3-backed audit trails.",
    url: "https://meditrust-ai.vercel.app",
    siteName: "MediTrust AI",
    images: [
      {
        url: "/meditrust-vault-hero.png",
        width: 1200,
        height: 800,
        alt: "MediTrust AI secure medical vault",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MediTrust AI",
    description: "Privacy-first medical report assistant with Terminal3 Agent Auth.",
    images: ["/meditrust-vault-hero.png"],
  },
  manifest: "/manifest.webmanifest",
}

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased">
        <div className="noise-overlay" aria-hidden="true" />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
