"use client";

import {
  collection,
  deleteDoc,
  doc,
  type FirestoreError,
  onSnapshot,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase/client";
import { actualizar, escribir } from "@/lib/firebase/escritura";
import { conTextos, esPlanPagos } from "@/lib/firebase/normalizar";
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

const TEXTOS_CLIENTE = [
  "nombre",
  "cedula",
  "telefono",
  "equipo",
  "correo",
  "direccion",
  "vehiculo",
  "placa",
  "notas",
] as const;

/**
 * Documento → cliente, tolerante (ver `lib/firebase/normalizar.ts`). Un cliente de celular sin
 * plan de pagos válido no se puede mostrar: se omite y se avisa en la consola.
 */
function aCliente(
  coleccion: Coleccion,
  id: string,
  datos: Record<string, unknown>,
): Record<string, unknown> | null {
  const pagos = esPlanPagos(datos.pagos) ? datos.pagos : null;
  if (coleccion === COLECCION_CLIENTES_CELULARES && !pagos) {
    console.warn(
      `[clientes] ${coleccion}/${id} sin plan de pagos válido: se omite`,
    );
    return null;
  }
  return {
    ...conTextos(datos, TEXTOS_CLIENTE),
    pagos,
    id,
    actualizadoEn: aFecha(datos.actualizadoEn),
  };
}

function escuchar<T extends { id: string; nombre: string }>(
  coleccion: Coleccion,
  alCambiar: (clientes: T[], omitidos: number) => void,
  alFallar: (error: FirestoreError) => void,
): () => void {
  if (modoDemo()) return escucharDemo(coleccion, (c: T[]) => alCambiar(c, 0));
  return onSnapshot(
    collection(firestore(), coleccion),
    (snap) => {
      const clientes = snap.docs
        .map((d) => aCliente(coleccion, d.id, d.data()) as T | null)
        .filter((c): c is T => c !== null)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
      alCambiar(clientes, snap.size - clientes.length);
    },
    alFallar,
  );
}

export const escucharClientesCelulares = (
  alCambiar: (c: ClienteCelularConId[], omitidos: number) => void,
  alFallar: (e: FirestoreError) => void,
) => escuchar(COLECCION_CLIENTES_CELULARES, alCambiar, alFallar);

export const escucharClientesRcv = (
  alCambiar: (c: ClienteRcvConId[], omitidos: number) => void,
  alFallar: (e: FirestoreError) => void,
) => escuchar(COLECCION_CLIENTES_RCV, alCambiar, alFallar);

export async function crearClienteCelular(
  campos: CamposClienteCelular,
): Promise<void> {
  if (modoDemo()) return crearDemo(COLECCION_CLIENTES_CELULARES, campos);
  await escribir(
    setDoc(doc(collection(firestore(), COLECCION_CLIENTES_CELULARES)), {
      ...campos,
      ...huella(),
    }),
  );
}

export async function actualizarClienteCelular(
  id: string,
  campos: CamposClienteCelular,
): Promise<void> {
  if (modoDemo())
    return actualizarDemo(COLECCION_CLIENTES_CELULARES, id, campos);
  await actualizar(doc(firestore(), COLECCION_CLIENTES_CELULARES, id), {
    ...campos,
    ...huella(),
  });
}

export async function crearClienteRcv(campos: CamposClienteRcv): Promise<void> {
  if (modoDemo()) return crearDemo(COLECCION_CLIENTES_RCV, campos);
  await escribir(
    setDoc(doc(collection(firestore(), COLECCION_CLIENTES_RCV)), {
      ...campos,
      ...huella(),
    }),
  );
}

export async function actualizarClienteRcv(
  id: string,
  campos: Partial<CamposClienteRcv>,
): Promise<void> {
  if (modoDemo()) return actualizarDemo(COLECCION_CLIENTES_RCV, id, campos);
  await actualizar(doc(firestore(), COLECCION_CLIENTES_RCV, id), {
    ...campos,
    ...huella(),
  });
}

export async function borrarCliente(
  coleccion: Coleccion,
  id: string,
): Promise<void> {
  if (modoDemo()) return borrarDemo(coleccion, id);
  await escribir(deleteDoc(doc(firestore(), coleccion, id)));
}

/** Guarda las cuotas tras marcar o desmarcar una (la lista va completa). */
export async function guardarCuotas(
  coleccion: Coleccion,
  id: string,
  cuotas: Cuota[],
): Promise<void> {
  if (modoDemo()) return guardarCuotasDemo(coleccion, id, cuotas);
  await actualizar(doc(firestore(), coleccion, id), {
    "pagos.cuotas": cuotas,
    ...huella(),
  });
}
