// app/api/chat/route.ts

import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { retrieveRelevantChunks } from "@/lib/embeddings";

const ai = new GoogleGenAI({});

export async function POST(request: NextRequest) {
  const { question } = await request.json();

  if (!question || typeof question !== "string") {
    return new Response(JSON.stringify({ error: "Nie podano pytania." }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();

  // Tworzymy strumień (ReadableStream) — zamiast jednej dużej odpowiedzi
  // JSON, wysyłamy do przeglądarki wiele małych "linijek" danych,
  // jedna po drugiej, w miarę jak są gotowe.
  const stream = new ReadableStream({
    async start(controller) {
      // Pomocnicza funkcja: wysyła jeden obiekt jako linijkę JSON
      function send(payload: object) {
        controller.enqueue(encoder.encode(JSON.stringify(payload) + "\n"));
      }

      try {
        // KROK 1 — RETRIEVAL
        const relevantChunks = await retrieveRelevantChunks(question, 5);

        if (relevantChunks.length === 0) {
          send({ type: "sources", sources: [] });
          send({
            type: "chunk",
            text: "Nie znalazłem żadnych dokumentów w bazie. Wgraj najpierw plik PDF.",
          });
          send({ type: "done" });
          controller.close();
          return;
        }

        // Wysyłamy źródła OD RAZU, zanim model zacznie generować tekst —
        // dzięki temu interfejs może pokazać "z czego korzystam" natychmiast
        const sources = relevantChunks.map((chunk, i) => ({
          label: `Fragment ${i + 1}`,
          documentName: chunk.document_name,
          content: chunk.content,
          similarity: chunk.similarity,
        }));
        send({ type: "sources", sources });

        // KROK 2 — AUGMENTATION
        const context = relevantChunks
          .map(
            (chunk, i) =>
              `[Fragment ${i + 1}, dokument: "${chunk.document_name}"]\n${chunk.content}`
          )
          .join("\n\n");

        const prompt = `Jesteś asystentem odpowiadającym na pytania wyłącznie na podstawie poniższych fragmentów dokumentu.

ZASADY:
- Odpowiadaj TYLKO na podstawie podanego kontekstu poniżej.
- Jeśli odpowiedzi nie ma w kontekście, powiedz to wprost — nie zmyślaj.
- Na końcu odpowiedzi wskaż, z którego fragmentu (numeru) pochodzi informacja, np. "(Źródło: Fragment 2)".
- Odpowiadaj w tym samym języku, w którym zadano pytanie.

KONTEKST Z DOKUMENTU:
${context}

PYTANIE UŻYTKOWNIKA:
${question}`;

        // KROK 3 — GENERATION, w trybie strumieniowym
        const responseStream = await ai.models.generateContentStream({
          model: "gemini-3.5-flash",
          contents: prompt,
        });

        for await (const chunk of responseStream) {
          if (chunk.text) {
            send({ type: "chunk", text: chunk.text });
          }
        }

        send({ type: "done" });
      } catch (error) {
        console.error("Błąd streamingu odpowiedzi:", error);
        send({ type: "error", message: "Wystąpił błąd podczas generowania odpowiedzi." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}