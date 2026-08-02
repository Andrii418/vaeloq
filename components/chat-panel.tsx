// components/chat-panel.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, FileSearch } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Source {
  label: string;
  documentName: string;
  content: string;
  similarity: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

interface ChatPanelProps {
  documentReady: boolean;
}

export function ChatPanel({ documentReady }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Automatyczne przewijanie do najnowszej wiadomości
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const question = input;
    setInput("");
    setIsLoading(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      if (!response.body) throw new Error("Brak strumienia odpowiedzi.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // Czytamy strumień kawałek po kawałku i doklejamy tekst na żywo
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // ostatnia (niepełna) linijka zostaje w buforze

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line);

          if (event.type === "sources") {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, sources: event.sources } : m))
            );
          } else if (event.type === "chunk") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.text } : m
              )
            );
          } else if (event.type === "done") {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, isStreaming: false } : m))
            );
          } else if (event.type === "error") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: `⚠️ ${event.message}`, isStreaming: false }
                  : m
              )
            );
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Wystąpił błąd podczas generowania odpowiedzi.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Lista wiadomości */}
      <div className="flex-1 overflow-y-auto thin-scrollbar px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <FileSearch className="w-8 h-8 text-zinc-600 mb-3" />
            <p className="text-zinc-500 text-sm">
              {documentReady
                ? "Zadaj pytanie o wgrany dokument"
                : "Wgraj dokument po lewej, aby zacząć rozmowę"}
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.role === "assistant" && (
                <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              )}

              <div className={`max-w-[88%] sm:max-w-[80%] ${message.role === "user" ? "order-1" : ""}`}>
                <div
                  className={
                    message.role === "user"
                      ? "bg-indigo-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm"
                      : "glass-panel rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm text-zinc-200 prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-strong:text-indigo-300"
                  }
                >
                  {message.role === "assistant" ? (
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  ) : (
                    message.content
                  )}
                  {message.isStreaming && (
                    <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-0.5 animate-pulse align-middle" />
                  )}
                </div>

                {/* Źródła cytowań — pojawiają się pod odpowiedzią asystenta */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {message.sources.map((source) => (
                      <div
                        key={source.label}
                        title={source.content}
                        className="glow-border rounded-full px-2.5 py-1 text-[11px] text-indigo-300 cursor-default"
                      >
                        {source.label} · {Math.round(source.similarity * 100)}%
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={scrollRef} />
      </div>

      {/* Pole wpisywania pytania */}
      <div className="p-4 glass-panel m-4 mt-0 rounded-xl flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          disabled={!documentReady}
          placeholder={
            documentReady ? "Zadaj pytanie o dokument..." : "Najpierw wgraj dokument..."
          }
          className="flex-1 bg-transparent outline-none text-sm text-zinc-200 placeholder:text-zinc-600 disabled:cursor-not-allowed"
        />
        <button
          onClick={handleSend}
          disabled={!documentReady || isLoading || !input.trim()}
          className="w-8 h-8 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:bg-zinc-800 disabled:text-zinc-600 transition-colors flex items-center justify-center shrink-0"
        >
          <Send className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}