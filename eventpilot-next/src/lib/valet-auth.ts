import { SignJWT, jwtVerify } from "jose";

// Valet JWT secret - should be set in environment
const getValetSecret = () => {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set");
  }
  return new TextEncoder().encode(secret);
};

export interface ValetTokenPayload {
  employeeId: string;
  username: string;
  name: string;
  [key: string]: unknown;
}

/**
 * Generate a JWT token for a valet employee
 */
export async function generateValetToken(
  payload: ValetTokenPayload
): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h") // Token expires in 24 hours
    .sign(getValetSecret());

  return token;
}

/**
 * Verify and decode a valet JWT token
 */
export async function verifyValetToken(
  token: string
): Promise<ValetTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getValetSecret());
    return {
      employeeId: payload.employeeId as string,
      username: payload.username as string,
      name: payload.name as string,
    };
  } catch {
    return null;
  }
}

/**
 * Extract valet token from request headers
 */
export function extractValetToken(headers: Headers): string | null {
  const authHeader = headers.get("x-valet-token");
  if (authHeader) {
    return authHeader;
  }

  // Also support Authorization Bearer header
  const authorization = headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7);
  }

  return null;
}
