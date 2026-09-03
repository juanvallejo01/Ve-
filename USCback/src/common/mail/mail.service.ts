import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { twoFactorCodeEmail } from './templates/two-factor-code.template';
import { passwordResetEmail } from './templates/password-reset.template';

// "Seguridad <no-reply@...>" from an unfamiliar domain is exactly the
// sender-name/domain pattern institutional anti-phishing filters (Google
// Workspace/M365 for Education) tend to silently quarantine — not even to a
// visible spam folder. Using the actual product name instead reads as a
// legitimate transactional sender rather than an impersonation attempt.
const MAIL_FROM = 'Ve! <no-reply@site3.uk>';

// El correo con el OTP es crítico para poder iniciar sesión: si la llamada a
// Resend falla por un problema de red transitorio (DNS, timeout, etc.), se
// reintenta unas veces antes de rendirse, en vez de obligar al usuario a
// pulsar "Reenviar código" manualmente para que el primer envío sí funcione.
const MAX_SEND_ATTEMPTS = 3;
const RETRY_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend;

  // En desarrollo, si no hay una API key real de Resend configurada (o quedó
  // el placeholder del .env.example), no se puede enviar correo. En vez de
  // reventar el login/registro con un 500, se registra el código en consola
  // para poder continuar el flujo 2FA en local. Nunca se activa en producción.
  private readonly devLogOnly: boolean;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('resend.apiKey');
    const nodeEnv = this.configService.get<string>('nodeEnv') || 'development';
    const hasRealKey = !!apiKey && apiKey.startsWith('re_') && !/REEMPLA|tu-api-key|xxxx/i.test(apiKey);
    this.devLogOnly = !hasRealKey && nodeEnv !== 'production';
    this.resend = new Resend(hasRealKey ? apiKey : 're_dev_placeholder');

    if (this.devLogOnly) {
      this.logger.warn(
        'RESEND_API_KEY no configurada — modo dev: los códigos se mostrarán en consola, no se enviará correo.',
      );
    }
  }

  async sendTwoFactorCode(to: string, code: string, userName: string): Promise<void> {
    if (this.devLogOnly) {
      this.logger.warn(`[DEV] Código 2FA para ${to} (${userName}): ${code}`);
      return;
    }

    const { subject, html, text } = twoFactorCodeEmail({ code, userName });

    let lastErrorMessage = 'Error desconocido';

    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: MAIL_FROM,
          to,
          subject,
          html,
          text,
        });

        if (!error) {
          // Resend accepting the request only means it was queued, not that
          // it was actually delivered — log the message id so a "the code
          // never arrived" report can be cross-referenced against Resend's
          // own delivery log/webhook events instead of guessing blindly.
          this.logger.log(`Código 2FA encolado en Resend para ${to} (id: ${data?.id})`);
          return;
        }

        lastErrorMessage = error.message;
      } catch (err: any) {
        // Algunas fallas de red (DNS, timeout) llegan como excepción en vez
        // de como { error } en la respuesta de Resend.
        lastErrorMessage = err?.message || 'Error de red desconocido';
      }

      const isLastAttempt = attempt === MAX_SEND_ATTEMPTS;
      this.logger.warn(
        `Intento ${attempt}/${MAX_SEND_ATTEMPTS} fallido al enviar el código 2FA a ${to}: ${lastErrorMessage}`,
      );

      if (!isLastAttempt) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }

    this.logger.error(
      `No se pudo enviar el código 2FA a ${to} tras ${MAX_SEND_ATTEMPTS} intentos: ${lastErrorMessage}`,
    );
    throw new Error('No se pudo enviar el correo de verificación');
  }
  async sendPasswordResetCode(to: string, code: string, userName: string): Promise<void> {
    if (this.devLogOnly) {
      this.logger.warn(`[DEV] Código de recuperación para ${to} (${userName}): ${code}`);
      return;
    }

    const { subject, html } = passwordResetEmail({ code, userName });

    let lastErrorMessage = 'Error desconocido';

    for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
      try {
        const { error } = await this.resend.emails.send({
          from: MAIL_FROM,
          to,
          subject,
          html,
        });

        if (!error) return; // Enviado correctamente

        lastErrorMessage = error.message;
      } catch (err: any) {
        lastErrorMessage = err?.message || 'Error de red desconocido';
      }

      const isLastAttempt = attempt === MAX_SEND_ATTEMPTS;
      this.logger.warn(
        `Intento ${attempt}/${MAX_SEND_ATTEMPTS} fallido al enviar el código de recuperación a ${to}: ${lastErrorMessage}`,
      );

      if (!isLastAttempt) {
        await sleep(RETRY_DELAY_MS * attempt);
      }
    }

    this.logger.error(
      `No se pudo enviar el código de recuperación a ${to} tras ${MAX_SEND_ATTEMPTS} intentos: ${lastErrorMessage}`,
    );
    throw new Error('No se pudo enviar el correo de recuperación');
  }
}
