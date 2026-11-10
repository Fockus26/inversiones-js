import { eq } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { conTextos, esPlanPagos } from "../data/normalizar";
import {
  admins,
  clientesCelulares,
  clientesRcv,
  configuracion,
  marcas,
  planesRcv,
  productos,
  solicitudesCelulares,
  solicitudesCitas,
  solicitudesRcv,
  suscripcionesPush,
} from "./schema";

/**
 * Documento de Firestore → fila de Postgres (migración al VPS, D044). Puro: lo usan
 * `scripts/exportar-firestore.ts` y sus tests. Conserva los ids y convierte los Timestamp a
 * Date. Los textos que falten llegan como "" (igual que la lectura tolerante del panel); lo
 * que no se puede arreglar sin inventar datos lo rechazan los CHECK y el script lo reporta.
 */

type Datos = Record<string, unknown>;

/** Timestamp de firebase-admin (o cualquier cosa con `toDate`) → Date; si no, null. */
export function aFecha(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (v && typeof (v as { toDate?: unknown }).toDate === "function")
    return (v as { toDate: () => Date }).toDate();
  return null;
}

const huella = (d: Datos) => ({
  actualizadoEn: aFecha(d.actualizadoEn),
  actualizadoPor:
    typeof d.actualizadoPor === "string" ? d.actualizadoPor : null,
});

const creado = (d: Datos) => aFecha(d.creadoEn) ?? new Date(0);
const texto = (v: unknown) => (typeof v === "string" ? v : "");
const textoONulo = (v: unknown) => (typeof v === "string" ? v : null);
const numeroONulo = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const fechaONula = (v: unknown) =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;

/** Sin huella ni marcas de tiempo: lo que queda va al `jsonb` de `configuracion`. */
function sinHuella(d: Datos): Datos {
  const { actualizadoEn: _, actualizadoPor: __, ...resto } = d;
  return resto;
}

export const COLECCIONES = [
  "marcas",
  "productos",
  "admins",
  "configuracion",
  "planesRcv",
  "solicitudesRcv",
  "solicitudesCelulares",
  "solicitudesCitas",
  "clientesCelulares",
  "clientesRcv",
  "suscripcionesPush",
] as const;
export type Coleccion = (typeof COLECCIONES)[number];

/** Tabla de destino de cada colección (orden = orden de inserción por las FK). */
export const TABLA = {
  marcas,
  productos,
  admins,
  configuracion,
  planesRcv,
  solicitudesRcv,
  solicitudesCelulares,
  solicitudesCitas,
  clientesCelulares,
  clientesRcv,
  suscripcionesPush,
} as const;

export function aFila(coleccion: Coleccion, id: string, d: Datos): Datos {
  switch (coleccion) {
    case "marcas":
      return { nombre: id, ...huella(d) };
    case "productos":
      return {
        id,
        marca: d.marca,
        nombre: d.nombre,
        variante: texto(d.variante),
        inicial: d.inicial,
        cuota: d.cuota,
        numeroCuotas: d.numeroCuotas,
        cantidad: d.cantidad,
        activo: d.activo !== false,
        orden: d.orden,
        ...huella(d),
      };
    case "admins":
      return { userId: id, creadoEn: aFecha(d.creadoEn) ?? new Date(0) };
    case "configuracion":
      return { clave: id, valor: sinHuella(d), ...huella(d) };
    case "planesRcv":
      return {
        id,
        clase: d.clase,
        descripcion: d.descripcion,
        precioEur: numeroONulo(d.precioEur),
        categorias: d.categorias,
        financiamiento: d.financiamiento === true,
        activo: d.activo !== false,
        orden: d.orden,
        ...huella(d),
      };
    case "solicitudesRcv": {
      const t = conTextos(d, [
        "nombre",
        "correo",
        "telefono",
        "whatsapp",
        "clase",
        "descripcion",
        "planId",
      ]);
      return {
        id,
        nombre: t.nombre,
        correo: t.correo,
        telefono: t.telefono,
        whatsapp: t.whatsapp,
        categoria: d.categoria,
        planId: t.planId,
        clase: t.clase,
        descripcion: t.descripcion,
        vehiculo: textoONulo(d.vehiculo),
        precioEur: numeroONulo(d.precioEur),
        precioUsd: numeroONulo(d.precioUsd),
        precioBs: numeroONulo(d.precioBs),
        precioCop: numeroONulo(d.precioCop),
        financiamiento:
          typeof d.financiamiento === "boolean" ? d.financiamiento : null,
        creadoEn: creado(d),
      };
    }
    case "solicitudesCelulares":
      return {
        id,
        nombre: texto(d.nombre),
        whatsapp: texto(d.whatsapp),
        equipo: textoONulo(d.equipo),
        creadoEn: creado(d),
      };
    case "solicitudesCitas":
      return {
        id,
        nombre: texto(d.nombre),
        whatsapp: texto(d.whatsapp),
        estado: d.estado,
        horario: textoONulo(d.horario),
        direccion: textoONulo(d.direccion),
        creadoEn: creado(d),
      };
    case "clientesCelulares": {
      const t = conTextos(d, [
        "nombre",
        "cedula",
        "telefono",
        "equipo",
        "notas",
      ]);
      return {
        id,
        nombre: t.nombre,
        cedula: t.cedula,
        telefono: t.telefono,
        equipo: t.equipo,
        notas: t.notas,
        // Un plan con otra forma no se arregla solo: lo rechaza el NOT NULL y se reporta.
        pagos: esPlanPagos(d.pagos) ? d.pagos : null,
        ...huella(d),
      };
    }
    case "clientesRcv": {
      const t = conTextos(d, [
        "nombre",
        "cedula",
        "telefono",
        "correo",
        "direccion",
        "vehiculo",
        "placa",
        "notas",
      ]);
      return {
        id,
        ...t,
        emision: fechaONula(d.emision),
        vence: fechaONula(d.vence),
        recordatorio30: d.recordatorio30 === true,
        recordatorio3: d.recordatorio3 === true,
        pagos: esPlanPagos(d.pagos) ? d.pagos : null,
        ...huella(d),
      };
    }
    case "suscripcionesPush":
      return {
        id,
        endpoint: d.endpoint,
        p256dh: d.p256dh,
        auth: d.auth,
        userId: d.uid,
        dispositivo: texto(d.dispositivo),
        creadaEn: aFecha(d.creadaEn) ?? new Date(0),
      };
  }
}

/** Marcas que usan los productos y no tienen documento en `marcas` (datos de antes de D025). */
export function marcasFaltantes(
  marcasRegistradas: string[],
  productosDocs: Datos[],
): string[] {
  const hay = new Set(marcasRegistradas);
  const faltan = new Set<string>();
  for (const p of productosDocs)
    if (typeof p.marca === "string" && !hay.has(p.marca)) faltan.add(p.marca);
  return [...faltan].sort();
}

/** Clave para comparar la fila guardada con la esperada (fechas a ISO, claves ordenadas). */
export function huellaContenido(fila: Datos): string {
  const norm = (v: unknown): unknown => {
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object")
      return Object.fromEntries(
        Object.keys(v as Datos)
          .sort()
          .map((k) => [k, norm((v as Datos)[k])]),
      );
    return v ?? null;
  };
  return JSON.stringify(norm(fila));
}

/* ── Copia completa (todo o nada) ───────────────────────────────────────────────────────── */

export type Documentos = Record<Coleccion, { id: string; data: Datos }[]>;

export interface Informe {
  porColeccion: Record<string, { documentos: number; filas: number }>;
  marcasCreadas: string[];
  omitidos: { coleccion: string; id: string; motivo: string }[];
  fallos: { coleccion: string; id: string; error: string }[];
  diferencias: { coleccion: string; id: string }[];
}

export class CopiaFallida extends Error {
  constructor(readonly informe: Informe) {
    super(
      `${informe.fallos.length} documentos no pasaron y ${informe.diferencias.length} no coinciden: no se guardó nada`,
    );
  }
}

const clavePrimaria = (c: Coleccion) =>
  c === "marcas"
    ? "nombre"
    : c === "admins"
      ? "userId"
      : c === "configuracion"
        ? "clave"
        : "id";

function mensajeDe(e: unknown): string {
  for (let x: unknown = e, i = 0; x && i < 3; i++) {
    const m =
      (x as { message?: string; detail?: string }).detail ??
      (x as { message?: string }).message;
    if ((x as { code?: string }).code && m) return m;
    x = (x as { cause?: unknown }).cause;
  }
  return e instanceof Error ? e.message : String(e);
}

/**
 * Copia los documentos a la base en UNA transacción: o entra todo, o nada. Cada documento va
 * en su punto de guardado para reportar todos los que fallan (no solo el primero). Después
 * relee cada fila y la compara con la esperada. `usuarios` = ids de `user` que existen: los
 * `admins` y suscripciones de un usuario que no se importó se omiten (y se reportan).
 */
export async function copiarDocumentos(
  // biome-ignore lint/suspicious/noExplicitAny: Db de pg o de PGlite.
  db: any,
  docs: Documentos,
  usuarios: Set<string>,
): Promise<Informe> {
  const informe: Informe = {
    porColeccion: {},
    marcasCreadas: [],
    omitidos: [],
    fallos: [],
    diferencias: [],
  };
  await db.transaction(async (tx: typeof db) => {
    // Marcas de productos de antes de D025: se registran para que la FK sea estricta.
    informe.marcasCreadas = marcasFaltantes(
      docs.marcas.map((m) => m.id),
      docs.productos.map((p) => p.data),
    );
    const todas: Documentos = {
      ...docs,
      marcas: [
        ...docs.marcas,
        ...informe.marcasCreadas.map((nombre) => ({
          id: nombre,
          data: { actualizadoPor: "migracion" } as Datos,
        })),
      ],
    };
    const esperadas: { coleccion: Coleccion; id: string; fila: Datos }[] = [];
    for (const c of COLECCIONES) {
      let filas = 0;
      for (const { id, data } of todas[c]) {
        const uid =
          c === "admins" ? id : c === "suscripcionesPush" ? data.uid : null;
        if (uid !== null && !usuarios.has(String(uid))) {
          informe.omitidos.push({
            coleccion: c,
            id,
            motivo: "su usuario no está en la base",
          });
          continue;
        }
        const fila = aFila(c, id, data);
        try {
          await tx.transaction(async (punto: typeof db) => {
            await punto.insert(TABLA[c]).values(fila);
          });
          esperadas.push({ coleccion: c, id, fila });
          filas++;
        } catch (e) {
          informe.fallos.push({ coleccion: c, id, error: mensajeDe(e) });
        }
      }
      informe.porColeccion[c] = { documentos: todas[c].length, filas };
    }
    // Contenido, no solo totales: cada fila releída debe coincidir con la esperada.
    for (const { coleccion, id, fila } of esperadas) {
      const t = TABLA[coleccion];
      const pk = clavePrimaria(coleccion);
      const columna = (t as unknown as Record<string, AnyPgColumn>)[pk];
      const [guardada] = await tx.select().from(t).where(eq(columna, id));
      const comparable = Object.fromEntries(
        Object.keys(fila).map((k) => [k, guardada?.[k]]),
      );
      if (!guardada || huellaContenido(comparable) !== huellaContenido(fila))
        informe.diferencias.push({ coleccion, id });
    }
    if (informe.fallos.length || informe.diferencias.length)
      throw new CopiaFallida(informe);
  });
  return informe;
}
