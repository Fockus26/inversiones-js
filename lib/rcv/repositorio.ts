"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type FirestoreError,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase/client";
import { COLECCION_CONFIGURACION } from "@/lib/horario/tipos";
import {
  type CamposPlanRcv,
  COLECCION_PLANES_RCV,
  COLECCION_SOLICITUDES_RCV,
  type ConfigRcv,
  DOC_CONFIG_RCV,
  type FuenteBs,
  type PlanRcvConId,
  type RequisitosRcv,
  type SolicitudRcvConId,
} from "./tipos";

/**
 * Acceso a la póliza RCV desde el panel (D030). Igual que `lib/catalogo/repositorio.ts`: toda
 * escritura lleva la huella `actualizadoPor`/`actualizadoEn` que exigen las reglas.
 */

function huella() {
  const uid = firebaseAuth().currentUser?.uid;
  if (!uid) throw new Error("Sin sesión: inicia sesión para guardar cambios.");
  return { actualizadoPor: uid, actualizadoEn: serverTimestamp() };
}

const aFecha = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

export function escucharPlanesRcv(
  alCambiar: (planes: PlanRcvConId[]) => void,
  alFallar: (error: FirestoreError) => void,
): () => void {
  return onSnapshot(
    collection(firestore(), COLECCION_PLANES_RCV),
    (snap) =>
      alCambiar(
        snap.docs
          .map(
            (d) =>
              ({
                ...d.data(),
                id: d.id,
                actualizadoEn: aFecha(d.data().actualizadoEn),
              }) as PlanRcvConId,
          )
          .sort(
            (a, b) => a.orden - b.orden || a.clase.localeCompare(b.clase, "es"),
          ),
      ),
    alFallar,
  );
}

export async function crearPlanRcv(
  campos: CamposPlanRcv,
  orden: number,
): Promise<void> {
  await addDoc(collection(firestore(), COLECCION_PLANES_RCV), {
    ...campos,
    orden,
    ...huella(),
  });
}

export async function actualizarPlanRcv(
  id: string,
  cambios: Partial<CamposPlanRcv & { orden: number }>,
): Promise<void> {
  await updateDoc(doc(firestore(), COLECCION_PLANES_RCV, id), {
    ...cambios,
    ...huella(),
  });
}

export async function borrarPlanRcv(id: string): Promise<void> {
  await deleteDoc(doc(firestore(), COLECCION_PLANES_RCV, id));
}

/** Escucha `configuracion/rcv`; `null` si todavía no existe. */
export function escucharConfigRcv(
  alCambiar: (config: ConfigRcv | null) => void,
  alFallar: (error: FirestoreError) => void,
): () => void {
  return onSnapshot(
    doc(firestore(), COLECCION_CONFIGURACION, DOC_CONFIG_RCV),
    (snap) =>
      alCambiar(
        snap.exists()
          ? ({
              ...snap.data(),
              actualizadoEn: aFecha(snap.data().actualizadoEn),
            } as ConfigRcv)
          : null,
      ),
    alFallar,
  );
}

const refConfig = () =>
  doc(firestore(), COLECCION_CONFIGURACION, DOC_CONFIG_RCV);

/**
 * `bs`: la manual, o con BCV la consultada en ese momento (queda de respaldo para el bot). Si es
 * `null` (BCV sin respuesta) no se toca la guardada.
 */
export async function guardarTasas(tasas: {
  usd: number;
  bs: number | null;
  cop: number;
  fuenteBs: FuenteBs;
}): Promise<void> {
  await setDoc(
    refConfig(),
    {
      tasaUsd: tasas.usd,
      tasaCop: tasas.cop,
      fuenteBs: tasas.fuenteBs,
      ...(tasas.bs === null ? {} : { tasaBs: tasas.bs }),
      ...huella(),
    },
    { merge: true },
  );
}

/** Con la tasa BCV elegida, actualiza el respaldo `tasaBs` cuando el BCV publica otra. */
export async function guardarRespaldoBcv(tasaBs: number): Promise<void> {
  await setDoc(refConfig(), { tasaBs, ...huella() }, { merge: true });
}

export async function guardarRequisitos(
  requisitos: RequisitosRcv,
): Promise<void> {
  // merge conserva las tasas; las tres listas van completas (un array se reemplaza entero).
  await setDoc(refConfig(), { requisitos, ...huella() }, { merge: true });
}

/** Últimas solicitudes (más nuevas primero). `orderBy` de un campo: índice automático. */
export function escucharSolicitudesRcv(
  alCambiar: (solicitudes: SolicitudRcvConId[]) => void,
  alFallar: (error: FirestoreError) => void,
  maximo = 200,
): () => void {
  return onSnapshot(
    query(
      collection(firestore(), COLECCION_SOLICITUDES_RCV),
      orderBy("creadoEn", "desc"),
      limit(maximo),
    ),
    (snap) =>
      alCambiar(
        snap.docs.map(
          (d) =>
            ({
              ...d.data(),
              id: d.id,
              creadoEn: aFecha(d.data().creadoEn),
            }) as SolicitudRcvConId,
        ),
      ),
    alFallar,
  );
}

export async function borrarSolicitudRcv(id: string): Promise<void> {
  await deleteDoc(doc(firestore(), COLECCION_SOLICITUDES_RCV, id));
}
