// app/api/process-document/route.ts

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

    // Krok 3: dla KAŻDEGO fragmentu generujemy embedding i zapisujemy do bazy
    const savedChunks = [];

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk.content, "RETRIEVAL_DOCUMENT");

      const { data, error } = await supabaseAdmin
        .from("document_chunks")
        .insert({
          document_name: file.name,
          content: chunk.content,
          chunk_index: chunk.index,
          embedding: embedding,
        })
        .select()
        .single();

      if (error) {
        console.error("Błąd zapisu do Supabase:", error);
        throw new Error(`Nie udało się zapisać fragmentu #${chunk.index}`);
      }

      savedChunks.push(data);
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