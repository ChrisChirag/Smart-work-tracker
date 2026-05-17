import { NextRequest, NextResponse } from "next/server";
import { encode } from "next-auth/jwt";

// Only active when TEST_AUTH_ENABLED=true — never ship with this enabled in production
export async function GET(request: NextRequest) {
  if (process.env.TEST_AUTH_ENABLED !== "true") {
    return NextResponse.json({ error: "Test auth is not enabled" }, { status: 403 });
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "NEXTAUTH_SECRET not configured" }, { status: 500 });
  }

  const now = Math.floor(Date.now() / 1000);
  const token = await encode({
    secret,
    token: {
      name: "Test User",
      email: "test@playwright.local",
      picture: null,
      sub: "test-user-playwright-001",
      iat: now,
      exp: now + 24 * 60 * 60,
    },
    maxAge: 24 * 60 * 60,
  });

  const isSecure = request.url.startsWith("https://");
  const cookieName = isSecure
    ? "__Secure-next-auth.session-token"
    : "next-auth.session-token";

  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecure,
    path: "/",
    maxAge: 24 * 60 * 60,
  });
  return response;
}
