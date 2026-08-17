import { NextResponse } from "next/server";
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!));

// Exchanges a Neon Auth JWT (obtained client-side after sign-in) for our own
// first-party httpOnly session cookie, after verifying its signature.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  try {
    const { payload } = await jwtVerify(token, JWKS);
    const res = NextResponse.json({ ok: true });
    const nowSec = Math.floor(Date.now() / 1000);
    const maxAge = typeof payload.exp === "number" ? Math.max(payload.exp - nowSec, 60) : 60 * 60;
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("session");
  return res;
}
