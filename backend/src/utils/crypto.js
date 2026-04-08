'use strict';

const crypto = require('crypto');

/**
 * Generates a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt — never Math.random() (pseudoaleatório e determinístico).
 * @returns {string} 6-digit OTP string
 */
function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Generates a cryptographically secure random hex token (64 chars = 32 bytes).
 * Used for email verification, password recovery, webhook keys, etc.
 * @returns {string} 64-character hex string
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateOTP, generateToken };
