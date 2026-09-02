// Neon Auth (hosted Better Auth) only does email/password — no username plugin
// we can enable from this repo. So the login form takes a username and we map it
// to a synthetic email here. Existing accounts already use "<name>@tmmin.local".
export const LOGIN_EMAIL_DOMAIN = "tmmin.local";

export function usernameToEmail(input: string): string {
  const v = input.trim();
  return v.includes("@") ? v : `${v}@${LOGIN_EMAIL_DOMAIN}`;
}

export function emailToUsername(email: string): string {
  return email.replace(new RegExp(`@${LOGIN_EMAIL_DOMAIN}$`), "");
}
