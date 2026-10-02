import type { Metadata } from "next"

import { LegalPage } from "@/components/layout/legal-page"
import { LEGAL } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Política de privacidad · Ve!",
  description: "Cómo Ve! recolecta, usa y protege tus datos personales.",
}

export default function PrivacidadPage() {
  return (
    <LegalPage title="Política de privacidad">
      <section>
        <p>
          Esta política explica qué datos personales trata {LEGAL.appName} (“la app”), para qué los usamos y cómo
          puedes ejercer tus derechos, conforme a la Ley 1581 de 2012, el Decreto 1377 de 2013 y demás normas
          colombianas de protección de datos personales.
        </p>
      </section>

      <section>
        <h2>1. Responsable del tratamiento</h2>
        <p>
          El responsable es el equipo de {LEGAL.appName}. Puedes contactarnos en{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </section>

      <section>
        <h2>2. Datos que recolectamos</h2>
        <ul>
          <li>
            <strong>Datos de cuenta:</strong> nombre, apodo, correo institucional, carrera y facultad. Tu
            contraseña se guarda cifrada (hash) y nunca en texto plano.
          </li>
          <li>
            <strong>Datos de perfil que decides publicar:</strong> fotos de perfil y portada, y tu biografía.
          </li>
          <li>
            <strong>Contenido e interacciones:</strong> publicaciones, comentarios, likes, matches y mensajes
            de chat.
          </li>
          <li>
            <strong>Seguridad y moderación:</strong> bloqueos, reportes que haces o recibes y avisos de captura
            de pantalla dentro de los chats.
          </li>
          <li>
            <strong>Datos técnicos de sesión:</strong> tokens de acceso necesarios para mantener tu sesión
            iniciada.
          </li>
        </ul>
        <p className="mt-3">
          No accedemos a tu ubicación, contactos ni micrófono. Solo accedemos a tus fotos o a la cámara cuando
          tú eliges una imagen, y únicamente a esa imagen. No usamos publicidad ni rastreo entre apps, y no
          vendemos tus datos.
        </p>
      </section>

      <section>
        <h2>3. Para qué usamos tus datos</h2>
        <ul>
          <li>Crear y administrar tu cuenta y confirmar que perteneces a una universidad.</li>
          <li>Mostrar tu perfil y tu contenido a otros estudiantes según las reglas de la app.</li>
          <li>Permitir likes, matches y mensajes entre usuarios con match.</li>
          <li>Mantener la comunidad segura: atender reportes, aplicar bloqueos y moderar contenido.</li>
          <li>Enviarte correos operativos, como códigos de verificación o de recuperación de contraseña.</li>
        </ul>
      </section>

      <section>
        <h2>4. Con quién los compartimos</h2>
        <p>
          Otros usuarios ven solo lo que la app muestra públicamente (por ejemplo, tu apodo, fotos y
          publicaciones); tu nombre real solo es visible para quienes hacen match contigo. Para operar la app
          usamos proveedores que tratan datos por nuestra cuenta: alojamiento de base de datos (Neon, en
          Estados Unidos), envío de correos (Resend) y el proveedor donde se aloja el servidor. Esto puede
          implicar transferencia internacional de datos, que autorizas al aceptar esta política. No
          compartimos tus datos con terceros con fines comerciales.
        </p>
      </section>

      <section>
        <h2>5. Conservación y eliminación</h2>
        <p>
          Conservamos tus datos mientras tu cuenta esté activa. Puedes eliminar tu cuenta en cualquier momento
          desde la app en <strong>Perfil → Configuración → Borrar cuenta</strong>. Al hacerlo se eliminan de
          forma definitiva tu cuenta, perfil, fotos, publicaciones, comentarios, likes, matches y mensajes.
          También puedes solicitar la eliminación escribiendo a{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </section>

      <section>
        <h2>6. Tus derechos</h2>
        <p>
          Como titular puedes conocer, actualizar, rectificar y suprimir tus datos, revocar tu autorización y
          solicitar prueba de ella. Responderemos consultas en máximo 10 días hábiles y reclamos en máximo 15
          días hábiles. Si no quedas satisfecho, puedes acudir a la Superintendencia de Industria y Comercio
          (SIC).
        </p>
      </section>

      <section>
        <h2>7. Seguridad</h2>
        <p>
          Usamos conexiones cifradas (HTTPS), contraseñas con hash y almacenamiento seguro del dispositivo para
          tu sesión. Ningún sistema es infalible, pero aplicamos medidas razonables para proteger tu
          información.
        </p>
      </section>

      <section>
        <h2>8. Menores de edad</h2>
        <p>
          La app es solo para personas de {LEGAL.minimumAge} años o más. Si detectamos una cuenta de un menor,
          la eliminaremos.
        </p>
      </section>

      <section>
        <h2>9. Cambios</h2>
        <p>
          Si cambiamos esta política, actualizaremos la fecha de arriba y te avisaremos en la app cuando el
          cambio sea relevante.
        </p>
      </section>
    </LegalPage>
  )
}
