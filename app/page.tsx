// app/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, FileText, MessageCircle } from "lucide-react";
import { DocumentPanel } from "@/components/document-panel";
import { ChatPanel } from "@/components/chat-panel";

export default function Home() {
  const [documentReady, setDocumentReady] = useState(false);
  // Kontroluje, która zakładka jest widoczna NA TELEFONIE.
  // Na desktopie ta zmienna jest ignorowana — tam widać oba panele naraz.
  const [mobileTab, setMobileTab] = useState<"document" | "chat">("document");

  return (
    <main className="h-dvh obsidian-glow flex flex-col overflow-hidden">
      {/* Górny pasek nagłówka */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 px-4 md:px-6 py-4 shrink-0"
      >
        <Sparkles className="w-5 h-5 text-indigo-400 shrink-0" />
        <span className="text-white font-semibold tracking-tight">Vaeloq</span>
        <span className="text-zinc-600 text-sm ml-2 hidden sm:inline">
          Twój dokument, oczami AI
        </span>
      </motion.header>

      {/* Przełącznik zakładek — widoczny TYLKO na telefonie (poniżej md) */}
      <div className="md:hidden flex gap-1 px-4 pb-3 shrink-0">
        <button
          onClick={() => setMobileTab("document")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            mobileTab === "document"
              ? "bg-indigo-500 text-white"
              : "glass-panel text-zinc-400"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Dokument
        </button>
        <button
          onClick={() => setMobileTab("chat")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
            mobileTab === "chat"
              ? "bg-indigo-500 text-white"
              : "glass-panel text-zinc-400"
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Czat
        </button>
      </div>

      {/* Dzielony ekran:
          - na telefonie (poniżej md): jedna kolumna, widoczny tylko wybrany panel
          - od md w górę: dwie kolumny obok siebie, oba widoczne naraz */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-0 min-h-0">
        <div
          className={`border-white/5 min-h-0 md:border-r ${
            mobileTab === "document" ? "block" : "hidden"
          } md:block`}
        >
          <DocumentPanel
            onProcessed={() => {
              setDocumentReady(true);
              // Po przetworzeniu dokumentu na telefonie automatycznie
              // przełączamy usera na zakładkę czatu — naturalny następny krok
              setMobileTab("chat");
            }}
          />
        </div>
        <div className={`min-h-0 ${mobileTab === "chat" ? "block" : "hidden"} md:block`}>
          <ChatPanel documentReady={documentReady} />
        </div>
      </div>
    </main>
  );
}