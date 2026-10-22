"use client";

import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  type FirestoreError,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { firebaseAuth, firestore } from "@/lib/firebase/client";
import { actualizar, escribir } from "@/lib/firebase/escritura";
import { conTextos } from "@/lib/firebase/normalizar";
import { COLECCION_CONFIGURACION } from "@/lib/horario/tipos";
import {
  type CamposPlanRcv,
  COLECCION_PLANES_RCV,
  COLECCION_SOLICITUDES_RCV,
  type ConfigRcv,
  DOC_CONFIG_RCV,
  type FuenteBs,
  type FuenteMercado,
  type PlanRcvConId,
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
  await escribir(
    setDoc(doc(collection(firestore(), COLECCION_PLANES_RCV)), {
      ...campos,
      orden,
      ...huella(),
    }),
  );
}

export async function actualizarPlanRcv(
  id: string,
  cambios: Partial<CamposPlanRcv & { orden: number }>,
): Promise<void> {
  await actualizar(doc(firestore(), COLECCION_PLANES_RCV, id), {
    ...cambios,
    ...huella(),
  });
}

export async function borrarPlanRcv(id: string): Promise<void> {
  await escribir(deleteDoc(doc(firestore(), COLECCION_PLANES_RCV, id)));
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
 * Cada tasa es la manual o, con fuente automática, la consultada en ese momento (queda de
 * respaldo para el bot). Si es `null` (API sin respuesta) no se toca la guardada.
 */
export async function guardarTasas(tasas: {
  usd: number | null;
  bs: number | null;
  cop: number | null;
  fuenteBs: FuenteBs;
  fuenteUsd: FuenteMercado;
  fuenteCop: FuenteMercado;
}): Promise<void> {
  await escribir(
    setDoc(
      refConfig(),
      {
        fuenteBs: tasas.fuenteBs,
        fuenteUsd: tasas.fuenteUsd,
        fuenteCop: tasas.fuenteCop,
        ...(tasas.usd === null ? {} : { tasaUsd: tasas.usd }),
        ...(tasas.bs === null ? {} : { tasaBs: tasas.bs }),
        ...(tasas.cop === null ? {} : { tasaCop: tasas.cop }),
        ...huella(),
      },
      { merge: true },
    ),
  );
}

/**
 * Con fuentes automáticas, actualiza los respaldos (`tasaBs`, `tasaUsd`, `tasaCop`) cuando la
 * API publica otro valor: así el bot cotiza con el más reciente aunque la API se caiga.
 */
export async function guardarRespaldos(
  respaldos: Partial<Record<"tasaBs" | "tasaUsd" | "tasaCop", number>>,
): Promise<void> {
  await escribir(
    setDoc(refConfig(), { ...respaldos, ...huella() }, { merge: true }),
  );
}

/** Una lista para todos los vehículos (D034); borra la de por categoría de antes. */
export async function guardarRequisitos(requisitos: string[]): Promise<void> {
  // merge conserva las tasas; la lista va completa (un array se reemplaza entero).
  await escribir(
    setDoc(
      refConfig(),
      {
        requisitosGenerales: requisitos,
        requisitos: deleteField(),
        ...huella(),
      },
      { merge: true },
    ),
  );
}

// Las escribe el bot: si falta un texto, la lista no se cae (ver lib/firebase/normalizar.ts).
const TEXTOS_SOLICITUD = [
  "nombre",
  "correo",
  "telefono",
  "whatsapp",
  "categoria",
  "planId",
  "clase",
  "descripcion",
] as const;

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
              ...conTextos(d.data(), TEXTOS_SOLICITUD),
              id: d.id,
              creadoEn: aFecha(d.data().creadoEn),
            }) as SolicitudRcvConId,
        ),
      ),
    alFallar,
  );
}

export async function borrarSolicitudRcv(id: string): Promise<void> {
  await escribir(deleteDoc(doc(firestore(), COLECCION_SOLICITUDES_RCV, id)));
}
