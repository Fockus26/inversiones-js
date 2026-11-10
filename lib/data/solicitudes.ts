"use server";

import { db } from "../db/client";
import { comoAdmin } from "./acceso";
import * as n from "./nucleo/solicitudes";

/** Server actions de las solicitudes del chat (D043). Todas exigen admin (D003). */

export const listarSolicitudesCelulares = async () =>
  comoAdmin(() => n.listarSolicitudesCelulares(db));
export const listarSolicitudesCitas = async () =>
  comoAdmin(() => n.listarSolicitudesCitas(db));
export const borrarSolicitud = async (coleccion: unknown, id: unknown) =>
  comoAdmin(() => n.borrarSolicitud(db, coleccion, id));
