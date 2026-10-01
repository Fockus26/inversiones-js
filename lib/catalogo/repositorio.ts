"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type FirestoreError,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase/client";
import {
  type CamposEditables,
  COLECCION_PRODUCTOS,
  MARCAS,
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

/** Marca (en el orden de MARCAS) y luego `orden`. En cliente: dos orderBy pedirían índice. */
export function ordenarProductos(lista: ProductoConId[]): ProductoConId[] {
  return [...lista].sort(
    (a, b) =>
      MARCAS.indexOf(a.marca) - MARCAS.indexOf(b.marca) ||
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
  const ref = await addDoc(collection(firestore(), COLECCION_PRODUCTOS), {
    ...campos,
    orden,
    ...huella(),
  });
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
  await updateDoc(doc(firestore(), COLECCION_PRODUCTOS, id), {
    ...limpio,
    ...huella(),
  });
}

export async function borrarProducto(id: string): Promise<void> {
  await deleteDoc(doc(firestore(), COLECCION_PRODUCTOS, id));
}
