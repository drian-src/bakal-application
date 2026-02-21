'use strict';

const { supabase } = require('../config/db');

const TABLE = 'recommendations';

async function createMany(recommendations) {
  if (!recommendations.length) return [];
  const { data, error } = await supabase
    .from(TABLE)
    .insert(recommendations)
    .select();
  if (error) throw error;
  return data;
}

async function findBySearch(searchId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, products(*, platforms(name))')
    .eq('search_id', searchId)
    .order('score', { ascending: false });
  if (error) throw error;
  return data || [];
}

module.exports = { createMany, findBySearch };