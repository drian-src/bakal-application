'use strict';

const { supabase } = require('../config/db');

const TABLE = 'users';

async function findByEmail(email) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, email, name, auth_provider, created_at, last_login')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function findByGoogleId(googleId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('google_id', googleId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function create(userData) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert(userData)
    .select('id, email, name, auth_provider, created_at')
    .single();
  if (error) throw error;
  return data;
}

async function updateLastLogin(id) {
  const { error } = await supabase
    .from(TABLE)
    .update({ last_login: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

async function upsertGoogleUser({ googleId, email, name, avatarUrl = null }) {
  const existing = await findByGoogleId(googleId);
  if (existing) {
    await updateLastLogin(existing.id);
    return existing;
  }
  // Check if email already exists with different provider
  const byEmail = await findByEmail(email);
  if (byEmail) {
    // Link Google ID to existing account
    const { data, error } = await supabase
      .from(TABLE)
      .update({ google_id: googleId, avatar_url: avatarUrl, updated_at: new Date().toISOString() })
      .eq('id', byEmail.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  return create({ email, name, google_id: googleId, auth_provider: 'google', avatar_url: avatarUrl });
}

module.exports = { findByEmail, findById, findByGoogleId, create, updateLastLogin, upsertGoogleUser };