"use server";

import { db } from "../db/client";
import { comoAdmin } from "./acceso";
import * as n from "./nucleo/rcv";

/** Server actions de la póliza RCV (D030). Todas exigen admin (D003). */

export const listarPlanesRcv = async () =>
  comoAdmin(() => n.listarPlanesRcv(db));
export const crearPlanRcv = async (campos: unknown, orden: unknown) =>
  comoAdmin((uid) => n.crearPlanRcv(db, uid, campos, orden));
export const actualizarPlanRcv = async (id: unknown, cambios: unknown) =>
  comoAdmin((uid) => n.actualizarPlanRcv(db, uid, id, cambios));
export const borrarPlanRcv = async (id: unknown) =>
  comoAdmin(() => n.borrarPlanRcv(db, id));
export const leerConfigRcv = async () => comoAdmin(() => n.leerConfigRcv(db));
export const guardarTasas = async (tasas: unknown) =>
  comoAdmin((uid) => n.guardarTasas(db, uid, tasas));
export const guardarRespaldos = async (respaldos: unknown) =>
  comoAdmin((uid) => n.guardarRespaldos(db, uid, respaldos));
export const guardarRequisitos = async (requisitos: unknown) =>
  comoAdmin((uid) => n.guardarRequisitos(db, uid, requisitos));
export const listarSolicitudesRcv = async () =>
  comoAdmin(() => n.listarSolicitudesRcv(db));
