'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/dotenv');
const userRepo = require('../repositories/userRepository');
const { hashPassword, comparePassword } = require('../utils/bcryptUtils');

function signToken(userId) {
  return jwt.sign({ sub: userId }, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

async function register({ email, name, password }) {
  const existing = await userRepo.findByEmail(email);
  if (existing) throw Object.assign(new Error('Email already in use.'), { statusCode: 409 });

  const password_hash = await hashPassword(password);
  const user = await userRepo.create({ email, name, password_hash, auth_provider: 'email' });
  const token = signToken(user.id);
  return { user, token };
}

async function login({ email, password }) {
  const user = await userRepo.findByEmail(email);
  if (!user || user.auth_provider !== 'email') {
    throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });
  }
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid email or password.'), { statusCode: 401 });

  await userRepo.updateLastLogin(user.id);
  const token = signToken(user.id);
  const { password_hash: _, ...safeUser } = user;
  return { user: safeUser, token };
}

/**
 * googleLogin — called by authController.googleAuthCallback after token verification.
 *
 * Finds or creates a user by google_id (or email for legacy migration),
 * updates their profile with latest Google data, and returns a signed JWT.
 *
 * @param {object} profile - Verified Google profile
 * @param {string} profile.googleId  - Google's unique user ID (payload.sub)
 * @param {string} profile.email     - Verified email from Google
 * @param {string} profile.name      - Full name from Google profile
 * @param {string} profile.avatarUrl - Profile picture URL from Google
 * @returns {{ user: object, token: string, isNewUser: boolean }}
 */
async function googleLogin({ googleId, email, name, avatarUrl }) {
  const { supabase } = require('../config/db');

  // 1 — Try to find existing user by google_id first
  let { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('google_id', googleId)
    .maybeSingle();

  if (findError && findError.code !== 'PGRST116') throw findError;

  // 2 — If not found by google_id, try by email (handles legacy email/password users)
  if (!existingUser) {
    const { data: userByEmail, error: emailError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (emailError && emailError.code !== 'PGRST116') throw emailError;
    existingUser = userByEmail;
  }

  let user;
  let isNewUser = false;

  if (existingUser) {
    // 3a — User exists — update with latest Google profile data
    const { data: updated, error: updateError } = await supabase
      .from('users')
      .update({
        google_id:     googleId,
        name:          name,
        avatar_url:    avatarUrl,
        auth_provider: 'google',
        last_login:    new Date().toISOString(),
        updated_at:    new Date().toISOString(),
      })
      .eq('id', existingUser.id)
      .select()
      .single();

    if (updateError) throw updateError;
    user = updated;
    isNewUser = false;  // Existing user, not new

  } else {
    // 3b — New user — create from Google profile
    const { data: created, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        name,
        google_id:     googleId,
        avatar_url:    avatarUrl,
        auth_provider: 'google',
        password_hash: null,  // Google users have no password
        last_login:    new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) throw createError;
    user = created;
    isNewUser = true;  // Brand new user created
  }

  // 4 — Sign JWT using the SAME config and payload structure as existing auth
  // IMPORTANT: payload uses 'sub' for user ID — matches authMiddleware decoded.sub
  const token = jwt.sign(
    { sub: user.id, email: user.email },  // 'sub' MUST be user.id — see authMiddleware.js
    config.jwt.secret,                     // config.jwt.secret — NOT process.env.JWT_SECRET
    { expiresIn: config.jwt.expiresIn || '7d' }
  );

  return { user, token, isNewUser };
}

async function getProfile(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return user;
}

module.exports = { register, login, getProfile, googleLogin, signToken };