'use strict';

const { supabase } = require('../config/db');

const TABLE = 'products';

async function upsertProduct(productData) {
  // Upsert by product_url (unique)
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(productData, { onConflict: 'product_url', ignoreDuplicates: false })
    .select()
    .single();
  if (error) throw error;
  return data;
}

async function findByUrl(productUrl) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('product_url', productUrl)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, platforms(name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findByIds(ids) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, platforms(name)')
    .in('id', ids);
  if (error) throw error;
  return data || [];
}

async function updateEmbedding(id, embedding) {
  const { error } = await supabase
    .from(TABLE)
    .update({ embedding })
    .eq('id', id);
  if (error) throw error;
}

// New methods for product endpoints
async function findAll(page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, platforms(name)')
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

async function findRecent(limit = 10) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, platforms(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function findTopRated(limit = 10) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*, platforms(name)')
    .gt('rating', 0)
    .order('rating', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

module.exports = { 
  upsertProduct, 
  findByUrl, 
  findById, 
  findByIds, 
  updateEmbedding,
  findAll,
  findRecent,
  findTopRated
};