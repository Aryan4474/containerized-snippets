const { customAlphabet } = require('nanoid');

// A secure, readable alphabet (62 characters: A-Z, a-z, 0-9)
const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

// Length of 8 characters provides 62^8 ≈ 2.18 * 10^14 combinations.
// At a rate of 1000 IDs/sec, it would take ~3500 years to have a 1% probability of a single collision.
const ID_LENGTH = 8;

const generateShortId = customAlphabet(ALPHABET, ID_LENGTH);

module.exports = {
  generateShortId
};
