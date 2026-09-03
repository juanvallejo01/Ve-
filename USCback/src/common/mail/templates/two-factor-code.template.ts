/**
 * Plantilla del correo de verificación en dos pasos (2FA).
 *
 * Reglas de compatibilidad con clientes de correo (Outlook, Gmail, Apple Mail):
 * - Layout con tablas, no flexbox/grid (Outlook no los soporta).
 * - Todos los estilos en línea (`style="..."`), nada de <style> externo/bloque
 *   fiable, ya que muchos clientes lo eliminan.
 * - El efecto "glassmorphism" (fondo translúcido + blur) se aplica vía
 *   `background-color: rgba(...)` y `backdrop-filter`, que Apple Mail / Gmail
 *   web sí soportan, pero Outlook de escritorio no — por eso el contenedor
 *   siempre lleva un `background-color` sólido de respaldo como base, así el
 *   correo se ve bien incluso donde el blur no se renderiza.
 */

const ACCENT_RED = "#E1233D"
const TEXT_DARK = "#18181B"
const TEXT_MUTED = "#71717A"
const BORDER_LIGHT = "#EAEAEA"
const BG_PAGE = "#F5F5F5"

export function twoFactorCodeEmail(params: { code: string; userName: string }): {
  subject: string
  html: string
  text: string
} {
  const { code, userName } = params

  return {
    subject: "Tu código de verificación",
    // A plain-text part isn't just a fallback for text-only clients — many
    // spam filters penalize HTML-only (no multipart/alternative) messages,
    // and this one arrives at institutional inboxes with already-elevated
    // scrutiny (see MAIL_FROM's comment in mail.service.ts).
    text: `Hola ${userName}, usa este código para completar tu inicio de sesión en Ve!: ${code}\n\nEste es un mensaje automático de seguridad, por favor no respondas a este correo.`,
    html: `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tu código de verificación</title>
  </head>
  <body style="margin:0; padding:0; background-color:${BG_PAGE}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG_PAGE};">
      <tr>
        <td align="center" style="padding: 40px 16px;">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; width:100%;">

            <!-- Wordmark -->
            <tr>
              <td align="center" style="padding-bottom: 24px;">
                <span style="font-size:22px; font-weight:800; color:${TEXT_DARK}; letter-spacing:-0.5px;">Ve!</span>
              </td>
            </tr>

            <!-- Glass card -->
            <tr>
              <td style="
                background-color: rgba(255,255,255,0.92);
                background-color: #FFFFFF;
                -webkit-backdrop-filter: blur(20px);
                backdrop-filter: blur(20px);
                border: 1px solid ${BORDER_LIGHT};
                border-radius: 24px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04);
                padding: 40px 36px;
              ">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center">
                      <p style="margin:0 0 8px; font-size:19px; font-weight:700; color:${TEXT_DARK};">
                        Verificación de inicio de sesión
                      </p>
                      <p style="margin:0 0 28px; font-size:14px; line-height:1.6; color:${TEXT_MUTED};">
                        Hola ${escapeHtml(userName)}, usa este código para completar tu inicio de sesión.
                      </p>
                    </td>
                  </tr>

                  <!-- OTP code -->
                  <tr>
                    <td align="center" style="padding-bottom: 24px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="
                        background-color: rgba(225,35,61,0.06);
                        border: 1px solid rgba(225,35,61,0.18);
                        border-radius: 16px;
                      ">
                        <tr>
                          <td style="padding: 18px 28px;">
                            <span style="
                              font-family: 'SF Mono', 'Courier New', Courier, monospace;
                              font-size: 34px;
                              font-weight: 700;
                              letter-spacing: 10px;
                              color: ${ACCENT_RED};
                            ">${escapeHtml(code)}</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <tr>
                    <td align="center" style="padding-bottom: 4px;">
                      <p style="margin:0; font-size:13px; color:${TEXT_MUTED};">
                        Este código expira en <strong style="color:${TEXT_DARK};">10 minutos</strong>.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding-top: 28px; border-top: 1px solid ${BORDER_LIGHT}; margin-top: 24px;">
                      <p style="margin:24px 0 0; font-size:12.5px; line-height:1.6; color:${TEXT_MUTED};">
                        Si no intentaste iniciar sesión, ignora este mensaje — tu cuenta sigue segura y nadie podrá
                        acceder sin este código.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding-top: 24px;">
                <p style="margin:0; font-size:12px; color:${TEXT_MUTED};">
                  Este es un mensaje automático de seguridad, por favor no respondas a este correo.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
