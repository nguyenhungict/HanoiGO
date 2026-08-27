// A missing secret must fail loudly, not silently fall back to a value
// that's sitting in this file (and every fork of this repo).
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
