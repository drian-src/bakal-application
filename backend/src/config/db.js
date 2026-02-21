'use strict';

const { createClient } = require('@supabase/supabase-js');
const config = require('./dotenv');
const logger = require('./logger');

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testConnection() {
  try {
    const { error } = await supabase.from('platforms').select('id').limit(1);
    if (error && error.code !== 'PGRST116') throw error;
    logger.info('[DB] Supabase connection verified.');
  } catch (err) {
    logger.error('[DB] Supabase connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { supabase, testConnection };