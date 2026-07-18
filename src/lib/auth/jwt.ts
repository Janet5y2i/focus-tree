import { SignJWT, jwtVerify } from "jose";
import { JWT_AUDIENCE, JWT_ISSUER } from "./constants";

export interface SessionPayload {
  sub: string;
  email: string;
}

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

function parseExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN ?? "7d";
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(parseExpiresIn())
    .sign(getSecretKey());
}

export async function verifyToken(token: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(token, getSecretKey(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  if (!payload.sub || typeof payload.email !== "string") {
    throw new Error("Invalid token payload");
  }

  return {
    sub: payload.sub,
    email: payload.email,
  };
}
