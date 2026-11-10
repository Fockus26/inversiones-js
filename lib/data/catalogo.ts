"use server";

import { db } from "../db/client";
import { comoAdmin } from "./acceso";
import * as n from "./nucleo/catalogo";

/** Server actions del catálogo (D002, D025). Todas exigen admin (D003). */

export const listarProductos = async () =>
  comoAdmin(() => n.listarProductos(db));
export const listarMarcas = async () => comoAdmin(() => n.listarMarcas(db));
export const crearProducto = async (campos: unknown, orden: unknown) =>
  comoAdmin((uid) => n.crearProducto(db, uid, campos, orden));
export const actualizarProducto = async (id: unknown, cambios: unknown) =>
  comoAdmin((uid) => n.actualizarProducto(db, uid, id, cambios));
export const borrarProducto = async (id: unknown) =>
  comoAdmin(() => n.borrarProducto(db, id));
export const crearMarca = async (nombre: unknown) =>
  comoAdmin((uid) => n.crearMarca(db, uid, nombre));
export const renombrarMarca = async (vieja: unknown, nueva: unknown) =>
  comoAdmin((uid) => n.renombrarMarca(db, uid, vieja, nueva));
export const borrarMarca = async (nombre: unknown) =>
  comoAdmin(() => n.borrarMarca(db, nombre));
