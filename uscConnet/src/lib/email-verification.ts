import { isAllowedEmailDomain } from '@/constants/allowed-email-domains';

/**
 * Estados del paso "correo institucional" del registro.
 *
 * Flujo actual (sin proveedor de verificación por código):
 *   email_input → checking → registered → continue
 *
 * Flujo futuro (cuando exista verificación real por código):
 *   email_input → checking → code_sent → otp_input → verified → continue
 *
 * `code_sent`, `otp_input` y `verified` ya forman parte del tipo para que la
 * UI y el hook no cambien de forma al integrarlos; hoy ningún camino los usa.
 */
export type EmailVerificationStatus =
  | 'email_input'
  | 'checking'
  | 'registered'
  | 'code_sent'
  | 'otp_input'
  | 'verified'
  | 'continue';

/**
 * Resultado de comprobar el correo. Con un proveedor real, `outcome` pasaría
 * a ser `'code_sent'` y el flujo seguiría hacia `otp_input`.
 */
export type InstitutionalEmailCheck =
  | { ok: true; outcome: 'registered' | 'code_sent' }
  | { ok: false; reason: 'invalid_format' | 'domain_not_allowed' };

// Formato básico de correo: algo@dominio.tld, sin espacios.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Duración mínima de la animación de `checking`, para que no parpadee. */
export const CHECKING_MIN_DURATION_MS = 5000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmailFormat(email: string): boolean {
  return EMAIL_FORMAT.test(normalizeEmail(email));
}

/**
 * Comprueba que el correo pertenezca a una universidad admitida.
 *
 * Hoy solo valida contra la lista de dominios institucionales (la misma que
 * aplica el backend en `register()`); no envía nada ni marca el correo como
 * verificado. PUNTO DE INTEGRACIÓN: cuando exista el proveedor real, aquí se
 * llama al endpoint que envía el código y se devuelve `outcome: 'code_sent'`.
 */
export async function checkInstitutionalEmail(email: string): Promise<InstitutionalEmailCheck> {
  const normalized = normalizeEmail(email);

  if (!isValidEmailFormat(normalized)) {
    return { ok: false, reason: 'invalid_format' };
  }
  if (!isAllowedEmailDomain(normalized)) {
    return { ok: false, reason: 'domain_not_allowed' };
  }
  return { ok: true, outcome: 'registered' };
}
