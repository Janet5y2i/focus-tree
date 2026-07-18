import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { AUTH_COOKIE_NAME, JWT_AUDIENCE, JWT_ISSUER } from "@/lib/auth/constants";

const PUBLIC_PATHS = ["/login", "/register"];
const AUTH_API_PATHS = ["/api/auth/login", "/api/auth/register"];

function getSecretKey(): Uint8Array | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;

  const secret = getSecretKey();
  if (!secret) return false;

  try {
    await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    return true;
  } catch {
    return false;
  }
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authenticated = await isAuthenticated(request);

  const isPublicPage = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const isAuthApi = AUTH_API_PATHS.some((path) => pathname === path);
  const isStatic =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".");

  if (isStatic) {
    return NextResponse.next();
  }

  if (isAuthApi) {
    return NextResponse.next();
  }

  if (isPublicPage && authenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isPublicPage && !authenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "未登入" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
