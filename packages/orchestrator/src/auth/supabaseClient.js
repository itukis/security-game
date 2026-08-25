const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

function getServerClient() {
  const url = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error('Supabase server client is not configured');
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false },
  });
}

module.exports = { getServerClient };
