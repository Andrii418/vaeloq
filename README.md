# Vaeloq

An AI assistant that reads PDF documents and answers questions about them — built with a full RAG (Retrieval-Augmented Generation) pipeline.

Upload a PDF, ask a question in plain language, and get an answer based only on what's actually written in the document — with the source fragment cited, so you can check it yourself.

**[Live Demo →](https://vaeloq.vercel.app/)**


## Why I built this

I wanted to understand how tools like ChatPDF and NotebookLM actually work under the hood, not just use them. So I built one myself — full stack, from PDF parsing to vector search to a streaming chat UI.

## Tech Stack

**Frontend** — Next.js 16 (App Router, TypeScript), Tailwind CSS, Framer Motion, Shadcn UI

**Backend** — Next.js API Routes, Google Gemini API (generation + embeddings), Supabase (PostgreSQL + pgvector)

**Deployment** — Vercel

## How it works

1. **Read the PDF.** The uploaded file is parsed and its text extracted.
2. **Split it into chunks.** The text is broken into smaller pieces along natural sentence and line breaks — not cut off mid-word.
3. **Turn each chunk into a vector.** Every chunk is converted into a list of numbers (an embedding) that represents its meaning, using Gemini's embedding model. These are stored in Supabase.
4. **Search by meaning, not keywords.** When you ask a question, it's converted into a vector too, and the database finds the chunks whose meaning is closest to it — even if they don't share any exact words.
5. **Answer with context.** Those chunks are handed to Gemini along with your question, and it generates an answer grounded in that specific text — streamed back live, word by word, with a citation showing which fragment it used.

## Running it locally

```bash
git clone https://github.com/Andrii418/vaeloq
cd vaeloq
npm install
```

Create a `.env.local` file in the project root with your own keys:

```bash
GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_secret_key
```

Then set up the database — run `supabase/schema.sql` in your Supabase project's SQL Editor. It creates the table, enables `pgvector`, and adds the search function.

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure
```
├── app/
│ ├── api/
│ │ ├── process-document/ PDF parsing, chunking, embedding, storage
│ │ └── chat/ RAG search + streaming answer
│ └── page.tsx Split-screen layout
├── components/
│ ├── document-panel.tsx Upload + PDF preview
│ └── chat-panel.tsx Chat UI with streaming responses
├── lib/
│ ├── document-processor.ts Text extraction + chunking
│ ├── embeddings.ts Embeddings + vector search
│ └── supabase.ts Database client
└── supabase/
└── schema.sql Database setup script
```
