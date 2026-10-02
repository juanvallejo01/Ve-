import type { Metadata } from "next"

import { LegalPage } from "@/components/layout/legal-page"
import { LEGAL } from "@/lib/legal"

export const metadata: Metadata = {
  title: "Términos y condiciones · Ve!",
  description: "Reglas de uso de Ve!, la red social de universitarios de Cali.",
}

export default function TerminosPage() {
  return (
    <LegalPage title="Términos y condiciones">
      <section>
        <p>
          Al crear una cuenta o usar {LEGAL.appName} aceptas estos términos y nuestra{" "}
          <a href="/privacidad">Política de privacidad</a>. Si no estás de acuerdo, no uses la app.
        </p>
      </section>

      <section>
        <h2>1. Quién puede usar la app</h2>
        <ul>
          <li>Debes tener al menos {LEGAL.minimumAge} años.</li>
          <li>Debes registrarte con un correo institucional vigente de una universidad admitida.</li>
          <li>Solo puedes tener una cuenta y debes usar información veraz.</li>
          <li>Eres responsable de mantener tu contraseña en secreto.</li>
        </ul>
      </section>

      <section>
        <h2>2. Tolerancia cero con contenido inapropiado y abuso</h2>
        <p>
          {LEGAL.appName} no tolera contenido inapropiado ni usuarios abusivos. Está prohibido publicar o enviar:
        </p>
        <ul>
          <li>Acoso, intimidación, amenazas, discursos de odio o discriminación.</li>
          <li>Contenido sexual explícito, desnudos o contenido sexual que involucre a menores.</li>
          <li>Violencia gráfica, autolesiones o promoción de actividades ilegales.</li>
          <li>Suplantación de identidad, perfiles falsos, spam o estafas.</li>
          <li>Datos personales de terceros sin su autorización.</li>
        </ul>
        <p className="mt-3">
          Si incumples estas reglas eliminaremos el contenido y podremos suspender o eliminar tu cuenta sin
          previo aviso.
        </p>
      </section>

      <section>
        <h2>3. Reportes y bloqueos</h2>
        <p>
          Puedes reportar a cualquier usuario desde su perfil y bloquearlo para que no pueda volver a
          interactuar contigo. Revisamos los reportes en un plazo máximo de 24 horas y, si corresponde,
          retiramos el contenido y expulsamos al usuario responsable. También puedes escribirnos a{" "}
          <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
        </p>
      </section>

      <section>
        <h2>4. Tu contenido</h2>
        <p>
          Sigues siendo dueño de lo que publicas. Nos das una licencia no exclusiva y gratuita para alojarlo y
          mostrarlo dentro de la app mientras exista en tu cuenta. Eres responsable de tener los derechos sobre
          lo que publicas.
        </p>
      </section>

      <section>
        <h2>5. Eliminación de la cuenta</h2>
        <p>
          Puedes borrar tu cuenta cuando quieras desde <strong>Perfil → Configuración → Borrar cuenta</strong>.
          La eliminación es definitiva e incluye tu contenido y tus mensajes.
        </p>
      </section>

      <section>
        <h2>6. Disponibilidad y responsabilidad</h2>
        <p>
          La app se ofrece “tal como está”. Hacemos lo posible por mantenerla disponible y segura, pero no
          garantizamos que funcione sin interrupciones. No somos responsables por las interacciones entre
          usuarios fuera de la app; actúa con prudencia al conocer personas.
        </p>
      </section>

      <section>
        <h2>7. Cambios y ley aplicable</h2>
        <p>
          Podemos actualizar estos términos; si el cambio es relevante te avisaremos en la app. Estos términos
          se rigen por las leyes de la República de Colombia.
        </p>
      </section>
    </LegalPage>
  )
}
