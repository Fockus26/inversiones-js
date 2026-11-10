import { asc, eq, sql } from "drizzle-orm";
import { clientesCelulares, clientesRcv } from "@/lib/db/schema";
import type { Db } from "@/lib/db/tipos";
import {
  type ClienteCelularConId,
  type ClienteRcvConId,
  COLECCION_CLIENTES_CELULARES,
  COLECCION_CLIENTES_RCV,
  type Cuota,
  FRECUENCIAS,
} from "@/lib/financiamiento/tipos";
import { ErrorDatos, MENSAJE_BORRADO } from "../errores";
import { esPlanPagos } from "../normalizar";
import { esBool, esTexto, exigir, exigirId, soloClaves } from "../validar";

/** Clientes con financiamiento (D032, D033): `clienteCelularValido`, `clienteRcvValido`. */

export type ColeccionClientes =
  | typeof COLECCION_CLIENTES_CELULARES
  | typeof COLECCION_CLIENTES_RCV;

const tabla = (c: unknown) => {
  if (c === COLECCION_CLIENTES_CELULARES) return clientesCelulares;
  if (c === COLECCION_CLIENTES_RCV) return clientesRcv;
  return exigir(false) as never;
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** `planPagosValido`: forma del plan y hasta 60 cuotas (el contenido lo arma el panel). */
function validarPagos(p: unknown) {
  exigir(esPlanPagos(p));
  const plan = p as { frecuencia: string; cuotas: unknown[] };
  exigir(
    FRECUENCIAS.includes(plan.frecuencia as (typeof FRECUENCIAS)[number]) &&
      plan.cuotas.length >= 1 &&
      plan.cuotas.length <= 60,
  );
  exigir(
    soloClavesOk(p, ["inicial", "frecuencia", "cuotas"]) &&
      (plan.cuotas as Record<string, unknown>[]).every((c) =>
        FECHA.test(String(c.vence)),
      ),
  );
}

function soloClavesOk(o: unknown, permitidas: string[]) {
  return Object.keys(o as object).every((k) => permitidas.includes(k));
}

function validarCuotas(cuotas: unknown): Cuota[] {
  exigir(Array.isArray(cuotas) && cuotas.length >= 1 && cuotas.length <= 60);
  validarPagos({ inicial: 0, frecuencia: "mensual", cuotas });
  return cuotas as Cuota[];
}

const TEXTOS_COMUNES = ["nombre", "cedula", "telefono", "notas"] as const;
const CAMPOS_CELULAR = [...TEXTOS_COMUNES, "equipo", "pagos"] as const;
const CAMPOS_RCV = [
  ...TEXTOS_COMUNES,
  "correo",
  "direccion",
  "vehiculo",
  "placa",
  "emision",
  "vence",
  "recordatorio30",
  "recordatorio3",
  "pagos",
] as const;

function limpiarCelular(entrada: unknown) {
  const c = soloClaves<Record<string, unknown>>(entrada, CAMPOS_CELULAR);
  exigir(CAMPOS_CELULAR.every((k) => k in c));
  for (const k of [...TEXTOS_COMUNES, "equipo"]) exigir(esTexto(c[k]));
  validarPagos(c.pagos);
  return c as Omit<ClienteCelularConId, "id">;
}

function limpiarRcv(entrada: unknown, completo: boolean) {
  const c = soloClaves<Record<string, unknown>>(entrada, CAMPOS_RCV);
  if (completo) exigir(CAMPOS_RCV.every((k) => k in c));
  for (const k of [
    ...TEXTOS_COMUNES,
    "correo",
    "direccion",
    "vehiculo",
    "placa",
  ])
    if (k in c) exigir(esTexto(c[k]));
  for (const k of ["emision", "vence"])
    if (k in c) exigir(c[k] === null || (esTexto(c[k]) && FECHA.test(c[k])));
  if ("emision" in c && "vence" in c)
    exigir((c.emision === null) === (c.vence === null));
  for (const k of ["recordatorio30", "recordatorio3"])
    if (k in c) exigir(esBool(c[k]));
  if ("pagos" in c && c.pagos !== null) validarPagos(c.pagos);
  return c as Partial<Omit<ClienteRcvConId, "id">>;
}

const huella = (uid: string) => ({
  actualizadoPor: uid,
  actualizadoEn: new Date(),
});

export async function listarClientesCelulares(
  db: Db,
): Promise<{ clientes: ClienteCelularConId[]; omitidos: number }> {
  const filas = await db
    .select()
    .from(clientesCelulares)
    .orderBy(asc(clientesCelulares.nombre));
  // Un plan de pagos con otra forma (escrito a mano) no se puede mostrar: se omite.
  const clientes = filas.filter((f) => esPlanPagos(f.pagos));
  return { clientes, omitidos: filas.length - clientes.length };
}

export async function listarClientesRcv(
  db: Db,
): Promise<{ clientes: ClienteRcvConId[]; omitidos: number }> {
  const filas = await db
    .select()
    .from(clientesRcv)
    .orderBy(asc(clientesRcv.nombre));
  return {
    clientes: filas.map((f) => ({
      ...f,
      pagos: esPlanPagos(f.pagos) ? f.pagos : null,
    })),
    omitidos: 0,
  };
}

export async function crearClienteCelular(
  db: Db,
  uid: string,
  campos: unknown,
): Promise<void> {
  await db
    .insert(clientesCelulares)
    .values({ ...limpiarCelular(campos), ...huella(uid) });
}

export async function actualizarClienteCelular(
  db: Db,
  uid: string,
  id: unknown,
  campos: unknown,
): Promise<void> {
  const filas = await db
    .update(clientesCelulares)
    .set({ ...limpiarCelular(campos), ...huella(uid) })
    .where(eq(clientesCelulares.id, exigirId(id)))
    .returning({ id: clientesCelulares.id });
  if (filas.length === 0) throw new ErrorDatos("not-found", MENSAJE_BORRADO);
}

export async function crearClienteRcv(
  db: Db,
  uid: string,
  campos: unknown,
): Promise<void> {
  const c = limpiarRcv(campos, true) as Omit<ClienteRcvConId, "id">;
  await db.insert(clientesRcv).values({ ...c, ...huella(uid) });
}

export async function actualizarClienteRcv(
  db: Db,
  uid: string,
  id: unknown,
  campos: unknown,
): Promise<void> {
  const filas = await db
    .update(clientesRcv)
    .set({ ...limpiarRcv(campos, false), ...huella(uid) })
    .where(eq(clientesRcv.id, exigirId(id)))
    .returning({ id: clientesRcv.id });
  if (filas.length === 0) throw new ErrorDatos("not-found", MENSAJE_BORRADO);
}

export async function borrarCliente(
  db: Db,
  coleccion: unknown,
  id: unknown,
): Promise<void> {
  const t = tabla(coleccion);
  await db.delete(t).where(eq(t.id, exigirId(id)));
}

/** Reemplaza solo `pagos.cuotas` (como el `updateDoc` con "pagos.cuotas"). */
export async function guardarCuotas(
  db: Db,
  uid: string,
  coleccion: unknown,
  id: unknown,
  cuotas: unknown,
): Promise<void> {
  const t = tabla(coleccion);
  const lista = JSON.stringify(validarCuotas(cuotas));
  const filas = await db
    .update(t)
    .set({
      pagos: sql`jsonb_set(${t.pagos}, '{cuotas}', ${lista}::jsonb)`,
      ...huella(uid),
    })
    .where(sql`${t.id} = ${exigirId(id)} and ${t.pagos} is not null`)
    .returning({ id: t.id });
  if (filas.length === 0) throw new ErrorDatos("not-found", MENSAJE_BORRADO);
}
