// components/document-panel.tsx
"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, Loader2, CheckCircle2 } from "lucide-react";

interface DocumentPanelProps {
  onProcessed: (fileName: string, chunksCount: number) => void;
}

export function DocumentPanel({ onProcessed }: DocumentPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [chunksCount, setChunksCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Tworzymy lokalny URL do podglądu PDF w przeglądarce (bez wysyłania
    // pliku nigdzie) — to natywna funkcja przeglądarki
    setFileUrl(URL.createObjectURL(file));
    setFileName(file.name);
    setIsLoading(true);
    setError(null);
    setChunksCount(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/process-document", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Wystąpił błąd");

      setChunksCount(data.chunksCount);
      onProcessed(data.fileName, data.chunksCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {!fileUrl ? (
        // Stan pusty — zachęta do wgrania pliku
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-2xl p-12 text-center max-w-sm"
          >
            <UploadCloud className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
            <p className="text-zinc-300 mb-1 font-medium">Wgraj dokument</p>
            <p className="text-zinc-500 text-sm mb-6">
              PDF zostanie przeanalizowany i gotowy do rozmowy
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 transition-colors text-white text-sm font-medium"
            >
              Wybierz plik PDF
            </button>
          </motion.div>
        </div>
      ) : (
        // Stan z plikiem — pasek statusu na górze + podgląd PDF poniżej
        <>
          <div className="glass-panel m-4 mb-0 rounded-xl p-3 flex items-center gap-3">
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
            <span className="text-sm text-zinc-300 truncate flex-1">
              {fileName}
            </span>
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                </motion.div>
              ) : (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1.5 text-xs text-emerald-400"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {chunksCount} fragmentów
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center mt-2 px-4">{error}</p>
          )}

          {/* Podgląd PDF — natywna przeglądarka PDF wbudowana w przeglądarkę */}
          <div className="flex-1 m-4 rounded-xl overflow-hidden glass-panel">
            <iframe src={fileUrl} className="w-full h-full" title="Podgląd PDF" />
          </div>
        </>
      )}
    </div>
  );
}