/**
 * Registration is restricted to students of Cali universities — USConnect's
 * actual target audience. This only gates NEW sign-ups (`AuthService.register`);
 * it must never be applied to `login`/`verifyOtp`, since accounts created
 * before this restriction existed (or via `registerAdmin`) still need to be
 * able to sign in regardless of their email's domain.
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
