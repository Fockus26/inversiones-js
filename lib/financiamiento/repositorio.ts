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
  actualizarDemo,
  borrarDemo,
  crearDemo,
  escucharDemo,
  guardarCuotasDemo,
  modoDemo,
} from "./demo";
import {
  type CamposClienteCelular,
  type CamposClienteRcv,
  type ClienteCelularConId,
  type ClienteRcvConId,
  COLECCION_CLIENTES_CELULARES,
  COLECCION_CLIENTES_RCV,
  type Cuota,
} from "./tipos";

/**
 * Acceso a los clientes con financiamiento desde el panel (D032). Igual que los otros
 * repositorios: toda escritura lleva la huella `actualizadoPor`/`actualizadoEn` de las reglas.
 * En modo demo (`?demo`, D037) todo va a la memoria de la pestaña, nunca a Firestore.
 */

function huella() {
  const uid = firebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Sin sesión: inicia sesión para guardar cambios.");
  return { actualizadoPor: uid, actualizadoEn: serverTimestamp() };
}

const aFecha = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

type Coleccion =
  | typeof COLECCION_CLIENTES_CELULARES
  | typeof COLECCION_CLIENTES_RCV;

function escuchar<T extends { id: string; nombre: string }>(
  coleccion: Coleccion,
  alCambiar: (clientes: T[]) => void,
  alFallar: (error: FirestoreError) => void,
): () => void {
  if (modoDemo()) return escucharDemo(coleccion, alCambiar);
  return onSnapshot(
    collection(firestore(), coleccion),
    (snap) =>
      alCambiar(
        snap.docs
          .map(
            (d) =>
              ({
                ...d.data(),
                id: d.id,
                actualizadoEn: aFecha(d.data().actualizadoEn),
              }) as unknown as T,
          )
          .sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
      ),
    alFallar,
  );
}

export const escucharClientesCelulares = (
  alCambiar: (c: ClienteCelularConId[]) => void,
  alFallar: (e: FirestoreError) => void,
) => escuchar(COLECCION_CLIENTES_CELULARES, alCambiar, alFallar);

export const escucharClientesRcv = (
  alCambiar: (c: ClienteRcvConId[]) => void,
  alFallar: (e: FirestoreError) => void,
) => escuchar(COLECCION_CLIENTES_RCV, alCambiar, alFallar);

export async function crearClienteCelular(
  campos: CamposClienteCelular,
): Promise<void> {
  if (modoDemo()) return crearDemo(COLECCION_CLIENTES_CELULARES, campos);
  await addDoc(collection(firestore(), COLECCION_CLIENTES_CELULARES), {
    ...campos,
    ...huella(),
  });
}

export async function actualizarClienteCelular(
  id: string,
  campos: CamposClienteCelular,
): Promise<void> {
  if (modoDemo())
    return actualizarDemo(COLECCION_CLIENTES_CELULARES, id, campos);
  await updateDoc(doc(firestore(), COLECCION_CLIENTES_CELULARES, id), {
    ...campos,
    ...huella(),
  });
}

export async function crearClienteRcv(campos: CamposClienteRcv): Promise<void> {
  if (modoDemo()) return crearDemo(COLECCION_CLIENTES_RCV, campos);
  await addDoc(collection(firestore(), COLECCION_CLIENTES_RCV), {
    ...campos,
    ...huella(),
  });
}

export async function actualizarClienteRcv(
  id: string,
  campos: Partial<CamposClienteRcv>,
): Promise<void> {
  if (modoDemo()) return actualizarDemo(COLECCION_CLIENTES_RCV, id, campos);
  await updateDoc(doc(firestore(), COLECCION_CLIENTES_RCV, id), {
    ...campos,
    ...huella(),
  });
}

export async function borrarCliente(
  coleccion: Coleccion,
  id: string,
): Promise<void> {
  if (modoDemo()) return borrarDemo(coleccion, id);
  await deleteDoc(doc(firestore(), coleccion, id));
}

/** Guarda las cuotas tras marcar o desmarcar una (la lista va completa). */
export async function guardarCuotas(
  coleccion: Coleccion,
  id: string,
  cuotas: Cuota[],
): Promise<void> {
  if (modoDemo()) return guardarCuotasDemo(coleccion, id, cuotas);
  await updateDoc(doc(firestore(), coleccion, id), {
    "pagos.cuotas": cuotas,
    ...huella(),
  });
}
