import { useCallback, useEffect, useRef, useState } from 'react';

import {
  CHECKING_MIN_DURATION_MS,
  checkInstitutionalEmail,
  normalizeEmail,
  type EmailVerificationStatus,
  type InstitutionalEmailCheck,
} from '@/lib/email-verification';

/**
 * Máquina de estados local del paso "correo institucional". La pantalla solo
 * consume `status` y las acciones (`submit` devuelve el resultado para que
 * muestre el error si el correo no es institucional). La lógica de
 * verificación vive en `lib/email-verification.ts`, que es lo único a
 * reemplazar al integrar el proveedor real.
 */
export function useEmailVerificationFlow() {
  const [status, setStatus] = useState<EmailVerificationStatus>('email_input');
  const [email, setEmail] = useState('');

  // Evita actualizar estado si el usuario sale del paso durante `checking`.
  const runId = useRef(0);
  useEffect(() => () => void runId.current++, []);

  const submit = useCallback(async (rawEmail: string): Promise<InstitutionalEmailCheck | null> => {
    const id = ++runId.current;
    const normalized = normalizeEmail(rawEmail);
    setEmail(normalized);
    setStatus('checking');

    // La animación dura al menos CHECKING_MIN_DURATION_MS aunque la
    // comprobación sea instantánea, para que la transición se sienta natural.
    const [result] = await Promise.all([
      checkInstitutionalEmail(normalized),
      new Promise((resolve) => setTimeout(resolve, CHECKING_MIN_DURATION_MS)),
    ]);
    if (id !== runId.current) return null;

    if (!result.ok) {
      setStatus('email_input');
      return result;
    }
    // Con el proveedor real, `outcome` será 'code_sent' y la UI mostrará el
    // paso de código en lugar de la tarjeta de "registrado".
    setStatus(result.outcome);
    return result;
  }, []);

  const proceed = useCallback(() => setStatus('continue'), []);

  const reset = useCallback(() => {
    runId.current++;
    setStatus('email_input');
  }, []);

  return { status, email, submit, proceed, reset };
}
