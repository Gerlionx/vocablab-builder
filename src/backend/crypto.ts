import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

const ARGON = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string) {
  return hash(password, ARGON);
}

export async function verifyPassword(passwordHash: string, password: string) {
  try {
    return await verify(passwordHash, password, ARGON);
  } catch {
    return false;
  }
}

export function newSessionToken() {
  return randomBytes(32).toString("hex");
}

export function sha256Token(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
