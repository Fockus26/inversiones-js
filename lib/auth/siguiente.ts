/** Ruta a la que vuelve el login si no llega un `siguiente` válido. */
export const RUTA_INICIO_PANEL = "/productos";

/** Valor de `?aviso=` con el que el panel manda al login a una cuenta que no es admin. */
export const AVISO_SIN_ACCESO = "sin-acceso";

/** `?aviso=` cuando la sesión se cerró sin que el usuario saliera aquí (otra pestaña, caducó). */
export const AVISO_SESION_CERRADA = "sesion-cerrada";

export function urlLoginSesionCerrada(ruta: string): string {
  return `/login?aviso=${AVISO_SESION_CERRADA}&siguiente=${encodeURIComponent(ruta)}`;
}

/** Tab, saltos de línea y demás caracteres de control: el navegador los ignora al resolver URLs. */
function tieneControl(valor: string): boolean {
  for (const c of valor) {
    const n = c.charCodeAt(0);
    if (n < 0x20 || n === 0x7f) return true;
  }
  return false;
}

/**
 * Valida el parámetro `?siguiente=` del login: solo rutas internas (empiezan por `/`, no por
 * `//` ni `/\`, que el navegador trata como otro dominio). Cualquier otra cosa → inicio del panel.
 */
export function rutaSiguienteSegura(valor: string | null | undefined): string {
  if (!valor) return RUTA_INICIO_PANEL;
  if (!valor.startsWith("/")) return RUTA_INICIO_PANEL;
  if (valor.startsWith("//") || valor.startsWith("/\\"))
    return RUTA_INICIO_PANEL;
  if (tieneControl(valor)) return RUTA_INICIO_PANEL;
  if (valor === "/login" || valor.startsWith("/login?"))
    return RUTA_INICIO_PANEL;
  return valor;
}

/** URL del login que, tras entrar, devuelve a `ruta`. */
export function urlLoginConSiguiente(ruta: string): string {
  return `/login?siguiente=${encodeURIComponent(ruta)}`;
}
