# CACIH · App de afiliación de socios

*Un camino hacia la inversión estratégica*

PWA para registrar nuevos socios ahorrantes en campo y aprobarlos en la oficina.
Base de datos: Supabase, proyecto **cacih** (`yjvhdkwdylrduunkbykw`).

## Archivos

| Archivo | Para qué |
| --- | --- |
| `index.html` | Pantalla y estilos de la app |
| `app.js` | Funcionamiento de la app (desde la versión 1.3) |
| `credito.js` | Solicitud de crédito, fiador solidario y simulador (desde la versión 1.5) |
| `seguridad.js` | Tarifario de tasas, crear usuarios, PIN, cierre a distancia, modo práctica (desde la versión 1.7) |
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

## Versión 1.9 · Compartir por WhatsApp

Suba a GitHub `app.js`, `credito.js` y `sw.js`. En *Parámetros* debe decir **1.9.0**.

- **Bandeja (listados):** *Excel por WhatsApp* y *PDF por WhatsApp* (afiliaciones) y *Excel por WhatsApp* (créditos). Siguen la regla de *Quién puede exportar listados*.
- **Cada solicitud:** *Compartir por WhatsApp* envía la ficha o la solicitud de crédito en PDF.
- **Avisar al socio / Avisar al cliente** (solicitudes ya resueltas): abre el chat con el celular del cliente y un mensaje listo (aprobado con código de socio, o crédito aprobado con monto, plazo, tasa y cuota; o no aprobado, sin dar el motivo por escrito).
- **WhatsApp o WhatsApp Business:** en el celular y en Windows/Mac con Chrome o Edge aparece la ventana de compartir y usted elige cuál. Si el navegador no la tiene, el archivo se descarga y se abre WhatsApp: toque el clip 📎 y adjúntelo desde Descargas.
- Si el PDF tarda en generarse, aparece abajo **Enviar por WhatsApp**: tóquelo para terminar (el navegador exige un toque reciente).
- Cada envío queda en la bitácora de exportaciones como *WhatsApp*.

## Versión 1.8 · Tarifario de tasas y controles

### Instalar la 1.8
1. La base de datos **ya quedó lista**.
2. GitHub → suba `index.html`, `app.js`, `credito.js`, `seguridad.js` y `sw.js`.
3. En *Parámetros* debe decir **1.8.0**.

### Tarifario (pestaña **Tasas**, en la computadora)
- Ya vienen creados 6 tipos de préstamo **sin tasa**: básico, con avales (fiduciario), prendario, hipotecario, de fideicomiso y blando. Escriba las tasas y toque **Guardar tarifario**.
- Por cada tipo: **tasa básica**, **tasa preferencial para socios** (vacía = igual a la básica), mensual o anual, garantía sugerida, montos, plazo máximo, y *Vigente* o *Pausado*.
- Puede agregar más tipos (ej. préstamo de emergencia) o pausarlos sin borrarlos.
- En el teléfono el promotor elige **tipo de préstamo** y **Socio de CACIH / No socio**; la tasa aparece sola y no se puede escribir.
- **El servidor rechaza** cualquier solicitud cuya tasa, monto o plazo no coincida con el tarifario vigente.
- Si el cliente dice ser socio, debe dar su N° de cliente; la oficina ve una alerta si no aparece como socio aprobado.

### Otros cambios
- **Acta del comité**: al aprobar o denegar se pide el N° de acta y los miembros presentes; sale en la hoja impresa.
- **Fiador**: ingreso y gastos obligatorios; la oficina ve qué porcentaje de su disponible sería la cuota, si ya es fiador de otros créditos y si hay **fianza cruzada**.
- **Conozca a su cliente**: vencimiento de la identidad, nacionalidad y pregunta PEP para todo solicitante.
- **Capacidad de pago** recalculada en la oficina con los datos originales. Límite recomendado bajado a **35 %**.
- **Modo práctica** seguro: se apaga solo a las 2 horas, y al final ofrece *Terminar práctica* o *Es un cliente real: enviar*.
- Aviso único a cada promotor para activar el **bloqueo de pantalla** del teléfono.
- Los teléfonos descargan ~1 MB menos al instalar (la herramienta de Excel solo se baja en la oficina).

## Versión 1.7 · Mejoras del análisis

### Instalar la 1.7.1
1. La base de datos **ya quedó lista**.
2. GitHub → suba `index.html`, `app.js`, `credito.js`, `sw.js` y **`seguridad.js`** (nuevo).
3. Abra la app. En *Parámetros* debe decir **1.7.1**.

### Acceso (versión 1.7.1)
- Se entra **solo con correo y contraseña**. Se quitó la verificación con app de códigos.
- **PIN en los teléfonos**: apagado por defecto. Se puede activar en *Parámetros → Pedir PIN en los teléfonos*.

### Crear usuarios desde la app
*Usuarios → + Crear usuario*: nombre, correo, celular, rol y una contraseña temporal (la app la sugiere). La cuenta queda **activa de inmediato** y la app muestra los datos para copiarlos o enviarlos por WhatsApp. La primera vez que la persona entra, la app le pide crear su propia contraseña.

**Restablecer contraseña** (en cada usuario): asigna una contraseña temporal nueva, cierra la app en sus teléfonos y le pide crear una nueva al entrar.

Con esto ya puede **desactivar el registro libre** en Supabase: *Authentication → Sign In / Providers → Allow new users to sign up* = apagado. Así nadie de fuera puede crearse una cuenta.

### Crédito
- **Productos de crédito** (*Parámetros*): nombre, tasa, monto mínimo y máximo, plazo máximo. El promotor elige el producto y no puede cambiar la tasa.
- **Capacidad de pago** (paso 4): ingresos, gastos y otras deudas del hogar. La app calcula el disponible y qué porcentaje es la cuota (límite en *Parámetros*, 40 % por defecto).
- **Una sola solicitud pendiente por identidad.**
- **Relación con CACIH** en la oficina: si es socio/a, otras solicitudes de crédito y si es fiador/a de alguien.
- **Análisis de crédito**: lista de verificación (buró, visita, documentos, referencias, capacidad) que marca la solicitud como *En análisis*.

### Simulador
- Producto, comisión y seguro: muestra el **costo anual total** y el costo total del crédito.
- **Enviar por WhatsApp**: comparte el PDF del plan de pagos.
- Funciona **sin internet** (el PDF también, desde la 1.7). Enviar por WhatsApp necesita señal.

### Seguridad y operación
- **DNI**: revisa el departamento (01–18) y el año de inscripción contra la fecha de nacimiento. Si es inscripción tardía, se confirma con una casilla.
- **Cerrar sesiones** (*Usuarios*): cierra la app y borra lo guardado en los teléfonos de esa persona en cuanto tengan señal.
- **Errores recientes** (*Parámetros*): fallos de envío y de pantalla en los teléfonos.
- **Aviso de versión nueva**: cuando suba una actualización, aparece *Actualizar*.
- **Modo práctica** (botón *Práctica* arriba): llena formularios sin enviarlos. En crédito trae *Llenar con un ejemplo*. Sirve para capacitar promotores.
- En el teléfono, los botones *Atrás / Siguiente* quedan fijos abajo y hay una barra de avance.

### Lo que debe hacer usted en Supabase
- Pasar al **plan Pro** (respaldos diarios, sin pausas).
- *Authentication → Sign In / Providers*: desactivar **Allow new users to sign up** cuando todos los promotores tengan cuenta, y activar la protección de contraseñas filtradas (requiere Pro).

## Versión 1.6 · Simulador de préstamo

Nueva pestaña **Simulador**: monto, plazo, tasa (mensual o anual), pago mensual o quincenal y método (**cuota nivelada** o **capital fijo**). Muestra la cuota, el total de intereses, el total a pagar, la comparación a 6, 12, 18, 24, 36, 48 y 60 meses, y la tabla de pagos con fechas. Si se escribe el ingreso disponible, avisa cuando la cuota pasa del 40 %.

- **Usar en solicitud de crédito** copia las condiciones al paso 1 del crédito.
- En el paso 1 del crédito, **Ver tabla de pagos** abre el simulador con esos datos.
- En la oficina, cada crédito tiene **Plan de pagos** (con las condiciones aprobadas si ya se aprobó).
- **Descargar PDF** / **Imprimir**: plan de pagos para entregar al cliente.

### Instalar la 1.6
GitHub → suba `index.html`, `app.js`, `credito.js` y `sw.js`. No hay cambios en Supabase.

## Versión 1.5 · Solicitud de crédito

Nueva pestaña **Crédito** con el formato "Solicitud de crédito 2025" y la hoja "Datos del fiador solidario". Cualquier persona puede solicitar crédito, sea o no socia; los datos se llenan completos.

### Instalar la 1.5

1. La base de datos **ya quedó lista** (no hay que ejecutar nada en Supabase).
2. GitHub → suba `index.html`, `app.js`, **`credito.js`** (nuevo) y `sw.js`.
3. Cierre y vuelva a abrir la app. En *Parámetros* debe decir **Versión de la app 1.5.0**.

### Pasos del formulario de crédito

1. Condiciones: monto, plazo, tasa (mensual o anual), forma de pago, garantía, destino y deducciones. Calcula la **cuota estimada** y el **valor a recibir**.
2. Datos del cliente · 3. Localización con GPS · 4. Actividades e ingresos, remesas y de dónde pagará
5. Cuentas, vehículos y otros bienes · 6. Referencias y contacto de emergencia · 7. Garantía (1 o 2 fiadores si es fiduciaria)
8. Fiador solidario (solo con garantía fiduciaria) · 9. Fotos, identidad y firmas · 10. Autorización de buró y compromiso del fiador · 11. Revisar y enviar

Funciona sin señal igual que la afiliación: queda en *Mis envíos* y se envía sola.

### En la oficina

*Bandeja* → botón **Créditos**. Cada solicitud se imprime o descarga en PDF (solicitud en 2 hojas + 1 hoja por fiador). El comité registra **Aprobar** (monto, plazo, tasa, forma de pago; la cuota se calcula sola) o **Denegar** (con motivo). El asesor recibe el aviso. *Exportar Excel* sigue la regla de solo administrador.

Folios: **C-00001**, **C-00002**…

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
