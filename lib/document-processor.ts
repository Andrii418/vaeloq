// lib/document-processor.ts

// Importujemy klasę PDFParse — to nowe API biblioteki pdf-parse (wersja 2.x)
import { PDFParse } from "pdf-parse";

/**
 * Wyciąga czysty tekst z bufora danych pliku PDF.
 * "Buffer" to surowe bajty pliku — tak przesyła się pliki po sieci.
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
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
 * Dzieli tekst na "zdania" — a właściwie na naturalne fragmenty logiczne.
 * Dzielimy najpierw po nowych liniach (naturalne granice w formularzach,
 * tabelkach, biletach, listach), a w obrębie każdej linii dodatkowo po
 * kropce/wykrzykniku/pytajniku (naturalne granice w tekście pisanym prozą).
 */
function splitIntoSentences(text: string): string[] {
  const lines = text.split(/\n+/).filter((l) => l.trim().length > 0);

  const sentences: string[] = [];
  for (const line of lines) {
    const found = line.match(/[^.!?]+[.!?]+(\s|$)/g);
    if (found) {
      sentences.push(...found.map((s) => s.trim()));
    } else {
      sentences.push(line.trim());
    }
  }

  return sentences.length > 0 ? sentences : [text];
}

/**
 * Dzieli długi tekst na mniejsze fragmenty (chunki), respektując granice
 * zdań/linii, żeby nie ucinać myśli w połowie.
 *
 * DLACZEGO TO ROBIMY (kluczowe dla RAG):
 * 1. Modele AI mają ograniczony "kontekst" — nie możemy wrzucić całej
 *    książki w jedno zapytanie.
 * 2. Wyszukiwanie wektorowe działa najlepiej na małych, spójnych
 *    kawałkach tekstu — cały dokument "rozmywa" znaczenie, mały fragment
 *    (np. jeden akapit o konkretnym temacie) jest precyzyjny.
 * 3. Fragment urwany w połowie zdania ma GORSZY embedding — model trudniej
 *    "rozumie" niedokończoną myśl. Dlatego tniemy na granicy linii/zdania,
 *    nigdy w środku słowa czy zdania.
 *
 * @param text - pełny tekst dokumentu
 * @param chunkSize - docelowa (nie sztywna!) długość fragmentu w znakach
 * @param overlapSentences - ile ostatnich "zdań" poprzedniego fragmentu
 *                            powtórzyć na początku następnego (kontekst)
 */
export function chunkText(
  text: string,
  chunkSize: number = 1000,
  overlapSentences: number = 2
): DocumentChunk[] {
  // Usuwamy tylko nadmiarowe spacje/tabulatory W LINII, ale zachowujemy
  // podział na linie (\n) — to ważna informacja strukturalna dla
  // dokumentów typu formularz/bilet/tabela
  const cleanedText = text.replace(/[ \t]+/g, " ").trim();
  const sentences = splitIntoSentences(cleanedText);

  const chunks: DocumentChunk[] = [];
  let currentSentences: string[] = [];
  let currentLength = 0;
  let chunkIndex = 0;

  for (const sentence of sentences) {
    if (currentLength + sentence.length > chunkSize && currentSentences.length > 0) {
      chunks.push({
        id: `chunk-${chunkIndex}`,
        content: currentSentences.join(" "),
        index: chunkIndex,
      });
      chunkIndex++;

      const overlap = currentSentences.slice(-overlapSentences);
      currentSentences = [...overlap];
      currentLength = overlap.join(" ").length;
    }

    currentSentences.push(sentence);
    currentLength += sentence.length;
  }

  if (currentSentences.length > 0) {
    chunks.push({
      id: `chunk-${chunkIndex}`,
      content: currentSentences.join(" "),
      index: chunkIndex,
    });
  }

  return chunks;
}