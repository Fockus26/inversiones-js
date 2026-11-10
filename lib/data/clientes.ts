"use server";

import { db } from "../db/client";
import { comoAdmin } from "./acceso";
import * as n from "./nucleo/clientes";

/** Server actions de clientes con financiamiento (D032). Todas exigen admin (D003). */

export const listarClientesCelulares = async () =>
  comoAdmin(() => n.listarClientesCelulares(db));
export const listarClientesRcv = async () =>
  comoAdmin(() => n.listarClientesRcv(db));
export const crearClienteCelular = async (campos: unknown) =>
  comoAdmin((uid) => n.crearClienteCelular(db, uid, campos));
export const actualizarClienteCelular = async (id: unknown, campos: unknown) =>
  comoAdmin((uid) => n.actualizarClienteCelular(db, uid, id, campos));
export const crearClienteRcv = async (campos: unknown) =>
  comoAdmin((uid) => n.crearClienteRcv(db, uid, campos));
export const actualizarClienteRcv = async (id: unknown, campos: unknown) =>
  comoAdmin((uid) => n.actualizarClienteRcv(db, uid, id, campos));
export const borrarCliente = async (coleccion: unknown, id: unknown) =>
  comoAdmin(() => n.borrarCliente(db, coleccion, id));
export const guardarCuotas = async (
  coleccion: unknown,
  id: unknown,
  cuotas: unknown,
) => comoAdmin((uid) => n.guardarCuotas(db, uid, coleccion, id, cuotas));
