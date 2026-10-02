# Publicación de Ve! en App Store y Google Play

Guía para llevar Ve! (`uscConnet` + `USCback` + `USClanding`) a las tiendas sin rechazos.
Última revisión: 2 de octubre de 2026.

- **Parte 1** — lo que ya quedó resuelto en el código.
- **Parte 2** — lo que falta y solo puedes hacer tú (cuentas, servidores, formularios), en orden.
- **Parte 3** — textos listos para copiar en las tiendas.
- **Parte 4** — causas típicas de rechazo y cómo quedan cubiertas.

---

## Parte 1 · Ya resuelto en el código

| Tema | Qué se hizo | Dónde |
|---|---|---|
| Identidad de la app | Nombre visible **Ve!**, ícono y splash propios (fondo negro, "Ve!" ámbar). Se eliminaron los íconos de la plantilla de Expo, que causan rechazo. | `uscConnet/app.json`, `uscConnet/assets/images/` |
| Android | Paquete `com.juanvallejo01.uscconnet`, ícono adaptativo y monocromo, permiso de micrófono bloqueado (la app no lo usa). | `uscConnet/app.json` |
| Permisos iOS | Textos en español que explican para qué se usan la cámara y las fotos (Apple rechaza textos genéricos). | `uscConnet/app.json` (plugin `expo-image-picker`) |
| Cifrado | `ITSAppUsesNonExemptEncryption: false`: la app solo usa HTTPS estándar, así que no hay que llenar el formulario de exportación en cada build. | `uscConnet/app.json` |
| Builds | `eas.json` con perfiles `preview` (pruebas internas, APK) y `production` (tiendas). El número de build lo lleva EAS solo. | `uscConnet/eas.json` |
| Dependencias | Paquetes actualizados a las versiones exactas del SDK 57 (incluye el arreglo de una regresión de Hermes que podía cerrar la app en builds de release). `expo-doctor`: 21/21. | `uscConnet/package.json` |
| Borrar cuenta | Ahora es **definitivo**: borra usuario, fotos, posts, comentarios, likes, matches y mensajes, y ajusta el ranking de los demás. Antes solo marcaba `deletedAt`, guardaba todos los datos y dejaba el correo bloqueado para siempre. Requisito de Apple 5.1.1(v), de Google Play y de la Ley 1581. | `USCback/src/modules/users/users.service.ts` |
| Seguridad | Se eliminó `POST /api/auth/create-admin`, que era **público**: cualquiera podía crearse una cuenta de administrador. | `USCback/src/modules/auth/` |
| Términos y privacidad | Páginas `/terminos` y `/privacidad` en la landing (Ley 1581, tolerancia cero con contenido abusivo, reportes en 24 h, borrado de cuenta, edad mínima). Enlazadas desde el registro y desde Perfil → Configuración. | `USClanding/app/terminos`, `USClanding/app/privacidad`, `uscConnet/src/constants/legal.ts` |
| Contenido de usuarios | Ya existían: reportar usuario, bloquear, borrar cuenta, y el panel admin con reportes reales (`adminApi.getReports`). Es lo que exige Apple 1.2. | app y backend |
| Cuenta de revisión | Script que crea una cuenta **ya verificada** (no pide código por correo) con 2 matches y chats de ejemplo, para que el revisor pruebe todo. | `USCback/prisma/create-review-account.ts` (`npm run review:account`) |
| Estabilidad del backend | Si Neon cortaba una conexión inactiva, el backend **se caía entero** (error `pg` sin manejar). Ahora se registra el aviso, se reintenta una vez y el tiempo de conexión pasó de 2 s a 10 s para cuando Neon "despierta". | `USCback/src/common/database/postgres.service.ts` |
| Contraseñas | Mínimo 8 caracteres, una mayúscula y un carácter especial. Lo exige el backend al registrarse y al restablecer la contraseña, y la app lo muestra en vivo mientras escribes. El login no cambia: las cuentas existentes siguen entrando. | `USCback/src/modules/auth/dto/auth.dto.ts`, `uscConnet/src/lib/password-policy.ts` |
| Protección del seed | `prisma/seed.ts` borra toda la base; ahora se niega a correr con `NODE_ENV=production`. | `USCback/prisma/seed.ts` |
| Registro | Paso 1: correo institucional, con la verificación de mínimo 5 s; el correo ya no se puede cambiar después. Paso 2: perfil. Se quitó la nota "verificación disponible próximamente": Apple rechaza funciones marcadas como incompletas, y en producción el código por correo sí está activo. | `uscConnet/src/app/(auth)/index.tsx` |
| Web | La sesión funciona también en navegador (localStorage) y CORS acepta varios orígenes. No afecta a las tiendas, pero sirve para pruebas. | `uscConnet/src/lib/api-client.ts`, `USCback/src/main.ts` |
| Material para Google Play | Ícono 512×512 y gráfico destacado 1024×500. | `docs/store-assets/` |

---

## Parte 2 · Lo que falta (en este orden)

### Paso 0 · Decisiones y datos que debes completar

- [ ] **Correo de soporte real** en `USClanding/lib/legal.ts` (`contactEmail`). Hoy dice `soporte@REEMPLAZAR-DOMINIO.com`. Las dos tiendas lo muestran y Apple lo revisa.
- [ ] **Edad mínima**: los términos dicen **18 años**. Para una app con chat entre desconocidos y "match" es lo más seguro ante las tiendas. Si quieres permitir menores, avísame: cambian los términos, la clasificación por edad y los controles requeridos.
- [ ] **Compromiso de moderación**: los términos prometen revisar reportes en **24 horas** (Apple lo exige). Alguien con rol `ADMIN` debe revisar **Admin → Moderación** a diario.
- [ ] Nombre del responsable legal (persona o empresa) para las fichas de las tiendas.

### Paso 1 · Desplegar el backend con HTTPS

La app de producción **no puede** apuntar a `localhost` ni a `http://`: iOS bloquea HTTP y el revisor no tiene tu computador.

1. Elige un hosting que acepte Docker (Railway, Render o Fly.io). `USCback/Dockerfile` ya sirve tal cual.
2. Variables de entorno de producción:

   | Variable | Valor |
   |---|---|
   | `NODE_ENV` | `production` (activa el 2FA por correo y oculta los errores internos) |
   | `PORT` | el que indique el hosting |
   | `DATABASE_URL` / `DIRECT_URL` | Neon. **Recomendado: una base o rama nueva solo para producción**, no la de desarrollo. |
   | `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | **nuevos y largos**: `openssl rand -base64 48`. No reutilices los de desarrollo. |
   | `CORS_ORIGIN` | dominio de la landing, p. ej. `https://ve.tudominio.com` (la app móvil no necesita CORS) |
   | `RESEND_API_KEY` | clave real de Resend |
   | `REDIS_HOST` / `REDIS_PORT` | opcional. Sin Redis el backend funciona igual. El cliente actual **no admite contraseña**: para Redis administrado con clave hay que ajustar `redis.service.ts`. |

3. Aplica las migraciones **sin** usar el seed:
   ```bash
   cd USCback
   DATABASE_URL="<prod>" DIRECT_URL="<prod-directa>" npx prisma migrate deploy
   ```
   ⚠️ **Nunca** corras `npm run prisma:seed` contra producción: borra todo. Ahora se bloquea con `NODE_ENV=production`, pero no lo intentes.
4. **Resend**: los correos salen desde `no-reply@site3.uk` (`USCback/src/common/mail/mail.service.ts`). Ese dominio debe estar **verificado en Resend**. Si no, Resend solo entrega al dueño de la cuenta y nadie más podrá registrarse.
5. **Neon gratis se duerme** cuando no hay uso; durante esta sesión una petición falló al "despertar". Si el revisor ve un error, rechazan por "la app no funciona" (2.1). Mientras dure la revisión, usa un plan pago o desactiva el *auto-suspend* del proyecto de producción.
6. Verifica: `curl https://TU-API/api/health` → `"status":"ok"`.

### Paso 2 · Publicar la landing

1. Despliega `USClanding` (Vercel es lo más directo para Next.js) con tu dominio.
2. Confirma que abren `https://TU-SITIO/terminos` y `https://TU-SITIO/privacidad`.

### Paso 3 · Cuentas de desarrollador

- [ ] **Apple Developer Program**: USD 99 al año. Como persona natural, en la tienda aparecerá tu nombre como vendedor.
- [ ] **Google Play Console**: USD 25, un solo pago.
- [ ] **Expo** (gratis): `npx eas-cli login`.

> ⚠️ **Google Play, cuentas personales nuevas**: antes de publicar en producción debes hacer una **prueba cerrada con al menos 12 testers durante 14 días seguidos**. Empieza esto cuanto antes; es lo que más tarda.

### Paso 4 · Configurar EAS (una sola vez)

```bash
cd uscConnet
npx eas-cli login
npx eas-cli init          # vincula el proyecto y escribe el projectId en app.json

# URLs de producción (se inyectan en el build, no van al repo)
npx eas-cli env:create --environment production --name EXPO_PUBLIC_API_URL  --value https://TU-API/api --visibility plaintext
npx eas-cli env:create --environment production --name EXPO_PUBLIC_SITE_URL --value https://TU-SITIO     --visibility plaintext
# Repite con --environment preview para builds de prueba.
```

Sin estas dos variables la app compilaría apuntando a `localhost` y no funcionaría en ningún teléfono.

### Paso 5 · Cuenta de revisión (en producción)

```bash
cd USCback
DATABASE_URL="<prod>" REVIEW_ACCOUNT_PASSWORD='una-clave-segura' npm run review:account
```

Crea `revision.app@usc.edu.co` ya verificada (inicia sesión **sin** código por correo), con dos compañeros de demo, match y chat. Puedes correrlo varias veces: no duplica nada y actualiza la clave. Antes de enviar a revisión, **prueba ese login en un teléfono real con el build de producción**.

### Paso 6 · Generar y enviar los builds

```bash
cd uscConnet
npx eas-cli build --platform ios     --profile production
npx eas-cli build --platform android --profile production
npx eas-cli submit --platform ios     --latest   # sube a App Store Connect / TestFlight
npx eas-cli submit --platform android --latest   # sube a Play Console (empieza en prueba interna/cerrada)
```

Antes, prueba un build `preview` en teléfonos reales: registro completo con un correo institucional (llega el código), login, likes, match, chat, subir foto, reportar, bloquear y borrar cuenta.

Para cada nueva versión, sube `"version"` en `app.json` (p. ej. `1.0.1`). El número de build lo incrementa EAS.

### Paso 7 · Ficha en App Store Connect

- **Nombre**: "Ve!" (si está ocupado, p. ej. "Ve! Universitarios Cali").
- **Categoría**: Redes sociales.
- **URL de privacidad**: `https://TU-SITIO/privacidad`. **URL de soporte**: la landing o un `mailto`.
- **Clasificación por edad**: en el cuestionario declara **contenido generado por usuarios** y **mensajería entre usuarios**. Como los términos exigen 18 años, elige **18+**.
- **Privacidad de la app** ("etiquetas nutricionales"): ver Parte 3.
- **Capturas**: iPhone 6.9" (1320×2868), mínimo 3. No hacen falta de iPad: la app está marcada solo para iPhone.
- **Información para la revisión**: usuario y clave de la cuenta de revisión + las notas de la Parte 3.

### Paso 8 · Ficha en Google Play Console

- **Ícono** `docs/store-assets/play-icon-512.png`. **Gráfico destacado** `docs/store-assets/play-feature-graphic-1024x500.png`.
- **Capturas de teléfono**: mínimo 2.
- **Política de privacidad**: `https://TU-SITIO/privacidad`.
- **Acceso a la app**: "Todo o parte de la funcionalidad está restringida", con la cuenta de revisión.
- **Seguridad de los datos**: ver Parte 3.
- **Eliminación de cuenta**: Google pide un enlace web. Usa `https://TU-SITIO/privacidad` (sección 5 explica cómo borrar en la app o por correo).
- **Clasificación de contenido** (IARC): marca interacción entre usuarios y contenido generado por usuarios.
- **Público objetivo**: 18 años o más.

---

## Parte 3 · Textos listos para copiar

### Descripción corta (Play, máx. 80 caracteres)
> La red social de los universitarios de Cali: conecta, comparte y haz match.

### Descripción
> Ve! es la red social exclusiva para estudiantes universitarios de Cali. Regístrate con el correo institucional de tu universidad y conecta con estudiantes reales de tu campus y de otras universidades de la ciudad.
>
> • Publica fotos y novedades, y comenta lo que pasa en el campus.
> • Da like a otros estudiantes; si el like es mutuo, hacen match y se abre el chat.
> • Sube en el ranking de la comunidad.
> • Tu nombre real solo lo ven tus matches; los demás ven tu apodo.
> • Comunidad segura: reporta o bloquea a cualquier usuario, y borra tu cuenta cuando quieras.

### Notas para el revisor de Apple (en inglés)
> Ve! is a social network restricted to university students in Cali, Colombia. New accounts require an institutional email (e.g. @usc.edu.co) and a verification code sent to that inbox, so please use the demo account below, which is already verified and has sample matches and chats:
>
> Email: revision.app@usc.edu.co
> Password: <REVIEW_ACCOUNT_PASSWORD>
>
> User-generated content safeguards (Guideline 1.2): users must accept the Terms (zero tolerance for objectionable content) at sign-up; any user can be reported from their profile ("Report") and blocked ("Block"); reports are reviewed by our moderators within 24 hours in the admin panel. Account deletion: Profile → Settings → Delete account (permanent).

### Privacidad de Apple ("App Privacy")
Rastreo (*tracking*): **No**. Todos los datos van **vinculados al usuario** y su propósito es **Funcionalidad de la app**:

| Tipo de dato | Se recolecta |
|---|---|
| Información de contacto → Nombre, Correo electrónico | Sí |
| Contenido del usuario → Fotos, Otro contenido (posts, comentarios), Correos o mensajes de texto (chat) | Sí |
| Identificadores → ID de usuario | Sí |
| Otros datos → carrera / facultad | Sí |
| Ubicación, contactos, salud, finanzas, historial de navegación, diagnósticos | No |

### Seguridad de los datos (Google Play)
- ¿Recolecta datos? **Sí**. ¿Comparte con terceros? **No** (Neon y Resend son proveedores que procesan por cuenta tuya; Google no lo cuenta como "compartir").
- Cifrado en tránsito: **Sí**. El usuario puede pedir que se borren sus datos: **Sí**.
- Datos: Información personal (nombre, correo, otra información: carrera), Fotos, Mensajes (otros mensajes en la app), Actividad en la app (otro contenido generado por el usuario, interacciones). Todos obligatorios para la funcionalidad, salvo las fotos (opcionales).

---

## Parte 4 · Causas de rechazo típicas y su estado

| Riesgo | Norma | Estado |
|---|---|---|
| Íconos o splash de plantilla | Apple 2.3.8 / 4.0 | ✅ Reemplazados |
| Funciones "próximamente" o incompletas | Apple 2.1 | ✅ Nota eliminada |
| No se puede entrar sin acceso al correo | Apple 2.1 | ✅ Cuenta de revisión sin código (Paso 5) |
| Servidor caído o lento durante la revisión | Apple 2.1 | ⚠️ Backend en HTTPS y Neon sin auto-suspend (Paso 1) |
| No se puede borrar la cuenta en la app | Apple 5.1.1(v) | ✅ Borrado definitivo |
| Contenido de usuarios sin reportar/bloquear/términos | Apple 1.2 | ✅ Reportar, bloquear, términos con tolerancia cero |
| Sin política de privacidad o enlace roto | Apple 5.1.1 / Play | ⚠️ Páginas listas; falta publicar la landing (Paso 2) y el correo real (Paso 0) |
| Textos de permisos genéricos | Apple 5.1.1 | ✅ En español y específicos |
| Datos de la ficha que no cuadran con la app | Apple 5.1.2 / Play | ✅ Formularios de la Parte 3 basados en el código real |
| Prueba cerrada no cumplida (cuentas nuevas) | Play | ⚠️ 12 testers × 14 días (Paso 3) |

---

## Pendientes conocidos (no bloquean la revisión)

- En el panel admin, las pestañas **Usuarios**, **Analítica** y "publicaciones reportadas" muestran **datos de ejemplo** (`uscConnet/src/constants/admin-mock-data.ts`). Los **reportes de usuarios sí son reales**. El revisor no entra al panel admin, pero conviene conectarlas a la API (`adminApi.getUsers`, etc.).
- Reportar se hace sobre **usuarios**, no sobre publicaciones individuales. Es suficiente para Apple 1.2; reportar posts sería una mejora.
- El build de **Android** no se probó en este equipo (solo iOS en simulador). Pruébalo con un build `preview` en un teléfono real.

## Correr en local

```bash
./START.sh                         # backend :3002 + Metro :8081
cd uscConnet && npx expo run:ios   # app en el simulador
```

Datos de prueba (solo desarrollo, `npm run prisma:seed` **borra la base**): `superadmin@usc.edu` / `AdminUSC2026!` y `student1…20@usc.edu` / `UserUSC2026!`.
