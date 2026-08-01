// lib/supabase.ts

import { createClient } from "@supabase/supabase-js";

// Ten klient używa SERVICE_ROLE_KEY — czyli klucza z pełnymi uprawnieniami.
// Używamy go WYŁĄCZNIE w kodzie serwerowym (API routes), nigdy w komponentach
// z "use client" — bo omija wszystkie zabezpieczenia bazy danych.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);