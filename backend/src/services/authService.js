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

async function googleCallback(profile) {
  const { id: googleId, emails, displayName } = profile;
  const email = emails?.[0]?.value;
  if (!email) throw new Error('No email returned from Google.');

  const user = await userRepo.upsertGoogleUser({ googleId, email, name: displayName });
  await userRepo.updateLastLogin(user.id);
  const token = signToken(user.id);
  return { user, token };
}

async function getProfile(userId) {
  const user = await userRepo.findById(userId);
  if (!user) throw Object.assign(new Error('User not found.'), { statusCode: 404 });
  return user;
}

module.exports = { register, login, googleCallback, getProfile, signToken };