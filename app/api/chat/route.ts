// app/api/chat/route.ts

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { retrieveRelevantChunks } from "@/lib/embeddings";

const ai = new GoogleGenAI({});

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Nie podano pytania." },
        { status: 400 }
      );
    }

    // KROK 1 — RETRIEVAL: znajdź fragmenty dokumentu najbardziej
    // pasujące znaczeniowo do pytania użytkownika
    const relevantChunks = await retrieveRelevantChunks(question, 5);

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        answer: "Nie znalazłem żadnych dokumentów w bazie. Wgraj najpierw plik PDF.",
        sources: [],
      });
    }

    // KROK 2 — AUGMENTATION: budujemy kontekst z znalezionych fragmentów,
    // każdy oznaczony numerem, żeby model mógł się do niego odwołać
    // (cytowanie źródła)
    const context = relevantChunks
      .map(
        (chunk, i) =>
          `[Fragment ${i + 1}, dokument: "${chunk.document_name}"]\n${chunk.content}`
      )
      .join("\n\n");

    // Prompt instruujący model: odpowiadaj TYLKO na podstawie kontekstu,
    // cytuj numer fragmentu, przyznaj się gdy nie wiesz
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

    // KROK 3 — GENERATION: pytamy model Gemini, dając mu kontekst
    const interaction = await ai.interactions.create({
      model: "gemini-3.5-flash",
      input: prompt,
    });

    return NextResponse.json({
      answer: interaction.output_text,
      sources: relevantChunks.map((chunk, i) => ({
        label: `Fragment ${i + 1}`,
        documentName: chunk.document_name,
        content: chunk.content,
        similarity: chunk.similarity,
      })),
    });
  } catch (error) {
    console.error("Błąd generowania odpowiedzi:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować odpowiedzi." },
      { status: 500 }
    );
  }
}