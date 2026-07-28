// app/page.tsx
import { DocumentUpload } from "@/components/document-upload";

export default function Home() {
  return (
    <main className="min-h-screen bg-black py-16 px-4">
      <h1 className="text-2xl font-semibold text-white text-center mb-8">
        Vaeloq — Etap 2: Test przetwarzania dokumentów
      </h1>
      <DocumentUpload />
    </main>
  );
}