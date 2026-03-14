const { createClient } = require('@supabase/supabase-js');

// Use service key for backend — bypasses Row Level Security
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = supabase;
