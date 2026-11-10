"use client";

import * as acciones from "@/lib/data/catalogo";
import type { ErrorDatos } from "@/lib/data/errores";
import { escribir, sondear } from "@/lib/data/sondeo";
import {
  type CamposEditables,
  compararMarcas,
  type Marca,
  type ProductoConId,
} from "./tipos";

/**
 * Acceso a `productos` y `marcas` desde el panel (D002, D025), sobre las server actions de
 * `lib/data/catalogo.ts`. La huella (`actualizadoPor`/`actualizadoEn`) la pone el servidor.
 */

const T_PRODUCTOS = "productos";
const T_MARCAS = "marcas";

/** Marca (alfabético) y luego `orden`. */
export function ordenarProductos(lista: ProductoConId[]): ProductoConId[] {
  return [...lista].sort(
    (a, b) =>
      compararMarcas(a.marca, b.marca) ||
      a.orden - b.orden ||
      a.nombre.localeCompare(b.nombre, "es"),
  );
}

/** Mantiene la lista al día. Devuelve la función para dejar de escuchar. */
export function escucharProductos(
  alCambiar: (productos: ProductoConId[]) => void,
  alFallar: (error: ErrorDatos) => void,
): () => void {
  return sondear(
    [T_PRODUCTOS],
    acciones.listarProductos,
    (p) => alCambiar(ordenarProductos(p)),
    alFallar,
  );
}

/** Crea con id automático (D002). `orden` lo calcula quien llama (último + 1). */
export function crearProducto(
  campos: CamposEditables,
  orden: number,
): Promise<string> {
  return escribir([T_PRODUCTOS], () => acciones.crearProducto(campos, orden));
}

export function actualizarProducto(
  id: string,
  cambios: Partial<CamposEditables>,
): Promise<void> {
  return escribir([T_PRODUCTOS], () =>
    acciones.actualizarProducto(id, cambios),
  );
}

export function borrarProducto(id: string): Promise<void> {
  return escribir([T_PRODUCTOS], () => acciones.borrarProducto(id));
}

export function escucharMarcas(
  alCambiar: (marcas: Marca[]) => void,
  alFallar: (error: ErrorDatos) => void,
): () => void {
  return sondear(
    [T_MARCAS],
    acciones.listarMarcas,
    (m) => alCambiar([...m].sort(compararMarcas)),
    alFallar,
  );
}

/** `nombre` ya validado con `validarMarca`. */
export function crearMarca(nombre: Marca): Promise<void> {
  return escribir([T_MARCAS], () => acciones.crearMarca(nombre));
}

/** Renombra la marca y mueve sus productos en una transacción. Devuelve cuántos movió. */
export function renombrarMarca(vieja: Marca, nueva: Marca): Promise<number> {
  return escribir([T_MARCAS, T_PRODUCTOS], () =>
    acciones.renombrarMarca(vieja, nueva),
  );
}

/** Solo borra marcas sin productos: si alguno la usa, falla con un mensaje para la persona. */
export function borrarMarca(nombre: Marca): Promise<void> {
  return escribir([T_MARCAS], () => acciones.borrarMarca(nombre));
}
