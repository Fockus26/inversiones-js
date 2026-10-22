"use client";

import {
  type DocumentData,
  type DocumentReference,
  getDoc,
  type UpdateData,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { codigoDeError } from "@/lib/auth/errores";
import { MENSAJE_BORRADO, mensajeDeError } from "./errores";

/**
 * Sin conexión, Firestore deja la escritura en cola y su promesa no se resuelve hasta que
 * vuelve la red: el botón se quedaría en "Guardando…" para siempre. Si tarda, se da por
 * encolada, se avisa (y que no cierre la pestaña, que la cola vive en memoria) y se libera la
 * pantalla; cuando el servidor responde, un segundo aviso dice cómo terminó.
 */

const ESPERA_CON_RED_MS = 10_000;
const ESPERA_SIN_RED_MS = 1_500;

export async function escribir(operacion: Promise<unknown>): Promise<void> {
  const sinRed = typeof navigator !== "undefined" && navigator.onLine === false;
  let reloj: ReturnType<typeof setTimeout> | undefined;
  const tiempo = new Promise<"pendiente">((r) => {
    reloj = setTimeout(
      () => r("pendiente"),
      sinRed ? ESPERA_SIN_RED_MS : ESPERA_CON_RED_MS,
    );
  });
  try {
    const resultado = await Promise.race([
      operacion.then(() => "listo" as const),
      tiempo,
    ]);
    if (resultado === "listo") return;
  } finally {
    clearTimeout(reloj);
  }
  // Quien llama sigue con su "Guardaste…": es cierto en este equipo; este aviso dice el resto.
  toast.info("Sin conexión: guardado solo en este equipo", {
    description:
      "Se enviará al volver la red. No cierres ni recargues esta pestaña hasta entonces.",
  });
  operacion.then(
    () => toast.success("Se envió el cambio que estaba pendiente"),
    (e) =>
      toast.error("No se guardó un cambio que estaba pendiente", {
        description: mensajeDeError(e),
      }),
  );
}

/**
 * `updateDoc` con `escribir`. Si el documento ya no existe, las reglas responden
 * PERMISSION_DENIED (no hay `resource` que validar) y el aviso diría "no tienes acceso": se
 * comprueba y se dice lo que de verdad pasó.
 */
export async function actualizar(
  ref: DocumentReference,
  datos: UpdateData<DocumentData>,
): Promise<void> {
  try {
    await escribir(updateDoc(ref, datos));
  } catch (e) {
    if (codigoDeError(e) === "permission-denied") {
      const existe = await getDoc(ref).then(
        (s) => s.exists(),
        () => true,
      );
      if (!existe) throw new Error(MENSAJE_BORRADO);
    }
    throw e;
  }
}
