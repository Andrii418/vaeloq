// lib/document-processor.ts

// Importujemy klasę PDFParse — to nowe API biblioteki pdf-parse (wersja 2.x)
import { PDFParse } from "pdf-parse";

/**
 * Wyciąga czysty tekst z bufora danych pliku PDF.
 * "Buffer" to surowe bajty pliku — tak przesyła się pliki po sieci.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Tworzymy nowy "parser" wskazując mu dane pliku
  const parser = new PDFParse({ data: buffer });

  // getText() zwraca obiekt z tekstem każdej strony osobno
  // oraz polem `text` — całym dokumentem połączonym w jeden string
  const result = await parser.getText();

  // Zwalniamy zasoby użyte przez parser (dobra praktyka pamięciowa)
  await parser.destroy();

  return result.text;
}

/**
 * Reprezentuje pojedynczy fragment (chunk) dokumentu.
 * Każdy fragment będzie później zamieniony na wektor i zapisany w bazie.
 */
export interface DocumentChunk {
  id: string;
  content: string;
  index: number; // kolejność fragmentu w dokumencie
}

/**
 * Dzieli długi tekst na mniejsze fragmenty (chunki).
 *
 * DLACZEGO TO ROBIMY (kluczowe dla RAG):
 * 1. Modele AI mają ograniczony "kontekst" — nie możemy wrzucić całej
 *    książki w jedno zapytanie.
 * 2. Wyszukiwanie wektorowe działa najlepiej na małych, spójnych
 *    kawałkach tekstu — cały dokument "rozmywa" znaczenie, mały fragment
 *    (np. jeden akapit o konkretnym temacie) jest precyzyjny.
 * 3. Dzięki temu, gdy user zada pytanie, znajdziemy dokładnie TEN
 *    fragment, który zawiera odpowiedź — zamiast całego, wielostronicowego
 *    dokumentu.
 *
 * @param text - pełny tekst dokumentu
 * @param chunkSize - docelowa długość jednego fragmentu (w znakach)
 * @param overlap - ile znaków fragmenty mają na siebie "zachodzić"
 *                  (żeby zdanie przecięte na granicy nie straciło sensu)
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlap: number = 200
): DocumentChunk[] {
  const cleanedText = text.replace(/\s+/g, " ").trim();

  const chunks: DocumentChunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < cleanedText.length) {
    const endIndex = Math.min(startIndex + chunkSize, cleanedText.length);
    const chunkContent = cleanedText.slice(startIndex, endIndex);

    chunks.push({
      id: `chunk-${chunkIndex}`,
      content: chunkContent,
      index: chunkIndex,
    });

    chunkIndex++;
    startIndex += chunkSize - overlap;
  }

  return chunks;
}