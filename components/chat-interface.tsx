// components/chat-interface.tsx
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from "lucide-react";

interface Source {
  label: string;
  documentName: string;
  content: string;
  similarity: number;
}

export function ChatInterface() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAsk() {
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Wystąpił błąd");
      }

      setAnswer(data.answer);
      setSources(data.sources);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex gap-2">
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          placeholder="Zadaj pytanie o wgrany dokument..."
          className="bg-zinc-900 border-zinc-700 text-white"
        />
        <Button onClick={handleAsk} disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {answer && (
        <Card className="p-4 bg-zinc-900/70 border-zinc-800">
          <p className="text-sm text-zinc-200 whitespace-pre-wrap">{answer}</p>
        </Card>
      )}

      {sources.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">
            Źródła użyte do odpowiedzi
          </p>
          {sources.map((source) => (
            <Card
              key={source.label}
              className="p-3 bg-zinc-900/40 border-zinc-800"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-zinc-400">
                  {source.label} — {source.documentName}
                </span>
                <span className="text-xs text-zinc-600">
                  {Math.round(source.similarity * 100)}% trafności
                </span>
              </div>
              <p className="text-xs text-zinc-500 line-clamp-2">
                {source.content}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}