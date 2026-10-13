# Integración con el chatbot

El panel y el chatbot comparten **una colección de Firestore**: `productos`. Lo que el cliente
guarda en el panel es lo que el chatbot responde (D005). Este archivo es el contrato entre los
dos: si cambias el modelo (`lib/catalogo/tipos.ts`), actualiza aquí y anota la decisión.

## Contrato de datos

Colección `productos`, un documento por equipo (D002).

| Campo | Tipo | Qué significa |
|---|---|---|
| `marca` | string | Nombre de la marca en mayúsculas (`HONOR`, `REDMI`…). **No es una lista fija** (D025): el cliente agrega, renombra y borra marcas desde el panel. |
| `nombre` | string | Modelo como lo ve el cliente final: `"600 Elite"`, `"Note 15"`. No incluye la marca. |
| `variante` | string | RAM/almacenamiento en GB: `"8/256"`. Puede venir vacío. |
| `inicial` | number | Pago inicial en USD. Normalmente entero; puede traer decimales. |
| `cuota` | number | Monto de **cada** cuota quincenal en USD. |
| `numeroCuotas` | number (entero) | Cuántas cuotas quincenales (hoy 6). Precio total = `inicial + cuota × numeroCuotas`. |
| `cantidad` | number (entero) | Unidades disponibles. `0` = agotado. |
| `activo` | boolean | `false` = oculto: el chatbot **no** debe ofrecerlo (no está borrado). |
| `orden` | number | Orden dentro de la marca (menor primero). |
| `actualizadoEn` | Timestamp | Fecha de la última edición (puede faltar en datos viejos). |
| `actualizadoPor` | string | UID de quien editó, o `"seed"` si viene de la carga inicial. |

- **Id del documento:** los del catálogo inicial son estables (`honor-600-elite-8-256`); los
  productos creados desde el panel usan id automático. No dependas del formato del id: busca
  por `marca` + `nombre` + `variante`.
- **Marcas:** viven en la colección `marcas` (id = nombre, `{ nombre, actualizadoEn,
  actualizadoPor }`). El chatbot no necesita leerla: basta con el campo `marca` de cada
  producto. Al renombrar una marca, el panel actualiza `marca` en todos sus productos a la vez.
  Ordénalas alfabéticamente (`compararMarcas` de `lib/catalogo/tipos.ts`), como el panel.
- **Montos:** son números, no texto. Para mostrarlos como el cliente (`125$`) usa
  `formatearMonto` de `lib/catalogo/texto-lista.ts`.
- **Qué NO cambiar sin coordinar:** nombres de campo, tipos (precios como número), valores de
  `marca` en mayúsculas (sin asumir una lista cerrada) y el significado de `activo`/`cantidad`. Las reglas de Firestore
  (`firestore.rules`) validan estos mismos campos: un cambio aquí exige cambiarlas también.
- **El chatbot solo lee.** Toda escritura pasa por el panel (las reglas exigen sesión de admin y
  dejan la huella `actualizadoPor`/`actualizadoEn`).

## Cómo leer desde el servidor del chatbot

El chatbot **no puede** usar el SDK web de Firebase sin sesión: las reglas solo dejan leer
`productos` a usuarios con documento en `admins/{uid}` (D003). Lee con el **Admin SDK**
(`firebase-admin`) desde su servidor, que no pasa por las reglas.

### Credenciales: cuenta de servicio del bot (D024, D030)

1. Google Cloud Console del proyecto › IAM y administración › Cuentas de servicio › Crear.
   Nombre sugerido: `chatbot-lectura`.
2. Rol: **Cloud Datastore User** (`roles/datastore.user`). Desde D030 el bot guarda las
   solicitudes de póliza RCV; antes bastaba Datastore Viewer. No uses la cuenta por defecto
   de Firebase Admin (además de Firestore, administra Auth y todo el proyecto).
3. Claves › Agregar clave › JSON. Guárdala en el gestor de secretos del hosting del chatbot
   (variable de entorno o archivo montado). **Nunca** en git.
4. En el servidor del chatbot: `GOOGLE_APPLICATION_CREDENTIALS=/ruta/a/la/clave.json`.

### Consulta

```ts
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import type { ProductoConId } from "./tipos"; // copia de lib/catalogo/tipos.ts

initializeApp(); // toma GOOGLE_APPLICATION_CREDENTIALS y su project_id
const db = getFirestore();

async function leerCatalogo(): Promise<ProductoConId[]> {
  const snap = await db
    .collection("productos")
    .where("activo", "==", true)
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProductoConId);
}
```

`where("activo", "==", true)` usa un índice de un solo campo (automático): no hace falta
crear índices compuestos. El orden de presentación (marca y `orden`) se aplica en memoria.

### Lista de precios en el formato del cliente

`lib/catalogo/texto-lista.ts` es TypeScript puro (sin Firebase): cópialo al proyecto del
chatbot junto con `lib/catalogo/tipos.ts`, o reprodúcelo. Genera el mismo texto que el
cliente manda por chat:

```ts
import { textoListaDePrecios } from "./texto-lista";

const productos = await leerCatalogo(); // ya filtrado por activo
const texto = textoListaDePrecios(productos, new Date());
// Lista de precios actualizada (01/10)
//
// HONOR
// 600 Elite 8/256
// Inic 125$.   6 quincenas 63$
//
// Magic 8 Lite 8/256
// Inic 130$.   6 quincenas 65$
// ...
//
//
// INFINIX
// ...
```

Opciones (D021):

- `agotados: "marcar"` (por defecto) añade ` (agotado)` a los de `cantidad == 0`;
  `"ocultar"` los quita. **Ojo:** el catálogo inicial arranca con `cantidad = 0`; hasta que el
  cliente cargue el stock en el panel, con `"marcar"` todo saldrá agotado.
- `zonaHoraria` (por defecto `America/Caracas`) para el `DD/MM` del título.

### Buscar un modelo

Para "¿cuánto está el Redmi Note 15?": filtra en memoria sobre el catálogo ya leído
(son pocas decenas de documentos), sin distinguir mayúsculas ni acentos. Gana el modelo con más
palabras en común, para que "note 15" no traiga también el "Redmi 15".

```ts
import { lineasDeProducto, type ProductoDeLista } from "./texto-lista";

const palabras = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^a-z0-9/]+/)
    .filter(Boolean);

/** Productos cuyo nombre completo aparece en la consulta; gana el de más palabras. */
function buscar<T extends ProductoDeLista>(productos: T[], consulta: string): T[] {
  const q = new Set(palabras(consulta));
  const conPuntaje = productos.map((p) => {
    const nombre = palabras(p.nombre);
    // La marca es opcional en la consulta ("note 15" sirve); el nombre completo, no.
    const conMarca = palabras(p.marca).every((w) => q.has(w)) ? 1 : 0;
    const puntaje = nombre.every((w) => q.has(w)) ? nombre.length + conMarca : 0;
    return { p, puntaje };
  });
  const max = Math.max(0, ...conPuntaje.map((c) => c.puntaje));
  return max === 0 ? [] : conPuntaje.filter((c) => c.puntaje === max).map((c) => c.p);
}

const encontrados = buscar(productos, "cuanto esta el redmi note 15");
const respuesta = encontrados.map((p) => lineasDeProducto(p).join("\n")).join("\n");
// Note 15 8/256
// Inic 80$.   6 quincenas 40$
```

Si la consulta trae la variante (`8/256`), filtra además por `p.variante`.

## ¿Leer en cada mensaje o suscribirse? (D024)

**Recomendado: leer y guardar en caché 60 segundos.** El catálogo es pequeño y cambia pocas
veces al día; una caché corta en memoria hace que un cambio del panel se vea en el chatbot en
menos de un minuto, sin una lectura por mensaje (Firestore cobra por documento leído).

```ts
let cache: { cuando: number; productos: ProductoConId[] } | null = null;

async function catalogo() {
  if (!cache || Date.now() - cache.cuando > 60_000) {
    cache = { cuando: Date.now(), productos: await leerCatalogo() };
  }
  return cache.productos;
}
```

**Alternativa: suscripción en vivo** con `onSnapshot`, si el chatbot corre como proceso
persistente (no serverless). Los cambios llegan al instante y solo se cobra lo que cambia, pero
en funciones serverless la conexión se corta y no compensa.

```ts
let enVivo: ProductoConId[] = [];
db.collection("productos")
  .where("activo", "==", true)
  .onSnapshot(
    (snap) => {
      enVivo = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ProductoConId);
    },
    (error) => console.error("Suscripción a productos caída", error),
  );
```

## Probar en local contra el emulador

```bash
bun run emulators        # en otra terminal
bun run seed:emulador
```

En el código del chatbot, antes de `initializeApp`:
`FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` e `initializeApp({ projectId: "demo-inversiones-js" })`.

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
  teléfono (`ESTE` = su número de WhatsApp) → se guarda en `solicitudesRcv` y se avisa al
  asesor. Todo se edita en el panel, sección **Póliza RCV** (`/rcv`); ver abajo.
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
| `solicitudesRcv/{id}` | `nombre`, `correo`, `telefono`, `whatsapp`, `categoria`, `planId`, `clase`, `descripcion`, `vehiculo` (solo placas extranjeras: el vehículo a cotizar), `precioEur`, `precioUsd`, `precioBs`, `precioCop` (los del momento; `precioCop` puede faltar en las viejas), `financiamiento` (bool o `null`), `creadoEn` | Bot (Admin SDK) |

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
- **Escritura del bot:** la cuenta `chatbot-lectura` pasa a **Cloud Datastore User**
  (`roles/datastore.user`) para poder crear `solicitudesRcv`. El código solo escribe ahí.
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
  transacción que comprueba que `vence` no cambió) y avisa a los asesores. Renovar en el panel
  corre `vence` un año y pone los dos campos en `false`. Sale aunque Gaby esté apagada.

## Avisos push al panel (D035)

El panel es instalable (PWA: `app/manifest.ts`, `public/sw.js`). La campana de la cabecera
guarda la suscripción Web Push del teléfono en `suscripcionesPush/{sha256(endpoint)}`
(`endpoint`, `p256dh`, `auth`, `uid`, `dispositivo`, `creadaEn`). Cuando Gaby agenda una cita,
el bot (`bot/src/avisos-push.ts`, librería `web-push`) manda un aviso a cada suscripción; al
tocarlo se abre el evento en Google Calendar. Las que responden 404/410 se borran.

Configuración: `bunx web-push generate-vapid-keys` → la pública en el panel
(`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) y en el bot (`VAPID_PUBLIC_KEY`), la privada solo en el bot
(`VAPID_PRIVATE_KEY`) y `VAPID_SUBJECT=mailto:…`. En iPhone los avisos solo llegan con el panel
agregado a la pantalla de inicio (iOS 16.4+).

### Por resolver (póliza RCV)

- **Financiamiento de minibuses:** el bot solo registra si lo quiere; faltan las condiciones
  (inicial, cuotas) si se quieren mostrar en el chat.
