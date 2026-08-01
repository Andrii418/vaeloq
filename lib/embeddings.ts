// lib/embeddings.ts

import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "./supabase";

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

/**
 * Kształt pojedynczego fragmentu zwróconego przez wyszukiwanie wektorowe.
 */
export interface RetrievedChunk {
  id: string;
  document_name: string;
  content: string;
  chunk_index: number;
  similarity: number;
}

/**
 * Wyszukuje fragmenty dokumentów najbardziej pasujące znaczeniowo do
 * podanego pytania.
 *
 * To jest właśnie "Retrieval" w RAG:
 * 1. Zamieniamy pytanie usera na wektor (tym samym modelem co dokumenty,
 *    ale z innym taskType — "RETRIEVAL_QUERY" zamiast "RETRIEVAL_DOCUMENT",
 *    bo Gemini inaczej interpretuje "pytanie" niż "treść do zapisania").
 * 2. Prosimy Supabase (funkcję SQL match_documents) o N fragmentów
 *    o najbardziej podobnym wektorze.
 */
export async function retrieveRelevantChunks(
  question: string,
  matchCount: number = 5
): Promise<RetrievedChunk[]> {
  const queryEmbedding = await generateEmbedding(question, "RETRIEVAL_QUERY");

  const { data, error } = await supabaseAdmin.rpc("match_documents", {
    query_embedding: queryEmbedding,
    match_count: matchCount,
  });

  if (error) {
    console.error("Błąd wyszukiwania wektorowego:", error);
    throw new Error("Nie udało się wyszukać fragmentów dokumentu.");
  }

  return data as RetrievedChunk[];
}