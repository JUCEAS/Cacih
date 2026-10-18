# CACIH · App de afiliación de socios

*Un camino hacia la inversión estratégica*

PWA para registrar nuevos socios ahorrantes en campo y aprobarlos en la oficina.
Base de datos: Supabase, proyecto **cacih** (`yjvhdkwdylrduunkbykw`).

## Archivos

| Archivo | Para qué |
| --- | --- |
| `index.html` | Pantalla y estilos de la app |
| `app.js` | Funcionamiento de la app (desde la versión 1.3) |
| `logo-cacih.png`, `logo-icono.png` | Logo de CACIH (desde la versión 1.4) |
| `vendor/` | Librerías de apoyo, incluidas en la app (6 archivos) |
| `sw.js` | Permite abrirla sin señal |
| `manifest.webmanifest` | Nombre e ícono al instalarla |
| `icon-192.png`, `icon-512.png` | Íconos |

## Publicar en GitHub Pages (una sola vez)

1. En GitHub (usuario JUCEAS) cree el repositorio **CACIH**, público.
2. *Add file → Upload files*: suba todos los archivos de la tabla, incluida la carpeta `vendor` completa (arrástrela). *Commit changes*.
3. *Settings → Pages*: Source = *Deploy from a branch*, rama `main`, carpeta `/ (root)`. *Save*.
4. En 1–2 minutos queda en **https://juceas.github.io/CACIH/**

Para actualizar la app: suba de nuevo los archivos que cambiaron.

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

## Exportar (versión 1.1)

En **Bandeja**, según el filtro y la búsqueda que tenga puestos:

- **Exportar Excel**: un archivo con dos hojas. *Solicitudes* trae una fila por persona y todas las columnas de la ficha, con filtros activos. *Resumen* trae los totales por estado y el ahorro inicial de las aprobadas.
- **Exportar PDF**: un reporte horizontal con el listado, listo para la Junta o el banco.

Dentro de cada solicitud:

- **Descargar PDF**: la ficha completa en una hoja carta, con la firma.
- **Imprimir ficha**: la abre en el diálogo de impresión.

## Avisos automáticos (versión 1.1)

Cada persona activa los avisos **una vez en cada dispositivo** con el botón **Activar avisos** (arriba, junto a Salir).
Llega primero un aviso de prueba.

| Quién | Recibe un aviso cuando… |
| --- | --- |
| Oficina y Administrador | Un promotor envía una solicitud nueva |
| Promotor | La oficina aprueba o rechaza una de sus solicitudes |

- Tocar el aviso abre la solicitud o *Mis envíos*.
- Llegan aunque la app esté cerrada (Android y computadora con Chrome o Edge).
- **iPhone:** primero hay que instalar la app (Compartir → Agregar a inicio) y activar los avisos desde la app instalada.
- Si el navegador bloqueó los avisos, se permiten desde el candado junto a la dirección.
- Al tocar **Salir**, ese dispositivo deja de recibir avisos.

## Versión 1.4 · Formato oficial de CACIH

La app y la ficha impresa siguen el formato en papel "Ficha de registro de ingreso" de CACIH (secciones 1 a 11, mismos textos legales y logo real).

### Instalar la 1.4

1. Supabase → **SQL Editor** → pegue y ejecute `actualizacion-v1.4.sql` (permite registrar actualizaciones de datos).
2. GitHub → suba `index.html`, `app.js`, `sw.js`, `logo-cacih.png` y `logo-icono.png`.
3. Cierre y vuelva a abrir la app. En *Parámetros* debe decir **Versión de la app 1.4.0**.

### Pasos del formulario

1. Datos generales (tipo de ficha: Socio o Ahorro con propósito; Nueva o Actualización; nombres en 4 casillas, conocido como, documento, país emisor, nacionalidades, EE. UU.)
2. Localización (dirección detallada, teléfono fijo, 2 celulares, tiempo de residir, GPS)
3. Actividad económica (profesión, oficio, ocupación; preguntas de comerciante o de empleado según el caso)
4. Información financiera (fuentes de ingreso, remesas, ahorro inicial y cuota)
5. PEP en los últimos 4 años y vínculos con el consejo o empleados de CACIH
6. Referencias familiar, personal y bancaria (más cónyuge)
7. Beneficiarios
8. Documentos: foto, documento y firma
9. Declaraciones: notificaciones, vinculación, actualización, certificación, origen de fondos y estatutos
10. Revisar y enviar

### Actualización de datos

Si el socio ya existe, elija **Actualización** y escriba su Cliente Nº. Al aprobarla, la oficina no genera un código nuevo.

### Encabezado de la ficha

Nombre legal, dirección, teléfonos y correo se cambian en *Parámetros*.

## Versión 1.3 · Ficha ampliada y seguridad reforzada

### Instalar la 1.3

1. Supabase → **SQL Editor** → pegue y ejecute `actualizacion-v1.3.sql`.
2. GitHub → suba `index.html`, `app.js`, `sw.js` y la carpeta `vendor` completa.
3. Cierre y vuelva a abrir la app. En *Parámetros* debe decir **Versión de la app 1.3.0**.

### Datos nuevos de la ficha

- **A:** tipo de documento (DNI, carné de residente o pasaporte), vencimiento (no acepta documentos vencidos), nacionalidad y lugar de nacimiento.
- **B:** dónde se llenó la solicitud y **ubicación GPS** de la vivienda (obligatoria si se llena en la casa).
- **C:** negocio o empleador, **cónyuge** (si es casado/a o en unión libre) y si es **familiar de un directivo**.
- **E:** **dos referencias personales**.
- **F:** **foto del rostro** del solicitante y **firma a ruego**: si no sabe firmar, pone huella y firma un testigo con nombre y DNI.

### Seguridad nueva

- Al tocar **Salir** se borra del teléfono todo lo guardado (borrador, cola sin enviar, fotos). Si hay solicitudes sin enviar, la app avisa antes.
- **Oficina y Administrador** se desconectan solos tras 15 minutos sin uso (ajustable en *Parámetros*). Un minuto antes aparece un aviso.
- **Exportar listados** (Excel y PDF): por defecto solo el administrador. Cada exportación, descarga de ficha e impresión queda registrada.
- Las librerías van dentro de la app; ya no se carga código de servidores externos. Una política de seguridad (CSP) impide que el navegador ejecute código de otro origen.
- Contraseñas nuevas: mínimo 10 caracteres, con letras y números.
- Las cuentas nuevas siempre quedan como Promotor pendiente de activar.

### Configuración que debe hacer usted en Supabase

En supabase.com → proyecto **cacih** → **Authentication**:

1. **Contraseñas** (*Sign In / Providers → Email*, o *Policies* según la versión del panel):
   - *Minimum password length*: **10**.
   - *Password requirements*: **letras y números**.
   - *Leaked password protection*: actívela si su plan la incluye (bloquea contraseñas filtradas en internet).
2. **Registro de cuentas nuevas** (*Sign In / Providers → Allow new users to sign up*):
   - Déjelo **activo** mientras sus promotores crean sus cuentas.
   - Cuando ya estén todos, **desactívelo**. Para un promotor nuevo, créelo usted en *Authentication → Users → Add user* (marque *Auto Confirm User*) y actívelo en la app.
3. **Respaldos:** el plan gratuito no incluye respaldos descargables, y **pausa el proyecto si pasa 7 días sin uso**.
   - Mientras sea gratuito: cada viernes exporte el Excel con el filtro *Todas* y guárdelo en un lugar seguro (por ejemplo, Google Drive con acceso restringido).
   - Cuando la caja opere con dinero real, pase al **plan Pro**: respaldos diarios y sin pausas.

### Pendiente para una próxima versión

- Verificación en dos pasos (código en Google Authenticator) para Oficina y Administrador.
- Registro de depósitos, recibos y libreta de ahorro.

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
