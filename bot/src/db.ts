import type { ProductoDeLista } from "../../lib/catalogo/texto-lista";
import { db } from "../../lib/db/client";
import { and, eq, gte, lte, sql } from "../../lib/db/consultas";
import {
  clientesRcv,
  configuracion,
  planesRcv,
  productos,
  solicitudesCelulares,
  solicitudesCitas,
  solicitudesRcv,
  suscripcionesPush as tablaPush,
} from "../../lib/db/schema";
import type { Fecha } from "../../lib/financiamiento/fechas";
import type { ClienteRcvConId } from "../../lib/financiamiento/tipos";
import {
  DOC_HORARIO,
  type HorarioAtencion,
  normalizarHorario,
} from "../../lib/horario/tipos";
import type { SuscripcionPush } from "../../lib/notificaciones/tipos";
import { consultarEuroBcv } from "../../lib/rcv/bcv";
import { consultarEuroMercado, type TasasMercado } from "../../lib/rcv/mercado";
import {
  type ConfigRcv,
  DOC_CONFIG_RCV,
  fuenteBsDe,
  fuenteCopDe,
  fuenteUsdDe,
  type PlanRcvConId,
  requisitosEfectivos,
  type SolicitudRcv,
  tasasDe,
} from "../../lib/rcv/tipos";
import type {
  SolicitudCelular,
  SolicitudCita,
} from "../../lib/solicitudes/tipos";

/**
 * Datos de Gaby en Postgres del VPS (migración; antes Firestore con `chatbot-lectura`, D024/D030).
 * Lee catálogo, horario y póliza RCV; escribe las solicitudes del chat, los avisos de vencimiento
 * ya mandados (D033) y borra suscripciones push vencidas (D035). Nada más: el bot no toca
 * productos, clientes (salvo `recordatorio*`) ni configuración. Los límites los ponen los CHECK.
 * Conexión: `DATABASE_URL` (PgBouncer de `kit-db url inversiones_js`).
 */

// ── Lecturas con caché de 60 s (D024) ─────────────────────────────────────

function cacheada<T>(leer: () => Promise<T>, ms = 60_000): () => Promise<T> {
  let cache: { cuando: number; valor: T } | null = null;
  return async () => {
    if (!cache || Date.now() - cache.cuando > ms) {
      cache = { cuando: Date.now(), valor: await leer() };
    }
    return cache.valor;
  };
}

export const leerCatalogo = cacheada(
  async (): Promise<ProductoDeLista[]> =>
    db.select().from(productos).where(eq(productos.activo, true)),
);

async function leerConfiguracion(clave: string) {
  const [fila] = await db
    .select({ valor: configuracion.valor })
    .from(configuracion)
    .where(eq(configuracion.clave, clave));
  return fila?.valor ?? null;
}

export const leerHorario = cacheada(
  async (): Promise<HorarioAtencion> =>
    normalizarHorario(await leerConfiguracion(DOC_HORARIO)),
);

// ── Tasa BCV del euro (D031): 30 min de caché; si falla, la última buena y reintento en 5 min ──

let bcv: { tasa: number | null; cuando: number; ms: number } | null = null;

async function tasaBcv(): Promise<number | null> {
  if (bcv && Date.now() - bcv.cuando < bcv.ms) return bcv.tasa;
  try {
    const { tasa } = await consultarEuroBcv();
    bcv = { tasa, cuando: Date.now(), ms: 30 * 60_000 };
  } catch (e) {
    console.error("No se pudo consultar la tasa BCV; queda la anterior", e);
    bcv = { tasa: bcv?.tasa ?? null, cuando: Date.now(), ms: 5 * 60_000 };
  }
  return bcv.tasa;
}

// ── Tasa de mercado del euro en $ y COP (D036): mismo esquema que la del BCV ──

let mercado: { tasas: TasasMercado | null; cuando: number; ms: number } | null =
  null;

async function tasaMercado(): Promise<TasasMercado | null> {
  if (mercado && Date.now() - mercado.cuando < mercado.ms) return mercado.tasas;
  try {
    mercado = {
      tasas: await consultarEuroMercado(),
      cuando: Date.now(),
      ms: 30 * 60_000,
    };
  } catch (e) {
    console.error(
      "No se pudo consultar la tasa de mercado; queda la anterior",
      e,
    );
    mercado = {
      tasas: mercado?.tasas ?? null,
      cuando: Date.now(),
      ms: 5 * 60_000,
    };
  }
  return mercado.tasas;
}

/** Transportes activos, tasas y requisitos (con los de arranque si faltan). */
export const leerRcv = cacheada(async () => {
  const [planes, valor] = await Promise.all([
    db.select().from(planesRcv).where(eq(planesRcv.activo, true)),
    leerConfiguracion(DOC_CONFIG_RCV),
  ]);
  const c = valor as ConfigRcv | null;
  // Sin la consultada, `tasasDe` usa la última que guardó el panel.
  const usaMercado =
    fuenteUsdDe(c) === "mercado" || fuenteCopDe(c) === "mercado";
  const [bs, m] = await Promise.all([
    fuenteBsDe(c) === "bcv" ? tasaBcv() : null,
    usaMercado ? tasaMercado() : null,
  ]);
  return {
    planes: planes as PlanRcvConId[],
    tasas: tasasDe(c, { bs, usd: m?.usd, cop: m?.cop }),
    requisitos: requisitosEfectivos(c),
  };
});

// ── Solicitudes del chat (D043) ───────────────────────────────────────────

export async function guardarSolicitudRcv(s: SolicitudRcv): Promise<void> {
  const { creadoEn: _, ...datos } = s;
  await db.insert(solicitudesRcv).values({
    ...datos,
    vehiculo: datos.vehiculo ?? null,
    precioCop: datos.precioCop ?? null,
  });
}

export async function guardarSolicitudCelular(
  s: SolicitudCelular,
): Promise<void> {
  const { creadoEn: _, ...datos } = s;
  await db.insert(solicitudesCelulares).values(datos);
}

export async function guardarSolicitudCita(s: SolicitudCita): Promise<void> {
  const { creadoEn: _, ...datos } = s;
  await db.insert(solicitudesCitas).values(datos);
}

// ── Vencimiento de pólizas (D033) ─────────────────────────────────────────

/** Clientes con póliza que vence entre `desde` y `hasta` (incluidas). */
export async function clientesRcvPorVencer(
  desde: Fecha,
  hasta: Fecha,
): Promise<ClienteRcvConId[]> {
  return db
    .select()
    .from(clientesRcv)
    .where(and(gte(clientesRcv.vence, desde), lte(clientesRcv.vence, hasta)));
}

/**
 * Marca el aviso como enviado, solo si el vencimiento sigue siendo el mismo (si el dueño renovó
 * mientras tanto, no se toca). Un solo UPDATE condicional: atómico sin transacción. Devuelve
 * false si no se marcó.
 */
export async function marcarAvisoRcv(
  id: string,
  vence: Fecha,
  campo: "recordatorio30" | "recordatorio3",
): Promise<boolean> {
  const filas = await db
    .update(clientesRcv)
    // El aviso final implica que el del mes ya no hace falta.
    .set(
      campo === "recordatorio3"
        ? { recordatorio3: true, recordatorio30: true }
        : { recordatorio30: true },
    )
    .where(
      and(
        eq(clientesRcv.id, id),
        eq(clientesRcv.vence, vence),
        sql`${clientesRcv[campo]} is not true`,
      ),
    )
    .returning({ id: clientesRcv.id });
  return filas.length > 0;
}

// ── Suscripciones push del panel (D035) ───────────────────────────────────

export async function suscripcionesPush(): Promise<
  (SuscripcionPush & { id: string })[]
> {
  const filas = await db.select().from(tablaPush);
  return filas.map((f) => ({
    id: f.id,
    endpoint: f.endpoint,
    p256dh: f.p256dh,
    auth: f.auth,
    uid: f.userId,
    dispositivo: f.dispositivo,
  }));
}

export async function borrarSuscripcionPush(id: string): Promise<void> {
  await db.delete(tablaPush).where(eq(tablaPush.id, id));
}

/** Para `diagnostico.ts`: a qué base habla (sin la contraseña). */
export function baseDeDatos(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return "(falta DATABASE_URL)";
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port}${u.pathname}`;
  } catch {
    return "(DATABASE_URL no es una URL)";
  }
}
