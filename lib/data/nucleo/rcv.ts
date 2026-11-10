import { asc, desc, eq, sql } from "drizzle-orm";
import { configuracion, planesRcv, solicitudesRcv } from "@/lib/db/schema";
import type { Db } from "@/lib/db/tipos";
import {
  CATEGORIAS_RCV,
  type CamposPlanRcv,
  type ConfigRcv,
  DOC_CONFIG_RCV,
  FUENTES_BS,
  FUENTES_MERCADO,
  type PlanRcvConId,
  type SolicitudRcvConId,
} from "@/lib/rcv/tipos";
import { ErrorDatos, MENSAJE_BORRADO } from "../errores";
import { conTextos } from "../normalizar";
import {
  esBool,
  esNumero,
  esTexto,
  exigir,
  exigirId,
  soloClaves,
} from "../validar";

/** Póliza RCV (D030, D031, D034, D036): `planRcvValido` y `configRcvValida` de las reglas. */

const CAMPOS_PLAN = [
  "clase",
  "descripcion",
  "precioEur",
  "categorias",
  "financiamiento",
  "activo",
  "orden",
] as const;

function limpiarPlan(entrada: unknown, completo: boolean) {
  const c = soloClaves<CamposPlanRcv & { orden: number }>(entrada, CAMPOS_PLAN);
  if (completo)
    exigir(
      CAMPOS_PLAN.filter((k) => k !== "orden").every((k) => k in c) &&
        "precioEur" in c,
    );
  if (c.clase !== undefined) exigir(esTexto(c.clase));
  if (c.descripcion !== undefined) exigir(esTexto(c.descripcion));
  if ("precioEur" in c) exigir(c.precioEur === null || esNumero(c.precioEur));
  if (c.categorias !== undefined)
    exigir(
      Array.isArray(c.categorias) &&
        c.categorias.every((x) => CATEGORIAS_RCV.includes(x)),
    );
  if (c.financiamiento !== undefined) exigir(esBool(c.financiamiento));
  if (c.activo !== undefined) exigir(esBool(c.activo));
  if (c.orden !== undefined) exigir(esNumero(c.orden));
  return c;
}

const huella = (uid: string) => ({
  actualizadoPor: uid,
  actualizadoEn: new Date(),
});

export async function listarPlanesRcv(db: Db): Promise<PlanRcvConId[]> {
  return db
    .select()
    .from(planesRcv)
    .orderBy(asc(planesRcv.orden), asc(planesRcv.clase));
}

export async function crearPlanRcv(
  db: Db,
  uid: string,
  campos: unknown,
  orden: unknown,
): Promise<void> {
  const c = limpiarPlan(campos, true) as CamposPlanRcv;
  exigir(esNumero(orden));
  await db
    .insert(planesRcv)
    .values({ ...c, orden: orden as number, ...huella(uid) });
}

export async function actualizarPlanRcv(
  db: Db,
  uid: string,
  id: unknown,
  cambios: unknown,
): Promise<void> {
  const c = limpiarPlan(cambios, false);
  const filas = await db
    .update(planesRcv)
    .set({ ...c, ...huella(uid) })
    .where(eq(planesRcv.id, exigirId(id)))
    .returning({ id: planesRcv.id });
  if (filas.length === 0) throw new ErrorDatos("not-found", MENSAJE_BORRADO);
}

export async function borrarPlanRcv(db: Db, id: unknown): Promise<void> {
  await db.delete(planesRcv).where(eq(planesRcv.id, exigirId(id)));
}

/* ── configuracion/rcv ───────────────────────────────────────────────────────────────────── */

export async function leerConfigRcv(db: Db): Promise<ConfigRcv | null> {
  const [fila] = await db
    .select()
    .from(configuracion)
    .where(eq(configuracion.clave, DOC_CONFIG_RCV));
  if (!fila) return null;
  return {
    ...(fila.valor as ConfigRcv),
    actualizadoEn: fila.actualizadoEn,
    actualizadoPor: fila.actualizadoPor,
  };
}

const tasa = (v: unknown, max: number) =>
  v === undefined || (esNumero(v) && v > 0 && v <= max);

/** Mismos límites que `configRcvValida`. */
function validarCambiosConfig(c: Record<string, unknown>) {
  exigir(tasa(c.tasaUsd, 1000));
  exigir(tasa(c.tasaBs, 1_000_000_000));
  exigir(tasa(c.tasaCop, 1_000_000));
  exigir(
    c.fuenteBs === undefined ||
      FUENTES_BS.includes(c.fuenteBs as (typeof FUENTES_BS)[number]),
  );
  for (const f of [c.fuenteUsd, c.fuenteCop])
    exigir(
      f === undefined ||
        FUENTES_MERCADO.includes(f as (typeof FUENTES_MERCADO)[number]),
    );
  if (c.requisitosGenerales !== undefined) {
    const r = c.requisitosGenerales;
    exigir(
      Array.isArray(r) &&
        r.length >= 1 &&
        r.length <= 20 &&
        r.every((x) => esTexto(x) && x.length <= 200),
    );
  }
}

/**
 * Fusiona `cambios` en `configuracion/rcv` (como `setDoc(..., { merge: true })`). `quitar`
 * borra claves (como `deleteField()`).
 */
async function fusionarConfig(
  db: Db,
  uid: string,
  cambios: Record<string, unknown>,
  quitar: string[] = [],
): Promise<void> {
  validarCambiosConfig(cambios);
  const parche = JSON.stringify(cambios);
  let nuevo = sql`coalesce(${configuracion.valor}, '{}'::jsonb) || ${parche}::jsonb`;
  for (const k of quitar) nuevo = sql`(${nuevo}) - ${k}::text`;
  await db
    .insert(configuracion)
    .values({ clave: DOC_CONFIG_RCV, valor: cambios, ...huella(uid) })
    .onConflictDoUpdate({
      target: configuracion.clave,
      set: { valor: nuevo, ...huella(uid) },
    });
}

export async function guardarTasas(
  db: Db,
  uid: string,
  entrada: unknown,
): Promise<void> {
  const t = soloClaves<{
    usd: number | null;
    bs: number | null;
    cop: number | null;
    fuenteBs: string;
    fuenteUsd: string;
    fuenteCop: string;
  }>(entrada, ["usd", "bs", "cop", "fuenteBs", "fuenteUsd", "fuenteCop"]);
  const cambios: Record<string, unknown> = {
    fuenteBs: t.fuenteBs,
    fuenteUsd: t.fuenteUsd,
    fuenteCop: t.fuenteCop,
  };
  // null = la API no respondió: no se toca la guardada.
  if (t.usd != null) cambios.tasaUsd = t.usd;
  if (t.bs != null) cambios.tasaBs = t.bs;
  if (t.cop != null) cambios.tasaCop = t.cop;
  await fusionarConfig(db, uid, cambios);
}

export async function guardarRespaldos(
  db: Db,
  uid: string,
  entrada: unknown,
): Promise<void> {
  const r = soloClaves<Record<string, number>>(entrada, [
    "tasaBs",
    "tasaUsd",
    "tasaCop",
  ]);
  await fusionarConfig(db, uid, r);
}

/** Una lista para todos los vehículos (D034); borra la de por categoría de antes. */
export async function guardarRequisitos(
  db: Db,
  uid: string,
  requisitos: unknown,
): Promise<void> {
  await fusionarConfig(db, uid, { requisitosGenerales: requisitos }, [
    "requisitos",
  ]);
}

/* ── solicitudes_rcv (las escribe el bot) ─────────────────────────────────────────────────── */

const TEXTOS_SOLICITUD = [
  "nombre",
  "correo",
  "telefono",
  "whatsapp",
  "categoria",
  "planId",
  "clase",
  "descripcion",
] as const;

export async function listarSolicitudesRcv(
  db: Db,
  maximo = 200,
): Promise<SolicitudRcvConId[]> {
  const filas = await db
    .select()
    .from(solicitudesRcv)
    .orderBy(desc(solicitudesRcv.creadoEn))
    .limit(maximo);
  return filas.map(
    (f) =>
      ({
        ...conTextos(f, TEXTOS_SOLICITUD),
        vehiculo: f.vehiculo ?? undefined,
      }) as SolicitudRcvConId,
  );
}
