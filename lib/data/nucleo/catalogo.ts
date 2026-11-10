import { asc, count, eq } from "drizzle-orm";
import { validarMarca } from "@/lib/catalogo/marcas";
import type {
  CamposEditables,
  Marca,
  ProductoConId,
} from "@/lib/catalogo/tipos";
import { marcas, productos } from "@/lib/db/schema";
import type { Db } from "@/lib/db/tipos";
import { ErrorDatos, MENSAJE_BORRADO } from "../errores";
import {
  esBool,
  esNumero,
  esTexto,
  exigir,
  exigirId,
  soloClaves,
} from "../validar";

/**
 * Catálogo (D002, D025) contra Postgres. Equivale a `productoValido`, `conHuella` y las reglas
 * de `marcas` de firestore.rules; los rangos los aplica el CHECK de la tabla.
 */

const CAMPOS: readonly (keyof CamposEditables)[] = [
  "marca",
  "nombre",
  "variante",
  "inicial",
  "cuota",
  "numeroCuotas",
  "cantidad",
  "activo",
];

function limpiarCampos(
  entrada: unknown,
  completo: boolean,
): Partial<CamposEditables> {
  const c = soloClaves<CamposEditables>(entrada, CAMPOS);
  if (completo) exigir(CAMPOS.every((k) => c[k] !== undefined));
  if (c.marca !== undefined) exigir(esTexto(c.marca));
  if (c.nombre !== undefined) exigir(esTexto(c.nombre));
  if (c.variante !== undefined) exigir(esTexto(c.variante));
  if (c.inicial !== undefined) exigir(esNumero(c.inicial));
  if (c.cuota !== undefined) exigir(esNumero(c.cuota));
  if (c.activo !== undefined) exigir(esBool(c.activo));
  // Enteros (la regla exigía `int`): se truncan como hacía el panel.
  if (c.cantidad !== undefined) {
    exigir(esNumero(c.cantidad));
    c.cantidad = Math.trunc(c.cantidad);
  }
  if (c.numeroCuotas !== undefined) {
    exigir(esNumero(c.numeroCuotas));
    c.numeroCuotas = Math.trunc(c.numeroCuotas);
  }
  return c;
}

const huella = (uid: string) => ({
  actualizadoPor: uid,
  actualizadoEn: new Date(),
});

export async function listarProductos(db: Db): Promise<ProductoConId[]> {
  return db.select().from(productos);
}

export async function crearProducto(
  db: Db,
  uid: string,
  campos: unknown,
  orden: unknown,
): Promise<string> {
  const c = limpiarCampos(campos, true) as CamposEditables;
  exigir(esNumero(orden));
  const [fila] = await db
    .insert(productos)
    .values({ ...c, orden: orden as number, ...huella(uid) })
    .returning({ id: productos.id });
  return fila.id;
}

export async function actualizarProducto(
  db: Db,
  uid: string,
  id: unknown,
  cambios: unknown,
): Promise<void> {
  const c = limpiarCampos(cambios, false);
  const filas = await db
    .update(productos)
    .set({ ...c, ...huella(uid) })
    .where(eq(productos.id, exigirId(id)))
    .returning({ id: productos.id });
  if (filas.length === 0) throw new ErrorDatos("not-found", MENSAJE_BORRADO);
}

export async function borrarProducto(db: Db, id: unknown): Promise<void> {
  await db.delete(productos).where(eq(productos.id, exigirId(id)));
}

export async function listarMarcas(db: Db): Promise<Marca[]> {
  const filas = await db
    .select({ nombre: marcas.nombre })
    .from(marcas)
    .orderBy(asc(marcas.nombre));
  return filas.map((f) => f.nombre);
}

/** Valida con las mismas reglas que el formulario (`validarMarca`). */
function marcaValida(nombre: unknown): Marca {
  exigir(esTexto(nombre));
  const r = validarMarca(nombre as string, []);
  if (!r.ok) throw new ErrorDatos("invalid-argument", r.error);
  // El panel ya manda el nombre normalizado; si no, se guarda normalizado.
  return r.valor;
}

export async function crearMarca(
  db: Db,
  uid: string,
  nombre: unknown,
): Promise<void> {
  const m = marcaValida(nombre);
  const nuevas = await db
    .insert(marcas)
    .values({ nombre: m, ...huella(uid) })
    .onConflictDoNothing()
    .returning();
  if (nuevas.length === 0)
    throw new ErrorDatos("already-exists", `La marca ${m} ya existe.`);
}

/**
 * Renombra en una transacción: la FK con ON UPDATE CASCADE arrastra los productos. Devuelve
 * cuántos productos se movieron. Si la nueva ya existe, falla sin tocar nada.
 */
export async function renombrarMarca(
  db: Db,
  uid: string,
  vieja: unknown,
  nueva: unknown,
): Promise<number> {
  exigir(esTexto(vieja));
  const n = marcaValida(nueva);
  if (vieja === n) return 0;
  return db.transaction(async (tx) => {
    const [existe] = await tx
      .select({ nombre: marcas.nombre })
      .from(marcas)
      .where(eq(marcas.nombre, n))
      .for("update");
    if (existe)
      throw new ErrorDatos("already-exists", `La marca ${n} ya existe.`);
    const [actual] = await tx
      .select({ nombre: marcas.nombre })
      .from(marcas)
      .where(eq(marcas.nombre, vieja as string))
      .for("update");
    if (!actual) throw new ErrorDatos("not-found", MENSAJE_BORRADO);
    await tx
      .update(marcas)
      .set({ nombre: n, ...huella(uid) })
      .where(eq(marcas.nombre, vieja as string));
    const movidos = await tx
      .update(productos)
      .set(huella(uid))
      .where(eq(productos.marca, n))
      .returning({ id: productos.id });
    return movidos.length;
  });
}

/** Solo borra marcas sin productos (la FK es RESTRICT; el mensaje es para la persona). */
export async function borrarMarca(db: Db, nombre: unknown): Promise<void> {
  exigir(esTexto(nombre));
  const [{ total }] = await db
    .select({ total: count() })
    .from(productos)
    .where(eq(productos.marca, nombre as string));
  if (total > 0)
    throw new ErrorDatos(
      "failed-precondition",
      `${nombre} todavía tiene productos: muévelos a otra marca o bórralos primero.`,
    );
  await db.delete(marcas).where(eq(marcas.nombre, nombre as string));
}
