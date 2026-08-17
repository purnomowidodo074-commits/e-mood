import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { sql } from "./db";

export type Role = "admin" | "leader" | "section_head";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const JWKS = createRemoteJWKSet(new URL(process.env.NEON_AUTH_JWKS_URL!));

/** Verifies the session cookie (JWT signed by Neon Auth) and loads the fresh role from DB. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const store = await cookies();
  const token = store.get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWKS);
    if (!payload.sub) return null;

    const rows = await sql`
      select id, name, email, role
      from neon_auth."user"
      where id = ${payload.sub}
    `;
    const user = rows[0] as { id: string; name: string; email: string; role: string | null } | undefined;
    if (!user || !user.role) return null; // no role assigned yet = not usable in dashboard/admin
    return { ...user, role: user.role as Role };
  } catch {
    return null;
  }
}

/** Redirects to /login when not authenticated, or when the role isn't allowed. */
export async function requireUser(allowedRoles?: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) redirect("/dashboard");
  return user;
}
