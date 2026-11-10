"use server";

import { db } from "../db/client";
import { comoAdmin } from "./acceso";
import * as n from "./nucleo/push";

/** Server actions de las suscripciones push (D035). Exigen admin (D003). */

export const guardarSuscripcion = async (suscripcion: unknown) =>
  comoAdmin((uid) => n.guardarSuscripcion(db, uid, suscripcion));
export const borrarSuscripcion = async (endpoint: unknown) =>
  comoAdmin(() => n.borrarSuscripcion(db, endpoint));
