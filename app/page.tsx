// app/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { DocumentPanel } from "@/components/document-panel";
import { ChatPanel } from "@/components/chat-panel";

export default function Home() {
  const [documentReady, setDocumentReady] = useState(false);

  return (
    <main className="h-screen obsidian-glow flex flex-col overflow-hidden">
      {/* Górny pasek nagłówka */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-6 py-4 shrink-0"
      >
        <Sparkles className="w-5 h-5 text-indigo-400" />
        <span className="text-white font-semibold tracking-tight">Vaeloq</span>
        <span className="text-zinc-600 text-sm ml-2">Twój dokument, oczami AI</span>
      </motion.header>

      {/* Dzielony ekran — lewa: dokument, prawa: czat */}
      <div className="flex-1 grid grid-cols-2 gap-0 min-h-0">
        <div className="border-r border-white/5 min-h-0">
          <DocumentPanel
            onProcessed={() => setDocumentReady(true)}
          />
        </div>
        <div className="min-h-0">
          <ChatPanel documentReady={documentReady} />
        </div>
      </div>
    </main>
  );
}