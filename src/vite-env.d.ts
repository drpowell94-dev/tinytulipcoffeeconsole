/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Supabase
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;

  // Wix Integration
  readonly VITE_WIX_API_TOKEN?: string;
  readonly VITE_WIX_WEBHOOK_SECRET?: string;
  readonly WIX_API_KEY?: string;
  readonly WIX_SITE_ID?: string;

  // Instagram Integration
  readonly VITE_INSTAGRAM_CLIENT_ID?: string;
  readonly VITE_INSTAGRAM_CLIENT_SECRET?: string;
  readonly VITE_INSTAGRAM_REDIRECT_URI?: string;
  readonly VITE_INSTAGRAM_WEBHOOK_VERIFY_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
