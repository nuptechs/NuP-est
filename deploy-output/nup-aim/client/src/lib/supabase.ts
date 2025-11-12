// Legacy Supabase file - now using API-based authentication
// This file is kept for compatibility but no longer uses Supabase client

// Null supabase export for backwards compatibility
export const supabase = null;

// Status function that returns API-based mode
export const getSupabaseStatus = () => {
  return {
    configured: false,
    url: 'API-based authentication',
    keyLength: 0,
    client: false,
    environment: import.meta.env?.MODE || 'unknown',
    hostname: window.location.hostname,
    mode: 'api'
  };
};

// Note: Database types are now defined in shared/schema.ts
// This file is kept only for legacy compatibility