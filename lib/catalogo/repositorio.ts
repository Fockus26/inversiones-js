"use client";

import {
  collection,
  deleteDoc,
  doc,
  type FirestoreError,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase/client";
import { escribir } from "@/lib/firebase/escritura";
import {
  type CamposEditables,
  COLECCION_MARCAS,
  COLECCION_PRODUCTOS,
  compararMarcas,
  type Marca,
  type Producto,
  type ProductoConId,
} from "./tipos";

/**
 * Acceso a `productos` desde el panel. Toda escritura lleva la huella que exige
 * firestore.rules (`conHuella`): `actualizadoPor` = uid de la sesión y
 * `actualizadoEn` = serverTimestamp() (la regla compara con request.time; un Date del
 * cliente no pasaría).
 */

function uidActual(): string {
  const uid = firebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Sin sesión: inicia sesión para guardar cambios.");
  return uid;
}

function huella() {
  return { actualizadoPor: uidActual(), actualizadoEn: serverTimestamp() };
}

function aProducto(id: string, data: Record<string, unknown>): ProductoConId {
  const fecha = data.actualizadoEn;
  return {
    ...(data as unknown as Producto),
    id,
    // Con escrituras locales pendientes, serverTimestamp llega como null hasta que confirma.
    actualizadoEn: fecha instanceof Timestamp ? fecha.toDate() : null,
  };
}

/** Marca (alfabético) y luego `orden`. En cliente: dos orderBy pedirían índice. */
export function ordenarProductos(lista: ProductoConId[]): ProductoConId[] {
  return [...lista].sort(
    (a, b) =>
      compararMarcas(a.marca, b.marca) ||
      a.orden - b.orden ||
      a.nombre.localeCompare(b.nombre, "es"),
  );
}

/** Escucha la colección en vivo. Devuelve la función para dejar de escuchar. */
export function escucharProductos(
  alCambiar: (productos: ProductoConId[]) => void,
  alFallar: (error: FirestoreError) => void,
): () => void {
  return onSnapshot(
    collection(firestore(), COLECCION_PRODUCTOS),
    (snap) =>
      alCambiar(
        ordenarProductos(snap.docs.map((d) => aProducto(d.id, d.data()))),
      ),
    alFallar,
  );
}

/** Crea con id automático (D002). `orden` lo calcula quien llama (último + 1). */
export async function crearProducto(
  campos: CamposEditables,
  orden: number,
): Promise<string> {
  const ref = doc(collection(firestore(), COLECCION_PRODUCTOS));
  await escribir(
    setDoc(ref, {
      ...campos,
      orden,
      ...huella(),
    }),
  );
  return ref.id;
}

export async function actualizarProducto(
  id: string,
  cambios: Partial<CamposEditables>,
): Promise<void> {
  const limpio: Partial<CamposEditables> = { ...cambios };
  // La regla exige int: nunca mandar decimales en estos dos campos.
  if (limpio.cantidad !== undefined)
    limpio.cantidad = Math.trunc(limpio.cantidad);
  if (limpio.numeroCuotas !== undefined)
    limpio.numeroCuotas = Math.trunc(limpio.numeroCuotas);
  await escribir(
    updateDoc(doc(firestore(), COLECCION_PRODUCTOS, id), {
      ...limpio,
      ...huella(),
    }),
  );
}

export async function borrarProducto(id: string): Promise<void> {
  await escribir(deleteDoc(doc(firestore(), COLECCION_PRODUCTOS, id)));
}

/* ── Marcas (D025) ─────────────────────────────────────────────────────────────────────────
 * `marcas/{nombre}`: el id ES el nombre. Así la regla de `productos` comprueba que la marca
 * exista con un `existsAfter` y nadie puede crear dos marcas iguales (la regla no deja
 * sobrescribir una marca existente).
 */

/** Escucha las marcas registradas (ordenadas). Devuelve la función para dejar de escuchar. */
export function escucharMarcas(
  alCambiar: (marcas: Marca[]) => void,
  alFallar: (error: FirestoreError) => void,
): () => void {
  return onSnapshot(
    collection(firestore(), COLECCION_MARCAS),
    (snap) => alCambiar(snap.docs.map((d) => d.id).sort(compararMarcas)),
    alFallar,
  );
}

/** `nombre` ya validado con `validarMarca`. */
export async function crearMarca(nombre: Marca): Promise<void> {
  await escribir(
    setDoc(doc(firestore(), COLECCION_MARCAS, nombre), {
      nombre,
      ...huella(),
    }),
  );
}

/** Productos que usan la marca (consulta de un campo: índice automático). */
async function productosDeMarca(marca: Marca, maximo?: number) {
  const col = collection(firestore(), COLECCION_PRODUCTOS);
  const q =
    maximo === undefined
      ? query(col, where("marca", "==", marca))
      : query(col, where("marca", "==", marca), limit(maximo));
  return (await getDocs(q)).docs;
}

/**
 * Renombra en un solo lote: crea la marca nueva, mueve a ella todos sus productos y borra la
 * vieja. O se aplica todo o nada. Un lote admite 500 escrituras (de sobra para el catálogo).
 * Si la vieja no estaba registrada (datos de antes de D025), solo se crea la nueva.
 */
export async function renombrarMarca(
  vieja: Marca,
  nueva: Marca,
): Promise<number> {
  if (vieja === nueva) return 0;
  const db = firestore();
  const productos = await productosDeMarca(vieja);
  const lote = writeBatch(db);
  lote.set(doc(db, COLECCION_MARCAS, nueva), { nombre: nueva, ...huella() });
  for (const p of productos) lote.update(p.ref, { marca: nueva, ...huella() });
  lote.delete(doc(db, COLECCION_MARCAS, vieja));
  await escribir(lote.commit());
  return productos.length;
}

/** Solo borra marcas sin productos: si alguno la usa, falla con un mensaje para la persona. */
export async function borrarMarca(nombre: Marca): Promise<void> {
  if ((await productosDeMarca(nombre, 1)).length > 0)
    throw new Error(
      `${nombre} todavía tiene productos: muévelos a otra marca o bórralos primero.`,
    );
  await escribir(deleteDoc(doc(firestore(), COLECCION_MARCAS, nombre)));
}
