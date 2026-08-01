// lib/embeddings.ts

import { GoogleGenAI } from "@google/genai";

// Tworzymy jeden, współdzielony klient Gemini dla całej aplikacji.
// Automatycznie odczytuje klucz ze zmiennej środowiskowej GEMINI_API_KEY.
const ai = new GoogleGenAI({});

/**
 * Zamienia tekst na wektor liczb (embedding) — matematyczną reprezentację
 * ZNACZENIA tego tekstu.
 *
 * DLACZEGO TO JEST SERCEM RAG:
 * Dwa teksty o podobnym znaczeniu (nawet jeśli używają zupełnie innych słów)
 * będą miały wektory leżące blisko siebie w przestrzeni 768 wymiarów.
 * Dzięki temu możemy później zapytać "jaki jest okres wypowiedzenia?"
 * i znaleźć fragment mówiący "umowę można rozwiązać z miesięcznym
 * wyprzedzeniem" — mimo że nie mają one wspólnych słów kluczowych.
 *
 * @param text - tekst do zamiany na wektor (np. fragment dokumentu, albo pytanie usera)
 * @param taskType - "RETRIEVAL_DOCUMENT" dla fragmentów zapisywanych do bazy,
 *                   "RETRIEVAL_QUERY" dla pytań użytkownika (Etap 4)
 */
export async function generateEmbedding(
  text: string,
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" = "RETRIEVAL_DOCUMENT"
): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: text,
    config: {
      taskType: taskType,
      // Ograniczamy wektor do 768 liczb (domyślnie model zwraca 3072) —
      // mniejszy wektor = szybsze wyszukiwanie i mniej miejsca w bazie,
      // przy niewielkiej stracie precyzji. W sam raz dla projektu portfolio.
      outputDimensionality: 768,
    },
  });

  // response.embeddings to tablica (bo można wysłać wiele tekstów naraz),
  // my wysyłamy jeden tekst, więc bierzemy pierwszy element
  const values = response.embeddings?.[0]?.values;

  if (!values) {
    throw new Error("Gemini nie zwrócił wektora dla podanego tekstu.");
  }

  return values;
}