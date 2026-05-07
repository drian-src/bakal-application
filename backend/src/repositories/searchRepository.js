'use strict';

const { supabase } = require('../config/db');

const TABLE = 'searches';

async function create(userId, query) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ user_id: userId || null, query })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findByUser(userId, limit = 20) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

// Alias for clarity
async function findByUserId(userId, limit = 20) {
  return findByUser(userId, limit);
}

async function deleteByUserId(userId) {
  const { error } = await supabase
    .from(TABLE)
    .delete()
    .eq('user_id', userId);
  if (error) throw error;
}

module.exports = { create, findById, findByUser, findByUserId, deleteByUserId };