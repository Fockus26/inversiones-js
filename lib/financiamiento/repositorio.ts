"use client";

import * as acciones from "@/lib/data/clientes";
import type { ErrorDatos } from "@/lib/data/errores";
import { escribir, sondear } from "@/lib/data/sondeo";
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
 * Acceso a los clientes con financiamiento desde el panel (D032), sobre `lib/data/clientes.ts`.
 * La huella la pone el servidor. En modo demo (`?demo`, D037) todo va a la memoria de la
 * pestaña, nunca a la base.
 */

type Coleccion =
  | typeof COLECCION_CLIENTES_CELULARES
  | typeof COLECCION_CLIENTES_RCV;

const TABLA: Record<Coleccion, string> = {
  [COLECCION_CLIENTES_CELULARES]: "clientes_celulares",
  [COLECCION_CLIENTES_RCV]: "clientes_rcv",
};

export function escucharClientesCelulares(
  alCambiar: (c: ClienteCelularConId[], omitidos: number) => void,
  alFallar: (e: ErrorDatos) => void,
): () => void {
  if (modoDemo())
    return escucharDemo(
      COLECCION_CLIENTES_CELULARES,
      (c: ClienteCelularConId[]) => alCambiar(c, 0),
    );
  return sondear(
    [TABLA[COLECCION_CLIENTES_CELULARES]],
    acciones.listarClientesCelulares,
    (r) => alCambiar(r.clientes, r.omitidos),
    alFallar,
  );
}

export function escucharClientesRcv(
  alCambiar: (c: ClienteRcvConId[], omitidos: number) => void,
  alFallar: (e: ErrorDatos) => void,
): () => void {
  if (modoDemo())
    return escucharDemo(COLECCION_CLIENTES_RCV, (c: ClienteRcvConId[]) =>
      alCambiar(c, 0),
    );
  return sondear(
    [TABLA[COLECCION_CLIENTES_RCV]],
    acciones.listarClientesRcv,
    (r) => alCambiar(r.clientes, r.omitidos),
    alFallar,
  );
}

export async function crearClienteCelular(
  campos: CamposClienteCelular,
): Promise<void> {
  if (modoDemo()) return crearDemo(COLECCION_CLIENTES_CELULARES, campos);
  await escribir([TABLA[COLECCION_CLIENTES_CELULARES]], () =>
    acciones.crearClienteCelular(campos),
  );
}

export async function actualizarClienteCelular(
  id: string,
  campos: CamposClienteCelular,
): Promise<void> {
  if (modoDemo())
    return actualizarDemo(COLECCION_CLIENTES_CELULARES, id, campos);
  await escribir([TABLA[COLECCION_CLIENTES_CELULARES]], () =>
    acciones.actualizarClienteCelular(id, campos),
  );
}

export async function crearClienteRcv(campos: CamposClienteRcv): Promise<void> {
  if (modoDemo()) return crearDemo(COLECCION_CLIENTES_RCV, campos);
  await escribir([TABLA[COLECCION_CLIENTES_RCV]], () =>
    acciones.crearClienteRcv(campos),
  );
}

export async function actualizarClienteRcv(
  id: string,
  campos: Partial<CamposClienteRcv>,
): Promise<void> {
  if (modoDemo()) return actualizarDemo(COLECCION_CLIENTES_RCV, id, campos);
  await escribir([TABLA[COLECCION_CLIENTES_RCV]], () =>
    acciones.actualizarClienteRcv(id, campos),
  );
}

export async function borrarCliente(
  coleccion: Coleccion,
  id: string,
): Promise<void> {
  if (modoDemo()) return borrarDemo(coleccion, id);
  await escribir([TABLA[coleccion]], () =>
    acciones.borrarCliente(coleccion, id),
  );
}

/** Guarda las cuotas tras marcar o desmarcar una (la lista va completa). */
export async function guardarCuotas(
  coleccion: Coleccion,
  id: string,
  cuotas: Cuota[],
): Promise<void> {
  if (modoDemo()) return guardarCuotasDemo(coleccion, id, cuotas);
  await escribir([TABLA[coleccion]], () =>
    acciones.guardarCuotas(coleccion, id, cuotas),
  );
}
