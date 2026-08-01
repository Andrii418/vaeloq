// app/page.tsx
import { DocumentUpload } from "@/components/document-upload";
import { ChatInterface } from "@/components/chat-interface";

export default function Home() {
  return (
    <main className="min-h-screen bg-black py-16 px-4 space-y-16">
      <div>
        <h1 className="text-2xl font-semibold text-white text-center mb-8">
          Vaeloq — Etap 3: Upload i zapis do bazy wektorowej
        </h1>
        <DocumentUpload />
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-white text-center mb-8">
          Vaeloq — Etap 4: Zadaj pytanie o dokument
        </h1>
        <ChatInterface />
      </div>
    </main>
  );
}