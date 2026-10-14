import { createClient } from '@supabase/supabase-js';

const configuredUrl = import.meta.env?.VITE_SUPABASE_URL;
const configuredKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!configuredUrl || !configuredKey) console.warn('[Supabase] Configure your own project in .env.');
// Non-credential placeholders allow the documented local fallback to render.
export const supabase = createClient(configuredUrl || 'https://example.supabase.co', configuredKey || 'public-demo-placeholder', {
  auth: { persistSession: true, autoRefreshToken: true }
});
