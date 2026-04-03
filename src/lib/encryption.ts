/**
 * Field-level AES-256-GCM encryption for sensitive database fields.
 *
 * Usage:
 *   const ciphertext = encrypt("my-secret-token");   // store this in DB
 *   const plaintext  = decrypt(ciphertext);           // read back
 *
 * Requires FIELD_ENCRYPTION_KEY env var (64 hex chars = 32 bytes).
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Format: base64(iv:ciphertext:authTag) — all-in-one string safe for DB columns.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128-bit auth tag

function getKey(): Buffer {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY is not set. " +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  if (hex.length !== 64) {
    throw new Error("FIELD_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes).");
  }
  return Buffer.from(hex, "hex");
}

/**
 * Check if encryption is configured.
 */
export function isEncryptionEnabled(): boolean {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  return !!hex && hex.length === 64;
}

/**
 * Encrypt a plaintext string. Returns a base64 string safe for DB storage.
 * If encryption is not configured, returns the plaintext unchanged (graceful degradation).
 */
export function encrypt(plaintext: string): string {
  if (!isEncryptionEnabled()) return plaintext;

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Pack: iv + ciphertext + authTag → base64
  const packed = Buffer.concat([iv, encrypted, authTag]);
  return `enc:${packed.toString("base64")}`;
}

/**
 * Decrypt a ciphertext string produced by encrypt().
 * If the value doesn't have the "enc:" prefix, assumes it's plaintext (migration-safe).
 */
export function decrypt(ciphertext: string): string {
  // Not encrypted (plaintext from before encryption was enabled)
  if (!ciphertext.startsWith("enc:")) return ciphertext;

  const key = getKey();
  const packed = Buffer.from(ciphertext.slice(4), "base64");

  if (packed.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Invalid encrypted value: too short.");
  }

  const iv = packed.subarray(0, IV_LENGTH);
  const authTag = packed.subarray(packed.length - AUTH_TAG_LENGTH);
  const encrypted = packed.subarray(IV_LENGTH, packed.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Encrypt a value only if it's not already encrypted.
 * Useful for idempotent migration scripts.
 */
export function encryptIfNeeded(value: string): string {
  if (value.startsWith("enc:")) return value;
  return encrypt(value);
}

/**
 * Helper to encrypt an object's specified fields.
 * Returns a new object with those fields encrypted.
 */
export function encryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldNames: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fieldNames) {
    const val = result[field];
    if (typeof val === "string" && val.length > 0) {
      (result as Record<string, unknown>)[field as string] = encrypt(val);
    }
  }
  return result;
}

/**
 * Helper to decrypt an object's specified fields.
 * Returns a new object with those fields decrypted.
 */
export function decryptFields<T extends Record<string, unknown>>(
  obj: T,
  fieldNames: (keyof T)[]
): T {
  const result = { ...obj };
  for (const field of fieldNames) {
    const val = result[field];
    if (typeof val === "string" && val.length > 0) {
      (result as Record<string, unknown>)[field as string] = decrypt(val);
    }
  }
  return result;
}
