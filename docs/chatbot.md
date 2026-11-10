# Integración con el chatbot

El panel y el chatbot comparten **una base Postgres en el VPS** (`inversiones_js`, D044; antes
Firestore). Lo que el cliente guarda en el panel es lo que el chatbot responde (D005). Este
archivo es el contrato entre los dos: si cambias el modelo (`lib/db/schema.ts` y
`lib/catalogo/tipos.ts`), actualiza aquí y anota la decisión.

## Colecciones de antes → tablas

Las secciones de abajo usan todavía los nombres de colección: cada una es una tabla con los
mismos campos, en snake_case en la base y en camelCase en el código (Drizzle,
`casing: "snake_case"`).

| Antes (Firestore) | Tabla | Quién escribe |
|---|---|---|
| `productos` | `productos` | Panel |
| `marcas/{nombre}` | `marcas` (PK `nombre`) | Panel |
| `admins/{uid}` | `admins` (PK `user_id` → `user.id`) | `bun run admin:crear` |
| `configuracion/horario`, `configuracion/rcv` | `configuracion` (PK `clave`, `valor jsonb`) | Panel (`rcv`); `horario` a mano |
| `planesRcv` | `planes_rcv` | Panel |
| `solicitudesRcv`, `solicitudesCelulares`, `solicitudesCitas` | `solicitudes_rcv`, `solicitudes_celulares`, `solicitudes_citas` | Bot |
| `clientesCelulares`, `clientesRcv` | `clientes_celulares`, `clientes_rcv` (`pagos jsonb`) | Panel; el bot solo marca `recordatorio30/3` |
| `suscripcionesPush` | `suscripciones_push` (`endpoint` único, `user_id`) | Panel; el bot borra las vencidas |

Los límites que validaban `firestore.rules` son **CHECK** en la base: se aplican también a lo
que escribe el bot. Las comprobaciones de acceso del panel están en `lib/data/` (`comoAdmin`).

## Contrato de datos

Tabla `productos`, una fila por equipo (D002).

| Campo | Tipo | Qué significa |
|---|---|---|
| `marca` | text (FK → `marcas.nombre`) | Nombre de la marca en mayúsculas (`HONOR`, `REDMI`…). **No es una lista fija** (D025): el cliente agrega, renombra y borra marcas desde el panel. |
| `nombre` | text | Modelo como lo ve el cliente final: `"600 Elite"`, `"Note 15"`. No incluye la marca. |
| `variante` | text | RAM/almacenamiento en GB: `"8/256"`. Puede venir vacío. |
| `inicial` | double precision | Pago inicial en USD. Normalmente entero; puede traer decimales. |
| `cuota` | double precision | Monto de **cada** cuota quincenal en USD. |
| `numero_cuotas` | integer | Cuántas cuotas quincenales (hoy 6). Precio total = `inicial + cuota × numeroCuotas`. |
| `cantidad` | integer | Unidades disponibles. `0` = agotado. |
| `activo` | boolean | `false` = oculto: el chatbot **no** debe ofrecerlo (no está borrado). |
| `orden` | double precision | Orden dentro de la marca (menor primero). |
| `actualizado_en` | timestamptz | Fecha de la última edición (puede faltar en datos viejos). |
| `actualizado_por` | text | Id de quien editó (`user.id`), o `"seed"` si viene de la carga inicial. |

- **Id:** texto. Los del catálogo inicial son estables (`honor-600-elite-8-256`); los ids de
  Firestore se conservaron al migrar y los nuevos son UUID. No dependas del formato: busca por
  `marca` + `nombre` + `variante`.
- **Marcas:** tabla `marcas`. El chatbot no necesita leerla: basta con `marca` de cada
  producto. Renombrar una marca actualiza sus productos en cascada (FK `ON UPDATE CASCADE`).
  Ordénalas alfabéticamente (`compararMarcas` de `lib/catalogo/tipos.ts`), como el panel.
- **Montos:** son números, no texto. Para mostrarlos como el cliente (`125$`) usa
  `formatearMonto` de `lib/catalogo/texto-lista.ts`.
- **Qué NO cambiar sin coordinar:** nombres de columna, tipos (precios como número), valores
  de `marca` en mayúsculas (sin asumir una lista cerrada) y el significado de
  `activo`/`cantidad`. Un cambio va como migración de Drizzle (`bun run db:generate`).
- **El chatbot no edita el catálogo.** Toda edición pasa por el panel, que deja la huella
  `actualizado_por`/`actualizado_en`.

## Cómo leer desde el servidor del chatbot

Gaby usa la misma base que el panel con `DATABASE_URL` (PgBouncer del VPS, `ssh kit-vps kit-db
url inversiones_js`) y el mismo esquema (`lib/db/schema.ts`). Todo su acceso está en
`bot/src/db.ts`:

```ts
import { db } from "../../lib/db/client";
import { eq } from "../../lib/db/consultas"; // operadores de la misma copia de drizzle-orm
import { productos } from "../../lib/db/schema";

const activos = await db.select().from(productos).where(eq(productos.activo, true));
```

Los operadores se importan de `lib/db/consultas.ts`, no de `drizzle-orm`: en la imagen del bot
`lib/` y `bot/` comparten un solo `node_modules`, y dos copias de drizzle-orm dan tipos
incompatibles. El orden de presentación (marca y `orden`) se aplica en memoria.

## Caché de 60 s (D024)

El catálogo es pequeño y cambia pocas veces al día: `bot/src/db.ts` guarda cada lectura 60 s
en memoria, así un cambio del panel se ve en el chatbot en menos de un minuto sin una consulta
por mensaje.

## Probar en local

`bot/tests/db.test.ts` corre `bot/src/db.ts` contra la migración real en PGlite (en memoria,
sin VPS). Para probar el bot entero contra una base, `DATABASE_URL` de `inversiones_js_dev`
(`bun run vps:env inversiones_js_dev` en la raíz) y la cuenta de Calendar.

## El bot: Gaby (`bot/`, D027)

El chatbot vive en este mismo repo, en `bot/`: un servicio Bun/TypeScript que corre en el VPS
junto a Evolution API (WhatsApp). Usa directamente `lib/catalogo/` (lista de equipos) y
`lib/horario/` (huecos para citas). Despliegue paso a paso: `bot/DESPLIEGUE.md`.

- **Flujo:** `bot/src/flujo.ts` (menú 1 loterías → cita en Google Calendar; 2 teléfono →
  lista numerada sin agotados → al elegir, requisitos: cédula, RIF actualizado y 2 referencias
  familiares; 3 RCV → ver abajo). Textos con 5 variantes cada uno en `bot/src/textos.ts`.
- **Póliza RCV (D029, D030):** "Adquirir o comercializar póliza RCV" → tipo de transporte
  (1 público, 2 privado, 3 placas extranjeras) → lista de los transportes activos de esa
  categoría (si hay uno solo, como placas extranjeras, va directo) → precio en €, $ y Bs. +
  requisitos → si el plan tiene financiamiento y es público, lo pregunta → nombre, correo y
  teléfono (`ESTE` = su número de WhatsApp) → se guarda en `solicitudesRcv`. Todo se edita en
  el panel, sección **Póliza RCV** (`/rcv`); ver abajo.
- **Solicitudes (D043):** Gaby **no** les escribe a los asesores por WhatsApp (riesgo de
  baneo del número). Al terminar cada flujo guarda la solicitud y manda un aviso push al panel;
  se ven en la pestaña **Solicitudes** (`/solicitudes/celulares`, `/rcv`, `/citas`). Ver abajo.
- **Horario de atención:** documento `configuracion/horario` (tipo `HorarioAtencion` de
  `lib/horario/tipos.ts`). Si no existe, el bot usa `HORARIO_POR_DEFECTO` (lun–vie 9–17,
  sáb 9–13, citas de 60 min, mínimo 3 h de anticipación).
- **Citas:** se crean en el calendario `GOOGLE_CALENDAR_ID` (compartido con la cuenta
  `chatbot-lectura`) con `extendedProperties.private.origen = "gaby"`. Los recordatorios por
  WhatsApp (24 h y 2 h antes) se leen de ahí: si el dueño mueve o borra la cita en Calendar,
  el bot lo respeta.

## Póliza RCV (D030, D031, D034, D036)

Se edita en el panel (`/rcv`). Modelo en `lib/rcv/tipos.ts`; el bot lo lee con caché de 60 s.

| Dónde | Campos | Quién escribe |
|---|---|---|
| `planesRcv/{id}` | `clase`, `descripcion`, `precioEur` (number, o `null` = "Solicitar cotización"), `categorias` (`publico`/`privado`, al menos una; datos de antes pueden traer `extranjeras`, que se ignora), `financiamiento` (bool), `activo` (bool), `orden` (number), huella | Panel |
| `configuracion/rcv` | `tasaUsd` (1 € = X $), `tasaBs` (1 € = X Bs.; con BCV, la última consultada como respaldo), `tasaCop` (1 € = X COP), `fuenteBs` (`"bcv"` o `"manual"`; sin el campo = manual), `fuenteUsd`/`fuenteCop` (`"mercado"` o `"manual"`; sin el campo = manual, D036), `requisitosGenerales` (lista de texto, la misma para todo vehículo, D034; `requisitos` por categoría es de antes y el panel lo borra al guardar), huella | Panel |
| `solicitudesRcv/{id}` | `nombre`, `correo`, `telefono`, `whatsapp`, `categoria`, `planId`, `clase`, `descripcion`, `vehiculo` (solo placas extranjeras: el vehículo a cotizar), `precioEur`, `precioUsd`, `precioBs`, `precioCop` (los del momento; `precioCop` puede faltar en las viejas), `financiamiento` (bool o `null`), `creadoEn` | Bot |

- **Precios:** el euro es fijo por transporte; dólares y bolívares = `precioEur × tasa`,
  redondeados a 2 decimales; pesos colombianos sin céntimos (`cotizar` de
  `lib/rcv/cotizacion.ts`). Sin tasas de $ y Bs. el chat muestra solo euros; sin `tasaCop`,
  solo omite los pesos.
- **Tasa BCV (D031):** con `fuenteBs: "bcv"` el bot consulta la tasa oficial del euro en
  DolarAPI (`https://ve.dolarapi.com/v1/euros/oficial`, campo `promedio`) con caché de 30 min.
  Si la API falla, usa la última buena o, si no tiene, `tasaBs` (el panel la refresca cada vez
  que lo abren y el BCV publicó otra).
- **Tasa de mercado (D036):** con `fuenteUsd`/`fuenteCop: "mercado"` el bot toma 1 € en $ y COP
  de ExchangeRate-API (`https://open.er-api.com/v6/latest/EUR`, `rates.USD`/`rates.COP`) o, si
  falla, de `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/eur.json`,
  con caché de 30 min. Si ambas fallan, usa `tasaUsd`/`tasaCop` (respaldo que refresca el panel).
- **Requisitos (D034):** una sola lista para todos los vehículos. Si `configuracion/rcv` no
  trae `requisitosGenerales`, el bot usa `REQUISITOS_RCV_POR_DEFECTO` (cédula, título o
  carnet de circulación o certificado de origen, correo, teléfono y dirección).
- **Placas extranjeras (D034):** no tiene planes ni precio fijo. El chat muestra los
  requisitos, pide el vehículo (tipo, marca, modelo, año) y luego nombre, correo y teléfono.
  La solicitud se guarda con `planId: "cotizacion-extranjera"`, precios `null` y `vehiculo`.
- **Sin planes que mostrar (D043):** si no se pudieron leer los planes, la solicitud se guarda
  igual con `planId: "sin-planes"`, `correo: ""`, `telefono` = su WhatsApp y precios `null`.
- **Escritura del bot:** con `DATABASE_URL` de la misma base crea las solicitudes
  (`solicitudes_rcv`, `solicitudes_celulares`, `solicitudes_citas`); los CHECK limitan lo que
  entra. La cuenta `chatbot-lectura` ya solo se usa para Calendar.
- Seed: `bun run seed:emulador` y `bun run seed:produccion` cargan la tabla del cliente
  (`lib/rcv/planes-iniciales.ts`) y sus tasas implícitas (1 € = 1,1193 $ = 979,0788 Bs.).

## Clientes con financiamiento y vencimiento de pólizas (D032, D033)

Se editan en el panel (`/clientes`). Modelo en `lib/financiamiento/tipos.ts`. Fechas como texto
`"AAAA-MM-DD"` (día de Caracas).

| Dónde | Campos | Quién escribe |
|---|---|---|
| `clientesCelulares/{id}` | `nombre`, `cedula`, `telefono`, `equipo`, `notas`, `pagos` (`{ inicial, frecuencia: semanal/quincenal/mensual, cuotas: [{ numero, vence, monto, pagada, pagadaEl }] }`), huella | Panel |
| `clientesRcv/{id}` | `nombre`, `cedula`, `telefono`, `correo`, `direccion`, `vehiculo`, `placa`, `notas`, `emision`/`vence` (`null` = aún sin emitir; `vence` = emisión + 1 año), `recordatorio30`/`recordatorio3` (bool), `pagos` (como arriba, o `null` = de contado), huella | Panel; el bot solo marca `recordatorio30`/`recordatorio3` |

- **Recordatorios de vencimiento (D033):** cada hora, entre 9:00 y 19:00 de Caracas, el bot
  busca los `clientesRcv` con `vence` en los próximos 30 días. Cuando faltan ≤ 30 días manda el
  aviso del mes; cuando faltan ≤ 3 días, el final. Marca el campo **antes** de enviar (en una
  transacción que comprueba que `vence` no cambió) y manda un aviso push al panel (no por
  WhatsApp a los asesores, D043). Renovar en el panel
  corre `vence` un año y pone los dos campos en `false`. Sale aunque Gaby esté apagada.

## Solicitudes del chat (D043)

Modelo en `lib/solicitudes/tipos.ts`. Solo las escribe el bot; el panel las lee y
las borra en `/solicitudes`. Las de póliza RCV siguen en `solicitudesRcv` (arriba).

| Dónde | Campos | Cuándo |
|---|---|---|
| `solicitudesCelulares/{id}` | `nombre` (perfil de WhatsApp, puede ser `""`), `whatsapp`, `equipo` (texto, o `null` si no se le pudo mostrar la lista), `creadoEn` | Elige un equipo, o falla el catálogo |
| `solicitudesCitas/{id}` | `nombre`, `whatsapp`, `estado` (`agendada` / `sin-horarios` / `error-agenda`), `horario` (etiqueta del turno o `null`), `direccion` (o `null`), `creadoEn` | Cita creada en Calendar, o hay que cuadrarla a mano |

`ASESOR_NUMEROS` sigue existiendo solo para que esos números manden `gaby on`/`gaby off`.

## Avisos push al panel (D035)

El panel es instalable (PWA: `app/manifest.ts`, `public/sw.js`). La campana de la cabecera
guarda la suscripción Web Push del teléfono en `suscripcionesPush/{sha256(endpoint)}`
(`endpoint`, `p256dh`, `auth`, `uid`, `dispositivo`, `creadaEn`). Cuando Gaby agenda una cita,
el bot (`bot/src/avisos-push.ts`, librería `web-push`) manda un aviso a cada suscripción; al
tocarlo se abre el evento en Google Calendar. También avisa de cada solicitud nueva (lleva a
su pestaña de `/solicitudes`, D043) y de cada recordatorio de vencimiento enviado. Las que
responden 404/410 se borran.

Configuración: `bunx web-push generate-vapid-keys` → la pública en el panel
(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) y en el bot (`VAPID_PUBLIC_KEY`), la privada solo en el bot
(`VAPID_PRIVATE_KEY`) y `VAPID_SUBJECT=mailto:…`. En iPhone los avisos solo llegan con el panel
agregado a la pantalla de inicio (iOS 16.4+).

### Por resolver (póliza RCV)

- **Financiamiento de minibuses:** el bot solo registra si lo quiere; faltan las condiciones
  (inicial, cuotas) si se quieren mostrar en el chat.
