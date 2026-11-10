import { asc, eq, sql } from "drizzle-orm";
import { clientesCelulares, clientesRcv } from "@/lib/db/schema";
import type { Db } from "@/lib/db/tipos";
import { conservarPagos } from "@/lib/financiamiento/cuotas";
import { hoyCaracas } from "@/lib/financiamiento/fechas";
import {
  type ClienteCelularConId,
  type ClienteRcvConId,
  COLECCION_CLIENTES_CELULARES,
  COLECCION_CLIENTES_RCV,
  FRECUENCIAS,
  type PlanPagos,
} from "@/lib/financiamiento/tipos";
import { ErrorDatos, MENSAJE_BORRADO } from "../errores";
import { esPlanPagos } from "../normalizar";
import {
  esBool,
  esFecha,
  esTexto,
  exigir,
  exigirId,
  soloClaves,
} from "../validar";

/** Clientes con financiamiento (D032, D033): `clienteCelularValido`, `clienteRcvValido`. */

export type ColeccionClientes =
  | typeof COLECCION_CLIENTES_CELULARES
  | typeof COLECCION_CLIENTES_RCV;

const tabla = (c: unknown) => {
  if (c === COLECCION_CLIENTES_CELULARES) return clientesCelulares;
  if (c === COLECCION_CLIENTES_RCV) return clientesRcv;
  return exigir(false) as never;
};

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
      (plan.cuotas as Record<string, unknown>[]).every((c) => esFecha(c.vence)),
  );
}

function soloClavesOk(o: unknown, permitidas: string[]) {
  return Object.keys(o as object).every((k) => permitidas.includes(k));
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
    if (k in c) exigir(c[k] === null || esFecha(c[k]));
  // Van juntos (también al actualizar solo esos dos) y la póliza vence después de emitirse.
  exigir("emision" in c === "vence" in c);
  if ("emision" in c) {
    exigir((c.emision === null) === (c.vence === null));
    if (c.emision !== null) exigir(String(c.vence) > String(c.emision));
  }
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

/**
 * Al editar un cliente, lo ya cobrado en la base no se pierde: el formulario arma el plan con
 * la lectura que tenía abierta, y una cuota marcada mientras tanto (otra pestaña, otro equipo)
 * no viene en ella. Se fusiona por número de cuota dentro de la transacción (fila bloqueada).
 */
function fusionarPagos(nuevo: PlanPagos, guardado: unknown): PlanPagos {
  if (!esPlanPagos(guardado)) return nuevo;
  return { ...nuevo, cuotas: conservarPagos(nuevo.cuotas, guardado.cuotas) };
}

export async function actualizarClienteCelular(
  db: Db,
  uid: string,
  id: unknown,
  campos: unknown,
): Promise<void> {
  const c = limpiarCelular(campos);
  const clave = exigirId(id);
  await db.transaction(async (tx) => {
    const [actual] = await tx
      .select({ pagos: clientesCelulares.pagos })
      .from(clientesCelulares)
      .where(eq(clientesCelulares.id, clave))
      .for("update");
    if (!actual) throw new ErrorDatos("not-found", MENSAJE_BORRADO);
    await tx
      .update(clientesCelulares)
      .set({
        ...c,
        pagos: fusionarPagos(c.pagos, actual.pagos),
        ...huella(uid),
      })
      .where(eq(clientesCelulares.id, clave));
  });
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
  const c = limpiarRcv(campos, false);
  const clave = exigirId(id);
  await db.transaction(async (tx) => {
    const [actual] = await tx
      .select({ pagos: clientesRcv.pagos })
      .from(clientesRcv)
      .where(eq(clientesRcv.id, clave))
      .for("update");
    if (!actual) throw new ErrorDatos("not-found", MENSAJE_BORRADO);
    const pagos =
      c.pagos == null ? c.pagos : fusionarPagos(c.pagos, actual.pagos);
    await tx
      .update(clientesRcv)
      .set({
        ...c,
        ...("pagos" in c ? { pagos } : {}),
        ...huella(uid),
      })
      .where(eq(clientesRcv.id, clave));
  });
}

export async function borrarCliente(
  db: Db,
  coleccion: unknown,
  id: unknown,
): Promise<void> {
  const t = tabla(coleccion);
  await db.delete(t).where(eq(t.id, exigirId(id)));
}

/**
 * Marca o desmarca UNA cuota en el servidor, sobre lo que hay en la base (no sobre la lista que
 * tenía el navegador): dos cuotas marcadas seguidas no se pisan. Si ya estaba así, no cambia
 * (ni la fecha de pago). La fecha es la de hoy en Caracas.
 */
export async function marcarCuota(
  db: Db,
  uid: string,
  coleccion: unknown,
  id: unknown,
  numero: unknown,
  pagada: unknown,
): Promise<void> {
  const t = tabla(coleccion);
  exigir(
    Number.isInteger(numero) &&
      (numero as number) >= 1 &&
      (numero as number) <= 60 &&
      esBool(pagada),
  );
  const cambio = JSON.stringify({
    pagada,
    pagadaEl: pagada ? hoyCaracas() : null,
  });
  const n = numero as number;
  const filas = await db
    .update(t)
    .set({
      pagos: sql`jsonb_set(${t.pagos}, '{cuotas}', (
        select jsonb_agg(
          case when (x.c->>'numero')::int = ${n}
                 and (x.c->>'pagada')::boolean is distinct from ${pagada}::boolean
               then x.c || ${cambio}::jsonb else x.c end
          order by x.i)
        from jsonb_array_elements(${t.pagos}->'cuotas') with ordinality as x(c, i)))`,
      ...huella(uid),
    })
    .where(
      sql`${t.id} = ${exigirId(id)} and ${t.pagos} is not null
        and exists (select 1 from jsonb_array_elements(${t.pagos}->'cuotas') as y(c)
                    where (y.c->>'numero')::int = ${n})`,
    )
    .returning({ id: t.id });
  if (filas.length === 0) throw new ErrorDatos("not-found", MENSAJE_BORRADO);
}
