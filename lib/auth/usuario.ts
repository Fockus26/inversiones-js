"use client";

import { obtenerSesion } from "@/lib/data/sesion";
import { authClient } from "./cliente";

/**
 * Sesión del navegador sobre Better Auth (migración al VPS; reemplaza `onAuthStateChanged`).
 * Un solo almacén para toda la pestaña: `escucharUsuario` tiene la misma forma que
 * `onAuthStateChanged` (avisa ya con lo que hay y luego con cada cambio). Se refresca al abrir,
 * cada minuto, al volver a la pestaña y tras entrar o salir: si le quitan el acceso a alguien con
 * el panel abierto, lo nota en ese plazo (la barrera real es `comoAdmin` en cada acción).
 */

export interface Usuario {
  uid: string;
  email: string;
}

export interface EstadoAcceso {
  usuario: Usuario | null;
  esAdmin: boolean;
  /** true si no se pudo consultar (sin red o sin servidor). */
  sinServidor: boolean;
}

type Oyente = (estado: EstadoAcceso) => void;

let actual: EstadoAcceso | undefined;
const oyentes = new Set<Oyente>();
let arrancado = false;
let enVuelo: Promise<void> | null = null;

const igual = (a: EstadoAcceso | undefined, b: EstadoAcceso) =>
  a !== undefined &&
  a.usuario?.uid === b.usuario?.uid &&
  a.esAdmin === b.esAdmin &&
  a.sinServidor === b.sinServidor;

export function refrescarSesion(): Promise<void> {
  enVuelo ??= (async () => {
    let siguiente: EstadoAcceso;
    try {
      const s = await obtenerSesion();
      siguiente = s
        ? {
            usuario: { uid: s.uid, email: s.email },
            esAdmin: s.esAdmin,
            sinServidor: false,
          }
        : { usuario: null, esAdmin: false, sinServidor: false };
    } catch {
      // Sin poder comprobarlo se conserva lo último conocido; si nunca se supo, sin acceso.
      siguiente = actual
        ? { ...actual, sinServidor: true }
        : { usuario: null, esAdmin: false, sinServidor: true };
    }
    if (!igual(actual, siguiente)) {
      actual = siguiente;
      for (const f of oyentes) f(siguiente);
    }
  })().finally(() => {
    enVuelo = null;
  });
  return enVuelo;
}

function arrancar() {
  if (arrancado || typeof window === "undefined") return;
  arrancado = true;
  setInterval(() => {
    if (document.visibilityState === "visible") void refrescarSesion();
  }, 60_000);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void refrescarSesion();
  });
  void refrescarSesion();
}

export function escucharAcceso(oyente: Oyente): () => void {
  oyentes.add(oyente);
  arrancar();
  if (actual) oyente(actual);
  return () => {
    oyentes.delete(oyente);
  };
}

/** Como `onAuthStateChanged`: solo el usuario (o null). */
export function escucharUsuario(
  oyente: (usuario: Usuario | null) => void,
): () => void {
  let previo: string | null | undefined;
  return escucharAcceso((e) => {
    const uid = e.usuario?.uid ?? null;
    if (uid === previo) return;
    previo = uid;
    oyente(e.usuario);
  });
}

/** Código de error con la forma de Firebase Auth, para `mensajeDeErrorAuth` (D012). */
function errorAuth(status: number | undefined, code: string | undefined) {
  const codigo =
    status === 429
      ? "auth/too-many-requests"
      : code === "INVALID_EMAIL" || code === "VALIDATION_ERROR"
        ? "auth/invalid-email"
        : status === 403
          ? "auth/origen"
          : status === 401 || status === 400
            ? "auth/invalid-credential"
            : status === undefined || status === 0
              ? "auth/network-request-failed"
              : "auth/desconocido";
  return Object.assign(new Error(codigo), { code: codigo });
}

export async function entrar(email: string, password: string): Promise<void> {
  let r: Awaited<ReturnType<typeof authClient.signIn.email>>;
  try {
    r = await authClient.signIn.email({ email, password });
  } catch {
    throw errorAuth(undefined, undefined);
  }
  if (r.error) throw errorAuth(r.error.status, r.error.code);
  await refrescarSesion();
}

export async function salir(): Promise<void> {
  await authClient.signOut().catch(() => {});
  await refrescarSesion();
}

/**
 * Pide el correo de restablecer. Responde igual exista o no la cuenta (D012); solo falla por red
 * o por exceso de intentos.
 */
export async function pedirRestablecer(email: string): Promise<void> {
  let r: Awaited<ReturnType<typeof authClient.requestPasswordReset>>;
  try {
    r = await authClient.requestPasswordReset({
      email,
      redirectTo: "/restablecer",
    });
  } catch {
    throw errorAuth(undefined, undefined);
  }
  if (r.error && r.error.status === 429) throw errorAuth(429, undefined);
  // Un correo sin dominio completo ("maria@gmail") no llega a enviarse: se dice, no se finge.
  if (
    r.error &&
    (r.error.code === "INVALID_EMAIL" || r.error.code === "VALIDATION_ERROR")
  )
    throw errorAuth(400, "INVALID_EMAIL");
  if (r.error) throw errorAuth(r.error.status, r.error.code);
}

export async function restablecer(
  token: string,
  nueva: string,
): Promise<"ok" | "token-invalido" | "clave-corta" | "clave-larga" | "red"> {
  try {
    const r = await authClient.resetPassword({ token, newPassword: nueva });
    if (!r.error) return "ok";
    // Un 400 por la contraseña no es un enlace vencido: el enlace sigue sirviendo.
    if (r.error.code === "PASSWORD_TOO_SHORT") return "clave-corta";
    if (r.error.code === "PASSWORD_TOO_LONG") return "clave-larga";
    return r.error.status === 400 ? "token-invalido" : "red";
  } catch {
    return "red";
  }
}
