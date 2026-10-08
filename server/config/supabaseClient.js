const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const { createClient } = require('@supabase/supabase-js');

/**
 * Server-Side Supabase Client Module
 * Strictly server-side only. Uses the service-role key to interact with Supabase tables.
 * Never expose this client or its credentials to frontend/client assets.
 */

// Robust lookup helper: checks exact names, aliases, trimmed names, and case-insensitivity
function resolveEnvVar(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  const envKeys = Object.keys(process.env);
  for (const name of names) {
    const target = name.trim().toUpperCase();
    for (const key of envKeys) {
      if (key.trim().toUpperCase() === target && process.env[key]) {
        return process.env[key];
      }
    }
  }
  return '';
}

// Helper to safely extract and clean credentials
function getCredentials() {
  let url = resolveEnvVar('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL').trim();
  let key = resolveEnvVar(
    'SUPABASE_SECRET_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_KEY'
  ).trim();

  // Strip accidental enclosing single or double quotes
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1).trim();
  }
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  return { url, key };
}

// Helper to determine if actual credentials (not defaults/placeholders) are present
function isConfigured() {
  const { url, key } = getCredentials();
  return (
    url !== '' &&
    !url.includes('your-project-id') &&
    key !== '' &&
    key !== 'your_supabase_secret_key_here' &&
    key !== 'your_supabase_service_role_key_here'
  );
}

let supabase = null;

function getSupabaseClient() {
  const { url, key } = getCredentials();
  if (!isConfigured()) return null;
  if (!supabase) {
    supabase = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
  }
  return supabase;
}

/**
 * Checks server connectivity to Supabase.
 * Executes a lightweight read against public.conversations to verify schema access.
 * Does NOT expose credentials in error or success responses.
 *
 * @returns {Promise<{success: boolean, status: string, message?: string, error?: string}>}
 */
async function checkDatabaseHealth() {
  const { url, key } = getCredentials();

  // Granular diagnostic check for missing or placeholder credentials
  if (!url) {
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      error: 'SUPABASE_URL is missing from environment variables'
    };
  }
  if (url.includes('your-project-id')) {
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      error: 'SUPABASE_URL is still set to placeholder "https://your-project-id.supabase.co". Please update it with your actual Supabase project URL.'
    };
  }
  if (!key) {
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      error: 'SUPABASE_SECRET_KEY is missing from environment variables'
    };
  }
  if (key === 'your_supabase_secret_key_here' || key === 'your_supabase_service_role_key_here') {
    return {
      success: false,
      status: 'NOT_CONFIGURED',
      error: 'SUPABASE_SECRET_KEY is still set to placeholder. Please provide your actual Supabase secret key.'
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      status: 'INITIALIZATION_FAILED',
      error: 'Could not initialize Supabase client with provided credentials'
    };
  }

  try {
    // Perform a lightweight check on conversations table
    const { data, error } = await client
      .from('conversations')
      .select('id')
      .limit(1);

    if (error) {
      return {
        success: false,
        status: 'QUERY_ERROR',
        error: error.message
      };
    }

    return {
      success: true,
      status: 'CONNECTED',
      message: 'Supabase database is reachable and conversations table verified'
    };
  } catch (err) {
    return {
      success: false,
      status: 'CONNECTION_ERROR',
      error: err.message || 'Unknown database connection error'
    };
  }
}

/**
 * Creates an ephemeral, isolated Supabase client.
 * Essential for user-level session operations (e.g., signInWithPassword)
 * to ensure that user sessions never taint or mutate the server's singleton admin client.
 */
function createIsolatedClient() {
  const { url, key } = getCredentials();
  if (!isConfigured()) return null;
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

module.exports = {
  get supabase() {
    return getSupabaseClient();
  },
  getSupabaseClient,
  createIsolatedClient,
  getCredentials,
  isConfigured,
  checkDatabaseHealth
};
