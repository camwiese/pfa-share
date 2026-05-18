import { customAlphabet } from "nanoid";

// 6-char base32-style alphabet. Drops visually ambiguous chars (0/o, 1/l/i)
// so a token spoken aloud or hand-typed is unambiguous. ~30 bits = ~1B values.
const TOKEN_ALPHABET = "23456789abcdefghijkmnpqrstuvwxyz";
const make = customAlphabet(TOKEN_ALPHABET, 6);

export function generateToken() {
  return make();
}
