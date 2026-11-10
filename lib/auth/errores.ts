/**
 * Mensajes de Firebase Auth traducidos para la pantalla de login (D012).
 * Credenciales malas, usuario inexistente y contraseña errada dan el MISMO texto: no
 * revelamos qué correos tienen cuenta.
 */

const MENSAJES: Record<string, string> = {
  "auth/invalid-credential": "Correo o contraseña incorrectos.",
  "auth/wrong-password": "Correo o contraseña incorrectos.",
  "auth/user-not-found": "Correo o contraseña incorrectos.",
  "auth/invalid-email": "Escribe un correo válido.",
  "auth/missing-password": "Escribe tu contraseña.",
  "auth/too-many-requests":
    "Demasiados intentos seguidos. Espera unos minutos o restablece tu contraseña.",
  "auth/network-request-failed":
    "No hay conexión. Revisa tu internet e inténtalo de nuevo.",
  // 403 de Better Auth: se entró por un dominio que no es el del panel (BETTER_AUTH_URL).
  "auth/origen":
    "No se puede iniciar sesión desde esta dirección. Entra por el enlace habitual del panel.",
  "auth/user-disabled":
    "Esta cuenta está desactivada. Habla con quien administra el panel.",
};

export const MENSAJE_GENERICO =
  "No pudimos iniciar sesión. Inténtalo de nuevo en un momento.";

/** Código de un error de Firebase (`auth/...`) o undefined si no lo trae. */
export function codigoDeError(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code } = error as { code: unknown };
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function mensajeDeErrorAuth(error: unknown): string {
  const codigo = codigoDeError(error);
  return (codigo && MENSAJES[codigo]) || MENSAJE_GENERICO;
}
