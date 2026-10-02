/**
 * Política de contraseñas para crear cuenta. Debe coincidir con el backend
 * (USCback/src/modules/auth/dto/auth.dto.ts, PASSWORD_PATTERN), que es quien
 * la hace cumplir; aquí solo se usa para guiar al usuario en vivo.
 */
export type PasswordRuleId = 'minLength' | 'uppercase' | 'special';

export const PASSWORD_RULES: { id: PasswordRuleId; test: (password: string) => boolean }[] = [
  { id: 'minLength', test: (p) => p.length >= 8 },
  { id: 'uppercase', test: (p) => /[A-ZÁÉÍÓÚÑ]/.test(p) },
  { id: 'special', test: (p) => /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s]/.test(p) },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
