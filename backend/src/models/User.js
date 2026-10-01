import mongoose from "mongoose";
import crypto from "crypto";

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, trim: true, default: "" },
  role: { type: String, enum: ["provider", "patient", "admin"], default: "patient", required: true },
  patientId: { type: String, trim: true, default: "" },
  hash: { type: String, required: true },
  salt: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

/**
 * Derives cryptographic salt and PBKDF2 sha512 hash for a plaintext password.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return { salt, hash };
}

/**
 * Validates a plaintext password against the stored salt and PBKDF2 hash.
 */
export function verifyPassword(password, salt, storedHash) {
  if (!password || !salt || !storedHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return hash === storedHash;
}

export const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
