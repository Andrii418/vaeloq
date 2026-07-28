// components/document-upload.tsx
"use client";

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileText, Loader2 } from "lucide-react";

interface DocumentChunk {
  id: string;
  content: string;
  index: number;
}

export function DocumentUpload() {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setChunks([]);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/process-document", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Wystąpił błąd");
      }

      setFileName(data.fileName);
      setChunks(data.chunks);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieznany błąd");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Card className="border-dashed border-2 border-zinc-700 bg-zinc-900/50 p-10 flex flex-col items-center justify-center text-center">
        <UploadCloud className="w-10 h-10 text-zinc-400 mb-4" />
        <p className="text-zinc-300 mb-4">
          Wgraj plik PDF, aby zobaczyć jak dzielimy go na fragmenty
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="hidden"
        />
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Przetwarzanie...
            </>
          ) : (
            "Wybierz plik PDF"
          )}
        </Button>
      </Card>

      {error && (
        <p className="text-red-400 text-sm text-center">{error}</p>
      )}

      {chunks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-zinc-300">
            <FileText className="w-4 h-4" />
            <span className="font-medium">{fileName}</span>
            <span className="text-zinc-500 text-sm">
              — podzielono na {chunks.length} fragmentów
            </span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {chunks.map((chunk) => (
              <Card
                key={chunk.id}
                className="p-4 bg-zinc-900/70 border-zinc-800"
              >
                <p className="text-xs text-zinc-500 mb-1">
                  Fragment #{chunk.index + 1}
                </p>
                <p className="text-sm text-zinc-300 line-clamp-3">
                  {chunk.content}
                </p>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}