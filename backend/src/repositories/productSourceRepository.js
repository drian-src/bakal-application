'use strict';

const { supabase } = require('../config/db');

const TABLE = 'product_sources';

async function createMany(sources) {
  if (!sources.length) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .insert(sources)
    .select();
  if (error) throw error;
  return data;
}

async function findBySearch(searchId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, products(*, platforms(name))')
    .eq('search_id', searchId)
    .order('rank', { ascending: true });
  if (error) throw error;
  return data || [];
}

module.exports = { createMany, findBySearch };