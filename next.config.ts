import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mówimy Next.js, żeby NIE pakował (nie "bundlował") tych bibliotek
  // swoim własnym mechanizmem, tylko zostawił je jako zwykłe moduły Node.js.
  // pdf-parse/pdfjs-dist wewnętrznie szuka pliku "workera" na dysku —
  // proces pakowania Next.js gubi ten plik po drodze, co powoduje błąd
  // "Setting up fake worker failed".
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;