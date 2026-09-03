/**
 * Mirrors the backend's allowlist (USCback's
 * `src/modules/auth/constants/allowed-email-domains.ts`) so registration gets
 * immediate client-side feedback instead of waiting on a round-trip to the
 * API. The backend remains the authoritative check — this only improves UX.
 * Only gates registration, never login: existing accounts (created before
 * this restriction existed) must still be able to sign in regardless of
 * their email's domain.
 */
export const ALLOWED_EMAIL_DOMAINS = [
  'usc.edu.co',
  'correounivalle.edu.co',
  'univalle.edu.co',
  'icesi.edu.co',
  'javerianacali.edu.co',
  'uao.edu.co',
  'unilibre.edu.co',
  'unicatolica.edu.co',
  'usb.edu.co',
  'ucc.edu.co',
  'campusucc.edu.co',
  'uniajc.edu.co',
] as const;

export function isAllowedEmailDomain(email: string): boolean {
  const domain = email.trim().toLowerCase().split('@')[1];
  return !!domain && (ALLOWED_EMAIL_DOMAINS as readonly string[]).includes(domain);
}
