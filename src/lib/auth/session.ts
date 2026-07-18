import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "./constants";
import { signToken, verifyToken, type SessionPayload } from "./jwt";

const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7;

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ONE_WEEK_SECONDS,
  };
}

export async function createSessionCookie(
  payload: SessionPayload,
): Promise<void> {
  const token = await signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, cookieOptions());
}

export function setSessionCookieOnResponse(
  response: NextResponse,
  payload: SessionPayload,
): Promise<NextResponse> {
  return signToken(payload).then((token) => {
    response.cookies.set(AUTH_COOKIE_NAME, token, cookieOptions());
    return response;
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}

export function clearSessionCookieOnResponse(
  response: NextResponse,
): NextResponse {
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}
