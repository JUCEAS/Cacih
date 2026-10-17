# CACIH · App de afiliación de socios

*Un camino hacia la inversión estratégica*

PWA para registrar nuevos socios ahorrantes en campo y aprobarlos en la oficina.
Base de datos: Supabase, proyecto **cacih** (`yjvhdkwdylrduunkbykw`).

## Archivos

| Archivo | Para qué |
| --- | --- |
| `index.html` | Toda la app |
| `sw.js` | Permite abrirla sin señal |
| `manifest.webmanifest` | Nombre e ícono al instalarla |
| `icon-192.png`, `icon-512.png` | Íconos |

## Publicar en GitHub Pages (una sola vez)

1. En GitHub (usuario JUCEAS) cree el repositorio **CACIH**, público.
2. *Add file → Upload files*: suba los 5 archivos de la tabla. *Commit changes*.
3. *Settings → Pages*: Source = *Deploy from a branch*, rama `main`, carpeta `/ (root)`. *Save*.
4. En 1–2 minutos queda en **https://juceas.github.io/CACIH/**

Para actualizar la app: suba de nuevo `index.html` (y `sw.js` si cambió).

## Configurar el acceso en Supabase (una sola vez)

En supabase.com → proyecto **cacih** → *Authentication*:

1. *URL Configuration*:
   - **Site URL**: `https://juceas.github.io/CACIH/`
   - **Redirect URLs**: agregue `https://juceas.github.io/CACIH/**`
2. *Sign In / Providers → Email*: decida sobre **Confirm email**.
   - Activado: cada promotor debe abrir el enlace que le llega al correo antes de entrar.
   - Desactivado: entra de inmediato, pero igual queda bloqueado hasta que usted lo active en la app.

## Primer uso — IMPORTANTE

**La primera cuenta que se registre queda como Administrador.**
Regístrese usted primero, apenas publique la app.

1. Abra la app → *Crear cuenta* → su nombre, correo y contraseña.
2. Cada promotor crea su cuenta desde su teléfono.
3. Usted entra a **Usuarios**, marca *Activo* y asigna el rol:
   - **Promotor**: llena y envía solicitudes.
   - **Oficina**: además ve la bandeja, imprime, aprueba o rechaza.
   - **Administrador**: además gestiona usuarios y parámetros.
4. En **Parámetros** ajuste montos de inscripción, aportación y ahorro mínimo.

## Instalar en el teléfono (Android)

Abra el enlace en Chrome → menú ⋮ → *Agregar a la pantalla principal* / *Instalar app*.

## Cómo funciona

- El promotor llena los pasos A–H, toma foto del DNI y captura la firma.
- Sin señal, la solicitud se guarda en el teléfono y se envía sola al volver la conexión (*Mis envíos* muestra lo pendiente).
- En la oficina la solicitud aparece en **Bandeja** como *Pendiente*.
- Se revisa, se imprime en tamaño carta, se aprueba con el número de acta y se genera el código **CR-AAAA-NNNN**.
- Toda acción queda en el historial de la solicitud.

## Seguridad

- Cada usuario solo puede hacer lo que su rol permite; las reglas están en la base de datos, no solo en la pantalla.
- El promotor ve únicamente sus solicitudes. Las de los demás no le llegan.
- Fotos de DNI y firmas en almacenamiento privado; la oficina las ve con enlaces que vencen en 15 minutos.
- Nadie puede cambiar el estado de una solicitud ni el código de socio fuera de los botones Aprobar/Rechazar.
- Un mismo DNI no puede tener dos solicitudes vigentes.
- La clave que aparece dentro de `index.html` es la clave pública de Supabase; está hecha para ir en la app.
  Nunca pegue ahí la clave `service_role`.

## Pendiente para la siguiente fase

- Registro de depósitos y libreta de ahorro por socio.
- Conciliación contra el estado de cuenta bancario.
- Reportes (socios por comunidad, ahorro total).
