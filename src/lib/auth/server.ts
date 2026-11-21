import "server-only";
import { createNeonAuth, type NeonAuth } from "@neon/auth/next/server";

let _auth: NeonAuth | null = null;

export function getAuth(): NeonAuth {
  if (!_auth) {
    const baseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
    const secret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();

    if (!baseUrl) {
      throw new Error(
        "Missing required environment variable: NEON_AUTH_BASE_URL"
      );
    }

    if (!secret || secret.length < 32) {
      throw new Error(
        "Missing or invalid environment variable: NEON_AUTH_COOKIE_SECRET (must be at least 32 characters)"
      );
    }

    _auth = createNeonAuth({
      baseUrl,
      cookies: {
        secret,
      },
    });
  }

  return _auth;
}

