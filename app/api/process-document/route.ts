// app/api/process-document/route.ts

import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPDF, chunkText } from "@/lib/document-processor";

// Ten endpoint obsługuje żądania POST wysyłane na adres /api/process-document
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

    // Krok 2: dzielimy tekst na fragmenty
    const chunks = chunkText(fullText, 1000, 200);

    return NextResponse.json({
      fileName: file.name,
      totalCharacters: fullText.length,
      chunksCount: chunks.length,
      chunks: chunks,
    });
  } catch (error) {
    console.error("Błąd przetwarzania dokumentu:", error);
    return NextResponse.json(
      { error: "Nie udało się przetworzyć dokumentu." },
      { status: 500 }
    );
  }
}