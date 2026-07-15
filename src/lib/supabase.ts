import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://aikzhjrgctinlqnyjwrp.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpa3poanJnY3Rpbmxxbnlqd3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwOTQ1NjEsImV4cCI6MjA5OTY3MDU2MX0.CQCOUMMXzegzhtB0377ZGPv15teP1Q45vxF0wRTD9ZY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
