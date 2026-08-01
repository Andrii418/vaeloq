// app/api/process-document/route.ts
export const maxDuration = 60; // sekundy — maksymalny czas wykonania tego endpointu
import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, chunkText } from "@/lib/document-processor";
import { generateEmbedding } from "@/lib/embeddings";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Nie przesłano żadnego pliku." },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Obsługiwane są tylko pliki PDF." },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Krok 1: wyciągamy tekst z PDF-a
    const fullText = await extractTextFromPDF(buffer);

    // Krok 2: dzielimy tekst na fragmenty, respektując granice zdań
    // (1000 znaków docelowo na fragment, 2 zdania zachodzenia na kolejny)
    const chunks = chunkText(fullText, 1000, 2);

    // Krok 3: generujemy embeddingi dla wszystkich fragmentów RÓWNOLEGLE
    // (Promise.all zamiast pętli for...of) — kluczowe dla wdrożenia na
    // Vercel, gdzie darmowy plan ma limit 10 sekund na jedno żądanie.
    // Przy dłuższych dokumentach sekwencyjne przetwarzanie (jeden po
    // drugim) łatwo przekroczyłoby ten limit.
    const embeddings = await Promise.all(
      chunks.map((chunk) => generateEmbedding(chunk.content, "RETRIEVAL_DOCUMENT"))
    );

    // Zapis do bazy też robimy jedną, zbiorczą operacją zamiast N osobnych
    // zapytań — szybciej i bardziej niezawodnie
    const rowsToInsert = chunks.map((chunk, i) => ({
      document_name: file.name,
      content: chunk.content,
      chunk_index: chunk.index,
      embedding: embeddings[i],
    }));

    const { data: savedChunks, error } = await supabaseAdmin
      .from("document_chunks")
      .insert(rowsToInsert)
      .select();

    if (error) {
      console.error("Błąd zapisu do Supabase:", error);
      throw new Error("Nie udało się zapisać fragmentów dokumentu.");
    }

    return NextResponse.json({
      fileName: file.name,
      totalCharacters: fullText.length,
      chunksCount: savedChunks.length,
      chunks: savedChunks,
    });
  } catch (error) {
    console.error("Błąd przetwarzania dokumentu:", error);
    return NextResponse.json(
      { error: "Nie udało się przetworzyć dokumentu." },
      { status: 500 }
    );
  }
}