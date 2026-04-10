/**
 * Decode JWT payload without verification.
 * Used for frontend routing only — backend always verifies signature.
 */
export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Extract user role from JWT token.
 */
export function getRoleFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return payload?.role || null;
}

/**
 * Extract username from JWT token.
 */
export function getUsernameFromToken(token: string): string | null {
  const payload = decodeJwtPayload(token);
  return payload?.username || null;
}
