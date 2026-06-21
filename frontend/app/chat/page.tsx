"use client"

import { Fragment, type ReactNode, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Bot, Send } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { PageHeading } from "@/components/page-heading"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { askQuestion, getReports, type Report } from "@/lib/api"

type Message = { role: "user" | "assistant"; content: string; source?: string; citations?: string[] }

function renderInlineMarkdown(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return <Fragment key={index}>{part}</Fragment>
  })
}

function MessageBody({ content }: { content: string }) {
  return (
    <div className="space-y-2">
      {content.split(/\n+/).filter(Boolean).map((line, index) => (
        <p key={`${index}-${line.slice(0, 12)}`} className="leading-6">
          {renderInlineMarkdown(line.replace(/^- /, ""))}
        </p>
      ))}
    </div>
  )
}

export default function ChatPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [reportId, setReportId] = useState("")
  const [question, setQuestion] = useState("Explain my blood report in simple language and tell me what I should share with my doctor.")
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Ask about uploaded reports. I will answer from your vault and keep the response privacy-aware." },
  ])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getReports().then((data) => setReports(data.reports)).catch(() => {})
  }, [])

  async function send() {
    if (!question.trim()) return
    const current = question.trim()
    setMessages((prev) => [...prev, { role: "user", content: current }])
    setQuestion("")
    setLoading(true)
    try {
      const result = await askQuestion(current, reportId || undefined)
      setMessages((prev) => [...prev, { role: "assistant", content: result.answer, source: result.source, citations: result.citations }])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: error instanceof Error ? error.message : "The AI agent could not answer right now." },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell>
      <PageHeading title="AI Medical Assistant" description="Ask report questions with responses grounded in your uploaded vault." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 ${
                  message.role === "user" ? "ml-auto bg-white text-zinc-950" : "bg-zinc-800 text-zinc-200"
                }`}
              >
                <MessageBody content={message.content} />
                {message.source && <p className="mt-2 text-[11px] opacity-60">source: {message.source}</p>}
                {Boolean(message.citations?.length) && (
                  <p className="mt-1 text-[11px] opacity-60">citations: {message.citations?.join(", ")}</p>
                )}
              </motion.div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Bot className="h-4 w-4 animate-pulse text-emerald-300" />
                Medical Agent is checking your vault...
              </div>
            )}
          </div>
          <div className="mt-5 flex gap-3">
            <Textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="min-h-24 border-zinc-800 bg-zinc-950 text-white" />
            <Button onClick={send} disabled={loading} className="h-auto rounded-lg bg-white text-zinc-950 hover:bg-zinc-200" aria-label="Send question">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <h2 className="mb-3 text-sm font-semibold">Use report context</h2>
          <select value={reportId} onChange={(event) => setReportId(event.target.value)} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-white">
            <option value="">All reports</option>
            {reports.map((report) => (
              <option key={report.id} value={report.id}>
                {report.name}
              </option>
            ))}
          </select>
          <div className="mt-5 space-y-3 text-sm text-zinc-400">
            {["Summarize this prescription.", "Is my sugar level high?", "What should I share with my cardiologist?"].map((prompt) => (
              <button key={prompt} onClick={() => setQuestion(prompt)} className="block w-full rounded-lg border border-zinc-800 p-3 text-left transition-colors hover:border-zinc-700 hover:text-white">
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
